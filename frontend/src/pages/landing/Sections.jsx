/**
 * Landing sections below the hero, in reading order:
 *   DurChapter         #dur: the annotated EMR (the hero's DUR replay held on its alert frame, with four
 *                      numbered callouts and their legend), the island in its three states (IslandMock)
 *                      and the index of the ten demo visits
 *   ClaimsChapter      #claims: one worked claim as a single panel: its lines as typed, as coded and as
 *                      reviewed, then the payout as a ledger equation
 *   IntegrationSection #integration: the Claims request / response and the DUR script, a panel each
 *   ControlsSection    #security: data handling and decision controls, on the page's one ink band
 *   Closing            the two products as two doors (and PilotBand, only with a contact address)
 * Every chapter opens with the same head (ChapterHead: title left, lead and action right) and is built
 * on live product UI; there are no photographs, icons or entrance animations. Claims figures come only
 * from the hero claim model (heroClaim.json), never from ko.js.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLockup } from '@/brand/Brand'
import { PetAvatar } from '@/brand/PetAvatar'
import { CodeBlock } from '@/ui/patterns/CodeBlock'
import { fmtNum, fmtWon } from '@/ui/lib/format'
import { ClaimLedger } from '@/ui/ext/wp8/ClaimLedger'
import { ADJUDICATE_REQUEST_BODY, ADJUDICATE_RESPONSE_BODY } from '../insurance/apiExamples.js'
import { CONTACT_EMAIL, useI18n } from '../../i18n'
import { ledgerLines, ledgerTotals, payoutSteps } from './ledger.js'
import { DurReplay } from './replays/DurReplay.jsx'
import { IslandMock } from './replays/IslandMock.jsx'
import { GALLERY, SEVERITY_WORD } from './replays/script.js'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** A display title whose `\n` marks the wide-screen line break (each line wraps on its own below that). */
export function Lines({ text }) {
  return String(text).split('\n').map((line, i) => (
    <span key={i} className="lp-line">
      {i > 0 ? ' ' : null}
      {line}
    </span>
  ))
}

/**
 * The head every chapter shares (and the hero, in its own markup): the title on the left, the lead and
 * the chapter's actions on the right, their last lines level. `product` adds the lockup and its audience
 * over the title.
 */
function ChapterHead({ id, product, audience, title, lead, children }) {
  return (
    <div className="lp-head">
      <div className="lp-head-main">
        {product ? (
          <div className="lp-kicker">
            <BrandLockup product={product} height={20} />
            {audience ? <span className="lp-kicker-aud">{audience}</span> : null}
          </div>
        ) : null}
        <h2 id={id} className="lp-h2"><Lines text={title} /></h2>
      </div>
      {lead || children ? (
        <div className="lp-head-aside">
          {lead ? <p className="lp-lead">{lead}</p> : null}
          {children ? <div className="lp-actions">{children}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

/* ── DUR ───────────────────────────────────────────────────────────────────── */

/** The figure replay's own size (DurReplay `figure`: the 1200 px screen at a shorter height). */
const FIG = { w: 1200, h: 580 }
/**
 * What the figure shows, by its width on the page (replay pixels): the whole screen on a desktop, the
 * chart without the waiting list on a tablet, and the island over the prescription on a phone (too
 * tight for callouts, so the legend's numbers stand alone there).
 */
const CROPS = [
  { min: 900, x: 0, y: 0, w: FIG.w, h: FIG.h, pins: true },
  { min: 560, x: 244, y: 0, w: FIG.w - 244, h: FIG.h, pins: true },
  { min: 0, x: 372, y: 26, w: 456, h: 400, pins: false },
]

/**
 * The annotated EMR: the DUR replay held on its alert frame, scaled to the column. It is a picture
 * (role="img", inert), like the laptop's screen; a narrower crop marks itself with data-crop (the QA's
 * clipped-text check skips a picture that is cropped on purpose).
 */
function EmrFigure({ label }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(FIG.w)
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const update = () => setWidth(el.clientWidth || FIG.w)
    update()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  const crop = CROPS.find((c) => width >= c.min) || CROPS[0]
  const k = width / crop.w
  return (
    <div
      ref={ref}
      className="lp-emr"
      role="img"
      aria-label={label}
      data-pins={crop.pins || undefined}
      data-crop={crop.w < FIG.w || undefined}
      style={{ aspectRatio: `${crop.w} / ${crop.h}` }}
    >
      <div className="lp-emr-canvas" inert style={{ width: FIG.w, height: FIG.h, transform: `scale(${+k.toFixed(5)}) translate(${-crop.x}px, ${-crop.y}px)` }}>
        <DurReplay figure />
      </div>
    </div>
  )
}

const ISLAND_STATES = ['idle', 'alert', 'resolved']

export function DurChapter() {
  const { t, lang } = useI18n()
  const D = t.landing.dur
  const P = D.patients
  return (
    <section id="dur" aria-labelledby="dur-title" className="lp-chapter lp-dur" data-product="dur">
      <div className="lp-container">
        <ChapterHead id="dur-title" product="dur" audience={t.landing.hero.products.dur.audience} title={D.title} lead={D.lead}>
          <Link to="/dur#/emr/V1" className="nvb-btn">{D.cta}</Link>
          {/* the case study is bilingual: open it in the landing's language */}
          <Link to={`/dur#/?lang=${lang || 'ko'}`} className="lp-btn-ghost">{D.study}</Link>
        </ChapterHead>

        <figure className="lp-figure">
          <EmrFigure label={D.figure.label} />
          <figcaption className="lp-figcaption">{D.figure.caption}</figcaption>
        </figure>
        <ol className="lp-legend">
          {D.behaviours.map((b, i) => (
            <li key={b.term}>
              <span className="lp-pin" aria-hidden="true">{i + 1}</span>
              <h3 className="lp-h4">{b.term}</h3>
              <p>{b.text}</p>
            </li>
          ))}
        </ol>

        <div className="lp-states-tile">
          <h3 id="island-states" className="lp-h3">{D.island.label}</h3>
          <ol className="lp-states">
            {ISLAND_STATES.map((s, i) => (
              <li key={s} className="lp-state" data-state={s}>
                <div className="lp-state-ui" aria-hidden="true"><IslandMock state={s} still /></div>
                <p className="lp-state-caption"><span className="lp-pin" aria-hidden="true">{i + 1}</span>{D.island.states[s]}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="lp-patients">
          <div className="lp-subhead">
            <h3 className="lp-h3">{P.title}</h3>
            <p className="lp-body">{P.lead}</p>
          </div>
          <table className="lp-ptable">
            <caption className="sr-only">{P.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{P.cols.patient}</th>
                <th scope="col">{P.cols.visit}</th>
                <th scope="col">{P.cols.result}</th>
                <th scope="col"><span className="sr-only">{P.cols.open}</span></th>
              </tr>
            </thead>
            <tbody>
              {GALLERY.map((g) => (
                <tr key={g.visit}>
                  <td className="lp-pt-who">
                    <PetAvatar id={g.id} size={44} shape="rounded" alt="" />
                    <span className="lp-pt-name"><b>{g.name}</b><span>{g.sp}</span></span>
                  </td>
                  <td className="lp-pt-story">{g.story}</td>
                  <td className="lp-pt-sev"><span className="lp-sev" data-tone={g.tone}>{SEVERITY_WORD[g.tone]}</span></td>
                  <td className="lp-pt-open">
                    <Link to={`/dur#/emr/${g.visit}`} aria-label={`${g.name} ${P.open}`}>{P.open}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/* ── Claims ────────────────────────────────────────────────────────────────── */

export function ClaimsChapter({ claim }) {
  const { t } = useI18n()
  const C = t.landing.claims
  const L = t.landing.ledger
  const lines = ledgerLines(claim)
  const totals = ledgerTotals(claim)
  const steps = payoutSteps(claim)
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
  const meta = [
    [C.meta.clinic, C.meta.clinicValue(claim.clinic.name, claim.clinic.region)],
    [C.meta.patient, C.meta.patientValue(claim.patient.breed, claim.patient.age_years)],
    [C.meta.diagnosis, claim.diagnoses[0]?.name_ko],
    [L.totals.findings, L.findingsCount(fmtNum(totals.findings))],
  ].filter(([, v]) => v)
  return (
    <section id="claims" aria-labelledby="claims-title" className="lp-chapter lp-claims" data-product="claims">
      <div className="lp-container">
        <ChapterHead id="claims-title" product="claims" audience={t.landing.hero.products.claims.audience} title={C.title} lead={C.lead}>
          <Link to="/insurance" className="nvb-btn">{C.cta}</Link>
          <Link to="/insurance/api" className="lp-btn-ghost">{C.api}</Link>
        </ChapterHead>

        <figure className="lp-figure">
          <div className="lp-subhead">
            <h3 id="example" className="lp-h3">{L.title}</h3>
            <p className="lp-body">{L.lead(fmtNum(claim.lines.length), fmtNum(lines.length))}</p>
          </div>
          <div className="lp-claim">
            <div className="lp-claim-head">
              <div className="lp-claim-id">
                <b>{claim.claim_id}</b>
                <dl className="lp-claim-meta">
                  {meta.map(([k, v]) => (
                    <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
              </div>
              <span className="lp-decision">{C.decision[claim.decision] || C.decision.review}</span>
            </div>
            <ClaimLedger
              className="lp-ledger-table"
              caption={L.caption(claim.claim_id)}
              columns={L.cols}
              rows={rows}
              empty={L.noFinding}
              noCode={L.noCode}
            />
            {/* billed − deductions = payable; the operators are drawn by CSS between the cells */}
            <div role="group" aria-label={C.calc}>
              <dl className="lp-calc">
                {steps.map((s) => (
                  <div key={s.key} className="lp-calc-cell" data-total={s.total || undefined}>
                    <dt>{L.payout[s.key]}</dt>
                    <dd>{fmtWon(s.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="lp-claim-foot">
              <span>{L.sample(fmtNum(claim.claimsCount))}</span>
              <span className="lp-id">{C.engine(claim.engine_version)}</span>
            </p>
          </div>
        </figure>
      </div>
    </section>
  )
}

/* ── Integration ───────────────────────────────────────────────────────────── */

/**
 * The Claims sample in the 연동 section: a short request that is still a whole, valid body (closing
 * braces, every required field) and the matching part of the engine's answer, both cut from the API
 * page's SYN-2026-00220 example (numbers from data). Objects of plain values that fit stay on one line,
 * so neither tab needs an inner scroll.
 */
function compactJson(value, { width = 66, maxItems = Infinity } = {}) {
  const pad = (d) => '  '.repeat(d)
  const flat = (v) => v === null || typeof v !== 'object'
  // monospace columns: a Hangul syllable takes two
  const cols = (str) => [...str].reduce((n, c) => n + (/[ㄱ-힣]/.test(c) ? 2 : 1), 0)
  const walk = (v, d, lead) => {
    if (flat(v)) return JSON.stringify(v)
    if (Array.isArray(v)) {
      const shown = v.slice(0, maxItems)
      const lines = shown.map((x, i) => `${pad(d + 1)}${walk(x, d + 1, pad(d + 1))}${i < shown.length - 1 || v.length > shown.length ? ',' : ''}`)
      if (v.length > shown.length) lines.push(`${pad(d + 1)}// 외 ${v.length - shown.length}개`)
      return `[\n${lines.join('\n')}\n${pad(d)}]`
    }
    const keys = Object.keys(v)
    if (keys.every((k) => flat(v[k]))) {
      const one = `{ ${keys.map((k) => `${JSON.stringify(k)}: ${JSON.stringify(v[k])}`).join(', ')} }`
      if (cols(lead + one) + 1 <= width) return one
    }
    const lines = keys.map((k, i) => {
      const head = `${pad(d + 1)}${JSON.stringify(k)}: `
      return `${head}${walk(v[k], d + 1, head)}${i < keys.length - 1 ? ',' : ''}`
    })
    return `{\n${lines.join('\n')}\n${pad(d)}}`
  }
  return walk(value, 0, '')
}

const SAMPLE_CLAIM = ADJUDICATE_REQUEST_BODY.claim
const SAMPLE_FIRST = [SAMPLE_CLAIM.line_items[0], SAMPLE_CLAIM.line_items.find((l) => l.description.includes('장절개술'))].filter(Boolean)
const SAMPLE_LINES = [...SAMPLE_FIRST, ...SAMPLE_CLAIM.line_items.filter((l) => !SAMPLE_FIRST.includes(l))]
const SAMPLE_REQUEST_BODY = {
  claim: {
    claim_id: SAMPLE_CLAIM.claim_id,
    visit_date: SAMPLE_CLAIM.visit_date,
    clinic: { clinic_id: SAMPLE_CLAIM.clinic.clinic_id, region: SAMPLE_CLAIM.clinic.region },
    patient: { patient_id: SAMPLE_CLAIM.patient.patient_id, species: SAMPLE_CLAIM.patient.species },
    // the visit fee and the surgery the first finding is about (both quantity 1, the default) first,
    // the rest summarised
    line_items: SAMPLE_LINES.map(({ description, unit_price }) => ({ description, unit_price })),
    invoice_total: SAMPLE_CLAIM.invoice_total,
  },
  policy: { policy_id: ADJUDICATE_REQUEST_BODY.policy.policy_id, start_date: ADJUDICATE_REQUEST_BODY.policy.start_date },
}
const R = ADJUDICATE_RESPONSE_BODY
const SAMPLE_RESPONSE_BODY = {
  claim_id: R.claim_id,
  decision: R.decision,
  confidence: R.confidence,
  payable: { billed: R.payable.billed, deductible: R.payable.deductible, reimbursed: R.payable.reimbursed, capped_by: R.payable.capped_by },
  findings: R.findings.map(({ rule, item_ref }) => ({ rule, item_ref })),
}
/**
 * The two tabs, laid out for a panel `width` monospace columns wide (66 beside the DUR panel, 44 on a
 * phone). The excerpt shows a `// 외 N개` line; 복사 copies the whole body as valid JSON.
 */
const sampleTabs = (I, width) => [
  { value: 'request', label: I.tabs.request, code: compactJson(SAMPLE_REQUEST_BODY, { width, maxItems: 2 }), copy: JSON.stringify(SAMPLE_REQUEST_BODY, null, 2) },
  { value: 'response', label: I.tabs.response, code: compactJson(SAMPLE_RESPONSE_BODY, { width, maxItems: 1 }), copy: JSON.stringify(SAMPLE_RESPONSE_BODY, null, 2) },
]

export function IntegrationSection() {
  const { t } = useI18n()
  const I = t.landing.integration
  return (
    <section id="integration" aria-labelledby="integration-title" className="lp-section lp-integration">
      <div className="lp-container">
        <ChapterHead id="integration-title" title={I.title} lead={I.lead} />
        <div className="lp-int-grid">
          <div className="lp-int-col" data-product="claims">
            <div className="lp-int-title">
              <BrandLockup product="claims" height={18} />
              <code className="lp-endpoint"><b>{I.method}</b>{I.path}</code>
            </div>
            <div className="lp-int-body">
              {/* one layout per panel width (the other is display: none), so JSON never wraps mid-object */}
              <CodeBlock className="lp-code lp-code-wide min-w-0" tabs={sampleTabs(I, 66)} />
              <CodeBlock className="lp-code lp-code-narrow min-w-0" tabs={sampleTabs(I, 44)} />
            </div>
            <div className="lp-int-foot">
              <dl className="lp-defs">
                {I.points.map((p) => (
                  <div key={p.label}>
                    <dt>{p.label}</dt>
                    <dd>{p.text}</dd>
                  </div>
                ))}
              </dl>
              <Link to="/insurance/api" className="lp-textlink">{I.link}</Link>
            </div>
          </div>
          <div className="lp-int-col" data-product="dur">
            <div className="lp-int-title">
              <BrandLockup product="dur" height={18} />
              <code className="lp-endpoint">{I.durFile}</code>
            </div>
            <div className="lp-int-body">
              {/* set to 38 columns: it fits a phone without wrapping and ends level with the Claims sample */}
              <pre className="lp-snippet" tabIndex={0} aria-label={I.durFile}><code>
                <span className="c">{'// EMR 화면에 한 번'}</span>{'\n'}
                {'const dur = NuvoVetDUR.create({\n'}
                {"  layout: 'island',\n"}
                {'  island: { top: 78, dockable: true },\n'}
                {'  onEvent: (e) => emr.apply(e),\n'}
                {'})\n'}
                {'dur.mount({\n'}
                {'  badgeSlot: (rowId) => emr.cell(rowId),\n'}
                {'})\n\n'}
                <span className="c">{'// 처방이 바뀔 때마다'}</span>{'\n'}
                {'dur.check(\n'}
                {"  toCdsRequest(visit, 'order-select'),\n"}
                {')\n\n'}
                <span className="c">{'// 저장 버튼에서'}</span>{'\n'}
                {'const { proceed } = await dur.gate(\n'}
                {"  toCdsRequest(visit, 'order-sign'),\n"}
                {')'}
              </code></pre>
            </div>
            <div className="lp-int-foot">
              <dl className="lp-defs">
                {I.durPoints.map((p) => (
                  <div key={p.label}>
                    <dt>{p.label}</dt>
                    <dd>{p.text}</dd>
                  </div>
                ))}
              </dl>
              <Link to="/dur#/emr/V1" className="lp-textlink">{I.durLink}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Controls ──────────────────────────────────────────────────────────────── */

/**
 * One finding of the worked claim, as the engine returns it: the proof for the right-hand column
 * (every finding carries its rule ID, its basis and its amount; every response its engine version).
 */
function EvidenceCard({ claim, labels }) {
  const top = ledgerLines(claim, 1)[0]
  const f = top?.findings[0]
  if (!f) return null
  const rows = [
    [labels.rule, f.rule, true],
    [labels.item, `${top.line.code_name} ${top.line.code}`],
    [labels.basis, f.basis],
    [labels.impact, fmtWon(f.amount_at_risk)],
    [labels.engine, claim.engine_version, true],
  ].filter(([, v]) => v)
  return (
    <figure className="lp-evidence">
      <figcaption>{labels.label}</figcaption>
      <p className="lp-evidence-title">{f.title}</p>
      <dl>
        {rows.map(([k, v, code]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className={code ? 'lp-evidence-code' : 'lp-num'}>{v}</dd>
          </div>
        ))}
      </dl>
    </figure>
  )
}

export function ControlsSection({ claim }) {
  const { t } = useI18n()
  const S = t.landing.security
  return (
    <section id="security" aria-labelledby="security-title" className="lp-section lp-controls">
      <div className="lp-container lp-controls-grid">
        <div className="lp-controls-head">
          <h2 id="security-title" className="lp-h2"><Lines text={S.title} /></h2>
          {claim ? <EvidenceCard claim={claim} labels={S.evidence} /> : null}
        </div>
        <div className="lp-controls-cols">
          {S.columns.map((c) => (
            <div key={c.title}>
              <h3 className="lp-controls-title">{c.title}</h3>
              <ul className="lp-rules">
                {c.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Closing ───────────────────────────────────────────────────────────────── */

const DOORS = [
  { product: 'dur', to: '/dur#/emr/V1' },
  { product: 'claims', to: '/insurance' },
]

export function Closing() {
  const { t } = useI18n()
  const C = t.landing.closing
  const products = t.landing.hero.products
  return (
    <section aria-labelledby="closing-title" className="lp-section lp-closing">
      <div className="lp-container">
        <ChapterHead id="closing-title" title={C.title} lead={C.lead} />
        <div className="lp-doors">
          {DOORS.map(({ product, to }) => (
            <Link key={product} to={to} className="lp-door" data-product={product}>
              <BrandLockup product={product} tone="light" height={24} />
              <span className="lp-door-aud">{products[product].audience}</span>
              <span className="lp-door-line">{C.doors[product].line}</span>
              <span className="lp-door-cta">{C.doors[product].cta}</span>
            </Link>
          ))}
        </div>
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
        <a href={`mailto:${CONTACT_EMAIL}`} className="nvb-btn">{P.button}</a>
      </div>
    </section>
  )
}
