// 엔진 성능 (DESIGN_SYSTEM.md §5.3): the only screen that shows answer-key labels. One Alert, the
// confusion matrix (with a footnote for clean claims denied on coverage terms), per-anomaly recall as a
// compact table with n, then the false-alarm rate with n.
import { useMemo } from 'react'
import { Info, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/primitives/tooltip'
import { ProgressBar } from '@/ui/patterns/metrics'
import { PageHeader } from '@/ui/patterns/PageHeader'
import { useTitle } from '@/ui/patterns/useTitle'
import { fmtNum, fmtPct } from '@/ui/lib/format'
import { ConfusionMatrix } from '@/ui/ext/wp6/ConfusionMatrix'
import { useConsole } from '../context'
import { useEvaluation } from '../data/resources'
import { DECISION_ORDER, confusion } from '../model'
import { ANOMALY_LABEL } from '../strings.ko.js'
import { LoadError, Page, PageSkeleton } from './states'

const DECISION_COLS = { auto_approve: '자동 승인', pend: '서류 요청', review: '심사 필요', deny_recommended: '지급 거절 권고' }

function Section({ title, children }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

export default function Evaluation() {
  useTitle('엔진 성능', 'nuvovet')
  const ev = useEvaluation()
  const { demo, demoState } = useConsole()
  const matrix = useMemo(
    () =>
      demo
        ? confusion(demo.claims).map((r) => ({ ...r, key: r.label, label: r.label === 'clean' ? '정상 (이상 없음)' : ANOMALY_LABEL[r.label] || r.label }))
        : [],
    [demo],
  )

  if (ev.error || demoState.error) return <LoadError onRetry={ev.error ? ev.reload : demoState.reload} />
  if (!ev.data || !demo) return <PageSkeleton rows={10} />
  const data = ev.data
  const recall = Object.entries(data.recall_by_anomaly || {})
    .filter(([, v]) => v.injected > 0)
    .sort((a, b) => b[1].injected - a[1].injected)
  const falseAlarms = Math.round((data.clean_false_alarm_rate || 0) * data.clean_claims)
  const cleanAuto = Math.round((data.clean_auto_approve_rate || 0) * data.clean_claims)
  const cleanDenied = matrix.find((r) => r.key === 'clean')?.deny_recommended || 0

  return (
    <Page>
      <PageHeader title="엔진 성능" meta={`합성 청구 ${fmtNum(data.claims)}건, 정상 청구 ${fmtNum(data.clean_claims)}건`} />
      <Alert variant="warning">
        <TriangleAlert strokeWidth={1.5} />
        <AlertTitle>합성 데이터로 생성한 정답 라벨 기준입니다.</AlertTitle>
        <AlertDescription>실제 청구 성능을 뜻하지 않습니다.</AlertDescription>
      </Alert>

      <Section title="판정과 정답 라벨">
        <ConfusionMatrix caption="정답 라벨별 엔진 판정 건수" rows={matrix} columns={DECISION_ORDER.map((k) => ({ key: k, label: DECISION_COLS[k] }))} />
        <p className="text-xs text-muted-foreground">
          한 청구에 라벨이 여러 개면 라벨마다 한 번씩 셉니다.
          {cleanDenied
            ? ` 정상 청구의 지급 거절 권고 ${fmtNum(cleanDenied)}건은 가격·임상·무결성 소견 없이 보장 제외 같은 상품 조건으로 내려진 판정이라 오탐에 넣지 않습니다.`
            : null}
        </p>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2 xl:gap-0">
        <Section title="이상 유형별 탐지율">
          {/* A compact table, not a wall of full bars: only rows under 100 % get a bar (§5.3). */}
          <div className="xl:pr-6">
            <table className="w-full text-sm">
              <caption className="sr-only">이상 유형별 탐지 건수와 탐지율</caption>
              <thead>
                <tr className="border-b border-border-strong">
                  <th scope="col" className="h-8 bg-subtle pr-3 pl-4 text-left text-xs font-medium text-muted-foreground">
                    유형
                  </th>
                  <th scope="col" className="num h-8 bg-subtle px-3 text-xs font-medium whitespace-nowrap text-muted-foreground">
                    탐지/주입
                  </th>
                  <th scope="col" className="h-8 w-40 bg-subtle pr-4 pl-3 text-right text-xs font-medium text-muted-foreground">
                    탐지율
                  </th>
                </tr>
              </thead>
              <tbody>
                {recall.map(([k, v]) => {
                  const name = ANOMALY_LABEL[k] || k
                  const full = v.detected >= v.injected
                  return (
                    <tr key={k} className="border-b border-border">
                      <th scope="row" className="h-8 pr-3 pl-4 text-left font-normal text-foreground">
                        {name}
                      </th>
                      <td className={v.injected < 10 ? 'num h-8 px-3 whitespace-nowrap text-muted-foreground' : 'num h-8 px-3 whitespace-nowrap text-text-2'}>
                        {fmtNum(v.detected)}/{fmtNum(v.injected)}건
                      </td>
                      <td className="h-8 pr-4 pl-3">
                        <span className="flex items-center justify-end gap-2">
                          {full ? null : <ProgressBar value={v.recall * 100} muted={v.injected < 10} label={`${name} 탐지율 ${fmtPct(v.recall, 0)}`} className="w-20" />}
                          <span className={full ? 'num w-10 text-right text-text-2' : 'num w-10 text-right font-medium text-foreground'}>{fmtPct(v.recall, 0)}</span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">주입 10건 미만 유형은 건수를 흐리게 표시합니다.</p>
        </Section>
        <Section title="정상 청구 오탐">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-border max-xl:border-t max-xl:pt-6 xl:border-l xl:pl-6">
            <div className="flex flex-col gap-0.5">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                오탐률
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="오탐률 정의" className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground">
                        <Info aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>정상 청구에 가격·임상·무결성 소견(주의 이상)이 붙은 비율입니다. 예방접종 같은 보장 제외 판정은 오탐에 넣지 않습니다.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </dt>
              <dd className="num text-left text-2xl font-semibold text-foreground">{fmtPct(data.clean_false_alarm_rate)}</dd>
              <dd className="num text-left text-xs text-text-2">
                정상 {fmtNum(data.clean_claims)}건 중 {fmtNum(falseAlarms)}건
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">정상 청구 자동 승인</dt>
              <dd className="num text-left text-2xl font-semibold text-foreground">{fmtPct(data.clean_auto_approve_rate)}</dd>
              <dd className="num text-left text-xs text-text-2">
                정상 {fmtNum(data.clean_claims)}건 중 {fmtNum(cleanAuto)}건
              </dd>
            </div>
          </dl>
        </Section>
      </div>
    </Page>
  )
}
