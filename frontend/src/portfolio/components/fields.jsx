/** Form primitives shared by the patient panel and the prescription editor. */

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

function parseNum(text) {
  const s = String(text ?? '').trim().replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

/** "0", "0.", "0.0" — a positive number may still be on its way. */
function isZeroish(text) {
  return /^0*[.,]?0*$/.test(String(text ?? '').trim())
}

/**
 * Validity of typed text: { value, invalid, pending }.
 *  value    the number to commit (null when blank or invalid)
 *  invalid  not a number, below min, or (positive) not above 0
 *  pending  "0." while typing a positive value: invalid, but not flagged until blur
 */
export function checkNumber(text, { min = 0, positive = false } = {}) {
  const n = parseNum(text)
  if (n === undefined) return { value: null, invalid: true, pending: false }
  if (n == null) return { value: null, invalid: false, pending: false }
  if (min != null && n < min) return { value: null, invalid: true, pending: false }
  if (positive && n <= 0) return { value: null, invalid: true, pending: isZeroish(text) }
  return { value: n, invalid: false, pending: false }
}

/**
 * Numeric input that keeps the typed text (so "2." or "0.0" can be typed)
 * and commits a number, or null when cleared. Invalid text (not a number,
 * below min, or not above 0 when `positive`) is flagged with aria-invalid and
 * `invalidText`, and commits null — so nothing downstream keeps showing an
 * amount calculated from the previous, now overwritten, value.
 */
export function NumberInput({ value, onCommit, id, min = 0, positive = false, invalidText = null, suffix = null, ariaLabel, ariaDescribedBy, className = '', inputMode = 'decimal', placeholder }) {
  const [text, setText] = useState(value == null ? '' : String(value))
  const [editing, setEditing] = useState(false)
  const committed = useRef(value ?? null)
  const msgId = useId()
  useEffect(() => {
    // Only react to external value changes (reset, a pasted link), not to our own commits.
    if ((value ?? null) === committed.current) return
    committed.current = value ?? null
    setText(value == null ? '' : String(value))
  }, [value])
  const state = checkNumber(text, { min, positive })
  const invalid = state.invalid && !(state.pending && editing)
  const describedBy = [ariaDescribedBy, invalid && invalidText ? msgId : null].filter(Boolean).join(' ') || undefined
  return (
    <span className={`pf-numfield ${className}`.trim()}>
      <span className={`pf-input-group${invalid ? ' is-invalid' : ''}`}>
        <input
          id={id}
          className="pf-input pf-num"
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const next = e.target.value
            setText(next)
            setEditing(true)
            const { value: n } = checkNumber(next, { min, positive })
            if (n === committed.current) return
            committed.current = n
            onCommit(n)
          }}
          onBlur={() => setEditing(false)}
        />
        {suffix != null && <span className="pf-input-suffix">{suffix}</span>}
      </span>
      {invalid && invalidText && <span className="pf-field-msg" id={msgId}>{invalidText}</span>}
    </span>
  )
}

export function Select({ value, onChange, children, id, ariaLabel, className = '', disabled = false }) {
  return (
    <span className={`pf-select ${className}`.trim()}>
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} disabled={disabled}>
        {children}
      </select>
      <ChevronDown size={14} aria-hidden="true" className="pf-select__chev" />
    </span>
  )
}

export function Field({ label, htmlFor, children, hint = null, className = '' }) {
  return (
    <div className={`pf-field ${className}`.trim()}>
      {label && <label className="pf-label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint}
    </div>
  )
}

/**
 * Segmented control with radio semantics: one tab stop, arrow keys move the
 * selection (ARIA radiogroup pattern). options: [{ value, label, icon }]
 */
export function Segmented({ value, onChange, options, ariaLabel, size = 'md', className = '' }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  const onKeyDown = (e) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = (idx + dir + options.length) % options.length
    onChange(options[next].value)
    const btns = e.currentTarget.querySelectorAll('[role="radio"]')
    btns[next]?.focus()
  }
  return (
    <div className={`pf-seg pf-seg--${size} ${className}`.trim()} role="radiogroup" aria-label={ariaLabel} onKeyDown={onKeyDown}>
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={i === idx ? 0 : -1}
          className={value === o.value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
          lang={o.lang}
          title={o.title}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Checkbox({ checked, onChange, label }) {
  const id = useId()
  return (
    <span className="pf-check">
      <input id={id} type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </span>
  )
}
