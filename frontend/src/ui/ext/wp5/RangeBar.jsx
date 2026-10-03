/**
 * RangeBar (DESIGN_SYSTEM.md §4.5, owner WP5): a reference range on a 0-based linear scale with the
 * entered value as an ink marker. Track --border-strong, reference band --brand-soft (end ticks in
 * --border-strong), marker ink. Status colour never appears here: it goes on the word beside the bar.
 * A value far above the range is pinned to the right edge (with "›" on the tick row) instead of
 * squashing the band.
 *
 * Props: min, max, value (numbers in one unit); label (accessible text, required);
 * format(n) for tick labels; compact hides the tick row.
 */
import { cn } from '@/ui/cn'

export function rangeGeometry(min, max, value) {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  if (!(hi > 0) || value == null || !Number.isFinite(value)) return null
  const cap = hi * 3
  const domain = Math.min(Math.max(hi * 1.5, value * 1.15), cap)
  const beyond = value > domain
  const pos = (v) => Math.max(0, Math.min(100, (v / domain) * 100))
  const left = pos(lo)
  const width = Math.max(pos(hi) - left, 0)
  return { lo, hi, left, width, marker: beyond ? 100 : pos(value), beyond }
}

export function RangeBar({ min, max, value, label, format = String, compact = false, className }) {
  const g = rangeGeometry(min, max, value)
  if (!g) return null
  const point = g.width < 1
  const narrow = g.width < 14
  return (
    <div role="img" aria-label={label} className={cn('relative w-full min-w-24', compact ? 'h-4' : 'h-9', className)}>
      <div className="absolute inset-x-0 top-2 h-0.5 -translate-y-1/2 bg-border-strong" />
      <span
        data-chart=""
        className={cn('absolute top-2 h-2 -translate-y-1/2 border-x border-border-strong bg-brand-soft', point && 'w-0.5 -translate-x-1/2 bg-border-strong')}
        style={{ left: `${g.left}%`, width: point ? undefined : `${g.width}%` }}
      />
      <span
        className={cn('absolute top-2 h-3.5 w-0.5 -translate-y-1/2 bg-foreground', g.beyond ? '-translate-x-full' : '-translate-x-1/2')}
        style={{ left: `${g.marker}%` }}
      />
      {compact ? null : (
        <div aria-hidden="true" className="num absolute inset-x-0 top-4 h-4 text-xs text-muted-foreground">
          <span className="absolute left-0">0</span>
          {narrow ? (
            <span className="absolute -translate-x-1/2" style={{ left: `${g.left + g.width / 2}%` }}>
              {g.lo === g.hi ? format(g.lo) : `${format(g.lo)}–${format(g.hi)}`}
            </span>
          ) : (
            <>
              <span className="absolute -translate-x-1/2" style={{ left: `${g.left}%` }}>
                {format(g.lo)}
              </span>
              <span className="absolute -translate-x-1/2" style={{ left: `${g.left + g.width}%` }}>
                {format(g.hi)}
              </span>
            </>
          )}
          {g.beyond ? <span className="absolute right-0">{format(value)} ›</span> : null}
        </div>
      )}
    </div>
  )
}

export default RangeBar
