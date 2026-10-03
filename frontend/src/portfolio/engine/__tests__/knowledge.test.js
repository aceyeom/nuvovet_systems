import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCES, sourceHref } from '../../knowledge/sources.js'
import { DRUGS } from '../../knowledge/drugs.js'
import { BREEDS, BREED_BY_ID } from '../../knowledge/breeds.js'
import { CONDITIONS, CREATININE_UPPER, interpretLab } from '../../knowledge/conditions.js'
import { ALLERGY_CLASSES, ALLERGY_BY_ID } from '../../knowledge/allergyClasses.js'
import { parseDoseUnit } from '../units.js'
import { FREQUENCY_BY_ID } from '../dose.js'

const isBilingual = (o) => o && typeof o.en === 'string' && o.en.trim() && typeof o.ko === 'string' && o.ko.trim()

/** Walk any object and collect {en,ko} objects plus every `source`/`sources` id. */
function walk(obj, path, out) {
  if (Array.isArray(obj)) return obj.forEach((x, i) => walk(x, `${path}[${i}]`, out))
  if (!obj || typeof obj !== 'object') return
  if ('en' in obj || 'ko' in obj) out.texts.push({ path, obj })
  for (const [k, v] of Object.entries(obj)) {
    if ((k === 'source' || k === 'extraSources' || k === 'sources') && v) out.sources.push(...[].concat(v).map((s) => ({ path: `${path}.${k}`, s })))
    else walk(v, `${path}.${k}`, out)
  }
}

describe('sources registry', () => {
  it('every entry has a valid kind and citation; DOIs and PMIDs are well-formed', () => {
    for (const [id, s] of Object.entries(SOURCES)) {
      expect(['doi', 'pmid', 'label', 'guideline'], id).toContain(s.kind)
      expect(s.cite, id).toBeTruthy()
      if (s.kind === 'doi') expect(s.doi, id).toMatch(/^10\.\d{4,}\//)
      if (s.kind === 'pmid') expect(s.pmid, id).toMatch(/^\d+$/)
      if (s.pmid) expect(s.pmid, id).toMatch(/^\d+$/)
      if (s.kind === 'doi' || s.kind === 'pmid' || s.kind === 'guideline') expect(sourceHref(id), id).toBeTruthy()
    }
  })
  it('label sources name a regulator and give no approval number', () => {
    for (const s of Object.values(SOURCES).filter((x) => x.kind === 'label')) {
      expect(s.cite).toMatch(/FDA|VMD|EMA/)
      expect(s.cite).not.toMatch(/NADA/)
    }
  })
  it('every DOI in the registry is listed in docs/portfolio/SOURCES_VERIFIED.md', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const doc = readFileSync(join(here, '../../../../../docs/portfolio/SOURCES_VERIFIED.md'), 'utf8')
    for (const s of Object.values(SOURCES)) {
      if (s.doi) expect(doc, s.doi).toContain(s.doi)
      if (s.pmid) expect(doc, s.pmid).toContain(s.pmid)
    }
  })
})

describe('formulary', () => {
  it('has the specified drugs (≥ 22)', () => {
    const ids = DRUGS.map((d) => d.id)
    expect(ids.length).toBeGreaterThanOrEqual(22)
    for (const id of ['ivermectin', 'ketoconazole', 'ciclosporin', 'phenobarbital', 'prednisolone', 'methimazole', 'amlodipine', 'maropitant',
      'amoxicillin_clavulanate', 'meloxicam', 'carprofen', 'robenacoxib', 'gabapentin', 'tramadol', 'trazodone', 'fluoxetine', 'omeprazole',
      'famotidine', 'enrofloxacin', 'metronidazole', 'furosemide', 'pimobendan', 'benazepril', 'permethrin', 'acetaminophen']) {
      expect(ids, id).toContain(id)
    }
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every bilingual string is complete and every cited source exists', () => {
    for (const d of DRUGS) {
      const out = { texts: [], sources: [] }
      walk(d, d.id, out)
      for (const t of out.texts) expect(isBilingual(t.obj), t.path).toBeTruthy()
      for (const { path, s } of out.sources) expect(SOURCES[s], `${path} → ${s}`).toBeTruthy()
    }
  })

  it('protocols are well-formed: parseable unit matching the basis, min ≤ max (or a minimum-only max: null), known frequency, a source', () => {
    for (const d of DRUGS) {
      for (const p of d.protocols) {
        const u = parseDoseUnit(p.dose.unit)
        expect(u, `${p.id} unit`).toBeTruthy()
        expect(u.basis, p.id).toBe(p.dose.basis)
        if (p.dose.max === null) expect(p.dose.min, `${p.id}: a minimum-only protocol needs min > 0`).toBeGreaterThan(0)
        else expect(p.dose.min, p.id).toBeLessThanOrEqual(p.dose.max)
        if (p.phase != null) expect(['start'], `${p.id} phase`).toContain(p.phase)
        if (p.repeatPolicy != null) {
          expect(['label_single_only'], `${p.id} repeatPolicy`).toContain(p.repeatPolicy)
          expect([].concat(p.frequency), `${p.id}: repeatPolicy only applies to single-dose protocols`).toEqual(['once'])
        }
        for (const f of [].concat(p.frequency)) expect(FREQUENCY_BY_ID[f], `${p.id} ${f}`).toBeTruthy()
        expect(['label', 'extra-label'], p.id).toContain(p.labelStatus)
        expect(SOURCES[p.source], p.id).toBeTruthy()
        if (p.labelStatus === 'label') expect(SOURCES[p.source].kind, `${p.id} label status needs a label source`).toBe('label')
        expect(d.species, p.id).toContain(p.species)
        expect(isBilingual(p.indication), p.id).toBeTruthy()
      }
    }
  })

  it('organ risk levels are 1–3 with a reason and source; omitted keys mean "not assessed"', () => {
    for (const d of DRUGS) {
      for (const [organ, entry] of Object.entries(d.organRisk)) {
        for (const e of [].concat(entry)) {
          expect([1, 2, 3], `${d.id}.${organ}`).toContain(e.level)
          expect(isBilingual(e.reason), `${d.id}.${organ}`).toBeTruthy()
          expect(SOURCES[e.source], `${d.id}.${organ}`).toBeTruthy()
        }
      }
    }
  })

  it('strengths are well-formed', () => {
    for (const d of DRUGS) {
      const ids = new Set()
      for (const s of d.strengths) {
        expect(ids.has(s.id), s.id).toBe(false)
        ids.add(s.id)
        expect(['tablet', 'chewable', 'capsule', 'solution', 'injection', 'suspension', 'spot-on'], s.id).toContain(s.form)
        expect(s.amount.value, s.id).toBeGreaterThan(0)
        if (['solution', 'injection', 'suspension'].includes(s.form)) expect(s.per?.unit, s.id).toBe('mL')
      }
    }
  })

  it('flags reference known allergy classes', () => {
    for (const d of DRUGS) if (d.flags.allergyClass) expect(ALLERGY_BY_ID[d.flags.allergyClass], d.id).toBeTruthy()
  })
})

describe('breeds, conditions, allergy classes', () => {
  it('about 30+ breeds with Korean aliases and valid MDR1 categories', () => {
    expect(BREEDS.length).toBeGreaterThanOrEqual(30)
    for (const b of BREEDS) {
      expect(b.ko.length, b.id).toBeGreaterThan(0)
      expect(['high', 'moderate', 'low', 'not_reported'], b.id).toContain(b.mdr1)
      expect(isBilingual(b.mdr1Note), b.id).toBeTruthy()
      if (b.source) expect(SOURCES[b.source], b.id).toBeTruthy()
    }
  })
  it('uses the published allele frequencies for the reference herding breeds', () => {
    expect(BREED_BY_ID.collie).toMatchObject({ mdr1: 'high', mdr1AlleleFreq: 0.59 })
    expect(BREED_BY_ID.shetland_sheepdog).toMatchObject({ mdr1: 'moderate', mdr1AlleleFreq: 0.3 })
    expect(BREED_BY_ID.australian_shepherd).toMatchObject({ mdr1: 'moderate', mdr1AlleleFreq: 0.22 })
    expect(BREED_BY_ID.border_collie).toMatchObject({ mdr1: 'low', mdr1AlleleFreq: 0.01 })
  })
  it('includes the Korean-common breeds', () => {
    for (const ko of ['말티즈', '푸들', '포메라니안', '비숑', '시츄', '진돗개', '웰시코기', '골든 리트리버', '래브라도', '코리안숏헤어', '페르시안', '러시안블루', '스코티시폴드']) {
      expect(BREEDS.some((b) => b.ko.includes(ko)), ko).toBe(true)
    }
  })
  it('conditions and allergy classes are bilingual with valid organs', () => {
    for (const c of CONDITIONS) {
      expect(isBilingual(c.label), c.id).toBeTruthy()
      for (const o of c.organs) expect(['kidney', 'liver', 'gi', 'hemostasis', 'cns', 'heart']).toContain(o)
    }
    for (const a of ALLERGY_CLASSES) expect(isBilingual(a.label), a.id).toBeTruthy()
  })
  it('creatinine is interpreted against the IRIS cut-off; ALT is recorded but never auto-flagged', () => {
    expect(CREATININE_UPPER).toMatchObject({ dog: { value: 1.4 }, cat: { value: 1.6 } })
    expect(interpretLab('creatinine', 2.0, 'cat').status).toBe('high')
    expect(interpretLab('creatinine', 1.2, 'cat').status).toBe('normal')
    expect(interpretLab('alt', 900, 'dog').status).toBe('entered')
    expect(interpretLab('creatinine', null, 'dog').status).toBe('missing')
  })
})

describe('clean-room guard (knowledge, engine, cases)', () => {
  it('contains no Plumb references, no network calls and no "confidence" scores', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const roots = ['../../knowledge', '../../engine', '../../cases'].map((p) => join(here, p))
    const files = []
    const visit = (dir) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) visit(p)
        else if (/\.(js|jsx)$/.test(name) && !p.includes('__tests__')) files.push(p)
      }
    }
    roots.forEach(visit)
    expect(files.length).toBeGreaterThan(10)
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      expect(src, f).not.toMatch(/plumb/i)
      expect(src, f).not.toMatch(/\bfetch\(/)
      expect(src, f).not.toMatch(/confidence/i)
      expect(src, f).not.toMatch(/XMLHttpRequest|axios/)
      expect(src, f).not.toMatch(/https?:\/\/[^'"\s]+\.(png|jpe?g|gif|svg|webp)/i)
      for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        const spec = m[1]
        expect(spec.startsWith('.') || ['react', 'react-dom', 'lucide-react'].includes(spec), `${f} imports ${spec}`).toBe(true)
      }
    }
  })
})
