/**
 * Korean number, currency and date formatting (DESIGN_SYSTEM.md §6.1, §6.4).
 * Pure functions, no Intl locale data beyond digit grouping, so output is identical in every browser.
 */

const isNum = (n) => typeof n === 'number' && Number.isFinite(n)

/** 1234567 → "1,234,567" (integers; fractions kept as given, e.g. 1234.5 → "1,234.5"). */
export function fmtNum(n, { digits } = {}) {
  if (!isNum(n)) return ''
  const v = digits == null ? n : Number(n.toFixed(digits))
  const neg = v < 0
  const [int, frac] = String(Math.abs(v)).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fracOut = digits == null ? frac : (frac || '').padEnd(digits, '0') || undefined
  return (neg ? '-' : '') + grouped + (fracOut ? '.' + fracOut : '')
}

/** 1234567 → "1,234,567원" (rounded to whole won; no space before 원). */
export function fmtWon(n) {
  if (!isNum(n)) return ''
  return fmtNum(Math.round(n)) + '원'
}

/** Drop trailing zeros of a fixed-decimal string: "1.50" → "1.5", "2.00" → "2". */
function trimZeros(s) {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

const half = (x) => Math.floor(x + 0.5) // half up, for positive values

/**
 * Compact won for MetricStrip and KPIs only (§6.4):
 *   n ≥ 1억               → "1.57억 원"   (2 decimals, trailing zeros dropped)
 *   1,000만 ≤ n < 1억     → "1,841만 원"  (whole 만, half up)
 *   1만 ≤ n < 1,000만     → "738.4만 원"  (1 decimal, trailing zero dropped)
 *   n < 1만               → fmtWon(n)
 * A value that rounds up into the next tier is shown in that tier (99,999,999 → "1억 원").
 */
export function fmtWonCompact(n) {
  if (!isNum(n)) return ''
  if (n < 0) return '-' + fmtWonCompact(-n)
  if (n >= 1e8) return fmtNum(Number(trimZeros((half(n / 1e6) / 100).toFixed(2)))) + '억 원'
  if (n >= 1e7) {
    const man = half(n / 1e4)
    if (man >= 1e4) return fmtWonCompact(1e8)
    return fmtNum(man) + '만 원'
  }
  if (n >= 1e4) {
    const tenths = half(n / 1e3) // 0.1만 units
    if (tenths >= 1e4) return fmtNum(1000) + '만 원'
    return fmtNum(Number(trimZeros((tenths / 10).toFixed(1)))) + '만 원'
  }
  return fmtWon(n)
}

/** 0.5673 → "56.7%" (no space before %). */
export function fmtPct(x, digits = 1) {
  if (!isNum(x)) return ''
  return (x * 100).toFixed(digits) + '%'
}

/** Dose to 3 significant figures: 13.243 → "13.2", 0.12345 → "0.123", 2.5 → "2.5". */
export function fmtDose(x) {
  if (!isNum(x)) return ''
  if (x === 0) return '0'
  return fmtNum(Number(x.toPrecision(3)))
}

function parts(iso) {
  const m = typeof iso === 'string' && iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return { y: m[1], mo: m[2], d: m[3] }
}

/**
 * fmtDate('2026-09-17')            → "2026-09-17"      (tables)
 * fmtDate('2026-09-17', 'header')  → "2026.09.17"      (headers, ranges)
 * fmtDate('2026-09-17', 'prose')   → "2026년 9월 17일"  (sentences, the Korean echo under date inputs)
 * fmtDate('2026-09-17', 'short')   → "9월 17일"
 */
export function fmtDate(iso, style = 'table') {
  const p = parts(iso)
  if (!p) return ''
  if (style === 'header') return `${p.y}.${p.mo}.${p.d}`
  if (style === 'prose') return `${p.y}년 ${Number(p.mo)}월 ${Number(p.d)}일`
  if (style === 'short') return `${Number(p.mo)}월 ${Number(p.d)}일`
  return `${p.y}-${p.mo}-${p.d}`
}

/**
 * Ranges use "~" (§6.1): header "2026.04.03 ~ 2026.09.30"; prose "4월 3일 ~ 9월 30일"
 * (the year is written once, at the start, only when the two years differ).
 */
export function fmtDateRange(a, b, style = 'header') {
  if (style === 'prose') {
    const pa = parts(a), pb = parts(b)
    if (!pa || !pb) return ''
    if (pa.y !== pb.y) return `${fmtDate(a, 'prose')} ~ ${fmtDate(b, 'prose')}`
    return `${fmtDate(a, 'short')} ~ ${fmtDate(b, 'short')}`
  }
  return `${fmtDate(a, style)} ~ ${fmtDate(b, style)}`
}

/** 135 → "135건". */
export function fmtCount(n, unit = '건') {
  if (!isNum(n)) return ''
  return fmtNum(n) + unit
}

/** Pagination footer: (135, 1, 50) → "135건 중 1–50". */
export function fmtRangeOf(total, from, to, unit = '건') {
  if (!isNum(total)) return ''
  if (!total) return `0${unit}`
  return `${fmtNum(total)}${unit} 중 ${fmtNum(from)}–${fmtNum(to)}`
}
