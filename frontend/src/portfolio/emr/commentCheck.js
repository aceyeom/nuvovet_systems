/**
 * Free-text override comment check (EMR popup spec §3.9).
 *
 * Jang et al. 2016 found 72.2 % of overrides were free text and 21.1 % of that
 * was meaningless ("ㅋㅋㅋ", "aaa"). A comment is rejected when any rule holds
 * (spaces are ignored in rules 1, 2 and 4, so "a a a a a a a a b" is rule 2 only,
 * as in the §3.9 table):
 *   1. fewer than 8 non-space characters;
 *   2. more than 50 % of the non-space characters are one repeated character;
 *   3. only Hangul compatibility jamo (U+3131–U+318E), spaces and punctuation;
 *   4. no run of at least 2 Hangul syllables or 2 Latin letters
 *      (not reported when rule 3 already explains a jamo-only comment).
 */

export const MIN_COMMENT_CHARS = 8

export const COMMENT_MESSAGE = {
  ko: '구체적인 사유를 8자 이상 입력하십시오 (예: 감량 병용, 2주 후 혈중농도 측정).',
  en: 'Enter a specific reason of at least 8 characters (e.g. reduced dose, recheck levels in 2 weeks).',
}

const JAMO_ONLY = /^[ㄱ-ㆎ\s\p{P}\p{S}]+$/u
const HAS_WORD = /[가-힣]{2}|[A-Za-z]{2}/

/** checkComment(text) → { ok, rules: number[], message: { ko, en } | null } */
export function checkComment(text) {
  const s = String(text ?? '')
  const chars = [...s.replace(/\s+/g, '')]
  const rules = []
  if (chars.length < MIN_COMMENT_CHARS) rules.push(1)
  if (chars.length) {
    const counts = new Map()
    for (const c of chars) counts.set(c, (counts.get(c) || 0) + 1)
    if (Math.max(...counts.values()) / chars.length > 0.5) rules.push(2)
  }
  const jamoOnly = s.trim() !== '' && JAMO_ONLY.test(s) && /[ㄱ-ㆎ]/.test(s)
  if (jamoOnly) rules.push(3)
  if (!jamoOnly && !HAS_WORD.test(chars.join(''))) rules.push(4)
  const ok = rules.length === 0
  return { ok, rules, message: ok ? null : COMMENT_MESSAGE }
}
