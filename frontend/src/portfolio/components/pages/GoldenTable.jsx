import { useMemo, useState } from 'react'
import { Check, RotateCw, X } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { useLang } from '../../i18n/index.js'
import { CASES } from '../../cases/cases.js'
import { analyze } from '../../engine/engine.js'
import { caseHref } from '../../router.js'
import { msText, severityWord, caseName } from '../format.js'
import { checkCase } from './goldenCheck.js'

function Mark({ pass, children }) {
  const { t } = useLang()
  return pass ? (
    <span className="inline-flex items-center gap-1 text-sm text-foreground">
      <Check aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
      {children ?? t('hw.gold.pass')}
    </span>
  ) : (
    <span data-status="critical" className="inline-flex items-center gap-1 text-sm font-medium text-sev-critical">
      <X aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
      {children ?? t('hw.gold.fail')}
    </span>
  )
}

function findingList(list, pick) {
  if (!list.length) return null
  return list.map((f) => `${f.ruleId} ${severityWord(f.severity, pick)}`)
}

const TH = 'h-8 px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground first:pl-0'
const TD = 'px-3 py-2.5 align-top text-sm first:pl-0'

/** Runs analyze() on every golden case in the browser and compares the result with case.expect. */
export default function GoldenTable() {
  const { t, pick } = useLang()
  const [run, setRun] = useState(0)
  const rows = useMemo(() => {
    void run // re-executes the engine so the timing column is a fresh measurement
    return CASES.map((c) => {
      const result = analyze(c.input)
      return { c, result, check: checkCase(c, result) }
    })
  }, [run])
  const passed = rows.filter((r) => r.check.pass).length
  const verdictWord = (level) => (level === 'none' ? t('sev.none') : severityWord(level, pick))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite">
          <Mark pass={passed === rows.length}>{t('hw.gold.summary', { passed, total: rows.length })}</Mark>
        </p>
        <Button variant="ghost" size="sm" onClick={() => setRun((n) => n + 1)}>
          <RotateCw aria-hidden="true" strokeWidth={1.5} />
          {t('hw.gold.rerun')}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-border-strong">
              <th scope="col" className={TH}>{t('hw.gold.case')}</th>
              <th scope="col" className={TH}>{t('hw.gold.expected')}</th>
              <th scope="col" className={TH}>{t('hw.gold.actual')}</th>
              <th scope="col" className={TH}>{t('hw.gold.checks')}</th>
              <th scope="col" className={TH}>{t('hw.gold.result')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, result, check }) => {
              const byId = Object.fromEntries(check.checks.map((x) => [x.id, x]))
              const expected = findingList(c.expect.findings, pick)
              const actual = findingList(result.findings, pick)
              return (
                <tr key={c.id} className="border-b border-border">
                  <th scope="row" className={`${TD} text-left font-normal`}>
                    <a href={caseHref(c.id)} className="font-medium text-brand hover:underline">{caseName(c, pick)}</a>
                    <span className="id block text-xs text-muted-foreground">{c.id}</span>
                  </th>
                  <td className={TD}>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-sm font-medium text-foreground">{verdictWord(c.expect.verdict)}</span>
                      <ul className="flex flex-col text-xs text-text-2">
                        {expected ? expected.map((x) => <li key={x} className="id">{x}</li>) : <li>{t('hw.gold.noFindings')}</li>}
                      </ul>
                    </div>
                  </td>
                  <td className={TD}>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-sm font-medium text-foreground">{verdictWord(result.verdict.level)}</span>
                      <ul className="flex flex-col text-xs text-text-2">
                        {actual ? actual.map((x) => <li key={x} className="id">{x}</li>) : <li>{t('hw.gold.noFindings')}</li>}
                      </ul>
                      <span className="num text-xs text-muted-foreground">{msText(result.trace.ms, t)}</span>
                    </div>
                  </td>
                  <td className={TD}>
                    <ul className="flex flex-col gap-0.5">
                      {['verdict', 'findings', 'notes', 'doses'].map((k) => (
                        <li key={k} className="text-xs text-text-2">
                          {byId[k].expectedCount === 0 ? t(`hw.gold.check.${k}None`) : t(`hw.gold.check.${k}`, { n: byId[k].expectedCount ?? 0 })}
                          {byId[k].pass ? null : <span data-status="critical" className="ml-1 font-medium text-sev-critical">{t('hw.gold.fail')}</span>}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className={TD}><Mark pass={check.pass} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
