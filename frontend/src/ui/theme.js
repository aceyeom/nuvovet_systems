/**
 * Theme mechanism (DESIGN_SYSTEM.md §2.6).
 *
 * One attribute everywhere: data-theme="light" | "dark" on <html> (main app, standalone) or on a
 * `.nv-scope` element (widget shadow roots). No attribute means "follow the system".
 * The choice persists in localStorage['nv-theme']; the inline bootstrap script in index.html /
 * portfolio.html applies it before any CSS so there is no flash.
 */
import { useEffect, useState } from 'react'

export const THEME_KEY = 'nv-theme'
const LEGACY_KEY = 'nuvovet.dur.theme'
export const THEMES = ['system', 'light', 'dark']
const EVENT = 'nv-themechange'

function root(el) {
  if (el) return el
  return typeof document === 'undefined' ? null : document.documentElement
}

function readStored() {
  try {
    const ls = window.localStorage
    let v = ls.getItem(THEME_KEY)
    const legacy = ls.getItem(LEGACY_KEY)
    if (legacy !== null) {
      // Read the portfolio's old key once, then drop it.
      if (v === null && (legacy === 'light' || legacy === 'dark')) {
        v = legacy
        ls.setItem(THEME_KEY, legacy)
      }
      ls.removeItem(LEGACY_KEY)
    }
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

/** 'light' | 'dark' | 'system' as currently applied to the element (default <html>). */
export function getTheme(el) {
  const r = root(el)
  const t = r?.dataset?.theme
  if (t === 'light' || t === 'dark') return t
  return 'system'
}

/** 'light' | 'dark' after resolving 'system' through prefers-color-scheme. */
export function resolvedTheme(el) {
  const t = getTheme(el)
  if (t !== 'system') return t
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * Apply and persist a theme. `el` targets a widget `.nv-scope`; persistence applies to the
 * document theme only.
 */
export function setTheme(t, el) {
  const r = root(el)
  if (!r) return
  const next = t === 'light' || t === 'dark' ? t : 'system'
  if (next === 'system') delete r.dataset.theme
  else r.dataset.theme = next
  if (!el) {
    try {
      if (next === 'system') window.localStorage.removeItem(THEME_KEY)
      else window.localStorage.setItem(THEME_KEY, next)
      window.localStorage.removeItem(LEGACY_KEY)
    } catch {
      /* storage blocked: the attribute still applies for this page view */
    }
    const meta = document.querySelectorAll('meta[name="theme-color"]')
    meta.forEach((m) => {
      if (!m.dataset.nvMedia) m.dataset.nvMedia = m.getAttribute('media') || ''
      const media = m.dataset.nvMedia
      if (next === 'system') m.setAttribute('media', media)
      else if (media.includes(next)) m.removeAttribute('media')
      else m.setAttribute('media', 'not all')
    })
  }
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
  } catch {
    /* non-browser */
  }
}

/** Re-apply the stored theme (the bootstrap script does this before first paint). */
export function initTheme() {
  const v = readStored()
  if (v) setTheme(v)
}

/**
 * React hook: { theme: 'light'|'dark'|'system', resolved: 'light'|'dark', setTheme }.
 * Re-renders on setTheme() anywhere and on system colour-scheme changes.
 */
export function useTheme() {
  const [state, setState] = useState(() => ({ theme: getTheme(), resolved: resolvedTheme() }))
  useEffect(() => {
    const update = () => setState({ theme: getTheme(), resolved: resolvedTheme() })
    let mq
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', update)
    } catch {
      mq = null
    }
    window.addEventListener(EVENT, update)
    update()
    return () => {
      window.removeEventListener(EVENT, update)
      mq?.removeEventListener('change', update)
    }
  }, [])
  return { ...state, setTheme }
}
