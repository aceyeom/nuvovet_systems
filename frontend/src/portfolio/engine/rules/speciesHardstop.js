/**
 * SPECIES_HARDSTOP — drugs labelled/documented as contraindicated for the
 * patient's species (cat + permethrin, cat + acetaminophen) → contraindicated.
 * Driven by drugs[].speciesCautions entries with severity 'contraindicated'.
 *
 * Also: a species caution with severity 'major' and a condition (`when`) that
 * the prescription meets → major. Today that is meloxicam given repeatedly to a
 * cat (US boxed warning). It shares problemKey `dose:<drug>` with DOSE_RANGE, so
 * a repeated single-dose protocol merges into the same card. Cautions whose
 * condition is not met stay monitoring notes (ADMIN_NOTES).
 */

import { T, enName, koName, josa, riskOrgans, SPECIES_TEXT } from './util.js'
import { FREQUENCY_BY_ID } from '../dose.js'

const RULE = { id: 'SPECIES_HARDSTOP', version: '1.1.0' }

/** Is the prescription repeated? A blank frequency is not assumed to be repeated. */
function isRepeated(m) {
  return Boolean(m.freqId && m.freqId !== 'once')
}

/** Does a conditional ('major' + `when`) species caution apply to this prescription line? */
export function conditionalCautionApplies(c, m, species) {
  if (c.species !== species || c.severity !== 'major' || !c.when) return false
  if (c.when.repeated) return isRepeated(m)
  return false
}

const CONDITIONAL = {
  meloxicam: {
    title: T('Repeated meloxicam in a cat (US boxed warning)', '고양이에게 멜록시캄 반복 투여(미국 박스 경고)'),
    consequence: T('Acute kidney injury and death have been reported with repeated use in cats.', '고양이에서 반복 투여 시 급성 신손상과 사망이 보고되었습니다.'),
    actions: [T('Give a single dose only, or use an NSAID and regimen labelled for repeated use in cats.', '1회만 투여하거나, 고양이 반복 투여가 허가된 NSAID와 용법을 사용하십시오.')],
    organs: ['kidney'],
  },
}

const SPECIFIC = {
  permethrin: {
    consequence: T('Tremors, twitching, seizures and death.', '떨림, 근육 경련, 발작, 사망.'),
    actions: [
      T('Do not apply. If it has already been applied, wash the cat with a mild liquid detergent and treat as an emergency.', '바르지 마십시오. 이미 발랐다면 순한 액상 세제로 씻기고 응급 상황으로 처치하십시오.'),
      T('Intravenous lipid emulsion has been used as an adjunct: treated cats improved sooner than controls (Peacock 2015).', '정맥 지질 유제가 보조 치료로 사용되며, 투여한 고양이가 대조군보다 빨리 호전되었습니다(Peacock 2015).'),
      T('Keep cats away from dogs recently treated with a permethrin product.', '최근 퍼메트린 제품을 바른 개와 고양이를 떨어뜨려 두십시오.'),
    ],
    alternatives: [T('An ectoparasiticide labelled for cats.', '고양이용으로 허가된 외부기생충 구제제.')],
    sources: ['linnett2008', 'peacock2015'],
  },
  acetaminophen: {
    consequence: T('Methaemoglobinaemia (brown or bluish gums, laboured breathing) and sometimes fatal liver failure.', '메트헤모글로빈혈증(갈색·푸른 잇몸, 호흡곤란)과 때로 치명적인 간부전.'),
    actions: [
      T('Do not give. If a cat has swallowed acetaminophen, treat as an emergency; N-acetylcysteine is the recommended antidote treatment (Rumbeiha 1995).', '투여하지 마십시오. 고양이가 삼켰다면 응급 상황이며, N-아세틸시스테인이 권장 해독 치료입니다(Rumbeiha 1995).'),
    ],
    alternatives: [T('For feline pain, a drug and dose labelled for cats, e.g. robenacoxib 1 mg/kg once daily for up to 3 days (Onsior label).', '고양이 통증에는 고양이용 허가 약물과 용량, 예: 로베나콕시브 1 mg/kg 1일 1회 최대 3일(Onsior 라벨).')],
    sources: ['rumbeiha1995', 'onsior_label'],
  },
}

function evaluate(ctx) {
  const contributions = []
  for (const m of ctx.meds) {
    for (const c of m.drug.speciesCautions || []) {
      if (conditionalCautionApplies(c, m, ctx.species)) {
        const extra = CONDITIONAL[m.drug.id] || {}
        const sp = SPECIES_TEXT[ctx.species]
        contributions.push({
          ruleId: RULE.id,
          ruleVersion: RULE.version,
          severity: 'major',
          problemKey: `dose:${m.drug.id}`,
          drugIds: [m.drug.id],
          factors: [
            { kind: 'species', id: ctx.species, label: T(`Species: ${sp.en}`, `종: ${sp.ko}`) },
            { kind: 'dose', id: `${m.drug.id}_repeat`, label: T(`Repeated: ${(FREQUENCY_BY_ID[m.freqId]?.label.en || m.freqId).toLowerCase()}`, `반복 투여: ${FREQUENCY_BY_ID[m.freqId]?.label.ko || m.freqId}`) },
          ],
          title: extra.title || T(`${enName(m.drug)} repeated in a ${sp.en}`, `${sp.ko}에게 ${koName(m.drug)} 반복 투여`),
          consequence: extra.consequence || c.text,
          why: [c.text],
          actions: extra.actions || [T('Give a single dose only.', '1회만 투여하십시오.')],
          alternatives: [],
          sources: [c.source],
          evidence: 'label',
          ownerSigns: m.drug.ownerSigns || [],
          organs: extra.organs || [],
          inputs: [
            { fact: 'species', value: ctx.species },
            { fact: `frequency.${m.drug.id}`, value: m.freqId },
            { fact: `speciesCautions.${m.drug.id}`, value: 'major when repeated', source: c.source },
          ],
        })
        continue
      }
      if (c.species !== ctx.species || c.severity !== 'contraindicated') continue
      const extra = SPECIFIC[m.drug.id] || { actions: [T('Do not dispense.', '조제하지 마십시오.')], alternatives: [], sources: [] }
      const sp = SPECIES_TEXT[ctx.species]
      contributions.push({
        ruleId: RULE.id,
        ruleVersion: RULE.version,
        severity: 'contraindicated',
        problemKey: `species:${m.drug.id}`,
        drugIds: [m.drug.id],
        factors: [{ kind: 'species', id: ctx.species, label: T(`Species: ${sp.en}`, `종: ${sp.ko}`) }],
        title: T(`${enName(m.drug)} is contraindicated in ${sp.en}s`, `${josa(koName(m.drug), '은/는')} ${sp.ko}에게 금기입니다`),
        consequence: extra.consequence || c.text,
        why: [c.text],
        actions: extra.actions,
        alternatives: extra.alternatives,
        sources: [c.source, ...extra.sources],
        evidence: 'literature',
        ownerSigns: m.drug.ownerSigns || [],
        organs: riskOrgans(m.drug, ctx.species, 3),
        inputs: [
          { fact: 'species', value: ctx.species },
          { fact: `speciesCautions.${m.drug.id}`, value: 'contraindicated', source: c.source },
        ],
      })
    }
  }
  return { contributions }
}

export default {
  ...RULE,
  layer: 'species_breed',
  name: T('Species hard stop', '종 특이 금기'),
  sources: ['linnett2008', 'rumbeiha1995'],
  evaluate,
}
