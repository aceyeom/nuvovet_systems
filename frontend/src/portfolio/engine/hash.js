/**
 * Deterministic short id for a case input (used as the report ID).
 * FNV-1a 32-bit over a canonical JSON serialisation (sorted keys). Not a
 * security hash — only a stable label for the same inputs.
 */

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().filter((k) => value[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

export function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** e.g. 'DUR-3F9A0C12' */
export function caseHash(caseInput) {
  return `DUR-${fnv1a(canonical(caseInput)).toString(16).toUpperCase().padStart(8, '0')}`
}

export { canonical as canonicalJson }
