import { OctagonX, TriangleAlert, CircleAlert, Info, ListChecks } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import { severityWord } from './format.js'

/** Severity always travels as icon + word; colour is a third, redundant channel. */
export const SEVERITY_ICON = {
  contraindicated: OctagonX,
  major: TriangleAlert,
  moderate: CircleAlert,
  minor: Info,
  none: ListChecks,
}

export function SeverityIcon({ severity, size = 16, ...rest }) {
  const Icon = SEVERITY_ICON[severity] || Info
  return <Icon size={size} strokeWidth={2} aria-hidden="true" focusable="false" {...rest} />
}

/**
 * <SeverityTag severity="major" />            pill with icon + word
 * <SeverityTag severity="major" plain />       icon + word, no pill
 * count: optional number shown before the word ("2 Moderate")
 */
export default function SeverityTag({ severity, plain = false, size = 'md', count = null, className = '' }) {
  const { t, pick } = useLang()
  const word = severity === 'none' ? t('sev.none') : severityWord(severity, pick)
  return (
    <span className={`pf-sev pf-sev--${severity}${plain ? ' pf-sev--plain' : ''} pf-sev--${size} ${className}`.trim()}>
      <SeverityIcon severity={severity} size={size === 'lg' ? 20 : size === 'sm' ? 13 : 14} />
      {count != null && <span className="pf-sev__count">{count}</span>}
      <span className="pf-sev__word">{word}</span>
    </span>
  )
}
