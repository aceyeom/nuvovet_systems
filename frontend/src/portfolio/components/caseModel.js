/**
 * Case state for the workbench, report and handout pages.
 *
 * A route `#/case/:id?s=…` resolves to a caseInput: the golden case's input, or
 * the blank case for 'custom', overridden by the state carried in `s`
 * (base64url JSON, see router.js). Only fields that differ from the blank
 * defaults are serialised, which keeps links short.
 */

import { CASE_BY_ID, BLANK_CASE_INPUT } from '../cases/cases.js'
import { DRUG_BY_ID, getDrug, protocolsFor } from '../knowledge/drugs.js'
import { perDayFactor } from '../engine/dose.js'
import { fixFloat } from '../engine/units.js'
import { canonicalJson } from '../engine/hash.js'
import { decodeState, encodeState } from '../router.js'

const MAX_MEDS = 12

function clone(x) {
  return JSON.parse(JSON.stringify(x))
}

function num(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Coerce untrusted (decoded) state into a well-formed caseInput. */
export function sanitizeInput(raw) {
  if (!raw || typeof raw !== 'object') return null
  const base = clone(BLANK_CASE_INPUT)
  const species = raw.species === 'cat' ? 'cat' : 'dog'
  const strOrNull = (v, max = 80) => (typeof v === 'string' ? v.slice(0, max) : null)
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 30) : [])
  const meds = (Array.isArray(raw.meds) ? raw.meds : [])
    .filter((m) => m && typeof m === 'object' && DRUG_BY_ID[m.drugId])
    .slice(0, MAX_MEDS)
    .map((m) => ({
      drugId: m.drugId,
      protocolId: strOrNull(m.protocolId),
      // A null dose stays null (an EMR row with no amount per unit, e.g. "포"): the engine then treats the
      // dose as unknown, which is not the same as an mg/kg dose with a blank value (popup spec §7, E17).
      dose: m.dose == null ? null : { value: num(m.dose.value), unit: strOrNull(m.dose.unit, 16) || 'mg/kg' },
      route: strOrNull(m.route, 16),
      frequency: strOrNull(m.frequency, 24),
      durationDays: num(m.durationDays),
      strengthId: strOrNull(m.strengthId),
    }))
  return {
    ...base,
    species,
    weightKg: num(raw.weightKg),
    breedId: strOrNull(raw.breedId),
    breedText: strOrNull(raw.breedText) || '',
    ageYears: num(raw.ageYears),
    sex: raw.sex === 'male' || raw.sex === 'female' ? raw.sex : null,
    neutered: typeof raw.neutered === 'boolean' ? raw.neutered : null,
    pregnant: raw.pregnant === true,
    lactating: raw.lactating === true,
    conditions: arr(raw.conditions),
    labs: { creatinine: num(raw.labs?.creatinine), alt: num(raw.labs?.alt) },
    allergies: arr(raw.allergies),
    mdr1Status: typeof raw.mdr1Status === 'string' ? raw.mdr1Status : 'unknown',
    meds,
  }
}

/** Drop empty/default fields so the serialised link stays short. */
export function compactInput(input) {
  const out = {}
  for (const [k, v] of Object.entries(input || {})) {
    if (v == null || v === '' || v === false) continue
    if (Array.isArray(v) && v.length === 0 && k !== 'meds') continue
    if (k === 'labs') {
      const labs = {}
      if (v.creatinine != null) labs.creatinine = v.creatinine
      if (v.alt != null) labs.alt = v.alt
      if (Object.keys(labs).length) out.labs = labs
      continue
    }
    if (k === 'mdr1Status' && v === 'unknown') continue
    if (k === 'meds') {
      out.meds = v.map((m) => {
        const c = { drugId: m.drugId }
        if (m.protocolId) c.protocolId = m.protocolId
        c.dose = m.dose
        if (m.route) c.route = m.route
        if (m.frequency) c.frequency = m.frequency
        if (m.durationDays != null) c.durationDays = m.durationDays
        if (m.strengthId) c.strengthId = m.strengthId
        return c
      })
      continue
    }
    out[k] = v
  }
  return out
}

export function sameInput(a, b) {
  return canonicalJson(compactInput(sanitizeInput(a))) === canonicalJson(compactInput(sanitizeInput(b)))
}

/**
 * Resolve a case id + route query.
 * Returns { notFound } or { id, caseDef, isCustom, base, input, fromLink }.
 */
export function resolveCase(id, query) {
  const caseDef = CASE_BY_ID[id] || null
  const isCustom = id === 'custom'
  if (!caseDef && !isCustom) return { notFound: true, id }
  const base = sanitizeInput(isCustom ? BLANK_CASE_INPUT : caseDef.input)
  const decoded = sanitizeInput(decodeState(query?.s))
  return { id, caseDef, isCustom, base, input: decoded || clone(base), fromLink: Boolean(decoded) }
}

/** The `s` value to put in links for this input (null when it equals the base case). */
export function stateParam(input, base) {
  if (sameInput(input, base)) return null
  return encodeState(compactInput(input))
}

// ── Prescription helpers ─────────────────────────────────────────────────────


function firstFreq(f) {
  return Array.isArray(f) ? f[0] : f || null
}

/** Per-dose starting value for a protocol: its minimum (daily totals are divided by doses per day). */
export function protocolStartDose(protocol) {
  if (!protocol) return null
  const freq = firstFreq(protocol.frequency)
  let v = protocol.dose.min
  if (protocol.dose.per === 'day') {
    const f = perDayFactor(freq)
    if (f) v = v / Math.max(1, f)
  }
  return fixFloat(v)
}

/** Point a med at a protocol (or none), keeping the dose when the unit is unchanged. */
export function applyProtocol(med, protocol) {
  if (!protocol) return { ...med, protocolId: null }
  const unitSame = med.dose?.unit === protocol.dose.unit && med.dose?.value != null
  return {
    ...med,
    protocolId: protocol.id,
    dose: unitSame ? med.dose : { value: protocolStartDose(protocol), unit: protocol.dose.unit },
    route: protocol.route || med.route,
    frequency: firstFreq(protocol.frequency) || med.frequency,
    durationDays: protocol.durationDays ?? med.durationDays ?? null,
    strengthId: null,
  }
}

/** A new prescription line with the drug's first protocol for this species. */
export function newMed(drugId, species) {
  const drug = getDrug(drugId)
  const protocol = protocolsFor(drugId, species)[0] || null
  const base = { drugId, protocolId: null, dose: { value: null, unit: 'mg/kg' }, route: 'PO', frequency: null, durationDays: null, strengthId: null }
  if (protocol) return applyProtocol(base, protocol)
  const spot = drug?.strengths?.find((s) => s.form === 'spot-on')
  if (spot) return { ...base, dose: { value: 1, unit: 'pipette' }, route: 'spot-on', frequency: 'once', strengthId: spot.id }
  return base
}

/** After a species change, re-point each line at a protocol for the new species. */
export function remapMedsForSpecies(meds, species) {
  return meds.map((m) => {
    const p = protocolsFor(m.drugId, species)
    if (m.protocolId && p.some((x) => x.id === m.protocolId)) return m
    return p[0] ? applyProtocol({ ...m, dose: { ...m.dose, unit: '' } }, p[0]) : { ...m, protocolId: null }
  })
}
