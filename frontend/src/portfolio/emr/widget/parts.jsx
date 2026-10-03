/**
 * Small shared pieces of the widget UI: the severity badge (SeverityBadge sm/md values from
 * src/ui/patterns/status.jsx, re-implemented here because the widget shares no components with
 * src/ui), icons and text helpers.
 */

import { CircleAlert, CircleCheck, CircleDashed, Info, OctagonX, TriangleAlert } from 'lucide-react'
import { getSource } from '../../knowledge/sources.js'
import { severityWord, t } from './strings.js'
import { isAck } from '../feedbackLog.js'

export const SEV_ICON = {
  contraindicated: OctagonX,
  major: TriangleAlert,
  moderate: CircleAlert,
  minor: Info,
  incomplete: CircleDashed,
  none: CircleCheck,
  confirm: CircleDashed,
}

export const SEV_RANK = { contraindicated: 0, major: 1, moderate: 2, minor: 3 }

/** Icon props: 1.5 stroke, decorative. */
export const ic = (size = 14) => ({ size, strokeWidth: 1.5, 'aria-hidden': 'true', focusable: 'false' })

/**
 * Severity badge: icon + word always (colour is never the only signal). `status` is a severity,
 * 'incomplete', 'none', 'confirm', 'noref', 'unmapped', 'related' or 'dash'.
 */
export function Badge({ status, label, size = 'sm', icon = true, locale = 'ko', className = '', ...rest }) {
  const Icon = icon ? SEV_ICON[status] : null
  const word = label ?? (SEV_RANK[status] != null ? severityWord(locale, status) : status === 'incomplete' ? t(locale, 'verdict.incomplete') : status === 'none' ? t(locale, 'verdict.none') : '')
  return (
    <span data-status={status} className={`nv-badge${size === 'md' ? ' nv-badge-md' : ''}${className ? ` ${className}` : ''}`} {...rest}>
      {Icon ? <Icon {...ic(14)} /> : null}
      {word}
    </span>
  )
}

/** "확인 필요: 횟수 미입력" → "횟수 미입력" inside the 확인 필요 group (its heading says it already). */
export function stripConfirmPrefix(text) {
  return String(text || '').replace(/^(확인 필요|Needs input):\s*/, '')
}

/** List join: KO uses a bare middle dot (§3.11 coverage.items), EN spaced. */
export const joinItems = (locale, items) => items.filter(Boolean).join(locale === 'en' ? ', ' : '·')

export const fmtKg = (kg) => (kg == null || !Number.isFinite(Number(kg)) ? null : `${Number(kg).toFixed(1)} kg`)

/** "14:32:05" (24 h, local time). */
export function fmtTime(d) {
  if (!d) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** The highest severity among cards, or null. */
export function topSeverity(cards) {
  let best = null
  for (const k of cards || []) {
    const s = k.extension.severity
    if (best == null || SEV_RANK[s] < SEV_RANK[best]) best = s
  }
  return best
}

/**
 * The log entry that acknowledges a card in this encounter, or null: an override, or
 * 확인함 on a non-blocking card. An accepted suggestion does not count (review F2).
 */
export function ackEntry(log, card) {
  const key = card.extension.ackKey
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]
    if (e.extension?.ackKey === key && isAck(e, Boolean(card.extension.blocking))) return e
  }
  return null
}

/**
 * Citation labels: "Mealey et al. 2001, Pharmacogenetics" → "Mealey 2001";
 * "Baytril (enrofloxacin) tablets, US FDA-approved label" → "Baytril (enrofloxacin) tablets".
 * `full` is the whole reference for the title tooltip and the 자세히 list (dashes turned into ": ").
 */
export function shortCite(id) {
  const s = getSource(id)
  if (!s) return { short: id, full: id }
  const short = String(s.cite || id).split(/,| — | – /)[0].replace(/\s+et al\.?/, '').trim()
  return { short, full: [s.cite, s.title, s.doi ? `doi:${s.doi}` : null].filter(Boolean).join('. ').replace(/ — /g, ': ') }
}
