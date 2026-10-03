/**
 * RENAL_ADJUST — drug with renalFraction ≥ 0.5 in a patient with CKD or
 * creatinine above the species cut-off → moderate.
 */

import { T, enName, koName, fmt } from './util.js'

const RULE = { id: 'RENAL_ADJUST', version: '1.0.0' }

function evaluate(ctx) {
  const contributions = []
  if (!ctx.kidney.affected) return { contributions }
  for (const m of ctx.meds) {
    const rf = m.drug.pk?.renalFraction
    if (rf == null || rf < 0.5) continue
    const why = []
    if (m.drug.pk.renalNote) why.push(m.drug.pk.renalNote)
    if (m.drug.id === 'gabapentin') {
      why.push(T('Cats with CKD given 10 mg/kg had higher dose-normalised serum gabapentin concentrations than healthy cats given 20 mg/kg, supporting dose reduction (Quimby 2022).',
        'CKD 고양이에 10 mg/kg을 투여했을 때 건강한 고양이에 20 mg/kg을 투여했을 때보다 용량 보정 혈청 가바펜틴 농도가 높아, 감량의 근거가 됩니다(Quimby 2022).'))
    }
    contributions.push({
      ruleId: RULE.id,
      ruleVersion: RULE.version,
      severity: 'moderate',
      problemKey: `renal:${m.drug.id}`,
      drugIds: [m.drug.id],
      factors: ctx.kidney.factors,
      title: T(`${enName(m.drug)} is mainly cleared by the kidney: adjust for kidney disease`, `${koName(m.drug)}: 주로 신장으로 배설, 신장병에 맞춰 조정 필요`),
      consequence: T('The drug accumulates, so dose-related effects (for gabapentin: sedation, ataxia) are stronger and last longer.', '약물이 축적되어 용량 관련 효과(가바펜틴의 경우 진정, 운동실조)가 더 강하고 오래갑니다.'),
      why,
      actions: [
        T('Reduce the dose and/or lengthen the interval, then titrate to effect.', '용량을 줄이거나 투여 간격을 늘린 뒤 효과에 따라 조정하십시오.'),
        T('The cited study supports a reduction but does not give a specific factor; this engine does not calculate one.', '인용 연구는 감량을 지지하지만 구체적인 감량 비율은 제시하지 않으며, 이 엔진도 계산하지 않습니다.'),
      ],
      alternatives: [],
      sources: [...(m.drug.pk.sources || []), ...(ctx.kidney.creatinineHigh ? ['iris2023'] : [])],
      evidence: 'literature',
      ownerSigns: m.drug.ownerSigns || [],
      organs: ['kidney'],
      inputs: [
        { fact: `pk.renalFraction.${m.drug.id}`, value: fmt(rf), source: m.drug.pk.sources?.[0] },
        ...ctx.kidney.inputs,
      ],
    })
  }
  return { contributions }
}

export default {
  ...RULE,
  layer: 'drug_disease',
  name: T('Renal dose adjustment', '신기능에 따른 용량 조정'),
  sources: ['quimby2022', 'radulovic1995'],
  evaluate,
}
