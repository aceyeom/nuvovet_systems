/**
 * The host's signed-in user and its 진료기록 line for an overridden DUR card (EMR popup spec §3.10).
 * The chart line is host chrome, so it uses the EMR's own `·` field separators.
 */

export const USER = { id: 'Practitioner/demo-kim', display: '김민서 (가상)' }

const SEVERITY_KO = { contraindicated: '금기', major: '중대', moderate: '주의', minor: '경미' }

/** "DUR 금기 1건 예외 처리 (NV-J2) · 김민서 (가상) 14:32 · 규칙 MDR1_PGP_ML@1.1.0 · 엔진 1.2.0" */
export function chartLine(entry) {
  const ext = entry.extension || {}
  const t = new Date(entry.outcomeTimestamp)
  const hhmm = Number.isNaN(t.getTime()) ? '' : `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
  const code = entry.overrideReason?.reason?.code ?? ''
  const rules = (ext.ruleIds || []).map((r) => `${r}@${ext.ruleVersion}`).join(', ')
  return `DUR ${SEVERITY_KO[ext.severity] ?? ext.severity} 1건 예외 처리 (${code}) · ${USER.display} ${hhmm} · 규칙 ${rules} · 엔진 ${ext.engineVersion}`
}
