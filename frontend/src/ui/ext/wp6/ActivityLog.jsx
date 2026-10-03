/**
 * ActivityLog (WP6, §5.3 이력): a hairline-separated list of events, newest first.
 * entries: [{ id, at (ISO date or datetime), actor, title, detail? }]
 */
import { cn } from '@/ui/cn'
import { fmtDate } from '@/ui/lib/format'

function when(at) {
  if (!at) return ''
  const d = fmtDate(at)
  const t = typeof at === 'string' && at.length > 10 ? at.slice(11, 16) : ''
  return t ? `${d} ${t}` : d
}

export function ActivityLog({ entries, empty = '처리 이력이 없습니다.', className }) {
  if (!entries?.length) return <p className="py-3 text-sm text-text-2">{empty}</p>
  return (
    <ol className={cn('divide-y divide-border border-y border-border', className)}>
      {entries.map((e) => (
        <li key={e.id} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-4 py-3 max-sm:grid-cols-1 max-sm:gap-y-1">
          <span className="num text-left text-xs text-muted-foreground">{when(e.at)}</span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm text-foreground">
              <span className="font-medium">{e.title}</span>
              {e.actor ? <span className="text-text-2"> {e.actor}</span> : null}
            </p>
            {e.detail ? <p className="text-sm text-text-2">{e.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
