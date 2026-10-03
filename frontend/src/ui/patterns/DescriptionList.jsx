import { cn } from '@/ui/cn'

/**
 * Grid of labelled values (§4.5): text-xs muted dt above a text-sm dd (.num when numeric).
 * items: [{ label, value, num? }]. Replaces "a · b · c" metadata lines.
 */
export function DescriptionList({ items, columns = 4, className, ...props }) {
  const cols = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4', 5: 'grid-cols-2 lg:grid-cols-5', 6: 'grid-cols-2 lg:grid-cols-6' }
  return (
    <dl className={cn('grid gap-x-6 gap-y-3', cols[columns] || cols[4], className)} {...props}>
      {items.filter(Boolean).map((it, i) => (
        <div key={it.key ?? i} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{it.label}</dt>
          <dd className={cn('text-sm text-foreground', it.num && 'num text-left')}>{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}
