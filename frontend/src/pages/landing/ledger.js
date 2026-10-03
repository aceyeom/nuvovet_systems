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
