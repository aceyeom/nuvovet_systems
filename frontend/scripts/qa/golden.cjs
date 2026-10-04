/*
 * DESIGN_SYSTEM.md §9.9 golden fingerprint: each golden element on /__ui/golden and its production
 * counterpart (data-golden="queue-row" | "claim-header" | "finding-row" | "dur-card") must have equal
 * computed font-size, font-weight, line-height, height, padding, border widths/colours, background,
 * colour and radius; WP5/WP6 counterparts must also have the same class list.
 * Light theme, 1440×900 (and dark for the dur-card, whose widget theme follows its own setting).
 *
 *   node scripts/qa/golden.cjs
 */
const { playwright, devServer, Report, sleep } = require('./lib.cjs')

const PROPS = ['fontSize', 'fontWeight', 'lineHeight', 'height', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'backgroundColor', 'color', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']

function fingerprint({ name, pick, props }) {
  const all = []
  const walk = (root) => { for (const el of root.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot) } }
  walk(document)
  const els = all.filter((e) => e.getAttribute('data-golden') === name)
  const el = pick === 'rest' ? els.find((e) => !e.matches('[aria-selected="true"], [data-selected], [data-flagged="true"], [data-state="selected"]') && !e.querySelector('[data-flagged], svg.lucide-circle-alert')) : els[0]
  if (!el) return null
  const cs = getComputedStyle(el)
  const fp = {}
  for (const p of props) fp[p] = p === 'height' ? `${Math.round(el.getBoundingClientRect().height * 10) / 10}px` : cs[p]
  // a border colour only matters on a side that has a border
  for (const s of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(cs[`border${s}Width`]) === 0) fp[`border${s}Color`] = '(no border)'
  return { classes: typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean).sort().join(' ') : '', fp, text: el.textContent.trim().slice(0, 40) }
}

const PAIRS = [
  { name: 'queue-row', prod: '/insurance/claims', classes: true, pick: 'rest' },
  { name: 'claim-header', prod: '/insurance/claims/SYN-2026-00220', classes: true, contentHeight: true },
  { name: 'finding-row', prod: '/insurance/claims/SYN-2026-00220', classes: true, contentHeight: true },
  { name: 'dur-card', prod: '/dur#/emr/V7', classes: false, contentHeight: true }, // V7: two expanded cards, so the first is not the last
]

async function grab(browser, url, name, pick) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' })
  // The production DUR card is read from the EMR demo's docked panel (the demo opens with the island).
  await ctx.addInitScript(() => { try { localStorage.setItem('nv-theme', 'light'); localStorage.setItem('nv-emr-dur-layout', '"docked"') } catch {} })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForFunction((n) => {
    const all = []
    const walk = (root) => { for (const el of root.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot) } }
    walk(document)
    return all.some((e) => e.getAttribute('data-golden') === n)
  }, name, { timeout: 15000 }).catch(() => {})
  await sleep(300)
  const r = await page.evaluate(fingerprint, { name, pick, props: PROPS })
  await ctx.close()
  return r
}

async function main() {
  const report = new Report('golden')
  const dev = await devServer()
  const browser = await playwright().chromium.launch()
  try {
    for (const p of PAIRS) {
      const g = await grab(browser, dev.base + '/__ui/golden', p.name, p.pick)
      const prod = await grab(browser, dev.base + p.prod, p.name, p.pick)
      if (!report.check(`${p.name}: golden and production elements found`, g && prod, { golden: !!g, prod: !!prod })) continue
      const diff = PROPS.filter((k) => g.fp[k] !== prod.fp[k]).map((k) => `${k}: golden ${g.fp[k]} ≠ prod ${prod.fp[k]}`)
      const hDiff = diff.filter((d) => d.startsWith('height'))
      const rest = diff.filter((d) => !d.startsWith('height'))
      report.check(`${p.name}: computed-style fingerprint equal (${p.prod})`, rest.length === 0 && (p.contentHeight || hDiff.length === 0), rest.concat(p.contentHeight ? [] : hDiff))
      if (p.contentHeight && hDiff.length) report.info(`${p.name}: height differs with content (golden "${g.text}" vs production "${prod.text}")`, hDiff)
      if (p.classes) {
        const a = new Set(g.classes.split(' '))
        const b = new Set(prod.classes.split(' '))
        const onlyG = [...a].filter((x) => !b.has(x))
        const onlyP = [...b].filter((x) => !a.has(x))
        report.check(`${p.name}: class list equal`, onlyG.length === 0 && onlyP.length === 0, { onlyGolden: onlyG, onlyProd: onlyP })
      }
    }
  } finally {
    await browser.close()
    dev.stop()
  }
  return report.finish()
}

if (require.main === module) main()
module.exports = { main }
