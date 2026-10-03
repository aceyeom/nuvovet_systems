/*
 * DESIGN_SYSTEM.md §9.4 static checks. Scans src/** (not tests) except the fictional EMR host
 * (src/portfolio/emr/host/**), src/ui/tokens.css and src/portfolio/styles/print.css.
 *
 *   node scripts/qa/lint-design.cjs          prints one FAIL line per hit, exit 1 on any
 *
 * Allowlists (both in this folder):
 *   arbitrary-allowlist.json  { "<file>": ["w-[240px]", …] } arbitrary px/rem values for w-/h-/max-w-/min-w- per file
 *   nav-allowlist.json        { "useNavigate": [files], "buttons": [...] } files allowed to call useNavigate()
 * Comments are stripped before matching, so a rule may be quoted in a comment.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'src')
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/')
const EXCLUDE = [/^src\/portfolio\/emr\/host\//, /^src\/ui\/tokens\.css$/, /^src\/portfolio\/styles\/print\.css$/, /__tests__\//, /\.test\.js$/]
const arbitraryAllow = JSON.parse(fs.readFileSync(path.join(__dirname, 'arbitrary-allowlist.json'), 'utf8'))
const navAllow = JSON.parse(fs.readFileSync(path.join(__dirname, 'nav-allowlist.json'), 'utf8'))

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(jsx?|mjs|css|json)$/.test(e.name)) out.push(p)
  }
  return out
}

/** Strip JS/CSS comments but keep line numbers (replace comment bodies with spaces). */
function stripComments(src, isCss) {
  let out = ''
  let i = 0
  let str = null
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (str) {
      out += c
      if (c === '\\') { out += n || ''; i += 2; continue }
      if (c === str) str = null
      i++
      continue
    }
    if (!isCss && (c === '"' || c === "'" || c === '`')) { str = c; out += c; i++; continue }
    if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2)
      const body = src.slice(i, end < 0 ? src.length : end + 2)
      out += body.replace(/[^\n]/g, ' ')
      i += body.length
      continue
    }
    if (!isCss && c === '/' && n === '/' && src[i - 1] !== ':') {
      const end = src.indexOf('\n', i)
      const body = src.slice(i, end < 0 ? src.length : end)
      out += body.replace(/[^\n]/g, ' ')
      i += body.length
      continue
    }
    out += c
    i++
  }
  return out
}

const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black'
const RULES = [
  { id: 'tailwind-palette', re: new RegExp(`\\b(bg|text|border|ring|fill|stroke|outline|divide|decoration|from|via|to|placeholder|caret|accent|shadow)-(${PALETTE})(-\\d{2,3})?(\\/\\d+)?\\b`, 'g') },
  { id: 'hex-colour', re: /#[0-9a-fA-F]{3,8}\b/g, skip: (f) => f === 'src/portfolio/emr/widget/widget.css', filter: (m, line) => !/&#\d/.test(line) && !/#\/|href=|['"`]#[a-z]/.test(line.slice(Math.max(0, line.indexOf(m) - 2), line.indexOf(m) + 1)) && /[a-fA-F]/.test(m) | /^#[0-9]{3}([0-9]{3})?$/.test(m) },
  { id: 'colour-function', re: /\b(rgb|rgba|hsl|hsla|oklch|oklab)\(/g, skip: (f) => f === 'src/portfolio/emr/widget/widget.css' },
  { id: 'spacing-scale', re: /(?<![-\w])(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-(7|9|11|14|20|28|32|36|40|44|48|52|56|60|64|72|80|96)\b/g },
  { id: 'arbitrary-length', re: /(?<![\w-])([\w:-]*?)-\[\d+(\.\d+)?(px|rem)\]/g, allow: (m, f) => (arbitraryAllow[f] || []).some((a) => m.endsWith(a)) && /(^|:)(w|h|max-w|min-w|max-h|min-h|size)-\[/.test(m) },
  { id: 'banned-breakpoint', re: /(?<![\w-])(md|2xl):/g, filter: (m, line) => /class|cn\(|['"`]/.test(line) },
  { id: 'shadow', re: /(?<![\w-])(drop-)?shadow(-(xs|sm|md|lg|xl|2xl|inner))?\b(?!-(pop|modal))(?![-\w(])/g, filter: (m, line) => /class|cn\(|['"`]/.test(line) && !/box-shadow|boxShadow|text-shadow/.test(line.slice(line.indexOf(m) - 4, line.indexOf(m) + m.length + 1)) && !/--nv-shadow|shadow-none|shadowRoot|attachShadow|Shadow DOM|shadow root|\bshadow:\s*\[/.test(line) },
  { id: 'rounded', re: /(?<![\w-])rounded(-(2xl|3xl|xs))?\b(?![-\w])|rounded-\[/g, filter: (m, line) => /class|cn\(|['"`]/.test(line) },
  { id: 'uppercase', re: /\buppercase\b|text-transform:\s*uppercase|tracking-(wide|wider|widest|\[0?\.\d)/g, filter: (m, line) => !/toUpperCase/.test(line) || /class/.test(line) },
  { id: 'gradient', re: /bg-clip-text|linear-gradient\(|radial-gradient\(/g, skip: (f) => f === 'src/ui/primitives/skeleton.jsx' },
  { id: 'blur-transition', re: /backdrop-blur|transition-all|transition:\s*all/g },
  { id: 'arbitrary-text-size', re: /text-\[\d/g },
  { id: 'banned-font-or-cdn', re: /fonts\.googleapis|jsdelivr|unpkg|@fontsource|Geist|"Inter"|DM Sans|JetBrains/g },
  { id: 'useNavigate', re: /useNavigate\(/g, allow: (m, f) => (navAllow.useNavigate || []).includes(f) },
  { id: 'location-assign', re: /window\.location(\.href)?\s*=(?!=)/g },
  { id: 'div-onclick', re: /<(div|tr|td|li|span)\b[^>]*\sonClick/g },
  { id: 'href-hash', re: /href="#"/g },
]

// Copy rules: UI string files + JSX text.
const STRING_FILES = [/^src\/i18n\//, /^src\/pages\/.*strings[^/]*\.js$/, /^src\/portfolio\/i18n\//, /^src\/portfolio\/emr\/widget\/strings\.js$/]
const COPY = [
  { id: 'copy-banned-word', re: /정직|\bhonest|seamless|혁신|강력한|\bpowerful|\belevate|\bunlock|Get started|안전합니다/gi },
  { id: 'copy-ellipsis', re: /\.\.\.(?![A-Za-z_$[{(])/g },
  { id: 'copy-arrow', re: /→/g },
]
const TITLE_KEY = /(title|heading|h1|gate|panel|species)/i

function stringLiterals(src) {
  // [{ text, line, key }] for '…', "…", `…` literals and JSX text nodes
  const out = []
  const lineAt = (i) => src.slice(0, i).split('\n').length
  const re = /(?:([A-Za-z_$][\w$]*|'[^']*'|"[^"]*")\s*:\s*)?(['"`])((?:\\.|(?!\2)[^\\])*)\2/g
  let m
  while ((m = re.exec(src))) out.push({ text: m[3], line: lineAt(m.index), key: (m[1] || '').replace(/['"]/g, '') })
  const jsx = />([^<>{}]*[가-힣A-Za-z][^<>{}]*)</g
  while ((m = jsx.exec(src))) if (!/[=;]|\)\s*$|^\s*\w+\s*\(/.test(m[1])) out.push({ text: m[1], line: lineAt(m.index), key: 'jsx' })
  return out
}

function lint() {
  const hits = []
  const files = walk(SRC).map((f) => [f, rel(f)]).filter(([, r]) => !EXCLUDE.some((x) => x.test(r)))
  for (const [abs, f] of files) {
    if (f.endsWith('.json')) continue
    hits.push(...lintSource(fs.readFileSync(abs, 'utf8'), f))
  }
  return hits
}

function lintSource(raw, f) {
  const hits = []
  {
    const src = stripComments(raw, f.endsWith('.css'))
    const lines = src.split('\n')
    for (const rule of RULES) {
      if (rule.skip && rule.skip(f)) continue
      lines.forEach((line, i) => {
        for (const m of line.matchAll(rule.re)) {
          const s = m[0]
          if (rule.filter && !rule.filter(s, line)) continue
          if (rule.allow && rule.allow(s, f)) continue
          hits.push({ rule: rule.id, file: f, line: i + 1, match: s, text: line.trim().slice(0, 140) })
        }
      })
    }
    // copy rules
    const isStrings = STRING_FILES.some((x) => x.test(f))
    if (isStrings || f.endsWith('.jsx')) {
      for (const lit of stringLiterals(src)) {
        if (!isStrings && lit.key !== 'jsx' && !/[가-힣]/.test(lit.text)) continue // JSX files: Korean literals + JSX text only
        for (const rule of COPY) for (const m of lit.text.matchAll(rule.re)) hits.push({ rule: rule.id, file: f, line: lit.line, match: m[0], text: lit.text.slice(0, 100) })
        const dashes = (lit.text.match(/—/g) || []).length
        if (dashes > 1) hits.push({ rule: 'copy-em-dash-many', file: f, line: lit.line, match: '—', text: lit.text.slice(0, 100) })
        if (dashes && TITLE_KEY.test(lit.key)) hits.push({ rule: 'copy-em-dash-title', file: f, line: lit.line, match: lit.key, text: lit.text.slice(0, 100) })
      }
    }
  }
  return hits
}

if (require.main === module) {
  const hits = lint()
  const byRule = {}
  for (const h of hits) {
    byRule[h.rule] = (byRule[h.rule] || 0) + 1
    console.log(`FAIL  ${h.rule}  ${h.file}:${h.line}  ${JSON.stringify(h.match)}  ${h.text}`)
  }
  console.log(hits.length ? `\nlint-design: ${hits.length} hits ${JSON.stringify(byRule)}` : 'PASS  lint-design: no hits')
  fs.mkdirSync(path.join(ROOT, 'qa-shots'), { recursive: true })
  fs.writeFileSync(path.join(ROOT, 'qa-shots/lint-design.json'), JSON.stringify(hits, null, 2))
  process.exitCode = hits.length ? 1 : 0
}
module.exports = { lint, lintSource }
