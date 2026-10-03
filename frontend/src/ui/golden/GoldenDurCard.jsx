/**
 * Golden screen 3 (§9.9): one DUR finding card, the CSS model for the EMR widget card
 * (popup spec §3.7.2). WP3 copies the computed values into widget.css; WP5 reuses the classes.
 * Production counterparts carry data-golden="dur-card".
 */
import { ChevronDown } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { SeverityBadge } from '@/ui/patterns/status'
import { CitationChip } from '@/ui/patterns/EvidenceTrail'

export default function GoldenDurCard() {
  return (
    <section data-golden-screen="dur" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">3. DUR 소견 카드</h2>
      <div className="w-full max-w-[360px] rounded-lg border border-border bg-popover">
        <article data-golden="dur-card" className="flex flex-col gap-2 border-b border-border px-3 py-3 text-sm">
          <div className="flex items-center gap-2">
            <SeverityBadge level="contraindicated" />
            <span className="text-xs font-medium text-text-2">품종·유전자</span>
            <span className="ml-auto truncate text-xs text-muted-foreground" data-truncate="" title="이버멕틴 + 케토코나졸">
              이버멕틴 + 케토코나졸
            </span>
          </div>
          <h3 className="text-sm leading-5 font-semibold text-foreground">MDR1 위험견에게 고용량 이버멕틴 + P-gp 억제제 병용</h3>
          <p className="line-clamp-2 text-sm text-text-2">
            이버멕틴은 정상적으로 P-당단백질에 의해 뇌로 들어가지 못합니다. MDR1 결손과 P-gp 억제제가 겹치면 신경 독성 위험이 커집니다.
          </p>
          <p className="text-xs text-text-2">
            <span className="text-muted-foreground">이 환자에서 </span>콜리 MDR1 위험 높음 · ABCB1 미검사 · 300 mcg/kg (기준 50 mcg/kg)
          </p>
          <p className="text-sm text-foreground">
            <span className="text-xs text-muted-foreground">권장 </span>ABCB1 유전자형을 확인하기 전에는 고용량 이버멕틴을 시작하지 마십시오.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm">이버멕틴 삭제</Button>
            <Button size="sm" variant="secondary">
              처방 수정
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto">
              예외 사유 입력
              <ChevronDown aria-hidden="true" strokeWidth={1.5} />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-2">
            <span className="text-muted-foreground">규칙</span>
            <span className="id">MDR1_PGP_ML</span>
            <span className="id text-muted-foreground">v1.1.0</span>
            <span aria-hidden="true" className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">근거</span>
            <span>Mealey 2001</span>
            <CitationChip label="Mealey 2008" />
          </div>
          <div className="text-xs text-muted-foreground">검토 안 함 연령</div>
        </article>
        <div className="flex h-9 items-center gap-2 px-3 text-sm">
          <SeverityBadge level="moderate" />
          <span className="min-w-0 flex-1 truncate text-foreground" data-truncate="" title="페노바르비탈 + 사이클로스포린 병용">
            페노바르비탈 + 사이클로스포린 병용
          </span>
          <ChevronDown aria-hidden="true" strokeWidth={1.5} className="size-4 text-muted-foreground" />
        </div>
      </div>
    </section>
  )
}
