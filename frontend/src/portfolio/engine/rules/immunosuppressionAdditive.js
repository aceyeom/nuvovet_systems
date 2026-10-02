/** IMMUNOSUPPRESSION_ADDITIVE — two or more immunosuppressants → minor (infection monitoring, steroid taper). */

import { T, enName, koName, joinEn, joinKo } from './util.js'

const RULE = { id: 'IMMUNOSUPPRESSION_ADDITIVE', version: '1.0.0' }

function evaluate(ctx) {
  const imm = ctx.meds.filter((m) => m.drug.flags?.immunosuppressant)
  const ids = [...new Set(imm.map((m) => m.drug.id))]
  if (ids.length < 2) return { contributions: [] }
  const drugs = ids.map((id) => imm.find((m) => m.drug.id === id).drug)
  const hasSteroid = drugs.some((d) => d.flags?.corticosteroid)
  const actions = [
    T('Check for skin and urinary infections at rechecks, and investigate any fever promptly.', '재진 시 피부·요로 감염을 확인하고, 발열이 있으면 즉시 원인을 확인하십시오.'),
  ]
  if (hasSteroid) actions.push(T('Plan the glucocorticoid taper once the longer-term drug controls the clinical signs.', '장기 치료제로 임상 증상이 조절되면 글루코코르티코이드 감량 계획을 세우십시오.'))
  return {
    contributions: [{
      ruleId: RULE.id,
      ruleVersion: RULE.version,
      severity: 'minor',
      problemKey: `immuno:${[...ids].sort().join('|')}`,
      drugIds: ids,
      factors: [],
      title: T(`Additive immunosuppression: ${joinEn(drugs.map((d, i) => (i ? enName(d).toLowerCase() : enName(d))))}`, `면역억제 효과 중복: ${joinKo(drugs.map(koName))}`),
      consequence: T('Higher risk of bacterial and opportunistic infection.', '세균 감염 및 기회감염 위험 증가.'),
      why: [
        T('Infections of the urinary and respiratory tracts, skin (pyoderma, demodicosis) and others are documented in dogs on ciclosporin, and in canine transplant studies combined immunosuppressive regimens carried a high frequency of infection (Archer 2014).',
          '사이클로스포린 투여견에서 요로·호흡기·피부(농피증, 모낭충증) 등의 감염이 보고되었고, 개 장기이식 연구에서 병용 면역억제 요법은 감염 빈도가 높았습니다(Archer 2014).'),
        T('A short overlap is common when starting long-term treatment for atopic dermatitis; the concern is prolonged combined use.', '아토피 피부염 장기 치료를 시작할 때 짧은 기간 겹치는 것은 흔하며, 문제는 장기간의 병용입니다.'),
      ],
      actions,
      alternatives: [],
      sources: ['archer2014'],
      evidence: 'literature',
      ownerSigns: [
        T('Fever, lethargy or loss of appetite', '발열, 무기력 또는 식욕 부진'),
        T('Straining or frequent urination', '배뇨 곤란 또는 빈뇨'),
        T('New skin sores or pustules', '새로운 피부 상처나 고름집'),
      ],
      organs: [],
      inputs: ids.map((id) => ({ fact: `flags.immunosuppressant.${id}`, value: 'true' })),
    }],
  }
}

export default {
  ...RULE,
  layer: 'pd',
  name: T('Additive immunosuppression', '면역억제 중복'),
  sources: ['archer2014'],
  evaluate,
}
