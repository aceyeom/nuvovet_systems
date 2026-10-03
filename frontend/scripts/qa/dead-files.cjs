/*
 * Dead-file check (WP9). Walks static and dynamic imports from the three production entries
 * (index.html → src/main.jsx, portfolio.html → src/portfolio/standalone.jsx, the widget entry)
 * and lists every source file under src/ that none of them reaches. Files reached only from
 * tests, and the dev-only kitchen sink, are reported separately and do not fail.
 *
 *   node scripts/qa/dead-files.cjs        exit 1 if an unreachable, non-test source file exists
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'src')
const ENTRIES = ['src/main.jsx', 'src/portfolio/standalone.jsx', 'src/portfolio/emr/widget/entry.js'].map((p) => path.join(ROOT, p))
const EXT = ['', '.js', '.jsx', '.mjs', '.json', '.css', '/index.js', '/index.jsx']
const SOURCE = /\.(js|jsx|mjs|css|json)$/
const isTest = (f) => /__tests__|\.test\.|\.spec\./.test(f)

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (SOURCE.test(e.name)) out.push(p)
  }
  return out
}

function resolve(from, spec) {
  let base
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec)
  else return null
  base = base.split('?')[0]
  for (const e of EXT) {
    const p = base + e
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
  }
  return null
}

const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]|@import\s+['"]([^'"]+)['"]|@source\s+['"]([^'"]+)['"]|new URL\(\s*['"]([^'"]+)['"]/g

function reach(entries) {
  const seen = new Set()
  const stack = [...entries]
  while (stack.length) {
    const f = stack.pop()
    if (seen.has(f)) continue
    seen.add(f)
    if (!/\.(js|jsx|mjs|css)$/.test(f)) continue
    const src = fs.readFileSync(f, 'utf8')
    for (const m of src.matchAll(IMPORT)) {
      const spec = m.slice(1).find(Boolean)
      if (!spec) continue
      const r = resolve(f, spec)
      if (r && r.startsWith(SRC)) stack.push(r)
      // a directory @source (Tailwind scan) is not an import
    }
  }
  return seen
}

const all = walk(SRC)
const prod = reach(ENTRIES)
const tests = all.filter(isTest)
const viaTests = reach(tests)
// Read without an import: by a backend test/export script (landingStats.json), by the contrast test
// through fs (pairs.json), or run with node (build-derived.mjs).
const NOT_IMPORTED = ['src/data/landingStats.json', 'src/ui/pairs.json', 'src/pages/insurance/data/build-derived.mjs'].map((p) => path.join(ROOT, p))
const dead = all.filter((f) => !prod.has(f) && !isTest(f) && !viaTests.has(f) && !NOT_IMPORTED.includes(f))
const testOnly = all.filter((f) => !prod.has(f) && !isTest(f) && viaTests.has(f))
const rel = (f) => path.relative(ROOT, f)

if (require.main === module) {
  console.log(`dead-files: ${all.length} source files, ${prod.size} reached from production entries`)
  for (const f of testOnly) console.log(`INFO  test-only  ${rel(f)}`)
  for (const f of dead) console.log(`FAIL  unreachable  ${rel(f)}`)
  if (!dead.length) console.log('PASS  no unreachable source files')
  process.exit(dead.length ? 1 : 0)
}
module.exports = { dead: dead.map(rel), testOnly: testOnly.map(rel) }
