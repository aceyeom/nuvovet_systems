import { useId, useState } from 'react'
import { ChevronDown, PillBottle, Dna, PawPrint, Stethoscope, FlaskConical, CircleSlash, Syringe, Tag, Check } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import SeverityTag from './SeverityTag.jsx'
import { CitationList } from './CitationChip.jsx'
import RuleTrace from './RuleTrace.jsx'
import { drugShort } from './format.js'

export const FACTOR_ICON = {
  breed: Dna,
  mdr1: Dna,
  species: PawPrint,
  condition: Stethoscope,
  lab: FlaskConical,
  allergy: CircleSlash,
  dose: Syringe,
  drug: PillBottle,
}

export function FactorChip({ factor }) {
  const { pick } = useLang()
  const Icon = FACTOR_ICON[factor.kind] || Tag
  return (
    <span className={`pf-chip pf-chip--factor pf-chip--${factor.kind}`}>
      <Icon size={13} aria-hidden="true" />
      {pick(factor.label)}
    </span>
  )
}

export function DrugChip({ drugId }) {
  const { pick } = useLang()
  return (
    <span className="pf-chip pf-chip--rx">
      {drugShort(drugId, pick)}
    </span>
  )
}

function Section({ title, items, icon = null }) {
  const { pick } = useLang()
  if (!items?.length) return null
  return (
    <section className="pf-finding__section">
      <h4 className="pf-finding__h">{title}</h4>
      <ul className={`pf-list${icon ? ' pf-list--icon' : ''}`}>
        {items.map((it, i) => (
          <li key={i}>
            {icon}
            <span>{pick(it)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * One merged problem. Contraindicated/major open by default; moderate/minor
 * collapse to one line. Hover or focus reports the finding up so the
 * prescription rows and matrix cells it involves can be highlighted.
 */
export default function FindingCard({ finding, onHighlight, highlighted = false }) {
  const { t, pick } = useLang()
  const [open, setOpen] = useState(finding.severity === 'contraindicated' || finding.severity === 'major')
  const bodyId = useId()
  const enter = () => onHighlight?.(finding.id)
  const leave = () => onHighlight?.(null)
  const evidenceWord = t(`fc.evidence.${finding.evidence}`)
  const hasSources = finding.sources?.length > 0

  return (
    <article
      className={`pf-finding pf-tone--${finding.severity}${open ? ' is-open' : ''}${highlighted ? ' is-highlighted' : ''}`}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) leave() }}
      data-finding={finding.id}
    >
      <h3 className="pf-finding__title-wrap">
        <button
          type="button"
          className="pf-finding__head"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
        >
          <SeverityTag severity={finding.severity} size="sm" />
          <span className="pf-finding__title">{pick(finding.title)}</span>
          <ChevronDown size={16} aria-hidden="true" className="pf-finding__chev" />
          <span className="pf-sr">{open ? t('fc.collapse') : t('fc.expand')}</span>
        </button>
      </h3>
      <div className="pf-finding__body" id={bodyId} hidden={!open}>
        <div className="pf-chips" aria-label={t('fc.drugs')}>
          {finding.drugIds.map((id) => <DrugChip key={id} drugId={id} />)}
          {finding.factors.map((f) => <FactorChip key={`${f.kind}:${f.id}`} factor={f} />)}
        </div>
        <p className="pf-finding__consequence">{pick(finding.consequence)}</p>
        <Section title={t('fc.why')} items={finding.why} />
        <Section title={t('fc.actions')} items={finding.actions} icon={<Check size={14} aria-hidden="true" className="pf-list__icon" />} />
        <Section title={t('fc.alternatives')} items={finding.alternatives} />
        <section className="pf-finding__section">
          <h4 className="pf-finding__h">
            {t('fc.evidence')}
            <span className={`pf-evidence pf-evidence--${finding.evidence}`}>{evidenceWord}</span>
          </h4>
          {hasSources ? <CitationList ids={finding.sources} /> : <p className="pf-muted">{t('fc.mechanistic')}</p>}
        </section>
        <RuleTrace finding={finding} />
      </div>
    </article>
  )
}
