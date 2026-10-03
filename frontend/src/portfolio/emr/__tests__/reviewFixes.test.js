/**
 * Regression tests for the clinical review of the EMR DUR popup (fix round,
 * 2026-10-03): F1, F2, F5, F7, F10, F12 and per-encounter log clearing.
 * Every case runs through the real adapter, engine and SDK.
 */
import { describe, it, expect } from 'vitest'
import { check, mapFrequency, mapRoute, mapUnit, mapSpecies } from '../adapter.js'
import { createDur } from '../sdk.js'
import { toCdsRequest } from '../cds.js'
import { P, rx, tx, v, W, D, loadVisit } from '../fixtures.js'
import { getStrength } from '../../knowledge/drugs.js'
import { computeCoverage } from '../coverage.js'

const lab = (code, value, unit, date) => ({ code, value, unit, date })
const findings = (c) => c.result.findings.map((f) => `${f.ruleId}/${f.severity}`)
const memoryStorage = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, val) => m.set(k, String(val)), removeItem: (k) => m.delete(k) }
}

describe('F1: a single-administration 용법 with 일수 > 1 is a conflict, checked daily', () => {
  it.each([['1회'], ['단회'], ['stat']])('용법 %s + Tt1 + Dy14 → q24h + freq_conflict', (sig) => {
    expect(mapFrequency({ sig, tt: 1, dy: 14 })).toEqual({ frequency: 'q24h', confirm: 'freq_conflict' })
  })
  it('용법 "1회" + Tt2 + Dy3 → q12h + freq_conflict; blank Tt → q24h', () => {
    expect(mapFrequency({ sig: '1회', tt: 2, dy: 3 })).toEqual({ frequency: 'q12h', confirm: 'freq_conflict' })
    expect(mapFrequency({ sig: '1회', tt: '', dy: 3 })).toEqual({ frequency: 'q24h', confirm: 'freq_conflict' })
  })
  it('용법 "1회" + Tt1 + Dy1 is still one administration', () => {
    expect(mapFrequency({ sig: '1회', tt: 1, dy: 1 })).toEqual({ frequency: 'once' })
  })
  it('cat meloxicam injection, 용법 "단회", Dy3 keeps the repeated-use finding and the gate (U1)', () => {
    const c = check(v(P.LEO, [], [tx('tx-1', 'RX-MLX-INJ5', 'mg/kg', 0.3, 1, 3, 'SC', { sig: '단회' })]))
    expect(findings(c)).toEqual(['SPECIES_HARDSTOP/major'])
    expect(c.complete).toBe(false)
  })
  it('dog meloxicam 0.2 mg/kg, 용법 "1회", Dy14 is checked as a daily course (U2b)', () => {
    const c = check(v(P.HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-MLX-SUS15', 'mg/kg', 0.2, 1, 14, 'PO', { sig: '1회' })]))
    expect(findings(c)).toEqual(['DOSE_RANGE/major'])
  })
})

describe('F7: an unreadable 용법 is flagged, not ignored', () => {
  it('"주 2회" + Tt1 → checked at q24h with sig_unrecognised (incomplete)', () => {
    const c = check(v(P.HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-CRP-T100', 'mg/kg', 4.4, 1, 7, 'PO', { sig: '주 2회' })]))
    expect(c.adapter.rows['rx-1'].confirm).toEqual(['sig_unrecognised'])
    expect(c.complete).toBe(false)
  })
})

describe('F5: implausible body weight', () => {
  it('a 300 kg dog or a 35 kg cat is incomplete (weight_implausible); 30 kg is not', () => {
    const dog = check(v(W(P.DAEBAK, 300), ['D-GI-001'], [rx('rx-1', 'RX-MRP-T60', 'mg/kg', 2, 1, 2)]))
    expect(dog.incompleteReasons).toContain('weight_implausible')
    const kitty = check(v(W(P.LEO, 35), ['D-URO-002'], [rx('rx-1', 'RX-ENR-T68', 'EA', 0.5, 1, 10)]))
    expect(kitty.incompleteReasons).toContain('weight_implausible')
    expect(computeCoverage(kitty).partial.map((x) => x.item)).toContain('dose')
    expect(check(v(P.DAEBAK, ['D-GI-001'], [rx('rx-1', 'RX-MRP-T60', 'mg/kg', 2, 1, 2)])).incompleteReasons).not.toContain('weight_implausible')
  })
  it('the 확인 필요 line says what to check and opens the weight field', () => {
    const r = createDur({ storage: null }).check(v(W(P.DAEBAK, 300), ['D-GI-001'], [rx('rx-1', 'RX-MRP-T60', 'mg/kg', 2, 1, 2)]))
    expect(r.extension.confirm.find((x) => x.key === 'weight_implausible')).toMatchObject({ field: 'weight', text: '체중 300 kg: 입력 오류일 수 있습니다. 확인하십시오' })
  })
})

describe('F10: route words and the split message', () => {
  it.each([['SQ', 'SC'], ['sq', 'SC'], ['피하', 'SC'], ['경구', 'PO'], ['정맥', 'IV'], ['근육', 'IM']])('%s → %s', (raw, route) => {
    expect(mapRoute(raw)).toEqual({ route })
  })
  it('an unknown typed route is route_unrecognised, a blank one route_missing', () => {
    expect(mapRoute('XYZ')).toEqual({ route: null, confirm: 'route_unrecognised' })
    expect(mapRoute('')).toEqual({ route: null, confirm: 'route_missing' })
  })
  it('the step-1 split message says the product cannot be split', () => {
    const r = createDur({ storage: null }).check(v(P.HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-ROB-T20', 'EA', 0.5, 1, 3)]))
    expect(r.extension.confirm.find((x) => x.key === 'split_not_allowed').text).toBe('확인 필요: 이 제형은 분할할 수 없습니다')
  })
})

describe('F12: input edge cases', () => {
  it('Qty 0 asks for an amount instead of reporting "below range"', () => {
    const c = check(v(P.HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-CRP-T100', 'mg/kg', 0, 1, 7)]))
    expect(c.adapter.rows['rx-1'].confirm).toContain('dose_zero')
    expect(findings(c)).toEqual([])
    expect(c.complete).toBe(false)
  })
  it('an undated creatinine is used but marked lab_undated_creatinine', () => {
    const c = check(v({ ...P.HAPPY, labs: [lab('creatinine', 2.5, 'mg/dL', undefined)] }, ['D-MSK-002'], [rx('rx-1', 'RX-MLX-SUS15', 'mg/kg', 0.1, 1, 14)]))
    expect(c.incompleteReasons).toContain('lab_undated_creatinine')
    expect(c.result.findings.map((f) => f.ruleId)).toContain('NSAID_RENAL')
  })
  it('a dated result wins over an undated one', () => {
    const c = check(v({ ...P.HAPPY, labs: [lab('creatinine', 2.5, 'mg/dL', undefined), lab('creatinine', 1.0, 'mg/dL', D)] }, ['D-MSK-002'], [rx('rx-1', 'RX-MLX-SUS15', 'mg/kg', 0.1, 1, 14)]))
    expect(c.adapter.caseInput.labs.creatinine).toBe(1)
  })
  it.each([['강아지', 'dog'], ['반려견', 'dog'], ['반려묘', 'cat']])('species %s → %s', (t, species) => {
    expect(mapSpecies(t)).toEqual({ species })
  })
  it.each([['㎎/㎏', 'mg/kg'], ['mg / kg', 'mg/kg'], ['MG/KG', 'mg/kg'], ['㎖', 'mL'], ['μg/kg', 'mcg/kg']])('unit %s → %s', (raw, unit) => {
    expect(mapUnit(raw, getStrength('carprofen', 'carp_tab_100'))).toEqual({ unit })
  })
  it('"없음" in the allergy field is no allergy, not a free-text allergy', () => {
    const c = check(v({ ...P.COCO, allergies: [{ text: '없음' }] }, ['D-DERM-020'], [rx('rx-1', 'RX-AMC-T250', 'mg/kg', 12.5, 2, 7)]))
    expect(c.visitReasons).toEqual([])
    expect(c.complete).toBe(true)
  })
})

describe('F2: accepting a suggestion never silences a blocking card', () => {
  it('V1: accept "이버멕틴 삭제" but keep the row, then save → the gate still opens', async () => {
    const dur = createDur({ storage: memoryStorage() })
    const req = toCdsRequest(loadVisit('V1'), 'order-sign')
    const p = dur.gate(req)
    const card = dur.getGate().cards[0]
    dur.acceptSuggestion(card.uuid, card.suggestions[0].uuid)
    expect((await p).proceed).toBe(false)
    const again = dur.gate(req)
    expect(dur.getGate()?.cards).toHaveLength(1)
    dur.closeGate()
    expect((await again).proceed).toBe(false)
  })
  it('an override still silences the same card (dedupe unchanged)', async () => {
    const dur = createDur({ storage: memoryStorage() })
    const req = toCdsRequest(loadVisit('V1'), 'order-sign')
    const p = dur.gate(req)
    const card = dur.getGate().cards[0]
    dur.setDraft(card.extension.ackKey, { reasonCode: 'NV-J2', comment: '케토코나졸 감량 병용, 2주 후 재검', ownerInformed: true })
    const res = dur.proceed()
    expect(res.ok).toBe(true)
    expect((await p).proceed).toBe(true)
    expect(await dur.gate(req)).toEqual({ proceed: true, feedback: [] })
  })
})

describe('clearLog(encounterId) clears one visit only (WP4 request)', () => {
  it('V1 and V7 overrides; clearing V1 keeps V7', async () => {
    const dur = createDur({ storage: memoryStorage() })
    for (const id of ['V1', 'V7']) {
      const p = dur.gate(toCdsRequest(loadVisit(id), 'order-sign'))
      for (const k of dur.getGate().cards) dur.setDraft(k.extension.ackKey, { reasonCode: 'NV-J2', comment: '보호자 동의 후 2주 뒤 재검 예정', ownerInformed: true })
      expect(dur.proceed().ok).toBe(true)
      await p
    }
    expect(dur.getLog('enc-V1-2026-10-03').length).toBeGreaterThan(0)
    dur.clearLog('enc-V1-2026-10-03')
    expect(dur.getLog('enc-V1-2026-10-03')).toEqual([])
    expect(dur.getLog('enc-V7-2026-10-03').length).toBeGreaterThan(0)
    dur.clearLog()
    expect(dur.getLog()).toEqual([])
  })
})
