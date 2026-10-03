// Request and response bodies for the API page and the landing's 연동 section (DESIGN_SYSTEM.md §5.1,
// §5.3). The request is SYN-2026-00220 from the synthetic snapshot (registration number and document
// serials left out); the response is the engine's answer to exactly that request, trimmed to the first
// two of its findings.
//
// The bodies are values, shown with CodeBlock's `json` prop: every level pretty-printed with a 2-space
// indent, long arrays cut to their first element plus a `// 외 N개` line (design review P1-17).
// ADJUDICATE_REQUEST / ADJUDICATE_RESPONSE stay as full JSON text for anything that needs a string.
export const BASE_URL = 'https://api.example.com'

/** CodeBlock jsonOptions for the request: one element per array, the rest summarised. */
export const REQUEST_JSON_OPTIONS = { maxItems: 1 }

export const ADJUDICATE_REQUEST_BODY = {
  claim: {
    claim_id: 'SYN-2026-00220',
    visit_date: '2026-09-17',
    submitted_date: '2026-09-24',
    clinic: { clinic_id: 'HOSP-1031', name: '샘플동물병원 32', region: '서울' },
    patient: {
      patient_id: 'PET-58019',
      species: 'dog',
      breed: '토이푸들',
      age_years: 3.9,
      weight_kg: 3.1,
      neutered: true,
    },
    diagnoses: [{ text_raw: '위장관 이물', certainty: 'final', diagnosis_date: '2026-09-17', source_doc: 'DX_CERT_STATUTORY' }],
    line_items: [
      { description: '야간 응급 진찰', quantity: 1, unit_price: 99200 },
      { description: '검사-X-ray 2컷', quantity: 2, unit_price: 123000 },
      { description: '복부 초음파 검사', quantity: 1, unit_price: 144700 },
      { description: '혈액 검사 CBC', quantity: 1, unit_price: 134300 },
      { description: '마취(호흡)', quantity: 1, unit_price: 413100 },
      { description: '장절개술(이물)', quantity: 1, unit_price: 4727600 },
      { description: '입원-소형견(1일)', quantity: 4, unit_price: 268900 },
      { description: '정맥 수액 처치', quantity: 4, unit_price: 125500 },
      { description: 'Buprenorphine inj', quantity: 1, unit_price: 22000 },
    ],
    prescriptions: [
      { drug: 'Cerenia 16mg tab', dose_mg_per_kg: 1, frequency: 'SID', days: 3, unit_price: 800, quantity: 3 },
      { drug: 'Clavamox 62.5mg', dose_mg_per_kg: 13.243, frequency: 'BID', days: 7, unit_price: 1200, quantity: 14 },
    ],
    documents: [
      { doc_type: 'RECEIPT_ITEMIZED', source: 'photo', issued_at: '2026-09-17' },
      { doc_type: 'DX_CERT_STATUTORY', source: 'photo', issued_at: '2026-09-17' },
      { doc_type: 'IMAGING', source: 'photo', captured_at: '2026-09-17T17:00:00' },
    ],
    intake_channel: 'insurer_app',
    invoice_total: 7383700,
  },
  policy: {
    policy_id: 'POL-00220',
    start_date: '2024-09-08',
    insurer_id: 'default',
    coverage_ratio: 0.8,
    deductible: { amount: 30000, basis: 'per_visit' },
    limits: { annual_amount: 5000000 },
  },
}

export const ADJUDICATE_RESPONSE_BODY = {
  claim_id: 'SYN-2026-00220',
  decision: 'review',
  confidence: 0.889,
  engine_version: '0.1.0',
  benefit_type: 'surgery',
  payable: {
    billed: 7383700,
    ineligible: 0,
    eligible: 7383700,
    deductible: 30000,
    reimbursed: 5000000,
    capped_by: 'annual_limit',
    coverage_ratio: 0.8,
    copay_method: 'sequential',
    deductible_basis: 'per_visit',
    days: 4,
    copay_amount: 1470740,
    limit_reduction: 882960,
  },
  findings: [
    { rule: 'pricing.regional_outlier', category: 'pricing', severity: 'critical', item_ref: 'SUR-003', amount_at_risk: 1927600, title: '지역 대비 고가: 위장관 이물 제거술 (P100)' },
    { rule: 'pricing.regional_outlier', category: 'pricing', severity: 'critical', item_ref: 'HOS-001', amount_at_risk: 627600, title: '지역 대비 고가: 입원비 (일반, 1일) (P100)' },
  ],
  siu_flags: [],
  pend_reasons: [],
}

export const ADJUDICATE_REQUEST = JSON.stringify(ADJUDICATE_REQUEST_BODY, null, 2)
export const ADJUDICATE_RESPONSE = JSON.stringify(ADJUDICATE_RESPONSE_BODY, null, 2)
