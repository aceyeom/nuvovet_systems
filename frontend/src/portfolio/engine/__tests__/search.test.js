import { describe, it, expect } from 'vitest'
import {
  decomposeHangul, extractInitials, isJamoOnly, isKorean, trigramSimilarity, normalizeText,
  scoreString, searchDrugs, searchBreeds, resolveBreed,
} from '../search.js'
import { DRUGS } from '../../knowledge/drugs.js'

describe('Hangul helpers', () => {
  it('decomposes syllables into jamo', () => {
    expect(decomposeHangul('엔로')).toBe('ㅇㅔㄴㄹㅗ')
    expect(decomposeHangul('이버멕틴')).toBe('ㅇㅣㅂㅓㅁㅔㄱㅌㅣㄴ')
    expect(decomposeHangul('abc')).toBe('abc')
  })
  it('extracts initial consonants', () => {
    expect(extractInitials('엔로플록사신')).toBe('ㅇㄹㅍㄹㅅㅅ')
    expect(extractInitials('이버멕틴')).toBe('ㅇㅂㅁㅌ')
  })
  it('detects jamo-only and Korean text', () => {
    expect(isJamoOnly('ㅇㅂㅁㅌ')).toBe(true)
    expect(isJamoOnly('이버')).toBe(false)
    expect(isKorean('하트가드')).toBe(true)
    expect(isKorean('Heartgard')).toBe(false)
  })
  it('scores trigram similarity', () => {
    expect(trigramSimilarity('ketoconazole', 'ketoconazole')).toBe(1)
    expect(trigramSimilarity('ketoconazol', 'ketoconazole')).toBeGreaterThan(0.7)
    expect(trigramSimilarity('abc', 'xyz')).toBe(0)
  })
  it('normalises spacing, case and punctuation', () => {
    expect(normalizeText(' Amoxicillin–Clavulanate ')).toBe('amoxicillinclavulanate')
    expect(normalizeText('코리안 숏헤어')).toBe('코리안숏헤어')
  })
  it('ranks exact > prefix > substring > jamo > initials > trigram', () => {
    expect(scoreString('이버멕틴', '이버멕틴')).toBe(100)
    expect(scoreString('이버', '이버멕틴')).toBe(90)
    expect(scoreString('멕틴', '이버멕틴')).toBe(80)
    expect(scoreString('ㅇㅂㅁㅌ', '이버멕틴')).toBe(62)
    expect(scoreString('이버맥틴', '이버멕틴')).toBeGreaterThan(20)
    expect(scoreString('이버맥틴', '이버멕틴')).toBeLessThan(55)
  })
})

describe('drug search', () => {
  it('finds a drug by its Korean name', () => {
    const r = searchDrugs('이버멕틴')
    expect(r[0].drugId).toBe('ivermectin')
    expect(r[0].matched.field).toBe('name_ko')
  })
  it('finds the ingredient behind a brand alias and says which alias matched', () => {
    const r = searchDrugs('하트가드')
    expect(r[0].drugId).toBe('ivermectin')
    expect(r[0].matched).toEqual({ field: 'alias', text: '하트가드' })
    expect(searchDrugs('Atopica')[0].drugId).toBe('ciclosporin')
    expect(searchDrugs('타이레놀')[0].drugId).toBe('acetaminophen')
    expect(searchDrugs('clavamox')[0].drugId).toBe('amoxicillin_clavulanate')
  })
  it('tolerates a Korean vowel typo through jamo trigrams (이버맥틴 → 이버멕틴)', () => {
    const r = searchDrugs('이버맥틴')
    expect(r[0].drugId).toBe('ivermectin')
  })
  it('matches initial consonants (ㅇㅂㅁㅌ → 이버멕틴, ㅋㅌㅋㄴㅈ → 케토코나졸)', () => {
    expect(searchDrugs('ㅇㅂㅁㅌ')[0].drugId).toBe('ivermectin')
    expect(searchDrugs('ㅋㅌㅋㄴㅈ')[0].drugId).toBe('ketoconazole')
  })
  it('handles partial syllables while typing (케토코ㄴ → 케토코나졸)', () => {
    expect(searchDrugs('케토코ㄴ')[0].drugId).toBe('ketoconazole')
  })
  it('tolerates an English typo', () => {
    expect(searchDrugs('ketoconazol')[0].drugId).toBe('ketoconazole')
    expect(searchDrugs('phenobarbitol')[0].drugId).toBe('phenobarbital')
  })
  it('finds every formulary drug by its Korean name and English name', () => {
    for (const d of DRUGS) {
      expect(searchDrugs(d.name.ko)[0].drugId).toBe(d.id)
      expect(searchDrugs(d.name.en)[0].drugId).toBe(d.id)
    }
  })
  it('returns nothing for blank or nonsense queries', () => {
    expect(searchDrugs('')).toEqual([])
    expect(searchDrugs('   ')).toEqual([])
    expect(searchDrugs('zzqqxx')).toEqual([])
  })
  it('ranks drugs not used in the selected species lower but still finds them', () => {
    const r = searchDrugs('methimazole', { species: 'dog' })
    expect(r[0].drugId).toBe('methimazole')
    expect(r[0].score).toBeLessThan(100)
  })
})

describe('breed search and resolution', () => {
  it('maps Korean aliases', () => {
    expect(searchBreeds('코숏')[0].breedId).toBe('domestic_shorthair')
    expect(searchBreeds('코리안숏헤어')[0].breedId).toBe('domestic_shorthair')
    expect(searchBreeds('말티즈')[0].breedId).toBe('maltese')
    expect(searchBreeds('러프 콜리')[0].breedId).toBe('collie')
    expect(searchBreeds('셸티')[0].breedId).toBe('shetland_sheepdog')
  })
  it('filters by species', () => {
    expect(searchBreeds('숏헤어', { species: 'dog' })).toEqual([])
    expect(searchBreeds('숏헤어', { species: 'cat' }).length).toBeGreaterThan(0)
  })
  it('resolves confident matches only; unknown text stays unknown (never "safe")', () => {
    expect(resolveBreed('Rough Collie', 'dog')).toBe('collie')
    expect(resolveBreed('콜리', 'dog')).toBe('collie')
    expect(resolveBreed('Korean Shorthair', 'cat')).toBe('domestic_shorthair')
    expect(resolveBreed('my fluffy boy', 'dog')).toBeNull()
    expect(resolveBreed('셰퍼드', 'dog')).toBe('german_shepherd')
    expect(resolveBreed('콜리', 'cat')).toBeNull()
    expect(resolveBreed('', 'dog')).toBeNull()
  })
})
