// Helpers for contrast.test.js: parse tokens.css / theme.css, WCAG contrast, OKLCH hue, class scan.
import fs from 'node:fs'
import path from 'node:path'

export const UI = path.resolve(import.meta.dirname, '..')

function declarations(block) {
  const out = {}
  for (const m of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

/** { light, darkSystem, darkExplicit } maps of raw declarations. */
export function readTokens(file = path.join(UI, 'tokens.css')) {
  const css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const light = css.match(/:root,\s*\.nv-scope\s*\{([\s\S]*?)\n\}/)
  const sys = css.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\),\s*\.nv-scope:not\(\[data-theme="light"\]\)\s*\{([\s\S]*?)\}\s*\}/)
  const exp = css.match(/:root\[data-theme="dark"\],\s*\.nv-scope\[data-theme="dark"\]\s*\{([\s\S]*?)\}/)
  if (!light || !sys || !exp) throw new Error('tokens.css: expected the light block and both dark blocks')
  return { light: declarations(light[1]), darkSystem: declarations(sys[1]), darkExplicit: declarations(exp[1]) }
}

/** Tailwind colour name → CSS variable name, from theme.css (--color-X: var(--Y)). */
export function readBridge(file = path.join(UI, 'theme.css')) {
  const css = fs.readFileSync(file, 'utf8')
  const map = {}
  for (const m of css.matchAll(/--color-([\w-]+)\s*:\s*var\(--([\w-]+)\)/g)) map[m[1]] = m[2]
  return map
}

export function resolve(vars, name, depth = 0) {
  const v = vars[name]
  if (v == null) throw new Error(`unknown token --${name}`)
  const m = v.match(/^var\(--([\w-]+)\)$/)
  if (m) {
    if (depth > 10) throw new Error(`var cycle at --${name}`)
    return resolve(vars, m[1], depth + 1)
  }
  return v
}

/** '#RRGGBB' | 'rgb(r g b / a)' → [r, g, b, a] (0–255, alpha 0–1). */
export function parseColor(s) {
  let m = s.match(/^#([0-9a-f]{6})$/i)
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1)
  m = s.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)\s*)?\)$/)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] == null ? 1 : Number(m[4])]
  throw new Error(`cannot parse colour "${s}"`)
}

export function blend([r, g, b, a], [R, G, B]) {
  return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a), 1]
}

const lin = (c) => {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
export const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** OKLCH hue in degrees (Björn Ottosson's OKLab). */
export function oklchHue([r, g, b]) {
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const h = (Math.atan2(Bb, A) * 180) / Math.PI
  return h < 0 ? h + 360 : h
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== '__tests__') walk(p, out)
    } else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(p)
  }
  return out
}

function stripVariants(tok) {
  let depth = 0, last = -1
  for (let i = 0; i < tok.length; i++) {
    const c = tok[i]
    if (c === '[' || c === '(') depth++
    else if (c === ']' || c === ')') depth--
    else if (c === ':' && depth === 0) last = i
  }
  return tok.slice(last + 1).replace(/!$/, '').replace(/^!/, '')
}

/**
 * Every text-colour × background-colour combination used inside one class string in src/ui/**.
 * A string with text colours and no background colour pairs them with `background`.
 * Returns Map "fg|bg" → [file:line, …].
 */
export function scanPairs(colorNames, root = UI) {
  const names = new Set(colorNames)
  const found = new Map()
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8')
    const lines = src.split('\n')
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)) {
        const str = m[1] ?? m[2] ?? m[3]
        if (!/\b(text|bg)-/.test(str)) continue
        const fg = new Set(), bg = new Set()
        for (const tok of str.split(/\s+/)) {
          const u = stripVariants(tok)
          const t = u.match(/^text-([\w-]+?)(\/\d+)?$/)
          if (t && names.has(t[1])) fg.add(t[1] + (t[2] || ''))
          const b = u.match(/^bg-([\w-]+?)(\/\d+)?$/)
          if (b && names.has(b[1])) bg.add(b[1] + (b[2] || ''))
        }
        if (!fg.size) continue
        if (!bg.size) bg.add('background')
        for (const f of fg) for (const b of bg) {
          const k = `${f}|${b}`
          if (!found.has(k)) found.set(k, [])
          found.get(k).push(`${path.relative(root, file)}:${i + 1}`)
        }
      }
    })
  }
  return found
}
