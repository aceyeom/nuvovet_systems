import { FlaskConical } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import { HREF } from '../router.js'
import LangToggle from './LangToggle.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export function LogoMark({ size = 28 }) {
  return (
    <svg className="pf-logo" width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect x="0.75" y="0.75" width="26.5" height="26.5" rx="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <g transform="rotate(-35 14 14)" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="6.5" y="10.5" width="15" height="7" rx="3.5" />
        <path d="M14 10.5V17.5" />
      </g>
    </svg>
  )
}

const NAV = [
  { key: 'study', href: HREF.study, match: (r) => r.name === 'study' },
  { key: 'cases', href: HREF.cases, match: (r) => ['cases', 'workbench', 'report', 'handout'].includes(r.name) },
  { key: 'how', href: HREF.how, match: (r) => r.name === 'how' },
]

export default function AppHeader({ route, theme, onTheme }) {
  const { t } = useLang()
  return (
    <header className="pf-header">
      <div className="pf-header__inner">
        <a className="pf-brand" href={HREF.study} aria-label={t('app.home')}>
          <LogoMark />
          <span className="pf-brand__text">
            <span className="pf-brand__name">{t('app.name')}</span>
            <span className="pf-brand__disclaimer">
              <FlaskConical size={12} aria-hidden="true" />
              {t('app.disclaimer')}
            </span>
          </span>
        </a>
        <nav className="pf-nav" aria-label={t('nav.label')}>
          {NAV.map((n) => {
            const active = n.match(route)
            return (
              <a key={n.key} href={n.href} className={`pf-nav__link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
                {t(`nav.${n.key}`)}
              </a>
            )
          })}
        </nav>
        <div className="pf-header__tools">
          <LangToggle />
          <ThemeToggle theme={theme} onChange={onTheme} />
        </div>
      </div>
    </header>
  )
}

export function AppFooter() {
  const { t } = useLang()
  return (
    <footer className="pf-footer">
      <div className="pf-footer__inner">
        <p className="pf-footer__strong">{t('footer.line1')}</p>
        <p>{t('footer.line2')}</p>
      </div>
    </footer>
  )
}
