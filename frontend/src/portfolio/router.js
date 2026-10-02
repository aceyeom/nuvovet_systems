/**
 * Hash router for the portfolio showcase. Navigation lives entirely in the
 * location hash, so the app works under any host path (/dur in the main app,
 * a file:// URL in the standalone build).
 *
 *   #/                       case study
 *   #/cases                  case picker
 *   #/case/:id               workbench (id = golden case id or 'custom')
 *   #/case/:id/report        printable report
 *   #/case/:id/handout       owner handout
 *   #/how-it-works           how it works
 *
 * Case state that differs from the golden case (or any custom case) travels in
 * the hash query as `?s=<base64url JSON>` so a link reproduces the same case.
 */

import { useEffect, useState } from 'react'

const NAV_EVENT = 'pf:navigate'

// ── Parsing ──────────────────────────────────────────────────────────────────

export function parseHash(hash) {
  const raw = String(hash || '').replace(/^#/, '')
  const [pathPart, queryPart = ''] = raw.split('?')
  const path = '/' + pathPart.replace(/^\/+/, '').replace(/\/+$/, '')
  const query = {}
  for (const pair of queryPart.split('&')) {
    if (!pair) continue
    const i = pair.indexOf('=')
    const k = decodeURIComponent(i < 0 ? pair : pair.slice(0, i))
    const v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1))
    query[k] = v
  }
  return { path, query }
}

/** Resolve a hash into { name, params, query, path }. */
export function matchRoute(hash) {
  const { path, query } = parseHash(hash)
  const seg = path.split('/').filter(Boolean)
  let name = 'notfound'
  const params = {}
  if (seg.length === 0) name = 'study'
  else if (seg[0] === 'cases' && seg.length === 1) name = 'cases'
  else if (seg[0] === 'how-it-works' && seg.length === 1) name = 'how'
  else if (seg[0] === 'case' && seg[1]) {
    params.id = seg[1]
    if (seg.length === 2) name = 'workbench'
    else if (seg.length === 3 && seg[2] === 'report') name = 'report'
    else if (seg.length === 3 && seg[2] === 'handout') name = 'handout'
  }
  return { name, params, query, path }
}

function currentHash() {
  return typeof window === 'undefined' ? '' : window.location.hash
}

/** Subscribe to the current route. Re-renders on hash changes and on navigate(). */
export function useHashRoute() {
  const [route, setRoute] = useState(() => matchRoute(currentHash()))
  useEffect(() => {
    const update = () => setRoute(matchRoute(currentHash()))
    window.addEventListener('hashchange', update)
    window.addEventListener(NAV_EVENT, update)
    return () => {
      window.removeEventListener('hashchange', update)
      window.removeEventListener(NAV_EVENT, update)
    }
  }, [])
  return route
}

/**
 * Go to a hash path, e.g. navigate('/case/choco').
 * replace: true rewrites the current history entry (used for live case state).
 */
export function navigate(to, { replace = false } = {}) {
  if (typeof window === 'undefined') return
  const target = '#' + String(to).replace(/^#/, '')
  if (window.location.hash === target) return
  if (replace) {
    const url = window.location.pathname + window.location.search + target
    // Keep any state another router (react-router in the main app) put there.
    window.history.replaceState(window.history.state, '', url)
    window.dispatchEvent(new Event(NAV_EVENT))
  } else {
    window.location.hash = target
  }
}

// ── Case state codec (base64url JSON, UTF-8 safe) ───────────────────────────

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s) {
  const b64 = String(s).replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
  const bin = atob(b64 + pad)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeState(obj) {
  try {
    return toBase64Url(JSON.stringify(obj))
  } catch {
    return ''
  }
}

/** Returns the decoded object, or null if the string is missing or malformed. */
export function decodeState(s) {
  if (!s) return null
  try {
    const v = JSON.parse(fromBase64Url(s))
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

// ── Hrefs ────────────────────────────────────────────────────────────────────

function withQuery(path, query) {
  const parts = Object.entries(query || {})
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  return parts.length ? `${path}?${parts.join('&')}` : path
}

/**
 * Path (without '#') for a case view.
 * view: 'workbench' | 'report' | 'handout'; state: encoded case state or null.
 */
export function casePath(id, view = 'workbench', state = null) {
  const base = `/case/${id}${view === 'workbench' ? '' : `/${view}`}`
  return withQuery(base, { s: state })
}

export function caseHref(id, view = 'workbench', state = null) {
  return '#' + casePath(id, view, state)
}

export const HREF = {
  study: '#/',
  cases: '#/cases',
  how: '#/how-it-works',
  custom: '#/case/custom',
}
