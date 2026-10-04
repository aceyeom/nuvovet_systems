/**
 * A picture of the DUR island for the landing (the real one lives in the widget's shadow DOM:
 * src/portfolio/emr/widget/Island.jsx + island.css). Same material and copy: a graphite body (#111318)
 * with a 1 px top highlight and a neutral shadow, the "nuvovet DUR" text brand, severity as a word and a
 * tabular count in the dark severity tones, a CSS grabber, a CSS close mark and a CSS check stroke.
 * No orb, no glow, no icon set.
 *
 *   state: 'idle' | 'checking' (compact, 문제 없음 / 검토 중) · 'alertCompact' (compact, 금기 1)
 *          'alert' (peek with the finding) · 'resolved' (peek, all clear)
 *   pressed: the recommended action is being clicked (the hero replay's cursor)
 *   still: no shape morph (the static showcase in the DUR chapter)
 */
import { AnimatePresence, motion } from 'motion/react'
import { DUR_CARD } from './script.js'

const MORPH = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }
const TONE = { idle: 'none', checking: 'idle', alert: 'crit', alertCompact: 'crit', resolved: 'none' }

function Compact({ state }) {
  const crit = state === 'alertCompact'
  return (
    <div className="im-pill">
      <span className="im-brand">nuvovet <span>DUR</span></span>
      <span className="im-div" />
      <span className="im-status" data-recheck={state === 'checking' || undefined}>
        {crit ? `${DUR_CARD.severity} 1` : state === 'checking' ? '검토 중' : '문제 없음'}
      </span>
      <span className="im-ctx">{crit ? DUR_CARD.drugs : `규칙 ${DUR_CARD.rules}개`}</span>
      <span className="im-grip" />
    </div>
  )
}

function Alert({ pressed, timer }) {
  return (
    <div className="im-peek">
      <div className="im-peek-top">
        <span className="im-sev">{DUR_CARD.severity}</span>
        <span className="im-cat">{DUR_CARD.category}</span>
        <span className="im-drugs">{DUR_CARD.drugs}</span>
        <span className="im-x" />
      </div>
      <p className="im-sum">{DUR_CARD.summary}</p>
      <p className="im-factors"><b>이 환자에서</b>{DUR_CARD.factors}</p>
      <div className="im-actions">
        <span className="im-btn im-btn-primary" data-target="island-fix" data-pressed={pressed || undefined}>
          {DUR_CARD.suggestion}<i>권장</i>
        </span>
        <span className="im-btn">전체 검토</span>
        <span className="im-btn im-btn-ghost">행으로 이동</span>
      </div>
      <span className="im-timer" data-run={timer || undefined} />
    </div>
  )
}

function Resolved() {
  return (
    <div className="im-peek im-resolved">
      <span className="im-ok" />
      <span className="im-res-text">
        <b>경고가 모두 해결되었습니다</b>
        <span>규칙 {DUR_CARD.rules}개 재검토 · 09:15</span>
      </span>
    </div>
  )
}

export function IslandMock({ state = 'idle', pressed = false, still = false, className }) {
  const shape = state === 'alert' || state === 'resolved' ? 'peek' : 'compact'
  const content = shape === 'compact' ? <Compact state={state} /> : state === 'alert' ? <Alert pressed={pressed} timer={!still} /> : <Resolved />
  if (still) {
    return (
      <div className={`im${className ? ` ${className}` : ''}`} data-tone={TONE[state]} data-shape={shape} data-state={state}>
        <div className="im-content">{content}</div>
      </div>
    )
  }
  return (
    <motion.div
      layout
      className={`im${className ? ` ${className}` : ''}`}
      data-tone={TONE[state]}
      data-shape={shape}
      data-state={state}
      transition={MORPH}
      style={{ borderRadius: shape === 'compact' ? 20 : 18 }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {/* layout="position": the content takes part in the shape morph's scale correction, so the
            parent's size animation never stretches the text (old or new); the old content is gone in
            80 ms, before the shape has visibly moved */}
        <motion.div
          key={state === 'checking' || state === 'idle' ? 'compact' : state}
          layout="position"
          className="im-content"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          transition={{ duration: 0.28, ease: [0.2, 0.9, 0.3, 1], delay: 0.09 }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

export default IslandMock
