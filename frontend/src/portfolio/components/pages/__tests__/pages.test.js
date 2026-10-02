import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyze } from '../../../engine/engine.js'
import { CASES, CASE_BY_ID } from '../../../cases/cases.js'
import { DRUG_BY_ID } from '../../../knowledge/drugs.js'
import { SOURCES } from '../../../knowledge/sources.js'
import { CONDITION_BY_ID } from '../../../knowledge/conditions.js'
import { DICTS } from '../../../i18n/index.js'
import pagesEn from '../../../i18n/pages.en.js'
import pagesKo from '../../../i18n/pages.ko.js'
import { checkCase } from '../goldenCheck.js'
import { reportId, citedSources } from '../../report/reportModel.js'
import { buildHandout, ownerAmount, scheduleFor, emergencySigns, watchSigns } from '../../report/handoutModel.js'
import { OWNER_FOOD, OWNER_CONDITIONS, FREQ_OWNER, ROUTE_TEXT } from '../../report/ownerText.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..', '..')

function clone(x) {
  return JSON.parse(JSON.stringify(x))
}

function placeholders(s) {
  return [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
}

describe('page strings (i18n)', () => {
  it('pages.en and pages.ko have exactly the same keys, all non-empty, with matching placeholders', () => {
    expect(Object.keys(pagesKo).sort()).toEqual(Object.keys(pagesEn).sort())
    for (const k of Object.keys(pagesEn)) {
      expect(pagesEn[k], k).toBeTruthy()
      expect(pagesKo[k], k).toBeTruthy()
      expect(placeholders(pagesKo[k]), k).toBe(placeholders(pagesEn[k]))
    }
  })

  it('page keys do not shadow UI keys', () => {
    // The merge in i18n/index.js would silently override a UI string.
    const ui = Object.keys(DICTS.en).filter((k) => !(k in pagesEn))
    for (const k of Object.keys(pagesEn)) expect(ui.includes(k), k).toBe(false)
  })

  it('every literal t()/tr() key used by the new pages exists in both languages', () => {
    const files = [
      ...['CaseStudyPage.jsx', 'ReportPage.jsx', 'HandoutPage.jsx', 'HowItWorksPage.jsx'].map((f) => join(ROOT, 'pages', f)),
      ...readdirSync(join(ROOT, 'components', 'report')).filter((f) => f.endsWith('.jsx')).map((f) => join(ROOT, 'components', 'report', f)),
      ...readdirSync(join(ROOT, 'components', 'pages')).filter((f) => f.endsWith('.jsx')).map((f) => join(ROOT, 'components', 'pages', f)),
    ]
    const keys = new Set()
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/\btr?\('([a-zA-Z0-9_.-]+)'/g)) keys.add(m[1])
    }
    expect(keys.size).toBeGreaterThan(50)
    for (const k of keys) {
      expect(DICTS.en[k], `en: ${k}`).toBeTruthy()
      expect(DICTS.ko[k], `ko: ${k}`).toBeTruthy()
    }
  })

  it('templated keys used by the pages exist', () => {
    const templated = [
      ...['polypharmacy', 'offlabel', 'nodur'].flatMap((k) => [`cs.problem.${k}.title`, `cs.problem.${k}.body`]),
      ...['prototype', 'data', 'pivot'].flatMap((k) => [`cs.status.${k}.title`, `cs.status.${k}.body`]),
      ...['review', 'search', 'handout'].map((k) => `cs.built.original.${k}`),
      ...['buyer', 'data', 'silence'].map((k) => `cs.learned.${k}`),
      ...['input', 'resolve', 'rules', 'merge', 'render'].flatMap((k) => [`hw.step.${k}.title`, `hw.step.${k}.body`]),
      ...['interactions', 'species', 'disease', 'dose', 'notes'].map((k) => `hw.dg.layer.${k}`),
      ...['iver', 'plan', 'prevent', 'mmi'].map((k) => `hw.code.ex.${k}`),
      ...['verdict', 'findings', 'notes', 'doses'].map((k) => `hw.gold.check.${k}`),
      'hw.gold.check.notesNone', 'hw.gold.check.dosesNone',
      ...['validation', 'coverage', 'silence', 'organ', 'rounding', 'scope', 'copy'].map((k) => `hw.limits.${k}`),
      ...['review', 'pharmacist', 'drugs', 'retro', 'emr'].map((k) => `hw.next.${k}`),
      ...['changed', 'dispensed', 'discussed'].map((k) => `rp.ack.${k}`),
    ]
    for (const k of templated) {
      expect(DICTS.en[k], `en: ${k}`).toBeTruthy()
      expect(DICTS.ko[k], `ko: ${k}`).toBeTruthy()
    }
  })
})

describe('golden check (How it works table)', () => {
  it('passes every golden case, like the test suite', () => {
    for (const c of CASES) {
      const r = checkCase(c, analyze(c.input))
      expect(r.pass, c.id).toBe(true)
    }
  })

  it('fails when the result disagrees with the expectation', () => {
    const c = clone(CASE_BY_ID.choco)
    c.expect.verdict = 'major'
    const r = checkCase(c, analyze(c.input))
    expect(r.pass).toBe(false)
    expect(r.checks.find((x) => x.id === 'verdict').pass).toBe(false)

    const d = clone(CASE_BY_ID.daebak)
    d.input.meds.push({ drugId: 'ivermectin', protocolId: 'iver_dog_demodex', dose: { value: 300, unit: 'mcg/kg' }, route: 'PO', frequency: 'q24h', durationDays: null, strengthId: null })
    const r2 = checkCase(d, analyze(d.input))
    expect(r2.checks.find((x) => x.id === 'findings').unexpected.length).toBeGreaterThan(0)
    expect(r2.pass).toBe(false)
  })
})

describe('report', () => {
  it('report ID is deterministic and changes with any input edit', () => {
    const a = reportId(CASE_BY_ID.choco.input)
    expect(a).toMatch(/^DUR-[0-9A-F]{8}$/)
    expect(reportId(clone(CASE_BY_ID.choco.input))).toBe(a)
    const edited = clone(CASE_BY_ID.choco.input)
    edited.weightKg = 25
    expect(reportId(edited)).not.toBe(a)
    expect(new Set(CASES.map((c) => reportId(c.input))).size).toBe(CASES.length)
  })

  it('cites only registered sources', () => {
    for (const c of CASES) {
      for (const id of citedSources(analyze(c.input))) expect(SOURCES[id], id).toBeTruthy()
    }
    expect(citedSources(analyze(CASE_BY_ID.choco.input))).toEqual(expect.arrayContaining(['mealey2001', 'mueller2020']))
  })
})

describe('owner handout', () => {
  const handout = (id) => {
    const c = CASE_BY_ID[id]
    return buildHandout(c.input, analyze(c.input))
  }

  it('owner units: per-cat methimazole is one 2.5 mg tablet, a spot-on is one pipette, a liquid is a measured volume', () => {
    const nabi = handout('nabi')
    expect(nabi.meds.find((m) => m.drugId === 'methimazole').amount.text).toEqual({ en: '1 tablet (2.5 mg)', ko: '2.5 mg 정제 1정' })
    expect(nabi.meds.find((m) => m.drugId === 'amlodipine').amount.text.en).toBe('¼ of a 2.5 mg tablet')
    expect(handout('mochi').meds[0].amount.text).toEqual({ en: '1 pipette', ko: '피펫 1개' })
    expect(handout('choco').meds.find((m) => m.drugId === 'ivermectin').amount.text.en).toBe('0.72 mL of the 10 mg/mL liquid')
    expect(handout('kongyi').meds.find((m) => m.drugId === 'ciclosporin').amount.text.en).toBe('3 capsules (10 mg each)')
  })

  it('leaves the amount for the vet when rounding misses the calculated dose by more than 10%', () => {
    const maro = handout('nabi').meds.find((m) => m.drugId === 'maropitant')
    expect(maro.amount.confirm).toBe(true)
    expect(maro.amount.calculated.en).toBe('4.1 mg')
    expect(ownerAmount(null).confirm).toBe(true)
  })

  it('is a draft while contraindicated or major findings are unresolved', () => {
    expect(handout('choco').readiness.blocked).toBe(true)
    expect(handout('mochi').readiness.blocked).toBe(true)
    expect(handout('nabi').readiness.blocked).toBe(false)
    expect(handout('daebak').readiness.blocked).toBe(false)
  })

  it('7-day grid: AM/PM for q12h, alternate days for q48h, days after the course are off', () => {
    const q12 = scheduleFor('q12h', null, 'PO')
    expect(q12.mode).toBe('grid')
    expect(q12.slots.map((s) => s.id)).toEqual(['am', 'pm'])
    expect(q12.days.every((d) => d.dosing && d.inCourse)).toBe(true)
    expect(scheduleFor('q48h', null, 'PO').days.map((d) => d.dosing)).toEqual([true, false, true, false, true, false, true])
    expect(scheduleFor('q24h', 2, 'PO').days.map((d) => d.inCourse)).toEqual([true, true, false, false, false, false, false])
    expect(scheduleFor('monthly', null, 'PO').mode).toBe('interval')
    expect(scheduleFor('q24h', null, 'IV').mode).toBe('clinic')
    expect(scheduleFor(null, null, 'PO').mode).toBe('unknown')
    const daebakMaro = handout('daebak').meds.find((m) => m.drugId === 'maropitant')
    expect(daebakMaro.schedule.days.filter((d) => d.inCourse).length).toBe(2)
  })

  it('watch signs combine the drug’s owner signs with those of findings about it; emergency signs come from findings', () => {
    const c = CASE_BY_ID.nabi
    const r = analyze(c.input)
    const mmi = watchSigns('methimazole', r.findings).map((s) => s.en)
    expect(mmi).toEqual(expect.arrayContaining([...DRUG_BY_ID.methimazole.ownerSigns.map((s) => s.en), ...r.findings[0].ownerSigns.map((s) => s.en)]))
    expect(emergencySigns(r.findings).map((s) => s.en)).toEqual(r.findings[0].ownerSigns.map((s) => s.en))
    expect(emergencySigns([])).toEqual([])
    expect(handout('nabi').conditions.map((x) => x.id)).toEqual(['hyperthyroidism', 'ckd'])
  })

  it('owner wording refers to real drugs, sources and conditions, in both languages', () => {
    for (const [id, f] of Object.entries(OWNER_FOOD)) {
      expect(DRUG_BY_ID[id], id).toBeTruthy()
      expect(SOURCES[f.source], f.source).toBeTruthy()
      expect(f.text.en && f.text.ko).toBeTruthy()
    }
    for (const [id, c] of Object.entries(OWNER_CONDITIONS)) {
      expect(CONDITION_BY_ID[id], id).toBeTruthy()
      for (const x of [c.title, ...c.watch, ...(c.tip ? [c.tip] : [])]) expect(x.en && x.ko, id).toBeTruthy()
    }
    for (const x of [...Object.values(FREQ_OWNER), ...Object.values(ROUTE_TEXT)]) expect(x.en && x.ko).toBeTruthy()
  })

  it('never says medicines are safe together, and uses no emoji', () => {
    const texts = [
      readFileSync(join(ROOT, 'i18n', 'pages.en.js'), 'utf8'),
      readFileSync(join(ROOT, 'i18n', 'pages.ko.js'), 'utf8'),
      readFileSync(join(ROOT, 'components', 'report', 'ownerText.js'), 'utf8')
        .split('\n').filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('/**')).join('\n'),
      ...CASES.map((c) => JSON.stringify(handout(c.id))),
    ].join('\n')
    expect(texts).not.toMatch(/safe to (use|give) together|safe together|함께 (사용|복용|투여)해도 안전/i)
    expect(texts).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})
