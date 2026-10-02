import { describe, it, expect } from 'vitest'
import { analyze, normalizeCase } from '../engine.js'
import { CASES } from '../../cases/cases.js'

function sameSet(a, b) {
  return [...a].sort().join('|') === [...b].sort().join('|')
}

describe('golden cases', () => {
  it('there are exactly the five specified cases', () => {
    expect(CASES.map((c) => c.id)).toEqual(['choco', 'kongyi', 'nabi', 'mochi', 'daebak'])
  })

  for (const c of CASES) {
    describe(c.id, () => {
      const result = analyze(c.input)

      it(`verdict is ${c.expect.verdict}`, () => {
        expect(result.verdict.level).toBe(c.expect.verdict)
      })

      it('produces exactly the expected findings (plus only allowed extras)', () => {
        const unmatched = [...result.findings]
        for (const e of c.expect.findings) {
          const i = unmatched.findIndex((f) => f.ruleId === e.ruleId && f.severity === e.severity && (!e.drugIds || sameSet(f.drugIds, e.drugIds)))
          expect(i, `missing ${e.ruleId}/${e.severity}/${(e.drugIds || []).join('+')}`).toBeGreaterThanOrEqual(0)
          const f = unmatched.splice(i, 1)[0]
          if (e.factorKinds) expect(f.factors.map((x) => x.kind)).toEqual(expect.arrayContaining(e.factorKinds))
          for (const alt of e.alternativesInclude || []) {
            expect(f.alternatives.some((a) => a.en.includes(alt)), `alternative “${alt}”`).toBe(true)
          }
        }
        const extra = unmatched.filter((f) => !(c.expect.allowAlso || []).includes(f.ruleId))
        expect(extra.map((f) => `${f.ruleId}/${f.severity}`)).toEqual([])
      })

      it('emits the expected notes', () => {
        for (const id of c.expect.notesInclude || []) {
          expect(result.notes.some((n) => n.id === id), id).toBe(true)
        }
      })

      it('computes the expected dose amounts', () => {
        for (const d of c.expect.doses || []) {
          const row = result.doses.find((r) => r.drugId === d.drugId)
          expect(row, d.drugId).toBeTruthy()
          expect(row.perDoseMg).toBeCloseTo(d.perDoseMg, 6)
          if (d.administrationEn) expect(row.administration.en).toBe(d.administrationEn)
        }
      })

      it('has complete bilingual case copy', () => {
        for (const k of ['name', 'title', 'signalment', 'problems', 'question', 'shouldCatch']) {
          expect(c[k].en, k).toBeTruthy()
          expect(c[k].ko, k).toBeTruthy()
        }
      })
    })
  }

  it('Choco: ivermectin dose row is 7.2 mg; the MDR1 card names the P-gp inhibitor and suggests isoxazoline + ABCB1 genotyping', () => {
    const r = analyze(CASES[0].input)
    expect(r.doses[0]).toMatchObject({ drugId: 'ivermectin', perDose: { value: 7.2, unit: 'mg' } })
    const f = r.findings[0]
    expect(f.factors.find((x) => x.kind === 'drug').id).toBe('ketoconazole')
    expect(f.sources).toEqual(expect.arrayContaining(['mueller2020', 'mealey2001', 'gramer2010', 'schrickx2014']))
  })

  it('Nabi: 코리안숏헤어 resolves to Domestic Shorthair and per-cat doses are not multiplied by weight', () => {
    const c = CASES.find((x) => x.id === 'nabi')
    expect(normalizeCase(c.input).breedId).toBe(c.expect.breedResolvesTo)
    const r = analyze(c.input)
    const mmi = r.doses.find((d) => d.drugId === 'methimazole')
    expect(mmi.perDose).toEqual({ value: 2.5, unit: 'mg' })
    expect(mmi.working.en).toContain('not multiplied by weight')
    expect(r.doses.find((d) => d.drugId === 'amlodipine').perDose).toEqual({ value: 0.625, unit: 'mg' })
    expect(r.findings.filter((f) => f.drugIds.length > 1)).toEqual([])
  })

  it('Kongyi: induction direction is stated correctly (levels fall)', () => {
    const r = analyze(CASES.find((x) => x.id === 'kongyi').input)
    const csa = r.findings.find((f) => f.ruleId === 'CYP_INDUCTION' && f.drugIds.includes('ciclosporin'))
    expect(csa.title.en).toMatch(/lowers ciclosporin/)
    expect(csa.why[0].en).toMatch(/levels fall/)
  })

  it('Daebak: negative control has no findings and a non-reassuring "none" headline', () => {
    const r = analyze(CASES.find((x) => x.id === 'daebak').input)
    expect(r.findings).toEqual([])
    expect(r.verdict.counts).toMatchObject({ contraindicated: 0, major: 0, moderate: 0, minor: 0, doseProblems: 0 })
  })

  it('every case runs fast enough for live recompute', () => {
    for (const c of CASES) expect(analyze(c.input).trace.ms).toBeLessThan(250)
  })
})
