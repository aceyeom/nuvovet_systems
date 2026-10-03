import { describe, it, expect } from 'vitest'
import { analyze } from '../engine.js'
import { RULES, RULE_BY_ID } from '../rules/index.js'
import { SOURCES } from '../../knowledge/sources.js'
import { makeCase, med, byRule } from './helpers.js'
import { diffResults } from '../findings.js'
import { caseHash } from '../hash.js'

const IVER_HIGH = (v = 300) => med('ivermectin', 'iver_dog_demodex', v, 'mcg/kg', 'q24h')
const IVER_PREV = () => med('ivermectin', 'iver_dog_hw', 6, 'mcg/kg', 'monthly')
const KETO = () => med('ketoconazole', 'keto_dog_malassezia', 5, 'mg/kg', 'q12h')

function one(result, ruleId) {
  const list = byRule(result, ruleId)
  expect(list).toHaveLength(1)
  return list[0]
}

describe('rule registry', () => {
  it('has every rule from the spec, each with id, version, bilingual name and valid sources', () => {
    const ids = RULES.map((r) => r.id).sort()
    expect(ids).toEqual([
      'ACID_SUPPRESSANT_DUPLICATE', 'ADMIN_NOTES', 'ALLERGY_CLASS', 'CYP3A_INHIBITION', 'CYP_INDUCTION', 'DOSE_RANGE', 'DRUG_CONDITION', 'DUPLICATE_INGREDIENT', 'ENRO_FELINE_RETINA',
      'GASTRIC_PH_AZOLE', 'IMMUNOSUPPRESSION_ADDITIVE', 'MDR1_PGP_ML', 'METHIMAZOLE_CKD', 'NSAID_CORTICOSTEROID', 'NSAID_DUPLICATE',
      'NSAID_RENAL', 'RENAL_ADJUST', 'SEROTONERGIC', 'SPECIES_HARDSTOP',
    ])
    for (const r of RULES) {
      expect(r.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(r.name.en).toBeTruthy()
      expect(r.name.ko).toBeTruthy()
      expect(typeof r.evaluate).toBe('function')
      for (const s of r.sources) expect(SOURCES[s], `${r.id} → ${s}`).toBeTruthy()
    }
  })
})

describe('MDR1_PGP_ML tiers', () => {
  it('MDR1-risk breed + high dose → contraindicated (with breed, dose, genotype factors)', () => {
    const f = one(analyze(makeCase({ breedId: 'collie', meds: [IVER_HIGH()] })), 'MDR1_PGP_ML')
    expect(f.severity).toBe('contraindicated')
    expect(f.factors.map((x) => x.kind)).toEqual(expect.arrayContaining(['breed', 'dose', 'mdr1']))
    expect(f.organs).toEqual(['cns'])
  })
  it('adds the P-gp inhibitor as a factor and lists it in drugIds', () => {
    const f = one(analyze(makeCase({ breedId: 'collie', meds: [IVER_HIGH(), KETO()] })), 'MDR1_PGP_ML')
    expect(f.severity).toBe('contraindicated')
    expect(f.drugIds).toEqual(['ivermectin', 'ketoconazole'])
    expect(f.factors.find((x) => x.kind === 'drug').id).toBe('ketoconazole')
  })
  it('high dose + P-gp inhibitor in a breed without reported risk → major', () => {
    const f = one(analyze(makeCase({ breedId: 'labrador_retriever', meds: [IVER_HIGH(), KETO()] })), 'MDR1_PGP_ML')
    expect(f.severity).toBe('major')
  })
  it('genotype unknown + high dose, no risk breed → moderate "MDR1 status unknown"', () => {
    const f = one(analyze(makeCase({ breedId: 'labrador_retriever', meds: [IVER_HIGH()] })), 'MDR1_PGP_ML')
    expect(f.severity).toBe('moderate')
    expect(f.title.en).toContain('MDR1 status unknown')
  })
  it('unrecognised breed text is treated as unknown, never as safe', () => {
    const r = analyze(makeCase({ breedText: 'fluffy rescue', meds: [IVER_HIGH()] }))
    const f = one(r, 'MDR1_PGP_ML')
    expect(f.severity).toBe('moderate')
    expect(f.factors.find((x) => x.kind === 'breed').id).toBe('unknown')
    expect(r.trace.factorsMissing).toEqual(expect.arrayContaining(['breed', 'mdr1Status']))
  })
  it('MDR1-risk breed at the preventive dose → minor (label preventive doses are safe even for mutant/mutant dogs)', () => {
    const f = one(analyze(makeCase({ breedId: 'shetland_sheepdog', weightKg: 12, meds: [IVER_PREV()] })), 'MDR1_PGP_ML')
    expect(f.severity).toBe('minor')
  })
  it('MDR1-risk breed at the preventive dose + P-gp inhibitor → moderate, without telling the vet to stop the inhibitor', () => {
    const f = one(analyze(makeCase({ breedId: 'shetland_sheepdog', weightKg: 12, meds: [IVER_PREV(), med('ciclosporin', 'csa_dog_ad', 5, 'mg/kg')] })), 'MDR1_PGP_ML')
    expect(f.severity).toBe('moderate')
    const acts = f.actions.map((a) => a.en).join(' ')
    expect(acts).not.toContain('Remove or replace')
    expect(acts).toContain('keep strictly to the labelled preventive dose')
  })
  it('preventive dose, no risk breed, no inhibitor → no finding', () => {
    expect(byRule(analyze(makeCase({ breedId: 'labrador_retriever', weightKg: 12, meds: [IVER_PREV()] })), 'MDR1_PGP_ML')).toHaveLength(0)
  })
  it('preventive dose + P-gp inhibitor, no risk breed → minor', () => {
    const f = one(analyze(makeCase({ breedId: 'labrador_retriever', weightKg: 12, meds: [IVER_PREV(), KETO()] })), 'MDR1_PGP_ML')
    expect(f.severity).toBe('minor')
  })
  it('normal/normal genotype overrides breed risk: high dose → minor (monitor)', () => {
    const f = one(analyze(makeCase({ breedId: 'collie', mdr1Status: 'normal/normal', meds: [IVER_HIGH()] })), 'MDR1_PGP_ML')
    expect(f.severity).toBe('minor')
  })
  it('mutant genotype in any breed + high dose → contraindicated', () => {
    const f = one(analyze(makeCase({ breedId: 'labrador_retriever', mdr1Status: 'mutant/normal', meds: [IVER_HIGH()] })), 'MDR1_PGP_ML')
    expect(f.severity).toBe('contraindicated')
  })
  it('the 50 mcg/kg threshold separates preventive from high dose', () => {
    expect(byRule(analyze(makeCase({ breedId: 'labrador_retriever', meds: [med('ivermectin', null, 50, 'mcg/kg')] })), 'MDR1_PGP_ML')).toHaveLength(0)
    expect(byRule(analyze(makeCase({ breedId: 'labrador_retriever', meds: [med('ivermectin', null, 51, 'mcg/kg')] })), 'MDR1_PGP_ML')[0].severity).toBe('moderate')
  })
  it('does not apply to cats', () => {
    expect(byRule(analyze(makeCase({ species: 'cat', weightKg: 4, meds: [med('ivermectin', null, 300, 'mcg/kg')] })), 'MDR1_PGP_ML')).toHaveLength(0)
  })
})

describe('CYP3A_INHIBITION', () => {
  it('ketoconazole + ciclosporin → moderate, says the combination can be deliberate and asks for TDM', () => {
    const f = one(analyze(makeCase({ meds: [KETO(), med('ciclosporin', 'csa_dog_ad', 5, 'mg/kg')] })), 'CYP3A_INHIBITION')
    expect(f.severity).toBe('moderate')
    expect(f.sources).toEqual(expect.arrayContaining(['myre1991', 'archer2014']))
    expect(f.why.map((w) => w.en).join(' ')).toContain('on purpose')
    expect(f.actions.map((a) => a.en).join(' ')).toContain('TDM')
    expect(f.evidence).toBe('literature')
  })
  it('ketoconazole + a non-critical CYP3A substrate (maropitant) → minor, mechanistic', () => {
    const f = one(analyze(makeCase({ meds: [KETO(), med('maropitant', 'maro_dog_vomit', 2, 'mg/kg')] })), 'CYP3A_INHIBITION')
    expect(f.severity).toBe('minor')
    expect(f.evidence).toBe('mechanistic')
  })
  it('does not fire without a CYP3A substrate', () => {
    expect(byRule(analyze(makeCase({ meds: [KETO(), med('amoxicillin_clavulanate', 'ac_dog_eu', 12.5, 'mg/kg', 'q12h')] })), 'CYP3A_INHIBITION')).toHaveLength(0)
  })
})

describe('CYP_INDUCTION', () => {
  const PB = () => med('phenobarbital', 'pb_dog_epilepsy', 2.5, 'mg/kg', 'q12h')
  it('phenobarbital → ciclosporin: moderate, direction stated as LOWER levels', () => {
    const f = one(analyze(makeCase({ meds: [PB(), med('ciclosporin', 'csa_dog_ad', 5, 'mg/kg')] })), 'CYP_INDUCTION')
    expect(f.severity).toBe('moderate')
    expect(f.title.en).toBe('Phenobarbital lowers ciclosporin levels (enzyme induction)')
    expect(f.title.ko).toContain('낮춤')
    expect(f.why[0].en).toContain('levels fall')
    expect(f.why[0].en).toContain('not added toxicity')
    expect(f.alternatives[0].en).toContain('Oclacitinib')
  })
  it('phenobarbital → prednisolone or amlodipine: minor', () => {
    expect(one(analyze(makeCase({ meds: [PB(), med('prednisolone', 'pred_dog_ad', 0.5, 'mg/kg')] })), 'CYP_INDUCTION').severity).toBe('minor')
    expect(one(analyze(makeCase({ meds: [PB(), med('amlodipine', 'amlo_dog_htn', 0.2, 'mg/kg')] })), 'CYP_INDUCTION').severity).toBe('minor')
  })
  it('does not fire without an inducer', () => {
    expect(byRule(analyze(makeCase({ meds: [med('ciclosporin', 'csa_dog_ad', 5, 'mg/kg'), med('prednisolone', 'pred_dog_ad', 0.5, 'mg/kg')] })), 'CYP_INDUCTION')).toHaveLength(0)
  })
})

describe('NSAID rules', () => {
  const MELOX = () => med('meloxicam', 'melox_dog_oa', 0.1, 'mg/kg')
  it('NSAID_CORTICOSTEROID: meloxicam + prednisolone → major, GI organ', () => {
    const f = one(analyze(makeCase({ meds: [MELOX(), med('prednisolone', 'pred_dog_ad', 0.5, 'mg/kg')] })), 'NSAID_CORTICOSTEROID')
    expect(f.severity).toBe('major')
    expect(f.organs).toEqual(['gi'])
    expect(f.sources).toContain('lascelles2005')
  })
  it('NSAID_CORTICOSTEROID does not fire for an NSAID alone', () => {
    expect(byRule(analyze(makeCase({ meds: [MELOX()] })), 'NSAID_CORTICOSTEROID')).toHaveLength(0)
  })
  it('NSAID_DUPLICATE: meloxicam + carprofen → major', () => {
    const f = one(analyze(makeCase({ meds: [MELOX(), med('carprofen', 'carp_dog_pain', 4.4, 'mg/kg')] })), 'NSAID_DUPLICATE')
    expect(f.severity).toBe('major')
    expect(f.drugIds.sort()).toEqual(['carprofen', 'meloxicam'])
  })
  it('NSAID_RENAL: dog with CKD → moderate', () => {
    const f = one(analyze(makeCase({ conditions: ['ckd'], meds: [MELOX()] })), 'NSAID_RENAL')
    expect(f.severity).toBe('moderate')
    expect(f.factors.map((x) => x.kind)).toEqual(['condition'])
  })
  it('NSAID_RENAL: dog creatinine at or above 1.4 mg/dL fires; 1.2 does not', () => {
    const hi = one(analyze(makeCase({ labs: { creatinine: 1.5 }, meds: [MELOX()] })), 'NSAID_RENAL')
    expect(hi.factors[0]).toMatchObject({ kind: 'lab', id: 'creatinine' })
    expect(byRule(analyze(makeCase({ labs: { creatinine: 1.2 }, meds: [MELOX()] })), 'NSAID_RENAL')).toHaveLength(0)
  })
  it('NSAID_RENAL: cat → major, cites the feline guideline', () => {
    const f = one(analyze(makeCase({ species: 'cat', weightKg: 4, labs: { creatinine: 2.0 }, meds: [med('robenacoxib', 'robe_cat_postop', 1, 'mg/kg')] })), 'NSAID_RENAL')
    expect(f.severity).toBe('major')
    expect(f.sources).toContain('sparkes2010')
  })
})

describe('METHIMAZOLE_CKD', () => {
  const MMI = () => med('methimazole', 'mmi_cat_start', 2.5, 'mg', 'q12h')
  it('fires as moderate for a cat with CKD', () => {
    const f = one(analyze(makeCase({ species: 'cat', weightKg: 4, conditions: ['ckd'], meds: [MMI()] })), 'METHIMAZOLE_CKD')
    expect(f.severity).toBe('moderate')
    expect(f.sources).toEqual(expect.arrayContaining(['williams2010', 'daminet2014']))
  })
  it('fires on creatinine ≥ 1.6 mg/dL without a CKD label', () => {
    expect(one(analyze(makeCase({ species: 'cat', weightKg: 4, labs: { creatinine: 1.8 }, meds: [MMI()] })), 'METHIMAZOLE_CKD').severity).toBe('moderate')
  })
  it('does not fire with normal kidney values', () => {
    expect(byRule(analyze(makeCase({ species: 'cat', weightKg: 4, labs: { creatinine: 1.2 }, meds: [MMI()] })), 'METHIMAZOLE_CKD')).toHaveLength(0)
  })
})

describe('SPECIES_HARDSTOP', () => {
  it('cat + permethrin → contraindicated', () => {
    const f = one(analyze(makeCase({ species: 'cat', weightKg: 4, meds: [{ drugId: 'permethrin', protocolId: null, dose: { value: 1, unit: 'pipette' }, route: 'spot-on', frequency: 'once' }] })), 'SPECIES_HARDSTOP')
    expect(f.severity).toBe('contraindicated')
    expect(f.organs).toEqual(['cns'])
  })
  it('cat + acetaminophen → contraindicated (liver)', () => {
    const f = one(analyze(makeCase({ species: 'cat', weightKg: 4, meds: [med('acetaminophen', null, 10, 'mg/kg', 'q12h')] })), 'SPECIES_HARDSTOP')
    expect(f.severity).toBe('contraindicated')
    expect(f.organs).toEqual(['liver'])
    expect(f.sources).toContain('rumbeiha1995')
  })
  it('does not fire for a dog', () => {
    expect(byRule(analyze(makeCase({ meds: [med('acetaminophen', null, 10, 'mg/kg', 'q12h')] })), 'SPECIES_HARDSTOP')).toHaveLength(0)
  })
})

describe('ENRO_FELINE_RETINA', () => {
  const cat = (v, f) => makeCase({ species: 'cat', weightKg: 4, meds: [med('enrofloxacin', 'enro_cat', v, 'mg/kg', f)] })
  it('5 mg/kg once daily is at the limit → no finding', () => {
    expect(byRule(analyze(cat(5, 'q24h')), 'ENRO_FELINE_RETINA')).toHaveLength(0)
  })
  it('2.5 mg/kg twice daily (split dosing) → no finding', () => {
    expect(byRule(analyze(cat(2.5, 'q12h')), 'ENRO_FELINE_RETINA')).toHaveLength(0)
  })
  it('5 mg/kg twice daily (10 mg/kg/day) → major, merged with DOSE_RANGE into one card', () => {
    const r = analyze(cat(5, 'q12h'))
    expect(r.findings).toHaveLength(1)
    const f = r.findings[0]
    expect(f.severity).toBe('major')
    expect(f.problemKey).toBe('dose:enrofloxacin')
    expect(f.trace.rules.map((x) => x.ruleId).sort()).toEqual(['DOSE_RANGE', 'ENRO_FELINE_RETINA'])
  })
  it('does not apply to dogs', () => {
    expect(byRule(analyze(makeCase({ meds: [med('enrofloxacin', 'enro_dog', 10, 'mg/kg', 'q24h')] })), 'ENRO_FELINE_RETINA')).toHaveLength(0)
  })
})

describe('SEROTONERGIC', () => {
  const TRAM = () => med('tramadol', 'tram_dog_pain', 5, 'mg/kg', 'q8h')
  it('two serotonergic drugs → moderate, mechanistic evidence', () => {
    const f = one(analyze(makeCase({ meds: [TRAM(), med('trazodone', 'traz_dog_previsit', 10, 'mg/kg', 'once')] })), 'SEROTONERGIC')
    expect(f.severity).toBe('moderate')
    expect(f.evidence).toBe('mechanistic')
  })
  it('three serotonergic drugs → one finding listing all three', () => {
    const f = one(analyze(makeCase({ meds: [TRAM(), med('trazodone', 'traz_dog_previsit', 10, 'mg/kg', 'once'), med('fluoxetine', 'flx_dog_sep', 1, 'mg/kg')] })), 'SEROTONERGIC')
    expect(f.drugIds).toHaveLength(3)
  })
  it('one serotonergic drug → no finding', () => {
    expect(byRule(analyze(makeCase({ meds: [TRAM()] })), 'SEROTONERGIC')).toHaveLength(0)
  })
})

describe('IMMUNOSUPPRESSION_ADDITIVE', () => {
  it('ciclosporin + prednisolone → minor', () => {
    expect(one(analyze(makeCase({ meds: [med('ciclosporin', 'csa_dog_ad', 5, 'mg/kg'), med('prednisolone', 'pred_dog_ad', 0.5, 'mg/kg')] })), 'IMMUNOSUPPRESSION_ADDITIVE').severity).toBe('minor')
  })
  it('a single immunosuppressant → no finding', () => {
    expect(byRule(analyze(makeCase({ meds: [med('ciclosporin', 'csa_dog_ad', 5, 'mg/kg')] })), 'IMMUNOSUPPRESSION_ADDITIVE')).toHaveLength(0)
  })
})

describe('ALLERGY_CLASS', () => {
  it('penicillin allergy + amoxicillin–clavulanate → major with an allergy factor', () => {
    const f = one(analyze(makeCase({ allergies: ['penicillin'], meds: [med('amoxicillin_clavulanate', 'ac_dog_eu', 12.5, 'mg/kg', 'q12h')] })), 'ALLERGY_CLASS')
    expect(f.severity).toBe('major')
    expect(f.factors[0]).toMatchObject({ kind: 'allergy', id: 'penicillin' })
  })
  it('an unrelated allergy → no finding', () => {
    expect(byRule(analyze(makeCase({ allergies: ['sulfonamide'], meds: [med('amoxicillin_clavulanate', 'ac_dog_eu', 12.5, 'mg/kg', 'q12h')] })), 'ALLERGY_CLASS')).toHaveLength(0)
  })
})

describe('DOSE_RANGE', () => {
  const PB = (v) => makeCase({ weightKg: 10, meds: [med('phenobarbital', 'pb_dog_epilepsy', v, 'mg/kg', 'q12h')] })
  it('within range → no finding', () => {
    expect(byRule(analyze(PB(2.5)), 'DOSE_RANGE')).toHaveLength(0)
  })
  // Phenobarbital's protocol is a starting dose (phase 'start', spec D10), so the
  // above-max severities are tested on ketoconazole (extra-label, 10 mg/kg/day, q24h).
  const KETO10 = (v) => makeCase({ weightKg: 10, meds: [med('ketoconazole', 'keto_dog_malassezia', v, 'mg/kg', 'q24h')] })
  it('above max but < 2× → moderate', () => {
    const f = one(analyze(KETO10(12)), 'DOSE_RANGE')
    expect(f.severity).toBe('moderate')
    expect(f.why[0].en).toContain('1.2× the maximum')
  })
  it('≥ 2× max → major', () => {
    const f = one(analyze(KETO10(20)), 'DOSE_RANGE')
    expect(f.severity).toBe('major')
    expect(f.why[0].en).toContain('2× the maximum')
    expect(f.evidence).toBe('literature')
  })
  it('below min → minor (efficacy)', () => {
    expect(one(analyze(PB(1)), 'DOSE_RANGE').severity).toBe('minor')
  })
  it('a label protocol gives label evidence', () => {
    expect(one(analyze(makeCase({ meds: [med('ciclosporin', 'csa_dog_ad', 7, 'mg/kg')] })), 'DOSE_RANGE').evidence).toBe('label')
  })
  it('no protocol selected → a validation note, not a finding', () => {
    const r = analyze(makeCase({ meds: [med('phenobarbital', null, 2.5, 'mg/kg', 'q12h')] }))
    expect(byRule(r, 'DOSE_RANGE')).toHaveLength(0)
    expect(r.notes.find((n) => n.id === 'dose_noref_phenobarbital')).toBeTruthy()
    expect(r.doses[0].status).toBe('no_reference')
    expect(r.trace.factorsMissing).toContain('protocol.phenobarbital')
  })
  it('unit mismatch → a validation note', () => {
    const r = analyze(makeCase({ meds: [med('carprofen', 'carp_dog_pain', 1, 'tablet')] }))
    expect(r.doses[0].status).toBe('unit_mismatch')
    expect(r.notes.find((n) => n.id === 'dose_unit_carprofen')).toBeTruthy()
    expect(r.verdict.counts.doseProblems).toBe(1)
  })
  it('repeating a single-dose protocol → moderate from DOSE_RANGE; for feline meloxicam the boxed warning makes the merged card major', () => {
    const f = one(analyze(makeCase({ species: 'cat', weightKg: 4, meds: [{ ...med('meloxicam', 'melox_cat_periop', 0.3, 'mg/kg', 'q24h'), route: 'SC' }] })), 'DOSE_RANGE')
    expect(f.severity).toBe('major')
    expect(f.trace.rules).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'DOSE_RANGE', severity: 'moderate' }),
      expect.objectContaining({ ruleId: 'SPECIES_HARDSTOP', severity: 'major' }),
    ]))
    expect(f.why.some((w) => w.en.includes('single administration'))).toBe(true)
    const t = one(analyze(makeCase({ meds: [med('trazodone', 'traz_dog_previsit', 10, 'mg/kg', 'q12h')] })), 'DOSE_RANGE')
    expect(t.severity).toBe('moderate')
    expect(t.title.en).toContain('repeatedly')
  })
})

describe('RENAL_ADJUST', () => {
  const GABA = () => med('gabapentin', 'gaba_cat_previsit', 100, 'mg', 'once')
  it('gabapentin in a cat with CKD → moderate, cites Quimby 2022', () => {
    const f = one(analyze(makeCase({ species: 'cat', weightKg: 4, conditions: ['ckd'], meds: [GABA()] })), 'RENAL_ADJUST')
    expect(f.severity).toBe('moderate')
    expect(f.sources).toEqual(expect.arrayContaining(['quimby2022', 'radulovic1995']))
    expect(f.actions.map((a) => a.en).join(' ')).toContain('does not give a specific factor')
  })
  it('does not fire without kidney disease or for a drug without a renal fraction', () => {
    expect(byRule(analyze(makeCase({ species: 'cat', weightKg: 4, meds: [GABA()] })), 'RENAL_ADJUST')).toHaveLength(0)
    expect(byRule(analyze(makeCase({ conditions: ['ckd'], meds: [med('amoxicillin_clavulanate', 'ac_dog_eu', 12.5, 'mg/kg', 'q12h')] })), 'RENAL_ADJUST')).toHaveLength(0)
  })
})

describe('ADMIN_NOTES', () => {
  it('emits sourced notes as a checklist without changing the verdict', () => {
    const r = analyze(makeCase({ meds: [KETO()] }))
    const food = r.notes.find((n) => n.id === 'admin_ketoconazole_0')
    expect(food.kind).toBe('administration')
    expect(food.text.en).toContain('with food')
    expect(food.text.ko).toContain('음식과 함께')
    expect(food.sources).toEqual(['marks2018'])
    expect(r.verdict.level).toBe('none')
  })
  it('emits phenobarbital lab-interference notes (ALP up, T4 down)', () => {
    const r = analyze(makeCase({ meds: [med('phenobarbital', 'pb_dog_epilepsy', 2.5, 'mg/kg', 'q12h')] }))
    const lab = r.notes.find((n) => n.id === 'admin_phenobarbital_0')
    expect(lab.kind).toBe('lab')
    expect(lab.text.en).toContain('ALP')
    expect(lab.text.en).toContain('T4')
    expect(lab.sources).toEqual(['gieger2000'])
  })
  it('turns non-contraindicated species cautions into monitoring notes', () => {
    const r = analyze(makeCase({ species: 'cat', weightKg: 4, meds: [med('enrofloxacin', 'enro_cat', 5, 'mg/kg')] }))
    expect(r.notes.find((n) => n.id === 'caution_enrofloxacin_0').kind).toBe('monitoring')
  })
  it('says honestly that pregnancy is recorded but not checked', () => {
    const r = analyze(makeCase({ pregnant: true, meds: [KETO()] }))
    expect(r.notes.find((n) => n.id === 'repro_not_checked')).toBeTruthy()
  })
  it('raises a validation note for an unknown frequency and never computes a daily total from it', () => {
    const r = analyze(makeCase({ meds: [med('phenobarbital', 'pb_dog_epilepsy', 2.5, 'mg/kg', 'whenever')] }))
    expect(r.notes.find((n) => n.id.startsWith('freq_phenobarbital'))).toBeTruthy()
    expect(r.doses[0].perDay).toBeNull()
  })
  it('flags medications that are not in the formulary', () => {
    const r = analyze(makeCase({ meds: [med('unobtainium', null, 1, 'mg/kg')] }))
    expect(r.notes.find((n) => n.id === 'unknown_drug_0')).toBeTruthy()
    expect(r.trace.drugsResolved).toBe(0)
  })
})

describe('merging, ranking and verdict', () => {
  it('ranks by severity, then by number of factors', () => {
    const r = analyze(makeCase({
      breedId: 'collie', weightKg: 24,
      meds: [IVER_HIGH(), KETO(), med('meloxicam', 'melox_dog_oa', 0.1, 'mg/kg'), med('prednisolone', 'pred_dog_ad', 0.5, 'mg/kg')],
    }))
    const sev = r.findings.map((f) => f.severity)
    expect(sev[0]).toBe('contraindicated')
    expect(sev).toEqual([...sev].sort((a, b) => ['contraindicated', 'major', 'moderate', 'minor'].indexOf(a) - ['contraindicated', 'major', 'moderate', 'minor'].indexOf(b)))
    expect(r.verdict.level).toBe('contraindicated')
    expect(r.verdict.counts.contraindicated).toBe(1)
    expect(r.verdict.counts.major).toBe(1)
  })
  it('the verdict "none" never claims safety', () => {
    const r = analyze(makeCase({ meds: [med('amoxicillin_clavulanate', 'ac_dog_eu', 12.5, 'mg/kg', 'q12h')] }))
    expect(r.verdict.level).toBe('none')
    expect(r.verdict.headline.en).toContain('not a guarantee of safety')
    expect(r.verdict.headline.en.toLowerCase()).not.toContain('safe to')
  })
  it('records a trace with timing from performance.now()', () => {
    const r = analyze(makeCase({ meds: [KETO(), med('ciclosporin', 'csa_dog_ad', 5, 'mg/kg')] }))
    expect(r.trace.drugsResolved).toBe(2)
    expect(r.trace.pairsEvaluated).toBe(1)
    expect(r.trace.rulesEvaluated).toBe(RULES.length)
    expect(r.trace.rulesFired).toContain('CYP3A_INHIBITION')
    expect(typeof r.trace.ms).toBe('number')
    expect(r.trace.ms).toBeGreaterThanOrEqual(0)
  })
  it('is pure: the same input gives the same output (except timing) and the input is not mutated', () => {
    const input = makeCase({ breedId: 'collie', weightKg: 24, meds: [IVER_HIGH(), KETO()] })
    const snapshot = JSON.stringify(input)
    const a = analyze(input)
    const b = analyze(input)
    expect(JSON.stringify(input)).toBe(snapshot)
    const strip = (r) => JSON.stringify({ ...r, trace: { ...r.trace, ms: 0 } })
    expect(strip(a)).toBe(strip(b))
  })
  it('every finding has bilingual text, a known rule and only registered sources', () => {
    const r = analyze(makeCase({
      species: 'cat', weightKg: 4, conditions: ['ckd'], allergies: ['nsaid'],
      meds: [med('robenacoxib', 'robe_cat_postop', 3, 'mg/kg'), med('prednisolone', null, 1, 'mg/kg'), med('enrofloxacin', 'enro_cat', 5, 'mg/kg', 'q12h'), med('gabapentin', 'gaba_cat_previsit', 100, 'mg', 'once'), med('acetaminophen', null, 10, 'mg/kg')],
    }))
    expect(r.findings.length).toBeGreaterThan(4)
    for (const f of r.findings) {
      expect(RULE_BY_ID[f.ruleId]).toBeTruthy()
      for (const t of [f.title, f.consequence, ...f.why, ...f.actions, ...f.alternatives, ...f.ownerSigns, ...f.factors.map((x) => x.label)]) {
        expect(t.en, f.id).toBeTruthy()
        expect(t.ko, f.id).toBeTruthy()
      }
      for (const s of f.sources) expect(SOURCES[s], `${f.id} → ${s}`).toBeTruthy()
      expect(['literature', 'label', 'mechanistic']).toContain(f.evidence)
    }
  })
})

describe('helpers for the UI: diffResults and caseHash', () => {
  it('reports a cleared MDR1 finding when the breed changes to Labrador', () => {
    const before = analyze(makeCase({ breedId: 'collie', weightKg: 24, meds: [IVER_HIGH()] }))
    const after = analyze(makeCase({ breedId: 'labrador_retriever', weightKg: 24, meds: [IVER_HIGH()] }))
    const d = diffResults(before, after)
    expect(d.verdictFrom).toBe('contraindicated')
    expect(d.verdictTo).toBe('moderate')
    expect(d.changed[0]).toMatchObject({ from: 'contraindicated', to: 'moderate' })
    const cleared = diffResults(before, analyze(makeCase({ breedId: 'labrador_retriever', weightKg: 24, meds: [IVER_PREV()] })))
    expect(cleared.removed.map((f) => f.ruleId)).toEqual(['MDR1_PGP_ML'])
  })
  it('gives the same report id for the same inputs regardless of key order', () => {
    const a = caseHash({ species: 'dog', weightKg: 10, meds: [] })
    const b = caseHash({ meds: [], weightKg: 10, species: 'dog' })
    expect(a).toBe(b)
    expect(a).toMatch(/^DUR-[0-9A-F]{8}$/)
    expect(caseHash({ species: 'dog', weightKg: 11, meds: [] })).not.toBe(a)
  })
})

describe('same ingredient on several rows (popup spec D9)', () => {
  const CARP = (value, unit, strengthId, extra = {}) => med('carprofen', 'carp_dog_pain', value, unit, 'q24h', { durationDays: 7, strengthId, ...extra })

  it('rows with the same route, frequency, duration and protocol are summed and checked once (E24: 100 mg + 25 mg = 125 mg, within)', () => {
    const r = analyze(makeCase({ weightKg: 28, meds: [CARP(1, 'tablet', 'carp_tab_100'), CARP(1, 'tablet', 'carp_tab_25')] }))
    expect(r.findings).toHaveLength(0)
    for (const d of r.doses) {
      expect(d.combined).toEqual({ rows: 2, indexes: [0, 1], totalMg: 125 })
      expect(d.status).toBe('within')
      expect(d.ratio).toBeCloseTo(1.015, 3)
    }
    expect(r.doses[1].combinedInto).toBe(0)
    expect(r.doses[0].combinedInto).toBeUndefined()
    const n = r.notes.find((x) => x.id === 'combined_carprofen')
    expect(n.text.ko).toBe('카프로펜: 같은 성분 2행을 합산해 1회 125 mg으로 한 번 검토했습니다.')
  })

  it('a summed total above the reference is one DOSE_RANGE finding with a summed why line (E25: 2 × 4.4 mg/kg → major, 2.0×)', () => {
    const r = analyze(makeCase({ weightKg: 28, meds: [CARP(4.4, 'mg/kg', 'carp_tab_100'), CARP(4.4, 'mg/kg', 'carp_tab_25')] }))
    const f = one(r, 'DOSE_RANGE')
    expect(f.severity).toBe('major')
    expect(f.drugIds).toEqual(['carprofen'])
    expect(f.why.some((w) => w.ko === '같은 성분 2행을 합산한 1회 246.4 mg으로 비교했습니다.')).toBe(true)
    expect(r.doses.map((d) => [d.status, d.ratio, d.combined.totalMg])).toEqual([['above', 2, 246.4], ['above', 2, 246.4]])
    expect(r.notes.find((x) => x.id === 'combined_carprofen').text.en).toContain('summed to 246.4 mg')
    expect(byRule(r, 'DUPLICATE_INGREDIENT')).toHaveLength(0)
    expect(r.verdict.counts.doseProblems).toBe(1) // one group, counted once
  })

  it('rows that cannot be summed, all repeated → DUPLICATE_INGREDIENT major', () => {
    const r = analyze(makeCase({ weightKg: 28, meds: [CARP(4.4, 'mg/kg', null, { durationDays: 7 }), CARP(4.4, 'mg/kg', null, { durationDays: 14 })] }))
    const f = one(r, 'DUPLICATE_INGREDIENT')
    expect(f).toMatchObject({ severity: 'major', problemKey: 'dup:carprofen', drugIds: ['carprofen'], evidence: 'mechanistic', sources: [] })
    expect(f.title.ko).toBe('동일 성분 중복: 카프로펜 2행')
    expect(r.doses.every((d) => d.combined == null)).toBe(true)
  })

  it('a single administration and a repeated course of the same ingredient → DUPLICATE_INGREDIENT moderate (E26)', () => {
    const r = analyze(makeCase({ weightKg: 28, meds: [
      { ...med('meloxicam', null, 0.2, 'mg/kg', 'once', { durationDays: 1, strengthId: 'melox_inj_5' }), route: 'SC' },
      med('meloxicam', 'melox_dog_oa', 0.1, 'mg/kg', 'q24h', { durationDays: 14, strengthId: 'melox_susp_1_5' }),
    ] }))
    expect(r.findings.map((f) => `${f.ruleId}/${f.severity}`)).toEqual(['DUPLICATE_INGREDIENT/moderate'])
    expect(byRule(r, 'NSAID_DUPLICATE')).toHaveLength(0)
  })

  it('is registered right after NSAID_DUPLICATE in the pd layer', () => {
    const ids = RULES.map((r) => r.id)
    expect(ids.indexOf('DUPLICATE_INGREDIENT')).toBe(ids.indexOf('NSAID_DUPLICATE') + 1)
    expect(RULE_BY_ID.DUPLICATE_INGREDIENT).toMatchObject({ version: '1.0.0', layer: 'pd' })
  })
})

describe('starting-dose protocols (popup spec D10)', () => {
  const PB = (v) => makeCase({ weightKg: 10, meds: [med('phenobarbital', 'pb_dog_epilepsy', v, 'mg/kg', 'q12h')] })
  for (const v of [4, 6]) {
    it(`phenobarbital ${v} mg/kg q12h (above the 2.5–3 mg/kg starting dose) → minor titration check, never an overdose`, () => {
      const f = one(analyze(PB(v)), 'DOSE_RANGE')
      expect(f.severity).toBe('minor')
      expect(f.factors[0].id).toBe('phenobarbital_start_above')
      expect(f.title.ko).toBe('페노바르비탈: 시작 용량보다 높음 (적정 중인 유지 용량이면 해당 없음)')
      expect(f.ruleVersion).toBe('1.2.0')
    })
  }
  it('below the starting dose → minor, start_below', () => {
    const f = one(analyze(PB(1)), 'DOSE_RANGE')
    expect(f.severity).toBe('minor')
    expect(f.factors[0].id).toBe('phenobarbital_start_below')
    expect(f.title.ko).toBe('페노바르비탈: 시작 용량보다 낮음 (적정 중인 유지 용량이면 해당 없음)')
  })
  it('methimazole 5 mg q12h refill in a cat with creatinine 2.0 → METHIMAZOLE_CKD moderate + DOSE_RANGE minor (E28)', () => {
    const r = analyze(makeCase({ species: 'cat', weightKg: 4.1, conditions: ['hyperthyroidism'], labs: { creatinine: 2 },
      meds: [med('methimazole', 'mmi_cat_start', 2, 'tablet', 'q12h', { strengthId: 'mmi_tab_2_5' })] }))
    expect(r.verdict.level).toBe('moderate')
    expect(r.findings.map((f) => `${f.ruleId}/${f.severity}`)).toEqual(['METHIMAZOLE_CKD/moderate', 'DOSE_RANGE/minor'])
    expect(r.doses[0]).toMatchObject({ status: 'above', ratio: 2 })
  })
})

describe('planned amount above the feline enrofloxacin limit (popup spec D15)', () => {
  it('E23: 5 mg/kg at 3.5 kg is within, but the 22.7 mg tablet plan gives 6.49 mg/kg/day → a ceiling_plan note', () => {
    const r = analyze(makeCase({ species: 'cat', weightKg: 3.5, meds: [med('enrofloxacin', 'enro_cat', 5, 'mg/kg', 'q24h', { strengthId: 'enro_tab_22_7' })] }))
    expect(r.findings).toHaveLength(0)
    expect(r.doses[0].status).toBe('within')
    expect(r.doses[0].planExceedsCeiling).toEqual({ valuePerKgDay: expect.closeTo(6.486, 3), limit: 5 })
    const n = r.notes.find((x) => x.id === 'ceiling_plan_enrofloxacin_0')
    expect(n).toMatchObject({ category: 'caution', drugIds: ['enrofloxacin'], sources: ['baytril_label'] })
    expect(n.text.ko).toBe('엔로플록사신: 가장 가까운 제품 투여량(22.7 mg 정제 1정)은 6.49 mg/kg/일로 고양이 한계 5 mg/kg/일을 넘습니다. 다른 함량이나 조제 제형을 사용하고 올림하지 마십시오.')
  })
  it('no note when the vet entered the product amount, or when the entered dose already breaches (ENRO_FELINE_RETINA covers it)', () => {
    const counted = analyze(makeCase({ species: 'cat', weightKg: 3.5, meds: [med('enrofloxacin', 'enro_cat', 1, 'tablet', 'q24h', { strengthId: 'enro_tab_22_7' })] }))
    expect(counted.notes.some((x) => x.id.startsWith('ceiling_plan_'))).toBe(false)
    expect(one(counted, 'ENRO_FELINE_RETINA').severity).toBe('major')
    const over = analyze(makeCase({ species: 'cat', weightKg: 3.5, meds: [med('enrofloxacin', 'enro_cat', 10, 'mg/kg', 'q24h', { strengthId: 'enro_tab_22_7' })] }))
    expect(over.notes.some((x) => x.id.startsWith('ceiling_plan_'))).toBe(false)
  })
  it('dogs are unaffected', () => {
    const r = analyze(makeCase({ weightKg: 3.5, meds: [med('enrofloxacin', 'enro_dog', 5, 'mg/kg', 'q24h', { strengthId: 'enro_tab_22_7' })] }))
    expect(r.notes.some((x) => x.id.startsWith('ceiling_plan_'))).toBe(false)
  })
})

describe('verdict.action and counts.doseChecks (popup spec D8, D17)', () => {
  const LEVELS = {
    contraindicated: makeCase({ breedId: 'collie', meds: [IVER_HIGH(), KETO()] }),
    major: makeCase({ meds: [med('carprofen', 'carp_dog_pain', 4.4, 'mg/kg'), med('meloxicam', 'melox_dog_oa', 0.1, 'mg/kg')] }),
    moderate: makeCase({ weightKg: 10, meds: [med('ketoconazole', 'keto_dog_malassezia', 12, 'mg/kg')] }),
    minor: makeCase({ weightKg: 10, meds: [med('phenobarbital', 'pb_dog_epilepsy', 4, 'mg/kg', 'q12h')] }),
    none: makeCase({ meds: [] }),
  }
  const EXPECTED = {
    contraindicated: { ko: '현재 처방대로 조제하지 마십시오', en: 'Do not dispense as written' },
    major: { ko: '처방을 변경하거나 의도한 이유를 기록하십시오', en: 'Change the prescription or record why it is intended' },
    moderate: { ko: '아래 모니터링 계획과 함께 조제하십시오', en: 'Dispense only with the monitoring plan below' },
    minor: { ko: '기록하고 관찰하십시오', en: 'Note and monitor' },
    none: { ko: '규칙으로 확인한 문제가 없습니다. 이상이 없다는 뜻은 아닙니다.', en: 'The rules found no problem. This does not mean there is none.' },
  }
  for (const [level, input] of Object.entries(LEVELS)) {
    it(`${level}: the action line has no severity word, no dash and no "안전"`, () => {
      const v = analyze(input).verdict
      expect(v.level).toBe(level)
      expect(v.action).toEqual(EXPECTED[level])
      expect(v.headline).toBeTruthy() // kept for the workbench
      for (const t of [v.action.ko, v.action.en]) {
        expect(t).not.toMatch(/[—–]/)
        expect(t).not.toContain('안전')
      }
      expect(v.action.ko.startsWith('금기') || v.action.ko.startsWith('중대') || v.action.ko.startsWith('주의') || v.action.ko.startsWith('경미')).toBe(false)
    })
  }
  it('doseChecks counts a rounding note even when there is no dose problem (E20)', () => {
    const r = analyze(makeCase({ weightKg: 11, meds: [med('carprofen', 'carp_dog_pain', 2, 'tablet', 'q24h', { strengthId: 'carp_tab_25' })] }))
    expect(r.verdict.counts).toMatchObject({ doseProblems: 0, doseChecks: 1 })
  })
  it('doseChecks ignores within and no-reference rows without a rounding note', () => {
    const r = analyze(makeCase({ weightKg: 22.7, meds: [med('phenobarbital', null, 15, 'mg', 'q12h'), med('carprofen', 'carp_dog_pain', 1, 'tablet', 'q24h', { strengthId: 'carp_tab_100' })] }))
    expect(r.doses.map((d) => d.status)).toEqual(['no_reference', 'within'])
    expect(r.doses.every((d) => !d.rounding)).toBe(true)
    expect(r.verdict.counts.doseChecks).toBe(0)
  })
})
