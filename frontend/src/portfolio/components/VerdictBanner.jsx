import { cn } from '@/ui/cn'
import { useLang } from '../i18n/index.js'
import { SEVERITIES } from '../engine/findings.js'
import Sev, { VERDICT_TINT } from './Severity.jsx'
import { severityWord } from './format.js'

/** Non-zero counts only (§1.2 L11): "금기 1 · 투여량 확인 1". */
export function verdictCounts(result, t, pick) {
  const c = result.verdict.counts
  const parts = SEVERITIES.filter((s) => c[s] > 0).map((s) => `${severityWord(s, pick)} ${c[s]}`)
  if (c.doseChecks > 0) parts.push(t(c.doseChecks === 1 ? 'rv.doseChecks.one' : 'rv.doseChecks', { n: c.doseChecks }))
  return parts
}

/**
 * Verdict summary (§5.5): the one tinted surface of the workbench, with the 28 % border. Badge +
 * the engine's action line + non-zero counts. `actions` sits on the right (report, handout links).
 */
export default function VerdictBanner({ result, empty = false, actions = null, emptyAction = null, className }) {
  const { t, pick } = useLang()
  const level = empty ? 'none' : result.verdict.level
  const counts = empty ? [] : verdictCounts(result, t, pick)
  return (
    <section
      aria-labelledby="pf-verdict"
      data-status={level}
      className={cn('flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center', VERDICT_TINT[level], className)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {empty ? null : <Sev level={level} size="md" />}
          <h2 id="pf-verdict" className="text-base font-semibold text-foreground">
            {empty ? t('rv.noDrugs') : pick(result.verdict.action)}
          </h2>
        </div>
        {counts.length ? <p className="text-sm text-text-2">{counts.join(' · ')}</p> : null}
      </div>
      {empty ? emptyAction : actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      <p className="sr-only" aria-live="polite">
        {empty ? t('rv.noDrugs') : `${pick(result.verdict.action)}. ${counts.join(', ')}`}
      </p>
    </section>
  )
}
