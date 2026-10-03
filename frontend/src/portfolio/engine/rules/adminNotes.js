/**
 * ADMIN_NOTES — administration, lab-interference and monitoring notes taken
 * from each prescribed drug, plus non-contraindicated species cautions (unless
 * SPECIES_HARDSTOP already turned the caution into a finding).
 * Notes are a checklist, not findings; they never change the verdict.
 */

import { T, enName, koName } from './util.js'
import { conditionalCautionApplies } from './speciesHardstop.js'

const RULE = { id: 'ADMIN_NOTES', version: '1.1.0' }

function evaluate(ctx) {
  const notes = []
  const seenDrug = new Set()
  for (const m of ctx.meds) {
    if (seenDrug.has(m.drug.id)) continue
    seenDrug.add(m.drug.id)
    ;(m.drug.admin || []).forEach((a, i) => {
      if (a.species && !a.species.includes(ctx.species)) return
      notes.push({
        id: `admin_${m.drug.id}_${i}`,
        kind: a.kind,
        drugIds: [m.drug.id],
        text: a.text,
        sources: a.sources || (a.source ? [a.source] : []),
      })
    })
    ;(m.drug.speciesCautions || []).forEach((c, i) => {
      if (c.species !== ctx.species || c.severity === 'contraindicated') return
      // Already a finding (SPECIES_HARDSTOP) for some line of this drug: no duplicate note.
      if (ctx.meds.some((o) => o.drug.id === m.drug.id && conditionalCautionApplies(c, o, ctx.species))) return
      notes.push({
        id: `caution_${m.drug.id}_${i}`,
        kind: 'monitoring',
        drugIds: [m.drug.id],
        text: T(`${enName(m.drug)}: ${c.text.en}`, `${koName(m.drug)}: ${c.text.ko}`),
        sources: c.source ? [c.source] : [],
      })
    })
  }
  if (ctx.input.pregnant || ctx.input.lactating) {
    notes.push({
      id: 'repro_not_checked',
      kind: 'monitoring',
      drugIds: [],
      text: T('Pregnancy/lactation is recorded, but no rule in this prototype checks reproductive safety. Review each drug separately.',
        '임신/수유 상태가 기록되었지만, 이 프로토타입에는 생식 안전성을 검토하는 규칙이 없습니다. 약물별로 따로 확인하십시오.'),
      sources: [],
    })
  }
  return { contributions: [], notes }
}

export default {
  ...RULE,
  layer: 'notes',
  name: T('Administration & monitoring notes', '투약·모니터링 안내'),
  sources: [],
  evaluate,
}
