// 청구 심사 queue (DESIGN_SYSTEM.md §5.3):
// /insurance/claims?view=open|pend|review|deny|auto|all&q=&sort=&sel=&insurer=&channel=&rule=&page=
// j / k move the selection (?sel=), Enter opens the claim. At wide: (≥ 1440 px) the selection opens the
// non-modal ClaimDetailPanel; below that the detail is its own page.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Maximize2, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/ui/primitives/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/ui/primitives/toggle-group'
import { Badge } from '@/ui/primitives/badge'
import { DataTable } from '@/ui/patterns/DataTable'
import { PageHeader } from '@/ui/patterns/PageHeader'
import { useTitle } from '@/ui/patterns/useTitle'
import { fmtRangeOf } from '@/ui/lib/format'
import { SavedViewTabs } from '@/ui/ext/wp6/SavedViewTabs'
import { ClaimDetailPanel } from '@/ui/ext/wp6/ClaimDetailPanel'
import { useMediaQuery, DESKTOP, PHONE, WIDE } from '@/ui/ext/wp6/useMediaQuery'
import { useConsole } from '../context'
import { ClaimList, FLAG_LABEL, PANEL_VISIBILITY, SORTABLE, claimColumns } from '../claimTable.jsx'
import { filterClaims, isFlaggedClaim, normalizeView, parseSort, viewCounts } from '../model'
import { CHANNEL, INSURER, VIEWS, ruleLabel } from '../strings.ko.js'
import { ClaimDetailBody } from './ClaimDetailPage'
import { LoadError, Page, PageSkeleton } from './states'

const PAGE_SIZE = 50
const ALL = 'all'
const ALL_COLUMNS = {}
const VIEW_KEY = { open: 'open', pend: 'pend', review: 'review', deny: 'deny', auto: 'auto', all: 'all' }

function SearchBox({ value, onChange }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    if (draft === value) return undefined
    const t = setTimeout(() => onChange(draft), 200)
    return () => clearTimeout(t)
  }, [draft, value, onChange])
  return (
    <div className="relative w-72 min-w-0 max-lg:w-auto max-lg:min-w-48 max-lg:flex-1">
      <Search aria-hidden="true" strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && draft && (e.stopPropagation(), setDraft(''))}
        placeholder="청구 ID, 병원, 진단 검색"
        aria-label="청구 검색"
        className="pl-8"
      />
    </div>
  )
}

/** Under 640 px the two filter selects move into a bottom sheet behind one "필터" button. */
function FilterSheet({ count, children }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="shrink-0 gap-1.5">
          <SlidersHorizontal strokeWidth={1.5} />
          필터
          {count ? <span className="num text-xs text-muted-foreground">{count}</span> : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="gap-0 pb-4">
        <SheetHeader>
          <SheetTitle>필터</SheetTitle>
          <SheetDescription className="sr-only">보험사와 접수 경로로 대기열을 좁힙니다.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

function FilterSelect({ label, value, onChange, options, allLabel }) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? '' : v)}>
      <SelectTrigger aria-label={label} className="w-40 max-sm:w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map(([k, v]) => (
          <SelectItem key={k} value={k}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default function ClaimsQueue() {
  useTitle('청구 심사', 'nuvovet')
  const { demo, demoState, index, go, density, setDensity } = useConsole()
  const [params, setParams] = useSearchParams()
  const wide = useMediaQuery(WIDE)
  const desktop = useMediaQuery(DESKTOP)
  const phone = useMediaQuery(PHONE)

  const view = normalizeView(params.get('view'))
  const q = params.get('q') || ''
  const insurer = INSURER[params.get('insurer')] ? params.get('insurer') : ''
  const channel = CHANNEL[params.get('channel')] ? params.get('channel') : ''
  const rule = params.get('rule') || ''
  const urlSel = params.get('sel') || null
  // The selection moves synchronously on j/k; the URL (?sel=) follows. Router navigations run as
  // transitions, so reading the selection back from the URL alone would drop fast key presses.
  const [sel, setSel] = useState(urlSel)
  useEffect(() => setSel(urlSel), [urlSel])
  const sortParam = params.get('sort') || ''
  const page = Math.max(0, (parseInt(params.get('page') || '1', 10) || 1) - 1)

  const update = useCallback(
    (patch, { resetPage = true, replace = true } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v == null || v === '' || (k === 'view' && v === 'open')) next.delete(k)
            else next.set(k, v)
          }
          if (resetPage && !('page' in patch)) next.delete('page')
          return next
        },
        { replace },
      )
    },
    [setParams],
  )

  const base = useMemo(() => (demo ? filterClaims(demo.claims, { view: 'all', q, insurer, channel, rule }, index) : []), [demo, q, insurer, channel, rule, index])
  const counts = useMemo(() => viewCounts(base), [base])
  const rows = useMemo(() => filterClaims(base, { view }), [base, view])
  const flagged = useMemo(() => isFlaggedClaim(index), [index])

  const qs = (patch) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '' || (k === 'view' && v === 'open')) next.delete(k)
      else next.set(k, v)
    }
    const s = next.toString()
    return s ? `/insurance/claims?${s}` : '/insurance/claims'
  }
  const hrefFor = wide ? (c) => qs({ sel: c.claim_id }) : (c) => `/insurance/claims/${c.claim_id}`
  const columns = useMemo(() => claimColumns(hrefFor, index), [wide, params, index]) // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes the panel and returns focus to the selected row's link.
  const tableRef = useRef(null)
  const focusRow = useRef(null)
  const closePanel = useCallback(() => {
    focusRow.current = sel
    setSel(null)
    update({ sel: null }, { resetPage: false })
  }, [sel, update])
  useEffect(() => {
    if (sel || !focusRow.current) return
    const id = focusRow.current
    focusRow.current = null
    tableRef.current?.querySelector(`tr[data-row-id="${CSS.escape(id)}"] a`)?.focus({ preventScroll: true })
  })
  useEffect(() => {
    if (!wide || !sel) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (e.target.closest?.('[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]')) return
      if (document.querySelector('[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]')) return
      e.preventDefault()
      closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [wide, sel, closePanel])

  const onSelect = useCallback(
    (id) => {
      setSel(id)
      update({ sel: id }, { resetPage: false })
    },
    [update],
  )

  // ?sort= is the source of truth: header clicks write it back (replace, page reset).
  const sorting = useMemo(() => parseSort(sortParam, SORTABLE), [sortParam])
  const onSortingChange = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const s = next?.[0]
      update({ sort: s ? `${s.id}.${s.desc ? 'desc' : 'asc'}` : null })
    },
    [sorting, update],
  )

  if (demoState.error) return <LoadError onRetry={demoState.reload} />
  if (!demo) return <PageSkeleton rows={12} />

  const views = VIEWS.map((v) => ({ ...v, count: counts[VIEW_KEY[v.id]], href: qs({ view: v.id, sel: null, page: null }) }))
  const showPanel = wide && !!sel
  const insurerOptions = Object.entries(INSURER).filter(([k]) => demo.claims.some((c) => c.insurer === k))
  const channelOptions = Object.entries(CHANNEL).filter(([k]) => demo.claims.some((c) => c.intake_channel === k))
  const mobileFrom = page * PAGE_SIZE
  const mobileRows = rows.slice(mobileFrom, mobileFrom + PAGE_SIZE)
  const filterSelects = (
    <>
      <FilterSelect label="보험사" value={insurer} onChange={(v) => update({ insurer: v })} options={insurerOptions} allLabel="전체 보험사" />
      <FilterSelect label="접수 경로" value={channel} onChange={(v) => update({ channel: v })} options={channelOptions} allLabel="전체 접수 경로" />
    </>
  )

  return (
    <div className="flex min-w-0">
      <Page className="min-w-0 flex-1">
        <PageHeader title="청구 심사" />
        <SavedViewTabs views={views} active={view} LinkComponent={Link} max={showPanel ? 3 : undefined} />
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={q} onChange={(v) => update({ q: v })} />
          {phone ? <FilterSheet count={(insurer ? 1 : 0) + (channel ? 1 : 0)}>{filterSelects}</FilterSheet> : filterSelects}
          {rule ? (
            <Badge variant="outline" className="h-8 gap-1 pr-0.5 pl-2 text-sm">
              규칙: {ruleLabel(rule)}
              <Button variant="ghost" size="icon-xs" aria-label="규칙 필터 해제" onClick={() => update({ rule: null })}>
                <X strokeWidth={1.5} />
              </Button>
            </Badge>
          ) : null}
          {desktop ? (
            <ToggleGroup type="single" size="sm" value={density} onValueChange={(v) => v && setDensity(v)} aria-label="행 높이" className="ml-auto">
              <ToggleGroupItem value="compact" className="px-2.5">
                좁게
              </ToggleGroupItem>
              <ToggleGroupItem value="default" className="px-2.5">
                기본
              </ToggleGroupItem>
            </ToggleGroup>
          ) : null}
        </div>
        {/* Tables sit inset on the 24 px content edge on every console screen; mobile lists run edge to edge. */}
        <div ref={tableRef} className={desktop ? 'min-w-0' : '-mx-6 max-sm:-mx-4'}>
          {desktop ? (
            <DataTable
              aria-label="청구 심사 대기열"
              density={density}
              columns={columns}
              data={rows}
              getRowId={(c) => c.claim_id}
              isFlagged={flagged}
              flagLabel={FLAG_LABEL}
              keyboard
              selectedId={sel}
              onSelect={onSelect}
              onOpen={(id) => go(`/insurance/claims/${id}`)}
              sorting={sorting}
              onSortingChange={onSortingChange}
              columnVisibility={showPanel ? PANEL_VISIBILITY : ALL_COLUMNS}
              pageSize={PAGE_SIZE}
              page={page}
              onPageChange={(p) => update({ page: p ? String(p + 1) : null }, { resetPage: false, replace: false })}
              getRowProps={() => ({ 'data-golden': 'queue-row' })}
              empty="조건에 맞는 청구가 없습니다."
              emptyAction={
                q || insurer || channel || rule ? (
                  <Button variant="secondary" onClick={() => update({ q: null, insurer: null, channel: null, rule: null })}>
                    필터 지우기
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <ClaimList claims={mobileRows} index={index} hrefFor={hrefFor} selectedId={sel} isFlagged={flagged} empty="조건에 맞는 청구가 없습니다." />
              {rows.length > PAGE_SIZE ? (
                <div className="flex h-10 items-center justify-between gap-3 px-4 text-xs text-muted-foreground">
                  <span className="num text-left">{fmtRangeOf(rows.length, mobileFrom + 1, Math.min(rows.length, mobileFrom + PAGE_SIZE))}</span>
                  <span className="flex gap-1">
                    <Button asChild={page > 0} variant="ghost" size="sm" disabled={page === 0}>
                      {page > 0 ? <Link to={qs({ page: page > 1 ? String(page) : null })}>이전</Link> : '이전'}
                    </Button>
                    <Button asChild={mobileFrom + PAGE_SIZE < rows.length} variant="ghost" size="sm" disabled={mobileFrom + PAGE_SIZE >= rows.length}>
                      {mobileFrom + PAGE_SIZE < rows.length ? <Link to={qs({ page: String(page + 2) })}>다음</Link> : '다음'}
                    </Button>
                  </span>
                </div>
              ) : null}
            </>
          )}
        </div>
      </Page>
      {showPanel ? (
        <ClaimDetailPanel
          key={sel}
          onClose={closePanel}
          actions={
            <Button asChild variant="ghost" size="sm" className="mr-auto">
              <Link to={`/insurance/claims/${sel}`}>
                <Maximize2 strokeWidth={1.5} />
                전체 화면으로 보기
              </Link>
            </Button>
          }
        >
          <ClaimDetailBody claimId={sel} variant="panel" />
        </ClaimDetailPanel>
      ) : null}
    </div>
  )
}
