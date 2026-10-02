export const fmtKRW = (n) => '₩' + Math.round(n || 0).toLocaleString('en-US');
export const fmtKRWShort = (n) => {
  const v = n || 0;
  if (v >= 1e8) return '₩' + (v / 1e8).toFixed(1) + '억';
  if (v >= 1e4) return '₩' + Math.round(v / 1e4).toLocaleString('en-US') + '만';
  return '₩' + v.toLocaleString('en-US');
};
export const fmtPct = (r, digits = 1) => ((r || 0) * 100).toFixed(digits) + '%';

export const DECISION = {
  auto_approve: { ko: '자동 승인', en: 'Auto-approve', badge: 'badge-ok', dot: 'dot-ok', color: 'var(--accent)' },
  pend: { ko: '대기 · 서류 요청', short: '서류 요청', en: 'Pend', badge: 'badge-info', dot: 'dot-info', color: 'var(--info)' },
  review: { ko: '심사 필요', en: 'Review', badge: 'badge-warning', dot: 'dot-warning', color: 'var(--warning)' },
  deny_recommended: { ko: '지급 거절 권고', en: 'Deny recommended', badge: 'badge-critical', dot: 'dot-critical', color: 'var(--critical)' },
};
export const DECISION_KEYS = ['auto_approve', 'pend', 'review', 'deny_recommended'];

export const CATEGORY = {
  coverage: '보장', clinical: '임상', pricing: '가격', integrity: '무결성', data: '데이터', documents: '서류',
};

export const ACTOR = { owner: '보호자', clinic: '병원', insurer: '보험사' };

export const PEND_LABEL = {
  RECEIPT_NOT_ITEMIZED: '항목별 영수증 필요',
  MIXED_BASKET_UNSPLIT: '비의료 항목 합산',
  MISSING_DX: '진단명 없음',
  DX_UNMAPPED: '진단명 확인 불가',
  NEED_DX_CERT: '진단서 필요',
  IMAGING_NO_TIMESTAMP: '영상 촬영 일시 없음',
  PET_ID_UNVERIFIED: '동물 확인 필요',
  ORIGINALS_REQUIRED: '원본 서류 필요',
};

export const SIU_LABEL = {
  UNDISCLOSED_CHRONIC: '미신고 만성질환',
  IDENTITY_MISMATCH: '동물 동일성 불일치',
  DUPLICATE_ACROSS_CLAIMS: '청구 간 중복',
  REPEATED_PRICE_OUTLIER: '반복 고가 청구',
};

export const DOC_LABEL = {
  RECEIPT_ITEMIZED: '항목별 영수증', RECEIPT_TOTAL_ONLY: '합계 영수증', DETAIL_STATEMENT: '진료비 세부내역서',
  DX_CERT_STATUTORY: '진단서', INSURER_TX_CONFIRMATION: '보험사 양식 진료확인서', OPINION_WITH_RX: '소견서(처방 포함)',
  MEDICAL_RECORD: '진료부(진료기록)', LAB_RESULT: '검사 결과지', IMAGING: '영상 자료', PAYMENT_SLIP: '카드 매출전표',
  CASH_RECEIPT: '현금영수증', PET_PHOTO_FRONT: '정면 사진', PET_PHOTO_SIDE: '측면 전신 사진', PET_PHOTO_FACE: '얼굴 정면 사진',
  REGISTRATION_CERT: '동물등록증', SURGERY_CONSENT: '수술 동의서', PRESCRIPTION: '처방전', CLAIM_FORM: '보험금 청구서',
  CONSENT_FORM: '개인정보 동의서', ID_COPY: '신분증 사본', BANK_PROOF: '통장 사본',
};

export const CHANNEL_LABEL = {
  owner_upload: '보호자 업로드', insurer_app: '보험사 앱', fax_email: '팩스·이메일', emr_autoclaim: 'EMR 자동청구',
  live_counter: '창구 라이브청구', nuvovet_precheck: 'NuvoVet 사전점검',
};

export const BENEFIT_LABEL = {
  outpatient: '통원', inpatient: '입원', surgery: '수술', preventive: '예방', non_medical: '비의료', admin: '행정',
};

const REASON = {
  covered: '지급', discount: '할인 차감', non_medical: '비의료', document_fee: '서류 수수료', admin: '행정 항목',
  euthanasia: '안락사', preventive: '예방 목적', dental_not_covered: '치과 미보장', patella_not_covered: '슬개골 미보장',
  no_covered_diagnosis: '진단 보장 제외', diagnosis_excluded: '연결 진단 제외', before_policy_start: '보험 개시 전',
  mixed_unsplit: '보장·비보장 혼합 (분리 필요)',
};
export const reasonLabel = (code) => {
  if (!code) return '';
  if (code.startsWith('noncovered_product')) return '비보장 제품';
  return REASON[code] || code;
};

export const CAPPED_BY = {
  per_visit_limit: '1회 한도', annual_limit: '연간 한도', per_day_limit: '1일 한도', per_surgery_limit: '수술 1회 한도',
  annual_visit_limit: '연간 횟수 한도',
};

// Human-readable names for rule ids (prefix match for species/combo families).
const RULES = [
  ['coverage.line_ineligible', '비보장 항목 제외'],
  ['coverage.diagnosis_excluded', '보장 제외 진단'],
  ['coverage.before_policy_start', '보험 개시 전 진료'],
  ['coverage.policy_terms_check', '상품 조건 확인'],
  ['coverage.annual_visit_limit', '연간 횟수 한도'],
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
  ['integrity.identity_mismatch_history', '이전 청구와 동물 불일치'],
  ['documents.medical_record_may_be_unavailable', '진료부 보존기간 경과'],
  ['documents.prescription_fee_above_cap', '처방전 수수료 상한 초과'],
  ['documents.too_many_files', '첨부 파일 수 초과'],
  ['documents.file_type_not_accepted', '파일 형식 불가'],
  ['documents.payment_slip_without_brn', '결제 증빙 사업자번호 없음'],
  ['data.line_routed_to_drug', '약품 항목 인식'],
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
  total_only_receipt: '합계만 있는 영수증',
  missing_dx: '진단명 누락',
  above_threshold_no_cert: '고액 청구 · 진단서 없음',
  mixed_basket: '비의료 항목 합산 청구',
};

// One-line headline for a claim row: the top review finding, else what is being requested, else the diagnosis.
export const claimHeadline = (c) => {
  if (c.top_finding) return c.top_finding;
  if (c.pend_codes?.length) return `서류 요청: ${c.pend_codes.map((p) => PEND_LABEL[p] || p).join(' · ')}`;
  return c.diagnosis;
};
