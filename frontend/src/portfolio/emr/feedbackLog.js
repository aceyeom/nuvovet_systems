/**
 * Acknowledgement log (EMR popup spec §3.10): CDS Hooks Feedback entries kept in
 * memory and mirrored to localStorage['nv-dur-log'] inside try/catch, capped at
 * 200 entries (oldest dropped). The log works identically when storage throws
 * or is absent. No network.
 */

export const LOG_KEY = 'nv-dur-log'
export const LOG_CAP = 200

function defaultStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

/**
 * createFeedbackLog({ storage?, key?, cap? }) → { add, all, forEncounter, isAcknowledged, export, clear(encounterId?) }
 * `storage` is a Storage-like object ({ getItem, setItem, removeItem }) or null for memory only.
 */
/** Does this log entry acknowledge its card? (see isAcknowledged) */
export function isAck(e, blocking = false) {
  if (e.outcome === 'overridden') return true
  return !blocking && e.outcome === 'accepted' && !e.acceptedSuggestions?.length
}

/** Entries kept when one encounter's log is cleared. */
const otherEncounter = (encounterId) => (e) => e.extension?.encounterId !== encounterId

export function createFeedbackLog({ storage = defaultStorage(), key = LOG_KEY, cap = LOG_CAP } = {}) {
  let entries = []
  try {
    const raw = storage?.getItem(key)
    const parsed = raw ? JSON.parse(raw) : null
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.feedback) ? parsed.feedback : []
    entries = list.filter((e) => e && typeof e === 'object').slice(-cap)
  } catch {
    entries = []
  }
  const persist = () => {
    try {
      storage?.setItem(key, JSON.stringify(entries))
    } catch {
      // storage full, blocked or throwing: the in-memory log stays authoritative
    }
  }
  return {
    add(entry) {
      entries.push(entry)
      if (entries.length > cap) entries = entries.slice(entries.length - cap)
      persist()
      return entry
    },
    all() {
      return entries.slice()
    },
    forEncounter(encounterId) {
      return encounterId == null ? entries.slice() : entries.filter((e) => e.extension?.encounterId === encounterId)
    },
    /**
     * True when this encounter acknowledged the ackKey (§3.5 dedupe): `overridden`, or for a
     * non-blocking card also a plain `accepted` (확인함). Accepting a suggestion is never an
     * acknowledgement: it only says what the vet chose to change, and the change itself is
     * re-checked (review F2). A blocking card is silenced only by an override.
     */
    isAcknowledged(encounterId, ackKey, { blocking = false } = {}) {
      return entries.some((e) => e.extension?.encounterId === encounterId && e.extension?.ackKey === ackKey && isAck(e, blocking))
    },
    export() {
      return JSON.stringify({ feedback: entries }, null, 2)
    },
    /** clear() empties the log; clear(encounterId) removes that encounter's entries only. */
    clear(encounterId) {
      if (encounterId != null) {
        entries = entries.filter(otherEncounter(encounterId))
        persist()
        return
      }
      entries = []
      try {
        storage?.removeItem(key)
      } catch {
        // ignore
      }
    },
  }
}
