/** Hash routes, including the EMR demo routes (EMR_DUR_POPUP_SPEC.md §7). */
import { describe, it, expect } from 'vitest'
import { matchRoute, emrHref, EMR_VISIT_BY_CASE, HREF, caseHref } from '../../router.js'
import { fill } from '../../i18n/index.js'

describe('router', () => {
  it('matches the showcase routes', () => {
    expect(matchRoute('#/').name).toBe('study')
    expect(matchRoute('').name).toBe('study')
    expect(matchRoute('#/cases').name).toBe('cases')
    expect(matchRoute('#/how-it-works').name).toBe('how')
    expect(matchRoute('#/case/choco')).toMatchObject({ name: 'workbench', params: { id: 'choco' } })
    expect(matchRoute('#/case/nabi/handout?hl=ko')).toMatchObject({ name: 'handout', params: { id: 'nabi' }, query: { hl: 'ko' } })
    expect(matchRoute('#/nope').name).toBe('notfound')
  })

  it('emr and emr/:visitId (seg[0] === "emr", visitId = seg[1] or null)', () => {
    expect(matchRoute('#/emr')).toMatchObject({ name: 'emr', params: { visitId: null } })
    expect(matchRoute('#/emr/V3')).toMatchObject({ name: 'emr', params: { visitId: 'V3' } })
    expect(matchRoute('#/emr/V7?lang=en')).toMatchObject({ name: 'emr', params: { visitId: 'V7' }, query: { lang: 'en' } })
    expect(matchRoute('#/emr/V1/extra').name).toBe('notfound')
  })

  it('links into the EMR demo: golden cases map to V1–V5, nav and CTA open V1', () => {
    expect(EMR_VISIT_BY_CASE).toEqual({ choco: 'V1', kongyi: 'V2', nabi: 'V3', mochi: 'V4', daebak: 'V5' })
    expect(emrHref('V2')).toBe('#/emr/V2')
    expect(HREF.emr).toBe('#/emr/V1')
    expect(caseHref('choco', 'report')).toBe('#/case/choco/report')
  })
})

describe('i18n particles', () => {
  it('resolves a Korean particle after a placeholder (§6.3)', () => {
    expect(fill('{name}{으로/로} 인식했습니다', { name: '말티즈' })).toBe('말티즈로 인식했습니다')
    expect(fill('{name}{으로/로} 인식했습니다', { name: '러프 콜리' })).toBe('러프 콜리로 인식했습니다')
    expect(fill('{to}{으로/로} 바뀌었습니다', { to: '금기' })).toBe('금기로 바뀌었습니다')
    expect(fill('{to}{으로/로} 바뀌었습니다', { to: '주의' })).toBe('주의로 바뀌었습니다')
    expect(fill('{to}{으로/로} 바뀌었습니다', { to: '규칙상 문제 없음' })).toBe('규칙상 문제 없음으로 바뀌었습니다')
    expect(fill('{n}건', { n: 3 })).toBe('3건')
  })
})

describe('router module stays React-free (widget SDK imports casePath from it)', () => {
  it('router.js imports nothing from react', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('../../router.js', import.meta.url), 'utf8')
    expect(src).not.toMatch(/from ['"]react/)
  })
})
