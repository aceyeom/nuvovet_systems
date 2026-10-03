/**
 * EMR popup spec §3.9: the free-text comment check (the table, exactly), the coded
 * override reasons and what each severity requires.
 */
import { describe, it, expect } from 'vitest'
import { checkComment, COMMENT_MESSAGE } from '../commentCheck.js'
import { OVERRIDE_REASONS, reasonsFor, validateOverride, OVERRIDE_SYSTEM } from '../overrideReasons.js'
import { RULES } from '../../engine/index.js'

describe('comment check (§3.9 table)', () => {
  it.each([
    ['ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ', [2, 3]],
    ['aaaaaaaaaa', [2]],
    ['a a a a a a a a b', [2]],
    ['ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊ', [3]],
    ['1234567890', [4]],
    ['감량 병용함', [1]],
  ])('%s → rejected %j', (text, rules) => {
    const r = checkComment(text)
    expect(r.ok).toBe(false)
    expect(r.rules).toEqual(rules)
    expect(r.message).toBe(COMMENT_MESSAGE)
  })
  it('"케토코나졸 감량 병용, 2주 후 재검" → accepted', () => {
    expect(checkComment('케토코나졸 감량 병용, 2주 후 재검')).toEqual({ ok: true, rules: [], message: null })
  })
  it('empty and whitespace comments are rejected', () => {
    expect(checkComment('').ok).toBe(false)
    expect(checkComment('        ').ok).toBe(false)
    expect(checkComment(null).ok).toBe(false)
  })
  it('English comments of real words pass', () => {
    expect(checkComment('reduced dose, recheck levels in 2 weeks').ok).toBe(true)
  })
  it('the messages match §3.9', () => {
    expect(COMMENT_MESSAGE.ko).toBe('구체적인 사유를 8자 이상 입력하십시오 (예: 감량 병용, 2주 후 혈중농도 측정).')
    expect(COMMENT_MESSAGE.en).toBe('Enter a specific reason of at least 8 characters (e.g. reduced dose, recheck levels in 2 weeks).')
  })
})

describe('override reasons (§3.9 code table)', () => {
  const codes = (ruleId) => reasonsFor([ruleId]).map((r) => r.code)
  it('the ten codes, in order, with the placeholder system', () => {
    expect(OVERRIDE_REASONS.map((r) => r.code)).toEqual(['NV-J2', 'NV-INT', 'NV-J1', 'NV-SEQ', 'NV-J5', 'NV-J6', 'NV-ALG-INT', 'NV-ALG-TOL', 'NV-DATA', 'NV-OTH'])
    expect(reasonsFor(['MDR1_PGP_ML'])[0].system).toBe(OVERRIDE_SYSTEM)
  })
  it('species hard stops: only NV-DATA and NV-OTH', () => expect(codes('SPECIES_HARDSTOP')).toEqual(['NV-DATA', 'NV-OTH']))
  it('allergy: no NV-J1; allergy-only reasons present', () => expect(codes('ALLERGY_CLASS')).toEqual(['NV-J2', 'NV-J5', 'NV-J6', 'NV-ALG-INT', 'NV-ALG-TOL', 'NV-DATA', 'NV-OTH']))
  it('interactions get NV-INT; duplicates get NV-SEQ', () => {
    for (const r of ['CYP3A_INHIBITION', 'CYP_INDUCTION', 'GASTRIC_PH_AZOLE', 'NSAID_CORTICOSTEROID', 'SEROTONERGIC', 'MDR1_PGP_ML']) expect(codes(r)).toContain('NV-INT')
    expect(codes('DOSE_RANGE')).not.toContain('NV-INT')
    expect(codes('DUPLICATE_INGREDIENT')).toContain('NV-SEQ')
    expect(codes('NSAID_DUPLICATE')).toContain('NV-SEQ')
    expect(codes('NSAID_CORTICOSTEROID')).not.toContain('NV-SEQ')
  })
  it('every rule offers NV-DATA and NV-OTH; "genotype confirmed" and "drug stopped" are not offered', () => {
    for (const r of RULES) {
      expect(codes(r.id)).toContain('NV-DATA')
      expect(codes(r.id)).toContain('NV-OTH')
    }
    expect(OVERRIDE_REASONS.some((r) => /NV-GEN|NV-J4/.test(r.code))).toBe(false)
  })
  it('English displays exist for every reason', () => {
    expect(reasonsFor(['MDR1_PGP_ML'], 'en').find((r) => r.code === 'NV-J2').display).toBe('Clinical judgement: benefit outweighs risk (monitoring plan recorded)')
  })
})

describe('what each severity requires (§3.9)', () => {
  const card = (severity, ruleIds = ['MDR1_PGP_ML']) => ({ extension: { severity, ruleIds }, overrideReasons: reasonsFor(ruleIds) })
  const ok = '케토코나졸 감량 병용, 2주 후 재검'
  it('contraindicated: coded reason + valid comment + owner informed', () => {
    const c = card('contraindicated')
    expect(validateOverride(c, {}).errors).toEqual({ reason: 'reason_required', comment: 'comment_invalid', owner: 'owner_required' })
    expect(validateOverride(c, { reasonCode: 'NV-J2', comment: ok }).errors).toEqual({ owner: 'owner_required' })
    expect(validateOverride(c, { reasonCode: 'NV-J2', comment: 'ㅋㅋㅋㅋㅋㅋㅋㅋ', ownerInformed: true }).errors).toEqual({ comment: 'comment_invalid' })
    expect(validateOverride(c, { reasonCode: 'NV-J2', comment: ok, ownerInformed: true })).toEqual({ valid: true, errors: {} })
  })
  it('major: a reason alone is enough; owner optional; NV-OTH needs a valid comment', () => {
    const c = card('major', ['NSAID_CORTICOSTEROID'])
    expect(validateOverride(c, {}).valid).toBe(false)
    expect(validateOverride(c, { reasonCode: 'NV-INT' }).valid).toBe(true)
    expect(validateOverride(c, { reasonCode: 'NV-OTH' }).errors).toEqual({ comment: 'comment_invalid' })
    expect(validateOverride(c, { reasonCode: 'NV-OTH', comment: ok }).valid).toBe(true)
  })
  it('a reason not allowed for the rule is rejected', () => {
    expect(validateOverride(card('contraindicated', ['SPECIES_HARDSTOP']), { reasonCode: 'NV-J2', comment: ok, ownerInformed: true }).errors).toEqual({ reason: 'reason_not_allowed' })
  })
  it('NV-DATA never overrides: it names the chart field to fix', () => {
    expect(validateOverride({ ...card('contraindicated'), extension: { severity: 'contraindicated', ruleIds: ['MDR1_PGP_ML'], fixField: 'mdr1' } }, { reasonCode: 'NV-DATA' })).toEqual({ valid: false, errors: {}, fixChart: 'mdr1' })
  })
})
