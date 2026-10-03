// Public surface of the console preview (DESIGN_SYSTEM.md §8.1). The landing (WP8) imports from here:
//   ClaimDetailPreview({ claimId })      inert claim screen (hero claim renders synchronously)
//   LineItemTable({ lines, flaggedOnly }) claim lines table
//   FindingList({ findings })             EvidenceTrail rows
//   heroClaim                             SYN-2026-00220 claim model + claimsCount (< 8 kB, from the snapshot)
// Props change only through a REQUEST to WP6.
export { ClaimDetailPreview } from './ClaimDetailPreview.jsx'
export { LineItemTable, LineDecision, Percentile } from './LineItemTable.jsx'
export { FindingList, FindingRow } from './FindingList.jsx'
export { PayoutLedger, payoutRows } from './PayoutLedger.jsx'
export { HERO_CLAIM_ID, RISK_CATEGORIES, isActionable, koText, toClaimModel } from './model.js'
export { default as heroClaim } from './heroClaim.json'
