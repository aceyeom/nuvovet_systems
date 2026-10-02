/**
 * Problem-list vocabulary → organ systems, plus lab reference cut-offs.
 *
 * organs: which organ-matrix columns this condition puts at patient-level risk.
 * kind:   machine tags the rules look for (e.g. 'ckd').
 */

export const ORGANS = ['kidney', 'liver', 'gi', 'hemostasis', 'cns', 'heart']

export const ORGAN_LABELS = {
  kidney: { en: 'Kidney', ko: '신장' },
  liver: { en: 'Liver', ko: '간' },
  gi: { en: 'GI', ko: '소화기' },
  hemostasis: { en: 'Hemostasis', ko: '지혈·응고' },
  cns: { en: 'CNS', ko: '중추신경' },
  heart: { en: 'Heart', ko: '심장' },
}

export const CONDITIONS = [
  {
    id: 'ckd',
    label: { en: 'Chronic kidney disease', ko: '만성 신장병(CKD)' },
    aliases: ['CKD', 'CRF', '신부전', '만성신부전', '신장병', '콩팥병'],
    organs: ['kidney'],
    kind: ['ckd'],
    species: ['dog', 'cat'],
  },
  {
    id: 'hepatopathy',
    label: { en: 'Liver disease', ko: '간 질환' },
    aliases: ['hepatopathy', '간질환', '간부전', '간염'],
    organs: ['liver'],
    kind: ['liver'],
    species: ['dog', 'cat'],
  },
  {
    id: 'hyperthyroidism',
    label: { en: 'Hyperthyroidism', ko: '갑상선기능항진증' },
    aliases: ['갑상선 기능 항진증', '갑항'],
    organs: ['heart'],
    kind: ['endocrine'],
    species: ['cat'],
  },
  {
    id: 'epilepsy',
    label: { en: 'Idiopathic epilepsy / seizures', ko: '특발성 뇌전증 / 발작' },
    aliases: ['seizure', 'epilepsy', '간질', '뇌전증', '경련', '발작'],
    organs: ['cns'],
    kind: ['seizure'],
    species: ['dog', 'cat'],
  },
  {
    id: 'atopic_dermatitis',
    label: { en: 'Atopic dermatitis', ko: '아토피 피부염' },
    aliases: ['atopy', '아토피'],
    organs: [],
    kind: ['skin'],
    species: ['dog', 'cat'],
  },
  {
    id: 'demodicosis',
    label: { en: 'Generalised demodicosis', ko: '전신성 모낭충증' },
    aliases: ['demodex', '모낭충', '데모덱스'],
    organs: [],
    kind: ['skin'],
    species: ['dog', 'cat'],
  },
  {
    id: 'malassezia_otitis',
    label: { en: 'Malassezia otitis / dermatitis', ko: '말라세지아 외이염·피부염' },
    aliases: ['malassezia', 'yeast otitis', '말라세지아', '효모균 외이염'],
    organs: [],
    kind: ['skin'],
    species: ['dog', 'cat'],
  },
  {
    id: 'mmvd_chf',
    label: { en: 'Heart disease / congestive heart failure', ko: '심장병 / 울혈성 심부전' },
    aliases: ['MMVD', 'CHF', '이첨판', '이첨판 폐쇄부전', '심부전', '심장병'],
    organs: ['heart'],
    kind: ['heart'],
    species: ['dog', 'cat'],
  },
  {
    id: 'hypertension',
    label: { en: 'Systemic hypertension', ko: '전신성 고혈압' },
    aliases: ['고혈압', 'high blood pressure'],
    organs: ['heart', 'kidney'],
    kind: ['hypertension'],
    species: ['dog', 'cat'],
  },
  {
    id: 'gi_ulcer_history',
    label: { en: 'History of GI ulceration or bleeding', ko: '위장관 궤양·출혈 병력' },
    aliases: ['ulcer', 'melena', '위궤양', '흑변', '토혈'],
    organs: ['gi'],
    kind: ['gi'],
    species: ['dog', 'cat'],
  },
  {
    id: 'vomiting_diarrhoea',
    label: { en: 'Vomiting / diarrhoea', ko: '구토 / 설사' },
    aliases: ['vomiting', 'diarrhea', 'gastroenteritis', '구토', '설사', '위장염'],
    organs: ['gi'],
    kind: ['gi'],
    species: ['dog', 'cat'],
  },
  {
    id: 'coagulopathy',
    label: { en: 'Coagulopathy / thrombocytopenia', ko: '응고장애 / 혈소판감소증' },
    aliases: ['bleeding disorder', '출혈 경향', '혈소판 감소'],
    organs: ['hemostasis'],
    kind: ['bleeding'],
    species: ['dog', 'cat'],
  },
  {
    id: 'dehydration',
    label: { en: 'Dehydration / hypovolaemia', ko: '탈수 / 저혈량' },
    aliases: ['탈수'],
    organs: ['kidney'],
    kind: ['dehydration'],
    species: ['dog', 'cat'],
  },
  {
    id: 'osteoarthritis',
    label: { en: 'Osteoarthritis', ko: '골관절염' },
    aliases: ['OA', 'arthritis', '관절염', '퇴행성 관절염'],
    organs: [],
    kind: ['pain'],
    species: ['dog', 'cat'],
  },
  {
    id: 'anxiety',
    label: { en: 'Anxiety / visit-related stress', ko: '불안 / 내원 스트레스' },
    aliases: ['fear', 'separation anxiety', '분리불안', '불안'],
    organs: [],
    kind: ['behaviour'],
    species: ['dog', 'cat'],
  },
  {
    id: 'uti',
    label: { en: 'Bacterial urinary tract infection', ko: '세균성 요로감염' },
    aliases: ['UTI', 'cystitis', '방광염', '요로감염'],
    organs: [],
    kind: ['infection'],
    species: ['dog', 'cat'],
  },
  {
    id: 'skin_infection',
    label: { en: 'Skin / soft-tissue infection', ko: '피부·연부조직 감염' },
    aliases: ['pyoderma', 'abscess', '농피증', '농양'],
    organs: [],
    kind: ['infection'],
    species: ['dog', 'cat'],
  },
]

export const CONDITION_BY_ID = Object.fromEntries(CONDITIONS.map((c) => [c.id, c]))

/**
 * Creatinine cut-off between IRIS stage 1 and stage 2 (mg/dL), source IRIS 2023.
 * The engine uses it only as "at or above the stage 2 cut-off"; it never stages
 * (IRIS staging applies to stable CKD, not to a single creatinine value).
 */
export const CREATININE_UPPER = {
  dog: { value: 1.4, unit: 'mg/dL', source: 'iris2023' },
  cat: { value: 1.6, unit: 'mg/dL', source: 'iris2023' },
}

/**
 * Interpret a lab value. ALT has no single citable reference interval (they are
 * analyser-specific), so it is recorded but never auto-flagged.
 */
export function interpretLab(kind, value, species) {
  if (value == null || Number.isNaN(Number(value))) return { status: 'missing', label: { en: 'Not entered', ko: '미입력' } }
  if (kind === 'creatinine') {
    const ref = CREATININE_UPPER[species]
    if (!ref) return { status: 'entered', label: { en: 'Entered', ko: '입력됨' } }
    if (Number(value) >= ref.value) {
      return {
        status: 'high',
        label: {
          en: `At or above ${ref.value} mg/dL (IRIS stage 2 cut-off)`,
          ko: `${ref.value} mg/dL 이상 (IRIS 2단계 기준치 이상)`,
        },
        source: ref.source,
      }
    }
    return {
      status: 'normal',
      label: { en: `Below ${ref.value} mg/dL`, ko: `${ref.value} mg/dL 미만` },
      source: ref.source,
    }
  }
  if (kind === 'alt') {
    return {
      status: 'entered',
      label: {
        en: 'Recorded — compare with your laboratory’s reference interval',
        ko: '기록됨 — 검사기관의 참고범위와 비교하십시오',
      },
    }
  }
  return { status: 'entered', label: { en: 'Entered', ko: '입력됨' } }
}
