import { useId, useMemo, useRef } from 'react'
import { Dna } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import { searchBreeds, resolveBreed } from '../engine/search.js'
import { BREED_BY_ID, MDR1_RISK_LABELS } from '../knowledge/breeds.js'
import useCombobox from './useCombobox.js'

export function breedName(breed, lang) {
  if (!breed) return ''
  return lang === 'ko' ? breed.ko[0] : breed.en
}

export function Mdr1Chip({ breed, species }) {
  const { pick } = useLang()
  if (species === 'cat') return null
  const key = breed ? breed.mdr1 : 'unknown'
  const strong = key === 'high' || key === 'moderate'
  return (
    <span className={`pf-chip pf-chip--mdr1${strong ? ' is-strong' : ''}`}>
      <Dna size={13} aria-hidden="true" />
      {pick(MDR1_RISK_LABELS[key])}
    </span>
  )
}

/**
 * Breed input with EN/KO alias search (engine/search.js). Free text is kept
 * and resolved by the engine; text that does not resolve stays "unknown".
 * onChange({ breedId, breedText })
 */
export default function BreedCombobox({ species, breedId, breedText, onChange, id }) {
  const { t, lang, pick } = useLang()
  const listId = useId()
  const statusId = useId()
  const inputRef = useRef(null)
  const text = breedText || (breedId && BREED_BY_ID[breedId] ? breedName(BREED_BY_ID[breedId], lang) : '')
  const results = useMemo(() => searchBreeds(text, { species, limit: 8 }), [text, species])
  const selected = breedId && BREED_BY_ID[breedId]?.species === species ? BREED_BY_ID[breedId] : null
  const resolvedId = selected ? selected.id : (text ? resolveBreed(text, species) : null)
  const resolved = resolvedId ? BREED_BY_ID[resolvedId] : null
  const exact = selected && (text === selected.en || selected.ko.includes(text) || (selected.enAliases || []).includes(text))

  const choose = (i) => {
    const r = results[i]
    if (!r) return
    onChange({ breedId: r.breedId, breedText: breedName(r.breed, lang) })
    cb.setOpen(false)
    cb.setActive(-1)
  }
  const cb = useCombobox({ count: results.length, onSelect: choose })
  const showList = cb.open && text.trim() && !exact && results.length > 0

  let status
  if (!text.trim()) status = t('pt.breedNone')
  else if (resolved && text !== breedName(resolved, lang)) status = t('pt.breedResolved', { name: breedName(resolved, lang) })
  else if (!resolved) status = results.length ? t('pt.breedUnknown') : t('pt.breedNoMatch', { q: text })
  else status = null

  return (
    <div className="pf-combo">
      <input
        ref={inputRef}
        id={id}
        className="pf-input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={Boolean(showList)}
        aria-controls={listId}
        aria-activedescendant={showList && cb.active >= 0 ? `${listId}-${cb.active}` : undefined}
        aria-describedby={statusId}
        autoComplete="off"
        spellCheck="false"
        placeholder={t('pt.breedPlaceholder')}
        value={text}
        onChange={(e) => {
          onChange({ breedId: null, breedText: e.target.value })
          cb.setOpen(true)
          cb.setActive(-1)
        }}
        onFocus={() => cb.setOpen(true)}
        onBlur={() => setTimeout(() => cb.setOpen(false), 120)}
        onKeyDown={cb.onKeyDown}
      />
      {showList && (
        <ul className="pf-listbox" id={listId} role="listbox" aria-label={t('pt.breed')}>
          {results.map((r, i) => (
            <li
              key={r.breedId}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === cb.active}
              className={`pf-option${i === cb.active ? ' is-active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); choose(i) }}
              onMouseEnter={() => cb.setActive(i)}
            >
              <span className="pf-option__main">
                <span className="pf-option__name">{breedName(r.breed, lang)}</span>
                <span className="pf-option__alt" lang={lang === 'ko' ? 'en' : 'ko'}>{lang === 'ko' ? r.breed.en : r.breed.ko[0]}</span>
              </span>
              {species === 'dog' && <span className="pf-option__meta">{pick(MDR1_RISK_LABELS[r.breed.mdr1])}</span>}
            </li>
          ))}
        </ul>
      )}
      <div className="pf-field-status" id={statusId}>
        <Mdr1Chip breed={resolved} species={species} />
        {status && <span className="pf-field-status__text">{status}</span>}
      </div>
    </div>
  )
}
