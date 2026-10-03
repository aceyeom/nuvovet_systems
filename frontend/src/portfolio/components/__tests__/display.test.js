/**
 * Display rules the workbench, report and handout share (portfolio UX review):
 * a plan changed by rounding is never shown as the instruction beside a green "Within
 * range", invalid numbers commit nothing, the organ matrix colours a Finding
 * badge by its severity and folds systems nobody assessed, and new UI strings
 * exist in both languages.
 */
import { describe, it, expect } from 'vitest'
import { analyze } from '../../engine/engine.js'
import { CASE_BY_ID } from '../../cases/cases.js'
import { DICTS } from '../../i18n/index.js'
import { amountCheck, doseStatusKey, fmtAmount, fmtQ, textLang, IMPLAUSIBLE_UNITS } from '../format.js'
import { checkNumber } from '../fields.jsx'
import { highestSeverity, groupBadges, splitColumns, tableGroup } from '../OrganMatrix.jsx'
import { buildHandout, ownerAmount } from '../report/handoutModel.js'

function clone(x) {
  return JSON.parse(JSON.stringify(x))
}

function doseRow(caseId, drugId, edit = null) {
  const input = clone(CASE_BY_ID[caseId].input)
  if (edit) edit(input)
  const result = analyze(input)
  return { row: result.doses.find((d) => d.drugId === drugId), result, input }
}

describe('amountCheck: when the plan is not the instruction', () => {
  it('flags the +95% maropitant rounding in Nabi, with the nearest plan and its delivered amount', () => {
    const { row } = doseRow('nabi', 'maropitant')
    expect(row.status).toBe('within')
    const c = amountCheck(row)
    expect(c).toMatchObject({ kind: 'gap', needsCheck: true, pct: '+95%', delivered: '8 mg' })
    expect(doseStatusKey(row.status, c.needsCheck)).toBe('check')
  })

  it('flags the −17% ketoconazole (Choco) and prednisolone (Kongyi) roundings too', () => {
    expect(amountCheck(doseRow('choco', 'ketoconazole').row)).toMatchObject({ kind: 'gap', pct: '−17%', delivered: '100 mg' })
    expect(amountCheck(doseRow('kongyi', 'prednisolone').row)).toMatchObject({ kind: 'gap', pct: '−17%', delivered: '2.5 mg' })
  })

  it('agrees with the report and handout: every row the engine flags for rounding needs a check, and only those', () => {
    for (const id of ['choco', 'kongyi', 'nabi', 'mochi', 'daebak']) {
      const result = analyze(CASE_BY_ID[id].input)
      const handout = buildHandout(CASE_BY_ID[id].input, result)
      for (const row of result.doses) {
        const c = amountCheck(row)
        expect(Boolean(c?.needsCheck), `${id}/${row.drugId}`).toBe(Boolean(row.rounding))
        const med = handout.meds.find((m) => m.drugId === row.drugId)
        if (row.rounding) expect(med.amount.confirm, `${id}/${row.drugId}`).toBe(true)
      }
    }
  })

  it('shows a clean plan as the instruction (Choco ivermectin, Daebak)', () => {
    expect(amountCheck(doseRow('choco', 'ivermectin').row)).toMatchObject({ kind: 'ok', needsCheck: false })
    for (const row of analyze(CASE_BY_ID.daebak.input).doses) expect(amountCheck(row).kind).toBe('ok')
  })

  it('a dose of 0 has nothing to give; no weight means no amount at all', () => {
    expect(amountCheck(doseRow('choco', 'ketoconazole', (i) => { i.meds[1].dose.value = 0 }).row).kind).toBe('empty')
    expect(amountCheck(doseRow('choco', 'ketoconazole', (i) => { i.weightKg = null }).row)).toBe(null)
  })

  it('an implausible amount (99999 mg/kg) is not turned into "12000 tablets", here or on the handout', () => {
    const { row, result, input } = doseRow('choco', 'ketoconazole', (i) => { i.meds[1].dose.value = 99999 })
    expect(row.status).toBe('above')
    expect(amountCheck(row).kind).toBe('implausible')
    expect(doseStatusKey(row.status, amountCheck(row).needsCheck)).toBe('above')
    expect(ownerAmount(row, input.meds[1]).confirm).toBe(true)
    expect(buildHandout(input, result).readiness.confirmDrugs).toContain('ketoconazole')
    // More than IMPLAUSIBLE_UNITS solid units is implausible even without a reference range.
    const noRef = doseRow('choco', 'ketoconazole', (i) => { i.meds[1].protocolId = null; i.meds[1].dose.value = 200 }).row
    expect(noRef.status).toBe('no_reference')
    expect(IMPLAUSIBLE_UNITS).toBe(20)
    expect(amountCheck(noRef).kind).toBe('implausible')
  })

  it('"Check amount" never hides an out-of-range status', () => {
    expect(doseStatusKey('within', true)).toBe('check')
    expect(doseStatusKey('no_reference', true)).toBe('check')
    expect(doseStatusKey('above', true)).toBe('above')
    expect(doseStatusKey('below', true)).toBe('below')
    expect(doseStatusKey('within', false)).toBe('within')
  })
})

describe('number formatting and input validation', () => {
  it('groups digits from 10 000 up, keeping small numbers as the engine prints them', () => {
    expect(fmtAmount(2399976, 'en')).toBe('2,399,976')
    expect(fmtAmount(2399976, 'ko')).toBe('2,399,976')
    expect(fmtAmount(1200)).toBe('1200')
    expect(fmtAmount(4.1)).toBe('4.1')
    expect(fmtQ({ value: 2399976, unit: 'mg' }, 'en')).toBe('2,399,976 mg')
    expect(fmtQ(null)).toBe('–')
  })

  it('checkNumber: invalid text commits null; a positive field rejects 0 but lets "0." be typed', () => {
    expect(checkNumber('abc')).toEqual({ value: null, invalid: true, pending: false })
    expect(checkNumber('-5')).toEqual({ value: null, invalid: true, pending: false })
    expect(checkNumber('')).toEqual({ value: null, invalid: false, pending: false })
    expect(checkNumber('0')).toEqual({ value: 0, invalid: false, pending: false })
    expect(checkNumber('0', { positive: true })).toEqual({ value: null, invalid: true, pending: true })
    expect(checkNumber('0.', { positive: true })).toEqual({ value: null, invalid: true, pending: true })
    expect(checkNumber('0.5', { positive: true })).toEqual({ value: 0.5, invalid: false, pending: false })
    expect(checkNumber('2,5', { positive: true }).value).toBe(2.5)
  })

  it('tags Korean text inside English UI (and vice versa) with its language', () => {
    expect(textLang('타이레놀')).toBe('ko')
    expect(textLang('Tylenol')).toBe('en')
  })
})

describe('organ matrix', () => {
  it('a Finding badge takes the most severe finding’s severity; Patient and Additive carry none', () => {
    expect(highestSeverity(['minor', 'major', 'moderate'])).toBe('major')
    expect(highestSeverity([])).toBe(null)
    const nabi = analyze(CASE_BY_ID.nabi.input)
    expect(nabi.verdict.level).toBe('moderate')
    const kidney = nabi.organMatrix.columns.find((c) => c.id === 'kidney')
    const groups = groupBadges(kidney.badges)
    expect(groups.find((g) => g.kind === 'interaction').severity).toBe('moderate')
    expect(groups.find((g) => g.kind === 'patient').severity).toBe(null)
    const choco = analyze(CASE_BY_ID.choco.input)
    const cns = choco.organMatrix.columns.find((c) => c.id === 'cns')
    expect(groupBadges(cns.badges).find((g) => g.kind === 'interaction').severity).toBe('contraindicated')
  })

  it('folds systems no prescribed drug was assessed for (and with no badge) into one line', () => {
    const { organMatrix: m } = analyze(CASE_BY_ID.nabi.input)
    const { shown, quiet } = splitColumns(m)
    expect(quiet.map((c) => c.id)).toEqual(['cns'])
    expect(shown.length + quiet.length).toBe(m.columns.length)
    for (const col of quiet) {
      expect(col.badges.length).toBe(0)
      expect(m.rows.every((r) => r.cells[col.id].level === 'na')).toBe(true)
    }
    // A system with a patient badge stays, even when no drug was assessed for it.
    const heart = shown.find((c) => c.id === 'heart')
    expect(heart).toBeTruthy()
  })

  it('table view: assessed drugs get a row each; the rest share one "not assessed" line', () => {
    const { organMatrix: m } = analyze(CASE_BY_ID.nabi.input)
    const kidney = m.columns.find((c) => c.id === 'kidney')
    const g = tableGroup(kidney, m)
    expect(g.assessed.map((r) => r.drugId)).toEqual(['methimazole'])
    expect(g.notAssessed).toEqual(['amlodipine', 'maropitant'])
  })
})

describe('new UI strings', () => {
  const keys = [
    'dc.status.check', 'dc.gap', 'dc.nearest', 'dc.rangeHead', 'dc.planSee', 'dc.implausible', 'dc.calculated',
    'rx.doseInvalid', 'pt.weightInvalid', 'om.t.notAssessedList', 'om.badgeDesc.interaction', 'rp.roundingRange',
    'dc.usLabel', 'dc.startDose', 'rv.doseChecks', 'cases.inEmr', 'om.open', 'wb.brief',
  ]
  it('exist in English and Korean with the same placeholders', () => {
    const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort().join(',')
    for (const k of keys) {
      expect(DICTS.en[k], `en: ${k}`).toBeTruthy()
      expect(DICTS.ko[k], `ko: ${k}`).toBeTruthy()
      expect(ph(DICTS.ko[k]), k).toBe(ph(DICTS.en[k]))
    }
  })
})
