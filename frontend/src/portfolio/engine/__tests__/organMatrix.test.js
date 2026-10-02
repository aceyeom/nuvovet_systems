import { describe, it, expect } from 'vitest'
import { analyze } from '../engine.js'
import { buildOrganMatrix, organCell } from '../organMatrix.js'
import { getDrug } from '../../knowledge/drugs.js'
import { ORGANS } from '../../knowledge/conditions.js'
import { makeCase, med } from './helpers.js'

describe('organ cells', () => {
  it('an organ the drug was not assessed for is "na", never 0', () => {
    const cell = organCell(getDrug('amoxicillin_clavulanate'), 'kidney', 'dog')
    expect(cell).toEqual({ level: 'na', reason: null, source: null })
  })
  it('an explicit level 0 stays 0 (distinct from "na")', () => {
    const fake = { organRisk: { kidney: { level: 0, reason: { en: 'r', ko: 'r' }, source: 'x' } } }
    expect(organCell(fake, 'kidney', 'dog').level).toBe(0)
    expect(organCell(fake, 'liver', 'dog').level).toBe('na')
  })
  it('applies species-specific entries (meloxicam kidney: dog 2, cat 3 boxed warning)', () => {
    expect(organCell(getDrug('meloxicam'), 'kidney', 'dog').level).toBe(2)
    expect(organCell(getDrug('meloxicam'), 'kidney', 'cat').level).toBe(3)
    expect(organCell(getDrug('ivermectin'), 'cns', 'dog').level).toBe(3)
    expect(organCell(getDrug('ivermectin'), 'cns', 'cat').level).toBe('na')
  })
  it('every assessed cell carries a bilingual reason and a source', () => {
    const r = analyze(makeCase({ meds: [med('meloxicam', 'melox_dog_oa', 0.1, 'mg/kg'), med('phenobarbital', 'pb_dog_epilepsy', 2.5, 'mg/kg', 'q12h'), med('methimazole', null, 2.5, 'mg')] }))
    for (const row of r.organMatrix.rows) {
      for (const organ of ORGANS) {
        const c = row.cells[organ]
        expect([0, 1, 2, 3, 'na']).toContain(c.level)
        if (c.level !== 'na') {
          expect(c.reason.en).toBeTruthy()
          expect(c.reason.ko).toBeTruthy()
          expect(c.source).toBeTruthy()
        }
      }
    }
  })
})

describe('matrix structure and badges', () => {
  it('has the six columns in order, with bilingual labels, and one row per distinct drug', () => {
    const input = makeCase({ meds: [med('meloxicam', 'melox_dog_oa', 0.1, 'mg/kg'), med('meloxicam', 'melox_dog_oa', 0.1, 'mg/kg'), med('famotidine', 'famo_dog_acid', 0.5, 'mg/kg', 'q12h')] })
    const m = analyze(input).organMatrix
    expect(m.columns.map((c) => c.id)).toEqual(['kidney', 'liver', 'gi', 'hemostasis', 'cns', 'heart'])
    for (const c of m.columns) {
      expect(c.label.en).toBeTruthy()
      expect(c.label.ko).toBeTruthy()
    }
    expect(m.rows.map((r) => r.drugId)).toEqual(['meloxicam', 'famotidine'])
    expect(Object.values(m.rows[1].cells).every((c) => c.level === 'na')).toBe(true)
  })
  it('additive badge when two drugs flag the same organ at level ≥ 2 (shown, not summed)', () => {
    const r = analyze(makeCase({ meds: [med('meloxicam', 'melox_dog_oa', 0.1, 'mg/kg'), med('prednisolone', 'pred_dog_ad', 0.5, 'mg/kg')] }))
    const gi = r.organMatrix.columns.find((c) => c.id === 'gi')
    const add = gi.badges.find((b) => b.kind === 'additive')
    expect(add.drugIds.sort()).toEqual(['meloxicam', 'prednisolone'])
    expect(add.reason.en).toContain('not summed')
    expect(gi.badges.some((b) => b.kind === 'interaction')).toBe(true) // NSAID + corticosteroid finding
    const kidney = r.organMatrix.columns.find((c) => c.id === 'kidney')
    expect(kidney.badges.find((b) => b.kind === 'additive')).toBeUndefined()
  })
  it('patient badge from a condition, and from creatinine alone', () => {
    const a = analyze(makeCase({ species: 'cat', weightKg: 4, conditions: ['ckd', 'hyperthyroidism'], meds: [med('amlodipine', 'amlo_cat_htn', 0.625, 'mg')] }))
    expect(a.organMatrix.columns.find((c) => c.id === 'kidney').badges.map((b) => b.kind)).toContain('patient')
    expect(a.organMatrix.columns.find((c) => c.id === 'heart').badges.map((b) => b.kind)).toContain('patient')
    const b = analyze(makeCase({ species: 'cat', weightKg: 4, labs: { creatinine: 2.4 }, meds: [med('amlodipine', 'amlo_cat_htn', 0.625, 'mg')] }))
    const kb = b.organMatrix.columns.find((c) => c.id === 'kidney').badges.find((x) => x.kind === 'patient')
    expect(kb.reason.en).toContain('creatinine 2.4')
  })
  it('interaction badge carries the finding title and severity', () => {
    const r = analyze(makeCase({ breedId: 'collie', weightKg: 24, meds: [med('ivermectin', 'iver_dog_demodex', 300, 'mcg/kg')] }))
    const cns = r.organMatrix.columns.find((c) => c.id === 'cns')
    const b = cns.badges.find((x) => x.kind === 'interaction')
    expect(b.severity).toBe('contraindicated')
    expect(b.reason.en).toContain('MDR1')
  })
  it('can be rebuilt directly from a result and a case input', () => {
    const input = makeCase({ meds: [med('carprofen', 'carp_dog_pain', 4.4, 'mg/kg')] })
    const r = analyze(input)
    expect(buildOrganMatrix(r, input)).toEqual(r.organMatrix)
  })
})
