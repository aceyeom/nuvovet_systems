/**
 * GASTRIC_PH_AZOLE — an azole that needs an acidic stomach to dissolve
 * (flags.needsGastricAcid: ketoconazole) given with an acid suppressant
 * (flags.raisesGastricPh: omeprazole, famotidine) → moderate. Absorption falls
 * and the antifungal treatment may fail (Marks 2018).
 */

import { T, enName, koName, josa, lc, pairKey } from './util.js'

const RULE = { id: 'GASTRIC_PH_AZOLE', version: '1.0.0' }

function evaluate(ctx) {
  const contributions = []
  for (const az of ctx.meds) {
    if (!az.drug.flags?.needsGastricAcid) continue
    for (const sup of ctx.meds) {
      if (sup === az || sup.drug.id === az.drug.id || !sup.drug.flags?.raisesGastricPh) continue
      const aEn = enName(az.drug), aKo = koName(az.drug)
      const sEn = enName(sup.drug), sKo = koName(sup.drug)
      contributions.push({
        ruleId: RULE.id,
        ruleVersion: RULE.version,
        severity: 'moderate',
        problemKey: `pair:${pairKey(az.drug.id, sup.drug.id)}`,
        drugIds: [az.drug.id, sup.drug.id],
        factors: [],
        title: T(`${sEn} lowers ${lc(aEn)} absorption (raised gastric pH)`, `${josa(sKo, '이/가')} ${aKo} 흡수를 낮춤(위 pH 상승)`),
        consequence: T(`Less ${lc(aEn)} is absorbed, so the antifungal treatment may fail.`, `${aKo} 흡수가 줄어 항진균 치료가 실패할 수 있습니다.`),
        why: [
          T(`${aEn} is poorly soluble and needs an acidic stomach to dissolve; raising the gastric pH significantly impaired its dissolution and oral absorption in dogs (Marks 2018).`,
            `${josa(aKo, '은/는')} 잘 녹지 않아 산성 위 환경이 필요하며, 개에서 위 pH를 높이면 용해와 경구 흡수가 유의하게 저하되었습니다(Marks 2018).`),
          T(`${sEn} is an acid suppressant and raises the gastric pH.`, `${josa(sKo, '은/는')} 위산 억제제로 위 pH를 높입니다.`),
        ],
        actions: [
          T(`Avoid the combination. If acid suppression is essential, consider an antifungal whose absorption does not depend on gastric acid (fluconazole is more water-soluble; Marks 2018) or topical therapy.`,
            `병용을 피하십시오. 위산 억제가 꼭 필요하다면 흡수가 위산에 의존하지 않는 항진균제(플루코나졸은 수용성이 더 높음; Marks 2018)나 국소 치료를 고려하십시오.`),
          T(`If ${lc(aEn)} is continued, give it with food and watch for treatment failure.`, `${josa(aKo, '을/를')} 계속 투여한다면 음식과 함께 투여하고 치료 실패 여부를 관찰하십시오.`),
        ],
        alternatives: [T('Topical antifungal therapy if the azole is only for Malassezia (Negre 2009).', '아졸제가 말라세지아 치료 목적이라면 국소 항진균 치료(Negre 2009).')],
        sources: ['marks2018', 'negre2009'],
        evidence: 'literature',
        ownerSigns: [T('Skin or ear signs not improving on treatment', '치료 중에도 피부·귀 증상이 나아지지 않음')],
        organs: [],
        inputs: [
          { fact: `flags.needsGastricAcid.${az.drug.id}`, value: 'true', source: 'marks2018' },
          { fact: `flags.raisesGastricPh.${sup.drug.id}`, value: 'true' },
        ],
      })
    }
  }
  return { contributions }
}

export default {
  ...RULE,
  layer: 'pk',
  name: T('Azole absorption with acid suppression', '위산 억제제 병용 시 아졸 흡수 저하'),
  sources: ['marks2018', 'negre2009'],
  evaluate,
}
