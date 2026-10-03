/**
 * createDur(options): the NuvoVet DUR overlay's logic core (EMR popup spec §3.2, §3.5,
 * §3.8–§3.10). State, check(), the gate() promise plumbing, the acknowledgement log and
 * events. No DOM, no network, no storage beyond the try/catch log.
 *
 * The widget (WP3, `widget/index.jsx`) wraps this core: `createDurWidget(options)` =
 * `createDur(options)` + a UI that renders `getState()` and calls the action methods
 * below. Headless use (tests, a host without UI) works the same; a gate with blocking
 * cards then stays pending until `proceed()` / `closeGate()` is called.
 *
 * ── Public API (§3.2) ──
 *   dur.check(request)            order-select: returns DurResponse, emits 'cards'. Synchronous.
 *   dur.gate(request)             order-sign: Promise<GateResult>. Resolves at once with
 *                                 { proceed: true, feedback: [] } when no blocking card is unacknowledged.
 *   dur.setLocale(l) · dur.setTheme(t) · dur.getLog(encounterId?) · dur.exportLog() · dur.clearLog(encounterId?)
 *   dur.mount({ panel?, badgeSlot? }) · dur.unmount()   (targets are stored for the UI; not touched here)
 *
 * ── For the widget UI ──
 *   dur.getState() → { locale, theme, layout, fonts, marker, user, links, response, request, gate, targets, mounted }
 *   dur.subscribe(fn) → unsubscribe       fn(state) after every state change
 *   dur.addEventListener(fn) → unsubscribe fn(DurEvent) for every event (as options.onEvent)
 *   dur.getDraft(ackKey) · dur.setDraft(ackKey, { reasonCode?, comment?, ownerInformed? })
 *   dur.validate(cardUuid) → { valid, errors, fixChart? }     (§3.9 requirements for that card)
 *   dur.canProceed() → boolean            every pending gate card has a valid draft
 *   dur.proceed() → { ok, feedback | errors }   "예외 처리하고 저장": logs `overridden` per card, resolves proceed:true
 *   dur.closeGate({ focusRowId? })        "처방으로 돌아가기", Esc, ×, backdrop: resolves proceed:false
 *   dur.override(cardUuid, draft?)        inline "예외 사유 입력" in the panel: validates, logs `overridden`
 *   dur.acknowledge(cardUuid)             moderate/minor "확인함": logs `accepted`
 *   dur.acceptSuggestion(cardUuid | null, suggestionUuid)   logs `accepted` + acceptedSuggestions (never an
 *                                 acknowledgement: the changed chart is re-checked), emits remove-row/update-row
 *   dur.chooseProtocol(rowId, protocolId) emits update-row { protocolChoice }
 *   dur.fixChart(field)                   NV-DATA / confirm chips: emits fix-chart, logs nothing
 *   dur.focusRow(rowId, highlight?) · dur.openWorkbench(href)
 */

import { ENGINE_VERSION } from '../engine/index.js'
import { check as runCheck } from './adapter.js'
import { buildResponse, blockingCards } from './cards.js'
import { toVisit, encounterIdOf } from './cds.js'
import { PRODUCT_MAP, buildProductMap } from './productMap.js'
import { CONDITION_MAP } from './conditionMap.js'
import { createFeedbackLog } from './feedbackLog.js'
import { OVERRIDE_SYSTEM, REASON_BY_CODE, validateOverride } from './overrideReasons.js'

export const SDK_VERSION = '1.0.0'

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())

/** Accept a CDS-Hooks-shaped request or a bare visit model. */
function asVisit(input) {
  if (input && input.context && input.prefetch) return toVisit(input)
  return input
}

export function createDur(options = {}) {
  const maps = {
    productMap: Array.isArray(options.productMap) ? buildProductMap(options.productMap) : options.productMap || PRODUCT_MAP,
    conditionMap: options.conditionMap || CONDITION_MAP,
  }
  const clock = options.now || (() => new Date())
  const log = options.log || createFeedbackLog(options.storage !== undefined ? { storage: options.storage } : {})
  const state = {
    locale: options.locale === 'en' ? 'en' : 'ko',
    theme: options.theme || 'light',
    layout: options.layout || 'auto',
    fonts: options.fonts || 'inherit',
    marker: options.marker ?? false,
    user: options.user || { id: 'Practitioner/demo-kim', display: '김민서 (가상)' },
    links: { workbenchBase: '#', ...(options.links || {}) },
    request: null,
    response: null,
    gate: null,
    targets: null,
    mounted: false,
  }
  const lastByEncounter = new Map()
  const drafts = new Map()
  const eventListeners = new Set(options.onEvent ? [options.onEvent] : [])
  const stateListeners = new Set()
  let gateResolve = null

  const snapshot = () => ({ ...state, gate: state.gate ? { ...state.gate } : null })
  const notify = () => { for (const fn of stateListeners) { try { fn(snapshot()) } catch { /* listener errors never break the check */ } } }
  const emit = (event) => { for (const fn of eventListeners) { try { fn(event) } catch { /* ignore */ } } }

  function evaluate(request, hook) {
    const t0 = now()
    const visit = asVisit(request)
    const c = runCheck(visit, maps)
    const encounterId = request?.context?.encounterId ?? encounterIdOf(visit)
    const response = buildResponse(c, visit, {
      locale: state.locale, maps, workbenchBase: state.links.workbenchBase,
      hook: hook || request?.hook || 'order-select', encounterId,
    })
    response.extension.ms = Math.round((now() - t0) * 100) / 100
    return { response, visit, encounterId, patientId: request?.context?.patientId ?? visit.patient?.id ?? null }
  }

  function findCard(uuid) {
    const lists = [state.gate?.response?.cards, state.response?.cards]
    for (const l of lists) {
      const k = (l || []).find((x) => x.uuid === uuid)
      if (k) return k
    }
    return null
  }
  const currentEncounter = () => state.gate?.encounterId ?? state.response?.extension?.encounterId ?? null
  const currentPatient = () => state.gate?.patientId ?? state.patientId ?? null
  const draftKey = (ackKey) => `${currentEncounter()}|${ackKey}`

  function feedback(card, outcome, extra = {}) {
    const ext = card.extension
    const entry = {
      card: card.uuid,
      outcome,
      ...(extra.acceptedSuggestions ? { acceptedSuggestions: extra.acceptedSuggestions } : {}),
      ...(extra.overrideReason ? { overrideReason: extra.overrideReason } : {}),
      outcomeTimestamp: clock().toISOString(),
      extension: {
        ackKey: ext.ackKey, ruleIds: ext.ruleIds, ruleVersion: ext.ruleVersion, severity: ext.severity, drugIds: ext.drugIds,
        problemKey: ext.problemKey, inputHash: ext.inputHash, engineVersion: ENGINE_VERSION, userId: state.user.id,
        patientId: currentPatient(), encounterId: currentEncounter(),
        ...(extra.ownerInformed !== undefined ? { ownerInformed: Boolean(extra.ownerInformed) } : {}),
        hook: extra.hook || (state.gate ? 'order-sign' : 'order-select'),
      },
    }
    log.add(entry)
    emit({ type: 'feedback', entry })
    return entry
  }

  function resolveGate(result) {
    const resolve = gateResolve
    gateResolve = null
    state.gate = null
    emit({ type: 'gate-close', proceed: result.proceed })
    notify()
    if (resolve) resolve(result)
    return result
  }

  function overrideEntry(card, draft, hook) {
    const reason = REASON_BY_CODE[draft.reasonCode]
    return feedback(card, 'overridden', {
      hook,
      ownerInformed: draft.ownerInformed,
      overrideReason: {
        reason: { system: OVERRIDE_SYSTEM, code: reason.code, display: reason.display[state.locale] ?? reason.display.ko },
        userComment: String(draft.comment || '').trim(),
      },
    })
  }

  const api = {
    version: SDK_VERSION,

    check(request) {
      const { response, encounterId, patientId } = evaluate(request, 'order-select')
      state.request = request
      state.response = response
      state.patientId = patientId
      lastByEncounter.set(encounterId, { request, response })
      emit({ type: 'cards', response })
      notify()
      return response
    },

    /** The last result for an encounter (the panel on chart open, §3.5), or null. */
    lastResult(encounterId) {
      return lastByEncounter.get(encounterId)?.response ?? null
    },

    gate(request) {
      if (gateResolve) resolveGate({ proceed: false, feedback: [] })
      const { response, encounterId, patientId } = evaluate(request, 'order-sign')
      const pending = blockingCards(response).filter((k) => !log.isAcknowledged(encounterId, k.extension.ackKey, { blocking: true }))
      if (!pending.length) return Promise.resolve({ proceed: true, feedback: [] })
      return new Promise((resolve) => {
        gateResolve = resolve
        state.gate = {
          request, response, encounterId, patientId,
          cards: pending,
          confirm: response.extension.confirm.filter((x) => !x.covered),
          patient: response.extension.patient,
        }
        emit({ type: 'gate-open', cardIds: pending.map((k) => k.uuid) })
        notify()
      })
    },

    getGate() {
      return state.gate ? { ...state.gate } : null
    },

    getDraft(ackKey) {
      return drafts.get(draftKey(ackKey)) || { reasonCode: null, comment: '', ownerInformed: false }
    },

    setDraft(ackKey, patch) {
      const next = { ...api.getDraft(ackKey), ...patch }
      drafts.set(draftKey(ackKey), next)
      notify()
      return next
    },

    validate(cardUuid) {
      const card = findCard(cardUuid)
      if (!card) return { valid: false, errors: { card: 'unknown_card' } }
      return validateOverride(card, api.getDraft(card.extension.ackKey))
    },

    canProceed() {
      return Boolean(state.gate) && state.gate.cards.every((k) => api.validate(k.uuid).valid)
    },

    proceed() {
      if (!state.gate) return { ok: false, errors: { gate: 'no_gate' } }
      const errors = {}
      for (const k of state.gate.cards) {
        const v = api.validate(k.uuid)
        if (!v.valid) errors[k.uuid] = v.errors
      }
      if (Object.keys(errors).length) return { ok: false, errors }
      const entries = state.gate.cards.map((k) => overrideEntry(k, api.getDraft(k.extension.ackKey), 'order-sign'))
      resolveGate({ proceed: true, feedback: entries })
      return { ok: true, feedback: entries }
    },

    closeGate({ focusRowId } = {}) {
      if (!state.gate) return null
      return resolveGate({ proceed: false, feedback: [], ...(focusRowId ? { focusRowId } : {}) })
    },

    override(cardUuid, draft) {
      const card = findCard(cardUuid)
      if (!card) return { ok: false, errors: { card: 'unknown_card' } }
      if (draft) api.setDraft(card.extension.ackKey, draft)
      const d = api.getDraft(card.extension.ackKey)
      const v = validateOverride(card, d)
      if (v.fixChart) { api.fixChart(v.fixChart); return { ok: false, fixChart: v.fixChart, errors: {} } }
      if (!v.valid || !d.reasonCode) return { ok: false, errors: v.valid ? { reason: 'reason_required' } : v.errors }
      const entry = overrideEntry(card, d)
      notify()
      return { ok: true, entry }
    },

    acknowledge(cardUuid) {
      const card = findCard(cardUuid)
      if (!card) return { ok: false, errors: { card: 'unknown_card' } }
      if (card.extension.blocking) return { ok: false, errors: { card: 'blocking_needs_override' } }
      const entry = feedback(card, 'accepted')
      notify()
      return { ok: true, entry }
    },

    acceptSuggestion(cardUuid, suggestionUuid) {
      const card = cardUuid ? findCard(cardUuid) : null
      let sugg = card?.suggestions.find((s) => s.uuid === suggestionUuid) || null
      if (!card) {
        for (const list of Object.values(state.response?.extension?.rowSuggestions || {})) sugg = sugg || list.find((s) => s.uuid === suggestionUuid) || null
      }
      if (!sugg) return { ok: false, errors: { suggestion: 'unknown_suggestion' } }
      const { rowId, patch } = sugg.extension
      const entry = card ? feedback(card, 'accepted', { acceptedSuggestions: [{ id: sugg.uuid }] }) : null
      if (sugg.extension.kind === 'delete') emit({ type: 'remove-row', rowId })
      else emit({ type: 'update-row', rowId, patch })
      if (state.gate) resolveGate({ proceed: false, feedback: entry ? [entry] : [], focusRowId: rowId })
      else notify()
      return { ok: true, entry, rowId }
    },

    chooseProtocol(rowId, protocolId) {
      emit({ type: 'update-row', rowId, patch: { protocolChoice: protocolId } })
    },

    fixChart(field) {
      emit({ type: 'fix-chart', field })
      if (state.gate) resolveGate({ proceed: false, feedback: [] })
    },

    focusRow(rowId, highlight = false) {
      emit({ type: 'focus-row', rowId, ...(highlight ? { highlight: true } : {}) })
    },

    openWorkbench(href) {
      emit({ type: 'open-workbench', href })
    },

    setLocale(locale) {
      state.locale = locale === 'en' ? 'en' : 'ko'
      if (state.request) {
        const { response } = evaluate(state.request, 'order-select')
        state.response = response
        emit({ type: 'cards', response })
      }
      if (state.gate) {
        const { response } = evaluate(state.gate.request, 'order-sign')
        const ids = new Set(state.gate.cards.map((k) => k.uuid))
        state.gate = { ...state.gate, response, cards: response.cards.filter((k) => ids.has(k.uuid)), confirm: response.extension.confirm.filter((x) => !x.covered), patient: response.extension.patient }
      }
      notify()
    },

    setTheme(theme) {
      state.theme = theme
      notify()
    },

    getLog(encounterId) {
      return log.forEncounter(encounterId)
    },
    exportLog() {
      return log.export()
    },
    /** clearLog() empties the whole log; clearLog(encounterId) clears one encounter only. */
    clearLog(encounterId) {
      log.clear(encounterId)
      notify()
    },

    mount(targets = {}) {
      state.targets = { panel: targets.panel ?? null, badgeSlot: targets.badgeSlot ?? null }
      state.mounted = true
      notify()
    },
    unmount() {
      if (state.gate) resolveGate({ proceed: false, feedback: [] })
      state.targets = null
      state.mounted = false
      notify()
    },

    getState: snapshot,
    subscribe(fn) {
      stateListeners.add(fn)
      return () => stateListeners.delete(fn)
    },
    addEventListener(fn) {
      eventListeners.add(fn)
      return () => eventListeners.delete(fn)
    },
  }
  return api
}
