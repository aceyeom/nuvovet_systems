/**
 * How it works `#/how-it-works` — pipeline diagram, code excerpts, a live
 * golden-case table (analyze() on every case, in the browser), formulary
 * provenance, limitations and next steps.
 */

import { useMemo } from 'react'
import { ArrowRight, BookOpen, ChevronRight, FileText, ExternalLink } from 'lucide-react'
import '../styles/pages.css'
import { useLang } from '../i18n/index.js'
import { HREF } from '../router.js'
import { RULES, RULE_LAYERS } from '../engine/rules/index.js'
import { computeAmount, planForStrength } from '../engine/dose.js'
import { DRUGS, getStrength } from '../knowledge/drugs.js'
import { SOURCES, SOURCE_IDS, sourceHref } from '../knowledge/sources.js'
import { CASES } from '../cases/cases.js'
import PipelineDiagram from '../components/pages/PipelineDiagram.jsx'
import CodeExcerpt from '../components/pages/CodeExcerpt.jsx'
import GoldenTable from '../components/pages/GoldenTable.jsx'
import { Section } from '../components/pages/Prose.jsx'

const RULE_EXCERPT = `
const RULE = { id: 'MDR1_PGP_ML', version: '1.1.0' }

// Missing data is never treated as safe: a dose that
// cannot be calculated counts as a high dose.
const highDose = doseKnown ? perKg > thr.value : true
const atRisk = geno === 'mutant' || riskBreed

let severity = null
if (atRisk && highDose) severity = 'contraindicated'
else if (highDose && hasInhibitor) severity = 'major'
else if (atRisk) severity = hasInhibitor ? 'moderate' : 'minor'
else if (geno === 'unknown' && highDose) severity = 'moderate'
else if (geno === 'clear' && highDose) severity = 'minor'
else if (hasInhibitor) severity = 'minor'
if (!severity) continue

contributions.push({
  ruleId: RULE.id,
  ruleVersion: RULE.version,
  severity,
  problemKey: \`mdr1:\${drug.id}\`, // findings merge by problem
  drugIds: [drug.id, ...inhibitors.map((i) => i.drug.id)],
  factors, title, consequence, why, actions, alternatives,
  sources, // e.g. mealey2001, gramer2010, mueller2020
  evidence: 'literature',
})
`

const DOSE_EXCERPT = `
let mult = 1
if (parsed.basis === 'per_kg') {
  mult = w // dose per kg × body weight
} else if (parsed.basis === 'per_m2') {
  mult = bsaM2(w, species) // Meeh: K × W^(2/3) / 100
} // per animal: never multiplied by weight

const total = fixFloat(v * mult)
if (parsed.dimension === 'mass') {
  out.mg = toMg(total, parsed.numerator) // mcg, mg, g → mg
  out.perDose = displayMass(out.mg, parsed.numerator)
}
`

/** The same calls the unit tests make, executed now. */
function useLiveDoseExamples() {
  return useMemo(() => {
    const iver = computeAmount({ value: 300, unit: 'mcg/kg', weightKg: 24, species: 'dog' })
    const prevent = computeAmount({ value: 6, unit: 'mcg/kg', weightKg: 12, species: 'dog' })
    const mmi = computeAmount({ value: 2.5, unit: 'mg', weightKg: 4.1, species: 'cat' })
    const plan = planForStrength(iver.mg, getStrength('ivermectin', 'iver_sol_10'))
    return [
      { id: 'iver', working: iver.working },
      { id: 'plan', working: { en: `${iver.working.en.split(' = ').pop()} → ${plan.text.en}`, ko: `${iver.working.ko.split(' = ').pop()} → ${plan.text.ko}` } },
      { id: 'prevent', working: prevent.working },
      { id: 'mmi', working: mmi.working },
    ]
  }, [])
}

function useProvenance() {
  return useMemo(() => {
    const protocols = DRUGS.flatMap((d) => d.protocols)
    const kinds = {}
    for (const id of SOURCE_IDS) kinds[SOURCES[id].kind] = (kinds[SOURCES[id].kind] || 0) + 1
    const literature = SOURCE_IDS.filter((id) => ['doi', 'pmid'].includes(SOURCES[id].kind))
    const other = SOURCE_IDS.filter((id) => !['doi', 'pmid'].includes(SOURCES[id].kind))
    return {
      drugs: DRUGS.length,
      protocols: protocols.length,
      labelProtocols: protocols.filter((p) => p.labelStatus === 'label').length,
      sources: SOURCE_IDS.length,
      kinds,
      literature,
      other,
      rules: RULES.length,
      cases: CASES.length,
    }
  }, [])
}

function SourceItem({ id }) {
  const s = SOURCES[id]
  const href = sourceHref(id)
  const Icon = s.kind === 'label' ? FileText : BookOpen
  const ref = s.doi ? `doi:${s.doi}` : s.pmid ? `PMID ${s.pmid}` : null
  return (
    <li className="pf-srclist__item">
      <Icon size={14} aria-hidden="true" className="pf-srclist__icon" />
      <div>
        <p className="pf-srclist__cite">{s.cite}</p>
        {s.title && <p className="pf-srclist__title">{s.title}</p>}
        {ref && href && (
          <a className="pf-srclist__link" href={href} target="_blank" rel="noopener noreferrer">
            {ref}
            <ExternalLink size={11} aria-hidden="true" />
          </a>
        )}
      </div>
    </li>
  )
}

/**
 * A source list, collapsed at every width (the count is in its title): open,
 * 46 citations in one column buried the engine story under a bibliography.
 */
function SourceGroup({ title, ids }) {
  return (
    <details className="pf-srcgroup">
      <summary className="pf-srcgroup__summary">
        <ChevronRight size={16} aria-hidden="true" className="pf-srcgroup__chev" />
        <span className="pf-h3">{title}</span>
      </summary>
      <ul className="pf-srclist">{ids.map((id) => <SourceItem key={id} id={id} />)}</ul>
    </details>
  )
}

export default function HowItWorksPage() {
  const { t, pick } = useLang()
  const examples = useLiveDoseExamples()
  const p = useProvenance()
  const layers = Object.keys(RULE_LAYERS)

  return (
    <div className="pf-page pf-prose-page">
      <header className="pf-pagehead">
        <p className="pf-eyebrow">{t('hw.eyebrow')}</p>
        <h1 className="pf-h1">{t('hw.title')}</h1>
        <p className="pf-lead">{t('hw.lead')}</p>
      </header>

      <Section id="pipeline" title={t('hw.pipeline.title')} lead={t('hw.pipeline.lead')}>
        <PipelineDiagram />
        <ol className="pf-steps">
          {['input', 'resolve', 'rules', 'merge', 'render'].map((k, i) => (
            <li key={k}>
              <span className="pf-steps__n" aria-hidden="true">{i + 1}</span>
              <div>
                <p className="pf-steps__title">{t(`hw.step.${k}.title`)}</p>
                <p className="pf-steps__body">{t(`hw.step.${k}.body`, { n: RULES.length })}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="rules" title={t('hw.rules.title', { n: RULES.length })} lead={t('hw.rules.lead')}>
        <div className="pf-tablewrap">
          <table className="pf-rtable">
            <thead>
              <tr>
                <th scope="col">{t('hw.rules.id')}</th>
                <th scope="col">{t('hw.rules.name')}</th>
                <th scope="col">{t('hw.rules.layer')}</th>
                <th scope="col">{t('hw.rules.sources')}</th>
              </tr>
            </thead>
            <tbody>
              {layers.flatMap((layer) => RULES.filter((r) => r.layer === layer)).map((r) => (
                <tr key={r.id}>
                  <td data-label={t('hw.rules.id')}><code>{r.id}</code> <span className="pf-muted pf-small">v{r.version}</span></td>
                  <td data-label={t('hw.rules.name')}>{pick(r.name)}</td>
                  <td data-label={t('hw.rules.layer')}>{pick(RULE_LAYERS[r.layer])}</td>
                  <td data-label={t('hw.rules.sources')} className="pf-num">{r.sources.length ? r.sources.length : <span className="pf-muted">{t('hw.rules.noSources')}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="code" title={t('hw.code.title')} lead={t('hw.code.lead')}>
        <div className="pf-codegrid">
          <div className="pf-codegrid__item">
            <h3 className="pf-h3">{t('hw.code.rule')}</h3>
            <p className="pf-muted pf-small">{t('hw.code.ruleNote')}</p>
            <CodeExcerpt file={`engine/rules/mdr1PgpMl.js · ${t('hw.code.abridged')}`} code={RULE_EXCERPT} label={t('hw.code.rule')} />
          </div>
          <div className="pf-codegrid__item">
            <h3 className="pf-h3">{t('hw.code.dose')}</h3>
            <p className="pf-muted pf-small">{t('hw.code.doseNote')}</p>
            <CodeExcerpt file={`engine/dose.js · computeAmount() · ${t('hw.code.abridged')}`} code={DOSE_EXCERPT} label={t('hw.code.dose')} />
            <div className="pf-live-out">
              <p className="pf-live-out__title">{t('hw.code.liveTitle')}</p>
              <ul>
                {examples.map((e) => (
                  <li key={e.id}><span className="pf-live-out__label">{t(`hw.code.ex.${e.id}`)}</span><code>{pick(e.working)}</code></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Section id="golden" title={t('hw.gold.title')} lead={t('hw.gold.lead')}>
        <GoldenTable />
        <p className="pf-small pf-muted pf-after">{t('hw.gold.note')}</p>
      </Section>

      <Section id="provenance" title={t('hw.prov.title')} lead={t('hw.prov.lead')}>
        <dl className="pf-stats">
          <div><dt>{t('hw.prov.drugs')}</dt><dd className="pf-stats__n pf-num">{p.drugs}</dd><dd className="pf-stats__sub">{t('hw.prov.drugsSub', { n: p.protocols, label: p.labelProtocols, extra: p.protocols - p.labelProtocols })}</dd></div>
          <div><dt>{t('hw.prov.sources')}</dt><dd className="pf-stats__n pf-num">{p.sources}</dd><dd className="pf-stats__sub">{t('hw.prov.sourcesSub', { doi: p.kinds.doi || 0, pmid: p.kinds.pmid || 0, label: p.kinds.label || 0, guideline: p.kinds.guideline || 0 })}</dd></div>
          <div><dt>{t('hw.prov.rules')}</dt><dd className="pf-stats__n pf-num">{p.rules}</dd><dd className="pf-stats__sub">{t('hw.prov.rulesSub')}</dd></div>
          <div><dt>{t('hw.prov.cases')}</dt><dd className="pf-stats__n pf-num">{p.cases}</dd><dd className="pf-stats__sub">{t('hw.prov.casesSub')}</dd></div>
        </dl>
        <div className="pf-callout">
          <p className="pf-callout__title">{t('hw.prov.originTitle')}</p>
          <p>{t('hw.prov.origin')}</p>
        </div>
        <div className="pf-srcgroups">
          <SourceGroup title={t('hw.prov.literature', { n: p.literature.length })} ids={p.literature} />
          <SourceGroup title={t('hw.prov.labels', { n: p.other.length })} ids={p.other} />
        </div>
      </Section>

      <Section id="limits" title={t('hw.limits.title')}>
        <ul className="pf-bullets">
          {['validation', 'coverage', 'silence', 'organ', 'rounding', 'scope', 'copy'].map((k) => (
            <li key={k}>{t(`hw.limits.${k}`, { drugs: p.drugs, rules: p.rules })}</li>
          ))}
        </ul>
      </Section>

      <Section id="next" title={t('hw.next.title')}>
        <ol className="pf-bullets pf-bullets--num">
          {['review', 'pharmacist', 'drugs', 'retro', 'emr'].map((k) => <li key={k}>{t(`hw.next.${k}`)}</li>)}
        </ol>
      </Section>

      <nav className="pf-cta" aria-label={t('cs.ctaLabel')}>
        <a className="pf-btn pf-btn--primary" href={HREF.cases}>
          {t('cs.ctaCases')}
          <ArrowRight size={16} aria-hidden="true" />
        </a>
        <a className="pf-btn pf-btn--secondary" href={HREF.study}>{t('nav.study')}</a>
      </nav>
    </div>
  )
}
