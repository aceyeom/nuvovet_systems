/**
 * Dose maths: frequency vocabulary, BSA (Meeh), amount per dose / per day,
 * strength selection with tablet-fraction rounding, and comparison with a
 * protocol's reference range. Pure functions only.
 *
 * Tablet rounding and best-strength scoring are ported (logic only) from the
 * original product's DrugInput component; BSA uses Meeh's formula.
 */

import {
  parseDoseUnit, convertMass, toMg, concentrationMgPerMl, fixFloat, fmtNum, displayMass,
} from './units.js'

// ── Frequency vocabulary ─────────────────────────────────────────────────────

/** perDay: average administrations per day (null when not computable). */
export const FREQUENCIES = [
  { id: 'once', perDay: null, label: { en: 'Once (single dose)', ko: '1회(단회)' } },
  { id: 'q4h', perDay: 6, label: { en: 'Every 4 h', ko: '4시간마다' } },
  { id: 'q6h', perDay: 4, label: { en: 'Every 6 h (QID)', ko: '6시간마다(1일 4회)' } },
  { id: 'q8h', perDay: 3, label: { en: 'Every 8 h (TID)', ko: '8시간마다(1일 3회)' } },
  { id: 'q12h', perDay: 2, label: { en: 'Every 12 h (BID)', ko: '12시간마다(1일 2회)' } },
  { id: 'q24h', perDay: 1, label: { en: 'Every 24 h (SID)', ko: '24시간마다(1일 1회)' } },
  { id: 'q48h', perDay: 0.5, label: { en: 'Every 48 h (EOD)', ko: '48시간마다(격일)' } },
  { id: 'q72h', perDay: 1 / 3, label: { en: 'Every 72 h', ko: '72시간마다' } },
  { id: 'weekly', perDay: 1 / 7, label: { en: 'Weekly', ko: '주 1회' } },
  { id: 'q14d', perDay: 1 / 14, label: { en: 'Every 14 days', ko: '14일마다' } },
  { id: 'monthly', perDay: 1 / 30, label: { en: 'Monthly', ko: '월 1회' } },
  { id: 'cri', perDay: null, label: { en: 'Constant-rate infusion', ko: '지속 정맥 주입(CRI)' } },
  { id: 'prn', perDay: null, label: { en: 'As needed (PRN)', ko: '필요 시(PRN)' } },
]

export const FREQUENCY_BY_ID = Object.fromEntries(FREQUENCIES.map((f) => [f.id, f]))

const FREQ_SYNONYMS = {
  sid: 'q24h', qd: 'q24h', q24: 'q24h', daily: 'q24h', oncedaily: 'q24h', everyday: 'q24h', qday: 'q24h',
  '1일1회': 'q24h', '하루1회': 'q24h', '하루1번': 'q24h', '하루한번': 'q24h', '매일': 'q24h',
  bid: 'q12h', q12: 'q12h', twicedaily: 'q12h', '1일2회': 'q12h', '하루2회': 'q12h', '하루2번': 'q12h', '하루두번': 'q12h',
  tid: 'q8h', q8: 'q8h', threetimesdaily: 'q8h', '1일3회': 'q8h', '하루3회': 'q8h', '하루3번': 'q8h', '하루세번': 'q8h',
  qid: 'q6h', q6: 'q6h', fourtimesdaily: 'q6h', '1일4회': 'q6h', '하루4회': 'q6h',
  q4: 'q4h',
  eod: 'q48h', qod: 'q48h', q48: 'q48h', everyotherday: 'q48h', '격일': 'q48h', '이틀에한번': 'q48h',
  q72: 'q72h', '3일마다': 'q72h',
  q7d: 'weekly', onceweekly: 'weekly', '주1회': 'weekly', '매주': 'weekly',
  q2w: 'q14d', q14: 'q14d', '2주1회': 'q14d', '2주마다': 'q14d',
  q30d: 'monthly', onceamonth: 'monthly', oncemonthly: 'monthly', '월1회': 'monthly', '매월': 'monthly', '한달에한번': 'monthly',
  single: 'once', singledose: 'once', '1회': 'once', '단회': 'once', stat: 'once',
  asneeded: 'prn', '필요시': 'prn',
  constantrateinfusion: 'cri',
}

/**
 * Map free text to a frequency id. Never coerces silently: an unknown value
 * returns { id: null, ok: false, note } so the engine can raise a validation note.
 */
export function normalizeFrequency(raw) {
  if (raw == null || raw === '') {
    return { id: null, ok: false, raw, note: { en: 'Frequency not entered — daily amounts are not calculated.', ko: '투여 빈도가 입력되지 않아 1일 총량을 계산하지 않습니다.' } }
  }
  const s = String(raw).trim()
  if (FREQUENCY_BY_ID[s]) return { id: s, ok: true, raw }
  const key = s.toLowerCase().replace(/[\s.\-_()]/g, '')
  if (FREQUENCY_BY_ID[key]) return { id: key, ok: true, raw }
  const syn = FREQ_SYNONYMS[key]
  if (syn) return { id: syn, ok: true, raw, mappedFrom: s }
  return {
    id: null, ok: false, raw,
    note: { en: `Frequency “${s}” is not recognised — daily amounts are not calculated.`, ko: `투여 빈도 “${s}”를 인식할 수 없어 1일 총량을 계산하지 않습니다.` },
  }
}

/** Administrations per day used for daily totals: 'once' counts as one dose on that day. */
export function perDayFactor(freqId) {
  if (freqId === 'once') return 1
  const f = FREQUENCY_BY_ID[freqId]
  return f && f.perDay != null ? f.perDay : null
}

// ── Body-surface area (Meeh) ─────────────────────────────────────────────────

export const MEEH_K = { dog: 10.1, cat: 10.0 }

/** BSA in m² = K × W(g)^(2/3) / 10 000 = K × W(kg)^(2/3) / 100. */
export function bsaM2(weightKg, species) {
  const w = Number(weightKg)
  const k = MEEH_K[species]
  if (!k || !Number.isFinite(w) || w <= 0) return null
  return fixFloat((k * Math.pow(w, 2 / 3)) / 100)
}

// ── Amount per dose ──────────────────────────────────────────────────────────

const SPECIES_WORD = { dog: { en: 'dog', ko: '개' }, cat: { en: 'cat', ko: '고양이' } }

/**
 * Compute the amount for one administration from an entered dose.
 * Per-animal units are NEVER multiplied by weight.
 * Returns { ok, dimension, basis, mg, iu, ml, count, perDose:{value,unit}, working:{en,ko}, error? }.
 */
export function computeAmount({ value, unit, weightKg, species, strength = null }) {
  const parsed = parseDoseUnit(unit)
  const v = Number(value)
  if (!parsed) return { ok: false, error: 'unit', working: { en: `Unit “${unit}” not recognised.`, ko: `단위 “${unit}”를 인식할 수 없습니다.` } }
  if (!Number.isFinite(v) || v < 0) return { ok: false, error: 'value', working: { en: 'Dose value missing.', ko: '용량 값이 없습니다.' } }

  const w = Number(weightKg)
  let mult = 1
  let multEn = ''
  let multKo = ''
  if (parsed.basis === 'per_kg') {
    if (!Number.isFinite(w) || w <= 0) return { ok: false, error: 'weight', working: { en: 'Weight needed for a per-kg dose.', ko: 'kg당 용량에는 체중이 필요합니다.' } }
    mult = w
    multEn = ` × ${fmtNum(w)} kg`
    multKo = ` × ${fmtNum(w)} kg`
  } else if (parsed.basis === 'per_m2') {
    const bsa = bsaM2(w, species)
    if (bsa == null) return { ok: false, error: 'weight', working: { en: 'Weight and species needed for a per-m² dose.', ko: 'm²당 용량에는 체중과 종이 필요합니다.' } }
    mult = bsa
    multEn = ` × ${fmtNum(bsa)} m² (BSA, Meeh K = ${MEEH_K[species]})`
    multKo = ` × ${fmtNum(bsa)} m² (체표면적, Meeh K = ${MEEH_K[species]})`
  }

  const total = fixFloat(v * mult)
  const sp = SPECIES_WORD[species] || { en: 'animal', ko: '두' }
  const lhs = `${fmtNum(v)} ${unit}`
  const out = { ok: true, dimension: parsed.dimension, basis: parsed.basis, mg: null, iu: null, ml: null, count: null }

  if (parsed.dimension === 'mass') {
    out.mg = toMg(total, parsed.numerator)
    out.perDose = displayMass(out.mg, parsed.numerator)
  } else if (parsed.dimension === 'iu') {
    out.iu = total
    out.perDose = { value: total, unit: 'IU' }
  } else if (parsed.dimension === 'volume') {
    out.ml = parsed.numerator === 'L' ? total * 1000 : total
    // Only a liquid strength has a concentration; anything else leaves mg unknown.
    const conc = strength ? concentrationMgPerMl(strength) : null
    if (conc != null) out.mg = fixFloat(out.ml * conc)
    out.perDose = out.mg != null ? displayMass(out.mg) : { value: out.ml, unit: 'mL' }
  } else if (parsed.dimension === 'count') {
    out.count = total
    // Convert only with a strength of the counted form (2 chewables are never 2 mL of a solution).
    if (strengthMatchesUnit(strength, parsed) && strength.amount && toMg(strength.amount.value, strength.amount.unit) != null) {
      out.mg = fixFloat(total * toMg(strength.amount.value, strength.amount.unit))
      out.perDose = displayMass(out.mg)
    } else {
      out.perDose = { value: total, unit: parsed.numerator }
    }
  }

  const rhs = `${fmtNum(out.perDose.value)} ${out.perDose.unit}`
  if (parsed.basis === 'per_animal') {
    out.working = {
      en: `${lhs} per ${sp.en} (fixed dose, not multiplied by weight) = ${rhs}`,
      ko: `${sp.ko} 1마리당 ${lhs} (고정 용량, 체중을 곱하지 않음) = ${rhs}`,
    }
  } else {
    out.working = { en: `${lhs}${multEn} = ${rhs}`, ko: `${lhs}${multKo} = ${rhs}` }
  }
  return out
}

// ── Strength selection and tablet rounding ───────────────────────────────────

const ROUTE_FORMS = {
  PO: ['tablet', 'chewable', 'capsule', 'solution', 'suspension'],
  SC: ['injection', 'solution'],
  IM: ['injection', 'solution'],
  IV: ['injection', 'solution'],
  topical: ['spot-on'],
  'spot-on': ['spot-on'],
}

const LIQUID_FORMS = ['solution', 'suspension', 'injection']

/** Product forms a counted dose unit can refer to (a chewable is a chewable tablet). */
const COUNT_FORMS = {
  tablet: ['tablet', 'chewable'],
  chewable: ['chewable', 'tablet'],
  capsule: ['capsule'],
  pipette: ['spot-on'],
  application: ['spot-on'],
}

/**
 * Can this strength turn the entered unit into an amount? Counts need a strength
 * of the counted form; volumes need a liquid. Mass and IU doses need no strength.
 */
export function strengthMatchesUnit(strength, parsed) {
  if (!strength || !parsed) return false
  if (parsed.dimension === 'count') return (COUNT_FORMS[parsed.numerator] || []).includes(strength.form)
  if (parsed.dimension === 'volume') return concentrationMgPerMl(strength) != null
  return true
}

/**
 * For a dose entered as a count or a volume with the strength left on auto:
 * the one listed product the entry can refer to (a volume also has to suit the
 * route), or null when there is none or more than one. Never guesses between
 * products.
 */
export function impliedStrength(drug, parsed, route) {
  if (!parsed || !['count', 'volume'].includes(parsed.dimension)) return null
  const forms = ROUTE_FORMS[route] || ROUTE_FORMS.PO
  const candidates = (drug?.strengths || []).filter((s) => strengthMatchesUnit(s, parsed) && (parsed.dimension === 'count' || forms.includes(s.form)))
  return candidates.length === 1 ? candidates[0] : null
}

/** Maximum acceptable difference between delivered and calculated amount before we warn. */
export const ROUNDING_TOLERANCE = 0.1

export function roundToStep(x, step) {
  return fixFloat(Math.round(x / step) * step)
}

/** Round to a step: 'nearest' (default), 'up' or 'down'. */
function stepRound(x, step, mode = 'nearest') {
  if (mode === 'up') return fixFloat(Math.ceil(x / step - 1e-9) * step)
  if (mode === 'down') return fixFloat(Math.floor(x / step + 1e-9) * step)
  return roundToStep(x, step)
}

/** Splitting step for a solid form: ¼ if quarter-scorable, ½ if splittable, else whole. */
export function splitStep(strength) {
  if (!strength || strength.form === 'capsule' || !strength.splittable) return 1
  return strength.quarter ? 0.25 : 0.5
}

const FRAC = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' }
export function fractionLabel(units) {
  if (units == null || units <= 0) return '0'
  const whole = Math.floor(units + 1e-9)
  const frac = roundToStep(units - whole, 0.25)
  const f = FRAC[frac] ?? ''
  if (whole === 0) return f || '0'
  return f ? `${whole}${f}` : `${whole}`
}

const FORM_WORD = {
  tablet: { en: 'tablet', ko: '정' },
  chewable: { en: 'chewable', ko: '츄어블' },
  capsule: { en: 'capsule', ko: '캡슐' },
  'spot-on': { en: 'pipette', ko: '피펫' },
}

function strengthText(strength) {
  const a = strength.amount
  return `${fmtNum(a.value)} ${a.unit}`
}

/** "50 mg tablet", "10 mg/mL injection" — for notes about a specific product. */
function productText(strength) {
  if (LIQUID_FORMS.includes(strength.form)) {
    const conc = `${fmtNum(concentrationMgPerMl(strength))} mg/mL`
    const ko = { solution: '용액', suspension: '현탁액', injection: '주사제' }[strength.form]
    return { en: `${conc} ${strength.form}`, ko: `${conc} ${ko}` }
  }
  const word = FORM_WORD[strength.form] || { en: strength.form, ko: strength.form }
  const koNoun = { tablet: '정제', chewable: '츄어블', capsule: '캡슐', 'spot-on': '피펫' }[strength.form] || strength.form
  return { en: `${strengthText(strength)} ${word.en}`, ko: `${strengthText(strength)} ${koNoun}` }
}

/** ¼-multiples as fractions (1½); anything else as a plain number (1.3). */
function countLabel(units) {
  return Math.abs(units * 4 - Math.round(units * 4)) < 1e-9 ? fractionLabel(units) : fmtNum(units)
}

/** "How to give" text for `units` of one strength (mL for liquids, a count otherwise). */
function planText(units, strength) {
  if (LIQUID_FORMS.includes(strength.form)) {
    const concText = `${fmtNum(concentrationMgPerMl(strength))} mg/mL`
    return { en: `${fmtNum(units)} mL of ${concText}`, ko: `${concText} ${fmtNum(units)} mL` }
  }
  const form = strength.form
  const word = FORM_WORD[form] || { en: form, ko: form }
  const plural = units > 1 ? 's' : ''
  const koNoun = { tablet: '정제', chewable: '츄어블', capsule: '캡슐', 'spot-on': '피펫' }[form] || form
  const koCounter = form === 'tablet' ? '정' : '개'
  return {
    en: `${countLabel(units)} × ${strengthText(strength)} ${word.en}${plural}`,
    ko: `${strengthText(strength)} ${koNoun} ${countLabel(units)}${koCounter}`,
  }
}

/**
 * Plan how to give `mg` with one strength, rounding the volume or the number of
 * (split) units to the nearest step, or up/down when `mode` says so. Returns null
 * if the strength cannot deliver this kind of amount or the amount rounds to
 * nothing (less than half the smallest split of a tablet).
 */
export function planForStrength(mg, strength, mode = 'nearest') {
  if (!strength || mg == null) return null
  const form = strength.form
  if (LIQUID_FORMS.includes(form)) {
    const conc = concentrationMgPerMl(strength)
    if (conc == null) return null
    const exactMl = mg / conc
    const step = exactMl < 1 ? 0.01 : exactMl < 10 ? 0.1 : 0.5
    const ml = stepRound(exactMl, step, mode)
    if (ml <= 0) return null
    const delivered = fixFloat(ml * conc)
    const deviation = mg > 0 ? fixFloat((delivered - mg) / mg) : 0
    return {
      strengthId: strength.id, form, units: ml, unitLabel: 'mL', exactUnits: fixFloat(exactMl), deliveredMg: delivered, deviation,
      text: planText(ml, strength),
    }
  }
  const sMg = toMg(strength.amount.value, strength.amount.unit)
  if (sMg == null) return null
  const exact = mg / sMg
  const units = stepRound(exact, splitStep(strength), mode)
  if (units <= 0) return null
  const delivered = fixFloat(units * sMg)
  const deviation = mg > 0 ? fixFloat((delivered - mg) / mg) : 0
  const word = FORM_WORD[form] || { en: form, ko: form }
  return {
    strengthId: strength.id, form, units, unitLabel: word.en, exactUnits: fixFloat(exact), deliveredMg: delivered, deviation,
    text: planText(units, strength),
  }
}

/**
 * The plan for a dose the clinician entered as a count or volume of a specific
 * product: exactly what was entered, never re-rounded or moved to another strength.
 */
function planForEntered(amount, strength) {
  if (!strength || amount?.mg == null) return null
  const units = amount.dimension === 'volume' ? amount.ml : amount.count
  if (units == null || units <= 0) return null
  const word = FORM_WORD[strength.form] || { en: strength.form, ko: strength.form }
  return {
    strengthId: strength.id, form: strength.form, units, unitLabel: LIQUID_FORMS.includes(strength.form) ? 'mL' : word.en,
    exactUnits: units, deliveredMg: amount.mg, deviation: 0, text: planText(units, strength),
  }
}

/** Score a plan: accuracy × cleanness × pill-burden (higher is better). */
export function scorePlan(plan) {
  if (!plan) return -1
  if (plan.units <= 0) return 0
  const accuracy = 1 - Math.min(Math.abs(plan.deviation), 1)
  let clean
  if (plan.unitLabel === 'mL') clean = plan.units < 0.1 ? 0.3 : 0.75
  else {
    const frac = fixFloat(plan.units % 1)
    clean = frac === 0 ? 1 : frac === 0.5 ? 0.8 : 0.6
  }
  const burden = plan.unitLabel !== 'mL' && plan.units > 4 ? 4 / plan.units : 1
  // A plan that misses the calculated amount by more than the tolerance loses to one that does not.
  const tolerance = Math.abs(plan.deviation) > ROUNDING_TOLERANCE ? 0.5 : 1
  return accuracy * clean * burden * tolerance
}

/** All strengths usable for a route, best first. */
export function rankStrengths(drug, mg, route) {
  const forms = ROUTE_FORMS[route] || ROUTE_FORMS.PO
  return (drug?.strengths || [])
    .filter((s) => forms.includes(s.form))
    .map((s) => ({ strength: s, plan: planForStrength(mg, s) }))
    .filter((x) => x.plan)
    .map((x) => ({ ...x, score: scorePlan(x.plan) }))
    .sort(byRank)
}

/** Best score first; ties: fewer units to give, then the larger strength. */
function byRank(a, b) {
  return b.score - a.score || a.plan.units - b.plan.units || (toMg(b.strength.amount.value, b.strength.amount.unit) ?? 0) - (toMg(a.strength.amount.value, a.strength.amount.unit) ?? 0)
}

export function bestStrength(drug, mg, route) {
  const ranked = rankStrengths(drug, mg, route)
  return ranked.length ? ranked[0] : null
}

/** Strengths whose form suits the route (whatever amount they could deliver). */
function routeStrengths(drug, route) {
  const forms = ROUTE_FORMS[route] || ROUTE_FORMS.PO
  return (drug?.strengths || []).filter((s) => forms.includes(s.form))
}

/** A delivered mg amount in a per-dose mass protocol's unit and basis (e.g. mcg/kg), or null. */
function inProtocolUnits(mg, protocol, weightKg) {
  const pu = parseDoseUnit(protocol?.dose?.unit)
  if (!pu || pu.dimension !== 'mass' || mg == null) return null
  const v = convertMass(mg, 'mg', pu.numerator)
  if (pu.basis === 'per_animal') return v
  if (pu.basis === 'per_kg') return Number(weightKg) > 0 ? fixFloat(v / Number(weightKg)) : null
  return null
}

/**
 * The entered dose is inside a protocol RANGE (min < max, per dose), but the
 * nearest whole/split unit may land outside it — e.g. one 136 mcg chewable for a
 * 25 kg dog is 5.4 mcg/kg, below the 6 mcg/kg label minimum. Prefer a plan of the
 * same product form (rounding up or down if needed) that stays in range.
 * Returns { plan, strength?, moved, outside }.
 */
function keepWithinRange({ drug, mg, route, plan, protocol, weightKg }) {
  const { min, max } = protocol.dose
  const inRange = (p) => {
    const v = inProtocolUnits(p.deliveredMg, protocol, weightKg)
    return v != null && v >= min * (1 - 1e-9) && (max == null || v <= max * (1 + 1e-9))
  }
  if (plan && inRange(plan)) return { plan, moved: false, outside: false }
  const candidates = []
  for (const s of routeStrengths(drug, route)) {
    // Keep the form the scorer chose; with no plan at all (the amount rounds to nothing), any form for the route.
    if (plan && s.form !== plan.form) continue
    for (const mode of ['nearest', 'up', 'down']) {
      const p = planForStrength(mg, s, mode)
      if (!p || !inRange(p)) continue
      if (candidates.some((c) => c.plan.strengthId === p.strengthId && c.plan.units === p.units)) continue
      candidates.push({ strength: s, plan: p, score: scorePlan(p) })
    }
  }
  // Fewest pieces to give first (one 272 mcg chewable rather than three 68 mcg ones,
  // as label weight bands do), then the usual score, then the smaller deviation.
  const pieces = (p) => (p.unitLabel === 'mL' ? 1 : Math.ceil(p.units - 1e-9))
  candidates.sort((a, b) => pieces(a.plan) - pieces(b.plan) || b.score - a.score || Math.abs(a.plan.deviation) - Math.abs(b.plan.deviation) || byRank(a, b))
  return candidates.length ? { ...candidates[0], moved: true, outside: false } : { plan, moved: false, outside: Boolean(plan) }
}

// ── Protocol comparison ──────────────────────────────────────────────────────

function freqList(f) {
  return Array.isArray(f) ? f : f ? [f] : []
}

/**
 * Compare an entered amount with a protocol range. Converts between per-kg,
 * per-animal and per-m² as needed; compares daily totals when the protocol is
 * stated per day or when the entered frequency differs from the protocol's.
 */
export function compareWithProtocol({ protocol, amount, weightKg, species, frequency }) {
  if (!protocol) return { status: 'no_reference', ratio: null, compared: null }
  const pu = parseDoseUnit(protocol.dose.unit)
  if (!pu || !amount?.ok) return { status: 'unit_mismatch', ratio: null, compared: null }

  // Entered amount expressed in the protocol's numerator unit and basis.
  let value = null
  if (pu.dimension === 'mass' && amount.mg != null) {
    const inNum = convertMass(amount.mg, 'mg', pu.numerator)
    if (pu.basis === 'per_kg') value = Number(weightKg) > 0 ? inNum / Number(weightKg) : null
    else if (pu.basis === 'per_animal') value = inNum
    else if (pu.basis === 'per_m2') {
      const bsa = bsaM2(weightKg, species)
      value = bsa ? inNum / bsa : null
    }
  } else if (pu.dimension === 'iu' && amount.iu != null) {
    if (pu.basis === 'per_kg') value = Number(weightKg) > 0 ? amount.iu / Number(weightKg) : null
    else if (pu.basis === 'per_animal') value = amount.iu
  }
  if (value == null) return { status: 'unit_mismatch', ratio: null, compared: null }
  value = fixFloat(value)

  const { min, max } = protocol.dose
  const per = protocol.dose.per || 'dose'
  const fE = perDayFactor(frequency)
  const protoFreqs = freqList(protocol.frequency)
  const pFactors = protoFreqs.map(perDayFactor).filter((x) => x != null)
  const eps = 1e-9

  let status = 'within'
  let ratio = max ? fixFloat(value / max) : null
  let compared = { value, unit: protocol.dose.unit, per: 'dose' }

  if (per === 'day') {
    if (fE == null) {
      // No daily total without a frequency, but one administration is at least
      // one dose on that day: a single dose above the daily maximum is already over.
      if (max != null && value > max * (1 + eps)) {
        return { status: 'above', ratio: fixFloat(value / max), compared: { value, unit: protocol.dose.unit, per: 'dose', reason: 'single_dose_exceeds_daily' } }
      }
      return { status: 'unit_mismatch', ratio: null, compared: { value, unit: protocol.dose.unit, per: 'dose' }, reason: 'frequency' }
    }
    const daily = fixFloat(value * fE)
    compared = { value: daily, unit: `${protocol.dose.unit}/day`, per: 'day' }
    ratio = max ? fixFloat(daily / max) : null
    if (daily < min * (1 - eps)) status = 'below'
    else if (max != null && daily > max * (1 + eps)) status = 'above'
    return { status, ratio, compared }
  }

  // Per-dose comparison
  if (value < min * (1 - eps)) status = 'below'
  else if (max != null && value > max * (1 + eps)) status = 'above'

  // A single-dose protocol (e.g. feline meloxicam injection) prescribed repeatedly.
  if (protoFreqs.length && protoFreqs.every((f) => f === 'once') && frequency && frequency !== 'once') {
    return { status: 'above', ratio: status === 'above' ? ratio : null, compared: { ...compared, reason: 'repeat' } }
  }

  // Daily-exposure check when the entered frequency differs from the protocol's.
  if (fE != null && pFactors.length && !protoFreqs.includes(frequency)) {
    const daily = value * fE
    const dailyMax = max != null ? max * Math.max(...pFactors) : null
    const dailyMin = min * Math.min(...pFactors)
    if (dailyMax != null && daily > dailyMax * (1 + eps)) {
      status = 'above'
      ratio = fixFloat(Math.max(ratio ?? 0, daily / dailyMax))
      compared = { value: fixFloat(daily), unit: `${protocol.dose.unit}/day`, per: 'day', reason: 'frequency' }
    } else if (status === 'within' && daily < dailyMin * (1 - eps)) {
      status = 'below'
      compared = { value: fixFloat(daily), unit: `${protocol.dose.unit}/day`, per: 'day', reason: 'frequency' }
    }
  }
  return { status, ratio, compared }
}

/**
 * 24-hour exposure in mg/kg for safety ceilings (e.g. feline enrofloxacin):
 * per-dose amount × administrations in 24 h (intermittent schedules count as
 * one dose on the dosing day). Null when not computable.
 */
export function exposure24hPerKg(amountMg, weightKg, frequency) {
  const w = Number(weightKg)
  if (amountMg == null || !(w > 0)) return null
  const f = perDayFactor(frequency)
  if (f == null) return null
  return fixFloat((amountMg / w) * Math.max(1, f))
}

// ── Dose row (the contract consumed by the UI) ───────────────────────────────

/**
 * Build a DoseRow for one prescription line.
 * med: { drugId, protocolId, dose:{value,unit}, route, frequency, durationDays, strengthId }
 */
export function buildDoseRow({ med, drug, protocol, weightKg, species, frequencyId }) {
  const chosenStrength = med.strengthId ? (drug.strengths || []).find((s) => s.id === med.strengthId) || null : null
  const route = med.route || protocol?.route || 'PO'
  const parsedUnit = parseDoseUnit(med.dose?.unit)
  // A count (chewable, tablet…) or a volume (mL) names a product amount: it is
  // converted only with that product — the chosen strength, or the one listed
  // strength the unit can refer to. Never with an unrelated liquid.
  const entersProduct = Boolean(parsedUnit && ['count', 'volume'].includes(parsedUnit.dimension))
  const implied = !chosenStrength && entersProduct ? impliedStrength(drug, parsedUnit, route) : null
  const usedStrength = chosenStrength || implied
  const amount = computeAmount({
    value: med.dose?.value,
    unit: med.dose?.unit,
    weightKg,
    species,
    strength: usedStrength,
  })
  const cmp = compareWithProtocol({ protocol, amount, weightKg, species, frequency: frequencyId })

  // Per day (only for schedules of one or more doses per day).
  const f = FREQUENCY_BY_ID[frequencyId]
  let perDay = null
  if (amount.ok && f && f.perDay != null && f.perDay >= 1) {
    if (amount.mg != null) perDay = displayMass(fixFloat(amount.mg * f.perDay), amount.perDose?.unit)
    else if (amount.perDose?.value != null) perDay = { value: fixFloat(amount.perDose.value * f.perDay), unit: amount.perDose.unit }
  }

  // How to give it.
  let plan = null
  let suggested = null
  let rounding = null
  let strengthNote = null
  const amountText = amount.ok && amount.perDose ? `${fmtNum(amount.perDose.value)} ${amount.perDose.unit}` : ''
  if (amount.ok && entersProduct) {
    // Exactly what was entered, with the product it refers to — never re-planned with another strength.
    if (usedStrength && amount.mg != null) plan = planForEntered(amount, usedStrength)
    if (implied) suggested = { strength: implied, plan }
    if (!usedStrength) {
      const qty = enteredQty(amount, parsedUnit)
      strengthNote = {
        en: `Choose the strength: ${qty.en} cannot be converted to mg until the product is selected, so mg-based checks treat the dose as unknown.`,
        ko: `함량을 선택하십시오: 제품을 선택해야 입력량(${qty.ko})을 mg으로 환산할 수 있으며, 그 전까지 mg 기준 검토는 용량을 알 수 없는 것으로 처리합니다.`,
      }
    } else if (!strengthMatchesUnit(usedStrength, parsedUnit)) {
      const pt = productText(usedStrength)
      strengthNote = {
        en: `The selected strength (${pt.en}) does not match the entered unit (${med.dose.unit}), so the dose could not be converted to mg. Choose a matching strength.`,
        ko: `선택한 함량(${pt.ko})이 입력 단위(${med.dose.unit})와 맞지 않아 mg으로 환산할 수 없습니다. 맞는 함량을 선택하십시오.`,
      }
    }
  } else if (amount.ok && amount.mg != null) {
    if (chosenStrength) {
      plan = planForStrength(amount.mg, chosenStrength)
    } else {
      suggested = bestStrength(drug, amount.mg, route)
      plan = suggested?.plan || null
      const pu = parseDoseUnit(protocol?.dose?.unit)
      const rangeApplies = protocol && cmp.status === 'within' && (protocol.dose.per || 'dose') === 'dose' &&
        protocol.dose.max != null && protocol.dose.max > protocol.dose.min && pu?.dimension === 'mass' && ['per_kg', 'per_animal'].includes(pu.basis)
      if (rangeApplies) {
        const nearest = plan
        const kept = keepWithinRange({ drug, mg: amount.mg, route, plan, protocol, weightKg })
        const u = protocol.dose.unit
        const range = `${fmtNum(protocol.dose.min)}–${fmtNum(protocol.dose.max)} ${u}`
        if (kept.moved) {
          suggested = { strength: kept.strength, plan: kept.plan, score: kept.score }
          plan = kept.plan
          const v = fmtNum(inProtocolUnits(plan.deliveredMg, protocol, weightKg))
          const lead = {
            en: `Suggested ${plan.text.en} (${v} ${u}) to stay within the reference ${range}`,
            ko: `참고 범위(${range}) 안에 들도록 ${plan.text.ko} 투여를 제안합니다(${v} ${u}).`,
          }
          let tail
          if (nearest) {
            const v0 = fmtNum(inProtocolUnits(nearest.deliveredMg, protocol, weightKg))
            tail = { en: `; the closest amount, ${nearest.text.en}, would give ${v0} ${u}.`, ko: ` 가장 가까운 투여량(${nearest.text.ko})은 ${v0} ${u}에 해당하여 범위를 벗어납니다.` }
          } else {
            tail = { en: `; the calculated ${amountText} is less than the smallest listed unit.`, ko: ` 계산량 ${amountText}은 등록된 최소 단위보다 적습니다.` }
          }
          rounding = { deviation: plan.deviation, text: { en: lead.en + tail.en, ko: lead.ko + tail.ko } }
        } else if (kept.outside) {
          const v = fmtNum(inProtocolUnits(plan.deliveredMg, protocol, weightKg))
          rounding = {
            deviation: plan.deviation,
            text: {
              en: `${plan.text.en} delivers ${v} ${u}, outside the reference ${range}. Consider another strength or a compounded/liquid form.`,
              ko: `${plan.text.ko} 투여 시 ${v} ${u}에 해당하여 참고 범위(${range})를 벗어납니다. 다른 함량이나 조제·액상 제형을 고려하십시오.`,
            },
          }
        }
      }
    }
  }

  let administration
  if (plan) {
    administration = plan.text
    const dev = plan.deviation
    if (!rounding && Math.abs(dev) > ROUNDING_TOLERANCE) {
      const sign = dev > 0 ? '+' : '−'
      const pct = Math.round(Math.abs(dev) * 100)
      rounding = {
        deviation: dev,
        text: {
          en: `${administration.en} delivers ${fmtNum(plan.deliveredMg)} mg, ${sign}${pct}% from the calculated ${fmtNum(amount.mg)} mg. Consider another strength or a compounded/liquid form.`,
          ko: `${administration.ko} 투여 시 실제 ${fmtNum(plan.deliveredMg)} mg으로, 계산량 ${fmtNum(amount.mg)} mg과 ${sign}${pct}% 차이가 납니다. 다른 함량이나 조제·액상 제형을 고려하십시오.`,
        },
      }
    }
  } else if (amount.ok && amount.dimension === 'count') {
    const s = usedStrength || drug.strengths?.[0]
    const word = s?.form === 'spot-on' ? { en: 'pipette', ko: '피펫' } : { en: amount.perDose.unit, ko: COUNT_WORD[amount.perDose.unit]?.ko || amount.perDose.unit }
    administration = { en: `${countLabel(amount.count)} ${word.en}${amount.count > 1 ? 's' : ''}${s?.form === 'spot-on' ? ' (spot-on)' : ''}`, ko: `${word.ko} ${countLabel(amount.count)}개${s?.form === 'spot-on' ? ' (스팟온)' : ''}` }
  } else if (amount.ok && amount.dimension === 'mass' && amount.mg > 0 && (chosenStrength ? toMg(chosenStrength.amount.value, chosenStrength.amount.unit) != null : routeStrengths(drug, route).length)) {
    // Every listed strength rounds to nothing (e.g. 10 mg from a 50 mg tablet split in halves).
    administration = chosenStrength
      ? {
          en: `The selected ${productText(chosenStrength).en} cannot deliver ${amountText} — choose another strength, or compound or use a liquid`,
          ko: `선택한 ${productText(chosenStrength).ko}로는 ${amountText}을 투여할 수 없습니다 — 다른 함량, 조제 또는 액상 제형을 사용하십시오`,
        }
      : {
          en: `No listed strength can deliver ${amountText} — compound or use a liquid`,
          ko: `등록된 함량으로 ${amountText}을 투여할 수 없습니다 — 조제 또는 액상 제형을 사용하십시오`,
        }
    rounding = { deviation: -1, text: administration }
  } else if (amount.ok) {
    administration = { en: amountText, ko: amountText }
  } else {
    administration = { en: '—', ko: '—' }
  }

  const ref = protocol
    ? {
        min: protocol.dose.min, max: protocol.dose.max, unit: protocol.dose.unit, basis: protocol.dose.basis,
        per: protocol.dose.per || 'dose', frequency: protocol.frequency, route: protocol.route,
        routes: [protocol.route, ...(protocol.altRoutes || [])],
        labelStatus: protocol.labelStatus, source: protocol.source, indication: protocol.indication,
      }
    : null

  return {
    drugId: drug.id,
    protocolId: protocol?.id || null,
    perDose: amount.ok ? amount.perDose : null,
    perDoseMg: amount.ok ? amount.mg : null,
    perDay,
    frequency: frequencyId,
    route,
    administration,
    rounding,
    strengthNote,
    strengthId: plan?.strengthId || null,
    suggestedStrengthId: suggested?.strength?.id || null,
    ref,
    status: amount.ok ? cmp.status : protocol ? 'unit_mismatch' : 'no_reference',
    ratio: cmp.ratio ?? null,
    compared: cmp.compared || null,
    working: amount.working,
    amount,
  }
}

const COUNT_WORD = {
  tablet: { en: 'tablet', ko: '정제' },
  chewable: { en: 'chewable', ko: '츄어블' },
  capsule: { en: 'capsule', ko: '캡슐' },
  pipette: { en: 'pipette', ko: '피펫' },
  application: { en: 'application', ko: '도포' },
}

/** "1 chewable" / "츄어블 1개", "0.5 mL" — the entered product amount, for notes. */
function enteredQty(amount, parsed) {
  if (parsed.dimension === 'volume') return { en: `${fmtNum(amount.ml)} mL`, ko: `${fmtNum(amount.ml)} mL` }
  const w = COUNT_WORD[parsed.numerator] || { en: parsed.numerator, ko: parsed.numerator }
  return { en: `${countLabel(amount.count)} ${w.en}${amount.count > 1 ? 's' : ''}`, ko: `${w.ko} ${countLabel(amount.count)}개` }
}
