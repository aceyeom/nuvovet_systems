import { useMemo } from 'react'
import { analyze } from '../../engine/engine.js'
import { resolveCase, stateParam } from '../caseModel.js'

/**
 * Resolve the route's case (golden id or 'custom', plus any `?s=` state) and
 * run the engine on it. Report and handout pages read the same case the
 * workbench link carried.
 */
export default function useCaseResult(route) {
  const id = route.params.id
  const s = route.query.s || ''
  return useMemo(() => {
    const resolved = resolveCase(id, { s })
    if (resolved.notFound) return { notFound: true, id }
    const result = analyze(resolved.input)
    return { ...resolved, result, sParam: stateParam(resolved.input, resolved.base) }
  }, [id, s])
}
