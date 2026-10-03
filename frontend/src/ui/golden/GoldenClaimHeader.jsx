/**
 * Golden screen 2 (§9.9): the claim-detail header and one EvidenceTrail finding row.
 * Production counterparts carry data-golden="claim-header" and data-golden="finding-row".
 */
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/primitives/breadcrumb'
import { Tabs, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { DecisionBadge, FindingSeverity } from '@/ui/patterns/status'
import { DescriptionList } from '@/ui/patterns/DescriptionList'
import { EvidenceRow, EvidenceTrail, CitationChip } from '@/ui/patterns/EvidenceTrail'
import { Money } from '@/ui/patterns/Num'
import { fmtWon } from '@/ui/lib/format'

export default function GoldenClaimHeader() {
  return (
    <section data-golden-screen="claim" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">2. 청구 상세 머리글과 소견 한 줄</h2>
      <div data-golden="claim-header" className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#claims">청구 심사</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="id">SYN-2026-00220</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="id text-xl font-semibold text-foreground">SYN-2026-00220</h3>
          <DecisionBadge decision="review" icon size="md" />
          <div className="ml-auto flex items-baseline gap-4 text-sm text-muted-foreground">
            <span>
              청구 <Money value={7383700} className="text-base font-semibold text-foreground" />
            </span>
            <span>
              지급 예정 <Money value={5000000} className="text-base font-semibold text-foreground" />
            </span>
          </div>
        </div>
        <DescriptionList
          columns={4}
          items={[
            { label: '병원', value: '샘플동물병원 32' },
            { label: '지역', value: '서울' },
            { label: '종', value: '개' },
            { label: '진단', value: '위장관 이물' },
          ]}
        />
        <DescriptionList
          columns={4}
          items={[
            { label: '진료일', value: '2026-09-17', num: true },
            { label: '접수 경로', value: '보험사 앱' },
          ]}
        />
        <Tabs defaultValue="findings">
          <TabsList>
            <TabsTrigger value="findings">
              소견 <span className="num text-xs text-muted-foreground">8</span>
            </TabsTrigger>
            <TabsTrigger value="lines">진료 항목</TabsTrigger>
            <TabsTrigger value="payout">지급 계산</TabsTrigger>
            <TabsTrigger value="log">이력</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <EvidenceTrail>
        <EvidenceRow
          data-golden="finding-row"
          badge={<FindingSeverity severity="critical" />}
          title="장절개술 금액이 지역 기준을 넘습니다"
          impact={fmtWon(1607600)}
          ruleId="pricing.regional_outlier"
          version="v1.0"
          basis={`지역 P90 ${fmtWon(3120000)}`}
          citation={<CitationChip label="진료비 벤치마크" cite="합성 데이터 기준 지역별 진료비 분위수" />}
          notChecked={['연령', '임신/수유']}
        />
      </EvidenceTrail>
    </section>
  )
}
