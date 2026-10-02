/**
 * Report `#/case/:id/report` — an A4 preview of the clinician report, printed
 * with window.print() on this page (@page A4; the prototype disclaimer repeats
 * in the footer of every printed page).
 */

import { ClipboardList } from 'lucide-react'
import '../styles/pages.css'
import { useLang } from '../i18n/index.js'
import { caseHref } from '../router.js'
import { RULES } from '../engine/rules/index.js'
import { DRUGS } from '../knowledge/drugs.js'
import { SOURCES, sourceHref } from '../knowledge/sources.js'
import { SEVERITIES } from '../engine/findings.js'
import { FREQUENCY_BY_ID } from '../engine/dose.js'
import useCaseResult from '../components/report/useCaseResult.js'
import { reportId, citedSources } from '../components/report/reportModel.js'
import PrintSheet from '../components/report/PrintSheet.jsx'
import DocToolbar from '../components/report/DocToolbar.jsx'
import PatientFacts from '../components/report/PatientFacts.jsx'
import DocNotFound from '../components/report/DocNotFound.jsx'
import { SeverityIcon } from '../components/SeverityTag.jsx'
import { DoseStatus, LabelStatus } from '../components/DoseTable.jsx'
import { drugName, drugShort, severityWord, fmtQ, rangeText, unitText, freqShort, sourceShort, amountCheck } from '../components/format.js'

function splitHeadline(text) {
  const i = text.indexOf(' — ')
  if (i < 0) return [text, '']
  const rest = text.slice(i + 3)
  return [text.slice(0, i), rest.charAt(0).toUpperCase() + rest.slice(1)]
}

/** Let long rule ids (IMMUNOSUPPRESSION_ADDITIVE) wrap after underscores, not mid-word. */
function breakable(id) {
  const parts = id.split('_')
  return parts.map((p, i) => (i < parts.length - 1 ? <span key={i}>{p}_<wbr /></span> : <span key={i}>{p}</span>))
}

function stampText(lang) {
  try {
    return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 16).replace('T', ' ')
  }
}

function Verdict({ result, empty }) {
  const { t, pick } = useLang()
  if (empty) {
    return (
      <div className="pf-rverdict pf-tone--none">
        <SeverityIcon severity="none" size={22} />
        <div>
          <p className="pf-rverdict__word">{t('rp.noRx')}</p>
          <p className="pf-rverdict__counts">{t('rv.noDrugs')}</p>
        </div>
      </div>
    )
  }
  const level = result.verdict.level
  const [head, sub] = splitHeadline(pick(result.verdict.headline))
  const c = result.verdict.counts
  const word = level === 'none' ? head : severityWord(level, pick)
  const parts = SEVERITIES.map((s) => `${c[s]} ${severityWord(s, pick)}`)
  parts.push(c.notes === 1 ? t('rv.noteCount') : t('rv.notesCount', { n: c.notes }))
  parts.push(c.doseProblems === 1 ? t('rv.doseProblem') : t('rv.doseProblems', { n: c.doseProblems }))
  return (
    <div className={`pf-rverdict pf-tone--${level}`}>
      <SeverityIcon severity={level} size={22} />
      <div>
        <p className="pf-rverdict__word">{word}</p>
        {sub && <p className="pf-rverdict__sub">{sub}</p>}
        <p className="pf-rverdict__counts">{parts.join(' · ')}</p>
      </div>
    </div>
  )
}

/**
 * Findings as blocks (not a 4-column table, which on a 670 px sheet left an
 * empty severity column and wrapped actions at three words a line):
 * severity · title · rule id on one line, then why | what to do side by side,
 * then sources as one footnote line.
 */
function FindingsList({ result, empty }) {
  const { t, pick, lang } = useLang()
  if (empty) return <p className="pf-doc__empty">{t('rv.noDrugs')}</p>
  if (!result.findings.length) {
    return <p className="pf-doc__empty">{t('rv.noFindings', { n: RULES.length })}</p>
  }
  return (
    <ol className="pf-rfindings">
      {result.findings.map((f) => {
        const factors = f.factors.filter((x) => x.kind !== 'drug')
        return (
          <li key={f.id} className={`pf-rfinding pf-tone--${f.severity}`}>
            <div className="pf-rfinding__head">
              <span className="pf-rsev">
                <SeverityIcon severity={f.severity} size={14} />
                {severityWord(f.severity, pick)}
              </span>
              <p className="pf-rfinding__title">{pick(f.title)}</p>
              <p className="pf-rfinding__rule">
                {f.trace.rules.map((r, i) => (
                  <span key={`${r.ruleId}-${i}`} className="pf-dtable__mono">{breakable(r.ruleId)}<span className="pf-rfinding__ver">@{r.ruleVersion}</span></span>
                ))}
              </p>
            </div>
            <p className="pf-rfinding__meta">
              {f.drugIds.map((d) => drugShort(d, pick)).join(' + ')}
              {factors.length > 0 && ` · ${factors.map((x) => pick(x.label)).join(' · ')}`}
            </p>
            <div className="pf-rfinding__cols">
              <div>
                <p className="pf-rfinding__h">{t('fc.why')}</p>
                <p className="pf-dtable__text">{pick(f.consequence)}</p>
              </div>
              <div>
                <p className="pf-rfinding__h">{t('fc.actions')}</p>
                <ul className="pf-dlist">
                  {f.actions.map((a, i) => <li key={i}>{pick(a)}</li>)}
                </ul>
                {f.alternatives.length > 0 && (
                  <>
                    <p className="pf-rfinding__h pf-rfinding__h--sub">{t('fc.alternatives')}</p>
                    <ul className="pf-dlist">
                      {f.alternatives.map((a, i) => <li key={i}>{pick(a)}</li>)}
                    </ul>
                  </>
                )}
              </div>
            </div>
            <p className="pf-rfinding__src">
              {t('fc.evidence')}: {t(`fc.evidence.${f.evidence}`)}
              {f.sources.length > 0 && ` · ${f.sources.map((x) => sourceShort(x, lang)).join('; ')}`}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

function perDayCell(row, t, lang) {
  if (row.perDay) return fmtQ(row.perDay, lang)
  if (row.frequency === 'once') return t('dc.single')
  const f = FREQUENCY_BY_ID[row.frequency]
  if (!f || f.perDay == null || f.perDay < 1) return t('dc.notDaily')
  return '—'
}

function DoseRows({ result }) {
  const { t, pick, lang } = useLang()
  if (!result.doses.length) return <p className="pf-doc__empty">{t('dc.empty')}</p>
  return (
    <table className="pf-dtable pf-dtable--doses">
      <thead>
        <tr>
          <th scope="col">{t('rp.col.drug')}</th>
          <th scope="col">{t('rp.col.prescribed')}</th>
          <th scope="col">{t('dc.howToGive')}</th>
          <th scope="col">{t('dc.reference')}</th>
          <th scope="col">{t('rp.col.status')}</th>
        </tr>
      </thead>
      <tbody>
        {result.doses.map((row, i) => {
          const ref = row.ref
          const refUnit = ref ? unitText(ref.per === 'day' ? `${ref.unit}/day` : ref.unit, lang) : ''
          const check = amountCheck(row)
          return (
            <tr key={`${row.drugId}-${i}`}>
              <td data-label={t('rp.col.drug')}>
                <p className="pf-dtable__strong">{drugName(row.drugId, pick)}</p>
                {ref?.indication && <p className="pf-dtable__meta">{pick(ref.indication)}</p>}
                {ref && <LabelStatus status={ref.labelStatus} />}
              </td>
              <td data-label={t('rp.col.prescribed')}>
                <p className="pf-num"><span className="pf-dtable__strong">{fmtQ(row.perDose, lang)}</span> {row.frequency ? freqShort(row.frequency, pick) : ''}</p>
                <p className="pf-dtable__meta pf-num">{t('dc.perDay')}: {perDayCell(row, t, lang)}</p>
                <p className="pf-dtable__meta">{pick(row.working)}</p>
              </td>
              <td data-label={t('dc.howToGive')}>
                {check?.kind === 'implausible' ? (
                  <p className="pf-dtable__warn">{t('dc.implausible')}</p>
                ) : (
                  <p className="pf-num">{pick(row.administration)}</p>
                )}
                {check?.kind === 'gap' && <p className="pf-dtable__warn">{t('rp.roundingSee')}</p>}
                {check?.kind === 'range' && <p className="pf-dtable__warn">{t('rp.roundingRange')}</p>}
              </td>
              <td data-label={t('dc.reference')}>
                {ref ? (
                  <>
                    <p className="pf-num">{rangeText(ref.min, ref.max, refUnit)}{ref.per !== 'day' ? ` ${t('dc.perDoseUnit')}` : ''}</p>
                    {ref.source && <p className="pf-dtable__meta">{sourceShort(ref.source, lang)}</p>}
                  </>
                ) : (
                  <p className="pf-dtable__meta">{t('dc.noRef')}</p>
                )}
              </td>
              <td data-label={t('rp.col.status')}><DoseStatus status={row.status} check={Boolean(check?.needsCheck)} /></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const NOTE_KIND = (n) => (n.category === 'validation' || n.category === 'rounding' ? n.category : n.kind)

function Notes({ result }) {
  const { t, pick } = useLang()
  if (!result.notes.length) return <p className="pf-doc__empty">{t('rv.noNotes')}</p>
  return (
    <ul className="pf-rnotes">
      {result.notes.map((n) => (
        <li key={n.id}>
          <span className="pf-rnotes__box" aria-hidden="true" />
          <div>
            <p className="pf-rnotes__meta">
              {t(`note.kind.${NOTE_KIND(n)}`)}
              {n.drugIds?.length > 0 && ` · ${n.drugIds.map((d) => drugShort(d, pick)).join(', ')}`}
            </p>
            <p>{pick(n.text)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function References({ ids }) {
  if (!ids.length) return null
  return (
    <ol className="pf-refs">
      {ids.map((id) => {
        const s = SOURCES[id]
        const href = sourceHref(id)
        return (
          <li key={id}>
            <span>{s.cite}</span>
            {s.title && <span className="pf-refs__title"> — {s.title}</span>}
            {s.doi && <> · <a href={href} target="_blank" rel="noopener noreferrer">doi:{s.doi}</a></>}
            {!s.doi && s.pmid && <> · <a href={href} target="_blank" rel="noopener noreferrer">PMID {s.pmid}</a></>}
          </li>
        )
      })}
    </ol>
  )
}

function Acknowledgement() {
  const { t } = useLang()
  return (
    <div className="pf-ack">
      <p className="pf-ack__lead">{t('rp.ack.lead')}</p>
      <ul className="pf-ack__opts">
        {['changed', 'dispensed', 'discussed'].map((k) => (
          <li key={k}><span className="pf-rnotes__box" aria-hidden="true" />{t(`rp.ack.${k}`)}</li>
        ))}
      </ul>
      <div className="pf-ack__lines">
        <div className="pf-ack__line pf-ack__line--wide"><span>{t('rp.ack.reason')}</span></div>
        <div className="pf-ack__line pf-ack__line--wide" aria-hidden="true"><span /></div>
      </div>
      <div className="pf-ack__sign">
        <div className="pf-ack__line"><span>{t('rp.ack.clinician')}</span></div>
        <div className="pf-ack__line"><span>{t('rp.ack.signature')}</span></div>
        <div className="pf-ack__line pf-ack__line--short"><span>{t('rp.ack.date')}</span></div>
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
  const name = caseDef ? pick(caseDef.name) : t('wb.custom.title')
  const edited = Boolean(caseDef && sParam)
  const sources = citedSources(result)
  const footer = (
    <div className="pf-docfoot">
      <strong>{t('doc.footer.disclaimer')}</strong>
      <span>{t('rp.footer', { id: rid })}</span>
    </div>
  )

  return (
    <div className="pf-page pf-docpage">
      <DocToolbar
        backHref={caseHref(id, 'workbench', sParam)}
        backLabel={t('doc.backToCase', { name })}
        title={t('rp.title')}
        sub={t('rp.sub')}
      >
        <a className="pf-btn pf-btn--secondary pf-btn--sm" href={caseHref(id, 'handout', sParam)}>
          <ClipboardList size={15} aria-hidden="true" />
          {t('rv.handout')}
        </a>
      </DocToolbar>

      <PrintSheet label={t('rp.title')} footer={footer} className="pf-report">
        <header className="pf-dochead">
          <div className="pf-dochead__main">
            <p className="pf-dochead__eyebrow">{t('app.name')}</p>
            <h2 className="pf-dochead__title">{t('rp.docTitle')}</h2>
            <p className="pf-dochead__warn">{t('app.disclaimer')}</p>
          </div>
          <dl className="pf-dochead__meta">
            <div><dt>{t('rp.id')}</dt><dd className="pf-mono">{rid}</dd></div>
            <div><dt>{t('rp.generated')}</dt><dd>{stamp}</dd></div>
            <div><dt>{t('rp.case')}</dt><dd>{name}{edited ? ` (${t('wb.edited')})` : ''}</dd></div>
            <div><dt>{t('rp.engine')}</dt><dd>{t('rp.engineValue', { rules: RULES.length, drugs: DRUGS.length })}</dd></div>
          </dl>
        </header>

        <section className="pf-docsec">
          <h3 className="pf-docsec__title">{t('rp.patient')}</h3>
          <PatientFacts input={input} />
        </section>

        <section className="pf-docsec">
          <h3 className="pf-docsec__title">{t('rv.verdict')}</h3>
          <Verdict result={result} empty={input.meds.length === 0} />
        </section>

        <section className="pf-docsec">
          <h3 className="pf-docsec__title">{t('rv.findings')} <span className="pf-docsec__n">{result.findings.length}</span></h3>
          <FindingsList result={result} empty={input.meds.length === 0} />
        </section>

        <section className="pf-docsec">
          <h3 className="pf-docsec__title">{t('dc.title')}</h3>
          <DoseRows result={result} />
        </section>

        <section className="pf-docsec">
          <h3 className="pf-docsec__title">{t('rv.notes')} <span className="pf-docsec__n">{result.notes.length}</span></h3>
          <Notes result={result} />
        </section>

        <section className="pf-docsec pf-docsec--keep">
          <h3 className="pf-docsec__title">{t('rp.ack.title')}</h3>
          <Acknowledgement />
        </section>

        {sources.length > 0 && (
          <section className="pf-docsec">
            <h3 className="pf-docsec__title">{t('rp.references')}</h3>
            <References ids={sources} />
          </section>
        )}
      </PrintSheet>
      <p className="pf-docnote pf-no-print">{t('rp.idNote')}</p>
    </div>
  )
}
