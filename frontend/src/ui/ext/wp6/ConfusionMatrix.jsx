/**
 * ConfusionMatrix (WP6, §5.3 엔진 성능): answer-key labels × engine decisions as a plain table of counts.
 * rows: [{ key, label, total, [columnKey]: n }]; columns: [{ key, label }]. Zero cells are muted.
 */
import { cn } from '@/ui/cn'
import { fmtNum } from '@/ui/lib/format'

export function ConfusionMatrix({ rows, columns, rowHeader = '정답 라벨', caption, className }) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-border-strong">
            <th scope="col" className="h-9 bg-subtle pr-3 pl-4 text-left text-xs font-medium whitespace-nowrap text-muted-foreground">
              {rowHeader}
            </th>
            <th scope="col" className="num h-9 bg-subtle px-3 text-xs font-medium text-muted-foreground">
              n
            </th>
            {columns.map((c) => (
              <th key={c.key} scope="col" className="num h-9 bg-subtle px-3 text-xs font-medium whitespace-nowrap text-muted-foreground last:pr-4">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-border">
              <th scope="row" className="h-9 pr-3 pl-4 text-left font-normal whitespace-nowrap text-foreground">
                {r.label}
              </th>
              <td className="num h-9 px-3 text-text-2">{fmtNum(r.total)}</td>
              {columns.map((c) => (
                <td key={c.key} className={cn('num h-9 px-3 last:pr-4', r[c.key] ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {fmtNum(r[c.key] || 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
