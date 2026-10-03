/**
 * Focus helpers for shadow roots (EMR popup spec §3.4 failure mode 7, §3.12).
 *
 * Focus is retargeted at shadow boundaries: `document.activeElement` is the shadow host, never
 * the button inside it. The drawer trap therefore reads `root.activeElement` (the ShadowRoot's
 * own active element) and `event.composedPath()[0]`. The gate needs none of this: it is a native
 * modal <dialog> (host page inert, Tab stays inside).
 */

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Focusable, rendered descendants of `container` in DOM (= tab) order. */
export function focusables(container) {
  if (!container) return []
  return [...container.querySelectorAll(FOCUSABLE)].filter((el) => !el.closest('[inert]') && el.getClientRects().length > 0)
}

/** The element that really has focus, descending through open shadow roots. */
export function deepActiveElement(doc = typeof document !== 'undefined' ? document : null) {
  let el = doc?.activeElement || null
  while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement
  return el
}

/** The event's real target inside shadow trees. */
export const eventTarget = (e) => (typeof e.composedPath === 'function' ? e.composedPath()[0] : e.target) || e.target

/** True when the native event passed through `node` (e.g. a panel's shadow root). */
export function pathIncludes(e, node) {
  if (!node) return false
  const native = e.nativeEvent || e
  const path = typeof native.composedPath === 'function' ? native.composedPath() : []
  return path.includes(node)
}

/**
 * Tab / Shift+Tab wrap inside `container` (the open drawer). Call from its keydown handler;
 * returns true when it handled the key. `root` is the ShadowRoot that holds the container.
 */
export function trapTab(e, container, root) {
  if (e.key !== 'Tab') return false
  const list = focusables(container)
  if (!list.length) {
    e.preventDefault()
    return true
  }
  const active = root?.activeElement || eventTarget(e)
  const i = list.indexOf(active)
  const first = list[0]
  const last = list[list.length - 1]
  if (e.shiftKey && (i <= 0)) {
    e.preventDefault()
    last.focus()
    return true
  }
  if (!e.shiftKey && (i === -1 || i === list.length - 1)) {
    e.preventDefault()
    first.focus()
    return true
  }
  return false
}

/** Focus `el` if it is still in the document; else `fallback`. Never throws. */
export function restoreFocus(el, fallback) {
  try {
    if (el && el.isConnected && typeof el.focus === 'function') {
      el.focus({ preventScroll: false })
      return true
    }
    if (fallback && fallback.isConnected) {
      fallback.focus()
      return true
    }
  } catch {
    // an element that cannot take focus: leave focus where it is
  }
  return false
}
