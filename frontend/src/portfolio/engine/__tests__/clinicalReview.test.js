/**
 * Regression tests for the clinical/citation review of 2026-10-02.
 * Each test pins a correction made after checking the label or paper.
 */
import { describe, it, expect } from 'vitest'
import { analyze } from '../engine.js'
import { searchDrugs } from '../search.js'
import { getDrug } from '../../knowledge/drugs.js'
import { makeCase, med, byRule } from './helpers.js'

const one = (r, id) => {
  const list = byRule(r, id)
  expect(list).toHaveLength(1)
  return list[0]
}

describe('label weight-band dosing is not flagged as an overdose', () => {
  it('Heartgard: one 68 mcg chewable for a 2 kg Maltese (34 mcg/kg) is within range and raises no MDR1 finding', () => {
    const r = analyze(makeCase({ breedId: 'maltese', weightKg: 2, meds: [med('ivermectin', 'iver_dog_hw', 68, 'mcg', 'monthly')] }))
    expect(r.doses[0].status).toBe('within')
    expect(byRule(r, 'DOSE_RANGE')).toHaveLength(0)
    expect(byRule(r, 'MDR1_PGP_ML')).toHaveLength(0)
    expect(r.verdict.level).toBe('none')
  })
  it('Atopica: 25 mg for a 6 kg dog (4.2 mg/kg) is within the label capsule range 3.3–6.7 mg/kg', () => {
    const r = analyze(makeCase({ weightKg: 6, meds: [med('ciclosporin', 'csa_dog_ad', 25, 'mg')] }))
    expect(r.doses[0].status).toBe('within')
  })
  it('Onsior: one 6 mg tablet for a 3 kg cat (2 mg/kg) is within the label range 1–2.4 mg/kg', () => {
    const r = analyze(makeCase({ species: 'cat', weightKg: 3, meds: [med('robenacoxib', 'robe_cat_postop', 6, 'mg')] }))
    expect(r.doses[0].status).toBe('within')
    expect(byRule(r, 'DOSE_RANGE')).toHaveLength(0)
  })
})

describe('guideline ranges', () => {
  it('amlodipine 2.5 mg per cat is within the ACVIM range; 5 mg is flagged', () => {
    const ok = analyze(makeCase({ species: 'cat', weightKg: 4, meds: [med('amlodipine', 'amlo_cat_htn', 2.5, 'mg')] }))
    expect(ok.doses[0].status).toBe('within')
    const hi = analyze(makeCase({ species: 'cat', weightKg: 4, meds: [med('amlodipine', 'amlo_cat_htn', 5, 'mg')] }))
    expect(one(hi, 'DOSE_RANGE').severity).toBe('major')
  })
  it('benazepril in dogs: 0.5 mg/kg q24h and 2 mg/kg q12h are both within the ACVIM statement', () => {
    const a = analyze(makeCase({ meds: [med('benazepril', 'bena_dog_htn', 0.5, 'mg/kg', 'q24h')] }))
    const b = analyze(makeCase({ meds: [med('benazepril', 'bena_dog_htn', 2, 'mg/kg', 'q12h')] }))
    expect(a.doses[0].status).toBe('within')
    expect(b.doses[0].status).toBe('within')
  })
  it('feline trazodone 100 mg single dose is within the studied range', () => {
    const r = analyze(makeCase({ species: 'cat', weightKg: 5, meds: [med('trazodone', 'traz_cat_single', 100, 'mg', 'once')] }))
    expect(r.doses[0].status).toBe('within')
  })
  it('feline oral maropitant 4 mg per cat (the studied regimen) is within range for a 3 kg cat', () => {
    const r = analyze(makeCase({ species: 'cat', weightKg: 3, meds: [med('maropitant', 'maro_cat_ckd_po', 4, 'mg')] }))
    expect(r.doses[0].status).toBe('within')
  })
})

describe('rule wording matches the cited evidence', () => {
  it('MDR1: a heterozygous dog is graded conservatively and the text says so', () => {
    const f = one(analyze(makeCase({ breedId: 'labrador_retriever', weightKg: 24, mdr1Status: 'mutant/normal', meds: [med('ivermectin', 'iver_dog_demodex', 300, 'mcg/kg')] })), 'MDR1_PGP_ML')
    expect(f.severity).toBe('contraindicated')
    expect(f.why.some((w) => /Heterozygous Collies did not show ivermectin sensitivity/.test(w.en))).toBe(true)
  })
  it('MDR1: the P-gp inhibitor factor shows no potency grade (the source gives none)', () => {
    const f = one(analyze(makeCase({ breedId: 'collie', weightKg: 24, meds: [med('ivermectin', 'iver_dog_demodex', 300, 'mcg/kg'), med('ketoconazole', 'keto_dog_malassezia', 5, 'mg/kg', 'q12h')] })), 'MDR1_PGP_ML')
    const drugFactor = f.factors.find((x) => x.kind === 'drug')
    expect(drugFactor.label.en).not.toMatch(/strong|moderate/)
  })
  it('phenobarbital → prednisolone cites the IVETF consensus and is literature-based', () => {
    const f = one(analyze(makeCase({ meds: [med('phenobarbital', 'pb_dog_epilepsy', 2.5, 'mg/kg', 'q12h'), med('prednisolone', 'pred_dog_ad', 0.5, 'mg/kg')] })), 'CYP_INDUCTION')
    expect(f.severity).toBe('minor')
    expect(f.sources).toContain('bhatti2015')
    expect(f.evidence).toBe('literature')
  })
  it('ketoconazole liver risk is graded 1 (rare enzyme increases in 632 dogs)', () => {
    expect(getDrug('ketoconazole').organRisk.liver.level).toBe(1)
  })
  it('a note can carry several sources (methimazole monitoring: label + consensus)', () => {
    const r = analyze(makeCase({ species: 'cat', weightKg: 4, meds: [med('methimazole', 'mmi_cat_start', 2.5, 'mg', 'q12h')] }))
    expect(r.notes.find((n) => n.id === 'admin_methimazole_0').sources).toEqual(['felimazole_label', 'daminet2014'])
  })
})

describe('aliases are brand → same ingredient only', () => {
  it('prednisone (a different drug, poorly activated in cats) does not resolve to prednisolone', () => {
    const hits = searchDrugs('prednisone')
    expect(hits.some((h) => h.drugId === 'prednisolone' && h.matched.field === 'alias')).toBe(false)
    expect(getDrug('prednisolone').aliases.map((a) => a.toLowerCase())).not.toContain('prednisone')
  })
})
