/**
 * Appendix A integrity, the coverage-strip rule registry (§6.2), the CDS-Hooks-shaped
 * request round trip (§3.3) and the demo visits V1–V10 (§2.6).
 */
import { describe, it, expect } from 'vitest'
import { PRODUCTS, PRODUCT_MAP, buildProductMap } from '../productMap.js'
import { CONDITION_MAP, PROTOCOL_CONDITIONS, SAME_INDICATION } from '../conditionMap.js'
import { RULE_COVERAGE, LAYER_COVERAGE, COVERAGE_ITEMS } from '../coverage.js'
import { toCdsRequest, toVisit } from '../cds.js'
import { check } from '../adapter.js'
import { SCENARIOS, VISITS, VISIT_IDS, loadVisit } from '../fixtures.js'
import { fmtCheck } from './format.js'
import { DRUG_BY_ID, protocolsFor, getProtocol } from '../../knowledge/drugs.js'
import { CONDITION_BY_ID } from '../../knowledge/conditions.js'
import { RULES, RULE_LAYERS } from '../../engine/index.js'

describe('productMap (Appendix A.1)', () => {
  it('has the 38 Appendix A products with unique fictional codes', () => {
    expect(PRODUCTS).toHaveLength(38)
    expect(new Set(PRODUCTS.map((p) => p.code)).size).toBe(38)
    expect(buildProductMap(PRODUCTS)).toEqual(PRODUCT_MAP)
  })
  it.each(PRODUCTS.map((p) => [p.code, p]))('%s: strengthId exists in the drug; defaultProtocolId exists', (code, p) => {
    const drug = DRUG_BY_ID[p.drugId]
    expect(drug).toBeTruthy()
    expect(drug.strengths.map((s) => s.id)).toContain(p.strengthId)
    expect(p.display).toBeTruthy()
    expect(p.displayEn).toBeTruthy()
    if (p.defaultProtocolId) {
      const ids = [...protocolsFor(p.drugId, 'dog'), ...protocolsFor(p.drugId, 'cat')].map((x) => x.id)
      expect(ids).toContain(p.defaultProtocolId)
    }
  })
  it('only the chewable heartworm products carry a default protocol', () => {
    expect(PRODUCTS.filter((p) => p.defaultProtocolId).map((p) => p.code)).toEqual(['RX-IVM-CH68', 'RX-IVM-CH136', 'RX-IVM-CH272'])
  })
})

describe('conditionMap (Appendix A.2)', () => {
  it('every mapped code is an engine condition', () => {
    expect(Object.keys(CONDITION_MAP)).toHaveLength(15)
    for (const id of Object.values(CONDITION_MAP)) expect(CONDITION_BY_ID[id]).toBeTruthy()
  })
  it('PROTOCOL_CONDITIONS and SAME_INDICATION name real protocols and conditions', () => {
    for (const [pid, conds] of Object.entries(PROTOCOL_CONDITIONS)) {
      const drugId = Object.values(DRUG_BY_ID).find((d) => (d.protocols || []).some((p) => p.id === pid))?.id
      expect(drugId, pid).toBeTruthy()
      for (const c of conds) expect(CONDITION_BY_ID[c]).toBeTruthy()
    }
    for (const g of SAME_INDICATION) {
      for (const id of g.ids) expect(getProtocol('amoxicillin_clavulanate', id)?.id).toBe(id)
      expect(g.ids).toContain(g.primary)
    }
  })
})

describe('coverage registry (§6.2)', () => {
  it('every engine rule maps to one strip item (or null for notes-only rules)', () => {
    for (const r of RULES) {
      expect(Object.prototype.hasOwnProperty.call(RULE_COVERAGE, r.id), `${r.id} missing from RULE_COVERAGE`).toBe(true)
      const item = RULE_COVERAGE[r.id]
      if (item === null) expect(r.layer).toBe('notes')
      else {
        expect(COVERAGE_ITEMS).toContain(item)
        expect(LAYER_COVERAGE[r.layer], `${r.id} layer ${r.layer}`).toContain(item)
      }
    }
    expect(Object.keys(RULE_COVERAGE).sort()).toEqual(RULES.map((r) => r.id).sort())
  })
  it('every engine layer is mapped', () => {
    expect(Object.keys(LAYER_COVERAGE).sort()).toEqual(Object.keys(RULE_LAYERS).sort())
  })
})

describe('CDS-Hooks-shaped request (§3.3)', () => {
  it('V1 order-select has the §3.3 shape', () => {
    const req = toCdsRequest(VISITS.V1, 'order-select', { hookInstance: 'x' })
    expect(req).toMatchObject({
      hook: 'order-select', hookInstance: 'x',
      context: { userId: 'Practitioner/demo-kim', patientId: '1042', encounterId: 'enc-V1-2026-10-03', selections: ['MedicationRequest/rx-1', 'MedicationRequest/rx-2'] },
      prefetch: {
        patient: { id: '1042', name: '초코', species: 'Canine', breed: 'ROUGH COLLIE/러프 콜리', sex: 'Neutered Male', birthDate: '2022-05-14' },
        weight: { valueQuantity: { value: 24, unit: 'kg' }, effectiveDateTime: '2026-10-03' },
        conditions: [{ code: 'D-DERM-012', display: '전신성 모낭충증' }, { code: 'D-EAR-004', display: expect.any(String) }],
        genotype: { abcb1: 'unknown' }, visitDate: '2026-10-03',
      },
    })
    const mr = req.context.draftOrders.entry[1].resource
    expect(mr).toMatchObject({
      resourceType: 'MedicationRequest', id: 'rx-2', status: 'draft', intent: 'order',
      medicationCodeableConcept: { coding: [{ system: 'urn:demo-emr:product', code: 'RX-KTZ-T200', display: '케토코나졸 정 200 mg' }] },
      dosageInstruction: [{ text: '', route: { text: 'PO' }, doseAndRate: [{ doseQuantity: { value: 5, unit: 'mg/kg' } }], timing: { repeat: { frequency: 2, period: 1, periodUnit: 'd', boundsDuration: { value: 21, unit: 'd' } } } }],
    })
    expect(mr.extension).toEqual([
      { url: 'urn:demo-emr:calculated', valueQuantity: { value: 120, unit: 'mg' } },
      { url: 'urn:demo-emr:category', valueCode: 'Rx' },
      { url: 'urn:demo-emr:dispense', valueCode: 'tablet' },
    ])
  })
  it('order-sign has no selections; blank Tt/Dy are omitted; Tx procedures are not sent', () => {
    const req = toCdsRequest(SCENARIOS.E27, 'order-sign')
    expect(req.context.selections).toBeUndefined()
    expect(req.context.draftOrders.entry.map((e) => e.resource.id)).toEqual(['tx-1', 'rx-1'])
    const blank = toCdsRequest(SCENARIOS.E16, 'order-sign')
    expect(blank.context.draftOrders.entry[0].resource.dosageInstruction[0].timing.repeat).toEqual({ boundsDuration: { value: 7, unit: 'd' } })
    expect(blank.context.draftOrders.entry.map((e) => e.resource.id)).toEqual(['rx-1', 'rx-2']) // unmapped Rx rows are sent
  })
  it('a protocol choice and 가루 travel as extensions', () => {
    const v0 = { ...SCENARIOS.E51, rows: SCENARIOS.E51.rows.map((r) => (r.rowId === 'rx-3' ? { ...r, protocolChoice: 'maro_cat_ckd_po' } : r)) }
    const ext = toCdsRequest(v0).context.draftOrders.entry[2].resource.extension
    expect(ext).toContainEqual({ url: 'urn:demo-emr:dispense', valueCode: 'powder' })
    expect(ext).toContainEqual({ url: 'urn:nuvovet:protocol-choice', valueString: 'maro_cat_ckd_po' })
  })
  it.each(Object.keys(SCENARIOS))('%s: toVisit(toCdsRequest(visit)) gives the same check', (id) => {
    const back = toVisit(toCdsRequest(SCENARIOS[id], 'order-sign'))
    expect(fmtCheck(id, check(back))).toBe(fmtCheck(id, check(SCENARIOS[id])))
  })
})

describe('demo visits V1–V10 (§2.6)', () => {
  it('ten visits, each the E0x scenario with display data', () => {
    expect(VISIT_IDS).toEqual(['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10'])
    VISIT_IDS.forEach((vid, i) => {
      const e = `E${String(i + 1).padStart(2, '0')}`
      expect(fmtCheck(e, check(VISITS[vid]))).toBe(fmtCheck(e, check(SCENARIOS[e])))
      expect(VISITS[vid].encounterId).toBe(`enc-${vid}-2026-10-03`)
      expect(VISITS[vid].diagnoses.every((d) => d.display)).toBe(true)
    })
    expect(VISITS.V1.patient).toMatchObject({ guardian: '이○○', remarks: 'MDR1 미검사' })
  })
  it('loadVisit returns an independent copy', () => {
    const a = loadVisit('V1')
    a.rows.pop()
    expect(loadVisit('V1').rows).toHaveLength(2)
    expect(loadVisit('nope').id).toBe('V1')
  })
})
