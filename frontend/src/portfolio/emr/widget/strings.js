/**
 * Widget chrome copy, KO / EN (EMR popup spec §3.11). Clinical text always comes from the
 * engine (card fields are already localised by cards.js); these strings are the frame around it.
 *
 * Copy rules: no em dash anywhere; never "안전" / "safe"; the formal "~하십시오" only in the two
 * species lines that instruct the vet. Keys beyond the §3.11 table are marked "(widget)".
 */

export const STRINGS = {
  ko: {
    'panel.title': 'NuvoVet DUR',
    'panel.region': 'NuvoVet DUR 처방 검토',
    'panel.rules': '규칙 {n}개',
    'panel.empty': '처방을 입력하면 검토합니다',
    'panel.minimise': '검토 패널 접기', // (widget)
    'panel.expand': '검토 패널 펼치기', // (widget)
    'panel.close': '검토 패널 닫기', // (widget)
    'verdict.none': '규칙상 문제 없음',
    'verdict.incomplete': '검토 불완전',
    'verdict.incompleteChip': '검토 불완전 {n}', // (widget) §3.7.1 chip
    'counts.doseChecks': '투여량 확인 {n}',
    'group.confirm': '확인 필요',
    'chip.recognised': '자유 입력에서 인식: 확인',
    'chip.fix': '차트에서 수정', // (widget)
    'chip.stale': '검사 결과 확인', // (widget)
    'chip.choose': '적응증 선택', // (widget) label of the protocol select
    'notes.title': '투약 안내',
    'card.patient': '이 환자에서',
    'card.recommend': '권장',
    'card.details': '자세히',
    'card.more': '더 보기', // (widget) consequence clamp
    'card.less': '접기', // (widget)
    'card.mechanism': '기전', // (widget) detail heading
    'card.alternatives': '대안', // (widget)
    'card.allActions': '모든 권장', // (widget)
    'card.inputs': '입력값', // (widget)
    'card.rule': '규칙', // (widget)
    'card.evidence': '근거',
    'card.mechanistic': '기전 근거 (인용 연구 없음)',
    'card.jurisdiction.US': '미국 라벨 기준',
    'card.jurisdiction.UK': '영국 라벨 기준',
    'card.startDose': '시작 용량 기준',
    'card.edit': '처방 수정',
    'card.override': '예외 사유 입력',
    'card.overrideSubmit': '사유 기록', // (widget)
    'card.fixChart': '차트 수정', // (widget) submit label when NV-DATA is chosen
    'card.overridden': '예외 사유 기록됨 ({code})', // (widget)
    'card.ack': '확인함',
    'card.acknowledged': '확인함으로 기록됨', // (widget)
    'card.recommended': '권장', // (widget) suggestion suffix
    'card.notChecked': '검토 안 함', // (widget)
    'card.partly': '일부만', // (widget)
    'card.inClinic': '원내 투여 행은 삭제 제안이 없습니다', // (widget)
    'badge.related': '관련',
    'badge.inClinic': '원내',
    'badge.unmapped': '검토 안 함',
    'gate.title': '저장 전 확인이 필요한 처방 {n}건',
    'gate.close': '닫고 처방으로 돌아가기', // (widget) × aria-label
    'gate.back': '처방으로 돌아가기',
    'gate.proceed': '예외 처리하고 저장',
    'gate.reason': '예외 사유', // (widget) radiogroup legend
    'gate.comment': '코멘트',
    'gate.commentHint.contra': '8자 이상, 구체적으로',
    'gate.commentHint.optional': '선택 입력', // (widget)
    'gate.commentHint.other': '기타 사유는 8자 이상, 구체적으로', // (widget)
    'gate.owner': '보호자에게 위험을 설명함',
    'gate.more': '외 {n}건',
    'gate.confirm': '확인 필요 {n}건', // (widget) non-blocking line
    'gate.err.reason': '예외 사유를 선택하십시오.', // (widget)
    'gate.err.owner': '보호자 설명 여부를 확인하십시오.', // (widget)
    'gate.err.notAllowed': '이 소견에는 선택할 수 없는 사유입니다.', // (widget)
    'gate.dataHint': '차트를 수정하면 다시 검토합니다. 기록은 남지 않습니다.', // (widget)
    'gate.remaining': '사유를 입력할 처방 {n}건', // (widget)
    'coverage.checked': '검토함',
    'coverage.partial': '일부만',
    'coverage.notChecked': '검토 안 함',
    'coverage.unmapped': '처방집에 없는 제품', // (widget)
    'link.workbench': '전체 분석 열기',
    marker: '교육용 프로토타입',
    'marker.tooltip': '교육용 프로토타입입니다. 임상 검증을 거치지 않았으며 진료에 사용하지 마십시오. 모든 검토는 이 브라우저 안에서만 실행됩니다.',
    'species.unsupported': '지원하지 않는 종: 개·고양이만 검토합니다',
    'species.missing': '종 미입력: 환자 정보에서 종을 입력하십시오',
    'row.goto': '행으로 이동',
    launcher: 'DUR · {label}',
    'launcher.none': '문제 없음', // (widget)
    'launcher.empty': '대기', // (widget)
    'live.counts': '처방 검토: {list}', // (widget) live region
    'live.none': '처방 검토: 규칙상 문제 없음', // (widget)
    'live.incomplete': '처방 검토: 검토 불완전', // (widget)
    'count.n': '{label} {n}건', // (widget)
    'sheet.label': 'NuvoVet DUR 처방 검토', // (widget)
  },
  en: {
    'panel.title': 'NuvoVet DUR',
    'panel.region': 'NuvoVet DUR prescription review',
    'panel.rules': '{n} rules',
    'panel.empty': 'Add a prescription to start the review',
    'panel.minimise': 'Collapse the review panel',
    'panel.expand': 'Expand the review panel',
    'panel.close': 'Close the review panel',
    'verdict.none': 'No rule findings',
    'verdict.incomplete': 'Review incomplete',
    'verdict.incompleteChip': 'Incomplete {n}',
    'counts.doseChecks': 'Dose checks {n}',
    'group.confirm': 'Needs input',
    'chip.recognised': 'Recognised from free text: confirm',
    'chip.fix': 'Fix in chart',
    'chip.stale': 'Check results',
    'chip.choose': 'Choose the indication',
    'notes.title': 'Administration notes',
    'card.patient': 'In this patient',
    'card.recommend': 'Recommended',
    'card.details': 'Details',
    'card.more': 'Show more',
    'card.less': 'Show less',
    'card.mechanism': 'Mechanism',
    'card.alternatives': 'Alternatives',
    'card.allActions': 'All recommendations',
    'card.inputs': 'Inputs',
    'card.rule': 'Rule',
    'card.evidence': 'Evidence',
    'card.mechanistic': 'Mechanistic rationale (no study cited)',
    'card.jurisdiction.US': 'US label',
    'card.jurisdiction.UK': 'UK label',
    'card.startDose': 'Starting dose',
    'card.edit': 'Edit prescription',
    'card.override': 'Enter override reason',
    'card.overrideSubmit': 'Record reason',
    'card.fixChart': 'Fix the chart',
    'card.overridden': 'Override recorded ({code})',
    'card.ack': 'Acknowledge',
    'card.acknowledged': 'Acknowledged',
    'card.recommended': 'recommended',
    'card.notChecked': 'Not checked',
    'card.partly': 'Partly',
    'card.inClinic': 'In-clinic rows are never offered for removal',
    'badge.related': 'Related',
    'badge.inClinic': 'In clinic',
    'badge.unmapped': 'Not reviewed',
    'gate.title': '{n} prescription(s) need review before saving',
    'gate.close': 'Close and go back to the prescription',
    'gate.back': 'Back to prescription',
    'gate.proceed': 'Override and save',
    'gate.reason': 'Override reason',
    'gate.comment': 'Comment',
    'gate.commentHint.contra': 'At least 8 characters, specific',
    'gate.commentHint.optional': 'Optional',
    'gate.commentHint.other': 'For "Other", at least 8 characters, specific',
    'gate.owner': 'Risk explained to the owner',
    'gate.more': '{n} more',
    'gate.confirm': 'Needs input: {n}',
    'gate.err.reason': 'Choose an override reason.',
    'gate.err.owner': 'Confirm that the risk was explained to the owner.',
    'gate.err.notAllowed': 'This reason is not available for this finding.',
    'gate.dataHint': 'Fixing the chart re-runs the review. Nothing is logged.',
    'gate.remaining': '{n} prescription(s) still need a reason',
    'coverage.checked': 'Checked',
    'coverage.partial': 'Partly',
    'coverage.notChecked': 'Not checked',
    'coverage.unmapped': 'not in the formulary',
    'link.workbench': 'Open full analysis',
    marker: 'Educational prototype',
    'marker.tooltip': 'Educational prototype, not clinically validated. Do not use for patient care. Every check runs in this browser only.',
    'species.unsupported': 'Unsupported species: only dogs and cats are reviewed',
    'species.missing': 'Species missing: enter it in the patient record',
    'row.goto': 'Go to row',
    launcher: 'DUR · {label}',
    'launcher.none': 'No findings',
    'launcher.empty': 'Waiting',
    'live.counts': 'Prescription review: {list}',
    'live.none': 'Prescription review: no rule findings',
    'live.incomplete': 'Prescription review: incomplete',
    'count.n': '{n} {label}',
    'sheet.label': 'NuvoVet DUR prescription review',
  },
}

/** Severity words (badge text). The same words cards.js uses for row badges. */
export const SEVERITY_WORD = {
  ko: { contraindicated: '금기', major: '중대', moderate: '주의', minor: '경미' },
  en: { contraindicated: 'Contraindicated', major: 'Major', moderate: 'Moderate', minor: 'Minor' },
}

/** t(locale, key, params) → string with {name} placeholders filled. Unknown keys fall back to KO, then the key. */
export function t(locale, key, params) {
  const table = STRINGS[locale] || STRINGS.ko
  let s = table[key] ?? STRINGS.ko[key] ?? key
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] == null ? m : String(params[k])))
  return s
}

export const severityWord = (locale, level) => (SEVERITY_WORD[locale] || SEVERITY_WORD.ko)[level] ?? level

/** "금기 1 · 투여량 확인 1": non-zero counts only, severity order, then dose checks (§3.7.1). */
export function countsLine(locale, counts) {
  if (!counts) return ''
  const parts = []
  for (const lv of ['contraindicated', 'major', 'moderate', 'minor']) {
    if (counts[lv]) parts.push(locale === 'en' ? `${severityWord(locale, lv)} ${counts[lv]}` : `${severityWord(locale, lv)} ${counts[lv]}`)
  }
  if (counts.doseChecks) parts.push(t(locale, 'counts.doseChecks', { n: counts.doseChecks }))
  return parts.join(' · ')
}

/** Live-region sentence (§3.12): "처방 검토: 금기 1건, 주의 1건". */
export function liveSentence(locale, response) {
  if (!response) return ''
  const ext = response.extension
  if (!ext.supported) return t(locale, 'live.incomplete')
  const c = ext.counts
  const parts = ['contraindicated', 'major', 'moderate', 'minor'].filter((lv) => c[lv]).map((lv) => t(locale, 'count.n', { label: severityWord(locale, lv), n: c[lv] }))
  if (!parts.length) return ext.verdict.complete ? t(locale, 'live.none') : t(locale, 'live.incomplete')
  return t(locale, 'live.counts', { list: parts.join(', ') })
}
