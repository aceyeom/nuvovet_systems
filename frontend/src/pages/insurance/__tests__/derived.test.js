// Determinism and data checks for the console (DESIGN_SYSTEM.md §9.6).
import { describe, expect, it } from 'vitest'
import snapshot from '../../../data/claimsDemoSnapshot.json'
import hero from '../preview/heroClaim.json'
import claimIndex from '../data/claimIndex.json'
import { buildClaimIndex } from '../data/claimIndex.js'
import { HERO_CLAIM_ID, isActionable, koText, toHeroClaim } from '../preview/model.js'
import { confusion, filterClaims, metrics, monthlyAtRisk, openCount, ruleCounts, viewCounts } from '../model.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

describe('heroClaim.json', () => {
  it('equals the snapshot subset for SYN-2026-00220', () => {
    expect(hero).toEqual(toHeroClaim(snapshot, HERO_CLAIM_ID))
  })
  it('carries the numbers the landing shows', () => {
    const d = snapshot.details[HERO_CLAIM_ID].adjudication
    expect(hero.payable.billed).toBe(d.payable.billed)
    expect(hero.payable.reimbursed).toBe(d.payable.reimbursed)
    expect(hero.findings.filter(isActionable).length).toBe(snapshot.claims.find((c) => c.claim_id === HERO_CLAIM_ID).finding_count)
    expect(hero.claimsCount).toBe(snapshot.summary.claims)
    expect(hero.lines.length).toBe(d.lines.length)
  })
  it('is under 8 kB and has no answer-key labels', () => {
    const bytes = readFileSync(fileURLToPath(new URL('../preview/heroClaim.json', import.meta.url))).length
    expect(bytes).toBeLessThan(8192)
    expect(hero.labels).toBeUndefined()
  })
})

describe('claimIndex.json', () => {
  it('equals the index rebuilt from the snapshot', () => {
    expect(claimIndex).toEqual(buildClaimIndex(snapshot))
  })
  it('sums to summary.amount_flagged and reproduces summary.rule_hits', () => {
    const m = metrics(snapshot.claims, claimIndex)
    expect(m.flagged).toBe(snapshot.summary.amount_flagged)
    expect(m.billed).toBe(snapshot.summary.billed)
    expect(m.claims).toBe(snapshot.summary.claims)
    expect(Number(m.autoRate.toFixed(4))).toBe(snapshot.summary.auto_approve_rate)
    expect(ruleCounts(snapshot.claims, claimIndex)).toEqual(snapshot.summary.rule_hits)
  })
})

describe('overview and queue derivations', () => {
  it('six monthly bars sum to summary.amount_flagged', () => {
    const bars = monthlyAtRisk(snapshot.claims, claimIndex)
    expect(bars.map((b) => b.month)).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'])
    expect(bars.reduce((a, b) => a + b.value, 0)).toBe(snapshot.summary.amount_flagged)
  })
  it('sidebar count = pend + review + deny_recommended = the 처리 대상 view', () => {
    const d = snapshot.summary.decisions
    expect(openCount(d)).toBe(d.pend + d.review + d.deny_recommended)
    expect(viewCounts(snapshot.claims).open).toBe(openCount(d))
    expect(viewCounts(snapshot.claims)).toMatchObject({ pend: d.pend, review: d.review, deny: d.deny_recommended, auto: d.auto_approve, all: snapshot.summary.claims })
  })
  it('filters by text, channel and rule', () => {
    expect(filterClaims(snapshot.claims, { view: 'all', q: 'syn-2026-00220' }).map((c) => c.claim_id)).toEqual([HERO_CLAIM_ID])
    const byRule = filterClaims(snapshot.claims, { view: 'all', rule: 'integrity.duplicate_claim' }, claimIndex)
    expect(byRule.length).toBe(snapshot.summary.rule_hits['integrity.duplicate_claim'])
    const app = filterClaims(snapshot.claims, { view: 'all', channel: 'insurer_app' })
    expect(app.every((c) => c.intake_channel === 'insurer_app')).toBe(true)
  })
  it('confusion matrix covers every claim once per label', () => {
    const rows = confusion(snapshot.claims)
    const clean = rows.find((r) => r.label === 'clean')
    expect(clean.total).toBe(snapshot.evaluation.clean_claims)
    for (const r of rows) expect(r.auto_approve + r.pend + r.review + r.deny_recommended).toBe(r.total)
  })
})

describe('koText', () => {
  it('rewrites engine log strings into console copy', () => {
    expect(koText('단가 ₩4,727,600 — 서울 중앙값 ₩1,680,000, P90 ₩2,800,000.')).toBe('단가 4,727,600원, 서울 중앙값 1,680,000원, P90 2,800,000원.')
    expect(koText('청구된 종(dog)과 맞지 않습니다')).toBe('청구된 종(개)과 맞지 않습니다')
  })
})
