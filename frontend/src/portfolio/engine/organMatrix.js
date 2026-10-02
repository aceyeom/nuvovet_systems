/**
 * Organ-system matrix: one row per prescribed drug, one column per organ system.
 * Cells are ordinal flags (0–3) from labels/literature, or 'na' when the drug's
 * effect on that organ was not assessed. Levels are never added together.
 *
 * Column badges:
 *   additive    — two or more drugs flag this organ at level ≥ 2
 *   patient     — the patient has a condition / lab value affecting this organ
 *   interaction — a finding in the result involves this organ
 */

import { getDrug } from '../knowledge/drugs.js'
import { ORGANS, ORGAN_LABELS, CONDITION_BY_ID, CREATININE_UPPER } from '../knowledge/conditions.js'
import { pickOrganEntry, enName, koName } from './rules/util.js'

export function organCell(drug, organ, species) {
  const entry = pickOrganEntry(drug?.organRisk?.[organ], species)
  if (!entry || typeof entry.level !== 'number') return { level: 'na', reason: null, source: null }
  return { level: entry.level, reason: entry.reason || null, source: entry.source || null }
}

export function buildOrganMatrix(result, caseInput) {
  const species = caseInput?.species === 'cat' ? 'cat' : 'dog'
  const drugIds = []
  for (const m of caseInput?.meds || []) {
    if (getDrug(m.drugId) && !drugIds.includes(m.drugId)) drugIds.push(m.drugId)
  }
  const rows = drugIds.map((id) => {
    const drug = getDrug(id)
    const cells = {}
    for (const organ of ORGANS) cells[organ] = organCell(drug, organ, species)
    return { drugId: id, cells }
  })

  const conditions = (caseInput?.conditions || []).map((c) => CONDITION_BY_ID[c]).filter(Boolean)
  const creat = caseInput?.labs?.creatinine
  const creatHigh = creat != null && CREATININE_UPPER[species] && Number(creat) >= CREATININE_UPPER[species].value

  const columns = ORGANS.map((organ) => {
    const badges = []
    const flagged = rows.filter((r) => typeof r.cells[organ].level === 'number' && r.cells[organ].level >= 2)
    if (flagged.length >= 2) {
      const drugs = flagged.map((r) => getDrug(r.drugId))
      badges.push({
        kind: 'additive',
        reason: {
          en: `${drugs.map(enName).join(', ')} each flag this system at level 2 or higher (shown side by side, not summed).`,
          ko: `${drugs.map(koName).join(', ')} 모두 이 장기계에 2단계 이상으로 표시됩니다(합산하지 않고 나란히 표시).`,
        },
        drugIds: flagged.map((r) => r.drugId),
      })
    }
    for (const c of conditions) {
      if (c.organs.includes(organ)) badges.push({ kind: 'patient', reason: { en: `Patient: ${c.label.en}`, ko: `환자 요인: ${c.label.ko}` }, conditionId: c.id })
    }
    if (organ === 'kidney' && creatHigh && !conditions.some((c) => c.organs.includes('kidney'))) {
      badges.push({
        kind: 'patient',
        reason: { en: `Patient: creatinine ${creat} mg/dL (≥ ${CREATININE_UPPER[species].value})`, ko: `환자 요인: 크레아티닌 ${creat} mg/dL (≥ ${CREATININE_UPPER[species].value})` },
        lab: 'creatinine',
      })
    }
    for (const f of result?.findings || []) {
      if ((f.organs || []).includes(organ)) badges.push({ kind: 'interaction', reason: f.title, findingId: f.id, severity: f.severity })
    }
    return { id: organ, label: ORGAN_LABELS[organ], badges }
  })

  return { columns, rows }
}
