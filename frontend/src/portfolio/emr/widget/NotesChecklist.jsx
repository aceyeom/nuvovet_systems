/**
 * "투약 안내" checklist (EMR popup spec §3.6, §6.1): engine administration / lab / monitoring /
 * caution / rounding notes and adapter row notes, collapsed with a count. Ticks are a reading aid
 * for the vet and are not saved. A rounding note whose row has a re-checked plan suggestion (§6.3
 * candidate 3, `rowSuggestions`) offers it as a button.
 */

import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { DRUG_BY_ID } from '../../knowledge/drugs.js'
import { ic, shortCite } from './parts.jsx'
import { t } from './strings.js'

const drugName = (id, locale) => DRUG_BY_ID[id]?.name?.[locale] ?? DRUG_BY_ID[id]?.name?.ko ?? id

export function NotesChecklist({ notes, locale, rowSuggestions, dur }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [ticked, setTicked] = useState({})
  if (!notes?.length) return null
  return (
    <div className="nv-notes-wrap" data-nv="notes">
      <button type="button" className="nv-disclosure" aria-expanded={open} aria-controls={id} onClick={() => setOpen((x) => !x)}>
        {t(locale, 'notes.title')} <span className="nv-num nv-muted">{notes.length}</span>
        <ChevronRight {...ic(16)} />
      </button>
      {open ? (
        <ul id={id} className="nv-notes">
          {notes.map((n) => (
            <li key={n.id}>
              <label className="nv-note">
                <input type="checkbox" checked={Boolean(ticked[n.id])} onChange={(e) => setTicked((m) => ({ ...m, [n.id]: e.target.checked }))} />
                <span>
                  {n.drugIds?.length ? <span className="nv-note-drug">{n.drugIds.map((d) => drugName(d, locale)).join(' + ')}</span> : null}
                  {n.text}
                  {n.sources?.length ? (
                    <span className="nv-muted"> ({n.sources.map((s) => shortCite(s).short).join(', ')})</span>
                  ) : null}
                </span>
              </label>
              {n.category === 'rounding' && dur
                ? (n.rowIds || []).flatMap((rowId) => rowSuggestions?.[rowId] || []).map((sg) => (
                  <div key={sg.uuid} className="nv-note-action">
                    <button type="button" className="nv-btn nv-btn-secondary" title={sg.actions?.[0]?.description} onClick={() => dur.acceptSuggestion(null, sg.uuid)}>
                      {sg.label}
                    </button>
                  </div>
                ))
                : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
