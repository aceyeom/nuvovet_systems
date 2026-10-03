import { Printer } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { useLang } from '../../i18n/index.js'
import PageCrumbs from '../PageCrumbs.jsx'

/**
 * Screen-only toolbar above an A4 preview: breadcrumb back to the case, title, extra controls and
 * "인쇄 또는 PDF 저장" (window.print() on this page, no pop-up).
 */
export default function DocToolbar({ crumbs, title, children }) {
  const { t } = useLang()
  return (
    <div className="flex flex-col gap-3 print:hidden">
      <PageCrumbs items={crumbs} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {children}
          <Button size="sm" onClick={() => window.print()}>
            <Printer aria-hidden="true" strokeWidth={1.5} />
            {t('doc.print')}
          </Button>
        </div>
      </div>
    </div>
  )
}
