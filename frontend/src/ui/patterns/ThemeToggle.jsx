import { Monitor, Moon, Sun } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/ui/primitives/toggle-group'
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/ui/primitives/dropdown-menu'
import { useTheme } from '@/ui/theme'

const THEME_LABELS = {
  ko: { system: '시스템', light: '라이트', dark: '다크', group: '화면 테마' },
  en: { system: 'System', light: 'Light', dark: 'Dark', group: 'Theme' },
}
const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon }

/** Three-state theme switch 시스템 / 라이트 / 다크 as an icon segmented control. */
export function ThemeToggle({ lang = 'ko', className }) {
  const { theme, setTheme } = useTheme()
  const L = THEME_LABELS[lang] || THEME_LABELS.ko
  return (
    <ToggleGroup
      type="single"
      size="sm"
      value={theme}
      onValueChange={(v) => v && setTheme(v)}
      aria-label={L.group}
      className={className}
    >
      {['system', 'light', 'dark'].map((t) => {
        const Icon = THEME_ICONS[t]
        return (
          <ToggleGroupItem key={t} value={t} aria-label={L[t]} title={L[t]} className="px-1.5">
            <Icon aria-hidden="true" strokeWidth={1.5} />
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

/** The same choice as radio items for a DropdownMenu (e.g. the console user menu). */
export function ThemeMenuItems({ lang = 'ko' }) {
  const { theme, setTheme } = useTheme()
  const L = THEME_LABELS[lang] || THEME_LABELS.ko
  return (
    <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
      {['system', 'light', 'dark'].map((t) => (
        <DropdownMenuRadioItem key={t} value={t}>
          {L[t]}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}
