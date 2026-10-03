// Landing footer (DESIGN_SYSTEM.md §5.1): logo, two real links, copyright. No "#" links.
import { Link } from 'react-router-dom'
import { Logo } from '@/ui/patterns/Logo'
import { useI18n } from '../../i18n'

const LINK = 'rounded-sm text-text-2 transition-colors duration-100 hover:text-foreground'

export default function Footer() {
  const { t } = useI18n()
  const f = t.landing.footer
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-300 flex-wrap items-center gap-x-8 gap-y-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label={f.label} className="flex items-center gap-6 text-sm">
          <Link to="/insurance" className={LINK}>
            {f.console}
          </Link>
          <Link to="/dur" className={LINK}>
            {f.dur}
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground sm:ml-auto">{f.copyright}</p>
      </div>
    </footer>
  )
}
