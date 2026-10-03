import { Button } from '@/ui/primitives/button'
import { useLang } from '../../i18n/index.js'
import { HREF } from '../../router.js'

/** Report/handout for a case id that does not exist. */
export default function DocNotFound({ id }) {
  const { t } = useLang()
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-3 px-4 py-16 sm:px-6">
      <h1 className="text-xl font-semibold text-foreground">{t('notfound.title')}</h1>
      <p className="text-sm text-text-2">{t('wb.notFound', { id })}</p>
      <Button asChild>
        <a href={HREF.cases}>{t('notfound.back')}</a>
      </Button>
    </div>
  )
}
