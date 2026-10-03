/**
 * Curated formulary (clean-room). Every clinical fact carries a source id from
 * sources.js. Prose is our own wording. Nothing here is derived from any
 * licensed compendium.
 *
 * Conventions
 *  - protocols[].labelStatus: 'label' = the dose is taken from an approved
 *    product label; 'extra-label' = the dose comes from literature/guidelines.
 *  - protocols[].dose.per: 'dose' (default) or 'day' (label/literature states a
 *    total daily amount; the engine then compares the computed daily total).
 *  - protocols[].dose.max: null when the source states a minimum only (e.g. a
 *    label "minimum dose"); the engine then never reports "above".
 *  - protocols[].dose.ceiling: { value, per: 'dose'|'day', source, text } on a
 *    minimum-only or starting-dose protocol: an upper limit stated by the
 *    protocol's own source (the highest labelled dose, a total loading dose).
 *    Above it the dose is checked as an ordinary overdose against the ceiling.
 *  - protocols[].phase: 'start' when the source gives a starting dose to be
 *    titrated, not a range; a different dose is reported as a minor titration
 *    check, never as an overdose.
 *  - protocols[].repeatPolicy: 'label_single_only' on a single-dose protocol
 *    whose label permits one administration only (repeats are a finding, not
 *    "no reference").
 *  - organRisk[organ]: an entry, or an array of entries with a species filter.
 *    A missing organ key means "not assessed" ('na'), never 0.
 *    Levels: 3 labelled warning/contraindication or documented serious toxicity;
 *            2 labelled precaution or documented clinically relevant effect;
 *            1 minor or uncommon.
 *  - pk.cyp lists only what the engine uses; an empty list means "not modelled",
 *    not "no interaction".
 */

const T = (en, ko) => ({ en, ko })

const NSAID_OWNER_SIGNS = [
  T('Not eating or eating less', '식욕 저하 또는 밥을 잘 안 먹음'),
  T('Vomiting or diarrhoea', '구토 또는 설사'),
  T('Black, tarry stools or blood in vomit', '검은 타르 같은 변 또는 구토물에 피'),
  T('Drinking or urinating more than usual', '평소보다 물을 많이 마시거나 소변량 증가'),
  T('Yellow gums, skin or whites of the eyes', '잇몸·피부·눈 흰자가 노랗게 변함'),
  T('Unusual tiredness or behaviour change', '평소와 다른 무기력 또는 행동 변화'),
]

/** NSAID class warning applied to a recorded history of GI ulceration/bleeding (DRUG_CONDITION). */
const NSAID_GI_CAUTION = (source) => ({
  condition: 'gi_ulcer_history', severity: 'major', source,
  text: T('NSAID class warning: gastrointestinal ulceration, bleeding and perforation. With a recorded history of GI ulceration or bleeding, the NSAID adds to an existing GI risk.',
    'NSAID 계열 경고: 위장관 궤양, 출혈, 천공. 위장관 궤양·출혈 병력이 있으면 NSAID가 기존 위장관 위험을 더합니다.'),
  consequence: T('Recurrent gastrointestinal ulceration or bleeding, which can be fatal.', '위장관 궤양이나 출혈이 재발할 수 있으며 치명적일 수 있습니다.'),
  actions: [
    T('Prefer a non-NSAID analgesic. If an NSAID is essential, use the lowest effective dose for the shortest time and tell the owner to stop and call at the first sign of black stools, vomiting or loss of appetite.',
      'NSAID가 아닌 진통제를 우선 고려하십시오. 꼭 필요하다면 최소 유효 용량을 최단 기간 사용하고, 검은 변, 구토, 식욕 부진이 처음 보이면 투약을 멈추고 연락하도록 보호자에게 안내하십시오.'),
  ],
})

export const DRUGS = [
  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'ivermectin',
    name: T('Ivermectin', '이버멕틴'),
    aliases: ['Heartgard', 'Heartgard Plus', '하트가드', '하트가드 플러스', 'Ivomec', '아이보멕'],
    class: T('Macrocyclic lactone (avermectin)', '마크로사이클릭 락톤계(아버멕틴)'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'iver_chew_68', form: 'chewable', amount: { value: 68, unit: 'mcg' }, splittable: false },
      { id: 'iver_chew_136', form: 'chewable', amount: { value: 136, unit: 'mcg' }, splittable: false },
      { id: 'iver_chew_272', form: 'chewable', amount: { value: 272, unit: 'mcg' }, splittable: false },
      { id: 'iver_sol_10', form: 'solution', amount: { value: 10, unit: 'mg' }, per: { value: 1, unit: 'mL' }, splittable: false,
        note: T('1% injectable solution; oral use is extra-label.', '1% 주사용 용액이며, 경구 투여는 허가 외 사용입니다.') },
    ],
    protocols: [
      { id: 'iver_dog_hw', species: 'dog', indication: T('Heartworm prevention', '심장사상충 예방'),
        dose: { min: 6, max: 50, unit: 'mcg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'monthly', labelStatus: 'label', source: 'heartgard_label',
        note: T('The label gives only a minimum (6 mcg/kg). Chewables are given by weight band, so small dogs receive several times the minimum. The 50 mcg/kg upper bound is not a label value: it is this prototype’s boundary between preventive and anti-parasitic dosing, below the 60 mcg/kg (10×) the label reports as tolerated by ivermectin-sensitive Collies.',
          '라벨은 최소 용량(6 mcg/kg)만 제시합니다. 츄어블은 체중 구간별로 투여하므로 소형견은 최소 용량의 몇 배를 받습니다. 상한 50 mcg/kg은 라벨 수치가 아니라 이 프로토타입이 예방 용량과 구충 치료 용량을 구분하는 경계값이며, 라벨이 이버멕틴 민감 콜리에서 독성이 없었다고 보고한 60 mcg/kg(10배)보다 낮습니다.') },
      { id: 'iver_dog_demodex', species: 'dog', indication: T('Generalised demodicosis', '전신성 모낭충증'),
        dose: { min: 300, max: 600, unit: 'mcg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q24h', labelStatus: 'extra-label', source: 'mueller2020',
        note: T('Extra-label. The guideline recommends increasing the dose gradually over the first days to detect ivermectin-sensitive dogs before reaching the full daily dose.',
          '허가 외 사용입니다. 가이드라인은 전체 1일 용량에 도달하기 전 처음 며칠 동안 용량을 단계적으로 올려 이버멕틴 민감견을 가려낼 것을 권고합니다.') },
    ],
    pk: {
      pgp: { substrate: true, inhibitor: null },
      cyp: { substrateOf: [], inhibits: {}, induces: {} },
      renalFraction: null,
      sources: ['mealey2001', 'mealey2008'],
    },
    flags: { mdr1Sensitive: true, mdr1HighDoseThreshold: { value: 50, unit: 'mcg/kg' }, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: 'macrocyclic_lactone' },
    organRisk: {
      cns: { species: ['dog'], level: 3,
        reason: T('Documented serious neurotoxicity: P-glycoprotein normally keeps ivermectin out of the brain, and dogs homozygous for the ABCB1 (MDR1) deletion develop neurotoxicity (ataxia, tremor, mydriasis, blindness, coma) at doses wild-type dogs tolerate. Label preventive doses are tolerated even by these dogs.',
          '중대한 신경독성이 보고되어 있습니다. 정상적으로는 P-당단백질이 이버멕틴의 뇌 유입을 막지만, ABCB1(MDR1) 결손 변이 동형접합 개는 정상견이 견디는 용량에서도 신경독성(운동실조, 떨림, 산동, 실명, 혼수)을 보입니다. 라벨 예방 용량은 이런 개에서도 안전합니다.'),
        source: 'mealey2001' },
    },
    admin: [],
    ownerSigns: [
      T('Wobbly walking or stumbling', '비틀거리거나 휘청거리며 걷기'),
      T('Trembling or twitching', '몸 떨림 또는 근육 경련'),
      T('Dilated pupils or sudden blindness', '동공이 커지거나 갑자기 앞을 못 봄'),
      T('Drooling', '침 흘림'),
      T('Unusual sleepiness or unresponsiveness', '평소와 달리 축 처지거나 반응이 없음'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'ketoconazole',
    name: T('Ketoconazole', '케토코나졸'),
    aliases: ['Nizoral', '니조랄'],
    class: T('Azole antifungal (imidazole)', '아졸계 항진균제(이미다졸계)'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'keto_tab_200', form: 'tablet', amount: { value: 200, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'keto_dog_malassezia', species: 'dog', indication: T('Malassezia dermatitis (systemic)', '말라세지아 피부염(전신 치료)'),
        dose: { min: 10, max: 10, unit: 'mg/kg', basis: 'per_kg', per: 'day' }, route: 'PO', frequency: 'q24h', durationDays: 21, labelStatus: 'extra-label', source: 'negre2009',
        note: T('Systematic review: fair evidence for 10 mg/kg/day for 3 weeks. The engine checks the daily total, so once-daily or divided dosing are both compared with 10 mg/kg/day.',
          '체계적 문헌고찰: 10 mg/kg/일, 3주 투여에 대한 근거 수준 "보통". 엔진은 1일 총량으로 비교하므로 1일 1회 또는 분할 투여 모두 10 mg/kg/일과 비교됩니다.') },
    ],
    pk: {
      pgp: { substrate: false, inhibitor: 'strong' },
      cyp: { substrateOf: [], inhibits: { CYP3A: 'strong' }, induces: {} },
      renalFraction: null,
      sources: ['schrickx2014', 'myre1991'],
    },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: 'azole', needsGastricAcid: true },
    organRisk: {
      liver: { level: 1, reason: T('In 632 treated dogs, increased liver enzymes were reported rarely and no dog became icteric; liver enzymes are still monitored because severe idiosyncratic hepatotoxicity cannot be excluded.',
        '치료받은 개 632두에서 간효소 상승은 드물게 보고되었고 황달은 없었습니다. 다만 중증 특이체질성 간독성을 배제할 수 없어 간효소를 모니터링합니다.'), source: 'mayer2008' },
      gi: { level: 2, reason: T('Vomiting (about 7%) and anorexia (about 5%) were the commonest adverse effects in 632 treated dogs.',
        '치료받은 개 632두에서 구토(약 7%)와 식욕부진(약 5%)이 가장 흔한 부작용이었습니다.'), source: 'mayer2008' },
    },
    admin: [
      { kind: 'administration', text: T('Give with food. Azole antifungals need an acidic stomach to dissolve, and a meal stimulates acid secretion. Avoid combining with acid suppressants (omeprazole, famotidine): raising gastric pH impaired ketoconazole absorption in dogs.',
        '음식과 함께 투여하십시오. 아졸계 항진균제는 산성 위 환경에서 녹으며, 식사가 위산 분비를 촉진합니다. 위산억제제(오메프라졸, 파모티딘)와의 병용은 피하십시오. 개에서 위 pH를 높이면 케토코나졸 흡수가 저하되었습니다.'), source: 'marks2018' },
      { kind: 'lab', text: T('Check liver enzymes during treatment.', '치료 중 간효소 수치를 확인하십시오.'), source: 'mayer2008' },
    ],
    ownerSigns: [
      T('Vomiting or refusing food', '구토 또는 식사 거부'),
      T('Lethargy', '무기력'),
      T('Yellow gums or eyes', '잇몸이나 눈이 노랗게 변함'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'ciclosporin',
    name: T('Ciclosporin (cyclosporine)', '사이클로스포린'),
    aliases: ['Cyclosporine', 'Cyclosporin', 'Atopica', '아토피카', '시클로스포린', 'CsA'],
    class: T('Calcineurin inhibitor (immunomodulator)', '칼시뉴린 억제제(면역조절제)'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'csa_cap_10', form: 'capsule', amount: { value: 10, unit: 'mg' }, splittable: false },
      { id: 'csa_cap_25', form: 'capsule', amount: { value: 25, unit: 'mg' }, splittable: false },
      { id: 'csa_cap_50', form: 'capsule', amount: { value: 50, unit: 'mg' }, splittable: false },
      { id: 'csa_cap_100', form: 'capsule', amount: { value: 100, unit: 'mg' }, splittable: false },
      { id: 'csa_sol_100', form: 'solution', amount: { value: 100, unit: 'mg' }, per: { value: 1, unit: 'mL' }, splittable: false },
    ],
    protocols: [
      { id: 'csa_dog_ad', species: 'dog', indication: T('Atopic dermatitis', '아토피 피부염'),
        dose: { min: 3.3, max: 6.7, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q24h', labelStatus: 'label', source: 'atopica_label',
        note: T('Target 5 mg/kg once daily; the label’s capsule-size table delivers 3.3–6.7 mg/kg.', '목표 용량은 5 mg/kg 1일 1회이며, 라벨의 캡슐 함량별 표에 따르면 실제 투여량은 3.3–6.7 mg/kg입니다.') },
      { id: 'csa_cat_allergic', species: 'cat', indication: T('Allergic dermatitis', '알레르기성 피부염'),
        dose: { min: 7, max: 7, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q24h', labelStatus: 'label', source: 'atopica_label' },
    ],
    pk: {
      pgp: { substrate: true, inhibitor: 'moderate' },
      cyp: { substrateOf: ['CYP3A'], inhibits: {}, induces: {} },
      renalFraction: null,
      sources: ['archer2014', 'schrickx2014'],
    },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: true, nsaid: false, corticosteroid: false, immunosuppressant: true, serotonergic: false, allergyClass: null },
    organRisk: {
      gi: { level: 2, reason: T('Vomiting (31%) and diarrhoea (20%) were the commonest adverse effects at the labelled 5 mg/kg/day in a placebo-controlled field study.',
        '위약대조 현장시험에서 라벨 용량 5 mg/kg/일 투여 시 구토(31%)와 설사(20%)가 가장 흔한 부작용이었습니다.'), source: 'archer2014' },
      liver: { level: 1, reason: T('ALP/ALT increases are among reported adverse events.', 'ALP/ALT 상승이 보고된 이상반응에 포함됩니다.'), source: 'archer2014' },
    },
    admin: [
      { kind: 'administration', text: T('Give at the same time each day and consistently relative to meals; food lowered absorption in one study, which led to the advice to dose 2 hours before or after feeding.',
        '매일 같은 시간에, 식사와의 간격을 일정하게 유지하여 투여하십시오. 한 연구에서 음식이 흡수를 낮춰 식전·식후 2시간 간격 투여가 권고되었습니다.'), source: 'archer2014' },
      { kind: 'monitoring', text: T('Watch for skin, urinary or other infections during long-term use.', '장기 투여 중 피부·요로 등 감염 징후를 관찰하십시오.'), source: 'archer2014' },
    ],
    ownerSigns: [
      T('Vomiting or diarrhoea', '구토 또는 설사'),
      T('Overgrown or swollen gums', '잇몸이 붓거나 과도하게 자람'),
      T('Signs of infection: fever, wounds that do not heal, straining to urinate', '감염 징후: 발열, 낫지 않는 상처, 배뇨 곤란'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'phenobarbital',
    name: T('Phenobarbital', '페노바르비탈'),
    aliases: ['Phenobarbitone', '페노바비탈', 'PB'],
    class: T('Barbiturate anticonvulsant', '바르비튜레이트계 항경련제'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'pb_tab_15', form: 'tablet', amount: { value: 15, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'pb_tab_30', form: 'tablet', amount: { value: 30, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'pb_tab_60', form: 'tablet', amount: { value: 60, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'pb_tab_100', form: 'tablet', amount: { value: 100, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'pb_dog_epilepsy', phase: 'start', species: 'dog', indication: T('Idiopathic epilepsy: starting dose', '특발성 뇌전증: 시작 용량'),
        dose: { min: 2.5, max: 3, unit: 'mg/kg', basis: 'per_kg',
          ceiling: { value: 20, per: 'day', source: 'bhatti2015',
            text: T('the whole loading dose given in hospital is 15–20 mg/kg, divided over 24–48 h (IVETF consensus)', '병원에서 주는 부하 용량 전체가 15–20 mg/kg이며 24–48시간에 나누어 줍니다(IVETF 합의문)') } },
        route: 'PO', frequency: 'q12h', labelStatus: 'extra-label', source: 'bhatti2015',
        note: T('Then tailored to seizure control, adverse effects and serum concentration.', '이후 발작 조절, 부작용, 혈청 농도에 따라 조정합니다.') },
    ],
    pk: {
      pgp: { substrate: false, inhibitor: null },
      cyp: { substrateOf: [], inhibits: {}, induces: { CYP3A: 'strong', CYP2B: 'strong' } },
      renalFraction: null,
      sources: ['graham2006', 'bhatti2015'],
    },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: true, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: null },
    organRisk: {
      liver: { level: 3, reason: T('Hepatotoxicity is a recognised idiosyncratic adverse effect; serum concentrations above 35 mg/L increase the risk, and phenobarbital is contraindicated in dogs with hepatic dysfunction.',
        '간독성은 알려진 특이체질성 부작용이며, 혈청 농도 35 mg/L 초과 시 위험이 커집니다. 간기능 장애가 있는 개에는 금기입니다.'), source: 'bhatti2015' },
      cns: { level: 2, reason: T('Sedation and ataxia are common dose-related effects.', '진정과 운동실조가 흔한 용량 관련 부작용입니다.'), source: 'bhatti2015' },
      hemostasis: { level: 1, reason: T('Uncommon idiosyncratic anaemia, thrombocytopenia or neutropenia.', '드물게 특이체질성 빈혈·혈소판감소증·호중구감소증이 나타납니다.'), source: 'bhatti2015' },
    },
    admin: [
      { kind: 'lab', text: T('Expect higher ALP/ALT and lower total and free T4 while on phenobarbital. Interpret liver enzymes with this in mind and test thyroid function at least 4 weeks after stopping.',
        '페노바르비탈 투여 중에는 ALP/ALT 상승과 총 T4·유리 T4 감소가 예상됩니다. 간효소 해석 시 이를 감안하고, 갑상선 기능 검사는 중단 후 최소 4주 뒤에 하십시오.'), source: 'gieger2000' },
      { kind: 'monitoring', text: T('Measure serum phenobarbital 14 days after starting or changing the dose; concentrations above 35 mg/L raise the risk of liver toxicity.',
        '투여 시작 또는 용량 변경 14일 후 혈청 페노바르비탈 농도를 측정하십시오. 35 mg/L를 넘으면 간독성 위험이 커집니다.'), source: 'bhatti2015' },
    ],
    ownerSigns: [
      T('Marked sleepiness or wobbliness', '심한 졸림 또는 비틀거림'),
      T('Much more thirst, urination or appetite', '갈증·소변량·식욕이 크게 늘어남'),
      T('Yellow gums or eyes', '잇몸이나 눈이 노랗게 변함'),
      T('Seizures coming back or clustering', '발작 재발 또는 연속 발작'),
    ],
    speciesCautions: [],
    conditionCautions: [
      { condition: 'hepatopathy', species: ['dog'], severity: 'contraindicated', source: 'bhatti2015',
        text: T('Phenobarbital is a potent inducer of liver enzymes and increases hepatic production of reactive oxygen species; the IVETF consensus states it is contraindicated in dogs with hepatic dysfunction.',
          '페노바르비탈은 간 효소를 강하게 유도하고 간의 활성산소 생성을 늘리며, IVETF 합의문은 간기능 장애가 있는 개에게 금기라고 명시합니다.'),
        consequence: T('Further liver injury, up to hepatic failure.', '간부전에 이를 수 있는 추가 간 손상.'),
        actions: [
          T('Do not start phenobarbital in a dog with hepatic dysfunction.', '간기능 장애가 있는 개에게는 페노바르비탈을 시작하지 마십시오.'),
          T('If the dog is already on phenobarbital, check liver function and the serum phenobarbital concentration, and review the antiepileptic plan.', '이미 투여 중이라면 간기능과 혈청 페노바르비탈 농도를 확인하고 항경련 치료 계획을 재검토하십시오.'),
        ],
        alternatives: [T('Potassium bromide (not metabolised by the liver) or levetiracetam (minimal hepatic metabolism), which the IVETF consensus names as options in hepatic dysfunction.',
          '브롬화칼륨(간에서 대사되지 않음) 또는 레비티라세탐(간 대사가 최소): IVETF 합의문이 간기능 장애 시 선택지로 제시합니다.')] },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'prednisolone',
    name: T('Prednisolone', '프레드니솔론'),
    aliases: ['Solondo', '소론도'],
    class: T('Glucocorticoid', '글루코코르티코이드(스테로이드)'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'pred_tab_5', form: 'tablet', amount: { value: 5, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'pred_dog_ad', species: 'dog', indication: T('Atopic dermatitis: anti-inflammatory', '아토피 피부염: 항염증 용량'),
        dose: { min: 0.5, max: 1.0, unit: 'mg/kg', basis: 'per_kg', per: 'day' }, route: 'PO', frequency: 'q24h', labelStatus: 'extra-label', source: 'olivry2015',
        note: T('Guideline: 0.5 mg/kg once or twice daily (0.5–1.0 mg/kg/day), then taper.', '가이드라인: 0.5 mg/kg 1일 1–2회(0.5–1.0 mg/kg/일) 투여 후 감량.') },
    ],
    pk: {
      pgp: { substrate: false, inhibitor: null },
      cyp: { substrateOf: ['CYP3A'], inhibits: {}, induces: {} },
      renalFraction: null,
      sources: [],
      note: T('CYP3A clearance is inferred from human pharmacology; no canine study is cited.', 'CYP3A 대사는 사람 약리 자료에서 추론한 것이며, 개 연구는 인용하지 않았습니다.'),
    },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: true, immunosuppressant: true, serotonergic: false, allergyClass: null },
    organRisk: {
      gi: { level: 2, reason: T('Glucocorticoids weaken gastric mucosal defences; high doses can cause gastric haemorrhage.',
        '글루코코르티코이드는 위점막 방어기전을 약화시키며, 고용량에서는 위출혈을 일으킬 수 있습니다.'), source: 'marks2018' },
    },
    admin: [],
    ownerSigns: [
      T('Much more thirst, urination or hunger', '갈증·소변량·식욕이 크게 늘어남'),
      T('Panting at rest', '안정 시에도 헐떡임'),
      T('Black stools or vomiting blood', '검은 변 또는 피 섞인 구토'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'methimazole',
    name: T('Methimazole (thiamazole)', '메티마졸(티아마졸)'),
    aliases: ['Thiamazole', 'Felimazole', '펠리마졸', '티아마졸'],
    class: T('Antithyroid drug (thionamide)', '항갑상선제(티온아마이드계)'),
    species: ['cat'],
    strengths: [
      { id: 'mmi_tab_2_5', form: 'tablet', amount: { value: 2.5, unit: 'mg' }, splittable: false,
        note: T('Coated tablet. Do not split.', '코팅정이므로 분할하지 마십시오.') },
      { id: 'mmi_tab_5', form: 'tablet', amount: { value: 5, unit: 'mg' }, splittable: false,
        note: T('Coated tablet. Do not split.', '코팅정이므로 분할하지 마십시오.') },
    ],
    protocols: [
      { id: 'mmi_cat_start', phase: 'start', species: 'cat', indication: T('Hyperthyroidism: starting dose', '갑상선기능항진증: 시작 용량'),
        dose: { min: 2.5, max: 2.5, unit: 'mg', basis: 'per_animal' }, route: 'PO', frequency: 'q12h', labelStatus: 'label', source: 'felimazole_label',
        note: T('Per cat, not per kg. After about 3 weeks, titrate to effect on total T4 (consensus target: lower half of the reference interval).',
          '체중당이 아니라 고양이 1마리당 용량입니다. 약 3주 후 총 T4에 따라 조정합니다(합의 목표: 참고범위 하위 절반).') },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: null },
    organRisk: {
      kidney: { level: 2, reason: T('Restoring euthyroidism lowers GFR and can unmask kidney disease; iatrogenic hypothyroidism is associated with azotaemia and shorter survival.',
        '갑상선 기능이 정상화되면 사구체여과율이 감소하여 숨어 있던 신장병이 드러날 수 있으며, 의인성 갑상선기능저하증은 고질소혈증 및 생존기간 단축과 관련됩니다.'), source: 'williams2010' },
      liver: { level: 2, reason: T('Hepatopathy is a labelled potentially serious adverse reaction.', '간병증이 라벨에 명시된 잠재적 중대 이상반응입니다.'), source: 'felimazole_label' },
      hemostasis: { level: 2, reason: T('Thrombocytopenia (and agranulocytosis) are labelled potentially serious adverse reactions.', '혈소판감소증(및 무과립구증)이 라벨에 명시된 잠재적 중대 이상반응입니다.'), source: 'felimazole_label' },
      gi: { level: 1, reason: T('Vomiting and changes in appetite are among the commonest labelled adverse reactions.', '구토와 식욕 변화가 라벨상 흔한 이상반응입니다.'), source: 'felimazole_label' },
    },
    admin: [
      { kind: 'monitoring', text: T('Recheck total T4, haematology, biochemistry (including creatinine) and blood pressure about 3 weeks after starting and after each dose change; aim for a total T4 in the lower half of the reference interval and avoid iatrogenic hypothyroidism.',
        '시작 약 3주 후와 용량 변경 때마다 총 T4, 혈구검사, 혈액화학검사(크레아티닌 포함), 혈압을 재검하십시오. 총 T4는 참고범위 하위 절반을 목표로 하며 의인성 갑상선기능저하증을 피하십시오.'), sources: ['felimazole_label', 'daminet2014'] },
    ],
    ownerSigns: [
      T('Vomiting or not eating', '구토 또는 식욕 부진'),
      T('Scratching at the face or head', '얼굴·머리를 심하게 긁음'),
      T('Yellow gums or eyes', '잇몸이나 눈이 노랗게 변함'),
      T('Bruising or bleeding', '멍이 들거나 출혈'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'amlodipine',
    name: T('Amlodipine', '암로디핀'),
    aliases: ['Norvasc', '노바스크'],
    class: T('Calcium-channel blocker (dihydropyridine)', '칼슘채널차단제(디하이드로피리딘계)'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'amlo_tab_2_5', form: 'tablet', amount: { value: 2.5, unit: 'mg' }, splittable: true, quarter: true,
        note: T('Quartering is common practice for cats; a compounded strength is an alternative.', '고양이에서는 1/4 분할이 흔하며, 조제 제형도 대안입니다.') },
      { id: 'amlo_tab_5', form: 'tablet', amount: { value: 5, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'amlo_cat_htn', species: 'cat', indication: T('Systemic hypertension', '전신성 고혈압'),
        dose: { min: 0.625, max: 2.5, unit: 'mg', basis: 'per_animal' }, route: 'PO', frequency: 'q24h', labelStatus: 'extra-label', source: 'acierno2018',
        note: T('Per cat. Usual 0.625–1.25 mg per cat (1.25 mg when systolic pressure is above 200 mmHg); the consensus notes that up to 2.5 mg per cat is rarely required.',
          '고양이 1마리당 용량입니다. 통상 0.625–1.25 mg/두(수축기 혈압 200 mmHg 초과 시 1.25 mg)이며, 드물게 2.5 mg/두까지 필요하다고 합의문은 기술합니다.') },
      { id: 'amlo_dog_htn', species: 'dog', indication: T('Systemic hypertension (with a RAAS inhibitor)', '전신성 고혈압(RAAS 억제제와 병용)'),
        dose: { min: 0.1, max: 0.5, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q24h', labelStatus: 'extra-label', source: 'acierno2018',
        note: T('Usual 0.1–0.25 mg/kg, up to 0.5 mg/kg. Monotherapy is avoided in dogs.', '통상 0.1–0.25 mg/kg, 최대 0.5 mg/kg. 개에서는 단독 투여를 피합니다.') },
    ],
    pk: {
      pgp: { substrate: false, inhibitor: null },
      cyp: { substrateOf: ['CYP3A'], inhibits: {}, induces: {} },
      renalFraction: null,
      sources: [],
      note: T('CYP3A clearance is inferred from human pharmacology.', 'CYP3A 대사는 사람 약리 자료에서 추론한 것입니다.'),
    },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: null },
    organRisk: {
      heart: { level: 1, reason: T('Vasodilator: hypotension (weakness, syncope) is possible; peripheral oedema and gingival hyperplasia are rarely reported in dogs and uncommon in cats.',
        '혈관확장제로 저혈압(기력 저하, 실신)이 생길 수 있으며, 말초 부종과 잇몸 증식은 개에서 드물고 고양이에서도 흔하지 않게 보고됩니다.'), source: 'acierno2018' },
    },
    admin: [
      { kind: 'monitoring', text: T('Re-measure blood pressure after starting: the consensus target is systolic below 140 mmHg, and treatment is adjusted if it stays at 160 mmHg or above.',
        '투여 시작 후 혈압을 재측정하십시오. 합의 목표는 수축기 140 mmHg 미만이며, 160 mmHg 이상이 지속되면 치료를 조정합니다.'), source: 'acierno2018' },
    ],
    ownerSigns: [
      T('Weakness, wobbliness or collapse', '기력 저하, 비틀거림 또는 쓰러짐'),
      T('Swollen gums', '잇몸 부종'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'maropitant',
    name: T('Maropitant', '마로피탄트'),
    aliases: ['Cerenia', '세레니아'],
    class: T('NK1-receptor antagonist (antiemetic)', 'NK1 수용체 길항제(항구토제)'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'maro_tab_16', form: 'tablet', amount: { value: 16, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'maro_tab_24', form: 'tablet', amount: { value: 24, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'maro_tab_60', form: 'tablet', amount: { value: 60, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'maro_tab_160', form: 'tablet', amount: { value: 160, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'maro_inj_10', form: 'injection', amount: { value: 10, unit: 'mg' }, per: { value: 1, unit: 'mL' }, splittable: false },
    ],
    protocols: [
      { id: 'maro_dog_vomit', species: 'dog', indication: T('Acute vomiting', '급성 구토'),
        dose: { min: 2, max: null, unit: 'mg/kg', basis: 'per_kg',
          ceiling: { value: 8, per: 'dose', source: 'cerenia_label',
            text: T('8 mg/kg (motion sickness) is the highest oral dose on the same label', '같은 라벨의 가장 높은 경구 용량은 8 mg/kg(멀미)입니다') } },
        route: 'PO', frequency: 'q24h', labelStatus: 'label', source: 'cerenia_label',
        note: T('Label gives 2 mg/kg as the minimum tablet dose.', '라벨은 정제 최소 용량으로 2 mg/kg을 제시합니다.') },
      { id: 'maro_dog_motion', species: 'dog', indication: T('Motion sickness', '멀미'),
        dose: { min: 8, max: 8, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q24h', durationDays: 2, labelStatus: 'label', source: 'cerenia_label' },
      { id: 'maro_dog_inj', species: 'dog', indication: T('Acute vomiting (injection)', '급성 구토(주사)'),
        dose: { min: 1, max: 1, unit: 'mg/kg', basis: 'per_kg' }, route: 'SC', altRoutes: ['IV'], frequency: 'q24h', durationDays: 5, labelStatus: 'label', source: 'cerenia_label',
        note: T('Label: 1 mg/kg SC or IV once daily for up to 5 days.', '라벨: 1 mg/kg SC 또는 IV, 1일 1회, 최대 5일.') },
      { id: 'maro_cat_inj', species: 'cat', indication: T('Vomiting (injection)', '구토(주사)'),
        dose: { min: 1, max: 1, unit: 'mg/kg', basis: 'per_kg' }, route: 'SC', altRoutes: ['IV'], frequency: 'q24h', durationDays: 5, labelStatus: 'label', source: 'cerenia_label' },
      { id: 'maro_cat_ckd_po', species: 'cat', indication: T('CKD-associated vomiting: oral', 'CKD 관련 구토: 경구'),
        dose: { min: 0.6, max: 2.9, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q24h', labelStatus: 'extra-label', source: 'quimby2015', extraSources: ['cerenia_label'],
        note: T('Studied as 4 mg per cat once daily for 2 weeks in cats with IRIS stage 2–3 CKD, which was 0.6–2.9 mg/kg (median 1.1 mg/kg); that range is used here. 1 mg/kg is the labelled feline injectable dose.',
          'IRIS 2–3단계 CKD 고양이에서 고양이당 4 mg 1일 1회, 2주간 연구되었으며 이는 0.6–2.9 mg/kg(중앙값 1.1 mg/kg)에 해당합니다. 여기서는 이 범위를 사용합니다. 1 mg/kg은 고양이 주사제 라벨 용량입니다.') },
    ],
    pk: {
      pgp: { substrate: false, inhibitor: null },
      cyp: { substrateOf: ['CYP3A', 'CYP2D'], inhibits: {}, induces: {} },
      renalFraction: null,
      sources: ['cerenia_label'],
    },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: null },
    organRisk: {
      liver: { level: 1, reason: T('Labelled caution in hepatic dysfunction because it is cleared by liver CYP enzymes.', '간 CYP 효소로 대사되므로 간기능 장애 시 주의가 라벨에 명시되어 있습니다.'), source: 'cerenia_label' },
    },
    admin: [],
    ownerSigns: [T('Vomiting that continues despite treatment', '치료 중에도 계속되는 구토')],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'amoxicillin_clavulanate',
    name: T('Amoxicillin–clavulanate', '아목시실린-클라불란산'),
    aliases: ['Clavamox', '클라바목스', 'Synulox', 'Augmentin', '오구멘틴', 'Amoxiclav', 'co-amoxiclav', 'Amoxicillin', '아목시실린'],
    class: T('Aminopenicillin + β-lactamase inhibitor', '아미노페니실린 + 베타락탐분해효소 억제제'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'ac_tab_62_5', form: 'tablet', amount: { value: 62.5, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'ac_tab_125', form: 'tablet', amount: { value: 125, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'ac_tab_250', form: 'tablet', amount: { value: 250, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'ac_tab_375', form: 'tablet', amount: { value: 375, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'ac_dog_eu', species: 'dog', indication: T('Bacterial infection: standard (EU/UK label)', '세균 감염: 표준(EU/UK 라벨)'),
        dose: { min: 12.5, max: 25, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q12h', labelStatus: 'label', source: 'synulox_label',
        note: T('12.5 mg/kg twice daily; may be doubled to 25 mg/kg in refractory cases.', '12.5 mg/kg 1일 2회, 난치성 증례에서는 25 mg/kg까지 2배 증량 가능합니다.') },
      { id: 'ac_dog_us', species: 'dog', indication: T('Skin and soft-tissue infection (US label)', '피부·연부조직 감염(미국 라벨)'),
        dose: { min: 13.75, max: 13.75, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q12h', labelStatus: 'label', source: 'clavamox_label' },
      { id: 'ac_cat_us', species: 'cat', indication: T('Skin and soft-tissue infection (US label)', '피부·연부조직 감염(미국 라벨)'),
        dose: { min: 62.5, max: 62.5, unit: 'mg', basis: 'per_animal' }, route: 'PO', frequency: 'q12h', labelStatus: 'label', source: 'clavamox_label' },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: 'penicillin' },
    organRisk: {},
    admin: [],
    ownerSigns: [
      T('Vomiting or diarrhoea', '구토 또는 설사'),
      T('Facial swelling, hives or breathing difficulty (allergic reaction)', '얼굴 부종, 두드러기 또는 호흡곤란(알레르기 반응)'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'meloxicam',
    name: T('Meloxicam', '멜록시캄'),
    aliases: ['Metacam', '메타캄', 'Mobic', '모빅'],
    class: T('NSAID (oxicam, COX-2 preferential)', 'NSAID(옥시캄계, COX-2 선호성)'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'melox_susp_1_5', form: 'suspension', amount: { value: 1.5, unit: 'mg' }, per: { value: 1, unit: 'mL' }, splittable: false },
      { id: 'melox_inj_5', form: 'injection', amount: { value: 5, unit: 'mg' }, per: { value: 1, unit: 'mL' }, splittable: false },
    ],
    protocols: [
      { id: 'melox_dog_oa', species: 'dog', indication: T('Osteoarthritis: maintenance (after 0.2 mg/kg on day 1)', '골관절염: 유지 용량(1일차 0.2 mg/kg 이후)'),
        dose: { min: 0.1, max: 0.1, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q24h', labelStatus: 'label', source: 'metacam_label' },
      { id: 'melox_dog_load', species: 'dog', indication: T('Day-1 loading dose', '1일차 부하 용량'),
        dose: { min: 0.2, max: 0.2, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'once', labelStatus: 'label', source: 'metacam_label' },
      { id: 'melox_cat_periop', repeatPolicy: 'label_single_only', species: 'cat', indication: T('Peri-operative pain: single injection only (US)', '수술 전후 통증: 단회 주사만(미국)'),
        dose: { min: 0.3, max: 0.3, unit: 'mg/kg', basis: 'per_kg' }, route: 'SC', frequency: 'once', labelStatus: 'label', source: 'metacam_label' },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: true, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: 'nsaid' },
    organRisk: {
      gi: { level: 3, reason: T('NSAID class warning for gastrointestinal ulceration and perforation.', '위장관 궤양·천공에 대한 NSAID 계열 경고가 있습니다.'), source: 'metacam_label' },
      kidney: [
        { species: ['dog'], level: 2, reason: T('NSAID class precaution for kidney injury, higher with dehydration or kidney disease.', '탈수나 신장병이 있으면 커지는 신손상에 대한 NSAID 계열 주의사항이 있습니다.'), source: 'metacam_label' },
        { species: ['cat'], level: 3, reason: T('US boxed warning: repeated use in cats has been associated with acute renal failure and death.', '미국 박스 경고: 고양이에서 반복 투여는 급성 신부전 및 사망과 관련되었습니다.'), source: 'metacam_label' },
      ],
      liver: { level: 2, reason: T('NSAID class precaution for liver toxicity.', '간독성에 대한 NSAID 계열 주의사항이 있습니다.'), source: 'metacam_label' },
    },
    admin: [
      { kind: 'lab', text: T('Run baseline kidney and liver bloodwork before long-term use and recheck periodically.', '장기 투여 전 신장·간 기초 혈액검사를 하고 주기적으로 재검하십시오.'), source: 'metacam_label' },
    ],
    ownerSigns: NSAID_OWNER_SIGNS,
    speciesCautions: [
      { species: 'cat', severity: 'major', when: { repeated: true }, text: T('US label for cats: one injection only. Do not follow with further meloxicam or any other NSAID.',
        '미국 고양이 라벨: 단 1회 주사만 허가. 이후 멜록시캄이나 다른 NSAID를 추가 투여하지 마십시오.'), source: 'metacam_label' },
    ],
    conditionCautions: [NSAID_GI_CAUTION('metacam_label')],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'carprofen',
    name: T('Carprofen', '카프로펜'),
    aliases: ['Rimadyl', '리마딜'],
    class: T('NSAID (propionic acid)', 'NSAID(프로피온산계)'),
    species: ['dog'],
    strengths: [
      { id: 'carp_tab_25', form: 'tablet', amount: { value: 25, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'carp_tab_75', form: 'tablet', amount: { value: 75, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'carp_tab_100', form: 'tablet', amount: { value: 100, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'carp_dog_pain', species: 'dog', indication: T('Osteoarthritis / post-operative pain', '골관절염 / 수술 후 통증'),
        dose: { min: 4.4, max: 4.4, unit: 'mg/kg', basis: 'per_kg', per: 'day' }, route: 'PO', frequency: 'q24h', labelStatus: 'label', source: 'rimadyl_label',
        note: T('4.4 mg/kg/day, once daily or as 2.2 mg/kg twice daily.', '4.4 mg/kg/일, 1일 1회 또는 2.2 mg/kg 1일 2회.') },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: true, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: 'nsaid' },
    organRisk: {
      liver: { level: 3, reason: T('Idiosyncratic hepatocellular toxicosis documented (21 dogs).', '특이체질성 간세포 독성이 보고되었습니다(21두).'), source: 'macphail1998' },
      gi: { level: 3, reason: T('NSAID class warning for gastrointestinal ulceration and perforation.', '위장관 궤양·천공에 대한 NSAID 계열 경고가 있습니다.'), source: 'rimadyl_label' },
      kidney: { level: 2, reason: T('NSAID class precaution: greatest risk with dehydration, diuretics or existing kidney, heart or liver disease.', 'NSAID 계열 주의사항: 탈수, 이뇨제 병용, 기존 신장·심장·간 질환이 있을 때 위험이 가장 큽니다.'), source: 'rimadyl_label' },
    },
    admin: [
      { kind: 'lab', text: T('Run baseline kidney and liver bloodwork before long-term use and recheck periodically.', '장기 투여 전 신장·간 기초 혈액검사를 하고 주기적으로 재검하십시오.'), source: 'rimadyl_label' },
    ],
    ownerSigns: NSAID_OWNER_SIGNS,
    speciesCautions: [],
    conditionCautions: [NSAID_GI_CAUTION('rimadyl_label')],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'robenacoxib',
    name: T('Robenacoxib', '로베나콕시브'),
    aliases: ['Onsior', '온시오르'],
    class: T('NSAID (coxib)', 'NSAID(콕시브계)'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'robe_tab_6', form: 'tablet', amount: { value: 6, unit: 'mg' }, splittable: false },
      { id: 'robe_tab_10', form: 'tablet', amount: { value: 10, unit: 'mg' }, splittable: false },
      { id: 'robe_tab_20', form: 'tablet', amount: { value: 20, unit: 'mg' }, splittable: false },
      { id: 'robe_tab_40', form: 'tablet', amount: { value: 40, unit: 'mg' }, splittable: false },
    ],
    protocols: [
      { id: 'robe_dog_postop', species: 'dog', indication: T('Post-operative pain (max 3 days)', '수술 후 통증(최대 3일)'),
        dose: { min: 2, max: 4, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q24h', durationDays: 3, labelStatus: 'label', source: 'onsior_label',
        note: T('Label: 2 mg/kg, range 2–4 mg/kg with whole tablets, once daily for up to 3 days.', '라벨: 2 mg/kg(정제 단위로 2–4 mg/kg), 1일 1회 최대 3일.') },
      { id: 'robe_cat_postop', species: 'cat', indication: T('Post-operative pain (max 3 days)', '수술 후 통증(최대 3일)'),
        dose: { min: 1, max: 2.4, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q24h', durationDays: 3, labelStatus: 'label', source: 'onsior_label',
        note: T('Label: 1 mg/kg, range 1–2.4 mg/kg (one 6 mg tablet for cats of 2.5–6 kg), once daily for up to 3 days. Tablets are not split.', '라벨: 1 mg/kg(2.5–6 kg 고양이에 6 mg 정제 1정, 1–2.4 mg/kg), 1일 1회 최대 3일. 정제는 분할하지 않습니다.') },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: true, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: 'nsaid' },
    organRisk: {
      gi: { level: 3, reason: T('NSAID class warning for gastrointestinal ulceration and perforation.', '위장관 궤양·천공에 대한 NSAID 계열 경고가 있습니다.'), source: 'onsior_label' },
      kidney: { level: 2, reason: T('NSAID class precaution for kidney injury.', '신손상에 대한 NSAID 계열 주의사항이 있습니다.'), source: 'onsior_label' },
      liver: { level: 2, reason: T('NSAID class precaution for liver toxicity.', '간독성에 대한 NSAID 계열 주의사항이 있습니다.'), source: 'onsior_label' },
    },
    admin: [],
    ownerSigns: NSAID_OWNER_SIGNS,
    speciesCautions: [],
    conditionCautions: [NSAID_GI_CAUTION('onsior_label')],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'gabapentin',
    name: T('Gabapentin', '가바펜틴'),
    aliases: ['Neurontin', '뉴론틴'],
    class: T('Gabapentinoid', '가바펜티노이드'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'gaba_cap_100', form: 'capsule', amount: { value: 100, unit: 'mg' }, splittable: false },
      { id: 'gaba_cap_300', form: 'capsule', amount: { value: 300, unit: 'mg' }, splittable: false },
    ],
    protocols: [
      { id: 'gaba_cat_previsit', species: 'cat', indication: T('Pre-visit stress / handling', '내원 전 스트레스·보정 완화'),
        dose: { min: 100, max: 100, unit: 'mg', basis: 'per_animal' }, route: 'PO', frequency: 'once', labelStatus: 'extra-label', source: 'vanhaaften2017',
        note: T('Single 100 mg capsule per cat about 90 minutes before transport (13–29 mg/kg in the study).', '이동 약 90분 전 고양이당 100 mg 캡슐 1회(연구에서 13–29 mg/kg).') },
    ],
    pk: {
      pgp: { substrate: false, inhibitor: null },
      cyp: { substrateOf: [], inhibits: {}, induces: {} },
      renalFraction: 0.66,
      renalNote: T('About 34% of a dose is metabolised in dogs and the main route of excretion is urine, so 0.66 is an upper-bound estimate (1 − 0.34). Cats with CKD reach higher serum concentrations.',
        '개에서는 투여량의 약 34%가 대사되고 주 배설 경로는 소변이므로 0.66은 상한 추정치(1 − 0.34)입니다. CKD 고양이에서는 혈청 농도가 더 높게 나타납니다.'),
      sources: ['radulovic1995', 'quimby2022'],
    },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: null },
    organRisk: {
      cns: { level: 1, reason: T('Sedation and ataxia are common and resolve within hours.', '진정과 운동실조가 흔하며 수 시간 내 회복됩니다.'), source: 'vanhaaften2017' },
    },
    admin: [
      { kind: 'administration', text: T('For visit stress, give about 90 minutes before putting the cat in the carrier.', '내원 스트레스 완화 목적이라면 이동장에 넣기 약 90분 전에 투여하십시오.'), source: 'vanhaaften2017' },
    ],
    ownerSigns: [
      T('Deep sleepiness or wobbliness lasting more than 8 hours', '8시간 넘게 지속되는 깊은 졸림 또는 비틀거림'),
      T('Vomiting or drooling', '구토 또는 침 흘림'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'tramadol',
    name: T('Tramadol', '트라마돌'),
    aliases: ['Ultram', '울트람', 'Tridol', '트리돌'],
    class: T('Atypical opioid (µ-agonist, serotonin/noradrenaline reuptake inhibitor)', '비전형 오피오이드(µ 작용제, 세로토닌·노르아드레날린 재흡수 억제)'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'tram_tab_50', form: 'tablet', amount: { value: 50, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'tram_dog_pain', species: 'dog', indication: T('Pain (adjunct)', '통증(보조 진통)'),
        dose: { min: 5, max: 5, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q6h', labelStatus: 'extra-label', source: 'kukanich2004', extraSources: ['budsberg2018'],
        note: T('5 mg/kg every 6 h comes from a pharmacokinetic simulation (concentrations analgesic in people), not an efficacy study; a controlled trial found no benefit for osteoarthritis at 5 mg/kg every 8 h.',
          '6시간마다 5 mg/kg은 약동학 시뮬레이션(사람에서 진통 효과를 보이는 농도)에서 나온 용량이며 효능 연구 결과가 아닙니다. 대조 임상시험에서 8시간마다 5 mg/kg은 골관절염에 효과가 없었습니다.') },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: ['kukanich2004'] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: true, allergyClass: 'opioid' },
    organRisk: {
      cns: { level: 2, reason: T('Opioid and serotonergic actions; tramadol overdose has caused serotonin syndrome in a cat.', '오피오이드·세로토닌 작용이 있으며, 고양이에서 트라마돌 과량 투여가 세로토닌 증후군을 일으킨 보고가 있습니다.'), source: 'indrawirawan2014' },
    },
    admin: [],
    ownerSigns: [
      T('Marked sleepiness', '심한 졸림'),
      T('Agitation, trembling or dilated pupils', '흥분, 떨림 또는 동공 확대'),
      T('Vomiting', '구토'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'trazodone',
    name: T('Trazodone', '트라조돈'),
    aliases: ['Trittico', '트리티코', 'Desyrel'],
    class: T('Serotonin antagonist and reuptake inhibitor (SARI)', '세로토닌 길항·재흡수 억제제(SARI)'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'traz_tab_25', form: 'tablet', amount: { value: 25, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'traz_tab_50', form: 'tablet', amount: { value: 50, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'traz_tab_100', form: 'tablet', amount: { value: 100, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'traz_dog_previsit', species: 'dog', indication: T('Pre-visit stress (single dose)', '내원 전 스트레스(단회)'),
        dose: { min: 9, max: 12, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'once', labelStatus: 'extra-label', source: 'kim2022',
        note: T('Given about 90 minutes before transport in the trial.', '임상시험에서는 이동 약 90분 전에 투여했습니다.') },
      { id: 'traz_cat_single', species: 'cat', indication: T('Transport / examination anxiety (single dose)', '이동·검사 관련 불안(단회)'),
        dose: { min: 50, max: 100, unit: 'mg', basis: 'per_animal' }, route: 'PO', frequency: 'once', labelStatus: 'extra-label', source: 'stevens2016', extraSources: ['orlando2015'],
        note: T('50 mg per cat before the visit reduced transport and examination anxiety in a placebo-controlled trial; single doses of 50–100 mg were well tolerated in a pilot study.',
          '내원 전 고양이당 50 mg은 위약대조 시험에서 이동·검사 관련 불안을 줄였고, 예비 연구에서 50–100 mg 단회 투여는 내약성이 양호했습니다.') },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: true, allergyClass: null },
    organRisk: {
      cns: { level: 1, reason: T('Sedation (the intended effect).', '진정(의도된 효과).'), source: 'fries2019' },
      heart: { species: ['cat'], level: 1, reason: T('Systolic blood pressure fell after 50 mg in healthy cats, without clinically relevant echocardiographic change.', '건강한 고양이에서 50 mg 투여 후 수축기 혈압이 감소했으나, 임상적으로 의미 있는 심초음파 변화는 없었습니다.'), source: 'fries2019' },
    },
    admin: [],
    ownerSigns: [
      T('Excessive sleepiness or wobbliness', '과도한 졸림 또는 비틀거림'),
      T('Agitation or restlessness', '흥분 또는 안절부절못함'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'fluoxetine',
    name: T('Fluoxetine', '플루옥세틴'),
    aliases: ['Reconcile', 'Prozac', '프로작'],
    class: T('Selective serotonin reuptake inhibitor (SSRI)', '선택적 세로토닌 재흡수 억제제(SSRI)'),
    species: ['dog'],
    strengths: [
      { id: 'flx_chew_8', form: 'chewable', amount: { value: 8, unit: 'mg' }, splittable: false },
      { id: 'flx_chew_16', form: 'chewable', amount: { value: 16, unit: 'mg' }, splittable: false },
      { id: 'flx_chew_32', form: 'chewable', amount: { value: 32, unit: 'mg' }, splittable: false },
      { id: 'flx_chew_64', form: 'chewable', amount: { value: 64, unit: 'mg' }, splittable: false },
    ],
    protocols: [
      { id: 'flx_dog_sep', species: 'dog', indication: T('Separation anxiety (with behaviour modification)', '분리불안(행동교정과 병행)'),
        dose: { min: 1, max: 2, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q24h', labelStatus: 'label', source: 'reconcile_label' },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: true, allergyClass: null },
    organRisk: {
      cns: { level: 3, reason: T('Labelled contraindication in dogs with epilepsy or a history of seizures; seizures have occurred during treatment.', '뇌전증 또는 발작 병력이 있는 개에는 라벨상 금기이며, 투여 중 발작이 보고되었습니다.'), source: 'reconcile_label' },
    },
    admin: [],
    ownerSigns: [
      T('Seizures or twitching', '발작 또는 근육 경련'),
      T('Loss of appetite or lethargy', '식욕 저하 또는 무기력'),
      T('Restlessness or panting', '안절부절못함 또는 헐떡임'),
    ],
    speciesCautions: [],
    conditionCautions: [
      { condition: 'epilepsy', species: ['dog'], severity: 'contraindicated', source: 'reconcile_label',
        text: T('Labelled contraindication: dogs with epilepsy or a history of seizures. Seizures have occurred during treatment.', '라벨 금기: 뇌전증 또는 발작 병력이 있는 개. 투여 중 발작이 보고되었습니다.'),
        consequence: T('Seizures may be triggered or become more frequent.', '발작이 유발되거나 잦아질 수 있습니다.'),
        actions: [T('Do not dispense fluoxetine to this dog; discuss other ways to manage the behaviour problem with the owner.', '이 개에게 플루옥세틴을 조제하지 마십시오. 행동 문제를 관리할 다른 방법을 보호자와 상의하십시오.')] },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'omeprazole',
    name: T('Omeprazole', '오메프라졸'),
    aliases: ['Losec', '로섹', 'Prilosec', 'Gastrogard'],
    class: T('Proton-pump inhibitor (PPI)', '양성자펌프억제제(PPI)'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'ome_cap_10', form: 'capsule', amount: { value: 10, unit: 'mg' }, splittable: false },
      { id: 'ome_cap_20', form: 'capsule', amount: { value: 20, unit: 'mg' }, splittable: false },
    ],
    protocols: [
      { id: 'ome_dog_acid', species: 'dog', indication: T('Acid suppression (ulcer, reflux)', '위산 억제(궤양, 역류)'),
        dose: { min: 1, max: 1, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q12h', labelStatus: 'extra-label', source: 'bersenas2005', extraSources: ['marks2018'],
        note: T('In healthy Beagles, twice-daily omeprazole was the only regimen tested that approached human therapeutic targets for intragastric pH. Effective clinical doses are not well established in dogs.',
          '건강한 비글에서 1일 2회 오메프라졸이 시험된 요법 중 사람의 위내 pH 치료 목표에 근접한 유일한 요법이었습니다. 개의 임상 유효 용량은 아직 확립되지 않았습니다.') },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: null, raisesGastricPh: true, acidSuppressant: 'ppi' },
    organRisk: {
      gi: { level: 1, reason: T('Diarrhoea is the most commonly reported PPI adverse effect in dogs, and adverse effects of long-term acid suppression are documented; use only with a clear indication.', '설사는 개에서 가장 흔히 보고되는 PPI 부작용이며, 장기 위산 억제의 부작용도 보고되어 있으므로 명확한 적응증이 있을 때만 사용합니다.'), source: 'marks2018' },
    },
    admin: [],
    ownerSigns: [],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'famotidine',
    name: T('Famotidine', '파모티딘'),
    aliases: ['Pepcid', '펩시드', 'Gaster', '가스터'],
    class: T('H2-receptor antagonist', 'H2 수용체 길항제'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'famo_tab_10', form: 'tablet', amount: { value: 10, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'famo_tab_20', form: 'tablet', amount: { value: 20, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'famo_dog_acid', species: 'dog', indication: T('Acid suppression (weaker than a PPI)', '위산 억제(PPI보다 약함)'),
        dose: { min: 0.5, max: 1.3, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q12h', labelStatus: 'extra-label', source: 'marks2018', extraSources: ['tolbert2011'],
        note: T('Doses studied 0.5–1.3 mg/kg q12h (no consensus dose is established); acid suppression is inferior to omeprazole.', '연구된 용량은 0.5–1.3 mg/kg q12h이며(합의된 용량은 없음), 위산 억제 효과는 오메프라졸보다 열등합니다.') },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: null, raisesGastricPh: true, acidSuppressant: 'h2ra' },
    organRisk: {},
    admin: [],
    ownerSigns: [],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'enrofloxacin',
    name: T('Enrofloxacin', '엔로플록사신'),
    aliases: ['Baytril', '바이트릴'],
    class: T('Fluoroquinolone', '플루오로퀴놀론계'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'enro_tab_22_7', form: 'tablet', amount: { value: 22.7, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'enro_tab_68', form: 'tablet', amount: { value: 68, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'enro_tab_136', form: 'tablet', amount: { value: 136, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'enro_dog', species: 'dog', indication: T('Susceptible bacterial infection', '감수성 세균 감염'),
        dose: { min: 5, max: 20, unit: 'mg/kg', basis: 'per_kg', per: 'day' }, route: 'PO', frequency: 'q24h', labelStatus: 'label', source: 'baytril_label' },
      { id: 'enro_cat', species: 'cat', indication: T('Susceptible bacterial infection', '감수성 세균 감염'),
        dose: { min: 5, max: 5, unit: 'mg/kg', basis: 'per_kg', per: 'day' }, route: 'PO', frequency: 'q24h', labelStatus: 'label', source: 'baytril_label',
        note: T('Feline maximum 5 mg/kg per day (retinal toxicity at higher doses).', '고양이 최대 5 mg/kg/일(고용량에서 망막 독성).') },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: 'fluoroquinolone',
      felineRetinalLimit: { value: 5, unit: 'mg/kg', per: 'day' } },
    organRisk: {},
    admin: [
      { kind: 'administration', text: T('Do not give at the same time as antacids or other products containing magnesium, aluminium or other di-/trivalent cations; give the antibiotic 2 hours before them.',
        '제산제 등 마그네슘·알루미늄 등 2가·3가 양이온 함유 제제와 동시에 투여하지 마십시오. 항생제를 2시간 먼저 투여하십시오.'), source: 'marks2018' },
    ],
    ownerSigns: [
      T('Cat: dilated pupils, bumping into things or other vision loss', '고양이: 동공 확대, 물건에 부딪힘 등 시력 저하'),
      T('Vomiting or not eating', '구토 또는 식욕 부진'),
    ],
    speciesCautions: [
      { species: 'cat', severity: 'major', text: T('Acute retinal degeneration and blindness have been reported in cats given enrofloxacin; keep to the label maximum of 5 mg/kg per day.',
        '엔로플록사신을 투여한 고양이에서 급성 망막 변성과 실명이 보고되었으므로 라벨 최대 용량인 5 mg/kg/일을 지키십시오.'), source: 'gelatt2001' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'metronidazole',
    name: T('Metronidazole', '메트로니다졸'),
    aliases: ['Flagyl', '플라질', 'Flasinyl', '후라시닐'],
    class: T('Nitroimidazole antimicrobial', '니트로이미다졸계 항균제'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'metro_tab_250', form: 'tablet', amount: { value: 250, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'metro_tab_500', form: 'tablet', amount: { value: 500, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'metro_dog_diarrhoea', species: 'dog', indication: T('Acute non-specific diarrhoea (7 days)', '급성 비특이적 설사(7일)'),
        dose: { min: 10, max: 15, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q12h', durationDays: 7, labelStatus: 'extra-label', source: 'langlois2020',
        note: T('Shortened diarrhoea by about 1.5 days on average; most dogs recover within days without treatment.', '설사 기간을 평균 약 1.5일 단축했으나, 대부분은 치료 없이도 수일 내 회복합니다.') },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: 'nitroimidazole' },
    organRisk: {
      cns: { level: 2, reason: T('Neurotoxicity (vestibular/cerebellar signs) reported in dogs receiving on average about 60 mg/kg/day for weeks.', '평균 약 60 mg/kg/일을 수주간 투여받은 개에서 신경독성(전정·소뇌 증상)이 보고되었습니다.'), source: 'evans2003' },
    },
    admin: [],
    ownerSigns: [
      T('Head tilt, wobbliness or abnormal eye movements', '머리 기울임, 비틀거림 또는 비정상적 안구 움직임'),
      T('Seizures', '발작'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'furosemide',
    name: T('Furosemide', '푸로세미드'),
    aliases: ['Lasix', '라식스', 'Salix', '푸로세마이드'],
    class: T('Loop diuretic', '루프 이뇨제'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'furo_tab_12_5', form: 'tablet', amount: { value: 12.5, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'furo_tab_20', form: 'tablet', amount: { value: 20, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'furo_tab_40', form: 'tablet', amount: { value: 40, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'furo_dog_chf', species: 'dog', indication: T('Congestive heart failure, chronic home treatment (MMVD stage C)', '울혈성 심부전 가정 유지 치료(MMVD C단계)'),
        dose: { min: 2, max: 2, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q12h', labelStatus: 'extra-label', source: 'keene2019',
        note: T('Commonly 2 mg/kg q12h, adjusted to effect; needing 8 mg/kg/day or more indicates stage D.', '통상 2 mg/kg q12h로 효과에 따라 조정하며, 8 mg/kg/일 이상이 필요하면 D단계를 시사합니다.') },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: null, loopDiuretic: true },
    organRisk: {
      kidney: { level: 2, reason: T('Diuretic treatment can cause azotaemia and electrolyte disturbances, so the consensus recommends checking creatinine, BUN and electrolytes 3–14 days after starting.', '이뇨제 치료는 고질소혈증과 전해질 이상을 일으킬 수 있어, 합의문은 시작 3–14일 후 크레아티닌, BUN, 전해질 검사를 권고합니다.'), source: 'keene2019' },
    },
    admin: [
      { kind: 'lab', text: T('Measure creatinine, BUN and electrolytes 3–14 days after starting.', '투여 시작 3–14일 후 크레아티닌, BUN, 전해질을 측정하십시오.'), source: 'keene2019' },
    ],
    ownerSigns: [
      T('Weakness or collapse', '기력 저하 또는 쓰러짐'),
      T('Not drinking or not eating', '물이나 밥을 먹지 않음'),
      T('Breathing faster at rest (sleeping respiratory rate up)', '안정 시 호흡수 증가(수면 중 호흡수 증가)'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'pimobendan',
    name: T('Pimobendan', '피모벤단'),
    aliases: ['Vetmedin', '벳메딘'],
    class: T('Inodilator', '강심 혈관확장제(이노딜레이터)'),
    species: ['dog'],
    strengths: [
      { id: 'pimo_chew_1_25', form: 'chewable', amount: { value: 1.25, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'pimo_chew_2_5', form: 'chewable', amount: { value: 2.5, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'pimo_chew_5', form: 'chewable', amount: { value: 5, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'pimo_chew_10', form: 'chewable', amount: { value: 10, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'pimo_dog_chf', species: 'dog', indication: T('Congestive heart failure (MMVD / DCM)', '울혈성 심부전(MMVD / DCM)'),
        dose: { min: 0.5, max: 0.5, unit: 'mg/kg', basis: 'per_kg', per: 'day' }, route: 'PO', frequency: 'q12h', labelStatus: 'label', source: 'vetmedin_label',
        note: T('0.5 mg/kg per day divided into two doses about 12 h apart.', '1일 0.5 mg/kg을 약 12시간 간격 2회로 나누어 투여.') },
      { id: 'pimo_dog_b2', species: 'dog', indication: T('Preclinical MMVD with cardiomegaly (stage B2)', '심비대를 동반한 무증상 MMVD(B2단계)'),
        dose: { min: 0.4, max: 0.6, unit: 'mg/kg', basis: 'per_kg', per: 'day' }, route: 'PO', frequency: 'q12h', labelStatus: 'extra-label', source: 'boswood2016' },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: null },
    organRisk: {
      heart: { level: 2, reason: T('Labelled: not for conditions where raising cardiac output is inappropriate (e.g. hypertrophic cardiomyopathy, aortic stenosis).', '라벨: 심박출량 증가가 부적절한 질환(예: 비대성 심근병증, 대동맥 협착)에는 사용하지 않습니다.'), source: 'vetmedin_label' },
    },
    admin: [],
    ownerSigns: [
      T('Breathing faster at rest or coughing more', '안정 시 호흡이 빨라지거나 기침 증가'),
      T('Fainting or collapse', '실신 또는 쓰러짐'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'benazepril',
    name: T('Benazepril', '베나제프릴'),
    aliases: ['Fortekor', 'Lotensin'],
    class: T('ACE inhibitor', 'ACE 억제제'),
    species: ['dog', 'cat'],
    strengths: [
      { id: 'bena_tab_5', form: 'tablet', amount: { value: 5, unit: 'mg' }, splittable: true, quarter: false },
      { id: 'bena_tab_20', form: 'tablet', amount: { value: 20, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [
      { id: 'bena_cat_ckd', species: 'cat', indication: T('CKD with proteinuria', '단백뇨를 동반한 CKD'),
        dose: { min: 0.5, max: 1.0, unit: 'mg/kg', basis: 'per_kg' }, route: 'PO', frequency: 'q24h', labelStatus: 'extra-label', source: 'king2006' },
      { id: 'bena_dog_htn', species: 'dog', indication: T('Hypertension / proteinuria (RAAS inhibition)', '고혈압 / 단백뇨(RAAS 억제)'),
        dose: { min: 0.5, max: 4, unit: 'mg/kg', basis: 'per_kg', per: 'day' }, route: 'PO', frequency: 'q12h', labelStatus: 'extra-label', source: 'acierno2018',
        note: T('The consensus table gives 0.5 mg/kg every 12–24 h and the text 0.5–2.0 mg/kg every 12 h for initial ACE-inhibitor therapy, so the daily total (0.5–4 mg/kg/day) is compared.',
          '합의문 표는 0.5 mg/kg 12–24시간 간격, 본문은 초기 ACE 억제제 치료로 0.5–2.0 mg/kg 12시간 간격을 제시하므로 1일 총량(0.5–4 mg/kg/일)으로 비교합니다.') },
    ],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: 'ace_inhibitor', aceInhibitor: true },
    organRisk: {
      kidney: { level: 2, reason: T('GFR can fall sharply if started in a dehydrated animal; rehydrate first and recheck creatinine.', '탈수된 상태에서 시작하면 사구체여과율이 급감할 수 있으므로 먼저 수액으로 교정하고 크레아티닌을 재검합니다.'), source: 'acierno2018' },
    },
    admin: [
      { kind: 'lab', text: T('Measure creatinine and electrolytes 3–14 days after starting. In dogs with heart failure, the ACVIM consensus treats a creatinine rise of 30% or more from baseline as a concern for acute kidney injury.',
        '투여 시작 3–14일 후 크레아티닌과 전해질을 측정하십시오. 심부전 개에서 ACVIM 합의문은 기저치 대비 크레아티닌 30% 이상 상승을 급성 신손상 우려 신호로 봅니다.'), source: 'keene2019' },
    ],
    ownerSigns: [
      T('Weakness or not eating', '기력 저하 또는 식욕 부진'),
      T('Vomiting', '구토'),
    ],
    speciesCautions: [],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'permethrin',
    name: T('Permethrin (canine spot-on)', '퍼메트린(개 전용 스팟온)'),
    aliases: ['K9 Advantix II', 'Advantix', 'Exspot'],
    class: T('Pyrethroid insecticide', '피레스로이드계 살충제'),
    species: ['dog'],
    strengths: [
      { id: 'perm_spot', form: 'spot-on', amount: { value: 1, unit: 'pipette' }, splittable: false,
        note: T('Product-specific pipette for the dog’s weight band.', '개 체중 구간별 전용 피펫.') },
    ],
    protocols: [],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: null },
    organRisk: {
      cns: { species: ['cat'], level: 3, reason: T('In cats, canine permethrin spot-ons cause tremors, seizures and death.', '고양이에서 개 전용 퍼메트린 스팟온은 떨림, 발작, 사망을 일으킵니다.'), source: 'linnett2008' },
    },
    admin: [],
    ownerSigns: [
      T('Twitching or trembling', '근육 경련 또는 떨림'),
      T('Seizures', '발작'),
      T('Drooling or wobbliness', '침 흘림 또는 비틀거림'),
    ],
    speciesCautions: [
      { species: 'cat', severity: 'contraindicated', text: T('Canine permethrin spot-ons are toxic to cats: most poisonings follow an owner applying a dog product, and cats are also exposed by grooming or close contact with a recently treated dog.',
        '개 전용 퍼메트린 스팟온은 고양이에게 독성이 있습니다. 대부분의 중독은 보호자가 개 제품을 바른 뒤 발생하며, 최근 처치한 개를 핥거나 밀접 접촉해도 노출됩니다.'), source: 'linnett2008' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────
  {
    id: 'acetaminophen',
    name: T('Paracetamol (acetaminophen)', '아세트아미노펜'),
    aliases: ['Acetaminophen', 'Paracetamol', 'Tylenol', '타이레놀', '파라세타몰'],
    class: T('Analgesic / antipyretic (para-aminophenol)', '해열진통제(파라아미노페놀계)'),
    species: ['dog'],
    strengths: [
      { id: 'apap_tab_500', form: 'tablet', amount: { value: 500, unit: 'mg' }, splittable: true, quarter: false },
    ],
    protocols: [],
    pk: { pgp: { substrate: false, inhibitor: null }, cyp: { substrateOf: [], inhibits: {}, induces: {} }, renalFraction: null, sources: [] },
    flags: { mdr1Sensitive: false, narrowTherapeuticIndex: false, nsaid: false, corticosteroid: false, immunosuppressant: false, serotonergic: false, allergyClass: null },
    organRisk: {
      liver: { species: ['cat'], level: 3, reason: T('In cats, acetaminophen causes methaemoglobinaemia and sometimes fatal liver failure.', '고양이에서 아세트아미노펜은 메트헤모글로빈혈증과 때로 치명적인 간부전을 일으킵니다.'), source: 'rumbeiha1995' },
    },
    admin: [],
    ownerSigns: [
      T('Brown or bluish gums', '갈색 또는 푸르스름한 잇몸'),
      T('Laboured breathing', '힘든 호흡'),
      T('Vomiting or not eating', '구토 또는 식욕 부진'),
      T('Yellow gums or eyes', '잇몸이나 눈이 노랗게 변함'),
    ],
    speciesCautions: [
      { species: 'cat', severity: 'contraindicated', text: T('Acetaminophen is one of the most frequent causes of poisoning in cats (methaemoglobinaemia, liver failure). Never give it to a cat.',
        '아세트아미노펜은 고양이 중독의 가장 흔한 원인 중 하나입니다(메트헤모글로빈혈증, 간부전). 고양이에게 절대 투여하지 마십시오.'), source: 'rumbeiha1995' },
    ],
  },
]

export const DRUG_BY_ID = Object.fromEntries(DRUGS.map((d) => [d.id, d]))

export function getDrug(id) {
  return DRUG_BY_ID[id] || null
}

export function getProtocol(drugId, protocolId) {
  const d = DRUG_BY_ID[drugId]
  if (!d || !protocolId) return null
  return d.protocols.find((p) => p.id === protocolId) || null
}

export function protocolsFor(drugId, species) {
  const d = DRUG_BY_ID[drugId]
  if (!d) return []
  return d.protocols.filter((p) => !species || p.species === species)
}

export function getStrength(drugId, strengthId) {
  const d = DRUG_BY_ID[drugId]
  if (!d || !strengthId) return null
  return d.strengths.find((s) => s.id === strengthId) || null
}
