/**
 * Case study `#/` (DESIGN_SYSTEM.md §5.5): breadcrumb, heading, two lines of lead, one ink button
 * and a link, a live crop of the EMR DUR panel for visit V1 (초코) beside the problem and what was
 * built, then the design principles with numbers read from the engine's own data.
 */

import { Button } from '@/ui/primitives/button'
import { useLang } from '../i18n/index.js'
import { HREF } from '../router.js'
import { RULES, RULE_LAYERS } from '../engine/rules/index.js'
import { DRUGS } from '../knowledge/drugs.js'
import { SOURCE_IDS } from '../knowledge/sources.js'
import { CASES } from '../cases/cases.js'
import DurPanelPreview from '../components/DurPanelPreview.jsx'
import PageCrumbs from '../components/PageCrumbs.jsx'

export default function CaseStudyPage() {
  const { t } = useLang()
  const layerCount = Object.keys(RULE_LAYERS).filter((l) => RULES.some((r) => r.layer === l)).length
  const counts = { drugs: DRUGS.length, sources: SOURCE_IDS.length, rules: RULES.length, cases: CASES.length, layers: layerCount }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex max-w-[760px] flex-col gap-4">
        <PageCrumbs items={[{ label: t('nav.study') }]} />
        <h1 className="text-3xl font-bold text-foreground">{t('cs.title')}</h1>
        <p className="text-lg text-text-2">{t('cs.lead')}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
          <Button size="lg" asChild>
            <a href={HREF.emr}>{t('cs.ctaEmr')}</a>
          </Button>
          <a href={HREF.cases} className="text-sm font-medium text-brand underline-offset-4 hover:text-brand-hover hover:underline">
            {t('cs.ctaCases', { n: counts.cases })}
          </a>
        </div>
      </header>

      <div className="mt-10 grid items-start gap-x-16 gap-y-12 lg:grid-cols-[360px_minmax(0,1fr)]">
        <DurPanelPreview visitId="V1" label={t('cs.panelAlt')} />
        <div className="flex flex-col gap-10">
          <section aria-labelledby="cs-problem" className="flex flex-col gap-3">
            <h2 id="cs-problem" className="text-2xl font-semibold text-foreground">{t('cs.problem.title')}</h2>
            {['p1', 'p2', 'p3'].map((k) => (
              <p key={k} className="text-base text-text-2">{t(`cs.problem.${k}`)}</p>
            ))}
          </section>
          <section aria-labelledby="cs-built" className="flex flex-col gap-3">
            <h2 id="cs-built" className="text-2xl font-semibold text-foreground">{t('cs.built.title')}</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-base text-text-2">
              <li>{t('cs.built.engine', { rules: counts.rules })}</li>
              <li>{t('cs.built.data', { drugs: counts.drugs, sources: counts.sources })}</li>
              <li>{t('cs.built.emr')}</li>
              <li>{t('cs.built.docs')}</li>
              <li>{t('cs.built.tests', { cases: counts.cases })}</li>
            </ul>
          </section>
        </div>
      </div>

      <section aria-labelledby="cs-principles" className="mt-16 flex flex-col gap-4 border-t border-border pt-8">
        <h2 id="cs-principles" className="text-2xl font-semibold text-foreground">{t('cs.principles.title')}</h2>
        {/* One column of term / one sentence, hairline-separated: not a three-up stat row (review P2). */}
        <dl className="flex max-w-[880px] flex-col divide-y divide-border border-y border-border">
          {[
            [t('cs.principles.rules', { n: counts.rules }), t('cs.principles.rulesBody', { layers: counts.layers })],
            [t('cs.principles.sources', { n: counts.sources }), t('cs.principles.sourcesBody', { drugs: counts.drugs })],
            [t('cs.principles.deterministic'), t('cs.principles.deterministicBody')],
          ].map(([term, body]) => (
            <div key={term} className="grid gap-x-8 gap-y-1 py-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
              <dt className="text-sm font-medium text-foreground">{term}</dt>
              <dd className="text-sm text-text-2">{body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
