/**
 * Card suggestions, every one re-checked before it is offered (EMR popup spec §6.3, D3),
 * and the primary/related row split (§6.1).
 *
 * Candidates per card:
 *   1. delete, per involved row ("{drug} 삭제", or "{product} 행 삭제" when the drug has
 *      several rows); never for an in-clinic (Tx) row;
 *   2. strength change: a per-kg row whose engine-suggested strength differs, to the mapped
 *      product for that strength, keeping the per-kg dose;
 *   3. plan change: a count-entered row with a rounding note, to counts that are multiples
 *      of splitStep within ±1 step.
 * A candidate is applied to a copy of the visit and re-run through adapt + analyze. It is
 * offered only if the card's problemKey is gone or its severity drops (for plans: the
 * row's rounding note clears), and no finding is added or raised. At most 2 per card.
 */

import { fnv1a } from '../engine/hash.js'
import { fractionLabel } from '../engine/dose.js'
import { getStrength, DRUG_BY_ID } from '../knowledge/drugs.js'
import { check, COUNT_ENGINE_UNITS } from './adapter.js'
import { PRODUCT_MAP, productDisplay, productFor } from './productMap.js'

const SEV = { contraindicated: 0, major: 1, moderate: 2, minor: 3 }
export const MAX_SUGGESTIONS = 2

const keyset = (c) => new Map((c.supported ? c.result.findings : []).map((f) => [f.problemKey, f.severity]))

/** Rows (with their med index) whose drug is one of drugIds, in prescription order. */
export function rowsOf(c, drugIds) {
  return c.adapter.medRowIds.map((rowId, i) => ({ rowId, i, drugId: c.adapter.caseInput.meds[i].drugId })).filter((r) => drugIds.includes(r.drugId))
}

/** The re-check acceptance test: target gone or lowered, nothing added or raised. */
export function improves(base, after, problemKey) {
  if (!after.supported) return false
  const b = keyset(base)
  const a = keyset(after)
  const gone = !a.has(problemKey) || SEV[a.get(problemKey)] > SEV[b.get(problemKey)]
  const worse = [...a].filter(([k, s]) => !b.has(k) || SEV[s] < SEV[b.get(k)])
  return gone && worse.length === 0
}

/** Nothing added or raised (used for plan changes, whose target is a rounding note). */
function noWorse(base, after) {
  if (!after.supported) return false
  const b = keyset(base)
  return [...keyset(after)].every(([k, s]) => b.has(k) && SEV[s] >= SEV[b.get(k)])
}

export const withoutRows = (visit, rowIds) => ({ ...visit, rows: visit.rows.filter((r) => !rowIds.includes(r.rowId)) })
export const patchRow = (visit, rowId, patch) => ({ ...visit, rows: visit.rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)) })

/**
 * Memoised re-checks of one visit: the same candidate (e.g. "delete rx-1") is shared by
 * the primary/related test and the suggestions of every card, so it runs once.
 */
export function createRechecker(visit, maps) {
  const cache = new Map()
  const run = (key, make) => {
    if (!cache.has(key)) cache.set(key, check(make(), maps))
    return cache.get(key)
  }
  return {
    without: (rowIds) => run(`del:${[...rowIds].sort().join(',')}`, () => withoutRows(visit, rowIds)),
    patch: (rowId, patch) => run(`patch:${rowId}:${JSON.stringify(patch)}`, () => patchRow(visit, rowId, patch)),
  }
}

/** Primary drugs of a finding: deleting all of the drug's rows improves it (§6.1). */
export function primaryDrugs(base, visit, finding, maps, rc = createRechecker(visit, maps)) {
  const involved = rowsOf(base, finding.drugIds)
  return finding.drugIds.filter((d) => {
    const ids = involved.filter((r) => r.drugId === d).map((r) => r.rowId)
    return ids.length > 0 && improves(base, rc.without(ids), finding.problemKey)
  })
}

const hasBatchim = (s) => {
  const ch = String(s).trim().slice(-1)
  const code = ch.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11171) return false
  const jong = code % 28
  return jong !== 0 && jong !== 8 // ㄹ takes 로
}
const ro = (s) => `${s}${hasBatchim(s) ? '으로' : '로'}`

const COUNT_WORD = {
  tablet: { ko: '정', en: ['tablet', 'tablets'] },
  chewable: { ko: '개', en: ['chewable', 'chewables'] },
  capsule: { ko: '캡슐', en: ['capsule', 'capsules'] },
  pipette: { ko: '피펫', en: ['pipette', 'pipettes'] },
}
function countText(n, form, locale) {
  const unit = { 'spot-on': 'pipette' }[form] || form
  const w = COUNT_WORD[unit] || COUNT_WORD.tablet
  return locale === 'en' ? `${fractionLabel(n)} ${n > 1 ? w.en[1] : w.en[0]}` : `${fractionLabel(n)}${w.ko}`
}

const drugName = (id, locale) => DRUG_BY_ID[id]?.name?.[locale] ?? DRUG_BY_ID[id]?.name?.ko ?? id

function label(kind, { drug, product, plan }, locale) {
  if (locale === 'en') {
    if (kind === 'delete') return `Remove ${drug}`
    if (kind === 'deleteRow') return `Remove the ${product} row`
    return `Change to ${plan} of ${product}`
  }
  if (kind === 'delete') return `${drug} 삭제`
  if (kind === 'deleteRow') return `${product} 행 삭제`
  return `${product} ${ro(plan)} 변경`
}

function description(kind, { product, plan }, locale) {
  if (locale === 'en') return kind === 'update' ? `Change the ${product} prescription to ${plan}` : `Remove the ${product} prescription`
  return kind === 'update' ? `${product} 처방을 ${ro(plan)} 변경` : `${product} 처방 삭제`
}

function makeSuggestion({ cardKey, type, rowId, drugId, scope = 'row', patch, labelText, descriptionText }) {
  const id = fnv1a(`${cardKey}|${type}|${rowId}|${JSON.stringify(patch || {})}`)
  return {
    uuid: `sugg-${id}`,
    label: labelText,
    isRecommended: false,
    actions: [type === 'delete'
      ? { type: 'delete', description: descriptionText, resourceId: `MedicationRequest/${rowId}` }
      : { type: 'update', description: descriptionText, resourceId: `MedicationRequest/${rowId}`, patch }],
    extension: { kind: type === 'delete' ? 'delete' : patch.productCode ? 'strength' : 'plan', scope, rowId, drugId, patch: patch || null },
  }
}

const strengthMg = (s) => (s?.amount ? (s.amount.unit === 'mcg' ? s.amount.value / 1000 : s.amount.unit === 'g' ? s.amount.value * 1000 : s.amount.value) : null)

/** Count candidates n = qty ± step (multiples of step, > 0). */
function planCounts(qty, step) {
  return [qty - step, qty + step].map((n) => Math.round(n / step) * step).filter((n) => n > 1e-9)
}

const roundingNoteOf = (c, index) => c.result.notes.find((n) => n.category === 'rounding' && new RegExp(`_${index}$`).test(n.id))

/**
 * Suggestions for one finding of the base check. Returns { suggestions, primaryDrugIds }.
 * `visit` is the visit the base check ran on.
 */
export function cardSuggestions({ base, visit, finding, maps, locale = 'ko', cardKey, rc = createRechecker(visit, maps) }) {
  const productMap = maps?.productMap || PRODUCT_MAP
  const involved = rowsOf(base, finding.drugIds)
  const out = []
  const rowsByDrug = (d) => involved.filter((r) => r.drugId === d).length
  const productOf = (rowId) => productMap[visit.rows.find((r) => r.rowId === rowId)?.productCode]
  // 1. delete, per row
  for (const { rowId, drugId } of involved) {
    if (base.adapter.rows[rowId].inClinic) continue
    if (!improves(base, rc.without([rowId]), finding.problemKey)) continue
    const product = productDisplay(productOf(rowId), locale)
    const kind = rowsByDrug(drugId) > 1 ? 'deleteRow' : 'delete'
    out.push(makeSuggestion({ cardKey, type: 'delete', rowId, drugId, scope: kind === 'delete' ? 'drug' : 'row', labelText: label(kind, { drug: drugName(drugId, locale), product }, locale), descriptionText: description('delete', { product }, locale) }))
  }
  // 2. strength change (per-kg rows only: the per-kg dose is kept)
  for (const { rowId, i, drugId } of involved) {
    const row = base.adapter.rows[rowId]
    if (row.inClinic || !/\/kg$/.test(row.unit || '')) continue
    const dose = base.result.doses[i]
    if (!dose?.suggestedStrengthId || dose.suggestedStrengthId === row.strengthId) continue
    const target = productFor(drugId, dose.suggestedStrengthId, productMap)
    if (!target) continue
    const after = rc.patch(rowId, { productCode: target.code })
    if (!improves(base, after, finding.problemKey)) continue
    const d2 = after.result.doses[after.adapter.medRowIds.indexOf(rowId)]
    const s2 = getStrength(drugId, target.strengthId)
    const units = d2?.deliveredMg != null && strengthMg(s2) ? d2.deliveredMg / strengthMg(s2) : null
    const plan = units ? countText(units, s2?.form, locale) : productDisplay(target, locale)
    const product = productDisplay(target, locale)
    out.push(makeSuggestion({ cardKey, type: 'update', rowId, drugId, patch: { productCode: target.code }, labelText: label('strength', { product, plan }, locale), descriptionText: description('update', { product: productDisplay(productOf(rowId), locale), plan: `${product} ${plan}` }, locale) }))
  }
  // 3. plan change (count-entered rows with a rounding note)
  for (const { rowId, i } of involved) {
    const row = base.adapter.rows[rowId]
    const med = base.adapter.caseInput.meds[i]
    if (row.inClinic || row.powder || !COUNT_ENGINE_UNITS.includes(row.unit) || !med.dose || !roundingNoteOf(base, i)) continue
    for (const n of planCounts(med.dose.value, row.splitStep)) {
      const after = rc.patch(rowId, { qty: n })
      if (!improves(base, after, finding.problemKey)) continue
      const strength = getStrength(row.drugId, row.strengthId)
      const product = productDisplay(productOf(rowId), locale)
      const plan = countText(n, strength?.form, locale)
      out.push(makeSuggestion({ cardKey, type: 'update', rowId, drugId: row.drugId, patch: { qty: n }, labelText: label('strength', { product, plan }, locale), descriptionText: description('update', { product, plan }, locale) }))
    }
  }
  const offered = out.slice(0, MAX_SUGGESTIONS)
  if (offered[0]) offered[0].isRecommended = true
  return offered
}

/**
 * Plan suggestions for rows that carry a rounding note but no card (§6.3 candidate 3):
 * offered only if the row's rounding note clears and no finding is added or raised.
 * Returns { [rowId]: Suggestion[] }.
 */
export function rowPlanSuggestions({ base, visit, maps, locale = 'ko', rc = createRechecker(visit, maps) }) {
  const productMap = maps?.productMap || PRODUCT_MAP
  const out = {}
  base.adapter.medRowIds.forEach((rowId, i) => {
    const row = base.adapter.rows[rowId]
    const med = base.adapter.caseInput.meds[i]
    if (row.inClinic || row.powder || !COUNT_ENGINE_UNITS.includes(row.unit) || !med.dose || !roundingNoteOf(base, i)) return
    const list = []
    for (const n of planCounts(med.dose.value, row.splitStep)) {
      const after = rc.patch(rowId, { qty: n })
      if (!noWorse(base, after) || roundingNoteOf(after, after.adapter.medRowIds.indexOf(rowId))) continue
      const strength = getStrength(row.drugId, row.strengthId)
      const product = productDisplay(productMap[row.productCode], locale)
      const plan = countText(n, strength?.form, locale)
      list.push(makeSuggestion({ cardKey: `rounding:${rowId}`, type: 'update', rowId, drugId: row.drugId, patch: { qty: n }, labelText: label('strength', { product, plan }, locale), descriptionText: description('update', { product, plan }, locale) }))
    }
    if (list.length) {
      const offered = list.slice(0, MAX_SUGGESTIONS)
      offered[0].isRecommended = true
      out[rowId] = offered
    }
  })
  return out
}
