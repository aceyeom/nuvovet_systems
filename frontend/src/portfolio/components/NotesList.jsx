import { useState } from 'react'
import { cn } from '@/ui/cn'
import { Checkbox } from '@/ui/primitives/checkbox'
import { useLang } from '../i18n/index.js'
import { CitationList } from './CitationChip.jsx'
import { drugShort } from './format.js'

export function noteKind(n) {
  if (n.category === 'validation' || n.category === 'rounding') return n.category
  return n.kind
}

/** Administration, lab and monitoring notes as a neutral checklist. Ticks are local and not saved. */
export default function NotesList({ notes, highlightDrugIds = null }) {
  const { t, pick } = useLang()
  const [done, setDone] = useState({})
  if (!notes.length) return <p className="text-sm text-muted-foreground">{t('rv.noNotes')}</p>
  return (
    <ul className="divide-y divide-border border-y border-border">
      {notes.map((n) => {
        const id = `pf-note-${n.id}`
        const hl = highlightDrugIds && n.drugIds?.some((d) => highlightDrugIds.includes(d))
        return (
          <li key={n.id} className={cn('flex items-start gap-3 py-2.5 transition-colors duration-100', hl && 'bg-row-hover')}>
            <Checkbox id={id} className="mt-0.5" checked={Boolean(done[n.id])} onCheckedChange={(v) => setDone((d) => ({ ...d, [n.id]: v === true }))} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label htmlFor={id} className={cn('flex flex-col gap-0.5', done[n.id] && 'opacity-50')}>
                <span className="text-xs text-muted-foreground">
                  {t(`note.kind.${noteKind(n)}`)}
                  {n.drugIds?.length ? `, ${n.drugIds.map((d) => drugShort(d, pick)).join(', ')}` : ''}
                </span>
                <span className="text-sm text-foreground">{pick(n.text)}</span>
              </label>
              {n.sources?.length ? <CitationList ids={n.sources} /> : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
