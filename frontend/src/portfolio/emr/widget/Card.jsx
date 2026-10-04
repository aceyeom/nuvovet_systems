/**
 * DUR card (EMR popup spec §3.7.2; visual values from the golden DUR card, DESIGN_SYSTEM §9.9).
 * Every clinical string is the engine's, already localised by cards.js; the card only arranges it.
 *
 *   [■ 금기] 품종·유전자                                  이버멕틴 + 케토코나졸
 *   summary (h3)
 *   consequence (2-line clamp + 더 보기)
 *   이 환자에서  factor · factor
 *   권장  actions[0..1]
 *   [suggestion 권장] [처방 수정] [예외 사유 입력 ▾] | [확인함]   (one wrapping row, left-aligned)
 *   ▸ 자세히: 기전, 대안, 모든 권장, 규칙, 입력값, 근거
 *   규칙 RULE v1.1.0 · 근거 Mealey 2001 · …   (미국 라벨 기준 / 시작 용량 기준)
 *   검토 안 함 연령                             (only when coverage marks a relevant gap)
 */

import { useId, useLayoutEffect, useRef, useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, ChevronUp, CircleCheck } from 'lucide-react'
import { RULE_COVERAGE } from '../coverage.js'
import { OverrideForm } from './OverrideForm.jsx'
import { Badge, ic, shortCite } from './parts.jsx'
import { t } from './strings.js'

/** The coverage gap relevant to this card: the partial reason of its strip item, and age under 1 year. */
function cardGaps(card, coverage, locale) {
  if (!coverage) return []
  const out = []
  const items = new Set(card.extension.ruleIds.map((r) => RULE_COVERAGE[r]).filter(Boolean))
  for (const p of coverage.partial || []) {
    if (items.has(p.item)) out.push({ kind: 'partial', text: `${coverage.labels[p.item]?.[locale] ?? p.item} (${p.label?.[locale] ?? p.reason})` })
  }
  const age = coverage.labels?.age?.ko
  if (age && age !== '연령') out.push({ kind: 'notChecked', text: coverage.labels.age[locale] })
  return out
}

export function CollapsedCard({ card, locale, onExpand, controlsId }) {
  const ext = card.extension
  const drugs = ext.drugNames.join(' + ')
  return (
    <button type="button" className="nv-card-collapsed" aria-expanded="false" aria-controls={controlsId} data-card={card.uuid} onClick={onExpand} title={card.summary}>
      <Badge status={ext.severity} locale={locale} />
      <span className="nv-sum nv-truncate" data-truncate="" title={card.summary}>{card.summary}</span>
      <span className="nv-card-drugs nv-truncate">{drugs}</span>
      <ChevronRight className="nv-chev" {...ic(16)} />
    </button>
  )
}

export function Card({ card, locale, dur, mode = 'panel', ack, coverage, onCollapse, onHighlight, headingRef, touchedAll, consequenceId }) {
  const uid = useId()
  const ext = card.extension
  const [moreOpen, setMoreOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [clamped, setClamped] = useState(false)
  const consRef = useRef(null)
  const drugs = ext.drugNames.join(' + ')
  const blocking = ext.blocking
  const gaps = cardGaps(card, coverage, locale)
  const detailsId = `${uid}-details`
  const overrideId = `${uid}-override`

  useLayoutEffect(() => {
    const el = consRef.current
    if (!el || moreOpen) return
    setClamped(el.scrollHeight > el.clientHeight + 1)
  }, [ext.consequence, moreOpen])

  const editRow = () => {
    const rowId = ext.primaryRowIds[0] || ext.rowIds[0]
    if (!rowId) return
    if (mode === 'gate') dur.closeGate({ focusRowId: rowId })
    else dur.focusRow(rowId)
  }

  const hover = onHighlight
    ? {
      onMouseEnter: () => onHighlight(ext.rowIds),
      onMouseLeave: () => onHighlight(null),
      onFocus: () => onHighlight(ext.rowIds),
      onBlur: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) onHighlight(null) },
    }
    : {}

  const sources = (ext.sources || []).map(shortCite)
  const mechanistic = ext.evidence === 'mechanistic' || sources.length === 0
  const ackText = ack
    ? ack.outcome === 'overridden'
      ? t(locale, 'card.overridden', { code: ack.overrideReason?.reason?.code ?? '' })
      : t(locale, 'card.acknowledged')
    : null

  return (
    <article className="nv-card" data-golden="dur-card" data-card={card.uuid} data-severity={ext.severity} aria-labelledby={`${uid}-h`} {...hover}>
      <div className="nv-card-top">
        <Badge status={ext.severity} locale={locale} />
        <span className="nv-card-cat">{ext.category}</span>
        <span className="nv-card-drugs nv-truncate" data-truncate="" title={drugs}>{drugs}</span>
        {onCollapse ? (
          <button type="button" className="nv-btn nv-btn-ghost nv-btn-icon-sm" aria-expanded="true" aria-label={`${card.summary}: ${t(locale, 'card.less')}`} onClick={onCollapse}>
            <ChevronUp {...ic(16)} />
          </button>
        ) : null}
      </div>
      <h3 id={`${uid}-h`} ref={headingRef} tabIndex={-1}>{card.summary}</h3>
      {ext.consequence ? (
        <>
          <p id={consequenceId || `${uid}-cons`} ref={consRef} className={`nv-consequence${moreOpen ? '' : ' nv-clamp2'}`}>{ext.consequence}</p>
          {clamped || moreOpen ? (
            <button type="button" className="nv-more-btn" aria-expanded={moreOpen} aria-controls={consequenceId || `${uid}-cons`} onClick={() => setMoreOpen((x) => !x)}>
              {moreOpen ? t(locale, 'card.less') : t(locale, 'card.more')}
            </button>
          ) : null}
        </>
      ) : null}
      {ext.factors.length ? (
        <p className="nv-factors">
          <span className="nv-label">{t(locale, 'card.patient')}</span>
          {ext.factors.join('; ')}
        </p>
      ) : null}
      {ext.actions.length ? (
        <p>
          <span className="nv-label">{t(locale, 'card.recommend')}</span>
          {ext.actions.slice(0, mode === 'gate' ? 1 : 2).join(' ')}
        </p>
      ) : null}

      <div className="nv-actions-row">
        {card.suggestions.map((sg) => (
          <button
            key={sg.uuid}
            type="button"
            // One primary per surface: in the gate the footer's 처방으로 돌아가기 is the primary, so a
            // recommended suggestion is an outline button with a separate 권장 tag (design review P1-14).
            className={`nv-btn ${sg.isRecommended && mode !== 'gate' ? 'nv-btn-primary' : sg.isRecommended ? 'nv-btn-outline' : 'nv-btn-secondary'}`}
            title={sg.actions?.[0]?.description}
            onClick={() => dur.acceptSuggestion(card.uuid, sg.uuid)}
          >
            {sg.label}
            {sg.isRecommended ? <span className="nv-rec-tag">{t(locale, 'card.recommended')}</span> : null}
          </button>
        ))}
        <button type="button" className="nv-btn nv-btn-secondary" onClick={editRow}>{t(locale, 'card.edit')}</button>
        {mode === 'panel' && !ack ? (
          blocking ? (
            <button type="button" className="nv-btn nv-btn-ghost" aria-expanded={overrideOpen} aria-controls={overrideId} onClick={() => setOverrideOpen((x) => !x)}>
              {t(locale, 'card.override')}
              {overrideOpen ? <ChevronUp {...ic(16)} /> : <ChevronDown {...ic(16)} />}
            </button>
          ) : (
            <button type="button" className="nv-btn nv-btn-ghost" onClick={() => dur.acknowledge(card.uuid)}>{t(locale, 'card.ack')}</button>
          )
        ) : null}
      </div>
      {ackText ? (
        <p className="nv-status-line"><CircleCheck {...ic(14)} />{ackText}</p>
      ) : null}

      {mode === 'gate' ? (
        <OverrideForm card={card} dur={dur} locale={locale} mode="gate" touchedAll={touchedAll} />
      ) : overrideOpen && !ack ? (
        <div id={overrideId}>
          <OverrideForm card={card} dur={dur} locale={locale} mode="panel" onRecorded={() => setOverrideOpen(false)} />
        </div>
      ) : null}

      <button type="button" className="nv-details-btn" aria-expanded={detailsOpen} aria-controls={detailsId} onClick={() => setDetailsOpen((x) => !x)}>
        <ChevronRight {...ic(14)} />
        {t(locale, 'card.details')}
      </button>
      {detailsOpen ? (
        <div id={detailsId} className="nv-details">
          {ext.why.length ? (
            <section>
              <h4>{t(locale, 'card.mechanism')}</h4>
              <ul>{ext.why.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          ) : null}
          {ext.alternatives.length ? (
            <section>
              <h4>{t(locale, 'card.alternatives')}</h4>
              <ul>{ext.alternatives.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          ) : null}
          {ext.actions.length > 1 ? (
            <section>
              <h4>{t(locale, 'card.allActions')}</h4>
              <ul>{ext.actions.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          ) : null}
          <section>
            <h4>{t(locale, 'card.rule')}</h4>
            <ul>{ext.ruleIds.map((r) => <li key={r}><span className="nv-id">{r}@{ext.ruleVersion}</span></li>)}</ul>
          </section>
          {ext.trace?.inputs?.length ? (
            <section>
              <h4>{t(locale, 'card.inputs')}</h4>
              <ul>{ext.trace.inputs.map((x, i) => <li key={i}><span className="nv-id">{x.fact}</span>: {String(x.value)}</li>)}</ul>
            </section>
          ) : null}
          {sources.length ? (
            <section>
              <h4>{t(locale, 'card.evidence')}</h4>
              <ul>{sources.map((s, i) => <li key={i}>{s.full}</li>)}</ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="nv-trail">
        <span className="nv-muted">{t(locale, 'card.rule')}</span>
        <span className="nv-id">{ext.ruleIds[0]}</span>
        <span className="nv-id nv-muted">v{ext.ruleVersion}</span>
        <span aria-hidden="true" className="nv-sep">·</span>
        {mechanistic ? (
          <span>{t(locale, 'card.mechanistic')}</span>
        ) : (
          <>
            <span className="nv-muted">{t(locale, 'card.evidence')}</span>
            {sources.slice(0, 3).map((s, i) => (
              <span key={i} className="nv-cite" title={s.full}>
                <BookOpen {...ic(12)} />
                {s.short}
              </span>
            ))}
            {sources.length > 3 ? <span className="nv-muted nv-cite-more">{t(locale, 'card.moreSources', { n: sources.length - 3 })}</span> : null}
          </>
        )}
        {ext.jurisdiction === 'US' || ext.jurisdiction === 'UK' ? (
          <>
            <span aria-hidden="true" className="nv-sep">·</span>
            <span>{t(locale, `card.jurisdiction.${ext.jurisdiction}`)}</span>
          </>
        ) : null}
        {ext.startDose ? (
          <>
            <span aria-hidden="true" className="nv-sep">·</span>
            <span>{t(locale, 'card.startDose')}</span>
          </>
        ) : null}
      </div>
      {gaps.map((g, i) => (
        <p key={i} className="nv-gap">
          <span className="nv-label">{g.kind === 'partial' ? t(locale, 'card.partly') : t(locale, 'card.notChecked')}</span>
          {g.text}
        </p>
      ))}
    </article>
  )
}
