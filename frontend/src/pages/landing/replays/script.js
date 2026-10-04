/**
 * Content of the hero replays. The DUR replay re-enacts EMR demo visit V1 (초코, src/portfolio/emr/
 * fixtures.js): its text is the engine's output for that visit (rule MDR1_PGP_ML). The Claims
 * replay reads the synthetic hero claim (heroClaim.json), so every amount on it is the engine's.
 */
import heroClaim from '../../insurance/preview/heroClaim.json'

export const DUR_PATIENT = {
  id: '1042',
  name: '초코',
  no: '#1042',
  signalment: ['개', '러프 콜리', '중성화 수컷', '4y 4m'],
  weight: '24.0',
  guardian: '이○○',
  complaint: '2주 전부터 얼굴·앞다리 탈모와 각질, 귀 가려움',
  vitals: [['체온', '38.7', '°C'], ['심박', '96', 'bpm'], ['호흡', '24', '/분'], ['BCS', '5/9', '']],
  dx: [['D-DERM-012', '전신성 모낭충증'], ['D-EAR-004', '말라세지아 외이염·피부염']],
  insurance: '가상 펫보험 · 표준형',
}

export const DUR_ROWS = {
  keto: { id: 'keto', folder: '피부', code: 'RX-KTZ-T200', name: '케토코나졸 정 200 mg (정)', unit: 'mg/kg', qty: '5', calc: '120 mg', tt: '2', dy: '21', rt: 'PO', total: '5,040 mg', price: '29,400원' },
  ivm: { id: 'ivm', folder: '기생충', code: 'RX-IVM-SOL10', name: '이버멕틴 경구액 10 mg/mL (액)', unit: 'mcg/kg', qty: '300', calc: '7.2 mg (0.72 mL)', tt: '1', dy: '7', rt: 'PO', total: '50.4 mg', price: '7,000원' },
}

export const DUR_SEARCH = { query: '이버멕틴', results: ['이버멕틴 경구액 10 mg/mL (액)', '이버멕틴 츄어블 272 mcg (정)'] }

export const DUR_CARD = {
  severity: '금기',
  category: '품종·유전자',
  drugs: '이버멕틴 + 케토코나졸',
  summary: 'MDR1 위험견에게 고용량 이버멕틴 + P-gp 억제제 병용',
  factors: '콜리: MDR1 위험 높음 · ABCB1 유전자형: 미검사',
  consequence: '이버멕틴은 정상적으로 P-당단백질에 의해 뇌로 들어가지 못합니다. 이 수송체가 없거나 억제되면 이버멕틴이 뇌에 도달해 운동실조, 떨림, 산동이 나타날 수 있습니다.',
  verdict: '현재 처방대로 조제하지 마십시오',
  suggestion: '이버멕틴 삭제',
  rules: 19,
}

/** Waitlist rows shown beside the chart (fictional; ids match the EMR demo's photos). */
export const WAITLIST = [
  { id: '1042', name: '초코', sp: '개 · 러프 콜리', reason: '피부 각질·탈모 재진', time: '09:10', state: '진료중' },
  { id: '0877', name: '콩이', sp: '개 · 시츄', reason: '발작 약 재처방', time: '09:25', state: '대기' },
  { id: '1310', name: '나비', sp: '고양이 · 코리안숏헤어', reason: '체중 감소·다음다뇨', time: '09:40', state: '대기' },
  { id: '1455', name: '모찌', sp: '고양이 · 코리안숏헤어', reason: '외부기생충 예방', time: '10:05', state: '대기' },
  { id: '0921', name: '대박', sp: '개 · 래브라도', reason: '구토·피부 상처', time: '10:20', state: '대기' },
  { id: '1502', name: '보리', sp: '개 · 말티즈', reason: '기침·관절 통증', time: '10:45', state: '대기' },
  { id: '0650', name: '해피', sp: '개 · 골든 리트리버', reason: '파행·가려움', time: '11:00', state: '대기' },
]

/** The ten EMR demo patients for the landing gallery (visit, chart number, what the visit shows). */
export const GALLERY = [
  { visit: 'V1', id: '1042', name: '초코', sp: '러프 콜리', story: 'MDR1 위험견 + 이버멕틴', tone: 'crit' },
  { visit: 'V2', id: '0877', name: '콩이', sp: '시츄', story: '효소 유도로 사이클로스포린 농도 저하', tone: 'mod' },
  { visit: 'V3', id: '1310', name: '나비', sp: '코리안숏헤어', story: '신장병 고양이의 메티마졸', tone: 'mod' },
  { visit: 'V4', id: '1455', name: '모찌', sp: '코리안숏헤어', story: '고양이에게 퍼메트린', tone: 'crit' },
  { visit: 'V5', id: '0921', name: '대박', sp: '래브라도', story: '규칙상 문제 없음', tone: 'ok' },
  { visit: 'V6', id: '1502', name: '보리', sp: '말티즈', story: '신장병 개의 NSAID', tone: 'mod' },
  { visit: 'V7', id: '0650', name: '해피', sp: '골든 리트리버', story: 'NSAID + 스테로이드, 세로토닌', tone: 'major' },
  { visit: 'V8', id: '1388', name: '레오', sp: '러시안 블루', story: '고양이 망막 한계 넘는 엔로플록사신', tone: 'major' },
  { visit: 'V9', id: '1620', name: '두부', sp: '푸들', story: '뇌전증 개에게 플루옥세틴', tone: 'crit' },
  { visit: 'V10', id: '1733', name: '코코', sp: '비글', story: '페니실린 알레르기 기록', tone: 'major' },
]

export const SEVERITY_WORD = { crit: '금기', major: '중대', mod: '주의', ok: '문제 없음' }

// ── Claims ──────────────────────────────────────────────────────────────────

const isActionable = (f) => f.severity !== 'info'

export const CLAIM = heroClaim

/** Lines with their actionable findings (by standard code). */
export const CLAIM_LINES = heroClaim.lines.map((l, i) => {
  const findings = heroClaim.findings.filter((f) => l.code && f.item_ref === l.code && isActionable(f))
  return {
    key: `${i}`,
    raw: l.description,
    code: l.code,
    codeName: l.code_name,
    qty: l.quantity,
    total: l.total,
    risk: findings.reduce((s, f) => s + (f.amount_at_risk || 0), 0),
    severity: findings.some((f) => f.severity === 'critical') ? 'critical' : findings.length ? 'warning' : null,
  }
})

/** The findings list, largest amount at risk first. */
export const CLAIM_FINDINGS = heroClaim.findings
  .filter(isActionable)
  .slice()
  .sort((a, b) => (b.amount_at_risk || 0) - (a.amount_at_risk || 0))

/** Payout ledger rows: label, amount, sign. */
export const CLAIM_LEDGER = (() => {
  const p = heroClaim.payable
  return [
    { key: 'billed', label: '청구 금액', value: p.billed, sign: '' },
    { key: 'deductible', label: '자기부담 공제', value: p.deductible, sign: '−' },
    { key: 'copay', label: '보장 비율 외 부담', value: p.copay_amount, sign: '−' },
    { key: 'limit', label: '연간 한도 초과', value: p.limit_reduction, sign: '−' },
    { key: 'reimbursed', label: '지급 예정', value: p.reimbursed, sign: '', total: true },
  ]
})()

export const fmtWon = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`
