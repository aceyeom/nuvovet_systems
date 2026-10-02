import { useLang } from '../../i18n/index.js'
import { HREF } from '../../router.js'

/** Report/handout for a case id that does not exist. */
export default function DocNotFound({ id }) {
  const { t } = useLang()
  return (
    <div className="pf-page">
      <div className="pf-empty-state">
        <h1 className="pf-h1">{t('notfound.title')}</h1>
        <p>{t('wb.notFound', { id })}</p>
        <a className="pf-btn pf-btn--primary" href={HREF.cases}>{t('notfound.back')}</a>
      </div>
    </div>
  )
}
