/**
 * EMR popup spec §3.2, §3.5, §3.8–§3.10 at the logic level: check(), the gate() promise,
 * override requirements, dedupe by ackKey, suggestions inside the gate, NV-DATA, the
 * Feedback log and its storage fallback. The widget UI (WP3) drives these same calls.
 */
import { describe, it, expect, vi } from 'vitest'
import { createDur } from '../sdk.js'
import { toCdsRequest } from '../cds.js'
import { createFeedbackLog, LOG_KEY } from '../feedbackLog.js'
import { VISITS, loadVisit, W } from '../fixtures.js'

const memoryStorage = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, val) => m.set(k, String(val)), removeItem: (k) => m.delete(k), _m: m }
}
const throwingStorage = () => ({ getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } })
const FIXED = new Date('2026-10-03T05:32:10.000Z')
const make = (opts = {}) => {
  const events = []
  const dur = createDur({ storage: memoryStorage(), now: () => FIXED, onEvent: (e) => events.push(e), ...opts })
  return { dur, events }
}
const sign = (visit) => toCdsRequest(visit, 'order-sign')
const select = (visit) => toCdsRequest(visit, 'order-select')
const GOOD = '케토코나졸 감량 병용, 2주 후 재검'
const settle = () => new Promise((r) => setTimeout(r, 0))

describe('check (order-select)', () => {
  it('returns the response, stores it and emits "cards"; never opens a gate', () => {
    const { dur, events } = make()
    const r = dur.check(select(VISITS.V1))
    expect(r.cards).toHaveLength(1)
    expect(r.extension.hook).toBe('order-select')
    expect(r.extension.encounterId).toBe('enc-V1-2026-10-03')
    expect(events.map((e) => e.type)).toEqual(['cards'])
    expect(dur.getState().response).toBe(r)
    expect(dur.getState().gate).toBe(null)
    expect(dur.lastResult('enc-V1-2026-10-03')).toBe(r)
    expect(r.extension.ms).toBeGreaterThanOrEqual(0)
  })
  it('accepts a bare visit model too', () => {
    const { dur } = make()
    expect(dur.check(VISITS.V1).cards[0].uuid).toBe(dur.check(select(VISITS.V1)).cards[0].uuid)
  })
  it('V8: changing the meloxicam Tx row Dy 1 → 3 adds a major badge and a second card with no suggestion', () => {
    const { dur } = make()
    const v = loadVisit('V8')
    expect(dur.check(select(v)).cards).toHaveLength(1)
    v.rows[1].dy = 3
    const r = dur.check(select(v))
    expect(r.cards).toHaveLength(2)
    expect(r.extension.rowStatus['rx-2']).toMatchObject({ badge: 'major', inClinic: true })
    expect(r.cards.find((k) => k.extension.ruleIds[0] === 'SPECIES_HARDSTOP').suggestions).toEqual([])
  })
  it('subscribers get state after every change; listener errors never break a check', () => {
    const { dur } = make()
    const seen = []
    const off = dur.subscribe((s) => seen.push(s.response?.extension.verdict.level))
    dur.addEventListener(() => { throw new Error('host bug') })
    dur.check(select(VISITS.V2))
    off()
    dur.check(select(VISITS.V1))
    expect(seen).toEqual(['moderate'])
  })
  it('setLocale re-renders the last response in the new locale', () => {
    const { dur, events } = make()
    dur.check(select(VISITS.V1))
    dur.setLocale('en')
    expect(dur.getState().locale).toBe('en')
    expect(dur.getState().response.extension.verdict.action).toBe('Do not dispense as written')
    expect(events.filter((e) => e.type === 'cards')).toHaveLength(2)
  })
})

describe('gate (order-sign)', () => {
  it.each(['V2', 'V3', 'V5', 'V6'])('%s saves directly', async (vid) => {
    const { dur, events } = make()
    await expect(dur.gate(sign(VISITS[vid]))).resolves.toEqual({ proceed: true, feedback: [] })
    expect(events.some((e) => e.type === 'gate-open')).toBe(false)
  })
  it.each(['V1', 'V4', 'V7', 'V8', 'V9', 'V10'])('%s opens the gate', async (vid) => {
    const { dur, events } = make()
    const p = dur.gate(sign(VISITS[vid]))
    await settle()
    expect(events.find((e) => e.type === 'gate-open').cardIds.length).toBeGreaterThan(0)
    expect(dur.getGate().cards.every((k) => k.extension.blocking)).toBe(true)
    dur.closeGate()
    await expect(p).resolves.toEqual({ proceed: false, feedback: [] })
    expect(events.at(-1)).toEqual({ type: 'gate-close', proceed: false })
  })
  it('V1: proceeding needs a reason, a valid comment and the owner checkbox; logs one §3.10 Feedback', async () => {
    const { dur } = make()
    const p = dur.gate(sign(VISITS.V1))
    const card = dur.getGate().cards[0]
    const key = card.extension.ackKey
    expect(dur.canProceed()).toBe(false)
    expect(dur.proceed().ok).toBe(false)
    dur.setDraft(key, { reasonCode: 'NV-INT' })
    expect(dur.canProceed()).toBe(false)
    dur.setDraft(key, { comment: 'ㅋㅋㅋㅋㅋㅋㅋㅋㅋ' })
    expect(dur.validate(card.uuid).errors).toEqual({ comment: 'comment_invalid', owner: 'owner_required' })
    dur.setDraft(key, { comment: GOOD })
    expect(dur.canProceed()).toBe(false)
    dur.setDraft(key, { ownerInformed: true })
    expect(dur.canProceed()).toBe(true)
    const out = dur.proceed()
    expect(out.ok).toBe(true)
    const result = await p
    expect(result.proceed).toBe(true)
    expect(result.feedback).toHaveLength(1)
    expect(result.feedback[0]).toEqual({
      card: card.uuid,
      outcome: 'overridden',
      overrideReason: {
        reason: { system: 'https://nuvovet.example/CodeSystem/dur-override', code: 'NV-INT', display: '의도된 병용, 혈중농도·반응 모니터링 예정' },
        userComment: GOOD,
      },
      outcomeTimestamp: '2026-10-03T05:32:10.000Z',
      extension: {
        ackKey: key, ruleIds: ['MDR1_PGP_ML'], ruleVersion: card.extension.ruleVersion, severity: 'contraindicated',
        drugIds: ['ivermectin', 'ketoconazole'], problemKey: 'mdr1:ivermectin', inputHash: card.extension.inputHash, engineVersion: '1.2.0',
        userId: 'Practitioner/demo-kim', patientId: '1042', encounterId: 'enc-V1-2026-10-03', ownerInformed: true, hook: 'order-sign',
      },
    })
    expect(dur.getLog('enc-V1-2026-10-03')).toEqual(result.feedback)
  })
  it('V7 (major): a reason alone enables proceed; the owner checkbox is optional and logged', async () => {
    const { dur } = make()
    const p = dur.gate(sign(VISITS.V7))
    const [card] = dur.getGate().cards
    expect(card.extension.ruleIds[0]).toBe('NSAID_CORTICOSTEROID')
    dur.setDraft(card.extension.ackKey, { reasonCode: 'NV-J2' })
    expect(dur.canProceed()).toBe(true)
    dur.proceed()
    const r = await p
    expect(r.feedback[0].extension.ownerInformed).toBe(false)
  })
  it('V7: NV-OTH also needs a valid comment', async () => {
    const { dur } = make()
    dur.gate(sign(VISITS.V7))
    const [card] = dur.getGate().cards
    dur.setDraft(card.extension.ackKey, { reasonCode: 'NV-OTH', comment: '짧음' })
    expect(dur.canProceed()).toBe(false)
    dur.setDraft(card.extension.ackKey, { comment: '통증 조절 위해 단기 병용, 위장 증상 관찰' })
    expect(dur.canProceed()).toBe(true)
    dur.closeGate()
  })
  it('dedupe: after overriding V7, saving again opens no gate; a dose or weight change re-raises it', async () => {
    const { dur } = make()
    const p = dur.gate(sign(VISITS.V7))
    dur.setDraft(dur.getGate().cards[0].extension.ackKey, { reasonCode: 'NV-J2' })
    dur.proceed()
    await p
    await expect(dur.gate(sign(VISITS.V7))).resolves.toEqual({ proceed: true, feedback: [] })
    const pred1 = loadVisit('V7')
    pred1.rows[1].qty = 1
    const p2 = dur.gate(sign(pred1))
    expect(dur.getGate()?.cards).toHaveLength(1)
    dur.closeGate()
    await p2
    const heavier = { ...loadVisit('V7'), patient: W(VISITS.V7.patient, 26) }
    const p3 = dur.gate(sign(heavier))
    expect(dur.getGate()?.cards).toHaveLength(1)
    dur.closeGate()
    await p3
  })
  it('dedupe is per encounter', async () => {
    const { dur } = make()
    const p = dur.gate(sign(VISITS.V7))
    dur.setDraft(dur.getGate().cards[0].extension.ackKey, { reasonCode: 'NV-J2' })
    dur.proceed()
    await p
    const other = { ...loadVisit('V7'), encounterId: 'enc-V7-2026-10-04' }
    dur.gate(sign(other))
    expect(dur.getGate()).not.toBe(null)
    dur.closeGate()
  })
  it('an inline panel override (예외 사유 입력) logs `overridden` and the gate skips the card', async () => {
    const { dur } = make()
    const r = dur.check(select(VISITS.V7))
    const card = r.cards.find((k) => k.extension.blocking)
    expect(dur.override(card.uuid, { reasonCode: 'NV-INT' }).ok).toBe(true)
    expect(dur.getLog()[0]).toMatchObject({ outcome: 'overridden', extension: { hook: 'order-select' } })
    await expect(dur.gate(sign(VISITS.V7))).resolves.toEqual({ proceed: true, feedback: [] })
  })
  it('drafts are kept per ackKey: reopening the gate restores them', async () => {
    const { dur } = make()
    let p = dur.gate(sign(VISITS.V1))
    const key = dur.getGate().cards[0].extension.ackKey
    dur.setDraft(key, { reasonCode: 'NV-J2', comment: GOOD })
    dur.closeGate()
    await p
    p = dur.gate(sign(VISITS.V1))
    expect(dur.getDraft(key)).toEqual({ reasonCode: 'NV-J2', comment: GOOD, ownerInformed: false })
    dur.closeGate()
    await p
  })
  it('V1: accepting "이버멕틴 삭제" in the gate emits remove-row, logs `accepted`, and closes with focusRowId', async () => {
    const { dur, events } = make()
    const p = dur.gate(sign(VISITS.V1))
    const [card] = dur.getGate().cards
    const sugg = card.suggestions[0]
    expect(sugg.label).toBe('이버멕틴 삭제')
    dur.acceptSuggestion(card.uuid, sugg.uuid)
    const r = await p
    expect(r.proceed).toBe(false)
    expect(r.focusRowId).toBe('rx-1')
    expect(events).toContainEqual({ type: 'remove-row', rowId: 'rx-1' })
    const log = dur.getLog()
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ outcome: 'accepted', acceptedSuggestions: [{ id: sugg.uuid }] })
    expect(log[0].overrideReason).toBeUndefined()
    // The host deletes the row and re-checks: the card is gone.
    const after = loadVisit('V1')
    after.rows = after.rows.filter((x) => x.rowId !== 'rx-1')
    expect(dur.check(select(after)).cards).toEqual([])
  })
  it('NV-DATA on V1 emits fix-chart (mdr1), closes the gate and logs nothing', async () => {
    const { dur, events } = make()
    const p = dur.gate(sign(VISITS.V1))
    const [card] = dur.getGate().cards
    const out = dur.override(card.uuid, { reasonCode: 'NV-DATA' })
    expect(out).toMatchObject({ ok: false, fixChart: 'mdr1' })
    expect(events).toContainEqual({ type: 'fix-chart', field: 'mdr1' })
    await expect(p).resolves.toEqual({ proceed: false, feedback: [] })
    expect(dur.getLog()).toEqual([])
  })
  it('V4 (species hard stop) offers only NV-DATA and NV-OTH; NV-OTH needs a comment and the owner box', async () => {
    const { dur } = make()
    dur.gate(sign(VISITS.V4))
    const [card] = dur.getGate().cards
    expect(card.overrideReasons.map((x) => x.code)).toEqual(['NV-DATA', 'NV-OTH'])
    dur.setDraft(card.extension.ackKey, { reasonCode: 'NV-J2', comment: GOOD, ownerInformed: true })
    expect(dur.canProceed()).toBe(false)
    dur.setDraft(card.extension.ackKey, { reasonCode: 'NV-OTH' })
    expect(dur.canProceed()).toBe(true)
    dur.closeGate()
  })
  it('a second gate() resolves the first as proceed:false; unmount resolves a pending gate', async () => {
    const { dur } = make()
    const p1 = dur.gate(sign(VISITS.V1))
    const p2 = dur.gate(sign(VISITS.V7))
    await expect(p1).resolves.toEqual({ proceed: false, feedback: [] })
    dur.unmount()
    await expect(p2).resolves.toEqual({ proceed: false, feedback: [] })
    expect(dur.getState().mounted).toBe(false)
  })
  it('the gate carries the non-blocking 확인 필요 lines and the patient identity line data', async () => {
    const { dur } = make()
    const v = loadVisit('V10')
    v.rows.push({ kind: 'Rx', rowId: 'rx-2', productCode: 'RX-AMC-T375', unit: 'mg/kg', qty: 12.5, tt: '', dy: 7, rt: 'PO' })
    dur.gate(sign(v))
    const g = dur.getGate()
    expect(g.patient).toMatchObject({ name: '코코', species: '개', weightKg: 12 })
    expect(g.confirm.map((x) => x.key)).toContain('freq_missing')
    dur.closeGate()
  })
})

describe('acknowledge, protocol choice, events', () => {
  it('moderate "확인함" logs `accepted`; blocking cards cannot be acknowledged', () => {
    const { dur } = make()
    const r = dur.check(select(VISITS.V2))
    expect(dur.acknowledge(r.cards[0].uuid)).toMatchObject({ ok: true, entry: { outcome: 'accepted' } })
    const r1 = dur.check(select(VISITS.V1))
    expect(dur.acknowledge(r1.cards[0].uuid).ok).toBe(false)
  })
  it('chooseProtocol, focusRow, openWorkbench and fixChart emit the §3.2 events', () => {
    const { dur, events } = make()
    dur.chooseProtocol('rx-1', 'maro_dog_vomit')
    dur.focusRow('rx-1', true)
    dur.openWorkbench('#/case/custom')
    dur.fixChart('weight')
    expect(events).toEqual([
      { type: 'update-row', rowId: 'rx-1', patch: { protocolChoice: 'maro_dog_vomit' } },
      { type: 'focus-row', rowId: 'rx-1', highlight: true },
      { type: 'open-workbench', href: '#/case/custom' },
      { type: 'fix-chart', field: 'weight' },
    ])
  })
  it('options: links.workbenchBase, user, productMap as a list', () => {
    const { dur } = make({ links: { workbenchBase: '/dur#' }, user: { id: 'Practitioner/x', display: 'X' }, productMap: [{ code: 'P1', display: '이버멕틴 경구액', drugId: 'ivermectin', strengthId: 'iver_sol_10' }] })
    const v = loadVisit('V1')
    v.rows = [{ ...v.rows[0], productCode: 'P1' }]
    const r = dur.check(select(v))
    expect(r.cards[0].links[0].url.startsWith('/dur#/case/custom')).toBe(true)
    expect(dur.getState().user.id).toBe('Practitioner/x')
    const v2 = loadVisit('V1') // RX- codes are unknown to this formulary
    expect(dur.check(select(v2)).extension.unmapped.map((u) => u.code)).toEqual(['RX-IVM-SOL10', 'RX-KTZ-T200'])
  })
})

describe('feedback log (§3.10)', () => {
  it('mirrors to localStorage["nv-dur-log"], exports {"feedback": [...]}, and clears', () => {
    const storage = memoryStorage()
    const log = createFeedbackLog({ storage })
    log.add({ card: 'card-1', outcome: 'accepted', extension: { encounterId: 'e1', ackKey: 'k' } })
    expect(JSON.parse(storage.getItem(LOG_KEY))).toHaveLength(1)
    expect(JSON.parse(log.export())).toEqual({ feedback: [{ card: 'card-1', outcome: 'accepted', extension: { encounterId: 'e1', ackKey: 'k' } }] })
    expect(log.isAcknowledged('e1', 'k')).toBe(true)
    expect(log.isAcknowledged('e2', 'k')).toBe(false)
    expect(createFeedbackLog({ storage }).all()).toHaveLength(1) // reloaded
    log.clear()
    expect(storage.getItem(LOG_KEY)).toBe(null)
  })
  it('caps at 200 entries, oldest dropped', () => {
    const log = createFeedbackLog({ storage: null })
    for (let i = 0; i < 205; i++) log.add({ card: `c${i}`, outcome: 'accepted', extension: {} })
    expect(log.all()).toHaveLength(200)
    expect(log.all()[0].card).toBe('c5')
  })
  it('works identically when storage throws', async () => {
    const { dur } = make({ storage: throwingStorage() })
    const p = dur.gate(sign(VISITS.V7))
    dur.setDraft(dur.getGate().cards[0].extension.ackKey, { reasonCode: 'NV-J2' })
    dur.proceed()
    expect((await p).proceed).toBe(true)
    expect(JSON.parse(dur.exportLog()).feedback).toHaveLength(1)
    await expect(dur.gate(sign(VISITS.V7))).resolves.toEqual({ proceed: true, feedback: [] })
    dur.clearLog()
    expect(dur.getLog()).toEqual([])
  })
  it('works when localStorage is absent or its accessor throws', () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError') } })
    try {
      const dur = createDur({ now: () => FIXED })
      dur.check(select(VISITS.V2))
      expect(dur.acknowledge(dur.getState().response.cards[0].uuid).ok).toBe(true)
      expect(dur.getLog()).toHaveLength(1)
    } finally {
      if (desc) Object.defineProperty(globalThis, 'localStorage', desc)
      else delete globalThis.localStorage
    }
  })
  it('a corrupt stored log is ignored', () => {
    const storage = memoryStorage()
    storage.setItem(LOG_KEY, '{not json')
    expect(createFeedbackLog({ storage }).all()).toEqual([])
    vi.restoreAllMocks()
  })
})

describe('staying non-blocking (§3.13)', () => {
  it('check() of a 10-row visit, cards and re-checked suggestions included, takes < 50 ms', () => {
    const { dur } = make()
    const v7 = loadVisit('V7')
    const extra = [
      { kind: 'Rx', rowId: 'rx-5', productCode: 'RX-MLX-SUS15', unit: 'mg/kg', qty: 0.1, tt: 1, dy: 7, rt: 'PO' },
      { kind: 'Rx', rowId: 'rx-6', productCode: 'RX-PB-T15', unit: 'mg/kg', qty: 2.5, tt: 2, dy: 30, rt: 'PO' },
      { kind: 'Rx', rowId: 'rx-7', productCode: 'RX-CSA-C10', unit: 'mg/kg', qty: 5, tt: 1, dy: 30, rt: 'PO' },
      { kind: 'Rx', rowId: 'rx-8', productCode: 'RX-KTZ-T200', unit: 'mg/kg', qty: 10, tt: 1, dy: 21, rt: 'PO' },
      { kind: 'Rx', rowId: 'rx-9', productCode: 'RX-OMP-C10', unit: 'mg/kg', qty: 1, tt: 2, dy: 14, rt: 'PO' },
      { kind: 'Rx', rowId: 'rx-10', productCode: 'RX-FAM-T10', unit: 'mg/kg', qty: 0.5, tt: 2, dy: 14, rt: 'PO' },
    ]
    const req = select({ ...v7, rows: [...v7.rows, ...extra] })
    dur.check(req) // warm-up
    const times = []
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now()
      const r = dur.check(req)
      times.push(performance.now() - t0)
      expect(r.cards.length).toBeGreaterThan(5)
    }
    expect(Math.min(...times)).toBeLessThan(50)
  })
})
