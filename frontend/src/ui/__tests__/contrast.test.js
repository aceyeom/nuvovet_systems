// WP0 contrast test (DESIGN_SYSTEM.md §3.2): parses tokens.css + pairs.json and enforces
// (1) every listed pair ≥ 4.5:1 (3:1 for large / non-text) in light and dark,
// (2) dark tokens keep the light token's OKLCH hue within ±3° (brand, ring, ok, chart-1),
// (3) every text × bg colour combination used in a src/ui class string is listed in pairs.json,
// (4) the two dark blocks in tokens.css are identical.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { UI, readTokens, readBridge, resolve, parseColor, blend, contrast, oklchHue, scanPairs } from './tokens-lib.js'

const tokens = readTokens()
const bridge = readBridge()
const pairs = JSON.parse(fs.readFileSync(path.join(UI, 'pairs.json'), 'utf8')).pairs
const THEMES = {
  light: tokens.light,
  dark: { ...tokens.light, ...tokens.darkExplicit },
}

function colorOf(theme, name) {
  const [base, alpha] = name.split('/')
  const varName = bridge[base]
  if (!varName) throw new Error(`"${base}" is not a colour in theme.css`)
  const c = parseColor(resolve(THEMES[theme], varName))
  return alpha ? [c[0], c[1], c[2], c[3] * (Number(alpha) / 100)] : c
}

/** Opaque colour of a background name, blended over `over` (itself over --background). */
function surface(theme, name, over = 'background') {
  const page = parseColor(resolve(THEMES[theme], 'background'))
  const under = over === 'background' ? page : blend(colorOf(theme, over), page)
  return blend(colorOf(theme, name), under)
}

function ratio(theme, p) {
  const bg = surface(theme, p.bg, p.over)
  const fg = blend(colorOf(theme, p.fg), bg)
  return contrast(fg, bg)
}

describe('tokens.css structure', () => {
  it('both dark blocks declare the same values', () => {
    expect(tokens.darkSystem).toEqual(tokens.darkExplicit)
  })
  it('has no rem units (the widget shadow root must not follow the host root font size)', () => {
    expect(fs.readFileSync(path.join(UI, 'tokens.css'), 'utf8')).not.toMatch(/\d(\.\d+)?rem\b/)
  })
})

describe('contrast of every pair in pairs.json (WCAG 2.x)', () => {
  for (const theme of ['light', 'dark']) {
    for (const p of pairs) {
      const min = p.kind === 'text' ? 4.5 : 3
      it(`${theme}: ${p.fg} on ${p.bg}${p.over ? ` (over ${p.over})` : ''} ≥ ${min}`, () => {
        const r = ratio(theme, p)
        expect(r, `${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(min)
      })
    }
  }
  it('spot values match the spec (§3.2)', () => {
    expect(ratio('light', { fg: 'foreground', bg: 'background' })).toBeCloseTo(17.62, 1)
    expect(ratio('light', { fg: 'muted-foreground', bg: 'background' })).toBeCloseTo(5.31, 1)
    expect(ratio('dark', { fg: 'brand', bg: 'background' })).toBeCloseTo(7.12, 1)
    expect(ratio('light', { fg: 'on-solid', bg: 'sev-critical-solid' })).toBeCloseTo(5.64, 1)
  })
  it('the focus ring is ≥ 3:1 against the page in both themes', () => {
    for (const theme of ['light', 'dark']) expect(ratio(theme, { fg: 'ring', bg: 'background' })).toBeGreaterThanOrEqual(3)
  })
  it('form-control borders (--input) are ≥ 3:1 against the page', () => {
    for (const theme of ['light', 'dark']) expect(ratio(theme, { fg: 'input', bg: 'background' })).toBeGreaterThanOrEqual(3)
  })
})

describe('dark tokens keep their hue', () => {
  for (const name of ['brand', 'ring', 'ok', 'chart-1']) {
    it(`${name}: |Δ OKLCH hue| ≤ 3°`, () => {
      const a = oklchHue(colorOf('light', name))
      const b = oklchHue(colorOf('dark', name))
      const d = Math.abs(((a - b + 540) % 360) - 180)
      expect(d, `${a.toFixed(1)}° vs ${b.toFixed(1)}°`).toBeLessThanOrEqual(3)
    })
  }
})

describe('every text × bg combination used in src/ui is listed', () => {
  const listed = new Set(pairs.map((p) => `${p.fg}|${p.bg}`))
  const used = scanPairs(Object.keys(bridge))
  it('no unlisted pairs', () => {
    const missing = [...used.entries()].filter(([k]) => !listed.has(k)).map(([k, where]) => `${k}  (${where[0]})`)
    expect(missing, 'add these to src/ui/pairs.json').toEqual([])
  })
})
