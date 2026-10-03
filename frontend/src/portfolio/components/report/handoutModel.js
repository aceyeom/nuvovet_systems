/**
 * Owner handout model: turns a caseInput + analyze() Result into what the
 * handout prints. Pure functions; every clinical value comes from the engine
 * result or the knowledge files, never from here.
 */

import { getDrug, getProtocol } from '../../knowledge/drugs.js'
import { planForStrength, fractionLabel, FREQUENCY_BY_ID } from '../../engine/dose.js'
import { fmtNum, toMg } from '../../engine/units.js'
import { amountCheck } from '../format.js'
import {
  OWNER_FOOD, FOOD_UNKNOWN, ROUTE_TEXT, FREQ_OWNER, FREQ_UNKNOWN, SLOT_LABEL, OWNER_CONDITIONS,
} from './ownerText.js'

const T = (en, ko) => ({ en, ko })

/** Normalised text for comparing owner signs: lower case, punctuation as spaces, padded. */
function norm(text) {
  return ` ${String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `
}

/**
 * True when sign `a` says nothing that sign `b` does not: its normalised text is contained in
 * b's, word for word, in both languages ("구토" ⊂ "구토 또는 식욕 부진", "Vomiting" ⊂ "Vomiting or
 * not eating").
 */
export function signCoveredBy(a, b) {
  if (!a || !b) return false
  const pairs = typeof a === 'string' || typeof b === 'string' ? [[String(a.en ?? a), String(b.en ?? b)]] : [[a.en, b.en], [a.ko, b.ko]]
  return pairs.every(([x, y]) => norm(y).includes(norm(x)))
}

/**
 * Drop exact repeats, then any sign covered by another sign in the same list (keeping the
 * broader one, in its first position).
 */
export function dedupe(list) {
  const seen = new Set()
  const exact = []
  for (const x of list || []) {
    if (!x) continue
    const k = typeof x === 'string' ? x : x.en
    if (seen.has(k)) continue
    seen.add(k)
    exact.push(x)
  }
  return exact.filter((x, i) => !exact.some((y, j) => j !== i && signCoveredBy(x, y) && !(signCoveredBy(y, x) && j > i)))
}

/** Signs not already listed under "Call us immediately" (a sign covered by an emergency sign is dropped). */
export function withoutEmergency(signs, emergency) {
  return (signs || []).filter((s) => !(emergency || []).some((e) => signCoveredBy(s, e)))
}

const COUNT_WORD = {
  tablet: { en: ['tablet', 'tablets'], ko: { noun: '정제', counter: '정' } },
  chewable: { en: ['chewable', 'chewables'], ko: { noun: '츄어블', counter: '개' } },
  capsule: { en: ['capsule', 'capsules'], ko: { noun: '캡슐', counter: '개' } },
}

function strengthLabel(strength) {
  return `${fmtNum(strength.amount.value)} ${strength.amount.unit}`
}

const COUNT_UNIT_WORD = {
  pipette: T(['pipette', 'pipettes'], '피펫'),
  tablet: T(['tablet', 'tablets'], '정'),
  capsule: T(['capsule', 'capsules'], '캡슐'),
  chewable: T(['chewable', 'chewables'], '츄어블'),
  application: T(['application', 'applications'], '회'),
}

/**
 * The amount in owner units, e.g. "1 chewable (68 mcg)", "½ of a 200 mg tablet",
 * "0.72 mL of the 10 mg/mL liquid". confirm = the engine flagged that no
 * strength delivers the calculated amount closely (rounding note) or could
 * not compute an amount, so the vet must write the amount in.
 * med (optional) supplies the prescribed strength when the dose row has none
 * (e.g. a spot-on pipette, which needs no strength plan).
 */
export function ownerAmount(row, med = null) {
  if (!row || !row.perDose) return { text: null, calculated: null, confirm: true }
  const calculated = { en: `${fmtNum(row.perDose.value)} ${row.perDose.unit}`, ko: `${fmtNum(row.perDose.value)} ${row.perDose.unit}` }
  const drug = getDrug(row.drugId)
  const sid = row.strengthId || med?.strengthId || null
  const strength = drug?.strengths?.find((s) => s.id === sid) || null
  // Implausible amounts (a dose or unit typo) are never printed for an owner either.
  const confirm = Boolean(row.rounding) || amountCheck(row)?.kind === 'implausible'

  // Counted units entered directly (pipettes, tablets…): the count is the amount.
  if (row.amount?.dimension === 'count') {
    const n = row.amount.count ?? row.perDose.value
    const unit = strength?.form === 'spot-on' ? 'pipette' : row.amount.perDose?.unit || row.perDose.unit
    const w = COUNT_UNIT_WORD[unit] || T([unit, unit], unit)
    const s = strength && strength.form !== 'spot-on' ? ` (${strengthLabel(strength)})` : ''
    const en = `${fmtNum(n)} ${n > 1 ? w.en[1] : w.en[0]}${s}`
    const ko = w.ko === '정' ? `${fmtNum(n)}정${s}` : `${w.ko} ${fmtNum(n)}개${s}`
    return { text: T(en, ko), calculated: null, confirm }
  }

  const plan = strength && row.perDoseMg != null ? planForStrength(row.perDoseMg, strength) : null
  if (!plan) {
    return { text: null, calculated, confirm: true }
  }

  if (plan.unitLabel === 'mL') {
    const conc = `${fmtNum(toMg(strength.amount.value, strength.amount.unit))} mg/mL`
    return {
      text: T(`${fmtNum(plan.units)} mL of the ${conc} liquid`, `${conc} 액상 ${fmtNum(plan.units)} mL`),
      calculated,
      confirm,
    }
  }

  const words = COUNT_WORD[strength.form] || { en: [strength.form, `${strength.form}s`], ko: { noun: strength.form, counter: '개' } }
  const s = strengthLabel(strength)
  const frac = fractionLabel(plan.units)
  let en
  if (plan.units < 1) en = `${frac} of a ${s} ${words.en[0]}`
  else if (plan.units === 1) en = `1 ${words.en[0]} (${s})`
  else en = `${frac} ${words.en[1]} (${s} each)`
  const ko = `${s} ${words.ko.noun} ${frac}${words.ko.counter}`
  return { text: T(en, ko), calculated, confirm }
}

/** How often, in plain words. */
export function ownerFrequency(freqId) {
  return FREQ_OWNER[freqId] || FREQ_UNKNOWN
}

export function ownerRoute(route) {
  return ROUTE_TEXT[route] || ROUTE_TEXT.PO
}

const SLOTS_BY_FREQ = {
  q24h: ['daily'],
  q48h: ['daily'],
  q72h: ['daily'],
  weekly: ['daily'],
  q12h: ['am', 'pm'],
  q8h: ['n1', 'n2', 'n3'],
  q6h: ['n1', 'n2', 'n3', 'n4'],
  q4h: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
}

const DAY_STEP = { q24h: 1, q12h: 1, q8h: 1, q6h: 1, q4h: 1, q48h: 2, q72h: 3, weekly: 7 }

/**
 * Tick-grid schedule for the first 7 days.
 * mode: 'grid' | 'once' | 'interval' | 'prn' | 'clinic' | 'unknown'
 * days[i] = { day, dosing, inCourse } — a cell is tickable when both are true.
 */
export function scheduleFor(freqId, durationDays, route) {
  if (route === 'IV' || route === 'IM' || freqId === 'cri') return { mode: 'clinic', slots: [], days: [] }
  if (!freqId || !FREQUENCY_BY_ID[freqId]) return { mode: 'unknown', slots: [], days: [] }
  if (freqId === 'once') return { mode: 'once', slots: [], days: [] }
  if (freqId === 'prn') return { mode: 'prn', slots: [], days: [] }
  if (freqId === 'q14d' || freqId === 'monthly') return { mode: 'interval', slots: [], days: [] }
  const slotIds = SLOTS_BY_FREQ[freqId]
  const step = DAY_STEP[freqId] || 1
  const days = []
  for (let d = 1; d <= 7; d++) {
    days.push({
      day: d,
      dosing: (d - 1) % step === 0,
      inCourse: durationDays == null || d <= durationDays,
    })
  }
  return { mode: 'grid', slots: slotIds.map((id) => ({ id, label: SLOT_LABEL[id] })), days }
}

export function ownerFood(drugId) {
  const f = OWNER_FOOD[drugId]
  return f ? { known: true, kind: f.kind, text: f.text, source: f.source } : { known: false, kind: null, text: FOOD_UNKNOWN, source: null }
}

/**
 * What to watch for with one drug: its own owner signs, then the owner signs
 * of findings whose subject is this drug (a finding's first drug — e.g. the
 * ivermectin in "ivermectin + P-gp inhibitor"), so a sign is listed under the
 * medicine that causes it. Every finding sign also goes to the emergency block.
 */
export function watchSigns(drugId, findings) {
  const drug = getDrug(drugId)
  const fromFindings = (findings || []).filter((f) => f.drugIds[0] === drugId).flatMap((f) => f.ownerSigns || [])
  return dedupe([...(drug?.ownerSigns || []), ...fromFindings])
}

/** "Call us immediately if" — generated from the findings' owner signs, most severe finding first. */
export function emergencySigns(findings) {
  return dedupe((findings || []).flatMap((f) => f.ownerSigns || []))
}

export function conditionNotes(conditions) {
  return (conditions || []).filter((id) => OWNER_CONDITIONS[id]).map((id) => ({ id, ...OWNER_CONDITIONS[id] }))
}

/**
 * Is the handout fit to give to an owner? Not while the review has
 * contraindicated or major findings, and amounts flagged by the engine's
 * rounding check must be written in by the vet.
 */
export function handoutReadiness(result) {
  const blocking = result.findings.filter((f) => f.severity === 'contraindicated' || f.severity === 'major')
  const confirmDrugs = result.doses.filter((d) => d.rounding || !d.perDose || amountCheck(d)?.kind === 'implausible').map((d) => d.drugId)
  return { blocked: blocking.length > 0, blocking, confirmDrugs }
}

/** Everything the handout prints, per medicine and overall. */
export function buildHandout(input, result) {
  const emergency = emergencySigns(result.findings)
  const meds = input.meds
    .map((m, i) => {
      const drug = getDrug(m.drugId)
      if (!drug) return null
      const row = result.doses.find((d) => d.drugId === m.drugId) || null
      const protocol = getProtocol(m.drugId, m.protocolId)
      return {
        key: `${m.drugId}-${i}`,
        drugId: m.drugId,
        name: drug.name,
        drugClass: drug.class,
        purpose: protocol?.indication || null,
        amount: ownerAmount(row, m),
        route: ownerRoute(row?.route || m.route),
        frequency: ownerFrequency(row?.frequency ?? null),
        durationDays: m.durationDays ?? null,
        schedule: scheduleFor(row?.frequency ?? null, m.durationDays ?? null, row?.route || m.route),
        food: ownerFood(m.drugId),
        signs: withoutEmergency(watchSigns(m.drugId, result.findings), emergency),
      }
    })
    .filter(Boolean)
  return {
    meds,
    // A condition sign already under "Call us immediately" is not repeated under the condition
    // (Nabi: "Vomiting" under kidney disease and in the emergency box).
    conditions: conditionNotes(input.conditions).map((c) => ({ ...c, watch: withoutEmergency(c.watch, emergency) })),
    emergency,
    readiness: handoutReadiness(result),
  }
}
