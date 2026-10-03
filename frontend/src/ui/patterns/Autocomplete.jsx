/**
 * Autocomplete (§4.6): a free-text input with a suggestion list, on cmdk with its own filtering off
 * (the caller ranks results). Promoted from ext/wp5/Autocomplete (DUR drug and breed search) and
 * ext/wp7/SuggestInput (약품명 in the clinic grid), which were near-duplicates.
 *
 * The input keeps free text; ArrowUp/Down move, Enter picks, Esc closes the list (and only the list).
 * The list floats under the input (`data-floating`, shadow-pop); it is a plain listbox, not a portal,
 * so a container around it must not clip overflow. Focus is shown on the field box (2 px ring outline
 * on the wrapper, like InputGroup), not on the bare input.
 *
 * Props:
 *   value, onValueChange(text)
 *   items          [{ value, label, hint?, meta?, disabled? }] already ranked
 *   onSelect(value, item)
 *   label          visible label above the field (omit, or `hideLabel`, when a Field/aria-label names it)
 *   aria-label     accessible name when there is no visible label (e.g. a grid cell)
 *   id             id of the <input>, so an external <label for> / Field points at it
 *   aria-describedby (or describedBy)
 *   placeholder, emptyText (shown when nothing matches; omit to hide the list instead)
 *   leading, trailing   nodes inside the field box
 *   listLabel      accessible name of the listbox
 *   blockEnterWhenClosed  Enter with no list open does nothing (default false)
 *   className (root), fieldClassName (the bordered box), inputClassName (the <input>)
 *
 * SuggestInput: Autocomplete over a fixed option list, ranked here (prefix, then substring, max 8);
 * picking an option writes its label into the text.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Command } from 'cmdk'
import { cn } from '@/ui/cn'

export function Autocomplete({
  label,
  hideLabel = false,
  value,
  onValueChange,
  items,
  onSelect,
  placeholder,
  emptyText,
  leading,
  trailing,
  id,
  describedBy,
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  listLabel,
  blockEnterWhenClosed = false,
  className,
  fieldClassName,
  inputClassName,
}) {
  const [open, setOpen] = useState(false)
  const list = items || []
  const text = value ?? ''
  const show = open && String(text).trim().length > 0 && (list.length > 0 || Boolean(emptyText))
  const name = ariaLabel || label
  // cmdk always sets the input's own id and aria-labelledby (its hidden <label>), and it re-focuses
  // `document.getElementById(<its input id>)` when the highlighted item changes. When the caller
  // gives an `id` (Field → <label for={id}>), the input takes that id and the field box takes cmdk's
  // id: cmdk's focus() then hits a non-focusable div and focus stays in the input. Without a visible
  // or aria-label name, cmdk's labelledby is dropped so the external label names the input. React
  // never rewrites these attributes because cmdk's id props are stable.
  const fieldRef = useRef(null)
  const inputRef = useRef(null)
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el || !id || el.id === id) return
    const cmdkId = el.id
    el.id = id
    if (fieldRef.current && cmdkId) fieldRef.current.id = cmdkId
    if (!name) el.removeAttribute('aria-labelledby')
  }, [id, name])
  return (
    <Command
      shouldFilter={false}
      loop
      label={name || listLabel}
      className={cn('relative w-full', className)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && show) {
          e.preventDefault()
          e.stopPropagation()
          setOpen(false)
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          setOpen(true)
        } else if (e.key === 'Enter' && !show && blockEnterWhenClosed) {
          e.preventDefault()
        }
      }}
    >
      {label && !hideLabel ? (
        <span aria-hidden="true" className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </span>
      ) : null}
      <div
        ref={fieldRef}
        className={cn(
          'flex h-8 w-full items-center gap-2 rounded-md border border-input bg-background px-2.5 transition-[border-color] duration-100 touch:h-10',
          'has-[input:focus-visible]:border-ring has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring',
          'has-[input[aria-invalid=true]]:border-sev-critical',
          fieldClassName,
        )}
      >
        {leading ? <span className="flex shrink-0 text-muted-foreground [&_svg]:size-4">{leading}</span> : null}
        <Command.Input
          ref={inputRef}
          value={text}
          onValueChange={(v) => {
            onValueChange?.(v)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={placeholder}
          aria-describedby={ariaDescribedBy || describedBy}
          aria-invalid={ariaInvalid}
          aria-required={ariaRequired}
          aria-expanded={show}
          autoComplete="off"
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-0 touch:text-lg',
            inputClassName,
          )}
        />
        {trailing ? <span className="flex shrink-0 text-muted-foreground">{trailing}</span> : null}
      </div>
      <Command.List
        label={listLabel || name}
        hidden={!show}
        data-floating=""
        onMouseDown={(e) => e.preventDefault()}
        className="absolute inset-x-0 top-full z-[var(--z-overlay)] mt-1 max-h-80 min-w-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-pop"
      >
        {emptyText ? <Command.Empty className="px-2 py-3 text-sm text-text-2">{emptyText}</Command.Empty> : null}
        {list.map((it) => (
          <Command.Item
            key={it.value}
            value={it.value}
            disabled={it.disabled}
            onSelect={() => {
              onSelect?.(it.value, it)
              setOpen(false)
            }}
            className="flex cursor-default items-start gap-3 rounded-sm px-2 py-1.5 text-sm select-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-row-hover"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-foreground">{it.label}</span>
              {it.hint ? <span className="text-xs text-muted-foreground">{it.hint}</span> : null}
            </span>
            {it.meta ? <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">{it.meta}</span> : null}
          </Command.Item>
        ))}
      </Command.List>
    </Command>
  )
}

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '')

/** Prefix matches first, then substring matches; shorter labels first; an exact match is dropped. */
export function rankSuggestions(options, query, limit = 8) {
  const q = norm(query)
  if (!q) return []
  const scored = []
  for (const o of options || []) {
    const l = norm(o.label)
    if (l === q) continue
    const at = l.indexOf(q)
    if (at < 0) continue
    scored.push([at === 0 ? 0 : 1, l.length, o])
  }
  scored.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  return scored.slice(0, limit).map((s) => s[2])
}

/**
 * Free text with spelling suggestions from `options` ([{ value, label, hint? }]). Same props as the
 * former ext/wp7/SuggestInput: `inputClassName` styles the field box (e.g. a 40 px grid cell).
 */
export function SuggestInput({ value, onValueChange, options, listLabel = '추천 이름', inputClassName, limit = 8, ...props }) {
  const items = useMemo(() => rankSuggestions(options, value, limit), [options, value, limit])
  return (
    <Autocomplete
      {...props}
      value={value ?? ''}
      onValueChange={onValueChange}
      items={items}
      onSelect={(_, it) => onValueChange?.(it.label)}
      listLabel={listLabel}
      blockEnterWhenClosed
      fieldClassName={cn('bg-transparent px-3', inputClassName)}
    />
  )
}

export default Autocomplete
