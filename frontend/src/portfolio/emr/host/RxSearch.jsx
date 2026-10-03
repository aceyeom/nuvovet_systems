/**
 * Rx 검색 (EMR popup spec §2.4.2): a combobox over product display names plus the engine's
 * bilingual, jamo-aware `searchDrugs`, listing products (and the clinic's procedure items).
 * ↑↓ moves, Enter adds, Esc closes. Filter chips (정)(주)(액)(외) narrow by form.
 */

import { useId, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { searchDrugs, scoreString } from '../../engine/search.js'
import { SEARCH_FILTERS, catalogue } from './catalog.js'

const LIMIT = 10

/** Products (and procedures) matching the query, best first. Pure; exported for tests. */
export function searchItems(query, { species = null, filters = [] } = {}) {
  const q = String(query || '').trim()
  const forms = new Set(SEARCH_FILTERS.filter((f) => filters.includes(f.key)).flatMap((f) => f.forms))
  const items = catalogue().filter((it) => (forms.size ? it.form && forms.has(it.form) : true))
  if (!q) return forms.size ? items.slice(0, LIMIT * 3) : []
  const scored = new Map()
  for (const it of items) {
    const s = Math.max(scoreString(q, it.shortName), scoreString(q, it.code))
    if (s >= 40) scored.set(it.code, s + 10)
  }
  const drugHits = searchDrugs(q, { species, limit: 12 })
  for (const h of drugHits) {
    // A weak match on the drug class alone (e.g. initials inside "마크로사이클릭") is noise here.
    if (h.matched.field === 'class' && h.score < 50) continue
    for (const it of items) {
      if (it.drugId === h.drugId) scored.set(it.code, Math.max(scored.get(it.code) || 0, h.score))
    }
  }
  return items
    .filter((it) => scored.has(it.code))
    .sort((a, b) => scored.get(b.code) - scored.get(a.code) || a.shortName.localeCompare(b.shortName, 'ko'))
    .slice(0, LIMIT)
}

export function RxSearch({ species, onPick }) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listId = useId()
  const engineSpecies = species === 'Canine' ? 'dog' : species === 'Feline' ? 'cat' : null
  const results = useMemo(() => searchItems(query, { species: engineSpecies, filters }), [query, engineSpecies, filters])
  const expanded = open && (results.length > 0 || query.trim().length > 0)
  const optId = (i) => `${listId}-o${i}`

  function pick(item) {
    if (!item) return
    onPick(item.code)
    setQuery('')
    setOpen(false)
    setActive(0)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (expanded && results[active]) {
        e.preventDefault()
        pick(results[active])
      }
    } else if (e.key === 'Escape') {
      if (expanded) {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
      }
    }
  }

  function toggleFilter(key) {
    setFilters((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]))
    setOpen(true)
    setActive(0)
    inputRef.current?.focus()
  }

  return (
    <>
      <span className="emr-label" id={`${listId}-label`}>Rx 검색</span>
      <div className="emr-search">
        <Search className="emr-search-icon" aria-hidden="true" strokeWidth={2} />
        <input
          ref={inputRef}
          className="emr-input"
          type="text"
          role="combobox"
          aria-labelledby={`${listId}-label`}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && results[active] ? optId(active) : undefined}
          placeholder="성분명·상품명·초성"
          value={query}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          data-emr="rx-search"
        />
        {expanded ? (
          <ul className="emr-listbox" role="listbox" id={listId} aria-label="검색 결과">
            {results.length === 0 ? (
              <li className="emr-option-empty" role="presentation">처방집에 없는 이름입니다</li>
            ) : results.map((it, i) => (
              <li
                key={it.code}
                id={optId(i)}
                role="option"
                aria-selected={i === active}
                className="emr-option"
                onMouseDown={(e) => { e.preventDefault(); pick(it) }}
                onMouseEnter={() => setActive(i)}
              >
                <span>{it.name}</span>
                <span className="emr-code">{it.kind === 'procedure' ? `Tx · ${it.code}` : it.code}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <span className="emr-label" aria-hidden="true">필터</span>
      {SEARCH_FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          className="emr-filter"
          aria-pressed={filters.includes(f.key)}
          aria-label={`필터: ${f.label}`}
          title={f.label}
          onClick={() => toggleFilter(f.key)}
        >
          ({f.key})
        </button>
      ))}
    </>
  )
}

export default RxSearch
