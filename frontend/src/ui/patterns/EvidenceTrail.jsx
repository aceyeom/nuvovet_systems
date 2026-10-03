/**
 * EvidenceTrail (DESIGN_SYSTEM.md §4.5): every verdict shows its rule ID, its source and what was not
 * checked. Rows are separated by 1 px hairlines with no box around each row. Also the CSS model for the
 * EMR widget card, the DUR workbench finding list, the console FindingList and the landing ledger.
 *
 *   [badge] title (text-sm 500, 1 line)                                  amount / dose impact (.num)
 *   규칙 rule.id v1.0    근거 …    [CitationChip]    [action]               (text-xs, --text-2)
 *   검토 안 함  연령, 임신/수유                                               (text-xs muted; only with gaps)
 *
 * The rule line is a wrapping flex row with a 12 px gap and no separator characters, so it never
 * reads as an "a · b · c" chain (§1.2 L9) and never leaves a stray dot at a line end when it wraps.
 * `action` is a trailing control on the rule line (e.g. a 상세 disclosure toggle).
 */
import { BookOpen } from 'lucide-react'
import { cn } from '@/ui/cn'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/ui/primitives/hover-card'

export function EvidenceTrail({ className, children, ...props }) {
  return (
    <ul className={cn('divide-y divide-border border-y border-border', className)} {...props}>
      {children}
    </ul>
  )
}

const LABELS = {
  ko: { rule: '규칙', basis: '근거', notChecked: '검토 안 함' },
  en: { rule: 'Rule', basis: 'Basis', notChecked: 'Not checked' },
}

/**
 * One finding row. `badge` is a SeverityBadge / FindingSeverity element; `impact` is right-aligned
 * (pass a <Money>/<Num> or a string); `notChecked` is a list of gap labels.
 */
export function EvidenceRow({ badge, title, impact, ruleId, version, basis, citation, action, notChecked, lang = 'ko', children, className, ...props }) {
  const L = LABELS[lang] || LABELS.ko
  const gaps = (notChecked || []).filter(Boolean)
  return (
    <li className={cn('flex flex-col gap-1 py-3', className)} {...props}>
      <div className="flex items-start gap-2">
        {badge ? <span className="flex h-5 shrink-0 items-center">{badge}</span> : null}
        <span data-truncate="" title={typeof title === 'string' ? title : undefined} className="min-w-0 flex-1 truncate text-sm leading-5 font-medium text-foreground">
          {title}
        </span>
        {impact != null ? <span className="num shrink-0 text-sm leading-5 font-medium text-foreground">{impact}</span> : null}
      </div>
      {ruleId || basis || citation || action ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-2">
          {ruleId ? (
            <span className="inline-flex items-center gap-1">
              <span className="text-muted-foreground">{L.rule}</span>
              <span className="id">{ruleId}</span>
              {version ? <span className="id text-muted-foreground">{version}</span> : null}
            </span>
          ) : null}
          {basis ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="shrink-0 text-muted-foreground">{L.basis}</span>
              <span className="min-w-0">{basis}</span>
            </span>
          ) : null}
          {citation}
          {action}
        </div>
      ) : null}
      {gaps.length ? (
        <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          <span>{L.notChecked}</span>
          <span>{gaps.join(', ')}</span>
        </div>
      ) : null}
      {children}
    </li>
  )
}

/** Outline badge with a BookOpen icon; hover/focus shows the cite and DOI. */
export function CitationChip({ label, cite, doi, className }) {
  const chip = (
    <span
      tabIndex={cite || doi ? 0 : undefined}
      className={cn('inline-flex h-5 items-center gap-1 rounded-sm border border-border-strong bg-background px-1.5 text-xs font-medium text-text-2', className)}
    >
      <BookOpen aria-hidden="true" strokeWidth={1.5} className="size-3" />
      {label}
    </span>
  )
  if (!cite && !doi) return chip
  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{chip}</HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm">
        {cite ? <p className="text-foreground">{cite}</p> : null}
        {doi ? <p className="id mt-1 text-xs text-text-2">doi:{doi}</p> : null}
      </HoverCardContent>
    </HoverCard>
  )
}
