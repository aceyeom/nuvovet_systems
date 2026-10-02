/**
 * MDR1_PGP_ML — macrocyclic lactone (P-gp substrate) in a dog, tiered by
 * ABCB1 (MDR1) risk, dose relative to the preventive/high-dose threshold, and a
 * concurrent P-gp inhibitor.
 *
 *   MDR1-risk breed or mutant genotype + high dose      → contraindicated
 *   high dose + P-gp inhibitor (any genotype/breed)     → major
 *   MDR1-risk breed or mutant genotype, preventive dose + P-gp inhibitor → moderate
 *   MDR1-risk breed or mutant genotype, preventive dose → minor (label preventive
 *     doses are safe even for mutant/mutant dogs — Mealey 2008)
 *   genotype unknown (breed not high/moderate risk) + high dose → moderate
 *   normal/normal + high dose, or preventive dose + inhibitor   → minor
 *   otherwise                                           → no finding
 * Missing data is never treated as safe: an uncomputable dose is treated as high.
 */

import { convertMass } from '../units.js'
import { isMdr1RiskBreed } from '../../knowledge/breeds.js'
import { T, enName, koName, josa, fmt, joinEn, joinKo, drugFactor } from './util.js'

const RULE = { id: 'MDR1_PGP_ML', version: '1.1.0' }

function genotypeClass(status) {
  if (status === 'mutant/mutant' || status === 'mutant/normal') return 'mutant'
  if (status === 'normal/normal') return 'clear'
  return 'unknown'
}

function evaluate(ctx) {
  const contributions = []
  if (ctx.species !== 'dog') return { contributions }

  for (const m of ctx.meds) {
    const drug = m.drug
    if (!drug.flags?.mdr1Sensitive) continue

    const thr = drug.flags.mdr1HighDoseThreshold || { value: 50, unit: 'mcg/kg' }
    const thrUnit = thr.unit.split('/')[0]
    const perKg = m.amount?.mg != null && ctx.weightKg > 0 ? convertMass(m.amount.mg / ctx.weightKg, 'mg', thrUnit) : null
    const doseKnown = perKg != null
    const highDose = doseKnown ? perKg > thr.value : true

    const inhibitors = ctx.meds.filter((o) => o !== m && ['strong', 'moderate'].includes(o.drug.pk?.pgp?.inhibitor))
    const hasInhibitor = inhibitors.length > 0
    const geno = genotypeClass(ctx.mdr1Status)
    const riskBreed = geno !== 'clear' && isMdr1RiskBreed(ctx.breed)
    const atRisk = geno === 'mutant' || riskBreed

    let severity = null
    if (atRisk && highDose) severity = 'contraindicated'
    else if (highDose && hasInhibitor) severity = 'major'
    else if (atRisk) severity = hasInhibitor ? 'moderate' : 'minor'
    else if (geno === 'unknown' && highDose) severity = 'moderate'
    else if (geno === 'clear' && highDose) severity = 'minor'
    else if (hasInhibitor) severity = 'minor'
    if (!severity) continue

    const dEn = enName(drug)
    const dKo = koName(drug)
    const doseText = doseKnown
      ? T(`${fmt(perKg)} ${thr.unit} (threshold ${thr.value} ${thr.unit})`, `${fmt(perKg)} ${thr.unit} (기준 ${thr.value} ${thr.unit})`)
      : T('Dose could not be calculated — treated as high', '용량 계산 불가 — 고용량으로 간주')

    // ── factors ──
    const factors = []
    if (ctx.breed) {
      factors.push({ kind: 'breed', id: ctx.breed.id, label: T(`${ctx.breed.en} — MDR1 risk: ${ctx.breed.mdr1.replace('_', ' ')}`, `${ctx.breed.ko[0]} — MDR1 위험: ${ { high: '높음', moderate: '중간', low: '낮음(보고됨)', not_reported: '보고 없음' }[ctx.breed.mdr1] }`) })
    } else {
      factors.push({ kind: 'breed', id: 'unknown', label: T(`Breed not recognised${ctx.breedText ? ` (“${ctx.breedText}”)` : ''}`, `품종 미확인${ctx.breedText ? ` (“${ctx.breedText}”)` : ''}`) })
    }
    factors.push({ kind: 'mdr1', id: ctx.mdr1Status || 'unknown', label: T(`ABCB1 genotype: ${ctx.mdr1Status || 'unknown'}`, `ABCB1 유전자형: ${ { unknown: '미검사', 'normal/normal': '정상/정상', 'mutant/normal': '변이/정상', 'mutant/mutant': '변이/변이' }[ctx.mdr1Status || 'unknown'] }`) })
    if (highDose) factors.push({ kind: 'dose', id: `${drug.id}_high`, label: T(`High dose: ${doseText.en}`, `고용량: ${doseText.ko}`) })
    // Schrickx 2014 shows in-vitro inhibition of canine P-gp but does not grade potency, so no grade is displayed.
    for (const i of inhibitors) factors.push(drugFactor(i.drug, 'P-gp inhibitor (canine P-gp, in vitro)', 'P-gp 억제제(개 P-gp, 시험관 내)'))

    // ── text ──
    const inhEn = joinEn(inhibitors.map((i) => lcFirst(enName(i.drug))))
    const inhKo = joinKo(inhibitors.map((i) => koName(i.drug)))
    let title
    if (severity === 'contraindicated' && !doseKnown) {
      title = T(`${dEn} in an MDR1-risk dog — dose not calculable, treated as high`, `MDR1 위험견에게 ${dKo} — 용량 계산 불가, 고용량으로 간주`)
    } else if (severity === 'contraindicated') {
      title = hasInhibitor
        ? T(`High-dose ${lcFirst(dEn)} in an MDR1-risk dog, with a P-gp inhibitor`, `MDR1 위험견에게 고용량 ${dKo} + P-gp 억제제 병용`)
        : T(`High-dose ${lcFirst(dEn)} in an MDR1-risk dog`, `MDR1 위험견에게 고용량 ${dKo}`)
    } else if (severity === 'major') {
      title = T(`High-dose ${lcFirst(dEn)} with a P-gp inhibitor (${inhEn})`, `고용량 ${josa(dKo, '과/와')} P-gp 억제제(${inhKo}) 병용`)
    } else if (atRisk) {
      title = T(`${dEn} in an MDR1-risk dog at a preventive dose`, `MDR1 위험견에게 예방 용량 ${dKo}`)
    } else if (geno === 'unknown' && highDose) {
      title = T(`MDR1 status unknown with high-dose ${lcFirst(dEn)}`, `MDR1 상태 미확인 상태에서 고용량 ${dKo}`)
    } else if (geno === 'clear' && highDose) {
      title = T(`High-dose ${lcFirst(dEn)} — genotype normal/normal, monitor`, `고용량 ${dKo} — 유전자형 정상/정상, 관찰 필요`)
    } else {
      title = T(`${dEn} with a P-gp inhibitor (${inhEn})`, `${josa(dKo, '과/와')} P-gp 억제제(${inhKo}) 병용`)
    }

    const consequence = T(
      `${dEn} is normally kept out of the brain by P-glycoprotein. When the transporter is missing (ABCB1 mutation) or blocked, ${lcFirst(dEn)} reaches the brain and causes neurotoxicity: ataxia, tremor, dilated pupils, blindness, coma and death.`,
      `${josa(dKo, '은/는')} 정상적으로 P-당단백질에 의해 뇌로 들어가지 못합니다. 이 수송체가 없거나(ABCB1 변이) 억제되면 ${josa(dKo, '이/가')} 뇌에 도달해 운동실조, 떨림, 산동, 실명, 혼수, 사망에 이르는 신경독성을 일으킵니다.`,
    )

    const why = []
    const sources = ['mealey2001', 'mealey2008']
    if (riskBreed) {
      const pct = ctx.breed.mdr1AlleleFreq != null ? Math.round(ctx.breed.mdr1AlleleFreq * 100) : null
      why.push(pct != null
        ? T(`${ctx.breed.en}: the mutant ABCB1 allele was found at about ${pct}% in a 7,378-dog genotyping series (Gramer 2010).`, `${ctx.breed.ko[0]}: 7,378두 유전자형 조사에서 변이 ABCB1 대립유전자 빈도가 약 ${pct}%였습니다(Gramer 2010).`)
        : T(`${ctx.breed.en}: the ABCB1-1Δ allele has been reported in this breed.`, `${ctx.breed.ko[0]}: 이 품종에서 ABCB1-1Δ 대립유전자가 보고되었습니다.`))
      sources.push(ctx.breed.source || 'gramer2010')
    }
    if (ctx.mdr1Status === 'mutant/mutant') {
      why.push(T('Genotype mutant/mutant: functional P-glycoprotein is absent; dogs homozygous for the deletion show the ivermectin-sensitive phenotype (Mealey 2001).',
        '유전자형 변이/변이: 기능성 P-당단백질이 없으며, 결손 변이 동형접합 개는 이버멕틴 민감 표현형을 보입니다(Mealey 2001).'))
    } else if (ctx.mdr1Status === 'mutant/normal') {
      why.push(T('Genotype mutant/normal (one copy of the deletion). Heterozygous Collies did not show ivermectin sensitivity in the original study (Mealey 2001); treating a heterozygous dog at anti-parasitic doses as contraindicated is this engine’s conservative choice.',
        '유전자형 변이/정상(결손 변이 1개). 원 연구에서 이형접합 콜리는 이버멕틴 민감성을 보이지 않았습니다(Mealey 2001). 이형접합 개의 구충 치료 용량을 금기로 분류한 것은 이 엔진의 보수적 판단입니다.'))
    }
    if (geno === 'unknown') {
      why.push(T('ABCB1 genotype has not been tested. The mutation also occurs in mixed-breed dogs, so an unremarkable breed does not rule it out.', 'ABCB1 유전자형 검사를 하지 않았습니다. 이 변이는 믹스견에서도 나타나므로 품종만으로 배제할 수 없습니다.'))
      sources.push('gramer2010')
    }
    if (highDose) {
      why.push(doseKnown
        ? T(`${fmt(perKg)} ${thr.unit} is an anti-parasitic dose, above the ${thr.value} ${thr.unit} threshold this engine uses; label heartworm-preventive doses are tolerated even by mutant/mutant dogs (Mealey 2008).`,
          `${fmt(perKg)} ${thr.unit}은 기생충 치료 용량으로, 이 엔진의 기준 ${thr.value} ${thr.unit}을 넘습니다. 라벨상 심장사상충 예방 용량은 변이/변이 개에서도 안전합니다(Mealey 2008).`)
        : T('The dose could not be calculated, so it is treated as high.', '용량을 계산할 수 없어 고용량으로 간주했습니다.'))
    } else {
      why.push(T(`${fmt(perKg)} ${thr.unit} is within the preventive range; the label reports no toxicity in ivermectin-sensitive Collies at 10× the preventive dose, but the margin narrows if the dose is exceeded or P-gp is blocked.`,
        `${fmt(perKg)} ${thr.unit}은 예방 용량 범위입니다. 라벨은 이버멕틴 민감 콜리에서 예방 용량의 10배까지 독성이 없었다고 보고하지만, 용량을 초과하거나 P-gp가 억제되면 안전역이 좁아집니다.`))
      sources.push('heartgard_label')
    }
    if (hasInhibitor) {
      why.push(T(`${inhEn.charAt(0).toUpperCase() + inhEn.slice(1)} inhibits canine P-glycoprotein in vitro (Schrickx 2014).`, `${josa(inhKo, '은/는')} 시험관 내에서 개 P-당단백질을 억제합니다(Schrickx 2014).`))
      sources.push('schrickx2014')
      if (inhibitors.some((i) => i.drug.id === 'ketoconazole')) {
        why.push(T('In 632 dogs given ketoconazole, adverse effects were significantly more frequent with concurrent ivermectin, and 3 of 4 ataxic dogs were also receiving ivermectin (Mayer 2008).',
          '케토코나졸을 투여한 632두에서 이버멕틴 병용 시 부작용이 유의하게 많았고, 운동실조를 보인 4두 중 3두가 이버멕틴을 함께 투여받았습니다(Mayer 2008).'))
        sources.push('mayer2008')
      }
    }

    const actions = []
    const alternatives = []
    if (!doseKnown) {
      actions.push(T('Select the strength, or enter the dose in mcg/kg or mg, so the dose can be checked.', '용량을 검토할 수 있도록 함량을 선택하거나 용량을 mcg/kg 또는 mg으로 입력하십시오.'))
    }
    if (severity === 'contraindicated') {
      actions.push(T(`Do not start high-dose ${lcFirst(dEn)} until the ABCB1 genotype is known.`, `ABCB1 유전자형을 확인하기 전에는 고용량 ${josa(dKo, '을/를')} 시작하지 마십시오.`))
    } else if (severity === 'major') {
      actions.push(T(`Avoid combining high-dose ${lcFirst(dEn)} with ${inhEn}.`, `고용량 ${josa(dKo, '과/와')} ${inhKo}의 병용을 피하십시오.`))
    }
    if (geno === 'unknown' && (highDose || atRisk)) {
      actions.push(T('Request ABCB1 (MDR1) genotyping (cheek swab or blood) before any extra-label macrocyclic lactone dose.', '허가 외 용량의 마크로사이클릭 락톤을 쓰기 전에 ABCB1(MDR1) 유전자 검사(구강 면봉 또는 혈액)를 의뢰하십시오.'))
    }
    if (hasInhibitor && highDose) {
      actions.push(T(`Remove or replace ${inhEn} while ${lcFirst(dEn)} is given.`, `${josa(dKo, '을/를')} 투여하는 동안 ${josa(inhKo, '을/를')} 중단하거나 대체하십시오.`))
    } else if (hasInhibitor) {
      // At a label preventive dose the inhibitor (e.g. ciclosporin for atopic dermatitis) need not be stopped.
      actions.push(T(`If ${inhEn} is needed, keep strictly to the labelled preventive dose of ${lcFirst(dEn)} and watch for neurological signs.`, `${josa(inhKo, '이/가')} 꼭 필요하다면 ${dKo}의 라벨 예방 용량을 엄격히 지키고 신경 증상을 관찰하십시오.`))
    }
    if (highDose && severity !== 'contraindicated') {
      actions.push(T('If high-dose treatment proceeds, increase the dose gradually and stop at the first neurological sign.', '고용량 치료를 진행한다면 용량을 단계적으로 올리고 신경 증상이 처음 보일 때 즉시 중단하십시오.'))
    }
    if (!highDose) {
      actions.push(T('Keep to the labelled preventive dose; avoid access to concentrated large-animal products.', '라벨 예방 용량을 지키고, 고농도 대동물용 제품에 접근하지 않도록 하십시오.'))
    }
    if (highDose) {
      alternatives.push(T('Isoxazoline (e.g. afoxolaner, fluralaner, sarolaner) — effective for canine demodicosis per the WAVD guideline (Mueller 2020).', '이속사졸린계(예: 아폭솔라너, 플루랄라너, 사롤라너) — WAVD 가이드라인상 개 모낭충증에 효과적(Mueller 2020).'))
      sources.push('mueller2020')
    }
    alternatives.push(T('ABCB1 (MDR1) genotyping to guide any future macrocyclic lactone use.', '향후 마크로사이클릭 락톤 사용 판단을 위한 ABCB1(MDR1) 유전자 검사.'))
    if (inhibitors.some((i) => i.drug.id === 'ketoconazole')) {
      alternatives.push(T('Topical therapy for Malassezia instead of systemic ketoconazole (2% miconazole + 2% chlorhexidine has good evidence; Negre 2009).', '전신 케토코나졸 대신 말라세지아 국소 치료(2% 미코나졸 + 2% 클로르헥시딘의 근거가 좋음; Negre 2009).'))
      sources.push('negre2009')
    }

    contributions.push({
      ruleId: RULE.id,
      ruleVersion: RULE.version,
      severity,
      problemKey: `mdr1:${drug.id}`,
      drugIds: [drug.id, ...inhibitors.map((i) => i.drug.id)],
      factors,
      title,
      consequence,
      why,
      actions,
      alternatives,
      sources,
      evidence: 'literature',
      ownerSigns: drug.ownerSigns || [],
      organs: ['cns'],
      inputs: [
        { fact: 'species', value: 'dog' },
        { fact: 'breed', value: ctx.breed ? `${ctx.breed.id} (mdr1: ${ctx.breed.mdr1})` : 'unknown', source: ctx.breed?.source || undefined },
        { fact: 'mdr1Status', value: ctx.mdr1Status || 'unknown' },
        { fact: `dose.${drug.id}`, value: doseKnown ? `${fmt(perKg)} ${thr.unit}` : 'not computable' },
        { fact: 'threshold', value: `${thr.value} ${thr.unit} (engine setting between preventive and anti-parasitic dosing)` },
        ...inhibitors.map((i) => ({ fact: 'pgpInhibitor', value: `${i.drug.id} (canine P-gp, in vitro)`, source: 'schrickx2014' })),
      ],
    })
  }
  return { contributions }
}

function lcFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

export default {
  ...RULE,
  layer: 'species_breed',
  name: T('MDR1 / P-glycoprotein — macrocyclic lactones', 'MDR1 / P-당단백질 — 마크로사이클릭 락톤'),
  sources: ['mealey2001', 'mealey2008', 'gramer2010', 'mealeyMeurs2008', 'schrickx2014', 'mueller2020'],
  evaluate,
}
