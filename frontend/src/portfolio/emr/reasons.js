/**
 * Copy for the adapter's confirm reasons, visit reasons and row notes
 * (EMR popup spec §4.3), the card category labels (§3.7.2) and the row-badge
 * words (§3.7.3). Clinical text always comes from the engine; these strings
 * describe only what the adapter could not read. No em dash anywhere.
 */

const T = (en, ko) => ({ en, ko })

/** Row-level confirm reasons that mean "no reference dose" rather than "needs input". */
export const NO_REFERENCE_REASONS = ['protocol_none', 'protocol_repeat_none', 'route_no_reference']

/** Map an EMR step value to its display (¼, ½, 1). */
const stepLabel = (step) => (step === 0.25 ? '¼' : step === 0.5 ? '½' : String(step ?? 1))

export const ROW_REASON_TEXT = {
  unit_count_liquid: () => T('Needs input: enter liquids in mL', '확인 필요: 액상 제품은 mL로 입력하십시오'),
  unit_needs_record: () => T('Needs input: no amount per sachet/ampoule/drop', '확인 필요: 포·앰플·방울당 함량 기록이 없습니다'),
  unit_unknown: () => T('Needs input: unit not recognised', '확인 필요: 단위를 인식할 수 없습니다'),
  freq_missing: () => T('Needs input: frequency missing', '확인 필요: 횟수 미입력'),
  freq_unmapped: () => T('Needs input: enter the schedule (e.g. every other day)', '확인 필요: 용법을 입력하십시오 (예: 격일, 월1회)'),
  freq_conflict: () => T('Needs input: schedule and times per day differ (checked at the higher)', '확인 필요: 용법과 횟수가 다릅니다 (높은 횟수로 검토)'),
  route_no_reference: () => T('No reference for this route', '참고 용량 없음: 이 경로의 참고 용량이 없습니다'),
  route_missing: () => T('Needs input: route missing', '확인 필요: 경로 미입력'),
  route_unrecognised: () => T('Needs input: route not recognised (use PO, SC, IV, IM)', '확인 필요: 경로를 인식할 수 없습니다 (PO, SC, IV, IM으로 입력)'),
  sig_unrecognised: () => T('Needs input: schedule (용법) not recognised, checked by times per day', '확인 필요: 용법을 인식할 수 없어 횟수로 검토했습니다'),
  dose_zero: () => T('Needs input: amount is 0', '확인 필요: 용량이 0입니다'),
  protocol_route: () => T('Needs input: no reference for this route', '확인 필요: 이 경로의 참고 용량이 없습니다'),
  protocol_none: () => T('No reference dose: dose not checked', '참고 용량 없음: 용량 검토 안 함'),
  protocol_repeat_none: () => T('No reference for repeated dosing', '참고 용량 없음: 반복 투여 참고 용량이 없습니다'),
  protocol_indication: () => T('Needs input: choose the indication', '확인 필요: 적응증 선택'),
  split_not_allowed: ({ step } = {}) => ((step ?? 1) >= 1
    ? T('Needs input: this product cannot be split', '확인 필요: 이 제형은 분할할 수 없습니다')
    : T(`Needs input: this product splits only in ${stepLabel(step)} units`, `확인 필요: 이 제형은 ${stepLabel(step)} 단위로만 나눌 수 있습니다`)),
  unmapped: () => T('Not reviewed: not in the formulary', '검토 안 함: 처방집에 없는 제품'),
}

export const ROW_NOTE_TEXT = {
  calc_mismatch: () => T('EMR calculated amount differs: check weight and unit', 'EMR 계산량 불일치: 체중·단위를 확인하십시오'),
  prn_max_per_day: ({ n } = {}) => T(`As needed: checked at ${n} times a day at most`, `필요시: 1일 최대 ${n}회로 검토했습니다`),
  powder: () => T('Powder: tablet splitting, rounding and crushing were not checked', '가루 조제: 정제 분할·반올림과 분쇄 가능 여부는 검토하지 않았습니다'),
  'EU/UK 라벨 기준(자동)': () => T('EU/UK label (automatic)', 'EU/UK 라벨 기준(자동)'),
}

/** Stable ids for row notes whose adapter key is display text. */
export const ROW_NOTE_ID = { 'EU/UK 라벨 기준(자동)': 'same_indication' }

export const VISIT_NOTE_TEXT = {
  weight_stale: ({ days } = {}) => T(`Weight measured ${days} days ago`, `체중 ${days}일 전 측정`),
  breed_unresolved: () => T('Breed not recognised: MDR1 risk treated as unknown', '품종을 인식하지 못했습니다: MDR1 위험은 미상으로 검토합니다'),
}

const LAB_NAME = { creatinine: T('Creatinine', '크레아티닌'), alt: T('ALT', 'ALT') }

/** Visit reasons (incomplete, shown in the 확인 필요 group). `key` may carry a ':<code>' suffix. */
export function visitReasonText(key, detail = {}) {
  const [base, code] = key.split(':')
  if (base === 'allergy_free_text') return T('Free-text allergy not checked: enter it as a code', '자유 입력 알레르기를 검토하지 못했습니다: 코드로 입력하십시오')
  if (base === 'allergy_text_recognised') return T(`Allergy "${detail.text ?? ''}" recognised from free text: confirm`, `알레르기 "${detail.text ?? ''}": 자유 입력에서 인식, 확인 필요`)
  if (base === 'dx_unmapped') return T(`Diagnosis ${code} is unmapped and was not checked`, `진단 ${code}: 분류되지 않아 검토하지 못했습니다`)
  if (base === 'dx_text_recognised') return T(`Diagnosis "${detail.display ?? code}" recognised from text: confirm`, `진단 "${detail.display ?? code}": 자유 입력에서 인식, 확인 필요`)
  if (base.startsWith('lab_stale_')) {
    const lab = LAB_NAME[base.slice('lab_stale_'.length)] || T(base.slice(10), base.slice(10))
    return T(`${lab.en} is ${detail.days} days old: confirm a current value`, `${lab.ko} ${detail.days}일 전 검사: 최신 결과를 확인하십시오`)
  }
  if (base.startsWith('lab_undated_')) {
    const lab = LAB_NAME[base.slice('lab_undated_'.length)] || T(base.slice(12), base.slice(12))
    return T(`${lab.en} has no test date: confirm it is current`, `${lab.ko} 검사일 없음: 최신 결과인지 확인하십시오`)
  }
  if (base === 'weight_implausible') return T(`Weight ${detail.kg ?? ''} kg is outside the plausible range: confirm`, `체중 ${detail.kg ?? ''} kg: 입력 오류일 수 있습니다. 확인하십시오`)
  if (base === 'age_under_1y') return T('Under one year: age-related cautions were not checked', '1세 미만: 연령 관련 금기·주의는 검토하지 않았습니다')
  if (base === 'breed_unresolved') return VISIT_NOTE_TEXT.breed_unresolved()
  if (base === 'species_unsupported') return T('Unsupported species: only dogs and cats are reviewed', '지원하지 않는 종: 개·고양이만 검토합니다')
  if (base === 'species_missing') return T('Species missing: enter it in the patient record', '종 미입력: 환자 정보에서 종을 입력하십시오')
  return T(key, key)
}

/** The chip a visit reason shows and the chart field its `fix-chart` event names. */
export function visitReasonChip(key) {
  const base = key.split(':')[0]
  if (base === 'allergy_text_recognised') return { chip: 'recognised', field: 'allergies' }
  if (base === 'allergy_free_text') return { chip: 'fix', field: 'allergies' }
  if (base === 'dx_text_recognised') return { chip: 'recognised', field: 'diagnoses' }
  if (base === 'dx_unmapped') return { chip: 'fix', field: 'diagnoses' }
  if (base.startsWith('lab_stale_') || base.startsWith('lab_undated_')) return { chip: 'stale', field: 'labs' }
  if (base === 'weight_implausible') return { chip: 'fix', field: 'weight' }
  if (base === 'breed_unresolved') return { chip: 'fix', field: 'breed' }
  if (base === 'species_missing' || base === 'species_unsupported') return { chip: 'fix', field: 'species' }
  return { chip: null, field: null }
}

/** Card category label by ruleId (§3.7.2). */
export const CATEGORY = {
  SPECIES_HARDSTOP: T('Species', '종 금기'),
  MDR1_PGP_ML: T('Breed/genotype', '품종·유전자'),
  CYP3A_INHIBITION: T('Interaction', '병용 주의'),
  CYP_INDUCTION: T('Interaction', '병용 주의'),
  GASTRIC_PH_AZOLE: T('Interaction', '병용 주의'),
  NSAID_CORTICOSTEROID: T('Interaction', '병용 주의'),
  SEROTONERGIC: T('Interaction', '병용 주의'),
  NSAID_DUPLICATE: T('Duplication', '중복'),
  IMMUNOSUPPRESSION_ADDITIVE: T('Duplication', '중복'),
  DUPLICATE_INGREDIENT: T('Duplication', '중복'),
  ACID_SUPPRESSANT_DUPLICATE: T('Duplication', '중복'),
  DRUG_CONDITION: T('Condition', '질환 금기·주의'),
  NSAID_RENAL: T('Kidney', '신기능 주의'),
  RENAL_ADJUST: T('Kidney', '신기능 주의'),
  METHIMAZOLE_CKD: T('Kidney', '신기능 주의'),
  ALLERGY_CLASS: T('Allergy', '알레르기'),
  DOSE_RANGE: T('Dose', '용량 주의'),
  ENRO_FELINE_RETINA: T('Dose', '용량 주의'),
}

export const DOSE_RULES = ['DOSE_RANGE', 'ENRO_FELINE_RETINA']

export const SEVERITY_LABEL = {
  contraindicated: T('Contraindicated', '금기'),
  major: T('Major', '중대'),
  moderate: T('Moderate', '주의'),
  minor: T('Minor', '경미'),
}

/** Words a row badge can show (§3.7.3, §3.6). */
export const BADGE_TEXT = {
  related: T('Related', '관련'),
  confirm: T('Needs input', '확인 필요'),
  noref: T('No reference dose', '참고 용량 없음'),
  unmapped: T('Not reviewed', '검토 안 함'),
  // §3.6 shows a dash here; an en dash keeps the widget free of em dashes (§8.4).
  none: T('–', '–'),
  unsupported: T('–', '–'),
  inClinic: T('In clinic', '원내'),
}

export const pick = (t, locale) => (t == null ? '' : typeof t === 'string' ? t : t[locale] ?? t.ko ?? t.en ?? '')
