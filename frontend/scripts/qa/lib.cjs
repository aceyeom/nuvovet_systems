/*
 * Shared helpers for the WP9 QA scripts (DESIGN_SYSTEM.md §9, EMR popup spec §8.3/§8.4).
 *
 * - Playwright comes from the global install (no new dependency).
 * - `devServer()` reuses a running dev server on QA_PORT (default 5197) or starts one with
 *   VITE_API_URL=http://localhost:8000 and stops it (by PID) when the run ends.
 * - `staticServer()` serves frontend/ (widget-demo + dist-widget) on QA_STATIC_PORT (default 5198).
 * - `Report` collects PASS/FAIL lines, writes qa-shots/<name>.json and sets the exit code.
 */
const fs = require('fs')
const path = require('path')
const http = require('http')
const { spawn, execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '../..')
const OUT = path.join(ROOT, 'qa-shots')
const PORT = Number(process.env.QA_PORT || 5197)
const STATIC_PORT = Number(process.env.QA_STATIC_PORT || 5198)
const API = process.env.QA_API || 'http://localhost:8000'

let _pw
function playwright() {
  if (!_pw) _pw = require(execSync('npm root -g').toString().trim() + '/playwright')
  return _pw
}

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : dflt
}
const flag = (name) => process.argv.includes(name)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function get(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => { res.resume(); resolve(res.statusCode) })
    req.on('error', () => resolve(0))
    req.setTimeout(3000, () => { req.destroy(); resolve(0) })
  })
}

/** A dev server on PORT: reused if one answers, otherwise started (and stopped by `stop()`). */
async function devServer() {
  const base = `http://localhost:${PORT}`
  if ((await get(base + '/')) === 200) return { base, stop: () => {} }
  const vite = path.join(ROOT, 'node_modules/.bin/vite')
  fs.mkdirSync(OUT, { recursive: true })
  const log = fs.openSync(path.join(OUT, `vite-${PORT}.log`), 'w')
  const child = spawn(process.execPath, [vite, '--port', String(PORT), '--strictPort', '--host', 'localhost'], {
    cwd: ROOT, env: { ...process.env, VITE_API_URL: API }, stdio: ['ignore', log, log], detached: false,
  })
  for (let i = 0; i < 60; i++) {
    if ((await get(base + '/')) === 200) break
    await sleep(500)
  }
  return { base, stop: () => { try { process.kill(child.pid) } catch {} } }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml',
}
/** Serves frontend/ (widget-demo/*.html, dist-widget/*, dist-portfolio/*). */
function staticServer(port = STATIC_PORT) {
  return new Promise((resolve) => {
    const srv = http.createServer((q, r) => {
      let u = decodeURIComponent(q.url.split('?')[0])
      if (u.endsWith('/')) u += 'index.html'
      const f = path.join(ROOT, u)
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        r.statusCode = 404
        return r.end('not found')
      }
      r.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream')
      r.setHeader('cache-control', 'no-store')
      r.end(fs.readFileSync(f))
    })
    srv.listen(port, '127.0.0.1', () => resolve({ base: `http://127.0.0.1:${port}`, stop: () => srv.close() }))
  })
}

class Report {
  constructor(name) {
    this.name = name
    this.rows = []
  }
  check(label, ok, detail) {
    const row = { label, ok: Boolean(ok) }
    if (detail !== undefined && !(Array.isArray(detail) && !detail.length && ok)) row.detail = detail
    this.rows.push(row)
    const d = row.detail === undefined ? '' : `  ${typeof row.detail === 'string' ? row.detail : JSON.stringify(row.detail)}`
    console.log(`${row.ok ? 'PASS' : 'FAIL'}  ${label}${d.length > 600 ? d.slice(0, 600) + ' …' : d}`)
    return row.ok
  }
  info(label, detail) {
    this.rows.push({ label, info: true, detail })
    console.log(`INFO  ${label}${detail === undefined ? '' : '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600)}`)
  }
  get failed() { return this.rows.filter((r) => r.ok === false) }
  finish() {
    fs.mkdirSync(OUT, { recursive: true })
    fs.writeFileSync(path.join(OUT, `${this.name}.json`), JSON.stringify(this.rows, null, 2))
    const checks = this.rows.filter((r) => !r.info)
    console.log(`\n${this.name}: ${checks.length - this.failed.length}/${checks.length} passed` + (this.failed.length ? `, ${this.failed.length} FAILED` : ''))
    process.exitCode = this.failed.length ? 1 : 0
    return this.failed.length === 0
  }
}

/**
 * The §9.2 route list. `url(base, sbase)` builds the URL from the dev-server base and the static base.
 * kind: 'app' | 'marketing' | 'emr' | 'widget'. `act(page)` puts the page into a named state.
 */
const STANDALONE = 'file://' + path.join(ROOT, 'dist-portfolio/index.html')
const ROUTES = [
  // brand: the landing is the expressive brand surface (src/brand); the console's §9.7 style budgets
  // (neutral colour, radius, shadow, type-size count, Pretendard only) do not apply to it.
  { id: 'landing', path: '/', kind: 'marketing', brand: true },
  { id: 'ins-overview', path: '/insurance', kind: 'app' },
  { id: 'ins-claims', path: '/insurance/claims', kind: 'app' },
  { id: 'ins-claims-sel', path: '/insurance/claims?sel=SYN-2026-00220', kind: 'app' },
  { id: 'ins-claim-detail', path: '/insurance/claims/SYN-2026-00220', kind: 'app' },
  { id: 'ins-clinics', path: '/insurance/clinics', kind: 'app' },
  { id: 'ins-fees', path: '/insurance/fees', kind: 'app' },
  { id: 'ins-eval', path: '/insurance/evaluation', kind: 'app' },
  { id: 'ins-api', path: '/insurance/api', kind: 'app' },
  { id: 'clinic-empty', path: '/clinic/claim', kind: 'app' },
  { id: 'clinic-result', path: '/clinic/claim', kind: 'app', act: 'clinicResult' },
  { id: 'dur-study', path: '/dur#/', kind: 'marketing' },
  { id: 'dur-cases', path: '/dur#/cases', kind: 'app' },
  { id: 'dur-choco', path: '/dur#/case/choco', kind: 'app' },
  { id: 'dur-nabi', path: '/dur#/case/nabi', kind: 'app' },
  { id: 'dur-report', path: '/dur#/case/choco/report', kind: 'app' },
  { id: 'dur-handout', path: '/dur#/case/nabi/handout', kind: 'app' },
  { id: 'dur-how', path: '/dur#/how-it-works', kind: 'marketing' },
  { id: 'emr-v1', path: '/dur#/emr/V1', kind: 'emr' },
  { id: 'emr-v1-gate', path: '/dur#/emr/V1', kind: 'emr', act: 'emrGate' },
  { id: 'emr-v5', path: '/dur#/emr/V5', kind: 'emr' },
  { id: 'file-emr-v7', url: () => STANDALONE + '#/emr/V7', kind: 'emr', file: true },
  { id: 'widget-hostile', url: (b, s) => s + '/widget-demo/hostile.html', kind: 'widget', staticHost: true },
  { id: 'ui-golden', path: '/__ui/golden', kind: 'app' },
]
const routeUrl = (r, base, sbase) => (r.url ? r.url(base, sbase) : base + r.path)

/** Named states for routes (§9.2 "empty and result states", "gate after 처방 저장"). */
const ACTS = {
  async clinicResult(page) {
    // 예시 불러오기 → 정상 청구, then 사전 점검 실행 (backend on :8000), wait for step 3.
    await page.getByRole('button', { name: '예시 불러오기' }).click()
    await page.getByRole('menuitem', { name: '정상 청구' }).click()
    await sleep(400)
    await page.getByRole('button', { name: '사전 점검 실행' }).click()
    await page.waitForSelector('#step-result', { timeout: 20000 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await sleep(500)
  },
  async emrGate(page) {
    await page.waitForFunction(() => window.__emr && window.__emr.dur && window.__emr.dur() && window.__emr.dur().getState().response, null, { timeout: 15000 }).catch(() => {})
    await page.click('[data-emr="save"]')
    await page.waitForFunction(() => !!document.querySelector('nuvovet-dur-overlay')?.shadowRoot?.querySelector('dialog[open]'), null, { timeout: 5000 }).catch(() => {})
    await sleep(400)
  },
}

/** Waits until the route has rendered (fonts ready, lazy chunks in, widget checked). */
async function settle(page, route) {
  await page.waitForLoadState('load').catch(() => {})
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
  if (route.kind === 'emr') {
    await page.waitForFunction(() => window.__emr && window.__emr.dur && window.__emr.dur() && window.__emr.dur().getState().response, null, { timeout: 15000 }).catch(() => {})
  } else if (route.kind === 'widget') {
    await page.waitForFunction(() => !!document.querySelector('nuvovet-dur-overlay'), null, { timeout: 10000 }).catch(() => {})
  } else {
    // the shell renders <main> before the data: wait for the page heading and real content
    const ready = await page.waitForFunction(() => !!document.querySelector('h1') && (document.querySelector('main')?.innerText || '').trim().length > 80 && !document.querySelector('main [aria-busy="true"]'), null, { timeout: 45000 }).then(() => true).catch(() => false)
    if (!ready) throw new Error('page content did not render within 45 s (no <h1> / empty <main>)')
  }
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
  await sleep(400)
  if (route.act) await ACTS[route.act](page)
}

/** Which requests are foreign for a route (§9.3 "No external requests"). */
function isForeign(route, url, base, sbase) {
  if (url.startsWith('data:') || url.startsWith('blob:')) return false
  // Patient photos are hot-linked from the Unsplash CDN by design (src/brand/pets.js); images only.
  if (/^https:\/\/images\.unsplash\.com\//.test(url)) return false
  if (route.file) return !url.startsWith('file:')
  if (route.staticHost) return !url.startsWith(sbase)
  const u = new URL(url)
  if (route.path && route.path.startsWith('/dur')) return u.origin !== new URL(base).origin
  return u.hostname !== 'localhost' && u.hostname !== '127.0.0.1'
}

/** Ignorable console noise from the dev server only (Vite client connection lines are debug, not warnings). */
// Network failures of the hot-linked patient photos (images.unsplash.com) where the CDN is unreachable, e.g.
// an offline or proxied CI box; PetAvatar falls back to its species glyph, so they are not app errors.
const NOISE = [/\[vite\] (connecting|connected)/, /Download the React DevTools/, /Failed to load resource: net::ERR_(TUNNEL_CONNECTION_FAILED|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|CONNECTION_REFUSED|PROXY_CONNECTION_FAILED|BLOCKED_BY_CLIENT)/]

module.exports = { ROOT, OUT, PORT, STATIC_PORT, API, STANDALONE, playwright, arg, flag, sleep, get, devServer, staticServer, Report, ROUTES, ACTS, routeUrl, settle, isForeign, NOISE }
