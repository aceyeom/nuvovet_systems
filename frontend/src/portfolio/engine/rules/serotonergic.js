/**
 * SEROTONERGIC — two or more serotonergic drugs → moderate.
 * Evidence is 'mechanistic': the cited veterinary papers show that serotonin
 * syndrome occurs in animals (single-drug overdoses), not the risk of these
 * combinations at therapeutic doses.
 */

import { T, enName, koName, joinEn, joinKo } from './util.js'

const RULE = { id: 'SEROTONERGIC', version: '1.0.0' }

function evaluate(ctx) {
  const sero = ctx.meds.filter((m) => m.drug.flags?.serotonergic)
  const ids = [...new Set(sero.map((m) => m.drug.id))]
  if (ids.length < 2) return { contributions: [] }
  const drugs = ids.map((id) => sero.find((m) => m.drug.id === id).drug)
  const namesEn = joinEn(drugs.map((d, i) => (i ? enName(d).toLowerCase() : enName(d))))
  const namesKo = joinKo(drugs.map((d) => koName(d)))
  return {
    contributions: [{
      ruleId: RULE.id,
      ruleVersion: RULE.version,
      severity: 'moderate',
      problemKey: `serotonin:${[...ids].sort().join('|')}`,
      drugIds: ids,
      factors: [],
      title: T(`Serotonergic combination: ${namesEn}`, `세로토닌성 약물 병용: ${namesKo}`),
      consequence: T('Serotonin toxicity (serotonin syndrome): agitation, tremor, dilated pupils, fast heart and breathing rates, high temperature, vomiting or diarrhoea.',
        '세로토닌 독성(세로토닌 증후군): 흥분, 떨림, 산동, 빈맥·빈호흡, 고체온, 구토 또는 설사.'),
      why: [
        T('Each drug increases serotonergic activity (tramadol: serotonin/noradrenaline reuptake inhibition; trazodone: SARI; fluoxetine: SSRI), so effects add up.',
          '각 약물이 세로토닌 작용을 높이므로(트라마돌: 세로토닌·노르아드레날린 재흡수 억제, 트라조돈: SARI, 플루옥세틴: SSRI) 효과가 더해집니다.'),
        T('Serotonin syndrome is described in animals as well as people (Mohammad-Zadeh 2008); in dogs and cats it has been reported after SSRI and tramadol overdoses (Fitzgerald 2013; Indrawirawan 2014). No veterinary study quantifying the risk of these combinations at therapeutic doses is cited.',
          '세로토닌 증후군은 사람뿐 아니라 동물에서도 기술되어 있으며(Mohammad-Zadeh 2008), 개와 고양이에서 SSRI 및 트라마돌 과량 투여 후 보고되었습니다(Fitzgerald 2013, Indrawirawan 2014). 치료 용량에서 이 조합의 위험을 정량화한 수의학 연구는 인용하지 않았습니다.'),
      ],
      actions: [
        T('Use the lowest effective doses and avoid adding another serotonergic drug.', '최소 유효 용량을 사용하고 세로토닌성 약물을 추가하지 마십시오.'),
        T('Teach the owner the warning signs and to call the clinic if they appear.', '보호자에게 경고 증상을 알려 주고, 나타나면 병원에 연락하도록 하십시오.'),
      ],
      alternatives: [],
      sources: ['mohammadzadeh2008', 'fitzgerald2013', 'indrawirawan2014'],
      evidence: 'mechanistic',
      ownerSigns: [
        T('Agitation or restlessness', '흥분 또는 안절부절못함'),
        T('Trembling or muscle twitching', '떨림 또는 근육 경련'),
        T('Dilated pupils', '동공 확대'),
        T('Fast breathing or panting at rest', '안정 시 빠른 호흡 또는 헐떡임'),
        T('Vomiting or diarrhoea', '구토 또는 설사'),
      ],
      organs: ['cns'],
      inputs: ids.map((id) => ({ fact: `flags.serotonergic.${id}`, value: 'true' })),
    }],
  }
}

export default {
  ...RULE,
  layer: 'pd',
  name: T('Serotonergic combination', '세로토닌성 약물 병용'),
  sources: ['mohammadzadeh2008', 'fitzgerald2013', 'indrawirawan2014'],
  evaluate,
}
