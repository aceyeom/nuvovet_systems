// Claim detail body shared by the console (full page and wide side panel) and the landing preview
// (DESIGN_SYSTEM.md §5.3 "Claim detail"). Reuses the golden claim-header classes (§9.9).
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { DecisionBadge } from '@/ui/patterns/status'
import { DescriptionList } from '@/ui/patterns/DescriptionList'
import { Disclosure } from '@/ui/patterns/Disclosure'
import { Money } from '@/ui/patterns/Num'
import { fmtDate } from '@/ui/lib/format'
import { cn } from '@/ui/cn'
import { CHANNEL, SPECIES } from '../strings.ko.js'
import { isActionable } from './model.js'
import { FindingList } from './FindingList.jsx'
import { LineItemTable } from './LineItemTable.jsx'
import { PayoutLedger } from './PayoutLedger.jsx'

export const TABS = ['findings', 'lines', 'payout', 'log']

export function diagnosisLabel(model) {
  const d = model.diagnoses?.[0]
  if (!d) return '진단명 없음'
  return d.name_ko || d.input || '진단명 없음'
}

/** Korean first; the claim's own wording as a muted second line only when it differs and is not Korean. */
function Diagnosis({ model }) {
  const d = model.diagnoses?.[0]
  const ko = diagnosisLabel(model)
  const raw = d?.input
  if (!d) return <span className="text-muted-foreground">{ko}</span>
  return (
    <span className="flex flex-col">
      <span>{ko}</span>
      {raw && raw !== ko && !/[가-힣]/.test(raw) ? <span className="text-xs text-muted-foreground">{raw}</span> : null}
    </span>
  )
}

export function ClaimHeaderMeta({ model }) {
  const species = SPECIES[model.patient?.species] || '종 미상'
  return (
    <>
      <DescriptionList
        columns={4}
        items={[
          { label: '병원', value: model.clinic?.name || model.clinic?.clinic_id || '병원 미상' },
          { label: '지역', value: model.clinic?.region || '지역 미상' },
          { label: '종', value: model.patient?.breed ? `${species}, ${model.patient.breed}` : species },
          { label: '진단', value: <Diagnosis model={model} /> },
        ]}
      />
      <DescriptionList
        columns={4}
        items={[
          { label: '진료일', value: fmtDate(model.visit_date), num: true },
          { label: '접수 경로', value: CHANNEL[model.intake_channel] || '경로 미상' },
        ]}
      />
    </>
  )
}

/**
 * props:
 *   model        claim model (toClaimModel / heroClaim.json)
 *   headingAs    'h1' on the full page, 'h2' in the panel and the landing preview
 *   breadcrumb   node rendered above the header (full page)
 *   headerAside  node after the decision badge (e.g. the reviewer's local action)
 *   tab, onTabChange   controlled tab (defaults to uncontrolled 'findings')
 *   findingsExtra, linesExtra, payoutExtra, log   console-only sections
 */
export function ClaimDetailView({
  model,
  headingAs: H = 'h1',
  breadcrumb,
  headerAside,
  tab,
  onTabChange,
  findingsExtra,
  linesExtra,
  payoutExtra,
  log,
  className,
}) {
  const actionable = model.findings.filter(isActionable)
  const info = model.findings.filter((f) => !isActionable(f))
  const tabProps = tab ? { value: tab, onValueChange: onTabChange } : { defaultValue: 'findings' }
  return (
    <Tabs {...tabProps} className={cn('gap-0', className)}>
      <div data-golden={breadcrumb ? 'claim-header' : undefined} className="flex flex-col gap-4">
        {breadcrumb}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <H className="id text-xl font-semibold text-foreground">{model.claim_id}</H>
          <DecisionBadge decision={model.decision} icon size="md" />
          {headerAside}
          <div className="ml-auto flex items-baseline gap-4 text-sm text-muted-foreground">
            <span>
              청구 <Money value={model.payable?.billed} className="text-base font-semibold text-foreground" />
            </span>
            <span>
              지급 예정 <Money value={model.payable?.reimbursed} className="text-base font-semibold text-foreground" />
            </span>
          </div>
        </div>
        <ClaimHeaderMeta model={model} />
        <TabsList>
          <TabsTrigger value="findings">
            소견 <span className="num text-xs text-muted-foreground">{actionable.length}</span>
          </TabsTrigger>
          <TabsTrigger value="lines">진료 항목</TabsTrigger>
          <TabsTrigger value="payout">지급 계산</TabsTrigger>
          <TabsTrigger value="log">이력</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="findings" className="flex flex-col gap-6 pt-4">
        {actionable.length ? (
          <FindingList findings={actionable} className="border-t-0" />
        ) : (
          <p className="py-3 text-sm text-text-2">지급에 영향을 주는 소견이 없습니다.</p>
        )}
        {info.length ? (
          <Disclosure title="참고 소견" meta={`${info.length}건`}>
            <FindingList findings={info} />
          </Disclosure>
        ) : null}
        {findingsExtra}
      </TabsContent>
      <TabsContent value="lines" className="flex flex-col gap-6 pt-4">
        <LineItemTable lines={model.lines} />
        {linesExtra}
      </TabsContent>
      <TabsContent value="payout" className="flex flex-col gap-6 pt-4">
        <PayoutLedger payable={model.payable} />
        {payoutExtra}
      </TabsContent>
      <TabsContent value="log" className="pt-4">
        {log ?? <p className="py-3 text-sm text-text-2">처리 이력이 없습니다.</p>}
      </TabsContent>
    </Tabs>
  )
}

export default ClaimDetailView
