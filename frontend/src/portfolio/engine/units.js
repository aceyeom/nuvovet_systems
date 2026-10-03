/**
 * Quantity parsing and conversion. Pure functions, no I/O.
 *
 * Mass units are normalised to mg internally:  g = 1000 mg, mg = 1, mcg = 0.001 mg.
 * IU is its own dimension and never converts to mass.
 * Count units (tablet, capsule, chewable, pipette, application) are their own dimension.
 */

const MASS_TO_MG = { g: 1000, mg: 1, mcg: 0.001 }
const MASS_ALIASES = {
  g: 'g', gram: 'g', grams: 'g',
  mg: 'mg', milligram: 'mg', milligrams: 'mg',
  mcg: 'mcg', 'µg': 'mcg', 'μg': 'mcg', ug: 'mcg', microgram: 'mcg', micrograms: 'mcg',
}
const VOLUME_ALIASES = { ml: 'mL', 'mℓ': 'mL', cc: 'mL', l: 'L' }
const COUNT_ALIASES = {
  tablet: 'tablet', tablets: 'tablet', tab: 'tablet', tabs: 'tablet', '정': 'tablet',
  capsule: 'capsule', capsules: 'capsule', cap: 'capsule', '캡슐': 'capsule',
  chewable: 'chewable', chewables: 'chewable', '츄어블': 'chewable',
  pipette: 'pipette', pipettes: 'pipette', '피펫': 'pipette',
  application: 'application', applications: 'application',
}

export function normaliseMassUnit(u) {
  if (!u) return null
  return MASS_ALIASES[String(u).trim().toLowerCase()] || MASS_ALIASES[String(u).trim()] || null
}

/**
 * Parse a dose unit string into its parts.
 *   'mcg/kg' → { dimension:'mass', numerator:'mcg', basis:'per_kg' }
 *   'mg'     → { dimension:'mass', numerator:'mg',  basis:'per_animal' }
 *   'mg/m2'  → { dimension:'mass', numerator:'mg',  basis:'per_m2' }
 *   'IU/kg'  → { dimension:'iu',   numerator:'IU',  basis:'per_kg' }
 *   'mL'     → { dimension:'volume', numerator:'mL', basis:'per_animal' }
 *   'tablet' → { dimension:'count', numerator:'tablet', basis:'per_animal' }
 * Returns null for anything unrecognised (never guesses).
 */
export function parseDoseUnit(unit) {
  if (!unit || typeof unit !== 'string') return null
  const raw = unit.trim().replace(/²/g, '2').replace(/\s+/g, '')
  const [numRaw, denRaw] = raw.split('/')
  let basis = 'per_animal'
  if (denRaw !== undefined) {
    const den = denRaw.toLowerCase()
    if (den === 'kg') basis = 'per_kg'
    else if (den === 'm2' || den === 'm^2') basis = 'per_m2'
    else if (['dog', 'cat', 'animal', 'head', '두', '마리'].includes(den)) basis = 'per_animal'
    else return null
  }
  if (/^iu$/i.test(numRaw)) return { dimension: 'iu', numerator: 'IU', basis }
  const mass = normaliseMassUnit(numRaw)
  if (mass) return { dimension: 'mass', numerator: mass, basis }
  const vol = VOLUME_ALIASES[numRaw.toLowerCase()]
  if (vol) return { dimension: 'volume', numerator: vol, basis }
  const count = COUNT_ALIASES[numRaw.toLowerCase()] || COUNT_ALIASES[numRaw]
  if (count) return { dimension: 'count', numerator: count, basis }
  return null
}

/** Convert a mass value between g / mg / mcg. Returns null for non-mass units. */
export function convertMass(value, from, to) {
  const f = MASS_TO_MG[normaliseMassUnit(from)]
  const t = MASS_TO_MG[normaliseMassUnit(to)]
  if (f == null || t == null || value == null || Number.isNaN(Number(value))) return null
  return fixFloat((Number(value) * f) / t)
}

export function toMg(value, unit) {
  return convertMass(value, unit, 'mg')
}

export function volumeToMl(value, unit) {
  const u = VOLUME_ALIASES[String(unit || '').toLowerCase()]
  if (u === 'mL') return Number(value)
  if (u === 'L') return Number(value) * 1000
  return null
}

/** Concentration of a strength in mg per mL, or null if it is not a liquid. */
export function concentrationMgPerMl(strength) {
  if (!strength?.per || strength.per.unit !== 'mL') return null
  const mg = toMg(strength.amount.value, strength.amount.unit)
  if (mg == null || !strength.per.value) return null
  return fixFloat(mg / strength.per.value)
}

/** Remove binary floating-point noise (0.1 + 0.2 → 0.3). */
export function fixFloat(x) {
  if (x == null || !Number.isFinite(x)) return x
  return Number.parseFloat(Number(x).toPrecision(12))
}

/** Round to n significant figures. */
export function roundSig(x, n = 3) {
  if (x == null || !Number.isFinite(x) || x === 0) return x
  const d = Math.ceil(Math.log10(Math.abs(x)))
  const p = n - d
  const m = Math.pow(10, p)
  return fixFloat(Math.round(x * m) / m)
}

/** Human-readable number: up to 3 significant figures, no trailing zeros. */
export function fmtNum(x, sig = 3) {
  if (x == null || !Number.isFinite(x)) return '—'
  const r = Math.abs(x) >= 1000 ? Math.round(x) : roundSig(x, sig)
  return String(r)
}

/**
 * Pick a display unit for a mass given in mg. Returns { value, unit }.
 *  prefer 'mcg' (dose entered in mcg): mcg below 1000 mcg, otherwise mg
 *  prefer 'mg'  (dose entered in mg):  always mg (0.625 mg stays 0.625 mg)
 *  prefer 'g':                          g
 *  no preference: < 1 mg → mcg, ≥ 1000 mg → g, else mg
 */
export function displayMass(mg, prefer = null) {
  if (mg == null || !Number.isFinite(mg)) return { value: null, unit: 'mg' }
  if (prefer === 'mcg') return Math.abs(mg) < 1 ? { value: fixFloat(mg * 1000), unit: 'mcg' } : { value: fixFloat(mg), unit: 'mg' }
  if (prefer === 'mg') return { value: fixFloat(mg), unit: 'mg' }
  if (prefer === 'g') return { value: fixFloat(mg / 1000), unit: 'g' }
  if (mg !== 0 && Math.abs(mg) < 1) return { value: fixFloat(mg * 1000), unit: 'mcg' }
  if (Math.abs(mg) >= 1000) return { value: fixFloat(mg / 1000), unit: 'g' }
  return { value: fixFloat(mg), unit: 'mg' }
}

export function fmtQty(q) {
  if (!q || q.value == null) return '—'
  return `${fmtNum(q.value)} ${q.unit}`
}
