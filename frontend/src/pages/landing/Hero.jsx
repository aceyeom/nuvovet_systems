/**
 * Landing hero: headline (the two product words in their sub-brand colours), two product tickets
 * that are also the screen switch, a 3D laptop that opens on load and replays each product, floating
 * patient / payout cards around it, and a step rail that follows the replay. Auto-plays DUR then
 * Claims; picking a ticket stops the auto-switch.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import NumberFlow from '@number-flow/react'
import { ArrowUpRight, Check, Pause, Play, Radar, ReceiptText, ScanLine, TriangleAlert, Zap } from 'lucide-react'
import { BrandLockup } from '@/brand/Brand'
import { PetAvatar } from '@/brand/PetAvatar'
import { useI18n } from '../../i18n'
import { Laptop3D } from './Laptop3D.jsx'
import { DurReplay, DUR_PHASES } from './replays/DurReplay.jsx'
import { ClaimsReplay, CLAIMS_PHASES } from './replays/ClaimsReplay.jsx'
import { CLAIM, CLAIM_FINDINGS, CLAIM_LINES, DUR_CARD, fmtWon } from './replays/script.js'
import { useOnScreen } from './replays/timeline.js'

const LOOP_MS = {
  dur: DUR_PHASES.reduce((s, p) => s + p.ms, 0),
  claims: CLAIMS_PHASES.reduce((s, p) => s + p.ms, 0),
}
const HREF = { dur: '/dur#/emr/V1', claims: '/insurance' }

/** "[[a]] b {{c}}\nd" → lines of { text, tone } runs. */
export function headlineRuns(s) {
  return String(s)
    .split('\n')
    .map((line) => {
      const runs = []
      const re = /\[\[(.+?)\]\]|\{\{(.+?)\}\}|([^[{]+|[[{])/g
      let m
      while ((m = re.exec(line))) {
        if (m[1]) runs.push({ text: m[1], tone: 'dur' })
        else if (m[2]) runs.push({ text: m[2], tone: 'claims' })
        else runs.push({ text: m[3], tone: null })
      }
      return runs
    })
    .filter((r) => r.length)
}

/** Plain text of the headline (for tests and the document outline). */
export const headlineText = (s) => headlineRuns(s).map((runs) => runs.map((r) => r.text).join('')).join(' ')

function Backdrop() {
  return (
    <div className="lp-backdrop" aria-hidden="true">
      <span className="lp-blob lp-blob-a" />
      <span className="lp-blob lp-blob-b" />
      <span className="lp-blob lp-blob-c" />
      <span className="lp-gridlines" />
      <svg className="lp-ekg" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path d="M0 70 H360 l18 -2 l12 8 l14 -46 l16 74 l14 -40 l10 6 H760 l14 -4 l10 10 l12 -38 l16 58 l12 -30 l10 4 H1440" />
      </svg>
    </div>
  )
}

function Ticket({ k, active, auto, onPick, powered }) {
  const { t } = useI18n()
  const p = t.landing.hero.products[k]
  return (
    <div className="lp-ticket" data-product={k} data-active={active || undefined}>
      <button type="button" role="tab" aria-selected={active} aria-controls="lp-stage" className="lp-ticket-main" onClick={() => onPick(k)}>
        <span className="lp-ticket-top">
          <BrandLockup product={k} size="sm" />
          <span className="lp-ticket-aud">{p.audience}</span>
        </span>
        <span className="lp-ticket-line">{p.line}</span>
        <span className="lp-ticket-watch">
          {active ? <span className="lp-live"><span />{t.landing.hero.watching}</span> : <span>{t.landing.hero.watch}</span>}
        </span>
      </button>
      <Link to={HREF[k]} className="lp-ticket-cta">
        {p.cta}
        <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2} />
      </Link>
      {active && auto && powered ? <span key={`${k}-progress`} className="lp-ticket-progress" style={{ animationDuration: `${LOOP_MS[k]}ms` }} aria-hidden="true" /> : null}
    </div>
  )
}

function FloatCard({ className, children, delay = 0 }) {
  return (
    <motion.div
      className={`lp-float ${className}`}
      initial={{ y: 24, scale: 0.94, filter: 'blur(6px)' }}
      animate={{ y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.25 } }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="lp-float-inner">{children}</div>
    </motion.div>
  )
}

function DurFloats() {
  return (
    <>
      <FloatCard className="lp-f-tl" delay={0.15}>
        <div className="lp-pc">
          <PetAvatar id="1042" size={52} shape="rounded" name="초코" />
          <div>
            <b>초코 <span>#1042</span></b>
            <span>러프 콜리 · 4세 · 24.0 kg</span>
            <span className="lp-chip" data-tone="warn"><TriangleAlert size={12} strokeWidth={2} />MDR1 미검사</span>
          </div>
        </div>
      </FloatCard>
      <FloatCard className="lp-f-bl" delay={0.3}>
        <div className="lp-pc">
          <PetAvatar id="1310" size={52} shape="rounded" name="나비" />
          <div>
            <b>나비 <span>#1310</span></b>
            <span>코리안숏헤어 · 13세 · 4.1 kg</span>
            <span className="lp-chip" data-tone="mod">신장병 · 갑상선 · 주의 1</span>
          </div>
        </div>
      </FloatCard>
      <FloatCard className="lp-f-tr" delay={0.22}>
        <div className="lp-mc">
          <span className="lp-mc-icon" data-tone="dur"><Radar size={16} strokeWidth={1.75} /></span>
          <div>
            <b>처방이 바뀔 때마다 재검토</b>
            <span>규칙 {DUR_CARD.rules}개 · 종·품종·질환·용량</span>
          </div>
        </div>
        <svg className="lp-pulse" viewBox="0 0 160 28" aria-hidden="true"><path d="M0 16 H48 l6 -10 l8 18 l6 -12 l5 4 H160" /></svg>
      </FloatCard>
      <FloatCard className="lp-f-br" delay={0.38}>
        <div className="lp-code">
          <span><i>const</i> dur = NuvoVetDUR.<b>create</b>({'{'} layout: <em>&apos;island&apos;</em> {'}'})</span>
          <span>dur.<b>check</b>(cdsRequest)</span>
        </div>
      </FloatCard>
    </>
  )
}

function ClaimsFloats() {
  const top = CLAIM_FINDINGS[0]
  const sur = CLAIM_LINES.find((l) => l.code === top.item_ref)
  return (
    <>
      <FloatCard className="lp-f-tl" delay={0.15}>
        <div className="lp-mc">
          <span className="lp-mc-icon" data-tone="claims"><ScanLine size={16} strokeWidth={1.75} /></span>
          <div>
            <b>영수증 사진 수신</b>
            <span>{CLAIM.clinic.name} · 항목 {CLAIM.lines.length}개</span>
          </div>
        </div>
      </FloatCard>
      <FloatCard className="lp-f-bl" delay={0.3}>
        <div className="lp-mc">
          <span className="lp-mc-icon" data-tone="claims"><ReceiptText size={16} strokeWidth={1.75} /></span>
          <div>
            <b>{sur.raw}</b>
            <span className="lp-codechip"><i>{sur.code}</i>{sur.codeName}</span>
          </div>
        </div>
      </FloatCard>
      <FloatCard className="lp-f-tr" delay={0.22}>
        <div className="lp-pay">
          <span>지급 예정</span>
          <b><NumberFlow value={CLAIM.payable.reimbursed} locales="ko-KR" suffix="원" /></b>
          <span className="lp-pay-sub">청구 {fmtWon(CLAIM.payable.billed)} · 한도 적용</span>
        </div>
      </FloatCard>
      <FloatCard className="lp-f-br" delay={0.38}>
        <div className="lp-mc">
          <span className="lp-mc-icon" data-tone="crit"><Zap size={16} strokeWidth={1.75} /></span>
          <div>
            <b>{top.title}</b>
            <span>소견 금액 {fmtWon(top.amount_at_risk)}</span>
          </div>
        </div>
      </FloatCard>
    </>
  )
}

function StepRail({ steps, active, product }) {
  return (
    <ol className="lp-steps" data-product={product} aria-label="재생 단계">
      {steps.map((s, i) => (
        <li key={s} data-state={i < active ? 'done' : i === active ? 'current' : 'todo'} aria-current={i === active ? 'step' : undefined}>
          <span className="lp-step-dot">{i < active ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : i + 1}</span>
          <span className="lp-step-label">{s}</span>
        </li>
      ))}
    </ol>
  )
}

export function Hero() {
  const { t } = useI18n()
  const h = t.landing.hero
  const reduce = useReducedMotion()
  const sectionRef = useRef(null)
  const [product, setProduct] = useState('dur')
  const [auto, setAuto] = useState(true)
  const [powered, setPowered] = useState(false)
  const [step, setStep] = useState(0)
  const onScreen = useOnScreen(sectionRef)
  const playing = powered && onScreen && !reduce

  // Auto-switch after one full loop of the current replay.
  useEffect(() => {
    if (!auto || !playing) return undefined
    const id = setTimeout(() => setProduct((p) => (p === 'dur' ? 'claims' : 'dur')), LOOP_MS[product])
    return () => clearTimeout(id)
  }, [product, auto, playing])
  useEffect(() => { setStep(reduce ? 2 : 0) }, [product, reduce])

  const pick = (k) => {
    setProduct(k)
    setAuto(false)
  }
  const lines = headlineRuns(h.headline)
  const name = product === 'dur' ? 'nuvovet DUR' : 'nuvovet Claims'

  return (
    <section ref={sectionRef} aria-labelledby="hero-title" className="lp-hero" data-product={product}>
      <Backdrop />
      <div className="lp-container lp-hero-copy">
        <motion.p className="lp-eyebrow" initial={{ y: 10, filter: 'blur(6px)' }} animate={{ y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.6 }}>
          <span className="lp-eyebrow-dot" aria-hidden="true" />
          {h.eyebrow}
        </motion.p>
        <h1 id="hero-title" className="lp-h1">
          {lines.map((runs, i) => (
            <motion.span
              key={i}
              className="lp-h1-line"
              initial={{ y: 26, filter: 'blur(10px)' }}
              animate={{ y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.85, delay: 0.05 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {i > 0 ? <span className="sr-only"> </span> : null}
              {runs.map((r, j) => (r.tone ? <span key={j} className="lp-ink" data-tone={r.tone}>{r.text}</span> : <span key={j}>{r.text}</span>))}
            </motion.span>
          ))}
        </h1>
        <motion.p className="lp-lead" initial={{ y: 14, filter: 'blur(6px)' }} animate={{ y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.7, delay: 0.25 }}>
          {h.lead}
        </motion.p>
      </div>

      <motion.div
        className="lp-container lp-tickets"
        role="tablist"
        aria-label={h.switchLabel}
        initial={{ y: 18, filter: 'blur(6px)' }}
        animate={{ y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, delay: 0.35 }}
      >
        {['dur', 'claims'].map((k) => <Ticket key={k} k={k} active={product === k} auto={auto} powered={powered} onPick={pick} />)}
        <button type="button" className="lp-autoplay" onClick={() => setAuto((a) => !a)} aria-pressed={auto}>
          {auto ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {auto ? h.pause : h.play}
        </button>
      </motion.div>

      <div className="lp-stage" id="lp-stage" role="tabpanel" aria-label={name}>
        <div className="lp-floats" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.div key={product} className="lp-floats-set" exit={{ opacity: 0, transition: { duration: 0.25 } }}>
              {product === 'dur' ? <DurFloats /> : <ClaimsFloats />}
            </motion.div>
          </AnimatePresence>
        </div>
        <Laptop3D sectionRef={sectionRef} onPowered={() => setPowered(true)} label={h.stageLabel(name)} accent={product}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={product}
              className="lp-app"
              initial={{ opacity: 0, scale: 1.015, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.99, filter: 'blur(4px)' }}
              transition={{ duration: 0.45, ease: [0.2, 0.9, 0.3, 1] }}
            >
              {product === 'dur' ? <DurReplay playing={playing} onStep={setStep} /> : <ClaimsReplay playing={playing} onStep={setStep} />}
            </motion.div>
          </AnimatePresence>
        </Laptop3D>
      </div>

      <div className="lp-container lp-under">
        <StepRail steps={h.steps[product]} active={step} product={product} />
        <p className="lp-caption">{h.caption}</p>
      </div>
    </section>
  )
}

export default Hero
