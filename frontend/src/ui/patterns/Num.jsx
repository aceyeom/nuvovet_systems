import { cn } from '@/ui/cn'
import { fmtNum, fmtWon, fmtWonCompact } from '@/ui/lib/format'

/** Tabular number (`.num`: tabular figures, right-aligned, never wraps). */
export function Num({ value, digits, unit, className, ...props }) {
  return (
    <span className={cn('num', className)} {...props}>
      {fmtNum(value, digits == null ? undefined : { digits })}
      {unit ? ` ${unit}` : null}
    </span>
  )
}

/** Won amount: "1,234,567원", or "1,841만 원" with `compact` (MetricStrip / KPIs only). */
export function Money({ value, compact = false, className, ...props }) {
  return (
    <span className={cn('num', className)} {...props}>
      {compact ? fmtWonCompact(value) : fmtWon(value)}
    </span>
  )
}
