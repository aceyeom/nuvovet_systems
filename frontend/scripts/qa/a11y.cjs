/*
 * DESIGN_SYSTEM.md §9.5 accessibility (no new deps): on every §9.2 route at 1440 light and 390 dark.
 *   - one <main>, one <h1>; <html lang> matches the page language (Hangul share of the visible text)
 *   - every input/select/textarea and every button has an accessible name (Chromium's AX tree via CDP)
 *   - nav links to the current page carry aria-current="page"; tabs are role=tab inside role=tablist
 *     with aria-selected; sortable headers (th > button) carry aria-sort
 *   - Tab reaches every interactive element, each with a visible focus indicator
 *     (outline-width ≥ 2px and outline-style ≠ none on the focused element)
 *   - dialogs (aria-haspopup=dialog triggers, ⌘K) trap focus, close on Esc and return focus;
 *     the claim side panel is not modal (Tab leaves it)
 *   - contrast of every text node (pagecheck.audit, contrast: true); text over images listed for review
 *
 *   node scripts/qa/a11y.cjs [--routes a,b] [--variants 1440-light,390-dark]
 */
const { playwright, arg, devServer, staticServer, Report, ROUTES, routeUrl, settle, sleep, NOISE } = require('./lib.cjs')
const { audit } = require('./pagecheck.cjs')

const VARIANTS = [
  { id: '1440-light', w: 1440, h: 900, theme: 'light' },
  { id: '390-dark', w: 390, h: 844, theme: 'dark', touch: true },
]

function structure() {
  const deep = []
  const walk = (root) => { for (const el of root.querySelectorAll('*')) { deep.push(el); if (el.shadowRoot) walk(el.shadowRoot) } }
  walk(document)
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
  const text = document.body.innerText || ''
  const hangul = (text.match(/[가-힣]/g) || []).length
  const latin = (text.match(/[A-Za-z]/g) || []).length
  const lang = hangul > (hangul + latin) * 0.25 ? 'ko' : 'en'
  const here = location.pathname + location.search + location.hash
  const hereNoQuery = location.pathname + (location.hash || '')
  const navIssues = []
  for (const nav of document.querySelectorAll('nav')) {
    for (const a of nav.querySelectorAll('a[href]')) {
      if (!visible(a)) continue
      const u = new URL(a.getAttribute('href'), location.href)
      const target = u.pathname + u.search + u.hash
      const matches = target === here || (!u.search && !location.search && (u.pathname + (u.hash || '')) === hereNoQuery)
      if (matches && a.getAttribute('aria-current') !== 'page' && !a.closest('[aria-label*="readcrumb"], [aria-label="breadcrumb"]')) navIssues.push(a.textContent.trim().slice(0, 30) || a.getAttribute('aria-label'))
    }
  }
  const tabIssues = deep.filter((e) => e.getAttribute('role') === 'tab').filter((t) => !t.hasAttribute('aria-selected') || !t.closest('[role=tablist]')).map((t) => t.textContent.trim().slice(0, 30))
  const sortIssues = deep.filter((e) => e.matches('th') && e.querySelector('button') && !e.hasAttribute('aria-sort')).map((t) => t.textContent.trim().slice(0, 30))
  return {
    mains: document.querySelectorAll('main').length,
    h1s: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().slice(0, 40)),
    htmlLang: document.documentElement.lang,
    detected: lang,
    navIssues, tabIssues, sortIssues,
  }
}

/** Interactive, keyboard-reachable elements (deep), grouped radios count once. */
function tabbables() {
  const out = []
  const walk = (root) => { for (const el of root.querySelectorAll('*')) { out.push(el); if (el.shadowRoot) walk(el.shadowRoot) } }
  walk(document)
  const parentOf = (el) => el.parentElement || (el.getRootNode() instanceof ShadowRoot ? el.getRootNode().host : null)
  const hidden = (el) => {
    for (let e = el; e; e = parentOf(e)) {
      const c = getComputedStyle(e)
      if (c.display === 'none' || c.visibility === 'hidden' || e.inert || e.hasAttribute?.('inert')) return true
      if (e.tagName === 'DETAILS' && !e.open && el !== e && !el.matches('summary')) return true
    }
    const r = el.getBoundingClientRect()
    return r.width === 0 || r.height === 0
  }
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex], [contenteditable=true]'
  // With a modal <dialog> open the rest of the page is inert (top layer): only its content counts.
  const modal = out.find((el) => el.matches('dialog') && el.matches(':modal'))
  const seenRadio = new Set()
  const list = []
  for (const el of out) {
    if (!el.matches(sel)) continue
    if (el.disabled || el.getAttribute('tabindex') === '-1' || el.closest('[aria-hidden=true]')) continue
    if (hidden(el)) continue
    if (modal && !modal.contains(el)) continue
    if (el.matches('input[type=radio]')) { const k = (el.form ? 'f' : '') + el.name; if (seenRadio.has(k)) continue; seenRadio.add(k) }
    list.push(el)
  }
  window.__qaTabbables = list
  return list.length
}

function activeInfo() {
  let a = document.activeElement
  while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement
  if (!a || a === document.body) return null
  ;(window.__qaReached = window.__qaReached || new Set()).add(a)
  const ok = (e) => { const x = getComputedStyle(e); return parseFloat(x.outlineWidth) >= 2 && x.outlineStyle !== 'none' }
  // The ring may sit on the control's group (InputGroup / Autocomplete use has-[:focus-visible]:outline-2).
  let ringEl = a
  for (let e = a, k = 0; e && k < 4 && !ok(e); k++) { e = e.parentElement || (e.getRootNode() instanceof ShadowRoot ? e.getRootNode().host : null); if (e && ok(e)) ringEl = e }
  const c = getComputedStyle(ringEl)
  const shadow = a.getRootNode() instanceof ShadowRoot
  const list = window.__qaTabbables || []
  let idx = list.indexOf(a)
  if (idx < 0 && a.matches('input[type=radio]')) idx = list.findIndex((x) => x.matches('input[type=radio]') && x.name === a.name)
  const label = (a.getAttribute('aria-label') || a.textContent || a.getAttribute('placeholder') || a.tagName).trim().replace(/\s+/g, ' ').slice(0, 40)
  if (!a.__qaId) a.__qaId = Math.random().toString(36).slice(2)
  return { id: a.__qaId, idx, label, shadow, tag: a.tagName.toLowerCase(), outlineWidth: c.outlineWidth, outlineStyle: c.outlineStyle, focusVisible: a.matches(':focus-visible') }
}

async function tabWalk(page, max = 400, shadowOnly = false) {
  const total = await page.evaluate(tabbables)
  await page.evaluate(() => { window.__qaReached = new Set() })
  const reached = new Set()
  const noRing = []
  const order = []
  let first = null
  let n = 0
  await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0) })
  for (; n < max; n++) {
    await page.keyboard.press('Tab')
    const a = await page.evaluate(activeInfo)
    if (!a) continue
    if (first === a.id && n > 0) break
    if (first === null) first = a.id
    order.push(a.id)
    if (a.idx >= 0) reached.add(a.idx)
    if (shadowOnly && !a.shadow) continue
    if (!(parseFloat(a.outlineWidth) >= 2 && a.outlineStyle !== 'none')) noRing.push(`${a.tag} "${a.label}" (${a.outlineWidth} ${a.outlineStyle})`)
  }
  // A roving-focus container (tablist, radiogroup, toolbar) is reached when focus lands inside it.
  const missed = await page.evaluate((r) => (window.__qaTabbables || []).map((el, i) => [i, el]).filter(([i, el]) => !r.includes(i) && ![...(window.__qaReached || [])].some((x) => x !== el && el.contains(x)) && !(window.__qaShadowOnly && !(el.getRootNode() instanceof ShadowRoot))).map(([, el]) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}"`), [...reached])
  return { total, presses: n, capped: n >= max, noRing: [...new Set(noRing)], missed }
}

async function axNames(page) {
  const cdp = await page.context().newCDPSession(page)
  const { nodes } = await cdp.send('Accessibility.getFullAXTree')
  await cdp.detach()
  const FIELD = new Set(['textbox', 'searchbox', 'combobox', 'listbox', 'spinbutton', 'slider', 'checkbox', 'radio', 'switch'])
  const bad = []
  for (const n of nodes) {
    if (n.ignored) continue
    const role = n.role && n.role.value
    const name = (n.name && n.name.value || '').trim()
    if ((FIELD.has(role) || role === 'button') && !name) bad.push(`${role} (backend ${n.backendDOMNodeId})`)
  }
  return bad
}

async function dialogs(page, route, report, tag) {
  const triggers = await page.evaluate(() => {
    const all = []
    const walk = (root) => { for (const el of root.querySelectorAll('[aria-haspopup="dialog"]')) all.push(el); for (const el of root.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot) }
    walk(document)
    const vis = all.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[inert]') })
    window.__qaTriggers = vis
    return vis.map((el) => (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30))
  })
  const openDialog = () => page.evaluate(() => {
    const all = []
    const walk = (root) => { for (const el of root.querySelectorAll('[role=dialog], [role=alertdialog], dialog[open]')) all.push(el); for (const el of root.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot) }
    walk(document)
    const d = all.find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
    // Radix Popover content is role=dialog inside a popper wrapper and is non-modal by design.
    const popover = d && !!d.closest('[data-radix-popper-content-wrapper]')
    return d ? { modal: !popover && d.getAttribute('aria-modal') !== 'false', label: (d.getAttribute('aria-label') || d.querySelector('h2')?.textContent || '').trim().slice(0, 30) } : null
  })
  const inDialog = () => page.evaluate(() => {
    let a = document.activeElement
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement
    const parentOf = (el) => el.parentElement || (el.getRootNode() instanceof ShadowRoot ? el.getRootNode().host : null)
    for (let e = a; e; e = parentOf(e)) if (e.matches && e.matches('[role=dialog], [role=alertdialog], dialog')) return true
    return false
  })
  const cases = triggers.slice(0, 3).map((label, i) => ({ label, open: () => page.evaluate((j) => window.__qaTriggers[j].click(), i), i }))
  if (route.id.startsWith('ins-') && route.id !== 'ins-claims-sel') cases.push({ label: 'Ctrl+K', open: () => page.keyboard.press('Control+k'), i: -1 })
  for (const c of cases) {
    // a trigger is focused before opening; for Ctrl+K the first link in <main> is
    await page.evaluate((j) => { if (j >= 0) window.__qaTriggers[j].focus(); else { window.__qaKeyFrom = document.querySelector('main a[href], main button'); window.__qaKeyFrom?.focus() } }, c.i)
    await c.open()
    await sleep(400)
    const d = await openDialog()
    if (!d) { report.info(`${tag} dialog "${c.label}": trigger opened no dialog (menu or sheet without role)`); continue }
    if (!d.modal) { report.info(`${tag} "${c.label}" opens a non-modal popover/sheet (${d.label}); no trap expected`); await page.keyboard.press('Escape'); await sleep(300); continue }
    let stays = true
    for (let k = 0; k < 15; k++) { await page.keyboard.press('Tab'); if (!(await inDialog())) stays = false }
    await page.keyboard.press('Escape')
    await sleep(400)
    const closed = !(await openDialog())
    const back = await page.evaluate((j) => {
      let a = document.activeElement
      while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement
      if (j >= 0) return a === window.__qaTriggers[j]
      return !!a && a === window.__qaKeyFrom
    }, c.i)
    report.check(`${tag} dialog "${c.label}": traps focus, Esc closes, focus returns`, stays && closed && back, { stays, closed, back })
  }
}

async function main() {
  const only = arg('--routes', null)
  const vOnly = arg('--variants', null)
  const routes = ROUTES.filter((r) => !only || only.split(',').includes(r.id))
  const variants = VARIANTS.filter((v) => !vOnly || vOnly.split(',').includes(v.id))
  const report = new Report(arg('--name', 'a11y'))
  const dev = await devServer()
  const st = await staticServer()
  const browser = await playwright().chromium.launch()
  const queue = []
  for (const r of routes) for (const v of variants) queue.push([r, v])
  try {
    await Promise.all(Array.from({ length: Number(arg('--jobs', 3)) }, async () => {
      while (queue.length) {
        const [route, v] = queue.shift()
        const tag = `${route.id} ${v.id}`
        const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 1, hasTouch: !!v.touch, colorScheme: v.theme })
        await ctx.addInitScript((t) => { try { localStorage.setItem('nv-theme', t) } catch {} }, v.theme)
        const page = await ctx.newPage()
        const logs = []
        page.on('pageerror', (e) => logs.push(e.message))
        page.on('console', (m) => { if (m.type() === 'error' && !NOISE.some((r) => r.test(m.text()))) logs.push(m.text().slice(0, 200)) })
        try {
          await page.goto(routeUrl(route, dev.base, st.base), { waitUntil: 'domcontentloaded' })
          await settle(page, route)
          if (route.kind !== 'widget') {
            const s = await page.evaluate(structure)
            report.check(`${tag} one <main> and one <h1>`, s.mains === 1 && s.h1s.length === 1, { mains: s.mains, h1s: s.h1s })
            report.check(`${tag} <html lang> matches the page language`, s.htmlLang.startsWith(s.detected), { htmlLang: s.htmlLang, detected: s.detected })
            report.check(`${tag} nav current item has aria-current="page"`, s.navIssues.length === 0, s.navIssues)
            report.check(`${tag} tabs are role=tab in a tablist with aria-selected`, s.tabIssues.length === 0, s.tabIssues)
            report.check(`${tag} sortable headers carry aria-sort`, s.sortIssues.length === 0, s.sortIssues)
          }
          const names = await axNames(page)
          report.check(`${tag} every field and button has an accessible name`, names.length === 0, names)
          const res = await page.evaluate(audit, { kind: route.kind, contrast: true, limit: 15, shadowOnly: route.kind === 'widget' })
          report.check(`${tag} contrast of every text node (≥ 4.5, ≥ 3 at 24 px)`, !(res.contrast && res.contrast.length), res.contrast)
          if (res.overImage) report.info(`${tag} text over a background image (manual review)`, res.overImage)
          // The hostile host page is deliberately broken third-party CSS: only the widget (shadow DOM) is ours.
          if (route.kind === 'widget') await page.evaluate(() => { window.__qaShadowOnly = true })
          const tw = await tabWalk(page, 400, route.kind === 'widget')
          report.check(`${tag} Tab reaches every interactive element`, tw.capped || tw.missed.length === 0, { total: tw.total, presses: tw.presses, missed: tw.missed.slice(0, 10), more: Math.max(0, tw.missed.length - 10) })
          if (tw.capped) report.info(`${tag} tab walk capped at ${tw.presses} presses (${tw.total} tabbables)`)
          report.check(`${tag} focus indicator ≥ 2px outline on every element reached`, tw.noRing.length === 0, tw.noRing.slice(0, 12))
          if (route.id === 'ins-claims-sel' && v.id === '1440-light') {
            const panel = await page.evaluate(() => {
              const p = document.querySelector('[role=region][aria-label="청구 상세"]')
              return p ? { modal: p.getAttribute('aria-modal'), role: p.getAttribute('role') } : null
            })
            await page.evaluate(() => document.querySelector('[role=region][aria-label="청구 상세"] a[href], [role=region][aria-label="청구 상세"] button')?.focus())
            let left = false
            for (let k = 0; k < 80 && !left; k++) {
              await page.keyboard.press('Tab')
              left = await page.evaluate(() => !document.activeElement.closest('[role=region][aria-label="청구 상세"]'))
            }
            report.check(`${tag} claim side panel is a non-modal region and Tab leaves it`, panel && panel.modal !== 'true' && left, { panel, left })
          }
          await page.goto('about:blank')
          await page.goto(routeUrl(route, dev.base, st.base), { waitUntil: 'domcontentloaded' })
          await settle(page, route)
          if (route.kind !== 'widget' && !route.act) await dialogs(page, route, report, tag)
          report.check(`${tag} no page errors`, logs.length === 0, logs)
        } catch (e) {
          report.check(`${tag} ran`, false, e.message.slice(0, 300))
        }
        await ctx.close()
      }
    }))
  } finally {
    await browser.close()
    st.stop()
    dev.stop()
  }
  return report.finish()
}

if (require.main === module) main()
module.exports = { main }
