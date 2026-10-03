import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/ui/theme'
import { useLang } from '../i18n/index.js'
import { loadVisit } from '../emr/fixtures.js'
import { toCdsRequest } from '../emr/cds.js'

/**
 * The case study's crop of the EMR DUR panel (DESIGN_SYSTEM.md §5.5: "same component as #/emr,
 * inert"). It is WP3's widget itself, created through the public `createDurWidget` API, docked into
 * this element and fed the same CDS request the EMR demo sends for the visit, so the crop can never
 * drift from the real panel. Inert: no focus, no pointer events, no gate; nothing is logged
 * (`storage: null`). The widget follows the site theme and language.
 */
export default function DurPanelPreview({ visitId = 'V1', label }) {
  const { lang } = useLang()
  const { resolved } = useTheme()
  const hostRef = useRef(null)
  const widgetRef = useRef(null)
  const [ready, setReady] = useState(false)
  const initial = useRef({ lang, resolved })

  useEffect(() => {
    let cancelled = false
    let widget = null
    import('../emr/widget/index.jsx').then(({ createDurWidget, OVERLAY_TAG }) => {
      if (cancelled || !hostRef.current) return
      const before = new Set(document.querySelectorAll(OVERLAY_TAG))
      widget = createDurWidget({
        locale: initial.current.lang,
        theme: initial.current.resolved,
        layout: 'docked',
        fonts: 'inherit',
        marker: false,
        storage: null,
      })
      widget.mount({ panel: hostRef.current })
      widget.check(toCdsRequest(loadVisit(visitId)))
      // The overlay (live region, gate) is never used by a picture of the panel: keep it out of the
      // accessibility tree so the crop does not announce a review on page load.
      for (const el of document.querySelectorAll(OVERLAY_TAG)) {
        if (!before.has(el)) el.setAttribute('inert', '')
      }
      widgetRef.current = widget
      setReady(true)
    })
    return () => {
      cancelled = true
      widgetRef.current = null
      widget?.unmount()
    }
  }, [visitId])

  useEffect(() => { widgetRef.current?.setLocale(lang) }, [lang, ready])
  useEffect(() => { widgetRef.current?.setTheme(resolved) }, [resolved, ready])

  return (
    <div role="img" aria-label={label} className="w-full max-w-[360px]">
      <div
        ref={hostRef}
        inert
        data-preview="dur-panel"
        className={ready ? 'overflow-hidden rounded-lg border border-border' : 'h-[480px] rounded-lg border border-border bg-popover'}
      />
    </div>
  )
}
