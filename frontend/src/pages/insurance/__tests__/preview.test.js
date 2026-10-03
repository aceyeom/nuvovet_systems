// The landing renders the preview synchronously (no skeleton at first paint, §5.1): server-render it and
// check the hero numbers are in the first HTML.
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { ClaimDetailPreview, FindingList, LineItemTable, heroClaim } from '../preview/index.js'

describe('preview components', () => {
  it('ClaimDetailPreview renders the hero claim synchronously and inert', () => {
    const html = renderToString(createElement(ClaimDetailPreview, { claimId: 'SYN-2026-00220' }))
    expect(html).toContain('SYN-2026-00220')
    expect(html).toContain('7,383,700원')
    expect(html).toContain('5,000,000원')
    expect(html).toContain('inert')
    expect(html).not.toContain('data-skeleton')
    expect(html).not.toContain('₩')
  })
  it('LineItemTable filters to flagged lines', () => {
    const all = renderToString(createElement(LineItemTable, { lines: heroClaim.lines }))
    const flagged = renderToString(createElement(LineItemTable, { lines: heroClaim.lines, flaggedOnly: true }))
    const rows = (h) => (h.match(/data-row-id=/g) || []).length
    expect(rows(all)).toBe(heroClaim.lines.length)
    expect(rows(flagged)).toBe(heroClaim.lines.filter((l) => l.flagged).length)
    expect(rows(flagged)).toBeLessThan(rows(all))
  })
  it('FindingList renders one row per finding with its rule ID', () => {
    const f = heroClaim.findings.filter((x) => x.item_ref === 'SUR-003')
    const html = renderToString(createElement(FindingList, { findings: f }))
    expect(html).toContain('pricing.regional_outlier')
    expect(html).toContain('1,927,600원')
    expect((html.match(/<li/g) || []).length).toBe(f.length)
  })
})
