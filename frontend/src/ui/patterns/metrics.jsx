import { cn } from '@/ui/cn'
import { fmtNum } from '@/ui/lib/format'

/**
 * MetricStrip (§4.5): one bordered row of 2–4 cells split by vertical hairlines; a text-xs muted label
 * above a text-2xl .num value. No icons, no deltas, no card per metric. 2×2 under 640 px.
 * items: [{ label, value }] (value already formatted, e.g. fmtWonCompact()).
 */
export function MetricStrip({ items, className, ...props }) {
  const n = Math.min(Math.max(items.length, 2), 4)
  const cols = { 2: 'grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }[n]
  return (
    <dl className={cn('grid overflow-hidden rounded-lg border border-border', cols, className)} {...props}>
      {items.slice(0, 4).map((it, i) => (
        <div
          key={it.key ?? i}
          className={cn(
            'flex flex-col gap-1 px-4 py-3',
            'border-border max-sm:[&:nth-child(even)]:border-l max-sm:[&:nth-child(n+3)]:border-t sm:[&:not(:first-child)]:border-l',
          )}
        >
          <dt className="text-xs text-muted-foreground">{it.label}</dt>
          <dd className="num text-left text-2xl font-semibold text-foreground">{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Chart fills carry `data-chart` (a chart mark, allowed by the §9.7 colour budget like `.recharts-*`).
 *
 * ProgressBar: a plain div, always on a 0–100 % scale. `muted` = small-sample styling (fill
 * --border-strong). Pass `label` for an accessible name.
 */
export function ProgressBar({ value, muted = false, label, className, ...props }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-sm bg-muted', className)}
      {...props}
    >
      <div data-chart="" className={cn('h-full', muted ? 'bg-border-strong' : 'bg-chart-1')} style={{ width: `${pct}%` }} />
    </div>
  )
}

/**
 * BarList: label, a bar and the printed count. Bars are scaled to `max` (default: the largest value)
 * and labelled with the absolute count, never a percentage of the maximum (§1.2 L13).
 * items: [{ label, value, hint? }].
 */
export function BarList({ items, unit = '건', max, className, ...props }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value || 0))
  return (
    <ul className={cn('flex flex-col gap-2', className)} {...props}>
      {items.map((it, i) => (
        <li key={it.key ?? i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
          <span className="truncate text-sm text-foreground" title={typeof it.label === 'string' ? it.label : undefined} data-truncate="">
            {it.label}
          </span>
          <span className="num text-sm text-text-2">
            {fmtNum(it.value)}
            {unit}
          </span>
          <div className="col-span-2 h-1.5 overflow-hidden rounded-sm bg-muted" aria-hidden="true">
            <div data-chart="" className="h-full bg-chart-1" style={{ width: `${Math.max(0, Math.min(100, ((it.value || 0) / top) * 100))}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
