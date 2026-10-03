/**
 * RangeGlyph (DESIGN_SYSTEM.md §4.5, WP6): a small linear glyph. Track --border-strong, reference band
 * --brand at 20 % with a hairline --brand edge (low..high), a mid tick and an ink marker for the value.
 * Status colour, when any, goes on the word next to it (pass `word` + `tone`), never on the glyph.
 *
 *   <RangeGlyph value={97.7} low={10} mid={50} high={90} word="P98" tone="moderate" label="지역 분위 P98" />
 *
 * `size`: 'sm' (64 px, inline next to a number) or 'lg' (144 px, a table column of its own).
 */
import { cn } from '@/ui/cn'

const TONE = { moderate: 'text-sev-moderate', critical: 'text-sev-critical', muted: 'text-muted-foreground' }
const SIZE = { sm: 'w-16', lg: 'w-36' }

const pct = (v, min, max) => `${Math.max(0, Math.min(100, ((v - min) / (max - min || 1)) * 100))}%`

export function RangeGlyph({ value, low, mid, high, min = 0, max = 100, word, tone, label, size = 'sm', className }) {
  const has = typeof value === 'number' && Number.isFinite(value)
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span role="img" aria-label={label} data-chart="" className={cn('relative inline-block h-2.5 shrink-0', SIZE[size] || SIZE.sm)}>
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-border-strong" />
        {low != null && high != null ? (
          <span
            aria-hidden="true"
            data-chart=""
            className="absolute top-1/2 h-1.5 -translate-y-1/2 border-x border-brand bg-brand/20"
            style={{ left: pct(low, min, max), width: `calc(${pct(high, min, max)} - ${pct(low, min, max)})` }}
          />
        ) : null}
        {mid != null ? <span aria-hidden="true" className="absolute top-0 h-2.5 w-px bg-text-2" style={{ left: pct(mid, min, max) }} /> : null}
        {has ? <span aria-hidden="true" className="absolute top-0 h-2.5 w-0.5 -translate-x-1/2 bg-foreground" style={{ left: pct(value, min, max) }} /> : null}
      </span>
      {word ? (
        <span data-status={tone || undefined} className={cn('num text-xs', tone ? TONE[tone] : 'text-text-2')}>
          {word}
        </span>
      ) : null}
    </span>
  )
}
