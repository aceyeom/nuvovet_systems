import { Plus } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { Badge } from '@/ui/primitives/badge'
import { useLang } from '../i18n/index.js'
import { CASES } from '../cases/cases.js'
import { caseHref, emrHref, EMR_VISIT_BY_CASE, HREF } from '../router.js'
import SpeciesGlyph from '../components/SpeciesGlyph.jsx'
import Sev from '../components/Severity.jsx'
import PageCrumbs from '../components/PageCrumbs.jsx'
import { caseName, drugShort } from '../components/format.js'
import { patientRows } from '../components/report/PatientFacts.jsx'

/** "Rough Collie, male neutered, 4 y, 24 kg": one signalment line built from the case input. */
function signalment(input, t, pick, lang) {
  const rows = Object.fromEntries(patientRows(input, t, pick, lang, { compact: true }).map((r) => [r.k, r.value]))
  const breed = String(rows.breed || '').split(' · ')[0]
  return [breed, rows.sex, rows.age, rows.weight].filter(Boolean).join(', ')
}

function CaseCard({ c }) {
  const { t, pick, lang } = useLang()
  const visit = EMR_VISIT_BY_CASE[c.id]
  const name = caseName(c, pick)
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="pt-0.5 text-text-2"><SpeciesGlyph species={c.species} size={20} /></span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-base font-semibold text-foreground">
            <a href={caseHref(c.id)} className="rounded-sm hover:underline">{name}</a>
            <span className="ml-2 text-sm font-normal text-text-2">{signalment(c.input, t, pick, lang)}</span>
          </h2>
        </div>
        <Sev level={c.expect.verdict} title={t('cases.expected')} />
      </div>
      <p className="line-clamp-2 text-sm text-foreground" data-truncate="" title={pick(c.question)}>{pick(c.question)}</p>
      <ul className="flex flex-wrap gap-1.5" aria-label={t('cases.rx')}>
        {c.input.meds.map((m) => (
          <li key={m.drugId}><Badge variant="outline">{drugShort(m.drugId, pick)}</Badge></li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <Button variant="link" size="sm" className="px-0 has-[>svg]:px-0" asChild>
          <a href={caseHref(c.id)}>{t('cases.open')}</a>
        </Button>
        {visit ? (
          <Button variant="link" size="sm" className="px-0 has-[>svg]:px-0" asChild>
            <a href={emrHref(visit)}>{t('cases.inEmr')}</a>
          </Button>
        ) : null}
      </div>
    </li>
  )
}

export default function CasesPage() {
  const { t } = useLang()
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-col gap-3">
        <PageCrumbs items={[{ label: t('nav.cases') }]} />
        <div className="flex max-w-[720px] flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">{t('cases.title')}</h1>
          <p className="text-lg text-text-2">{t('cases.intro', { n: CASES.length })}</p>
        </div>
      </header>
      <ul className="grid gap-4 lg:grid-cols-2">
        {CASES.map((c) => <CaseCard key={c.id} c={c} />)}
        {/* The blank case takes the grid's last cell, so an odd number of cases never leaves a
            half-empty row (design review P2). Quieter than a case: no border, subtle fill. */}
        <li className="flex min-w-0 flex-col items-start justify-center gap-3 rounded-lg bg-subtle p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">{t('cases.blank.title')}</h2>
            <p className="text-sm text-text-2">{t('cases.blank.body')}</p>
          </div>
          <Button variant="outline" asChild>
            <a href={HREF.custom}>
              <Plus aria-hidden="true" strokeWidth={1.5} />
              {t('cases.blank.cta')}
            </a>
          </Button>
        </li>
      </ul>
    </div>
  )
}
