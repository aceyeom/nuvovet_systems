/**
 * CommandMenu (WP6, §4.4): ⌘K / Ctrl+K and `/` open it; groups 이동, 청구, 병원, 규칙, 설정; each row
 * shows its shortcut; the list is capped at 400 px. One of the few places that navigates from a handler.
 *
 * groups: [{ heading, items: [{ id, label, hint?, keywords?, shortcut?, icon?, onSelect }] }]
 * Built on Dialog + the vendored cmdk Command (the vendored CommandDialog renders its title outside the
 * dialog content, which Radix reports as a missing title).
 */
import { useEffect } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/ui/primitives/command'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/ui/primitives/dialog'
import { Kbd } from '@/ui/primitives/kbd'

const isTyping = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

/** Global opener: ⌘K / Ctrl+K anywhere, `/` outside text fields. */
export function useCommandShortcut(setOpen) {
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target) && !e.defaultPrevented) {
        if (e.target.closest?.('[role="dialog"],[role="menu"],[role="listbox"]')) return
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])
}

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')

function Shortcut({ keys }) {
  if (!keys) return null
  return (
    <CommandShortcut className="flex items-center gap-1">
      {keys.split(' ').map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </CommandShortcut>
  )
}

export function CommandMenu({ open, onOpenChange, groups, placeholder = '화면, 청구 ID, 병원, 규칙 검색', empty = '일치하는 항목이 없습니다.' }) {
  const run = (fn) => () => {
    onOpenChange(false)
    fn?.()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">명령 검색</DialogTitle>
        <DialogDescription className="sr-only">이동할 화면이나 청구, 병원, 규칙을 검색하세요.</DialogDescription>
        <Command loop className="[&_[data-slot=command-input-wrapper]]:h-11">
          <CommandInput placeholder={placeholder} aria-label="명령 검색" />
          <CommandList className="p-1" style={{ maxHeight: 400 }}>
            <CommandEmpty>{empty}</CommandEmpty>
            {groups
              .filter((g) => g.items.length)
              .map((g) => (
                <CommandGroup key={g.heading} heading={g.heading}>
                  {g.items.map((it) => (
                    <CommandItem key={it.id} value={`${it.label} ${it.hint || ''} ${it.keywords || ''} ${it.id}`} onSelect={run(it.onSelect)} className="h-8 touch:h-10">
                      {it.icon ? <it.icon aria-hidden="true" strokeWidth={1.5} /> : null}
                      <span className="min-w-0 truncate text-foreground">{it.label}</span>
                      {it.hint ? <span className="min-w-0 truncate text-xs text-muted-foreground">{it.hint}</span> : null}
                      <Shortcut keys={it.shortcut} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
