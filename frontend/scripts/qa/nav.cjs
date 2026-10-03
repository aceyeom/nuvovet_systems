/*
 * DESIGN_SYSTEM.md §9.3 "Navigation is links": on each route, every visible button / [role=button]
 * (max 40 per route, shadow roots included) is clicked in a fresh page; if the route changes
 * (pathname, plus the hash route on /dur) and the element is not inside an <a href>, it fails.
 * Exceptions: form-submit buttons, CommandMenu items ([cmdk-item]) and entries in nav-allowlist.json
 * ("buttons": [{ "route": "<route id>", "label": "<accessible text>", "why": "…" }]).
 *
 *   node scripts/qa/nav.cjs [--routes a,b] [--jobs 4]
 */
const fs = require('fs')
const path = require('path')
const { playwright, arg, devServer, staticServer, Report, ROUTES, routeUrl, settle, sleep } = require('./lib.cjs')

const allow = JSON.parse(fs.readFileSync(path.join(__dirname, 'nav-allowlist.json'), 'utf8')).buttons || []
const MAX = 40

function listButtons(max) {
  const out = []
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.matches('button, [role=button]')) out.push(el)
      if (el.shadowRoot) walk(el.shadowRoot)
    }
  }
  walk(document)
  const vis = (el) => {
    const r = el.getBoundingClientRect()
    const c = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && !el.closest('[inert]') && !el.disabled
  }
  const parentOf = (el) => el.parentElement || (el.getRootNode() instanceof ShadowRoot ? el.getRootNode().host : null)
  const inLink = (el) => { for (let e = el; e; e = parentOf(e)) if (e.matches && e.matches('a[href]')) return true; return false }
  const shown = out.filter(vis)
  window.__qaButtons = shown
  return shown.slice(0, max).map((el, i) => ({
    i,
    label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50),
    submit: el.matches('button[type=submit]') && !!el.form,
    cmdk: el.matches('[cmdk-item]'),
    inLink: inLink(el),
  }))
}

const routeKey = (u) => {
  try {
    const x = new URL(u)
    const hash = x.hash.split('?')[0]
    return x.pathname + (x.pathname.startsWith('/dur') || x.protocol === 'file:' ? hash : '')
  } catch { return u }
}

async function main() {
  const only = arg('--routes', null)
  const jobs = Number(arg('--jobs', 4))
  const routes = ROUTES.filter((r) => !only || only.split(',').includes(r.id))
  const report = new Report(arg('--name', 'nav'))
  const dev = await devServer()
  const st = await staticServer()
  const browser = await playwright().chromium.launch()
  const fresh = async (route) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
    await ctx.addInitScript(() => { try { localStorage.setItem('nv-theme', 'light') } catch {} })
    const page = await ctx.newPage()
    await page.goto(routeUrl(route, dev.base, st.base), { waitUntil: 'domcontentloaded' })
    await settle(page, route)
    return { ctx, page }
  }
  try {
    const tasks = []
    for (const route of routes) {
      const { ctx, page } = await fresh(route)
      const btns = await page.evaluate(listButtons, MAX)
      await ctx.close()
      report.info(`${route.id}: ${btns.length} buttons`)
      for (const b of btns) tasks.push([route, b])
    }
    const bad = []
    await Promise.all(Array.from({ length: jobs }, async () => {
      while (tasks.length) {
        const [route, b] = tasks.shift()
        if (b.inLink || b.submit || b.cmdk || allow.some((a) => a.route === route.id && a.label === b.label)) continue
        let ctx
        try {
          const f = await fresh(route)
          ctx = f.ctx
          const page = f.page
          const before = routeKey(page.url())
          await page.evaluate(listButtons, MAX)
          const h = await page.evaluateHandle((i) => window.__qaButtons[i], b.i)
          const el = h.asElement()
          if (!el) continue
          await el.click({ timeout: 3000 }).catch(() => el.evaluate((e) => e.click()).catch(() => {}))
          await sleep(500)
          const after = routeKey(page.url())
          if (after !== before) bad.push({ route: route.id, button: b.label, from: before, to: after })
        } catch (e) {
          report.info(`${route.id} "${b.label}" click error`, e.message.slice(0, 160))
        } finally {
          if (ctx) await ctx.close().catch(() => {})
        }
      }
    }))
    for (const route of routes) {
      const mine = bad.filter((x) => x.route === route.id)
      report.check(`${route.id}: no button changes the route outside a link`, mine.length === 0, mine)
    }
  } finally {
    await browser.close()
    st.stop()
    dev.stop()
  }
  return report.finish()
}

if (require.main === module) main()
module.exports = { main }
