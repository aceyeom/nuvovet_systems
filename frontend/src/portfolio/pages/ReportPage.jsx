/**
 * Report `#/case/:id/report`: an A4 preview of the clinician report, printed with window.print()
 * on this page (@page A4 in styles/print.css; the prototype disclaimer repeats in the footer of
 * every printed page). Document design kept, restyled to the shared tokens (§5.5).
 */

import { ClipboardList } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/primitives/tooltip'
import '../styles/print.css'
import { useLang } from '../i18n/index.js'
import { caseHref, HREF } from '../router.js'
import { RULES } from '../engine/rules/index.js'
import { DRUGS } from '../knowledge/drugs.js'
import { SOURCES } from '../knowledge/sources.js'
import useCaseResult from '../components/report/useCaseResult.js'
import { reportId, citedSources } from '../components/report/reportModel.js'
import PrintSheet from '../components/report/PrintSheet.jsx'
import DocToolbar from '../components/report/DocToolbar.jsx'
import PatientFacts from '../components/report/PatientFacts.jsx'
import DocNotFound from '../components/report/DocNotFound.jsx'
import { noteKind } from '../components/NotesList.jsx'
import { verdictCounts } from '../components/VerdictBanner.jsx'
import Sev from '../components/Severity.jsx'
import { DoseStatus, LabelStatus, perDayText } from '../components/dose.jsx'
import { drugName, drugShort, fmtQ, rangeText, unitText, freqShort, sourceShort, amountCheck, caseName } from '../components/format.js'

function stampText(lang) {
  try {
    return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 16).replace('T', ' ')
  }
}

function DocSection({ title, count, children, keep = false }) {
  return (
    <section className={`mt-6 flex flex-col gap-3 ${keep ? 'pf-keep' : ''}`}>
      <h3 className="pf-keep-next flex items-baseline gap-2 border-b border-border-strong pb-1.5 text-base font-semibold text-foreground">
        {title}
        {count != null ? <span className="num text-sm font-normal text-muted-foreground">{count}</span> : null}
      </h3>
      {children}
    </section>
  )
}

function Verdict({ result, empty }) {
  const { t, pick } = useLang()
  if (empty) return <p className="text-sm text-text-2">{t('rp.noRx')}</p>
  const counts = verdictCounts(result, t, pick)
  return (
    <div className="pf-keep flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Sev level={result.verdict.level} size="md" />
        <p className="text-sm font-semibold text-foreground">{pick(result.verdict.action)}</p>
      </div>
      {counts.length ? <p className="text-sm text-text-2">{counts.join(' · ')}</p> : null}
    </div>
  )
}

/**
 * Findings as blocks: severity, title and rule id on one line, then why | what to do side by
 * side, then sources as one footnote line.
 */
function FindingsList({ result, empty }) {
  const { t, pick, lang } = useLang()
  if (empty) return <p className="text-sm text-text-2">{t('rv.noDrugs')}</p>
  if (!result.findings.length) return <p className="text-sm text-text-2">{t('rv.noFindings', { n: RULES.length })}</p>
  return (
    <ol className="flex flex-col divide-y divide-border">
      {result.findings.map((f) => {
        const factors = f.factors.filter((x) => x.kind !== 'drug')
        return (
          <li key={f.id} className="pf-keep flex flex-col gap-2 py-3 first:pt-0">
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <Sev level={f.severity} />
              <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">{pick(f.title)}</p>
              <p className="text-xs text-text-2">
                {f.trace.rules.map((r, i) => (
                  <span key={`${r.ruleId}-${i}`} className="id mr-2 inline-block">{r.ruleId} <span className="text-muted-foreground">v{r.ruleVersion}</span></span>
                ))}
              </p>
            </div>
            <p className="text-xs text-text-2">
              {f.drugIds.map((d) => drugShort(d, pick)).join(' + ')}
              {factors.length > 0 ? `. ${factors.map((x) => pick(x.label)).join(', ')}` : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">{t('fc.why')}</p>
                <p className="text-sm text-foreground">{pick(f.consequence)}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">{t('fc.actions')}</p>
                <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm text-foreground">
                  {f.actions.map((a, i) => <li key={i}>{pick(a)}</li>)}
                </ul>
                {f.alternatives.length > 0 ? (
                  <>
                    <p className="pt-1 text-xs text-muted-foreground">{t('fc.alternatives')}</p>
                    <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm text-foreground">
                      {f.alternatives.map((a, i) => <li key={i}>{pick(a)}</li>)}
                    </ul>
                  </>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('fc.evidence')}: {t(`fc.evidence.${f.evidence}`)}
              {f.sources.length > 0 ? `. ${f.sources.map((x) => sourceShort(x, lang)).join('; ')}` : ''}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

const DTH = 'h-8 pr-3 text-left align-bottom text-xs font-medium text-muted-foreground'
const DTD = 'py-2 pr-3 align-top text-sm'

function DoseRows({ result }) {
  const { t, pick, lang } = useLang()
  if (!result.doses.length) return <p className="text-sm text-text-2">{t('dc.empty')}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[24%]" />
          <col className="w-[22%]" />
          <col className="w-[18%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border-strong">
            <th scope="col" className={DTH}>{t('rp.col.drug')}</th>
            <th scope="col" className={DTH}>{t('rp.col.prescribed')}</th>
            <th scope="col" className={DTH}>{t('dc.howToGive')}</th>
            <th scope="col" className={DTH}>{t('dc.reference')}</th>
            <th scope="col" className={DTH}>{t('rp.col.status')}</th>
          </tr>
        </thead>
          {result.doses.map((row, i) => {
            const ref = row.ref
            const refUnit = ref ? unitText(ref.per === 'day' ? `${ref.unit}/day` : ref.unit, lang) : ''
            const check = amountCheck(row)
            return (
              <tbody key={`${row.drugId}-${i}`} className="pf-keep border-b border-border">
              <tr>
                <td className={DTD}>
                  <p className="font-medium text-foreground">{drugName(row.drugId, pick)}</p>
                  {ref?.indication ? <p className="text-xs text-text-2">{pick(ref.indication)}</p> : null}
                  {ref ? <LabelStatus status={ref.labelStatus} /> : null}
                </td>
                <td className={DTD}>
                  <p className="text-foreground"><span className="num text-left font-medium">{fmtQ(row.perDose, lang)}</span> {row.frequency ? freqShort(row.frequency, pick) : ''}</p>
                  <p className="text-xs text-text-2">{t('dc.perDay')} <span className="num text-left">{perDayText(row, t, lang)}</span></p>
                </td>
                <td className={DTD}>
                  {check?.kind === 'implausible' ? <p className="text-foreground">{t('dc.implausible')}</p> : <p className="text-foreground">{pick(row.administration)}</p>}
                  {check?.kind === 'gap' ? <p className="text-xs text-text-2">{t('rp.roundingSee')}</p> : null}
                  {check?.kind === 'range' ? <p className="text-xs text-text-2">{t('rp.roundingRange')}</p> : null}
                </td>
                <td className={DTD}>
                  {ref ? (
                    <>
                      <p className="num text-left text-foreground">{rangeText(ref.min, ref.max, refUnit)}{ref.per !== 'day' ? ` ${t('dc.perDoseUnit')}` : ''}</p>
                      {ref.source ? <p className="text-xs text-text-2">{sourceShort(ref.source, lang)}</p> : null}
                    </>
                  ) : (
                    <p className="text-xs text-text-2">{t('dc.noRefShort')}</p>
                  )}
                </td>
                <td className={DTD}><DoseStatus status={row.status} check={Boolean(check?.needsCheck)} /></td>
              </tr>
              {/* The calculation gets its own full-width line instead of three cramped lines in 처방. */}
              {row.working ? (
                <tr>
                  <td aria-hidden="true" />
                  <td colSpan={4} className="pr-3 pb-2 text-xs text-text-2 tabular-nums">{pick(row.working)}</td>
                </tr>
              ) : null}
              </tbody>
            )
          })}
      </table>
    </div>
  )
}

function Notes({ result }) {
  const { t, pick } = useLang()
  if (!result.notes.length) return <p className="text-sm text-text-2">{t('rv.noNotes')}</p>
  return (
    <ul className="flex flex-col gap-2">
      {result.notes.map((n) => (
        <li key={n.id} className="pf-keep flex items-start gap-2.5">
          <span className="pf-box mt-1" aria-hidden="true" />
          <div className="flex flex-col">
            <p className="text-xs text-muted-foreground">
              {t(`note.kind.${noteKind(n)}`)}
              {n.drugIds?.length > 0 ? `, ${n.drugIds.map((d) => drugShort(d, pick)).join(', ')}` : ''}
            </p>
            <p className="text-sm text-foreground">{pick(n.text)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function References({ ids }) {
  if (!ids.length) return null
  return (
    <ol className="flex list-decimal flex-col gap-1 pl-5 text-xs text-text-2">
      {ids.map((id) => {
        const s = SOURCES[id]
        return (
          <li key={id} className="pf-keep">
            <span className="text-foreground">{s.cite}</span>
            {s.title ? <span>. {s.title}</span> : null}
            {s.doi ? <span className="id">. doi:{s.doi}</span> : null}
            {!s.doi && s.pmid ? <span className="id">. PMID {s.pmid}</span> : null}
          </li>
        )
      })}
    </ol>
  )
}

function Line({ label, className = '' }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <div className="h-6 border-b border-input" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function Acknowledgement() {
  const { t } = useLang()
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground">{t('rp.ack.lead')}</p>
      <ul className="flex flex-col gap-1.5">
        {['changed', 'dispensed', 'discussed'].map((k) => (
          <li key={k} className="flex items-center gap-2.5 text-sm text-foreground"><span className="pf-box" aria-hidden="true" />{t(`rp.ack.${k}`)}</li>
        ))}
      </ul>
      <Line label={t('rp.ack.reason')} />
      <div className="grid grid-cols-[2fr_2fr_1fr] gap-4">
        <Line label={t('rp.ack.clinician')} />
        <Line label={t('rp.ack.signature')} />
        <Line label={t('rp.ack.date')} />
      </div>
    </div>
  )
}

export default function ReportPage({ route }) {
  const { t, pick, lang } = useLang()
  const data = useCaseResult(route)
  if (data.notFound) return <DocNotFound id={data.id} />
  const stamp = stampText(lang)

  const { id, caseDef, input, result, sParam } = data
  const rid = reportId(input)
  const name = caseDef ? caseName(caseDef, pick) : t('wb.custom.title')
  const edited = Boolean(caseDef && sParam)
  const sources = citedSources(result)
  const empty = input.meds.length === 0
  const footer = (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
      <span className="font-medium text-foreground">{t('doc.footer.disclaimer')}</span>
      <span>{t('rp.footer', { id: rid })}</span>
    </div>
  )

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8 print:block print:p-0">
      <DocToolbar
        crumbs={[{ label: t('nav.cases'), href: HREF.cases }, { label: name, href: caseHref(id, 'workbench', sParam) }, { label: t('rp.title') }]}
        title={t('rp.title')}
      >
        <Button variant="secondary" size="sm" asChild>
          <a href={caseHref(id, 'handout', sParam)}>
            <ClipboardList aria-hidden="true" strokeWidth={1.5} />
            {t('rv.handout')}
          </a>
        </Button>
      </DocToolbar>

      <PrintSheet label={t('rp.title')} footer={footer}>
        <header className="pf-keep flex flex-wrap items-start justify-between gap-6 border-b border-border-strong pb-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{t('app.name')}</p>
            <h2 className="text-2xl font-bold text-foreground">{t('rp.docTitle')}</h2>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted-foreground">{t('rp.id')}</dt>
            <dd className="id text-foreground">
              {/* How the ID is made is a detail for whoever asks, not a note under the document (review P2). */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} aria-describedby="rp-id-note" className="cursor-help rounded-sm underline decoration-border-strong decoration-dotted underline-offset-4 print:no-underline">{rid}</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-72">{t('rp.idNote')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span id="rp-id-note" className="sr-only">{t('rp.idNote')}</span>
            </dd>
            <dt className="text-muted-foreground">{t('rp.generated')}</dt><dd className="text-foreground">{stamp}</dd>
            <dt className="text-muted-foreground">{t('rp.case')}</dt><dd className="text-foreground">{name}{edited ? ` (${t('wb.edited')})` : ''}</dd>
            <dt className="text-muted-foreground">{t('rp.engine')}</dt><dd className="text-foreground">{t('rp.engineValue', { rules: RULES.length, drugs: DRUGS.length })}</dd>
          </dl>
        </header>

        <DocSection title={t('rp.patient')}><PatientFacts input={input} /></DocSection>
        <DocSection title={t('rv.verdict')}><Verdict result={result} empty={empty} /></DocSection>
        <DocSection title={t('rv.findings')} count={result.findings.length}><FindingsList result={result} empty={empty} /></DocSection>
        <DocSection title={t('dc.title')}><DoseRows result={result} /></DocSection>
        <DocSection title={t('rv.notes')} count={result.notes.length}><Notes result={result} /></DocSection>
        <DocSection title={t('rp.ack.title')} keep><Acknowledgement /></DocSection>
        {sources.length > 0 ? <DocSection title={t('rp.references')}><References ids={sources} /></DocSection> : null}
      </PrintSheet>
    </div>
  )
}
