import { describe, it, expect } from 'vitest'
import { fmtNum, fmtWon, fmtWonCompact, fmtPct, fmtDose, fmtDate, fmtDateRange, fmtCount, fmtRangeOf } from '../format.js'

describe('fmtWonCompact boundaries (§6.4)', () => {
  const cases = [
    [9_999, '9,999원'],
    [10_000, '1만 원'],
    [7_384_000, '738.4만 원'],
    [9_999_999, '1,000만 원'],
    [10_000_000, '1,000만 원'],
    [18_409_436, '1,841만 원'],
    [99_999_999, '1억 원'],
    [100_000_000, '1억 원'],
    [156_935_799, '1.57억 원'],
    [150_000_000, '1.5억 원'],
    [1_234_567_890, '12.35억 원'],
    [0, '0원'],
  ]
  for (const [n, want] of cases) it(`${n} → ${want}`, () => expect(fmtWonCompact(n)).toBe(want))
  it('half up at the 만 tier', () => {
    expect(fmtWonCompact(18_405_000)).toBe('1,841만 원')
    expect(fmtWonCompact(18_404_999)).toBe('1,840만 원')
  })
  it('negative and invalid', () => {
    expect(fmtWonCompact(-18_409_436)).toBe('-1,841만 원')
    expect(fmtWonCompact(null)).toBe('')
    expect(fmtWonCompact(NaN)).toBe('')
  })
})

describe('fmtWon / fmtNum', () => {
  it('groups and appends 원 without a space', () => {
    expect(fmtWon(1_234_567)).toBe('1,234,567원')
    expect(fmtWon(7_383_700)).toBe('7,383,700원')
    expect(fmtWon(999.6)).toBe('1,000원')
    expect(fmtWon(-30_000)).toBe('-30,000원')
  })
  it('fmtNum', () => {
    expect(fmtNum(312)).toBe('312')
    expect(fmtNum(1234.5)).toBe('1,234.5')
    expect(fmtNum(24, { digits: 1 })).toBe('24.0')
    expect(fmtNum(undefined)).toBe('')
  })
})

describe('fmtPct / fmtDose', () => {
  it('percent', () => {
    expect(fmtPct(0.5673)).toBe('56.7%')
    expect(fmtPct(1)).toBe('100.0%')
    expect(fmtPct(0.5, 0)).toBe('50%')
  })
  it('dose to 3 significant figures', () => {
    expect(fmtDose(13.243)).toBe('13.2')
    expect(fmtDose(0.12345)).toBe('0.123')
    expect(fmtDose(2.5)).toBe('2.5')
    expect(fmtDose(1234)).toBe('1,230')
    expect(fmtDose(0)).toBe('0')
  })
})

describe('dates', () => {
  it('three styles', () => {
    expect(fmtDate('2026-09-17')).toBe('2026-09-17')
    expect(fmtDate('2026-09-17', 'header')).toBe('2026.09.17')
    expect(fmtDate('2026-09-17', 'prose')).toBe('2026년 9월 17일')
    expect(fmtDate('2026-09-17T10:00:00Z', 'prose')).toBe('2026년 9월 17일')
    expect(fmtDate('bad')).toBe('')
  })
  it('ranges use ~', () => {
    expect(fmtDateRange('2026-04-03', '2026-09-30')).toBe('2026.04.03 ~ 2026.09.30')
    expect(fmtDateRange('2026-04-03', '2026-09-30', 'prose')).toBe('4월 3일 ~ 9월 30일')
    expect(fmtDateRange('2025-12-30', '2026-01-02', 'prose')).toBe('2025년 12월 30일 ~ 2026년 1월 2일')
  })
})

describe('counts', () => {
  it('pagination footer', () => {
    expect(fmtRangeOf(135, 1, 50)).toBe('135건 중 1–50')
    expect(fmtRangeOf(1312, 1301, 1312)).toBe('1,312건 중 1,301–1,312')
    expect(fmtCount(135)).toBe('135건')
  })
})
