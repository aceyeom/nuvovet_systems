/**
 * A picture of the DUR island for the landing (the real one lives in the widget's shadow DOM).
 * Same shapes and copy as the widget: compact pill, peek with the finding, resolved, expanded.
 * The container's size morphs with motion's layout animation; content cross-fades with a blur.
 */
import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck, GripVertical, ListChecks, OctagonX, X } from 'lucide-react'
import { DUR_CARD } from './script.js'

const SPRING = { type: 'spring', stiffness: 360, damping: 30, mass: 0.9 }

const GLOW = {
  idle: 'ok',
  checking: 'ok',
  alert: 'crit',
  alertCompact: 'crit',
  resolved: 'ok',
  open: 'crit',
}

function Compact({ state }) {
  const crit = state === 'alertCompact'
  return (
    <div className="im-pill">
      <span className="im-orb" data-ping={state === 'checking' || undefined} />
      <span className="im-brand">DUR</span>
      <span className="im-div" />
      {crit ? (
        <span className="im-status" data-tone="crit"><OctagonX size={15} strokeWidth={1.75} />금기 1</span>
      ) : (
        <span className="im-status" data-tone="ok">{state === 'checking' ? '검토 중' : '문제 없음'}</span>
      )}
      {crit ? <span className="im-ctx">{DUR_CARD.drugs}</span> : <span className="im-ctx">규칙 {DUR_CARD.rules}개</span>}
      <GripVertical className="im-grip" size={14} strokeWidth={1.5} />
    </div>
  )
}

function Alert({ pressed }) {
  return (
    <div className="im-peek">
      <div className="im-peek-top">
        <span className="im-badge"><OctagonX size={13} strokeWidth={2} />{DUR_CARD.severity}</span>
        <span className="im-cat">{DUR_CARD.category}</span>
        <span className="im-drugs">{DUR_CARD.drugs}</span>
        <span className="im-x"><X size={13} /></span>
      </div>
      <p className="im-sum">{DUR_CARD.summary}</p>
      <p className="im-factors"><b>이 환자에서</b>{DUR_CARD.factors}</p>
      <div className="im-actions">
        <span className="im-btn im-btn-primary" data-target="island-fix" data-pressed={pressed || undefined}>
          {DUR_CARD.suggestion}<i>권장</i>
        </span>
        <span className="im-btn"><ListChecks size={13} strokeWidth={1.75} />전체 검토</span>
        <span className="im-btn im-btn-ghost">행으로 이동</span>
      </div>
      <span className="im-timer" />
    </div>
  )
}

function Resolved() {
  return (
    <div className="im-peek im-resolved">
      <span className="im-ok"><CircleCheck size={20} strokeWidth={1.75} /></span>
      <span className="im-res-text">
        <b>경고가 모두 해결되었습니다</b>
        <span>규칙 {DUR_CARD.rules}개 재검토 완료</span>
      </span>
    </div>
  )
}

function Open() {
  return (
    <div className="im-open">
      <div className="im-open-head">
        <GripVertical size={13} strokeWidth={1.5} />
        <b>NuvoVet DUR</b>
        <span>규칙 {DUR_CARD.rules}개</span>
      </div>
      <div className="im-open-verdict">
        <span className="im-badge"><OctagonX size={13} strokeWidth={2} />{DUR_CARD.severity}</span>
        <b>{DUR_CARD.verdict}</b>
      </div>
      <div className="im-open-card">
        <p className="im-sum">{DUR_CARD.summary}</p>
        <p className="im-factors">{DUR_CARD.consequence}</p>
        <div className="im-actions">
          <span className="im-btn im-btn-primary">{DUR_CARD.suggestion}<i>권장</i></span>
          <span className="im-btn">처방 수정</span>
          <span className="im-btn im-btn-ghost">예외 사유 입력</span>
        </div>
        <p className="im-trail">규칙 MDR1_PGP_ML · 근거 Mealey 2001 · Mealey 2008</p>
      </div>
    </div>
  )
}

export function IslandMock({ state = 'idle', pressed = false, className }) {
  const shape = state === 'alert' || state === 'resolved' ? 'peek' : state === 'open' ? 'open' : 'compact'
  return (
    <motion.div
      layout
      className={`im${className ? ` ${className}` : ''}`}
      data-glow={GLOW[state]}
      data-shape={shape}
      transition={SPRING}
      style={{ borderRadius: shape === 'compact' ? 22 : 26 }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={state === 'checking' || state === 'idle' ? 'compact' : state}
          className="im-content"
          initial={{ opacity: 0, filter: 'blur(6px)', scale: 0.96 }}
          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
          exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.12 } }}
          transition={{ duration: 0.38, ease: [0.2, 0.9, 0.3, 1], delay: 0.06 }}
        >
          {shape === 'compact' ? <Compact state={state} /> : state === 'alert' ? <Alert pressed={pressed} /> : state === 'resolved' ? <Resolved /> : <Open />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

export default IslandMock
