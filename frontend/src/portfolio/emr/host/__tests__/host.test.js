/**
 * Fictional EMR host (EMR popup spec §2.4.1 calculations, §2.4.2 search and new rows, §3.10 chart
 * line) and the host → SDK path: every demo visit V1–V10, sent the way the host sends it
 * (host 계산량 added, CDS-Hooks request, SDK check), must give exactly the §8.1 result of its
 * scenario E01–E10.
 */
import { describe, it, expect } from 'vitest'
import { calcAmount, totalMg, rowPrice, ageText, weightStaleDays, withCalc, requestFor, fmtNum } from '../calc.js'
import { newRow, itemInfo, catalogue } from '../catalog.js'
import { searchItems } from '../RxSearch.jsx'
import { chartLine, USER } from '../chart.js'
import { VISITS, SPEC, GATE_SCENARIOS } from '../../fixtures.js'
import { createDur } from '../../sdk.js'
import { check } from '../../adapter.js'
import { buildResponse, blockingCards } from '../../cards.js'
import { PRODUCTS } from '../../productMap.js'
import { guideProgress, GUIDE_STEPS } from '../GuideCoach.jsx'

const memoryLog = () => createDur({ storage: null })

describe('host calculations (§2.4.1, display only)', () => {
  it('per-kg mass: Qty × weight in the numerator unit, liquids add mL', () => {
    expect(calcAmount({ productCode: 'RX-IVM-SOL10', unit: 'mcg/kg', qty: 300 }, 24)).toMatchObject({ text: '7.2 mg (0.72 mL)', mg: 7.2, sendCalc: { value: 7.2, unit: 'mg' } })
    expect(calcAmount({ productCode: 'RX-KTZ-T200', unit: 'mg/kg', qty: 5 }, 24)).toMatchObject({ text: '120 mg', mg: 120, sendCalc: { value: 120, unit: 'mg' } })
    expect(calcAmount({ productCode: 'RX-MLX-INJ5', unit: 'mg/kg', qty: 0.3 }, 3.5).text).toBe('1.05 mg (0.21 mL)')
  })
  it('mg / mL are the Qty; EA is Qty × strength; no weight → blank', () => {
    expect(calcAmount({ productCode: 'RX-MMI-T25', unit: 'mg', qty: 2.5 }, 4.1)).toMatchObject({ text: '2.5 mg', mg: 2.5, sendCalc: null })
    expect(calcAmount({ productCode: 'RX-MLX-SUS15', unit: 'mL', qty: 0.21 }, 3.2).text).toBe('0.21 mL')
    expect(calcAmount({ productCode: 'RX-AML-T25', unit: 'EA', qty: 0.25 }, 4.1)).toMatchObject({ text: '0.625 mg', mg: 0.625 })
    expect(calcAmount({ productCode: 'RX-IVM-CH272', unit: 'EA', qty: 1 }, 24).text).toBe('272 mcg')
    expect(calcAmount({ productCode: 'RX-KTZ-T200', unit: 'mg/kg', qty: 5 }, null).text).toBe('')
    expect(calcAmount({ productCode: 'RX-IVM-SOL10', unit: 'EA', qty: 1 }, 24).text).toBe('')
    expect(calcAmount({ productCode: 'RX-PB-T15', unit: '포', qty: 1 }, 6).text).toBe('')
  })
  it('전체 = 계산량 (mg) × Tt × Dy; blank when a part is missing', () => {
    expect(totalMg({ productCode: 'RX-KTZ-T200', unit: 'mg/kg', qty: 5, tt: 2, dy: 21 }, 24)).toBe(5040)
    expect(totalMg({ productCode: 'RX-KTZ-T200', unit: 'mg/kg', qty: 5, tt: '', dy: 21 }, 24)).toBeNull()
    expect(fmtNum(5040)).toBe('5,040')
  })
  it('금액 uses the fictional unit price × Tt × Dy', () => {
    expect(rowPrice({ productCode: 'RX-IVM-SOL10', tt: 1, dy: 7 })).toBe(7000)
    expect(rowPrice({ productCode: 'RX-XYZ-999', tt: 1, dy: 7 })).toBeNull()
  })
  it('age and stale weight', () => {
    expect(ageText('2022-05-14', '2026-10-03')).toBe('4y 4m')
    expect(weightStaleDays({ birthDate: '2020-01-01', weight: { kg: 6, measuredAt: '2026-08-19' } }, '2026-10-03')).toBe(45)
    expect(weightStaleDays({ birthDate: '2020-01-01', weight: { kg: 6, measuredAt: '2026-09-10' } }, '2026-10-03')).toBeNull()
    expect(weightStaleDays({ birthDate: '2026-06-01', weight: { kg: 6, measuredAt: '2026-09-10' } }, '2026-10-03')).toBe(23)
  })
})

describe('catalogue, Rx 검색 and new rows (§2.4, §2.4.2)', () => {
  it('every product has a form suffix, a folder and a price', () => {
    for (const p of PRODUCTS) {
      const it = itemInfo(p.code)
      expect(it.name).toMatch(/\((정|주|액|외|캡|츄)\)$/)
      expect(it.folder).not.toBe('')
      expect(it.price).toBeGreaterThan(0)
    }
    expect(itemInfo('RX-IVM-SOL10').name).toBe('이버멕틴 경구액 10 mg/mL (액)')
  })
  it('search finds products by name, initials and English, and filters by form', () => {
    expect(searchItems('케토코나졸').map((x) => x.code)).toContain('RX-KTZ-T200')
    expect(searchItems('ㅋㅌㅋㄴㅈ').map((x) => x.code)).toContain('RX-KTZ-T200')
    expect(searchItems('meloxicam').map((x) => x.code)).toEqual(expect.arrayContaining(['RX-MLX-SUS15', 'RX-MLX-INJ5']))
    expect(searchItems('카프로펜 정 100 mg')[0].code).toBe('RX-CRP-T100')
    expect(searchItems('', { filters: ['주'] }).every((x) => x.form === 'injection')).toBe(true)
    expect(searchItems('멜록시캄', { filters: ['주'] }).map((x) => x.code)).toEqual(['RX-MLX-INJ5'])
    expect(searchItems('')).toEqual([])
  })
  it('a new row has the product default unit, empty Qty/Tt/Dy', () => {
    expect(newRow('RX-KTZ-T200', 'rx-3')).toEqual({ kind: 'Rx', rowId: 'rx-3', productCode: 'RX-KTZ-T200', unit: 'mg/kg', qty: '', tt: '', dy: '', rt: 'PO', dispense: '정제' })
    expect(newRow('RX-MLX-INJ5', 'rx-4')).toMatchObject({ kind: 'Tx', unit: 'mg/kg', rt: 'SC', qty: '' })
    expect(newRow('RX-PERM-SPOT', 'rx-5')).toMatchObject({ unit: 'EA', rt: 'Top' })
    expect(newRow('RX-IVM-SOL10', 'rx-6')).toMatchObject({ unit: 'mcg/kg' })
    expect(catalogue().some((x) => x.kind === 'procedure')).toBe(true)
  })
})

describe('host → SDK: V1–V10 reproduce E01–E10 (§2.6, §8.1)', () => {
  const sig = (resp) => ({
    level: resp.extension.verdict.level,
    complete: resp.extension.verdict.complete,
    reasons: resp.extension.verdict.incompleteReasons,
    cards: resp.cards.map((k) => `${k.extension.ruleIds.join('+')}/${k.extension.severity}[${k.extension.drugIds.join('+')}]`),
    rowStatus: resp.extension.rowStatus,
    blocking: blockingCards(resp).map((k) => k.extension.ruleIds[0]),
  })
  const pairs = Object.keys(VISITS).map((v, i) => [v, `E${String(i + 1).padStart(2, '0')}`])

  it.each(pairs)('%s through the host request equals %s', (vid, eid) => {
    const visit = VISITS[vid]
    const dur = memoryLog()
    const viaHost = dur.check(requestFor(visit, 'order-select', USER))
    const direct = buildResponse(check(SPEC[eid]), SPEC[eid], { locale: 'ko', hook: 'order-select', encounterId: visit.encounterId })
    expect(sig(viaHost)).toEqual(sig(direct))
    expect(viaHost.extension.notes.map((n) => n.id)).not.toContain(expect.stringMatching(/calc_mismatch/))
    expect(viaHost.extension.encounterId ?? visit.encounterId).toBe(`enc-${vid}-2026-10-03`)
    expect(sig(viaHost).blocking.length > 0).toBe(GATE_SCENARIOS.includes(eid))
  })

  it('the host sends 계산량 only on mg/kg and mcg/kg rows, and never a calc mismatch', () => {
    for (const v of Object.values(VISITS)) {
      const sent = withCalc(v)
      for (const r of sent.rows) {
        if (r.calc) expect(['mg/kg', 'mcg/kg']).toContain(r.unit)
      }
      const c = check(sent)
      expect(JSON.stringify(c)).not.toMatch(/calc_mismatch/)
    }
  })

  it('blank lab values are not sent', () => {
    const v = { ...VISITS.V3, patient: { ...VISITS.V3.patient, labs: [{ code: 'creatinine', value: '', unit: 'mg/dL', date: '2026-10-03' }] } }
    expect(requestFor(v, 'order-select', USER).prefetch.labs).toEqual([])
  })
})

describe('chart line (§3.10)', () => {
  it('one line per overridden card in the EMR style', () => {
    const line = chartLine({
      outcomeTimestamp: new Date(2026, 9, 3, 14, 32).toISOString(),
      overrideReason: { reason: { code: 'NV-J2' } },
      extension: { severity: 'contraindicated', ruleIds: ['MDR1_PGP_ML'], ruleVersion: '1.1.0', engineVersion: '1.2.0' },
    })
    expect(line).toBe('DUR 금기 1건 예외 처리 (NV-J2) · 김민서 (가상) 14:32 · 규칙 MDR1_PGP_ML@1.1.0 · 엔진 1.2.0')
    expect(line).not.toMatch(/—/)
  })
})

describe('new row ids are never reused (review F2)', async () => {
  const { nextRowId } = await import('../EmrApp.jsx')
  it('after the highest row is deleted, the next id skips it', () => {
    const rows = [{ rowId: 'rx-1' }, { rowId: 'rx-2' }]
    expect(nextRowId(rows)).toBe('rx-3')
    // rx-1 was deleted, but rx-2 had been issued: never hand out rx-1 or rx-2 again.
    expect(nextRowId([], 2)).toBe('rx-3')
    expect(nextRowId([{ rowId: 'rx-5' }], 2)).toBe('rx-6')
  })
})

describe('demo guide progress (GuideCoach)', () => {
  const states = (done) => {
    const { isDone, current } = guideProgress(done)
    return GUIDE_STEPS.map((s, i) => (isDone(s, i) ? 'done' : s.key === current?.key ? 'current' : 'todo'))
  }
  it('starts on the first step', () => {
    expect(states({})).toEqual(['current', 'todo', 'todo', 'todo'])
  })
  it('never ticks a later step off before an earlier one (expanding the island also shows the results)', () => {
    expect(states({ island: true })).toEqual(['done', 'done', 'current', 'todo'])
    expect(states({ sign: true })).toEqual(['done', 'done', 'done', 'done'])
    expect(guideProgress({ sign: true }).current).toBeNull()
  })
})
