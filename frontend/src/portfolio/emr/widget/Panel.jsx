/**
 * The review panel (EMR popup spec §3.7.1): docked in the host's 360 px column, inside the 380 px
 * drawer, or inside the bottom sheet. Passive: it never moves focus on check(); focus moves only
 * on a user action in the widget (badge click → card heading, chip → group).
 *
 *   header 40 px     NuvoVet DUR   규칙 18개 · 14:32:05   [–] / [×]
 *   verdict row      SeverityBadge md + engine verdict.action; counts; "검토 불완전 N" chip
 *   확인 필요         row / visit reasons with [행으로 이동] and fix-chart chips
 *   cards            hairline-separated; 금기/중대 expanded, others one 36 px line
 *   투약 안내 N ▸     NotesChecklist
 *   coverage strip   검토함 / 일부만 / 검토 안 함
 *   footer           전체 분석 열기   [교육용 프로토타입 ⓘ] (options.marker only)
 */

import { useEffect, useId, useRef } from 'react'
import { ChevronDown, CircleCheck, CircleDashed, Info, Minus, Plus, X } from 'lucide-react'
import { getProtocol } from '../../knowledge/drugs.js'
import { Card, CollapsedCard } from './Card.jsx'
import { CoverageStrip } from './CoverageStrip.jsx'
import { NotesChecklist } from './NotesChecklist.jsx'
import { ackEntry, Badge, fmtTime, ic, stripConfirmPrefix } from './parts.jsx'
import { countsLine, t } from './strings.js'
import { pathIncludes } from './focus.js'
import { useWidget } from './WidgetApp.jsx'

/** Items of the 확인 필요 group: row/visit reasons, uncovered validation notes. */
export function confirmItems(response) {
  return (response?.extension?.confirm || []).filter((x) => !x.covered)
}

function ConfirmGroup({ items, locale, dur, groupRef }) {
  if (!items.length) return null
  const chipLabel = (chip) => (chip === 'recognised' ? t(locale, 'chip.recognised') : chip === 'stale' ? t(locale, 'chip.stale') : t(locale, 'chip.fix'))
  return (
    <div className="nv-section" data-nv="confirm">
      <h3 className="nv-group-title" ref={groupRef} tabIndex={-1}>{t(locale, 'group.confirm')}</h3>
      <ul className="nv-confirm-list">
        {items.map((x, i) => {
          const rowId = x.rowId || x.rowIds?.[0] || null
          const who = x.drugName || x.code || ''
          const text = x.kind === 'visit' ? x.text : `${who ? `${who}: ` : ''}${stripConfirmPrefix(x.text)}`
          return (
            <li key={`${x.key}-${rowId || i}`} className="nv-confirm-item" data-row={rowId || undefined}>
              <span>{text}</span>
              {x.key === 'protocol_indication' && x.options?.length ? (
                <select
                  className="nv-select"
                  aria-label={`${who}: ${t(locale, 'chip.choose')}`}
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) dur.chooseProtocol(x.rowId, e.target.value) }}
                >
                  <option value="" disabled>{t(locale, 'chip.choose')}</option>
                  {x.options.map((pid) => (
                    <option key={pid} value={pid}>{getProtocol(pid)?.indication?.[locale] ?? pid}</option>
                  ))}
                </select>
              ) : null}
              {x.field ? (
                <button type="button" className="nv-chip" onClick={() => dur.fixChart(x.field)}>{chipLabel(x.chip)}</button>
              ) : null}
              {rowId && x.kind !== 'visit' ? (
                <button type="button" className="nv-link-btn" onClick={() => dur.focusRow(rowId)}>{t(locale, 'row.goto')}</button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Verdict({ response, locale, dur, confirm, onIncompleteChip }) {
  const ext = response.extension
  if (!ext.supported) {
    const missing = ext.reason === 'species_missing'
    return (
      <div className="nv-section nv-verdict" data-nv="verdict">
        <div className="nv-verdict-line">
          <Badge status="incomplete" size="md" locale={locale} />
          <h2>{t(locale, missing ? 'species.missing' : 'species.unsupported')}</h2>
        </div>
        <div className="nv-verdict-meta">
          <button type="button" className="nv-chip" onClick={() => dur.fixChart('species')}>{t(locale, 'chip.fix')}</button>
        </div>
      </div>
    )
  }
  const v = ext.verdict
  const line = countsLine(locale, ext.counts)
  const level = v.level && v.level !== 'none' ? v.level : null
  if (!level) {
    if (v.complete) {
      return (
        <div className="nv-section nv-verdict" data-nv="verdict">
          <div className="nv-verdict-line">
            <span data-status="none" className="nv-badge nv-badge-md"><CircleCheck {...ic(14)} />{t(locale, 'verdict.none')}</span>
          </div>
          <h2 className="nv-text2">{v.action}</h2>
          {line ? <div className="nv-verdict-meta">{line}</div> : null}
        </div>
      )
    }
    const reasons = confirm.slice(0, 3).map((x) => (x.kind === 'visit' ? x.text : `${x.drugName || x.code || ''}${x.drugName || x.code ? ': ' : ''}${stripConfirmPrefix(x.text)}`))
    return (
      <div className="nv-section nv-verdict" data-nv="verdict">
        <div className="nv-verdict-line">
          <span data-status="incomplete" className="nv-badge nv-badge-md"><CircleDashed {...ic(14)} />{t(locale, 'verdict.incomplete')}</span>
        </div>
        <h2 className="nv-sr">{t(locale, 'verdict.incomplete')}</h2>
        {reasons.length ? <ul className="nv-reasons">{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul> : null}
        {line ? <div className="nv-verdict-meta">{line}</div> : null}
      </div>
    )
  }
  return (
    <div className="nv-section nv-verdict" data-nv="verdict">
      <div className="nv-verdict-line">
        <Badge status={level} size="md" locale={locale} />
        <h2>{v.action}</h2>
      </div>
      <div className="nv-verdict-meta">
        <span>{line}</span>
        {!v.complete ? (
          <button type="button" className="nv-chip" onClick={onIncompleteChip}>
            <CircleDashed {...ic(14)} />
            {t(locale, 'verdict.incompleteChip', { n: Math.max(confirm.length, 1) })}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function Panel({ mode }) {
  const { ctl, dur, s, ui, locale } = useWidget()
  const rootRef = useRef(null)
  const groupRef = useRef(null)
  const headings = useRef(new Map())
  const handledReveal = useRef(0)
  const uid = useId()
  const response = s.response
  const ext = response?.extension
  const cards = response?.cards || []
  const confirm = confirmItems(response)
  const log = ext ? dur.getLog(ext.encounterId) : []
  const minimised = mode === 'docked' && ui.minimised
  const bodyId = `${uid}-body`

  // Badge click → expand (done in the store), scroll the card into view, focus its heading.
  const reveal = ui.reveal
  useEffect(() => {
    if (!reveal || reveal.seq === handledReveal.current || minimised) return
    handledReveal.current = reveal.seq
    const target = reveal.uuid ? headings.current.get(reveal.uuid) : groupRef.current
    if (target) {
      target.scrollIntoView({ block: 'nearest' })
      target.focus({ preventScroll: true })
    }
  })

  const onKeyDown = (e) => {
    if (e.key !== 'Escape' || !pathIncludes(e, rootRef.current)) return
    if (mode === 'drawer') {
      e.stopPropagation()
      ctl.setUi({ drawerOpen: false })
    } else if (mode === 'sheet') {
      e.stopPropagation()
      ctl.setUi({ sheetExpanded: false })
    }
  }

  const headerButton =
    mode === 'docked' ? (
      <button type="button" className="nv-btn nv-btn-ghost nv-btn-icon" aria-expanded={!minimised} aria-controls={bodyId} aria-label={t(locale, minimised ? 'panel.expand' : 'panel.minimise')} onClick={() => ctl.setUi({ minimised: !minimised })}>
        {minimised ? <Plus {...ic(16)} /> : <Minus {...ic(16)} />}
      </button>
    ) : mode === 'drawer' ? (
      <button type="button" className="nv-btn nv-btn-ghost nv-btn-icon" aria-label={t(locale, 'panel.close')} onClick={() => ctl.setUi({ drawerOpen: false })} data-nv="close">
        <X {...ic(16)} />
      </button>
    ) : (
      <button type="button" className="nv-btn nv-btn-ghost nv-btn-icon" aria-label={t(locale, 'panel.minimise')} onClick={() => ctl.setUi({ sheetExpanded: false })} data-nv="close">
        <ChevronDown {...ic(16)} />
      </button>
    )

  const isExpanded = (k) => ui.expanded[k.uuid] ?? k.extension.blocking
  const setExpanded = (k, v) => ctl.setUi((u) => ({ expanded: { ...u.expanded, [k.uuid]: v } }))
  const highlight = (rowIds) => ctl.highlightRows(rowIds)
  const workbench = cards[0]?.links?.[0]?.url || null

  return (
    <aside ref={rootRef} className={`nv-panel nv-panel-${mode}`} role="region" aria-label={t(locale, 'panel.region')} onKeyDown={onKeyDown} data-nv-panel={mode}>
      <div className="nv-head">
        <span className="nv-head-title">{t(locale, 'panel.title')}</span>
        <span className="nv-head-meta nv-num">
          {t(locale, 'panel.rules', { n: ext?.rulesCount ?? 18 })}
          {ui.checkedAt ? ` · ${fmtTime(ui.checkedAt)}` : ''}
        </span>
        {headerButton}
      </div>
      {minimised ? null : (
        <div className="nv-body" id={bodyId}>
          {!response || (ext.empty && ext.supported) ? (
            <p className="nv-empty">{t(locale, 'panel.empty')}</p>
          ) : (
            <>
              <Verdict response={response} locale={locale} dur={dur} confirm={confirm} onIncompleteChip={() => groupRef.current?.focus()} />
              <ConfirmGroup items={ext.supported ? confirm : []} locale={locale} dur={dur} groupRef={groupRef} />
              {cards.length ? (
                <div className="nv-cards" data-nv="cards">
                  {cards.map((k) => {
                    const open = isExpanded(k)
                    const cid = `${uid}-${k.uuid}`
                    return (
                      <div key={k.uuid} className="nv-card-wrap" id={cid}>
                        {open ? (
                          <Card
                            card={k}
                            locale={locale}
                            dur={dur}
                            mode="panel"
                            ack={ackEntry(log, k)}
                            coverage={ext.coverage}
                            onCollapse={() => setExpanded(k, false)}
                            onHighlight={highlight}
                            headingRef={(el) => { if (el) headings.current.set(k.uuid, el); else headings.current.delete(k.uuid) }}
                          />
                        ) : (
                          <CollapsedCard card={k} locale={locale} controlsId={cid} onExpand={() => setExpanded(k, true)} />
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : null}
              <NotesChecklist notes={ext.notes} locale={locale} rowSuggestions={ext.rowSuggestions} dur={dur} />
              <CoverageStrip coverage={ext.coverage} unmapped={ext.unmapped} locale={locale} />
            </>
          )}
        </div>
      )}
      {minimised ? null : (
        <div className="nv-foot">
          {workbench ? (
            <a href={workbench} onClick={() => dur.openWorkbench(workbench)}>{t(locale, 'link.workbench')}</a>
          ) : null}
          {s.marker ? (
            <span className="nv-marker" title={t(locale, 'marker.tooltip')} data-nv="marker">
              {t(locale, 'marker')}
              <Info {...ic(14)} />
              <span className="nv-sr">{t(locale, 'marker.tooltip')}</span>
            </span>
          ) : null}
        </div>
      )}
    </aside>
  )
}
