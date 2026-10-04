/**
 * DUR Island (`layout: 'island'`): the review lives in a dark pill the vet can drag anywhere on the
 * EMR. It has three shapes and morphs between them in place:
 *
 *   compact    [● DUR │ ⛔ 금기 1 · 이버멕틴 + 케토코나졸  ⠿]     always visible, pulses on every check
 *   peek       the new finding (severity ≥ 주의) with its recommended action and a countdown; also a
 *              green "모두 해결됨" after the last finding is cleared, and the focused row's finding
 *   expanded   the full review panel (Panel mode="island"), dock button when the host allows it
 *
 * Passive like the panel: a peek never takes focus and closes by itself (paused while hovered or
 * focused). Position: drag the pill or the panel header; Alt+arrow keys move it; double-click the
 * grip to reset. Kept in localStorage ('nv-island-pos'), clamped to the viewport.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CircleCheck, GripVertical, ListChecks, X } from 'lucide-react'
import { Panel } from './Panel.jsx'
import { Badge, SEV_ICON, fmtTime, ic } from './parts.jsx'
import { summaryLabel } from './Launcher.jsx'
import { t } from './strings.js'
import { useWidget } from './WidgetApp.jsx'

const POS_KEY = 'nv-island-pos'
const PEEK_MS = { finding: 7000, resolved: 3200, row: 4500 }
const MARGIN = 8

function readPos() {
  try {
    const v = JSON.parse(window.localStorage.getItem(POS_KEY) || 'null')
    if (v && Number.isFinite(v.fx) && Number.isFinite(v.y)) return v
  } catch { /* storage blocked */ }
  return null
}
function writePos(v) {
  try {
    if (v) window.localStorage.setItem(POS_KEY, JSON.stringify(v))
    else window.localStorage.removeItem(POS_KEY)
  } catch { /* storage blocked */ }
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi))

function Countdown({ ms, paused }) {
  return <span className="nv-island-timer" aria-hidden="true" style={{ animationDuration: `${ms}ms`, animationPlayState: paused ? 'paused' : 'running' }} />
}

function PeekFinding({ card, kind, locale, dur, ctl, paused, ms }) {
  const ext = card.extension
  const rec = card.suggestions.find((sg) => sg.isRecommended) || null
  const rowId = ext.primaryRowIds?.[0] || ext.rowIds?.[0] || null
  return (
    <div className="nv-island-peek" data-kind={kind}>
      <div className="nv-island-peek-top">
        <Badge status={ext.severity} locale={locale} />
        <span className="nv-island-cat">{ext.category}</span>
        <span className="nv-island-drugs nv-truncate" title={ext.drugNames.join(' + ')}>{ext.drugNames.join(' + ')}</span>
        <button type="button" className="nv-island-x" aria-label={t(locale, 'island.dismiss')} onClick={() => ctl.setUi({ peek: null })}>
          <X {...ic(14)} />
        </button>
      </div>
      <p className="nv-island-sum">{card.summary}</p>
      {ext.factors?.length ? (
        <p className="nv-island-factors">
          <span>{t(locale, 'card.patient')}</span>
          {ext.factors.slice(0, 2).join(' · ')}
        </p>
      ) : null}
      <div className="nv-island-actions">
        {rec ? (
          <button type="button" className="nv-island-btn nv-island-btn-primary" onClick={() => dur.acceptSuggestion(card.uuid, rec.uuid)}>
            {rec.label}
            <span className="nv-island-rec">{t(locale, 'card.recommended')}</span>
          </button>
        ) : null}
        <button type="button" className="nv-island-btn" onClick={() => ctl.reveal(rowId, card.uuid)}>
          <ListChecks {...ic(14)} />
          {t(locale, 'island.details')}
        </button>
        {rowId ? (
          <button type="button" className="nv-island-btn nv-island-btn-ghost" onClick={() => dur.focusRow(rowId)}>{t(locale, 'row.goto')}</button>
        ) : null}
      </div>
      <Countdown ms={ms} paused={paused} />
    </div>
  )
}

function PeekResolved({ locale, ui, ext, paused, ms }) {
  return (
    <div className="nv-island-peek nv-island-resolved" data-kind="resolved">
      <span className="nv-island-ok"><CircleCheck {...ic(18)} /></span>
      <span className="nv-island-resolved-text">
        <strong>{t(locale, 'island.resolved')}</strong>
        <span>{t(locale, 'panel.rules', { n: ext?.rulesCount ?? 18 })}{ui.checkedAt ? ` · ${fmtTime(ui.checkedAt)}` : ''}</span>
      </span>
      <Countdown ms={ms} paused={paused} />
    </div>
  )
}

export function Island() {
  const { ctl, dur, s, ui, locale } = useWidget()
  const response = s.response
  const ext = response?.extension
  const open = ui.islandOpen
  const peekCard = ui.peek?.uuid ? response?.cards?.find((k) => k.uuid === ui.peek.uuid) : null
  const peek = open || !ui.peek ? null : ui.peek.kind === 'resolved' ? ui.peek : peekCard ? ui.peek : null
  const mode = open ? 'expanded' : peek ? 'peek' : 'compact'
  const { label, level } = summaryLabel(response, locale)
  const top = response?.cards?.[0]
  const glow = mode === 'peek' && peek.kind === 'resolved' ? 'none' : level || 'idle'

  const rootRef = useRef(null)
  const innerRef = useRef(null)
  const pillRef = useRef(null)
  const drag = useRef(null)
  const suppressClick = useRef(false)
  const focusNext = useRef(null)
  const [size, setSize] = useState({ w: 220, h: 40 })
  const [vw, setVw] = useState(() => window.innerWidth)
  const [vh, setVh] = useState(() => window.innerHeight)
  const [pos, setPos] = useState(() => {
    const saved = readPos()
    return saved ? { x: saved.fx * window.innerWidth, y: saved.y } : null
  })
  const [dragging, setDragging] = useState(false)
  // True while the shape transitions (content can be wider than the pill for those 520 ms).
  const [morphing, setMorphing] = useState(false)
  const [hover, setHover] = useState(false)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const on = () => { setVw(window.innerWidth); setVh(window.innerHeight) }
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  // The orb rings once per check.
  useEffect(() => {
    if (!ui.checking) return undefined
    setPulse(true)
    const id = setTimeout(() => setPulse(false), 700)
    return () => clearTimeout(id)
  }, [ui.checking])

  // Measure the content so width/height can transition between the three shapes.
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return undefined
    const measure = () => {
      // Layout size, not the bounding box: the entry animation scales the content.
      const r = { width: el.offsetWidth, height: el.offsetHeight }
      setSize((p) => {
        if (Math.abs(p.w - r.width) < 0.5 && Math.abs(p.h - r.height) < 0.5) return p
        setMorphing(true)
        return { w: r.width, h: r.height }
      })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode])

  useEffect(() => {
    if (!morphing) return undefined
    const id = setTimeout(() => setMorphing(false), 600)
    return () => clearTimeout(id)
  }, [morphing, size])

  // Peek lifetime: closes by itself unless hovered or focused.
  const paused = hover
  useEffect(() => {
    if (!peek || paused) return undefined
    const id = setTimeout(() => ctl.setUi((u) => (u.peek?.seq === peek.seq ? { peek: null } : {})), PEEK_MS[peek.kind] || 5000)
    return () => clearTimeout(id)
  }, [peek?.seq, paused]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus after a shape change made by the user (expand → collapse button, collapse → pill).
  useEffect(() => {
    const f = focusNext.current
    if (!f) return
    focusNext.current = null
    const root = rootRef.current
    if (f === 'pill') pillRef.current?.focus()
    else root?.querySelector('[data-nv="island-collapse"]')?.focus()
  }, [mode])

  const expand = useCallback(() => {
    focusNext.current = 'panel'
    ctl.setUi({ islandOpen: true, peek: null })
    ctl.emit({ type: 'island-open' })
  }, [ctl])
  const collapse = useCallback(() => {
    focusNext.current = 'pill'
    ctl.setUi({ islandOpen: false })
  }, [ctl])

  // Position: centre-top anchor; clamped to the viewport for the current size.
  const anchor = pos || { x: vw / 2, y: ui.island.top }
  const left = clamp(anchor.x, size.w / 2 + MARGIN, vw - size.w / 2 - MARGIN)
  const topPx = clamp(anchor.y, MARGIN, vh - size.h - MARGIN)
  const maxPanel = Math.max(240, vh - clamp(anchor.y, MARGIN, vh) - MARGIN * 2)

  // Drag: listeners go on the window once the pointer is down, so a fast flick that leaves the pill
  // still moves it; a press without movement stays a click.
  const geom = useRef({})
  geom.current = { size, vw, vh }
  useEffect(() => () => drag.current?.stop?.(), [])
  function onPointerDown(e) {
    if (e.button !== 0) return
    const tgt = e.target
    const handle = tgt.closest?.('[data-nv-drag]')
    if (!handle) return
    if (tgt.closest('button, a, input, select, textarea') && !tgt.closest('[data-nv-drag="pill"]')) return
    // Dragging the expanded panel by its header must not start a text selection.
    if (handle.getAttribute('data-nv-drag') === 'head') e.preventDefault()
    const d = { sx: e.clientX, sy: e.clientY, ox: left, oy: topPx, moved: false }
    const move = (ev) => {
      const dx = ev.clientX - d.sx
      const dy = ev.clientY - d.sy
      if (!d.moved && Math.hypot(dx, dy) < 5) return
      if (!d.moved) {
        d.moved = true
        setDragging(true)
      }
      ev.preventDefault?.()
      setPos({ x: d.ox + dx, y: d.oy + dy })
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      drag.current = null
      if (!d.moved) return
      suppressClick.current = true
      setTimeout(() => { suppressClick.current = false }, 0)
      setDragging(false)
      const { size: sz, vw: w, vh: h } = geom.current
      setPos((p) => {
        if (!p) return p
        const next = { x: clamp(p.x, sz.w / 2 + MARGIN, w - sz.w / 2 - MARGIN), y: clamp(p.y, MARGIN, h - 48) }
        writePos({ fx: next.x / w, y: next.y })
        return next
      })
    }
    drag.current = { stop }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }
  function resetPos() {
    writePos(null)
    setPos(null)
  }
  function onKeyDown(e) {
    if (e.key === 'Escape' && open) {
      e.stopPropagation()
      collapse()
      return
    }
    if (e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault()
      const step = 32
      const nx = left + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0)
      const ny = topPx + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)
      const next = { x: clamp(nx, size.w / 2 + MARGIN, vw - size.w / 2 - MARGIN), y: clamp(ny, MARGIN, vh - 48) }
      setPos(next)
      writePos({ fx: next.x / vw, y: next.y })
    }
  }

  const Icon = level && SEV_ICON[level] ? SEV_ICON[level] : null
  const drugs = top && ['contraindicated', 'major', 'moderate', 'minor'].includes(level) ? top.extension.drugNames.join(' + ') : null

  return (
    <div
      ref={rootRef}
      className="nv-scope nv-island"
      data-theme="dark"
      lang={locale}
      data-mode={mode}
      data-glow={glow}
      data-dragging={dragging || undefined}
      data-morphing={morphing || undefined}
      data-pulse={pulse || undefined}
      data-floating=""
      data-brand-surface=""
      style={{ left, top: topPx, width: size.w, height: size.h, '--nv-island-max': `${maxPanel}px` }}
      onPointerDown={onPointerDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHover(false) }}
      onKeyDown={onKeyDown}
    >
      <div className="nv-island-inner" ref={innerRef} key={mode === 'peek' ? `peek-${peek.seq}` : mode}>
        {mode === 'compact' ? (
          <button
            ref={pillRef}
            type="button"
            className="nv-island-pill"
            data-nv-drag="pill"
            aria-expanded="false"
            aria-label={`${t(locale, 'island.label')}: ${t(locale, 'launcher', { label })}. ${t(locale, 'island.hint')}`}
            title={t(locale, 'island.hint')}
            onClick={() => { if (!suppressClick.current) expand() }}
          >
            <span className="nv-island-orb" aria-hidden="true" />
            <span className="nv-island-brand">DUR</span>
            <span className="nv-island-div" aria-hidden="true" />
            <span className="nv-island-status" data-level={level || undefined}>
              {Icon ? <Icon {...ic(15)} /> : null}
              {label}
            </span>
            {drugs ? <span className="nv-island-ctx nv-truncate">{drugs}</span> : null}
            <span className="nv-island-grip" aria-hidden="true" onDoubleClick={resetPos}>
              <GripVertical {...ic(14)} />
            </span>
          </button>
        ) : mode === 'peek' ? (
          <div className="nv-island-peekwrap" data-nv-drag="peek" role="status" aria-live="off">
            {peek.kind === 'resolved' ? (
              <PeekResolved locale={locale} ui={ui} ext={ext} paused={paused} ms={PEEK_MS.resolved} />
            ) : (
              <PeekFinding card={peekCard} kind={peek.kind} locale={locale} dur={dur} ctl={ctl} paused={paused} ms={PEEK_MS[peek.kind]} />
            )}
          </div>
        ) : (
          <div className="nv-island-panel">
            <Panel mode="island" onCollapse={collapse} onResetPos={resetPos} />
          </div>
        )}
      </div>
    </div>
  )
}

export default Island
