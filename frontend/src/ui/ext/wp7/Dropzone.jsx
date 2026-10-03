/**
 * Dropzone (WP7, DESIGN_SYSTEM.md §4.6): the only dashed border in the product. A visible <label> for a
 * real (visually hidden) file input, so click, keyboard (Tab + Space/Enter) and drag-and-drop all work
 * and the input has an accessible name. The focus outline is drawn on the zone.
 *
 *   onFile(file)   called with the first accepted file
 *   accept         input accept string; dropped files are checked against it too
 *   title          the one-line instruction (~하세요)
 *   hint           formats and size, text-xs muted
 *   disabled       e.g. until the consent box is ticked; `disabledHint` says why
 *   busy           shows a spinner and `busyLabel`
 */
import { useId, useState } from 'react'
import { ImageUp, LoaderCircle } from 'lucide-react'
import { cn } from '@/ui/cn'

function accepts(file, accept) {
  if (!accept) return true
  const list = accept.split(',').map((s) => s.trim().toLowerCase())
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  return list.some((a) => (a.endsWith('/*') ? type.startsWith(a.slice(0, -1)) : a.startsWith('.') ? name.endsWith(a) : type === a))
}

export function Dropzone({
  onFile,
  onReject,
  accept,
  title,
  hint,
  disabled = false,
  disabledHint,
  busy = false,
  busyLabel = '읽는 중',
  describedBy,
  className,
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const [over, setOver] = useState(false)
  const inactive = disabled || busy

  const take = (files) => {
    const file = files?.[0]
    if (!file) return
    if (!accepts(file, accept)) {
      onReject?.(file)
      return
    }
    onFile?.(file)
  }

  return (
    <label
      htmlFor={id}
      data-state={over ? 'over' : undefined}
      aria-disabled={inactive || undefined}
      onDragOver={(e) => {
        if (inactive) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        if (!over) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        if (!inactive) take(e.dataTransfer.files)
      }}
      className={cn(
        'flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-background px-6 py-8 text-center transition-[background-color,border-color] duration-100',
        'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring',
        inactive ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-row-hover',
        over && 'border-brand bg-brand-soft',
        className,
      )}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={inactive}
        aria-describedby={[hintId, describedBy].filter(Boolean).join(' ')}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
      {busy ? (
        <LoaderCircle aria-hidden="true" strokeWidth={1.5} className="size-5 text-muted-foreground motion-safe:animate-spin" />
      ) : (
        <ImageUp aria-hidden="true" strokeWidth={1.5} className={cn('size-5 text-muted-foreground', disabled && 'opacity-50')} />
      )}
      <span className={cn('text-base font-medium text-foreground', disabled && !busy && 'opacity-50')}>{busy ? busyLabel : title}</span>
      <span id={hintId} className="text-xs text-muted-foreground">
        {disabled && !busy && disabledHint ? disabledHint : hint}
      </span>
    </label>
  )
}

export default Dropzone
