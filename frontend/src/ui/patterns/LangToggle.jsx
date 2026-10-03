import { ToggleGroup, ToggleGroupItem } from '@/ui/primitives/toggle-group'

/** Controlled language switch (src/ui cannot import an app's i18n): value 'ko' | 'en'. */
export function LangToggle({ value, onChange, options, label = '언어', className }) {
  const opts = options || [
    { value: 'ko', label: '한국어' },
    { value: 'en', label: 'English' },
  ]
  return (
    <ToggleGroup type="single" size="sm" value={value} onValueChange={(v) => v && onChange?.(v)} aria-label={label} className={className}>
      {opts.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} lang={o.value} className="px-2 text-xs">
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
