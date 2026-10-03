/**
 * Regression tests for the clinical and design reviews of the EMR DUR popup
 * (fix round, 2026-10-03). Each block pins one finding (F3, F4, F8, F9, F11)
 * or the "no em dash in widget strings" rule (DESIGN_SYSTEM §5.6).
 */
import { describe, it, expect } from 'vitest'
import { analyze } from '../engine.js'
import { makeCase, med, byRule } from './helpers.js'
import { check } from '../../emr/adapter.js'
import { SCENARIOS } from '../../emr/fixtures.js'

const one = (r, id) => {
  const list = byRule(r, id)
  expect(list).toHaveLength(1)
  return list[0]
}
const cat = (over = {}) => makeCase({ species: 'cat', weightKg: 4, breedId: 'domestic_shorthair', ...over })

describe('F3: a starting-dose protocol keeps its sourced ceiling (phenobarbital loading total)', () => {
  it('25 mg/kg twice daily (50 mg/kg/day) is major, against the 20 mg/kg/day loading total', () => {
    const f = one(analyze(makeCase({ meds: [med('phenobarbital', 'pb_dog_epilepsy', 25, 'mg/kg', 'q12h')] })), 'DOSE_RANGE')
    expect(f.severity).toBe('major')
    expect(f.factors[0].id).toBe('phenobarbital_ceiling')
    expect(f.factors[0].label.ko).toBe('50 mg/kg/일 (상한 20 mg/kg/일)')
    expect(f.sources).toContain('bhatti2015')
  })
  it('4 mg/kg twice daily stays a minor titration check (E29 unchanged)', () => {
    const f = one(analyze(makeCase({ meds: [med('phenobarbital', 'pb_dog_epilepsy', 4, 'mg/kg', 'q12h')] })), 'DOSE_RANGE')
    expect(f.severity).toBe('minor')
    expect(f.factors[0].id).toBe('phenobarbital_start_above')
  })
  it('a daily total at the ceiling (10 mg/kg twice daily) is not above it', () => {
    expect(one(analyze(makeCase({ meds: [med('phenobarbital', 'pb_dog_epilepsy', 10, 'mg/kg', 'q12h')] })), 'DOSE_RANGE').severity).toBe('minor')
  })
})

describe('F4: maropitant (minimum-only label) is capped at the label’s highest oral dose', () => {
  it('20 mg/kg is major (2.5× the 8 mg/kg ceiling)', () => {
    const r = analyze(makeCase({ weightKg: 30, meds: [med('maropitant', 'maro_dog_vomit', 20, 'mg/kg')] }))
    const f = one(r, 'DOSE_RANGE')
    expect(f.severity).toBe('major')
    expect(r.doses[0]).toMatchObject({ status: 'above', ratio: 2.5 })
  })
  it('10 mg/kg is moderate; 2 mg/kg is within with no ratio (E05/E19 unchanged)', () => {
    expect(one(analyze(makeCase({ meds: [med('maropitant', 'maro_dog_vomit', 10, 'mg/kg')] })), 'DOSE_RANGE').severity).toBe('moderate')
    const r = analyze(makeCase({ meds: [med('maropitant', 'maro_dog_vomit', 2, 'mg/kg')] }))
    expect(r.doses[0]).toMatchObject({ status: 'within', ratio: null })
  })
})

describe('F8: a daily comparison shows the reference per day too', () => {
  it('tramadol 5 mg/kg q8h: "15 mg/kg/일 (참고 20 mg/kg/일)", not a per-dose reference', () => {
    const f = one(analyze(makeCase({ meds: [med('tramadol', 'tram_dog_pain', 5, 'mg/kg', 'q8h')] })), 'DOSE_RANGE')
    expect(f.factors[0].label.ko).toBe('15 mg/kg/일 (참고 20 mg/kg/일)')
    expect(f.factors[0].label.en).toBe('15 mg/kg/day (reference 20 mg/kg/day)')
  })
})

describe('F9: dose notes say why there is no reference, in words', () => {
  it('cat meloxicam by mouth names the route, not a missing protocol', () => {
    const r = analyze(cat({ meds: [med('meloxicam', null, 0.05, 'mg/kg', 'q24h')] }))
    const n = r.notes.find((x) => x.id === 'dose_noref_meloxicam')
    expect(n.text.ko).toBe('멜록시캄: 이 처방집에는 경구(PO) 경로의 고양이 참고 용량이 없습니다. 용량을 검토하지 않았습니다.')
    expect(n.text.en).not.toContain('protocol')
  })
  it('a dog-only drug in a cat says so', () => {
    const r = analyze(cat({ meds: [med('carprofen', null, 4, 'mg/kg', 'q24h')] }))
    expect(r.notes.find((x) => x.id === 'dose_noref_carprofen').text.en).toContain('lists it for dogs only')
  })
  it('a repeated single-dose protocol shows no source id or frequency code', () => {
    const f = one(analyze(cat({ meds: [med('meloxicam', 'melox_cat_periop', 0.3, 'mg/kg', 'q24h', { route: 'SC' })] })), 'DOSE_RANGE')
    const text = JSON.stringify([f.why, f.factors])
    expect(text).not.toContain('metacam_label')
    expect(text).not.toMatch(/\bq24h\b/)
    const g = one(analyze(makeCase({ meds: [med('trazodone', 'traz_dog_previsit', 5, 'mg/kg', 'q12h')] })), 'DOSE_RANGE')
    expect(g.why[0].ko).toMatch(/^선택한 프로토콜\(.+\)은 1회 투여만 다룹니다\. 입력한 빈도 12시간마다\(1일 2회\)는 반복 투여입니다\.$/)
    expect(g.why[0].ko).not.toMatch(/_label|_\d{4}|\bq12h\b/)
  })
  it('a spot-on product is named without "1 pipette 피펫"', () => {
    const r = analyze(cat({ meds: [{ ...med('permethrin', null, 1, 'mL', 'once'), route: 'spot-on', strengthId: 'perm_spot' }] }))
    const note = r.notes.find((x) => x.id.startsWith('dose_strength_permethrin'))
    expect(note.text.ko).toContain('(스팟온 피펫)')
    expect(note.text.ko).not.toContain('pipette')
  })
})

describe('F11: a proton-pump inhibitor and an H2 antagonist together', () => {
  it('omeprazole + famotidine → ACID_SUPPRESSANT_DUPLICATE minor, sourced to the ACVIM consensus', () => {
    const r = analyze(makeCase({ meds: [med('omeprazole', 'ome_dog_acid', 1, 'mg/kg', 'q12h'), med('famotidine', 'famo_dog_acid', 0.5, 'mg/kg', 'q12h')] }))
    const f = one(r, 'ACID_SUPPRESSANT_DUPLICATE')
    expect(f.severity).toBe('minor')
    expect(f.sources).toEqual(['marks2018'])
  })
  it('one acid suppressant alone raises nothing', () => {
    expect(byRule(analyze(makeCase({ meds: [med('omeprazole', 'ome_dog_acid', 1, 'mg/kg', 'q12h')] })), 'ACID_SUPPRESSANT_DUPLICATE')).toHaveLength(0)
  })
})

describe('no em dash in engine text the widget shows (DESIGN_SYSTEM §5.6)', () => {
  it('titles, factors, why, actions, alternatives, notes and plans of every scenario', () => {
    for (const [id, visit] of Object.entries(SCENARIOS)) {
      const c = check(visit)
      if (!c.supported) continue
      const r = c.result
      const parts = [
        ...r.findings.flatMap((f) => [f.title, f.consequence, ...f.why, ...f.actions, ...f.alternatives, ...f.factors.map((x) => x.label)]),
        ...r.notes.map((n) => n.text),
        ...r.doses.map((d) => d.administration),
        r.verdict.action,
      ].filter(Boolean)
      for (const p of parts) for (const t of [p.en, p.ko]) expect(t, `${id}: ${t}`).not.toContain('—')
    }
  })
})
