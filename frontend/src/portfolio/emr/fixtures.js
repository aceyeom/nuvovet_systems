/**
 * Fictional visits for the EMR demo (EMR popup spec Appendix B, §2.6).
 *
 * `SPEC` and `NEW` are the accuracy-test visits E01–E53, verbatim from Appendix B
 * (§8.1 binding outputs were produced from them). `VISITS` are the demo visits
 * V1–V10 the host EMR loads: the same patients and rows as E01–E10, plus display
 * data for the host (visit id, encounter id, diagnosis names, masked guardian,
 * 특이사항). Every name, code and number here is fictional; nothing comes from a
 * real chart or a compendium.
 *
 * Visit model (what the adapter reads; `toCdsRequest` / `toVisit` round-trip it):
 *   { id?, encounterId?, date, patient, diagnoses: [{ code, display? }], rows: [Row] }
 *   patient = { id, name, species, breed, sex, birthDate, weight: { kg, measuredAt } | null,
 *               labs: [{ code, value, unit, date }], allergies: [{ code } | { text }], mdr1 }
 *   Row = { kind: 'Rx' | 'Tx', rowId, productCode, unit, qty, tt, dy, rt,
 *           sig?, calc?: { value, unit }, dispense?: '정제' | '가루', protocolChoice? }
 */

import { CONDITION_BY_ID } from '../knowledge/conditions.js'
import { CONDITION_MAP } from './conditionMap.js'

export const D = '2026-10-03'
export const rx = (rowId, productCode, unit, qty, tt, dy, rt = 'PO', extra = {}) => ({ kind: 'Rx', rowId, productCode, unit, qty, tt, dy, rt, ...extra })
export const tx = (...a) => ({ ...rx(...a), kind: 'Tx' })
const pt = (o) => ({ mdr1: 'unknown', allergies: [], labs: [], ...o })

export const P = {
  CHOCO: pt({ id: '1042', name: '초코', species: 'Canine', breed: 'ROUGH COLLIE/러프 콜리', sex: 'Neutered Male', birthDate: '2022-05-14', weight: { kg: 24.0, measuredAt: D } }),
  KONGYI: pt({ id: '0877', name: '콩이', species: 'Canine', breed: 'SHIH TZU/시츄', sex: 'Neutered Male', birthDate: '2020-03-02', weight: { kg: 6.0, measuredAt: D } }),
  NABI: pt({ id: '1310', name: '나비', species: 'Feline', breed: 'KOREAN SHORTHAIR/코리안숏헤어', sex: 'Spayed Female', birthDate: '2013-06-20', weight: { kg: 4.1, measuredAt: D }, labs: [{ code: 'creatinine', value: 2.0, unit: 'mg/dL', date: '2026-10-01' }] }),
  MOCHI: pt({ id: '1455', name: '모찌', species: 'Feline', breed: 'KOREAN SHORTHAIR/코리안숏헤어', sex: 'Spayed Female', birthDate: '2024-04-11', weight: { kg: 3.8, measuredAt: D } }),
  DAEBAK: pt({ id: '0921', name: '대박', species: 'Canine', breed: 'LABRADOR RETRIEVER/래브라도 리트리버', sex: 'Spayed Female', birthDate: '2023-01-30', weight: { kg: 30.0, measuredAt: D } }),
  BORI: pt({ id: '1502', name: '보리', species: 'Canine', breed: 'MALTESE/말티즈', sex: 'Spayed Female', birthDate: '2014-08-08', weight: { kg: 3.2, measuredAt: D }, labs: [{ code: 'creatinine', value: 2.1, unit: 'mg/dL', date: '2026-09-29' }] }),
  HAPPY: pt({ id: '0650', name: '해피', species: 'Canine', breed: 'GOLDEN RETRIEVER/골든 리트리버', sex: 'Neutered Male', birthDate: '2019-02-17', weight: { kg: 28.0, measuredAt: D } }),
  LEO: pt({ id: '1388', name: '레오', species: 'Feline', breed: 'RUSSIAN BLUE/러시안 블루', sex: 'Neutered Male', birthDate: '2017-07-01', weight: { kg: 3.5, measuredAt: D } }),
  DUBU: pt({ id: '1620', name: '두부', species: 'Canine', breed: 'POODLE/푸들', sex: 'Neutered Male', birthDate: '2021-11-03', weight: { kg: 8.0, measuredAt: D } }),
  COCO: pt({ id: '1733', name: '코코', species: 'Canine', breed: 'BEAGLE/비글', sex: 'Intact Female', birthDate: '2022-09-09', weight: { kg: 12.0, measuredAt: D }, allergies: [{ code: 'penicillin' }] }),
  TOFU: pt({ id: '1801', name: '토끼', species: 'Rabbit', breed: 'HOLLAND LOP/홀랜드 롭', sex: 'Unknown', birthDate: '2024-01-01', weight: { kg: 1.8, measuredAt: D } }),
}

export const v = (patient, dx, rows) => ({ date: D, patient, diagnoses: dx.map((code) => ({ code })), rows })
export const W = (p, kg, measuredAt = D) => ({ ...p, weight: kg == null ? null : { kg, measuredAt } })

const { CHOCO, KONGYI, NABI, MOCHI, DAEBAK, BORI, HAPPY, LEO, DUBU, COCO, TOFU } = P
const V6rows = (r1) => [r1, rx('rx-2', 'RX-FUR-T125', 'mg/kg', 2, 2, 14), rx('rx-3', 'RX-PIM-CH125', 'mg/kg', 0.25, 2, 14), rx('rx-4', 'RX-BNZ-T5', 'mg/kg', 0.5, 1, 14)]
const V7rows = (tt) => [rx('rx-1', 'RX-CRP-T100', 'mg/kg', 4.4, 1, 7), rx('rx-2', 'RX-PRED-T5', 'mg/kg', 0.5, 1, 7), rx('rx-3', 'RX-TRM-T50', 'mg/kg', 5, tt, 5), rx('rx-4', 'RX-TRZ-T100', 'mg/kg', 10, 1, 1)]

export const SPEC = {
  E01: v(CHOCO, ['D-DERM-012', 'D-EAR-004'], [rx('rx-1', 'RX-IVM-SOL10', 'mcg/kg', 300, 1, 7, 'PO', { calc: { value: 7.2, unit: 'mg' } }), rx('rx-2', 'RX-KTZ-T200', 'mg/kg', 5, 2, 21, 'PO', { calc: { value: 120, unit: 'mg' } })]),
  E02: v(KONGYI, ['D-NEU-001', 'D-DERM-001'], [rx('rx-1', 'RX-PB-T15', 'mg/kg', 2.5, 2, 30), rx('rx-2', 'RX-CSA-C10', 'mg/kg', 5, 1, 30), rx('rx-3', 'RX-PRED-T5', 'mg/kg', 0.5, 1, 14)]),
  E03: v(NABI, ['D-END-003', 'D-URO-010'], [rx('rx-1', 'RX-MMI-T25', 'mg', 2.5, 2, 30), rx('rx-2', 'RX-AML-T25', 'EA', 0.25, 1, 30), rx('rx-3', 'RX-MRP-T16', 'mg/kg', 1, 1, 14)]),
  E04: v(MOCHI, [], [rx('rx-1', 'RX-PERM-SPOT', 'EA', 1, 1, 1, 'Top')]),
  E05: v(DAEBAK, ['D-DERM-020', 'D-GI-001'], [rx('rx-1', 'RX-AMC-T375', 'mg/kg', 12.5, 2, 7), rx('rx-2', 'RX-MRP-T60', 'mg/kg', 2, 1, 2)]),
  E06: v(BORI, ['D-URO-010', 'D-MSK-002', 'D-CAR-005'], V6rows(rx('rx-1', 'RX-MLX-SUS15', 'mg/kg', 0.1, 1, 14))),
  E06b: v(BORI, ['D-URO-010', 'D-MSK-002', 'D-CAR-005'], V6rows(rx('rx-1', 'RX-MLX-SUS15', 'mL', 0.21, 1, 14))),
  E07: v(HAPPY, ['D-MSK-002', 'D-DERM-001', 'D-BEH-001'], V7rows(4)),
  E07b: v(HAPPY, ['D-MSK-002', 'D-DERM-001', 'D-BEH-001'], V7rows(3)),
  E08: v(LEO, ['D-URO-002'], [rx('rx-1', 'RX-ENR-T68', 'EA', 0.5, 1, 10), { ...rx('rx-2', 'RX-MLX-INJ5', 'mg/kg', 0.3, 1, 1, 'SC'), kind: 'Tx' }]),
  E08b: v(LEO, ['D-URO-002'], [rx('rx-1', 'RX-ENR-T68', 'EA', 0.5, 1, 10), { ...rx('rx-2', 'RX-MLX-INJ5', 'mg/kg', 0.3, 1, 3, 'SC'), kind: 'Tx' }]),
  E09: v(DUBU, ['D-NEU-001', 'D-BEH-001'], [rx('rx-1', 'RX-FLX-CH16', 'EA', 1, 1, 30), rx('rx-2', 'RX-PB-T30', 'mg/kg', 2.5, 2, 30)]),
  E10: v(COCO, ['D-DERM-020'], [rx('rx-1', 'RX-AMC-T250', 'mg/kg', 12.5, 2, 7)]),
  E11: v(DUBU, ['D-HEP-001', 'D-NEU-001'], [rx('rx-1', 'RX-PB-T30', 'mg/kg', 2.5, 2, 30)]),
  E12: v(DAEBAK, ['D-EAR-004'], [rx('rx-1', 'RX-KTZ-T200', 'mg/kg', 10, 1, 21), rx('rx-2', 'RX-OMP-C10', 'mg/kg', 1, 2, 14)]),
  E13: v(HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-CRP-T100', 'mg/kg', 4.4, 1, 7), rx('rx-2', 'RX-MLX-SUS15', 'mg/kg', 0.1, 1, 7)]),
  E14: v(W(HAPPY, null), ['D-MSK-002'], [rx('rx-1', 'RX-CRP-T100', 'mg/kg', 4.4, 1, 7)]),
  E15: v(DAEBAK, [], [rx('rx-1', 'RX-MRP-T60', 'mg/kg', 2, 1, 2)]),
  E16: v(DAEBAK, ['D-DERM-020'], [rx('rx-1', 'RX-AMC-T375', 'mg/kg', 12.5, '', 7), rx('rx-2', 'RX-XYZ-999', 'mg/kg', 1, 1, 7)]),
  E17: v(CHOCO, ['D-DERM-012'], [rx('rx-1', 'RX-IVM-SOL10', '포', 1, 1, 7), rx('rx-2', 'RX-KTZ-T200', 'mg/kg', 5, 2, 21)]),
  E18: v(TOFU, [], [rx('rx-1', 'RX-MTZ-T250', 'mg/kg', 10, 2, 7)]),
  E19: v(W(DAEBAK, 3.8), ['D-GI-001'], [rx('rx-1', 'RX-MRP-T16', 'EA', 0.5, 1, 2)]),
  E20: v(W(HAPPY, 11), ['D-MSK-002'], [rx('rx-1', 'RX-CRP-T25', 'EA', 2, 1, 7)]),
  E21: v(W(HAPPY, 5), ['D-MSK-002'], [rx('rx-1', 'RX-ROB-T20', 'EA', 0.5, 1, 3)]),
  E22: v(W(KONGYI, 6.0, '2026-08-19'), ['D-NEU-001'], [rx('rx-1', 'RX-PB-T15', 'mg/kg', 2.5, 2, 30, 'PO', { calc: { value: 14, unit: 'mg' } })]),
  E23: v(LEO, ['D-URO-002'], [rx('rx-1', 'RX-ENR-T227', 'mg/kg', 5, 1, 10)]),
}

export const NEW = {
  E24: v(HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-CRP-T100', 'EA', 1, 1, 7), rx('rx-2', 'RX-CRP-T25', 'EA', 1, 1, 7)]),
  E25: v(HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-CRP-T100', 'mg/kg', 4.4, 1, 7), rx('rx-2', 'RX-CRP-T25', 'mg/kg', 4.4, 1, 7)]),
  E26: v(HAPPY, ['D-MSK-002'], [tx('tx-1', 'RX-MLX-INJ5', 'mg/kg', 0.2, 1, 1, 'SC'), rx('rx-1', 'RX-MLX-SUS15', 'mg/kg', 0.1, 1, 14)]),
  E27: v(HAPPY, ['D-MSK-002'], [tx('tx-1', 'RX-MLX-INJ5', 'mg/kg', 0.2, 1, 1, 'SC'), tx('tx-2', 'PR-XRAY-2', 'EA', 1, 1, 1, ''), rx('rx-1', 'RX-CRP-T100', 'mg/kg', 4.4, 1, 7)]),
  E28: v(NABI, ['D-END-003'], [rx('rx-1', 'RX-MMI-T25', 'EA', 2, 2, 30)]),
  E29: v(KONGYI, ['D-NEU-001'], [rx('rx-1', 'RX-PB-T15', 'mg/kg', 4, 2, 30)]),
  E30: v(HAPPY, ['D-BEH-001'], [rx('rx-1', 'RX-TRZ-T100', 'mg/kg', 5, 2, 14)]),
  E31: v(NABI, [], [rx('rx-1', 'RX-GBP-C100', 'EA', 1, 2, 30)]),
  E32: v(HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-MLX-SUS15', 'mg/kg', 0.1, 1, 1)]),
  E33: v(DAEBAK, ['D-DERM-020'], [rx('rx-1', 'RX-AMC-T375', 'mg/kg', 12.5, 1, 1)]),
  E34: v(KONGYI, ['D-NEU-001'], [rx('rx-1', 'RX-PB-T15', 'mg/kg', 2.5, 2, 30, 'PO', { sig: '1일 1회' })]),
  E35: v(LEO, ['D-URO-002'], [rx('rx-1', 'RX-ENR-T227', 'mg/kg', 5, 3, 10, 'PO', { sig: 'sid' })]),
  E36: v(HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-CRP-T100', 'mg/kg', 4.4, '', 7, 'PO', { sig: '필요시' })]),
  E36b: v(HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-CRP-T100', 'mg/kg', 4.4, 2, 7, 'PO', { sig: '필요시' })]),
  E37: v(W(DAEBAK, 3.0), ['D-GI-001'], [rx('rx-1', 'RX-MRP-T16', 'EA', 0.5, 1, 2)]),
  E38: v(HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-CRP-T100', 'mg/kg', 4, 1, 7)]),
  E39: v(BORI, ['D-CAR-005'], [rx('rx-1', 'RX-PIM-CH125', 'mg/kg', 0.2, 2, 30)]),
  E40: v({ ...COCO, allergies: [{ text: '페니실린 알레르기' }] }, ['D-DERM-020'], [rx('rx-1', 'RX-AMC-T250', 'mg/kg', 12.5, 2, 7)]),
  E40b: v({ ...COCO, allergies: [{ text: '닭고기' }] }, ['D-DERM-020'], [rx('rx-1', 'RX-AMC-T250', 'mg/kg', 12.5, 2, 7)]),
  E41: v(DUBU, ['D-NEU-099'], [rx('rx-1', 'RX-FLX-CH16', 'EA', 1, 1, 30)]),
  E41b: { ...v(DUBU, [], [rx('rx-1', 'RX-FLX-CH16', 'EA', 1, 1, 30)]), diagnoses: [{ code: 'D-NEU-099', display: '뇌전증' }] },
  E42: v({ ...BORI, labs: [{ code: 'creatinine', value: 2.1, unit: 'mg/dL', date: '2026-06-01' }] }, ['D-MSK-002'], [rx('rx-1', 'RX-MLX-SUS15', 'mg/kg', 0.1, 1, 14)]),
  E42b: v({ ...BORI, labs: [{ code: 'creatinine', value: 1.0, unit: 'mg/dL', date: '2026-06-01' }] }, ['D-MSK-002'], [rx('rx-1', 'RX-MLX-SUS15', 'mg/kg', 0.1, 1, 14)]),
  E43: v({ ...CHOCO, breed: 'XYZ/모름' }, ['D-DERM-012'], [rx('rx-1', 'RX-IVM-SOL10', 'mcg/kg', 300, 1, 7)]),
  E44: v(CHOCO, [], [rx('rx-1', 'RX-IVM-CH272', 'EA', 1, 1, 1)]),
  E45a: v(LEO, ['D-URO-002'], [rx('rx-1', 'RX-ENR-T68', 'EA', 0.5, 1, 10)]),
  E45b: v(W(LEO, 2.5), ['D-URO-002'], [rx('rx-1', 'RX-ENR-T68', 'EA', 0.5, 1, 10)]),
  E46: v(HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-CRP-T100', 'mL/kg', 1, 1, 7)]),
  E47: v(KONGYI, ['D-NEU-001'], [rx('rx-1', 'RX-PB-T15', '포', 1, 2, 30)]),
  E48: v(NABI, ['D-URO-010'], [rx('rx-1', 'RX-MLX-INJ5', 'mg/kg', 0.3, 1, 1, 'SC')]),
  E49: v({ ...DAEBAK, birthDate: '2026-06-01', weight: { kg: 12, measuredAt: D } }, ['D-URO-002'], [rx('rx-1', 'RX-ENR-T68', 'mg/kg', 5, 1, 10)]),
  E50: v(HAPPY, ['D-MSK-002'], [rx('rx-1', 'RX-CRP-T100', 'mg/kg', 4.4, 1, 7, '')]),
  E51: v(NABI, ['D-END-003', 'D-URO-010'], [rx('rx-1', 'RX-MMI-T25', 'mg', 2.5, 2, 30), rx('rx-2', 'RX-AML-T25', 'EA', 0.25, 1, 30), rx('rx-3', 'RX-MRP-T16', 'mg/kg', 1, 1, 14, 'PO', { dispense: '가루' })]),
  E52: v({ ...TOFU, species: '' }, [], [rx('rx-1', 'RX-MTZ-T250', 'mg/kg', 10, 2, 7)]),
  E53: v(DUBU, ['D-NEU-001'], [rx('rx-1', 'RX-PB-T30', 'mg/kg', 2.5, 2, 30, 'PO', { sig: '격일' })]),
}

/** All 61 accuracy scenarios, in the §8.1 order. */
export const SCENARIOS = { ...SPEC, ...NEW }

/** §8.1 "Gate expectations": the scenarios whose save opens the gate. */
export const GATE_SCENARIOS = ['E01', 'E04', 'E07', 'E07b', 'E08', 'E08b', 'E09', 'E10', 'E11', 'E13', 'E17', 'E25', 'E27', 'E35', 'E36b', 'E40', 'E41b', 'E45a', 'E45b', 'E48']

// ── Demo visits V1–V10 (host display data added; engine inputs unchanged) ────

/** Host-only patient display data (masked guardian, 특이사항). Fictional. */
const HOST_PATIENT = {
  '1042': { guardian: '이○○', remarks: 'MDR1 미검사' },
  '0877': { guardian: '박○○', remarks: '' },
  '1310': { guardian: '최○○', remarks: '' },
  '1455': { guardian: '정○○', remarks: '' },
  '0921': { guardian: '강○○', remarks: '' },
  '1502': { guardian: '조○○', remarks: '' },
  '0650': { guardian: '윤○○', remarks: '' },
  '1388': { guardian: '장○○', remarks: '' },
  '1620': { guardian: '임○○', remarks: '' },
  '1733': { guardian: '한○○', remarks: '' },
}

/**
 * Guide-strip hint per visit (§2.6): what to try on this patient, and the guide step it belongs to.
 * The strip shows it only while that step is the current one (or once the guide is finished), so it
 * never asks for a later step than the instruction beside it.
 */
export const VISIT_HINTS = {
  V1: { step: 'sign', text: '처방 저장을 눌러 보세요' },
  V2: { step: 'fix', text: '사이클로스포린 행을 삭제해 보세요' },
  V3: { step: 'fix', text: '마로피탄트 조제를 가루로 바꿔 보세요' },
  V4: { step: 'sign', text: '처방 저장을 눌러 보세요' },
  V5: { step: 'fix', text: '체중을 지워 보세요' },
  V6: { step: 'fix', text: '멜록시캄을 mL 0.21로 바꿔 보세요' },
  V7: { step: 'fix', text: '프레드니솔론을 삭제해 보세요' },
  V8: { step: 'fix', text: '멜록시캄 일수를 3으로 바꿔 보세요' },
  V9: null,
  V10: null,
}

/** Golden case id per visit, for the demo bar's "사례로" link (§7). */
export const VISIT_GOLDEN = { V1: 'choco', V2: 'kongyi', V3: 'nabi', V4: 'mochi', V5: 'daebak' }

const withDisplay = (id, visit) => ({
  ...visit,
  id,
  encounterId: `enc-${id}-${visit.date}`,
  patient: { ...visit.patient, ...(HOST_PATIENT[visit.patient.id] || {}) },
  diagnoses: visit.diagnoses.map((d) => ({ ...d, display: d.display ?? CONDITION_BY_ID[CONDITION_MAP[d.code]]?.label.ko ?? '' })),
  rows: visit.rows.map((r) => ({ ...r })),
})

export const VISITS = {
  V1: withDisplay('V1', SPEC.E01),
  V2: withDisplay('V2', SPEC.E02),
  V3: withDisplay('V3', SPEC.E03),
  V4: withDisplay('V4', SPEC.E04),
  V5: withDisplay('V5', SPEC.E05),
  V6: withDisplay('V6', SPEC.E06),
  V7: withDisplay('V7', SPEC.E07),
  V8: withDisplay('V8', SPEC.E08),
  V9: withDisplay('V9', SPEC.E09),
  V10: withDisplay('V10', SPEC.E10),
}

export const VISIT_IDS = Object.keys(VISITS)

/** A fresh deep copy of a demo visit ("방문 초기화" reloads it). */
export function loadVisit(id) {
  const v0 = VISITS[id] || VISITS.V1
  return JSON.parse(JSON.stringify(v0))
}
