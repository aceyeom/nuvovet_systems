import { useId, useMemo, useRef, useState } from 'react'
import { Layers, User, Zap, X, Grid3x3, Table2 } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import CitationChip from './CitationChip.jsx'
import { drugShort, sourceShort } from './format.js'
import { SEVERITIES } from '../engine/findings.js'

/*
 * Organ-system matrix (replaces the old anatomy diagrams).
 *
 * Form: a drug × organ-system grid of ORDINAL flags (0–3) — not magnitudes, so
 * no colour ramp, no sums, no percentages. Each cell is a 3-segment glyph in a
 * single neutral hue (filled count = level); "not assessed" is a quiet hairline
 * dash (hatched only in print and forced colours), never a 0. Systems no
 * prescribed drug was assessed for, with no patient factor or finding, are
 * folded into one summary line instead of a column of empty cells. The only
 * colour is the Finding badge, which takes the severity of the most severe
 * finding involving that system; Patient and Additive badges are neutral (icon
 * + word). Hover and keyboard focus show the same tooltip; Enter/click opens an
 * inline detail panel (and hides the tooltip). A table view is always
 * available, and narrow containers get a stacked list per system instead of
 * the grid.
 */

const BADGE_ICON = { additive: Layers, patient: User, interaction: Zap }
const BADGE_ORDER = ['interaction', 'patient', 'additive']

function levelKey(level) {
  return level === 'na' || level == null ? 'na' : String(level)
}

export function LevelGlyph({ level }) {
  if (level === 'na' || level == null) {
    return (
      <span className="pf-lv pf-lv--na" aria-hidden="true">
        <span className="pf-lv__dash" />
      </span>
    )
  }
  return (
    <span className={`pf-lv pf-lv--${level}`} aria-hidden="true">
      {[1, 2, 3].map((i) => <span key={i} className={`pf-lv__seg${i <= level ? ' is-on' : ''}`} />)}
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
 * Columns to draw vs. systems to fold into one "not assessed for any
 * prescribed drug" line: a system is folded when it has no badge and every
 * drug's cell is 'na'.
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

export function MatrixBadge({ kind, count = 1, severity = null }) {
  const { t } = useLang()
  const Icon = BADGE_ICON[kind] || Zap
  const tone = kind === 'interaction' && severity ? ` pf-tone--${severity}` : ''
  return (
    <span className={`pf-mbadge pf-mbadge--${kind}${tone}`}>
      <Icon size={12} strokeWidth={2.25} aria-hidden="true" />
      <span>{t(`om.badge.${kind}`)}</span>
      {count > 1 && <span className="pf-mbadge__n">×{count}</span>}
    </span>
  )
}

function Legend() {
  const { t } = useLang()
  return (
    <div className="pf-mlegend" aria-label={t('om.legend')}>
      <ul className="pf-mlegend__levels">
        {[0, 1, 2, 3].map((l) => (
          <li key={l}>
            <LevelGlyph level={l} />
            <span><span className="pf-num">{l}</span> · {t(`om.level.${l}`)}</span>
          </li>
        ))}
        <li>
          <LevelGlyph level="na" />
          <span>{t('om.level.na')}</span>
        </li>
      </ul>
      <ul className="pf-mlegend__badges">
        {BADGE_ORDER.map((k) => (
          <li key={k}>
            <MatrixBadge kind={k} />
            <span>{t(`om.badgeDesc.${k}`)}</span>
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
    <div className="pf-mdetail" role="region" aria-live="polite" aria-label={`${pick(col.label)}${row ? ` · ${drugShort(row.drugId, pick)}` : ''}`}>
      <div className="pf-mdetail__head">
        <div>
          <div className="pf-mdetail__eyebrow">{pick(col.label)}</div>
          <div className="pf-mdetail__title">{row ? drugShort(row.drugId, pick) : t('om.patientRow')}</div>
        </div>
        <button type="button" className="pf-icon-btn" onClick={onClose} aria-label={t('om.close')}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {cell && (
        <div className="pf-mdetail__level">
          <LevelGlyph level={cell.level} />
          <strong>{t(`om.level.${levelKey(cell.level)}`)}</strong>
        </div>
      )}
      {cell && <p className="pf-mdetail__text">{cell.reason ? pick(cell.reason) : t('om.notAssessed')}</p>}
      {cell?.source && <div className="pf-mdetail__src"><CitationChip id={cell.source} full /></div>}
      {(isPatient || groups.length > 0) && (
        <div className="pf-mdetail__badges">
          {groups.length === 0 && <p className="pf-muted">{t('om.noBadges')}</p>}
          {groups.map((g) => (
            <div key={g.kind} className="pf-mdetail__badge">
              <MatrixBadge kind={g.kind} count={g.items.length} severity={g.severity} />
              <ul className="pf-list">
                {badgeReasons(g, pick).map((r, i) => <li key={i}><span>{r}</span></li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Hover/focus tooltip: level word first (the value), then system · drug, reason, source. */
function Tooltip({ matrix, cols, tip }) {
  const { t, pick, lang } = useLang()
  if (!tip) return null
  const col = cols[tip.c]
  if (!col) return null
  const isPatient = tip.r === 0
  const row = isPatient ? null : matrix.rows[tip.r - 1]
  const cell = row ? row.cells[col.id] : null
  const groups = groupBadges(col.badges)
  return (
    <div className="pf-mtip" role="tooltip" style={{ left: tip.x, top: tip.y }} data-place={tip.place}>
      {cell ? (
        <>
          <div className="pf-mtip__value">
            <LevelGlyph level={cell.level} />
            <strong>{t(`om.level.${levelKey(cell.level)}`)}</strong>
          </div>
          <div className="pf-mtip__where">{pick(col.label)} · {drugShort(row.drugId, pick)}</div>
          <p className="pf-mtip__text">{cell.reason ? pick(cell.reason) : t('om.notAssessed')}</p>
          {cell.source && <div className="pf-mtip__src">{sourceShort(cell.source, lang)}</div>}
        </>
      ) : (
        <>
          <div className="pf-mtip__where">{pick(col.label)} · {t('om.patientRow')}</div>
          {groups.length === 0 && <p className="pf-mtip__text">{t('om.noBadges')}</p>}
          {groups.map((g) => (
            <div key={g.kind} className="pf-mtip__badge">
              <MatrixBadge kind={g.kind} count={g.items.length} severity={g.severity} />
              <p className="pf-mtip__text">{badgeReasons(g, pick).join(' · ')}</p>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/** "Not assessed for any prescribed drug: CNS · Heart" — systems with nothing to draw. */
function QuietLine({ quiet }) {
  const { t, pick } = useLang()
  if (!quiet.length) return null
  return (
    <p className="pf-mquiet">
      <LevelGlyph level="na" />
      <span>{t('om.quiet', { systems: quiet.map((c) => pick(c.label)).join(' · ') })}</span>
    </p>
  )
}

/**
 * Table view: one group per system (full-width header row), the patient's
 * flags, one row per drug with an assessed level, and the drugs not assessed
 * collapsed into one muted line.
 */
function TableView({ matrix }) {
  const { t, pick } = useLang()
  const { shown, quiet } = splitColumns(matrix)
  return (
    <div className="pf-mtable-wrap">
      {shown.length > 0 && (
        <div className="pf-table-wrap">
          <table className="pf-mtable">
            <thead>
              <tr>
                <th scope="col">{t('om.t.drug')}</th>
                <th scope="col">{t('om.t.level')}</th>
                <th scope="col">{t('om.t.reason')}</th>
                <th scope="col" className="pf-mtable__srccol">{t('om.t.source')}</th>
              </tr>
            </thead>
            {shown.map((col) => (
              <TableGroup key={col.id} col={col} matrix={matrix} t={t} pick={pick} />
            ))}
          </table>
        </div>
      )}
      <QuietLine quiet={quiet} />
    </div>
  )
}

function TableGroup({ col, matrix, t, pick }) {
  const groups = groupBadges(col.badges)
  const { assessed, notAssessed } = tableGroup(col, matrix)
  return (
    <tbody className="pf-mtable__group">
      <tr className="pf-mtable__sys">
        <th scope="colgroup" colSpan={4}>{pick(col.label)}</th>
      </tr>
      {groups.length > 0 && (
        <tr className="pf-mtable__patient">
          <th scope="row">{t('om.patientRow')}</th>
          <td colSpan={3}>
            {groups.map((g) => (
              <div key={g.kind} className="pf-mtable__badge">
                <MatrixBadge kind={g.kind} count={g.items.length} severity={g.severity} />
                <span>{g.items.map((b) => pick(b.reason)).join(' · ')}</span>
              </div>
            ))}
          </td>
        </tr>
      )}
      {assessed.map((row) => {
        const cell = row.cells[col.id]
        return (
          <tr key={row.drugId}>
            <th scope="row" className="pf-mtable__drug">{drugShort(row.drugId, pick)}</th>
            <td className="pf-nowrap">
              <span className="pf-mtable__lv"><LevelGlyph level={cell.level} />{`${cell.level} · ${t(`om.level.${cell.level}`)}`}</span>
            </td>
            <td>{cell.reason ? pick(cell.reason) : <span className="pf-muted">—</span>}</td>
            <td className="pf-mtable__srccol">{cell.source ? <CitationChip id={cell.source} /> : <span className="pf-muted">—</span>}</td>
          </tr>
        )
      })}
      {notAssessed.length > 0 && (
        <tr className="pf-mtable__na">
          <td colSpan={4}>
            <span className="pf-mtable__lv">
              <LevelGlyph level="na" />
              <span>{t('om.t.notAssessedList', { drugs: notAssessed.map((id) => drugShort(id, pick)).join(', ') })}</span>
            </span>
          </td>
        </tr>
      )}
    </tbody>
  )
}

/** Stacked list per system (narrow containers). Each line expands in place. */
function StackedView({ matrix, hl }) {
  const { t, pick } = useLang()
  const [open, setOpen] = useState(null)
  const { shown, quiet } = splitColumns(matrix)
  return (
    <div className="pf-mstack">
      {shown.map((col) => {
        const groups = groupBadges(col.badges)
        const colHl = hl?.organs?.includes(col.id)
        return (
          <section key={col.id} className={`pf-mstack__sys${colHl ? ' is-hl' : ''}`}>
            <header className="pf-mstack__head">
              <h3>{pick(col.label)}</h3>
              <div className="pf-mstack__badges">
                {groups.map((g) => <MatrixBadge key={g.kind} kind={g.kind} count={g.items.length} severity={g.severity} />)}
              </div>
            </header>
            {groups.length > 0 && (
              <p className="pf-mstack__reasons">{groups.flatMap((g) => g.items.map((b) => pick(b.reason))).join(' · ')}</p>
            )}
            <ul>
              {matrix.rows.map((row) => {
                const cell = row.cells[col.id]
                const key = `${col.id}:${row.drugId}`
                const isOpen = open === key
                const cellHl = colHl && hl?.drugIds?.includes(row.drugId)
                return (
                  <li key={row.drugId} className={cellHl ? 'is-hl' : ''}>
                    <button type="button" className="pf-mstack__line" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : key)}>
                      <span className="pf-mstack__drug">{drugShort(row.drugId, pick)}</span>
                      <LevelGlyph level={cell.level} />
                      <span className="pf-mstack__word">{t(`om.level.${levelKey(cell.level)}`)}</span>
                    </button>
                    {isOpen && (
                      <div className="pf-mstack__detail">
                        <p>{cell.reason ? pick(cell.reason) : t('om.notAssessed')}</p>
                        {cell.source && <CitationChip id={cell.source} full />}
                      </div>
                    )}
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
 * highlight: { drugIds:[], organs:[] } | null — from the hovered finding card
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

  const hl = useMemo(() => {
    if (!highlight) return null
    return { drugIds: highlight.drugIds || [], organs: highlight.organs || [] }
  }, [highlight])

  if (!matrix.rows.length) {
    return <p className="pf-muted">{t('om.empty')}</p>
  }

  const safeFocus = { r: Math.min(focus.r, nRows - 1), c: Math.max(0, Math.min(focus.c, nCols - 1)) }
  const isSelected = (r, c) => Boolean(selected && selected.r === r && selected.c === c)

  const showTip = (r, c, el) => {
    // The open detail panel already says everything the tooltip would, so never stack the two.
    if (isSelected(r, c)) return
    const wrap = wrapRef.current
    if (!wrap || !el) return
    const w = wrap.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    const tipW = Math.min(300, w.width - 16)
    let x = b.left - w.left + b.width / 2 - tipW / 2
    x = Math.max(8, Math.min(x, w.width - tipW - 8))
    setTip({ r, c, x, y: b.bottom - w.top + 6, place: 'below' })
  }

  const focusCell = (r, c) => {
    setFocus({ r, c })
    const el = wrapRef.current?.querySelector(`[data-pos="${r}-${c}"]`)
    if (el) el.focus()
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

  return (
    <div className="pf-matrix-section">
      <div className="pf-matrix-toolbar">
        <div className="pf-seg pf-seg--sm" role="group" aria-label={t('om.view')}>
          <button type="button" className={view === 'matrix' ? 'is-on' : ''} aria-pressed={view === 'matrix'} onClick={() => setView('matrix')}>
            <Grid3x3 size={14} aria-hidden="true" />{t('om.view.matrix')}
          </button>
          <button type="button" className={view === 'table' ? 'is-on' : ''} aria-pressed={view === 'table'} onClick={() => setView('table')}>
            <Table2 size={14} aria-hidden="true" />{t('om.view.table')}
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <TableView matrix={matrix} />
      ) : (
        <div className="pf-matrix-host">
          <div className="pf-matrix-wrap" ref={wrapRef}>
            {nCols > 0 && (
              <table className={`pf-matrix${hl?.organs?.length ? ' has-hl' : ''}`} aria-describedby={descId}>
                <thead>
                  <tr>
                    <th scope="col" className="pf-matrix__corner"><span className="pf-sr">{t('om.drug')}</span></th>
                    {cols.map((col) => (
                      <th key={col.id} scope="col" className={hl?.organs?.includes(col.id) ? 'is-hl' : ''}>{pick(col.label)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="pf-matrix__patient">
                    <th scope="row">{t('om.patientRow')}</th>
                    {cols.map((col, c) => {
                      const groups = groupBadges(col.badges)
                      const label = `${pick(col.label)} · ${t('om.patientRow')}: ${groups.length ? groups.map((g) => t(`om.badge.${g.kind}`)).join(', ') : '—'}`
                      return (
                        <td key={col.id} className={hl?.organs?.includes(col.id) ? 'is-hl' : ''}>
                          <button type="button" className="pf-mcell pf-mcell--patient" aria-label={label} {...cellProps(0, c)}>
                            {groups.length === 0 ? <span className="pf-mcell__none" aria-hidden="true" /> : groups.map((g) => <MatrixBadge key={g.kind} kind={g.kind} count={g.items.length} severity={g.severity} />)}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                  {matrix.rows.map((row, i) => {
                    const r = i + 1
                    const rowHl = hl?.drugIds?.includes(row.drugId)
                    return (
                      <tr key={row.drugId} className={rowHl ? 'is-hl' : ''}>
                        <th scope="row" className="pf-matrix__drug">{drugShort(row.drugId, pick)}</th>
                        {cols.map((col, c) => {
                          const cell = row.cells[col.id]
                          const on = rowHl && hl?.organs?.includes(col.id)
                          const lk = levelKey(cell.level)
                          const label = `${drugShort(row.drugId, pick)}, ${pick(col.label)}: ${lk === 'na' ? t('om.level.na') : `${lk} · ${t(`om.level.${lk}`)}`}`
                          return (
                            <td key={col.id} className={on ? 'is-hl' : ''}>
                              <button type="button" className="pf-mcell" aria-label={label} {...cellProps(r, c)}>
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
            )}
            <p id={descId} className="pf-sr">{t('om.keyboard')}</p>
            <Tooltip matrix={matrix} cols={cols} tip={tip} />
            <QuietLine quiet={quiet} />
          </div>
          {selected && selected.r < nRows && selected.c < nCols && (
            <CellDetail matrix={matrix} cols={cols} pos={selected} onClose={() => setSelected(null)} />
          )}
          <StackedView matrix={matrix} hl={hl} />
        </div>
      )}

      <Legend />
      <p className="pf-matrix-foot">{t('om.footnote')}</p>
    </div>
  )
}
