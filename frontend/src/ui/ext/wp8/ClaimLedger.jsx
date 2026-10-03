/**
 * ClaimLedger (WP8, DESIGN_SYSTEM.md §4.0, §5.1): the landing's worked example. One bordered surface,
 * three columns split by hairlines (청구 원문 | 표준화 | 심사), one row per claim line, and a totals row
 * under `.ledger-total` (the 3 px double rule, §3.6). Each finding is an EvidenceTrail row.
 * Below `lg` every line becomes a stacked group (raw, standard code, findings) and the totals come last.
 *
 * props:
 *   columns  { raw, std, review }    column headings (also the group labels below lg)
 *   rows     [{ key, raw: { text, amount, meta }, std: { name, code, codeLabel },
 *               findings: [{ key, severity, title, rule, impact, basis }] }]   values preformatted by the caller
 *   totals   [{ key, label, value }]  one cell per column, values preformatted
 *   caption  accessible table caption
 *   empty    text for a line without findings
 */
import { cn } from '@/ui/cn'
import { EvidenceRow, EvidenceTrail } from '@/ui/patterns/EvidenceTrail'
import { FindingSeverity } from '@/ui/patterns/status'

const CELL = 'px-4 py-3 align-top max-lg:block max-lg:py-2'
const DIVIDER = 'lg:border-l lg:border-border'

function GroupLabel({ children }) {
  return <div className="mb-1 text-xs text-muted-foreground lg:hidden">{children}</div>
}

function RawCell({ raw }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <span className="min-w-0 text-foreground">{raw.text}</span>
        {raw.amount != null ? <span className="num shrink-0 font-medium text-foreground">{raw.amount}</span> : null}
      </div>
      {raw.meta ? (
        <div className="mt-1 text-xs text-muted-foreground">
          <span className="num">{raw.meta}</span>
        </div>
      ) : null}
    </>
  )
}

function StdCell({ std, noCode }) {
  if (!std?.code) return <span className="text-text-2">{noCode}</span>
  return (
    <>
      <div className="text-foreground">{std.name}</div>
      <div className="mt-1 flex items-baseline gap-1 text-xs">
        {std.codeLabel ? <span className="text-muted-foreground">{std.codeLabel}</span> : null}
        <span className="id text-text-2">{std.code}</span>
      </div>
    </>
  )
}

function ReviewCell({ findings, empty }) {
  if (!findings?.length) return <span className="text-text-2">{empty}</span>
  return (
    <EvidenceTrail className="border-y-0">
      {findings.map((f) => (
        <EvidenceRow
          key={f.key}
          className="py-0 not-first:pt-3 not-last:pb-3"
          badge={<FindingSeverity severity={f.severity} />}
          title={f.title}
          impact={f.impact}
          ruleId={f.rule}
          basis={f.basis}
        />
      ))}
    </EvidenceTrail>
  )
}

export function ClaimLedger({ columns, rows, totals, caption, empty, noCode, className }) {
  const heads = [columns.raw, columns.std, columns.review]
  return (
    <div data-ledger="" className={cn('overflow-hidden rounded-lg border border-border', className)}>
      <table className="w-full border-collapse text-sm max-lg:block">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <colgroup>
          <col className="w-[32%]" />
          <col className="w-[26%]" />
          <col />
        </colgroup>
        <thead className="max-lg:hidden">
          <tr className="h-9 border-b border-border-strong bg-subtle">
            {heads.map((h, i) => (
              <th key={i} scope="col" className={cn('px-4 text-left text-xs font-medium text-muted-foreground', i > 0 && DIVIDER)}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-lg:block">
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-border last:border-b-0 max-lg:block max-lg:py-2">
              <td className={CELL}>
                <GroupLabel>{columns.raw}</GroupLabel>
                <RawCell raw={r.raw} />
              </td>
              <td className={cn(CELL, DIVIDER)}>
                <GroupLabel>{columns.std}</GroupLabel>
                <StdCell std={r.std} noCode={noCode} />
              </td>
              <td className={cn(CELL, DIVIDER)}>
                <GroupLabel>{columns.review}</GroupLabel>
                <ReviewCell findings={r.findings} empty={empty} />
              </td>
            </tr>
          ))}
        </tbody>
        {totals?.length ? (
          <tfoot className="max-lg:block">
            <tr className="ledger-total max-lg:block max-lg:py-2">
              {totals.map((t, i) => (
                <td key={t.key} className={cn('px-4 py-3 max-lg:block max-lg:py-1', i > 0 && DIVIDER)}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-text-2">{t.label}</span>
                    <span className="num text-base font-semibold text-foreground">{t.value}</span>
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}

export default ClaimLedger
