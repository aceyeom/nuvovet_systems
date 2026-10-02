/**
 * Portfolio DUR showcase — app shell: header, hash router, footer.
 * Self-contained: imports only react, react-dom, lucide-react and files under
 * src/portfolio, so it mounts at /dur in the main app and in the standalone
 * build alike. No network access at runtime.
 */

import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react'
import './styles/portfolio.css'
import { LangProvider, useLang } from './i18n/index.js'
import { useHashRoute, HREF } from './router.js'
import AppHeader, { AppFooter } from './components/AppHeader.jsx'
import { CASE_BY_ID } from './cases/cases.js'

const CaseStudyPage = lazy(() => import('./pages/CaseStudyPage.jsx'))
const CasesPage = lazy(() => import('./pages/CasesPage.jsx'))
const WorkbenchPage = lazy(() => import('./pages/WorkbenchPage.jsx'))
const ReportPage = lazy(() => import('./pages/ReportPage.jsx'))
const HandoutPage = lazy(() => import('./pages/HandoutPage.jsx'))
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage.jsx'))

const THEME_KEY = 'nuvovet.dur.theme'
const THEMES = ['system', 'light', 'dark']

function readTheme() {
  try {
    const v = window.localStorage.getItem(THEME_KEY)
    return THEMES.includes(v) ? v : 'system'
  } catch {
    return 'system'
  }
}

function NotFound() {
  const { t } = useLang()
  return (
    <div className="pf-page">
      <div className="pf-empty-state">
        <h1 className="pf-h1">{t('notfound.title')}</h1>
        <p>{t('notfound.body')}</p>
        <a className="pf-btn pf-btn--primary" href={HREF.cases}>{t('notfound.back')}</a>
      </div>
    </div>
  )
}

function pageFor(route) {
  switch (route.name) {
    case 'study': return <CaseStudyPage route={route} />
    case 'cases': return <CasesPage route={route} />
    case 'workbench': return <WorkbenchPage route={route} />
    case 'report': return <ReportPage route={route} />
    case 'handout': return <HandoutPage route={route} />
    case 'how': return <HowItWorksPage route={route} />
    default: return <NotFound />
  }
}

function useDocumentTitle(route) {
  const { t, pick } = useLang()
  useEffect(() => {
    const app = t('app.name')
    let page = ''
    if (route.name === 'cases') page = t('nav.cases')
    else if (route.name === 'how') page = t('nav.how')
    else if (route.name === 'study') page = t('nav.study')
    else if (['workbench', 'report', 'handout'].includes(route.name)) {
      const c = CASE_BY_ID[route.params.id]
      const name = c ? pick(c.name) : t('wb.custom.title')
      page = route.name === 'report' ? `${name} · ${t('rv.report')}` : route.name === 'handout' ? `${name} · ${t('rv.handout')}` : name
    }
    try {
      document.title = page ? `${page} — ${app}` : app
    } catch {
      /* no document */
    }
  }, [route, t, pick])
}

function Shell() {
  const route = useHashRoute()
  const { t } = useLang()
  const [theme, setThemeState] = useState(readTheme)
  const rootRef = useRef(null)
  const mainRef = useRef(null)
  const lastPath = useRef(route.path)

  useDocumentTitle(route)

  const setTheme = (v) => {
    setThemeState(v)
    try {
      window.localStorage.setItem(THEME_KEY, v)
    } catch {
      /* storage unavailable: theme lasts for this page view */
    }
  }

  // Paint the page background (overscroll areas) with the active surface colour.
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const prev = document.body.style.backgroundColor
    document.body.style.backgroundColor = getComputedStyle(el).getPropertyValue('--pf-bg').trim()
    return () => { document.body.style.backgroundColor = prev }
  }, [theme])

  // Pinch-zoom must never be disabled here, even if the host page's viewport meta does.
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    if (!meta) return undefined
    const prev = meta.getAttribute('content')
    meta.setAttribute('content', 'width=device-width, initial-scale=1')
    return () => { if (prev != null) meta.setAttribute('content', prev) }
  }, [])

  // New page → top of the page (query-only changes keep the scroll position).
  useEffect(() => {
    if (lastPath.current !== route.path) {
      lastPath.current = route.path
      window.scrollTo(0, 0)
    }
  }, [route.path])

  return (
    <div className="pf-root" ref={rootRef} data-theme={theme === 'system' ? undefined : theme} data-route={route.name}>
      <button type="button" className="pf-skip" onClick={() => mainRef.current?.focus()}>{t('app.skip')}</button>
      <AppHeader route={route} theme={theme} onTheme={setTheme} />
      <main className="pf-main" id="pf-main" ref={mainRef} tabIndex={-1}>
        <Suspense fallback={<div className="pf-page pf-page--loading" aria-busy="true" />}>
          {pageFor(route)}
        </Suspense>
      </main>
      <AppFooter />
    </div>
  )
}

export default function PortfolioApp() {
  return (
    <LangProvider>
      <Shell />
    </LangProvider>
  )
}
