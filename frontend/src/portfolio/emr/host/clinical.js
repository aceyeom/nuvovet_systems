/**
 * Host-only chart content for the fictional EMR (display data; the DUR never reads it).
 * Vitals, the reason for the visit, SOAP notes, earlier visits, vaccinations and insurance make the
 * demo chart read like a real one. Everything here is fictional and written for the ten demo visits;
 * the DUR inputs (patient, diagnoses, rows) stay in fixtures.js.
 */

/** Reception data for the waitlist: time, room, reason, state. */
export const RECEPTION = {
  V1: { time: '09:10', room: '진료 1', reason: '피부 각질·탈모 재진', state: 'active', wait: 0 },
  V2: { time: '09:25', room: '진료 2', reason: '발작 약 재처방', state: 'waiting', wait: 12 },
  V3: { time: '09:40', room: '진료 1', reason: '체중 감소·다음다뇨', state: 'waiting', wait: 18 },
  V4: { time: '10:05', room: '처치실', reason: '외부기생충 예방', state: 'waiting', wait: 25 },
  V5: { time: '10:20', room: '진료 3', reason: '구토·피부 상처', state: 'waiting', wait: 31 },
  V6: { time: '10:45', room: '진료 2', reason: '기침·관절 통증', state: 'waiting', wait: 40 },
  V7: { time: '11:00', room: '진료 1', reason: '파행·가려움', state: 'waiting', wait: 44 },
  V8: { time: '11:30', room: '진료 3', reason: '혈뇨·빈뇨', state: 'billing', wait: 0 },
  V9: { time: '13:40', room: '진료 2', reason: '불안·발작 이력', state: 'reserved', wait: 0 },
  V10: { time: '14:05', room: '진료 3', reason: '농피증', state: 'reserved', wait: 0 },
}

export const RECEPTION_STATE = {
  active: '진료중',
  waiting: '대기',
  billing: '수납',
  reserved: '예약',
}

const ins = (plan, status = '가입') => ({ plan, status })

/**
 * Per visit: vitals (T °C, HR bpm, RR /min, BCS /9, CRT s), weight history (kg, oldest first),
 * chief complaint, S/O/P notes, earlier visits, vaccinations, insurance, flags shown as chips.
 */
export const CLINICAL = {
  V1: {
    vitals: { temp: 38.7, hr: 96, rr: 24, bcs: 5, crt: '<2' },
    weights: [22.8, 23.4, 23.9, 24.0],
    complaint: '2주 전부터 얼굴·앞다리 탈모와 각질, 귀 가려움',
    notes: {
      S: '보호자: 2주 전부터 눈 주위와 앞다리 털이 빠지고 각질이 생김. 귀를 자주 긁고 머리를 흔듦. 식욕·활력 정상.',
      O: '안면·전지 다발성 탈모, 면포·각질. 심부 피부소파 검사에서 모낭충(Demodex canis) 다수(성충·충란). 양측 외이도 갈색 삼출물, 이도 세포검사 말라세지아 4+/HPF.',
      P: '이버멕틴 경구 증량 프로토콜 검토. 말라세지아 외이염에 케토코나졸 경구 21일. 2주 후 피부소파 재검. MDR1 유전자 검사 권유(보호자 상담 예정).',
    },
    history: [
      { date: '2026-08-22', title: '연간 건강검진', detail: 'CBC·생화학 정상 범위. 심장사상충 항원 음성.' },
      { date: '2026-03-10', title: '종합백신 추가접종', detail: 'DHPPL, 코로나 장염' },
      { date: '2025-11-02', title: '구토 1회', detail: '식이 조절 후 호전' },
    ],
    vaccines: [{ name: 'DHPPL', date: '2026-03-10', due: '2027-03' }, { name: '광견병', date: '2026-03-10', due: '2027-03' }],
    insurance: ins('가상 펫보험 · 표준형'),
  },
  V2: {
    vitals: { temp: 38.5, hr: 110, rr: 28, bcs: 6, crt: '<2' },
    weights: [5.6, 5.8, 6.0, 6.0],
    complaint: '항경련제 재처방, 최근 2개월 발작 없음 / 아토피 재발',
    notes: {
      S: '페노바르비탈 복용 중 최근 8주 발작 없음. 겨울 들어 발 핥기·겨드랑이 가려움 재발.',
      O: '신경학적 검사 정상. 양측 앞발 지간 홍반, 겨드랑이 태선화. 페노바르비탈 혈중농도 25 µg/mL (2026-09-12).',
      P: '페노바르비탈 유지. 아토피 관리 위해 사이클로스포린 시작, 초기 프레드니솔론 단기 병용. 4주 후 간수치·혈중농도 재검.',
    },
    history: [
      { date: '2026-09-12', title: '혈중농도 모니터링', detail: '페노바르비탈 25 µg/mL, ALT 82 U/L' },
      { date: '2026-04-03', title: '군발 발작 내원', detail: '디아제팜 직장 투여 후 안정' },
    ],
    vaccines: [{ name: 'DHPPL', date: '2026-02-14', due: '2027-02' }],
    insurance: ins('가상 펫보험 · 고급형'),
  },
  V3: {
    vitals: { temp: 38.9, hr: 228, rr: 32, bcs: 3, crt: '<2' },
    weights: [4.9, 4.6, 4.3, 4.1],
    complaint: '식욕은 많은데 체중이 계속 줄고 물을 많이 마심',
    notes: {
      S: '3개월간 체중 감소, 다음다뇨, 밤에 울음. 가끔 구토.',
      O: '갑상선 촉지(우측 결절). 심잡음 II/VI. T4 7.8 µg/dL(↑), 크레아티닌 2.0 mg/dL(↑), USG 1.018. 수축기 혈압 172 mmHg.',
      P: '메티마졸 저용량 시작, 암로디핀으로 혈압 조절, 구토에 마로피탄트. 2주 후 T4·신장수치·혈압 재평가.',
    },
    history: [
      { date: '2026-10-01', title: '혈액검사', detail: 'T4 7.8 µg/dL, 크레아티닌 2.0 mg/dL' },
      { date: '2025-12-19', title: '치석 제거', detail: '마취 전 검사 정상' },
    ],
    vaccines: [{ name: 'FVRCP', date: '2025-12-19', due: '2026-12' }],
    insurance: ins('미가입', '미가입'),
  },
  V4: {
    vitals: { temp: 38.6, hr: 168, rr: 30, bcs: 5, crt: '<2' },
    weights: [3.1, 3.5, 3.7, 3.8],
    complaint: '보호자가 개용 스팟온 사용 문의',
    notes: {
      S: '함께 사는 개에게 쓰던 스팟온을 고양이에게도 쓰려 함. 벼룩 의심.',
      O: '피모 양호, 벼룩 분변 소량. 활력 정상.',
      P: '외부기생충 예방제 처방. 보호자에게 제품 사용 설명.',
    },
    history: [{ date: '2026-06-02', title: '중성화 수술', detail: '합병증 없음' }],
    vaccines: [{ name: 'FVRCP', date: '2026-05-01', due: '2027-05' }],
    insurance: ins('가상 펫보험 · 표준형'),
  },
  V5: {
    vitals: { temp: 39.2, hr: 104, rr: 26, bcs: 6, crt: '<2' },
    weights: [28.4, 29.5, 30.1, 30.0],
    complaint: '어제부터 구토 2회, 옆구리 상처 진물',
    notes: {
      S: '산책 중 덤불에 긁힌 뒤 옆구리 상처. 어제 구토 2회, 오늘 식욕 감소.',
      O: '좌측 흉벽 3 cm 열상, 화농성 삼출물. 복부 촉진 시 경미한 불편감. 탈수 5% 미만.',
      P: '상처 세척·드레싱. 아목시실린-클라불란산 7일, 마로피탄트 2일. 3일 후 재진.',
    },
    history: [{ date: '2026-05-20', title: '건강검진', detail: '특이사항 없음' }],
    vaccines: [{ name: 'DHPPL', date: '2026-01-30', due: '2027-01' }, { name: '광견병', date: '2026-01-30', due: '2027-01' }],
    insurance: ins('가상 펫보험 · 표준형'),
  },
  V6: {
    vitals: { temp: 38.4, hr: 152, rr: 38, bcs: 4, crt: '2' },
    weights: [3.5, 3.4, 3.3, 3.2],
    complaint: '밤에 기침이 늘고 뒷다리를 절음',
    notes: {
      S: '수면 중 호흡수 증가, 밤 기침. 계단 오르기 거부.',
      O: '심잡음 IV/VI (좌측 심첨부). 흉부 방사선: 좌심방 확장. 크레아티닌 2.1 mg/dL (IRIS 2). 고관절·슬관절 통증 반응.',
      P: '심부전 약(푸로세미드, 피모벤단, 베나제프릴) 유지·조정. 관절 통증에 NSAID 검토. 1주 후 신장수치·전해질 재검.',
    },
    history: [
      { date: '2026-09-29', title: '혈액검사', detail: '크레아티닌 2.1 mg/dL, K 4.1 mmol/L' },
      { date: '2026-07-15', title: '심장 초음파', detail: 'MMVD stage B2' },
    ],
    vaccines: [{ name: 'DHPPL', date: '2025-08-08', due: '2026-08 (지남)' }],
    insurance: ins('가상 펫보험 · 시니어형'),
  },
  V7: {
    vitals: { temp: 38.8, hr: 100, rr: 26, bcs: 7, crt: '<2' },
    weights: [27.0, 27.6, 28.1, 28.0],
    complaint: '산책 후 뒷다리 파행, 발 가려움, 병원에서 매우 불안',
    notes: {
      S: '2주 전부터 산책 후 우측 후지 파행. 발 핥기 심해짐. 내원 시 심한 헐떡임·떨림.',
      O: '우측 슬관절 염발음, 통증 반응. 지간 홍반. 내원 스트레스로 진찰 제한.',
      P: '관절통에 카프로펜, 가려움에 프레드니솔론 단기. 통증 보조로 트라마돌, 다음 내원 전 트라조돈. 2주 후 재평가.',
    },
    history: [{ date: '2026-02-17', title: '건강검진', detail: '과체중(BCS 7) 식이 상담' }],
    vaccines: [{ name: 'DHPPL', date: '2026-02-17', due: '2027-02' }],
    insurance: ins('가상 펫보험 · 고급형'),
  },
  V8: {
    vitals: { temp: 39.0, hr: 196, rr: 34, bcs: 5, crt: '<2' },
    weights: [3.6, 3.6, 3.5, 3.5],
    complaint: '화장실을 자주 가고 소변에 피가 섞임',
    notes: {
      S: '2일 전부터 빈뇨, 혈뇨. 화장실에서 울음.',
      O: '방광 소형, 촉진 시 통증. 요검사: 세균뇨, 백혈구 다수. 배양 의뢰.',
      P: '엔로플록사신 10일, 통증에 멜록시캄 1회 주사. 배양 결과 후 항생제 조정.',
    },
    history: [{ date: '2025-10-30', title: '특발성 방광염', detail: '식이·환경 관리로 호전' }],
    vaccines: [{ name: 'FVRCP', date: '2026-07-01', due: '2027-07' }],
    insurance: ins('가상 펫보험 · 표준형'),
  },
  V9: {
    vitals: { temp: 38.6, hr: 118, rr: 28, bcs: 5, crt: '<2' },
    weights: [7.6, 7.8, 8.0, 8.0],
    complaint: '분리불안 상담 / 뇌전증 약 복용 중',
    notes: {
      S: '보호자 외출 시 짖음·파괴 행동. 항경련제 복용 중 3개월 발작 없음.',
      O: '신경학적 검사 정상. 행동 평가상 분리불안 의심.',
      P: '행동 수정 교육과 함께 플루옥세틴 검토. 페노바르비탈 유지.',
    },
    history: [{ date: '2026-07-03', title: '발작 내원', detail: '페노바르비탈 시작' }],
    vaccines: [{ name: 'DHPPL', date: '2025-11-03', due: '2026-11' }],
    insurance: ins('미가입', '미가입'),
  },
  V10: {
    vitals: { temp: 39.1, hr: 112, rr: 26, bcs: 5, crt: '<2' },
    weights: [11.4, 11.8, 12.0, 12.0],
    complaint: '배와 겨드랑이에 고름 같은 뾰루지',
    notes: {
      S: '1주 전부터 복부 구진·농포, 가려움.',
      O: '복부·액와 표재성 농피증. 세포검사 구균·호중구.',
      P: '전신 항생제 7일, 클로르헥시딘 샴푸. 페니실린 알레르기 기록 재확인.',
    },
    history: [{ date: '2025-05-11', title: '약물 반응', detail: '아목시실린 투여 후 안면 부종(페니실린 알레르기 기록)' }],
    vaccines: [{ name: 'DHPPL', date: '2026-09-09', due: '2027-09' }],
    insurance: ins('가상 펫보험 · 표준형'),
  },
}

/** Reference ranges for the vitals strip (dog / cat), to flag values outside them. */
const VITAL_RANGE = {
  Canine: { temp: [37.8, 39.2], hr: [60, 140], rr: [10, 30] },
  Feline: { temp: [37.8, 39.2], hr: [140, 220], rr: [20, 30] },
}

/** 'high' | 'low' | null for one vital. */
export function vitalFlag(species, key, value) {
  const r = VITAL_RANGE[species]?.[key]
  if (!r || value == null) return null
  if (value > r[1]) return 'high'
  if (value < r[0]) return 'low'
  return null
}

export const clinicalFor = (visitId) => CLINICAL[visitId] || null
