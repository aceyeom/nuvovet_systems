/**
 * MultiCombobox + Tag (DESIGN_SYSTEM.md §4.6, owner WP5): a list of chosen values as removable
 * Tags, and an "add" button that opens a searchable list (Popover + Command). Replaces the portfolio's
 * problem tokens and allergy pickers.
 *
 * Props:
 *   options      [{ value, label, keywords? }]
 *   value        string[] (chosen values, in order)
 *   onAdd(value) · onRemove(value)
 *   addLabel     button text ("문제 추가")
 *   emptyText    shown when nothing is chosen
 *   searchPlaceholder, noMatchText
 *   removeLabel(label) → accessible name of a Tag's remove button
 *   labelledBy   id of the visible field label
 */
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Button } from '@/ui/primitives/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/primitives/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/ui/primitives/command'

/** A chosen value: 4 px radius, outline, with an optional remove button. */
export function Tag({ children, onRemove, removeLabel, className, ...props }) {
  return (
    <span
      className={cn('inline-flex h-6 max-w-full items-center gap-1 rounded-sm border border-border-strong bg-background pl-2 text-xs font-medium text-foreground', !onRemove && 'pr-2', className)}
      {...props}
    >
      <span className="truncate" data-truncate="" title={typeof children === 'string' ? children : undefined}>
        {children}
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-row-hover hover:text-foreground"
        >
          <X aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </button>
      ) : null}
    </span>
  )
}

export function MultiCombobox({
  options,
  value,
  onAdd,
  onRemove,
  addLabel,
  emptyText,
  searchPlaceholder,
  noMatchText,
  removeLabel = (l) => l,
  labelledBy,
  className,
}) {
  const [open, setOpen] = useState(false)
  const byValue = Object.fromEntries(options.map((o) => [o.value, o]))
  const remaining = options.filter((o) => !value.includes(o.value))
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-labelledby={labelledBy}>
          {value.map((v) => {
            const label = byValue[v]?.label ?? v
            return (
              <li key={v} className="max-w-full">
                <Tag onRemove={() => onRemove(v)} removeLabel={removeLabel(label)}>
                  {label}
                </Tag>
              </li>
            )
          })}
        </ul>
      ) : emptyText ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : null}
      {remaining.length ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-fit" aria-describedby={labelledBy}>
              <Plus aria-hidden="true" strokeWidth={1.5} />
              {addLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <Command>
              <CommandInput placeholder={searchPlaceholder} />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>{noMatchText}</CommandEmpty>
                <CommandGroup>
                  {remaining.map((o) => (
                    <CommandItem
                      key={o.value}
                      value={`${o.label} ${o.value} ${o.keywords || ''}`}
                      onSelect={() => {
                        onAdd(o.value)
                        setOpen(false)
                      }}
                    >
                      {o.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )
}

export default MultiCombobox
