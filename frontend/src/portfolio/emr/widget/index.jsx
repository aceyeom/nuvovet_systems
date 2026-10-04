/**
 * createDurWidget(options) = createDur(options) (the SDK core, ../sdk.js) + the overlay UI
 * (EMR popup spec §3.1–§3.12).
 *
 * ── DOM (§3.4) ──
 *   <nuvovet-dur-overlay>   appended once directly under <body>. Its open shadow root holds the
 *                           single React root, the gate <dialog> (top layer via showModal()), the
 *                           floating launcher + drawer and the bottom sheet.
 *   panel host              `mount({ panel })`; the widget attaches an open shadow root and the root
 *                           renders the docked panel into it with createPortal.
 *   badge slots             `span[data-nv-slot="<rowId>"]` inside the host's DUR <td>; one shadow root
 *                           each, re-acquired on every check(). A slot that cannot take a shadow root
 *                           (a <td>) gets a span child; a detached slot is skipped; an existing open
 *                           shadow root is reused.
 *   One CSSStyleSheet (tokens.css + widget.css) is adopted by every shadow root.
 *
 * ── Public API (§3.2): the SDK core's, with these widget additions ──
 *   mount({ panel?, badgeSlot? }) · check(request) · gate(request) · setLocale · setTheme · unmount
 *   addEventListener(fn) → unsubscribe   same events as options.onEvent
 *   setLayout(layout)                    'auto' | 'docked' | 'floating' | 'sheet' | 'island'
 *   setContext({ rowId })                the host's focused row: the island peeks at that row's finding
 *   setIsland({ top?, dockable? })       island options after creation
 *
 * ── Island (layout: 'island', island.jsx) ──
 *   options.island = { top?: px, dockable?: boolean }   start position (centre-top) and the dock button
 *   A dark pill that is dragged anywhere (position kept in localStorage), peeks open by itself when a
 *   check brings a new finding (or clears the last one), and expands in place into the full panel.
 *   { type: 'layout-request', layout: 'docked' | 'island' }   dock / undock buttons; the host decides
 *   { type: 'island-open' } · { type: 'reveal', rowId, uuid }   the vet opened the review (host analytics / guides)
 *
 * ── Events the UI adds to the core's (§3.2 DurEvent) ──
 *   { type: 'focus-row', rowId, highlight: true, rowIds }   hover/focus on a card: highlight its rows
 *   { type: 'focus-row', rowId: null, highlight: false, rowIds: [] }   hover ended: clear the highlight
 *   (a focus-row without `highlight` is "처방 수정" / "행으로 이동": move focus to that row's Qty)
 *
 * ── Gate focus (§3.8) ──
 *   gate() records the focused element (the host's save button). On every close path the dialog is
 *   closed with dialog.close() before its content unmounts; then the 'gate-close' event reaches the
 *   host (which lifts its `inert`), then focus returns to the recorded element if it is connected.
 */

import { createRoot } from 'react-dom/client'
import { createDur, SDK_VERSION } from '../sdk.js'
import tokensCss from '@/ui/tokens.css?inline'
import widgetCss from './widget.css?inline'
import islandCss from './island.css?inline'
import { registerWidgetFont } from './fonts.js'
import { deepActiveElement, restoreFocus } from './focus.js'
import { WidgetApp } from './WidgetApp.jsx'
import { resolveLayout } from './layout.js'

export const WIDGET_VERSION = SDK_VERSION
export const OVERLAY_TAG = 'nuvovet-dur-overlay'

let sharedSheet = null
function styleSheet() {
  if (sharedSheet !== null) return sharedSheet
  try {
    if (typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype) {
      const s = new CSSStyleSheet()
      s.replaceSync(`${tokensCss}\n${widgetCss}\n${islandCss}`)
      sharedSheet = s
      return s
    }
  } catch {
    // fall through to the <style> fallback
  }
  sharedSheet = false
  return false
}

/** Give a shadow root the widget CSS (constructed sheet; <style> fallback for old engines). */
function adopt(root) {
  const sheet = styleSheet()
  if (sheet && 'adoptedStyleSheets' in root) {
    if (!root.adoptedStyleSheets.includes(sheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
    return
  }
  if (!root.querySelector('style[data-nv-style]')) {
    const st = document.createElement('style')
    st.setAttribute('data-nv-style', '')
    st.textContent = `${tokensCss}\n${widgetCss}\n${islandCss}`
    root.prepend(st)
  }
}

/** An open shadow root for `el`: reuse, attach, or (for <td> and friends) a span child's. */
function shadowFor(el, depth = 0) {
  if (!el) return null
  if (el.shadowRoot) {
    adopt(el.shadowRoot)
    return el.shadowRoot
  }
  try {
    const root = el.attachShadow({ mode: 'open' })
    adopt(root)
    return root
  } catch {
    if (depth > 0) return null
    let child = [...el.children].find((c) => c.tagName === 'SPAN' && c.hasAttribute('data-nv-slot'))
    if (!child) {
      child = document.createElement('span')
      child.setAttribute('data-nv-slot', el.getAttribute('data-nv-slot') || '')
      el.appendChild(child)
    }
    return shadowFor(child, depth + 1)
  }
}

function defaultSlot(rowId) {
  const esc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(rowId) : String(rowId).replace(/"/g, '\\"')
  return document.querySelector(`[data-nv-slot="${esc}"]`)
}

export { resolveLayout }

export function createDurWidget(options = {}) {
  const hostListeners = new Set(options.onEvent ? [options.onEvent] : [])
  const core = createDur({ ...options, onEvent: undefined })
  const forward = (e) => {
    for (const fn of hostListeners) {
      try { fn(e) } catch { /* a host listener error never breaks the widget */ }
    }
  }

  // ── UI store (React reads it with useSyncExternalStore) ──
  const subs = new Set()
  let snap = {
    core: core.getState(),
    ui: {
      slots: new Map(), // rowId → ShadowRoot
      panelRoot: null,
      panelConnected: false,
      width: typeof window !== 'undefined' ? window.innerWidth : 1440,
      drawerOpen: false,
      sheetExpanded: false,
      minimised: false,
      expanded: {}, // card uuid → boolean (user choice; default: blocking cards expanded)
      reveal: null, // { uuid, rowId, seq } badge click → expand, scroll, focus
      checkedAt: null,
      // Island (layout 'island'): compact | expanded, a transient peek, the "checking" pulse.
      islandOpen: false,
      peek: null, // { kind: 'finding' | 'resolved' | 'row', uuid?, rowId?, seq }
      checking: 0, // seq of the latest check (the pill pulses once per check)
      island: { top: 12, dockable: false, ...(options.island || {}) },
    },
  }
  let peekSeq = 0
  const seenByEncounter = new Map() // encounterId → Set(ackKey) of findings already shown
  let lastContextRow = null
  const emitChange = () => { for (const fn of subs) fn() }
  const setUi = (patch) => {
    snap = { ...snap, ui: { ...snap.ui, ...(typeof patch === 'function' ? patch(snap.ui) : patch) } }
    emitChange()
  }
  core.subscribe((s) => {
    snap = { ...snap, core: s }
    emitChange()
  })

  let overlay = null
  let reactRoot = null
  let dialogEl = null
  let returnTo = null
  let panelEl = null
  let observer = null
  let resizeRaf = 0
  let seq = 0

  core.addEventListener((e) => {
    if (e.type === 'gate-close') {
      try { if (dialogEl && dialogEl.open) dialogEl.close() } catch { /* already closed */ }
      forward(e)
      restoreFocus(returnTo)
      returnTo = null
      return
    }
    forward(e)
  })

  if (options.fonts === 'inject' && options.fontSource) registerWidgetFont(options.fontSource)

  function onResize() {
    if (resizeRaf) return
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0
      if (window.innerWidth !== snap.ui.width) setUi({ width: window.innerWidth })
    })
  }

  function watchPanel() {
    if (observer || typeof MutationObserver === 'undefined') return
    observer = new MutationObserver(() => {
      const connected = Boolean(panelEl && panelEl.isConnected)
      if (connected !== snap.ui.panelConnected) setUi({ panelConnected: connected })
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
  }

  function ensureOverlay() {
    if (typeof document === 'undefined') return false
    if (overlay && overlay.isConnected) return true
    if (!document.body) return false
    if (!overlay) {
      overlay = document.createElement(OVERLAY_TAG)
      const root = overlay.attachShadow({ mode: 'open' })
      adopt(root)
      const container = document.createElement('div')
      container.className = 'nv-root'
      root.appendChild(container)
      reactRoot = createRoot(container)
      reactRoot.render(<WidgetApp ctl={ctl} />)
      window.addEventListener('resize', onResize)
    }
    document.body.appendChild(overlay)
    return true
  }

  function acquireSlots(rowIds) {
    const find = snap.core.targets?.badgeSlot || defaultSlot
    const next = new Map()
    for (const rowId of rowIds) {
      let el = null
      try { el = find(rowId) } catch { el = null }
      if (!el || !el.isConnected) continue
      const root = shadowFor(el)
      if (root) next.set(rowId, root)
    }
    setUi({ slots: next })
  }

  /** Island peek: a new finding (severity moderate or higher), or the last finding cleared. */
  function notePeek(response) {
    const ext = response?.extension
    if (!ext) return
    const enc = ext.encounterId || ''
    const seen = seenByEncounter.get(enc)
    const keys = (response.cards || []).map((k) => k.extension.ackKey || k.uuid)
    seenByEncounter.set(enc, new Set(keys))
    const fresh = (response.cards || []).filter((k) => !(seen && seen.has(k.extension.ackKey || k.uuid)) && k.extension.severity !== 'minor')
    if (fresh.length) {
      peekSeq += 1
      setUi({ peek: { kind: 'finding', uuid: fresh[0].uuid, seq: peekSeq } })
    } else if (seen && seen.size && !keys.length) {
      peekSeq += 1
      setUi({ peek: { kind: 'resolved', seq: peekSeq } })
    } else if (snap.ui.peek?.uuid && !(response.cards || []).some((k) => k.uuid === snap.ui.peek.uuid)) {
      setUi({ peek: null })
    }
  }

  /** Internal controller the React tree uses. */
  const ctl = {
    core,
    getSnapshot: () => snap,
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    setUi,
    get overlayRoot() { return overlay?.shadowRoot || null },
    registerDialog(el) { dialogEl = el },
    emit: forward,
    highlightRows(rowIds) {
      const list = rowIds || []
      if (!list.length) forward({ type: 'focus-row', rowId: null, highlight: false, rowIds: [] })
      else forward({ type: 'focus-row', rowId: list[0], highlight: true, rowIds: list.slice() })
    },
    /** Badge click: open the surface that shows the panel, expand the card, scroll and focus it. */
    reveal(rowId, uuid) {
      seq += 1
      forward({ type: 'reveal', rowId: rowId || null, uuid: uuid || null })
      setUi((u) => ({
        reveal: { rowId, uuid, seq },
        drawerOpen: true,
        sheetExpanded: true,
        islandOpen: true,
        peek: null,
        minimised: false,
        expanded: uuid ? { ...u.expanded, [uuid]: true } : u.expanded,
      }))
    },
  }

  const api = {
    ...core,
    version: WIDGET_VERSION,

    mount(targets = {}) {
      core.mount(targets)
      ensureOverlay()
      panelEl = targets.panel || null
      const panelRoot = panelEl ? shadowFor(panelEl) : null
      setUi({ panelRoot, panelConnected: Boolean(panelEl && panelEl.isConnected) })
      watchPanel()
      const resp = core.getState().response
      if (resp) acquireSlots(Object.keys(resp.extension.rowStatus || {}))
    },

    check(request) {
      ensureOverlay()
      const response = core.check(request)
      setUi((u) => ({ checkedAt: new Date(), checking: u.checking + 1 }))
      acquireSlots(Object.keys(response.extension.rowStatus || {}))
      notePeek(response)
      return response
    },

    setLayout(layout) {
      core.setLayout(layout)
      if (layout !== 'island') setUi({ islandOpen: false, peek: null })
    },

    /** Island options after creation, e.g. a new default `top` when the host's chrome changes height. */
    setIsland(opts = {}) {
      setUi((u) => ({ island: { ...u.island, ...opts } }))
    },

    /** The host's focused row: the island peeks at that row's first finding (once per row change). */
    setContext({ rowId } = {}) {
      if (rowId === lastContextRow) return
      lastContextRow = rowId || null
      if (!rowId || snap.ui.islandOpen) return
      const st = core.getState().response?.extension?.rowStatus?.[rowId]
      const uuid = st?.cardUuids?.[0]
      if (!uuid) return
      if (snap.ui.peek && snap.ui.peek.kind === 'finding') return
      peekSeq += 1
      setUi({ peek: { kind: 'row', rowId, uuid, seq: peekSeq } })
    },

    gate(request) {
      ensureOverlay()
      const active = typeof document !== 'undefined' ? document.activeElement : null
      // The host's save button; when focus is inside one of the widget's shadow roots, its real target.
      returnTo = active && active.shadowRoot ? deepActiveElement() : active
      const p = core.gate(request)
      const resp = core.getState().gate?.response
      if (resp) acquireSlots(Object.keys(resp.extension.rowStatus || {}))
      return p
    },

    addEventListener(fn) {
      hostListeners.add(fn)
      return () => hostListeners.delete(fn)
    },

    unmount() {
      core.unmount()
      observer?.disconnect()
      observer = null
      if (typeof window !== 'undefined') window.removeEventListener('resize', onResize)
      // The host may call unmount() from its own React commit (an effect cleanup); unmounting this root
      // synchronously there is a React error, so the overlay leaves the DOM now and its root unmounts next task.
      const root = reactRoot
      reactRoot = null
      overlay?.remove()
      overlay = null
      if (root) setTimeout(() => { try { root.unmount() } catch { /* already unmounted */ } }, 0)
      panelEl = null
      snap = { ...snap, ui: { ...snap.ui, slots: new Map(), panelRoot: null, panelConnected: false, drawerOpen: false } }
    },
  }
  return api
}

export default createDurWidget
