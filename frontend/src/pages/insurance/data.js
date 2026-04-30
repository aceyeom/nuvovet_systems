export const fmtKRW = (n) => '₩' + n.toLocaleString('en-US');
export const fmtKRWShort = (n) => {
  if (n >= 1e9) return '₩' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '₩' + (n / 1e6).toFixed(0) + 'M';
  if (n >= 1e3) return '₩' + (n / 1e3).toFixed(0) + 'K';
  return '₩' + n;
};
export const fmtPct = (n, plus = true) => (n > 0 && plus ? '+' : '') + n.toFixed(1) + '%';

export const weeklyClaims = [
  { w: 'W14', total: 891, flagged: 38 },
  { w: 'W15', total: 942, flagged: 51 },
  { w: 'W16', total: 1018, flagged: 47 },
  { w: 'W17', total: 967, flagged: 44 },
  { w: 'W18', total: 1102, flagged: 58 },
  { w: 'W19', total: 1054, flagged: 62 },
  { w: 'W20', total: 1187, flagged: 71 },
  { w: 'W21', total: 1142, flagged: 49 },
  { w: 'W22', total: 1078, flagged: 56 },
  { w: 'W23', total: 1124, flagged: 67 },
  { w: 'W24', total: 1212, flagged: 74 },
  { w: 'W25', total: 1156, flagged: 61 },
  { w: 'W26', total: 1098, flagged: 53 },
];

export const overviewSparks = {
  claims: [820, 880, 910, 870, 950, 1020, 990, 1050, 1080, 1110, 1150, 1180, 1190],
  amount: [620, 640, 655, 670, 660, 680, 675, 690, 700, 695, 685, 690, 687],
  flag: [6.8, 6.5, 6.4, 6.0, 5.9, 5.7, 5.6, 5.5, 5.6, 5.4, 5.3, 5.4, 5.4],
  saved: [180, 200, 220, 235, 250, 265, 280, 290, 300, 315, 325, 335, 340],
};

export const alerts = [
  { sev: 'critical', title: '강남24시 — MRI 청구율 급증', sub: '최근 30일, 동급 병원 대비 +340%', meta: '38건' },
  { sev: 'warning', title: '가격 이상치 47건 누적', sub: '지난 7일간 P95 초과', meta: '₩42M' },
  { sev: 'info', title: '분기 보고서 대기 중', sub: 'Q1 2026 인텔리전스 리포트', meta: '검토 필요' },
  { sev: 'warning', title: '동대문우리동물병원 — 야간 청구 급증', sub: '23-06시 청구가 평균 +180%', meta: '24건' },
  { sev: 'critical', title: '신규 부적합 패턴 탐지', sub: 'CT + 혈액검사 동반 청구 89건', meta: '₩78M' },
];

export const topHospitals = [
  { name: '서울 강남 24시동물의료센터', amt: 4280, risk: 78 },
  { name: '한국동물병원그룹 본원', amt: 3940, risk: 28 },
  { name: '청담우리펫메디컬센터', amt: 3210, risk: 64 },
  { name: '강북 24시동물의료원', amt: 2890, risk: 71 },
  { name: '분당펫스퀘어동물병원', amt: 2640, risk: 22 },
  { name: '해운대 24시 동물병원', amt: 2380, risk: 45 },
  { name: '광진 어린이펫의료센터', amt: 2150, risk: 19 },
  { name: '대구 북부 동물의료원', amt: 1980, risk: 52 },
  { name: '인천 송도 펫메디컬', amt: 1820, risk: 31 },
  { name: '부산 서면 동물의료원', amt: 1720, risk: 67 },
];

export const activity = [
  { t: '13:42', text: '보고서 생성 완료', link: '4월 마감 청구 검증 리포트' },
  { t: '12:18', text: '신규 플래그', link: 'CLM-2026-04-018472 (강남24시)' },
  { t: '10:55', text: '병원 등급 갱신', link: '강북우리동물병원 → tier 3' },
  { t: '09:30', text: '분기 데이터 정규화 완료', link: '2,847건' },
  { t: '08:12', text: 'API 키 갱신', link: 'production-secondary' },
  { t: '어제', text: '워치리스트 추가', link: '청담우리펫메디컬센터' },
  { t: '어제', text: '검증 룰 업데이트', link: 'AAHA 2025 §4.2 반영' },
  { t: '2일 전', text: '사용자 초대', link: '윤서아 / 액추어리' },
];

export const claimList = [
  { id: 'CLM-2026-04-018472', date: '04.27', hospital: '강남24시동물의료센터', amount: 1610000, score: 32, status: 'flagged' },
  { id: 'CLM-2026-04-018465', date: '04.27', hospital: '한국동물병원그룹 본원', amount: 184500, score: 92, status: 'normal' },
  { id: 'CLM-2026-04-018461', date: '04.27', hospital: '청담우리펫메디컬센터', amount: 740000, score: 58, status: 'review' },
  { id: 'CLM-2026-04-018458', date: '04.26', hospital: '분당펫스퀘어동물병원', amount: 92000, score: 96, status: 'normal' },
  { id: 'CLM-2026-04-018452', date: '04.26', hospital: '강북 24시동물의료원', amount: 2180000, score: 28, status: 'flagged' },
  { id: 'CLM-2026-04-018449', date: '04.26', hospital: '광진 어린이펫의료센터', amount: 320000, score: 88, status: 'normal' },
  { id: 'CLM-2026-04-018443', date: '04.26', hospital: '해운대 24시 동물병원', amount: 1420000, score: 41, status: 'flagged' },
  { id: 'CLM-2026-04-018440', date: '04.25', hospital: '인천 송도 펫메디컬', amount: 245000, score: 84, status: 'normal' },
  { id: 'CLM-2026-04-018434', date: '04.25', hospital: '부산 서면 동물의료원', amount: 890000, score: 51, status: 'review' },
  { id: 'CLM-2026-04-018428', date: '04.25', hospital: '대구 북부 동물의료원', amount: 410000, score: 79, status: 'normal' },
  { id: 'CLM-2026-04-018424', date: '04.24', hospital: '강남24시동물의료센터', amount: 980000, score: 44, status: 'flagged' },
  { id: 'CLM-2026-04-018419', date: '04.24', hospital: '한국동물병원그룹 본원', amount: 156000, score: 91, status: 'normal' },
  { id: 'CLM-2026-04-018415', date: '04.24', hospital: '청담우리펫메디컬센터', amount: 530000, score: 67, status: 'review' },
  { id: 'CLM-2026-04-018411', date: '04.24', hospital: '분당펫스퀘어동물병원', amount: 78000, score: 95, status: 'normal' },
  { id: 'CLM-2026-04-018403', date: '04.23', hospital: '대전 유성동물의료원', amount: 1280000, score: 38, status: 'flagged' },
];

export const claimDetail = {
  id: 'CLM-2026-04-018472',
  status: 'flagged',
  score: 32,
  submitted: '2026.04.27',
  hospital: '강남24시동물의료센터',
  hospitalId: 'HOSP-04821',
  patient: 'ANON-7392 · Maltese · 5세 · 4.2kg · 중성화 O',
  diagnosis: 'L80.0 — 단순 알레르기성 피부염',
  total: 1610000,
  coverage: 1127000,
  oop: 483000,
  processed: '2026.04.27 14:18 KST',
  confidence: 96.4,
  reviewer: '미배정',
  lines: [
    { code: 'C-1010', name: '진료상담 (수의사 1차)', unit: 45000, qty: 1, total: 45000, p50: 42000, dev: 7, flagged: false },
    { code: 'L-2104', name: '혈액검사 (CBC + 생화학)', unit: 185000, qty: 1, total: 185000, p50: 178000, dev: 4, flagged: false },
    { code: 'L-3082', name: '피부 세포검사', unit: 95000, qty: 1, total: 95000, p50: 92000, dev: 3, flagged: false },
    { code: 'P-3201', name: 'MRI 전신 검사', unit: 1250000, qty: 1, total: 1250000, p50: 780000, dev: 60, flagged: true },
    { code: 'C-5012', name: '처치료', unit: 35000, qty: 1, total: 35000, p50: 32000, dev: 9, flagged: false },
  ],
  flags: [
    {
      n: 1, sev: 'critical', title: '시술-진단 부적합', en: 'Procedure not indicated for diagnosis',
      diag: 'L80.0 단순 알레르기성 피부염', proc: 'P-3201 MRI 전신 검사',
      body: 'AAHA 2025 가이드라인은 단순 피부염에 대해 MRI를 1차 검사로 권장하지 않으며, 피부 세포검사 및 알레르기 검사 시도 후 영상 검사를 고려하도록 명시함.',
      cites: ['AAHA Diagnostic Imaging Guidelines 2025, §4.2', 'WSAVA Dermatology Consensus 2024, p. 38']
    },
    {
      n: 2, sev: 'warning', title: '가격 이상치', en: 'Price outlier vs regional distribution',
      diag: 'P-3201 MRI 전신 검사', proc: '서울 지역 P95 = ₩980,000',
      body: '이 청구는 P98 위치이며 동일 시술 코드의 동급 병원 평균 대비 +60%. 최근 90일간 동일 병원에서 P95 초과 청구가 38건 누적되었음.',
      cites: ['NuvoVet Regional Pricing Index — 서울 영상의학', '동급 병원 87곳 비교 데이터']
    },
    {
      n: 3, sev: 'info', title: '병원 패턴 알림', en: 'Hospital pattern signal',
      diag: '강남24시동물의료센터', proc: 'MRI 전신 검사',
      body: '이 병원의 MRI 청구율은 동급 병원(대형 종합) 평균 대비 +340%. 최근 30일 누적 38건 발생.',
      cites: ['NuvoVet Hospital Benchmark — Tier 1 위험 등급']
    },
  ]
};

export const hospitals = [
  { id: 'HOSP-04821', name: '서울 강남 24시동물의료센터', region: '서울 강남구', tier: '대형 종합', emr: 'CLAiR', vol: 482, avg: 1247000, peer: 82, flag: 18.3, risk: 78 },
  { id: 'HOSP-02184', name: '한국동물병원그룹 본원', region: '서울 송파구', tier: '대형 종합', emr: '인투벳', vol: 614, avg: 642000, peer: -6, flag: 3.8, risk: 22 },
  { id: 'HOSP-04102', name: '청담우리펫메디컬센터', region: '서울 강남구', tier: '중형', emr: 'CLAiR', vol: 318, avg: 894000, peer: 31, flag: 11.2, risk: 64 },
  { id: 'HOSP-04823', name: '강북 24시동물의료원', region: '서울 강북구', tier: '대형 종합', emr: '우리엔', vol: 412, avg: 1102000, peer: 61, flag: 14.7, risk: 71 },
  { id: 'HOSP-03210', name: '분당펫스퀘어동물병원', region: '경기 성남시', tier: '중형', emr: '인투벳', vol: 287, avg: 614000, peer: -10, flag: 4.1, risk: 28 },
  { id: 'HOSP-05011', name: '해운대 24시 동물병원', region: '부산 해운대구', tier: '대형 종합', emr: '베터', vol: 364, avg: 891000, peer: 18, flag: 7.8, risk: 45 },
  { id: 'HOSP-02441', name: '광진 어린이펫의료센터', region: '서울 광진구', tier: '소형', emr: '이지벳', vol: 198, avg: 312000, peer: -8, flag: 3.2, risk: 19 },
  { id: 'HOSP-06104', name: '대구 북부 동물의료원', region: '대구 북구', tier: '중형', emr: '우리엔', vol: 241, avg: 718000, peer: 12, flag: 6.4, risk: 52 },
  { id: 'HOSP-03104', name: '인천 송도 펫메디컬', region: '인천 연수구', tier: '중형', emr: 'CLAiR', vol: 268, avg: 658000, peer: 4, flag: 4.8, risk: 31 },
  { id: 'HOSP-05102', name: '부산 서면 동물의료원', region: '부산 부산진구', tier: '대형 종합', emr: '인투벳', vol: 401, avg: 982000, peer: 47, flag: 12.4, risk: 67 },
  { id: 'HOSP-04918', name: '대전 유성동물의료원', region: '대전 유성구', tier: '대형 종합', emr: '베터', vol: 298, avg: 1018000, peer: 52, flag: 13.1, risk: 69 },
  { id: 'HOSP-02601', name: '서대문우리동물병원', region: '서울 서대문구', tier: '소형', emr: '이지벳', vol: 142, avg: 384000, peer: 0, flag: 4.2, risk: 24 },
  { id: 'HOSP-03301', name: '수원 영통 펫메디컬', region: '경기 수원시', tier: '중형', emr: 'CLAiR', vol: 234, avg: 712000, peer: 14, flag: 6.9, risk: 48 },
  { id: 'HOSP-02702', name: '성동 24시 동물의료원', region: '서울 성동구', tier: '대형 종합', emr: '우리엔', vol: 387, avg: 1142000, peer: 67, flag: 16.2, risk: 74 },
  { id: 'HOSP-05201', name: '울산 남구 동물의료센터', region: '울산 남구', tier: '중형', emr: '베터', vol: 184, avg: 698000, peer: 8, flag: 5.4, risk: 36 },
  { id: 'HOSP-03511', name: '의정부 24시 펫메디컬', region: '경기 의정부시', tier: '대형 종합', emr: '인투벳', vol: 312, avg: 924000, peer: 38, flag: 10.1, risk: 58 },
  { id: 'HOSP-04302', name: '광주 동구 동물의료원', region: '광주 동구', tier: '중형', emr: 'CLAiR', vol: 198, avg: 612000, peer: -2, flag: 4.0, risk: 26 },
  { id: 'HOSP-02901', name: '동대문우리동물병원', region: '서울 동대문구', tier: '소형', emr: '이지벳', vol: 167, avg: 428000, peer: 9, flag: 8.4, risk: 51 },
  { id: 'HOSP-03402', name: '안양 평촌 펫의료원', region: '경기 안양시', tier: '중형', emr: '우리엔', vol: 221, avg: 678000, peer: 6, flag: 5.1, risk: 33 },
  { id: 'HOSP-05301', name: '제주 시청 동물의료원', region: '제주 제주시', tier: '소형', emr: '베터', vol: 124, avg: 542000, peer: -4, flag: 4.7, risk: 29 },
];

export const anomalies = [
  { id: 'CLM-2026-04-018472', sev: 'critical', amt: 1610000, hospital: '강남24시동물의료센터', flags: ['시술-진단 부적합: 단순 피부염에 MRI 전신 검사', '가격 이상치: P-3201 시장가 P98 위치'], elapsed: '2분 전' },
  { id: 'CLM-2026-04-018452', sev: 'critical', amt: 2180000, hospital: '강북 24시동물의료원', flags: ['중복 청구 의심: 동일 시술코드 4회 반복', '병원 패턴: 야간 청구 비율 +280%'], elapsed: '14분 전' },
  { id: 'CLM-2026-04-018443', sev: 'warning', amt: 1420000, hospital: '해운대 24시 동물병원', flags: ['가격 이상치: CT 전신 P95 초과', '시술 빈도 이상: 동일 환자 30일 내 3회'], elapsed: '32분 전' },
  { id: 'CLM-2026-04-018403', sev: 'critical', amt: 1280000, hospital: '대전 유성동물의료원', flags: ['시술-진단 부적합: 단순 외이염에 두부 MRI', '가이드라인 위반: ACVIM 2024 §3.1'], elapsed: '1시간 전' },
  { id: 'CLM-2026-04-018395', sev: 'warning', amt: 894000, hospital: '청담우리펫메디컬센터', flags: ['가격 이상치: 혈액검사 패키지 +47%'], elapsed: '1시간 전' },
  { id: 'CLM-2026-04-018388', sev: 'info', amt: 412000, hospital: '동대문우리동물병원', flags: ['청구 시간 패턴: 02:34 자정 이후 청구'], elapsed: '2시간 전' },
  { id: 'CLM-2026-04-018382', sev: 'warning', amt: 1108000, hospital: '성동 24시 동물의료원', flags: ['병원 패턴: MRI 청구율 동급 +210%', '가격 이상치: P75 초과'], elapsed: '2시간 전' },
  { id: 'CLM-2026-04-018375', sev: 'critical', amt: 1740000, hospital: '의정부 24시 펫메디컬', flags: ['시술-진단 부적합: 단순 구토에 복부 CT', '중복 청구: 마취료 2회 청구'], elapsed: '3시간 전' },
  { id: 'CLM-2026-04-018368', sev: 'info', amt: 218000, hospital: '광진 어린이펫의료센터', flags: ['가벼운 코딩 오류: KCD-V 코드 불일치 가능성'], elapsed: '3시간 전' },
  { id: 'CLM-2026-04-018361', sev: 'warning', amt: 762000, hospital: '부산 서면 동물의료원', flags: ['가격 이상치: P-2104 P90 초과', '환자 이력: 동일 시술 60일 내 2회'], elapsed: '4시간 전' },
];

export const procedureCategories = [
  { id: 'all', name: '전체 시술', count: 4930, level: 0 },
  { id: 'consult', name: '진료 상담', count: 12, level: 1 },
  { id: 'imaging', name: '영상의학', count: 47, level: 1, expanded: true },
  { id: 'imaging-xray', name: 'X-ray', count: 12, level: 2 },
  { id: 'imaging-us', name: '초음파', count: 18, level: 2 },
  { id: 'imaging-ct', name: 'CT', count: 8, level: 2 },
  { id: 'imaging-mri', name: 'MRI', count: 9, level: 2, active: true },
  { id: 'lab', name: '임상병리', count: 134, level: 1 },
  { id: 'surgery', name: '외과', count: 218, level: 1, expanded: true },
  { id: 'surgery-ortho', name: '정형외과', count: 47, level: 2 },
  { id: 'surgery-soft', name: '연부조직', count: 89, level: 2 },
  { id: 'surgery-other', name: '기타 외과', count: 82, level: 2 },
  { id: 'medical', name: '내과 처치', count: 156, level: 1 },
  { id: 'dental', name: '치과', count: 38, level: 1 },
  { id: 'eye', name: '안과', count: 29, level: 1 },
  { id: 'derm', name: '피부과', count: 24, level: 1 },
];

export const mriProcedures = [
  { code: 'P-3201', name: 'MRI 전신 검사', en: 'Whole-body MRI imaging', p: [580, 780, 920, 980], count: 1847, hospitals: 47 },
  { code: 'P-3202', name: 'MRI 두부 검사', en: 'Brain / head MRI', p: [420, 580, 720, 840], count: 1284, hospitals: 52 },
  { code: 'P-3203', name: 'MRI 척추 검사', en: 'Spine MRI', p: [380, 520, 680, 790], count: 894, hospitals: 38 },
  { code: 'P-3204', name: 'MRI 복부 검사', en: 'Abdominal MRI', p: [450, 610, 790, 880], count: 612, hospitals: 31 },
  { code: 'P-3205', name: 'MRI 관절 — 슬관절', en: 'Stifle joint MRI', p: [320, 480, 620, 740], count: 487, hospitals: 28 },
  { code: 'P-3206', name: 'MRI 관절 — 견관절', en: 'Shoulder joint MRI', p: [310, 470, 610, 720], count: 384, hospitals: 24 },
  { code: 'P-3207', name: 'MRI 조영제 검사', en: 'Contrast-enhanced MRI', p: [180, 240, 320, 410], count: 1124, hospitals: 41 },
];

export const reports = [
  { q: 'Q1 2026', title: '청구 인텔리전스 리포트', claims: 38847, pages: 52, date: '2026.04.18', tags: ['정기', 'Q1', '2026'] },
  { q: 'Q4 2025', title: '청구 인텔리전스 리포트', claims: 32184, pages: 47, date: '2026.01.15', tags: ['정기', 'Q4', '2025'] },
  { q: '특별', title: '2026 봄 시즌 분석', claims: 14210, pages: 28, date: '2026.04.02', tags: ['특별', '시즌'] },
  { q: '특별', title: '표준수가제 영향 분석', claims: 0, pages: 36, date: '2026.03.21', tags: ['특별', '정책'] },
  { q: 'Q3 2025', title: '청구 인텔리전스 리포트', claims: 28940, pages: 45, date: '2025.10.18', tags: ['정기', 'Q3', '2025'] },
  { q: '임원', title: 'CEO 임원 브리핑 — 2025 연간 요약', claims: 124800, pages: 18, date: '2026.01.28', tags: ['임원', '연간'] },
  { q: 'Q2 2025', title: '청구 인텔리전스 리포트', claims: 26410, pages: 43, date: '2025.07.20', tags: ['정기', 'Q2', '2025'] },
  { q: '특별', title: 'MRI/CT 청구 심층 분석', claims: 8420, pages: 32, date: '2025.06.14', tags: ['특별', '영상의학'] },
  { q: 'Q1 2025', title: '청구 인텔리전스 리포트', claims: 24180, pages: 41, date: '2025.04.16', tags: ['정기', 'Q1', '2025'] },
  { q: '액추어리', title: '액추어리 데이터팩 — 2025 H1', claims: 50590, pages: 24, date: '2025.07.30', tags: ['액추어리', '데이터'] },
  { q: 'Q4 2024', title: '청구 인텔리전스 리포트', claims: 21847, pages: 39, date: '2025.01.20', tags: ['정기', 'Q4', '2024'] },
  { q: '특별', title: '대형 종합 병원 위험 패턴', claims: 12480, pages: 30, date: '2024.11.18', tags: ['특별', '병원'] },
];

export const users = [
  { name: '이지훈', email: 'lee.jihun@kbinsure.co.kr', role: '액추어리 부장', dept: '펫보험팀', last: '2분 전', status: 'active' },
  { name: '박서연', email: 'park.seoyeon@kbinsure.co.kr', role: '청구 분석가', dept: '펫보험팀', last: '1시간 전', status: 'active' },
  { name: '김도현', email: 'kim.dohyun@kbinsure.co.kr', role: '시니어 인수심사역', dept: '인수심사부', last: '어제', status: 'active' },
  { name: '최예린', email: 'choi.yerin@kbinsure.co.kr', role: '청구 검토자', dept: '펫보험팀', last: '3시간 전', status: 'active' },
  { name: '정민준', email: 'jung.minjun@kbinsure.co.kr', role: '데이터 엔지니어', dept: 'IT기획부', last: '어제', status: 'active' },
  { name: '윤서아', email: 'yoon.seoa@kbinsure.co.kr', role: '액추어리', dept: '펫보험팀', last: '5분 전', status: 'active' },
  { name: '강태현', email: 'kang.taehyun@kbinsure.co.kr', role: '청구 분석가', dept: '펫보험팀', last: '2일 전', status: 'invited' },
  { name: '한지우', email: 'han.jiwoo@kbinsure.co.kr', role: '뷰어', dept: '경영전략부', last: '1주 전', status: 'active' },
  { name: '오현우', email: 'oh.hyunwoo@kbinsure.co.kr', role: '시니어 분석가', dept: '리스크관리부', last: '4시간 전', status: 'active' },
  { name: '서민지', email: 'seo.minji@kbinsure.co.kr', role: '청구 검토자', dept: '펫보험팀', last: '비활성 30일', status: 'inactive' },
];
