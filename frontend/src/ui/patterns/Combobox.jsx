/**
 * Combobox (§4.6): Popover + Command (never the Base UI combobox).
 * options: [{ value, label, hint? }]; value: string | null.
 */
import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Button } from '@/ui/primitives/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/primitives/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/ui/primitives/command'

export function Combobox({
  options,
  value,
  onChange,
  placeholder = '선택하세요',
  searchPlaceholder = '검색',
  emptyText = '일치하는 항목이 없습니다',
  id,
  className,
  contentClassName,
  ...props
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between px-3 font-normal', !selected && 'text-muted-foreground', className)}
          {...props}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown aria-hidden="true" strokeWidth={1.5} className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-(--radix-popover-trigger-width) min-w-56 p-0', contentClassName)} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.value} ${o.keywords || ''}`}
                  onSelect={() => {
                    onChange?.(o.value === value ? null : o.value)
                    setOpen(false)
                  }}
                >
                  <Check aria-hidden="true" strokeWidth={1.5} className={cn('size-4', o.value === value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{o.label}</span>
                  {o.hint ? <span className="ml-auto text-xs text-muted-foreground">{o.hint}</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
