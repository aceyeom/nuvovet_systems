/**
 * Coded override reasons (EMR popup spec §3.9).
 *
 * Lineage: HIRA's 11 codes are overlapping-prescription (중복처방) codes; HIRA
 * takes free text for combination, age and pregnancy alerts. J1–J6 are one
 * hospital study's proposal (Jang et al. 2016, doi:10.4258/hir.2016.22.1.39),
 * used here as a design basis only. The NV codes are this prototype's own; they
 * are not HIRA codes.
 */

import { checkComment } from './commentCheck.js'

export const OVERRIDE_SYSTEM = 'https://nuvovet.example/CodeSystem/dur-override'

const INTERACTION_RULES = ['CYP3A_INHIBITION', 'CYP_INDUCTION', 'GASTRIC_PH_AZOLE', 'NSAID_CORTICOSTEROID', 'SEROTONERGIC', 'MDR1_PGP_ML']
const notHardStop = (r) => r !== 'SPECIES_HARDSTOP'

/** `allowed(ruleId)`; `overrides: false` marks NV-DATA (it emits fix-chart instead). */
export const OVERRIDE_REASONS = [
  { code: 'NV-J2', display: { ko: '임상적 판단: 이점이 위험보다 큼 (모니터링 계획 기록)', en: 'Clinical judgement: benefit outweighs risk (monitoring plan recorded)' }, basis: 'Jang J2', allowed: notHardStop },
  { code: 'NV-INT', display: { ko: '의도된 병용, 혈중농도·반응 모니터링 예정', en: 'Intended combination; levels/response will be monitored' }, basis: 'Jang J2', allowed: (r) => INTERACTION_RULES.includes(r) },
  { code: 'NV-J1', display: { ko: '단회·간헐·필요시(PRN) 투여', en: 'Single, intermittent or as-needed dose' }, basis: 'Jang J1 (HIRA P, G)', allowed: (r) => r !== 'SPECIES_HARDSTOP' && r !== 'ALLERGY_CLASS' },
  { code: 'NV-SEQ', display: { ko: '순차 투여 (같은 날 겹치지 않음)', en: 'Sequential, not on the same day' }, basis: 'HIRA F; Jang J4', allowed: (r) => r === 'DUPLICATE_INGREDIENT' || r === 'NSAID_DUPLICATE' },
  { code: 'NV-J5', display: { ko: '수술·검사 전후 투여', en: 'Peri-operative or peri-procedural use' }, basis: 'Jang J5', allowed: notHardStop },
  { code: 'NV-J6', display: { ko: '응급 상황', en: 'Emergency' }, basis: 'Jang J6', allowed: notHardStop },
  { code: 'NV-ALG-INT', display: { ko: '알레르기가 아닌 불내성(부작용) 이력', en: 'History is an intolerance, not an allergy' }, basis: 'prototype', allowed: (r) => r === 'ALLERGY_CLASS' },
  { code: 'NV-ALG-TOL', display: { ko: '이후 같은 계열을 문제없이 투여한 기록 있음', en: 'The same class was given since without reaction' }, basis: 'prototype', allowed: (r) => r === 'ALLERGY_CLASS' },
  { code: 'NV-DATA', display: { ko: '환자 정보가 실제와 다름: 차트 수정', en: 'Patient data is wrong: fix the chart' }, basis: null, allowed: () => true, overrides: false },
  { code: 'NV-OTH', display: { ko: '기타 (직접 입력)', en: 'Other (free text)' }, basis: 'HIRA free text', allowed: () => true, commentRequired: true },
]

export const REASON_BY_CODE = Object.fromEntries(OVERRIDE_REASONS.map((r) => [r.code, r]))

/** Codings allowed for a card whose finding came from these rules (allowed for every rule of the card). */
export function reasonsFor(ruleIds, locale = 'ko') {
  const ids = (Array.isArray(ruleIds) ? ruleIds : [ruleIds]).filter(Boolean)
  return OVERRIDE_REASONS
    .filter((r) => ids.every((id) => r.allowed(id)))
    .map((r) => ({ system: OVERRIDE_SYSTEM, code: r.code, display: r.display[locale] ?? r.display.ko }))
}

/** The chart field NV-DATA asks the host to fix, by the card's primary rule. */
export const FIX_FIELD_BY_RULE = {
  MDR1_PGP_ML: 'mdr1',
  SPECIES_HARDSTOP: 'species',
  ALLERGY_CLASS: 'allergies',
  DRUG_CONDITION: 'diagnoses',
  NSAID_RENAL: 'labs',
  RENAL_ADJUST: 'labs',
  METHIMAZOLE_CKD: 'labs',
  DOSE_RANGE: 'weight',
  ENRO_FELINE_RETINA: 'weight',
}

/** Which inputs a severity requires to proceed past the gate (§3.6, §3.9). */
export const REQUIREMENTS = {
  contraindicated: { reason: true, comment: 'always', owner: 'required' },
  major: { reason: true, comment: 'other', owner: 'optional' },
  moderate: { reason: false, comment: 'never', owner: 'none' },
  minor: { reason: false, comment: 'never', owner: 'none' },
}

/**
 * Validate an override draft { reasonCode, comment, ownerInformed } for a card.
 * Returns { valid, errors: { reason?, comment?, owner? }, fixChart? } where errors are reason keys.
 * NV-DATA is never a valid override: `fixChart` names the field to fix instead.
 */
export function validateOverride(card, draft = {}) {
  const ext = card.extension || card
  const severity = ext.severity
  const req = REQUIREMENTS[severity] || REQUIREMENTS.minor
  const errors = {}
  const allowed = (card.overrideReasons || reasonsFor(ext.ruleIds)).map((c) => c.code)
  const code = draft.reasonCode || null
  if (code === 'NV-DATA') return { valid: false, errors: {}, fixChart: ext.fixField || FIX_FIELD_BY_RULE[ext.ruleIds?.[0]] || 'species' }
  if (req.reason && !code) errors.reason = 'reason_required'
  if (code && !allowed.includes(code)) errors.reason = 'reason_not_allowed'
  const needsComment = req.comment === 'always' || (code && REASON_BY_CODE[code]?.commentRequired && req.comment !== 'never') || (code === 'NV-OTH')
  if (needsComment) {
    const c = checkComment(draft.comment)
    if (!c.ok) errors.comment = 'comment_invalid'
  }
  if (req.owner === 'required' && !draft.ownerInformed) errors.owner = 'owner_required'
  return { valid: Object.keys(errors).length === 0, errors }
}
