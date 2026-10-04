/**
 * The brand display face: MaruBuri Regular (400) and SemiBold (600), registered as "nuvovet Display"
 * (first in --nvb-font-display, src/brand/brand.css). Import once, for its side effect, from the entry
 * of any surface that sets display type (the landing):
 *
 *   import '@/brand/displayFont'
 *
 * The two files are subset at build time to the static brand copy (scripts/vite-plugin-display-font.js,
 * registered in vite.config.js), so the display face renders ko.js / landing / brand copy only, never
 * runtime data. Outlined lockups (Brand.jsx) do not need this font.
 *
 * Not for the standalone or widget builds: their configs do not register the subset plugin.
 */
import regular from './fonts/MaruBuri-Regular.woff2?display-subset'
import semibold from './fonts/MaruBuri-SemiBold.woff2?display-subset'

export const DISPLAY_FAMILY = 'nuvovet Display'
export const DISPLAY_FONT_SOURCES = { 400: regular, 600: semibold }

let registered = null

/** Registers both weights once (no-op without a DOM, e.g. vitest or SSR). Returns the FontFace objects. */
export function registerDisplayFont() {
  if (registered) return registered
  if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') return []
  registered = Object.entries(DISPLAY_FONT_SOURCES).map(([weight, src]) => {
    const face = new FontFace(DISPLAY_FAMILY, `url(${JSON.stringify(src)}) format("woff2")`, { weight, style: 'normal', display: 'swap' })
    document.fonts.add(face)
    // Start the download now rather than at first layout; the headline uses it immediately.
    face.load().catch(() => {})
    return face
  })
  return registered
}

registerDisplayFont()
