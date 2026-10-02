import { useMemo } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { useLang } from '../../i18n/index.js'
import { CASE_BY_ID } from '../../cases/cases.js'
import { analyze } from '../../engine/engine.js'
import { caseHref } from '../../router.js'
import SpeciesGlyph from '../SpeciesGlyph.jsx'
import SeverityTag from '../SeverityTag.jsx'
import VerdictBanner from '../VerdictBanner.jsx'
import { DrugChip, FactorChip } from '../FindingCard.jsx'
import { CitationList } from '../CitationChip.jsx'
import { drugShort, fmtNum, freqShort, msText, unitText } from '../format.js'

/**
 * A live, read-only render of one golden case: the real engine runs on the
 * case's inputs when the page loads, and the verdict and top finding are
 * drawn from its result (not a screenshot).
 */
export default function LiveCaseRender({ caseId = 'choco' }) {
  const { t, pick, lang } = useLang()
  const c = CASE_BY_ID[caseId]
  const result = useMemo(() => analyze(c.input), [c])
  const top = result.findings[0] || null

  return (
    <div className="pf-livecase">
      <div className="pf-livecase__head">
        <span className="pf-livecase__glyph"><SpeciesGlyph species={c.species} size={24} /></span>
        <div className="pf-livecase__titles">
          <p className="pf-livecase__title">{pick(c.title)}</p>
          <p className="pf-livecase__sig">{pick(c.signalment)}</p>
        </div>
      </div>
      <div className="pf-livecase__rx">
        <span className="pf-eyebrow">{t('cases.rx')}</span>
        <ul className="pf-chips">
          {c.input.meds.map((m) => (
            <li key={m.drugId} className="pf-chip pf-chip--med">
              <span className="pf-chip__strong">{drugShort(m.drugId, pick)}</span>
              <span className="pf-num">{`${fmtNum(m.dose.value)} ${unitText(m.dose.unit, lang)}`}</span>
              <span className="pf-muted">{freqShort(m.frequency, pick)}</span>
            </li>
          ))}
        </ul>
      </div>

      <VerdictBanner result={result} />

      {top && (
        <article className={`pf-livefinding pf-tone--${top.severity}`} aria-label={t('cs.live.topFinding')}>
          <p className="pf-livefinding__eyebrow">{t('cs.live.topFinding')}</p>
          <div className="pf-livefinding__head">
            <SeverityTag severity={top.severity} size="sm" />
            <h3 className="pf-livefinding__title">{pick(top.title)}</h3>
          </div>
          <div className="pf-chips">
            {top.drugIds.map((id) => <DrugChip key={id} drugId={id} />)}
            {top.factors.filter((f) => f.kind !== 'drug').map((f) => <FactorChip key={`${f.kind}:${f.id}`} factor={f} />)}
          </div>
          <p className="pf-livefinding__text">{pick(top.consequence)}</p>
          <div className="pf-livefinding__cols">
            <div>
              <p className="pf-livefinding__h">{t('fc.actions')}</p>
              <ul className="pf-list pf-list--icon">
                {top.actions.map((a, i) => (
                  <li key={i}><Check size={14} aria-hidden="true" className="pf-list__icon" /><span>{pick(a)}</span></li>
                ))}
              </ul>
            </div>
            {top.alternatives.length > 0 && (
              <div>
                <p className="pf-livefinding__h">{t('fc.alternatives')}</p>
                <ul className="pf-list">
                  {top.alternatives.map((a, i) => <li key={i}><span>{pick(a)}</span></li>)}
                </ul>
              </div>
            )}
          </div>
          {top.sources.length > 0 && (
            <div className="pf-livefinding__ev">
              <p className="pf-livefinding__h">{t('fc.evidence')}</p>
              <CitationList ids={top.sources} />
            </div>
          )}
        </article>
      )}

      <div className="pf-livecase__foot">
        <p className="pf-livecase__note">
          {t('cs.live.note', { ms: msText(result.trace.ms, t), rule: top ? `${top.ruleId}@${top.ruleVersion}` : '—' })}
        </p>
        <a className="pf-btn pf-btn--secondary pf-btn--sm" href={caseHref(c.id)}>
          {t('cs.live.open', { name: pick(c.name) })}
          <ArrowRight size={15} aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}
