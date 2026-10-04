/*
 * Widget isolation checks (EMR popup spec §8.3), Chromium via the global Playwright.
 *
 *   npm run build:widget && node widget-demo/isolation.cjs [--port 5186] [--shots <dir>] [--emr <url>]
 *
 * Serves frontend/ on 127.0.0.1:<port> (default 5186) and runs every check against
 * widget-demo/hostile.html and widget-demo/csp.html, with widget-demo/index.html as the clean
 * reference for sizes. Prints one line per check and exits non-zero on any failure.
 * --emr <url> also runs the in-app host (e.g. --emr http://127.0.0.1:5191/dur, the running dev server or
 * file://…/dist-portfolio/index.html): the same containment, slot, sizing, token, top-layer, focus,
 * network and console checks on #/emr/V1, where the widget runs with fonts:'inherit' and marker:false.
 * (WP9 may fold this into scripts/qa/widget.cjs.)
 */
const http = require('http')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')

const ROOT = path.resolve(__dirname, '..')
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : dflt
}
const PORT = Number(arg('--port', process.env.PORT || 5186))
const SHOTS = arg('--shots', null)
const EMR = arg('--emr', null)
const ORIGIN = `http://127.0.0.1:${PORT}`
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${typeof detail === 'string' ? detail : JSON.stringify(detail)})` : ''}`)
}

function serve() {
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
    srv.listen(PORT, '127.0.0.1', () => resolve(srv))
  })
}

async function openPage(browser, file, { width = 1440, height = 900, query = '' } = {}) {
  const page = await browser.newPage({ viewport: { width, height } })
  const logs = []
  const requests = []
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`))
  page.on('request', (r) => requests.push(r.url()))
  await page.addInitScript(() => {
    window.__csp = []
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`))
  })
  await page.goto(`${ORIGIN}/widget-demo/${file}${query}`)
  await page.waitForFunction(() => !!document.querySelector('nuvovet-dur-overlay'))
  await page.waitForTimeout(500)
  return { page, logs, requests }
}

/** Facts about the widget, read from inside its shadow roots. */
const probe = (page) => page.evaluate(() => {
  const ov = document.querySelector('nuvovet-dur-overlay')
  const sr = ov.shadowRoot
  const panelHost = document.getElementById('nv-panel')
  const pr = panelHost?.shadowRoot || null
  const roots = [sr, pr, ...[...document.querySelectorAll('[data-nv-slot]')].map((s) => s.shadowRoot)].filter(Boolean)
  const all = roots.flatMap((r) => [...r.querySelectorAll('*')])
  const cs = (el) => (el ? getComputedStyle(el) : null)
  const head = pr?.querySelector('.nv-head')
  const summary = pr?.querySelector('.nv-card h3') || sr.querySelector('.nv-card h3')
  const badge = pr?.querySelector('.nv-card .nv-badge[data-status="contraindicated"]')
  return {
    bodyOverlayChildren: [...document.body.children].filter((c) => c.tagName === 'NUVOVET-DUR-OVERLAY').length,
    overlayParentIsBody: ov.parentNode === document.body,
    lightDomWidget: document.querySelectorAll('.nv-scope, .nv-card, .nv-gate, .nv-panel').length,
    tdShadow: [...document.querySelectorAll('td')].filter((td) => td.shadowRoot).length,
    headH: head ? head.getBoundingClientRect().height : null,
    summaryPx: cs(summary)?.fontSize ?? null,
    summaryFamily: cs(summary)?.fontFamily ?? null,
    badgeBg: cs(badge)?.backgroundColor ?? null,
    badgeColor: cs(badge)?.color ?? null,
    pureRed: all.filter((el) => cs(el).color === 'rgb(255, 0, 0)').length,
    lime: all.filter((el) => /rgb\(0, 255, 0\)/.test(cs(el).backgroundColor + cs(el).color)).length,
    fontLoaded: [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'NuvoVet Pretendard' && f.status === 'loaded'),
    css: [...(sr.adoptedStyleSheets || [])].map((s) => [...s.cssRules].map((r) => r.cssText).join('\n')).join('\n'),
    reactMounted: sr.querySelector('.nv-overlay-root')?.children.length > 0,
    launcher: !!sr.querySelector('.nv-launcher'),
    docked: !!pr?.querySelector('.nv-panel-docked'),
  }
})

const gateFacts = (page) => page.evaluate(() => {
  const sr = document.querySelector('nuvovet-dur-overlay').shadowRoot
  const d = sr.querySelector('dialog')
  const hdr = document.querySelector('.titlebar').getBoundingClientRect()
  const at = document.elementFromPoint(hdr.left + 40, hdr.top + 10)
  const rect = d.getBoundingClientRect()
  const back = sr.querySelector('[data-nv="back"]')
  const proceed = sr.querySelector('[data-nv="proceed"]')
  const hostInput = document.getElementById('hostinput')
  hostInput.focus()
  const hostFocusable = document.activeElement === hostInput
  const bd = getComputedStyle(d, '::backdrop').backgroundColor
  return {
    open: d.open, modal: d.matches(':modal'), role: d.getAttribute('role'),
    atHeader: at?.tagName, display: getComputedStyle(d).display, opacity: getComputedStyle(d).opacity,
    visible: rect.width > 300 && rect.height > 200, active: sr.activeElement?.getAttribute('data-nv') || sr.activeElement?.tagName,
    backH: back?.getBoundingClientRect().height, proceedH: proceed?.getBoundingClientRect().height,
    proceedDisabled: proceed?.disabled, hostFocusable, backdrop: bd,
    labelled: !!(d.getAttribute('aria-labelledby') && sr.getElementById(d.getAttribute('aria-labelledby'))),
  }
})

const activeInDialog = (page) => page.evaluate(() => {
  const sr = document.querySelector('nuvovet-dur-overlay').shadowRoot
  const d = sr.querySelector('dialog')
  return { inside: document.activeElement === sr.host && d.contains(sr.activeElement), tag: sr.activeElement?.tagName }
})

async function shot(page, name) {
  if (!SHOTS) return
  fs.mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
}

async function suite(browser, file, ref) {
  const tag = file.replace('.html', '')
  const { page, logs, requests } = await openPage(browser, file)
  const f = await probe(page)
  await shot(page, `${tag}-1440-panel`)

  // 1. Containment
  check(`${tag} 1 containment: one overlay host under <body>`, f.bodyOverlayChildren === 1 && f.overlayParentIsBody, f.bodyOverlayChildren)
  check(`${tag} 1 containment: no widget element in light DOM, no <td> shadow root`, f.lightDomWidget === 0 && f.tdShadow === 0, { light: f.lightDomWidget, td: f.tdShadow })

  // 2. Slots: re-render, delete, add, detached slot
  await page.evaluate(() => window.__emr.rerender())
  await page.evaluate(() => window.__emr.deleteRow('rx-2'))
  await page.evaluate(() => window.__emr.addRow({ kind: 'Rx', rowId: 'rx-2', productCode: 'RX-KTZ-T200', name: '케토코나졸 정 200 mg (정)', unit: 'mg/kg', qty: 5, tt: 2, dy: 21, rt: 'PO' }))
  await page.waitForTimeout(200)
  const slots = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#rows tr')]
    return rows.map((tr) => [...tr.querySelectorAll('[data-nv-slot]')].reduce((n, s) => n + (s.shadowRoot ? s.shadowRoot.querySelectorAll('.nv-rowbadge').length : 0), 0))
  })
  check(`${tag} 2 slots: exactly one badge per row after delete + add`, slots.length === 2 && slots.every((n) => n === 1), slots)
  const errsBefore = logs.length
  await page.evaluate(() => {
    const s = document.querySelector('[data-nv-slot="rx-1"]')
    s.remove()
    window.__emr.check()
  })
  await page.waitForTimeout(150)
  check(`${tag} 2 slots: a detached slot causes no error`, logs.length === errsBefore, logs.slice(errsBefore))
  await page.evaluate(() => window.__emr.rerender())
  await page.waitForTimeout(150)

  // 3. Sizing (vs the clean reference page)
  const ok3 = Math.abs(f.headH - ref.headH) <= 0.5 && f.summaryPx === '13px' && f.summaryPx === ref.summaryPx
  check(`${tag} 3 sizing: header 40 px, summary 13 px, equal to index.html`, ok3 && Math.abs(f.headH - 40) <= 0.5, { head: f.headH, ref: ref.headH, summary: f.summaryPx })

  // 4. Tokens
  check(`${tag} 4 tokens: 금기 badge rgb(200, 36, 27) on white text`, f.badgeBg === 'rgb(200, 36, 27)' && f.badgeColor === 'rgb(255, 255, 255)', { bg: f.badgeBg, fg: f.badgeColor })
  check(`${tag} 4 tokens: no widget element computes red or lime`, f.pureRed === 0 && f.lime === 0, { red: f.pureRed, lime: f.lime })

  // 5. Fonts
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable')
  await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true })
  const findNode = (n, pred) => {
    if (pred(n)) return n
    for (const c of [...(n.children || []), ...(n.shadowRoots || [])]) {
      const r = findNode(c, pred)
      if (r) return r
    }
    return null
  }
  const h3 = findNode(root, (n) => n.nodeName === 'H3' && (n.attributes || []).includes('id') && n.parentId && n.attributes.some((a) => a === '-1'))
  let platform = []
  if (h3) platform = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId: h3.nodeId })).fonts.map((x) => x.familyName)
  check(`${tag} 5 fonts: summary font-family starts with "NuvoVet Pretendard"`, /^"?NuvoVet Pretendard/.test(f.summaryFamily || ''), f.summaryFamily)
  check(`${tag} 5 fonts: NuvoVet Pretendard face loaded; platform font is Pretendard`, f.fontLoaded && platform.length > 0 && platform.every((x) => /^Pretendard/.test(x)), platform)
  const csp = await page.evaluate(() => window.__csp)
  check(`${tag} 5 fonts: no CSP violation`, csp.length === 0, csp)

  // 6. Top layer + 7. Focus
  await page.click('#save')
  await page.waitForTimeout(300)
  const g = await gateFacts(page)
  await shot(page, `${tag}-1440-gate`)
  check(`${tag} 6 top layer: dialog :modal, role alertdialog, labelled`, g.open && g.modal && g.role === 'alertdialog' && g.labelled, g)
  check(`${tag} 6 top layer: elementFromPoint at the sticky z-index 99999 header is the overlay host`, g.atHeader === 'NUVOVET-DUR-OVERLAY', g.atHeader)
  check(`${tag} 6 top layer: visible and opaque despite [role=alertdialog]{display:none} / [data-state=open]{opacity:.2}`, g.display !== 'none' && g.opacity === '1' && g.visible, { display: g.display, opacity: g.opacity })
  check(`${tag} 6 top layer: the host input cannot be focused`, !g.hostFocusable)
  check(`${tag} 3 sizing: gate buttons 32 px`, Math.abs(g.backH - 32) <= 0.5 && Math.abs(g.proceedH - 32) <= 0.5 && Math.abs(g.backH - ref.gateBackH) <= 0.5, { back: g.backH, proceed: g.proceedH })
  check(`${tag} 7 focus: on open the active element is 처방으로 돌아가기`, g.active === 'back', g.active)
  let stayed = true
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    const a = await activeInDialog(page)
    if (!a.inside) stayed = false
  }
  let wrapped = true
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Shift+Tab')
    const a = await activeInDialog(page)
    if (!a.inside) wrapped = false
  }
  check(`${tag} 7 focus: Tab ×20 and Shift+Tab ×25 never leave the dialog`, stayed && wrapped, { stayed, wrapped })
  const comment = '케토코나졸 감량 병용, 2주 후 재검'
  await page.evaluate(() => document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('dialog textarea').focus())
  await page.keyboard.type(comment)
  const typed = await page.evaluate(() => document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('dialog textarea').value)
  check(`${tag} 7 focus: typing fills the textarea`, typed === comment, typed)

  // 8. Enter safety (reason chosen, valid comment, owner ticked: Enter must not override)
  await page.evaluate(() => {
    const sr = document.querySelector('nuvovet-dur-overlay').shadowRoot
    sr.querySelector('dialog input[type=radio][value="NV-J2"]').click()
    const cb = sr.querySelector('dialog input[type=checkbox]')
    if (!cb.checked) cb.click()
    sr.querySelector('dialog textarea').focus()
  })
  await page.keyboard.press('Enter')
  await page.evaluate(() => document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('dialog input[type=radio][value="NV-J2"]').focus())
  await page.keyboard.press('Enter')
  const afterEnter = await page.evaluate(() => ({
    open: document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('dialog').open,
    resolved: window.__lastGate || null,
    canProceed: !document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('[data-nv="proceed"]').disabled,
  }))
  check(`${tag} 8 Enter safety: Enter in the textarea and on a radio does not override`, afterEnter.open && !afterEnter.resolved && afterEnter.canProceed, afterEnter)

  // 7 (cont.). Esc closes, resolves proceed:false, focus back on the save button, panel still open
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  const esc = await page.evaluate(() => {
    const sr = document.querySelector('nuvovet-dur-overlay').shadowRoot
    return {
      open: sr.querySelector('dialog').open, gate: window.__lastGate, active: document.activeElement?.id,
      panel: !!document.getElementById('nv-panel')?.shadowRoot?.querySelector('.nv-panel-docked .nv-body'),
      inert: document.getElementById('emr').inert,
    }
  })
  check(`${tag} 7 focus: Esc closes, gate() resolves proceed:false, focus returns to the save button`, !esc.open && esc.gate && esc.gate.proceed === false && esc.active === 'save' && !esc.inert, esc)
  check(`${tag} 7 focus: the docked panel is still open after Esc`, esc.panel)

  // 9. Responsive: below 1280 the host removes its right column; the widget falls back to the launcher
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.waitForTimeout(400)
  const narrow = await probe(page)
  await shot(page, `${tag}-1200-launcher`)
  // Drawer + gate: Esc on the gate must not close the drawer
  await page.evaluate(() => document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('.nv-launcher').click())
  await page.waitForTimeout(200)
  const drawerOpen = await page.evaluate(() => !!document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('.nv-drawer'))
  await shot(page, `${tag}-1200-drawer`)
  await page.evaluate(() => { window.__lastGate = null; document.getElementById('save').click() })
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  const drawerAfter = await page.evaluate(() => ({ drawer: !!document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('.nv-drawer'), gate: window.__lastGate }))
  check(`${tag} 9 responsive: right column unmounted, launcher shown, React root still mounted`, !narrow.docked && narrow.launcher && narrow.reactMounted, { docked: narrow.docked, launcher: narrow.launcher })
  check(`${tag} 7 focus: Esc on the gate leaves the drawer open`, drawerOpen && drawerAfter.drawer && drawerAfter.gate?.proceed === false, { drawerOpen, ...drawerAfter })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  const drawerClosed = await page.evaluate(() => ({ drawer: !!document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('.nv-drawer'), active: document.querySelector('nuvovet-dur-overlay').shadowRoot.activeElement?.className }))
  check(`${tag} drawer: Esc closes the drawer and focus returns to the launcher`, !drawerClosed.drawer && /nv-launcher/.test(drawerClosed.active || ''), drawerClosed)
  await page.setViewportSize({ width: 900, height: 800 })
  await page.waitForTimeout(400)
  await shot(page, `${tag}-900-sheet`)
  const sheet = await page.evaluate(() => !!document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('.nv-sheet'))
  check(`${tag} 9 responsive: bottom sheet below 1024 px`, sheet)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForTimeout(400)
  const wide = await probe(page)
  check(`${tag} 9 responsive: back at 1440 the re-created column is docked again`, wide.docked, wide.docked)

  // 10. Network, 11. Console, 12. CSS lint
  const foreign = requests.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('file:'))
  check(`${tag} 10 network: only same-origin / data: requests`, foreign.length === 0, foreign)
  check(`${tag} 11 console: zero errors and warnings`, logs.length === 0, logs)
  const bad = ['rem', '@property', '@import url(', '!important'].filter((x) => (x === 'rem' ? /\d(\.\d+)?rem\b/.test(f.css) : f.css.includes(x)))
  check(`${tag} 12 CSS lint: no rem, @property, @import url( or !important in the adopted CSS`, bad.length === 0 && f.css.length > 1000, bad)
  await page.close()
}

/** The in-app fictional EMR (/dur#/emr/V1): the checks that apply to a host built on the SDK. */
async function emrSuite(browser, base, ref) {
  const tag = 'emr-V1'
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  // These checks target the docked panel; the EMR demo opens with the island unless told otherwise.
  await page.addInitScript(() => { try { localStorage.setItem('nv-emr-dur-layout', '"docked"') } catch {} })
  const logs = []
  const requests = []
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`))
  page.on('request', (r) => requests.push(r.url()))
  await page.goto(`${base}#/emr/V1`)
  await page.waitForFunction(() => !!document.querySelector('nuvovet-dur-overlay') && !!document.getElementById('nv-panel')?.shadowRoot?.querySelector('.nv-card'))
  await page.waitForTimeout(500)
  const f = await probe(page)
  await shot(page, `${tag}-1440-panel`)
  check(`${tag} 1 containment: one overlay host under <body>`, f.bodyOverlayChildren === 1 && f.overlayParentIsBody, f.bodyOverlayChildren)
  check(`${tag} 1 containment: no widget element in light DOM, no <td> shadow root`, f.lightDomWidget === 0 && f.tdShadow === 0, { light: f.lightDomWidget, td: f.tdShadow })
  await page.evaluate(() => window.__emr.rerender())
  await page.evaluate(() => window.__emr.deleteRow('rx-2'))
  await page.evaluate(() => window.__emr.addRow({ kind: 'Rx', rowId: 'rx-2', productCode: 'RX-KTZ-T200', unit: 'mg/kg', qty: 5, tt: 2, dy: 21, rt: 'PO' }))
  await page.waitForTimeout(400)
  const slots = await page.evaluate(() => [...document.querySelectorAll('tr[data-row]')].map((tr) => [...tr.querySelectorAll('[data-nv-slot]')].reduce((n, s) => n + (s.shadowRoot ? s.shadowRoot.querySelectorAll('.nv-rowbadge').length : 0), 0)))
  check(`${tag} 2 slots: exactly one badge per row after delete + add`, slots.length === 2 && slots.every((n) => n === 1), slots)
  check(`${tag} 3 sizing: header 40 px, summary 13 px, equal to index.html`, Math.abs(f.headH - 40) <= 0.5 && f.summaryPx === '13px' && f.summaryPx === ref.summaryPx, { head: f.headH, summary: f.summaryPx })
  check(`${tag} 4 tokens: 금기 badge rgb(200, 36, 27) on white text`, f.badgeBg === 'rgb(200, 36, 27)' && f.badgeColor === 'rgb(255, 255, 255)', { bg: f.badgeBg, fg: f.badgeColor })
  check(`${tag} 5 fonts: summary font-family is the widget stack (fonts:'inherit' uses the page's Pretendard)`, /^"?NuvoVet Pretendard", "Pretendard Variable"/.test(f.summaryFamily || ''), f.summaryFamily)
  const wordSplits = await page.evaluate(() => {
    const roots = [document.querySelector('nuvovet-dur-overlay').shadowRoot, document.getElementById('nv-panel')?.shadowRoot].filter(Boolean)
    return roots.flatMap((r) => [...r.querySelectorAll('.nv-scope')]).map((el) => getComputedStyle(el).wordBreak)
  })
  check(`${tag} 3 text: word-break keep-all inside every shadow scope`, wordSplits.length > 0 && wordSplits.every((w) => w === 'keep-all'), wordSplits)

  await page.click('[data-emr="save"]')
  await page.waitForTimeout(400)
  const g = await page.evaluate(() => {
    const sr = document.querySelector('nuvovet-dur-overlay').shadowRoot
    const d = sr.querySelector('dialog')
    const rect = d.getBoundingClientRect()
    return {
      open: d.open, modal: d.matches(':modal'), role: d.getAttribute('role'),
      labelled: !!(d.getAttribute('aria-labelledby') && sr.getElementById(d.getAttribute('aria-labelledby'))),
      visible: rect.width > 300 && rect.height > 200, active: sr.activeElement?.getAttribute('data-nv') || sr.activeElement?.tagName,
      inert: document.querySelector('.emr-root').inert, colorScheme: getComputedStyle(d.closest('.nv-scope')).colorScheme,
      primaries: d.querySelectorAll('.nv-btn-primary').length,
    }
  })
  await shot(page, `${tag}-1440-gate`)
  check(`${tag} 6 top layer: dialog :modal, role alertdialog, labelled, EMR inert`, g.open && g.modal && g.role === 'alertdialog' && g.labelled && g.visible && g.inert, g)
  check(`${tag} 6 gate: one primary button; color-scheme follows the widget theme`, g.primaries === 1 && g.colorScheme === 'light', { primaries: g.primaries, colorScheme: g.colorScheme })
  check(`${tag} 7 focus: on open the active element is 처방으로 돌아가기`, g.active === 'back', g.active)
  let stayed = true
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    if (!(await activeInDialog(page)).inside) stayed = false
  }
  check(`${tag} 7 focus: Tab ×20 never leaves the dialog`, stayed)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
  const esc = await page.evaluate(() => ({
    open: document.querySelector('nuvovet-dur-overlay').shadowRoot.querySelector('dialog').open,
    active: document.activeElement?.getAttribute('data-emr'), inert: document.querySelector('.emr-root').inert,
  }))
  check(`${tag} 7 focus: Esc closes, inert lifted, focus back on 처방 저장`, !esc.open && !esc.inert && esc.active === 'save', esc)
  const origin = new URL(base.startsWith('file') ? 'file:///' : base).origin
  // The demo EMR (the host, not the widget) hot-links its patient photos; those requests and their load
  // failures on an offline box belong to the host page.
  const hostPhoto = (u) => /^https:\/\/images\.unsplash\.com\//.test(u)
  const foreign = requests.filter((u) => !(base.startsWith('file') ? u.startsWith('file:') : u.startsWith(origin)) && !u.startsWith('data:') && !hostPhoto(u))
  check(`${tag} 10 network: only same-origin / data: requests`, foreign.length === 0, foreign)
  const appLogs = logs.filter((l) => !/Failed to load resource: net::ERR_/.test(l))
  check(`${tag} 11 console: zero errors and warnings`, appLogs.length === 0, appLogs)
  await page.close()
}

;(async () => {
  const srv = await serve()
  const browser = await chromium.launch()
  try {
    // Reference: the clean page
    const { page: rp, logs: rlogs } = await openPage(browser, 'index.html')
    const ref = await probe(rp)
    await shot(rp, 'index-1440-panel')
    await rp.click('#save')
    await rp.waitForTimeout(300)
    ref.gateBackH = (await gateFacts(rp)).backH
    await shot(rp, 'index-1440-gate')
    check('index reference: console clean', rlogs.length === 0, rlogs)
    check('index marker: the IIFE footer marker is present', await rp.evaluate(() => !!document.getElementById('nv-panel').shadowRoot.querySelector('[data-nv="marker"]')))
    await rp.close()

    await suite(browser, 'hostile.html', ref)
    await suite(browser, 'csp.html', ref)
    if (EMR) await emrSuite(browser, EMR, ref)

    // Dark widget theme and English chrome on the hostile host (screenshots + console)
    for (const [q, name] of [['?theme=dark', 'hostile-dark'], ['?lang=en', 'hostile-en'], ['?visit=V7', 'hostile-v7'], ['?visit=V8', 'hostile-v8']]) {
      const { page, logs } = await openPage(browser, 'hostile.html', { query: q })
      await shot(page, `${name}-panel`)
      await page.click('#save')
      await page.waitForTimeout(300)
      await shot(page, `${name}-gate`)
      check(`${name}: console clean`, logs.length === 0, logs)
      await page.close()
    }
  } finally {
    await browser.close()
    srv.close()
  }
  // 13. Size
  const iife = path.join(ROOT, 'dist-widget/nuvovet-dur.iife.js')
  const gz = zlib.gzipSync(fs.readFileSync(iife)).length
  check('13 size: IIFE ≤ 250 kB gzip', gz <= 250 * 1024, `${(gz / 1024).toFixed(1)} kB`)
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  process.exit(failed.length ? 1 : 0)
})()
