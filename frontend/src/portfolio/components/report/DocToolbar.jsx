import { ArrowLeft, Printer } from 'lucide-react'
import { useLang } from '../../i18n/index.js'

/**
 * Screen-only toolbar above an A4 preview: back link, title, extra controls
 * and "Print / Save PDF" (window.print() on this page — no pop-up).
 */
export default function DocToolbar({ backHref, backLabel, title, sub, children }) {
  const { t } = useLang()
  return (
    <div className="pf-doctools pf-no-print">
      <a className="pf-back" href={backHref}>
        <ArrowLeft size={15} aria-hidden="true" />
        {backLabel}
      </a>
      <div className="pf-doctools__row">
        <div className="pf-doctools__titles">
          <h1 className="pf-doctools__title">{title}</h1>
          {sub && <p className="pf-doctools__sub">{sub}</p>}
        </div>
        <div className="pf-doctools__actions">
          {children}
          <button type="button" className="pf-btn pf-btn--primary pf-btn--sm" onClick={() => window.print()}>
            <Printer size={15} aria-hidden="true" />
            {t('doc.print')}
          </button>
        </div>
      </div>
    </div>
  )
}
