/**
 * EMR visit → engine caseInput (+ per-row status). Pure; no DOM, no network.
 *
 * Port of the reference adapter (EMR popup spec Appendix C, revision 2), which
 * produced the §8.1 binding outputs. The rules it implements are spec §4:
 * strength and concentration come only from the product map, frequency from
 * 용법 + 횟수 Tt (higher frequency on conflict), protocol by route/frequency/
 * diagnosis/product default, and every unmapped, stale, ambiguous or free-text
 * input makes the review incomplete instead of being guessed.
 *
 * Additive to Appendix C (no effect on any §8.1 output):
 * - `adapt(visit, maps)` / `check(visit, maps)` take an optional
 *   `{ productMap, conditionMap }` (the SDK's options); defaults are Appendix A.
 * - `visitDetail` carries the parameters the confirm texts need (allergy text,
 *   diagnosis code/display, lab age); `rows[rowId]` also carries `productCode`,
 *   `splitStep`, `tt` and `unit`.
 * - A blank Qty gives `dose: null` (Appendix C's `Number('')` would send 0).
 */

import { analyze, normalizeFrequency, getDrug, getStrength, protocolsFor, resolveBreed, splitStep } from '../engine/index.js'
import { CONDITION_BY_ID, CREATININE_UPPER } from '../knowledge/conditions.js'
import { ALLERGY_BY_ID } from '../knowledge/allergyClasses.js'
import { DRUGS } from '../knowledge/drugs.js'
import { PRODUCT_MAP } from './productMap.js'
import { CONDITION_MAP, PROTOCOL_CONDITIONS, SAME_INDICATION } from './conditionMap.js'

const TT_TO_FREQ = { 1: 'q24h', 2: 'q12h', 3: 'q8h', 4: 'q6h', 6: 'q4h' }
const PER_DAY = { q4h: 6, q6h: 4, q8h: 3, q12h: 2, q24h: 1 } // schedules given every day
const LESS_THAN_DAILY = ['q48h', 'q72h', 'weekly', 'q14d', 'monthly', 'once']
/** Unit text as the EMR may type it: compatibility glyphs (㎎, ㎏, ㎖) folded, spaces dropped, lower case. */
const unitKey = (u) => String(u ?? '').normalize('NFKC').replace(/\s+/g, '').toLowerCase()
const PASS_UNITS = Object.fromEntries(Object.entries({
  'mg/kg': 'mg/kg', 'mcg/kg': 'mcg/kg', 'ug/kg': 'mcg/kg', 'µg/kg': 'mcg/kg', 'μg/kg': 'mcg/kg', 'iu/kg': 'IU/kg', 'ml/kg': 'mL/kg', 'cc/kg': 'mL/kg',
  mg: 'mg', mcg: 'mcg', ug: 'mcg', 'µg': 'mcg', 'μg': 'mcg', ml: 'mL', cc: 'mL', g: 'g', iu: 'IU',
}).map(([k, v]) => [unitKey(k), v]))
const COUNT_UNITS = ['ea', 't', 'tab', '정', '캡슐', 'cap', '개']
const CONFIRM_UNITS = ['포', '앰플', 'amp', '바이알', 'vial', 'gtt', '방울']
const FORM_TO_COUNT = { tablet: 'tablet', chewable: 'chewable', capsule: 'capsule', 'spot-on': 'pipette' }
export const COUNT_ENGINE_UNITS = ['tablet', 'capsule', 'chewable', 'pipette']
const ROUTES = { PO: 'PO', IV: 'IV', SC: 'SC', IM: 'IM' }
/** Route words the EMR commonly types for the same four routes (review F10). */
const ROUTE_ALIASES = {
  SQ: 'SC', SUBQ: 'SC', SUBCUT: 'SC', '피하': 'SC', '피하주사': 'SC',
  'P.O.': 'PO', '경구': 'PO', '내복': 'PO', ORAL: 'PO',
  '정맥': 'IV', '정맥주사': 'IV', '정주': 'IV',
  '근육': 'IM', '근육주사': 'IM', '근주': 'IM',
}
/** Allergy entries that record "no known allergy" (not a free-text allergy to review). */
const NO_ALLERGY = new Set(['없음', '무', '해당없음', '알레르기없음', '알러지없음', 'none', 'nka', 'nkda', 'nil', '-', '–'])
/**
 * Body-weight plausibility (review F5): above these the weight is almost
 * certainly a typing slip, so the visit is marked incomplete. Not a clinical
 * limit; nothing is blocked and every check still runs.
 */
export const WEIGHT_PLAUSIBLE_MAX = { dog: 100, cat: 15 }

export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
const freqList = (p) => (Array.isArray(p.frequency) ? p.frequency : [p.frequency])
const perDayOf = (id) => (id === 'once' ? 1 : PER_DAY[id] ?? (id === 'q48h' ? 0.5 : id === 'q72h' ? 1 / 3 : id === 'weekly' ? 1 / 7 : id === 'q14d' ? 1 / 14 : id === 'monthly' ? 1 / 30 : null))

// ── Exact-key text recognition (C4). No fuzzy matching: a key must equal the normalised text. ──
export const norm = (s) => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[\s·.,/_-]/g, '')
  .replace(/(알레르기|알러지|과민반응|과민증|allergy|allergic)$/, '').replace(/계$/, '').replace(/s$/, '')

let allergyKeyCache = null
function allergyKeys() {
  if (allergyKeyCache) return allergyKeyCache
  const m = new Map()
  for (const a of Object.values(ALLERGY_BY_ID)) for (const t of [a.id, a.label.ko, a.label.en, ...(a.aliases || [])]) m.set(norm(t), a.id)
  for (const d of DRUGS) if (d.flags?.allergyClass) for (const t of [d.id, d.name.ko, d.name.en, ...(d.aliases || [])]) m.set(norm(t), d.flags.allergyClass)
  allergyKeyCache = m
  return m
}
const conditionKeyCache = {}
function conditionKeys(species) {
  if (conditionKeyCache[species]) return conditionKeyCache[species]
  const m = new Map()
  for (const c of Object.values(CONDITION_BY_ID)) {
    if (c.species && !c.species.includes(species)) continue
    for (const t of [c.label.ko, c.label.en, ...(c.aliases || [])]) m.set(norm(t), c.id)
  }
  conditionKeyCache[species] = m
  return m
}

// ── Field mappers (§4.1, §4.2) ──

export function mapSpecies(text) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return { species: null, reason: 'species_missing' }
  if (['canine', 'dog', '개', '견', '강아지', '반려견'].includes(t)) return { species: 'dog' }
  if (['feline', 'cat', '고양이', '묘', '반려묘'].includes(t)) return { species: 'cat' }
  return { species: null, reason: 'species_unsupported' }
}

export function mapSex(text) {
  const t = String(text || '').toLowerCase()
  if (t.startsWith('spayed')) return { sex: 'female', neutered: true }
  if (t.startsWith('neutered')) return { sex: 'male', neutered: true }
  if (t.startsWith('intact female')) return { sex: 'female', neutered: false }
  if (t.startsWith('intact male')) return { sex: 'male', neutered: false }
  return { sex: null, neutered: null }
}

export function mapUnit(rawUnit, strength) {
  const k = unitKey(rawUnit)
  if (PASS_UNITS[k]) return { unit: PASS_UNITS[k] }
  if (COUNT_UNITS.includes(k)) {
    const cu = strength ? FORM_TO_COUNT[strength.form] : null
    return cu ? { unit: cu } : { confirm: 'unit_count_liquid' }
  }
  if (CONFIRM_UNITS.includes(k)) return { confirm: 'unit_needs_record' }
  return { confirm: 'unit_unknown' }
}

/**
 * C3 + M1: 용법 and Tt are both read; a conflict is flagged and the HIGHER frequency is used.
 * A single-administration 용법 ("1회", "단회", "stat") with 일수 > 1 is a conflict too: it is
 * checked at the daily schedule the 횟수 implies (once a day when 횟수 is blank), never as
 * one dose (review F1). A 용법 that cannot be read is flagged, not ignored (review F7).
 */
export function mapFrequency({ sig, tt, dy }) {
  const sigText = sig == null ? '' : String(sig).trim()
  const s = sigText ? normalizeFrequency(sigText) : null
  const sigId = s && s.ok ? s.id : null
  const sigUnread = Boolean(sigText) && !sigId
  const hasTt = !(tt == null || String(tt).trim() === '')
  const n = hasTt ? Number(tt) : null
  let ttId = null
  let single = false
  if (hasTt) {
    if (n === 1 && Number(dy) === 1) { ttId = 'once'; single = true } else ttId = TT_TO_FREQ[n] || null
  }
  if (sigId === 'once' && Number(dy) > 1) {
    const daily = hasTt ? ttId : 'q24h'
    return daily ? { frequency: daily, confirm: 'freq_conflict' } : { frequency: null, confirm: 'freq_unmapped' }
  }
  if (sigUnread) {
    const r = !hasTt ? { frequency: null, confirm: 'freq_missing' } : ttId ? { frequency: ttId, singleAdministration: single } : { frequency: null, confirm: 'freq_unmapped' }
    return { ...r, extraConfirm: 'sig_unrecognised' }
  }
  if (sigId && hasTt) {
    if (sigId === 'prn') return ttId ? { frequency: ttId === 'once' ? 'q24h' : ttId, note: 'prn_max_per_day' } : { frequency: 'prn' }
    const compatible = PER_DAY[sigId] != null ? PER_DAY[sigId] === n : LESS_THAN_DAILY.includes(sigId) ? n === 1 : false
    if (compatible) return { frequency: sigId }
    const hi = ttId && perDayOf(ttId) > perDayOf(sigId) ? ttId : sigId
    return { frequency: hi, singleAdministration: hi === 'once' && single, confirm: 'freq_conflict' }
  }
  if (sigId) return { frequency: sigId }
  if (!hasTt) return { frequency: null, confirm: 'freq_missing' }
  if (ttId) return { frequency: ttId, singleAdministration: single }
  return { frequency: null, confirm: 'freq_unmapped' }
}

export function mapRoute(rt, strength) {
  const r = String(rt || '').trim()
  const up = r.toUpperCase()
  if (ROUTES[up]) return { route: ROUTES[up] }
  if (ROUTE_ALIASES[up] || ROUTE_ALIASES[r]) return { route: ROUTE_ALIASES[up] || ROUTE_ALIASES[r] }
  if (/^top$/i.test(r)) return { route: strength?.form === 'spot-on' ? 'spot-on' : 'topical' }
  if (/^(eye|ear|inh)$/i.test(r)) return { route: r, confirm: 'route_no_reference' }
  if (r) return { route: null, confirm: 'route_unrecognised' }
  return { route: null, confirm: 'route_missing' }
}

/** Protocol policy (§4.2 steps 1–9). */
export function chooseProtocol({ drugId, species, route, frequency, singleAdministration, conditionIds, choice, defaultProtocolId }) {
  const all = protocolsFor(drugId, species)
  if (choice) return { protocolId: choice, how: 'chosen' }
  let c = all.filter((p) => [p.route, ...(p.altRoutes || [])].includes(route))
  if (!c.length) return { protocolId: null, confirm: all.length ? 'protocol_route' : 'protocol_none', options: all.map((p) => p.id) }
  if (defaultProtocolId && c.some((p) => p.id === defaultProtocolId)) return { protocolId: defaultProtocolId, how: 'product_default' }
  // H2 / D11: a repeated schedule against single-dose-only references → no reference (unless the label itself forbids repeating).
  const repeated = frequency && !['once', 'prn', 'cri'].includes(frequency)
  if (repeated && c.every((p) => freqList(p).every((f) => f === 'once')) && !c.some((p) => p.repeatPolicy === 'label_single_only')) {
    return { protocolId: null, confirm: 'protocol_repeat_none', options: c.map((p) => p.id) }
  }
  // M1: Tt1 + Dy1 is one administration; it does not by itself select a single-dose (loading) protocol over a daily one.
  const sameFreq = c.filter((p) => freqList(p).includes(frequency))
  if (sameFreq.length && !(singleAdministration && sameFreq.length < c.length)) c = sameFreq
  if (c.length > 1) {
    const linked = c.filter((p) => (PROTOCOL_CONDITIONS[p.id] || []).some((x) => conditionIds.includes(x)))
    if (linked.length) c = linked
  }
  if (c.length === 1) return { protocolId: c[0].id, how: 'auto' }
  const group = SAME_INDICATION.find((g) => c.every((p) => g.ids.includes(p.id)))
  if (group) return { protocolId: group.primary, how: 'same_indication', label: group.label }
  return { protocolId: null, confirm: 'protocol_indication', options: c.map((p) => p.id) }
}

const isBlank = (x) => x == null || String(x).trim() === ''

/**
 * adapt(visit) → { supported:false, reason } | { supported:true, rows, unmapped, adapterNotes, visitConfirm,
 *   visitDetail, unmappedDx, labDates, caseInput, medRowIds }
 */
export function adapt(visit, { productMap = PRODUCT_MAP, conditionMap = CONDITION_MAP } = {}) {
  const p = visit.patient || {}
  const sp = mapSpecies(p.species)
  if (!sp.species) return { supported: false, reason: sp.reason }
  const species = sp.species
  const adapterNotes = []
  const visitConfirm = []
  const visitDetail = []
  const visitReason = (key, detail = {}) => { visitConfirm.push(key); visitDetail.push({ key, ...detail }) }

  let breedId = null
  for (const h of String(p.breed || '').split('/').map((s) => s.trim()).filter(Boolean)) {
    breedId = resolveBreed(h, species)
    if (breedId) break
  }
  if (!breedId && species === 'dog') adapterNotes.push('breed_unresolved')
  const { sex, neutered } = mapSex(p.sex)
  const ageYears = p.birthDate ? Math.floor((daysBetween(p.birthDate, visit.date) / 365.25) * 10) / 10 : null
  if (ageYears != null && ageYears < 1) visitReason('age_under_1y')
  const weightKg = p.weight?.kg ?? null
  if (Number(weightKg) > WEIGHT_PLAUSIBLE_MAX[species]) visitReason('weight_implausible', { kg: Number(weightKg) })
  const staleDays = ageYears != null && ageYears < 0.5 ? 14 : 30
  let weightAgeDays = null
  if (weightKg != null && p.weight.measuredAt) {
    weightAgeDays = daysBetween(p.weight.measuredAt, visit.date)
    if (weightAgeDays > staleDays) adapterNotes.push('weight_stale')
  }

  const labs = {}
  const labDates = {}
  const seenLab = new Set()
  const labTime = (l) => { const t = Date.parse(l.date); return Number.isFinite(t) ? t : -Infinity } // undated results sort last
  for (const l of [...(p.labs || [])].sort((a, b) => labTime(b) - labTime(a))) {
    if (seenLab.has(l.code)) continue // most recent value per test only
    seenLab.add(l.code)
    const value = l.code === 'creatinine' && /mol/i.test(l.unit) ? Math.round((l.value / 88.4) * 100) / 100 : l.value
    const age = daysBetween(l.date, visit.date)
    // An undated result is used (an abnormal value still counts) but never taken as current (review F12).
    if (!Number.isFinite(age) && (l.code === 'creatinine' || l.code === 'alt')) visitReason(`lab_undated_${l.code}`, { code: l.code, value })
    if (age > 90) {
      visitReason(`lab_stale_${l.code}`, { code: l.code, days: age, value, unit: l.code === 'creatinine' ? 'mg/dL' : l.unit, date: l.date })
      const upper = l.code === 'creatinine' ? CREATININE_UPPER[species]?.value : null
      if (upper == null || value < upper) continue // stale and not abnormal → not used
    }
    if (l.code === 'creatinine' || l.code === 'alt') { labs[l.code] = value; labDates[l.code] = l.date }
  }

  const conditions = []
  const unmappedDx = []
  const cKeys = conditionKeys(species)
  for (const d of visit.diagnoses || []) {
    const c = conditionMap[d.code]
    if (c && CONDITION_BY_ID[c]) { conditions.push(c); continue }
    const t = cKeys.get(norm(d.display))
    if (d.display && t) { conditions.push(t); visitReason(`dx_text_recognised:${d.code}`, { code: d.code, display: d.display, conditionId: t }) } else unmappedDx.push(d.code)
  }

  const allergies = []
  const aKeys = allergyKeys()
  for (const a of p.allergies || []) {
    if (a.code && ALLERGY_BY_ID[a.code]) { allergies.push(a.code); continue }
    if (!a.code && NO_ALLERGY.has(unitKey(a.text))) continue // "없음", "NKA": no allergy recorded
    const t = aKeys.get(norm(a.text))
    if (a.text && t) { allergies.push(t); visitReason('allergy_text_recognised', { text: a.text, allergyId: t }) } else visitReason('allergy_free_text', { text: a.text ?? a.code ?? '' })
  }

  const meds = []
  const rows = {}
  const unmapped = []
  for (const row of visit.rows || []) {
    const prod = productMap[row.productCode]
    if (row.kind === 'Tx' && !prod) continue // procedures, labs: not medications
    if (!prod || !getDrug(prod.drugId)) { unmapped.push({ rowId: row.rowId, code: row.productCode }); continue }
    const strength = getStrength(prod.drugId, prod.strengthId)
    const confirm = []
    const notes = []
    const powder = row.dispense === '가루'
    const u = mapUnit(row.unit, strength)
    if (u.confirm) confirm.push(u.confirm)
    const f = mapFrequency(row)
    if (f.confirm) confirm.push(f.confirm)
    if (f.extraConfirm) confirm.push(f.extraConfirm)
    if (f.note) notes.push(f.note)
    const rt = mapRoute(row.rt, strength)
    if (rt.confirm) confirm.push(rt.confirm)
    const qty = isBlank(row.qty) ? NaN : Number(row.qty)
    if (qty === 0) confirm.push('dose_zero') // a zero amount is a missing amount, not a low dose (review F12)
    const step = strength ? splitStep(strength) : 1
    if (!powder && u.unit && COUNT_ENGINE_UNITS.includes(u.unit) && strength && Number.isFinite(qty)) {
      if (Math.abs(qty / step - Math.round(qty / step)) > 1e-9) confirm.push('split_not_allowed')
    }
    const pr = chooseProtocol({
      drugId: prod.drugId, species, route: rt.route, frequency: f.frequency, singleAdministration: f.singleAdministration,
      conditionIds: conditions, choice: row.protocolChoice, defaultProtocolId: prod.defaultProtocolId,
    })
    if (pr.confirm) confirm.push(pr.confirm)
    if (pr.label) notes.push(pr.label)
    if (powder) notes.push('powder')
    if (row.calc && u.unit && /\/kg$/.test(u.unit) && weightKg) {
      const factor = { 'mg/kg': 1, 'mcg/kg': 0.001 }[u.unit]
      const calcMg = row.calc.unit === 'mcg' ? row.calc.value / 1000 : row.calc.value
      const expected = qty * (factor ?? 0) * weightKg
      if (factor && Math.abs(expected - calcMg) > Math.max(0.01 * expected, 0.05)) notes.push('calc_mismatch')
    }
    rows[row.rowId] = {
      drugId: prod.drugId, protocolId: pr.protocolId, confirm, notes, options: pr.options || null, inClinic: row.kind === 'Tx', powder,
      productCode: row.productCode, strengthId: prod.strengthId, unit: u.unit || null, splitStep: step, tt: row.tt, how: pr.how || null,
    }
    meds.push({
      rowId: row.rowId, drugId: prod.drugId, protocolId: pr.protocolId, dose: u.unit && Number.isFinite(qty) && qty > 0 ? { value: qty, unit: u.unit } : null,
      route: rt.route, frequency: f.frequency, durationDays: row.dy ? Number(row.dy) : null, strengthId: prod.strengthId,
    })
  }
  return {
    supported: true, rows, unmapped, adapterNotes, visitConfirm, visitDetail, unmappedDx, labDates, weightAgeDays,
    caseInput: {
      species, weightKg, breedId, breedText: p.breed || '', ageYears, sex, neutered, pregnant: false, lactating: false,
      conditions, labs, allergies, mdr1Status: p.mdr1 || 'unknown', meds: meds.map(({ rowId, ...m }) => m),
    },
    medRowIds: meds.map((m) => m.rowId),
  }
}

export const INCOMPLETE_MISSING = /^(weightKg|protocol\.|frequency\.)/

/**
 * check(visit) → { supported:false, reason } | { supported:true, adapter, result, complete, incompleteReasons, visitReasons }
 * Incomplete reasons in the order: validation notes, missing factors, row confirm reasons, unmapped products, visit reasons.
 */
export function check(visit, maps) {
  const a = adapt(visit, maps)
  if (!a.supported) return { supported: false, reason: a.reason }
  const r = analyze(a.caseInput)
  const validation = r.notes.filter((n) => n.category === 'validation').map((n) => n.id)
  const missing = r.trace.factorsMissing.filter((m) => INCOMPLETE_MISSING.test(m))
  const rowConfirm = Object.entries(a.rows).filter(([, v]) => v.confirm.length).map(([k, v]) => `${k}:${v.confirm.join('+')}`)
  const mlPrescribed = a.caseInput.meds.some((m) => getDrug(m.drugId)?.flags?.mdr1Sensitive)
  const visitReasons = [...a.visitConfirm, ...a.unmappedDx.map((c) => `dx_unmapped:${c}`),
    ...(a.adapterNotes.includes('breed_unresolved') && mlPrescribed ? ['breed_unresolved'] : [])]
  const incompleteReasons = [...validation, ...missing, ...rowConfirm, ...a.unmapped.map((u) => `unmapped:${u.code}`), ...visitReasons]
  return { supported: true, adapter: a, result: r, complete: incompleteReasons.length === 0, incompleteReasons, visitReasons }
}
