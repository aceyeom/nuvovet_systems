/**
 * Number inputs for the clinic form grids (WP7). Right-aligned tabular figures; the column header carries
 * the unit ("단가 (원)"), so there is no suffix. For a single labelled amount use the shared MoneyInput.
 *
 *   IntegerInput  value: number | '' ; shows "12,000" when not focused, digits only while editing
 *   DecimalInput  value: number | string | '' ; keeps what is typed (digits and one dot)
 */
import { useState } from 'react'
import { cn } from '@/ui/cn'
import { Input } from '@/ui/primitives/input'
import { fmtNum } from '@/ui/lib/format'

const toNumber = (v) => (v === '' || v == null ? NaN : Number(v))

export function IntegerInput({ value, onChange, className, ...props }) {
  const [focused, setFocused] = useState(false)
  const n = toNumber(value)
  const shown = Number.isFinite(n) ? (focused ? String(n) : fmtNum(n)) : ''
  return (
    <Input
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, '')
        onChange?.(digits === '' ? '' : Number(digits))
      }}
      className={cn('num', className)}
      {...props}
    />
  )
}

export function DecimalInput({ value, onChange, className, ...props }) {
  return (
    <Input
      inputMode="decimal"
      autoComplete="off"
      value={value == null ? '' : String(value)}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.]/g, '')
        const [int, ...rest] = raw.split('.')
        onChange?.(rest.length ? `${int}.${rest.join('')}` : int)
      }}
      className={cn('num', className)}
      {...props}
    />
  )
}
