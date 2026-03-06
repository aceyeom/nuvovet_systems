import React, { createContext, useContext, useState, useCallback } from 'react';
import en from './en';
import ko from './ko';

const translations = { en, ko };

const I18nContext = createContext({
  t: en,
  lang: 'ko',
  setLang: () => {},
  toggleLang: () => {},
});

// ── Provider ─────────────────────────────────────────────────────
export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nuvovet-lang');
      if (stored && translations[stored]) return stored;
    }
    return 'ko'; // Default to Korean
  });

  const setLang = useCallback((l) => {
    if (translations[l]) {
      setLangState(l);
      localStorage.setItem('nuvovet-lang', l);
      document.documentElement.lang = l === 'ko' ? 'ko' : 'en';
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'ko' ? 'en' : 'ko');
  }, [lang, setLang]);

  const t = translations[lang] || en;

  return (
    <I18nContext.Provider value={{ t, lang, setLang, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────
export function useI18n() {
  return useContext(I18nContext);
}

// ── Compact toggle component ─────────────────────────────────────
export function LangToggle({ className = '' }) {
  const { lang, toggleLang } = useI18n();

  return (
    <button
      onClick={toggleLang}
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-all duration-200 hover:shadow-sm ${
        lang === 'ko'
          ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
      } ${className}`}
      title={lang === 'ko' ? 'Switch to English' : '한국어로 전환'}
      aria-label={lang === 'ko' ? 'Switch to English' : '한국어로 전환'}
    >
      <span className={`transition-opacity ${lang === 'ko' ? 'opacity-100 font-semibold' : 'opacity-50'}`}>한</span>
      <span className="text-slate-300">/</span>
      <span className={`transition-opacity ${lang === 'en' ? 'opacity-100 font-semibold' : 'opacity-50'}`}>EN</span>
    </button>
  );
}

export default I18nContext;
