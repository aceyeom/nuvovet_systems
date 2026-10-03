/** ALLERGY_CLASS — a prescribed drug's allergy class is on the patient's allergy list → major. */

import { ALLERGY_BY_ID } from '../../knowledge/allergyClasses.js'
import { T, enName, koName } from './util.js'

const RULE = { id: 'ALLERGY_CLASS', version: '1.0.0' }

function evaluate(ctx) {
  const contributions = []
  for (const m of ctx.meds) {
    const cls = m.drug.flags?.allergyClass
    if (!cls || !ctx.allergies.has(cls)) continue
    const label = ALLERGY_BY_ID[cls]?.label || T(cls, cls)
    contributions.push({
      ruleId: RULE.id,
      ruleVersion: RULE.version,
      severity: 'major',
      problemKey: `allergy:${m.drug.id}`,
      drugIds: [m.drug.id],
      factors: [{ kind: 'allergy', id: cls, label: T(`Recorded allergy: ${label.en}`, `알레르기 기록: ${label.ko}`) }],
      title: T(`${enName(m.drug)} belongs to a class this patient is recorded as allergic to (${label.en})`, `${koName(m.drug)}: 기록된 알레르기 계열(${label.ko})에 해당`),
      consequence: T('A previous reaction to this drug class may recur.', '이 계열 약물에 대한 이전 반응이 재발할 수 있습니다.'),
      why: [T(`The patient record lists an allergy to ${label.en.toLowerCase()}; ${enName(m.drug).toLowerCase()} is in that class.`, `환자 기록에 ${label.ko} 알레르기가 있으며, ${koName(m.drug)}도 이 계열입니다.`)],
      actions: [
        T('Choose a drug from a different class.', '다른 계열의 약물을 선택하십시오.'),
        T('If there is no alternative, confirm what the previous reaction was and document the decision.', '대안이 없다면 이전 반응의 내용을 확인하고 결정 근거를 기록하십시오.'),
      ],
      alternatives: [],
      sources: [],
      evidence: 'mechanistic',
      ownerSigns: [
        T('Facial swelling, hives or itching', '얼굴 부종, 두드러기 또는 가려움'),
        T('Vomiting or collapse soon after a dose', '투약 직후 구토 또는 쓰러짐'),
        T('Difficulty breathing', '호흡곤란'),
      ],
      organs: [],
      inputs: [
        { fact: 'allergies', value: [...ctx.allergies].join(', ') },
        { fact: `flags.allergyClass.${m.drug.id}`, value: cls },
      ],
    })
  }
  return { contributions }
}

export default {
  ...RULE,
  layer: 'patient',
  name: T('Recorded drug-class allergy', '기록된 약물 계열 알레르기'),
  sources: [],
  evaluate,
}
