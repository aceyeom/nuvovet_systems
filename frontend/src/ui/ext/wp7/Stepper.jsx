/**
 * Stepper (WP7, DESIGN_SYSTEM.md §5.4): the clinic pre-check's three real steps on one thin row.
 *
 *   steps    [{ id, label }] in order
 *   current  id of the step on screen (gets aria-current="step")
 *   reachable(id) returns a boolean: whether a step other than the current one can be opened (completed or
 *            already filled). Unreachable steps render as plain text, not as disabled buttons.
 *   onStep(id)
 *
 * Steps change screen state, not the URL path, so they are buttons (§9.3 allows that). The number sits
 * in a 20 px square (4 px radius, not a circle: rounded-full is for avatars and switches only).
 */
import { Check } from 'lucide-react'
import { cn } from '@/ui/cn'

export function Stepper({ steps, current, reachable = () => false, onStep, label = '진행 단계', className }) {
  const index = steps.findIndex((s) => s.id === current)
  return (
    <nav aria-label={label} className={cn('print:hidden', className)}>
      <ol className="flex items-center gap-2">
        {steps.map((s, i) => {
          const isCurrent = s.id === current
          const done = i < index
          const canOpen = !isCurrent && reachable(s.id)
          const mark = (
            <span
              aria-hidden="true"
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-sm border text-xs font-medium',
                isCurrent
                  ? 'border-primary bg-primary text-primary-foreground'
                  : done
                    ? 'border-border-strong bg-background text-foreground'
                    : 'border-border bg-background text-muted-foreground',
              )}
            >
              {done ? <Check strokeWidth={1.5} className="size-3.5" /> : <span className="num">{i + 1}</span>}
            </span>
          )
          const text = (
            <span className={cn('text-sm whitespace-nowrap', isCurrent ? 'font-medium text-foreground' : done ? 'text-foreground' : 'text-muted-foreground')}>
              {s.label}
            </span>
          )
          return (
            <li key={s.id} className="flex min-w-0 items-center gap-2">
              {i > 0 ? <span aria-hidden="true" className="h-px w-6 shrink-0 bg-border-strong sm:w-10" /> : null}
              {canOpen ? (
                <button
                  type="button"
                  onClick={() => onStep?.(s.id)}
                  className="-mx-1 inline-flex h-8 items-center gap-2 rounded-md px-1 hover:bg-row-hover touch:h-10"
                >
                  {mark}
                  {text}
                  <span className="sr-only">{done ? ' (완료)' : ''}</span>
                </button>
              ) : (
                <span aria-current={isCurrent ? 'step' : undefined} className="inline-flex h-8 items-center gap-2 touch:h-10">
                  {mark}
                  {text}
                  {done ? <span className="sr-only"> (완료)</span> : null}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Stepper
