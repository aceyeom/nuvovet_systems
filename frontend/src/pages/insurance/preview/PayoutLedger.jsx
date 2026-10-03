// 지급 계산: the payout as a labelled ledger with the total under .ledger-total (DESIGN_SYSTEM.md §3.6).
import { fmtWon } from '@/ui/lib/format'
import { CAPPED_BY } from '../strings.ko.js'

export function payoutRows(p) {
  if (!p) return []
  const rows = [
    { label: '청구 금액', value: p.billed },
    { label: '비보장 제외', value: -(p.ineligible || 0) },
    { label: '보장 대상', value: p.eligible },
    { label: p.deductible_basis === 'per_day' && p.days ? `자기부담금 (${p.days}일)` : '자기부담금', value: -(p.deductible || 0) },
  ]
  if (p.copay_amount) rows.push({ label: `자기부담 비율 ${Math.round((1 - (p.coverage_ratio ?? 0.7)) * 100)}%`, value: -p.copay_amount })
  if (p.limit_reduction) rows.push({ label: `한도 적용 (${CAPPED_BY[p.capped_by] || '한도'})`, value: -p.limit_reduction })
  return rows
}

const money = (v) => (v < 0 ? `−${fmtWon(-v)}` : fmtWon(v))

export function PayoutLedger({ payable, className }) {
  if (!payable) return null
  return (
    <dl className={className}>
      <div className="flex max-w-md flex-col">
        {payoutRows(payable).map((r) => (
          <div key={r.label} className="flex h-9 items-center justify-between gap-4 border-b border-border text-sm">
            <dt className="text-text-2">{r.label}</dt>
            <dd className="num text-foreground">{money(r.value)}</dd>
          </div>
        ))}
        <div className="ledger-total mt-px flex h-10 items-center justify-between gap-4 text-sm">
          <dt className="font-semibold text-foreground">지급 예정액</dt>
          <dd className="num font-semibold text-foreground">{fmtWon(payable.reimbursed)}</dd>
        </div>
      </div>
    </dl>
  )
}

export default PayoutLedger
