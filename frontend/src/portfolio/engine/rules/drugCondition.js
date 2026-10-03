/**
 * DRUG_CONDITION — a drug with a recorded contraindication or warning for a
 * condition on the patient's problem list (drugs[].conditionCautions), e.g.
 *   fluoxetine + epilepsy/seizure history  → contraindicated (Reconcile label)
 *   phenobarbital + hepatic dysfunction    → contraindicated (IVETF consensus, Bhatti 2015)
 *   NSAID + history of GI ulceration       → major (NSAID class warning)
 * Severity, text and source come from the knowledge entry; the rule only matches
 * the condition and species.
 */

import { CONDITION_BY_ID } from '../../knowledge/conditions.js'
import { SOURCES } from '../../knowledge/sources.js'
import { T, enName, koName, josa, lc, SPECIES_TEXT } from './util.js'

const RULE = { id: 'DRUG_CONDITION', version: '1.0.0' }

function evaluate(ctx) {
  const contributions = []
  const seen = new Set()
  for (const m of ctx.meds) {
    for (const c of m.drug.conditionCautions || []) {
      if (!ctx.conditions.has(c.condition)) continue
      if (c.species && !c.species.includes(ctx.species)) continue
      const cond = CONDITION_BY_ID[c.condition]
      if (!cond) continue
      const problemKey = `cond:${m.drug.id}:${c.condition}`
      if (seen.has(problemKey)) continue
      seen.add(problemKey)
      const sp = SPECIES_TEXT[ctx.species]
      contributions.push({
        ruleId: RULE.id,
        ruleVersion: RULE.version,
        severity: c.severity,
        problemKey,
        drugIds: [m.drug.id],
        factors: [{ kind: 'condition', id: c.condition, label: cond.label }],
        title: T(`${enName(m.drug)} with ${lc(cond.label.en)}`, `${josa(cond.label.ko, '이/가')} 있는 ${sp.ko}에게 ${koName(m.drug)}`),
        consequence: c.consequence || c.text,
        why: [c.text],
        actions: c.actions || [T('Review whether this drug is appropriate for this patient.', '이 환자에게 이 약물이 적절한지 검토하십시오.')],
        alternatives: c.alternatives || [],
        sources: [c.source],
        evidence: SOURCES[c.source]?.kind === 'label' ? 'label' : 'literature',
        ownerSigns: m.drug.ownerSigns || [],
        organs: cond.organs || [],
        inputs: [
          { fact: 'conditions', value: c.condition },
          { fact: `conditionCautions.${m.drug.id}`, value: `${c.condition}: ${c.severity}`, source: c.source },
        ],
      })
    }
  }
  return { contributions }
}

export default {
  ...RULE,
  layer: 'drug_disease',
  name: T('Drug–condition cautions', '약물–질환 주의'),
  sources: ['reconcile_label', 'bhatti2015', 'metacam_label', 'rimadyl_label', 'onsior_label'],
  evaluate,
}
