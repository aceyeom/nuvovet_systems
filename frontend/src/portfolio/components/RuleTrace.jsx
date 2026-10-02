import { ChevronRight } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import CitationChip from './CitationChip.jsx'
import { severityWord } from './format.js'

/** "Rule trace" disclosure: every contributing rule with its version, and the inputs it used. */
export default function RuleTrace({ finding }) {
  const { t, pick } = useLang()
  const rules = finding.trace?.rules?.length
    ? finding.trace.rules
    : [{ ruleId: finding.ruleId, ruleVersion: finding.ruleVersion, severity: finding.severity }]
  const inputs = finding.trace?.inputs || []
  return (
    <details className="pf-trace">
      <summary className="pf-trace__summary">
        <ChevronRight size={14} aria-hidden="true" className="pf-trace__chev" />
        {t('fc.trace')}
        <code className="pf-trace__id">{finding.ruleId}@{finding.ruleVersion}</code>
      </summary>
      <div className="pf-trace__body">
        <div className="pf-trace__label">{t('fc.rules')}</div>
        <ul className="pf-trace__rules">
          {rules.map((r, i) => (
            <li key={`${r.ruleId}-${i}`}>
              <code>{r.ruleId}@{r.ruleVersion}</code>
              <span className="pf-trace__sev">{severityWord(r.severity, pick)}</span>
            </li>
          ))}
        </ul>
        {inputs.length > 0 && (
          <>
            <div className="pf-trace__label">{t('fc.inputs')}</div>
            <div className="pf-table-wrap">
              <table className="pf-trace__table">
                <thead>
                  <tr>
                    <th scope="col">{t('fc.fact')}</th>
                    <th scope="col">{t('fc.value')}</th>
                    <th scope="col">{t('fc.source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {inputs.map((inp, i) => (
                    <tr key={i}>
                      <td><code>{inp.fact}</code></td>
                      <td>{inp.value}</td>
                      <td>{inp.source ? <CitationChip id={inp.source} /> : <span className="pf-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </details>
  )
}
