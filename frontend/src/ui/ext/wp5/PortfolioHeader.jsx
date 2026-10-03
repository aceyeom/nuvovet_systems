/**
 * PortfolioHeader (DESIGN_SYSTEM.md §5.5, owner WP5): the 56 px `/dur` header.
 * Logo "nuvovet DUR 데모", the nav (사례 연구 · 사례 · EMR 데모 · 작동 방식) and, on the right,
 * the one disclaimer of the screen (EnvironmentMarker), LangToggle and ThemeToggle.
 * Presentational: labels, hrefs and the current item come from the caller.
 *
 * Below 640 px the language and theme switches move into one "설정" menu, so the header is two rows
 * (logo + marker + menu, then the nav scrolling on one line) instead of three (design review P1-20).
 *
 * nav: [{ key, href, label, current }]
 */
import { Settings2 } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { Logo } from '@/ui/patterns/Logo'
import { EnvironmentMarker } from '@/ui/patterns/EnvironmentMarker'
import { LangToggle } from '@/ui/patterns/LangToggle'
import { ThemeMenuItems, ThemeToggle } from '@/ui/patterns/ThemeToggle'

export function PortfolioHeader({
  homeHref,
  homeLabel,
  product,
  nav,
  navLabel,
  marker,
  markerTooltip,
  lang,
  onLang,
  langLabel,
  settingsLabel = '설정',
  themeLabel = '화면 테마',
  className,
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-[var(--z-header)] border-b border-border bg-background print:hidden',
        className,
      )}
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:px-6 lg:h-14 lg:flex-nowrap lg:py-0">
        <a href={homeHref} aria-label={homeLabel} className="flex h-10 shrink-0 items-center rounded-sm">
          <Logo product={product} />
        </a>
        <nav aria-label={navLabel} className="order-last -mx-2 flex w-full min-w-0 items-center gap-1 overflow-x-auto lg:order-none lg:mx-0 lg:w-auto lg:flex-1">
          {nav.map((n) => (
            <a
              key={n.key}
              href={n.href}
              aria-current={n.current ? 'page' : undefined}
              className={cn(
                'inline-flex h-8 shrink-0 items-center rounded-md px-2 text-sm whitespace-nowrap transition-colors duration-100 touch:h-10',
                n.current ? 'bg-brand-soft font-medium text-foreground' : 'text-text-2 hover:bg-row-hover hover:text-foreground',
              )}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {marker ? <EnvironmentMarker label={marker} tooltip={markerTooltip} /> : null}
          <LangToggle value={lang} onChange={onLang} label={langLabel} className="max-sm:hidden" />
          <ThemeToggle lang={lang} className="max-sm:hidden" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={settingsLabel} title={settingsLabel} className="sm:hidden">
                <Settings2 aria-hidden="true" strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuLabel>{langLabel}</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={lang} onValueChange={(v) => v && onLang?.(v)}>
                <DropdownMenuRadioItem value="ko" lang="ko">한국어</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="en" lang="en">English</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{themeLabel}</DropdownMenuLabel>
              <ThemeMenuItems lang={lang} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default PortfolioHeader
