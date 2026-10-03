/**
 * Status marks (DESIGN_SYSTEM.md §4.5). Colour is reserved for meaning: every coloured mark carries a
 * word, and severity marks also carry an icon (colour + icon + word is a clinical safety rule).
 * Every mark sets data-status so the §9.7 colour budget can find it.
 */
import { CircleAlert, CircleCheck, CircleDashed, FileClock, Info, OctagonX, TriangleAlert } from 'lucide-react'
import { cn } from '@/ui/cn'

const BADGE = 'inline-flex w-fit shrink-0 items-center gap-1 rounded-sm border text-xs font-medium whitespace-nowrap'
const SIZE = { 'sm': 'h-5 px-1.5', 'md': 'h-6 px-2' } // keys quoted so the design lint does not read them as a breakpoint variant
const ICON = 'size-3.5 shrink-0'

export const SEVERITY = {
  contraindicated: { ko: '금기', en: 'Contraindicated', icon: OctagonX, cls: 'border-transparent bg-sev-critical-solid text-on-solid' },
  major: { ko: '중대', en: 'Major', icon: TriangleAlert, cls: 'border-sev-major bg-sev-major-bg text-sev-major' },
  moderate: { ko: '주의', en: 'Moderate', icon: CircleAlert, cls: 'border-transparent bg-sev-moderate-bg text-sev-moderate' },
  minor: { ko: '경미', en: 'Minor', icon: Info, cls: 'border-transparent bg-sev-minor-bg text-sev-minor' },
  incomplete: { ko: '검토 불완전', en: 'Incomplete', icon: CircleDashed, cls: 'border-transparent bg-sev-minor-bg text-sev-minor' },
  none: { ko: '규칙상 문제 없음', en: 'No rule findings', icon: CircleCheck, cls: 'border-transparent bg-sev-minor-bg text-sev-minor' },
}

/** Clinical severity: icon + word always. `related` = contributes to a finding without causing it (outline, no icon). */
export function SeverityBadge({ level, size = 'sm', lang = 'ko', related = false, label, className, ...props }) {
  const s = SEVERITY[level] || SEVERITY.minor
  const Icon = s.icon
  const word = label ?? s[lang] ?? s.ko
  if (related) {
    return (
      <span data-status="related" data-level={level} className={cn(BADGE, SIZE[size], 'border-border-strong bg-transparent text-text-2', className)} {...props}>
        {word}
      </span>
    )
  }
  return (
    <span data-status={level} className={cn(BADGE, SIZE[size], s.cls, className)} {...props}>
      <Icon aria-hidden="true" strokeWidth={1.5} className={ICON} />
      {word}
    </span>
  )
}

export const DECISIONS = {
  auto_approve: { ko: '자동 승인', en: 'Auto-approve', icon: CircleCheck, cls: 'border-transparent bg-ok-bg text-ok' },
  pend: { ko: '서류 요청', en: 'Documents requested', icon: FileClock, cls: 'border-border-strong bg-background text-foreground' },
  review: { ko: '심사 필요', en: 'Needs review', icon: CircleAlert, cls: 'border-transparent bg-sev-moderate-bg text-sev-moderate' },
  deny_recommended: { ko: '지급 거절 권고', en: 'Denial recommended', icon: OctagonX, cls: 'border-transparent bg-sev-critical-bg text-sev-critical' },
}

/** Claim decision: word + colour; the icon only outside tables (`icon`, default false). */
export function DecisionBadge({ decision, icon = false, size = 'sm', lang = 'ko', className, ...props }) {
  const d = DECISIONS[decision]
  if (!d) return null
  const Icon = d.icon
  return (
    <span data-status={decision} className={cn(BADGE, SIZE[size], d.cls, className)} {...props}>
      {icon ? <Icon aria-hidden="true" strokeWidth={1.5} className={ICON} /> : null}
      {d[lang] ?? d.ko}
    </span>
  )
}

export const FINDING_SEVERITY = {
  critical: { ko: '심각', en: 'Critical', icon: OctagonX, cls: 'border-transparent bg-sev-critical-bg text-sev-critical' },
  warning: { ko: '주의', en: 'Warning', icon: CircleAlert, cls: 'border-transparent bg-sev-moderate-bg text-sev-moderate' },
  info: { ko: '정보', en: 'Info', icon: Info, cls: 'border-transparent bg-sev-minor-bg text-sev-minor' },
}

/** Claim finding severity 심각 / 주의 / 정보 (critical / moderate / minor tokens). */
export function FindingSeverity({ severity, icon = true, size = 'sm', lang = 'ko', className, ...props }) {
  const f = FINDING_SEVERITY[severity] || FINDING_SEVERITY.info
  const Icon = f.icon
  return (
    <span data-status={severity} className={cn(BADGE, SIZE[size], f.cls, className)} {...props}>
      {icon ? <Icon aria-hidden="true" strokeWidth={1.5} className={ICON} /> : null}
      {f[lang] ?? f.ko}
    </span>
  )
}

export const DOSE_STATUS = {
  within: { ko: '범위 내', en: 'Within range', tone: 'ok', icon: CircleCheck },
  below: { ko: '범위 미만', en: 'Below range', tone: 'moderate', icon: CircleAlert },
  above: { ko: '범위 초과', en: 'Above range', tone: 'major', icon: TriangleAlert },
  no_reference: { ko: '참고 용량 없음', en: 'No reference dose', tone: 'minor', icon: CircleDashed },
  check: { ko: '투여량 확인', en: 'Check the dose', tone: 'moderate', icon: CircleAlert },
}

const TONE = {
  ok: 'text-ok',
  critical: 'text-sev-critical',
  major: 'text-sev-major',
  moderate: 'text-sev-moderate',
  minor: 'text-sev-minor',
}

/** A word in the status colour (+ 14 px icon), no background. `status` from DOSE_STATUS, or `tone` + children. */
export function StatusText({ status, tone, icon = true, lang = 'ko', className, children, ...props }) {
  const s = DOSE_STATUS[status]
  const t = tone || s?.tone || 'minor'
  const Icon = s?.icon
  return (
    <span data-status={status || t} className={cn('inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap', TONE[t], className)} {...props}>
      {icon && Icon ? <Icon aria-hidden="true" strokeWidth={1.5} className={ICON} /> : null}
      {children ?? s?.[lang] ?? s?.ko}
    </span>
  )
}
