import { useId, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Button } from '@/ui/primitives/button'
import { ToggleGroup, ToggleGroupItem } from '@/ui/primitives/toggle-group'
import { SEVERITY } from '@/ui/patterns/status'
import { useLang } from '../i18n/index.js'
import CitationChip from './CitationChip.jsx'
import { drugShort, sourceShort } from './format.js'
import { SEVERITIES } from '../engine/findings.js'

/*
 * Organ-system matrix, shown behind the "장기별 위험 보기" disclosure (§5.5).
 *
 * A drug × organ-system grid of ORDINAL flags (0–3): not magnitudes, so no colour ramp, no sums,
 * no percentages. Each cell is a 3-segment glyph in ink (filled count = level); "not assessed" is a
 * quiet hairline dash, never a 0. Systems no prescribed drug was assessed for, with no patient
 * factor or finding, fold into one line. The only colour is the Finding badge, which takes the
 * severity of the most severe finding involving that system. Hover and keyboard focus show the
 * same tooltip; Enter/click opens an inline detail. A table view is always available, and narrow
 * screens get a stacked list per system instead of the grid.
 */

const BADGE_ORDER = ['interaction', 'patient', 'additive']

function levelKey(level) {
  return level === 'na' || level == null ? 'na' : String(level)
}

export function LevelGlyph({ level }) {
  if (level === 'na' || level == null) {
    return (
      <span aria-hidden="true" className="inline-flex h-2.5 w-9 items-center">
        <span className="h-px w-full bg-border-strong" />
      </span>
    )
  }
  return (
    <span aria-hidden="true" className="inline-flex h-2.5 w-9 items-stretch gap-0.5">
      {[1, 2, 3].map((i) => (
        <span key={i} className={cn('flex-1 rounded-sm', i <= level ? 'bg-foreground' : 'bg-muted')} />
      ))}
    </span>
  )
}

/** The most severe of a set of severities (contraindicated > major > moderate > minor), or null. */
export function highestSeverity(severities) {
  const ranked = (severities || []).filter((s) => SEVERITIES.includes(s)).sort((a, b) => SEVERITIES.indexOf(a) - SEVERITIES.indexOf(b))
  return ranked[0] || null
}

/** Badges of one column grouped by kind; a Finding group carries its most severe finding's severity. */
export function groupBadges(badges) {
  const groups = {}
  for (const b of badges || []) {
    if (!groups[b.kind]) groups[b.kind] = []
    groups[b.kind].push(b)
  }
  return BADGE_ORDER.filter((k) => groups[k]).map((k) => ({
    kind: k,
    items: groups[k],
    severity: k === 'interaction' ? highestSeverity(groups[k].map((b) => b.severity)) : null,
  }))
}

/**
 * Columns to draw vs. systems to fold into one "not assessed for any prescribed drug" line: a
 * system is folded when it has no badge and every drug's cell is 'na'.
 */
export function splitColumns(matrix) {
  const quiet = matrix.columns.filter((col) => !col.badges?.length && matrix.rows.every((r) => r.cells[col.id].level === 'na'))
  return { shown: matrix.columns.filter((col) => !quiet.includes(col)), quiet }
}

/** Table view rows for one system: the drugs with an assessed level, and the drugs not assessed. */
export function tableGroup(col, matrix) {
  const assessed = matrix.rows.filter((r) => r.cells[col.id].level !== 'na')
  const notAssessed = matrix.rows.filter((r) => r.cells[col.id].level === 'na').map((r) => r.drugId)
  return { assessed, notAssessed }
}

const BADGE_BASE = 'inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border px-1.5 text-xs font-medium whitespace-nowrap'

export function MatrixBadge({ kind, count = 1, severity = null }) {
  const { t } = useLang()
  const tinted = kind === 'interaction' && severity && SEVERITY[severity]
  return (
    <span data-status={tinted ? severity : undefined} className={cn(BADGE_BASE, tinted ? SEVERITY[severity].cls : 'border-border-strong bg-background text-text-2')}>
      <span>{t(`om.badge.${kind}`)}</span>
      {count > 1 ? <span className="num">×{count}</span> : null}
    </span>
  )
}

function Legend() {
  const { t } = useLang()
  return (
    <div className="grid gap-3 text-xs text-text-2 sm:grid-cols-2" aria-label={t('om.legend')}>
      <ul className="flex flex-col gap-1.5">
        {[0, 1, 2, 3].map((l) => (
          <li key={l} className="flex items-center gap-2">
            <LevelGlyph level={l} />
            <span><span className="num">{l}</span> {t(`om.level.${l}`)}</span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <LevelGlyph level="na" />
          <span>{t('om.level.na')}</span>
        </li>
      </ul>
      <ul className="flex flex-col gap-1.5">
        {BADGE_ORDER.map((k) => (
          <li key={k} className="flex items-start gap-2">
            <MatrixBadge kind={k} />
            <span className="pt-0.5">{t(`om.badgeDesc.${k}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function badgeReasons(group, pick) {
  return group.items.map((b) => pick(b.reason))
}

/** Detail for one cell (drug row) or one patient-row cell (badges). cols: the drawn columns. */
function CellDetail({ matrix, cols, pos, onClose }) {
  const { t, pick } = useLang()
  const col = cols[pos.c]
  const isPatient = pos.r === 0
  const row = isPatient ? null : matrix.rows[pos.r - 1]
  const cell = row ? row.cells[col.id] : null
  const groups = groupBadges(col.badges)
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3" role="region" aria-live="polite" aria-label={`${pick(col.label)}${row ? `, ${drugShort(row.drugId, pick)}` : ''}`}>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted-foreground">{pick(col.label)}</span>
          <span className="text-sm font-semibold text-foreground">{row ? drugShort(row.drugId, pick) : t('om.patientRow')}</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('om.close')}>
          <X aria-hidden="true" strokeWidth={1.5} />
        </Button>
      </div>
      {cell ? (
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <LevelGlyph level={cell.level} />
          {t(`om.level.${levelKey(cell.level)}`)}
        </p>
      ) : null}
      {cell ? <p className="text-sm text-text-2">{cell.reason ? pick(cell.reason) : t('om.notAssessed')}</p> : null}
      {cell?.source ? <div><CitationChip id={cell.source} /></div> : null}
      {isPatient || groups.length > 0 ? (
        <div className="flex flex-col gap-2">
          {groups.length === 0 ? <p className="text-sm text-muted-foreground">{t('om.noBadges')}</p> : null}
          {groups.map((g) => (
            <div key={g.kind} className="flex flex-col gap-1">
              <MatrixBadge kind={g.kind} count={g.items.length} severity={g.severity} />
              <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm text-text-2">
                {badgeReasons(g, pick).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Hover/focus tooltip: level word first (the value), then system and drug, reason, source. */
function Tip({ matrix, cols, tip }) {
  const { t, pick, lang } = useLang()
  if (!tip) return null
  const col = cols[tip.c]
  if (!col) return null
  const isPatient = tip.r === 0
  const row = isPatient ? null : matrix.rows[tip.r - 1]
  const cell = row ? row.cells[col.id] : null
  const groups = groupBadges(col.badges)
  return (
    <div
      role="tooltip"
      data-floating=""
      className="pointer-events-none absolute z-[var(--z-overlay)] flex w-72 max-w-[calc(100%-16px)] flex-col gap-1 rounded-lg border border-border bg-popover p-3 text-xs text-text-2 shadow-pop"
      style={{ left: tip.x, top: tip.y }}
    >
      {cell ? (
        <>
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <LevelGlyph level={cell.level} />
            {t(`om.level.${levelKey(cell.level)}`)}
          </span>
          <span className="text-muted-foreground">{pick(col.label)}, {drugShort(row.drugId, pick)}</span>
          <span>{cell.reason ? pick(cell.reason) : t('om.notAssessed')}</span>
          {cell.source ? <span className="text-muted-foreground">{sourceShort(cell.source, lang)}</span> : null}
        </>
      ) : (
        <>
          <span className="text-muted-foreground">{pick(col.label)}, {t('om.patientRow')}</span>
          {groups.length === 0 ? <span>{t('om.noBadges')}</span> : null}
          {groups.map((g) => (
            <span key={g.kind} className="flex flex-col items-start gap-1">
              <MatrixBadge kind={g.kind} count={g.items.length} severity={g.severity} />
              <span>{badgeReasons(g, pick).join(' / ')}</span>
            </span>
          ))}
        </>
      )}
    </div>
  )
}

/** Systems with nothing to draw, in one line. */
function QuietLine({ quiet }) {
  const { t, pick } = useLang()
  if (!quiet.length) return null
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <LevelGlyph level="na" />
      <span>{t('om.quiet', { systems: quiet.map((c) => pick(c.label)).join(', ') })}</span>
    </p>
  )
}

const TH = 'h-8 px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground'
const TD = 'px-3 py-2 align-top text-sm text-foreground'

/**
 * Table view: one group per system (full-width header row), the patient's flags, one row per drug
 * with an assessed level, and the drugs not assessed collapsed into one muted line.
 */
function TableView({ matrix }) {
  const { t, pick } = useLang()
  const { shown, quiet } = splitColumns(matrix)
  return (
    <div className="flex flex-col gap-3">
      {shown.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-border-strong bg-subtle">
                <th scope="col" className={cn(TH, 'pl-0')}>{t('om.t.drug')}</th>
                <th scope="col" className={TH}>{t('om.t.level')}</th>
                <th scope="col" className={TH}>{t('om.t.reason')}</th>
                <th scope="col" className={TH}>{t('om.t.source')}</th>
              </tr>
            </thead>
            {shown.map((col) => <TableGroup key={col.id} col={col} matrix={matrix} t={t} pick={pick} />)}
          </table>
        </div>
      ) : null}
      <QuietLine quiet={quiet} />
    </div>
  )
}

function TableGroup({ col, matrix, t, pick }) {
  const groups = groupBadges(col.badges)
  const { assessed, notAssessed } = tableGroup(col, matrix)
  return (
    <tbody>
      <tr className="border-b border-border">
        <th scope="colgroup" colSpan={4} className="h-8 pt-3 text-left text-sm font-semibold text-foreground">{pick(col.label)}</th>
      </tr>
      {groups.length > 0 ? (
        <tr className="border-b border-border">
          <th scope="row" className={cn(TD, 'pl-0 text-left font-normal text-text-2')}>{t('om.patientRow')}</th>
          <td colSpan={3} className={TD}>
            <div className="flex flex-col gap-1.5">
              {groups.map((g) => (
                <div key={g.kind} className="flex flex-wrap items-start gap-2">
                  <MatrixBadge kind={g.kind} count={g.items.length} severity={g.severity} />
                  <span className="text-sm text-text-2">{g.items.map((b) => pick(b.reason)).join(' / ')}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      ) : null}
      {assessed.map((row) => {
        const cell = row.cells[col.id]
        return (
          <tr key={row.drugId} className="border-b border-border">
            <th scope="row" className={cn(TD, 'pl-0 text-left font-medium')}>{drugShort(row.drugId, pick)}</th>
            <td className={cn(TD, 'whitespace-nowrap')}>
              <span className="inline-flex items-center gap-2"><LevelGlyph level={cell.level} />{t(`om.level.${cell.level}`)}</span>
            </td>
            <td className={cn(TD, 'text-text-2')}>{cell.reason ? pick(cell.reason) : '–'}</td>
            <td className={TD}>{cell.source ? <CitationChip id={cell.source} /> : <span className="text-muted-foreground">–</span>}</td>
          </tr>
        )
      })}
      {notAssessed.length > 0 ? (
        <tr className="border-b border-border">
          <td colSpan={4} className="py-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <LevelGlyph level="na" />
              {t('om.t.notAssessedList', { drugs: notAssessed.map((id) => drugShort(id, pick)).join(', ') })}
            </span>
          </td>
        </tr>
      ) : null}
    </tbody>
  )
}

/** Stacked list per system (narrow screens). Each line expands in place. */
function StackedView({ matrix, hl }) {
  const { t, pick } = useLang()
  const [open, setOpen] = useState(null)
  const { shown, quiet } = splitColumns(matrix)
  return (
    <div className="flex flex-col gap-4 sm:hidden">
      {shown.map((col) => {
        const groups = groupBadges(col.badges)
        const colHl = hl?.organs?.includes(col.id)
        return (
          <section key={col.id} className={cn('flex flex-col gap-1.5 border-b border-border pb-3', colHl && 'bg-row-hover')}>
            <header className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{pick(col.label)}</h3>
              {groups.map((g) => <MatrixBadge key={g.kind} kind={g.kind} count={g.items.length} severity={g.severity} />)}
            </header>
            {groups.length > 0 ? <p className="text-xs text-text-2">{groups.flatMap((g) => g.items.map((b) => pick(b.reason))).join(' / ')}</p> : null}
            <ul className="flex flex-col">
              {matrix.rows.map((row) => {
                const cell = row.cells[col.id]
                const key = `${col.id}:${row.drugId}`
                const isOpen = open === key
                return (
                  <li key={row.drugId}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : key)}
                      className="flex h-10 w-full items-center gap-3 rounded-sm text-left text-sm hover:bg-row-hover"
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground" data-truncate="" title={drugShort(row.drugId, pick)}>{drugShort(row.drugId, pick)}</span>
                      <LevelGlyph level={cell.level} />
                      <span className="w-28 shrink-0 text-xs text-text-2">{t(`om.level.${levelKey(cell.level)}`)}</span>
                    </button>
                    {isOpen ? (
                      <div className="flex flex-col gap-1 pb-2 text-sm text-text-2">
                        <p>{cell.reason ? pick(cell.reason) : t('om.notAssessed')}</p>
                        {cell.source ? <div><CitationChip id={cell.source} /></div> : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      <QuietLine quiet={quiet} />
    </div>
  )
}

/**
 * matrix: result.organMatrix
 * highlight: { drugIds:[], organs:[] } | null, from the hovered finding
 */
export default function OrganMatrix({ matrix, highlight = null }) {
  const { t, pick } = useLang()
  const [view, setView] = useState('matrix')
  const [focus, setFocus] = useState({ r: 1, c: 0 })
  const [tip, setTip] = useState(null)
  const [selected, setSelected] = useState(null)
  const wrapRef = useRef(null)
  const descId = useId()
  const { shown: cols, quiet } = useMemo(() => splitColumns(matrix), [matrix])
  const nRows = matrix.rows.length + 1
  const nCols = cols.length
  const hl = useMemo(() => (highlight ? { drugIds: highlight.drugIds || [], organs: highlight.organs || [] } : null), [highlight])

  if (!matrix.rows.length) return <p className="text-sm text-muted-foreground">{t('om.empty')}</p>

  const safeFocus = { r: Math.min(focus.r, nRows - 1), c: Math.max(0, Math.min(focus.c, nCols - 1)) }
  const isSelected = (r, c) => Boolean(selected && selected.r === r && selected.c === c)

  const showTip = (r, c, el) => {
    if (isSelected(r, c)) return
    const wrap = wrapRef.current
    if (!wrap || !el) return
    const w = wrap.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    const tipW = Math.min(288, w.width - 16)
    let x = b.left - w.left + wrap.scrollLeft + b.width / 2 - tipW / 2
    x = Math.max(8, Math.min(x, wrap.scrollWidth - tipW - 8))
    setTip({ r, c, x, y: b.bottom - w.top + 6 })
  }

  const focusCell = (r, c) => {
    setFocus({ r, c })
    wrapRef.current?.querySelector(`[data-pos="${r}-${c}"]`)?.focus()
  }

  const onKeyDown = (e, r, c) => {
    let nr = r
    let nc = c
    switch (e.key) {
      case 'ArrowRight': nc = Math.min(c + 1, nCols - 1); break
      case 'ArrowLeft': nc = Math.max(c - 1, 0); break
      case 'ArrowDown': nr = Math.min(r + 1, nRows - 1); break
      case 'ArrowUp': nr = Math.max(r - 1, 0); break
      case 'Home': nc = 0; break
      case 'End': nc = nCols - 1; break
      case 'Escape': setTip(null); setSelected(null); return
      default: return
    }
    e.preventDefault()
    focusCell(nr, nc)
  }

  const cellProps = (r, c) => ({
    'data-pos': `${r}-${c}`,
    tabIndex: safeFocus.r === r && safeFocus.c === c ? 0 : -1,
    onKeyDown: (e) => onKeyDown(e, r, c),
    onFocus: (e) => { setFocus({ r, c }); showTip(r, c, e.currentTarget) },
    onBlur: () => setTip(null),
    onPointerEnter: (e) => showTip(r, c, e.currentTarget),
    onPointerLeave: () => setTip(null),
    onClick: () => {
      setTip(null)
      setSelected((s) => (s && s.r === r && s.c === c ? null : { r, c }))
    },
    'aria-pressed': isSelected(r, c),
  })
  const cellBtn = 'flex h-9 w-full min-w-14 items-center justify-center rounded-sm hover:bg-row-hover aria-pressed:bg-brand-soft'

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup type="single" size="sm" value={view} onValueChange={(v) => v && setView(v)} aria-label={t('om.view')} className="hidden sm:flex">
        <ToggleGroupItem value="matrix">{t('om.view.matrix')}</ToggleGroupItem>
        <ToggleGroupItem value="table">{t('om.view.table')}</ToggleGroupItem>
      </ToggleGroup>

      {view === 'table' ? (
        <div className="hidden sm:block"><TableView matrix={matrix} /></div>
      ) : (
        <div className="hidden flex-col gap-3 sm:flex">
          <div className="relative overflow-x-auto" ref={wrapRef}>
            {nCols > 0 ? (
              <table className="w-full border-collapse" aria-describedby={descId}>
                <thead>
                  <tr className="border-b border-border-strong">
                    <th scope="col" className="h-8 w-40 pr-3 text-left"><span className="sr-only">{t('om.drug')}</span></th>
                    {cols.map((col) => (
                      <th key={col.id} scope="col" className={cn('h-8 px-1 text-center text-xs font-medium whitespace-nowrap text-muted-foreground', hl?.organs?.includes(col.id) && 'text-foreground')}>
                        {pick(col.label)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <th scope="row" className="pr-3 text-left text-sm font-normal text-text-2">{t('om.patientRow')}</th>
                    {cols.map((col, c) => {
                      const groups = groupBadges(col.badges)
                      const label = `${pick(col.label)}, ${t('om.patientRow')}: ${groups.length ? groups.map((g) => t(`om.badge.${g.kind}`)).join(', ') : t('om.none')}`
                      return (
                        <td key={col.id} className="px-1 py-1">
                          <button type="button" aria-label={label} className={cn(cellBtn, 'h-auto min-h-9 flex-col gap-1 py-1')} {...cellProps(0, c)}>
                            {groups.length === 0 ? <span aria-hidden="true" className="h-px w-3 bg-border" /> : groups.map((g) => <MatrixBadge key={g.kind} kind={g.kind} count={g.items.length} severity={g.severity} />)}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                  {matrix.rows.map((row, i) => {
                    const r = i + 1
                    const rowHl = hl?.drugIds?.includes(row.drugId)
                    return (
                      <tr key={row.drugId} className={cn('border-b border-border', rowHl && 'bg-row-hover')}>
                        <th scope="row" className="pr-3 text-left text-sm font-medium whitespace-nowrap text-foreground">{drugShort(row.drugId, pick)}</th>
                        {cols.map((col, c) => {
                          const cell = row.cells[col.id]
                          const lk = levelKey(cell.level)
                          const label = `${drugShort(row.drugId, pick)}, ${pick(col.label)}: ${lk === 'na' ? t('om.level.na') : `${lk}, ${t(`om.level.${lk}`)}`}`
                          return (
                            <td key={col.id} className="px-1 py-0.5">
                              <button type="button" aria-label={label} className={cellBtn} {...cellProps(r, c)}>
                                <LevelGlyph level={cell.level} />
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : null}
            <p id={descId} className="sr-only">{t('om.keyboard')}</p>
            <Tip matrix={matrix} cols={cols} tip={tip} />
          </div>
          <QuietLine quiet={quiet} />
          {selected && selected.r < nRows && selected.c < nCols ? (
            <CellDetail matrix={matrix} cols={cols} pos={selected} onClose={() => setSelected(null)} />
          ) : null}
        </div>
      )}
      <StackedView matrix={matrix} hl={hl} />
      <Legend />
      <p className="text-xs text-muted-foreground">{t('om.footnote')}</p>
    </div>
  )
}
