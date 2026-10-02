import { Sun, Moon, Monitor } from 'lucide-react'
import { useLang } from '../i18n/index.js'

const ORDER = ['system', 'light', 'dark']
const ICON = { system: Monitor, light: Sun, dark: Moon }

/** Cycles system → light → dark. The current mode is announced as the button's label. */
export default function ThemeToggle({ theme, onChange }) {
  const { t } = useLang()
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
  const Icon = ICON[theme] || Monitor
  return (
    <button
      type="button"
      className="pf-icon-btn pf-themetoggle"
      onClick={() => onChange(next)}
      aria-label={`${t('theme.label')}: ${t(`theme.${theme}`)}`}
      title={`${t('theme.label')}: ${t(`theme.${theme}`)}`}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  )
}
