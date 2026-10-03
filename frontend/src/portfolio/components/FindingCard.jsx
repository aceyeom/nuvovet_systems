import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/ui/cn'
import { useLang } from '../i18n/index.js'
import Sev from './Severity.jsx'
import { CitationList } from './CitationChip.jsx'
import { drugShort } from './format.js'

/**
 * One merged problem as an EvidenceTrail row (DESIGN_SYSTEM.md §4.5, §5.5): SeverityBadge in the
 * title row, hairline-separated, no box. Contraindicated and major start expanded; moderate and
 * minor are one line until opened. Hover or focus reports the finding up so the prescription
 * rows and organ-matrix cells it involves are highlighted.
 */
export default function FindingCard({ finding, onHighlight, highlighted = false }) {
  const { t, pick } = useLang()
  const [open, setOpen] = useState(finding.severity === 'contraindicated' || finding.severity === 'major')
  const [details, setDetails] = useState(false)
  const bodyId = useId()
  const detailId = useId()
  const enter = () => onHighlight?.(finding.id)
  const leave = () => onHighlight?.(null)
  const factors = finding.factors.filter((f) => f.kind !== 'drug')
  const drugs = finding.drugIds.map((id) => drugShort(id, pick)).join(' + ')
  const [firstAction, ...moreActions] = finding.actions
  const rules = finding.trace?.rules?.length ? finding.trace.rules : [{ ruleId: finding.ruleId, ruleVersion: finding.ruleVersion }]
  const inputs = finding.trace?.inputs || []

  return (
    <li
      className={cn('flex flex-col gap-1 py-3 transition-colors duration-100', highlighted && 'bg-row-hover')}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) leave() }}
      data-finding={finding.id}
    >
      <div className="flex items-start gap-2">
        <span className="flex h-5 shrink-0 items-center">
          <Sev level={finding.severity} />
        </span>
        <h3 className="min-w-0 flex-1 text-sm leading-5 font-medium text-foreground">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((o) => !o)}
            className="group flex w-full items-start gap-2 rounded-sm text-left"
          >
            <span className={cn('min-w-0 flex-1 group-hover:underline', !open && 'truncate')} data-truncate={open ? undefined : ''} title={open ? undefined : pick(finding.title)}>
              {pick(finding.title)}
            </span>
            <ChevronRight aria-hidden="true" strokeWidth={1.5} className={cn('mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-150', open && 'rotate-90')} />
          </button>
        </h3>
        <span className="hidden shrink-0 text-xs leading-5 text-muted-foreground sm:inline">{drugs}</span>
      </div>

      <div id={bodyId} hidden={!open} className="flex flex-col gap-2 pt-1">
        <p className="text-sm text-text-2">{pick(finding.consequence)}</p>
        {factors.length ? (
          <p className="text-xs text-text-2">
            <span className="text-muted-foreground">{t('fc.patient')} </span>
            {factors.map((f) => pick(f.label)).join('; ')}
          </p>
        ) : null}
        {firstAction ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{t('fc.actions')}</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-foreground">
              <li>{pick(firstAction)}</li>
              {moreActions.map((a, i) => <li key={i}>{pick(a)}</li>)}
            </ul>
          </div>
        ) : null}

        <div>
          <button
            type="button"
            aria-expanded={details}
            aria-controls={detailId}
            onClick={() => setDetails((d) => !d)}
            className="inline-flex h-7 items-center gap-1 rounded-sm text-xs font-medium text-text-2 hover:text-foreground"
          >
            <ChevronRight aria-hidden="true" strokeWidth={1.5} className={cn('size-3.5 transition-transform duration-150', details && 'rotate-90')} />
            {t('fc.details')}
          </button>
          <div id={detailId} hidden={!details} className="flex flex-col gap-3 pt-1 pb-1 pl-5">
            {finding.why?.length ? (
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">{t('fc.why')}</p>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-text-2">
                  {finding.why.map((w, i) => <li key={i}>{pick(w)}</li>)}
                </ul>
              </div>
            ) : null}
            {finding.alternatives?.length ? (
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">{t('fc.alternatives')}</p>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-text-2">
                  {finding.alternatives.map((a, i) => <li key={i}>{pick(a)}</li>)}
                </ul>
              </div>
            ) : null}
            {inputs.length ? (
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">{t('fc.inputs')}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-strong text-left text-muted-foreground">
                        <th scope="col" className="h-7 pr-3 font-medium">{t('fc.fact')}</th>
                        <th scope="col" className="h-7 pr-3 font-medium">{t('fc.value')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inputs.map((inp, i) => (
                        <tr key={i} className="border-b border-border">
                          <td className="id h-7 pr-3 text-text-2">{inp.fact}</td>
                          <td className="h-7 pr-3 text-foreground">{inp.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Rule and evidence as two groups in a wrapping row: no "·" separators (§1.2 L9). */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-2">
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">{t('fc.rule')}</span>
            {rules.map((r, i) => (
              <span key={`${r.ruleId}-${i}`} className="inline-flex items-center gap-1">
                <span className="id">{r.ruleId}</span>
                <span className="id text-muted-foreground">v{r.ruleVersion}</span>
              </span>
            ))}
          </span>
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground">{t('fc.evidence')}</span>
            {finding.sources?.length ? <CitationList ids={finding.sources} max={2} /> : <span>{t('fc.mechanistic')}</span>}
          </span>
        </div>
      </div>
    </li>
  )
}

/** The finding list: EvidenceTrail container (hairlines, no boxes). */
export function FindingList({ findings, onHighlight, highlightedId }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {findings.map((f) => (
        <FindingCard key={f.id} finding={f} onHighlight={onHighlight} highlighted={highlightedId === f.id} />
      ))}
    </ul>
  )
}
