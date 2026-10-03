/**
 * Form controls shared by the patient panel and the prescription editor, on the shared UI
 * (DESIGN_SYSTEM.md §4.6): every control has a visible label, help/error lines are linked with
 * aria-describedby, and numbers keep the typed text while committing a number (or null).
 */

import { useEffect, useId, useRef, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Label } from '@/ui/primitives/label'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/ui/primitives/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select'
import { Checkbox } from '@/ui/primitives/checkbox'

function parseNum(text) {
  const s = String(text ?? '').trim().replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

/** "0", "0.", "0.0": a positive number may still be on its way. */
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

/** Visible label above a control (§4.6). */
export function FieldLabel({ htmlFor, id, children, className }) {
  return (
    <Label htmlFor={htmlFor} id={id} className={cn('text-sm font-medium text-foreground', className)}>
      {children}
    </Label>
  )
}

/** Error line: text-xs critical with an icon. */
export function FieldError({ id, children }) {
  return (
    <p id={id} className="flex items-center gap-1 text-xs text-sev-critical">
      <CircleAlert aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
      {children}
    </p>
  )
}

/**
 * Numeric input that keeps the typed text (so "2." or "0.0" can be typed) and commits a number,
 * or null when cleared. Invalid text commits null, so nothing downstream keeps showing an amount
 * calculated from the previous value.
 */
export function NumberInput({
  value,
  onCommit,
  id,
  min = 0,
  positive = false,
  invalidText = null,
  suffix = null,
  ariaLabel,
  ariaDescribedBy,
  className,
  inputMode = 'decimal',
  placeholder,
}) {
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
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <InputGroup>
        <InputGroupInput
          id={id}
          className="num text-left"
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
        {suffix != null ? (
          <InputGroupAddon align="inline-end">
            <InputGroupText className="text-xs">{suffix}</InputGroupText>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {invalid && invalidText ? <FieldError id={msgId}>{invalidText}</FieldError> : null}
    </div>
  )
}

/** Labelled number field. */
export function NumberField({ label, id: idProp, className, ...props }) {
  const auto = useId()
  const id = idProp || `n${auto.replace(/:/g, '')}`
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NumberInput id={id} {...props} />
    </div>
  )
}

const NONE = '__none'

/**
 * Select on the vendored Radix Select. options: [{ value, label }]; a '' / null value is allowed
 * (Radix items cannot be empty, so it travels as a sentinel).
 */
export function SelectInput({ id, value, onChange, options, ariaLabel, ariaLabelledBy, placeholder, className, disabled = false, size = 'default' }) {
  const v = value == null || value === '' ? NONE : String(value)
  return (
    <Select value={v} onValueChange={(next) => onChange(next === NONE ? '' : next)} disabled={disabled}>
      <SelectTrigger id={id} size={size} aria-label={ariaLabel} aria-labelledby={ariaLabelledBy} className={cn('w-full min-w-0', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-80">
        {options.map((o) => {
          const ov = o.value == null || o.value === '' ? NONE : String(o.value)
          return (
            <SelectItem key={ov} value={ov}>
              {o.label}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

/** Labelled select. */
export function SelectField({ label, id: idProp, className, ...props }) {
  const auto = useId()
  const id = idProp || `s${auto.replace(/:/g, '')}`
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <SelectInput id={id} {...props} />
    </div>
  )
}

/** Checkbox with its label. */
export function CheckField({ checked, onChange, label, className }) {
  const id = useId()
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Checkbox id={id} checked={Boolean(checked)} onCheckedChange={(v) => onChange(v === true)} />
      <Label htmlFor={id} className="text-sm font-normal text-foreground">
        {label}
      </Label>
    </div>
  )
}
