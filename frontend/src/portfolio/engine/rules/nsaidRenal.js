/**
 * NSAID_RENAL — NSAID + a label-named renal risk factor: CKD on the problem
 * list or creatinine above the species cut-off, dehydration, or a concurrent
 * loop diuretic. A concurrent ACE inhibitor is added as a factor when the rule
 * fires. Moderate for a dog, major for a cat.
 */

import { CONDITION_BY_ID } from '../../knowledge/conditions.js'
import { T, enName, koName, lc, joinEn, joinKo, drugFactor, uniqueBy } from './util.js'

const RULE = { id: 'NSAID_RENAL', version: '1.1.0' }

function evaluate(ctx) {
  const contributions = []
  const dehydrated = ctx.conditions.has('dehydration')
  const diuretics = uniqueBy(ctx.meds.filter((o) => o.drug.flags?.loopDiuretic).map((o) => o.drug), (d) => d.id)
  const aceis = uniqueBy(ctx.meds.filter((o) => o.drug.flags?.aceInhibitor).map((o) => o.drug), (d) => d.id)
  if (!ctx.kidney.affected && !dehydrated && !diuretics.length) return { contributions }
  for (const m of ctx.meds) {
    if (!m.drug.flags?.nsaid) continue
    const cat = ctx.species === 'cat'
    const labelSource = m.protocol?.source || (m.drug.organRisk?.kidney && (Array.isArray(m.drug.organRisk.kidney) ? m.drug.organRisk.kidney[0].source : m.drug.organRisk.kidney.source)) || null
    const why = [
      T('NSAID labels name patients with existing kidney disease, dehydration or diuretic treatment as those at greatest risk of renal toxicity (class warning).',
        'NSAID 라벨은 기존 신장병, 탈수, 이뇨제 병용 환자를 신독성 위험이 가장 큰 대상으로 명시합니다(계열 경고).'),
    ]
    const sources = []
    if (labelSource) sources.push(labelSource)
    if (cat) {
      why.push(T('Cats: the ISFM/AAFP consensus guideline covers long-term NSAID use in cats, including risk assessment and monitoring (Sparkes 2010).',
        '고양이: ISFM/AAFP 합의 가이드라인은 위험 평가와 모니터링을 포함한 고양이 NSAID 장기 사용을 다룹니다(Sparkes 2010).'))
      sources.push('sparkes2010')
      if (m.drug.id === 'meloxicam') {
        why.push(T('US meloxicam label (cats): boxed warning — repeated use has been associated with acute renal failure and death.', '미국 멜록시캄 라벨(고양이): 박스 경고 — 반복 투여가 급성 신부전 및 사망과 관련되었습니다.'))
        sources.push('metacam_label')
      }
    }
    if (ctx.kidney.creatinineHigh) sources.push('iris2023')

    // Further risk factors on this prescription.
    const factors = [...ctx.kidney.factors]
    const riskEn = []
    const riskKo = []
    const inputs = []
    if (dehydrated) {
      factors.push({ kind: 'condition', id: 'dehydration', label: CONDITION_BY_ID.dehydration.label })
      why.push(T('The patient is recorded as dehydrated or hypovolaemic, a label-named risk factor.', '환자가 탈수 또는 저혈량 상태로 기록되어 있으며, 이는 라벨에 명시된 위험 요인입니다.'))
      riskEn.push('dehydration'); riskKo.push('탈수')
      inputs.push({ fact: 'conditions', value: 'dehydration' })
    }
    if (diuretics.length) {
      const en = joinEn(diuretics.map((d) => lc(enName(d)))), ko = joinKo(diuretics.map(koName))
      for (const d of diuretics) factors.push(drugFactor(d, 'loop diuretic', '루프 이뇨제'))
      why.push(T(`Concurrent loop diuretic (${en}): diuretic treatment is a label-named risk factor and lowers circulating volume.`, `루프 이뇨제(${ko}) 병용: 이뇨제 치료는 라벨에 명시된 위험 요인이며 순환 혈액량을 줄입니다.`))
      riskEn.push(en); riskKo.push(ko)
      for (const d of diuretics) inputs.push({ fact: `flags.loopDiuretic.${d.id}`, value: 'true' })
    }
    if (aceis.length) {
      const en = joinEn(aceis.map((d) => lc(enName(d)))), ko = joinKo(aceis.map(koName))
      for (const d of aceis) factors.push(drugFactor(d, 'ACE inhibitor', 'ACE 억제제'))
      why.push(T(`Concurrent ACE inhibitor (${en}) lowers glomerular filtration pressure, so the kidney compensates less well when the NSAID removes prostaglandin-supported renal blood flow (mechanism).`,
        `ACE 억제제(${ko}) 병용: 사구체 여과압을 낮추므로, NSAID가 프로스타글란딘 의존 신혈류를 줄일 때 신장의 보상이 더 어렵습니다(기전).`))
      riskEn.push(en); riskKo.push(ko)
      for (const d of aceis) inputs.push({ fact: `flags.aceInhibitor.${d.id}`, value: 'true' })
    }
    const spEn = cat ? 'cat' : 'dog', spKo = cat ? '고양이' : '개'
    const title = ctx.kidney.affected
      ? T(`${enName(m.drug)} (NSAID) in a ${spEn} with kidney disease`, `신장병이 있는 ${spKo}에게 ${koName(m.drug)}(NSAID)`)
      : T(`${enName(m.drug)} (NSAID) with renal risk factors: ${joinEn(riskEn)}`, `신장 위험 요인(${joinKo(riskKo)})이 있는 ${spKo}에게 ${koName(m.drug)}(NSAID)`)

    contributions.push({
      ruleId: RULE.id,
      ruleVersion: RULE.version,
      severity: cat ? 'major' : 'moderate',
      problemKey: `renal:${m.drug.id}`,
      drugIds: [m.drug.id, ...diuretics.map((d) => d.id), ...aceis.map((d) => d.id)],
      factors,
      title,
      consequence: T('Further loss of kidney function, including acute kidney injury.', '급성 신손상을 포함한 신기능 추가 악화.'),
      why,
      actions: [
        T('Prefer a non-NSAID option; if an NSAID is essential, confirm hydration first and use the lowest effective dose for the shortest time.', 'NSAID가 아닌 선택지를 우선 고려하고, 꼭 필요하다면 먼저 수화 상태를 확인한 뒤 최소 유효 용량을 최단 기간 사용하십시오.'),
        T('Recheck creatinine (and urine specific gravity) after starting and during treatment.', '투여 시작 후와 치료 중에 크레아티닌(및 요비중)을 재검하십시오.'),
      ],
      alternatives: [],
      sources,
      evidence: cat ? 'literature' : 'label',
      ownerSigns: [
        T('Drinking or urinating more, or much less', '물·소변량이 크게 늘거나 크게 줄어듦'),
        T('Vomiting or not eating', '구토 또는 식욕 부진'),
      ],
      organs: ['kidney'],
      inputs: [
        { fact: 'species', value: ctx.species },
        ...ctx.kidney.inputs,
        ...inputs,
        { fact: `flags.nsaid.${m.drug.id}`, value: 'true' },
      ],
    })
  }
  return { contributions }
}

export default {
  ...RULE,
  layer: 'drug_disease',
  name: T('NSAID with kidney disease or renal risk factors', '신장병·신장 위험 요인이 있는 환자의 NSAID'),
  sources: ['sparkes2010', 'metacam_label', 'iris2023'],
  evaluate,
}
