/** Shared helpers for rule modules (bilingual text, Korean particles, factors). */

import { fmtNum } from '../units.js'

export const T = (en, ko) => ({ en, ko })

/** Short display names without parenthetical qualifiers. */
export function enName(drug) {
  return String(drug?.name?.en || drug?.id || '').replace(/\s*\(.*?\)\s*/g, ' ').trim()
}
export function koName(drug) {
  return String(drug?.name?.ko || drug?.id || '').replace(/\s*\(.*?\)\s*/g, ' ').trim()
}
export function lc(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

/** Does the last Hangul syllable of `word` have a final consonant (받침)? */
export function hasBatchim(word) {
  const s = String(word || '').replace(/\s*\(.*?\)\s*$/g, '').trim()
  for (let i = s.length - 1; i >= 0; i--) {
    const code = s.charCodeAt(i)
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
    if (/[0-9]/.test(s[i])) return '0136781'.includes(s[i]) // 영,일,삼,육,칠,팔 end in a consonant
    if (/[a-z]/i.test(s[i])) return /[lmn]/i.test(s[i])
  }
  return false
}

/** Has the last syllable's final consonant ㄹ? (for 으로/로) */
function endsWithRieul(word) {
  const s = String(word || '').trim()
  const code = s.charCodeAt(s.length - 1)
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8
}

/** josa('케토코나졸', '이/가') → '케토코나졸이'. Supports 이/가, 은/는, 을/를, 과/와, 으로/로. */
export function josa(word, pair) {
  const [withB, withoutB] = pair.split('/')
  if (pair === '으로/로') return word + (hasBatchim(word) && !endsWithRieul(word) ? '으로' : '로')
  return word + (hasBatchim(word) ? withB : withoutB)
}

export function joinEn(list) {
  if (list.length <= 1) return list.join('')
  if (list.length === 2) return `${list[0]} and ${list[1]}`
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}
export function joinKo(list) {
  return list.join(', ')
}

export function drugFactor(drug, roleEn, roleKo) {
  return { kind: 'drug', id: drug.id, label: T(`${enName(drug)} — ${roleEn}`, `${koName(drug)} — ${roleKo}`) }
}

export function doseFactor(id, valueText) {
  return { kind: 'dose', id, label: T(valueText.en, valueText.ko) }
}

export function fmt(x) {
  return fmtNum(x)
}

export function uniqueBy(list, keyFn) {
  const seen = new Set()
  const out = []
  for (const x of list) {
    const k = keyFn(x)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(x)
  }
  return out
}

export function pairKey(a, b) {
  return [a, b].sort().join('|')
}

/** Organ columns where this drug carries level ≥ minLevel for the species. */
export function riskOrgans(drug, species, minLevel = 2) {
  const out = []
  for (const [organ, entry] of Object.entries(drug?.organRisk || {})) {
    const e = pickOrganEntry(entry, species)
    if (e && typeof e.level === 'number' && e.level >= minLevel) out.push(organ)
  }
  return out
}

/** organRisk[organ] may be one entry or an array with species filters. */
export function pickOrganEntry(entry, species) {
  if (!entry) return null
  const list = Array.isArray(entry) ? entry : [entry]
  return list.find((e) => !e.species || e.species.includes(species)) || null
}

export const SPECIES_TEXT = { dog: T('dog', '개'), cat: T('cat', '고양이') }

/**
 * Substrates where a change in exposure matters clinically for the CYP rules:
 * narrow-therapeutic-index drugs and non-steroid immunosuppressants
 * (ciclosporin). Corticosteroids are titrated to effect, so a CYP change in
 * prednisolone exposure is graded minor (spec §5: "minor otherwise, e.g. prednisolone").
 */
export function isCriticalSubstrate(drug) {
  return Boolean(drug?.flags?.narrowTherapeuticIndex || (drug?.flags?.immunosuppressant && !drug?.flags?.corticosteroid))
}
