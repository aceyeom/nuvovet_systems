/**
 * Field (§4.6): visible label above the control, help text-xs muted, error text-xs critical with an
 * icon, linked through aria-describedby. Placeholder-only inputs are banned.
 */
import { Children, cloneElement, isValidElement, useId, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Label } from '@/ui/primitives/label'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText, InputGroupTextarea } from '@/ui/primitives/input-group'
import { fmtNum } from '@/ui/lib/format'

const CONTROL_TYPES = new Set([InputGroupInput, InputGroupTextarea])

/**
 * The element that receives the label's id and the aria-* props. A plain control gets them itself; an
 * InputGroup (a role="group" div) passes them on to its first InputGroupInput / InputGroupTextarea, so
 * the <label for> points at the real input (REQUEST WP7).
 */
function withControlProps(child, make) {
  if (!isValidElement(child)) return { node: child, id: undefined }
  if (child.type !== InputGroup) {
    const p = make(child.props)
    return { node: cloneElement(child, p), id: p.id }
  }
  let id
  const walk = (nodes) =>
    Children.map(nodes, (n) => {
      if (id !== undefined || !isValidElement(n)) return n
      if (CONTROL_TYPES.has(n.type) || n.props?.['data-slot'] === 'input-group-control') {
        const p = make(n.props)
        id = p.id
        return cloneElement(n, p)
      }
      return n.props?.children ? cloneElement(n, undefined, walk(n.props.children)) : n
    })
  const children = walk(child.props.children)
  return { node: cloneElement(child, undefined, children), id }
}

export function Field({ label, help, error, required, id: idProp, className, children }) {
  const auto = useId()
  const id = idProp || `f${auto.replace(/:/g, '')}`
  const helpId = help ? `${id}-help` : undefined
  const errId = error ? `${id}-err` : undefined
  const describedBy = [helpId, errId].filter(Boolean).join(' ') || undefined
  const child = Children.only(children)
  const { node: control, id: controlId } = withControlProps(child, (p) => ({
    id: p.id || id,
    'aria-describedby': [p['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined,
    'aria-invalid': error ? true : p['aria-invalid'],
    'aria-required': required || p['aria-required'] || undefined,
  }))
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={controlId || id} className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-muted-foreground"> (필수)</span> : null}
      </Label>
      {control}
      {help ? (
        <p id={helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="flex items-center gap-1 text-xs text-sev-critical">
          <CircleAlert aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Integer won input with thousands separators and a 원 suffix (no ₩). value: number | null. */
export function MoneyInput({ value, onChange, className, suffix = '원', ...props }) {
  const [focused, setFocused] = useState(false)
  const shown = value == null || Number.isNaN(value) ? '' : focused ? String(value) : fmtNum(value)
  return (
    <InputGroup className={className}>
      <InputGroupInput
        inputMode="numeric"
        autoComplete="off"
        className="num"
        value={shown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '')
          onChange?.(digits === '' ? null : Number(digits))
        }}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{suffix}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}
