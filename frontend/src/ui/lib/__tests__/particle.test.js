import { describe, it, expect } from 'vitest'
import { withParticle, particle, finalConsonant } from '../particle.js'

describe('withParticle (§6.3)', () => {
  it('batchim decides the form', () => {
    expect(withParticle('나비', '으로/로')).toBe('나비로')
    expect(withParticle('초코', '은/는')).toBe('초코는')
    expect(withParticle('콩이', '이/가')).toBe('콩이가')
    expect(withParticle('대박', '이/가')).toBe('대박이')
    expect(withParticle('처방', '을/를')).toBe('처방을')
    expect(withParticle('보호자', '을/를')).toBe('보호자를')
    expect(withParticle('개', '과/와')).toBe('개와')
    expect(withParticle('고양이', '과/와')).toBe('고양이와')
    expect(withParticle('약품명', '과/와')).toBe('약품명과')
  })
  it('final ㄹ takes 로', () => {
    expect(withParticle('서울', '으로/로')).toBe('서울로')
    expect(withParticle('알', '으로/로')).toBe('알로')
    expect(withParticle('사례 목록', '으로/로')).toBe('사례 목록으로')
    expect(withParticle('서울', '은/는')).toBe('서울은')
  })
  it('digits by their reading', () => {
    expect(withParticle('V1', '으로/로')).toBe('V1로') // 일
    expect(withParticle('V3', '으로/로')).toBe('V3으로') // 삼
    expect(withParticle('V2', '이/가')).toBe('V2가') // 이
    expect(withParticle('10', '이/가')).toBe('10이') // 십
    expect(withParticle('100', '으로/로')).toBe('100으로') // 백
    expect(withParticle('1000', '은/는')).toBe('1000은') // 천
    expect(withParticle('0', '이/가')).toBe('0이') // 영
  })
  it('Latin letters by their names', () => {
    expect(withParticle('CT', '을/를')).toBe('CT를')
    expect(withParticle('MRI', '이/가')).toBe('MRI가')
    expect(withParticle('ALL', '이/가')).toBe('ALL이') // 엘
    expect(withParticle('ALL', '으로/로')).toBe('ALL로')
    expect(withParticle('DUR', '은/는')).toBe('DUR은') // 알
  })
  it('unknown endings get the combined form', () => {
    expect(withParticle('약품 %', '으로/로')).toBe('약품 %(으)로')
    expect(withParticle('', '이/가')).toBe('이(가)')
  })
  it('trailing punctuation is ignored for the decision', () => {
    expect(withParticle('나비(코숏)', '으로/로')).toBe('나비(코숏)으로')
  })
  it('helpers', () => {
    expect(particle('나비', '으로/로')).toBe('로')
    expect(finalConsonant('각')).toBe(1)
    expect(() => withParticle('x', '도')).toThrow()
  })
})
