// Landing `/`: two products with their own lockups, the two-line hero headline in one ink, an index that links
// to every demo, Claims figures read only from heroClaim.json (never the 2.4 MB snapshot), and no icon set
// on the brand surface (landing and src/brand).
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import heroClaim from '../../insurance/preview/heroClaim.json'
import { isActionable } from '../../insurance/preview/model.js'
import { ledgerLines, ledgerTotals } from '../ledger.js'
import Landing from '../Landing.jsx'
import { headlineLines } from '../Hero.jsx'
import { CLAIM_LEDGER, CLAIM_LINES } from '../replays/script.js'
import { DUR_PHASES } from '../replays/DurReplay.jsx'
import { CLAIMS_PHASES } from '../replays/ClaimsReplay.jsx'
import { CONTACT_EMAIL, ko } from '../../../i18n/index.jsx'
import { fmtWon } from '@/ui/lib/format'

const LANDING_DIR = join(import.meta.dirname, '..')
const BRAND_DIR = join(import.meta.dirname, '../../../brand')
/** Every source file under `dir` (recursively), tests excluded. */
const sourcesIn = (dir) => readdirSync(dir, { recursive: true })
  .filter((f) => /\.(jsx?|mjs|css)$/.test(f) && !/__tests__|\.test\./.test(f))
  .map((f) => join(dir, f))
const SOURCES = sourcesIn(LANDING_DIR).map((f) => [f, readFileSync(f, 'utf8')])
const BRAND_SOURCES = sourcesIn(BRAND_DIR).map((f) => [f, readFileSync(f, 'utf8')])

function render() {
  return renderToString(createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(Landing)))
}

describe('ledger model', () => {
  it('picks the three lines with the largest amount at risk, in order', () => {
    const rows = ledgerLines(heroClaim)
    expect(rows).toHaveLength(3)
    const risks = rows.map((r) => r.risk)
    expect([...risks].sort((a, b) => b - a)).toEqual(risks)
    const shown = new Set(rows.map((r) => r.index))
    for (const [i, line] of heroClaim.lines.entries()) {
      if (shown.has(i) || !line.code) continue
      const risk = heroClaim.findings.filter((f) => f.item_ref === line.code && isActionable(f)).reduce((s, f) => s + f.amount_at_risk, 0)
      expect(risk).toBeLessThanOrEqual(risks[2])
    }
    for (const r of rows) for (const f of r.findings) expect(f.item_ref).toBe(r.line.code)
  })
  it('breaks ties by line order', () => {
    const claim = {
      lines: [{ code: 'A' }, { code: 'B' }, { code: 'C' }],
      findings: [
        { item_ref: 'B', severity: 'warning', amount_at_risk: 10 },
        { item_ref: 'A', severity: 'warning', amount_at_risk: 10 },
        { item_ref: 'C', severity: 'info', amount_at_risk: 99 },
      ],
    }
    expect(ledgerLines(claim).map((r) => r.line.code)).toEqual(['A', 'B'])
  })
  it('totals come from the claim payable and the actionable findings', () => {
    expect(ledgerTotals(heroClaim)).toEqual({
      billed: heroClaim.payable.billed,
      reimbursed: heroClaim.payable.reimbursed,
      findings: heroClaim.findings.filter(isActionable).length,
    })
  })
})

describe('hero headline', () => {
  it('is two lines in one ink: no tone markup', () => {
    const h = ko.landing.hero.headline
    expect(headlineLines(h)).toHaveLength(2)
    expect(h).not.toMatch(/\[\[|\]\]|\{\{|\}\}/)
  })
})

describe('hero replays', () => {
  it('the Claims payout ledger adds up to the payable amount', () => {
    const [billed, ...rest] = CLAIM_LEDGER
    const paid = rest.pop()
    expect(billed.value - rest.reduce((s, r) => s + r.value, 0)).toBe(paid.value)
    expect(paid.value).toBe(heroClaim.payable.reimbursed)
  })
  it('replays every claim line, and both scripts loop in under 20 s', () => {
    expect(CLAIM_LINES).toHaveLength(heroClaim.lines.length)
    for (const phases of [DUR_PHASES, CLAIMS_PHASES]) expect(phases.reduce((s, p) => s + p.ms, 0)).toBeLessThan(20000)
  })
})

describe('landing page', () => {
  const html = render()

  it('renders the headline, both product lockups and the step labels synchronously', () => {
    for (const line of headlineLines(ko.landing.hero.headline)) expect(html).toContain(line)
    expect(html).toContain('nvb-lockup')
    expect(html).toMatch(/data-product="dur"/)
    expect(html).toMatch(/data-product="claims"/)
    for (const s of ko.landing.hero.steps.dur) expect(html).toContain(s)
  })

  it('shows the ledger numbers read from heroClaim.json', () => {
    const t = ledgerTotals(heroClaim)
    expect(html).toContain(fmtWon(t.billed))
    expect(html).toContain(fmtWon(t.reimbursed))
    expect(html).toContain(`${t.findings}건`)
    expect(html).toContain(`합성 데이터 ${heroClaim.claimsCount}건`)
    for (const r of ledgerLines(heroClaim)) {
      expect(html).toContain(r.line.description)
      expect(html).toContain(fmtWon(r.line.total))
    }
  })

  it('has one h1 and one main, and links every demo', () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
    expect(html.match(/<main[\s>]/g)).toHaveLength(1)
    expect(html).toContain('href="/insurance"')
    expect(html).toContain('href="/insurance/api"')
    // the case study opens in the landing's language (Korean), not /dur's English default
    expect(html).toContain('href="/dur#/?lang=ko"')
    expect(html).toContain('href="/dur#/emr/V1"')
    for (const v of ['V2', 'V5', 'V10']) expect(html).toContain(`href="/dur#/emr/${v}"`)
    expect(html).not.toContain('href="#"')
  })

  it('has no contact address while CONTACT_EMAIL is empty', () => {
    expect(CONTACT_EMAIL).toBe('')
    expect(html).not.toContain('mailto:')
    expect(html).not.toContain(ko.landing.nav.pilot)
    expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
  })

  it('never types claim amounts into its copy (they come from the hero claim)', () => {
    const copy = JSON.stringify(ko.landing).replace('© 2026 nuvovet', '')
    expect(copy).not.toMatch(/\d{3,}|\d,\d{3}|\d%/)
  })

  it('never imports the claims snapshot', () => {
    for (const [name, src] of SOURCES) expect(src, name).not.toMatch(/claimsDemoSnapshot/)
  })

  it('uses no icon set on the brand surface (landing and src/brand)', () => {
    expect(SOURCES.length).toBeGreaterThan(5)
    expect(BRAND_SOURCES.length).toBeGreaterThan(5)
    for (const [name, src] of [...SOURCES, ...BRAND_SOURCES]) {
      expect(src, name).not.toMatch(/from\s+['"]lucide-react['"]|import\(\s*['"]lucide-react['"]|require\(\s*['"]lucide-react['"]/)
    }
  })

  it('links the photo credits from the footer (#credits)', () => {
    expect(html).toContain('id="credits"')
    expect(html).toContain('nvb-credits')
  })

  it('uses none of the banned copy', () => {
    const strings = JSON.stringify(ko)
    for (const w of ['정직', 'honest', 'seamless', '혁신', '강력한', 'powerful', 'Get started', '안전합니다', '...', '→', '—']) {
      expect(strings, w).not.toContain(w)
    }
  })
})
