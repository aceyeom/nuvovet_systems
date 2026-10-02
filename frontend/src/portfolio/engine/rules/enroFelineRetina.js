/**
 * ENRO_FELINE_RETINA — cat, enrofloxacin above 5 mg/kg per day (24-hour
 * exposure computed from the per-dose amount and the frequency) → major.
 * Missing data is not treated as safe: without a usable frequency, one
 * administration is at least one dose that day, so a single dose above the
 * daily limit still fires.
 * Shares problemKey `dose:<drug>` with DOSE_RANGE so both merge into one card.
 */

import { T, enName, koName, fmt } from './util.js'

const RULE = { id: 'ENRO_FELINE_RETINA', version: '1.1.0' }

export const SINGLE_DOSE_OVER_DAILY = T('The frequency was not entered or gives no fixed daily count, so no daily total was calculated — but a single dose already exceeds the daily maximum.',
  '투여 빈도가 입력되지 않았거나 고정된 1일 횟수가 없어 1일 총량은 계산하지 않았지만, 1회 용량만으로도 1일 최대치를 넘습니다.')

function evaluate(ctx) {
  const contributions = []
  if (ctx.species !== 'cat') return { contributions }
  for (const m of ctx.meds) {
    const limit = m.drug.flags?.felineRetinalLimit
    if (!limit) continue
    const perDosePerKg = m.amount?.mg != null && ctx.weightKg > 0 ? m.amount.mg / ctx.weightKg : null
    const fromSingleDose = m.exposure24hPerKg == null
    const daily = m.exposure24hPerKg ?? perDosePerKg
    if (daily == null || daily <= limit.value * (1 + 1e-9)) continue
    const why = [
      fromSingleDose
        ? T(`A single administration is ${fmt(daily)} mg/kg, already above the feline label maximum of ${limit.value} mg/kg per day (Baytril label).`,
          `1회 투여량이 ${fmt(daily)} mg/kg으로, 이미 고양이 라벨 최대 용량 ${limit.value} mg/kg/일을 넘습니다(Baytril 라벨).`)
        : T(`Entered regimen gives ${fmt(daily)} mg/kg in 24 h; the feline label maximum is ${limit.value} mg/kg per day (Baytril label).`, `입력한 처방은 24시간당 ${fmt(daily)} mg/kg으로, 고양이 라벨 최대 용량 ${limit.value} mg/kg/일을 넘습니다(Baytril 라벨).`),
      // Same sentence as DOSE_RANGE, so the merged card shows it once.
      ...(fromSingleDose ? [SINGLE_DOSE_OVER_DAILY] : []),
      T('Acute, diffuse retinal degeneration and blindness were reported in 17 cats after enrofloxacin; vision returned in only a few (Gelatt 2001).', '엔로플록사신 투여 후 고양이 17두에서 급성 미만성 망막 변성과 실명이 보고되었고, 시력이 회복된 경우는 일부에 불과했습니다(Gelatt 2001).'),
      T('Risk factors include high doses or plasma concentrations, rapid IV infusion, long courses and older age (Wiebe & Hamilton 2002).', '위험 요인은 고용량 또는 높은 혈중 농도, 빠른 정맥 주입, 장기 투여, 고령입니다(Wiebe & Hamilton 2002).'),
    ]
    if (ctx.kidney.affected) {
      why.push(T('Kidney disease may allow the drug or its metabolites to accumulate; Wiebe & Hamilton (2002) suggest considering dose reduction in cats with renal impairment, although no study has established it.', '신장병이 있으면 약물이나 대사체가 축적될 수 있습니다. Wiebe & Hamilton(2002)은 신기능 저하 고양이에서 감량을 고려하도록 제안하지만, 이를 입증한 연구는 없습니다.'))
    }
    contributions.push({
      ruleId: RULE.id,
      ruleVersion: RULE.version,
      severity: 'major',
      problemKey: `dose:${m.drug.id}`,
      drugIds: [m.drug.id],
      factors: [
        { kind: 'species', id: 'cat', label: T('Species: cat', '종: 고양이') },
        fromSingleDose
          ? { kind: 'dose', id: `${m.drug.id}_daily`, label: T(`${fmt(daily)} mg/kg in one dose (daily limit ${limit.value})`, `1회 ${fmt(daily)} mg/kg (1일 한계 ${limit.value})`) }
          : { kind: 'dose', id: `${m.drug.id}_daily`, label: T(`${fmt(daily)} mg/kg per 24 h (limit ${limit.value})`, `24시간당 ${fmt(daily)} mg/kg (한계 ${limit.value})`) },
      ],
      title: T(`${enName(m.drug)} above the feline retinal-safety limit`, `고양이 망막 안전 한계를 넘는 ${koName(m.drug)}`),
      consequence: T('Retinal degeneration and permanent blindness.', '망막 변성과 영구 실명.'),
      why,
      actions: [
        T(`Reduce to no more than ${limit.value} mg/kg per day, dosed on exact body weight; split dosing (2.5 mg/kg every 12 h) has been suggested.`, `정확한 체중 기준으로 ${limit.value} mg/kg/일 이하로 줄이십시오. 분할 투여(12시간마다 2.5 mg/kg)가 제안되어 있습니다.`),
        T('Ask the owner to watch for dilated pupils or vision loss and stop the drug if they appear.', '보호자에게 동공 확대나 시력 저하를 관찰하도록 하고, 나타나면 투약을 중단하게 하십시오.'),
      ],
      alternatives: [T('A non-fluoroquinolone antibiotic chosen by culture and susceptibility.', '배양 및 감수성 결과에 따른 비플루오로퀴놀론계 항생제.')],
      sources: ['baytril_label', 'gelatt2001', 'wiebe2002'],
      evidence: 'literature',
      ownerSigns: [
        T('Dilated pupils', '동공 확대'),
        T('Bumping into things or other signs of poor vision', '물건에 부딪히는 등 시력 저하 징후'),
      ],
      organs: [],
      inputs: [
        { fact: 'species', value: 'cat' },
        fromSingleDose
          ? { fact: `perDose.${m.drug.id}`, value: `${fmt(daily)} mg/kg (frequency: ${m.freqId || 'not entered'})` }
          : { fact: `exposure24h.${m.drug.id}`, value: `${fmt(daily)} mg/kg/24 h` },
        { fact: 'felineRetinalLimit', value: `${limit.value} mg/kg/day`, source: 'baytril_label' },
      ],
    })
  }
  return { contributions }
}

export default {
  ...RULE,
  layer: 'species_breed',
  name: T('Feline enrofloxacin retinal limit', '고양이 엔로플록사신 망막 한계'),
  sources: ['baytril_label', 'gelatt2001', 'wiebe2002'],
  evaluate,
}
