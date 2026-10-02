/**
 * analyze(caseInput) → Result. Synchronous and pure (apart from reading the
 * clock for trace.ms). See docs/portfolio/DUR_SHOWCASE_SPEC.md §4 for the contract.
 */

import { getDrug, getProtocol } from '../knowledge/drugs.js'
import { BREED_BY_ID } from '../knowledge/breeds.js'
import { CONDITION_BY_ID, CREATININE_UPPER } from '../knowledge/conditions.js'
import { normalizeFrequency, buildDoseRow, exposure24hPerKg } from './dose.js'
import { resolveBreed } from './search.js'
import { RULES } from './rules/index.js'
import { mergeContributions, computeVerdict } from './findings.js'
import { buildOrganMatrix } from './organMatrix.js'
import { T, fmt } from './rules/util.js'

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())

const MDR1_STATUSES = ['unknown', 'normal/normal', 'mutant/normal', 'mutant/mutant']

/** Fill defaults and coerce types. Never invents clinical data. */
export function normalizeCase(input = {}) {
  const species = input.species === 'cat' ? 'cat' : 'dog'
  const w = Number(input.weightKg)
  let breedId = input.breedId && BREED_BY_ID[input.breedId]?.species === species ? input.breedId : null
  if (!breedId && input.breedText) breedId = resolveBreed(input.breedText, species)
  return {
    species,
    weightKg: Number.isFinite(w) && w > 0 ? w : null,
    breedId,
    breedText: input.breedText || '',
    ageYears: input.ageYears ?? null,
    sex: input.sex ?? null,
    neutered: input.neutered ?? null,
    pregnant: Boolean(input.pregnant),
    lactating: Boolean(input.lactating),
    conditions: [...new Set((input.conditions || []).filter((c) => CONDITION_BY_ID[c]))],
    labs: {
      creatinine: input.labs?.creatinine != null && input.labs.creatinine !== '' && Number.isFinite(Number(input.labs.creatinine)) ? Number(input.labs.creatinine) : null,
      alt: input.labs?.alt != null && input.labs.alt !== '' && Number.isFinite(Number(input.labs.alt)) ? Number(input.labs.alt) : null,
    },
    allergies: [...new Set(input.allergies || [])],
    mdr1Status: MDR1_STATUSES.includes(input.mdr1Status) ? input.mdr1Status : 'unknown',
    meds: (input.meds || []).map((m) => ({
      drugId: m.drugId,
      protocolId: m.protocolId ?? null,
      dose: m.dose || null,
      route: m.route || null,
      frequency: m.frequency ?? null,
      durationDays: m.durationDays ?? null,
      strengthId: m.strengthId ?? null,
    })),
  }
}

function kidneyContext(input) {
  const ckd = input.conditions.some((c) => (CONDITION_BY_ID[c]?.kind || []).includes('ckd'))
  const ref = CREATININE_UPPER[input.species]
  const creat = input.labs.creatinine
  const creatinineHigh = creat != null && ref != null && creat >= ref.value
  const factors = []
  const inputs = []
  if (ckd) {
    factors.push({ kind: 'condition', id: 'ckd', label: CONDITION_BY_ID.ckd.label })
    inputs.push({ fact: 'conditions', value: 'ckd' })
  }
  if (creatinineHigh) {
    factors.push({ kind: 'lab', id: 'creatinine', label: T(`Creatinine ${fmt(creat)} mg/dL (≥ ${ref.value})`, `크레아티닌 ${fmt(creat)} mg/dL (≥ ${ref.value})`) })
    inputs.push({ fact: 'labs.creatinine', value: `${fmt(creat)} mg/dL`, source: ref.source })
  }
  return { affected: ckd || creatinineHigh, ckd, creatinineHigh, creatinine: creat, factors, inputs }
}

export function analyze(caseInput) {
  const t0 = now()
  const input = normalizeCase(caseInput)
  const notes = []
  const breed = input.breedId ? BREED_BY_ID[input.breedId] : null

  if (caseInput && caseInput.species != null && !['dog', 'cat'].includes(caseInput.species)) {
    notes.push({ id: 'species_unsupported', kind: 'administration', category: 'validation', drugIds: [], text: T(`Species “${caseInput.species}” is not supported; the case was checked as a dog. Only dogs and cats are covered.`, `“${caseInput.species}” 종은 지원하지 않아 개로 간주해 검토했습니다. 개와 고양이만 지원합니다.`), sources: [] })
  }
  if (input.weightKg == null) {
    notes.push({ id: 'weight_missing', kind: 'administration', category: 'validation', drugIds: [], text: T('Body weight missing — per-kg doses cannot be calculated or checked.', '체중이 없어 kg당 용량을 계산·검토할 수 없습니다.'), sources: [] })
  }

  // ── Resolve medications and compute doses ──
  const meds = []
  const doses = []
  input.meds.forEach((med, index) => {
    const drug = getDrug(med.drugId)
    if (!drug) {
      notes.push({ id: `unknown_drug_${index}`, kind: 'administration', category: 'validation', drugIds: [], text: T(`Medication “${med.drugId}” is not in this formulary and was not checked.`, `“${med.drugId}”은(는) 이 처방집에 없어 검토하지 않았습니다.`), sources: [] })
      return
    }
    const protocol = getProtocol(drug.id, med.protocolId)
    const freq = normalizeFrequency(med.frequency)
    if (!freq.ok) {
      notes.push({ id: `freq_${drug.id}_${index}`, kind: 'administration', category: 'validation', drugIds: [drug.id], text: T(`${drug.name.en}: ${freq.note.en}`, `${drug.name.ko}: ${freq.note.ko}`), sources: [] })
    }
    const doseRow = buildDoseRow({ med, drug, protocol, weightKg: input.weightKg, species: input.species, frequencyId: freq.id })
    if (doseRow.strengthNote) {
      notes.push({ id: `dose_strength_${drug.id}_${index}`, kind: 'administration', category: 'validation', drugIds: [drug.id], text: T(`${drug.name.en}: ${doseRow.strengthNote.en}`, `${drug.name.ko}: ${doseRow.strengthNote.ko}`), sources: [] })
    }
    if (doseRow.rounding) {
      notes.push({ id: `rounding_${drug.id}_${index}`, kind: 'administration', category: 'rounding', drugIds: [drug.id], text: doseRow.rounding.text, sources: [] })
    }
    doses.push(doseRow)
    meds.push({
      index, med, drug, protocol, doseRow,
      amount: doseRow.amount,
      freqId: freq.id,
      exposure24hPerKg: exposure24hPerKg(doseRow.perDoseMg, input.weightKg, freq.id),
    })
  })

  const ctx = {
    input,
    species: input.species,
    weightKg: input.weightKg,
    breed,
    breedText: input.breedText,
    mdr1Status: input.mdr1Status,
    conditions: new Set(input.conditions),
    allergies: new Set(input.allergies),
    kidney: kidneyContext(input),
    meds,
  }

  // ── Run rules ──
  const contributions = []
  const rulesFired = []
  for (const rule of RULES) {
    const out = rule.evaluate(ctx) || {}
    if (out.contributions?.length) {
      contributions.push(...out.contributions)
      rulesFired.push(rule.id)
    }
    if (out.notes?.length) notes.push(...out.notes)
  }

  const findings = mergeContributions(contributions)
  const uniqueNotes = []
  const seen = new Set()
  for (const n of notes) {
    if (seen.has(n.id)) continue
    seen.add(n.id)
    uniqueNotes.push(n)
  }
  const verdict = computeVerdict(findings, uniqueNotes, doses)

  // ── Trace ──
  const n = new Set(meds.map((m) => m.drug.id)).size
  const factorsUsed = ['species']
  const factorsMissing = []
  if (input.weightKg != null) factorsUsed.push('weightKg'); else factorsMissing.push('weightKg')
  const hasMl = meds.some((m) => m.drug.flags?.mdr1Sensitive)
  if (breed) factorsUsed.push('breed')
  else if (input.species === 'dog') factorsMissing.push('breed')
  if (input.mdr1Status !== 'unknown') factorsUsed.push('mdr1Status')
  else if (hasMl && input.species === 'dog') factorsMissing.push('mdr1Status')
  if (input.conditions.length) factorsUsed.push('conditions')
  const renalRelevant = meds.some((m) => m.drug.flags?.nsaid || (m.drug.pk?.renalFraction ?? 0) >= 0.5 || m.drug.id === 'methimazole')
  if (input.labs.creatinine != null) factorsUsed.push('labs.creatinine')
  else if (renalRelevant) factorsMissing.push('labs.creatinine')
  if (input.labs.alt != null) factorsUsed.push('labs.alt')
  if (input.allergies.length) factorsUsed.push('allergies')
  if (input.ageYears == null) factorsMissing.push('ageYears')
  for (const m of meds) {
    if (!m.protocol) factorsMissing.push(`protocol.${m.drug.id}`)
    if (!m.freqId) factorsMissing.push(`frequency.${m.drug.id}`)
  }
  if (meds.length) factorsUsed.push('meds.dose', 'meds.frequency')

  const dedupe = (list) => [...new Set(list)]
  const result = {
    verdict,
    findings,
    notes: uniqueNotes,
    doses,
    organMatrix: null,
    trace: {
      drugsResolved: meds.length,
      pairsEvaluated: (n * (n - 1)) / 2,
      rulesEvaluated: RULES.length,
      rulesFired,
      factorsUsed: dedupe(factorsUsed),
      factorsMissing: dedupe(factorsMissing),
      ms: 0,
    },
  }
  result.organMatrix = buildOrganMatrix(result, input)
  result.trace.ms = Math.max(0, Math.round((now() - t0) * 100) / 100)
  return result
}

export { normalizeCase as normalizeCaseInput }
