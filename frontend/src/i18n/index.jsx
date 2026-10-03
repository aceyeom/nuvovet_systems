// Main-app strings (DESIGN_SYSTEM.md §5.1, §6). The landing `/` is Korean only, so the provider serves
// one fixed language and has no toggle; `/dur` keeps its own bilingual i18n under src/portfolio/i18n.
import React, { createContext, useContext } from 'react';
import ko from './ko';

export { CONTACT_EMAIL } from './contact.js';
export { ko };

const VALUE = Object.freeze({ t: ko, lang: 'ko' });

const I18nContext = createContext(VALUE);

export function I18nProvider({ children }) {
  return <I18nContext.Provider value={VALUE}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export default I18nContext;
