// Pure derivations for the console screens (DESIGN_SYSTEM.md §5.3). No React, no network.
import { atRiskOf, rulesOf } from './data/claimIndex.js'

/** 처리 대상 = 서류 요청 + 심사 필요 + 거절 권고 (the sidebar count, §5.3). */
export const openCount = (decisions = {}) => (decisions.pend || 0) + (decisions.review || 0) + (decisions.deny_recommended || 0)

const VIEW_TEST = {
  open: (c) => c.decision !== 'auto_approve',
  pend: (c) => c.decision === 'pend',
  review: (c) => c.decision === 'review',
  deny: (c) => c.decision === 'deny_recommended',
  auto: (c) => c.decision === 'auto_approve',
  all: () => true,
}
export const VIEW_IDS = Object.keys(VIEW_TEST)
export const normalizeView = (v) => (VIEW_TEST[v] ? v : 'open')

export function viewCounts(claims) {
  const out = {}
  for (const id of VIEW_IDS) out[id] = claims.filter(VIEW_TEST[id]).length
  return out
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, '')

/** Filters the queue: saved view, free text (청구 ID · 병원 · 진단), 보험사, 채널, rule ID. */
export function filterClaims(claims, { view = 'open', q = '', insurer = '', channel = '', rule = '' } = {}, index = {}) {
  const test = VIEW_TEST[normalizeView(view)]
  const needle = norm(q)
  return claims.filter(
    (c) =>
      test(c) &&
      (!insurer || c.insurer === insurer) &&
      (!channel || c.intake_channel === channel) &&
      (!rule || rulesOf(index, c.claim_id).includes(rule)) &&
      (!needle || norm(c.claim_id).includes(needle) || norm(c.clinic).includes(needle) || norm(c.diagnosis).includes(needle)),
  )
}

/**
 * Flagged rows carry a high-severity SIU referral signal (identity mismatch, duplicate across claims,
 * undisclosed chronic condition): a leading icon, never a fill (§4.5). "Repeated high price" alone is
 * not flagged; it already shows as text in the SIU column and was on most rows (§1.2 L12).
 */
export const HIGH_SIU = new Set(['IDENTITY_MISMATCH', 'DUPLICATE_ACROSS_CLAIMS', 'UNDISCLOSED_CHRONIC'])
export const isFlaggedClaim = () => (c) => (c.siu || []).some((s) => HIGH_SIU.has(s))

/** Visit-date range of the batch, for the overview header. */
export function dateRange(claims) {
  let lo = null
  let hi = null
  for (const c of claims) {
    if (!c.visit_date) continue
    if (!lo || c.visit_date < lo) lo = c.visit_date
    if (!hi || c.visit_date > hi) hi = c.visit_date
  }
  return [lo, hi]
}

/** 월별 검토 대상 금액: risk amounts summed by visit_date month, every month in range present (§5.3). */
export function monthlyAtRisk(claims, index) {
  const [lo, hi] = dateRange(claims)
  if (!lo) return []
  const sums = {}
  for (const c of claims) {
    const k = c.visit_date?.slice(0, 7)
    if (k) sums[k] = (sums[k] || 0) + atRiskOf(index, c.claim_id)
  }
  const out = []
  let [y, m] = lo.slice(0, 7).split('-').map(Number)
  const [hy, hm] = hi.slice(0, 7).split('-').map(Number)
  while (y < hy || (y === hy && m <= hm)) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    out.push({ month: key, label: `${m}월`, value: sums[key] || 0 })
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

/** Headline metrics for the overview strip, from the (optionally channel-filtered) claim rows. */
export function metrics(claims, index) {
  const n = claims.length
  const billed = claims.reduce((a, c) => a + (c.billed || 0), 0)
  const flagged = claims.reduce((a, c) => a + atRiskOf(index, c.claim_id), 0)
  const auto = claims.filter((c) => c.decision === 'auto_approve').length
  return { claims: n, billed, flagged, autoRate: n ? auto / n : 0 }
}

/** Distinct-claim rule counts (equals summary.rule_hits on the full batch). */
export function ruleCounts(claims, index) {
  const out = {}
  for (const c of claims) for (const r of rulesOf(index, c.claim_id)) out[r] = (out[r] || 0) + 1
  return out
}

export function pendCounts(claims) {
  const out = {}
  for (const c of claims) for (const p of c.pend_codes || []) out[p] = (out[p] || 0) + 1
  return out
}

/** The sort param: "billed.desc" ↔ [{ id: 'billed', desc: true }]. */
export function parseSort(s, allowed) {
  if (!s) return []
  const [id, dir] = String(s).split('.')
  if (allowed && !allowed.includes(id)) return []
  return [{ id, desc: dir !== 'asc' }]
}

export function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

/** Clinic rows for 병원 리스크: 검토 대상 비중 = at_risk / billed. Fewer than 10 claims = small sample. */
export const SMALL_SAMPLE = 10
export function clinicRows(clinics = []) {
  return clinics.map((c) => ({ ...c, share: c.billed ? c.at_risk / c.billed : 0, small: c.claims < SMALL_SAMPLE }))
}

/** CSV for the 내보내기 button (built in the browser, no network). */
export function toCsv(rows, columns) {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(','))].join('\n')
}

/** Confusion matrix: rows = answer-key label (정상 or anomaly type), columns = engine decision. */
export const DECISION_ORDER = ['auto_approve', 'pend', 'review', 'deny_recommended']
export function confusion(claims) {
  const rows = {}
  for (const c of claims) {
    const labels = c.labels?.length ? c.labels : ['clean']
    for (const l of labels) {
      rows[l] = rows[l] || { label: l, total: 0, auto_approve: 0, pend: 0, review: 0, deny_recommended: 0 }
      rows[l].total += 1
      rows[l][c.decision] = (rows[l][c.decision] || 0) + 1
    }
  }
  const list = Object.values(rows)
  list.sort((a, b) => (a.label === 'clean' ? -1 : b.label === 'clean' ? 1 : b.total - a.total))
  return list
}
