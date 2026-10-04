/**
 * Demo guide (portfolio chrome, not part of the fictional EMR): a 38 px strip under the demo bar with
 * four steps that tick themselves off as the visitor uses the demo, the current step's instruction,
 * this visit's suggestion and a link to the next patient. It sits above the EMR, so it never covers
 * the chart. Closed state and progress last for the browser session; "가이드" in the demo bar
 * brings it back.
 *
 *   가이드 1/4   DUR 결과 보기  아일랜드 펼치기  처방 고치기  처방 저장   instruction   이 환자에서 …   다음 환자 콩이  ×
 *
 * `hint` = { step, text } (fixtures VISIT_HINTS): shown only while its step is the current one.
 *
 * Typography only: the current step is ink with a 1.5 px DUR-ink hairline on the strip's bottom edge,
 * a done step carries a CSS check stroke, the close mark is two crossed hairlines (guide.css).
 */
import './guide.css'

export const GUIDE_STEPS = [
  { key: 'review', title: 'DUR 결과 보기', body: '처방 표 오른쪽 DUR 칸의 배지를 누르면 그 경고로 바로 이동합니다.' },
  { key: 'island', title: '아일랜드 펼치기', body: '위쪽의 DUR 아일랜드를 누르면 전체 검토가 펼쳐집니다. 끌어서 옮길 수 있습니다.' },
  { key: 'fix', title: '처방 고치기', body: '권장 조치를 누르거나 용량·일수를 바꿔 보세요. 아일랜드가 바로 다시 검토합니다.' },
  { key: 'sign', title: '처방 저장', body: '금기·중대 경고가 남아 있으면 저장 전에 확인 창이 뜨고, 예외 사유가 기록됩니다.' },
]

const DOCKED_BODY = '오른쪽 패널에서 카드를 펼쳐 보세요. 패널 머리의 버튼으로 아일랜드로 띄울 수 있습니다.'

/**
 * The steps in order: a step counts as done once it, or any later step, is done (expanding the island
 * also shows the DUR results), so the strip never ticks off out of order and the current step is the
 * one after the furthest done step.
 */
export function guideProgress(done = {}) {
  const furthest = GUIDE_STEPS.reduce((m, s, i) => (done[s.key] ? i : m), -1)
  const isDone = (s, i) => Boolean(done[s.key]) || i < furthest
  const current = GUIDE_STEPS.find((s, i) => !isDone(s, i)) || null
  return { isDone, current }
}

export function GuideCoach({ done, open, onClose, hint, next, docked }) {
  if (!open) return null
  const { isDone, current } = guideProgress(done)
  const position = current ? GUIDE_STEPS.indexOf(current) + 1 : GUIDE_STEPS.length
  const body = !current ? '네 단계를 모두 해 보았습니다. 다른 환자도 열어 보세요.' : current.key === 'island' && docked ? DOCKED_BODY : current.body
  // this visit's suggestion belongs to one step: shown with that step (or once all are done), so the
  // strip never gives two calls to action for different steps at once
  const tip = hint && (!current || current.key === hint.step) ? hint.text : null
  return (
    <aside className="nvg" aria-label="EMR 데모 가이드" data-emr="guide" data-brand-surface="">
      <span className="nvg-title">
        <b>가이드</b>
        <span className="nvg-count" aria-label={`${GUIDE_STEPS.length}단계 중 ${position}단계`}>{position}/{GUIDE_STEPS.length}</span>
      </span>
      <ol className="nvg-steps">
        {GUIDE_STEPS.map((s, i) => {
          const state = isDone(s, i) ? 'done' : s.key === current?.key ? 'current' : 'todo'
          return (
            <li key={s.key} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="nvg-step">{s.title}</span>
              {state === 'done' ? <span className="sr-only">완료</span> : null}
            </li>
          )
        })}
      </ol>
      <p className="nvg-now" title={body}>{body}</p>
      {tip ? <p className="nvg-hint" title={tip}><span>이 환자에서</span>{tip}</p> : null}
      {next ? <a className="nvg-next" href={next.href}>다음 환자 {next.name}</a> : null}
      <button type="button" className="nvg-close" aria-label="가이드 닫기" title="가이드 닫기 (데모 막대의 '가이드'로 다시 엽니다)" onClick={onClose}>
        <span className="nvg-x" aria-hidden="true" />
      </button>
    </aside>
  )
}

export default GuideCoach
