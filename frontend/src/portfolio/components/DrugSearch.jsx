import { useId, useMemo, useState } from 'react'
import { Search, CornerDownLeft } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import { searchDrugs } from '../engine/search.js'
import useCombobox from './useCombobox.js'
import { textLang } from './format.js'

/** "matched alias: {text}" with {text} as a node (so it can carry its own lang). */
function withText(template, node) {
  const [before, after = ''] = template.split('{text}')
  return <>{before}{node}{after}</>
}

/**
 * Command-palette style drug search (engine/search.js: EN/KO names, brand
 * aliases, jamo-aware typos and initial consonants).
 * onAdd(drugId)
 */
export default function DrugSearch({ species, existing = [], onAdd }) {
  const { t, pick, lang } = useLang()
  const [q, setQ] = useState('')
  const listId = useId()
  const inputId = useId()
  const hintId = useId()
  const results = useMemo(() => searchDrugs(q, { species, limit: 8 }), [q, species])
  const disabled = (i) => existing.includes(results[i]?.drugId)

  const choose = (i) => {
    const r = results[i]
    if (!r || existing.includes(r.drugId)) return
    onAdd(r.drugId)
    setQ('')
    cb.setActive(-1)
    cb.setOpen(false)
  }
  const cb = useCombobox({ count: results.length, onSelect: choose, isDisabled: disabled })
  const showList = cb.open && q.trim().length > 0

  return (
    <div className="pf-combo pf-drugsearch">
      <label className="pf-label" htmlFor={inputId}>{t('rx.search')}</label>
      <div className="pf-search">
        <Search size={16} aria-hidden="true" className="pf-search__icon" />
        <input
          id={inputId}
          className="pf-input pf-search__input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && cb.active >= 0 ? `${listId}-${cb.active}` : undefined}
          aria-describedby={hintId}
          autoComplete="off"
          spellCheck="false"
          placeholder={t('rx.searchPlaceholder')}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            cb.setOpen(true)
            // Pre-select the best enabled result so Enter adds it.
            cb.setActive(-1)
          }}
          onFocus={() => cb.setOpen(true)}
          onBlur={() => setTimeout(() => cb.setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && showList && cb.active < 0) {
              const first = results.findIndex((r) => !existing.includes(r.drugId))
              if (first >= 0) { e.preventDefault(); choose(first); return }
            }
            cb.onKeyDown(e)
          }}
        />
        <kbd className="pf-kbd" aria-hidden="true"><CornerDownLeft size={12} /></kbd>
      </div>
      <p id={hintId} className="pf-search__hint">{t('rx.searchExamples')}<span className="pf-sr"> {t('rx.searchHint')}</span></p>
      {showList && (
        <ul className="pf-listbox pf-listbox--drugs" id={listId} role="listbox" aria-label={t('rx.search')}>
          {results.length === 0 && (
            <li className="pf-option pf-option--empty" role="option" aria-disabled="true" aria-selected="false">{t('rx.noResults', { q })}</li>
          )}
          {results.map((r, i) => {
            const added = existing.includes(r.drugId)
            const hasProtocol = r.drug.protocols.some((p) => p.species === species)
            const other = lang === 'ko' ? r.drug.name.en : r.drug.name.ko
            const otherLang = lang === 'ko' ? 'en' : 'ko'
            let matched = null
            const mt = <span lang={textLang(r.matched.text)}>{r.matched.text}</span>
            if (r.matched.field === 'alias') matched = withText(t('rx.matchedAlias'), mt)
            else if (r.matched.field === 'class') matched = withText(t('rx.matchedClass'), mt)
            return (
              <li
                key={r.drugId}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === cb.active}
                aria-disabled={added || undefined}
                className={`pf-option${i === cb.active ? ' is-active' : ''}${added ? ' is-disabled' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); choose(i) }}
                onMouseEnter={() => !added && cb.setActive(i)}
              >
                <span className="pf-option__main">
                  <span className="pf-option__name">
                    {pick(r.drug.name)} <span className="pf-option__alt">· <span lang={otherLang}>{other}</span></span>
                  </span>
                  {matched && <span className="pf-option__match">— {matched}</span>}
                  <span className="pf-option__class">{pick(r.drug.class)}</span>
                </span>
                <span className="pf-option__meta">
                  {added ? t('rx.alreadyAdded') : !hasProtocol ? t('rx.noSpeciesProtocol', { species: species === 'cat' ? t('pt.cat') : t('pt.dog') }) : null}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
