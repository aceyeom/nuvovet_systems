/**
 * EMR popup spec §8.2 mapping unit tests: units, split, frequency, route, protocol
 * policy, patient/visit fields and the 계산량 cross-check, through the real adapter.
 */
import { describe, it, expect } from 'vitest'
import { adapt, check, mapUnit, mapFrequency, mapRoute, mapSex, mapSpecies } from '../adapter.js'
import { P, D, rx, tx, v, W } from '../fixtures.js'
import { getStrength } from '../../knowledge/drugs.js'

const S = (drugId, strengthId) => getStrength(drugId, strengthId)
const one = (patient, row, dx = []) => adapt(v(patient, dx, [row]))
const rowOf = (a, id = 'rx-1') => a.rows[id]
const medOf = (a, id = 'rx-1') => a.caseInput.meds[a.medRowIds.indexOf(id)]

describe('units (§4.2 unit table)', () => {
  const TAB = S('ketoconazole', 'keto_tab_200')
  it.each([
    ['EA', TAB, 'tablet'],
    ['EA', S('fluoxetine', 'flx_chew_16'), 'chewable'],
    ['EA', S('ciclosporin', 'csa_cap_10'), 'capsule'],
    ['EA', S('permethrin', 'perm_spot'), 'pipette'],
    ['정', TAB, 'tablet'], ['캡슐', TAB, 'tablet'], ['T', TAB, 'tablet'], ['tab', TAB, 'tablet'], ['개', TAB, 'tablet'], ['cap', S('omeprazole', 'ome_cap_10'), 'capsule'],
    ['ml/kg', TAB, 'mL/kg'], ['cc/kg', TAB, 'mL/kg'], ['cc', TAB, 'mL'], ['ml', TAB, 'mL'],
    ['ug/kg', TAB, 'mcg/kg'], ['µg/kg', TAB, 'mcg/kg'], ['MCG/KG', TAB, 'mcg/kg'], ['ug', TAB, 'mcg'],
    ['IU/kg', TAB, 'IU/kg'], ['iu', TAB, 'IU'], ['mg', TAB, 'mg'], ['g', TAB, 'g'], ['Mg/Kg', TAB, 'mg/kg'],
  ])('%s → %s', (raw, strength, unit) => {
    expect(mapUnit(raw, strength)).toEqual({ unit })
  })
  it.each([
    ['iver_sol_10', 'ivermectin'], ['melox_inj_5', 'meloxicam'], ['melox_susp_1_5', 'meloxicam'],
  ])('EA on a liquid product (%s) → unit_count_liquid', (sid, drug) => {
    expect(mapUnit('EA', S(drug, sid))).toEqual({ confirm: 'unit_count_liquid' })
  })
  it.each(['포', '앰플', 'amp', '바이알', 'vial', 'gtt', '방울'])('%s → unit_needs_record, dose null', (u) => {
    expect(mapUnit(u, S('phenobarbital', 'pb_tab_15'))).toEqual({ confirm: 'unit_needs_record' })
    const a = one(P.KONGYI, rx('rx-1', 'RX-PB-T15', u, 1, 2, 30), ['D-NEU-001'])
    expect(rowOf(a).confirm).toContain('unit_needs_record')
    expect(medOf(a).dose).toBe(null)
  })
  it('an unknown unit is unit_unknown and never treated as mg', () => {
    expect(mapUnit('xyz', S('phenobarbital', 'pb_tab_15'))).toEqual({ confirm: 'unit_unknown' })
    const c = check(v(P.KONGYI, ['D-NEU-001'], [rx('rx-1', 'RX-PB-T15', 'xyz', 15, 2, 30)]))
    expect(medOf(c.adapter).dose).toBe(null)
    expect(c.result.doses[0].perDoseMg).toBe(null)
    expect(c.complete).toBe(false)
  })
  it('a blank Qty sends no dose (never 0)', () => {
    const a = one(P.KONGYI, rx('rx-1', 'RX-PB-T15', 'mg/kg', '', 2, 30), ['D-NEU-001'])
    expect(medOf(a).dose).toBe(null)
  })
})

describe('split (§4.2, D4)', () => {
  const split = (patient, code, qty, extra) => rowOf(one(patient, rx('rx-1', code, 'EA', qty, 1, 7, 'PO', extra))).confirm.includes('split_not_allowed')
  it('amlodipine 2.5 mg ¼ ok', () => expect(split(P.NABI, 'RX-AML-T25', 0.25)).toBe(false))
  it('ketoconazole 200 mg ½ ok', () => expect(split(P.CHOCO, 'RX-KTZ-T200', 0.5)).toBe(false))
  it('ketoconazole ¼ split_not_allowed', () => expect(split(P.CHOCO, 'RX-KTZ-T200', 0.25)).toBe(true))
  it('robenacoxib ½ split_not_allowed', () => expect(split(P.HAPPY, 'RX-ROB-T20', 0.5)).toBe(true))
  it('ciclosporin capsule ½ split_not_allowed', () => expect(split(P.KONGYI, 'RX-CSA-C10', 0.5)).toBe(true))
  it('fluoxetine chewable 1 ok', () => expect(split(P.DUBU, 'RX-FLX-CH16', 1)).toBe(false))
  it.each([['RX-KTZ-T200', 0.25, P.CHOCO], ['RX-ROB-T20', 0.5, P.HAPPY], ['RX-CSA-C10', 0.5, P.KONGYI]])('%s with 가루 → no split check', (code, qty, pt) => {
    expect(split(pt, code, qty, { dispense: '가루' })).toBe(false)
    expect(rowOf(one(pt, rx('rx-1', code, 'EA', qty, 1, 7, 'PO', { dispense: '가루' }))).notes).toContain('powder')
  })
})

describe('frequency (§4.2 mapFrequency)', () => {
  it.each([
    [{ tt: 1, dy: 7 }, { frequency: 'q24h', singleAdministration: false }],
    [{ tt: 2, dy: 7 }, { frequency: 'q12h', singleAdministration: false }],
    [{ tt: 3, dy: 7 }, { frequency: 'q8h', singleAdministration: false }],
    [{ tt: 4, dy: 7 }, { frequency: 'q6h', singleAdministration: false }],
    [{ tt: 6, dy: 7 }, { frequency: 'q4h', singleAdministration: false }],
    [{ tt: 1, dy: 1 }, { frequency: 'once', singleAdministration: true }],
    [{ tt: 2, dy: 1 }, { frequency: 'q12h', singleAdministration: false }],
    [{ tt: '1.0', dy: 7 }, { frequency: 'q24h', singleAdministration: false }],
    [{ tt: 5, dy: 7 }, { frequency: null, confirm: 'freq_unmapped' }],
    [{ tt: '', dy: 7 }, { frequency: null, confirm: 'freq_missing' }],
    [{ sig: '격일', tt: 1, dy: 14 }, { frequency: 'q48h' }],
    [{ sig: '격일', tt: 2, dy: 14 }, { frequency: 'q12h', singleAdministration: false, confirm: 'freq_conflict' }],
    [{ sig: '월1회', tt: 1, dy: 30 }, { frequency: 'monthly' }],
    [{ sig: 'bid', tt: 2, dy: 7 }, { frequency: 'q12h' }],
    [{ sig: '1일 1회', tt: 2, dy: 30 }, { frequency: 'q12h', singleAdministration: false, confirm: 'freq_conflict' }],
    [{ sig: 'sid', tt: 3, dy: 10 }, { frequency: 'q8h', singleAdministration: false, confirm: 'freq_conflict' }],
    [{ sig: '필요시', tt: '', dy: 7 }, { frequency: 'prn' }],
    [{ sig: '필요시', tt: 2, dy: 7 }, { frequency: 'q12h', note: 'prn_max_per_day' }],
    // Review F7: still checked at the Tt schedule, but flagged instead of silently ignored.
    [{ sig: '아무거나', tt: 2, dy: 7 }, { frequency: 'q12h', singleAdministration: false, extraConfirm: 'sig_unrecognised' }],
    [{ sig: 'bid', tt: '', dy: 7 }, { frequency: 'q12h' }],
  ])('%j → %j', (input, out) => {
    expect(mapFrequency(input)).toEqual(out)
  })
  it('a conflict is checked at the higher frequency (E35: sid + Tt3 → q8h)', () => {
    const a = adapt(v(P.LEO, ['D-URO-002'], [rx('rx-1', 'RX-ENR-T227', 'mg/kg', 5, 3, 10, 'PO', { sig: 'sid' })]))
    expect(medOf(a).frequency).toBe('q8h')
    expect(rowOf(a).confirm).toEqual(['freq_conflict'])
  })
})

describe('route (§4.2)', () => {
  it('po → PO', () => expect(mapRoute('po', null)).toEqual({ route: 'PO' }))
  it.each(['IV', 'sc', 'Im'])('%s passes through', (r) => expect(mapRoute(r, null).route).toBe(r.toUpperCase()))
  it('Top + permethrin → spot-on', () => expect(mapRoute('Top', S('permethrin', 'perm_spot'))).toEqual({ route: 'spot-on' }))
  it('Top + other → topical', () => expect(mapRoute('Top', S('ketoconazole', 'keto_tab_200'))).toEqual({ route: 'topical' }))
  it.each(['Eye', 'Ear', 'Inh'])('%s → route_no_reference', (r) => expect(mapRoute(r, null)).toEqual({ route: r, confirm: 'route_no_reference' }))
  it('blank → route_missing', () => expect(mapRoute('', null)).toEqual({ route: null, confirm: 'route_missing' }))
})

describe('protocol policy (§4.2 chooseProtocol)', () => {
  const pick = (patient, row, dx) => {
    const a = one(patient, row, dx)
    return { id: rowOf(a).protocolId, confirm: rowOf(a).confirm, options: rowOf(a).options, notes: rowOf(a).notes }
  }
  it('ivermectin dog PO q24h → iver_dog_demodex', () => expect(pick(P.CHOCO, rx('rx-1', 'RX-IVM-SOL10', 'mcg/kg', 300, 1, 7)).id).toBe('iver_dog_demodex'))
  it('ivermectin dog PO 용법 "월1회" → iver_dog_hw', () => expect(pick(P.CHOCO, rx('rx-1', 'RX-IVM-SOL10', 'mcg/kg', 6, 1, 30, 'PO', { sig: '월1회' })).id).toBe('iver_dog_hw'))
  it('ivermectin chewable 272 mcg Tt1 Dy1, no diagnosis → iver_dog_hw (product default)', () => {
    const a = one(P.CHOCO, rx('rx-1', 'RX-IVM-CH272', 'EA', 1, 1, 1))
    expect(rowOf(a)).toMatchObject({ protocolId: 'iver_dog_hw', how: 'product_default' })
  })
  it('maropitant dog PO, no diagnosis → protocol_indication [vomit, motion]', () => {
    expect(pick(P.DAEBAK, rx('rx-1', 'RX-MRP-T60', 'mg/kg', 2, 1, 2))).toMatchObject({ id: null, confirm: ['protocol_indication'], options: ['maro_dog_vomit', 'maro_dog_motion'] })
  })
  it('maropitant dog PO with D-GI-001 → maro_dog_vomit', () => expect(pick(P.DAEBAK, rx('rx-1', 'RX-MRP-T60', 'mg/kg', 2, 1, 2), ['D-GI-001']).id).toBe('maro_dog_vomit'))
  it('maropitant dog SC → maro_dog_inj', () => expect(pick(P.DAEBAK, rx('rx-1', 'RX-MRP-INJ10', 'mg/kg', 1, 1, 1, 'SC')).id).toBe('maro_dog_inj'))
  it('meloxicam dog PO Tt1 Dy1 → protocol_indication [oa, load]', () => {
    expect(pick(P.HAPPY, rx('rx-1', 'RX-MLX-SUS15', 'mg/kg', 0.1, 1, 1))).toMatchObject({ confirm: ['protocol_indication'], options: ['melox_dog_oa', 'melox_dog_load'] })
  })
  it('meloxicam dog PO 용법 "1회" → melox_dog_load (explicit single dose)', () => expect(pick(P.HAPPY, rx('rx-1', 'RX-MLX-SUS15', 'mg/kg', 0.2, '', 1, 'PO', { sig: '1회' })).id).toBe('melox_dog_load'))
  it('meloxicam dog PO Tt1 Dy14 → melox_dog_oa', () => expect(pick(P.HAPPY, rx('rx-1', 'RX-MLX-SUS15', 'mg/kg', 0.1, 1, 14)).id).toBe('melox_dog_oa'))
  it('meloxicam cat SC Tt1 Dy3 → melox_cat_periop (label_single_only kept)', () => {
    const c = check(v(P.LEO, [], [rx('rx-1', 'RX-MLX-INJ5', 'mg/kg', 0.3, 1, 3, 'SC')]))
    expect(rowOf(c.adapter).protocolId).toBe('melox_cat_periop')
    expect(c.result.findings.map((f) => f.ruleId)).toContain('SPECIES_HARDSTOP')
  })
  it('trazodone dog PO Tt2 Dy14 → protocol_repeat_none (D11)', () => expect(pick(P.HAPPY, rx('rx-1', 'RX-TRZ-T100', 'mg/kg', 5, 2, 14)).confirm).toEqual(['protocol_repeat_none']))
  it('amoxicillin-clavulanate dog → ac_dog_eu + "EU/UK 라벨 기준(자동)"', () => {
    expect(pick(P.DAEBAK, rx('rx-1', 'RX-AMC-T375', 'mg/kg', 12.5, 2, 7))).toMatchObject({ id: 'ac_dog_eu', notes: ['EU/UK 라벨 기준(자동)'] })
  })
  it('pimobendan dog with D-CAR-005 → pimo_dog_chf; without → protocol_indication', () => {
    expect(pick(P.BORI, rx('rx-1', 'RX-PIM-CH125', 'mg/kg', 0.25, 2, 30), ['D-CAR-005']).id).toBe('pimo_dog_chf')
    expect(pick(P.BORI, rx('rx-1', 'RX-PIM-CH125', 'mg/kg', 0.25, 2, 30)).confirm).toEqual(['protocol_indication'])
  })
  it('permethrin cat → protocol_none', () => expect(pick(P.MOCHI, rx('rx-1', 'RX-PERM-SPOT', 'EA', 1, 1, 1, 'Top')).confirm).toEqual(['protocol_none']))
  it('a protocol-choice overrides all of these', () => {
    expect(pick(P.DAEBAK, rx('rx-1', 'RX-MRP-T60', 'mg/kg', 2, 1, 2, 'PO', { protocolChoice: 'maro_dog_motion' }))).toMatchObject({ id: 'maro_dog_motion', confirm: [] })
    expect(pick(P.HAPPY, rx('rx-1', 'RX-MLX-SUS15', 'mg/kg', 0.1, 1, 1, 'PO', { protocolChoice: 'melox_dog_load' })).id).toBe('melox_dog_load')
    expect(pick(P.HAPPY, rx('rx-1', 'RX-TRZ-T100', 'mg/kg', 5, 2, 14, 'PO', { protocolChoice: 'traz_dog_previsit' })).id).toBe('traz_dog_previsit')
  })
})

describe('patient and visit fields (§4.1)', () => {
  const base = (patient, dx = [], rows = [rx('rx-1', 'RX-AMC-T375', 'mg/kg', 12.5, 2, 7)]) => adapt(v(patient, dx, rows))
  it('sex', () => {
    expect(mapSex('Spayed Female')).toEqual({ sex: 'female', neutered: true })
    expect(mapSex('Neutered Male')).toEqual({ sex: 'male', neutered: true })
    expect(mapSex('Intact Female')).toEqual({ sex: 'female', neutered: false })
    expect(mapSex('Intact Male')).toEqual({ sex: 'male', neutered: false })
    expect(mapSex('Unknown')).toEqual({ sex: null, neutered: null })
  })
  it('species', () => {
    for (const s of ['Canine', 'dog', '개', '견']) expect(mapSpecies(s)).toEqual({ species: 'dog' })
    for (const s of ['Feline', 'cat', '고양이', '묘']) expect(mapSpecies(s)).toEqual({ species: 'cat' })
    expect(mapSpecies('Rabbit')).toEqual({ species: null, reason: 'species_unsupported' })
    expect(mapSpecies('')).toEqual({ species: null, reason: 'species_missing' })
    expect(adapt(v({ ...P.CHOCO, species: 'Rabbit' }, [], []))).toEqual({ supported: false, reason: 'species_unsupported' })
  })
  it('breed halves resolve; unresolved dog breed is a note, incomplete only with a macrocyclic lactone', () => {
    expect(base(P.CHOCO).caseInput.breedId).toBe('collie')
    expect(base(P.NABI).caseInput.breedId).toBe('domestic_shorthair')
    const xyz = { ...P.DAEBAK, breed: 'XYZ/모름' }
    const plain = check(v(xyz, ['D-DERM-020'], [rx('rx-1', 'RX-AMC-T375', 'mg/kg', 12.5, 2, 7)]))
    expect(plain.adapter.adapterNotes).toContain('breed_unresolved')
    expect(plain.incompleteReasons).not.toContain('breed_unresolved')
    expect(plain.complete).toBe(true)
    const ml = check(v(xyz, ['D-DERM-012'], [rx('rx-1', 'RX-IVM-SOL10', 'mcg/kg', 300, 1, 7)]))
    expect(ml.incompleteReasons).toContain('breed_unresolved')
  })
  it('creatinine 176.8 µmol/L → 2.0 mg/dL', () => {
    const a = base({ ...P.DAEBAK, labs: [{ code: 'creatinine', value: 176.8, unit: 'µmol/L', date: D }] })
    expect(a.caseInput.labs.creatinine).toBe(2)
  })
  it('stale abnormal creatinine is used + lab_stale; stale normal is not used', () => {
    const hi = base({ ...P.BORI, labs: [{ code: 'creatinine', value: 2.1, unit: 'mg/dL', date: '2026-06-01' }] })
    expect(hi.caseInput.labs.creatinine).toBe(2.1)
    expect(hi.visitConfirm).toContain('lab_stale_creatinine')
    expect(hi.visitDetail.find((d) => d.key === 'lab_stale_creatinine').days).toBe(124)
    const lo = base({ ...P.BORI, labs: [{ code: 'creatinine', value: 1.0, unit: 'mg/dL', date: '2026-06-01' }] })
    expect(lo.caseInput.labs.creatinine).toBeUndefined()
    expect(lo.visitConfirm).toContain('lab_stale_creatinine')
  })
  it('two creatinine values: the most recent only', () => {
    const a = base({ ...P.BORI, labs: [{ code: 'creatinine', value: 1.0, unit: 'mg/dL', date: '2026-09-01' }, { code: 'creatinine', value: 2.4, unit: 'mg/dL', date: '2026-10-01' }] })
    expect(a.caseInput.labs.creatinine).toBe(2.4)
    expect(a.labDates.creatinine).toBe('2026-10-01')
  })
  it('weight 31 days old → weight_stale; 15 days old at 4 months → weight_stale; 30 days → fresh', () => {
    expect(base(W(P.DAEBAK, 30, '2026-09-02')).adapterNotes).toContain('weight_stale')
    expect(base({ ...W(P.DAEBAK, 8, '2026-09-18'), birthDate: '2026-06-03' }).adapterNotes).toContain('weight_stale')
    expect(base(W(P.DAEBAK, 30, '2026-09-03')).adapterNotes).not.toContain('weight_stale')
    expect(base({ ...W(P.DAEBAK, 8, '2026-09-20'), birthDate: '2026-06-03' }).adapterNotes).not.toContain('weight_stale')
  })
  it('birth date 4 months before the visit → age_under_1y (incomplete)', () => {
    const c = check(v({ ...P.DAEBAK, birthDate: '2026-06-03' }, ['D-DERM-020'], [rx('rx-1', 'RX-AMC-T375', 'mg/kg', 12.5, 2, 7)]))
    expect(c.adapter.visitConfirm).toContain('age_under_1y')
    expect(c.complete).toBe(false)
  })
  it.each([
    [{ text: '페니실린 알레르기' }, ['penicillin'], 'allergy_text_recognised'],
    [{ text: 'Clavamox' }, ['penicillin'], 'allergy_text_recognised'],
    // Review F11: '아목시실린' is now a drug alias (an exact key), so it is recognised; a partial
    // word is still not matched (exact keys only, never fuzzy).
    [{ text: '아목시실린' }, ['penicillin'], 'allergy_text_recognised'],
    [{ text: 'PCN' }, ['penicillin'], 'allergy_text_recognised'],
    [{ text: '아목시' }, [], 'allergy_free_text'],
    [{ text: '닭고기' }, [], 'allergy_free_text'],
    [{ code: 'penicillin' }, ['penicillin'], null],
  ])('allergy %j → %j + %s', (entry, classes, reason) => {
    const a = base({ ...P.COCO, allergies: [entry] })
    expect(a.caseInput.allergies).toEqual(classes)
    expect(a.visitConfirm).toEqual(reason ? [reason] : [])
  })
  it('diagnosis D-NEU-099 with display "뇌전증" → epilepsy + dx_text_recognised; without → dx_unmapped', () => {
    const rec = adapt({ ...v(P.DUBU, [], []), diagnoses: [{ code: 'D-NEU-099', display: '뇌전증' }] })
    expect(rec.caseInput.conditions).toEqual(['epilepsy'])
    expect(rec.visitConfirm).toEqual(['dx_text_recognised:D-NEU-099'])
    const un = check(v(P.DUBU, ['D-NEU-099'], [rx('rx-1', 'RX-FLX-CH16', 'EA', 1, 1, 30)]))
    expect(un.adapter.unmappedDx).toEqual(['D-NEU-099'])
    expect(un.incompleteReasons).toEqual(['dx_unmapped:D-NEU-099'])
    // no fuzzy matching
    const near = adapt({ ...v(P.DUBU, [], []), diagnoses: [{ code: 'D-X', display: '뇌전증 의심' }] })
    expect(near.caseInput.conditions).toEqual([])
  })
  it('a Tx row with RX-MLX-INJ5 is sent in-clinic; a Tx procedure is skipped, not unmapped', () => {
    const a = adapt(v(P.HAPPY, ['D-MSK-002'], [tx('tx-1', 'RX-MLX-INJ5', 'mg/kg', 0.2, 1, 1, 'SC'), tx('tx-2', 'PR-XRAY-2', 'EA', 1, 1, 1, '')]))
    expect(a.rows['tx-1'].inClinic).toBe(true)
    expect(a.rows['tx-2']).toBeUndefined()
    expect(a.unmapped).toEqual([])
    expect(a.medRowIds).toEqual(['tx-1'])
  })
  it('an Rx row with an unknown code is unmapped and excluded from meds', () => {
    const c = check(v(P.DAEBAK, [], [rx('rx-1', 'RX-XYZ-999', 'mg/kg', 1, 1, 7)]))
    expect(c.adapter.unmapped).toEqual([{ rowId: 'rx-1', code: 'RX-XYZ-999' }])
    expect(c.adapter.caseInput.meds).toEqual([])
    expect(c.incompleteReasons).toEqual(['unmapped:RX-XYZ-999'])
  })
  it('pregnancy/lactation are always false (no field; listed as not checked)', () => {
    expect(base(P.COCO).caseInput).toMatchObject({ pregnant: false, lactating: false, mdr1Status: 'unknown' })
  })
})

describe('계산량 cross-check (§4.2, L5)', () => {
  const calc = (patient, row) => rowOf(one(patient, row)).notes.includes('calc_mismatch')
  const pt = W(P.BORI, 3.66)
  it('furosemide 2 mg/kg × 3.66 kg with EMR 7.32 mg → no note', () => expect(calc(pt, rx('rx-1', 'RX-FUR-T125', 'mg/kg', 2, 2, 14, 'PO', { calc: { value: 7.32, unit: 'mg' } }))).toBe(false))
  it('EMR 7.0 mg → calc_mismatch', () => expect(calc(pt, rx('rx-1', 'RX-FUR-T125', 'mg/kg', 2, 2, 14, 'PO', { calc: { value: 7.0, unit: 'mg' } }))).toBe(true))
  it('0.1 mg/kg × 4.1 kg (0.41 mg) with EMR 0.4 mg → no note (0.05 mg absolute tolerance)', () => {
    expect(calc(P.NABI, rx('rx-1', 'RX-AML-T25', 'mg/kg', 0.1, 1, 30, 'PO', { calc: { value: 0.4, unit: 'mg' } }))).toBe(false)
  })
  it('mcg/kg rows compare in mg; the EMR value is never used as the dose', () => {
    const a = one(P.CHOCO, rx('rx-1', 'RX-IVM-SOL10', 'mcg/kg', 300, 1, 7, 'PO', { calc: { value: 9.9, unit: 'mg' } }))
    expect(rowOf(a).notes).toContain('calc_mismatch')
    expect(medOf(a).dose).toEqual({ value: 300, unit: 'mcg/kg' })
    const c = check(v(P.CHOCO, ['D-DERM-012'], [rx('rx-1', 'RX-IVM-SOL10', 'mcg/kg', 300, 1, 7, 'PO', { calc: { value: 9.9, unit: 'mg' } })]))
    expect(c.result.doses[0].perDoseMg).toBe(7.2)
  })
})
