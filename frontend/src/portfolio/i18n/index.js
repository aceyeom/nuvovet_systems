/**
 * Minimal i18n for UI chrome. Clinical strings are authored bilingually in the
 * knowledge/rule data ({ en, ko } objects) and are shown with pick().
 * There is no runtime translation.
 */

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { withParticle } from '@/ui/lib/particle'
import uiEn from './ui.en.js'
import uiKo from './ui.ko.js'
import pagesEn from './pages.en.js'
import pagesKo from './pages.ko.js'

const en = { ...uiEn, ...pagesEn }
const ko = { ...uiKo, ...pagesKo }

export const DICTS = { en, ko }
export const LANGS = ['en', 'ko']
const STORAGE_KEY = 'nuvovet.dur.lang'

function readStored() {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return LANGS.includes(v) ? v : null
  } catch {
    return null
  }
}

function writeStored(v) {
  try {
    window.localStorage.setItem(STORAGE_KEY, v)
  } catch {
    /* storage unavailable: the choice lasts for this page view only */
  }
}

function langFromHash() {
  try {
    const m = /[?&]lang=(en|ko)\b/.exec(window.location.hash || '')
    return m ? m[1] : null
  } catch {
    return null
  }
}

const PARTICLE = /\{(\w+)\}\{(은\/는|이\/가|을\/를|과\/와|으로\/로)\}/g

/**
 * Replace {name} placeholders. A Korean particle right after a placeholder, written
 * "{name}{으로/로}", is resolved for the inserted word (DESIGN_SYSTEM.md §6.3): "나비로", "초코는".
 */
export function fill(str, vars) {
  if (!vars) return str
  return str
    .replace(PARTICLE, (m, k, pair) => (vars[k] != null ? withParticle(String(vars[k]), pair) : m))
    .replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m))
}

export function translate(lang, key, vars) {
  const d = DICTS[lang] || en
  const s = d[key] ?? en[key]
  if (s == null) return key
  return fill(s, vars)
}

/** Pick the right language from a { en, ko } object (strings pass through). */
export function pickLang(lang, value) {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return value[lang] ?? value.en ?? ''
}

const LangContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (k, v) => translate('en', k, v),
  pick: (v) => pickLang('en', v),
})

export function LangProvider({ children, initial }) {
  const [lang, setLangState] = useState(() => initial || langFromHash() || readStored() || 'en')

  const setLang = useCallback((l) => {
    if (!LANGS.includes(l)) return
    setLangState(l)
    writeStored(l)
  }, [])

  useEffect(() => {
    try {
      // a page whose content has a fixed language (the Korean EMR demo) locks it with data-lang-lock
      document.documentElement.lang = document.documentElement.dataset.langLock || lang
    } catch {
      /* no document (tests) */
    }
  }, [lang])

  const value = useMemo(() => ({
    lang,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
    pick: (v) => pickLang(lang, v),
  }), [lang, setLang])

  return createElement(LangContext.Provider, { value }, children)
}

export function useLang() {
  return useContext(LangContext)
}
