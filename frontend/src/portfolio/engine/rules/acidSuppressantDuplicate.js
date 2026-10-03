/**
 * ACID_SUPPRESSANT_DUPLICATE: a proton-pump inhibitor and an H2-receptor
 * antagonist prescribed together → minor. Not a toxicity: the second drug adds
 * no measured acid suppression, so it is a duplication to review.
 * Source: ACVIM consensus (Marks 2018), "No benefit was detected in MPT
 * intragastric pH ≥ 3 and 4 in healthy dogs when famotidine was administered
 * concurrently with IV pantoprazole."
 */

import { T, enName, koName, pairKey, drugFactor } from './util.js'

const RULE = { id: 'ACID_SUPPRESSANT_DUPLICATE', version: '1.0.0' }

function evaluate(ctx) {
  const contributions = []
  const ppis = ctx.meds.filter((m) => m.drug.flags?.acidSuppressant === 'ppi')
  const h2s = ctx.meds.filter((m) => m.drug.flags?.acidSuppressant === 'h2ra')
  const seen = new Set()
  for (const a of ppis) {
    for (const b of h2s) {
      const key = pairKey(a.drug.id, b.drug.id)
      if (seen.has(key)) continue
      seen.add(key)
      contributions.push({
        ruleId: RULE.id,
        ruleVersion: RULE.version,
        severity: 'minor',
        problemKey: `pair:${key}`,
        drugIds: [a.drug.id, b.drug.id],
        factors: [
          drugFactor(a.drug, 'proton-pump inhibitor', '양성자펌프억제제'),
          drugFactor(b.drug, 'H2-receptor antagonist', 'H2 수용체 길항제'),
        ],
        title: T(`Two acid suppressants: ${enName(a.drug)} and ${enName(b.drug).toLowerCase()}`, `위산억제제 중복: ${koName(a.drug)} + ${koName(b.drug)}`),
        consequence: T('The H2-receptor antagonist is unlikely to add acid suppression to the proton-pump inhibitor; it adds tablets and cost.', 'H2 수용체 길항제가 양성자펌프억제제에 위산 억제 효과를 더할 가능성이 낮고, 투약 부담과 비용만 늘어납니다.'),
        why: [
          T('ACVIM consensus: in healthy dogs, famotidine given with IV pantoprazole did not increase the time intragastric pH stayed at or above 3 and 4 (Marks 2018).',
            'ACVIM 합의문: 건강한 개에서 정맥 판토프라졸에 파모티딘을 함께 투여해도 위내 pH 3 및 4 이상 유지 시간이 늘지 않았습니다(Marks 2018).'),
          T('That study used IV pantoprazole; this combination of oral products was not tested directly.', '해당 연구는 정맥 판토프라졸을 사용했으며, 이 경구 제품 조합을 직접 시험하지는 않았습니다.'),
        ],
        actions: [
          T('Use one acid suppressant; a proton-pump inhibitor twice daily is the more effective choice.', '위산억제제는 한 가지만 사용하십시오. 1일 2회 양성자펌프억제제가 더 효과적인 선택입니다.'),
        ],
        alternatives: [],
        sources: ['marks2018'],
        evidence: 'literature',
        ownerSigns: [],
        organs: [],
        inputs: [
          { fact: `flags.acidSuppressant.${a.drug.id}`, value: 'ppi' },
          { fact: `flags.acidSuppressant.${b.drug.id}`, value: 'h2ra' },
        ],
      })
    }
  }
  return { contributions }
}

export default {
  ...RULE,
  layer: 'pd',
  name: T('Duplicate acid suppressants', '위산억제제 중복'),
  sources: ['marks2018'],
  evaluate,
}
