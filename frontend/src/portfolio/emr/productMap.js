/**
 * Fictional EMR product codes → engine drug + strength (EMR popup spec Appendix A.1).
 *
 * `productMap` is the only source of strength and concentration for an EMR row
 * (spec §0.2, §4.2). Codes are fictional; strengths are the engine's clean-room
 * `strengths`. `defaultProtocolId` is set only where the product is labelled for
 * one indication (chewable heartworm products). `displayEn` is the English
 * display used by the widget in `en`; the host EMR is Korean only.
 *
 * ProductMapEntry = { code, display, displayEn, drugId, strengthId, defaultProtocolId? }
 */

export const PRODUCTS = [
  { code: 'RX-IVM-SOL10', display: '이버멕틴 경구액 10 mg/mL', displayEn: 'Ivermectin oral solution 10 mg/mL', drugId: 'ivermectin', strengthId: 'iver_sol_10' },
  { code: 'RX-IVM-CH68', display: '이버멕틴 츄어블 68 mcg', displayEn: 'Ivermectin chewable 68 mcg', drugId: 'ivermectin', strengthId: 'iver_chew_68', defaultProtocolId: 'iver_dog_hw' },
  { code: 'RX-IVM-CH136', display: '이버멕틴 츄어블 136 mcg', displayEn: 'Ivermectin chewable 136 mcg', drugId: 'ivermectin', strengthId: 'iver_chew_136', defaultProtocolId: 'iver_dog_hw' },
  { code: 'RX-IVM-CH272', display: '이버멕틴 츄어블 272 mcg', displayEn: 'Ivermectin chewable 272 mcg', drugId: 'ivermectin', strengthId: 'iver_chew_272', defaultProtocolId: 'iver_dog_hw' },
  { code: 'RX-KTZ-T200', display: '케토코나졸 정 200 mg', displayEn: 'Ketoconazole tablet 200 mg', drugId: 'ketoconazole', strengthId: 'keto_tab_200' },
  { code: 'RX-CSA-C10', display: '사이클로스포린 캡슐 10 mg', displayEn: 'Ciclosporin capsule 10 mg', drugId: 'ciclosporin', strengthId: 'csa_cap_10' },
  { code: 'RX-CSA-C25', display: '사이클로스포린 캡슐 25 mg', displayEn: 'Ciclosporin capsule 25 mg', drugId: 'ciclosporin', strengthId: 'csa_cap_25' },
  { code: 'RX-CSA-C50', display: '사이클로스포린 캡슐 50 mg', displayEn: 'Ciclosporin capsule 50 mg', drugId: 'ciclosporin', strengthId: 'csa_cap_50' },
  { code: 'RX-PB-T15', display: '페노바르비탈 정 15 mg', displayEn: 'Phenobarbital tablet 15 mg', drugId: 'phenobarbital', strengthId: 'pb_tab_15' },
  { code: 'RX-PB-T30', display: '페노바르비탈 정 30 mg', displayEn: 'Phenobarbital tablet 30 mg', drugId: 'phenobarbital', strengthId: 'pb_tab_30' },
  { code: 'RX-PRED-T5', display: '프레드니솔론 정 5 mg', displayEn: 'Prednisolone tablet 5 mg', drugId: 'prednisolone', strengthId: 'pred_tab_5' },
  { code: 'RX-MMI-T25', display: '메티마졸 정 2.5 mg', displayEn: 'Methimazole tablet 2.5 mg', drugId: 'methimazole', strengthId: 'mmi_tab_2_5' },
  { code: 'RX-AML-T25', display: '암로디핀 정 2.5 mg', displayEn: 'Amlodipine tablet 2.5 mg', drugId: 'amlodipine', strengthId: 'amlo_tab_2_5' },
  { code: 'RX-MRP-T16', display: '마로피탄트 정 16 mg', displayEn: 'Maropitant tablet 16 mg', drugId: 'maropitant', strengthId: 'maro_tab_16' },
  { code: 'RX-MRP-T24', display: '마로피탄트 정 24 mg', displayEn: 'Maropitant tablet 24 mg', drugId: 'maropitant', strengthId: 'maro_tab_24' },
  { code: 'RX-MRP-T60', display: '마로피탄트 정 60 mg', displayEn: 'Maropitant tablet 60 mg', drugId: 'maropitant', strengthId: 'maro_tab_60' },
  { code: 'RX-MRP-INJ10', display: '마로피탄트 주사액 10 mg/mL', displayEn: 'Maropitant injection 10 mg/mL', drugId: 'maropitant', strengthId: 'maro_inj_10' },
  { code: 'RX-AMC-T375', display: '아목시실린·클라불란산 정 375 mg', displayEn: 'Amoxicillin-clavulanate tablet 375 mg', drugId: 'amoxicillin_clavulanate', strengthId: 'ac_tab_375' },
  { code: 'RX-AMC-T250', display: '아목시실린·클라불란산 정 250 mg', displayEn: 'Amoxicillin-clavulanate tablet 250 mg', drugId: 'amoxicillin_clavulanate', strengthId: 'ac_tab_250' },
  { code: 'RX-MLX-SUS15', display: '멜록시캄 현탁액 1.5 mg/mL', displayEn: 'Meloxicam suspension 1.5 mg/mL', drugId: 'meloxicam', strengthId: 'melox_susp_1_5' },
  { code: 'RX-MLX-INJ5', display: '멜록시캄 주사액 5 mg/mL', displayEn: 'Meloxicam injection 5 mg/mL', drugId: 'meloxicam', strengthId: 'melox_inj_5' },
  { code: 'RX-CRP-T25', display: '카프로펜 정 25 mg', displayEn: 'Carprofen tablet 25 mg', drugId: 'carprofen', strengthId: 'carp_tab_25' },
  { code: 'RX-CRP-T100', display: '카프로펜 정 100 mg', displayEn: 'Carprofen tablet 100 mg', drugId: 'carprofen', strengthId: 'carp_tab_100' },
  { code: 'RX-ROB-T20', display: '로베나콕시브 정 20 mg', displayEn: 'Robenacoxib tablet 20 mg', drugId: 'robenacoxib', strengthId: 'robe_tab_20' },
  { code: 'RX-GBP-C100', display: '가바펜틴 캡슐 100 mg', displayEn: 'Gabapentin capsule 100 mg', drugId: 'gabapentin', strengthId: 'gaba_cap_100' },
  { code: 'RX-TRM-T50', display: '트라마돌 정 50 mg', displayEn: 'Tramadol tablet 50 mg', drugId: 'tramadol', strengthId: 'tram_tab_50' },
  { code: 'RX-TRZ-T100', display: '트라조돈 정 100 mg', displayEn: 'Trazodone tablet 100 mg', drugId: 'trazodone', strengthId: 'traz_tab_100' },
  { code: 'RX-FLX-CH16', display: '플루옥세틴 츄어블 16 mg', displayEn: 'Fluoxetine chewable 16 mg', drugId: 'fluoxetine', strengthId: 'flx_chew_16' },
  { code: 'RX-OMP-C10', display: '오메프라졸 캡슐 10 mg', displayEn: 'Omeprazole capsule 10 mg', drugId: 'omeprazole', strengthId: 'ome_cap_10' },
  { code: 'RX-FAM-T10', display: '파모티딘 정 10 mg', displayEn: 'Famotidine tablet 10 mg', drugId: 'famotidine', strengthId: 'famo_tab_10' },
  { code: 'RX-ENR-T227', display: '엔로플록사신 정 22.7 mg', displayEn: 'Enrofloxacin tablet 22.7 mg', drugId: 'enrofloxacin', strengthId: 'enro_tab_22_7' },
  { code: 'RX-ENR-T68', display: '엔로플록사신 정 68 mg', displayEn: 'Enrofloxacin tablet 68 mg', drugId: 'enrofloxacin', strengthId: 'enro_tab_68' },
  { code: 'RX-MTZ-T250', display: '메트로니다졸 정 250 mg', displayEn: 'Metronidazole tablet 250 mg', drugId: 'metronidazole', strengthId: 'metro_tab_250' },
  { code: 'RX-FUR-T125', display: '푸로세미드 정 12.5 mg', displayEn: 'Furosemide tablet 12.5 mg', drugId: 'furosemide', strengthId: 'furo_tab_12_5' },
  { code: 'RX-PIM-CH125', display: '피모벤단 츄어블 1.25 mg', displayEn: 'Pimobendan chewable 1.25 mg', drugId: 'pimobendan', strengthId: 'pimo_chew_1_25' },
  { code: 'RX-BNZ-T5', display: '베나제프릴 정 5 mg', displayEn: 'Benazepril tablet 5 mg', drugId: 'benazepril', strengthId: 'bena_tab_5' },
  { code: 'RX-PERM-SPOT', display: '퍼메트린 스팟온 (개 전용)', displayEn: 'Permethrin spot-on (dogs only)', drugId: 'permethrin', strengthId: 'perm_spot' },
  { code: 'RX-APAP-T500', display: '아세트아미노펜 정 500 mg', displayEn: 'Acetaminophen tablet 500 mg', drugId: 'acetaminophen', strengthId: 'apap_tab_500' },
]

/** Build a code-keyed map from a ProductMapEntry list (the SDK's `productMap` option). */
export function buildProductMap(list = PRODUCTS) {
  return Object.fromEntries(list.map((p) => [p.code, p]))
}

export const PRODUCT_MAP = buildProductMap(PRODUCTS)

/** Display name of a product in the widget locale (falls back to the Korean display). */
export function productDisplay(product, locale = 'ko') {
  if (!product) return ''
  return (locale === 'en' && product.displayEn) || product.display
}

/** The mapped product for a drug + strength, if the formulary has one. */
export function productFor(drugId, strengthId, map = PRODUCT_MAP) {
  return Object.values(map).find((p) => p.drugId === drugId && p.strengthId === strengthId) || null
}
