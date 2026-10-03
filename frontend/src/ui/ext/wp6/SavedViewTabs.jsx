/**
 * SavedViewTabs (WP6, §5.3): the queue's saved views as real links with plain-digit counts
 * (`처리 대상 135 | 서류 요청 33 | …`). Navigation, so links with aria-current, not a tablist.
 * A zero count is not printed (§1.2 L11).
 * views: [{ id, label, count, href }]; LinkComponent: the router Link (props: to, children).
 *
 * `max`: show at most this many views inline and put the rest under a "더 보기" menu (used while the
 * queue's side panel narrows the column). The active view is always inline, so a count is never cut;
 * the row still scrolls sideways (with an edge rule, no gradient) if the column is narrower still.
 */
import { ChevronDown } from 'lucide-react'
import { cn } from '@/ui/cn'
import { fmtNum } from '@/ui/lib/format'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/ui/primitives/dropdown-menu'

const linkProps = (LinkComponent, href) => (LinkComponent === 'a' ? { href } : { to: href })

function splitViews(views, active, max) {
  if (!max || views.length <= max + 1) return [views, []]
  const inline = views.slice(0, max)
  const rest = views.slice(max)
  const hit = rest.findIndex((v) => v.id === active)
  if (hit >= 0) {
    // Swap the active view in for the last inline one; keep the original order inside each group.
    const out = inline.pop()
    inline.push(rest[hit])
    rest.splice(hit, 1)
    rest.unshift(out)
  }
  return [inline, rest]
}

export function SavedViewTabs({ views, active, LinkComponent = 'a', label = '저장된 보기', max, className }) {
  const [inline, rest] = splitViews(views, active, max)
  return (
    <nav
      aria-label={label}
      className={cn(
        'flex min-w-0 snap-x items-end gap-5 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:none]',
        max && 'gap-4',
        className,
      )}
    >
      {inline.map((v) => {
        const current = v.id === active
        return (
          <LinkComponent
            key={v.id}
            {...linkProps(LinkComponent, v.href)}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'relative inline-flex h-9 shrink-0 snap-start items-center gap-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-100',
              current ? 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-current' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {v.label}
            {v.count > 0 ? <span className="num text-xs text-muted-foreground">{fmtNum(v.count)}</span> : null}
          </LinkComponent>
        )
      })}
      {rest.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-9 shrink-0 snap-start items-center gap-1 rounded-sm text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground">
            더 보기
            <ChevronDown aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            {rest.map((v) => (
              <DropdownMenuItem key={v.id} asChild>
                <LinkComponent {...linkProps(LinkComponent, v.href)} className="flex justify-between gap-4">
                  <span>{v.label}</span>
                  {v.count > 0 ? <span className="num text-xs text-muted-foreground">{fmtNum(v.count)}</span> : null}
                </LinkComponent>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </nav>
  )
}
