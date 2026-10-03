/**
 * Korean particle helper (DESIGN_SYSTEM.md §6.3).
 *   withParticle('나비', '으로/로')  → "나비로"
 *   withParticle('초코', '은/는')    → "초코는"
 *   withParticle('서울', '으로/로')  → "서울로"   (final ㄹ takes 로)
 *   withParticle('SYN-3', '이/가')   → "SYN-3이"  (3 is read 삼)
 * The first form of each pair follows a final consonant (batchim). Words ending in something whose
 * reading is unknown get the combined form, e.g. "(으)로".
 */

export const PAIRS = {
  '은/는': ['은', '는', '은(는)'],
  '이/가': ['이', '가', '이(가)'],
  '을/를': ['을', '를', '을(를)'],
  '과/와': ['과', '와', '과(와)'],
  '으로/로': ['으로', '로', '(으)로'],
}

const RIEUL = 8 // jongseong index of ㄹ

// Final consonant of the Korean reading of each digit / Latin letter: 0 = none, 8 = ㄹ, other = some batchim.
const DIGIT = { 0: 21, 1: RIEUL, 2: 0, 3: 16, 4: 0, 5: 0, 6: 1, 7: RIEUL, 8: RIEUL, 9: 0 } // 영 일 이 삼 사 오 육 칠 팔 구
const TENS = [null, 17, 1, 4, 4] // 십(ㅂ) 백(ㄱ) 천(ㄴ) 만(ㄴ)
const LETTER = { l: RIEUL, r: RIEUL, m: 16, n: 4 } // 엘 알 엠 엔; every other letter name ends in a vowel (에이, 비, 씨, …)

/** Jongseong index of the word's reading (0 = none), or null when unknown. */
export function finalConsonant(word) {
  const s = String(word ?? '').replace(/[\s)\]}'"”’.,!?·…]+$/u, '')
  if (!s) return null
  const ch = s[s.length - 1]
  const code = ch.codePointAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28
  if (/\d/.test(ch)) {
    const digits = s.match(/\d+$/)[0]
    const zeros = digits.match(/0*$/)[0].length
    if (zeros > 0 && zeros < digits.length) return TENS[Math.min(zeros, 4)]
    return DIGIT[ch]
  }
  if (/[a-z]/i.test(ch)) return LETTER[ch.toLowerCase()] ?? 0
  return null
}

/** Return word + the right particle of `pair`. */
export function withParticle(word, pair) {
  const forms = PAIRS[pair]
  if (!forms) throw new Error(`withParticle: unknown pair "${pair}"`)
  const jong = finalConsonant(word)
  let p
  if (jong === null) p = forms[2]
  else if (pair === '으로/로') p = jong === 0 || jong === RIEUL ? forms[1] : forms[0]
  else p = jong === 0 ? forms[1] : forms[0]
  return `${word}${p}`
}

/** Just the particle. */
export function particle(word, pair) {
  return withParticle(word, pair).slice(String(word).length)
}
