/**
 * Curated breeds with Korean aliases and ABCB1 (MDR1) risk.
 *
 * mdr1 categories (prototype convention, based on reported mutant-allele frequency):
 *   'high'         ≥ 40 %
 *   'moderate'     10–39 %
 *   'low'          reported, < 10 %
 *   'not_reported' not among the breeds with a reported mutation in the cited
 *                  series — this is NOT "normal"; the individual genotype is unknown.
 * Allele frequencies are from Gramer et al. 2010 (n = 7378 dogs, Germany) unless
 * noted; Mealey & Meurs 2008 (n = 5368, North America) adds the German Shepherd.
 *
 * Free text that does not resolve to a breed maps to "unknown", never to a breed.
 */

const fq = (pct) => ({
  en: `Mutant ABCB1 allele frequency about ${pct}% in a large genotyping series.`,
  ko: `대규모 유전자형 조사에서 변이 ABCB1 대립유전자 빈도 약 ${pct}%.`,
})

const NOT_REPORTED = {
  en: 'Not among the breeds with a reported ABCB1-1Δ mutation in the sources used here; the individual dog’s genotype is still unknown.',
  ko: '여기서 인용한 자료에서 ABCB1-1Δ 변이가 보고된 품종에 포함되지 않습니다. 개체의 유전자형은 여전히 알 수 없습니다.',
}

const CAT_NOTE = {
  en: 'The MDR1 rule in this prototype covers dogs only.',
  ko: '이 프로토타입의 MDR1 규칙은 개에만 적용됩니다.',
}

export const BREEDS = [
  // ── Dogs with a reported ABCB1-1Δ mutation ──────────────────────────────
  { id: 'collie', species: 'dog', en: 'Collie (Rough / Smooth)', enAliases: ['Rough Collie', 'Smooth Collie', 'Collie', 'Lassie'],
    ko: ['콜리', '러프 콜리', '러프콜리', '스무스 콜리', '라프 콜리'], mdr1: 'high', mdr1AlleleFreq: 0.59, mdr1Note: fq(59), source: 'gramer2010', brachycephalic: false },
  { id: 'longhaired_whippet', species: 'dog', en: 'Longhaired Whippet', enAliases: ['Long-haired Whippet'],
    ko: ['롱헤어 휘핏', '장모 휘핏'], mdr1: 'high', mdr1AlleleFreq: 0.45, mdr1Note: fq(45), source: 'gramer2010', brachycephalic: false },
  { id: 'shetland_sheepdog', species: 'dog', en: 'Shetland Sheepdog', enAliases: ['Sheltie'],
    ko: ['셰틀랜드 쉽독', '셔틀랜드 쉽독', '셸티', '쉘티', '셔틀랜드쉽독'], mdr1: 'moderate', mdr1AlleleFreq: 0.30, mdr1Note: fq(30), source: 'gramer2010', brachycephalic: false },
  { id: 'mini_australian_shepherd', species: 'dog', en: 'Miniature Australian Shepherd', enAliases: ['Mini Aussie', 'Miniature American Shepherd'],
    ko: ['미니어처 오스트레일리안 셰퍼드', '미니 오지', '미니어처 오스트레일리안 쉐퍼드'], mdr1: 'moderate', mdr1AlleleFreq: 0.24, mdr1Note: fq(24), source: 'gramer2010', brachycephalic: false },
  { id: 'australian_shepherd', species: 'dog', en: 'Australian Shepherd', enAliases: ['Aussie'],
    ko: ['오스트레일리안 셰퍼드', '오스트레일리안 쉐퍼드', '오지'], mdr1: 'moderate', mdr1AlleleFreq: 0.22, mdr1Note: fq(22), source: 'gramer2010', brachycephalic: false },
  { id: 'white_swiss_shepherd', species: 'dog', en: 'White Swiss Shepherd', enAliases: ['Berger Blanc Suisse'],
    ko: ['화이트 스위스 셰퍼드', '화이트 셰퍼드'], mdr1: 'moderate', mdr1AlleleFreq: 0.14, mdr1Note: fq(14), source: 'gramer2010', brachycephalic: false },
  { id: 'old_english_sheepdog', species: 'dog', en: 'Old English Sheepdog', enAliases: ['Bobtail'],
    ko: ['올드 잉글리시 쉽독', '올드잉글리쉬쉽독'], mdr1: 'low', mdr1AlleleFreq: 0.04, mdr1Note: fq(4), source: 'gramer2010', brachycephalic: false },
  { id: 'border_collie', species: 'dog', en: 'Border Collie', enAliases: [],
    ko: ['보더 콜리', '보더콜리'], mdr1: 'low', mdr1AlleleFreq: 0.01, mdr1Note: fq(1), source: 'gramer2010', brachycephalic: false },
  { id: 'german_shepherd', species: 'dog', en: 'German Shepherd Dog', enAliases: ['German Shepherd', 'GSD', 'Alsatian'],
    ko: ['저먼 셰퍼드', '저먼 쉐퍼드', '셰퍼드', '독일 셰퍼드'], mdr1: 'low', mdr1AlleleFreq: null,
    mdr1Note: { en: 'ABCB1-1Δ allele identified in this breed in a North American genotyping series (frequency not given here).',
      ko: '북미 유전자형 조사에서 이 품종의 ABCB1-1Δ 대립유전자가 확인되었습니다(빈도는 여기 표기하지 않음).' },
    source: 'mealeyMeurs2008', brachycephalic: false },
  { id: 'mixed_herding', species: 'dog', en: 'Herding-breed mix', enAliases: ['Collie mix', 'Shepherd mix'],
    ko: ['목양견 믹스', '콜리 믹스', '셰퍼드 믹스'], mdr1: 'low', mdr1AlleleFreq: 0.08, mdr1Note: fq(8), source: 'gramer2010', brachycephalic: false },
  { id: 'mixed_dog', species: 'dog', en: 'Mixed breed (dog)', enAliases: ['Mixed', 'Mongrel', 'Crossbreed'],
    ko: ['믹스견', '믹스', '잡종', '혼혈견', '시고르자브종'], mdr1: 'low', mdr1AlleleFreq: 0.02, mdr1Note: fq(2), source: 'gramer2010', brachycephalic: false },

  // ── Dogs common in Korea (mutation not reported in the cited series) ────
  { id: 'maltese', species: 'dog', en: 'Maltese', enAliases: [], ko: ['말티즈', '몰티즈'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'poodle', species: 'dog', en: 'Poodle (Toy / Miniature)', enAliases: ['Toy Poodle', 'Miniature Poodle', 'Poodle'], ko: ['푸들', '토이푸들', '토이 푸들', '미니어처 푸들'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'pomeranian', species: 'dog', en: 'Pomeranian', enAliases: [], ko: ['포메라니안', '포메'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'bichon_frise', species: 'dog', en: 'Bichon Frise', enAliases: ['Bichon'], ko: ['비숑 프리제', '비숑', '비숑프리제'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'shih_tzu', species: 'dog', en: 'Shih Tzu', enAliases: [], ko: ['시츄', '시추', '시쭈'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: true },
  { id: 'jindo', species: 'dog', en: 'Korean Jindo', enAliases: ['Jindo'], ko: ['진돗개', '진도견', '진도개'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'welsh_corgi', species: 'dog', en: 'Welsh Corgi (Pembroke)', enAliases: ['Corgi', 'Pembroke Welsh Corgi'], ko: ['웰시코기', '웰시 코기', '코기'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'golden_retriever', species: 'dog', en: 'Golden Retriever', enAliases: [], ko: ['골든 리트리버', '골든리트리버', '골든'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'labrador_retriever', species: 'dog', en: 'Labrador Retriever', enAliases: ['Labrador', 'Lab'], ko: ['래브라도 리트리버', '래브라도', '라브라도', '래브라도리트리버'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'chihuahua', species: 'dog', en: 'Chihuahua', enAliases: [], ko: ['치와와'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'yorkshire_terrier', species: 'dog', en: 'Yorkshire Terrier', enAliases: ['Yorkie'], ko: ['요크셔 테리어', '요크셔테리어', '요키'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'dachshund', species: 'dog', en: 'Dachshund', enAliases: [], ko: ['닥스훈트'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'french_bulldog', species: 'dog', en: 'French Bulldog', enAliases: ['Frenchie'], ko: ['프렌치 불독', '프렌치불독', '프렌치 불도그'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: true },
  { id: 'pug', species: 'dog', en: 'Pug', enAliases: [], ko: ['퍼그'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: true },
  { id: 'beagle', species: 'dog', en: 'Beagle', enAliases: [], ko: ['비글'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'miniature_schnauzer', species: 'dog', en: 'Miniature Schnauzer', enAliases: ['Schnauzer'], ko: ['미니어처 슈나우저', '슈나우저'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'cocker_spaniel', species: 'dog', en: 'Cocker Spaniel', enAliases: ['English Cocker Spaniel', 'American Cocker Spaniel'], ko: ['코카 스파니엘', '코카스파니엘', '코커 스패니얼'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'shiba', species: 'dog', en: 'Shiba Inu', enAliases: ['Shiba'], ko: ['시바견', '시바 이누', '시바'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'samoyed', species: 'dog', en: 'Samoyed', enAliases: [], ko: ['사모예드'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },
  { id: 'siberian_husky', species: 'dog', en: 'Siberian Husky', enAliases: ['Husky'], ko: ['시베리안 허스키', '허스키'], mdr1: 'not_reported', mdr1Note: NOT_REPORTED, source: null, brachycephalic: false },

  // ── Cats ────────────────────────────────────────────────────────────────
  { id: 'domestic_shorthair', species: 'cat', en: 'Domestic Shorthair (Korean Shorthair)', enAliases: ['Domestic Shorthair', 'DSH', 'Korean Shorthair', 'Moggy'],
    ko: ['코리안숏헤어', '코리안 숏헤어', '코숏', '도메스틱 숏헤어', '집고양이', '단모 믹스묘'], mdr1: 'not_reported', mdr1Note: CAT_NOTE, source: null, brachycephalic: false },
  { id: 'persian', species: 'cat', en: 'Persian', enAliases: [], ko: ['페르시안', '페르시안 고양이'], mdr1: 'not_reported', mdr1Note: CAT_NOTE, source: null, brachycephalic: true },
  { id: 'russian_blue', species: 'cat', en: 'Russian Blue', enAliases: [], ko: ['러시안블루', '러시안 블루'], mdr1: 'not_reported', mdr1Note: CAT_NOTE, source: null, brachycephalic: false },
  { id: 'scottish_fold', species: 'cat', en: 'Scottish Fold', enAliases: [], ko: ['스코티시폴드', '스코티시 폴드', '스코티쉬폴드'], mdr1: 'not_reported', mdr1Note: CAT_NOTE, source: null, brachycephalic: false },
  { id: 'british_shorthair', species: 'cat', en: 'British Shorthair', enAliases: [], ko: ['브리티시 숏헤어', '브리티쉬숏헤어', '브숏'], mdr1: 'not_reported', mdr1Note: CAT_NOTE, source: null, brachycephalic: false },
  { id: 'siamese', species: 'cat', en: 'Siamese', enAliases: [], ko: ['샴', '샴고양이', '시암'], mdr1: 'not_reported', mdr1Note: CAT_NOTE, source: null, brachycephalic: false },
  { id: 'ragdoll', species: 'cat', en: 'Ragdoll', enAliases: [], ko: ['랙돌', '래그돌'], mdr1: 'not_reported', mdr1Note: CAT_NOTE, source: null, brachycephalic: false },
  { id: 'bengal', species: 'cat', en: 'Bengal', enAliases: [], ko: ['벵갈', '뱅갈'], mdr1: 'not_reported', mdr1Note: CAT_NOTE, source: null, brachycephalic: false },
  { id: 'norwegian_forest', species: 'cat', en: 'Norwegian Forest Cat', enAliases: [], ko: ['노르웨이숲', '노르웨이 숲 고양이', '노숲'], mdr1: 'not_reported', mdr1Note: CAT_NOTE, source: null, brachycephalic: false },
  { id: 'munchkin', species: 'cat', en: 'Munchkin', enAliases: [], ko: ['먼치킨'], mdr1: 'not_reported', mdr1Note: CAT_NOTE, source: null, brachycephalic: false },
  { id: 'maine_coon', species: 'cat', en: 'Maine Coon', enAliases: [], ko: ['메인쿤', '메인 쿤'], mdr1: 'not_reported', mdr1Note: CAT_NOTE, source: null, brachycephalic: false },
  { id: 'turkish_angora', species: 'cat', en: 'Turkish Angora', enAliases: ['Angora'], ko: ['터키시 앙고라', '터키쉬앙고라', '앙고라'], mdr1: 'not_reported', mdr1Note: CAT_NOTE, source: null, brachycephalic: false },
]

export const BREED_BY_ID = Object.fromEntries(BREEDS.map((b) => [b.id, b]))

/** Breeds the MDR1 rule treats as at-risk (high or moderate reported frequency). */
export function isMdr1RiskBreed(breed) {
  return Boolean(breed && breed.species === 'dog' && (breed.mdr1 === 'high' || breed.mdr1 === 'moderate'))
}

export const MDR1_RISK_LABELS = {
  high: { en: 'MDR1 risk: high', ko: 'MDR1 위험: 높음' },
  moderate: { en: 'MDR1 risk: moderate', ko: 'MDR1 위험: 중간' },
  low: { en: 'MDR1: reported (low)', ko: 'MDR1: 보고됨(낮음)' },
  not_reported: { en: 'MDR1: not reported, genotype unknown', ko: 'MDR1: 보고 없음, 유전자형 미확인' },
  unknown: { en: 'MDR1: breed unknown', ko: 'MDR1: 품종 미확인' },
}
