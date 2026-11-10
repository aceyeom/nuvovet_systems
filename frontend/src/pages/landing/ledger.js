// Landing ledger model (DESIGN_SYSTEM.md §5.1 "Ledger lines"). Pure functions over the hero claim model
// (src/pages/insurance/preview/heroClaim.json), so every number on `/` is read from that file at runtime.
import { isActionable } from '../insurance/preview/model.js'

/** A line's findings: actionable findings whose item_ref is the line's standard code. */
function lineFindings(claim, line) {
  if (!line.code) return []
  return (claim.findings || []).filter((f) => f.item_ref === line.code && isActionable(f))
}

/**
 * The `count` lines with the largest amount_at_risk in their findings (ties: line order), shown as typed,
 * then as standard code + name, then as findings. Lines without an amount at risk are never shown.
 */
export function ledgerLines(claim, count = 3) {
  return (claim.lines || [])
    .map((line, index) => {
      const findings = lineFindings(claim, line)
      const risk = findings.reduce((s, f) => s + (f.amount_at_risk || 0), 0)
      return { index, line, findings, risk }
    })
    .filter((r) => r.risk > 0)
    .sort((a, b) => b.risk - a.risk || a.index - b.index)
    .slice(0, count)
}

/** 청구 / 지급 예정 / 소견 (actionable findings, the same count as the console's 소견 tab). */
export function ledgerTotals(claim) {
  return {
    billed: claim.payable?.billed ?? null,
    reimbursed: claim.payable?.reimbursed ?? null,
    findings: (claim.findings || []).filter(isActionable).length,
  }
}

/**
 * How the billed amount becomes the payable one, as ledger steps: 청구 − 자기부담 공제 − 보장 비율 외 부담
 * − 연간 한도 초과 = 지급 예정. A deduction of 0 is left out; the steps always add up to `reimbursed`.
 */
export function payoutSteps(claim) {
  const p = claim.payable || {}
  const deductions = [
    { key: 'deductible', value: p.deductible },
    { key: 'copay', value: p.copay_amount },
    { key: 'limit', value: p.limit_reduction },
  ].filter((d) => d.value > 0)
  return [{ key: 'billed', value: p.billed }, ...deductions, { key: 'reimbursed', value: p.reimbursed, total: true }]
}
