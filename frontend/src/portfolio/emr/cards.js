/**
 * Engine Result + adapter output → DurResponse (EMR popup spec §3.3, §6.1).
 *
 * One card per engine Finding (already merged by problemKey). All clinical text
 * is the engine's (`finding.*[locale]`); this module only arranges it, adds the
 * row mapping (primary / related rows), re-checked suggestions, coverage, the
 * per-row badge status, the stable `inputHash` / `uuid` / `ackKey`, and the
 * "확인 필요" (needs input) group built from the adapter's reasons.
 */

import { canonicalJson, fnv1a } from '../engine/hash.js'
import { exposure24hPerKg } from '../engine/dose.js'
import { ENGINE_VERSION, RULES } from '../engine/index.js'
import { DRUG_BY_ID } from '../knowledge/drugs.js'
import { BREED_BY_ID } from '../knowledge/breeds.js'
import { BLANK_CASE_INPUT } from '../cases/cases.js'
import { stateParam } from '../components/caseModel.js'
import { casePath } from '../router.js'
import { PRODUCT_MAP, productDisplay } from './productMap.js'
import { computeCoverage } from './coverage.js'
import { cardSuggestions, primaryDrugs, rowsOf, rowPlanSuggestions, createRechecker } from './suggestions.js'
import { reasonsFor, FIX_FIELD_BY_RULE } from './overrideReasons.js'
import {
  ROW_REASON_TEXT, ROW_NOTE_TEXT, ROW_NOTE_ID, VISIT_NOTE_TEXT, visitReasonText, visitReasonChip,
  CATEGORY, DOSE_RULES, SEVERITY_LABEL, BADGE_TEXT, NO_REFERENCE_REASONS, pick,
} from './reasons.js'

const SEV = { contraindicated: 0, major: 1, moderate: 2, minor: 3 }
export const BLOCKING_SEVERITIES = ['contraindicated', 'major']
const INDICATOR = { contraindicated: 'critical', major: 'critical', moderate: 'warning', minor: 'info' }
const NOTE_ORDER = ['administration', 'lab', 'monitoring', 'caution', 'rounding']
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000)
const T = (en, ko) => ({ en, ko })

const DETAIL_HEAD = {
  why: T('Mechanism', '기전'),
  actions: T('Recommended', '권장'),
  alternatives: T('Alternatives', '대안'),
}
const LINK_LABEL = T('Open full analysis', '전체 분석 열기')
const SPECIES_LABEL = { dog: T('Dog', '개'), cat: T('Cat', '고양이') }

// ── Hashes (§3.3) ──

/**
 * inputHash = fnv1a(canonicalJson({ severity, factors, weightKg, rows })): every row whose
 * drug is in the finding, with its dose inputs and computed exposure, so a weight, dose or
 * frequency change re-raises an acknowledged card.
 */
export function inputHash(c, f) {
  const ci = c.adapter.caseInput
  const rows = rowsOf(c, f.drugIds).map(({ rowId, i }) => {
    const m = ci.meds[i]
    const d = c.result.doses[i]
    return {
      rowId, drugId: m.drugId, strengthId: m.strengthId, dose: m.dose, frequency: m.frequency, route: m.route, protocolId: m.protocolId,
      durationDays: m.durationDays, perDoseMg: r3(d.perDoseMg),
      exposure24hPerKg: r3(exposure24hPerKg(d.combined ? d.combined.totalMg : d.perDoseMg, ci.weightKg, d.frequency)),
      status: d.status, ratio: r3(d.ratio), compared: r3(d.compared?.value),
    }
  }).sort((a, b) => (a.rowId < b.rowId ? -1 : 1))
  return fnv1a(canonicalJson({
    severity: f.severity,
    factors: f.factors.map((x) => `${x.kind}:${x.id}`).sort(),
    weightKg: ci.weightKg == null ? null : Math.round(ci.weightKg * 10) / 10,
    rows,
  }))
}

export const cardUuid = (problemKey, hash) => `card-${fnv1a(`${problemKey}|${hash}`)}`

// ── Helpers ──

const drugName = (id, locale) => DRUG_BY_ID[id]?.name?.[locale] ?? DRUG_BY_ID[id]?.name?.ko ?? id
const uniq = (xs) => [...new Set(xs)]

/** Row index suffix for notes that name a med index (rounding_, ceiling_plan_, dose_strength_, freq_). */
function noteRowIds(note, c) {
  const a = c.adapter
  const m = /^(rounding|ceiling_plan|dose_strength|freq)_.+_(\d+)$/.exec(note.id)
  if (m) {
    const rowId = a.medRowIds[Number(m[2])]
    return rowId ? [rowId] : []
  }
  return a.medRowIds.filter((rowId) => (note.drugIds || []).includes(a.rows[rowId].drugId))
}

function detailMarkdown(f, locale) {
  const parts = [pick(f.consequence, locale)]
  for (const k of ['why', 'actions', 'alternatives']) {
    const list = (f[k] || []).map((t) => pick(t, locale)).filter(Boolean)
    if (list.length) parts.push(`**${pick(DETAIL_HEAD[k], locale)}**\n${list.map((t) => `- ${t}`).join('\n')}`)
  }
  return parts.filter(Boolean).join('\n\n')
}

function sortCards(cards, rowOrder) {
  const first = (card) => Math.min(...card.extension.rowIds.map((r) => rowOrder.indexOf(r)).filter((i) => i >= 0), Infinity)
  return cards
    .map((card, k) => ({ card, k }))
    .sort((a, b) => SEV[a.card.extension.severity] - SEV[b.card.extension.severity]
      || b.card.extension.factorCount - a.card.extension.factorCount
      || first(a.card) - first(b.card)
      || a.k - b.k)
    .map((x) => x.card)
}

function workbenchUrl(caseInput, base = '#') {
  let s = null
  try {
    s = stateParam(caseInput, BLANK_CASE_INPUT)
  } catch {
    s = null
  }
  return `${base}${casePath('custom', 'workbench', s)}`
}

/** Patient identity line data for the gate (§3.8): name, species, weight, breed. */
function patientSummary(visit, c, locale) {
  const p = visit.patient || {}
  const species = c?.adapter?.caseInput?.species
  const breedId = c?.adapter?.caseInput?.breedId
  const halves = String(p.breed || '').split('/').map((s) => s.trim()).filter(Boolean)
  const breedLabel = breedId && BREED_BY_ID[breedId]
    ? (locale === 'en' ? BREED_BY_ID[breedId].en : halves[1] || (BREED_BY_ID[breedId].ko || [])[0] || BREED_BY_ID[breedId].en)
    : (locale === 'en' ? halves[0] : halves[1] || halves[0]) || ''
  return {
    id: p.id ?? null, name: p.name ?? '', species: species ? pick(SPECIES_LABEL[species], locale) : (p.species || ''),
    weightKg: p.weight?.kg ?? null, breed: breedLabel,
  }
}

// ── Response ──

/**
 * buildResponse(c, visit, opts) → DurResponse
 * c: adapter `check(visit, maps)` result. opts: { locale, maps, workbenchBase, hook, encounterId, ms }.
 */
export function buildResponse(c, visit, opts = {}) {
  const locale = opts.locale === 'en' ? 'en' : 'ko'
  const maps = opts.maps
  const productMap = maps?.productMap || PRODUCT_MAP
  const rowsInVisit = (visit.rows || []).filter((r) => !(r.kind === 'Tx' && !productMap[r.productCode]))
  const rowOrder = rowsInVisit.map((r) => r.rowId)
  const base = {
    engineVersion: ENGINE_VERSION, rulesCount: RULES.length, hook: opts.hook || null,
    encounterId: opts.encounterId ?? visit.encounterId ?? null, locale, patient: patientSummary(visit, c, locale),
  }

  if (!c.supported) {
    const reason = c.reason
    const chip = visitReasonChip(reason)
    const rowStatus = Object.fromEntries(rowOrder.map((id) => [id, { badge: 'unsupported', label: pick(BADGE_TEXT.unsupported, locale), text: pick(BADGE_TEXT.unsupported, locale) }]))
    return {
      cards: [],
      extension: {
        ...base, supported: false, reason, empty: rowOrder.length === 0,
        verdict: { level: null, action: null, complete: false, incompleteReasons: [reason] },
        counts: { contraindicated: 0, major: 0, moderate: 0, minor: 0, doseChecks: 0, notes: 0 },
        rowStatus, notes: [], confirm: [{ kind: 'visit', key: reason, text: pick(visitReasonText(reason), locale), chip: chip.chip, field: chip.field }],
        doses: [], unmapped: [], coverage: null, rowSuggestions: {}, ms: opts.ms ?? 0,
      },
    }
  }

  const a = c.adapter
  const r = c.result
  const rowIndex = Object.fromEntries(a.medRowIds.map((id, i) => [id, i]))
  const productOfRow = (rowId) => productMap[visit.rows.find((x) => x.rowId === rowId)?.productCode]

  const rc = createRechecker(visit, maps)
  // Cards
  let cards = r.findings.map((f) => {
    const hash = inputHash(c, f)
    const uuid = cardUuid(f.problemKey, hash)
    const involved = rowsOf(c, f.drugIds)
    const primary = primaryDrugs(c, visit, f, maps, rc)
    const primaryRowIds = involved.filter((x) => (primary.length ? primary : f.drugIds).includes(x.drugId)).map((x) => x.rowId)
    const relatedRowIds = involved.filter((x) => primary.length && !primary.includes(x.drugId)).map((x) => x.rowId)
    const ruleIds = uniq([f.ruleId, ...(f.trace?.rules || []).map((x) => x.ruleId)])
    const isDose = ruleIds.some((id) => DOSE_RULES.includes(id))
    const doseRef = isDose ? involved.map((x) => r.doses[x.i]?.ref).find(Boolean) || null : null
    const blocking = BLOCKING_SEVERITIES.includes(f.severity)
    const category = CATEGORY[f.ruleId] || T(f.ruleId, f.ruleId)
    return {
      uuid,
      summary: pick(f.title, locale),
      indicator: INDICATOR[f.severity],
      detail: detailMarkdown(f, locale),
      source: { label: 'nuvovet DUR', topic: { code: f.ruleId, display: pick(category, locale) } },
      overrideReasons: reasonsFor(ruleIds, locale),
      selectionBehavior: 'at-most-one',
      suggestions: cardSuggestions({ base: c, visit, finding: f, maps, locale, cardKey: uuid, rc }),
      links: [{ label: pick(LINK_LABEL, locale), url: workbenchUrl(a.caseInput, opts.workbenchBase ?? '#'), type: 'absolute' }],
      extension: {
        severity: f.severity, findingId: f.id, problemKey: f.problemKey, ruleIds, ruleVersion: f.ruleVersion,
        drugIds: f.drugIds, drugNames: f.drugIds.map((d) => drugName(d, locale)),
        rowIds: involved.map((x) => x.rowId), primaryRowIds, relatedRowIds,
        inClinicRowIds: involved.filter((x) => a.rows[x.rowId].inClinic).map((x) => x.rowId),
        sources: f.sources, evidence: f.evidence,
        jurisdiction: doseRef && doseRef.labelStatus === 'label' ? doseRef.jurisdiction || null : null,
        labelStatus: doseRef?.labelStatus ?? null, startDose: doseRef?.phase === 'start',
        category: pick(category, locale),
        consequence: pick(f.consequence, locale),
        why: (f.why || []).map((t) => pick(t, locale)),
        actions: (f.actions || []).map((t) => pick(t, locale)),
        alternatives: (f.alternatives || []).map((t) => pick(t, locale)),
        factors: f.factors.map((x) => pick(x.label, locale)),
        factorCount: f.factors.length,
        trace: f.trace,
        fixField: FIX_FIELD_BY_RULE[f.ruleId] || 'species',
        inputHash: hash, ackKey: `${f.problemKey}|${hash}`, blocking,
      },
    }
  })
  cards = sortCards(cards, rowOrder)

  // Notes for 투약 안내 (engine non-validation notes, powder rows' rounding dropped; adapter notes)
  const powderRows = new Set(Object.entries(a.rows).filter(([, v]) => v.powder).map(([k]) => k))
  const engineNotes = r.notes.filter((n) => n.category !== 'validation').map((n) => ({
    id: n.id, category: n.category || n.kind || 'administration', origin: 'engine', drugIds: n.drugIds || [],
    rowIds: noteRowIds(n, c), text: pick(n.text, locale), sources: n.sources || [],
  })).filter((n) => !(n.category === 'rounding' && n.rowIds.length && n.rowIds.every((id) => powderRows.has(id))))
  const adapterRowNotes = []
  for (const [rowId, v] of Object.entries(a.rows)) {
    for (const key of v.notes) {
      const fn = ROW_NOTE_TEXT[key]
      const params = key === 'prn_max_per_day' ? { n: Number(v.tt) } : {}
      adapterRowNotes.push({
        id: `${ROW_NOTE_ID[key] || key}_${rowId}`, key, category: key === 'calc_mismatch' ? 'caution' : 'administration', origin: 'adapter',
        drugIds: [v.drugId], rowIds: [rowId], text: fn ? pick(fn(params), locale) : key, sources: [],
      })
    }
  }
  const visitNotes = []
  if (a.adapterNotes.includes('weight_stale')) visitNotes.push({ id: 'weight_stale', key: 'weight_stale', category: 'caution', origin: 'adapter', drugIds: [], rowIds: [], text: pick(VISIT_NOTE_TEXT.weight_stale({ days: a.weightAgeDays }), locale), sources: [] })
  if (a.adapterNotes.includes('breed_unresolved') && !c.visitReasons.includes('breed_unresolved')) visitNotes.push({ id: 'breed_unresolved', key: 'breed_unresolved', category: 'caution', origin: 'adapter', drugIds: [], rowIds: [], text: pick(VISIT_NOTE_TEXT.breed_unresolved(), locale), sources: [] })
  const notes = [...engineNotes, ...adapterRowNotes, ...visitNotes]
    .map((n, k) => ({ n, k }))
    .sort((x, y) => (NOTE_ORDER.indexOf(x.n.category) + 1 || 99) - (NOTE_ORDER.indexOf(y.n.category) + 1 || 99) || x.k - y.k)
    .map((x) => x.n)
  const roundingRows = new Set(engineNotes.filter((n) => n.category === 'rounding').flatMap((n) => n.rowIds))

  // 확인 필요 group
  const confirm = []
  const rowsWithConfirm = new Set()
  for (const rowId of rowOrder) {
    const v = a.rows[rowId]
    if (v) {
      for (const key of v.confirm) {
        rowsWithConfirm.add(rowId)
        const fn = ROW_REASON_TEXT[key]
        confirm.push({ kind: 'row', key, rowId, drugId: v.drugId, drugName: drugName(v.drugId, locale), text: fn ? pick(fn({ step: v.splitStep }), locale) : key, noReference: NO_REFERENCE_REASONS.includes(key), options: key === 'protocol_indication' ? v.options : undefined })
      }
    }
    const u = a.unmapped.find((x) => x.rowId === rowId)
    if (u) confirm.push({ kind: 'row', key: 'unmapped', rowId, code: u.code, text: pick(ROW_REASON_TEXT.unmapped(), locale) })
  }
  for (const n of r.notes.filter((x) => x.category === 'validation')) {
    const rowIds = noteRowIds(n, c)
    confirm.push({ kind: 'validation', key: n.id, rowIds, text: pick(n.text, locale), field: n.id === 'weight_missing' ? 'weight' : null, covered: rowIds.length > 0 && rowIds.every((id) => rowsWithConfirm.has(id)) })
  }
  for (const key of c.visitReasons) {
    const detail = a.visitDetail.find((d) => d.key === key) || {}
    const chip = visitReasonChip(key)
    confirm.push({ kind: 'visit', key, text: pick(visitReasonText(key, detail), locale), chip: chip.chip, field: chip.field })
  }

  // Row badges
  const rowStatus = {}
  for (const rowId of rowOrder) {
    const v = a.rows[rowId]
    if (!v) {
      rowStatus[rowId] = { badge: 'unmapped', label: pick(BADGE_TEXT.unmapped, locale), text: pick(BADGE_TEXT.unmapped, locale), confirm: ['unmapped'] }
      continue
    }
    const asPrimary = cards.filter((k) => k.extension.primaryRowIds.includes(rowId))
    const asRelated = cards.filter((k) => k.extension.relatedRowIds.includes(rowId))
    const name = drugName(v.drugId, locale)
    let s
    if (asPrimary.length) {
      const sev = asPrimary.map((k) => k.extension.severity).sort((x, y) => SEV[x] - SEV[y])[0]
      const count = asPrimary.filter((k) => k.extension.severity === sev).length
      const sl = pick(SEVERITY_LABEL[sev], locale)
      s = { badge: sev, severity: sev, label: sl, text: sl, count, cardUuids: asPrimary.map((k) => k.uuid),
        ariaLabel: locale === 'en' ? `${name}: ${count} ${sl.toLowerCase()} finding${count > 1 ? 's' : ''}. Show in the review panel` : `${name}: ${sl} ${count}건. 검토 패널에서 보기` }
    } else if (asRelated.length) {
      const sev = asRelated.map((k) => k.extension.severity).sort((x, y) => SEV[x] - SEV[y])[0]
      const count = asRelated.filter((k) => k.extension.severity === sev).length
      const sl = pick(SEVERITY_LABEL[sev], locale)
      s = { badge: sev, severity: sev, label: sl, text: pick(BADGE_TEXT.related, locale), related: true, count, cardUuids: asRelated.map((k) => k.uuid),
        ariaLabel: locale === 'en' ? `${name}: related to ${count} ${sl.toLowerCase()} finding${count > 1 ? 's' : ''}. Show in the review panel` : `${name}: ${sl} ${count}건에 관련. 검토 패널에서 보기` }
    } else if (v.confirm.length) {
      const noref = v.confirm.every((k) => NO_REFERENCE_REASONS.includes(k))
      const t = pick(noref ? BADGE_TEXT.noref : BADGE_TEXT.confirm, locale)
      s = { badge: noref ? 'noref' : 'confirm', label: t, text: t, ariaLabel: `${name}: ${t}` }
    } else {
      s = { badge: 'none', label: pick(BADGE_TEXT.none, locale), text: pick(BADGE_TEXT.none, locale) }
    }
    s.confirm = v.confirm.slice()
    if (roundingRows.has(rowId) && !v.powder) s.rounding = true
    if (v.inClinic) s.inClinic = true
    rowStatus[rowId] = s
  }

  // Doses (engine rows + row ids; a row whose plan breaches a ceiling shows the ceiling note, D15)
  const doses = r.doses.map((d, i) => {
    const rowId = a.medRowIds[i]
    const ceiling = d.planExceedsCeiling ? r.notes.find((n) => n.id.startsWith(`ceiling_plan_${d.drugId}_`) && n.id.endsWith(`_${d.combinedInto ?? i}`)) : null
    return { ...d, rowId, inClinic: a.rows[rowId].inClinic, powder: a.rows[rowId].powder,
      planText: ceiling ? pick(ceiling.text, locale) : d.strengthId ? pick(d.administration, locale) : null, planReplacedBy: ceiling ? ceiling.id : null }
  })

  // Counts (doseChecks recomputed so powder rows' dropped rounding notes do not count, §3.7.1)
  const counts = { contraindicated: 0, major: 0, moderate: 0, minor: 0, doseChecks: 0, notes: notes.length }
  for (const k of cards) counts[k.extension.severity] += 1
  counts.doseChecks = doses.filter((d) => (d.combinedInto == null && !['within', 'no_reference'].includes(d.status)) || (d.rounding && !d.powder)).length

  return {
    cards,
    extension: {
      ...base, supported: true, empty: rowOrder.length === 0,
      verdict: { level: r.verdict.level, action: pick(r.verdict.action, locale), complete: c.complete, incompleteReasons: c.incompleteReasons },
      counts, rowStatus, notes, confirm, doses,
      unmapped: a.unmapped.map((u) => ({ ...u })),
      coverage: computeCoverage(c),
      rowSuggestions: rowPlanSuggestions({ base: c, visit, maps, locale, rc }),
      products: Object.fromEntries(rowOrder.filter((id) => productOfRow(id)).map((id) => [id, productDisplay(productOfRow(id), locale)])),
      engineMs: r.trace.ms,
      ms: opts.ms ?? r.trace.ms,
    },
  }
}

/** Cards that block `order-sign` (severity contraindicated or major). */
export const blockingCards = (response) => response.cards.filter((k) => k.extension.blocking)
