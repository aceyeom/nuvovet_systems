// Landing sections below the hero (DESIGN_SYSTEM.md §5.1). Every section has the same orientation:
// heading at the top left, content underneath. Numbers come only from the hero claim model.
import { Link } from 'react-router-dom'
import { Button } from '@/ui/primitives/button'
import { CodeBlock } from '@/ui/patterns/CodeBlock'
import { fmtNum, fmtWon } from '@/ui/lib/format'
import { ClaimLedger } from '@/ui/ext/wp8/ClaimLedger'
import { Badge } from '@/ui/primitives/badge'
import { ADJUDICATE_REQUEST_BODY, ADJUDICATE_RESPONSE_BODY, REQUEST_JSON_OPTIONS } from '../insurance/apiExamples.js'
import { CONTACT_EMAIL, useI18n } from '../../i18n'
import { ledgerLines, ledgerTotals } from './ledger.js'

const CONTAINER = 'mx-auto max-w-300 px-4 sm:px-6'
const H2 = 'text-3xl font-bold text-foreground'
const LEAD = 'mt-2 text-lg text-text-2'

export function LedgerSection({ claim }) {
  const { t } = useI18n()
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
    <section id="example" aria-labelledby="example-title" className="scroll-mt-16 border-t border-border py-16">
      <div className={CONTAINER}>
        <h2 id="example-title" className={H2}>
          {L.title}
        </h2>
        <p className={LEAD}>{L.lead(fmtNum(claim.lines.length), fmtNum(lines.length))}</p>
        <ClaimLedger
          className="mt-8"
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
      </div>
    </section>
  )
}

export function IntegrationSection() {
  const { t } = useI18n()
  const I = t.landing.integration
  return (
    <section id="integration" aria-labelledby="integration-title" className="scroll-mt-16 border-t border-border py-12">
      <div className={CONTAINER}>
        <h2 id="integration-title" className={H2}>
          {I.title}
        </h2>
        <p className={LEAD}>{I.lead}</p>
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <CodeBlock
            className="min-w-0 lg:col-span-8 [&_pre]:max-h-96 [&_pre]:overflow-y-auto"
            jsonOptions={REQUEST_JSON_OPTIONS}
            tabs={[
              { value: 'request', label: I.tabs.request, json: ADJUDICATE_REQUEST_BODY },
              { value: 'response', label: I.tabs.response, json: ADJUDICATE_RESPONSE_BODY },
            ]}
          />
          <div className="flex flex-col items-start gap-4 lg:col-span-4">
            <p className="flex flex-wrap items-center gap-2">
              <Badge variant="id">{I.method}</Badge>
              <span className="mono text-foreground">{I.path}</span>
            </p>
            <dl className="flex w-full flex-col divide-y divide-border border-y border-border">
              {I.points.map((p) => (
                <div key={p.label} className="flex flex-col gap-1 py-3">
                  <dt className="text-xs text-muted-foreground">{p.label}</dt>
                  <dd className="text-base text-foreground">{p.text}</dd>
                </div>
              ))}
            </dl>
            <Link
              to="/insurance/api"
              className="inline-flex h-8 items-center rounded-sm text-sm font-medium text-brand underline-offset-4 transition-colors duration-100 hover:text-brand-hover hover:underline"
            >
              {I.link}
            </Link>
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
    <section id="security" aria-labelledby="security-title" className="scroll-mt-16 border-t border-border py-12">
      <div className={CONTAINER}>
        <h2 id="security-title" className={H2}>
          {S.title}
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:gap-12">
          {S.columns.map((c) => (
            <div key={c.title} className="min-w-0">
              <h3 className="text-lg font-semibold text-foreground">{c.title}</h3>
              <ul className="mt-3 flex flex-col divide-y divide-border border-t border-border">
                {c.items.map((item) => (
                  <li key={item} className="py-3 text-base text-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Closing band: only with a public contact address (CONTACT_EMAIL), which the repo does not have. */
export function PilotBand() {
  const { t } = useI18n()
  const P = t.landing.pilot
  if (!CONTACT_EMAIL) return null
  return (
    <section aria-labelledby="pilot-title" className="border-t border-border bg-background py-24">
      <div className={CONTAINER}>
        <h2 id="pilot-title" className={H2}>
          {P.title}
        </h2>
        <Button asChild size="lg" className="mt-8">
          <a href={`mailto:${CONTACT_EMAIL}`}>{P.button}</a>
        </Button>
      </div>
    </section>
  )
}
