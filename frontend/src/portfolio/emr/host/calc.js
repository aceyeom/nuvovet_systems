/**
 * Host calculations and display helpers of the fictional EMR (EMR popup spec §2.3, §2.4.1).
 *
 * 계산량 and 전체 are display values only ("EMR 계산값 (표시용)"): the DUR recomputes every
 * dose from the raw fields. The one value the host sends is `calc` (계산량 in mg) on mg/kg and
 * mcg/kg rows, which the adapter only cross-checks (calc_mismatch); it is never used as a dose.
 */

import { itemInfo, strengthOf } from './catalog.js'
import { toCdsRequest } from '../cds.js'
import { CREATININE_UPPER } from '../../knowledge/conditions.js'

const isBlank = (x) => x == null || String(x).trim() === ''
const numOrNull = (x) => {
  if (isBlank(x)) return null
  const n = Number(x)
  return Number.isFinite(n) ? n : null
}

const UNIT_ALIASES = {
  'mg/kg': 'mg/kg',
  'mcg/kg': 'mcg/kg',
  'ug/kg': 'mcg/kg',
  'µg/kg': 'mcg/kg',
  'iu/kg': 'IU/kg',
  'ml/kg': 'mL/kg',
  'cc/kg': 'mL/kg',
  mg: 'mg',
  mcg: 'mcg',
  ug: 'mcg',
  µg: 'mcg',
  g: 'g',
  iu: 'IU',
  ml: 'mL',
  cc: 'mL',
  ea: 'EA',
  t: 'EA',
  tab: 'EA',
  정: 'EA',
  캡슐: 'EA',
  cap: 'EA',
  개: 'EA',
}
export const normUnit = (u) => UNIT_ALIASES[String(u ?? '').trim().toLowerCase()] ?? String(u ?? '').trim()

const MASS_TO_MG = { mg: 1, mcg: 0.001, g: 1000 }

/** Mass of one unit of a strength in mg, or null (pipettes, IU). */
function amountMg(s) {
  if (!s?.amount) return null
  const f = MASS_TO_MG[s.amount.unit]
  return f ? s.amount.value * f : null
}
/** mg per mL for a liquid strength, or null. */
function mgPerMl(s) {
  if (!s?.per || s.per.unit !== 'mL') return null
  const mg = amountMg(s)
  return mg == null ? null : mg / s.per.value
}

/** "7.2", "0.625", "5,040": up to 3 decimals below 1, 2 below 100, 1 above. */
export function fmtNum(x) {
  if (x == null || !Number.isFinite(x)) return ''
  const a = Math.abs(x)
  const digits = a < 1 ? 3 : a < 100 ? 2 : 1
  return x.toLocaleString('ko-KR', { maximumFractionDigits: digits })
}
export const fmtWon = (x) => (x == null ? '' : `${x.toLocaleString('ko-KR')}원`)

/**
 * 계산량 of a row (§2.4.1). Returns { text, mg, sendCalc } where `mg` feeds 전체 and
 * `sendCalc` is the `urn:demo-emr:calculated` value (mg/kg and mcg/kg rows only).
 */
export function calcAmount(row, weightKg) {
  const unit = normUnit(row.unit)
  const qty = numOrNull(row.qty)
  const s = strengthOf(row.productCode)
  const conc = mgPerMl(s)
  const out = { text: '', mg: null, sendCalc: null }
  if (qty == null) return out
  const w = weightKg != null && Number.isFinite(Number(weightKg)) && Number(weightKg) > 0 ? Number(weightKg) : null

  if (unit.endsWith('/kg')) {
    if (w == null) return out
    const v = qty * w
    const num = unit.slice(0, -3)
    if (num === 'mg' || num === 'mcg') {
      const mg = v * MASS_TO_MG[num]
      out.mg = mg
      out.sendCalc = { value: Math.round(mg * 10000) / 10000, unit: 'mg' }
      const massText = num === 'mcg' && mg < 1 ? `${fmtNum(v)} mcg` : `${fmtNum(mg)} mg`
      out.text = conc ? `${massText} (${fmtNum(mg / conc)} mL)` : massText
    } else if (num === 'mL') {
      out.text = `${fmtNum(v)} mL`
      if (conc) out.mg = v * conc
    } else {
      out.text = `${fmtNum(v)} ${num}`
    }
    return out
  }
  if (unit === 'mg' || unit === 'mcg' || unit === 'g') {
    out.mg = qty * MASS_TO_MG[unit]
    out.text = `${fmtNum(qty)} ${unit}`
    return out
  }
  if (unit === 'mL') {
    out.text = `${fmtNum(qty)} mL`
    if (conc) out.mg = qty * conc
    return out
  }
  if (unit === 'IU') {
    out.text = `${fmtNum(qty)} IU`
    return out
  }
  if (unit === 'EA') {
    const info = itemInfo(row.productCode)
    const mgEach = amountMg(s)
    if (!info.solid || mgEach == null) return out
    out.mg = qty * mgEach
    out.text = s.amount.unit === 'mcg' ? `${fmtNum(qty * s.amount.value)} mcg` : `${fmtNum(out.mg)} mg`
    return out
  }
  return out
}

/** 전체 = 계산량 (mg) × Tt × Dy, in mg; blank when any part is missing. */
export function totalMg(row, weightKg) {
  const { mg } = calcAmount(row, weightKg)
  const tt = numOrNull(row.tt)
  const dy = numOrNull(row.dy)
  if (mg == null || tt == null || dy == null) return null
  return mg * tt * dy
}

/** 금액 (fictional): 단가 × Tt × Dy, blanks counted as 1. */
export function rowPrice(row) {
  const { price } = itemInfo(row.productCode)
  if (price == null) return null
  const tt = numOrNull(row.tt) ?? 1
  const dy = numOrNull(row.dy) ?? 1
  return Math.round(price * Math.max(tt, 0) * Math.max(dy, 0))
}

// ── Patient display ──────────────────────────────────────────────────────────

export const SPECIES_KO = { Canine: '개', Feline: '고양이', Rabbit: '토끼' }
export const SPECIES_OPTIONS = [
  { value: 'Canine', label: '개' },
  { value: 'Feline', label: '고양이' },
  { value: 'Rabbit', label: '토끼' },
  { value: '', label: '미입력' },
]
export const SEX_KO = {
  'Spayed Female': '중성화 암컷',
  'Neutered Male': '중성화 수컷',
  'Intact Female': '암컷',
  'Intact Male': '수컷',
  Unknown: '미상',
}
export const MDR1_OPTIONS = [
  { value: 'unknown', label: '미검사' },
  { value: 'normal/normal', label: '정상 (N/N)' },
  { value: 'mutant/normal', label: '보인자 (M/N)' },
  { value: 'mutant/mutant', label: '변이 (M/M)' },
]
/**
 * 검사결과 tab: test names and the reference column. Creatinine shows the knowledge base's IRIS
 * stage 2 cut-off (CREATININE_UPPER); ALT has no single citable interval, so none is shown.
 */
export const LAB_INFO = {
  creatinine: { name: '크레아티닌', ref: { Canine: `< ${CREATININE_UPPER.dog.value}`, Feline: `< ${CREATININE_UPPER.cat.value}` } },
  alt: { name: 'ALT', ref: {} },
}

const DAY = 86400000
const parseDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''))
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
export function daysBetween(from, to) {
  const a = parseDate(from)
  const b = parseDate(to)
  return a == null || b == null ? null : Math.round((b - a) / DAY)
}

/** "4y 4m" from 생년월일 to the visit date. */
export function ageText(birthDate, visitDate) {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthDate || ''))
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(visitDate || ''))
  if (!a || !b) return ''
  let months = (Number(b[1]) - Number(a[1])) * 12 + (Number(b[2]) - Number(a[2]))
  if (Number(b[3]) < Number(a[3])) months -= 1
  if (months < 0) return ''
  return `${Math.floor(months / 12)}y ${months % 12}m`
}

/** Days since the weight was measured when it is stale (> 30 days; > 14 under 6 months), else null. */
export function weightStaleDays(patient, visitDate) {
  const measured = patient?.weight?.measuredAt
  if (!measured) return null
  const days = daysBetween(measured, visitDate)
  const ageDays = daysBetween(patient.birthDate, visitDate)
  const limit = ageDays != null && ageDays < 183 ? 14 : 30
  return days != null && days > limit ? days : null
}

// ── Request ──────────────────────────────────────────────────────────────────

/** The visit as the host sends it: each row carries the host's 계산량 (mg/kg, mcg/kg rows). */
export function withCalc(visit) {
  const w = visit.patient?.weight?.kg ?? null
  const labs = (visit.patient?.labs || [])
    .filter((l) => !isBlank(l.value) && Number.isFinite(Number(l.value)))
    .map((l) => ({ ...l, value: Number(l.value) }))
  return {
    ...visit,
    patient: { ...visit.patient, labs },
    rows: visit.rows.map((r) => {
      const { sendCalc } = calcAmount(r, w)
      const { calc: _old, ...rest } = r
      return sendCalc ? { ...rest, calc: sendCalc } : rest
    }),
  }
}

/** CDS-Hooks-shaped request for the current visit (§3.3). */
export function requestFor(visit, hook, user) {
  return toCdsRequest(withCalc(visit), hook, { userId: user?.id })
}
