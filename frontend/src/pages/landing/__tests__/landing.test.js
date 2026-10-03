// Landing `/` (DESIGN_SYSTEM.md §5.1, §9.6): numbers only from heroClaim.json, no stat strip, no shader,
// no contact address, no skeleton at first paint.
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import heroClaim from '../../insurance/preview/heroClaim.json'
import { isActionable } from '../../insurance/preview/model.js'
import { ledgerLines, ledgerTotals } from '../ledger.js'
import Landing from '../Landing.jsx'
import { headlineParts } from '../Hero.jsx'
import { CONTACT_EMAIL, ko } from '../../../i18n/index.jsx'
import { fmtWon } from '@/ui/lib/format'

const LANDING_DIR = join(import.meta.dirname, '..')
const SOURCES = ['Landing.jsx', 'Nav.jsx', 'Hero.jsx', 'Sections.jsx', 'Footer.jsx', 'ledger.js'].map((f) => [
  f,
  readFileSync(join(LANDING_DIR, f), 'utf8'),
])

function render() {
  return renderToString(createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(Landing)))
}

describe('ledger model', () => {
  it('picks the three lines with the largest amount at risk, in order', () => {
    const rows = ledgerLines(heroClaim)
    expect(rows).toHaveLength(3)
    const risks = rows.map((r) => r.risk)
    expect([...risks].sort((a, b) => b - a)).toEqual(risks)
    // No line outside the three carries more risk than the smallest shown.
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

describe('landing page', () => {
  const html = render()

  it('renders the founder-editable headline and the hero claim synchronously', () => {
    const parts = headlineParts(ko.landing.hero.headline)
    expect(parts).toHaveLength(2)
    for (const p of parts) expect(html).toContain(p)
    // The break sits after "있는", never between "수" and "있는" (design review P1-16).
    expect(parts[0].endsWith('있는')).toBe(true)
    expect(html).toContain(heroClaim.claim_id)
    expect(html).toContain('inert')
    expect(html).not.toContain('data-skeleton')
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

  it('has one h1, one main and the console as the primary action', () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
    expect(html.match(/<main[\s>]/g)).toHaveLength(1)
    expect(html).toContain('href="/insurance"')
    expect(html).toContain('href="/insurance/api"')
    expect(html).toContain('href="/dur"')
    expect(html).not.toContain('href="#"')
  })

  it('has no contact address while CONTACT_EMAIL is empty', () => {
    expect(CONTACT_EMAIL).toBe('')
    expect(html).not.toContain('mailto:')
    expect(html).not.toContain(ko.landing.nav.pilot)
    expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
  })

  it('carries no numbers in its sources (they all come from the hero claim)', () => {
    // A figure such as 312, 7,383,700 or 848 must never be typed into the page or its copy. Class names
    // (max-w-300) are not copy, so only literals with Hangul and the Korean strings are checked.
    const FIGURE = /\d{3,}|\d,\d{3}|\d%/
    for (const [name, src] of SOURCES) {
      const literals = (src.match(/(['"`])(?:(?!\1).)*\1/g) || []).filter((l) => /[가-힣]/.test(l))
      for (const lit of literals) expect(lit, `${name}: ${lit}`).not.toMatch(FIGURE)
    }
    const copy = JSON.stringify(ko.landing).replace('© 2026 nuvovet', '')
    expect(copy).not.toMatch(FIGURE)
  })

  it('imports no shader, motion library or snapshot', () => {
    for (const [name, src] of SOURCES) {
      expect(src, name).not.toMatch(/from ['"](three|framer-motion)['"]/)
      expect(src, name).not.toMatch(/claimsDemoSnapshot/)
      expect(src, name).not.toMatch(/ShaderHero|FeatureSection|CTASection|Illustration/)
    }
  })

  it('uses none of the banned copy', () => {
    const strings = JSON.stringify(ko)
    for (const w of ['정직', 'honest', 'seamless', '혁신', '강력한', 'powerful', 'Get started', '안전합니다', '...', '→', '—']) {
      expect(strings, w).not.toContain(w)
    }
  })
})
