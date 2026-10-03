/**
 * Font registration for the widget (EMR popup spec §3.4).
 *
 * `@font-face` inside a shadow root is ignored, and an injected `<style>` is blocked by a strict
 * host CSP (`style-src 'self'; font-src 'none'`). So with `fonts: 'inject'` the subset Pretendard
 * WOFF2 bytes (bundled into the IIFE by `?subset`, see entry.js) are decoded in memory and
 * registered once on `document.fonts` with the FontFace API, under a namespaced family name a
 * host cannot collide with. No URL is fetched, no `<style>` and no `@font-face` text is injected.
 *
 * This module has no static font import, so the in-app build (`fonts: 'inherit'`, the document
 * already carries Pretendard) never bundles the bytes twice.
 */

export const WIDGET_FONT_FAMILY = 'NuvoVet Pretendard'

let pending = null

/** base64 data: URI → ArrayBuffer, without fetch (a data: fetch is a connect-src request). */
function dataUriToBuffer(uri) {
  const comma = uri.indexOf(',')
  const b64 = comma >= 0 ? uri.slice(comma + 1) : uri
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

/**
 * registerWidgetFont(source) → Promise<FontFace | null>. `source` is a data: URI or an
 * ArrayBuffer. Idempotent; never throws (the widget falls back to the next family in its stack).
 */
export function registerWidgetFont(source) {
  if (pending) return pending
  if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined' || !source) return Promise.resolve(null)
  for (const f of document.fonts) {
    if (f.family.replace(/"/g, '') === WIDGET_FONT_FAMILY && f.status === 'loaded') return (pending = Promise.resolve(f))
  }
  pending = (async () => {
    try {
      const buf = typeof source === 'string' ? dataUriToBuffer(source) : source
      const face = new FontFace(WIDGET_FONT_FAMILY, buf, { weight: '400', style: 'normal', display: 'swap' })
      await face.load()
      document.fonts.add(face)
      return face
    } catch {
      return null
    }
  })()
  return pending
}
