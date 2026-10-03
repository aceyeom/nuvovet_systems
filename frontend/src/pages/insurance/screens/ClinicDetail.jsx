// /insurance/clinics/:clinicId (DESIGN_SYSTEM.md §5.3): one metric strip with the region peer median as a
// sentence under it, then that clinic's claims in the queue table.
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { DataTable } from '@/ui/patterns/DataTable'
import { EmptyState } from '@/ui/patterns/EmptyState'
import { MetricStrip } from '@/ui/patterns/metrics'
import { PageHeader } from '@/ui/patterns/PageHeader'
import { useTitle } from '@/ui/patterns/useTitle'
import { fmtNum, fmtPct, fmtWonCompact } from '@/ui/lib/format'
import { useMediaQuery, DESKTOP } from '@/ui/ext/wp6/useMediaQuery'
import { useConsole } from '../context'
import { ClaimList, FLAG_LABEL, claimColumns } from '../claimTable.jsx'
import { SMALL_SAMPLE, clinicRows, isFlaggedClaim, median } from '../model'
import { LoadError, Page, PageSkeleton } from './states'

// Every row is the same clinic, so the 병원 column is hidden.
const ONE_CLINIC = { clinic: false }

export default function ClinicDetail() {
  const { clinicId } = useParams()
  const { demo, demoState, index } = useConsole()
  const desktop = useMediaQuery(DESKTOP)
  const clinic = useMemo(() => clinicRows(demo?.summary?.clinics).find((c) => c.clinic_id === clinicId), [demo, clinicId])
  useTitle(clinic?.name || clinicId, '병원 리스크', 'nuvovet')

  const peers = useMemo(() => {
    if (!clinic) return null
    const same = clinicRows(demo.summary.clinics).filter((c) => c.region === clinic.region)
    return { n: same.length, share: median(same.map((c) => c.share)), claims: median(same.map((c) => c.claims)) }
  }, [demo, clinic])
  const claims = useMemo(() => (demo && clinic ? demo.claims.filter((c) => c.clinic === clinic.name) : []), [demo, clinic])

  if (demoState.error) return <LoadError onRetry={demoState.reload} />
  if (!demo) return <PageSkeleton />
  if (!clinic) {
    return (
      <Page>
        <PageHeader title="병원 리스크" />
        <EmptyState
          icon={SearchX}
          title={`${clinicId} 병원을 찾을 수 없습니다.`}
          action={
            <Button asChild variant="secondary">
              <Link to="/insurance/clinics">병원 리스크로 돌아가기</Link>
            </Button>
          }
        />
      </Page>
    )
  }
  const hrefFor = (c) => `/insurance/claims/${c.claim_id}`
  const flagged = isFlaggedClaim(index)

  return (
    <Page>
      <PageHeader
        title={clinic.name}
        meta={
          <span className="flex items-baseline gap-3">
            <span className="id">{clinic.clinic_id}</span>
            <span>{clinic.region}</span>
          </span>
        }
      />
      <div className="flex flex-col gap-2">
        <MetricStrip
          items={[
            { key: 'n', label: '청구', value: `${fmtNum(clinic.claims)}건` },
            { key: 'billed', label: '청구액', value: fmtWonCompact(clinic.billed) },
            { key: 'risk', label: '위험 금액', value: fmtWonCompact(clinic.at_risk) },
            { key: 'share', label: '검토 대상 비중', value: fmtPct(clinic.share) },
          ]}
        />
        <p className="text-sm text-text-2">
          {clinic.region} 병원 <span className="num">{fmtNum(peers.n)}</span>곳의 검토 대상 비중 중앙값은 <span className="num">{fmtPct(peers.share)}</span>입니다.
          {clinic.siu ? (
            <>
              {' '}SIU 신호가 있는 청구는 <span className="num">{fmtNum(clinic.siu)}</span>건입니다.
            </>
          ) : null}
          {clinic.small ? ` 청구가 ${SMALL_SAMPLE}건 미만이라 비중은 참고용입니다.` : null}
        </p>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">청구 {fmtNum(claims.length)}건</h2>
        <div className={desktop ? 'min-w-0' : '-mx-6 max-sm:-mx-4'}>
          {desktop ? (
            <DataTable
              aria-label={`${clinic.name} 청구`}
              density="compact"
              columns={claimColumns(hrefFor, index)}
              columnVisibility={ONE_CLINIC}
              data={claims}
              getRowId={(c) => c.claim_id}
              isFlagged={flagged}
              flagLabel={FLAG_LABEL}
              paginate={false}
            />
          ) : (
            <ClaimList claims={claims} index={index} hrefFor={hrefFor} isFlagged={flagged} />
          )}
        </div>
      </section>
    </Page>
  )
}
