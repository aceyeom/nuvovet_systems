/**
 * CYP3A_INHIBITION — strong or moderate CYP3A inhibitor + CYP3A substrate.
 * Moderate when the substrate is narrow-therapeutic-index or an
 * immunosuppressant, otherwise minor. Ketoconazole + ciclosporin is often a
 * deliberate dose-sparing combination: the finding says so and asks for TDM.
 */

import { T, enName, koName, josa, pairKey, lc, isCriticalSubstrate } from './util.js'

const RULE = { id: 'CYP3A_INHIBITION', version: '1.0.0' }

function evaluate(ctx) {
  const contributions = []
  for (const inh of ctx.meds) {
    const strength = inh.drug.pk?.cyp?.inhibits?.CYP3A
    if (!['strong', 'moderate'].includes(strength)) continue
    for (const sub of ctx.meds) {
      if (sub === inh || sub.drug.id === inh.drug.id) continue
      if (!(sub.drug.pk?.cyp?.substrateOf || []).includes('CYP3A')) continue

      const critical = isCriticalSubstrate(sub.drug)
      const severity = critical ? 'moderate' : 'minor'
      const iEn = enName(inh.drug), iKo = koName(inh.drug)
      const sEn = enName(sub.drug), sKo = koName(sub.drug)
      const isKetoCsa = inh.drug.id === 'ketoconazole' && sub.drug.id === 'ciclosporin'

      const why = [
        T(`${iEn} is a ${strength} CYP3A inhibitor; ${lc(sEn)} is cleared partly by CYP3A, so its blood concentrations rise.`,
          `${josa(iKo, '은/는')} ${strength === 'strong' ? '강한' : '중등도'} CYP3A 억제제이고 ${josa(sKo, '은/는')} 일부 CYP3A로 대사되므로 혈중 농도가 올라갑니다.`),
      ]
      const actions = []
      const alternatives = []
      let sources = [...(inh.drug.pk?.sources || []), ...(sub.drug.pk?.sources || [])]
      let evidence = 'mechanistic'

      if (isKetoCsa) {
        why.push(T('In dogs, ketoconazole reduced ciclosporin clearance dose-dependently: about 85% at 10 mg/kg/day and 92% at 20 mg/kg/day (Myre 1991).',
          '개에서 케토코나졸은 사이클로스포린 청소율을 용량 의존적으로 낮췄습니다(10 mg/kg/일에서 약 85%, 20 mg/kg/일에서 92%; Myre 1991).'))
        why.push(T('The combination is sometimes used on purpose to cut the ciclosporin dose (by as much as 75%), but individual responses vary widely (Archer 2014).',
          '사이클로스포린 용량을 줄이기 위해(최대 약 75%) 의도적으로 병용하기도 하지만, 개체별 반응 차이가 큽니다(Archer 2014).'))
        actions.push(T('If the combination is intended to spare ciclosporin, reduce the ciclosporin dose and confirm with blood-level monitoring (TDM).',
          '사이클로스포린 절감 목적의 병용이라면 사이클로스포린 용량을 줄이고 혈중 농도 모니터링(TDM)으로 확인하십시오.'))
        actions.push(T('If it is not intended, expect higher ciclosporin exposure: watch for vomiting, diarrhoea and gum changes, and monitor liver enzymes for ketoconazole.',
          '의도하지 않은 병용이라면 사이클로스포린 노출 증가를 예상하고 구토, 설사, 잇몸 변화를 관찰하며 케토코나졸에 대해 간효소를 모니터링하십시오.'))
        alternatives.push(T('Topical antifungal therapy if the azole is only for Malassezia (Negre 2009).', '아졸제가 말라세지아 치료 목적이라면 국소 항진균 치료(Negre 2009).'))
        sources = ['myre1991', 'archer2014', 'negre2009']
        evidence = 'literature'
      } else {
        actions.push(T(`Monitor for dose-related effects of ${lc(sEn)}; consider a lower dose.`, `${koName(sub.drug)}의 용량 관련 부작용을 관찰하고 감량을 고려하십시오.`))
        if (sub.drug.pk?.note) why.push(sub.drug.pk.note)
      }

      contributions.push({
        ruleId: RULE.id,
        ruleVersion: RULE.version,
        severity,
        problemKey: `pair:${pairKey(inh.drug.id, sub.drug.id)}`,
        drugIds: [inh.drug.id, sub.drug.id],
        factors: [],
        title: T(`${iEn} raises ${lc(sEn)} levels (CYP3A inhibition)`, `${josa(iKo, '이/가')} ${sKo} 혈중 농도를 높임(CYP3A 억제)`),
        consequence: T(`Higher ${lc(sEn)} exposure and more dose-related adverse effects.`, `${sKo} 노출이 증가하여 용량 관련 부작용이 늘어납니다.`),
        why,
        actions,
        alternatives,
        sources,
        evidence,
        ownerSigns: sub.drug.ownerSigns || [],
        organs: isKetoCsa ? ['gi'] : [],
        inputs: [
          { fact: `cyp.inhibits.CYP3A.${inh.drug.id}`, value: strength, source: inh.drug.pk?.sources?.[0] },
          { fact: `cyp.substrateOf.${sub.drug.id}`, value: 'CYP3A', source: sub.drug.pk?.sources?.[0] },
          { fact: `flags.${sub.drug.id}`, value: critical ? 'narrow therapeutic index / non-steroid immunosuppressant' : 'wide margin / titrated to effect' },
        ],
      })
    }
  }
  return { contributions }
}

export default {
  ...RULE,
  layer: 'pk',
  name: T('CYP3A inhibition', 'CYP3A 억제'),
  sources: ['myre1991', 'archer2014'],
  evaluate,
}
