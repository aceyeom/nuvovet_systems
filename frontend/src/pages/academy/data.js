/* Mock data for NuvoVet Academy */

export const STUDENT = {
  name: '김서연',
  initials: 'SY',
  school: '건국대학교 수의과대학',
  year: '본과 3학년',
  semester: '2026년 1학기',
};

/* 7 clinical reasoning competencies */
export const COMPETENCIES = [
  { id: 'data-gather',   ko: '자료 수집',   en: 'Data Gathering',         score: 82, delta: +6, weekDelta: '+6' },
  { id: 'data-interp',   ko: '자료 해석',   en: 'Data Interpretation',    score: 64, delta: +3, weekDelta: '+3' },
  { id: 'hypo-gen',      ko: '가설 생성',   en: 'Hypothesis Generation',  score: 41, delta: -4, weekDelta: '-4' },
  { id: 'hypo-test',     ko: '가설 검증',   en: 'Hypothesis Testing',     score: 73, delta:  0, weekDelta: '±0' },
  { id: 'decision',      ko: '의사결정',    en: 'Decision Making',        score: 67, delta: +5, weekDelta: '+5' },
  { id: 'reasoning-art', ko: '추론 외부화', en: 'Reasoning Articulation', score: 53, delta: +8, weekDelta: '+8' },
  { id: 'metacog',       ko: '자기 모니터링', en: 'Metacognition',         score: 56, delta: +1, weekDelta: '+1' },
];

/* Stats for overview dashboard */
export const STATS = {
  casesCompleted: 34,
  casesTotal: 165,
  studyHoursWeek: '4시간 32분',
  studyHoursTotal: '47시간',
  avgMinPerCase: 18.3,
  classAvgMin: 21.7,
  peerReviewsDone: 11,
  peerReviewsPending: 2,
  avgScore: 71,
};

/* Recent activity */
export const RECENT_ACTIVITY = [
  { id: 'A-012', title: '알레르기성 피부염 — 스테로이드 선택', track: 'A', score: 88, date: '오늘 오전 10:12', done: true },
  { id: 'A-011', title: '외이도염 — 국소 처방 vs 전신 처방', track: 'A', score: 74, date: '어제 오후 3:44', done: true },
  { id: 'B-003', title: '만성 신부전 — IRIS 단계 결정', track: 'B', score: 61, date: '2일 전', done: true },
];

/* Case library */
export const CASES = [
  /* Track A — 처방 안전성 */
  {
    id: 'A-001', track: 'A', difficulty: 1, estMin: 10,
    title: '단순 알레르기성 피부염 1차 스테로이드 선택',
    desc: '5세 Maltese, 4.2kg. 소양증·홍반. 신장/간 정상. 1차 처방을 결정하세요.',
    competencies: ['자료 수집', '의사결정'],
    status: 'completed', score: 92, stage: 'done',
  },
  {
    id: 'A-002', track: 'A', difficulty: 1, estMin: 10,
    title: '외이도염 — 국소 처방 선택',
    desc: '3세 Beagle, 11kg. 귀 긁기·악취. 세균성 외이도염 의심. 처방을 결정하세요.',
    competencies: ['자료 수집', '의사결정'],
    status: 'completed', score: 84, stage: 'done',
  },
  {
    id: 'A-003', track: 'A', difficulty: 2, estMin: 15,
    title: '위장염 — 항구토제 + 수액 처방',
    desc: '2세 Mixed, 7kg. 구토·설사 24시간. 경도 탈수. 처방 세트를 구성하세요.',
    competencies: ['자료 수집', '자료 해석', '의사결정'],
    status: 'completed', score: 78, stage: 'done',
  },
  {
    id: 'A-004', track: 'A', difficulty: 3, estMin: 20,
    title: '요로감염 — 항생제 선택과 배양 결과 해석',
    desc: '7세 수컷 Poodle, 5.8kg. 빈뇨·혈뇨. 요배양 결과 E. coli 분리. 처방을 결정하세요.',
    competencies: ['자료 해석', '가설 검증', '의사결정'],
    status: 'in_progress', score: null, stage: 'stage1',
  },
  {
    id: 'A-005', track: 'A', difficulty: 4, estMin: 28,
    title: 'MMVD — 심부전 처방 최적화',
    desc: '10세 Cavalier King Charles, 8.1kg. 기침·호흡곤란. X-ray 심비대. ACVIM B2 기준.',
    competencies: ['자료 해석', '가설 생성', '가설 검증', '의사결정'],
    status: 'locked', score: null, stage: null,
  },
  {
    id: 'A-006', track: 'A', difficulty: 3, estMin: 20,
    title: '당뇨병 — 인슐린 용량 산정',
    desc: '9세 암컷 고양이, 3.9kg. 다음다뇨·체중감소. 혈당 410mg/dL. 초기 인슐린을 선택하세요.',
    competencies: ['자료 수집', '자료 해석', '의사결정'],
    status: 'locked', score: null, stage: null,
  },
  /* Track B — 진단-처방 적합성 */
  {
    id: 'B-001', track: 'B', difficulty: 2, estMin: 18,
    title: '췌장염 — 금식 vs 조기 영양 지원',
    desc: '6세 Miniature Schnauzer, 6.3kg. 구토·복통·지방성 변. 리파아제 상승. 처방 방향을 결정하세요.',
    competencies: ['자료 해석', '가설 생성', '의사결정'],
    status: 'completed', score: 69, stage: 'done',
  },
  {
    id: 'B-002', track: 'B', difficulty: 3, estMin: 22,
    title: '갑상선 기능 저하 — T4 결과 해석과 치료 시작 기준',
    desc: '8세 Golden Retriever, 31kg. 기력저하·체중증가·피부건조. Total T4 0.6 μg/dL.',
    competencies: ['자료 해석', '가설 생성', '가설 검증'],
    status: 'completed', score: 61, stage: 'done',
  },
  {
    id: 'B-003', track: 'B', difficulty: 4, estMin: 26,
    title: '만성 신부전 — IRIS 단계별 처방',
    desc: '12세 고양이, 3.1kg. IRIS CKD Stage 3. Creatinine 3.2mg/dL. BUN 68. 처방 우선순위를 결정하세요.',
    competencies: ['자료 해석', '가설 검증', '의사결정'],
    status: 'locked', score: null, stage: null,
  },
  /* Track C — 시술 적합성 */
  {
    id: 'C-001', track: 'C', difficulty: 2, estMin: 15,
    title: '전처치 마취 — 건강한 환자 프로토콜',
    desc: '3세 암컷 고양이, 4.0kg. ASA I. 중성화 수술 전 마취 전처치를 계획하세요.',
    competencies: ['자료 수집', '의사결정'],
    status: 'locked', score: null, stage: null,
  },
];

/* The active case (A-004) for the case player demo */
export const ACTIVE_CASE = {
  id: 'A-004',
  track: 'A',
  difficulty: 3,
  estMin: 20,
  title: '요로감염 — 항생제 선택과 배양 결과 해석',
  competencies: ['자료 해석', '가설 검증', '의사결정'],
  patient: {
    name: '두부',
    species: '개 (Canine)',
    breed: 'Toy Poodle',
    age: '7세',
    weight: '5.8 kg',
    sex: '중성화 수컷',
    conditions: ['요로감염 (N39.0)', '전립선비대 의심 (N40)'],
    allergies: ['없음'],
    renal: '경도 이상 (Cr 1.6)',
    hepatic: '정상',
    labResults: [
      { name: 'Creatinine', value: '1.6 mg/dL', status: 'mild' },
      { name: 'BUN',        value: '28 mg/dL',  status: 'normal' },
      { name: 'ALT',        value: '41 U/L',    status: 'normal' },
      { name: 'UPC',        value: '0.42',      status: 'mild' },
      { name: '요배양',     value: 'E. coli (ESBL−)', status: 'pathogen' },
      { name: 'MIC Amox',  value: '≤ 0.25 μg/mL (S)', status: 'sensitive' },
    ],
  },
  question: '7세 Toy Poodle의 단순 요로감염(E. coli, amoxicillin 감수성)에서 가장 적절한 1차 항생제와 투여 기간을 선택하세요.',
  options: [
    {
      id: 'A',
      text: '아목시실린-클라불라네이트 12.5mg/kg PO BID × 7일',
      correct: true,
      explanation: 'ISCAID 2019 가이드라인 권고. 감수성 E. coli에 대한 1차 선택. 신기능 경도 이상이지만 용량 조정 불필요 수준.',
    },
    {
      id: 'B',
      text: '엔로플록사신 5mg/kg PO SID × 14일',
      correct: false,
      explanation: '퀴놀론계는 감수성 결과가 있더라도 단순 UTI 1차 선택으로 ISCAID는 권고하지 않음. 내성 선택압 우려.',
    },
    {
      id: 'C',
      text: '세팔렉신 15mg/kg PO BID × 7일',
      correct: false,
      explanation: '세팔렉신은 대안으로 허용되나, 배양 결과가 amoxicillin 감수성을 명확히 보여줄 때는 amox-clav가 더 좁은 스펙트럼으로 우선.',
    },
    {
      id: 'D',
      text: '메트로니다졸 15mg/kg PO BID × 7일',
      correct: false,
      explanation: '메트로니다졸은 혐기성균 및 기생충에 사용. E. coli 요로감염에 효과 없음.',
    },
  ],
  expertThinking: [
    {
      expert: '수의내과 전문의 — 이상은 (서울대)',
      text: '배양 결과를 보면 E. coli이고 amoxicillin MIC ≤ 0.25 μg/mL로 감수성입니다. ISCAID 2019 가이드라인은 단순 UTI에 amoxicillin-clavulanate를 1차로 권고합니다. Creatinine 1.6은 IRIS Stage 1-2 경계이지만 이 용량에서 조정이 필요한 수준은 아닙니다. 퀴놀론계는 감수성이 있더라도 내성 선택압 때문에 단순 UTI 1차로는 피해야 합니다.',
    },
    {
      expert: '임상미생물 전문의 — 박민준 (건국대)',
      text: '핵심은 "감수성이 있어도 가장 좁은 스펙트럼을 쓴다"는 원칙입니다. E. coli + amoxicillin 감수성 → amoxicillin(-clavulanate)이 정답입니다. 세팔렉신도 틀리진 않지만, 더 넓은 스펙트럼입니다. 메트로니다졸은 이 케이스에서 완전히 맞지 않습니다—그람 음성 호기성균에는 활성이 없습니다.',
    },
  ],
  explanation: 'ISCAID 2019 단순 하부 요로감염 가이드라인: amoxicillin(-clavulanate) PO 7일이 1차 권고. 퀴놀론계는 2차 이상, 합병 UTI에만 사용. Creatinine 1.6mg/dL은 toy poodle에서 상한에 가깝지만 용량 조정 임계값(> 2.5mg/dL) 미만.',
  guidelines: [
    'ISCAID Antimicrobial Use Guidelines 2019 (DOI: 10.1111/jvim.15370)',
    'WSAVA Antimicrobial Stewardship Guidelines 2023',
  ],
};

/* Peer reviews pending */
export const PEER_REVIEWS = [
  {
    id: 'pr-001',
    caseId: 'A-003',
    caseTitle: '위장염 — 항구토제 + 수액 처방',
    revieweeCode: '익명 학생 #738',
    selectedOptions: ['메토클로프라미드 0.3mg/kg SC TID', '0.9% NaCl 40mL/kg/24h IV', '오메프라졸 1mg/kg PO SID'],
    reasoning: '2세 Mixed 7kg, 구토·설사 24시간, 경도 탈수 상태입니다. 메토클로프라미드를 구토 억제에 선택했고, 생리식염수로 수액 치료를 시작합니다. 오메프라졸은 위산 과분비 예방 목적으로 추가했습니다. 단, 메토클로프라미드의 도파민 차단 작용으로 추체외로 부작용 가능성을 고려해야 한다는 점은 인지하고 있습니다.',
    deadline: '4일 11시간',
    scores: { accuracy: 0, logic: 0, guideline: 0, patient: 0, alternative: 0 },
    feedback: '',
  },
  {
    id: 'pr-002',
    caseId: 'A-002',
    caseTitle: '외이도염 — 국소 처방 선택',
    revieweeCode: '익명 학생 #412',
    selectedOptions: ['덱사메타손 0.5mg/kg IV × 3일', '아목시실린 20mg/kg PO BID × 7일'],
    reasoning: '3세 Beagle의 세균성 외이도염에 전신 스테로이드와 경구 항생제 병합 처방을 선택했습니다. 덱사메타손으로 염증을 빠르게 줄이고 아목시실린으로 세균을 치료한다는 판단입니다. 국소 처방보다 전신 처방이 더 확실하다고 생각했습니다.',
    deadline: '6일 3시간',
    scores: { accuracy: 0, logic: 0, guideline: 0, patient: 0, alternative: 0 },
    feedback: '',
  },
];

/* Drug reference data */
export const DRUGS = [
  {
    id: 'pred',
    nameKo: '프레드니솔론', nameEn: 'Prednisolone',
    brandKo: '메디코솔론정, 프레드정',
    class: '코르티코스테로이드',
    species: ['개', '고양이'],
    doses: [
      { indication: '소양증·피부염 (항염)', dose: '0.5mg/kg PO SID × 7일', species: '개', level: '1차' },
      { indication: '면역억제', dose: '1~2mg/kg PO SID', species: '개/고양이', level: '2차' },
    ],
    notes: 'HPA축 억제 최소화를 위해 격일 투여로 전환 권고. 덱사메타손과 병용 절대 금기.',
    guideline: 'WSAVA Dermatology Guidelines 2022',
  },
  {
    id: 'amox-clav',
    nameKo: '아목시실린-클라불라네이트', nameEn: 'Amoxicillin-Clavulanate',
    brandKo: '클라목신정, 아목클라브정',
    class: '베타-락탐 항생제',
    species: ['개', '고양이'],
    doses: [
      { indication: '요로감염 (UTI)', dose: '12.5mg/kg PO BID × 7일', species: '개', level: '1차' },
      { indication: '피부감염', dose: '12.5~25mg/kg PO BID × 14-28일', species: '개', level: '1차' },
    ],
    notes: 'ISCAID 2019 단순 UTI 1차 선택. 식사와 함께 투여 시 구역 감소.',
    guideline: 'ISCAID Antimicrobial Use Guidelines 2019',
  },
  {
    id: 'enalapril',
    nameKo: '에날라프릴', nameEn: 'Enalapril',
    brandKo: '에낙-V정, 포레나프릴정',
    class: 'ACE 억제제',
    species: ['개'],
    doses: [
      { indication: 'MMVD — 심부전', dose: '0.5mg/kg PO SID~BID', species: '개', level: '1차' },
      { indication: '단백뇨성 신병증', dose: '0.5mg/kg PO SID', species: '개', level: '1차' },
    ],
    notes: 'ACVIM 2019 권고. 신기능 모니터링 필요 (시작 후 1주, 1개월). 칼륨 보충 피할 것.',
    guideline: 'ACVIM Consensus Guidelines 2019',
  },
  {
    id: 'furosemide',
    nameKo: '푸로세미드', nameEn: 'Furosemide',
    brandKo: '라식스정, 퓨로세정',
    class: '루프 이뇨제',
    species: ['개', '고양이'],
    doses: [
      { indication: '심부전 부종', dose: '1~2mg/kg PO/IV BID~TID', species: '개', level: '1차' },
      { indication: '폐부종 응급', dose: '2~4mg/kg IV 반복', species: '개/고양이', level: '응급' },
    ],
    notes: '전해질(K+, Na+) 모니터링 필수. 탈수 위험. 최소 효과 용량 사용.',
    guideline: 'ACVIM Consensus Guidelines 2019',
  },
  {
    id: 'insulin-glargine',
    nameKo: '인슐린 글라진', nameEn: 'Insulin Glargine',
    brandKo: '란투스, 인슐린글라진',
    class: '지속형 인슐린',
    species: ['고양이'],
    doses: [
      { indication: '당뇨병', dose: '1~2 IU/cat SC BID (초기)', species: '고양이', level: '1차' },
    ],
    notes: '고양이 당뇨 1차 인슐린. 혈당 목표 80-150mg/dL. 4-12주 간격 재평가.',
    guideline: 'ISFM Feline Diabetes Guidelines 2021',
  },
];

/* Learning progress (weekly) */
export const WEEKLY_PROGRESS = [
  { week: '3/10', score: 58, cases: 3, minutes: 52 },
  { week: '3/17', score: 61, cases: 4, minutes: 68 },
  { week: '3/24', score: 65, cases: 3, minutes: 55 },
  { week: '3/31', score: 63, cases: 5, minutes: 88 },
  { week: '4/7',  score: 68, cases: 4, minutes: 72 },
  { week: '4/14', score: 71, cases: 5, minutes: 91 },
  { week: '4/21', score: 71, cases: 6, minutes: 97 },
  { week: '4/28', score: 74, cases: 4, minutes: 83 },
];
