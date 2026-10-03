/*
 * DESIGN_SYSTEM.md §9.3 bundle budgets (gzip), measured from the real builds:
 *   main entry ≤ 180 kB; /insurance route chunks excluding recharts ≤ 160 kB; recharts lazy in its own
 *   chunk; `/` route ≤ 120 kB and never includes claimsDemoSnapshot.json; standalone ≤ 450 kB; widget IIFE ≤ 250 kB.
 *
 * "Route chunks" are the JS files the browser actually requests for that route (served from dist/ with an
 * SPA fallback), minus the main entry's static closure. Requires `npm run build`, `build:portfolio`, `build:widget`.
 *
 *   node scripts/qa/bundles.cjs
 */
const fs = require('fs')
const path = require('path')
const http = require('http')
const zlib = require('zlib')
const { ROOT, playwright, Report, sleep } = require('./lib.cjs')

const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.env.QA_DIST_PORT || 5196)
const gz = (f) => zlib.gzipSync(fs.readFileSync(f)).length
const kB = (n) => Math.round((n / 1024) * 100) / 100

function serveDist() {
  return new Promise((resolve) => {
    const srv = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split('?')[0])
      let f = path.join(DIST, u)
      if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html')
      const ext = path.extname(f)
      r.setHeader('content-type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' }[ext] || 'application/octet-stream')
      r.end(fs.readFileSync(f))
    })
    srv.listen(PORT, '127.0.0.1', () => resolve(srv))
  })
}

/** Static import closure of a chunk (import statements between chunk files). */
function closure(file, seen = new Set()) {
  if (seen.has(file)) return seen
  seen.add(file)
  const src = fs.readFileSync(path.join(DIST, 'assets', file), 'utf8')
  for (const m of src.matchAll(/(?:^|[;\n}])\s*import\s*(?:[\w${},\s*]+from\s*)?["']\.\/([^"']+\.js)["']/g)) closure(m[1], seen)
  return seen
}

async function routeChunks(browser, route) {
  const page = await browser.newPage()
  const js = new Set()
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.port === String(PORT) && u.pathname.startsWith('/assets/') && u.pathname.endsWith('.js')) js.add(path.basename(u.pathname))
  })
  await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle' }).catch(() => {})
  await sleep(500)
  await page.close()
  return js
}

async function main() {
  const report = new Report('bundles')
  for (const f of ['dist/index.html', 'dist-portfolio/index.html', 'dist-widget/nuvovet-dur.iife.js']) {
    if (!fs.existsSync(path.join(ROOT, f))) { report.check(`${f} exists (run the builds first)`, false); return report.finish() }
  }
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
  const entry = html.match(/<script type="module"[^>]*src="\/assets\/([^"]+\.js)"/)[1]
  const main = closure(entry)
  const sum = (files) => [...files].reduce((n, f) => n + gz(path.join(DIST, 'assets', f)), 0)
  const mainGz = sum(main)
  report.check('main entry (static closure) ≤ 180 kB gzip', mainGz <= 180 * 1024, `${kB(mainGz)} kB: ${[...main].join(', ')}`)

  const assets = fs.readdirSync(path.join(DIST, 'assets')).filter((f) => f.endsWith('.js'))
  const isRecharts = (f) => /recharts/i.test(fs.readFileSync(path.join(DIST, 'assets', f), 'utf8').slice(0, 200000)) && /recharts-(surface|wrapper|cartesian)/.test(fs.readFileSync(path.join(DIST, 'assets', f), 'utf8'))
  const rechartsChunks = assets.filter(isRecharts)
  report.check('recharts is in its own lazy chunk (not in the main entry)', rechartsChunks.length >= 1 && rechartsChunks.every((f) => !main.has(f)), rechartsChunks)

  const srv = await serveDist()
  const browser = await playwright().chromium.launch()
  try {
    const ins = new Set()
    for (const r of ['/insurance', '/insurance/claims', '/insurance/claims/SYN-2026-00220', '/insurance/clinics', '/insurance/fees', '/insurance/evaluation', '/insurance/api']) {
      for (const f of await routeChunks(browser, r)) ins.add(f)
    }
    const insRoute = [...ins].filter((f) => !main.has(f) && !rechartsChunks.includes(f) && !/^claimsDemoSnapshot-/.test(f))
    const insGz = sum(insRoute)
    report.check('/insurance route chunks excluding recharts (and the data snapshot) ≤ 160 kB gzip', insGz <= 160 * 1024, `${kB(insGz)} kB: ${insRoute.join(', ')}`)
    const snap = [...ins].filter((f) => /^claimsDemoSnapshot-/.test(f))
    if (snap.length) report.info('/insurance also loads the data snapshot chunk (data, not code)', `${kB(sum(snap))} kB gzip`)

    const landing = await routeChunks(browser, '/')
    const landRoute = [...landing].filter((f) => !main.has(f))
    const landGz = sum(landRoute)
    report.check('/ route chunks ≤ 120 kB gzip', landGz <= 120 * 1024, `${kB(landGz)} kB: ${landRoute.join(', ')}`)
    const snapRe = /SYN-2026-00001[\s\S]{0,4000}SYN-2026-00002/
    const leaked = [...landing].filter((f) => /^claimsDemoSnapshot-/.test(f) || snapRe.test(fs.readFileSync(path.join(DIST, 'assets', f), 'utf8')))
    report.check('/ never loads claimsDemoSnapshot.json', leaked.length === 0, leaked)
  } finally {
    await browser.close()
    srv.close()
  }
  const sa = gz(path.join(ROOT, 'dist-portfolio/index.html'))
  report.check('standalone dist-portfolio/index.html ≤ 450 kB gzip', sa <= 450 * 1024, `${kB(sa)} kB`)
  const w = gz(path.join(ROOT, 'dist-widget/nuvovet-dur.iife.js'))
  report.check('widget IIFE ≤ 250 kB gzip', w <= 250 * 1024, `${kB(w)} kB`)
  return report.finish()
}

if (require.main === module) main()
module.exports = { main }
