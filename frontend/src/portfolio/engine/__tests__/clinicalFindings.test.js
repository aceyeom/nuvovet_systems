/**
 * Regression tests for the second clinical review of the DUR engine
 * (portfolio-clinical, 2026-10-02). Each block pins one confirmed issue.
 */
import { describe, it, expect } from 'vitest'
import { analyze } from '../engine.js'
import { computeAmount, compareWithProtocol, planForStrength } from '../dose.js'
import { getDrug, getProtocol } from '../../knowledge/drugs.js'
import { makeCase, med, byRule } from './helpers.js'

const one = (r, id) => {
  const list = byRule(r, id)
  expect(list).toHaveLength(1)
  return list[0]
}
const cat = (over = {}) => makeCase({ species: 'cat', weightKg: 4, breedId: 'domestic_shorthair', ...over })

describe('count and volume doses use the product they name, never an unrelated liquid', () => {
  it('1 ivermectin chewable with the strength on auto is not turned into 1 mL of the 1% injectable', () => {
    const r = analyze(makeCase({ breedId: 'collie', weightKg: 25, meds: [med('ivermectin', null, 1, 'chewable', 'monthly')] }))
    const d = r.doses[0]
    expect(d.perDoseMg).toBeNull()
    expect(d.administration.en).toBe('1 chewable')
    expect(d.administration.en).not.toContain('mg/mL')
    expect(r.notes.find((n) => n.id === 'dose_strength_ivermectin_0').text.en).toContain('Choose the strength')
    const f = one(r, 'MDR1_PGP_ML')
    expect(f.factors.map((x) => x.label.en).join(' ')).not.toContain('400')
    expect(f.factors.find((x) => x.kind === 'dose').label.en).toContain('could not be calculated')
    expect(f.actions[0].en).toContain('Select the strength')
  })
  it('with the chewable strength selected, the dose is computed from it and graded as a preventive dose', () => {
    const r = analyze(makeCase({ breedId: 'collie', weightKg: 25, meds: [med('ivermectin', null, 1, 'chewable', 'monthly', { strengthId: 'iver_chew_136' })] }))
    expect(r.doses[0].perDoseMg).toBe(0.136)
    expect(r.doses[0].administration.en).toBe('1 × 136 mcg chewable')
    expect(one(r, 'MDR1_PGP_ML').severity).toBe('minor')
  })
  it('a selected strength that does not match the counted unit is reported, not converted', () => {
    const r = analyze(makeCase({ breedId: 'collie', weightKg: 25, meds: [med('ivermectin', null, 1, 'chewable', 'monthly', { strengthId: 'iver_sol_10' })] }))
    expect(r.doses[0].perDoseMg).toBeNull()
    expect(r.notes.find((n) => n.id === 'dose_strength_ivermectin_0').text.en).toContain('does not match the entered unit')
  })
  it('mL of meloxicam is read against the product for the route: injection SC, suspension PO', () => {
    const sc = analyze(cat({ meds: [med('meloxicam', null, 0.24, 'mL', 'once', { route: 'SC' })] })).doses[0]
    expect(sc.perDoseMg).toBe(1.2)
    expect(sc.administration.en).toBe('0.24 mL of 5 mg/mL')
    const po = analyze(cat({ meds: [med('meloxicam', null, 0.24, 'mL', 'once')] })).doses[0]
    expect(po.perDoseMg).toBe(0.36)
    expect(po.administration.en).toBe('0.24 mL of 1.5 mg/mL')
  })
  it('¼ maropitant tablet with four tablet strengths asks for the strength instead of using the injection', () => {
    const r = analyze(cat({ meds: [med('maropitant', null, 0.25, 'tablet', 'q24h')] }))
    expect(r.doses[0].perDoseMg).toBeNull()
    expect(r.doses[0].administration.en).toBe('¼ tablet')
    expect(r.notes.some((n) => n.id === 'dose_strength_maropitant_0')).toBe(true)
  })
  it('a count with only one matching strength uses it; what was entered is what is shown', () => {
    const d = analyze(makeCase({ meds: [med('prednisolone', null, 1.5, 'tablet', 'q24h')] })).doses[0]
    expect(d.perDoseMg).toBe(7.5)
    expect(d.administration.en).toBe('1½ × 5 mg tablets')
    expect(d.suggestedStrengthId).toBe('pred_tab_5')
  })
  it('computeAmount converts a count only with a strength of that form', () => {
    const sol = getDrug('ivermectin').strengths.find((s) => s.id === 'iver_sol_10')
    expect(computeAmount({ value: 1, unit: 'chewable', weightKg: 25, species: 'dog', strength: sol }).mg).toBeNull()
  })
})

describe('feline enrofloxacin with no usable frequency', () => {
  it('10 mg/kg with no frequency → major: one dose already exceeds 5 mg/kg/day', () => {
    const r = analyze(cat({ meds: [med('enrofloxacin', 'enro_cat', 10, 'mg/kg', null)] }))
    expect(r.verdict.level).toBe('major')
    const f = one(r, 'ENRO_FELINE_RETINA')
    expect(f.why[0].en).toContain('single administration')
    expect(r.doses[0].status).toBe('above')
    expect(r.doses[0].compared.reason).toBe('single_dose_exceeds_daily')
  })
  it('PRN (no fixed daily count) is treated the same way', () => {
    expect(byRule(analyze(cat({ meds: [med('enrofloxacin', 'enro_cat', 10, 'mg/kg', 'prn')] })), 'ENRO_FELINE_RETINA')).toHaveLength(1)
  })
  it('4 mg/kg with no frequency is still only a validation note', () => {
    const r = analyze(cat({ meds: [med('enrofloxacin', 'enro_cat', 4, 'mg/kg', null)] }))
    expect(byRule(r, 'ENRO_FELINE_RETINA')).toHaveLength(0)
    expect(r.doses[0].status).toBe('unit_mismatch')
  })
  it('compareWithProtocol: a per-day protocol and no frequency → above when one dose exceeds the daily maximum', () => {
    const p = getProtocol('enrofloxacin', 'enro_cat')
    const r = compareWithProtocol({ protocol: p, amount: computeAmount({ value: 10, unit: 'mg/kg', weightKg: 4, species: 'cat' }), weightKg: 4, species: 'cat', frequency: null })
    expect(r).toMatchObject({ status: 'above', ratio: 2 })
  })
})

describe('repeated meloxicam in a cat (US boxed warning)', () => {
  it('daily meloxicam without a protocol → major, kidney, and the caution is not repeated as a note', () => {
    const r = analyze(cat({ meds: [med('meloxicam', null, 0.05, 'mg/kg', 'q24h')] }))
    expect(r.verdict.level).toBe('major')
    const f = one(r, 'SPECIES_HARDSTOP')
    expect(f.severity).toBe('major')
    expect(f.problemKey).toBe('dose:meloxicam')
    expect(f.organs).toEqual(['kidney'])
    expect(f.title.en).toContain('boxed warning')
    expect(r.notes.some((n) => n.id === 'caution_meloxicam_0')).toBe(false)
  })
  it('a single injection, or no frequency entered, stays a monitoring note', () => {
    const once = analyze(cat({ meds: [{ ...med('meloxicam', 'melox_cat_periop', 0.3, 'mg/kg', 'once'), route: 'SC' }] }))
    expect(once.findings).toEqual([])
    expect(once.notes.some((n) => n.id === 'caution_meloxicam_0')).toBe(true)
    const blank = analyze(cat({ meds: [med('meloxicam', null, 0.05, 'mg/kg', null)] }))
    expect(byRule(blank, 'SPECIES_HARDSTOP')).toHaveLength(0)
  })
  it('does not apply to dogs', () => {
    expect(byRule(analyze(makeCase({ meds: [med('meloxicam', 'melox_dog_oa', 0.1, 'mg/kg')] })), 'SPECIES_HARDSTOP')).toHaveLength(0)
  })
})

describe('DOSE_RANGE wording when a single-dose protocol is repeated', () => {
  it('never tells the vet to raise the dose to the single-dose range', () => {
    const f = one(analyze(makeCase({ meds: [med('trazodone', 'traz_dog_previsit', 5, 'mg/kg', 'q12h')] })), 'DOSE_RANGE')
    const acts = f.actions.map((a) => a.en).join(' ')
    expect(acts).not.toContain('bring the dose within')
    expect(acts).toContain('Do not repeat')
    expect(f.actions.map((a) => a.ko).join(' ')).not.toContain('이내로 조정')
    expect(f.consequence.en).not.toContain('Higher exposure')
    expect(f.factors[0].label.en).toBe('5 mg/kg q12h (protocol: single dose)')
  })
  it('a repeated dose that is also ≥ 2× the maximum is major', () => {
    const r = analyze(cat({ meds: [{ ...med('meloxicam', 'melox_cat_periop', 0.6, 'mg/kg', 'q24h'), route: 'SC' }] }))
    const f = one(r, 'DOSE_RANGE')
    expect(f.trace.rules.find((x) => x.ruleId === 'DOSE_RANGE').severity).toBe('major')
    expect(f.why.some((w) => w.en.includes('Each dose is also above'))).toBe(true)
  })
})

describe('drug–condition contraindications (DRUG_CONDITION)', () => {
  it('fluoxetine in an epileptic dog → contraindicated (Reconcile label)', () => {
    const f = one(analyze(makeCase({ weightKg: 12, conditions: ['epilepsy'], meds: [med('fluoxetine', 'flx_dog_sep', 1, 'mg/kg')] })), 'DRUG_CONDITION')
    expect(f.severity).toBe('contraindicated')
    expect(f.factors[0]).toMatchObject({ kind: 'condition', id: 'epilepsy' })
    expect(f.sources).toEqual(['reconcile_label'])
    expect(f.evidence).toBe('label')
    expect(f.organs).toEqual(['cns'])
  })
  it('phenobarbital in a dog with liver disease → contraindicated, with the IVETF alternatives', () => {
    const r = analyze(makeCase({ weightKg: 12, conditions: ['epilepsy', 'hepatopathy'], meds: [med('phenobarbital', 'pb_dog_epilepsy', 2.5, 'mg/kg', 'q12h')] }))
    const f = one(r, 'DRUG_CONDITION')
    expect(f.severity).toBe('contraindicated')
    expect(f.sources).toEqual(['bhatti2015'])
    expect(f.evidence).toBe('literature')
    expect(f.alternatives[0].en).toContain('Potassium bromide')
    expect(r.verdict.level).toBe('contraindicated')
  })
  it('the phenobarbital entry is dog-only (the consensus is about dogs)', () => {
    expect(byRule(analyze(cat({ conditions: ['hepatopathy'], meds: [med('phenobarbital', null, 2, 'mg/kg', 'q12h')] })), 'DRUG_CONDITION')).toHaveLength(0)
  })
  it('an NSAID with a history of GI ulceration → major (class warning)', () => {
    const f = one(analyze(makeCase({ conditions: ['gi_ulcer_history'], meds: [med('carprofen', 'carp_dog_pain', 4.4, 'mg/kg')] })), 'DRUG_CONDITION')
    expect(f.severity).toBe('major')
    expect(f.organs).toEqual(['gi'])
  })
  it('the epileptic golden case without fluoxetine gets no drug–condition finding', () => {
    const r = analyze(makeCase({ conditions: ['epilepsy'], meds: [med('phenobarbital', 'pb_dog_epilepsy', 2.5, 'mg/kg', 'q12h')] }))
    expect(byRule(r, 'DRUG_CONDITION')).toHaveLength(0)
  })
})

describe('NSAID_RENAL also fires on dehydration and loop diuretics', () => {
  const CARP = () => med('carprofen', 'carp_dog_pain', 4.4, 'mg/kg')
  it('CHF dog on carprofen + furosemide + benazepril, normal creatinine → moderate, both drugs named', () => {
    const f = one(analyze(makeCase({ weightKg: 10, conditions: ['mmvd_chf'], labs: { creatinine: 1.2 }, meds: [CARP(), med('furosemide', 'furo_dog_chf', 2, 'mg/kg', 'q12h'), med('benazepril', 'bena_dog_htn', 0.5, 'mg/kg')] })), 'NSAID_RENAL')
    expect(f.severity).toBe('moderate')
    expect(f.drugIds).toEqual(['carprofen', 'furosemide', 'benazepril'])
    expect(f.factors.map((x) => x.id)).toEqual(['furosemide', 'benazepril'])
    expect(f.title.en).toContain('renal risk factors')
  })
  it('a dehydrated dog on carprofen → moderate', () => {
    const f = one(analyze(makeCase({ conditions: ['dehydration'], meds: [CARP()] })), 'NSAID_RENAL')
    expect(f.factors[0]).toMatchObject({ kind: 'condition', id: 'dehydration' })
  })
  it('a cat on robenacoxib + furosemide → major', () => {
    expect(one(analyze(cat({ meds: [med('robenacoxib', 'robe_cat_postop', 1, 'mg/kg'), med('furosemide', null, 1, 'mg/kg')] })), 'NSAID_RENAL').severity).toBe('major')
  })
  it('an ACE inhibitor alone does not trigger it', () => {
    expect(byRule(analyze(makeCase({ meds: [CARP(), med('benazepril', 'bena_dog_htn', 0.5, 'mg/kg')] })), 'NSAID_RENAL')).toHaveLength(0)
  })
})

describe('GASTRIC_PH_AZOLE', () => {
  const KETO = () => med('ketoconazole', 'keto_dog_malassezia', 10, 'mg/kg')
  it('ketoconazole + omeprazole → moderate, cites Marks 2018', () => {
    const f = one(analyze(makeCase({ meds: [KETO(), med('omeprazole', 'ome_dog_acid', 1, 'mg/kg', 'q12h')] })), 'GASTRIC_PH_AZOLE')
    expect(f.severity).toBe('moderate')
    expect(f.drugIds).toEqual(['ketoconazole', 'omeprazole'])
    expect(f.sources).toContain('marks2018')
    expect(f.actions[0].en).toContain('fluconazole')
  })
  it('ketoconazole + famotidine also fires; an acid suppressant alone does not', () => {
    expect(byRule(analyze(makeCase({ meds: [KETO(), med('famotidine', 'famo_dog_acid', 1, 'mg/kg', 'q12h')] })), 'GASTRIC_PH_AZOLE')).toHaveLength(1)
    expect(byRule(analyze(makeCase({ meds: [med('omeprazole', 'ome_dog_acid', 1, 'mg/kg', 'q12h')] })), 'GASTRIC_PH_AZOLE')).toHaveLength(0)
  })
})

describe('strength suggestion stays inside the protocol range', () => {
  const hg = (w) => analyze(makeCase({ weightKg: w, meds: [med('ivermectin', 'iver_dog_hw', 6, 'mcg/kg', 'monthly')] })).doses[0]
  it('Heartgard at the 6 mcg/kg minimum follows the label weight bands instead of under-dosing', () => {
    const d25 = hg(25)
    expect(d25.administration.en).toBe('1 × 272 mcg chewable')
    expect(d25.rounding.text.en).toContain('stay within the reference 6–50 mcg/kg')
    expect(d25.rounding.text.en).toContain('5.44 mcg/kg')
    expect(hg(12).administration.en).toBe('1 × 136 mcg chewable')
    expect(hg(2).administration.en).toBe('1 × 68 mcg chewable')
  })
  it('a point dose (min = max) is left to the usual rounding tolerance', () => {
    const d = analyze(makeCase({ weightKg: 25, meds: [med('maropitant', 'maro_dog_vomit', 2, 'mg/kg')] })).doses[0]
    expect(d.rounding?.text.en ?? '').not.toContain('stay within')
  })
})

describe('no "0 × tablet" plans', () => {
  it('planForStrength returns null when the amount rounds to nothing', () => {
    expect(planForStrength(10, getDrug('tramadol').strengths[0])).toBeNull()
  })
  it('tramadol 2 mg/kg for a 5 kg cat: says no listed strength can deliver 10 mg, as a rounding note', () => {
    const r = analyze(cat({ weightKg: 5, meds: [med('tramadol', null, 2, 'mg/kg', 'q12h')] }))
    const d = r.doses[0]
    expect(d.administration.en).toBe('No listed strength can deliver 10 mg — compound or use a liquid')
    expect(d.administration.ko).toContain('등록된 함량으로')
    expect(r.notes.some((n) => n.id === 'rounding_tramadol_0' && n.text.en.startsWith('No listed strength'))).toBe(true)
  })
  it('a selected strength that is too large is named', () => {
    const d = analyze(cat({ meds: [med('maropitant', null, 0.6, 'mg/kg', 'q24h', { strengthId: 'maro_tab_160' })] })).doses[0]
    expect(d.administration.en).toContain('The selected 160 mg tablet cannot deliver 2.4 mg')
  })
})

describe('maropitant injection in dogs', () => {
  it('the label dog injection (1 mg/kg SC or IV q24h) is within its protocol', () => {
    for (const route of ['SC', 'IV']) {
      const r = analyze(makeCase({ meds: [{ ...med('maropitant', 'maro_dog_inj', 1, 'mg/kg'), route }] }))
      expect(r.doses[0].status).toBe('within')
      expect(r.findings).toEqual([])
      expect(r.notes.some((n) => n.id === 'dose_route_maropitant')).toBe(false)
    }
  })
  it('an injection checked against the oral protocol carries a route note', () => {
    const r = analyze(makeCase({ meds: [{ ...med('maropitant', 'maro_dog_vomit', 1, 'mg/kg'), route: 'SC' }] }))
    expect(r.notes.find((n) => n.id === 'dose_route_maropitant').text.en).toContain('differs from the protocol route (PO)')
    expect(one(r, 'DOSE_RANGE').why.some((w) => w.en.includes('may not apply'))).toBe(true)
  })
})
