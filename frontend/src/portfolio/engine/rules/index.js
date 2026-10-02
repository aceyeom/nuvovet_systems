/**
 * Rule registry, in evaluation order. Each rule module exports
 * { id, version, layer, name:{en,ko}, sources:[id], evaluate(ctx) → { contributions, notes? } }.
 * Layers: species_breed · pk · pd · drug_disease · patient · dose · notes.
 */

import MDR1_PGP_ML from './mdr1PgpMl.js'
import SPECIES_HARDSTOP from './speciesHardstop.js'
import ENRO_FELINE_RETINA from './enroFelineRetina.js'
import CYP3A_INHIBITION from './cyp3aInhibition.js'
import CYP_INDUCTION from './cypInduction.js'
import GASTRIC_PH_AZOLE from './gastricPhAzole.js'
import NSAID_CORTICOSTEROID from './nsaidCorticosteroid.js'
import NSAID_DUPLICATE from './nsaidDuplicate.js'
import SEROTONERGIC from './serotonergic.js'
import IMMUNOSUPPRESSION_ADDITIVE from './immunosuppressionAdditive.js'
import NSAID_RENAL from './nsaidRenal.js'
import METHIMAZOLE_CKD from './methimazoleCkd.js'
import DRUG_CONDITION from './drugCondition.js'
import RENAL_ADJUST from './renalAdjust.js'
import ALLERGY_CLASS from './allergyClass.js'
import DOSE_RANGE from './doseRange.js'
import ADMIN_NOTES from './adminNotes.js'

export const RULES = [
  MDR1_PGP_ML,
  SPECIES_HARDSTOP,
  ENRO_FELINE_RETINA,
  CYP3A_INHIBITION,
  CYP_INDUCTION,
  GASTRIC_PH_AZOLE,
  NSAID_CORTICOSTEROID,
  NSAID_DUPLICATE,
  SEROTONERGIC,
  IMMUNOSUPPRESSION_ADDITIVE,
  NSAID_RENAL,
  METHIMAZOLE_CKD,
  DRUG_CONDITION,
  RENAL_ADJUST,
  ALLERGY_CLASS,
  DOSE_RANGE,
  ADMIN_NOTES,
]

export const RULE_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r]))

export const RULE_LAYERS = {
  species_breed: { en: 'Species & breed', ko: '종·품종' },
  pk: { en: 'Pharmacokinetic interactions', ko: '약동학적 상호작용' },
  pd: { en: 'Pharmacodynamic interactions', ko: '약력학적 상호작용' },
  drug_disease: { en: 'Drug–disease', ko: '약물–질환' },
  patient: { en: 'Patient record', ko: '환자 기록' },
  dose: { en: 'Dose', ko: '용량' },
  notes: { en: 'Notes', ko: '안내' },
}
