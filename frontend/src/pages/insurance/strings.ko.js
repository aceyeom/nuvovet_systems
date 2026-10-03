// Korean UI strings and enum labels for the insurer console (DESIGN_SYSTEM.md §5.3 "Copy").
// Headings, buttons, tabs and menu items are noun phrases; descriptions and status lines use 합니다체.

export const NAV = [
  { id: 'overview', to: '/insurance', label: '개요', key: 'o' },
  { id: 'claims', to: '/insurance/claims', label: '청구 심사', key: 'c' },
  { id: 'clinics', to: '/insurance/clinics', label: '병원 리스크', key: 'h' },
  { id: 'fees', to: '/insurance/fees', label: '진료비 벤치마크', key: 'f' },
  { id: 'evaluation', to: '/insurance/evaluation', label: '엔진 성능', key: 'e' },
  { id: 'api', to: '/insurance/api', label: 'API 연동', key: 'a', group: '연동' },
]

export const PRODUCT = '청구 심사'
export const USER_LABEL = '김 심사역 (가상)'
export const ENV_LABEL = '합성 데이터'
export const ENV_TOOLTIP = {
  live: '모든 청구·병원·금액은 합성 데이터입니다. 심사 엔진 API에서 실시간으로 받아 표시합니다.',
  snapshot: '모든 청구·병원·금액은 합성 데이터입니다. API에 연결할 수 없어 같은 합성 배치의 저장본을 표시합니다.',
}
export const LOAD_ERROR = 'API에 연결할 수 없고 저장본도 읽지 못했습니다. 백엔드(:8000)가 실행 중인지 확인하세요.'

export const VIEWS = [
  { id: 'open', label: '처리 대상' },
  { id: 'pend', label: '서류 요청' },
  { id: 'review', label: '심사 필요' },
  { id: 'deny', label: '거절 권고' },
  { id: 'auto', label: '자동 승인' },
  { id: 'all', label: '전체' },
]

export const SPECIES = { dog: '개', cat: '고양이' }

export const CHANNEL = {
  owner_upload: '보호자 업로드',
  insurer_app: '보험사 앱',
  fax_email: '팩스·이메일',
  emr_autoclaim: 'EMR 자동 청구',
  live_counter: '원내 접수',
  nuvovet_precheck: '사전 점검 경유',
}

export const INSURER = {
  default: '보험사 미지정',
  kb: 'KB손해보험',
  samsung: '삼성화재',
  meritz: '메리츠화재',
  lotte: '롯데손해보험',
  db: 'DB손해보험',
  nh: 'NH농협손해보험',
  hyundai: '현대해상',
  mybrown: '마이브라운',
}

export const CATEGORY = { coverage: '보장', clinical: '임상', pricing: '가격', integrity: '무결성', data: '데이터', documents: '서류' }

export const ACTOR = { owner: '보호자', clinic: '병원', insurer: '보험사' }

export const PEND_LABEL = {
  RECEIPT_NOT_ITEMIZED: '항목별 영수증 필요',
  MIXED_BASKET_UNSPLIT: '비의료 항목 합산',
  MISSING_DX: '진단명 없음',
  DX_UNMAPPED: '진단명 확인 불가',
  NEED_DX_CERT: '진단서 필요',
  IMAGING_NO_TIMESTAMP: '영상 촬영 일시 없음',
  PET_ID_UNVERIFIED: '동물 확인 필요',
  ORIGINALS_REQUIRED: '원본 서류 필요',
}

export const SIU_LABEL = {
  UNDISCLOSED_CHRONIC: '미신고 만성질환',
  IDENTITY_MISMATCH: '동물 동일성 불일치',
  DUPLICATE_ACROSS_CLAIMS: '청구 간 중복',
  REPEATED_PRICE_OUTLIER: '반복 고가 청구',
}

export const DOC_LABEL = {
  RECEIPT_ITEMIZED: '항목별 영수증', RECEIPT_TOTAL_ONLY: '합계 영수증', DETAIL_STATEMENT: '진료비 세부내역서',
  DX_CERT_STATUTORY: '진단서', INSURER_TX_CONFIRMATION: '보험사 양식 진료확인서', OPINION_WITH_RX: '소견서(처방 포함)',
  MEDICAL_RECORD: '진료부(진료기록)', LAB_RESULT: '검사 결과지', IMAGING: '영상 자료', PAYMENT_SLIP: '카드 매출전표',
  CASH_RECEIPT: '현금영수증', PET_PHOTO_FRONT: '정면 사진', PET_PHOTO_SIDE: '측면 전신 사진', PET_PHOTO_FACE: '얼굴 정면 사진',
  REGISTRATION_CERT: '동물등록증', SURGERY_CONSENT: '수술 동의서', PRESCRIPTION: '처방전', CLAIM_FORM: '보험금 청구서',
  CONSENT_FORM: '개인정보 동의서', ID_COPY: '신분증 사본', BANK_PROOF: '통장 사본',
}

export const DOC_STATUS = { satisfied: '충족', missing: '누락', unknown: '확인 불가', requested: '요청함' }

export const BENEFIT = { outpatient: '통원', inpatient: '입원', surgery: '수술', preventive: '예방', non_medical: '비의료', admin: '행정' }

const REASON = {
  covered: '지급', discount: '할인 차감', non_medical: '비의료', document_fee: '서류 수수료', admin: '행정 항목',
  euthanasia: '안락사', preventive: '예방 목적', dental_not_covered: '치과 미보장', patella_not_covered: '슬개골 미보장',
  no_covered_diagnosis: '진단 보장 제외', diagnosis_excluded: '연결 진단 제외', before_policy_start: '보험 개시 전',
  mixed_unsplit: '보장·비보장 혼합',
}
export const reasonLabel = (code) => {
  if (!code) return ''
  if (code.startsWith('noncovered_product')) return '비보장 제품'
  return REASON[code] || code
}

export const CAPPED_BY = {
  per_visit_limit: '1회 한도', annual_limit: '연간 한도', per_day_limit: '1일 한도', per_surgery_limit: '수술 1회 한도',
  annual_visit_limit: '연간 횟수 한도',
}

export const DRUG_CLASS = {
  nsaid: '소염진통제(NSAID)', antibiotic: '항생제', analgesic_adjunct: '보조 진통제', antiemetic: '구토 억제제',
  gi_protectant: '위장 보호제', antipruritic_immunomodulator: '가려움·면역 조절제', opioid: '마약성 진통제',
  cardiac: '심장약', diuretic: '이뇨제', endocrine: '내분비 치료제', anticonvulsant: '항경련제',
}

export const PROC_CATEGORY = {
  consult: '진찰', hospitalization: '입원', lab: '검사', imaging: '영상', treatment: '처치', anesthesia: '마취',
  surgery: '수술', preventive: '예방', dental: '치과', pharmacy: '약제', non_medical: '비의료', admin: '행정',
}

export const UNIT = {
  visit: '회', exam: '회', day: '일', test: '건', panel: '패널', site: '부위', specimen: '검체', package: '패키지',
  view: '컷', session: '회', injection: '회', unit: '단위', procedure: '건', limb: '다리', eye: '안', dose: '회',
  tooth: '치아', item: '개', document: '부', line: '항목',
}

// Rule IDs to short Korean names (prefix match for the species / combo families).
const RULES = [
  ['coverage.line_ineligible', '비보장 항목 제외'],
  ['coverage.diagnosis_excluded', '보장 제외 진단'],
  ['coverage.before_policy_start', '보험 개시 전 진료'],
  ['coverage.policy_terms_check', '상품 조건 확인'],
  ['coverage.annual_visit_limit', '연간 횟수 한도'],
  ['clinical.procedure_not_indicated', '진단과 맞지 않는 검사'],
  ['clinical.undisclosed_chronic_condition', '미신고 만성질환 신호'],
  ['clinical.drug_diagnosis_mismatch', '진단과 맞지 않는 처방'],
  ['clinical.dose_above_reference', '참고 용량 초과'],
  ['clinical.species.', '종 특이 안전성'],
  ['clinical.combo.', '병용 위험'],
  ['pricing.regional_outlier', '지역 대비 고가'],
  ['pricing.above_posted_fee', '게시 진료비 초과'],
  ['pricing.quantity_implausible', '비정상 수량'],
  ['integrity.duplicate_claim', '중복 청구'],
  ['integrity.species_mismatch_item', '종 불일치 항목'],
  ['integrity.species_mismatch_diagnosis', '종 불일치 진단'],
  ['integrity.breed_species_mismatch', '품종과 종 불일치'],
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
]
export const ruleLabel = (id) => (RULES.find(([k]) => id === k || (k.endsWith('.') && id?.startsWith(k))) || [null, id])[1]

export const ANOMALY_LABEL = {
  inflated_price: '가격 부풀리기',
  unindicated_procedure: '진단과 무관한 고가 검사',
  undisclosed_chronic: '미신고 만성질환 치료',
  species_mismatch: '다른 동물 진료비 합산',
  duplicate: '중복 청구',
  ineligible_items: '비보장 항목 혼입',
  overdose: '용량 오기·과다',
  waiting_period: '면책기간 내 질병',
  pre_policy: '보험 개시 전 진료',
  total_only_receipt: '합계만 있는 영수증',
  missing_dx: '진단명 누락',
  above_threshold_no_cert: '고액 청구, 진단서 없음',
  mixed_basket: '비의료 항목 합산 청구',
}

// Claim actions (client-side only, §5.3).
export const ACTIONS = {
  approve: { label: '승인', done: '승인으로 처리했습니다' },
  request: { label: '서류 요청', done: '서류를 요청했습니다' },
  siu: { label: 'SIU 이관', done: 'SIU로 이관했습니다' },
  note: { label: '메모', done: '메모를 저장했습니다' },
}
export const ACTION_REASONS = {
  approve: ['소견 확인 후 지급 타당', '가격 소명 자료 확인', '중복 아님 확인', '기타'],
  request: ['진단 근거 확인 필요', '가격 소명 필요', '동물 동일성 확인 필요', '기타'],
  siu: ['반복 고가 청구', '동물 동일성 의심', '청구 간 중복 의심', '미신고 만성질환 의심', '기타'],
}
export const ACTIONS_TOOLTIP = '데모: 이 브라우저에만 저장됩니다'
