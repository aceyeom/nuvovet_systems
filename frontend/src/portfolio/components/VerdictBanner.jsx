import { FileText, ClipboardList, Activity, Plus } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import { SEVERITIES } from '../engine/findings.js'
import { SeverityIcon } from './SeverityTag.jsx'
import { severityWord, msText } from './format.js'

function splitHeadline(text) {
  const i = text.indexOf(' — ')
  if (i < 0) return [text, '']
  const rest = text.slice(i + 3)
  return [text.slice(0, i), rest.charAt(0).toUpperCase() + rest.slice(1)]
}

/**
 * Verdict: icon + word + headline + real counts + trace.
 * compact: one-line version for the mobile summary bar and the case study.
 */
export default function VerdictBanner({ result, reportHref, handoutHref, empty = false, compact = false, onAddDrug = null }) {
  const { t, pick } = useLang()
  const level = empty ? 'none' : result.verdict.level
  const counts = result.verdict.counts
  const [head, sub] = splitHeadline(pick(result.verdict.headline))
  const word = level === 'none' ? head : severityWord(level, pick)
  const { trace } = result

  if (compact) {
    return (
      <div className={`pf-verdict-compact pf-tone--${level}`}>
        <SeverityIcon severity={level} size={18} />
        <strong className="pf-verdict-compact__word">{empty ? t('rv.noDrugs') : level === 'none' ? t('sev.none') : word}</strong>
        {!empty && (
          <span className="pf-verdict-compact__counts">
            {SEVERITIES.filter((s) => counts[s] > 0).map((s) => (
              <span key={s} className={`pf-count pf-count--${s}`}>
                <SeverityIcon severity={s} size={12} />
                {counts[s]}
              </span>
            ))}
          </span>
        )}
      </div>
    )
  }

  return (
    <section className={`pf-verdict pf-tone--${level}`} aria-labelledby="pf-verdict-word">
      <div className="pf-verdict__icon">
        <SeverityIcon severity={level} size={24} />
      </div>
      <div className="pf-verdict__body">
        <div className="pf-verdict__eyebrow">{t('rv.verdict')}</div>
        {empty ? (
          <>
            <h2 className="pf-verdict__word" id="pf-verdict-word">{t('rv.noDrugs')}</h2>
            {onAddDrug && (
              <div>
                <button type="button" className="pf-btn pf-btn--primary pf-btn--sm pf-verdict__cta" onClick={onAddDrug}>
                  <Plus size={15} aria-hidden="true" />
                  {t('rv.addDrug')}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="pf-verdict__word" id="pf-verdict-word">{word}</h2>
            {sub && <p className="pf-verdict__headline">{sub}</p>}
            <ul className="pf-verdict__counts" aria-label={t('sev.legend')}>
              {SEVERITIES.map((s) => (
                <li key={s} className={`pf-count pf-count--${s}${counts[s] ? '' : ' is-zero'}`}>
                  <SeverityIcon severity={s} size={13} />
                  <span className="pf-count__n">{counts[s]}</span>
                  <span>{severityWord(s, pick)}</span>
                </li>
              ))}
              <li className="pf-count pf-count--meta">{counts.notes === 1 ? t('rv.noteCount') : t('rv.notesCount', { n: counts.notes })}</li>
              <li className={`pf-count pf-count--meta${counts.doseProblems ? ' is-strong' : ''}`}>
                {counts.doseProblems === 1 ? t('rv.doseProblem') : t('rv.doseProblems', { n: counts.doseProblems })}
              </li>
            </ul>
            <p className="pf-verdict__trace">
              <Activity size={12} aria-hidden="true" />
              {t('rv.trace', {
                pairs: trace.pairsEvaluated === 1 ? t('rv.pair') : t('rv.pairs', { n: trace.pairsEvaluated }),
                rules: t('rv.rules', { n: trace.rulesEvaluated }),
                ms: msText(trace.ms, t),
              })}
            </p>
          </>
        )}
      </div>
      {(reportHref || handoutHref) && !empty && (
        <div className="pf-verdict__actions">
          {reportHref && (
            <a className="pf-btn pf-btn--secondary pf-btn--sm" href={reportHref}>
              <FileText size={15} aria-hidden="true" />
              {t('rv.report')}
            </a>
          )}
          {handoutHref && (
            <a className="pf-btn pf-btn--secondary pf-btn--sm" href={handoutHref}>
              <ClipboardList size={15} aria-hidden="true" />
              {t('rv.handout')}
            </a>
          )}
        </div>
      )}
    </section>
  )
}
