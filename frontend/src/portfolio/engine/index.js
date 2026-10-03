/**
 * Public API of the portfolio DUR engine and knowledge layer.
 * UI code should import from here (or the individual modules); nothing here
 * touches the network, the DOM or storage.
 */

/** Version of the engine's rule set and dose logic (spec D1–D17). */
export const ENGINE_VERSION = '1.2.0'

export { analyze, normalizeCase } from './engine.js'
export { buildOrganMatrix, organCell } from './organMatrix.js'
export { SEVERITIES, SEVERITY_META, severityRank, diffResults } from './findings.js'
export {
  FREQUENCIES, FREQUENCY_BY_ID, normalizeFrequency, perDayFactor, bsaM2, MEEH_K,
  computeAmount, bestStrength, rankStrengths, planForStrength, compareWithProtocol, buildDoseRow, ROUNDING_TOLERANCE,
  BOUND_TOLERANCE, splitStep, exposure24hPerKg,
} from './dose.js'
export { parseDoseUnit, convertMass, displayMass, fmtNum, fmtQty } from './units.js'
export { searchDrugs, searchBreeds, resolveBreed, decomposeHangul, extractInitials } from './search.js'
export { RULES, RULE_BY_ID, RULE_LAYERS } from './rules/index.js'
export { caseHash, canonicalJson, fnv1a } from './hash.js'

export { SOURCES, getSource, sourceHref, SOURCE_IDS } from '../knowledge/sources.js'
export { DRUGS, DRUG_BY_ID, getDrug, getProtocol, protocolsFor, getStrength } from '../knowledge/drugs.js'
export { BREEDS, BREED_BY_ID, isMdr1RiskBreed, MDR1_RISK_LABELS } from '../knowledge/breeds.js'
export { CONDITIONS, CONDITION_BY_ID, ORGANS, ORGAN_LABELS, CREATININE_UPPER, interpretLab } from '../knowledge/conditions.js'
export { ALLERGY_CLASSES, ALLERGY_BY_ID } from '../knowledge/allergyClasses.js'
export { CASES, CASE_BY_ID, BLANK_CASE_INPUT } from '../cases/cases.js'
