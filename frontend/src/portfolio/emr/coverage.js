/**
 * Per-visit coverage strip (EMR popup spec §6.2): each item is checked, partial
 * (with a reason) or not checked. Computed from the adapter check, never fixed.
 */

import { CONDITION_BY_ID } from '../knowledge/conditions.js'

const T = (en, ko) => ({ en, ko })

/** Strip items, in display order. */
export const COVERAGE_ITEMS = ['species', 'breed', 'interaction', 'duplication', 'condition', 'kidney', 'allergy', 'dose']
export const NOT_CHECKED_ITEMS = ['age', 'pregnancy', 'duration', 'otherClinics', 'thisClinicHistory']

export const COVERAGE_LABELS = {
  species: T('species', '종'),
  breed: T('breed', '품종'),
  interaction: T('interactions', '병용'),
  duplication: T('duplication', '중복'),
  condition: T('conditions', '질환'),
  kidney: T('kidney', '신기능'),
  allergy: T('allergy', '알레르기'),
  dose: T('dose', '용량'),
  age: T('age', '연령'),
  pregnancy: T('pregnancy/lactation', '임신/수유'),
  duration: T('duration', '투여기간'),
  otherClinics: T("other clinics' prescriptions", '타 병원 처방'),
  thisClinicHistory: T("this clinic's earlier prescriptions", '본원 이전 처방'),
  crushing: T('crushing', '분쇄 가능 여부'),
}

/**
 * Which strip item each rule's findings belong to. A test asserts every rule in
 * RULES has an entry (ADMIN_NOTES: null, notes only), so a rule added without
 * updating the strip fails.
 */
export const RULE_COVERAGE = {
  MDR1_PGP_ML: 'breed',
  SPECIES_HARDSTOP: 'species',
  ENRO_FELINE_RETINA: 'dose',
  CYP3A_INHIBITION: 'interaction',
  CYP_INDUCTION: 'interaction',
  GASTRIC_PH_AZOLE: 'interaction',
  NSAID_CORTICOSTEROID: 'interaction',
  SEROTONERGIC: 'interaction',
  NSAID_DUPLICATE: 'duplication',
  DUPLICATE_INGREDIENT: 'duplication',
  ACID_SUPPRESSANT_DUPLICATE: 'duplication',
  IMMUNOSUPPRESSION_ADDITIVE: 'duplication',
  NSAID_RENAL: 'kidney',
  RENAL_ADJUST: 'kidney',
  METHIMAZOLE_CKD: 'kidney',
  DRUG_CONDITION: 'condition',
  ALLERGY_CLASS: 'allergy',
  DOSE_RANGE: 'dose',
  ADMIN_NOTES: null,
}

/** Every engine rule layer (RULE_LAYERS) → the strip items it can fill. */
export const LAYER_COVERAGE = {
  species_breed: ['species', 'breed', 'dose'], // ENRO_FELINE_RETINA is a species dose ceiling
  pk: ['interaction'],
  pd: ['interaction', 'duplication'],
  drug_disease: ['condition', 'kidney'],
  patient: ['allergy'],
  dose: ['dose'],
  notes: [],
}

/**
 * computeCoverage(checkResult) → { checked, partial: [{ item, reason, label }], notChecked, labels }
 * `labels[item]` is the per-visit wording ({ ko, en }), e.g. age → "연령 (1세 미만)".
 */
export function computeCoverage(c) {
  const a = c.adapter
  const r = c.result
  const partial = []
  const add = (item, reason, label) => partial.push({ item, reason, label })
  const visit = c.visitReasons || []
  if (a.adapterNotes.includes('breed_unresolved')) add('breed', 'breed_unresolved', T('breed not recognised', '품종 미인식'))
  const dx = visit.filter((k) => k.startsWith('dx_unmapped:') || k.startsWith('dx_text_recognised:'))
  if (dx.length) add('condition', dx[0].split(':')[0], dx[0].startsWith('dx_unmapped') ? T('unmapped diagnosis', '미분류 진단') : T('diagnosis from free text', '자유 입력 진단'))
  const ckd = a.caseInput.conditions.some((id) => (CONDITION_BY_ID[id]?.kind || []).includes('ckd'))
  if (visit.includes('lab_stale_creatinine')) {
    const d = a.visitDetail.find((x) => x.key === 'lab_stale_creatinine')
    add('kidney', 'lab_stale_creatinine', T(`creatinine ${d?.days ?? ''} days old`, `크레아티닌 ${d?.days ?? ''}일 전 검사`))
  } else if (visit.includes('lab_undated_creatinine')) {
    add('kidney', 'lab_undated_creatinine', T('creatinine undated', '크레아티닌 검사일 없음'))
  } else if (r.trace.factorsMissing.includes('labs.creatinine') && !ckd) {
    add('kidney', 'creatinine_missing', T('no creatinine', '크레아티닌 없음'))
  }
  const allergy = visit.find((k) => k === 'allergy_free_text' || k === 'allergy_text_recognised')
  if (allergy) add('allergy', allergy, allergy === 'allergy_free_text' ? T('free-text entry', '자유 입력') : T('recognised from free text', '자유 입력에서 인식'))
  // Dose: rows with a confirm reason, or a dose_* validation note.
  const excluded = new Set(Object.entries(a.rows).filter(([, v]) => v.confirm.length).map(([k]) => k))
  r.notes.filter((n) => n.category === 'validation' && /^dose_/.test(n.id)).forEach((n) => {
    for (const [rowId, v] of Object.entries(a.rows)) if (n.drugIds.includes(v.drugId)) excluded.add(rowId)
  })
  if (excluded.size) add('dose', 'rows_excluded', T(`${excluded.size} row${excluded.size > 1 ? 's' : ''} excluded`, `${excluded.size}행 제외`))
  else if (visit.includes('weight_implausible')) add('dose', 'weight_implausible', T('weight to confirm', '체중 확인 필요'))

  const partialItems = new Set(partial.map((p) => p.item))
  const checked = COVERAGE_ITEMS.filter((i) => !partialItems.has(i))
  const notChecked = [...NOT_CHECKED_ITEMS]
  const powder = Object.values(a.rows).some((v) => v.powder)
  if (powder) notChecked.push('crushing')
  const labels = { ...COVERAGE_LABELS }
  if (visit.includes('age_under_1y')) labels.age = T('age (under 1 year)', '연령 (1세 미만)')
  return { checked, partial, notChecked, labels }
}
