/** Small display helpers shared by the UI. No clinical logic lives here. */

import { getDrug } from '../knowledge/drugs.js'
import { SOURCES } from '../knowledge/sources.js'
import { SEVERITY_META } from '../engine/findings.js'
import { FREQUENCY_BY_ID, perDayFactor, planForStrength, ROUNDING_TOLERANCE } from '../engine/dose.js'
import { fmtNum } from '../engine/units.js'

export { fmtNum }

const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/

/** lang attribute for a string that may be in the other UI language (screen readers, line breaking). */
export function textLang(text) {
  return HANGUL.test(String(text || '')) ? 'ko' : 'en'
}

export function drugName(drugId, pick) {
  const d = getDrug(drugId)
  return d ? pick(d.name) : drugId
}

/** Short drug name: drops a bracketed synonym, e.g. "Ciclosporin (cyclosporine)" → "Ciclosporin". */
export function drugShort(drugId, pick) {
  return drugName(drugId, pick).replace(/\s*\(.*\)\s*$/, '')
}

export function severityWord(severity, pick) {
  return pick(SEVERITY_META[severity]?.label || { en: severity, ko: severity })
}

/**
 * fmtNum with digit grouping from 10 000 up (2,399,976 mg), so an absurd
 * amount reads as absurd; four-digit amounts stay ungrouped like the engine's
 * working text (1200 mg).
 */
export function fmtAmount(v, lang = 'en') {
  const s = fmtNum(v)
  if (v == null || !Number.isFinite(v) || Math.abs(v) < 10000) return s
  try {
    return new Intl.NumberFormat(lang === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 3 }).format(Number(s))
  } catch {
    return s
  }
}

export function fmtQ(q, lang = 'en') {
  if (!q || q.value == null) return '–'
  return `${fmtAmount(q.value, lang)} ${q.unit}`
}

/** Status word key for a dose row: "check" replaces "within"/"no_reference" when the amount needs the vet. */
export function doseStatusKey(status, check = false) {
  return check && (status === 'within' || status === 'no_reference') ? 'check' : status
}

/** More solid units than this per dose, or this many times the reference maximum, is not shown as an instruction. */
export const IMPLAUSIBLE_UNITS = 20
export const IMPLAUSIBLE_RATIO = 10

/** Solid units (tablets, capsules, chewables, pipettes) one dose of this row amounts to, or null. */
function solidUnits(row) {
  if (row.amount?.dimension === 'count') return row.amount.count ?? null
  if (!row.strengthId || row.perDoseMg == null) return null
  const strength = getDrug(row.drugId)?.strengths?.find((s) => s.id === row.strengthId)
  if (!strength) return null
  const plan = planForStrength(row.perDoseMg, strength)
  return plan && plan.unitLabel !== 'mL' ? plan.units : null
}

/**
 * How the "how to give" amount of a dose row may be shown. The engine sets
 * row.rounding when what it would give is not simply the calculated amount;
 * the report flags those rows and the handout leaves a blank for the vet, so
 * the workbench must not present that adjusted plan as the instruction either.
 *
 *   null                 nothing calculated (no dose, no weight…)
 *   { kind: 'ok' }       the plan is the instruction
 *   { kind: 'empty' }    the amount is 0: nothing to give
 *   { kind: 'implausible' }  > 10× the reference maximum or > 20 units a dose
 *   { kind: 'gap', pct, delivered }  the nearest listed strength misses the calculated amount by more than 10%
 *   { kind: 'range' }    the plan was moved to stay inside the reference range, or lands outside it (see the rounding note)
 *   { kind: 'none' }     no listed strength can deliver the amount
 * needsCheck: true for gap / range / none — the dose status reads "Check amount".
 */
export function amountCheck(row) {
  if (!row || !row.perDose || row.perDose.value == null) return null
  if (row.perDose.value === 0) return { kind: 'empty', needsCheck: false }
  const units = solidUnits(row)
  if ((row.ratio != null && row.ratio > IMPLAUSIBLE_RATIO) || (units != null && units > IMPLAUSIBLE_UNITS)) {
    return { kind: 'implausible', needsCheck: false }
  }
  const r = row.rounding
  if (!r) return { kind: 'ok', needsCheck: false }
  if (!row.strengthId) return { kind: 'none', needsCheck: true }
  if (Math.abs(r.deviation) > ROUNDING_TOLERANCE && row.perDoseMg != null) {
    const deliveredMg = row.perDoseMg * (1 + r.deviation)
    const pct = `${r.deviation > 0 ? '+' : '−'}${Math.round(Math.abs(r.deviation) * 100)}%`
    const delivered = row.perDose.unit === 'mcg' && deliveredMg < 1 ? `${fmtNum(deliveredMg * 1000)} mcg` : `${fmtNum(deliveredMg)} mg`
    return { kind: 'gap', needsCheck: true, pct, delivered }
  }
  return { kind: 'range', needsCheck: true }
}

export function freqLabel(id, pick) {
  const f = FREQUENCY_BY_ID[id]
  return f ? pick(f.label) : id || '–'
}

/** Compact frequency code for chips (q12h, q24h …). */
export function freqCode(id) {
  return id || '–'
}

export function sourceCite(id) {
  return SOURCES[id]?.cite || id
}

/**
 * Short citation for chips:
 *   "Mueller et al. 2020, Vet Dermatol" → "Mueller 2020"
 *   "Heartgard (ivermectin) chewables — US FDA…" → "Heartgard label"
 */
export function sourceShort(id, lang = 'en') {
  const s = SOURCES[id]
  if (!s) return id
  if (s.kind === 'label') {
    const name = s.cite.split(/[—,(]/)[0].trim()
    return lang === 'ko' ? `${name} 라벨` : `${name} label`
  }
  const m = /^(.*?\d{4})/.exec(s.cite)
  return m ? m[1].replace(/\s+et al\.?/, '') : s.cite.split(',')[0]
}

export function msText(ms, t) {
  if (ms == null) return ''
  if (ms < 1) return t('rv.msUnder')
  return t('rv.ms', { n: ms < 10 ? Math.round(ms * 10) / 10 : Math.round(ms) })
}

export function rangeText(min, max, unit) {
  if (min == null && max == null) return '–'
  if (max == null || min === max) return `${fmtNum(min)} ${unit}`
  return `${fmtNum(min)}–${fmtNum(max)} ${unit}`
}

/**
 * The band and value a dose row should be drawn against, in the same unit.
 * Handles per-day protocols and the daily comparison the engine falls back to
 * when the entered frequency differs from the protocol.
 * Returns null when there is nothing to compare.
 */
export function doseBand(row) {
  if (!row?.ref || !row.compared || row.compared.value == null) return null
  const { ref, compared } = row
  let min = ref.min
  let max = ref.max ?? ref.min
  let unit = ref.unit
  let per = ref.per === 'day' ? 'day' : 'dose'
  if (compared.per === 'day' && ref.per !== 'day') {
    const freqs = (Array.isArray(ref.frequency) ? ref.frequency : [ref.frequency]).map(perDayFactor).filter((x) => x != null)
    if (!freqs.length) return null
    min = min * Math.min(...freqs)
    max = max * Math.max(...freqs)
    per = 'day'
  }
  if (per === 'day') unit = `${ref.unit}/day`
  return { min, max, value: compared.value, unit, per, reason: compared.reason || null }
}

/** Unit notation per language: "mg/kg/day" → "mg/kg/일" in Korean. */
const KO_COUNT = { tablet: '정', capsule: '캡슐', chewable: '츄어블', pipette: '피펫', application: '회' }
export function unitText(unit, lang) {
  if (!unit) return ''
  if (lang !== 'ko') return String(unit)
  return String(unit).replace(/\/day$/, '/일').replace(/^(tablet|capsule|chewable|pipette|application)\b/, (m) => KO_COUNT[m] || m)
}

const T = (en, ko) => ({ en, ko })

/** Short frequency labels that fit a narrow select. */
export const FREQ_SHORT = {
  once: T('Once', '1회'),
  q4h: T('q4h', 'q4h(4시간)'),
  q6h: T('q6h (QID)', 'q6h(1일 4회)'),
  q8h: T('q8h (TID)', 'q8h(1일 3회)'),
  q12h: T('q12h (BID)', 'q12h(1일 2회)'),
  q24h: T('q24h (SID)', 'q24h(1일 1회)'),
  q48h: T('q48h (EOD)', 'q48h(격일)'),
  q72h: T('q72h', 'q72h(3일)'),
  weekly: T('Weekly', '주 1회'),
  q14d: T('Every 14 d', '14일마다'),
  monthly: T('Monthly', '월 1회'),
  cri: T('CRI', 'CRI'),
  prn: T('PRN', '필요 시'),
}

export function freqShort(id, pick) {
  return FREQ_SHORT[id] ? pick(FREQ_SHORT[id]) : id || '–'
}


/** Case name ("Choco" / "초코"). */
export function caseName(c, pick) {
  return c ? pick(c.name) : ''
}

/** The case title without the name, e.g. "Demodicosis treatment in a Rough Collie" (no em dash shown). */
export function caseSubtitle(c, pick) {
  if (!c) return ''
  const title = pick(c.title)
  const i = title.indexOf(' — ')
  const rest = i < 0 ? '' : title.slice(i + 3)
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : ''
}
