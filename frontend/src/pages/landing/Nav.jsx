// Landing nav (DESIGN_SYSTEM.md §5.1): 56 px, sticky, a hairline once the page has scrolled.
// 파일럿 문의 appears only when CONTACT_EMAIL is non-empty; then 콘솔 데모 열기 drops to secondary.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/ui/primitives/button'
import { Logo } from '@/ui/patterns/Logo'
import { cn } from '@/ui/cn'
import { CONTACT_EMAIL, useI18n } from '../../i18n'

const NAV_LINK = 'rounded-sm text-text-2 transition-colors duration-100 hover:text-foreground'

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return scrolled
}

export function Nav() {
  const { t } = useI18n()
  const n = t.landing.nav
  const scrolled = useScrolled()
  return (
    <header
      className={cn(
        'sticky top-0 z-[var(--z-header)] h-14 border-b bg-background transition-colors duration-100',
        scrolled ? 'border-border' : 'border-transparent',
      )}
    >
      <div className="mx-auto flex h-full max-w-300 items-center gap-8 px-4 max-sm:gap-4 sm:px-6">
        <Link to="/" aria-label={n.home} className="rounded-sm">
          <Logo size={20} />
        </Link>
        <nav aria-label={n.label} className="flex min-w-0 flex-1 items-center gap-6 text-sm">
          <a href="#example" className={cn(NAV_LINK, 'max-sm:hidden')}>
            {n.product}
          </a>
          <a href="#integration" className={cn(NAV_LINK, 'max-sm:hidden')}>
            {n.integration}
          </a>
          <a href="#security" className={cn(NAV_LINK, 'max-sm:hidden')}>
            {n.security}
          </a>
          {CONTACT_EMAIL ? (
            <a href={`mailto:${CONTACT_EMAIL}`} className={cn(NAV_LINK, 'max-sm:hidden')}>
              {n.pilot}
            </a>
          ) : null}
          <Link to="/dur" className="rounded-sm text-muted-foreground transition-colors duration-100 hover:text-foreground">
            {n.dur}
          </Link>
        </nav>
        <Button asChild variant={CONTACT_EMAIL ? 'secondary' : 'default'}>
          <Link to="/insurance">{n.console}</Link>
        </Button>
      </div>
    </header>
  )
}

export default Nav
