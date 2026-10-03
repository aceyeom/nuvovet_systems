import { useId, useMemo } from 'react'
import { Autocomplete } from '@/ui/patterns/Autocomplete'
import { useLang } from '../i18n/index.js'
import { searchBreeds, resolveBreed } from '../engine/search.js'
import { BREED_BY_ID, MDR1_RISK_LABELS } from '../knowledge/breeds.js'

export function breedName(breed, lang) {
  if (!breed) return ''
  return lang === 'ko' ? breed.ko[0] : breed.en
}

const fold = (x) => String(x || '').trim().toLowerCase()

/** The breed's names in one UI language (canonical name first, then aliases). */
function namesIn(breed, lang) {
  return lang === 'ko' ? breed.ko : [breed.en, ...(breed.enAliases || [])]
}

/**
 * What to show for a recognised breed in the UI language: the text that was typed when it is one of
 * the breed's names in that language ("Korean Shorthair", "러프 콜리"), otherwise the canonical name in
 * that language, so a Korean screen never shows "Rough Collie" (design review P2). `compact` (one-line
 * signalments) drops a parenthetical qualifier, keeping it instead when it is itself an alias:
 * "Domestic Shorthair (Korean Shorthair)" → "Korean Shorthair", "Collie (Rough / Smooth)" → "Collie".
 */
export function breedLabel(breed, typed, lang, { compact = false } = {}) {
  if (!breed) return typed || ''
  const names = namesIn(breed, lang)
  const hit = typed ? names.find((n) => fold(n) === fold(typed)) : null
  if (hit) return typed.trim()
  const name = breedName(breed, lang)
  if (!compact) return name
  const m = /^(.*?)\s*\((.*)\)$/.exec(name)
  if (!m) return name
  return names.some((n) => fold(n) === fold(m[2])) ? m[2] : m[1]
}

/**
 * Breed input with EN/KO alias search (engine/search.js). Free text is kept and resolved by the
 * engine; text that does not resolve stays "unknown", never "low risk".
 * onChange({ breedId, breedText })
 */
export default function BreedCombobox({ species, breedId, breedText, onChange, label }) {
  const { t, lang, pick } = useLang()
  const statusId = useId()
  const picked = breedId && BREED_BY_ID[breedId] ? BREED_BY_ID[breedId] : null
  // A recognised breed typed in the other language (a golden case's "Rough Collie" on a Korean
  // screen) is shown under its name in the UI language; free text is shown as typed.
  const foreign = picked && breedText && !namesIn(picked, lang).some((n) => fold(n) === fold(breedText))
    && namesIn(picked, lang === 'ko' ? 'en' : 'ko').some((n) => fold(n) === fold(breedText))
  const text = foreign ? breedName(picked, lang) : breedText || (picked ? breedName(picked, lang) : '')
  const results = useMemo(() => searchBreeds(text, { species, limit: 8 }), [text, species])
  const selected = breedId && BREED_BY_ID[breedId]?.species === species ? BREED_BY_ID[breedId] : null
  const resolvedId = selected ? selected.id : (text ? resolveBreed(text, species) : null)
  const resolved = resolvedId ? BREED_BY_ID[resolvedId] : null
  const exact = selected && (text === selected.en || selected.ko.includes(text) || (selected.enAliases || []).includes(text))

  let status
  if (!text.trim()) status = t('pt.breedNone')
  else if (resolved && text !== breedName(resolved, lang)) status = t('pt.breedResolved', { name: breedName(resolved, lang) })
  else if (!resolved) status = results.length ? t('pt.breedUnknown') : t('pt.breedNoMatch', { q: text })
  else status = null
  const mdr1 = species === 'dog' ? pick(MDR1_RISK_LABELS[resolved ? resolved.mdr1 : 'unknown']) : null

  const items = exact
    ? []
    : results.map((r) => ({
        value: r.breedId,
        label: breedName(r.breed, lang),
        hint: lang === 'ko' ? r.breed.en : r.breed.ko[0],
        meta: species === 'dog' ? pick(MDR1_RISK_LABELS[r.breed.mdr1]) : null,
      }))

  return (
    <div className="flex flex-col gap-1">
      <Autocomplete
        label={label}
        value={text}
        onValueChange={(v) => onChange({ breedId: null, breedText: v })}
        items={items}
        onSelect={(id) => {
          const b = BREED_BY_ID[id]
          if (b) onChange({ breedId: b.id, breedText: breedName(b, lang) })
        }}
        placeholder={t('pt.breedPlaceholder')}
        describedBy={statusId}
      />
      <p id={statusId} className="text-xs text-muted-foreground">
        {[mdr1, status].filter(Boolean).join('. ')}
      </p>
    </div>
  )
}
