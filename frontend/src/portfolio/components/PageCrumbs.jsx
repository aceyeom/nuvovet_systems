import { Fragment } from 'react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/primitives/breadcrumb'
import { useLang } from '../i18n/index.js'

/** Breadcrumb (§4.4). items: [{ label, href? }]; the last item is the current page. */
export default function PageCrumbs({ items, className }) {
  const { t } = useLang()
  return (
    <Breadcrumb aria-label={t('nav.breadcrumb')} className={className}>
      <BreadcrumbList className="text-xs sm:gap-1.5">
        {items.map((it, i) => (
          <Fragment key={i}>
            {i > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {it.href && i < items.length - 1 ? <BreadcrumbLink href={it.href}>{it.label}</BreadcrumbLink> : <BreadcrumbPage>{it.label}</BreadcrumbPage>}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
