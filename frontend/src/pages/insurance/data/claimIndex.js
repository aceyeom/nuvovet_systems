// Per-claim facts the list endpoint does not return. Shape: { [claim_id]: { r?, u?, d? } } where
//   r  검토 대상 금액 (risk-category findings only, backend RISK_CATEGORIES)
//   u  the distinct rule IDs that fired
//   d  the Korean diagnosis name when the claim's raw diagnosis text is not Korean ("Otitis externa")
import { claimAtRisk } from '../preview/model.js'

const HANGUL = /[가-힣]/

export function buildClaimIndex(snapshot) {
  const out = {}
  for (const c of snapshot.claims) {
    const a = snapshot.details[c.claim_id]?.adjudication || {}
    const findings = a.findings || []
    const e = {}
    const r = claimAtRisk(findings)
    if (r) e.r = r
    if (findings.length) e.u = [...new Set(findings.map((f) => f.rule))]
    const ko = a.diagnoses?.[0]?.name_ko
    if (c.diagnosis && !HANGUL.test(c.diagnosis) && ko) e.d = ko
    if (Object.keys(e).length) out[c.claim_id] = e
  }
  return out
}

export const atRiskOf = (index, id) => index[id]?.r || 0
export const rulesOf = (index, id) => index[id]?.u || []
/** Korean display name of a claim row's diagnosis (the raw text when it is already Korean). */
export const diagnosisOf = (index, c) => {
  if (!c.diagnosis || c.diagnosis === '(진단명 없음)') return null
  return index[c.claim_id]?.d || c.diagnosis
}
