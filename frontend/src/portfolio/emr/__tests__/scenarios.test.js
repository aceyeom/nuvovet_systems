/**
 * EMR popup spec §8.1: all 61 accuracy scenarios (E01–E23 and the revised critique set
 * E24–E53), run through the real adapter and the real engine. Every line of the binding
 * raw output is asserted twice: as the exact printed block, and field by field (verdict,
 * complete + exact incomplete reasons, the ruleId/severity[drugIds] multiset, each dose's
 * perDoseMg/status/ratio/plan/summed total, note ids, each row's protocol, confirm
 * reasons, notes and Tx flag, and the adapter/visit notes).
 */
import { describe, it, expect, vi } from 'vitest'
import { check } from '../adapter.js'
import { SCENARIOS, GATE_SCENARIOS } from '../fixtures.js'
import { buildResponse } from '../cards.js'
import { RAW_OUTPUT } from './binding.js'
import { fmtCheck, fmtFindings, fmtDoses, fmtNotes, fmtRows, splitBlocks, parseRaw } from './format.js'
import * as engine from '../../engine/index.js'

const EXPECTED = splitBlocks(RAW_OUTPUT)
const IDS = Object.keys(SCENARIOS)

/** §8.1 table: verdict, complete, findings and gate, restated as data (cross-checks the raw block). */
const TABLE = {
  E01: ['contraindicated', true, ['MDR1_PGP_ML/contraindicated[ivermectin+ketoconazole]'], 1],
  E02: ['moderate', true, ['CYP_INDUCTION/moderate[phenobarbital+ciclosporin]', 'IMMUNOSUPPRESSION_ADDITIVE/minor[ciclosporin+prednisolone]', 'CYP_INDUCTION/minor[phenobarbital+prednisolone]'], 0],
  E03: ['moderate', true, ['METHIMAZOLE_CKD/moderate[methimazole]'], 0],
  E04: ['contraindicated', false, ['SPECIES_HARDSTOP/contraindicated[permethrin]'], 1],
  E05: ['none', true, [], 0],
  E06: ['moderate', true, ['NSAID_RENAL/moderate[meloxicam+furosemide+benazepril]'], 0],
  E06b: ['moderate', true, ['NSAID_RENAL/moderate[meloxicam+furosemide+benazepril]'], 0],
  E07: ['major', true, ['NSAID_CORTICOSTEROID/major[carprofen+prednisolone]', 'SEROTONERGIC/moderate[tramadol+trazodone]'], 1],
  E07b: ['major', true, ['NSAID_CORTICOSTEROID/major[carprofen+prednisolone]', 'SEROTONERGIC/moderate[tramadol+trazodone]', 'DOSE_RANGE/minor[tramadol]'], 1],
  E08: ['major', true, ['ENRO_FELINE_RETINA/major[enrofloxacin]'], 1],
  E08b: ['major', true, ['ENRO_FELINE_RETINA/major[enrofloxacin]', 'SPECIES_HARDSTOP/major[meloxicam]'], 2],
  E09: ['contraindicated', true, ['DRUG_CONDITION/contraindicated[fluoxetine]'], 1],
  E10: ['major', true, ['ALLERGY_CLASS/major[amoxicillin_clavulanate]'], 1],
  E11: ['contraindicated', true, ['DRUG_CONDITION/contraindicated[phenobarbital]'], 1],
  E12: ['moderate', true, ['GASTRIC_PH_AZOLE/moderate[ketoconazole+omeprazole]'], 0],
  E13: ['major', true, ['NSAID_DUPLICATE/major[carprofen+meloxicam]'], 1],
  E14: ['none', false, [], 0],
  E15: ['none', false, [], 0],
  E16: ['none', false, [], 0],
  E17: ['contraindicated', false, ['MDR1_PGP_ML/contraindicated[ivermectin+ketoconazole]'], 1],
  E18: [null, null, null, 0],
  E19: ['none', true, [], 0],
  E20: ['none', true, [], 0],
  E21: ['none', false, [], 0],
  E22: ['none', true, [], 0],
  E23: ['none', true, [], 0],
  E24: ['none', true, [], 0],
  E25: ['major', true, ['DOSE_RANGE/major[carprofen]'], 1],
  E26: ['moderate', false, ['DUPLICATE_INGREDIENT/moderate[meloxicam]'], 0],
  E27: ['major', false, ['NSAID_DUPLICATE/major[meloxicam+carprofen]'], 1],
  E28: ['moderate', true, ['METHIMAZOLE_CKD/moderate[methimazole]', 'DOSE_RANGE/minor[methimazole]'], 0],
  E29: ['minor', true, ['DOSE_RANGE/minor[phenobarbital]'], 0],
  E30: ['none', false, [], 0],
  E31: ['moderate', false, ['RENAL_ADJUST/moderate[gabapentin]'], 0],
  E32: ['none', false, [], 0],
  E33: ['none', true, [], 0],
  E34: ['none', false, [], 0],
  E35: ['major', false, ['ENRO_FELINE_RETINA/major[enrofloxacin]'], 1],
  E36: ['none', false, [], 0],
  E36b: ['major', true, ['DOSE_RANGE/major[carprofen]'], 1],
  E37: ['none', true, [], 0],
  E38: ['minor', true, ['DOSE_RANGE/minor[carprofen]'], 0],
  E39: ['minor', true, ['DOSE_RANGE/minor[pimobendan]'], 0],
  E40: ['major', false, ['ALLERGY_CLASS/major[amoxicillin_clavulanate]'], 1],
  E40b: ['none', false, [], 0],
  E41: ['none', false, [], 0],
  E41b: ['contraindicated', false, ['DRUG_CONDITION/contraindicated[fluoxetine]'], 1],
  E42: ['moderate', false, ['NSAID_RENAL/moderate[meloxicam]'], 0],
  E42b: ['none', false, [], 0],
  E43: ['moderate', false, ['MDR1_PGP_ML/moderate[ivermectin]'], 0],
  E44: ['minor', true, ['MDR1_PGP_ML/minor[ivermectin]'], 0],
  E45a: ['major', true, ['ENRO_FELINE_RETINA/major[enrofloxacin]'], 1],
  E45b: ['major', true, ['ENRO_FELINE_RETINA/major[enrofloxacin]'], 1],
  E46: ['none', false, [], 0],
  E47: ['none', false, [], 0],
  E48: ['major', true, ['NSAID_RENAL/major[meloxicam]'], 1],
  E49: ['none', false, [], 0],
  E50: ['none', false, [], 0],
  E51: ['moderate', true, ['METHIMAZOLE_CKD/moderate[methimazole]'], 0],
  E52: [null, null, null, 0],
  E53: ['none', false, [], 0],
}

describe('§8.1 scenario set', () => {
  it('has exactly the 61 binding scenarios, in order', () => {
    expect(IDS).toHaveLength(61)
    expect(IDS).toEqual(Object.keys(EXPECTED))
    expect(Object.keys(TABLE)).toEqual(IDS)
  })
})

describe.each(IDS)('%s', (id) => {
  const visit = SCENARIOS[id]
  const c = check(visit)
  const exp = parseRaw(EXPECTED[id])

  it('prints exactly the binding raw output', () => {
    expect(fmtCheck(id, c)).toBe(EXPECTED[id])
  })

  it('matches field by field', () => {
    expect(c.supported).toBe(exp.supported)
    if (!exp.supported) {
      expect(c.reason).toBe(exp.reason)
      return
    }
    expect(c.result.verdict.level).toBe(exp.level)
    expect(c.complete).toBe(exp.complete)
    expect(c.incompleteReasons).toEqual(exp.incompleteReasons)
    expect([...fmtFindings(c.result)].sort()).toEqual([...exp.findings].sort())
    expect(fmtDoses(c.result)).toEqual(exp.doses)
    expect(fmtNotes(c.result)).toEqual(exp.notes)
    expect(fmtRows(c)).toEqual(exp.rows)
    expect([...c.adapter.adapterNotes, ...c.adapter.visitConfirm]).toEqual(exp.adapterNotes)
  })

  it('agrees with the §8.1 table (verdict, complete, findings, gate)', () => {
    const [level, complete, findings, gate] = TABLE[id]
    const res = buildResponse(c, visit)
    if (level == null) {
      expect(c.supported).toBe(false)
      expect(res.cards).toEqual([])
    } else {
      expect(c.result.verdict.level).toBe(level)
      expect(c.complete).toBe(complete)
      expect(fmtFindings(c.result)).toEqual(findings)
    }
    expect(res.cards.filter((k) => k.extension.blocking)).toHaveLength(gate)
  })
})

describe('§8.1 gate expectations', () => {
  it('the gate opens for exactly the listed scenarios', () => {
    const opens = IDS.filter((id) => {
      const v = SCENARIOS[id]
      return buildResponse(check(v), v).cards.some((k) => k.extension.blocking)
    })
    expect(opens).toEqual(GATE_SCENARIOS)
  })
})

describe('unsupported species never reach the engine (§3.6, L4)', () => {
  it.each([['E18', 'species_unsupported'], ['E52', 'species_missing']])('%s → %s; analyze is not called', async (id, reason) => {
    vi.resetModules()
    const analyze = vi.fn(engine.analyze)
    vi.doMock('../../engine/index.js', async (orig) => ({ ...(await orig()), analyze }))
    const { check: checkMocked } = await import('../adapter.js')
    const c = checkMocked(SCENARIOS[id])
    expect(c).toEqual({ supported: false, reason })
    expect(analyze).not.toHaveBeenCalled()
    // The spy is live: a supported visit does call it.
    checkMocked(SCENARIOS.E05)
    expect(analyze).toHaveBeenCalledTimes(1)
    vi.doUnmock('../../engine/index.js')
    vi.resetModules()
  })
})
