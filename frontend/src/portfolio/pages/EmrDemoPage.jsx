/**
 * EMR demo route (EMR_DUR_POPUP_SPEC.md §2, §7):
 *   #/emr            → #/emr/V1
 *   #/emr/:visitId   one fictional visit V1–V10; an unknown id → #/emr/V1
 *   ?lang=en         widget locale (the host EMR stays Korean)
 *   ?theme=dark      widget theme (the host EMR stays light; the demo bar follows the site theme)
 *
 * The page replaces the portfolio header with the host's 40 px demo bar and lazy-loads the
 * fictional EMR together with the DUR widget (marker off: the demo bar carries the disclaimer).
 * Works the same in the main app (/dur#/emr/V1) and in the standalone file.
 */

import { Suspense, lazy, useEffect } from 'react'
import { navigate } from '../router.js'

const EmrApp = lazy(() => import('../emr/host/EmrApp.jsx'))

const VISIT_IDS = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10']

function withQuery(path, query) {
  const parts = Object.entries(query || {})
    .filter(([k, v]) => (k === 'lang' || k === 'theme') && v)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  return parts.length ? `${path}?${parts.join('&')}` : path
}

export default function EmrDemoPage({ route }) {
  const visitId = route?.params?.visitId ?? null
  const valid = VISIT_IDS.includes(visitId)
  const query = route?.query || {}

  useEffect(() => {
    if (!valid) navigate(withQuery('/emr/V1', query), { replace: true })
  }, [valid]) // eslint-disable-line react-hooks/exhaustive-deps

  // The fictional EMR is Korean whatever the showcase language is (?lang only changes the widget).
  useEffect(() => {
    const el = document.documentElement
    const prev = el.lang
    el.dataset.langLock = 'ko'
    el.lang = 'ko'
    return () => {
      delete el.dataset.langLock
      el.lang = prev
    }
  }, [])

  if (!valid) return <div className="min-h-dvh bg-background" />
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" aria-busy="true" />}>
      <EmrApp visitId={visitId} query={{ lang: query.lang, theme: query.theme }} />
    </Suspense>
  )
}
