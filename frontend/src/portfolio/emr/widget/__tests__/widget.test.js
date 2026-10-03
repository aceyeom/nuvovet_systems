/**
 * Widget static checks (EMR popup spec §3.4 failure modes 1–2, §3.11, §8.3 test 12, §8.4 language).
 * The DOM behaviour (shadow roots, top layer, focus, fonts under CSP) is checked in Chromium by
 * widget-demo/isolation.cjs; these run in Node with Vitest.
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { STRINGS, t, countsLine, liveSentence } from '../strings.js'
import { resolveLayout } from '../layout.js'
import { createDur } from '../../sdk.js'
import { loadVisit } from '../../fixtures.js'
import { toCdsRequest } from '../../cds.js'

const DIR = path.resolve(import.meta.dirname, '..')
const css = fs.readFileSync(path.join(DIR, 'widget.css'), 'utf8')
const tokens = fs.readFileSync(path.resolve(DIR, '../../../ui/tokens.css'), 'utf8')
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')

describe('widget.css (§3.4, §8.3 test 12)', () => {
  const body = stripComments(css)
  it('uses px only: no rem / em font units', () => {
    expect(body).not.toMatch(/\d(\.\d+)?rem\b/)
    expect(stripComments(tokens)).not.toMatch(/\d(\.\d+)?rem\b/)
  })
  it('has no @property, @import, @font-face or !important', () => {
    expect(body).not.toMatch(/@property/)
    expect(body).not.toMatch(/@import/)
    expect(body).not.toMatch(/@font-face/)
    expect(body).not.toMatch(/!\s*important/)
  })
  it('has no colour literals: every colour is a token', () => {
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(body).not.toMatch(/\b(rgb|rgba|hsl|hsla|oklch|oklab)\(/)
  })
  it('never animates "all" and never uses gradients or blur', () => {
    expect(body).not.toMatch(/transition:\s*all|transition-property:\s*all/)
    expect(body).not.toMatch(/gradient\(|backdrop-filter|blur\(/)
    expect(body).not.toMatch(/text-transform:\s*uppercase/)
  })
  it('scopes the overlay :host rule and resets .nv-scope with all: initial and an explicit display', () => {
    expect(body).toMatch(/:host\(nuvovet-dur-overlay\)\s*\{[^}]*all:\s*initial[^}]*z-index:\s*2147483000/)
    expect(body).toMatch(/\.nv-scope\s*\{[^}]*all:\s*initial;[^}]*display:\s*block/)
    expect(body).toMatch(/:host\(\[data-nv-slot\]\)/)
  })
  it('declares the namespaced widget font first in the stack', () => {
    expect(body).toMatch(/--nv-font-sans:\s*"NuvoVet Pretendard", "Pretendard Variable"/)
  })
  it('re-declares every token on .nv-scope (host variables cannot leak in)', () => {
    expect(tokens).toMatch(/:root,\s*\n\.nv-scope\s*\{/)
    expect(tokens).toMatch(/\.nv-scope\[data-theme="dark"\]/)
  })
})

describe('strings.js (§3.11)', () => {
  const ko = STRINGS.ko
  const en = STRINGS.en
  it('has the same keys in KO and EN', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort())
  })
  it('has no em dash, no ellipsis, no arrow, no "안전" / "safe" and no marketing words', () => {
    for (const s of [...Object.values(ko), ...Object.values(en)]) {
      expect(s).not.toMatch(/—|\.\.\.|→/)
      expect(s).not.toMatch(/안전|\bsafe\b|정직|honest|seamless|혁신|강력한|powerful/i)
    }
  })
  it('keeps the §3.11 wording verbatim', () => {
    expect(ko['gate.title']).toBe('저장 전 확인이 필요한 처방 {n}건')
    expect(ko['gate.back']).toBe('처방으로 돌아가기')
    expect(ko['gate.proceed']).toBe('예외 처리하고 저장')
    expect(ko.marker).toBe('교육용 프로토타입')
    expect(en['panel.empty']).toBe('Add a prescription to start the review')
  })
  it('EN chrome has no Hangul', () => {
    for (const s of Object.values(en)) expect(s).not.toMatch(/[가-힣]/)
  })
  it('fills placeholders', () => {
    expect(t('ko', 'panel.rules', { n: 18 })).toBe('규칙 18개')
    expect(t('en', 'gate.more', { n: 2 })).toBe('2 more')
  })
})

describe('layout (§2.2)', () => {
  it('auto: docked ≥ 1280 with a panel, floating 1024–1279 or without a panel, sheet < 1024', () => {
    expect(resolveLayout('auto', 1440, true)).toBe('docked')
    expect(resolveLayout('auto', 1440, false)).toBe('floating')
    expect(resolveLayout('auto', 1279, true)).toBe('floating')
    expect(resolveLayout('auto', 1024, true)).toBe('floating')
    expect(resolveLayout('auto', 1023, true)).toBe('sheet')
    expect(resolveLayout('docked', 800, false)).toBe('floating')
    expect(resolveLayout('sheet', 1440, true)).toBe('sheet')
  })
})

describe('counts and live region (§3.7.1, §3.12)', () => {
  const run = (id) => createDur({ storage: null }).check(toCdsRequest(loadVisit(id), 'order-select'))
  it('V1: non-zero counts only, severity first then dose checks', () => {
    const r = run('V1')
    expect(countsLine('ko', r.extension.counts)).toBe('금기 1 · 투여량 확인 1')
    expect(liveSentence('ko', r)).toBe('처방 검토: 금기 1건')
  })
  it('V7: major and moderate', () => {
    const r = run('V7')
    expect(liveSentence('ko', r)).toBe('처방 검토: 중대 1건, 주의 1건')
    expect(liveSentence('en', createDur({ storage: null, locale: 'en' }).check(toCdsRequest(loadVisit('V7'), 'order-select')))).toBe('Prescription review: 1 Major, 1 Moderate')
  })
  it('V5: no findings', () => {
    expect(liveSentence('ko', run('V5'))).toBe('처방 검토: 규칙상 문제 없음')
  })
})
