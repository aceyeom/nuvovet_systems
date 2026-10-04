/*
 * DESIGN_SYSTEM.md §9.2 screenshot matrix + per-screenshot checks, §9.3 runtime (console, network),
 * §9.7 design budgets. Output: qa-shots/<route>/<variant>.png and qa-shots/shots.json.
 *
 *   node scripts/qa/shots.cjs [--routes landing,dur-choco] [--variants 1440-light,390-dark] [--jobs 3]
 *
 * Needs: a dev server (reused on QA_PORT or started), the API on :8000 for /clinic/claim results,
 * dist-portfolio (file:// route) and dist-widget (hostile host).
 */
const fs = require('fs')
const path = require('path')
const { OUT, playwright, arg, devServer, staticServer, Report, ROUTES, routeUrl, settle, isForeign, NOISE, sleep } = require('./lib.cjs')
const { audit, landingLayout, markFontSamples } = require('./pagecheck.cjs')

const VARIANTS = [
  { id: '1440-light', w: 1440, h: 900, theme: 'light' },
  { id: '1440-dark', w: 1440, h: 900, theme: 'dark' },
  { id: '1024-light', w: 1024, h: 768, theme: 'light' },
  { id: '1024-dark', w: 1024, h: 768, theme: 'dark' },
  { id: '390-light', w: 390, h: 844, theme: 'light', touch: true },
  { id: '390-dark', w: 390, h: 844, theme: 'dark', touch: true },
  { id: '1440-system-dark', w: 1440, h: 900, theme: null, scheme: 'dark' },
]

const CHECKS = ['hscroll', 'numLine', 'koreanWrap', 'clipped', 'minSize', 'colour', 'fontSizes', 'radius', 'shadow', 'nesting', 'icons', 'letterCase', 'canvas']

async function fontCheck(page, route) {
  // §9.2 Fonts: a loaded Pretendard Variable face + CDP platform fonts on sampled nodes (not in the EMR host frame)
  const loaded = await page.evaluate(() => [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Pretendard Variable' && f.status === 'loaded'))
  const picked = await page.evaluate(markFontSamples, route.kind === 'emr')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable')
  await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 })
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-qa-font]' })
  const bad = []
  for (const nodeId of nodeIds) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
    const fams = fonts.map((f) => `${f.familyName}×${f.glyphCount}`)
    if (!fonts.length || !fonts.every((f) => /^Pretendard/.test(f.familyName))) bad.push(fams)
  }
  await page.evaluate(() => document.querySelectorAll('[data-qa-font]').forEach((e) => e.removeAttribute('data-qa-font')))
  await cdp.detach()
  return { loaded, sampled: picked.length, bad }
}

async function runOne(browser, route, v, base, sbase, report) {
  const ctx = await browser.newContext({
    viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.w < 500 ? 2 : 1, hasTouch: !!v.touch,
    colorScheme: v.scheme || (v.theme === 'dark' ? 'dark' : 'light'), acceptDownloads: false,
  })
  await ctx.addInitScript((theme) => {
    try {
      if (theme) localStorage.setItem('nv-theme', theme)
      else localStorage.removeItem('nv-theme')
    } catch {}
  }, v.theme)
  const page = await ctx.newPage()
  const logs = []
  const foreign = []
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !NOISE.some((r) => r.test(m.text()))) logs.push(`${m.type()}: ${m.text().slice(0, 240)}`) })
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message.slice(0, 240)}`))
  page.on('request', (r) => { if (isForeign(route, r.url(), base, sbase)) foreign.push(r.url().slice(0, 120)) })
  const url = routeUrl(route, base, sbase)
  const tag = `${route.id} ${v.id}`
  const dir = path.join(OUT, route.id)
  fs.mkdirSync(dir, { recursive: true })
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    if (route.id === 'landing' && v.id === '1440-light') {
      // §9.2 first paint on `/`: no skeleton at domcontentloaded + 100 ms
      await sleep(100)
      await page.screenshot({ path: path.join(dir, 'first-paint.png') })
      const sk = await page.evaluate(() => document.querySelectorAll('[data-skeleton]').length)
      report.check(`${tag} first paint: no [data-skeleton]`, sk === 0, sk)
    }
    await settle(page, route)
    const res = await page.evaluate(audit, { kind: route.kind, skipHost: route.kind === 'emr' })
    await page.screenshot({ path: path.join(dir, `${v.id}.png`), fullPage: true })
    const BRAND_EXEMPT = ['colour', 'fontSizes', 'radius', 'shadow']
    for (const k of CHECKS) {
      if (route.brand && BRAND_EXEMPT.includes(k)) continue
      report.check(`${tag} ${k}`, !(res[k] && res[k].length), res[k])
    }
    if (res.koreanOverwide) report.info(`${tag} koreanOverwide (word wider than its container)`, res.koreanOverwide)
    if (route.kind !== 'widget') {
      const f = await fontCheck(page, route)
      // Brand routes set display copy in the brand display face: the FontFace "nuvovet Display" (src/brand/displayFont.js),
      // which CDP reports by the font file's own family name (MaruBuri Regular / SemiBold). Everything else is Pretendard.
      const bad = route.brand ? f.bad.map((x) => x.filter((n) => !/^(nuvovet Display|MaruBuri|Pretendard Variable)/.test(n))).filter((x) => x.length) : f.bad
      report.check(`${tag} fonts: Pretendard Variable loaded and used`, f.loaded && f.sampled >= 1 && bad.length === 0, f)
    }
    if (route.id === 'landing' && v.id === '1440-light') {
      const l = await page.evaluate(landingLayout)
      const stageTop = await page.evaluate(() => { window.scrollTo(0, 0); return document.querySelector('.lp-stage')?.getBoundingClientRect().top ?? null })
      report.check(`${tag} landing: product stage starts in the first screen (top ≤ 720 px)`, stageTop !== null && stageTop <= 720, stageTop)
      report.check(`${tag} landing: no stat strip`, l.strips.length === 0, l.strips)
    }
  } catch (e) {
    report.check(`${tag} loaded`, false, e.message.slice(0, 300))
    await page.screenshot({ path: path.join(dir, `${v.id}-error.png`) }).catch(() => {})
  }
  report.check(`${tag} console: zero errors and warnings`, logs.length === 0, logs)
  report.check(`${tag} network: no external requests`, foreign.length === 0, foreign)
  await ctx.close()
}

/**
 * The hero intro is seen without a scroll on tablets and small laptops: the laptop reaches its lit state
 * (`.lr[data-state=on]`) within 4 s of load, at sizes where the closed device starts low in the first screen.
 */
const INTRO_VIEWPORTS = [[1024, 768], [1180, 820], [1024, 600], [800, 600]]
async function introCheck(browser, base, report) {
  // Warm the dev server first: on a fresh server Vite transforms the landing's modules on the first request
  // (≈1.5 s here), which would be charged to whichever viewport happens to load first. The 4 s is the
  // page's own intro (lazy chunk, frame decode, lid, power-on), not the dev server's first compile.
  {
    const ctx = await browser.newContext({ viewport: { width: INTRO_VIEWPORTS[0][0], height: INTRO_VIEWPORTS[0][1] } })
    const page = await ctx.newPage()
    await page.goto(base + '/', { waitUntil: 'load', timeout: 60000 }).catch(() => {})
    await page.waitForSelector('.lr[data-state="on"]', { timeout: 20000 }).catch(() => {})
    await ctx.close()
  }
  for (const [w, h] of INTRO_VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    const page = await ctx.newPage()
    const tag = `landing ${w}x${h}`
    try {
      await page.goto(base + '/', { waitUntil: 'load', timeout: 30000 })
      const t0 = Date.now()
      const ok = await page.waitForSelector('.lr[data-state="on"]', { timeout: 4000 }).then(() => true, () => false)
      const st = await page.evaluate(() => ({ state: document.querySelector('.lr')?.dataset.state, scrollY: window.scrollY }))
      report.check(`${tag} hero: the laptop powers on within 4 s without a scroll`, ok && st.scrollY === 0, { ...st, ms: Date.now() - t0 })
    } catch (e) {
      report.check(`${tag} hero: loaded`, false, e.message.slice(0, 300))
    }
    await ctx.close()
  }
}

async function main() {
  const only = arg('--routes', null)
  const vOnly = arg('--variants', null)
  const jobs = Number(arg('--jobs', 3))
  const routes = ROUTES.filter((r) => !only || only.split(',').includes(r.id))
  const variants = VARIANTS.filter((v) => !vOnly || vOnly.split(',').includes(v.id))
  const report = new Report(arg('--name', 'shots'))
  const dev = await devServer()
  const st = await staticServer()
  const browser = await playwright().chromium.launch()
  const queue = []
  for (const r of routes) for (const v of variants) queue.push([r, v])
  const t0 = Date.now()
  try {
    if (routes.some((r) => r.id === 'landing') && !vOnly) await introCheck(browser, dev.base, report)
    await Promise.all(Array.from({ length: jobs }, async () => {
      while (queue.length) {
        const [r, v] = queue.shift()
        await runOne(browser, r, v, dev.base, st.base, report)
      }
    }))
  } finally {
    await browser.close()
    st.stop()
    dev.stop()
  }
  report.info('elapsed', `${Math.round((Date.now() - t0) / 1000)} s`)
  return report.finish()
}

if (require.main === module) main()
module.exports = { main, VARIANTS }
