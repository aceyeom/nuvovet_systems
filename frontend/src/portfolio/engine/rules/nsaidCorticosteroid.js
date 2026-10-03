/** NSAID_CORTICOSTEROID — NSAID + corticosteroid given concurrently → major (GI ulceration/perforation). */

import { T, enName, koName, pairKey } from './util.js'

const RULE = { id: 'NSAID_CORTICOSTEROID', version: '1.0.0' }

function evaluate(ctx) {
  const contributions = []
  const nsaids = ctx.meds.filter((m) => m.drug.flags?.nsaid)
  const steroids = ctx.meds.filter((m) => m.drug.flags?.corticosteroid)
  for (const n of nsaids) {
    for (const s of steroids) {
      contributions.push({
        ruleId: RULE.id,
        ruleVersion: RULE.version,
        severity: 'major',
        problemKey: `pair:${pairKey(n.drug.id, s.drug.id)}`,
        drugIds: [n.drug.id, s.drug.id],
        factors: [],
        title: T(`NSAID + corticosteroid: ${enName(n.drug)} with ${enName(s.drug).toLowerCase()}`, `NSAID + 코르티코스테로이드: ${koName(n.drug)} + ${koName(s.drug)}`),
        consequence: T('Gastrointestinal ulceration, bleeding and perforation, which can be fatal.', '위장관 궤양, 출혈, 천공이 생길 수 있으며 치명적일 수 있습니다.'),
        why: [
          T('Of 29 dogs with GI perforation while on a COX-2-selective NSAID, 17 (59%) had received another NSAID or a corticosteroid within 24 hours (Lascelles 2005).',
            'COX-2 선택적 NSAID 투여 중 위장관 천공이 생긴 29두 중 17두(59%)가 24시간 이내에 다른 NSAID나 코르티코스테로이드를 투여받았습니다(Lascelles 2005).'),
          T('NSAIDs are associated with gastroduodenal ulceration in dogs, and glucocorticoids injure the gastric mucosa by weakening its defences rather than by increasing acid (Marks 2018).', 'NSAID는 개에서 위십이지장 궤양과 관련되며, 글루코코르티코이드는 위산 증가가 아니라 점막 방어기전 약화를 통해 위점막을 손상시킵니다(Marks 2018).'),
        ],
        actions: [
          T('Do not give an NSAID and a corticosteroid together or in close succession.', 'NSAID와 코르티코스테로이드를 함께 또는 연달아 투여하지 마십시오.'),
          T('Choose one anti-inflammatory approach; if switching, leave a drug-free interval.', '항염증 전략은 하나만 선택하고, 전환 시에는 휴약 기간을 두십시오.'),
          T('If both are unavoidable, tell the owner to stop and call at the first sign of black stools, vomiting or loss of appetite.', '병용이 불가피하다면 검은 변, 구토, 식욕 부진이 처음 보일 때 투약을 멈추고 연락하도록 보호자에게 안내하십시오.'),
        ],
        alternatives: [],
        sources: ['lascelles2005', 'marks2018'],
        evidence: 'literature',
        ownerSigns: [
          T('Black, tarry stools', '검은 타르 같은 변'),
          T('Vomiting, especially with blood', '구토, 특히 피가 섞인 구토'),
          T('Not eating, weakness or pale gums', '식욕 부진, 기력 저하 또는 창백한 잇몸'),
        ],
        organs: ['gi'],
        inputs: [
          { fact: `flags.nsaid.${n.drug.id}`, value: 'true' },
          { fact: `flags.corticosteroid.${s.drug.id}`, value: 'true' },
        ],
      })
    }
  }
  return { contributions }
}

export default {
  ...RULE,
  layer: 'pd',
  name: T('NSAID + corticosteroid', 'NSAID + 코르티코스테로이드'),
  sources: ['lascelles2005', 'marks2018'],
  evaluate,
}
