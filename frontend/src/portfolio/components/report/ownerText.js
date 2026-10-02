/**
 * Owner-facing wording for the handout. Plain language, both languages
 * authored here (no runtime translation), no doses and no numbers beyond what
 * the engine computed.
 *
 * - OWNER_FOOD restates, for owners, the administration notes in drugs.js and
 *   cites the same source.
 * - OWNER_CONDITIONS is general owner-education wording for the "about this
 *   condition" block. It makes no drug claims. Like the case copy, it needs a
 *   veterinarian's review before public launch.
 *
 * Never write "safe to use together" (or any equivalent) here or anywhere in
 * the handout: the absence of a finding is not evidence of safety.
 */

const T = (en, ko) => ({ en, ko })

/** kind: 'with' | 'consistent' | 'separate' | 'timing' */
export const OWNER_FOOD = {
  ketoconazole: { kind: 'with', text: T('Give with a meal.', '식사와 함께 먹이십시오.'), source: 'marks2018' },
  ciclosporin: {
    kind: 'consistent',
    text: T('Give at the same time every day and keep the same gap from meals every day — for example 2 hours before or 2 hours after a meal.',
      '매일 같은 시간에 먹이고, 식사와의 간격도 매일 같게 유지하십시오. 예: 식사 2시간 전 또는 식사 2시간 후.'),
    source: 'archer2014',
  },
  enrofloxacin: {
    kind: 'separate',
    text: T('Give it 2 hours before any antacid or mineral supplement (magnesium, aluminium, calcium or iron), not at the same time.',
      '제산제나 미네랄 보충제(마그네슘·알루미늄·칼슘·철)와 동시에 먹이지 말고, 이 약을 2시간 먼저 먹이십시오.'),
    source: 'marks2018',
  },
  gabapentin: {
    kind: 'timing',
    text: T('If it is for a clinic visit, give it about 90 minutes before putting your pet in the carrier.',
      '병원 방문용이라면 이동장에 넣기 약 90분 전에 먹이십시오.'),
    source: 'vanhaaften2017',
  },
}

export const FOOD_UNKNOWN = T('No food instruction — ask us if unsure.', '식사 관련 지시 없음 — 궁금하면 문의하십시오.')

export const ROUTE_TEXT = {
  PO: T('By mouth', '입으로 먹입니다'),
  topical: T('On the skin', '피부에 바릅니다'),
  'spot-on': T('On the skin (spot-on)', '피부에 바릅니다(스팟온)'),
  SC: T('Injection under the skin', '피하 주사'),
  IM: T('Given in the clinic (injection)', '병원에서 주사로 투여'),
  IV: T('Given in the clinic (intravenous)', '병원에서 정맥으로 투여'),
}

export const FREQ_OWNER = {
  once: T('Once only', '한 번만'),
  q4h: T('Every 4 hours', '4시간마다'),
  q6h: T('4 times a day, about 6 hours apart', '하루 4번, 약 6시간 간격'),
  q8h: T('3 times a day, about 8 hours apart', '하루 3번, 약 8시간 간격'),
  q12h: T('Twice a day, about 12 hours apart (morning and evening)', '하루 2번, 약 12시간 간격(아침·저녁)'),
  q24h: T('Once a day, at about the same time each day', '하루 1번, 매일 비슷한 시간에'),
  q48h: T('Every other day', '이틀에 한 번'),
  q72h: T('Every 3 days', '3일에 한 번'),
  weekly: T('Once a week', '일주일에 한 번'),
  q14d: T('Once every 2 weeks', '2주에 한 번'),
  monthly: T('Once a month', '한 달에 한 번'),
  cri: T('Given in the clinic as a drip', '병원에서 수액으로 투여'),
  prn: T('Only when needed, as we discussed', '안내받은 대로 필요할 때만'),
}

export const FREQ_UNKNOWN = T('As your vet tells you', '수의사의 안내에 따라')

/** Row labels for the tick grid. */
export const SLOT_LABEL = {
  daily: T('Dose', '투여'),
  am: T('AM', '오전'),
  pm: T('PM', '오후'),
  n1: T('1st', '1회차'),
  n2: T('2nd', '2회차'),
  n3: T('3rd', '3회차'),
  n4: T('4th', '4회차'),
  n5: T('5th', '5회차'),
  n6: T('6th', '6회차'),
}

/**
 * "About this condition" blocks, keyed by conditions.js id. watch: what an
 * owner can notice; tip: one practical instruction. General wording only.
 */
export const OWNER_CONDITIONS = {
  ckd: {
    title: T('Kidney disease', '신장병'),
    watch: [
      T('Drinking or urinating more than usual', '평소보다 물을 많이 마시거나 소변량이 늘어남'),
      T('Eating less, or weight loss', '식욕 감소 또는 체중 감소'),
      T('Vomiting', '구토'),
    ],
    tip: T('Keep fresh water available at all times.', '항상 깨끗한 물을 마실 수 있게 해 주십시오.'),
  },
  hyperthyroidism: {
    title: T('Overactive thyroid', '갑상선기능항진증'),
    watch: [
      T('Weight loss despite a good appetite', '잘 먹는데도 체중이 줄어듦'),
      T('Restlessness, or vomiting', '안절부절못함 또는 구토'),
    ],
    tip: T('Blood tests are needed to adjust the dose — keep the recheck appointments.', '용량 조절에는 혈액검사가 필요합니다. 재검 일정을 지켜 주십시오.'),
  },
  epilepsy: {
    title: T('Seizures', '발작(뇌전증)'),
    watch: [
      T('Seizures returning, or happening closer together', '발작이 다시 생기거나 간격이 짧아짐'),
    ],
    tip: T('Keep a seizure diary: date, time and length of each seizure. A seizure that does not stop within a few minutes, or seizures one after another, is an emergency.',
      '발작 일지를 써 주십시오: 날짜, 시간, 지속 시간. 몇 분 안에 멈추지 않는 발작이나 연달아 일어나는 발작은 응급 상황입니다.'),
  },
  atopic_dermatitis: {
    title: T('Skin allergy (atopic dermatitis)', '아토피 피부염'),
    watch: [T('Itching, licking the paws or scratching the ears getting worse', '가려움, 발 핥기, 귀 긁기가 심해짐')],
    tip: T('Note when the itching is worse; it helps us adjust treatment.', '가려움이 심해지는 시기를 기록해 두시면 치료 조절에 도움이 됩니다.'),
  },
  demodicosis: {
    title: T('Demodex mites (demodicosis)', '모낭충증'),
    watch: [T('New hair loss, redness or skin infection', '새로운 탈모, 붉어짐 또는 피부 감염')],
    tip: T('Treatment is long. Do not stop until we confirm the mites are gone.', '치료 기간이 깁니다. 모낭충이 없어진 것을 확인할 때까지 중단하지 마십시오.'),
  },
  malassezia_otitis: {
    title: T('Yeast ear or skin infection', '말라세지아(효모균) 외이염·피부염'),
    watch: [T('Head shaking, scratching the ears, or a smell from the ears', '머리 흔들기, 귀 긁기 또는 귀에서 냄새')],
  },
  mmvd_chf: {
    title: T('Heart disease', '심장병'),
    watch: [
      T('Breathing faster while asleep, or coughing more', '잘 때 숨이 빨라지거나 기침이 늘어남'),
      T('Fainting, or tiring quickly', '실신 또는 쉽게 지침'),
    ],
    tip: T('Count breaths for one minute while your pet is asleep, and tell us if the number goes up.', '반려동물이 잘 때 1분 동안 호흡 수를 세어 보고, 늘어나면 알려 주십시오.'),
  },
  hypertension: {
    title: T('High blood pressure', '고혈압'),
    watch: [T('Sudden vision loss, dilated pupils or wobbliness', '갑작스러운 시력 저하, 동공 확대 또는 비틀거림')],
    tip: T('Blood pressure rechecks are needed to adjust treatment.', '치료 조절을 위해 혈압 재측정이 필요합니다.'),
  },
  hepatopathy: {
    title: T('Liver disease', '간 질환'),
    watch: [
      T('Yellow gums, skin or eyes', '잇몸·피부·눈이 노랗게 변함'),
      T('Vomiting, not eating, or confusion', '구토, 식욕 부진 또는 이상 행동'),
    ],
  },
  osteoarthritis: {
    title: T('Arthritis', '관절염'),
    watch: [T('Stiffness, limping or not wanting to jump or climb stairs', '뻣뻣함, 절뚝거림, 점프나 계단 오르기를 꺼림')],
  },
  vomiting_diarrhoea: {
    title: T('Vomiting or diarrhoea', '구토·설사'),
    watch: [
      T('Vomiting again and again, or not keeping water down', '반복되는 구토 또는 물도 토함'),
      T('Blood in vomit or stool, or very tired', '구토물이나 변에 피, 또는 심한 무기력'),
    ],
  },
  uti: {
    title: T('Urinary infection', '요로감염'),
    watch: [T('Straining, blood in the urine, or urinating often', '배뇨 시 힘을 줌, 혈뇨 또는 잦은 배뇨')],
    tip: T('Finish the whole course, even if the signs settle sooner.', '증상이 일찍 좋아져도 처방된 기간을 끝까지 지켜 주십시오.'),
  },
  skin_infection: {
    title: T('Skin infection', '피부 감염'),
    watch: [T('Spreading redness, pus or new sores', '번지는 붉은 기, 고름 또는 새 상처')],
    tip: T('Finish the whole course, even if the skin looks better sooner.', '피부가 일찍 좋아져도 처방된 기간을 끝까지 지켜 주십시오.'),
  },
  coagulopathy: {
    title: T('Bleeding disorder', '출혈 경향(응고장애)'),
    watch: [T('Bruising, nosebleeds, or blood in urine or stool', '멍, 코피, 소변이나 변에 피')],
  },
  gi_ulcer_history: {
    title: T('Past stomach or gut ulcer', '과거 위장관 궤양'),
    watch: [T('Black, tarry stools or vomiting blood', '검은 타르 같은 변 또는 피를 토함')],
  },
  dehydration: {
    title: T('Dehydration', '탈수'),
    watch: [T('Not drinking, dry or sticky gums, or very tired', '물을 마시지 않음, 잇몸이 마르거나 끈적임, 심한 무기력')],
  },
}

/** Always present at the end of the emergency block, findings or not. */
export const EMERGENCY_GENERIC = T('Collapse, a seizure, trouble breathing — or anything else about your pet that worries you.',
  '쓰러짐, 발작, 호흡 곤란 — 그 밖에 걱정되는 어떤 변화든.')
