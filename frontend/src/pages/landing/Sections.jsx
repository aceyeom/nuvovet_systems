/**
 * Landing sections below the hero. Each product owns a section in its colour (DUR teal, Claims
 * cobalt); the chooser above them sends each kind of visitor straight to the right demo.
 * Claims figures come only from the hero claim model (heroClaim.json).
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowRight, ArrowUpRight, Braces, Building2, Check, LockKeyhole, Scale, Stethoscope } from 'lucide-react'
import { BrandLockup, BrandMark } from '@/brand/Brand'
import { PetAvatar } from '@/brand/PetAvatar'
import { CodeBlock } from '@/ui/patterns/CodeBlock'
import { fmtNum, fmtWon } from '@/ui/lib/format'
import { ClaimLedger } from '@/ui/ext/wp8/ClaimLedger'
import { ADJUDICATE_REQUEST_BODY, ADJUDICATE_RESPONSE_BODY, REQUEST_JSON_OPTIONS } from '../insurance/apiExamples.js'
import { CONTACT_EMAIL, useI18n } from '../../i18n'
import { ledgerLines, ledgerTotals } from './ledger.js'
import { IslandMock } from './replays/IslandMock.jsx'
import { GALLERY, SEVERITY_WORD } from './replays/script.js'

const ROLE_ICON = { vet: Stethoscope, insurer: Building2, dev: Braces }

function Reveal({ children, className, delay = 0, as = 'div', ...rest }) {
  const reduce = useReducedMotion()
  const M = motion[as]
  return (
    <M
      className={className}
      initial={reduce ? false : { y: 36, scale: 0.985 }}
      whileInView={{ y: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </M>
  )
}

function SectionHead({ eyebrow, title, lead, product, id }) {
  return (
    <Reveal className="lp-head" data-product={product || undefined}>
      {eyebrow ? <p className="lp-kicker">{product ? <BrandLockup product={product} size="sm" /> : null}<span>{eyebrow}</span></p> : null}
      <h2 id={id} className="lp-h2">{title}</h2>
      {lead ? <p className="lp-sublead">{lead}</p> : null}
    </Reveal>
  )
}

export function ChooserSection() {
  const { t } = useI18n()
  const C = t.landing.chooser
  return (
    <section id="start" aria-labelledby="start-title" className="lp-section lp-chooser">
      <div className="lp-container">
        <SectionHead eyebrow={C.eyebrow} title={C.title} id="start-title" />
        <div className="lp-roles">
          {C.roles.map((r, i) => {
            const Icon = ROLE_ICON[r.key]
            return (
              <Reveal key={r.key} className="lp-role" data-product={r.product || 'master'} delay={i * 0.08}>
                <div className="lp-role-top">
                  <span className="lp-role-icon"><Icon size={20} strokeWidth={1.75} aria-hidden="true" /></span>
                  {r.product ? <BrandLockup product={r.product} size="sm" /> : <span className="lp-role-api"><BrandMark />API · SDK</span>}
                </div>
                <p className="lp-role-who">{r.who}</p>
                <h3>{r.title}</h3>
                <ul>
                  {r.points.map((p) => <li key={p}><Check size={15} strokeWidth={2.5} aria-hidden="true" />{p}</li>)}
                </ul>
                <Link to={r.href} className="lp-role-cta">
                  {r.cta}
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </Link>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const PLAY_STATES = ['idle', 'checking', 'alert', 'resolved', 'open']

function IslandPlayground() {
  const { t } = useI18n()
  const P = t.landing.dur.playground
  const ref = useRef(null)
  const inView = useInView(ref, { margin: '-120px' })
  const [state, setState] = useState('idle')
  const [auto, setAuto] = useState(true)
  useEffect(() => {
    if (!auto || !inView) return undefined
    const id = setTimeout(() => setState((s) => PLAY_STATES[(PLAY_STATES.indexOf(s) + 1) % PLAY_STATES.length]), state === 'alert' || state === 'open' ? 3200 : 1700)
    return () => clearTimeout(id)
  }, [state, auto, inView])
  return (
    <div className="lp-play" ref={ref}>
      <div className="lp-play-screen" aria-hidden="true">
        <div className="lp-play-bar"><span /><span /><span /></div>
        <div className="lp-play-tools">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</div>
        <div className="lp-play-island"><IslandMock state={state} /></div>
        <div className="lp-play-rows">{Array.from({ length: 6 }, (_, i) => <i key={i} style={{ width: `${88 - i * 9}%` }} />)}</div>
      </div>
      <div className="lp-play-controls" role="group" aria-label={P.label}>
        {PLAY_STATES.map((s) => (
          <button key={s} type="button" aria-pressed={state === s} onClick={() => { setState(s); setAuto(false) }}>{P.states[s]}</button>
        ))}
      </div>
    </div>
  )
}

export function DurSection() {
  const { t } = useI18n()
  const D = t.landing.dur
  return (
    <section id="dur" aria-labelledby="dur-title" className="lp-section lp-product" data-product="dur">
      <div className="lp-container">
        <SectionHead eyebrow={D.eyebrow} title={D.title} lead={D.lead} product="dur" id="dur-title" />
        <div className="lp-dur-grid">
          <Reveal className="lp-dur-play"><IslandPlayground /></Reveal>
          <div className="lp-features">
            {D.features.map((f, i) => (
              <Reveal key={f.title} className="lp-feature" delay={i * 0.06}>
                <span className="lp-feature-n">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal className="lp-gallery-head">
          <h3>{D.patients.title}</h3>
          <p>{D.patients.lead}</p>
        </Reveal>
        <div className="lp-gallery">
          {GALLERY.map((g, i) => (
            <Reveal key={g.visit} delay={(i % 5) * 0.05}>
              <Link to={`/dur#/emr/${g.visit}`} className="lp-pet" data-tone={g.tone}>
                <PetAvatar id={g.id} size={56} shape="rounded" name={g.name} />
                <span className="lp-pet-body">
                  <b>{g.name}<span>{g.sp}</span></b>
                  <span className="lp-pet-story">{g.story}</span>
                </span>
                <span className="lp-pet-sev">{SEVERITY_WORD[g.tone]}</span>
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal className="lp-section-cta">
          <Link to="/dur#/emr/V1" className="lp-btn" data-product="dur">
            {D.cta}
            <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

export function ClaimsSection({ claim }) {
  const { t } = useI18n()
  const C = t.landing.claims
  const L = t.landing.ledger
  const lines = ledgerLines(claim)
  const totals = ledgerTotals(claim)
  const rows = lines.map(({ index, line, findings }) => ({
    key: String(index),
    raw: {
      text: line.description,
      amount: fmtWon(line.total),
      meta: line.quantity > 1 ? L.unitPrice(fmtWon(line.unit_price), fmtNum(line.quantity)) : null,
    },
    std: { name: line.code_name, code: line.code, codeLabel: L.code },
    findings: findings.map((f, i) => ({
      key: `${f.rule}-${i}`,
      severity: f.severity,
      title: f.title,
      rule: f.rule,
      impact: f.amount_at_risk > 0 ? fmtWon(f.amount_at_risk) : null,
      basis: f.basis,
    })),
  }))
  return (
    <section id="claims" aria-labelledby="claims-title" className="lp-section lp-product" data-product="claims">
      <div className="lp-container">
        <SectionHead eyebrow={C.eyebrow} title={C.title} lead={C.lead} product="claims" id="claims-title" />
        <Reveal className="lp-ledger-stats">
          <div><span>{L.totals.billed}</span><b>{fmtWon(totals.billed)}</b></div>
          <div data-accent=""><span>{L.totals.reimbursed}</span><b>{fmtWon(totals.reimbursed)}</b></div>
          <div><span>{L.totals.findings}</span><b>{L.findingsCount(fmtNum(totals.findings))}</b></div>
        </Reveal>
        <Reveal className="lp-ledger-card">
          <div className="lp-ledger-head">
            <h3 id="example">{L.title}</h3>
            <p>{L.lead(fmtNum(claim.lines.length), fmtNum(lines.length))}</p>
          </div>
          <ClaimLedger
            caption={L.caption(claim.claim_id)}
            columns={L.cols}
            rows={rows}
            empty={L.noFinding}
            noCode={L.noCode}
            totals={[
              { key: 'billed', label: L.totals.billed, value: fmtWon(totals.billed) },
              { key: 'reimbursed', label: L.totals.reimbursed, value: fmtWon(totals.reimbursed) },
              { key: 'findings', label: L.totals.findings, value: L.findingsCount(fmtNum(totals.findings)) },
            ]}
          />
          <p className="lp-ledger-note">{L.sample(fmtNum(claim.claimsCount))} · {claim.claim_id}</p>
        </Reveal>
        <Reveal className="lp-section-cta">
          <Link to="/insurance" className="lp-btn" data-product="claims">
            {C.cta}
            <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

export function IntegrationSection() {
  const { t } = useI18n()
  const I = t.landing.integration
  return (
    <section id="integration" aria-labelledby="integration-title" className="lp-section lp-dark">
      <div className="lp-container">
        <SectionHead eyebrow={I.eyebrow} title={I.title} lead={I.lead} id="integration-title" />
        <div className="lp-int-grid">
          <Reveal className="lp-int-card" data-product="claims">
            <p className="lp-int-title"><BrandLockup product="claims" size="sm" tone="light" /><span className="lp-method">{I.method}</span><code>{I.path}</code></p>
            <CodeBlock
              className="lp-codeblock min-w-0 [&_pre]:max-h-80 [&_pre]:overflow-y-auto"
              jsonOptions={REQUEST_JSON_OPTIONS}
              tabs={[
                { value: 'request', label: I.tabs.request, json: ADJUDICATE_REQUEST_BODY },
                { value: 'response', label: I.tabs.response, json: ADJUDICATE_RESPONSE_BODY },
              ]}
            />
            <dl className="lp-int-points">
              {I.points.map((p) => (
                <div key={p.label}>
                  <dt>{p.label}</dt>
                  <dd>{p.text}</dd>
                </div>
              ))}
            </dl>
            <Link to="/insurance/api" className="lp-int-link">{I.link}<ArrowUpRight size={15} aria-hidden="true" /></Link>
          </Reveal>
          <Reveal className="lp-int-card" data-product="dur" delay={0.08}>
            <p className="lp-int-title"><BrandLockup product="dur" size="sm" tone="light" /><span className="lp-method">SDK</span><code>nuvovet-dur.js</code></p>
            <pre className="lp-snippet"><code>
              <span className="c">{'// EMR 화면에 한 번'}</span>{'\n'}
              <span className="k">const</span> dur = NuvoVetDUR.<span className="f">create</span>({'{'}{'\n'}
              {'  '}layout: <span className="s">&apos;island&apos;</span>,{'\n'}
              {'  '}island: {'{'} top: <span className="n">78</span>, dockable: <span className="k">true</span> {'}'},{'\n'}
              {'  '}onEvent: (e) =&gt; emr.<span className="f">apply</span>(e),{'\n'}
              {'}'}){'\n'}
              dur.<span className="f">mount</span>({'{'} badgeSlot: (rowId) =&gt; emr.<span className="f">cell</span>(rowId) {'}'}){'\n\n'}
              <span className="c">{'// 처방이 바뀔 때마다'}</span>{'\n'}
              dur.<span className="f">check</span>(<span className="f">toCdsRequest</span>(visit, <span className="s">&apos;order-select&apos;</span>)){'\n\n'}
              <span className="c">{'// 저장 버튼에서'}</span>{'\n'}
              <span className="k">const</span> {'{'} proceed {'}'} = <span className="k">await</span> dur.<span className="f">gate</span>(<span className="f">toCdsRequest</span>(visit, <span className="s">&apos;order-sign&apos;</span>))
            </code></pre>
            <p className="lp-int-lead">{I.durLead}</p>
            <Link to="/dur#/emr/V1" className="lp-int-link">EMR 데모에서 보기<ArrowUpRight size={15} aria-hidden="true" /></Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export function SecuritySection() {
  const { t } = useI18n()
  const S = t.landing.security
  const icons = [LockKeyhole, Scale]
  return (
    <section id="security" aria-labelledby="security-title" className="lp-section lp-security">
      <div className="lp-container">
        <SectionHead eyebrow={S.eyebrow} title={S.title} id="security-title" />
        <div className="lp-sec-grid">
          {S.columns.map((c, i) => {
            const Icon = icons[i] || LockKeyhole
            return (
              <Reveal key={c.title} className="lp-sec-card" delay={i * 0.08}>
                <h3><span><Icon size={18} strokeWidth={1.75} aria-hidden="true" /></span>{c.title}</h3>
                <ul>
                  {c.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function Band() {
  const { t } = useI18n()
  const B = t.landing.band
  const n = t.landing.hero.products
  return (
    <section aria-labelledby="band-title" className="lp-band">
      <div className="lp-container lp-band-inner">
        <Reveal>
          <h2 id="band-title" className="lp-h2">{B.title}</h2>
          <p className="lp-sublead">{B.lead}</p>
        </Reveal>
        <Reveal className="lp-band-ctas" delay={0.1}>
          <Link to="/dur#/emr/V1" className="lp-btn lp-btn-lg" data-product="dur">{n.dur.cta}<ArrowUpRight size={17} aria-hidden="true" /></Link>
          <Link to="/insurance" className="lp-btn lp-btn-lg" data-product="claims">{n.claims.cta}<ArrowUpRight size={17} aria-hidden="true" /></Link>
        </Reveal>
      </div>
    </section>
  )
}

/** Closing pilot band: only with a public contact address (CONTACT_EMAIL), which the repo does not have. */
export function PilotBand() {
  const { t } = useI18n()
  const P = t.landing.pilot
  if (!CONTACT_EMAIL) return null
  return (
    <section aria-labelledby="pilot-title" className="lp-section">
      <div className="lp-container">
        <h2 id="pilot-title" className="lp-h2">{P.title}</h2>
        <a href={`mailto:${CONTACT_EMAIL}`} className="lp-btn lp-btn-lg">{P.button}</a>
      </div>
    </section>
  )
}
