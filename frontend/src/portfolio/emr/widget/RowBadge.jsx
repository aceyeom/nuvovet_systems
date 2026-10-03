/**
 * Row badge in the host's DUR slot (EMR popup spec §3.7.3). 20 px SeverityBadge sm look, 24 px hit
 * area. A row with findings is a <button> with a descriptive aria-label; clicking it opens the
 * panel on the first card for that row (expanded, scrolled, summary heading focused). Rows that
 * need input open the 확인 필요 group. "–" rows are plain text.
 */

import { Badge, SEV_RANK } from './parts.jsx'
import { t } from './strings.js'
import { useWidget } from './WidgetApp.jsx'

export function RowBadge({ rowId, status }) {
  const { ctl, locale } = useWidget()
  if (!status) return null
  const inClinic = status.inClinic ? `${t(locale, 'badge.inClinic')} ` : ''
  const approx = status.rounding ? ' ≈' : ''
  const isSev = SEV_RANK[status.badge] != null
  const dash = status.badge === 'none' || status.badge === 'unsupported'

  if (dash) {
    return (
      <span className="nv-rowbadge" data-row={rowId}>
        <Badge status="dash" icon={false} label={`${inClinic}${status.text}${approx}`} locale={locale} />
      </span>
    )
  }

  const visual = isSev ? (status.related ? 'related' : status.badge) : status.badge
  const label = `${inClinic}${status.text}${approx}`
  const aria = status.ariaLabel || `${label}`
  const onClick = (e) => {
    e.stopPropagation()
    ctl.reveal(rowId, status.cardUuids?.[0] || null)
  }
  return (
    <button type="button" className="nv-rowbadge" data-row={rowId} aria-label={aria} title={aria} onClick={onClick}>
      <Badge status={visual} icon={!status.related && visual !== 'unmapped' && visual !== 'noref'} label={label} locale={locale} />
    </button>
  )
}
