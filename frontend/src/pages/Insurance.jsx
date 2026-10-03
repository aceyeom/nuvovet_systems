// Insurer console (DESIGN_SYSTEM.md §5.3): nested routes, one URL per screen, all deep-linkable.
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { Building2, ChevronDown, Code, Gauge, LayoutDashboard, ListChecks, Moon, PanelLeft, Receipt, Rows3, Stethoscope, Sun, Monitor, UserRound } from 'lucide-react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/primitives/breadcrumb'
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
import { Toaster } from '@/ui/primitives/sonner'
import { EnvironmentMarker } from '@/ui/patterns/EnvironmentMarker'
import { ThemeMenuItems, ThemeToggle } from '@/ui/patterns/ThemeToggle'
import { setTheme } from '@/ui/theme'
import { AppShell } from '@/ui/ext/wp6/AppShell'
import { CommandMenu, useCommandShortcut } from '@/ui/ext/wp6/CommandMenu'
import { ConsoleContext } from './insurance/context'
import { useDemo } from './insurance/data/resources'
import claimIndex from './insurance/data/claimIndex.json'
import { diagnosisOf } from './insurance/data/claimIndex.js'
import { openCount } from './insurance/model'
import { ENV_LABEL, ENV_TOOLTIP, NAV, PRODUCT, USER_LABEL, ruleLabel } from './insurance/strings.ko.js'
import { readDensity, writeDensity } from './insurance/density'

const Overview = lazy(() => import('./insurance/screens/Overview'))
const ClaimsQueue = lazy(() => import('./insurance/screens/ClaimsQueue'))
const ClaimDetailPage = lazy(() => import('./insurance/screens/ClaimDetailPage'))
const Clinics = lazy(() => import('./insurance/screens/Clinics'))
const ClinicDetail = lazy(() => import('./insurance/screens/ClinicDetail'))
const Fees = lazy(() => import('./insurance/screens/Fees'))
const Evaluation = lazy(() => import('./insurance/screens/Evaluation'))
const Api = lazy(() => import('./insurance/screens/Api'))

const NAV_ICONS = { overview: LayoutDashboard, claims: ListChecks, clinics: Building2, fees: Receipt, evaluation: Gauge, api: Code }

const RouterLink = ({ to, ...props }) => <Link to={to} {...props} />

function activeNav(pathname) {
  const hit = [...NAV].reverse().find((n) => n.to !== '/insurance' && (pathname === n.to || pathname.startsWith(n.to + '/')))
  return hit ? hit.id : pathname.replace(/\/$/, '') === '/insurance' ? 'overview' : null
}

function Crumbs({ pathname, demo }) {
  const claim = matchPath('/insurance/claims/:claimId', pathname)
  const clinic = matchPath('/insurance/clinics/:clinicId', pathname)
  const nav = NAV.find((n) => n.id === activeNav(pathname))
  const parts = []
  // The claim page carries its own breadcrumb (golden claim header, §9.9); the top bar names the section.
  if (claim) parts.push({ to: '/insurance/claims', label: '청구 심사' })
  else if (clinic) {
    const c = demo?.summary?.clinics?.find((x) => x.clinic_id === clinic.params.clinicId)
    parts.push({ to: '/insurance/clinics', label: '병원 리스크' }, { label: c?.name || clinic.params.clinicId })
  } else if (nav) parts.push({ label: nav.label })
  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">
        {parts.map((p, i) => (
          <span key={i} className="contents">
            {i > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem className={i === parts.length - 1 ? 'min-w-0' : 'shrink-0 whitespace-nowrap'}>
              {p.to ? (
                <BreadcrumbLink asChild>
                  <Link to={p.to}>{p.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage data-truncate="" title={p.label} className={p.id ? 'id truncate' : 'truncate'}>{p.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-1 px-2 max-sm:size-8 max-sm:px-0" aria-label={`${USER_LABEL} 메뉴`}>
          <span className="max-sm:hidden">{USER_LABEL}</span>
          <UserRound aria-hidden="true" strokeWidth={1.5} className="sm:hidden" />
          <ChevronDown aria-hidden="true" strokeWidth={1.5} className="max-sm:hidden" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">화면 테마</DropdownMenuLabel>
        <ThemeMenuItems />
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">언어</DropdownMenuLabel>
        <DropdownMenuRadioGroup value="ko">
          <DropdownMenuRadioItem value="ko">한국어</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en" disabled>
            English (준비 중)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Blank() {
  return <div className="min-h-[50dvh] bg-background" />
}

export default function Insurance() {
  const demoRes = useDemo()
  const demo = demoRes.data
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [density, setDensityState] = useState(readDensity)
  const setDensity = useCallback((d) => {
    setDensityState(d)
    writeDensity(d)
  }, [])
  useCommandShortcut(setCmdOpen)

  // `g` then a letter jumps to a screen (shown in the command menu next to each 이동 row).
  useEffect(() => {
    let armed = 0
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (t?.closest?.('[role="dialog"],[role="menu"],[role="listbox"]')) return
      if (e.key === 'g') {
        armed = Date.now()
        return
      }
      if (armed && Date.now() - armed < 1200) {
        const hit = NAV.find((n) => n.key === e.key)
        armed = 0
        if (hit) {
          e.preventDefault()
          navigate(hit.to)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  // Scroll to the top on screen changes (not on query-string changes such as ?sel=).
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  const open = demo ? openCount(demo.summary.decisions) : null
  const nav = NAV.map((n) => ({ ...n, icon: NAV_ICONS[n.id], count: n.id === 'claims' ? open : undefined }))
  const ctx = useMemo(
    () => ({ demo, demoState: demoRes, index: claimIndex, go: navigate, density, setDensity }),
    [demo, demoRes, navigate, density, setDensity],
  )

  const groups = useMemo(() => {
    const go = (to) => () => navigate(to)
    const claims = demo?.claims || []
    return [
      { heading: '이동', items: nav.map((n) => ({ id: `nav-${n.id}`, label: n.label, icon: n.icon, shortcut: `G ${n.key.toUpperCase()}`, onSelect: go(n.to) })) },
      {
        heading: '청구',
        items: claims.map((c) => ({
          id: c.claim_id,
          label: c.claim_id,
          hint: [c.clinic, diagnosisOf(claimIndex, c)].filter(Boolean).join(', '),
          onSelect: go(`/insurance/claims/${c.claim_id}`),
        })),
      },
      {
        heading: '병원',
        items: (demo?.summary?.clinics || []).map((c) => ({ id: c.clinic_id, label: c.name, hint: c.region, keywords: c.clinic_id, onSelect: go(`/insurance/clinics/${c.clinic_id}`) })),
      },
      {
        heading: '규칙',
        items: Object.keys(demo?.summary?.rule_hits || {}).map((r) => ({
          id: r,
          label: ruleLabel(r),
          hint: r,
          onSelect: go(`/insurance/claims?view=all&rule=${encodeURIComponent(r)}`),
        })),
      },
      {
        heading: '설정',
        items: [
          { id: 'theme-system', label: '테마: 시스템', icon: Monitor, onSelect: () => setTheme('system') },
          { id: 'theme-light', label: '테마: 라이트', icon: Sun, onSelect: () => setTheme('light') },
          { id: 'theme-dark', label: '테마: 다크', icon: Moon, onSelect: () => setTheme('dark') },
          { id: 'density', label: density === 'compact' ? '행 높이: 기본' : '행 높이: 좁게', icon: Rows3, onSelect: () => setDensity(density === 'compact' ? 'default' : 'compact') },
          {
            id: 'sidebar',
            label: '사이드바 접기·펼치기',
            icon: PanelLeft,
            shortcut: '⌘ B',
            onSelect: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true, ctrlKey: true })),
          },
        ],
      },
    ]
  }, [demo, nav, navigate, density, setDensity])

  return (
    <ConsoleContext.Provider value={ctx}>
      <AppShell
        nav={nav}
        activeId={activeNav(pathname)}
        footer={[{ id: 'clinic', to: '/clinic/claim', label: '병원용 사전 점검', icon: Stethoscope }]}
        LinkComponent={RouterLink}
        homeTo="/insurance"
        product={PRODUCT}
        breadcrumb={<Crumbs pathname={pathname} demo={demo} />}
        onOpenCommand={() => setCmdOpen(true)}
        marker={<EnvironmentMarker label={ENV_LABEL} tooltip={demo ? ENV_TOOLTIP[demo.source] : ENV_TOOLTIP.snapshot} />}
        themeToggle={<ThemeToggle />}
        userMenu={<UserMenu />}
      >
        <Suspense fallback={<Blank />}>
          <Routes>
            <Route index element={<Overview />} />
            <Route path="claims" element={<ClaimsQueue />} />
            <Route path="claims/:claimId" element={<ClaimDetailPage />} />
            <Route path="clinics" element={<Clinics />} />
            <Route path="clinics/:clinicId" element={<ClinicDetail />} />
            <Route path="fees" element={<Fees />} />
            <Route path="evaluation" element={<Evaluation />} />
            <Route path="api" element={<Api />} />
            <Route path="*" element={<Navigate to="/insurance" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
      <CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} groups={groups} />
      <Toaster />
    </ConsoleContext.Provider>
  )
}

