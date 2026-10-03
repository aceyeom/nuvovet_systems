/**
 * Build-time font subsetting for single-file / widget builds.
 *
 * Runs in generateBundle (post): collects every character that appears in the
 * emitted JS/HTML (UI strings, i18n tables, case data), subsets each emitted
 * .woff2 to those glyphs (+ ASCII + Hangul jamo/punctuation safety set) with
 * harfbuzz (subset-font), keeping the variation axes (or the range given), then rewrites the CSS url()
 * to a base64 data: URI and deletes the font file from the bundle.
 *
 * Caveat: text typed by the user that is NOT in the bundle (e.g. a free-text
 * patient name in Hangul) falls back to the system Korean font. For the
 * portfolio (fixed strings) that is acceptable; for a product UI, ship the
 * dynamic-subset files instead.
 */
import subsetFont from 'subset-font'

const SAFETY = (() => {
  let s = ''
  for (let c = 0x20; c < 0x7f; c++) s += String.fromCharCode(c)
  s += '·•–—‘’“”…→←↑↓±×÷°µ≥≤≠✓✕⌘⇧⌥'
  return s
})()

/**
 * Options:
 *   extraText      characters to keep besides those found in the bundle
 *   variationAxes  passed to subset-font, e.g. { wght: { min: 400, max: 600 } } to keep only the
 *                  weight range the CSS uses (partial instancing; still a variable font), or
 *                  { wght: 400 } to pin one static weight
 *   keepFeatures   OpenType layout features to keep (default: all, which also pulls in every
 *                  stylistic-set / character-variant alternate glyph of the kept characters)
 */
export function subsetFonts({ extraText = '', log = true, variationAxes, keepFeatures } = {}) {
  return {
    name: 'subset-fonts',
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      order: 'post', // after Vite emits the CSS asset; list this plugin BEFORE the inliner (sequential hook)
      async handler(_opts, bundle) {
        let text = SAFETY + extraText
        for (const f of Object.values(bundle)) {
          if (f.type === 'chunk') text += f.code
          else if (f.fileName.endsWith('.html')) text += String(f.source)
        }
        // Decode \uXXXX escapes the minifier may have produced.
        text += text.replace(/\\u\{?([0-9a-fA-F]{4,5})\}?/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        const chars = [...new Set(text)].join('')
        const fonts = Object.values(bundle).filter((f) => f.type === 'asset' && f.fileName.endsWith('.woff2'))
        for (const font of fonts) {
          const before = font.source.length
          const out = await subsetFont(Buffer.from(font.source), chars, {
            targetFormat: 'woff2',
            ...(variationAxes ? { variationAxes } : null),
            ...(keepFeatures ? { keepFeatures } : null),
          })
          const uri = `data:font/woff2;base64,${out.toString('base64')}`
          const name = font.fileName.split('/').pop()
          for (const css of Object.values(bundle)) {
            if (css.type === 'asset' && css.fileName.endsWith('.css')) {
              css.source = String(css.source).replace(new RegExp(`url\\((["']?)[^)"']*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1\\)`, 'g'), `url(${uri})`)
            }
            if (css.type === 'chunk' && css.code.includes(name)) {
              // ?inline CSS (widget build) lives inside the JS chunk
              css.code = css.code.split(new RegExp(`(?:\\./|/)?(?:assets/)?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)).join(uri)
            }
          }
          delete bundle[font.fileName]
          if (log) console.log(`  subset ${name}: ${(before / 1024).toFixed(0)} kB -> ${(out.length / 1024).toFixed(0)} kB`)
        }
      },
    },
  }
}
