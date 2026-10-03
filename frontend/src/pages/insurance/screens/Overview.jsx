// 개요: queue first (DESIGN_SYSTEM.md §5.3). Metric strip, the top ten open claims, one monthly bar
// chart, then two plain bar lists. No cards, no funnel, no deltas.
import { lazy, Suspense, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select'
import { Skeleton } from '@/ui/primitives/skeleton'
import { DataTable } from '@/ui/patterns/DataTable'
import { BarList, MetricStrip } from '@/ui/patterns/metrics'
import { PageHeader } from '@/ui/patterns/PageHeader'
import { useTitle } from '@/ui/patterns/useTitle'
import { fmtDateRange, fmtNum, fmtPct, fmtWonCompact } from '@/ui/lib/format'
import { useMediaQuery, DESKTOP } from '@/ui/ext/wp6/useMediaQuery'
import { useConsole } from '../context'
import { ClaimList, FLAG_LABEL, claimColumns } from '../claimTable.jsx'
import { dateRange, filterClaims, isFlaggedClaim, metrics, monthlyAtRisk, pendCounts, ruleCounts } from '../model'
import { CHANNEL, PEND_LABEL, ruleLabel } from '../strings.ko.js'
import { LoadError, Page, PageSkeleton } from './states'

const MonthlyChart = lazy(() => import('../MonthlyChart.jsx'))

const ALL = 'all'

function Section({ title, action, children, className = '' }) {
  return (
    <section className={`flex min-w-0 flex-col gap-3 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function Overview() {
  useTitle('개요', 'nuvovet 청구 심사')
  const { demo, demoState, index } = useConsole()
  const [params, setParams] = useSearchParams()
  const desktop = useMediaQuery(DESKTOP)
  const channel = CHANNEL[params.get('channel')] ? params.get('channel') : ''

  const view = useMemo(() => {
    if (!demo) return null
    const rows = channel ? demo.claims.filter((c) => c.intake_channel === channel) : demo.claims
    const open = filterClaims(rows, { view: 'open' })
    const rules = Object.entries(ruleCounts(rows, index))
      .filter(([r]) => !r.startsWith('data.'))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([r, n]) => ({
        key: r,
        value: n,
        label: (
          <Link to={`/insurance/claims?view=all&rule=${encodeURIComponent(r)}`} className="text-foreground hover:underline" title={r}>
            {ruleLabel(r)}
          </Link>
        ),
      }))
    const pend = Object.entries(pendCounts(rows))
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => ({ key: k, label: PEND_LABEL[k] || k, value: n }))
    return { rows, open, m: metrics(rows, index), monthly: monthlyAtRisk(rows, index), rules, pend, range: dateRange(demo.claims) }
  }, [demo, channel, index])

  if (demoState.error) return <LoadError onRetry={demoState.reload} />
  if (!view) return <PageSkeleton />

  const { open, m, monthly, rules, pend, range } = view
  const top = open.slice(0, 10)
  const flagged = isFlaggedClaim(index)
  const hrefFor = (c) => `/insurance/claims/${c.claim_id}`
  const channelIds = Object.keys(CHANNEL).filter((k) => demo.claims.some((c) => c.intake_channel === k))
  const setChannel = (v) => {
    const next = new URLSearchParams(params)
    if (v === ALL) next.delete('channel')
    else next.set('channel', v)
    setParams(next, { replace: true })
  }

  return (
    <Page>
      <PageHeader
        title="개요"
        meta={<span className="num text-left">기간 {fmtDateRange(range[0], range[1])}</span>}
        actions={
          <Select value={channel || ALL} onValueChange={setChannel}>
            <SelectTrigger aria-label="접수 경로" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>전체 접수 경로</SelectItem>
              {channelIds.map((k) => (
                <SelectItem key={k} value={k}>
                  {CHANNEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <MetricStrip
        items={[
          { key: 'n', label: '청구', value: `${fmtNum(m.claims)}건` },
          { key: 'billed', label: '청구액', value: fmtWonCompact(m.billed) },
          { key: 'flagged', label: '검토 대상', value: fmtWonCompact(m.flagged) },
          { key: 'auto', label: '자동 승인', value: fmtPct(m.autoRate) },
        ]}
      />

      <Section
        title="처리 대상"
        action={
          <Link to={channel ? `/insurance/claims?view=open&channel=${channel}` : '/insurance/claims'} className="text-sm text-brand hover:text-brand-hover hover:underline">
            전체 {fmtNum(open.length)}건 보기
          </Link>
        }
      >
        {desktop ? (
          <DataTable
            aria-label="처리 대상 상위 10건"
            density="compact"
            columns={claimColumns(hrefFor, index)}
            data={top}
            getRowId={(c) => c.claim_id}
            paginate={false}
            isFlagged={flagged}
            flagLabel={FLAG_LABEL}
            getRowProps={() => ({ 'data-golden': 'queue-row' })}
            empty="처리 대상 청구가 없습니다."
          />
        ) : (
          <ClaimList claims={top} index={index} hrefFor={hrefFor} isFlagged={flagged} empty="처리 대상 청구가 없습니다." />
        )}
      </Section>

      <Section title="월별 검토 대상 금액">
        <Suspense fallback={<Skeleton data-skeleton="" className="h-48 w-full" />}>
          <MonthlyChart data={monthly} />
        </Suspense>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-0">
        <Section title="주요 소견 규칙" className="lg:pr-6">
          {rules.length ? <BarList items={rules} /> : <p className="text-sm text-text-2">소견이 없습니다.</p>}
        </Section>
        <Section title="서류 요청 사유" className="border-border max-lg:border-t max-lg:pt-6 lg:border-l lg:pl-6">
          {pend.length ? <BarList items={pend} /> : <p className="text-sm text-text-2">서류 요청이 없습니다.</p>}
        </Section>
      </div>
    </Page>
  )
}
