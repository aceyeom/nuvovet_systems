import { SeverityBadge } from '@/ui/patterns/status'
import { useLang } from '../i18n/index.js'

/** SeverityBadge (§4.5) in the current UI language. level: contraindicated | major | moderate | minor | incomplete | none */
export default function Sev({ level, size = 'sm', related = false, className, ...props }) {
  const { lang } = useLang()
  return <SeverityBadge level={level} size={size} lang={lang} related={related} className={className} {...props} />
}

/** Tinted verdict surface classes (§3.1 "tinted status surfaces": tint + 28 % border). */
export const VERDICT_TINT = {
  contraindicated: 'bg-sev-critical-bg border-[color-mix(in_oklab,var(--sev-critical)_28%,transparent)]',
  major: 'bg-sev-major-bg border-[color-mix(in_oklab,var(--sev-major)_28%,transparent)]',
  moderate: 'bg-sev-moderate-bg border-[color-mix(in_oklab,var(--sev-moderate)_28%,transparent)]',
  minor: 'bg-sev-minor-bg border-[color-mix(in_oklab,var(--sev-minor)_28%,transparent)]',
  none: 'bg-sev-minor-bg border-[color-mix(in_oklab,var(--sev-minor)_28%,transparent)]',
}
