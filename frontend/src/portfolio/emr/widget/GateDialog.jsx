/**
 * Gate at order-sign (EMR popup spec §3.8). A native <dialog> inside the overlay host's shadow
 * root, opened with showModal(): top layer above any host z-index, host page inert, Tab kept
 * inside. role="alertdialog", aria-labelledby = title, aria-describedby = first card's consequence.
 *
 * Focus: after showModal() the "처방으로 돌아가기" button is focused explicitly (React's autoFocus
 * sets no attribute, so showModal() would pick the first textarea). The <dialog> element itself
 * never unmounts; on every close path the controller calls dialog.close() first (index.jsx,
 * 'gate-close'), then returns focus to the element focused when gate() was called.
 *
 * Keys: Esc (handled on keydown, and the `cancel` event as a fallback), × and a backdrop click all
 * resolve { proceed: false }. Enter is never bound to override: no <form method="dialog">, every
 * button is type="button". Every key handler stops propagation so the panel and drawer never react.
 */

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Card, CollapsedCard } from './Card.jsx'
import { Badge, fmtKg, ic, stripConfirmPrefix, topSeverity } from './parts.jsx'
import { t } from './strings.js'
import { trapTab } from './focus.js'
import { useWidget } from './WidgetApp.jsx'

const MAX_EXPANDED = 3

export function GateDialog() {
  const { ctl, dur, s, locale } = useWidget()
  const gate = s.gate
  const ref = useRef(null)
  const backRef = useRef(null)
  const uid = useId()
  const [open, setOpen] = useState({})
  const titleId = `${uid}-title`
  const descId = `${uid}-desc`
  const key = gate ? gate.cards.map((k) => k.uuid).join('|') + (gate.encounterId || '') : ''

  const setRef = (el) => {
    ref.current = el
    ctl.registerDialog(el)
  }

  useLayoutEffect(() => {
    const d = ref.current
    if (!d) return
    if (gate && !d.open) {
      try { d.showModal() } catch { d.setAttribute('open', '') }
      backRef.current?.focus()
    } else if (!gate && d.open) {
      d.close()
    }
  }, [key, gate])

  useEffect(() => {
    const d = ref.current
    if (!d) return undefined
    const onCancel = (e) => {
      e.preventDefault()
      if (ctl.getSnapshot().core.gate) dur.closeGate()
    }
    d.addEventListener('cancel', onCancel)
    return () => d.removeEventListener('cancel', onCancel)
  }, [ctl, dur])

  const back = () => dur.closeGate()

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      back()
      return
    }
    if (e.key === 'Tab') trapTab(e, ref.current, ref.current?.getRootNode())
    e.stopPropagation()
  }
  const onClick = (e) => {
    if (e.target === ref.current) back()
  }

  let body = null
  if (gate) {
    const cards = gate.cards
    const top = topSeverity(cards)
    const p = gate.patient || {}
    const identity = [p.name, p.species, fmtKg(p.weightKg), p.breed].filter(Boolean).join(', ')
    const invalid = cards.filter((k) => !dur.validate(k.uuid).valid).length
    const can = dur.canProceed()
    const confirm = gate.confirm || []
    const extra = cards.length - MAX_EXPANDED
    body = (
      <>
        <div className="nv-gate-head">
          <div className="nv-gate-title">
            {top ? <Badge status={top} size="md" locale={locale} /> : null}
            <h2 id={titleId}>{t(locale, 'gate.title', { n: cards.length })}</h2>
            <button type="button" className="nv-btn nv-btn-ghost nv-btn-icon" aria-label={t(locale, 'gate.close')} onClick={back}>
              <X {...ic(16)} />
            </button>
          </div>
          {identity ? <p className="nv-gate-id">{identity}</p> : null}
        </div>
        <div className="nv-gate-body">
          {cards.map((k, i) => {
            const expanded = i < MAX_EXPANDED || open[k.uuid]
            return (
              <div key={k.uuid} className="nv-card-wrap">
                {i === MAX_EXPANDED ? <p className="nv-hint nv-gate-more">{t(locale, 'gate.more', { n: extra })}</p> : null}
                {expanded ? (
                  <Card card={k} locale={locale} dur={dur} mode="gate" consequenceId={i === 0 ? descId : undefined} />
                ) : (
                  <CollapsedCard card={k} locale={locale} onExpand={() => setOpen((m) => ({ ...m, [k.uuid]: true }))} />
                )}
              </div>
            )
          })}
        </div>
        {confirm.length ? (
          <p className="nv-gate-confirm">
            {t(locale, 'gate.confirm', { n: confirm.length })}
            {': '}
            {confirm.map((x) => (x.kind === 'visit' ? x.text : `${x.drugName || x.code || ''} ${stripConfirmPrefix(x.text)}`.trim())).join('; ')}
          </p>
        ) : null}
        <div className="nv-gate-foot">
          {!can && invalid ? <span className="nv-hint" aria-live="polite">{t(locale, 'gate.remaining', { n: invalid })}</span> : null}
          <button type="button" className="nv-btn nv-btn-md nv-btn-outline" disabled={!can} onClick={() => dur.proceed()} data-nv="proceed">
            {t(locale, 'gate.proceed')}
          </button>
          <button ref={backRef} type="button" className="nv-btn nv-btn-md nv-btn-primary" onClick={back} data-nv="back">
            {t(locale, 'gate.back')}
          </button>
        </div>
      </>
    )
  }

  return (
    <dialog
      ref={setRef}
      className="nv-gate"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={gate ? titleId : undefined}
      aria-describedby={gate && gate.cards[0]?.extension?.consequence ? descId : undefined}
      onKeyDown={onKeyDown}
      onClick={onClick}
    >
      {body}
    </dialog>
  )
}
