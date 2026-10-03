/** Fix-round regressions for the /dur pages (engineering, design and WP2 reviews). */
import { describe, it, expect } from 'vitest'
import { resolveCase, sanitizeInput } from '../caseModel.js'
import { encodeState } from '../../router.js'
import { analyze } from '../../engine/engine.js'
import { BREED_BY_ID } from '../../knowledge/breeds.js'
import { CASE_BY_ID } from '../../cases/cases.js'
import { breedLabel } from '../BreedCombobox.jsx'
import { buildHandout } from '../report/handoutModel.js'

describe('sanitizeInput keeps a null dose (E17 workbench link)', () => {
  it('null stays null; an object keeps its value and unit', () => {
    const raw = { species: 'dog', meds: [{ drugId: 'ivermectin', dose: null }, { drugId: 'ketoconazole', dose: { value: 5, unit: 'mg/kg' } }] }
    const out = sanitizeInput(raw)
    expect(out.meds[0].dose).toBeNull()
    expect(out.meds[1].dose).toEqual({ value: 5, unit: 'mg/kg' })
  })
  it('a linked case with an unknown ivermectin dose in an MDR1 breed stays contraindicated', () => {
    const input = { species: 'dog', weightKg: 24, breedId: 'collie', meds: [
      { drugId: 'ivermectin', dose: null, route: 'PO', frequency: 'q24h' },
      { drugId: 'ketoconazole', dose: { value: 5, unit: 'mg/kg' }, route: 'PO', frequency: 'q12h' },
    ] }
    const { input: linked } = resolveCase('custom', { s: encodeState(input) })
    const direct = analyze(sanitizeInput(input))
    const viaLink = analyze(linked)
    const key = (r) => r.findings.map((f) => `${f.problemKey}/${f.severity}`)
    expect(key(viaLink)).toEqual(key(direct))
    expect(viaLink.findings.find((f) => f.problemKey === 'mdr1:ivermectin')?.severity).toBe('contraindicated')
  })
})

describe('breedLabel (UI-language breed names)', () => {
  const collie = BREED_BY_ID.collie
  const dsh = BREED_BY_ID.domestic_shorthair
  it('a typed English alias is not shown on a Korean screen', () => {
    expect(breedLabel(collie, 'Rough Collie', 'ko')).toBe('콜리')
    expect(breedLabel(collie, 'Rough Collie', 'en')).toBe('Rough Collie')
    expect(breedLabel(collie, '러프 콜리', 'ko')).toBe('러프 콜리')
  })
  it('compact drops the parenthetical, keeping it when it is an alias', () => {
    expect(breedLabel(dsh, '코리안숏헤어', 'en', { compact: true })).toBe('Korean Shorthair')
    expect(breedLabel(collie, null, 'en', { compact: true })).toBe('Collie')
    expect(breedLabel(dsh, null, 'en')).toBe('Domestic Shorthair (Korean Shorthair)')
  })
})

describe('handout: condition signs already in the emergency box are not repeated', () => {
  it('Nabi: "Vomiting" is not listed under kidney disease when it is under Call us', () => {
    const input = CASE_BY_ID.nabi.input
    const h = buildHandout(input, analyze(input))
    const ckd = h.conditions.find((c) => c.id === 'ckd')
    expect(h.emergency.some((s) => s.en === 'Vomiting')).toBe(true)
    expect(ckd.watch.some((s) => s.en === 'Vomiting')).toBe(false)
    for (const c of h.conditions) {
      for (const w of c.watch) expect(h.emergency.some((e) => e.en === w.en)).toBe(false)
    }
  })
})
