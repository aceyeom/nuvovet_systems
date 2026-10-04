/**
 * Landing sections below the hero, in reading order:
 *   IndexSection     어디서부터 볼까요: three hairline rows (who · what · one sentence · a text link)
 *   DurChapter       #dur: copy and the four behaviours beside 초코's portrait; the island in its three
 *                    states (real UI, IslandMock); the patient index of the ten demo visits
 *   ClaimsChapter    #claims: a photograph beside the copy and one key figure; the worked ledger
 *   IntegrationSection #integration, SecuritySection #security, Closing (and PilotBand, only with a contact)
 * Typography carries the page: MaruBuri for the voice (static copy only), Pretendard for text and data.
 * No cards, icons, dots or entrance animations. Claims figures come only from the hero claim model
 * (heroClaim.json), never from ko.js.
 */
import { Link } from 'react-router-dom'
import { BrandLockup } from '@/brand/Brand'
import { PetAvatar } from '@/brand/PetAvatar'
import { PHOTOS } from '@/brand/photos'
import { CodeBlock } from '@/ui/patterns/CodeBlock'
import { fmtNum, fmtWon } from '@/ui/lib/format'
import { ClaimLedger } from '@/ui/ext/wp8/ClaimLedger'
import { ADJUDICATE_REQUEST_BODY, ADJUDICATE_RESPONSE_BODY } from '../insurance/apiExamples.js'
import { CONTACT_EMAIL, useI18n } from '../../i18n'
import { ledgerLines, ledgerTotals } from './ledger.js'
import { IslandMock } from './replays/IslandMock.jsx'
import { GALLERY, SEVERITY_WORD } from './replays/script.js'

/** A display title whose `\n` marks the wide-screen line break (each line wraps on its own below that). */
export function Lines({ text }) {
  return String(text).split('\n').map((line, i) => (
    <span key={i} className="lp-line">
      {i > 0 ? ' ' : null}
      {line}
    </span>
  ))
}

function Photo({ photo, caption, className, sizes }) {
  return (
    <figure className={`lp-photo${className ? ` ${className}` : ''}`}>
      <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} sizes={sizes} loading="lazy" decoding="async" />
      {caption ? <figcaption className="nvb-caption">{caption}</figcaption> : null}
    </figure>
  )
}

export function IndexSection() {
  const { t } = useI18n()
  const X = t.landing.index
  return (
    <section aria-labelledby="index-title" className="lp-section lp-index">
      <div className="lp-container lp-index-grid">
        <h2 id="index-title" className="lp-index-title nvb-d3">{X.title}</h2>
        <ul className="lp-index-rows">
          {X.rows.map((r) => (
            <li key={r.key} className="lp-index-row">
              <p className="lp-index-who nvb-label">{r.who}</p>
              <div className="lp-index-body">
                <h3 className="lp-index-what">{r.what}</h3>
                <p className="nvb-body">{r.text}</p>
              </div>
              <Link to={r.href} className="nvb-link lp-index-link">{r.link}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const ISLAND_STATES = ['idle', 'alert', 'resolved']

export function DurChapter() {
  const { t } = useI18n()
  const D = t.landing.dur
  const P = D.patients
  return (
    <section id="dur" aria-labelledby="dur-title" className="lp-chapter lp-dur" data-product="dur">
      <div className="lp-container lp-split">
        <div className="lp-split-text">
          <BrandLockup product="dur" height={18} className="lp-chapter-mark" />
          <h2 id="dur-title" className="nvb-d2"><Lines text={D.title} /></h2>
          <p className="nvb-lead lp-chapter-lead">{D.lead}</p>
          <dl className="lp-defs">
            {D.behaviours.map((b) => (
              <div key={b.term}>
                <dt>{b.term}</dt>
                <dd>{b.text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Photo photo={PHOTOS.chocoPortrait} caption={D.photoCaption} className="lp-split-photo lp-photo-portrait" sizes="(min-width: 1024px) 420px, 100vw" />
      </div>

      <div className="lp-studio">
        <div className="lp-container">
          <h3 id="island-states" className="lp-studio-title nvb-label">{D.island.label}</h3>
          <ol className="lp-states">
            {ISLAND_STATES.map((s, i) => (
              <li key={s} className="lp-state" data-state={s}>
                <div className="lp-state-ui" aria-hidden="true"><IslandMock state={s} still /></div>
                <p className="lp-state-caption"><span className="lp-state-n">{i + 1}</span>{D.island.states[s]}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="lp-container lp-patients">
        <div className="lp-patients-head">
          <h3 className="nvb-d3">{P.title}</h3>
          <p className="nvb-body">{P.lead}</p>
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
              <tr key={g.visit} data-tone={g.tone}>
                <td className="lp-pt-who">
                  <PetAvatar id={g.id} size={44} shape="square" alt="" />
                  <span className="lp-pt-name"><b>{g.name}</b><span>{g.sp}</span></span>
                </td>
                <td className="lp-pt-story">{g.story}</td>
                <td className="lp-pt-sev"><span data-tone={g.tone}>{SEVERITY_WORD[g.tone]}</span></td>
                <td className="lp-pt-open">
                  <Link to={`/dur#/emr/${g.visit}`} className="nvb-link" aria-label={`${g.name} ${P.open}`}>{P.open}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function ClaimsChapter({ claim }) {
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
    <section id="claims" aria-labelledby="claims-title" className="lp-chapter lp-claims" data-product="claims">
      <div className="lp-container lp-split lp-split-rev">
        <Photo photo={PHOTOS.kittenHands} caption={C.photoCaption} className="lp-split-photo lp-photo-wide" sizes="(min-width: 1024px) 560px, 100vw" />
        <div className="lp-split-text">
          <BrandLockup product="claims" height={18} className="lp-chapter-mark" />
          <h2 id="claims-title" className="nvb-d2"><Lines text={C.title} /></h2>
          <p className="nvb-lead lp-chapter-lead">{C.lead}</p>
          <div className="lp-keyfig">
            <p className="nvb-label">{C.figure.label}</p>
            <p className="lp-keyfig-value">{fmtWon(totals.reimbursed)}</p>
            <p className="nvb-caption">{C.figure.caption(fmtWon(totals.billed))}</p>
          </div>
        </div>
      </div>

      <div className="lp-container lp-ledger">
        <div className="lp-ledger-head">
          <h3 id="example" className="nvb-d3">{L.title}</h3>
          <p className="nvb-body">{L.lead(fmtNum(claim.lines.length), fmtNum(lines.length))}</p>
        </div>
        <ClaimLedger
          className="lp-ledger-table"
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
        <div className="lp-ledger-foot">
          <p className="nvb-caption">{L.sample(fmtNum(claim.claimsCount))} · <span className="lp-id">{claim.claim_id}</span></p>
          <Link to="/insurance" className="nvb-link">{C.cta}</Link>
        </div>
      </div>
    </section>
  )
}

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
  const cols = (str) => [...str].reduce((n, c) => n + (/[\u3131-\uD7A3]/.test(c) ? 2 : 1), 0)
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
/**
 * The two tabs, laid out for a column `width` monospace columns wide (66 beside the DUR column, 44 on a
 * phone). The excerpt shows a `// 외 N개` line; 복사 copies the whole body as valid JSON.
 */
const sampleTabs = (I, width) => [
  { value: 'request', label: I.tabs.request, code: compactJson(SAMPLE_REQUEST_BODY, { width, maxItems: 2 }), copy: JSON.stringify(SAMPLE_REQUEST_BODY, null, 2) },
  { value: 'response', label: I.tabs.response, code: compactJson(SAMPLE_RESPONSE_BODY, { width, maxItems: 1 }), copy: JSON.stringify(SAMPLE_RESPONSE_BODY, null, 2) },
]
const R = ADJUDICATE_RESPONSE_BODY
const SAMPLE_RESPONSE_BODY = {
  claim_id: R.claim_id,
  decision: R.decision,
  confidence: R.confidence,
  payable: { billed: R.payable.billed, deductible: R.payable.deductible, reimbursed: R.payable.reimbursed, capped_by: R.payable.capped_by },
  findings: R.findings.map(({ rule, item_ref }) => ({ rule, item_ref })),
}

export function IntegrationSection() {
  const { t } = useI18n()
  const I = t.landing.integration
  return (
    <section id="integration" aria-labelledby="integration-title" className="lp-section lp-integration">
      <div className="lp-container">
        <div className="lp-section-head">
          <h2 id="integration-title" className="nvb-d2"><Lines text={I.title} /></h2>
          <p className="nvb-lead">{I.lead}</p>
        </div>
        <div className="lp-int-grid">
          <div className="lp-int-col" data-product="claims">
            <div className="lp-int-title">
              <BrandLockup product="claims" height={18} />
              <code className="lp-endpoint">{I.method} {I.path}</code>
            </div>
            {/* one layout per column width (the other is display: none), so JSON never wraps mid-object */}
            <CodeBlock className="lp-code lp-code-wide min-w-0" tabs={sampleTabs(I, 66)} />
            <CodeBlock className="lp-code lp-code-narrow min-w-0" tabs={sampleTabs(I, 44)} />
            <dl className="lp-defs lp-defs-compact">
              {I.points.map((p) => (
                <div key={p.label}>
                  <dt>{p.label}</dt>
                  <dd>{p.text}</dd>
                </div>
              ))}
            </dl>
            <Link to="/insurance/api" className="nvb-link">{I.link}</Link>
          </div>
          <div className="lp-int-col" data-product="dur">
            <div className="lp-int-title">
              <BrandLockup product="dur" height={18} />
              <code className="lp-endpoint">{I.durFile}</code>
            </div>
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
            <p className="nvb-body">{I.durLead}</p>
            <Link to="/dur#/emr/V1" className="nvb-link">{I.durLink}</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export function SecuritySection() {
  const { t } = useI18n()
  const S = t.landing.security
  return (
    <section id="security" aria-labelledby="security-title" className="lp-section lp-security">
      <div className="lp-container lp-security-grid">
        <h2 id="security-title" className="nvb-d2"><Lines text={S.title} /></h2>
        <div className="lp-security-cols">
          {S.columns.map((c) => (
            <div key={c.title}>
              <h3 className="lp-security-head">{c.title}</h3>
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

export function Closing() {
  const { t } = useI18n()
  const C = t.landing.closing
  return (
    <section aria-labelledby="closing-title" className="lp-section lp-closing">
      <div className="lp-container lp-closing-grid">
        <div className="lp-closing-text">
          <h2 id="closing-title" className="nvb-d2"><Lines text={C.title} /></h2>
          <p className="nvb-lead">{C.lead}</p>
          <div className="lp-actions">
            <Link to="/dur#/emr/V1" className="nvb-btn">{C.primary}</Link>
            <Link to="/insurance" className="nvb-link">{C.secondary}</Link>
          </div>
        </div>
        <Photo photo={PHOTOS.dogHighkey} className="lp-closing-photo" sizes="(min-width: 1024px) 560px, 100vw" />
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
        <h2 id="pilot-title" className="nvb-d2">{P.title}</h2>
        <a href={`mailto:${CONTACT_EMAIL}`} className="nvb-btn">{P.button}</a>
      </div>
    </section>
  )
}
