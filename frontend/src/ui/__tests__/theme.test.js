// theme.js (§2.6) against a minimal DOM stub (the test environment is node).
import { describe, it, expect, beforeEach } from 'vitest'
import { getTheme, setTheme, resolvedTheme, initTheme, THEME_KEY } from '../theme.js'

function stub({ dark = false } = {}) {
  const store = new Map()
  const html = { dataset: {} }
  globalThis.document = { documentElement: html, querySelectorAll: () => [] }
  globalThis.window = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    matchMedia: () => ({ matches: dark, addEventListener() {}, removeEventListener() {} }),
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {},
  }
  globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o?.detail } }
  return { store, html }
}

describe('theme', () => {
  let env
  beforeEach(() => { env = stub() })

  it('defaults to system and resolves through prefers-color-scheme', () => {
    expect(getTheme()).toBe('system')
    expect(resolvedTheme()).toBe('light')
    stub({ dark: true })
    expect(resolvedTheme()).toBe('dark')
  })
  it('setTheme sets the attribute and persists nv-theme', () => {
    setTheme('dark')
    expect(env.html.dataset.theme).toBe('dark')
    expect(env.store.get(THEME_KEY)).toBe('dark')
    expect(getTheme()).toBe('dark')
    setTheme('system')
    expect(env.html.dataset.theme).toBeUndefined()
    expect(env.store.has(THEME_KEY)).toBe(false)
  })
  it('reads the legacy portfolio key once, then removes it', () => {
    env.store.set('nuvovet.dur.theme', 'dark')
    initTheme()
    expect(env.html.dataset.theme).toBe('dark')
    expect(env.store.get(THEME_KEY)).toBe('dark')
    expect(env.store.has('nuvovet.dur.theme')).toBe(false)
  })
  it('targets a widget .nv-scope element without touching storage', () => {
    const scope = { dataset: {} }
    setTheme('light', scope)
    expect(scope.dataset.theme).toBe('light')
    expect(env.store.size).toBe(0)
  })
  it('survives blocked storage', () => {
    window.localStorage.setItem = () => { throw new Error('blocked') }
    expect(() => setTheme('dark')).not.toThrow()
    expect(env.html.dataset.theme).toBe('dark')
  })
})
