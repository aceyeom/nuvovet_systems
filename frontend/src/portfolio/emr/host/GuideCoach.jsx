/**
 * Demo guide (portfolio chrome, not part of the fictional EMR): a 36 px strip under the demo bar with
 * four steps that tick themselves off as the visitor uses the demo, the current step's instruction,
 * this visit's suggestion and a link to the next patient. It sits above the EMR, so it never covers
 * the chart. Closed state and progress last for the browser session; "가이드" in the demo bar
 * brings it back.
 */
import { Check, ChevronRight, Compass, X } from 'lucide-react'
import './guide.css'

export const GUIDE_STEPS = [
  { key: 'review', title: 'DUR 결과 보기', body: '처방 표 오른쪽 DUR 칸의 배지를 누르면 그 경고로 바로 이동합니다.' },
  { key: 'island', title: '아일랜드 펼치기', body: '위쪽 검은 알약(DUR 아일랜드)을 누르면 전체 검토가 펼쳐집니다. 끌어서 옮길 수 있습니다.' },
  { key: 'fix', title: '처방 고치기', body: '권장 조치를 누르거나 용량·일수를 바꿔 보세요. 아일랜드가 바로 다시 검토합니다.' },
  { key: 'sign', title: '처방 저장', body: '금기·중대 경고가 남아 있으면 저장 전에 확인 창이 뜨고, 예외 사유가 기록됩니다.' },
]

const DOCKED_BODY = '오른쪽 패널에서 카드를 펼쳐 보세요. 패널 머리의 버튼으로 아일랜드로 띄울 수 있습니다.'

export function GuideCoach({ done, open, onClose, hint, next, docked }) {
  if (!open) return null
  const count = GUIDE_STEPS.filter((s) => done[s.key]).length
  const current = GUIDE_STEPS.find((s) => !done[s.key]) || null
  const body = !current ? '네 단계를 모두 해 보았습니다. 다른 환자도 열어 보세요.' : current.key === 'island' && docked ? DOCKED_BODY : current.body
  return (
    <aside className="nvg" aria-label="EMR 데모 가이드" data-emr="guide" data-brand-surface="">
      <span className="nvg-title">
        <span className="nvg-badge"><Compass aria-hidden="true" strokeWidth={1.75} /></span>
        <b>데모 가이드</b>
        <span className="nvg-count">{count}/{GUIDE_STEPS.length}</span>
      </span>
      <ol className="nvg-steps">
        {GUIDE_STEPS.map((s, i) => {
          const state = done[s.key] ? 'done' : s.key === current?.key ? 'current' : 'todo'
          return (
            <li key={s.key} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="nvg-dot">{state === 'done' ? <Check aria-hidden="true" strokeWidth={3} /> : i + 1}</span>
              <span className="nvg-step">{s.title}</span>
              {state === 'done' ? <span className="sr-only">완료</span> : null}
            </li>
          )
        })}
      </ol>
      <p className="nvg-now" title={body}>{body}</p>
      {hint ? <p className="nvg-hint" title={hint}><span>이 환자에서</span>{hint}</p> : null}
      {next ? (
        <a className="nvg-next" href={next.href}>
          다음 환자 {next.name}
          <ChevronRight aria-hidden="true" />
        </a>
      ) : null}
      <button type="button" className="nvg-close" aria-label="가이드 닫기" title="가이드 닫기 (데모 막대의 '가이드'로 다시 엽니다)" onClick={onClose}><X aria-hidden="true" /></button>
    </aside>
  )
}

export default GuideCoach
