/**
 * Organ Burden Aggregator
 *
 * Aggregates per-drug organ burden scores across all drugs for a given species.
 * Applies dose scaling (same logic as OrganLoadIndicator).
 * Produces cumulative scores for the AnatomyDiagram component.
 */

const ORGAN_KEYS = ['brain', 'heart', 'liver', 'kidney', 'blood'];

/**
 * Extract the numeric score from an organ burden entry.
 * Handles both formats:
 *   - New enriched: { score: 75, keywords: [...], evidence: "..." }
 *   - Legacy flat:  75 (plain number)
 *
 * @param {number|{score: number}|null|undefined} entry
 * @returns {number|null}
 */
function extractScore(entry) {
  if (entry == null) return null;
  if (typeof entry === 'number') return entry;
  if (typeof entry === 'object' && entry.score != null) return entry.score;
  return null;
}

/**
 * Extract keywords array from an organ burden entry.
 * @param {number|{keywords?: string[]}|null|undefined} entry
 * @returns {string[]}
 */
function extractKeywords(entry) {
  if (entry != null && typeof entry === 'object' && Array.isArray(entry.keywords)) {
    return entry.keywords;
  }
  return [];
}

/**
 * Extract evidence string from an organ burden entry.
 * @param {number|{evidence?: string}|null|undefined} entry
 * @returns {string}
 */
function extractEvidence(entry) {
  if (entry != null && typeof entry === 'object' && typeof entry.evidence === 'string') {
    return entry.evidence;
  }
  return '';
}

/**
 * Compute dose modifier for a drug (same as OrganLoadIndicator logic).
 * @param {{dosePerKg?: number, defaultDose?: {dog?: number, cat?: number}}} drug
 * @param {'dog'|'cat'} species
 * @returns {{modifier: number, applied: boolean}}
 */
function computeDoseModifier(drug, species) {
  const prescribedDose = drug.dosePerKg ?? 0;
  const standardDose = drug.defaultDose?.[species] ?? null;

  if (prescribedDose > 0 && standardDose != null && standardDose > 0) {
    const modifier = Math.min(Math.max(prescribedDose / standardDose, 0.5), 2.0);
    return { modifier, applied: true };
  }
  return { modifier: 1.0, applied: false };
}

/**
 * Aggregate organ burden scores across all drugs for a given species.
 *
 * @param {Array} drugs - Drug objects with organBurden property
 * @param {'dog'|'cat'|null} species
 * @returns {{
 *   brain:  {finalScore: number|null, contributingDrugs: Array, keywords: string[], evidence: string},
 *   heart:  {finalScore: number|null, contributingDrugs: Array, keywords: string[], evidence: string},
 *   liver:  {finalScore: number|null, contributingDrugs: Array, keywords: string[], evidence: string},
 *   kidney: {finalScore: number|null, contributingDrugs: Array, keywords: string[], evidence: string},
 *   blood:  {finalScore: number|null, contributingDrugs: Array, keywords: string[], evidence: string},
 * }}
 */
export function aggregateOrganBurden(drugs, species) {
  const result = {};

  for (const organ of ORGAN_KEYS) {
    result[organ] = {
      finalScore: null,
      contributingDrugs: [],
      keywords: [],
      evidence: '',
    };
  }

  if (!species || !drugs || drugs.length === 0) return result;

  for (const organ of ORGAN_KEYS) {
    let cumulativeScore = 0;
    let hasAnyData = false;
    const allKeywords = new Set();
    let bestEvidence = '';
    let bestEvidenceScore = -1;

    for (const drug of drugs) {
      const organData = drug.organBurden?.[species];
      if (!organData) continue;

      const entry = organData[organ];
      const baseScore = extractScore(entry);
      if (baseScore === null) continue;

      hasAnyData = true;
      const { modifier, applied } = computeDoseModifier(drug, species);
      const scaledScore = Math.round(baseScore * modifier);

      cumulativeScore += scaledScore;

      result[organ].contributingDrugs.push({
        drugId: drug.id,
        drugName: drug.name || drug.nameEn || drug.id,
        baseScore,
        scaledScore,
        doseScalingApplied: applied,
      });

      // Merge keywords
      for (const kw of extractKeywords(entry)) {
        allKeywords.add(kw);
      }

      // Keep evidence from the highest-scoring drug for this organ
      const ev = extractEvidence(entry);
      if (ev && baseScore > bestEvidenceScore) {
        bestEvidence = ev;
        bestEvidenceScore = baseScore;
      }
    }

    result[organ].finalScore = hasAnyData ? cumulativeScore : null;
    result[organ].keywords = [...allKeywords];
    result[organ].evidence = bestEvidence;
  }

  return result;
}

/**
 * Get the burden level label for a score.
 * @param {number|null} score
 * @returns {'none'|'low'|'moderate'|'high'|'critical'|'nodata'}
 */
export function getBurdenLevel(score) {
  if (score === null) return 'nodata';
  if (score <= 20) return 'none';
  if (score <= 40) return 'low';
  if (score <= 60) return 'moderate';
  if (score <= 85) return 'high';
  return 'critical';
}

/**
 * Get the CSS color variable for an organ burden score.
 * Returns a pattern reference for null (no data).
 * @param {number|null} score
 * @returns {string}
 */
export function getBurdenColor(score) {
  if (score === null) return 'url(#noDataPattern)';
  if (score <= 20) return 'var(--color-burden-none)';
  if (score <= 40) return 'var(--color-burden-low)';
  if (score <= 60) return 'var(--color-burden-moderate)';
  if (score <= 85) return 'var(--color-burden-high)';
  return 'var(--color-burden-critical)';
}

/** MDR1-sensitive breed list (case-insensitive partial match) */
export const MDR1_SENSITIVE_BREEDS = [
  'collie',
  'shetland sheepdog',
  'sheltie',
  'australian shepherd',
  'border collie',
  'old english sheepdog',
  'long-haired whippet',
  'german shepherd',
];

/**
 * Check if a breed is MDR1-sensitive.
 * @param {string|null|undefined} breed
 * @returns {boolean}
 */
export function isMdr1SensitiveBreed(breed) {
  if (!breed) return false;
  const lower = breed.toLowerCase().trim();
  return MDR1_SENSITIVE_BREEDS.some(b => lower.includes(b) || b.includes(lower));
}
