/**
 * Portfolio DUR showcase: app shell (header, hash router, footer). DESIGN_SYSTEM.md §5.5.
 * Imports only react, react-dom, lucide-react, `@/ui/**` and files under src/portfolio, so it mounts at
 * /dur in the main app and in the standalone build alike. No network access at runtime. Fonts are
 * loaded by the entry (src/ui/fonts.js in the main app, fonts-standalone.css in the standalone build).
 */

import { Suspense, lazy, useEffect, useRef } from 'react'
import { Button } from '@/ui/primitives/button'
import { initTheme } from '@/ui/theme'
import { PortfolioHeader } from '@/ui/ext/wp5/PortfolioHeader'
import { LangProvider, useLang } from './i18n/index.js'
import { HREF } from './router.js'
import { useHashRoute } from './useHashRoute.js'
import { CASE_BY_ID } from './cases/cases.js'
import { caseName } from './components/format.js'

const CaseStudyPage = lazy(() => import('./pages/CaseStudyPage.jsx'))
const CasesPage = lazy(() => import('./pages/CasesPage.jsx'))
const WorkbenchPage = lazy(() => import('./pages/WorkbenchPage.jsx'))
const ReportPage = lazy(() => import('./pages/ReportPage.jsx'))
const HandoutPage = lazy(() => import('./pages/HandoutPage.jsx'))
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage.jsx'))
const EmrDemoPage = lazy(() => import('./pages/EmrDemoPage.jsx'))

const NAV = [
  { key: 'study', href: HREF.study, match: (r) => r.name === 'study' },
  { key: 'cases', href: HREF.cases, match: (r) => ['cases', 'workbench', 'report', 'handout'].includes(r.name) },
  { key: 'emr', href: HREF.emr, match: (r) => r.name === 'emr' },
  { key: 'how', href: HREF.how, match: (r) => r.name === 'how' },
]

function NotFound() {
  const { t } = useLang()
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-3 px-4 py-16 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">{t('notfound.title')}</h1>
      <p className="text-sm text-text-2">{t('notfound.body')}</p>
      <Button asChild>
        <a href={HREF.cases}>{t('notfound.back')}</a>
      </Button>
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

/** document.title per route (§6.5): "NuvoVet DUR · 사례 연구"; parts joined with " · ", never an em dash. */
function useDocumentTitle(route) {
  const { t, pick } = useLang()
  useEffect(() => {
    const app = t('app.name')
    let parts = [app]
    if (route.name === 'emr') parts = [t('nav.emr'), app]
    else if (route.name === 'cases') parts.push(t('nav.cases'))
    else if (route.name === 'how') parts.push(t('nav.how'))
    else if (route.name === 'study') parts.push(t('nav.study'))
    else if (['workbench', 'report', 'handout'].includes(route.name)) {
      const c = CASE_BY_ID[route.params.id]
      parts.push(c ? caseName(c, pick) : t('wb.custom.title'))
      if (route.name === 'report') parts.push(t('rv.report'))
      if (route.name === 'handout') parts.push(t('rv.handout'))
    }
    try {
      document.title = parts.join(' · ')
    } catch {
      /* no document */
    }
  }, [route, t, pick])
}

function Shell() {
  const route = useHashRoute()
  const { t, lang, setLang } = useLang()
  const mainRef = useRef(null)
  const lastPath = useRef(route.path)

  useDocumentTitle(route)

  // Re-apply the stored theme; migrates the portfolio's legacy key once (DESIGN_SYSTEM.md §2.6).
  useEffect(() => { initTheme() }, [])

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

  // The EMR demo brings its own 40 px demo bar as page chrome (popup spec §7).
  if (route.name === 'emr') {
    return (
      <div className="min-h-dvh bg-background text-foreground" data-route="emr">
        <Suspense fallback={<div className="min-h-dvh bg-background" />}>
          <EmrDemoPage route={route} />
        </Suspense>
      </div>
    )
  }

  const nav = NAV.map((n) => ({ key: n.key, href: n.href, label: t(`nav.${n.key}`), current: n.match(route) }))

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground" data-route={route.name}>
      <button
        type="button"
        onClick={() => mainRef.current?.focus()}
        className="sr-only z-[var(--z-toast)] rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2"
      >
        {t('app.skip')}
      </button>
      <PortfolioHeader
        homeHref={HREF.study}
        homeLabel={t('app.home')}
        product={t('app.product')}
        brand="dur"
        nav={nav}
        navLabel={t('nav.label')}
        marker={t('app.marker')}
        markerTooltip={t('app.markerTooltip')}
        lang={lang}
        onLang={setLang}
        langLabel={t('lang.label')}
        settingsLabel={t('app.settings')}
        themeLabel={t('app.theme')}
      />
      <main id="pf-main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<div className="min-h-[60dvh] bg-background" aria-busy="true" />}>
          {pageFor(route)}
        </Suspense>
      </main>
      <footer className="border-t border-border print:hidden">
        <p className="mx-auto max-w-[1200px] px-4 py-6 text-xs text-muted-foreground sm:px-6">{t('footer.line')}</p>
      </footer>
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
