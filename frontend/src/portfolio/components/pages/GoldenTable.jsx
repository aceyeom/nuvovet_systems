import { useMemo, useState } from 'react'
import { Check, X, RotateCw } from 'lucide-react'
import { useLang } from '../../i18n/index.js'
import { CASES } from '../../cases/cases.js'
import { analyze } from '../../engine/engine.js'
import { caseHref } from '../../router.js'
import SeverityTag from '../SeverityTag.jsx'
import { msText, severityWord } from '../format.js'
import { checkCase } from './goldenCheck.js'

function Mark({ pass }) {
  const { t } = useLang()
  return (
    <span className={`pf-pass${pass ? ' is-pass' : ' is-fail'}`}>
      {pass ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : <X size={14} strokeWidth={2.5} aria-hidden="true" />}
      {pass ? t('hw.gold.pass') : t('hw.gold.fail')}
    </span>
  )
}

function findingList(list, pick) {
  if (!list.length) return null
  return list.map((f) => `${f.ruleId} · ${severityWord(f.severity, pick)}`)
}

/** Runs analyze() on every golden case in the browser and compares with case.expect. */
export default function GoldenTable() {
  const { t, pick } = useLang()
  const [run, setRun] = useState(0)
  const rows = useMemo(() => {
    // `run` re-executes the engine so the timing column is a fresh measurement.
    void run
    return CASES.map((c) => {
      const result = analyze(c.input)
      return { c, result, check: checkCase(c, result) }
    })
  }, [run])
  const passed = rows.filter((r) => r.check.pass).length

  return (
    <div className="pf-gold">
      <div className="pf-gold__bar">
        <p className={`pf-gold__summary${passed === rows.length ? ' is-pass' : ' is-fail'}`} aria-live="polite">
          {passed === rows.length ? <Check size={16} strokeWidth={2.5} aria-hidden="true" /> : <X size={16} strokeWidth={2.5} aria-hidden="true" />}
          {t('hw.gold.summary', { passed, total: rows.length })}
        </p>
        <button type="button" className="pf-btn pf-btn--ghost pf-btn--sm" onClick={() => setRun((n) => n + 1)}>
          <RotateCw size={14} aria-hidden="true" />
          {t('hw.gold.rerun')}
        </button>
      </div>
      <table className="pf-gtable">
        <thead>
          <tr>
            <th scope="col">{t('hw.gold.case')}</th>
            <th scope="col">{t('hw.gold.expected')}</th>
            <th scope="col">{t('hw.gold.actual')}</th>
            <th scope="col">{t('hw.gold.checks')}</th>
            <th scope="col">{t('hw.gold.result')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ c, result, check }) => {
            const byId = Object.fromEntries(check.checks.map((x) => [x.id, x]))
            const expected = findingList(c.expect.findings, pick)
            const actual = findingList(result.findings, pick)
            return (
              <tr key={c.id}>
                <th scope="row" data-label={t('hw.gold.case')}>
                  <a href={caseHref(c.id)} className="pf-gtable__case">{pick(c.name)}</a>
                  <span className="pf-gtable__id">{c.id}</span>
                </th>
                <td data-label={t('hw.gold.expected')}>
                  <SeverityTag severity={c.expect.verdict} size="sm" />
                  <ul className="pf-gtable__list">
                    {expected ? expected.map((x) => <li key={x}>{x}</li>) : <li className="pf-muted">{t('hw.gold.noFindings')}</li>}
                  </ul>
                </td>
                <td data-label={t('hw.gold.actual')}>
                  <SeverityTag severity={result.verdict.level} size="sm" />
                  <ul className="pf-gtable__list">
                    {actual ? actual.map((x) => <li key={x}>{x}</li>) : <li className="pf-muted">{t('hw.gold.noFindings')}</li>}
                  </ul>
                  <span className="pf-gtable__ms">{msText(result.trace.ms, t)}</span>
                </td>
                <td data-label={t('hw.gold.checks')}>
                  <ul className="pf-gtable__checks">
                    {['verdict', 'findings', 'notes', 'doses'].map((k) => (
                      <li key={k} className={byId[k].pass ? 'is-pass' : 'is-fail'}>
                        {byId[k].pass ? <Check size={13} strokeWidth={2.5} aria-hidden="true" /> : <X size={13} strokeWidth={2.5} aria-hidden="true" />}
                        <span>{byId[k].expectedCount === 0 ? t(`hw.gold.check.${k}None`) : t(`hw.gold.check.${k}`, { n: byId[k].expectedCount ?? 0 })}</span>
                        <span className="pf-sr">{byId[k].pass ? t('hw.gold.pass') : t('hw.gold.fail')}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td data-label={t('hw.gold.result')}><Mark pass={check.pass} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
