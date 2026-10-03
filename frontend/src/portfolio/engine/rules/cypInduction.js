/**
 * CYP_INDUCTION — strong enzyme inducer (phenobarbital) + a substrate of the
 * induced isoenzyme. Direction: the INDUCER LOWERS the substrate's exposure
 * (risk of treatment failure), it does not raise it.
 * Moderate when the substrate is NTI or an immunosuppressant, else minor.
 */

import { T, enName, koName, josa, pairKey, lc, isCriticalSubstrate } from './util.js'

const RULE = { id: 'CYP_INDUCTION', version: '1.0.0' }

function evaluate(ctx) {
  const contributions = []
  for (const ind of ctx.meds) {
    const induces = ind.drug.pk?.cyp?.induces || {}
    const strongIsos = Object.entries(induces).filter(([, s]) => s === 'strong').map(([iso]) => iso)
    if (!strongIsos.length) continue
    for (const sub of ctx.meds) {
      if (sub === ind || sub.drug.id === ind.drug.id) continue
      const shared = (sub.drug.pk?.cyp?.substrateOf || []).filter((iso) => strongIsos.includes(iso))
      if (!shared.length) continue

      const critical = isCriticalSubstrate(sub.drug)
      const severity = critical ? 'moderate' : 'minor'
      const iEn = enName(ind.drug), iKo = koName(ind.drug)
      const sEn = enName(sub.drug), sKo = koName(sub.drug)
      const indication = sub.protocol?.indication
        ? { en: sub.protocol.indication.en.split(/: | — /)[0], ko: sub.protocol.indication.ko.split(/: | — /)[0] }
        : null
      const isCsa = sub.drug.id === 'ciclosporin'

      const why = [
        T(`Direction: ${lc(iEn)}, the inducer, speeds up the metabolism of ${lc(sEn)}, so ${lc(sEn)} levels fall. The risk is loss of effect, not added toxicity.`,
          `방향: 유도제인 ${josa(iKo, '이/가')} ${sKo}의 대사를 빠르게 하여 ${sKo} 혈중 농도가 낮아집니다. 위험은 독성 증가가 아니라 효과 감소입니다.`),
      ]
      const sources = []
      if (ind.drug.id === 'phenobarbital') {
        why.push(T('Phenobarbital induced CYP3A12 and CYP3A26 mRNA about 35- and 72-fold, and CYP2B11 about 149-fold, in beagle hepatocytes (Graham 2006).',
          '비글 간세포에서 페노바르비탈은 CYP3A12와 CYP3A26 mRNA를 각각 약 35배, 72배, CYP2B11을 약 149배 유도했습니다(Graham 2006).'))
        sources.push('graham2006')
      }
      const actions = []
      const alternatives = []
      let evidence = 'mechanistic'
      const steroid = Boolean(sub.drug.flags?.corticosteroid)
      if (ind.drug.id === 'phenobarbital' && (isCsa || steroid)) {
        why.push(T(`The IVETF epilepsy consensus lists ${steroid ? 'corticosteroids' : 'ciclosporin'} among the drugs whose effect phenobarbital may reduce (Bhatti 2015).`,
          `IVETF 뇌전증 합의문은 페노바르비탈이 효과를 떨어뜨릴 수 있는 약물에 ${josa(steroid ? '코르티코스테로이드' : '사이클로스포린', '을/를')} 포함합니다(Bhatti 2015).`))
        sources.push('bhatti2015')
        evidence = 'literature'
      }
      if (isCsa) {
        why.push(T('Phenobarbital is listed among drugs that decrease blood ciclosporin concentrations in dogs (Archer 2014).', '페노바르비탈은 개에서 사이클로스포린 혈중 농도를 낮추는 약물로 분류됩니다(Archer 2014).'))
        sources.push('archer2014')
        evidence = 'literature'
        actions.push(T('Expect lower ciclosporin exposure. If atopic-dermatitis control worsens after phenobarbital is started or changed, measure a trough ciclosporin blood concentration (TDM) before raising the dose.',
          '사이클로스포린 노출 감소를 예상하십시오. 페노바르비탈 시작·변경 후 아토피 조절이 나빠지면 증량 전에 사이클로스포린 최저 혈중 농도(TDM)를 측정하십시오.'))
        actions.push(T('If phenobarbital is later stopped, ciclosporin levels can rise again; reassess the dose.', '나중에 페노바르비탈을 중단하면 사이클로스포린 농도가 다시 오를 수 있으므로 용량을 재평가하십시오.'))
        alternatives.push(T('Oclacitinib: among the most effective oral options for chronic canine atopic dermatitis (Olivry 2015). It is not in this formulary, so its own interactions are not checked here.',
          '오클라시티닙: 만성 개 아토피 피부염에 가장 효과적인 경구 선택지 중 하나(Olivry 2015). 이 처방집에 없으므로 자체 상호작용은 여기서 검토되지 않습니다.'))
        sources.push('olivry2015')
      } else {
        if (sub.drug.pk?.note) why.push(sub.drug.pk.note)
        actions.push(T(`${sEn} may work less well; adjust to clinical response.`, `${josa(sKo, '은/는')} 효과가 약해질 수 있으므로 임상 반응에 따라 조정하십시오.`))
      }

      contributions.push({
        ruleId: RULE.id,
        ruleVersion: RULE.version,
        severity,
        problemKey: `pair:${pairKey(ind.drug.id, sub.drug.id)}`,
        drugIds: [ind.drug.id, sub.drug.id],
        factors: [],
        title: T(`${iEn} lowers ${lc(sEn)} levels (enzyme induction)`, `${josa(iKo, '이/가')} ${sKo} 혈중 농도를 낮춤(효소 유도)`),
        consequence: indication
          ? T(`Faster clearance of ${lc(sEn)} can lead to treatment failure (${lc(indication.en)}).`, `${sKo} 청소율 증가로 치료 실패(${indication.ko})가 생길 수 있습니다.`)
          : T(`Faster clearance of ${lc(sEn)} can lead to treatment failure.`, `${sKo} 청소율 증가로 치료 실패가 생길 수 있습니다.`),
        why,
        actions,
        alternatives,
        sources,
        evidence,
        ownerSigns: [],
        organs: [],
        inputs: [
          ...shared.map((iso) => ({ fact: `cyp.induces.${iso}.${ind.drug.id}`, value: 'strong', source: 'graham2006' })),
          { fact: `cyp.substrateOf.${sub.drug.id}`, value: shared.join(', '), source: sub.drug.pk?.sources?.[0] },
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
  name: T('Enzyme induction (CYP3A / CYP2B)', '효소 유도(CYP3A / CYP2B)'),
  sources: ['graham2006', 'archer2014', 'bhatti2015'],
  evaluate,
}
