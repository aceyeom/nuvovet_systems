import { describe, it, expect } from 'vitest'
import { parseDoseUnit, convertMass, toMg, displayMass, concentrationMgPerMl, fixFloat } from '../units.js'
import {
  computeAmount, bsaM2, MEEH_K, normalizeFrequency, perDayFactor, FREQUENCIES,
  planForStrength, splitStep, fractionLabel, bestStrength, rankStrengths, compareWithProtocol,
  buildDoseRow, exposure24hPerKg, roundToStep,
} from '../dose.js'
import { getDrug, getProtocol } from '../../knowledge/drugs.js'

describe('units', () => {
  it('parses dose units into dimension, numerator and basis', () => {
    expect(parseDoseUnit('mcg/kg')).toEqual({ dimension: 'mass', numerator: 'mcg', basis: 'per_kg' })
    expect(parseDoseUnit('µg/kg')).toEqual({ dimension: 'mass', numerator: 'mcg', basis: 'per_kg' })
    expect(parseDoseUnit('mg')).toEqual({ dimension: 'mass', numerator: 'mg', basis: 'per_animal' })
    expect(parseDoseUnit('mg/m²')).toEqual({ dimension: 'mass', numerator: 'mg', basis: 'per_m2' })
    expect(parseDoseUnit('mg/m2')).toEqual({ dimension: 'mass', numerator: 'mg', basis: 'per_m2' })
    expect(parseDoseUnit('IU/kg')).toEqual({ dimension: 'iu', numerator: 'IU', basis: 'per_kg' })
    expect(parseDoseUnit('mL')).toEqual({ dimension: 'volume', numerator: 'mL', basis: 'per_animal' })
    expect(parseDoseUnit('tablet')).toEqual({ dimension: 'count', numerator: 'tablet', basis: 'per_animal' })
    expect(parseDoseUnit('mg/cat')).toEqual({ dimension: 'mass', numerator: 'mg', basis: 'per_animal' })
  })

  it('never guesses an unknown unit', () => {
    expect(parseDoseUnit('mg/lb')).toBeNull()
    expect(parseDoseUnit('grains')).toBeNull()
    expect(parseDoseUnit('')).toBeNull()
    expect(parseDoseUnit(null)).toBeNull()
  })

  it('converts mcg ↔ mg ↔ g without float noise', () => {
    expect(convertMass(72, 'mcg', 'mg')).toBe(0.072)
    expect(convertMass(0.072, 'mg', 'mcg')).toBe(72)
    expect(convertMass(1.5, 'g', 'mg')).toBe(1500)
    expect(convertMass(250, 'mg', 'g')).toBe(0.25)
    expect(toMg(7200, 'mcg')).toBe(7.2)
    expect(convertMass(1, 'IU', 'mg')).toBeNull()
    expect(fixFloat(0.1 + 0.2)).toBe(0.3)
  })

  it('derives mg/mL from a liquid strength', () => {
    expect(concentrationMgPerMl({ amount: { value: 10, unit: 'mg' }, per: { value: 1, unit: 'mL' } })).toBe(10)
    expect(concentrationMgPerMl({ amount: { value: 1.5, unit: 'mg' }, per: { value: 1, unit: 'mL' } })).toBe(1.5)
    expect(concentrationMgPerMl({ amount: { value: 200, unit: 'mg' } })).toBeNull()
  })

  it('keeps the unit the clinician used for display', () => {
    expect(displayMass(0.072, 'mcg')).toEqual({ value: 72, unit: 'mcg' })
    expect(displayMass(7.2, 'mcg')).toEqual({ value: 7.2, unit: 'mg' })
    expect(displayMass(0.625, 'mg')).toEqual({ value: 0.625, unit: 'mg' })
    expect(displayMass(0.5)).toEqual({ value: 500, unit: 'mcg' })
  })
})

describe('computeAmount — per kg, per animal, per m²', () => {
  it('ivermectin 6 mcg/kg × 12 kg = 72 mcg = 0.072 mg', () => {
    const a = computeAmount({ value: 6, unit: 'mcg/kg', weightKg: 12, species: 'dog' })
    expect(a.ok).toBe(true)
    expect(a.mg).toBe(0.072)
    expect(a.perDose).toEqual({ value: 72, unit: 'mcg' })
    expect(a.working.en).toBe('6 mcg/kg × 12 kg = 72 mcg')
  })

  it('ivermectin 300 mcg/kg × 24 kg = 7.2 mg', () => {
    const a = computeAmount({ value: 300, unit: 'mcg/kg', weightKg: 24, species: 'dog' })
    expect(a.mg).toBe(7.2)
    expect(a.perDose).toEqual({ value: 7.2, unit: 'mg' })
    expect(a.working.en).toBe('300 mcg/kg × 24 kg = 7.2 mg')
  })

  it('methimazole 2.5 mg per cat is NOT multiplied by weight', () => {
    const a = computeAmount({ value: 2.5, unit: 'mg', weightKg: 4.1, species: 'cat' })
    expect(a.mg).toBe(2.5)
    expect(a.basis).toBe('per_animal')
    expect(a.working.en).toContain('not multiplied by weight')
    expect(a.working.ko).toContain('체중을 곱하지 않음')
  })

  it('per-kg doses need a weight; missing weight is an error, not zero', () => {
    const a = computeAmount({ value: 5, unit: 'mg/kg', weightKg: null, species: 'dog' })
    expect(a.ok).toBe(false)
    expect(a.error).toBe('weight')
  })

  it('volume doses convert to mg through the strength concentration', () => {
    const a = computeAmount({ value: 0.72, unit: 'mL', weightKg: 24, species: 'dog', strength: getDrug('ivermectin').strengths.find((s) => s.id === 'iver_sol_10') })
    expect(a.mg).toBe(7.2)
  })

  it('IU doses stay in IU', () => {
    const a = computeAmount({ value: 100, unit: 'IU/kg', weightKg: 10, species: 'dog' })
    expect(a.iu).toBe(1000)
    expect(a.mg).toBeNull()
    expect(a.perDose).toEqual({ value: 1000, unit: 'IU' })
  })
})

describe('BSA (Meeh)', () => {
  it('uses K = 10.1 for dogs and 10.0 for cats', () => {
    expect(MEEH_K).toEqual({ dog: 10.1, cat: 10.0 })
  })
  it('computes BSA = K × W^(2/3) / 100', () => {
    expect(bsaM2(10, 'dog')).toBeCloseTo(0.4688, 4) // 10.1 × 4.6416 / 100
    expect(bsaM2(4, 'cat')).toBeCloseTo(0.2520, 4) // 10.0 × 2.5198 / 100
    expect(bsaM2(0, 'dog')).toBeNull()
    expect(bsaM2(10, 'rabbit')).toBeNull()
  })
  it('scales mg/m² doses by BSA', () => {
    const a = computeAmount({ value: 10, unit: 'mg/m2', weightKg: 10, species: 'dog' })
    expect(a.mg).toBeCloseTo(4.688, 3)
    expect(a.working.en).toContain('BSA')
    expect(a.working.en).toContain('K = 10.1')
  })
})

describe('frequency vocabulary', () => {
  it('has exactly the specified ids', () => {
    expect(FREQUENCIES.map((f) => f.id)).toEqual(['once', 'q4h', 'q6h', 'q8h', 'q12h', 'q24h', 'q48h', 'q72h', 'weekly', 'q14d', 'monthly', 'cri', 'prn'])
  })
  it('maps Latin abbreviations and Korean phrases', () => {
    expect(normalizeFrequency('SID').id).toBe('q24h')
    expect(normalizeFrequency('BID').id).toBe('q12h')
    expect(normalizeFrequency('TID').id).toBe('q8h')
    expect(normalizeFrequency('QID').id).toBe('q6h')
    expect(normalizeFrequency('EOD').id).toBe('q48h')
    expect(normalizeFrequency('q.o.d.').id).toBe('q48h')
    expect(normalizeFrequency('1일 2회').id).toBe('q12h')
    expect(normalizeFrequency('하루 한번').id).toBe('q24h')
    expect(normalizeFrequency('월 1회').id).toBe('monthly')
    expect(normalizeFrequency('q12h').id).toBe('q12h')
    expect(normalizeFrequency('PRN').id).toBe('prn')
  })
  it('never coerces an unknown value silently', () => {
    const f = normalizeFrequency('sometimes')
    expect(f.ok).toBe(false)
    expect(f.id).toBeNull()
    expect(f.note.en).toContain('not recognised')
    expect(f.note.ko).toContain('인식할 수 없어')
    expect(normalizeFrequency('').ok).toBe(false)
  })
  it('gives administrations per day', () => {
    expect(perDayFactor('q12h')).toBe(2)
    expect(perDayFactor('q8h')).toBe(3)
    expect(perDayFactor('once')).toBe(1)
    expect(perDayFactor('q48h')).toBe(0.5)
    expect(perDayFactor('prn')).toBeNull()
    expect(perDayFactor('cri')).toBeNull()
  })
})

describe('tablet rounding and strength suggestion', () => {
  const tab = (value, extra = {}) => ({ id: `t${value}`, form: 'tablet', amount: { value, unit: 'mg' }, splittable: true, quarter: false, ...extra })

  it('rounds to ¼ when quarter-scorable, ½ when splittable, whole otherwise', () => {
    expect(splitStep(tab(10, { quarter: true }))).toBe(0.25)
    expect(splitStep(tab(10))).toBe(0.5)
    expect(splitStep(tab(10, { splittable: false }))).toBe(1)
    expect(splitStep({ form: 'capsule', splittable: true, amount: { value: 10, unit: 'mg' } })).toBe(1)
    expect(roundToStep(0.6, 0.25)).toBe(0.5)
    expect(roundToStep(0.65, 0.25)).toBe(0.75)
  })

  it('plans fractions and reports the deviation', () => {
    const quarter = planForStrength(0.625, tab(2.5, { quarter: true }))
    expect(quarter.units).toBe(0.25)
    expect(quarter.deviation).toBe(0)
    expect(quarter.text.en).toBe('¼ × 2.5 mg tablet')
    expect(quarter.text.ko).toBe('2.5 mg 정제 ¼정')
    const half = planForStrength(120, tab(200))
    expect(half.units).toBe(0.5)
    expect(half.deliveredMg).toBe(100)
    expect(half.deviation).toBeCloseTo(-0.1667, 3)
    const whole = planForStrength(30, tab(25, { splittable: false }))
    expect(whole.units).toBe(1)
  })

  it('formats fractions', () => {
    expect(fractionLabel(0.25)).toBe('¼')
    expect(fractionLabel(1.5)).toBe('1½')
    expect(fractionLabel(2)).toBe('2')
    expect(fractionLabel(0.75)).toBe('¾')
  })

  it('suggests the best-fit strength (exact whole units beat fractions; fewer units on ties)', () => {
    const csa = bestStrength(getDrug('ciclosporin'), 30, 'PO')
    expect(csa.strength.id).toBe('csa_cap_10')
    expect(csa.plan.units).toBe(3)
    const ac = bestStrength(getDrug('amoxicillin_clavulanate'), 375, 'PO')
    expect(ac.strength.id).toBe('ac_tab_375')
    const pb = bestStrength(getDrug('phenobarbital'), 15, 'PO')
    expect(pb.strength.id).toBe('pb_tab_15')
  })

  it('prefers a measurable liquid over a large pile of chewables', () => {
    const r = rankStrengths(getDrug('ivermectin'), 7.2, 'PO')
    expect(r[0].strength.id).toBe('iver_sol_10')
    expect(r[0].plan.text.en).toBe('0.72 mL of 10 mg/mL')
  })

  it('only offers forms that suit the route', () => {
    const sc = rankStrengths(getDrug('maropitant'), 4, 'SC')
    expect(sc.every((x) => x.strength.form === 'injection')).toBe(true)
    const po = rankStrengths(getDrug('maropitant'), 4, 'PO')
    expect(po.every((x) => x.strength.form === 'tablet')).toBe(true)
  })
})

describe('comparison with the protocol', () => {
  it('converts per-animal input to per-kg protocols and back', () => {
    const p = getProtocol('ciclosporin', 'csa_dog_ad') // 5 mg/kg
    const a = computeAmount({ value: 30, unit: 'mg', weightKg: 6, species: 'dog' })
    expect(compareWithProtocol({ protocol: p, amount: a, weightKg: 6, species: 'dog', frequency: 'q24h' }).status).toBe('within')
    const pc = getProtocol('methimazole', 'mmi_cat_start') // 2.5 mg per cat
    const b = computeAmount({ value: 0.625, unit: 'mg/kg', weightKg: 4, species: 'cat' }) // 2.5 mg
    expect(compareWithProtocol({ protocol: pc, amount: b, weightKg: 4, species: 'cat', frequency: 'q12h' }).status).toBe('within')
    const c = computeAmount({ value: 1.25, unit: 'mg/kg', weightKg: 4, species: 'cat' }) // 5 mg = 2× the starting dose
    expect(compareWithProtocol({ protocol: pc, amount: c, weightKg: 4, species: 'cat', frequency: 'q12h' })).toMatchObject({ status: 'above', ratio: 2 })
  })

  it('reports above / below with a ratio to the maximum', () => {
    const p = getProtocol('phenobarbital', 'pb_dog_epilepsy') // 2.5–3 mg/kg q12h
    const hi = compareWithProtocol({ protocol: p, amount: computeAmount({ value: 6, unit: 'mg/kg', weightKg: 10, species: 'dog' }), weightKg: 10, species: 'dog', frequency: 'q12h' })
    expect(hi.status).toBe('above')
    expect(hi.ratio).toBe(2)
    const lo = compareWithProtocol({ protocol: p, amount: computeAmount({ value: 1, unit: 'mg/kg', weightKg: 10, species: 'dog' }), weightKg: 10, species: 'dog', frequency: 'q12h' })
    expect(lo.status).toBe('below')
  })

  it('compares daily totals for per-day protocols', () => {
    const p = getProtocol('ketoconazole', 'keto_dog_malassezia') // 10 mg/kg/day
    const split = compareWithProtocol({ protocol: p, amount: computeAmount({ value: 5, unit: 'mg/kg', weightKg: 24, species: 'dog' }), weightKg: 24, species: 'dog', frequency: 'q12h' })
    expect(split.status).toBe('within')
    expect(split.compared).toEqual({ value: 10, unit: 'mg/kg/day', per: 'day' })
    const twice = compareWithProtocol({ protocol: p, amount: computeAmount({ value: 10, unit: 'mg/kg', weightKg: 24, species: 'dog' }), weightKg: 24, species: 'dog', frequency: 'q12h' })
    expect(twice.status).toBe('above')
    expect(twice.ratio).toBe(2)
    const unknownFreq = compareWithProtocol({ protocol: p, amount: computeAmount({ value: 5, unit: 'mg/kg', weightKg: 24, species: 'dog' }), weightKg: 24, species: 'dog', frequency: null })
    expect(unknownFreq.status).toBe('unit_mismatch')
  })

  it('catches a per-dose-correct amount given too often', () => {
    // Label range 3.3–6.7 mg/kg q24h (Atopica capsule table): 5 mg/kg q12h = 10 mg/kg/day vs 6.7 mg/kg/day.
    const p = getProtocol('ciclosporin', 'csa_dog_ad')
    const r = compareWithProtocol({ protocol: p, amount: computeAmount({ value: 5, unit: 'mg/kg', weightKg: 10, species: 'dog' }), weightKg: 10, species: 'dog', frequency: 'q12h' })
    expect(r.status).toBe('above')
    expect(r.ratio).toBeCloseTo(10 / 6.7, 6)
    expect(r.compared).toMatchObject({ value: 10, unit: 'mg/kg/day', reason: 'frequency' })
  })

  it('flags a single-dose protocol that is repeated', () => {
    const p = getProtocol('meloxicam', 'melox_cat_periop')
    const r = compareWithProtocol({ protocol: p, amount: computeAmount({ value: 0.3, unit: 'mg/kg', weightKg: 4, species: 'cat' }), weightKg: 4, species: 'cat', frequency: 'q24h' })
    expect(r.status).toBe('above')
    expect(r.compared.reason).toBe('repeat')
  })

  it('returns no_reference without a protocol and unit_mismatch for incomparable units', () => {
    expect(compareWithProtocol({ protocol: null, amount: computeAmount({ value: 1, unit: 'mg', weightKg: 4, species: 'cat' }) }).status).toBe('no_reference')
    const p = getProtocol('carprofen', 'carp_dog_pain')
    const r = compareWithProtocol({ protocol: p, amount: computeAmount({ value: 2, unit: 'tablet', weightKg: 20, species: 'dog' }), weightKg: 20, species: 'dog', frequency: 'q24h' })
    expect(r.status).toBe('unit_mismatch')
  })
})

describe('dose rows', () => {
  it('builds the Choco ivermectin row: 7.2 mg → 0.72 mL of 10 mg/mL', () => {
    const drug = getDrug('ivermectin')
    const row = buildDoseRow({
      med: { drugId: 'ivermectin', protocolId: 'iver_dog_demodex', dose: { value: 300, unit: 'mcg/kg' }, route: 'PO', frequency: 'q24h', strengthId: 'iver_sol_10' },
      drug, protocol: getProtocol('ivermectin', 'iver_dog_demodex'), weightKg: 24, species: 'dog', frequencyId: 'q24h',
    })
    expect(row.perDose).toEqual({ value: 7.2, unit: 'mg' })
    expect(row.perDay).toEqual({ value: 7.2, unit: 'mg' })
    expect(row.administration.en).toBe('0.72 mL of 10 mg/mL')
    expect(row.administration.ko).toBe('10 mg/mL 0.72 mL')
    expect(row.status).toBe('within')
    expect(row.ref).toMatchObject({ min: 300, max: 600, unit: 'mcg/kg', labelStatus: 'extra-label', source: 'mueller2020' })
    expect(row.working.en).toBe('300 mcg/kg × 24 kg = 7.2 mg')
  })

  it('flags tablet rounding that moves the dose by more than 10%', () => {
    const drug = getDrug('maropitant')
    const row = buildDoseRow({
      med: { drugId: 'maropitant', protocolId: 'maro_cat_ckd_po', dose: { value: 1, unit: 'mg/kg' }, route: 'PO', frequency: 'q24h' },
      drug, protocol: getProtocol('maropitant', 'maro_cat_ckd_po'), weightKg: 4.1, species: 'cat', frequencyId: 'q24h',
    })
    expect(row.perDoseMg).toBe(4.1)
    expect(row.rounding).not.toBeNull()
    expect(row.rounding.text.en).toContain('+95%')
  })

  it('perDay is null for intermittent or single-dose schedules', () => {
    const drug = getDrug('ivermectin')
    const row = buildDoseRow({
      med: { drugId: 'ivermectin', protocolId: 'iver_dog_hw', dose: { value: 6, unit: 'mcg/kg' }, route: 'PO', frequency: 'monthly' },
      drug, protocol: getProtocol('ivermectin', 'iver_dog_hw'), weightKg: 12, species: 'dog', frequencyId: 'monthly',
    })
    expect(row.perDose).toEqual({ value: 72, unit: 'mcg' })
    expect(row.perDay).toBeNull()
    // 1 × 68 mcg would be 5.7 mcg/kg, below the 6 mcg/kg label minimum; 136 mcg is the label band for 26–50 lb.
    expect(row.administration.en).toBe('1 × 136 mcg chewable')
  })

  it('computes 24-hour exposure per kg for safety ceilings', () => {
    expect(exposure24hPerKg(20, 4, 'q12h')).toBe(10)
    expect(exposure24hPerKg(20, 4, 'q24h')).toBe(5)
    expect(exposure24hPerKg(20, 4, 'q48h')).toBe(5)
    expect(exposure24hPerKg(20, 4, 'prn')).toBeNull()
  })
})
