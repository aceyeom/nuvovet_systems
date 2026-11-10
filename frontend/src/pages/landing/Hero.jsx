/**
 * Landing hero. The head (the two-line headline on the left, the lead and two actions on the right),
 * then the stage: a light tile holding the rendered laptop (LaptopRender) and, under it, the product
 * switch and the steps of the replay on its screen. The laptop is sized to the viewport's height
 * (landing.css .lp-laptop), so its whole screen sits in the first view on any desktop.
 *
 * The laptop opens once when it comes into view, powers on, and replays the products on its screen:
 * DUR (the legacy EMR with the island over it), then Claims (the console adjudicating the hero claim).
 * The switch under it is a tab list (the lockup and its audience); beside it one line names what the
 * active product does, and below are the replay's five steps. Each step has a track: finished steps are
 * full, the current one fills in the product ink phase by phase, in step with the replay, so the row
 * doubles as the autoplay progress. At the end of a loop the hero switches product unless a tab was
 * picked; 일시정지 stops the screen.
 * Reduced motion: the laptop is open and lit from the first paint and each replay holds its key frame.
 */
import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { BrandLockup, PRODUCTS as BRAND } from '@/brand/Brand'
import { useI18n } from '../../i18n'
import { LaptopRender } from './LaptopRender.jsx'
import { DurReplay, DUR_PHASES, DUR_STEP_OF } from './replays/DurReplay.jsx'
import { ClaimsReplay, CLAIMS_PHASES, CLAIMS_STEP_OF } from './replays/ClaimsReplay.jsx'
import { useOnScreen } from './replays/timeline.js'
import { Lines } from './Sections.jsx'

const ORDER = ['dur', 'claims']
const PHASES = { dur: DUR_PHASES, claims: CLAIMS_PHASES }
const STEP_OF = { dur: DUR_STEP_OF, claims: CLAIMS_STEP_OF }

/** The headline's lines (`\n` in ko.js marks the break; there is no tone markup). */
export const headlineLines = (s) => String(s).split('\n').map((l) => l.trim()).filter(Boolean)

/**
 * Where the replay stands inside its steps: the current step and how far it is filled before and after
 * the running phase (0–1). A step spans one or more phases; usePhases restarts a paused phase from its
 * start, so the fill does too, which keeps it true after a pause or a scroll away.
 */
export function stepProgress(product, at) {
  const phases = PHASES[product]
  const stepOf = STEP_OF[product]
  const i = Math.min(Math.max(at, 0), phases.length - 1)
  const step = stepOf[phases[i].id]
  const own = phases.map((p, k) => ({ ...p, k })).filter((p) => stepOf[p.id] === step)
  const total = own.reduce((s, p) => s + p.ms, 0)
  const before = own.filter((p) => p.k < i).reduce((s, p) => s + p.ms, 0)
  return { step, from: before / total, to: (before + phases[i].ms) / total, ms: phases[i].ms }
}

export function Hero() {
  const { t } = useI18n()
  const h = t.landing.hero
  const reduce = useReducedMotion()
  const sectionRef = useRef(null)
  const [product, setProduct] = useState('dur')
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const [powered, setPowered] = useState(false)
  const [phase, setPhase] = useState({ product: 'dur', i: 0, cycle: 0 })
  const onScreen = useOnScreen(sectionRef)
  const playing = powered && onScreen && !paused && !reduce

  const autoRef = useRef(auto)
  autoRef.current = auto
  // A replay reached the end of its loop: switch product (autoplay) or let it loop.
  const onEnd = useCallback(() => {
    if (!autoRef.current) return false
    setProduct((p) => (p === 'dur' ? 'claims' : 'dur'))
    return true
  }, [])
  const onPhase = useCallback((k, i, cycle) => setPhase({ product: k, i, cycle }), [])
  const onPowered = useCallback(() => setPowered(true), [])

  const pick = (k) => {
    setAuto(false)
    if (k !== product) setProduct(k)
  }
  const name = BRAND[product].full
  const at = phase.product === product ? phase.i : 0
  const now = stepProgress(product, at)
  const steps = h.steps[product]
  const Replay = product === 'dur' ? DurReplay : ClaimsReplay

  return (
    <section ref={sectionRef} aria-labelledby="hero-title" className="lp-hero">
      <div className="lp-container lp-head">
        <div className="lp-head-main">
          <p className="lp-eyebrow">{h.label}</p>
          <h1 id="hero-title" className="lp-h1">
            {headlineLines(h.headline).map((line, i) => (
              <span key={i} className="lp-h1-line">
                {i > 0 ? ' ' : null}
                {line}
              </span>
            ))}
          </h1>
        </div>
        <div className="lp-head-aside">
          <p className="lp-lead"><Lines text={h.lead} /></p>
          <div className="lp-actions">
            <Link to="/dur#/emr/V1" className="nvb-btn">{h.primary}</Link>
            <Link to="/insurance" className="lp-btn-ghost">{h.secondary}</Link>
          </div>
        </div>
      </div>

      <div className="lp-container">
        <div className="lp-stage" data-product={product}>
          <div className="lp-device" id="lp-stage" role="tabpanel" aria-labelledby={`lp-tab-${product}`}>
            <LaptopRender className="lp-laptop" label={h.stageLabel(name)} onPowered={onPowered}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={product}
                  className="lp-screen"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                >
                  <Replay
                    playing={playing}
                    still={Boolean(reduce)}
                    onPhase={(i, cycle) => onPhase(product, i, cycle)}
                    onEnd={onEnd}
                  />
                </motion.div>
              </AnimatePresence>
            </LaptopRender>
          </div>

          <div className="lp-stage-foot">
            <div className="lp-stage-row">
              <div className="lp-switch" role="tablist" aria-label={h.switchLabel}>
                {ORDER.map((k) => {
                  const active = product === k
                  return (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      id={`lp-tab-${k}`}
                      aria-selected={active}
                      aria-controls="lp-stage"
                      tabIndex={active ? 0 : -1}
                      className="lp-switch-tab"
                      data-product={k}
                      onClick={() => pick(k)}
                      onKeyDown={(e) => {
                        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
                        e.preventDefault()
                        const next = ORDER[(ORDER.indexOf(k) + 1) % ORDER.length]
                        pick(next)
                        document.getElementById(`lp-tab-${next}`)?.focus()
                      }}
                    >
                      <BrandLockup product={k} height={16} />
                      <span className="lp-switch-aud">{h.products[k].audience}</span>
                    </button>
                  )
                })}
              </div>
              <p className="lp-stage-line">{h.products[product].line}</p>
              {reduce ? null : (
                <button type="button" className="lp-pause" onClick={() => setPaused((v) => !v)}>
                  {paused ? h.play : h.pause}
                </button>
              )}
            </div>
            <ol className="lp-steps" aria-label={h.stepsLabel(name)}>
              {steps.map((s, i) => {
                const state = i < now.step ? 'done' : i === now.step ? 'current' : 'todo'
                return (
                  <li key={s} className="lp-step" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
                    <span className="lp-step-track" aria-hidden="true">
                      {state === 'todo' ? null : (
                        <span
                          key={`${product}-${phase.cycle}-${at}-${playing ? 'run' : 'hold'}`}
                          className="lp-step-fill"
                          data-run={(state === 'current' && playing) || undefined}
                          style={state === 'done' ? { '--from': 1 } : { '--from': reduce ? now.to : now.from, '--to': now.to, '--ms': `${now.ms}ms` }}
                        />
                      )}
                    </span>
                    <span className="lp-step-n">{i + 1}</span>
                    {s}
                  </li>
                )
              })}
            </ol>
            <p className="lp-stage-note">{h.caption}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
