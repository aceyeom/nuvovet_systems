/**
 * DataTable (DESIGN_SYSTEM.md §4.5): TanStack Table v9 + the vendored table markup.
 *
 * - Header: sticky, bg-subtle, border-strong rule, text-xs 500 muted, sentence case; header height =
 *   body row height. Sortable headers are buttons inside th[aria-sort].
 * - Density: 'compact' (32 px) or 'default' (36 px).
 * - Rows: the first cell holds an <a>; a click anywhere on the row is delegated to that link (the
 *   handler sits on <tbody>, the row stays a plain <tr>). `j`/`k` move the selection, Enter opens it.
 * - Row states: rest, hover (row-hover), selected (brand-soft + aria-selected), keyboard focus (§3.9
 *   outline on the first-cell link, inset), flagged (no fill: a 20 px leading column with a 14 px
 *   CircleAlert in --sev-moderate), flagged + selected.
 * - States: empty (EmptyState), loading (skeleton rows), error.
 * - Pagination: client-side slicing, 50 rows per page, footer "135건 중 1–50".
 *
 * Column defs are TanStack v9 column defs (createColumnHelper().accessor(...)); `meta` may carry
 *   { num: true }       right-aligned tabular cell + header
 *   { id: true }        identifier style (.id)
 *   { className, headerClassName }
 *   { emphasizeWhenFlagged: true }  font-medium when the row is flagged (amount columns)
 *   { truncate: true | 'max-w-…' }  one line with an ellipsis (default max-w-60) and the full text as title
 *   { hideBelow: 'sm' | 'lg' | 'xl' | 'wide' }  hide the column under that breakpoint (CSS only)
 *
 * Controlled state (optional): `sorting` + `onSortingChange` (TanStack SortingState, e.g. to mirror
 * ?sort= in the URL), `columnVisibility` ({ [columnId]: false }, e.g. hide columns while a side panel
 * is open). Uncontrolled: `initialSorting`.
 *
 * Sticky header: when the table fits its width the wrapper does not become a scroll container
 * (overflow-x: clip), so the header sticks to the page below the app's own sticky top bar. The
 * offset is `stickyTop` when given, else --nv-sticky-top when a shell sets it, else the height of
 * the page's sticky/fixed <header> pinned at top 0 (measured, e.g. the console's 48 px bar). When the
 * columns overflow, the wrapper scrolls sideways with a visible thin scrollbar and an edge rule on the
 * side that has more columns.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, CircleAlert } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Button } from '@/ui/primitives/button'
import { Skeleton } from '@/ui/primitives/skeleton'
import { fmtRangeOf } from '@/ui/lib/format'
import { EmptyState } from '@/ui/patterns/EmptyState'

export { createColumnHelper }

const features = tableFeatures({ rowSortingFeature, columnVisibilityFeature, sortedRowModel: createSortedRowModel(), sortFns })

const ROW_H = { compact: 'h-8', default: 'h-9' }
const HIDE_BELOW = { sm: 'max-sm:hidden', lg: 'max-lg:hidden', xl: 'max-xl:hidden', wide: 'max-wide:hidden' }

function truncateClass(t) {
  return typeof t === 'string' ? t : 'max-w-60'
}

/** Click a row's first-cell link after moving focus to it, so focus returns to the row afterwards. */
function activateLink(link) {
  if (!link) return
  try {
    link.focus({ preventScroll: true })
  } catch {
    /* focus() options unsupported */
  }
  link.click()
}

/** Top offset (px) for a page-sticky table header: --nv-sticky-top, else the sticky/fixed top <header>. */
function useStickyOffset(enabled) {
  const [top, setTop] = useState(0)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined
    const measure = () => {
      const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nv-sticky-top'))
      if (Number.isFinite(v)) return setTop(v)
      let h = 0
      for (const el of document.querySelectorAll('header')) {
        const cs = getComputedStyle(el)
        if ((cs.position === 'sticky' || cs.position === 'fixed') && parseFloat(cs.top) === 0) h = Math.max(h, el.getBoundingClientRect().height)
      }
      setTop(Math.round(h))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [enabled])
  return top
}

/** 'none' | 'left' | 'right' | 'both': which sides of a horizontally scrolling wrapper hide columns. */
function useOverflow(ref) {
  const [state, setState] = useState('none')
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth
      if (max <= 1) return setState('none')
      const left = el.scrollLeft > 1
      const right = el.scrollLeft < max - 1
      setState(left && right ? 'both' : left ? 'left' : right ? 'right' : 'none-scroll')
    }
    measure()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    if (el.firstElementChild) ro?.observe(el.firstElementChild)
    el.addEventListener('scroll', measure, { passive: true })
    return () => {
      ro?.disconnect()
      el.removeEventListener('scroll', measure)
    }
  }, [ref])
  return state
}

function isTypingTarget(el) {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

function SortIcon({ dir }) {
  const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ChevronsUpDown
  return <Icon aria-hidden="true" strokeWidth={1.5} className={cn('size-3.5', dir ? 'text-foreground' : 'text-muted-foreground')} />
}

export function DataTable({
  columns,
  data,
  getRowId = (row, i) => String(row.id ?? i),
  density = 'default',
  isFlagged,
  selectedId,
  onSelect,
  onOpen,
  keyboard = false,
  initialSorting = [],
  sorting,
  onSortingChange,
  columnVisibility,
  flagLabel = '검토 표시',
  stickyTop,
  pageSize = 50,
  page: pageProp,
  onPageChange,
  paginate = true,
  loading = false,
  error,
  empty = '표시할 항목이 없습니다',
  emptyAction,
  caption,
  maxHeight,
  rowClassName,
  getRowProps,
  className,
  'aria-label': ariaLabel,
  ...props
}) {
  const controlled = {}
  if (sorting !== undefined) controlled.sorting = sorting
  if (columnVisibility !== undefined) controlled.columnVisibility = columnVisibility
  const table = useTable({
    features,
    columns,
    data,
    getRowId,
    initialState: { sorting: initialSorting },
    ...(Object.keys(controlled).length ? { state: controlled } : null),
    ...(onSortingChange ? { onSortingChange } : null),
  })
  const [pageState, setPageState] = useState(0)
  const page = pageProp ?? pageState
  const setPage = useCallback((p) => (onPageChange ? onPageChange(p) : setPageState(p)), [onPageChange])

  const allRows = table.getRowModel().rows
  const total = allRows.length
  const pageCount = paginate ? Math.max(1, Math.ceil(total / pageSize)) : 1
  const safePage = Math.min(page, pageCount - 1)
  const rows = paginate ? allRows.slice(safePage * pageSize, safePage * pageSize + pageSize) : allRows
  const flagCol = typeof isFlagged === 'function'
  const headerGroups = table.getHeaderGroups()
  const colCount = (headerGroups[0]?.headers.length || 1) + (flagCol ? 1 : 0)
  const bodyRef = useRef(null)
  const scrollRef = useRef(null)
  const overflow = useOverflow(scrollRef)
  const scrolls = overflow !== 'none' || !!maxHeight
  const autoTop = useStickyOffset(!scrolls && stickyTop === undefined)

  const rowIds = useMemo(() => rows.map((r) => r.id), [rows])

  const openRow = useCallback(
    (id) => {
      if (onOpen) return onOpen(id)
      activateLink(bodyRef.current?.querySelector(`tr[data-row-id="${CSS.escape(id)}"] td a[href]`))
    },
    [onOpen],
  )

  useEffect(() => {
    if (!keyboard) return undefined
    const onKey = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      if (e.target.closest?.('[role="dialog"],[role="menu"],[role="listbox"]')) return
      if (e.key !== 'j' && e.key !== 'k' && e.key !== 'Enter') return
      if (!rowIds.length) return
      const i = rowIds.indexOf(selectedId)
      if (e.key === 'Enter') {
        if (i < 0 || e.target.closest?.('a,button')) return
        e.preventDefault()
        openRow(selectedId)
        return
      }
      e.preventDefault()
      const next = e.key === 'j' ? Math.min(rowIds.length - 1, i + 1) : Math.max(0, i < 0 ? 0 : i - 1)
      const id = rowIds[next]
      onSelect?.(id)
      bodyRef.current?.querySelector(`tr[data-row-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyboard, rowIds, selectedId, onSelect, openRow])

  // Row click → the row's first-cell link (unless the click was on another control or a text selection).
  const onBodyClick = (e) => {
    if (e.defaultPrevented || e.button !== 0) return
    const interactive = e.target.closest('a,button,input,select,textarea,label,[role="button"],[role="checkbox"]')
    if (interactive) return
    if (window.getSelection?.()?.toString()) return
    const tr = e.target.closest('tr[data-row-id]')
    if (!tr) return
    const link = tr.querySelector('td a[href]')
    if (link) {
      activateLink(link)
    } else if (onSelect) onSelect(tr.dataset.rowId)
  }

  const rowH = ROW_H[density] || ROW_H.default
  // Page-sticky header only when the wrapper is not a scroll container; inside one, top 0 of the wrapper.
  const thStyle = scrolls ? undefined : { top: stickyTop ?? autoTop }
  const from = total ? safePage * pageSize + 1 : 0
  const to = Math.min(total, (safePage + 1) * pageSize)

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <div
        ref={scrollRef}
        data-overflow={overflow === 'none' || overflow === 'none-scroll' ? undefined : overflow}
        className={cn(
          'relative w-full',
          scrolls ? 'overflow-x-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]' : 'overflow-x-clip',
          // Edge rule on the side with hidden columns (no gradients, §1.2).
          'data-[overflow=right]:border-r data-[overflow=both]:border-x data-[overflow=left]:border-l data-[overflow]:border-border-strong',
        )}
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        <table className="w-full caption-bottom text-sm" aria-label={ariaLabel}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            {headerGroups.map((hg) => (
              <tr key={hg.id} className="border-b border-border-strong">
                {flagCol ? <th scope="col" style={thStyle} className={cn('sticky top-0 z-[var(--z-sticky)] w-5 bg-subtle p-0', rowH)}><span className="sr-only">표시</span></th> : null}
                {hg.headers.map((h, hi) => {
                  const meta = h.column.columnDef.meta || {}
                  const canSort = h.column.getCanSort()
                  const dir = h.column.getIsSorted()
                  const first = hi === 0 && !flagCol
                  return (
                    <th
                      key={h.id}
                      style={thStyle}
                      scope="col"
                      aria-sort={canSort ? (dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none') : undefined}
                      className={cn(
                        'sticky top-0 z-[var(--z-sticky)] bg-subtle px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground',
                        rowH,
                        first && 'pl-4',
                        hi === hg.headers.length - 1 && 'pr-4',
                        meta.num && 'num text-right',
                        HIDE_BELOW[meta.hideBelow],
                        meta.headerClassName,
                      )}
                    >
                      {h.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className={cn('inline-flex items-center gap-1 rounded-sm text-xs font-medium hover:text-foreground', meta.num && 'flex-row-reverse')}
                        >
                          <table.FlexRender header={h} />
                          <SortIcon dir={dir} />
                        </button>
                      ) : (
                        <table.FlexRender header={h} />
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody ref={bodyRef} onClick={onBodyClick}>
            {loading
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={`sk${i}`} className="border-b border-border">
                    <td colSpan={colCount} className={cn('px-4', rowH)}>
                      <Skeleton className="h-3 w-full" />
                    </td>
                  </tr>
                ))
              : null}
            {!loading && error ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-6 text-sm text-sev-critical">
                  {error}
                </td>
              </tr>
            ) : null}
            {!loading && !error && !rows.length ? (
              <tr>
                <td colSpan={colCount}>
                  <EmptyState title={empty} action={emptyAction} />
                </td>
              </tr>
            ) : null}
            {!loading && !error
              ? rows.map((row) => {
                  const selected = selectedId != null && row.id === selectedId
                  const flagged = flagCol && isFlagged(row.original)
                  const cells = row.getVisibleCells ? row.getVisibleCells() : row.getAllCells()
                  return (
                    <tr
                      key={row.id}
                      data-row-id={row.id}
                      data-flagged={flagged || undefined}
                      {...getRowProps?.(row.original, { selected, flagged })}
                      aria-selected={onSelect || selectedId !== undefined ? selected : undefined}
                      className={cn(
                        'cursor-pointer border-b border-border transition-colors duration-100',
                        selected ? 'bg-brand-soft' : 'bg-background hover:bg-row-hover',
                        rowClassName?.(row.original, { selected, flagged }),
                      )}
                    >
                      {flagCol ? (
                        <td className={cn('w-5 p-0 pl-1.5', rowH)}>
                          {flagged ? <CircleAlert role="img" aria-label={flagLabel} strokeWidth={1.5} className="size-3.5 text-sev-moderate" /> : null}
                        </td>
                      ) : null}
                      {cells.map((cell, ci) => {
                        const meta = cell.column.columnDef.meta || {}
                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              'px-3 align-middle whitespace-nowrap text-foreground',
                              rowH,
                              ci === 0 && !flagCol && 'pl-4',
                              ci === cells.length - 1 && 'pr-4',
                              ci === 0 && '[&_a]:text-foreground [&_a:focus-visible]:outline-offset-[-2px] [&_a]:hover:underline',
                              meta.num && 'num',
                              meta.id && 'id',
                              flagged && meta.emphasizeWhenFlagged && 'font-medium',
                              HIDE_BELOW[meta.hideBelow],
                              meta.className,
                            )}
                          >
                            {meta.truncate ? (
                              <span
                                data-truncate=""
                                title={(() => {
                                  const v = cell.getValue?.()
                                  return typeof v === 'string' || typeof v === 'number' ? String(v) : undefined
                                })()}
                                className={cn('block truncate', truncateClass(meta.truncate))}
                              >
                                <table.FlexRender cell={cell} />
                              </span>
                            ) : (
                              <table.FlexRender cell={cell} />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              : null}
          </tbody>
        </table>
      </div>
      {paginate && total > pageSize ? (
        <div className="flex h-10 items-center justify-between gap-3 px-4 text-xs text-muted-foreground">
          <span className="num text-left">{fmtRangeOf(total, from, to)}</span>
          <nav aria-label="페이지" className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="이전 페이지" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft strokeWidth={1.5} />
            </Button>
            {Array.from({ length: pageCount }, (_, p) => p)
              .filter((p) => pageCount <= 7 || p === 0 || p === pageCount - 1 || Math.abs(p - safePage) <= 1)
              .map((p, i, arr) => (
                <span key={p} className="flex items-center gap-1">
                  {i > 0 && p - arr[i - 1] > 1 ? <span aria-hidden="true">…</span> : null}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-current={p === safePage ? 'page' : undefined}
                    className={cn('num text-xs', p === safePage && 'bg-brand-soft text-foreground')}
                    onClick={() => setPage(p)}
                  >
                    {p + 1}
                  </Button>
                </span>
              ))}
            <Button variant="ghost" size="icon-sm" aria-label="다음 페이지" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
              <ChevronRight strokeWidth={1.5} />
            </Button>
          </nav>
        </div>
      ) : null}
    </div>
  )
}
