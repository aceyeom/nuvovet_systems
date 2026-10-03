// ClaimDetailPreview({ claimId }): an inert, live-rendered claim screen for the landing hero
// (DESIGN_SYSTEM.md §5.1). Frozen API (§8.1). The hero claim renders synchronously from heroClaim.json,
// so `/` neither shimmers nor loads the snapshot; any other claim is fetched on demand.
import { useEffect, useState } from 'react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/primitives/breadcrumb'
import { cn } from '@/ui/cn'
import hero from './heroClaim.json'
import { toClaimModel } from './model.js'
import { ClaimDetailView } from './ClaimDetailView.jsx'

function useModel(claimId) {
  const isHero = !claimId || claimId === hero.claim_id
  const [loaded, setLoaded] = useState(null)
  useEffect(() => {
    if (isHero) return undefined
    let alive = true
    import('../claimsApi.js')
      .then((api) => api.loadClaimDetail(claimId))
      .then((d) => alive && setLoaded(d ? toClaimModel(d) : false))
      .catch(() => alive && setLoaded(false))
    return () => {
      alive = false
    }
  }, [claimId, isHero])
  return isHero ? hero : loaded
}

/** `hideBreadcrumb`: drop the console breadcrumb (page chrome) when the preview is a marketing crop. */
export function ClaimDetailPreview({ claimId, hideBreadcrumb = false, className }) {
  const model = useModel(claimId)
  if (!model) return <div className={cn('bg-background', className)} />
  return (
    <div inert className={cn('bg-background p-6 max-sm:p-4', className)} data-preview="claim-detail">
      <ClaimDetailView
        model={model}
        headingAs="h2"
        breadcrumb={
          hideBreadcrumb ? null : (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/insurance/claims">청구 심사</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="id">{model.claim_id}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          )
        }
      />
    </div>
  )
}

export default ClaimDetailPreview
