/**
 * Bilingual, jamo-aware search over the formulary and the breed list.
 *
 * Korean handling (logic ported from the original backend fuzzy search):
 *  - Hangul syllables are decomposed into jamo, so a one-letter vowel typo
 *    (이버맥틴 for 이버멕틴) still shares most jamo trigrams;
 *  - initial-consonant queries (ㅇㅂㅁㅌ) match 이버멕틴;
 *  - Latin text uses trigram (Jaccard) similarity for typos.
 * Pure functions; no I/O.
 */

import { DRUGS } from '../knowledge/drugs.js'
import { BREEDS } from '../knowledge/breeds.js'

const HANGUL_BASE = 0xac00
const HANGUL_END = 0xd7a3
const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const MEDIALS = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const FINALS = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'

/** '엔로' → 'ㅇㅔㄴㄹㅗ'. Non-Hangul characters are kept. */
export function decomposeHangul(text) {
  let out = ''
  for (const ch of String(text || '')) {
    const code = ch.codePointAt(0)
    if (code >= HANGUL_BASE && code <= HANGUL_END) {
      const off = code - HANGUL_BASE
      const i = Math.floor(off / (21 * 28))
      const m = Math.floor((off % (21 * 28)) / 28)
      const f = off % 28
      out += INITIALS[i] + MEDIALS[m] + (f > 0 ? FINALS[f] : '')
    } else {
      out += ch
    }
  }
  return out
}

/** '엔로플록사신' → 'ㅇㄹㅍㄹㅅㅅ'. Bare initial-consonant jamo are kept. */
export function extractInitials(text) {
  let out = ''
  for (const ch of String(text || '')) {
    const code = ch.codePointAt(0)
    if (code >= HANGUL_BASE && code <= HANGUL_END) {
      out += INITIALS[Math.floor((code - HANGUL_BASE) / (21 * 28))]
    } else if (code >= 0x3131 && code <= 0x314e) {
      out += ch
    }
  }
  return out
}

export function isJamoOnly(text) {
  const s = String(text || '').replace(/\s/g, '')
  if (!s) return false
  for (const ch of s) {
    const code = ch.codePointAt(0)
    if (!(code >= 0x3131 && code <= 0x3163)) return false
  }
  return true
}

export function isKorean(text) {
  for (const ch of String(text || '')) {
    const code = ch.codePointAt(0)
    if ((code >= HANGUL_BASE && code <= HANGUL_END) || (code >= 0x3131 && code <= 0x3163)) return true
  }
  return false
}

export function trigrams(s) {
  const t = String(s || '')
  if (t.length < 3) return new Set(t ? [t] : [])
  const out = new Set()
  for (let i = 0; i <= t.length - 3; i++) out.add(t.slice(i, i + 3))
  return out
}

/** Jaccard similarity of trigram sets, 0..1. */
export function trigramSimilarity(a, b) {
  const ta = trigrams(String(a || '').toLowerCase())
  const tb = trigrams(String(b || '').toLowerCase())
  if (!ta.size || !tb.size) return 0
  let inter = 0
  for (const x of ta) if (tb.has(x)) inter++
  return inter / (ta.size + tb.size - inter)
}

/** Lower-case, NFC, strip spaces, hyphens, dashes, dots and brackets. */
export function normalizeText(s) {
  return String(s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\s\-–—_.,()/·]/g, '')
}

/**
 * Score one candidate string against a query. Returns 0..100.
 *   100 exact, 90 prefix, 80 substring,
 *   65 jamo containment (partial syllable typed), 60 initial consonants,
 *   20–50 trigram similarity (typos).
 */
export function scoreString(query, candidate) {
  const q = normalizeText(query)
  const c = normalizeText(candidate)
  if (!q || !c) return 0
  if (q === c) return 100
  if (c.startsWith(q)) return 90
  if (c.includes(q)) return 80
  if (isKorean(q)) {
    const qj = decomposeHangul(q)
    const cj = decomposeHangul(c)
    if (isJamoOnly(q)) {
      const ci = extractInitials(c)
      if (ci.startsWith(q)) return 62
      if (ci.includes(q)) return 60
      if (cj.includes(qj)) return 55
      return 0
    }
    if (cj.startsWith(qj)) return 70
    if (cj.includes(qj)) return 65
    const sim = trigramSimilarity(qj, cj)
    return sim > 0.25 ? Math.round(20 + sim * 30) : 0
  }
  const sim = trigramSimilarity(q, c)
  return sim > 0.25 ? Math.round(20 + sim * 30) : 0
}

function bestMatch(query, fields) {
  let best = { score: 0, field: null, text: null }
  for (const { field, text, weight = 1 } of fields) {
    if (!text) continue
    const s = scoreString(query, text) * weight
    if (s > best.score) best = { score: s, field, text }
  }
  return best
}

/**
 * Search the formulary. Returns [{ drugId, drug, score, matched:{field,text} }]
 * sorted by score. field ∈ 'name_en' | 'name_ko' | 'alias' | 'class'.
 */
export function searchDrugs(query, { species = null, limit = 8, minScore = 30 } = {}) {
  if (!query || !String(query).trim()) return []
  const out = []
  for (const drug of DRUGS) {
    const fields = [
      { field: 'name_en', text: drug.name.en },
      { field: 'name_en', text: drug.id.replace(/_/g, ' ') },
      { field: 'name_ko', text: drug.name.ko },
      ...drug.aliases.map((a) => ({ field: 'alias', text: a, weight: 0.97 })),
      { field: 'class', text: drug.class.en, weight: 0.6 },
      { field: 'class', text: drug.class.ko, weight: 0.6 },
    ]
    const m = bestMatch(query, fields)
    if (m.score >= minScore) {
      // A drug not used in this species is still found, but ranked lower.
      const speciesPenalty = species && !drug.species.includes(species) ? 0.85 : 1
      out.push({ drugId: drug.id, drug, score: Math.round(m.score * speciesPenalty), matched: { field: m.field, text: m.text } })
    }
  }
  return out.sort((a, b) => b.score - a.score || a.drug.name.en.localeCompare(b.drug.name.en)).slice(0, limit)
}

/** Search breeds (EN name, EN aliases, KO aliases). */
export function searchBreeds(query, { species = null, limit = 8, minScore = 30 } = {}) {
  if (!query || !String(query).trim()) return []
  const out = []
  for (const breed of BREEDS) {
    if (species && breed.species !== species) continue
    const fields = [
      { field: 'name_en', text: breed.en },
      ...(breed.enAliases || []).map((a) => ({ field: 'alias_en', text: a })),
      ...breed.ko.map((a) => ({ field: 'name_ko', text: a })),
    ]
    const m = bestMatch(query, fields)
    if (m.score >= minScore) out.push({ breedId: breed.id, breed, score: m.score, matched: { field: m.field, text: m.text } })
  }
  return out.sort((a, b) => b.score - a.score || a.breed.en.localeCompare(b.breed.en)).slice(0, limit)
}

/**
 * Resolve free text to a breed id, or null ("unknown"). Only confident matches
 * (exact, prefix or substring — score ≥ 80) resolve; anything else stays unknown,
 * so a typo can never silently map to a breed and make a patient look safe.
 */
export function resolveBreed(text, species = null) {
  const hits = searchBreeds(text, { species, limit: 2, minScore: 80 })
  if (!hits.length) return null
  if (hits.length > 1 && hits[0].score === hits[1].score && hits[0].score < 100) return null
  return hits[0].breedId
}
