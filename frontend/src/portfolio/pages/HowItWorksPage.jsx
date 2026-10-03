/**
 * How it works `#/how-it-works` (DESIGN_SYSTEM.md §5.5): the pipeline diagram, the rule table, two
 * engine excerpts with live output, the golden cases run live, how the EMR integration works,
 * provenance, limitations and next steps. At most ~120 words of prose per section.
 */

import { useMemo } from 'react'
import { Button } from '@/ui/primitives/button'
import { CodeBlock } from '@/ui/patterns/CodeBlock'
import { Disclosure } from '@/ui/patterns/Disclosure'
import { useLang } from '../i18n/index.js'
import { HREF } from '../router.js'
import { RULES, RULE_LAYERS } from '../engine/rules/index.js'
import { computeAmount, planForStrength } from '../engine/dose.js'
import { DRUGS, getStrength } from '../knowledge/drugs.js'
import { SOURCES, SOURCE_IDS } from '../knowledge/sources.js'
import { CASES } from '../cases/cases.js'
import { toCdsRequest } from '../emr/cds.js'
import { createDur } from '../emr/sdk.js'
import { loadVisit } from '../emr/fixtures.js'
import PipelineDiagram from '../components/pages/PipelineDiagram.jsx'
import GoldenTable from '../components/pages/GoldenTable.jsx'
import PageCrumbs from '../components/PageCrumbs.jsx'

const RULE_EXCERPT = `const RULE = { id: 'MDR1_PGP_ML', version: '1.1.0' }

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
})`

const DOSE_EXCERPT = `let mult = 1
if (parsed.basis === 'per_kg') {
  mult = w // dose per kg × body weight
} else if (parsed.basis === 'per_m2') {
  mult = bsaM2(w, species) // Meeh: K × W^(2/3) / 100
} // per animal: never multiplied by weight

const total = fixFloat(v * mult)
if (parsed.dimension === 'mass') {
  out.mg = toMg(total, parsed.numerator) // mcg, mg, g to mg
  out.perDose = displayMass(out.mg, parsed.numerator)
}`

/**
 * The EMR integration excerpt: the request the EMR demo really sends for visit V1 (emr/cds.js) and the
 * response the SDK really returns (emr/sdk.js), cut to the fields that explain the contract. CodeBlock
 * pretty-prints every level; arrays show their first element and "// 외 N개" (review P1-17).
 */
function useEmrExcerpt() {
  return useMemo(() => {
    const req = toCdsRequest(loadVisit('V1'))
    const res = createDur({ locale: 'ko', storage: null }).check(req)
    const entry = (e) => {
      const r = e.resource
      const d = r.dosageInstruction?.[0] || {}
      const rep = d.timing?.repeat || {}
      return {
        resource: {
          resourceType: r.resourceType,
          id: r.id,
          medicationCodeableConcept: { coding: (r.medicationCodeableConcept?.coding || []).map((c) => ({ code: c.code })) },
          dosageInstruction: [{
            doseAndRate: d.doseAndRate,
            timing: { repeat: { frequency: rep.frequency, period: rep.period, periodUnit: rep.periodUnit } },
          }],
        },
      }
    }
    const request = {
      hook: req.hook,
      context: {
        userId: req.context.userId,
        patientId: req.context.patientId,
        draftOrders: { resourceType: 'Bundle', entry: req.context.draftOrders.entry.map(entry) },
      },
      prefetch: {
        patient: { species: req.prefetch.patient.species, breed: req.prefetch.patient.breed },
        weight: req.prefetch.weight ? { valueQuantity: req.prefetch.weight.valueQuantity } : null,
      },
    }
    const card = (c) => ({
      summary: c.summary,
      indicator: c.indicator,
      source: { label: c.source?.label, topic: { code: c.source?.topic?.code } },
      suggestions: (c.suggestions || []).map((g) => ({ label: g.label, isRecommended: g.isRecommended, actions: g.actions.map((x) => ({ type: x.type, resourceId: x.resourceId })) })),
      extension: {
        severity: c.extension.severity,
        ruleVersion: c.extension.ruleVersion,
        primaryRowIds: c.extension.primaryRowIds,
        relatedRowIds: c.extension.relatedRowIds,
        blocking: c.extension.blocking,
      },
    })
    const response = {
      cards: res.cards.map(card),
      extension: {
        verdict: { level: res.extension.verdict?.level, complete: res.extension.verdict?.complete },
        coverage: { notChecked: res.extension.coverage?.notChecked },
      },
    }
    return { request, response }
  }, [])
}

/** The same calls the unit tests make, executed now. */
function useLiveDoseExamples() {
  return useMemo(() => {
    const iver = computeAmount({ value: 300, unit: 'mcg/kg', weightKg: 24, species: 'dog' })
    const prevent = computeAmount({ value: 6, unit: 'mcg/kg', weightKg: 12, species: 'dog' })
    const mmi = computeAmount({ value: 2.5, unit: 'mg', weightKg: 4.1, species: 'cat' })
    const plan = planForStrength(iver.mg, getStrength('ivermectin', 'iver_sol_10'))
    return [
      { id: 'iver', working: iver.working },
      { id: 'plan', working: { en: `${iver.working.en.split(' = ').pop()}: ${plan.text.en}`, ko: `${iver.working.ko.split(' = ').pop()}: ${plan.text.ko}` } },
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
  const ref = s.doi ? `doi:${s.doi}` : s.pmid ? `PMID ${s.pmid}` : null
  return (
    <li className="flex flex-col gap-0.5 py-2">
      <span className="text-sm text-foreground">{s.cite}</span>
      {s.title ? <span className="text-xs text-text-2">{s.title}</span> : null}
      {ref ? <span className="id text-xs text-muted-foreground">{ref}</span> : null}
    </li>
  )
}

function Section({ id, title, lead, children }) {
  return (
    <section aria-labelledby={`hw-${id}`} className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex max-w-[760px] flex-col gap-2">
        <h2 id={`hw-${id}`} className="text-2xl font-semibold text-foreground">{title}</h2>
        {lead ? <p className="text-base text-text-2">{lead}</p> : null}
      </div>
      {children}
    </section>
  )
}

const TH = 'h-8 px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground'

export default function HowItWorksPage() {
  const { t, pick, lang } = useLang()
  const jsonOptions = { maxItems: 1, more: (n) => (lang === 'ko' ? `// 외 ${n}개` : `// ${n} more`) }
  const examples = useLiveDoseExamples()
  const p = useProvenance()
  const emr = useEmrExcerpt()
  const layers = Object.keys(RULE_LAYERS)

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex max-w-[760px] flex-col gap-4">
        <PageCrumbs items={[{ label: t('nav.how') }]} />
        <h1 className="text-3xl font-bold text-foreground">{t('hw.title')}</h1>
        <p className="text-lg text-text-2">{t('hw.lead')}</p>
      </header>

      <Section id="pipeline" title={t('hw.pipeline.title')}>
        <PipelineDiagram />
        <ol className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
          {['input', 'resolve', 'rules', 'merge', 'render'].map((k, i) => (
            <li key={k} className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground"><span className="num mr-1.5 text-muted-foreground">{i + 1}</span>{t(`hw.step.${k}.title`)}</p>
              <p className="text-sm text-text-2">{t(`hw.step.${k}.body`, { n: RULES.length })}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="rules" title={t('hw.rules.title', { n: RULES.length })} lead={t('hw.rules.lead')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border-strong bg-subtle">
                <th scope="col" className={TH}>{t('hw.rules.id')}</th>
                <th scope="col" className={TH}>{t('hw.rules.name')}</th>
                <th scope="col" className={TH}>{t('hw.rules.layer')}</th>
                <th scope="col" className={`${TH} text-right`}>{t('hw.rules.sources')}</th>
              </tr>
            </thead>
            <tbody>
              {layers.flatMap((layer) => RULES.filter((r) => r.layer === layer)).map((r) => (
                <tr key={r.id} className="border-b border-border">
                  <td className="h-9 px-3 align-middle text-sm whitespace-nowrap">
                    <span className="id text-text-2">{r.id}</span> <span className="id text-xs text-muted-foreground">v{r.version}</span>
                  </td>
                  <td className="px-3 py-2 text-sm text-foreground">{pick(r.name)}</td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap text-text-2">{pick(RULE_LAYERS[r.layer])}</td>
                  <td className="num px-3 py-2 text-sm">{r.sources.length ? r.sources.length : <span className="text-muted-foreground">{t('hw.rules.noSources')}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="code" title={t('hw.code.title')}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="text-lg font-semibold text-foreground">{t('hw.code.rule')}</h3>
            <p className="text-sm text-text-2">{t('hw.code.ruleNote')}</p>
            <CodeBlock title={`engine/rules/mdr1PgpMl.js (${t('hw.code.abridged')})`} code={RULE_EXCERPT} />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="text-lg font-semibold text-foreground">{t('hw.code.dose')}</h3>
            <p className="text-sm text-text-2">{t('hw.code.doseNote')}</p>
            <CodeBlock title={`engine/dose.js computeAmount() (${t('hw.code.abridged')})`} code={DOSE_EXCERPT} />
            <dl className="flex flex-col gap-1 pt-1">
              <dt className="text-xs text-muted-foreground">{t('hw.code.liveTitle')}</dt>
              {examples.map((e) => (
                <dd key={e.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="text-text-2">{t(`hw.code.ex.${e.id}`)}</span>
                  <code className="mono text-foreground">{pick(e.working)}</code>
                </dd>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      <Section id="golden" title={t('hw.gold.title')} lead={t('hw.gold.lead')}>
        <GoldenTable />
        <p className="text-xs text-muted-foreground">{t('hw.gold.note')}</p>
      </Section>

      <Section id="emr" title={t('hw.emr.title')} lead={t('hw.emr.lead')}>
        <div className="grid gap-6 lg:grid-cols-2">
          <CodeBlock title={t('hw.emr.request')} json={emr.request} jsonOptions={jsonOptions} className="min-w-0" />
          <CodeBlock title={t('hw.emr.response')} json={emr.response} jsonOptions={jsonOptions} className="min-w-0" />
        </div>
        <div>
          <Button asChild>
            <a href={HREF.emr}>{t('hw.emr.open')}</a>
          </Button>
        </div>
      </Section>

      <Section
        id="provenance"
        title={t('hw.prov.title')}
        lead={t('hw.prov.summary', {
          drugs: p.drugs, protocols: p.protocols, label: p.labelProtocols, extra: p.protocols - p.labelProtocols,
          sources: p.sources, doi: p.kinds.doi || 0, pmid: p.kinds.pmid || 0,
        })}
      >
        <p className="max-w-[760px] text-sm text-text-2">{t('hw.prov.origin')}</p>
        <div className="flex max-w-[760px] flex-col border-y border-border">
          <Disclosure title={t('hw.prov.literature', { n: p.literature.length })} className="py-1">
            <ul className="divide-y divide-border pb-2">{p.literature.map((id) => <SourceItem key={id} id={id} />)}</ul>
          </Disclosure>
          <Disclosure title={t('hw.prov.labels', { n: p.other.length })} className="border-t border-border py-1">
            <ul className="divide-y divide-border pb-2">{p.other.map((id) => <SourceItem key={id} id={id} />)}</ul>
          </Disclosure>
        </div>
      </Section>

      <Section id="limits" title={t('hw.limits.title')}>
        <ul className="flex max-w-[760px] list-disc flex-col gap-2 pl-5 text-sm text-text-2">
          {['validation', 'coverage', 'silence', 'organ', 'rounding', 'scope', 'copy'].map((k) => (
            <li key={k}>{t(`hw.limits.${k}`, { drugs: p.drugs, rules: p.rules })}</li>
          ))}
        </ul>
      </Section>

      <Section id="next" title={t('hw.next.title')}>
        <ul className="flex max-w-[760px] list-disc flex-col gap-2 pl-5 text-sm text-text-2">
          {['review', 'pharmacist', 'drugs', 'retro', 'emr'].map((k) => <li key={k}>{t(`hw.next.${k}`)}</li>)}
        </ul>
      </Section>
    </div>
  )
}
