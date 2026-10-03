/**
 * Golden cases. Each `input` is a caseInput for analyze(); each `expect` is
 * asserted in engine/__tests__/golden.test.js:
 *   - verdict level must match;
 *   - every expected finding must appear (ruleId + severity + drugIds);
 *   - any other finding fails the test unless its ruleId is in allowAlso;
 *   - listed notes and dose amounts must be present.
 *
 * Case copy is authored in English and Korean. It needs review by a
 * veterinarian before public launch.
 */

const T = (en, ko) => ({ en, ko })

export const CASES = [
  {
    id: 'choco',
    species: 'dog',
    name: T('Choco', '초코'),
    title: T('Choco — demodicosis treatment in a Rough Collie', '초코 — 러프 콜리의 모낭충증 치료'),
    signalment: T('Rough Collie · male neutered · 4 y · 24 kg · MDR1 genotype unknown', '러프 콜리 · 중성화 수컷 · 4세 · 24 kg · MDR1 유전자형 미검사'),
    problems: T('Generalised demodicosis; Malassezia otitis', '전신성 모낭충증, 말라세지아 외이염'),
    question: T('Can high-dose oral ivermectin and systemic ketoconazole be started together today?', '고용량 경구 이버멕틴과 전신 케토코나졸을 오늘 함께 시작해도 될까요?'),
    shouldCatch: T('MDR1-risk breed + anti-parasitic ivermectin dose + a P-gp inhibitor → contraindicated; suggest an isoxazoline and ABCB1 genotyping.',
      'MDR1 위험 품종 + 모낭충 치료 용량의 이버멕틴 + P-gp 억제제 → 금기. 이속사졸린계와 ABCB1 유전자 검사를 제안해야 합니다.'),
    input: {
      species: 'dog', weightKg: 24, breedId: 'collie', breedText: 'Rough Collie',
      ageYears: 4, sex: 'male', neutered: true, pregnant: false, lactating: false,
      conditions: ['demodicosis', 'malassezia_otitis'], labs: {}, allergies: [], mdr1Status: 'unknown',
      meds: [
        { drugId: 'ivermectin', protocolId: 'iver_dog_demodex', dose: { value: 300, unit: 'mcg/kg' }, route: 'PO', frequency: 'q24h', durationDays: null, strengthId: 'iver_sol_10' },
        { drugId: 'ketoconazole', protocolId: 'keto_dog_malassezia', dose: { value: 5, unit: 'mg/kg' }, route: 'PO', frequency: 'q12h', durationDays: 21, strengthId: null },
      ],
    },
    expect: {
      verdict: 'contraindicated',
      findings: [
        { ruleId: 'MDR1_PGP_ML', severity: 'contraindicated', drugIds: ['ivermectin', 'ketoconazole'], factorKinds: ['breed', 'dose', 'drug'],
          alternativesInclude: ['Isoxazoline', 'ABCB1'] },
      ],
      allowAlso: [],
      notesInclude: ['admin_ketoconazole_0'],
      doses: [{ drugId: 'ivermectin', perDoseMg: 7.2, administrationEn: '0.72 mL of 10 mg/mL' }],
    },
  },
  {
    id: 'kongyi',
    species: 'dog',
    name: T('Kongyi', '콩이'),
    title: T('Kongyi — epilepsy and atopic dermatitis in a Shih Tzu', '콩이 — 시츄의 뇌전증과 아토피 피부염'),
    signalment: T('Shih Tzu · male neutered · 6 y · 6 kg', '시츄 · 중성화 수컷 · 6세 · 6 kg'),
    problems: T('Idiopathic epilepsy; atopic dermatitis', '특발성 뇌전증, 아토피 피부염'),
    question: T('Ciclosporin and prednisolone are being added to long-term phenobarbital. What needs watching?', '장기 복용 중인 페노바르비탈에 사이클로스포린과 프레드니솔론을 추가합니다. 무엇을 주의해야 할까요?'),
    shouldCatch: T('Phenobarbital LOWERS ciclosporin levels (enzyme induction — moderate) and prednisolone levels (minor); additive immunosuppression (minor); phenobarbital lab effects.',
      '페노바르비탈이 사이클로스포린 농도를 "낮춤"(효소 유도 — 주의), 프레드니솔론 농도도 낮춤(경미), 면역억제 중복(경미), 페노바르비탈의 검사 수치 영향.'),
    input: {
      species: 'dog', weightKg: 6, breedId: 'shih_tzu', breedText: '시츄',
      ageYears: 6, sex: 'male', neutered: true, pregnant: false, lactating: false,
      conditions: ['epilepsy', 'atopic_dermatitis'], labs: {}, allergies: [], mdr1Status: 'unknown',
      meds: [
        { drugId: 'phenobarbital', protocolId: 'pb_dog_epilepsy', dose: { value: 2.5, unit: 'mg/kg' }, route: 'PO', frequency: 'q12h', durationDays: null, strengthId: null },
        { drugId: 'ciclosporin', protocolId: 'csa_dog_ad', dose: { value: 5, unit: 'mg/kg' }, route: 'PO', frequency: 'q24h', durationDays: null, strengthId: null },
        { drugId: 'prednisolone', protocolId: 'pred_dog_ad', dose: { value: 0.5, unit: 'mg/kg' }, route: 'PO', frequency: 'q24h', durationDays: 14, strengthId: null },
      ],
    },
    expect: {
      verdict: 'moderate',
      findings: [
        { ruleId: 'CYP_INDUCTION', severity: 'moderate', drugIds: ['phenobarbital', 'ciclosporin'] },
        { ruleId: 'CYP_INDUCTION', severity: 'minor', drugIds: ['phenobarbital', 'prednisolone'] },
        { ruleId: 'IMMUNOSUPPRESSION_ADDITIVE', severity: 'minor', drugIds: ['ciclosporin', 'prednisolone'] },
      ],
      allowAlso: [],
      notesInclude: ['admin_phenobarbital_0', 'admin_phenobarbital_1'],
      doses: [{ drugId: 'phenobarbital', perDoseMg: 15 }, { drugId: 'ciclosporin', perDoseMg: 30 }, { drugId: 'prednisolone', perDoseMg: 3 }],
    },
  },
  {
    id: 'nabi',
    species: 'cat',
    name: T('Nabi', '나비'),
    title: T('Nabi — hyperthyroid cat with kidney disease', '나비 — 신장병이 있는 갑상선기능항진증 고양이'),
    signalment: T('Domestic Shorthair (Korean Shorthair) · female spayed · 13 y · 4.1 kg', '코리안숏헤어 · 중성화 암컷 · 13세 · 4.1 kg'),
    problems: T('Hyperthyroidism; CKD (IRIS stage 2), creatinine 2.0 mg/dL', '갑상선기능항진증, 만성 신장병(IRIS 2단계), 크레아티닌 2.0 mg/dL'),
    question: T('Is it reasonable to start methimazole in a cat that already has kidney disease, alongside amlodipine and maropitant?', '이미 신장병이 있는 고양이에게 암로디핀, 마로피탄트와 함께 메티마졸을 시작해도 될까요?'),
    shouldCatch: T('No drug–drug problem; methimazole + CKD needs a renal/thyroid monitoring plan (moderate); per-cat doses must not be multiplied by weight.',
      '약물 간 문제는 없음. 메티마졸 + CKD는 신장·갑상선 모니터링 계획 필요(주의). 고양이당 용량은 체중을 곱하면 안 됩니다.'),
    input: {
      species: 'cat', weightKg: 4.1, breedId: null, breedText: '코리안숏헤어',
      ageYears: 13, sex: 'female', neutered: true, pregnant: false, lactating: false,
      conditions: ['hyperthyroidism', 'ckd'], labs: { creatinine: 2.0 }, allergies: [], mdr1Status: 'unknown',
      meds: [
        { drugId: 'methimazole', protocolId: 'mmi_cat_start', dose: { value: 2.5, unit: 'mg' }, route: 'PO', frequency: 'q12h', durationDays: null, strengthId: null },
        { drugId: 'amlodipine', protocolId: 'amlo_cat_htn', dose: { value: 0.625, unit: 'mg' }, route: 'PO', frequency: 'q24h', durationDays: null, strengthId: null },
        { drugId: 'maropitant', protocolId: 'maro_cat_ckd_po', dose: { value: 1, unit: 'mg/kg' }, route: 'PO', frequency: 'q24h', durationDays: 14, strengthId: null },
      ],
    },
    expect: {
      verdict: 'moderate',
      findings: [
        { ruleId: 'METHIMAZOLE_CKD', severity: 'moderate', drugIds: ['methimazole'], factorKinds: ['condition', 'lab'] },
      ],
      allowAlso: [],
      notesInclude: ['admin_methimazole_0'],
      doses: [{ drugId: 'methimazole', perDoseMg: 2.5 }, { drugId: 'amlodipine', perDoseMg: 0.625 }, { drugId: 'maropitant', perDoseMg: 4.1 }],
      breedResolvesTo: 'domestic_shorthair',
    },
  },
  {
    id: 'mochi',
    species: 'cat',
    name: T('Mochi', '모찌'),
    title: T('Mochi — a dog flea spot-on for the cat', '모찌 — 고양이에게 개용 벼룩 스팟온'),
    signalment: T('Korean Shorthair · female spayed · 2 y · 3.8 kg', '코리안숏헤어 · 중성화 암컷 · 2세 · 3.8 kg'),
    problems: T('Fleas; the owner asks to use the dog’s permethrin spot-on', '벼룩. 보호자가 개용 퍼메트린 스팟온을 쓰고 싶어 함'),
    question: T('The owner wants to use leftover canine permethrin spot-on on the cat. Can we dispense it?', '보호자가 남은 개용 퍼메트린 스팟온을 고양이에게 쓰려고 합니다. 조제해도 될까요?'),
    shouldCatch: T('Species hard stop: permethrin is contraindicated in cats.', '종 특이 금기: 퍼메트린은 고양이에게 금기입니다.'),
    input: {
      species: 'cat', weightKg: 3.8, breedId: 'domestic_shorthair', breedText: 'Korean Shorthair',
      ageYears: 2, sex: 'female', neutered: true, pregnant: false, lactating: false,
      conditions: [], labs: {}, allergies: [], mdr1Status: 'unknown',
      meds: [
        { drugId: 'permethrin', protocolId: null, dose: { value: 1, unit: 'pipette' }, route: 'spot-on', frequency: 'once', durationDays: null, strengthId: 'perm_spot' },
      ],
    },
    expect: {
      verdict: 'contraindicated',
      findings: [{ ruleId: 'SPECIES_HARDSTOP', severity: 'contraindicated', drugIds: ['permethrin'], factorKinds: ['species'] }],
      allowAlso: [],
      notesInclude: [],
      doses: [],
    },
  },
  {
    id: 'daebak',
    species: 'dog',
    name: T('Daebak', '대박'),
    title: T('Daebak — negative control', '대박 — 음성 대조'),
    signalment: T('Labrador Retriever · female spayed · 3 y · 30 kg', '래브라도 리트리버 · 중성화 암컷 · 3세 · 30 kg'),
    problems: T('Superficial skin infection; one episode of vomiting', '표재성 피부 감염, 구토 1회'),
    question: T('Routine antibiotic plus an antiemetic for a healthy young dog: anything to flag?', '건강한 어린 개에게 일반 항생제와 항구토제를 함께 줄 때 주의할 점이 있을까요?'),
    shouldCatch: T('Nothing: the engine must stay quiet (at most administration notes).', '없음: 엔진은 조용해야 합니다(투약 안내 정도만).'),
    input: {
      species: 'dog', weightKg: 30, breedId: 'labrador_retriever', breedText: 'Labrador',
      ageYears: 3, sex: 'female', neutered: true, pregnant: false, lactating: false,
      conditions: ['skin_infection', 'vomiting_diarrhoea'], labs: {}, allergies: [], mdr1Status: 'unknown',
      meds: [
        { drugId: 'amoxicillin_clavulanate', protocolId: 'ac_dog_eu', dose: { value: 12.5, unit: 'mg/kg' }, route: 'PO', frequency: 'q12h', durationDays: 7, strengthId: null },
        { drugId: 'maropitant', protocolId: 'maro_dog_vomit', dose: { value: 2, unit: 'mg/kg' }, route: 'PO', frequency: 'q24h', durationDays: 2, strengthId: null },
      ],
    },
    expect: {
      verdict: 'none',
      findings: [],
      allowAlso: [],
      notesInclude: [],
      doses: [{ drugId: 'amoxicillin_clavulanate', perDoseMg: 375, administrationEn: '1 × 375 mg tablet' }, { drugId: 'maropitant', perDoseMg: 60 }],
    },
  },
]

export const CASE_BY_ID = Object.fromEntries(CASES.map((c) => [c.id, c]))

/** Starting point for "build your own" (#/case/custom). */
export const BLANK_CASE_INPUT = {
  species: 'dog', weightKg: 10, breedId: null, breedText: '',
  ageYears: null, sex: null, neutered: null, pregnant: false, lactating: false,
  conditions: [], labs: {}, allergies: [], mdr1Status: 'unknown', meds: [],
}
