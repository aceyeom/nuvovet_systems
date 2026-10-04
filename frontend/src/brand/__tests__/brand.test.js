// Brand layer: the outlined lockups (API, attributes, pixel-fitted geometry), the monogram, the tokens and
// the build-time subset of the display face (served as a data: URL under vitest by the Vite plugin).
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BrandLockup, BrandMark, PRODUCTS, lockupGeometry } from '../Brand.jsx'
import { FRAME } from '../brandMarks.generated.js'
import { DISPLAY_FAMILY, DISPLAY_FONT_SOURCES, registerDisplayFont } from '../displayFont.js'

const BRAND_DIR = join(import.meta.dirname, '..')
const ROOT = join(BRAND_DIR, '../..')
const read = (f) => readFileSync(join(BRAND_DIR, f), 'utf8')
const html = (props) => renderToString(createElement(BrandLockup, props))

describe('PRODUCTS', () => {
  it('keeps the product table callers rely on', () => {
    expect(PRODUCTS).toEqual({
      dur: { key: 'dur', name: 'DUR', full: 'nuvovet DUR', tagline: '처방 안전 검토', audience: '동물병원' },
      claims: { key: 'claims', name: 'Claims', full: 'nuvovet Claims', tagline: '보험 청구 심사', audience: '펫보험사' },
    })
  })
})

describe('BrandLockup', () => {
  it('renders the outlined lockup with the documented attributes', () => {
    const out = html({ product: 'dur', height: 18 })
    expect(out).toMatch(/^<span class="nvb-lockup" data-product="dur" data-tone="ink" data-brand-surface="" style="height:18px">/)
    expect(out).toContain('<svg class="nvb-lockup-mark" role="img" aria-label="nuvovet DUR"')
    expect(out.match(/<path /g)).toHaveLength(2)
    expect(out).not.toContain('nvb-suffix')
    // No live text, tile, branch glyph, pill or dot in the mark itself.
    expect(out.replace(/<[^>]+>/g, '')).toBe('')
  })

  it('renders the master wordmark alone and a suffix after it', () => {
    const master = html({})
    expect(master).toContain('aria-label="nuvovet"')
    expect(master).not.toContain('data-product')
    expect(master.match(/<path /g)).toHaveLength(1)
    const withSuffix = html({ product: 'claims', suffix: '콘솔' })
    expect(withSuffix).toContain('aria-label="nuvovet Claims"')
    expect(withSuffix).toContain('<span class="nvb-suffix">콘솔</span>')
  })

  it('accepts the tones and the legacy props', () => {
    expect(html({ tone: 'light' })).toContain('data-tone="light"')
    expect(html({ tone: 'mono' })).toContain('fill="currentColor"')
    expect(html({ tone: 'dark' })).toContain('data-tone="ink"')
    expect(html({ size: 'sm' })).toContain('height:16px')
    expect(html({ size: 'lg' })).toContain('height:24px')
    expect(html({ product: 'unknown' })).not.toContain('data-product')
  })

  it.each([12, 14, 16, 18, 20, 22, 24, 32, 40, 48, 64])('fits %i px to the pixel grid', (h) => {
    const g = lockupGeometry(h, 'claims')
    expect(g.height).toBe(h)
    expect(Number.isInteger(g.feet)).toBe(true)
    expect(g.feet).toBeLessThanOrEqual(h)
    // x-height (serif feet to the top serifs of u and v, 501 units) is a whole number of pixels at the
    // documented sizes; never drawn more than 4 % off the nominal size
    const xh = 501 * g.scale
    if ([16, 18, 20, 22, 24].includes(h)) expect(xh).toBeCloseTo(Math.round(xh), 6)
    expect(Math.abs(g.scale / (h / FRAME.height) - 1)).toBeLessThanOrEqual(0.04)
    // the svg box ends exactly on the serif feet line (y = 25), which is the flex baseline
    const [, top, , vh] = g.viewBox.split(' ').map(Number)
    expect(top + vh).toBeCloseTo(25, 2)
    expect(vh * g.scale).toBeCloseTo(g.feet, 2)
  })
})

describe('BrandMark', () => {
  it('draws the monogram tile in ink or the product ink', () => {
    expect(renderToString(createElement(BrandMark))).toContain('fill="#16191E"')
    expect(renderToString(createElement(BrandMark, { product: 'dur' }))).toContain('fill="#28553B"')
    expect(renderToString(createElement(BrandMark, { product: 'claims', title: 'nuvovet Claims' }))).toContain('aria-label="nuvovet Claims"')
    const bare = renderToString(createElement(BrandMark, { tile: false, size: 22 }))
    expect(bare).not.toContain('<rect')
    expect(bare).toContain('fill="currentColor"')
  })
})

describe('display face', () => {
  it('is subset by the Vite plugin and served as data: URLs outside builds', () => {
    expect(DISPLAY_FAMILY).toBe('nuvovet Display')
    for (const w of ['400', '600']) {
      const src = DISPLAY_FONT_SOURCES[w]
      expect(src.startsWith('data:font/woff2;base64,')).toBe(true)
      const bytes = Buffer.from(src.slice(src.indexOf(',') + 1), 'base64')
      expect(bytes.subarray(0, 4).toString('latin1')).toBe('wOF2')
      // the full MaruBuri files are 820–890 kB; the subset to the brand copy is a fraction of that
      expect(bytes.length).toBeLessThan(120 * 1024)
    }
  })

  it('does nothing without a DOM', () => {
    expect(registerDisplayFont()).toEqual([])
  })
})

describe('tokens and dependencies', () => {
  const css = read('brand.css')

  it('defines the brand tokens', () => {
    for (const [k, v] of Object.entries({
      ink: '#16191E', 'ink-2': '#4D5560', muted: '#646C77', faint: '#8A919B', paper: '#FFFFFF', 'paper-2': '#F6F7F9',
      'dur-ink': '#28553B', 'claims-ink': '#1D3C6E', 'ink-on-dark': '#ECEEF1', 'dur-ink-on-dark': '#8DCBA4', 'claims-ink-on-dark': '#9DBCEE',
    })) expect(css).toContain(`--nvb-${k}: ${v};`)
    expect(css).toContain('--nvb-rule: rgb(16 24 40 / 0.10);')
    expect(css).toContain('--nvb-font-display: "nuvovet Display", "MaruBuri", "Noto Serif KR", "AppleMyungjo", serif;')
  })

  it('has no gradients, blends, colour scales, dots or Geist', () => {
    expect(css).not.toMatch(/gradient\(|--nvb-blend|--nvb-(dur|claims)-\d|::before\s*\{[^}]*border-radius|backdrop-filter|Geist/)
    expect(css).not.toMatch(/nvb-branch|nvb-product\b/)
    for (const f of ['Brand.jsx', 'displayFont.js', 'brand.css']) expect(read(f)).not.toMatch(/lucide-react|@fontsource/)
  })

  it('no longer depends on Geist', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })).not.toContain('@fontsource-variable/geist')
  })
})
