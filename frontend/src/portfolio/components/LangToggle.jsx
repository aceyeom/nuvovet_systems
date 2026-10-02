import { useLang } from '../i18n/index.js'
import { Segmented } from './fields.jsx'

/** EN / KO switch for the UI language. */
export default function LangToggle() {
  const { lang, setLang, t } = useLang()
  return (
    <Segmented
      ariaLabel={t('lang.label')}
      size="sm"
      className="pf-langtoggle"
      value={lang}
      onChange={setLang}
      options={[
        { value: 'en', label: <><span aria-hidden="true">EN</span><span className="pf-sr">English</span></>, lang: 'en', title: 'English' },
        { value: 'ko', label: <><span aria-hidden="true">KO</span><span className="pf-sr">한국어</span></>, lang: 'ko', title: '한국어' },
      ]}
    />
  )
}
