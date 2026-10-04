/**
 * Landing hero. One memorable element: the rendered laptop (LaptopRender). Around it everything is quiet:
 * a plain label, the two-line headline in the display face (one ink), the lead and two actions.
 *
 * The laptop opens once when it comes into view, powers on, and replays the products on its screen:
 * DUR (the legacy EMR with the island over it), then Claims (the console adjudicating the hero claim).
 * Under it, the product tabs are text: the lockup, one line, the audience. The active tab's top hairline
 * fills left to right in the product ink as the replay loops, so it doubles as the autoplay progress.
 * At the end of a loop the hero switches product unless a tab was picked; 일시정지 (at the end of the
 * step row it controls) stops the screen.
 * Reduced motion: the laptop is open and lit from the first paint and each replay holds its key frame.
 */
import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { BrandLockup, PRODUCTS as BRAND } from '@/brand/Brand'
import { useI18n } from '../../i18n'
import { DEVICE_BOX, LaptopRender } from './LaptopRender.jsx'
import { DurReplay, DUR_PHASES } from './replays/DurReplay.jsx'
import { ClaimsReplay, CLAIMS_PHASES } from './replays/ClaimsReplay.jsx'
import { useOnScreen } from './replays/timeline.js'
import { Lines } from './Sections.jsx'

const ORDER = ['dur', 'claims']
/** The device's place in the render frame, for the stage CSS (centre it on desktop, fit it to the column on phones). */
const STAGE_VARS = {
  '--lr-x0': DEVICE_BOX[0],
  '--lr-w': +(DEVICE_BOX[2] - DEVICE_BOX[0]).toFixed(4),
  '--lr-cx': +((DEVICE_BOX[0] + DEVICE_BOX[2]) / 2).toFixed(4),
}
const PHASES = { dur: DUR_PHASES, claims: CLAIMS_PHASES }
const LOOP_MS = { dur: DUR_PHASES.reduce((s, p) => s + p.ms, 0), claims: CLAIMS_PHASES.reduce((s, p) => s + p.ms, 0) }

/** The headline's lines (`\n` in ko.js marks the break; there is no tone markup). */
export const headlineLines = (s) => String(s).split('\n').map((l) => l.trim()).filter(Boolean)

/**
 * The active tab's hairline. It advances phase by phase in step with the replay (usePhases restarts a
 * paused phase from its start, so the line does too), which keeps it honest after a pause or scroll-away.
 */
function TabProgress({ product, at, cycle, running, still }) {
  const phases = PHASES[product]
  const i = Math.min(Math.max(at, 0), phases.length - 1)
  const from = phases.slice(0, i).reduce((s, p) => s + p.ms, 0) / LOOP_MS[product]
  const to = from + phases[i].ms / LOOP_MS[product]
  return (
    <span
      key={`${product}-${cycle}-${i}-${running ? 'run' : 'hold'}`}
      className="lp-tab-fill"
      data-run={running || undefined}
      style={{ '--from': still ? 1 : from, '--to': to, '--ms': `${phases[i].ms}ms` }}
      aria-hidden="true"
    />
  )
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
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState({ product: 'dur', i: 0, cycle: 0 })
  const onScreen = useOnScreen(sectionRef)
  const playing = powered && onScreen && !paused && !reduce

  const autoRef = useRef(auto)
  autoRef.current = auto
  // A replay reached the end of its loop: switch product (autoplay) or let it loop.
  const onEnd = useCallback(() => {
    if (!autoRef.current) return false
    setProduct((p) => (p === 'dur' ? 'claims' : 'dur'))
    setStep(0)
    return true
  }, [])
  const onPhase = useCallback((k, i, cycle) => setPhase({ product: k, i, cycle }), [])
  const onPowered = useCallback(() => setPowered(true), [])

  const pick = (k) => {
    setAuto(false)
    if (k !== product) {
      setProduct(k)
      setStep(0)
    }
  }
  const name = BRAND[product].full
  const at = phase.product === product ? phase.i : 0
  const steps = h.steps[product]
  const Replay = product === 'dur' ? DurReplay : ClaimsReplay

  return (
    <section ref={sectionRef} aria-labelledby="hero-title" className="lp-hero">
      <div className="lp-container lp-hero-head">
        <p className="lp-hero-label nvb-label">{h.label}</p>
        <h1 id="hero-title" className="lp-h1 nvb-d1">
          {headlineLines(h.headline).map((line, i) => (
            <span key={i} className="lp-h1-line">
              {i > 0 ? ' ' : null}
              {line}
            </span>
          ))}
        </h1>
        <div className="lp-hero-aside">
          <p className="nvb-lead lp-hero-lead"><Lines text={h.lead} /></p>
          <div className="lp-actions">
            <Link to="/dur#/emr/V1" className="nvb-btn">{h.primary}</Link>
            <Link to="/insurance" className="nvb-link">{h.secondary}</Link>
          </div>
        </div>
      </div>

      <div className="lp-stage" id="lp-stage" role="tabpanel" aria-labelledby={`lp-tab-${product}`} style={STAGE_VARS}>
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
                onStep={setStep}
                onPhase={(i, cycle) => onPhase(product, i, cycle)}
                onEnd={onEnd}
              />
            </motion.div>
          </AnimatePresence>
        </LaptopRender>
      </div>

      <div className="lp-container lp-under">
        <div className="lp-tabs" role="tablist" aria-label={h.switchLabel}>
          {ORDER.map((k) => {
            const p = h.products[k]
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
                className="lp-tab"
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
                <span className="lp-tab-rule" aria-hidden="true">
                  {active ? <TabProgress product={k} at={at} cycle={phase.cycle} running={playing} still={Boolean(reduce)} /> : null}
                </span>
                <BrandLockup product={k} height={18} />
                <span className="lp-tab-line">{p.line}</span>
                <span className="lp-tab-aud">{p.audience}</span>
              </button>
            )
          })}
        </div>
        <div className="lp-steps-row">
          <ol className="lp-steps" aria-label={h.stepsLabel(name)}>
            {steps.map((s, i) => (
              <li key={s} data-state={i < step ? 'done' : i === step ? 'current' : 'todo'} aria-current={i === step ? 'step' : undefined}>
                <span className="lp-step-n">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          {reduce ? null : (
            <button type="button" className="lp-pause" onClick={() => setPaused((v) => !v)}>
              {paused ? h.play : h.pause}
            </button>
          )}
        </div>
        <p className="lp-hero-caption nvb-caption">{h.caption}</p>
      </div>
    </section>
  )
}

export default Hero
