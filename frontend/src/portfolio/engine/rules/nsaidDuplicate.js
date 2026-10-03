/** NSAID_DUPLICATE — two NSAIDs at the same time → major. */

import { T, enName, koName, pairKey } from './util.js'

const RULE = { id: 'NSAID_DUPLICATE', version: '1.0.0' }

function evaluate(ctx) {
  const contributions = []
  const nsaids = ctx.meds.filter((m) => m.drug.flags?.nsaid)
  for (let i = 0; i < nsaids.length; i++) {
    for (let j = i + 1; j < nsaids.length; j++) {
      const a = nsaids[i], b = nsaids[j]
      if (a.drug.id === b.drug.id) continue
      contributions.push({
        ruleId: RULE.id,
        ruleVersion: RULE.version,
        severity: 'major',
        problemKey: `pair:${pairKey(a.drug.id, b.drug.id)}`,
        drugIds: [a.drug.id, b.drug.id],
        factors: [],
        title: T(`Two NSAIDs: ${enName(a.drug)} and ${enName(b.drug).toLowerCase()}`, `NSAID 중복: ${koName(a.drug)} + ${koName(b.drug)}`),
        consequence: T('Additive gastrointestinal and kidney toxicity, including ulceration and perforation.', '궤양·천공을 포함한 위장관 및 신장 독성이 중첩됩니다.'),
        why: [
          T('Of 29 dogs with GI perforation on a COX-2-selective NSAID, 59% had another NSAID or a corticosteroid within 24 hours (Lascelles 2005).',
            'COX-2 선택적 NSAID 투여 중 위장관 천공이 생긴 29두 중 59%가 24시간 이내 다른 NSAID나 코르티코스테로이드를 투여받았습니다(Lascelles 2005).'),
          T('Each label carries the NSAID class warning for gastrointestinal, kidney and liver toxicity.', '각 제품 라벨에 위장관·신장·간 독성에 대한 NSAID 계열 경고가 있습니다.'),
        ],
        actions: [
          T('Use one NSAID only.', 'NSAID는 한 가지만 사용하십시오.'),
          T('When switching NSAIDs, do not give them in close succession; leave a drug-free interval.', 'NSAID를 바꿀 때는 연달아 투여하지 말고 휴약 기간을 두십시오.'),
        ],
        alternatives: [],
        sources: ['lascelles2005'],
        evidence: 'literature',
        ownerSigns: a.drug.ownerSigns || [],
        organs: ['gi', 'kidney'],
        inputs: [
          { fact: `flags.nsaid.${a.drug.id}`, value: 'true' },
          { fact: `flags.nsaid.${b.drug.id}`, value: 'true' },
        ],
      })
    }
  }
  return { contributions }
}

export default {
  ...RULE,
  layer: 'pd',
  name: T('Duplicate NSAIDs', 'NSAID 중복'),
  sources: ['lascelles2005'],
  evaluate,
}
