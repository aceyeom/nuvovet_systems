/** METHIMAZOLE_CKD — cat on methimazole with CKD or creatinine above the feline cut-off → moderate (monitoring plan). */

import { T } from './util.js'

const RULE = { id: 'METHIMAZOLE_CKD', version: '1.0.0' }

function evaluate(ctx) {
  const contributions = []
  if (ctx.species !== 'cat' || !ctx.kidney.affected) return { contributions }
  for (const m of ctx.meds) {
    if (m.drug.id !== 'methimazole') continue
    const sources = ['williams2010', 'daminet2014', 'felimazole_label']
    if (ctx.kidney.creatinineHigh) sources.push('iris2023')
    contributions.push({
      ruleId: RULE.id,
      ruleVersion: RULE.version,
      severity: 'moderate',
      problemKey: `renal:${m.drug.id}`,
      drugIds: [m.drug.id],
      factors: ctx.kidney.factors,
      title: T('Methimazole in a cat with kidney disease: plan renal and thyroid monitoring', '신장병 고양이의 메티마졸: 신장·갑상선 모니터링 계획 필요'),
      consequence: T('Treating hyperthyroidism lowers GFR, so creatinine is expected to rise; overtreatment (iatrogenic hypothyroidism) worsens azotaemia and is linked to shorter survival.',
        '갑상선기능항진증을 치료하면 사구체여과율이 낮아져 크레아티닌 상승이 예상됩니다. 과잉 치료(의인성 갑상선기능저하증)는 고질소혈증을 악화시키고 생존기간 단축과 관련됩니다.'),
      why: [
        T('Azotaemia was more common in cats that became hypothyroid after treatment (16 of 28) than in euthyroid cats (14 of 47), and hypothyroid cats that became azotaemic survived for a shorter time (Williams 2010).',
          '치료 후 갑상선기능저하증이 된 고양이(28두 중 16두)에서 정상 갑상선 고양이(47두 중 14두)보다 고질소혈증이 많았고, 고질소혈증이 생긴 저하증 고양이의 생존기간이 더 짧았습니다(Williams 2010).'),
        T('Cats with pre-existing azotaemia have shorter survival; mild azotaemia developing during treatment, unless associated with hypothyroidism, does not appear to shorten survival (Daminet 2014).',
          '치료 전부터 고질소혈증이 있는 고양이는 생존기간이 짧습니다. 치료 중 생긴 경미한 고질소혈증은 갑상선기능저하증과 관련되지 않는 한 생존기간을 줄이지 않는 것으로 보입니다(Daminet 2014).'),
      ],
      actions: [
        T('Recheck total T4, haematology, biochemistry (creatinine) and blood pressure about 3 weeks after starting and after every dose change (Felimazole label; Daminet 2014).', '시작 약 3주 후와 용량 변경 때마다 총 T4, 혈구검사, 혈액화학검사(크레아티닌), 혈압을 재검하십시오(Felimazole 라벨, Daminet 2014).'),
        T('Titrate to a total T4 in the lower half of the reference interval; avoid iatrogenic hypothyroidism.', '총 T4가 참고범위 하위 절반이 되도록 조정하고 의인성 갑상선기능저하증을 피하십시오.'),
        T('Record the baseline creatinine now so later changes can be interpreted.', '이후 변화를 해석할 수 있도록 현재 크레아티닌 기저치를 기록하십시오.'),
      ],
      alternatives: [],
      sources,
      evidence: 'literature',
      ownerSigns: [
        T('Drinking or urinating more', '물을 많이 마시거나 소변량 증가'),
        T('Less appetite or weight loss', '식욕 감소 또는 체중 감소'),
        T('Vomiting', '구토'),
        T('Lethargy or weakness', '무기력 또는 기력 저하'),
      ],
      organs: ['kidney'],
      inputs: [{ fact: 'species', value: 'cat' }, ...ctx.kidney.inputs],
    })
  }
  return { contributions }
}

export default {
  ...RULE,
  layer: 'drug_disease',
  name: T('Methimazole in feline CKD', '고양이 CKD의 메티마졸'),
  sources: ['williams2010', 'daminet2014', 'felimazole_label'],
  evaluate,
}
