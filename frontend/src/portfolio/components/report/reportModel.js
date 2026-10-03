/** Report helpers: deterministic report ID and the list of sources the report cites. */

import { caseHash } from '../../engine/hash.js'
import { compactInput, sanitizeInput } from '../caseModel.js'
import { SOURCES } from '../../knowledge/sources.js'

/**
 * Deterministic ID for a case input (FNV-1a over canonical JSON of the
 * normalised input): the same inputs always give the same ID, any edit gives
 * a different one. A label, not a security hash.
 */
export function reportId(input) {
  return caseHash(compactInput(sanitizeInput(input)))
}

/** Source ids cited by the findings, notes and dose references, in order of first use. */
export function citedSources(result) {
  const ids = []
  const add = (id) => { if (id && SOURCES[id] && !ids.includes(id)) ids.push(id) }
  for (const f of result.findings) f.sources.forEach(add)
  for (const d of result.doses) add(d.ref?.source)
  for (const n of result.notes) (n.sources || []).forEach(add)
  return ids
}
