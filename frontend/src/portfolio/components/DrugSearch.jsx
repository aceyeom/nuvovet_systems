import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Kbd } from '@/ui/primitives/kbd'
import { Autocomplete } from '@/ui/patterns/Autocomplete'
import { useLang } from '../i18n/index.js'
import { searchDrugs } from '../engine/search.js'

/**
 * Drug search (engine/search.js: EN/KO names, brand aliases, jamo-aware typos and initial
 * consonants) as an autocomplete. onAdd(drugId)
 */
export default function DrugSearch({ species, existing = [], onAdd, hintId }) {
  const { t, pick, lang } = useLang()
  const [q, setQ] = useState('')
  const results = useMemo(() => searchDrugs(q, { species, limit: 8 }), [q, species])
  const speciesWord = species === 'cat' ? t('pt.cat') : t('pt.dog')
  const items = results.map((r) => {
    const added = existing.includes(r.drugId)
    const hasProtocol = r.drug.protocols.some((p) => p.species === species)
    const other = lang === 'ko' ? r.drug.name.en : r.drug.name.ko
    const matched = r.matched.field === 'alias' ? t('rx.matchedAlias', { text: r.matched.text }) : r.matched.field === 'class' ? t('rx.matchedClass', { text: r.matched.text }) : null
    return {
      value: r.drugId,
      disabled: added,
      label: (
        <>
          {pick(r.drug.name)} <span className="text-muted-foreground" lang={lang === 'ko' ? 'en' : 'ko'}>{other}</span>
        </>
      ),
      hint: [pick(r.drug.class), matched].filter(Boolean).join('. '),
      meta: added ? t('rx.alreadyAdded') : !hasProtocol ? t('rx.noSpeciesProtocol', { species: speciesWord }) : null,
    }
  })
  return (
    <div className="flex flex-col gap-1">
      <Autocomplete
        label={t('rx.search')}
        hideLabel
        value={q}
        onValueChange={setQ}
        items={items}
        onSelect={(drugId) => {
          if (existing.includes(drugId)) return
          onAdd(drugId)
          setQ('')
        }}
        placeholder={t('rx.searchPlaceholder')}
        emptyText={t('rx.noResults', { q })}
        leading={<Search aria-hidden="true" strokeWidth={1.5} />}
        trailing={<Kbd aria-hidden="true">Enter</Kbd>}
        describedBy={hintId}
      />
      {hintId ? <p id={hintId} className="text-xs text-muted-foreground">{t('rx.searchExamples')}</p> : null}
    </div>
  )
}
