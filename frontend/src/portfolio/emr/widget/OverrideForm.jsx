/**
 * Override reasons form (EMR popup spec §3.9): a radiogroup of the coded reasons allowed for the
 * card's rules, a comment textarea and the 보호자 checkbox. Used inline in a panel card
 * ("예외 사유 입력 ▾") and inside the gate. Drafts live in the SDK per ackKey for the encounter,
 * so reopening the gate restores them (§3.8).
 *
 * Requirements by severity (validated by the SDK, `validateOverride`):
 *   contraindicated: reason + comment that passes the free-text check + owner checkbox
 *   major:           reason (comment only for NV-OTH); owner checkbox shown, optional, logged
 * NV-DATA never overrides: it emits fix-chart (the gate closes, nothing is logged).
 * Enter is never bound to submit: there is no <form>, every button is type="button".
 */

import { useId, useState } from 'react'
import { COMMENT_MESSAGE } from '../commentCheck.js'
import { t } from './strings.js'

export function OverrideForm({ card, dur, locale, mode, touchedAll = false, onRecorded }) {
  const id = useId()
  const [touched, setTouched] = useState(false)
  const ext = card.extension
  const draft = dur.getDraft(ext.ackKey)
  const set = (patch) => {
    setTouched(true)
    dur.setDraft(ext.ackKey, patch)
  }
  const v = dur.validate(card.uuid)
  const isContra = ext.severity === 'contraindicated'
  const isData = draft.reasonCode === 'NV-DATA'
  const otherChosen = draft.reasonCode === 'NV-OTH'
  const show = touched || touchedAll
  const messages = []
  if (show && !isData) {
    if (v.errors?.reason === 'reason_required') messages.push(t(locale, 'gate.err.reason'))
    if (v.errors?.reason === 'reason_not_allowed') messages.push(t(locale, 'gate.err.notAllowed'))
    if (v.errors?.comment) messages.push(COMMENT_MESSAGE[locale] || COMMENT_MESSAGE.ko)
    if (v.errors?.owner) messages.push(t(locale, 'gate.err.owner'))
  }
  const hint = isContra ? t(locale, 'gate.commentHint.contra') : otherChosen ? t(locale, 'gate.commentHint.other') : t(locale, 'gate.commentHint.optional')
  const legendId = `${id}-legend`
  const errId = `${id}-err`
  const name = `nv-reason-${mode}-${card.uuid}`

  const submit = () => {
    setTouched(true)
    const r = dur.override(card.uuid)
    if (r.ok && onRecorded) onRecorded(r.entry)
  }

  return (
    <div className="nv-override" data-nv-override={card.uuid}>
      <fieldset>
        <legend id={legendId}>{t(locale, 'gate.reason')}</legend>
        <div className="nv-radio-list" role="radiogroup" aria-labelledby={legendId} aria-required="true">
          {card.overrideReasons.map((r) => (
            <label key={r.code} className="nv-radio" data-nodata={r.code === 'NV-DATA' ? '' : undefined}>
              <input
                type="radio"
                name={name}
                value={r.code}
                checked={draft.reasonCode === r.code}
                onChange={() => set({ reasonCode: r.code })}
              />
              <span>{r.display}</span>
              <span className="nv-code nv-id">{r.code}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {isData ? (
        <div className="nv-field">
          <p className="nv-hint">{t(locale, 'gate.dataHint')}</p>
          <div>
            <button type="button" className="nv-btn nv-btn-secondary" onClick={() => dur.fixChart(ext.fixField)}>
              {t(locale, 'card.fixChart')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <label className="nv-field">
            <span className="nv-field-label">
              {t(locale, 'gate.comment')}
              <span className="nv-hint">{hint}</span>
            </span>
            <textarea
              className="nv-textarea"
              rows={2}
              value={draft.comment}
              aria-invalid={show && v.errors?.comment ? 'true' : undefined}
              aria-describedby={errId}
              onChange={(e) => set({ comment: e.target.value })}
              onBlur={() => setTouched(true)}
            />
          </label>
          {ext.severity === 'contraindicated' || ext.severity === 'major' ? (
            <label className="nv-check">
              <input type="checkbox" checked={Boolean(draft.ownerInformed)} onChange={(e) => set({ ownerInformed: e.target.checked })} />
              <span>{t(locale, 'gate.owner')}</span>
            </label>
          ) : null}
          {mode === 'panel' ? (
            <div>
              <button type="button" className="nv-btn nv-btn-secondary" disabled={!v.valid} onClick={submit}>
                {t(locale, 'card.overrideSubmit')}
              </button>
            </div>
          ) : null}
        </>
      )}
      <div id={errId} className="nv-errors" aria-live="polite">
        {messages.join(' ')}
      </div>
    </div>
  )
}
