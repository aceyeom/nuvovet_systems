import { useState } from 'react'
import { PillBottle, FlaskConical, Activity, Info, Scale } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import { CitationList } from './CitationChip.jsx'
import { drugShort } from './format.js'

const KIND_ICON = { administration: PillBottle, lab: FlaskConical, monitoring: Activity, validation: Info, rounding: Scale }

function noteKind(n) {
  if (n.category === 'validation' || n.category === 'rounding') return n.category
  return n.kind
}

/** Administration, lab and monitoring notes as a neutral checklist. Ticks are local and not saved. */
export default function NotesList({ notes, highlightDrugIds = null }) {
  const { t, pick } = useLang()
  const [done, setDone] = useState({})
  if (!notes.length) return <p className="pf-muted">{t('rv.noNotes')}</p>
  return (
    <ul className="pf-notes">
      {notes.map((n) => {
        const kind = noteKind(n)
        const Icon = KIND_ICON[kind] || Info
        const id = `pf-note-${n.id}`
        const hl = highlightDrugIds && n.drugIds?.some((d) => highlightDrugIds.includes(d))
        return (
          <li key={n.id} className={`pf-note${done[n.id] ? ' is-done' : ''}${hl ? ' is-highlighted' : ''}`}>
            <input
              type="checkbox"
              id={id}
              className="pf-note__check"
              checked={Boolean(done[n.id])}
              onChange={(e) => setDone((d) => ({ ...d, [n.id]: e.target.checked }))}
            />
            <div className="pf-note__body">
              <label htmlFor={id} className="pf-note__label">
                <span className="pf-note__meta">
                  <Icon size={13} aria-hidden="true" />
                  <span>{t(`note.kind.${kind}`)}</span>
                  {n.drugIds?.length > 0 && <span className="pf-note__drugs">· {n.drugIds.map((d) => drugShort(d, pick)).join(', ')}</span>}
                </span>
                <span className="pf-note__text">{pick(n.text)}</span>
              </label>
              {n.sources?.length > 0 && <CitationList ids={n.sources} />}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
