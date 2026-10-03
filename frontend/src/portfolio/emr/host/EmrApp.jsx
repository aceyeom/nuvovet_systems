/**
 * The fictional Korean veterinary EMR "데모 차트 (가상 EMR)" (EMR popup spec §2) with the
 * NuvoVet DUR overlay mounted through its public SDK, exactly as a third-party EMR would:
 *
 *   const dur = createDurWidget({ locale, theme, layout: 'auto', fonts: 'inherit', marker: false, user, links, onEvent })
 *   dur.mount({ panel: the right-column <div> (≥ 1280 px only), badgeSlot: rowId → <span data-nv-slot> })
 *   every grid / chart edit  → 300 ms → dur.check(toCdsRequest(visit, 'order-select'))
 *   처방 저장 · 처방전 출력 · eVET 전송 → await dur.gate(toCdsRequest(visit, 'order-sign'))
 *   events back from the widget: remove-row, update-row, focus-row, fix-chart, gate-open/close, feedback
 *
 * The host never reads the widget's internals: it sends CDS-Hooks-shaped requests and reacts to
 * events. Visits live in memory for this page load; "방문 초기화" reloads the fixture.
 *
 * Opening a chart: the fixture's rows are draft orders already entered for the visit, so the host
 * re-selects them once (order-select) on open; that is "the last result for that visit" (§3.5).
 * Nothing interrupts on open: the gate only runs on a sign action.
 */

import './emr.css'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createDurWidget } from '../widget/index.jsx'
import { VISIT_IDS, VISIT_HINTS, VISIT_GOLDEN, loadVisit } from '../fixtures.js'
import { navigate } from '../../router.js'
import { DemoBar } from './DemoBar.jsx'
import { WaitList, WaitRail } from './WaitList.jsx'
import { PatientHeader } from './PatientHeader.jsx'
import { ChartTabs } from './ChartTabs.jsx'
import { RxSearch } from './RxSearch.jsx'
import { RxGrid, gridTotal } from './RxGrid.jsx'
import { newRow } from './catalog.js'
import { fmtWon, requestFor } from './calc.js'
import { USER, chartLine } from './chart.js'

const DEBOUNCE_MS = 300

const SIGN_TOAST = {
  save: '처방을 저장했습니다 (데모)',
  print: '처방전을 출력했습니다 (데모: 실제로 인쇄하지 않습니다)',
  evet: 'eVET 전송을 마쳤습니다 (데모: 실제로 전송하지 않습니다)',
}

function initialStore() {
  const visits = {}
  for (const id of VISIT_IDS) visits[id] = loadVisit(id)
  return { visits, records: {} }
}

function useViewportWidth() {
  const [w, setW] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth))
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setW(window.innerWidth))
    }
    window.addEventListener('resize', on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', on)
    }
  }, [])
  return w
}

const rowNumber = (rowId) => Number(/(\d+)$/.exec(rowId)?.[1] || 0)

/**
 * A new row id for this visit. Ids are never reused within a page load, even after
 * the highest row is deleted: the DUR log keys acknowledgements by row, so a re-added
 * product must not inherit a deleted row's identity (review F2). `issued` holds the
 * highest number handed out per visit.
 */
export function nextRowId(rows, issued = 0) {
  const n = Math.max(issued, rows.reduce((m, r) => Math.max(m, rowNumber(r.rowId)), 0))
  return `rx-${n + 1}`
}

function queryString(query, patch = {}) {
  const q = { ...query, ...patch }
  const parts = Object.entries(q).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export default function EmrApp({ visitId, query = {} }) {
  const locale = query.lang === 'en' ? 'en' : 'ko'
  const widgetTheme = query.theme === 'dark' ? 'dark' : 'light'
  const [store, setStore] = useState(initialStore)
  const visit = store.visits[visitId]
  const records = store.records[visitId] || []
  const [tab, setTab] = useState('A')
  const [selectedRowId, setSelectedRowId] = useState(null)
  const [highlight, setHighlight] = useState(() => new Set())
  const [waitOpen, setWaitOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [durReady, setDurReady] = useState(false)
  const width = useViewportWidth()
  const docked = width >= 1280

  const rootRef = useRef(null)
  const durRef = useRef(null)
  const panelElRef = useRef(null)
  const visitRef = useRef(visit)
  const visitIdRef = useRef(visitId)
  const checkModeRef = useRef('now')
  const timerRef = useRef(0)
  const toastTimer = useRef(0)
  const focusAfterRender = useRef(null)
  const writtenRef = useRef(new Set())
  const issuedRowRef = useRef({}) // visitId → highest row number issued (nextRowId)
  const overridesRef = useRef([])
  const fieldRefs = {
    species: useRef(null), breed: useRef(null), weight: useRef(null),
    mdr1: useRef(null), allergies: useRef(null), dx: useRef(null), labs: useRef(null),
  }
  visitRef.current = visit
  // Remember every row number this visit has shown, so a deleted id is never handed out again.
  if (visit) issuedRowRef.current[visitId] = Math.max(issuedRowRef.current[visitId] || 0, ...visit.rows.map((r) => rowNumber(r.rowId)))
  visitIdRef.current = visitId

  // ── DUR requests ───────────────────────────────────────────────────────────
  const runCheck = useCallback(() => {
    clearTimeout(timerRef.current)
    const dur = durRef.current
    if (!dur || !visitRef.current) return null
    return dur.check(requestFor(visitRef.current, 'order-select', USER))
  }, [])

  /** Change the current visit; re-check after render (debounced unless `now`). */
  const updateVisit = useCallback((fn, { now = false } = {}) => {
    const id = visitIdRef.current
    checkModeRef.current = now ? 'now' : checkModeRef.current === 'now' ? 'now' : 'debounce'
    setStore((s) => ({ ...s, visits: { ...s.visits, [id]: fn(s.visits[id]) } }))
  }, [])

  useEffect(() => {
    const mode = checkModeRef.current
    if (!durReady || !mode) return
    checkModeRef.current = null
    if (mode === 'now') runCheck()
    else {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(runCheck, DEBOUNCE_MS)
    }
  }, [visit, durReady, runCheck])

  // Opening another chart: fresh UI state, then re-select its draft orders.
  const firstVisit = useRef(true)
  useEffect(() => {
    if (firstVisit.current) { firstVisit.current = false; return }
    setSelectedRowId(null)
    setHighlight(new Set())
    setTab('A')
    setWaitOpen(false)
    if (durReady) runCheck()
  }, [visitId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Waitlist overlay (< 1280 px): focus its search on open; Esc / 닫기 return focus to the opener.
  const waitOpener = useRef(null)
  const openWait = useCallback(() => {
    waitOpener.current = document.activeElement
    setWaitOpen(true)
  }, [])
  const closeWait = useCallback(({ restore = true } = {}) => {
    setWaitOpen(false)
    const el = waitOpener.current
    waitOpener.current = null
    if (restore && el && el.isConnected) setTimeout(() => el.focus(), 0)
  }, [])
  useEffect(() => {
    if (waitOpen) rootRef.current?.querySelector('.emr-wait input')?.focus()
  }, [waitOpen])

  useLayoutEffect(() => {
    const f = focusAfterRender.current
    if (!f) return
    focusAfterRender.current = null
    f()
  })

  // ── Host helpers ───────────────────────────────────────────────────────────
  const showToast = useCallback((text) => {
    clearTimeout(toastTimer.current)
    setToast(text)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  const qtyInput = (rowId) => rootRef.current?.querySelector(`[data-emr-qty="${CSS.escape(rowId)}"]`) || null
  const focusQty = (rowId) => {
    const el = qtyInput(rowId)
    if (el) { el.focus(); el.select?.() }
    return Boolean(el)
  }
  const badgeSlot = useCallback((rowId) => rootRef.current?.querySelector(`[data-nv-slot="${CSS.escape(rowId)}"]`) || null, [])

  function focusField(field) {
    const go = () => {
      const map = { species: 'species', breed: 'breed', weight: 'weight', allergies: 'allergies', mdr1: 'mdr1', diagnoses: 'dx', labs: 'labs' }
      const el = fieldRefs[map[field]]?.current
      if (el) { el.focus(); el.scrollIntoView?.({ block: 'nearest' }) }
    }
    if (field === 'diagnoses' || field === 'labs') {
      setTab(field === 'labs' ? 'labs' : 'A')
      setTimeout(go, 30)
    } else setTimeout(go, 0)
  }

  // ── Widget events (the host's side of the SDK contract, §3.2) ───────────────
  const onEvent = (e) => {
    switch (e.type) {
      case 'gate-open':
        if (rootRef.current) rootRef.current.inert = true
        break
      case 'gate-close':
        if (rootRef.current) rootRef.current.inert = false
        break
      case 'remove-row':
        updateVisit((v) => ({ ...v, rows: v.rows.filter((r) => r.rowId !== e.rowId) }), { now: true })
        break
      case 'update-row':
        updateVisit((v) => ({
          ...v,
          rows: v.rows.map((r) => {
            if (r.rowId !== e.rowId) return r
            const patch = { ...e.patch }
            if (patch.qty != null) patch.qty = String(patch.qty)
            return { ...r, ...patch }
          }),
        }), { now: true })
        break
      case 'focus-row':
        if (e.highlight !== undefined) setHighlight(new Set(e.highlight ? e.rowIds || [e.rowId] : []))
        else if (e.rowId) setTimeout(() => focusQty(e.rowId), 0)
        break
      case 'fix-chart':
        focusField(e.field)
        break
      case 'feedback':
        if (e.entry?.outcome === 'overridden') overridesRef.current.push(e.entry)
        break
      default:
        break
    }
  }
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  // ── Widget lifecycle: created once, mounted through the public SDK ─────────
  useEffect(() => {
    const dur = createDurWidget({
      locale,
      theme: widgetTheme,
      layout: 'auto',
      fonts: 'inherit',
      marker: false,
      user: USER,
      links: { workbenchBase: '#' },
      onEvent: (e) => onEventRef.current(e),
    })
    durRef.current = dur
    dur.mount({ panel: panelElRef.current || undefined, badgeSlot })
    checkModeRef.current = 'now'
    setDurReady(true)
    return () => {
      clearTimeout(timerRef.current)
      dur.unmount()
      durRef.current = null
      setDurReady(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { durRef.current?.setLocale(locale) }, [locale])
  useEffect(() => { durRef.current?.setTheme(widgetTheme) }, [widgetTheme])

  // The right column exists only from 1280 px; re-mount the panel whenever it is re-created.
  const panelRef = useCallback((el) => {
    panelElRef.current = el
    if (el && durRef.current) durRef.current.mount({ panel: el, badgeSlot })
  }, [badgeSlot])

  // ── Sign actions (order-sign) ──────────────────────────────────────────────
  const signing = useRef(false)
  async function sign(kind) {
    const dur = durRef.current
    if (!dur || signing.current) return
    signing.current = true
    clearTimeout(timerRef.current)
    runCheck()
    const id = visitIdRef.current
    let res
    try {
      res = await dur.gate(requestFor(visitRef.current, 'order-sign', USER))
    } catch {
      res = null
    } finally {
      signing.current = false
    }
    if (!res) return
    if (res.proceed) {
      const enc = visitRef.current.encounterId
      const fresh = overridesRef.current.filter((f) => f.extension?.encounterId === enc && !writtenRef.current.has(`${f.card}|${f.outcomeTimestamp}`))
      for (const f of fresh) writtenRef.current.add(`${f.card}|${f.outcomeTimestamp}`)
      if (fresh.length) setStore((s) => ({ ...s, records: { ...s.records, [id]: [...(s.records[id] || []), ...fresh.map(chartLine)] } }))
      showToast(SIGN_TOAST[kind])
    } else if (res.focusRowId) {
      // The widget has already returned focus to this button; the row it points at takes it next.
      setTimeout(() => focusQty(res.focusRowId), 0)
    }
  }

  // ── Demo bar actions ───────────────────────────────────────────────────────
  function resetVisit() {
    const id = visitIdRef.current
    durRef.current?.clearLog(visitRef.current.encounterId) // this visit's acknowledgements only
    overridesRef.current = []
    writtenRef.current = new Set()
    setSelectedRowId(null)
    setHighlight(new Set())
    checkModeRef.current = 'now'
    setStore((s) => ({ visits: { ...s.visits, [id]: loadVisit(id) }, records: { ...s.records, [id]: [] } }))
    showToast('방문을 처음 상태로 되돌렸습니다')
  }

  function exportLog() {
    const dur = durRef.current
    if (!dur) return
    const d = new Date()
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const url = URL.createObjectURL(new Blob([dur.exportLog()], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `nuvovet-dur-log-${date}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const hrefFor = (id) => `#/emr/${id}${queryString(query)}`
  const goVisit = (id) => navigate(`/emr/${id}${queryString(query)}`)
  const setQuery = (patch) => navigate(`/emr/${visitId}${queryString(query, patch)}`, { replace: true })

  function skipToDur() {
    const panel = panelElRef.current
    const overlay = document.querySelector('nuvovet-dur-overlay')?.shadowRoot
    const target = panel?.shadowRoot?.querySelector('button, a[href], select, [tabindex="0"]')
      || overlay?.querySelector('.nv-launcher, .nv-sheet-bar')
    target?.focus()
  }

  // ── Grid callbacks ─────────────────────────────────────────────────────────
  const onRowChange = useCallback((rowId, patch) => {
    updateVisit((v) => ({ ...v, rows: v.rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)) }))
  }, [updateVisit])
  const onRowDelete = useCallback((rowId) => {
    updateVisit((v) => ({ ...v, rows: v.rows.filter((r) => r.rowId !== rowId) }), { now: true })
    setSelectedRowId(null)
  }, [updateVisit])
  const onPick = useCallback((code) => {
    const vid = visitIdRef.current
    const rowId = nextRowId(visitRef.current.rows, issuedRowRef.current[vid] || 0)
    issuedRowRef.current[vid] = rowNumber(rowId)
    updateVisit((v) => ({ ...v, rows: [...v.rows, newRow(code, rowId)] }), { now: true })
    focusAfterRender.current = () => focusQty(rowId)
  }, [updateVisit]) // eslint-disable-line react-hooks/exhaustive-deps
  const onPatient = useCallback((patch) => {
    updateVisit((v) => ({ ...v, patient: { ...v.patient, ...patch } }))
  }, [updateVisit])

  // QA hooks (EMR popup spec §8.3/§8.4: "via a test hook"); same shape as widget-demo/emr.js.
  useEffect(() => {
    window.__emr = {
      visit: () => visitRef.current,
      addRow: (row) => updateVisit((v) => ({ ...v, rows: [...v.rows, { ...row }] }), { now: true }),
      deleteRow: (id) => updateVisit((v) => ({ ...v, rows: v.rows.filter((r) => r.rowId !== id) }), { now: true }),
      setPatient: (patch) => updateVisit((v) => ({ ...v, patient: { ...v.patient, ...patch } }), { now: true }),
      rerender: () => updateVisit((v) => ({ ...v, rows: v.rows.map((r) => ({ ...r })) }), { now: true }),
      check: () => runCheck(),
      dur: () => durRef.current,
    }
    return () => { delete window.__emr }
  }, [updateVisit, runCheck])

  const visitsList = useMemo(() => VISIT_IDS.map((id) => store.visits[id]), [store.visits])
  const golden = VISIT_GOLDEN[visitId]
  const p = visit.patient

  return (
    <div className="emr-page">
      <DemoBar
        visits={visitsList.map((v) => ({ id: v.id, name: v.patient.name }))}
        currentId={visitId}
        onVisit={goVisit}
        hint={VISIT_HINTS[visitId]}
        widgetTheme={widgetTheme}
        onWidgetTheme={(t) => setQuery({ theme: t === 'dark' ? 'dark' : null })}
        locale={locale}
        onLocale={(l) => setQuery({ lang: l === 'en' ? 'en' : null })}
        onReset={resetVisit}
        onExport={exportLog}
        caseHref={golden ? `#/case/${golden}` : '#/cases'}
        caseLabel="사례로"
      />
      <div
        className="emr-root"
        id="emr"
        ref={rootRef}
        lang="ko"
        data-wait-open={waitOpen || undefined}
        onKeyDown={(e) => { if (e.key === 'Escape' && waitOpen) closeWait() }}
      >
        <header className="emr-titlebar">
          <span className="emr-product">데모 차트 (가상 EMR)</span>
          <span className="emr-sep emr-sep-menu" aria-hidden="true" />
          <span className="emr-menu" aria-label="메뉴">
            <span>접수</span>
            <span aria-current="page">진료</span>
            <span>수납</span>
            <span>예약</span>
          </span>
          <button type="button" className="emr-btn emr-wait-toggle" aria-expanded={waitOpen} onClick={() => (waitOpen ? closeWait() : openWait())}>대기목록</button>
          <span className="emr-meta">새봄동물의료센터 (가상) · 수의사 {USER.display} · {visit.date}</span>
        </header>
        <div className="emr-body">
          <WaitList visits={visitsList} currentId={visitId} hrefFor={hrefFor} open={waitOpen} onClose={() => closeWait()} onNavigate={() => closeWait({ restore: false })} />
          <WaitRail open={waitOpen} onOpen={openWait} />
          <main className="emr-chart" id="emr-main" tabIndex={-1} aria-label={`진료 차트: ${p.name}`}>
            <PatientHeader visit={visit} fieldRefs={fieldRefs} onPatient={onPatient} />
            <ChartTabs
              visit={visit}
              tab={tab}
              onTab={setTab}
              refs={fieldRefs}
              onDiagnoses={(diagnoses) => updateVisit((v) => ({ ...v, diagnoses }))}
              onLabs={(labs) => updateVisit((v) => ({ ...v, patient: { ...v.patient, labs } }))}
              onNote={(k, text) => setStore((s) => ({ ...s, visits: { ...s.visits, [visitId]: { ...s.visits[visitId], notes: { ...(s.visits[visitId].notes || {}), [k]: text } } } }))}
            />
            <section className="emr-box" aria-label="처치·처방 (TX/RX)">
              <h2 className="emr-box-title">TX/RX</h2>
              <div className="emr-rx-tools">
                <RxSearch species={p.species} onPick={onPick} />
              </div>
              <RxGrid
                rows={visit.rows}
                weightKg={p.weight?.kg ?? null}
                selectedRowId={selectedRowId}
                highlightRowIds={highlight}
                onChange={onRowChange}
                onDelete={onRowDelete}
                onSelect={setSelectedRowId}
              />
              <div className="emr-record" aria-label="진료기록">
                <p>진료기록 · 처방 {visit.rows.length}건 · 합계 <span className="emr-num" title="가상 단가">{fmtWon(gridTotal(visit.rows))}</span></p>
                {records.length ? (
                  <ul data-emr="chart-lines">
                    {records.map((line, i) => <li key={i}>{line}</li>)}
                  </ul>
                ) : null}
              </div>
              <div className="emr-actions">
                <button type="button" className="emr-btn emr-btn-primary" data-emr="save" onClick={() => sign('save')}>처방 저장</button>
                <button type="button" className="emr-btn" data-emr="print" onClick={() => sign('print')}>처방전 출력</button>
                <button type="button" className="emr-btn" data-emr="evet" onClick={() => sign('evet')}>eVET 전송</button>
                <button type="button" className="emr-btn" disabled title="수납 화면은 데모에 없습니다">수납으로</button>
                <button type="button" className="emr-skip" onClick={skipToDur}>DUR 검토로 이동</button>
              </div>
            </section>
          </main>
          {docked ? <div className="emr-dur" ref={panelRef} data-emr="dur-panel" id="nv-panel" /> : null}
        </div>
        <p className="emr-watermark">가상 EMR · 실제 제품이 아닙니다</p>
        <div role="status" aria-live="polite">
          {toast ? <div className="emr-toast">{toast}</div> : null}
        </div>
      </div>
    </div>
  )
}
