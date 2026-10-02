export const fmtKRW = (n) => '₩' + Math.round(n || 0).toLocaleString('en-US');
export const fmtKRWShort = (n) => {
  const v = n || 0;
  if (v >= 1e8) return '₩' + (v / 1e8).toFixed(1) + '억';
  if (v >= 1e4) return '₩' + Math.round(v / 1e4).toLocaleString('en-US') + '만';
  return '₩' + v.toLocaleString('en-US');
};
export const fmtPct = (r, digits = 1) => ((r || 0) * 100).toFixed(digits) + '%';

export const DECISION = {
  auto_approve: { ko: '자동 승인', en: 'Auto-approve', badge: 'badge-ok', dot: 'dot-ok' },
  review: { ko: '심사 필요', en: 'Review', badge: 'badge-warning', dot: 'dot-warning' },
  deny_recommended: { ko: '지급 거절 권고', en: 'Deny recommended', badge: 'badge-critical', dot: 'dot-critical' },
};

export const CATEGORY = {
  coverage: '보장', clinical: '임상', pricing: '가격', integrity: '무결성', data: '데이터',
};

// Human-readable names for rule ids (prefix match for species/combo families).
const RULES = [
  ['coverage.line_ineligible', '비보장 항목 제외'],
  ['coverage.diagnosis_excluded', '보장 제외 진단'],
  ['coverage.before_policy_start', '보험 개시 전 진료'],
  ['coverage.policy_terms_check', '상품 조건 확인'],
  ['clinical.procedure_not_indicated', '진단-검사 부적합'],
  ['clinical.undisclosed_chronic_condition', '미신고 만성질환 신호'],
  ['clinical.drug_diagnosis_mismatch', '진단-처방 불일치'],
  ['clinical.dose_above_reference', '참고 용량 초과'],
  ['clinical.species.', '종 특이 안전성'],
  ['clinical.combo.', '병용 위험'],
  ['pricing.regional_outlier', '지역 대비 고가'],
  ['pricing.above_posted_fee', '게시 진료비 초과'],
  ['pricing.quantity_implausible', '비정상 수량'],
  ['integrity.duplicate_claim', '중복 청구'],
  ['integrity.species_mismatch_item', '종 불일치 항목'],
  ['integrity.species_mismatch_diagnosis', '종 불일치 진단'],
  ['integrity.breed_species_mismatch', '품종-종 불일치'],
  ['integrity.weight_implausible', '체중 이상'],
  ['integrity.claim_time_barred', '소멸시효 경과'],
  ['data.unmapped_line', '항목 코드 미매핑'],
  ['data.unmapped_diagnosis', '진단 코드 미매핑'],
  ['data.unresolved_drug', '약물 미확인'],
];
export const ruleLabel = (id) => (RULES.find(([k]) => id === k || (k.endsWith('.') && id.startsWith(k))) || [null, id])[1];

export const ANOMALY_LABEL = {
  inflated_price: '가격 부풀리기',
  unindicated_procedure: '진단과 무관한 고가 검사',
  undisclosed_chronic: '미신고 만성질환(기왕증) 치료',
  species_mismatch: '다른 동물 진료비 합산',
  duplicate: '중복 청구',
  ineligible_items: '비보장 항목 혼입',
  overdose: '용량 오기·과다',
  waiting_period: '면책기간 내 질병',
  pre_policy: '보험 개시 전 진료',
};
