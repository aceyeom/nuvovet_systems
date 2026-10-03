// Reviewer actions are client-side only (DESIGN_SYSTEM.md §5.3): localStorage['nv-claim-actions'] in
// try/catch, one list per claim, newest last. The backend is unchanged.
import { useCallback, useEffect, useState } from 'react'

export const ACTIONS_KEY = 'nv-claim-actions'
const EVENT = 'nv-claim-actions'

function readAll() {
  try {
    const v = JSON.parse(window.localStorage.getItem(ACTIONS_KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

function writeAll(all) {
  try {
    window.localStorage.setItem(ACTIONS_KEY, JSON.stringify(all))
    return true
  } catch {
    return false
  }
}

/** Local-time ISO string without the zone, e.g. "2026-10-03T14:05:09". */
function now() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function useClaimActions(claimId) {
  const [list, setList] = useState(() => readAll()[claimId] || [])
  useEffect(() => {
    setList(readAll()[claimId] || [])
    const on = () => setList(readAll()[claimId] || [])
    window.addEventListener(EVENT, on)
    window.addEventListener('storage', on)
    return () => {
      window.removeEventListener(EVENT, on)
      window.removeEventListener('storage', on)
    }
  }, [claimId])
  const add = useCallback(
    (entry) => {
      const all = readAll()
      const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: now(), ...entry }
      all[claimId] = [...(all[claimId] || []), item]
      const ok = writeAll(all)
      setList(all[claimId])
      window.dispatchEvent(new Event(EVENT))
      return ok
    },
    [claimId],
  )
  return { list, add }
}
