// Cached loaders and React hooks for the console. Each resource loads once per page session and is
// shared by every screen (the live API when reachable, else the snapshot; see claimsApi.js).
import { useCallback, useEffect, useState } from 'react'
import { loadClaimDetail, loadDemo, loadEvaluation, loadProcedures } from '../claimsApi'
import { toClaimModel } from '../preview/model.js'

const cache = new Map()

function once(key, fn) {
  if (!cache.has(key)) {
    const p = fn().catch((e) => {
      cache.delete(key)
      throw e
    })
    cache.set(key, p)
  }
  return cache.get(key)
}

export function useResource(key, fn) {
  const [state, setState] = useState({ loading: !!key, data: null, error: null })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (!key) {
      setState({ loading: false, data: null, error: null })
      return undefined
    }
    let alive = true
    setState((s) => ({ loading: true, data: s.data && s.key === key ? s.data : null, error: null, key }))
    once(key, fn)
      .then((data) => alive && setState({ loading: false, data, error: null, key }))
      .catch((error) => alive && setState({ loading: false, data: null, error, key }))
    return () => {
      alive = false
    }
    // fn is keyed by `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce])
  const reload = useCallback(() => {
    cache.delete(key)
    setNonce((n) => n + 1)
  }, [key])
  return { ...state, reload }
}

export const useDemo = () => useResource('demo', loadDemo)
export const useEvaluation = () => useResource('evaluation', loadEvaluation)
export const useProcedures = () => useResource('procedures', loadProcedures)

/** Claim detail as a claim model (null when the claim does not exist). */
export function useClaim(claimId) {
  return useResource(claimId ? `claim:${claimId}` : null, () =>
    loadClaimDetail(claimId).then((d) => (d ? { source: d.source, model: toClaimModel(d) } : null)),
  )
}
