/**
 * Host-only catalogue data of the fictional EMR "데모 차트 (가상 EMR)" (EMR popup spec §2.4).
 *
 * The DUR never reads anything here: strength and concentration reach the engine only through
 * the product code (`productMap`, Appendix A). This file holds what a desktop EMR shows next to
 * a product: its 폴더명, form suffix, default unit and route, and a fictional unit price
 * ("가상 단가"). Procedure codes (Tx rows without a mapped product) are listed so the grid can
 * show them; they are never sent to the DUR.
 */

import { PRODUCTS, PRODUCT_MAP } from '../productMap.js'
import { getStrength } from '../../knowledge/drugs.js'

/** Form → the suffix the observed EMR writes after the name: (정) (주) (액) (외) (캡) (츄). */
export const FORM_SUFFIX = {
  tablet: '정',
  chewable: '츄',
  capsule: '캡',
  solution: '액',
  suspension: '액',
  injection: '주',
  'spot-on': '외',
}

/** Rx 검색 filter chips: (정) oral solids, (주) injections, (액) liquids, (외) external use. */
export const SEARCH_FILTERS = [
  { key: '정', forms: ['tablet', 'chewable', 'capsule'], label: '정제·캡슐·츄어블' },
  { key: '주', forms: ['injection'], label: '주사' },
  { key: '액', forms: ['solution', 'suspension'], label: '액상' },
  { key: '외', forms: ['spot-on'], label: '외용' },
]

/** Folder (폴더명) per ingredient, as a clinic's own product tree would group them. */
const FOLDER = {
  ivermectin: '기생충',
  ketoconazole: '피부',
  ciclosporin: '피부',
  phenobarbital: '신경',
  prednisolone: '호르몬',
  methimazole: '내분비',
  amlodipine: '심혈관',
  maropitant: '소화기',
  amoxicillin_clavulanate: '항생제',
  meloxicam: '진통소염',
  carprofen: '진통소염',
  robenacoxib: '진통소염',
  gabapentin: '진통',
  tramadol: '진통',
  trazodone: '행동',
  fluoxetine: '행동',
  omeprazole: '소화기',
  famotidine: '소화기',
  enrofloxacin: '항생제',
  metronidazole: '항생제',
  furosemide: '심혈관',
  pimobendan: '심혈관',
  benazepril: '심혈관',
  permethrin: '외부기생충',
  acetaminophen: '진통',
}

/**
 * Fictional price per administration in won ("가상 단가"). Not a real fee schedule.
 * 금액 = 단가 × 횟수 × 일수 (blank counts as 1).
 */
const PRICE = {
  'RX-IVM-SOL10': 1000,
  'RX-IVM-CH68': 9000,
  'RX-IVM-CH136': 10000,
  'RX-IVM-CH272': 12000,
  'RX-KTZ-T200': 700,
  'RX-CSA-C10': 1200,
  'RX-CSA-C25': 1800,
  'RX-CSA-C50': 2500,
  'RX-PB-T15': 300,
  'RX-PB-T30': 400,
  'RX-PRED-T5': 200,
  'RX-MMI-T25': 500,
  'RX-AML-T25': 400,
  'RX-MRP-T16': 3000,
  'RX-MRP-T24': 3500,
  'RX-MRP-T60': 5000,
  'RX-MRP-INJ10': 15000,
  'RX-AMC-T375': 800,
  'RX-AMC-T250': 600,
  'RX-MLX-SUS15': 500,
  'RX-MLX-INJ5': 15000,
  'RX-CRP-T25': 900,
  'RX-CRP-T100': 1500,
  'RX-ROB-T20': 2000,
  'RX-GBP-C100': 500,
  'RX-TRM-T50': 400,
  'RX-TRZ-T100': 600,
  'RX-FLX-CH16': 1500,
  'RX-OMP-C10': 500,
  'RX-FAM-T10': 300,
  'RX-ENR-T227': 800,
  'RX-ENR-T68': 1200,
  'RX-MTZ-T250': 400,
  'RX-FUR-T125': 300,
  'RX-PIM-CH125': 1500,
  'RX-BNZ-T5': 600,
  'RX-PERM-SPOT': 25000,
  'RX-APAP-T500': 300,
}

/** Default 단위 per product: what the clinic's product setup would prefill on a new row. */
const DEFAULT_UNIT = {
  'RX-IVM-SOL10': 'mcg/kg',
  'RX-MMI-T25': 'mg',
  'RX-GBP-C100': 'EA',
}

/** Procedure and lab items (구분 Tx, no mapped product): shown in the grid, never sent to the DUR. */
export const PROCEDURES = [
  { code: 'PR-EXAM-02', display: '재진 진찰료', folder: '진찰', price: 8000 },
  { code: 'PR-INJ-01', display: '주사 처치료', folder: '처치', price: 5000 },
  { code: 'PR-XRAY-2', display: '방사선 촬영 (2매)', folder: '검사', price: 40000 },
  { code: 'PR-CBC-01', display: '혈구 검사 (CBC)', folder: '검사', price: 30000 },
  { code: 'PR-CHEM-12', display: '혈액 화학 검사 (12항목)', folder: '검사', price: 60000 },
]
export const PROCEDURE_BY_CODE = Object.fromEntries(PROCEDURES.map((p) => [p.code, p]))

/** Units offered in the 단위 select (*demo addition*: 포, mL, mcg). */
export const UNITS = ['mg/kg', 'mcg/kg', 'IU/kg', 'mL/kg', 'mg', 'mcg', 'mL', 'EA', '포']
/** Routes offered in the 경로 Rt select (blank allowed). */
export const ROUTES = ['PO', 'IV', 'SC', 'IM', 'Eye', 'Ear', 'Top', 'Inh']
/** 조제 options (*demo addition*): 가루 = powder, one 포 per dose. */
export const DISPENSE = ['정제', '가루']

const SOLID = new Set(['tablet', 'chewable', 'capsule'])
const LIQUID = new Set(['solution', 'suspension', 'injection'])

/** Strength record of a product code from the knowledge base (amount, per, form), or null. */
export function strengthOf(code) {
  const p = PRODUCT_MAP[code]
  return p ? getStrength(p.drugId, p.strengthId) : null
}

/** Everything the grid shows about a product code: mapped product, procedure, or unknown. */
export function itemInfo(code) {
  const p = PRODUCT_MAP[code]
  if (p) {
    const s = getStrength(p.drugId, p.strengthId)
    const form = s?.form ?? null
    const suffix = FORM_SUFFIX[form]
    return {
      kind: 'product',
      code,
      product: p,
      drugId: p.drugId,
      form,
      strength: s,
      solid: SOLID.has(form),
      liquid: LIQUID.has(form),
      name: suffix ? `${p.display} (${suffix})` : p.display,
      shortName: p.display,
      folder: FOLDER[p.drugId] ?? '',
      price: PRICE[code] ?? null,
    }
  }
  const pr = PROCEDURE_BY_CODE[code]
  if (pr) return { kind: 'procedure', code, name: pr.display, shortName: pr.display, folder: pr.folder, price: pr.price, form: null, solid: false, liquid: false }
  return { kind: 'unknown', code, name: code, shortName: code, folder: '', price: null, form: null, solid: false, liquid: false }
}

/** The row a new product starts as: default unit and route, empty Qty/Tt/Dy (spec §2.4.2). */
export function newRow(code, rowId) {
  const info = itemInfo(code)
  if (info.kind === 'procedure') return { kind: 'Tx', rowId, productCode: code, unit: 'EA', qty: '1', tt: '1', dy: '1', rt: '' }
  const form = info.form
  let unit = DEFAULT_UNIT[code]
  if (!unit) unit = form === 'chewable' || form === 'spot-on' ? 'EA' : 'mg/kg'
  const rt = form === 'injection' ? 'SC' : form === 'spot-on' ? 'Top' : 'PO'
  return {
    kind: form === 'injection' ? 'Tx' : 'Rx',
    rowId,
    productCode: code,
    unit,
    qty: '',
    tt: '',
    dy: '',
    rt,
    ...(info.solid ? { dispense: '정제' } : {}),
  }
}

/** Every product and procedure the Rx 검색 can list. */
export function catalogue() {
  return [...PRODUCTS.map((p) => itemInfo(p.code)), ...PROCEDURES.map((p) => itemInfo(p.code))]
}
