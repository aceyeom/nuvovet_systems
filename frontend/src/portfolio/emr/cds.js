/**
 * CDS-Hooks-shaped request ⇄ visit model (EMR popup spec §3.3).
 *
 * `toCdsRequest(visit, hook)` builds the request a host EMR would send; `toVisit(request)`
 * inverts it. One MedicationRequest per Rx row and per Tx row whose product code is in the
 * product map (Tx rows without a mapped product, such as procedures, are not medications).
 * The `prefetch` block is CDS-Hooks-shaped, not FHIR: simplified objects, not FHIR resources.
 */

import { PRODUCT_MAP } from './productMap.js'

export const SYSTEM = {
  product: 'urn:demo-emr:product',
  calculated: 'urn:demo-emr:calculated',
  category: 'urn:demo-emr:category',
  dispense: 'urn:demo-emr:dispense',
  protocolChoice: 'urn:nuvovet:protocol-choice',
}

const DISPENSE_CODE = { 정제: 'tablet', 가루: 'powder' }
const DISPENSE_FROM_CODE = { tablet: '정제', powder: '가루' }
const isBlank = (x) => x == null || String(x).trim() === ''
const num = (x) => (isBlank(x) ? undefined : Number.isFinite(Number(x)) ? Number(x) : String(x))

let counter = 0
function uuid() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {
    // fall through
  }
  counter += 1
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`
}

export const encounterIdOf = (visit) => visit.encounterId || `enc-${visit.id || visit.patient?.id || 'visit'}-${visit.date}`

function medicationRequest(row, productMap) {
  const prod = productMap[row.productCode]
  const repeat = {}
  if (!isBlank(row.tt)) Object.assign(repeat, { frequency: num(row.tt), period: 1, periodUnit: 'd' })
  if (!isBlank(row.dy)) repeat.boundsDuration = { value: num(row.dy), unit: 'd' }
  const extension = []
  if (row.calc) extension.push({ url: SYSTEM.calculated, valueQuantity: { value: row.calc.value, unit: row.calc.unit } })
  extension.push({ url: SYSTEM.category, valueCode: row.kind === 'Tx' ? 'Tx' : 'Rx' })
  extension.push({ url: SYSTEM.dispense, valueCode: DISPENSE_CODE[row.dispense] || 'tablet' })
  if (row.protocolChoice) extension.push({ url: SYSTEM.protocolChoice, valueString: row.protocolChoice })
  return {
    resourceType: 'MedicationRequest', id: row.rowId, status: 'draft', intent: 'order',
    medicationCodeableConcept: { coding: [{ system: SYSTEM.product, code: row.productCode, display: prod?.display ?? row.name ?? row.productCode }] },
    dosageInstruction: [{
      text: row.sig || '',
      route: { text: row.rt ?? '' },
      doseAndRate: [{ doseQuantity: { value: isBlank(row.qty) ? null : num(row.qty), unit: row.unit ?? '' } }],
      timing: { repeat },
    }],
    extension,
  }
}

/**
 * toCdsRequest(visit, hook = 'order-select', { userId, productMap, selections, hookInstance }) → CdsRequest.
 * `selections` (order-select only) defaults to every draft order; order-sign has none.
 */
export function toCdsRequest(visit, hook = 'order-select', opts = {}) {
  const productMap = opts.productMap || PRODUCT_MAP
  const p = visit.patient || {}
  const rows = (visit.rows || []).filter((r) => !(r.kind === 'Tx' && !productMap[r.productCode]))
  const entry = rows.map((r) => ({ resource: medicationRequest(r, productMap) }))
  const context = {
    userId: opts.userId || 'Practitioner/demo-kim',
    patientId: p.id ?? null,
    encounterId: encounterIdOf(visit),
    draftOrders: { resourceType: 'Bundle', type: 'collection', entry },
  }
  if (hook === 'order-select') {
    const sel = opts.selections || rows.map((r) => r.rowId)
    context.selections = sel.map((id) => (String(id).startsWith('MedicationRequest/') ? id : `MedicationRequest/${id}`))
  }
  return {
    hook,
    hookInstance: opts.hookInstance || uuid(),
    context,
    prefetch: {
      patient: { id: p.id ?? null, name: p.name ?? '', species: p.species ?? '', breed: p.breed ?? '', sex: p.sex ?? '', birthDate: p.birthDate ?? null },
      weight: p.weight && p.weight.kg != null ? { valueQuantity: { value: p.weight.kg, unit: 'kg' }, effectiveDateTime: p.weight.measuredAt ?? null } : null,
      labs: (p.labs || []).map((l) => ({ code: l.code, value: l.value, unit: l.unit, date: l.date })),
      conditions: (visit.diagnoses || []).map((d) => (d.display ? { code: d.code, display: d.display } : { code: d.code })),
      allergies: (p.allergies || []).map((a) => (a.code ? { code: a.code } : { text: a.text })),
      genotype: { abcb1: p.mdr1 || 'unknown' },
      visitDate: visit.date,
    },
  }
}

const ext = (res, url) => (res.extension || []).find((e) => e.url === url)

/** toVisit(request) → visit model (the inverse of toCdsRequest). */
export function toVisit(request) {
  const pre = request.prefetch || {}
  const ctx = request.context || {}
  const pt = pre.patient || {}
  const rows = (ctx.draftOrders?.entry || []).map((e) => e.resource).filter((r) => r?.resourceType === 'MedicationRequest').map((r) => {
    const di = r.dosageInstruction?.[0] || {}
    const q = di.doseAndRate?.[0]?.doseQuantity || {}
    const rep = di.timing?.repeat || {}
    const calc = ext(r, SYSTEM.calculated)?.valueQuantity
    const row = {
      kind: ext(r, SYSTEM.category)?.valueCode === 'Tx' ? 'Tx' : 'Rx',
      rowId: r.id,
      productCode: r.medicationCodeableConcept?.coding?.[0]?.code ?? '',
      unit: q.unit ?? '',
      qty: q.value == null ? '' : q.value,
      tt: rep.frequency == null ? '' : rep.frequency,
      dy: rep.boundsDuration?.value == null ? '' : rep.boundsDuration.value,
      rt: di.route?.text ?? '',
    }
    if (di.text) row.sig = di.text
    if (calc) row.calc = { value: calc.value, unit: calc.unit }
    const disp = ext(r, SYSTEM.dispense)?.valueCode
    if (disp === 'powder') row.dispense = DISPENSE_FROM_CODE.powder
    const choice = ext(r, SYSTEM.protocolChoice)?.valueString
    if (choice) row.protocolChoice = choice
    return row
  })
  const w = pre.weight?.valueQuantity
  return {
    encounterId: ctx.encounterId ?? null,
    date: pre.visitDate,
    patient: {
      id: pt.id ?? ctx.patientId ?? null, name: pt.name ?? '', species: pt.species ?? '', breed: pt.breed ?? '', sex: pt.sex ?? '', birthDate: pt.birthDate ?? null,
      weight: w && w.value != null ? { kg: Number(w.value), measuredAt: pre.weight.effectiveDateTime ?? null } : null,
      labs: (pre.labs || []).map((l) => ({ ...l })),
      allergies: (pre.allergies || []).map((a) => ({ ...a })),
      mdr1: pre.genotype?.abcb1 || 'unknown',
    },
    diagnoses: (pre.conditions || []).map((c) => ({ ...c })),
    rows,
  }
}
