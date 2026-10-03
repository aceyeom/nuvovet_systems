/**
 * Owner handout `#/case/:id/handout`: an A4 preview in plain language, with its own language
 * switch (independent of the UI language), owner units, a 7-day tick grid, food instructions and
 * what to watch for. Printed with window.print() on this page. Document design kept, restyled to
 * the shared tokens (§5.5).
 *
 * It never says medicines are "safe to use together": the absence of a finding is not evidence
 * of safety.
 */

import { useCallback, useMemo } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import '../styles/print.css'
import { useLang, translate, pickLang } from '../i18n/index.js'
import { caseHref, casePath, navigate, HREF } from '../router.js'
import useCaseResult from '../components/report/useCaseResult.js'
import { buildHandout } from '../components/report/handoutModel.js'
import { EMERGENCY_GENERIC } from '../components/report/ownerText.js'
import { reportId } from '../components/report/reportModel.js'
import { resolvedBreed } from '../components/report/PatientFacts.jsx'
import PrintSheet from '../components/report/PrintSheet.jsx'
import DocToolbar from '../components/report/DocToolbar.jsx'
import DocNotFound from '../components/report/DocNotFound.jsx'
import ScheduleGrid from '../components/report/ScheduleGrid.jsx'
import { breedLabel } from '../components/BreedCombobox.jsx'
import { FieldLabel, SelectInput } from '../components/fields.jsx'
import { drugShort, fmtNum, severityWord, caseName } from '../components/format.js'

function Fact({ label, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  )
}

function MedicineBlock({ med, tr, pk }) {
  const amount = med.amount
  return (
    <section className="pf-keep flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h3 className="text-lg font-semibold text-foreground">{pk(med.name)}</h3>
        <p className="text-xs text-muted-foreground">{pk(med.drugClass)}</p>
      </header>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        <Fact label={tr('ho.for')}>{med.purpose ? pk(med.purpose) : tr('ho.forUnknown')}</Fact>
        <Fact label={tr('ho.howMuch')}>
          {amount.confirm ? (
            <span className="flex flex-col gap-1">
              <span className="pf-blank" aria-hidden="true" />
              <span className="text-xs text-text-2">
                {amount.calculated ? tr('ho.confirmCalc', { amount: pk(amount.calculated) }) : tr('ho.confirm')}
              </span>
            </span>
          ) : (
            <strong className="font-semibold">{pk(amount.text)}</strong>
          )}
        </Fact>
        <Fact label={tr('ho.how')}>{pk(med.route)}</Fact>
        <Fact label={tr('ho.when')}>
          {pk(med.frequency)}
          {med.schedule.mode === 'grid' || med.schedule.mode === 'interval' || med.schedule.mode === 'prn'
            ? `, ${med.durationDays != null ? tr('ho.forDays', { n: fmtNum(med.durationDays) }) : tr('ho.noEnd')}`
            : ''}
        </Fact>
        {/* Only a sourced food instruction is printed; "no instruction" reads like a gap to an owner. */}
        {med.food.known ? <Fact label={tr('ho.food')}>{pk(med.food.text)}</Fact> : null}
      </dl>
      {med.schedule.mode === 'grid' ? <ScheduleGrid schedule={med.schedule} tr={tr} pk={pk} /> : null}
      {med.schedule.mode === 'once' ? <p className="text-sm text-text-2">{tr('ho.givenOn')} <span className="pf-blank" aria-hidden="true" /></p> : null}
      {med.schedule.mode === 'interval' || med.schedule.mode === 'prn' ? (
        <p className="flex flex-wrap items-end gap-3 text-sm text-text-2">
          {tr('ho.datesGiven')}
          <span className="pf-blank" aria-hidden="true" />
          <span className="pf-blank" aria-hidden="true" />
          <span className="pf-blank" aria-hidden="true" />
        </p>
      ) : null}
      {med.schedule.mode === 'clinic' ? <p className="text-sm text-text-2">{tr('ho.inClinic')}</p> : null}
      {med.signs.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{tr('ho.watch')}</p>
          <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm text-foreground">
            {med.signs.map((s, i) => <li key={i}>{pk(s)}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function Line({ label }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="h-6 border-b border-input" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export default function HandoutPage({ route }) {
  const { t, pick, lang } = useLang()
  const data = useCaseResult(route)
  const hl = route.query.hl === 'ko' || route.query.hl === 'en' ? route.query.hl : lang
  const tr = useCallback((key, vars) => translate(hl, key, vars), [hl])
  const pk = useCallback((v) => pickLang(hl, v), [hl])
  const handout = useMemo(() => (data.notFound ? null : buildHandout(data.input, data.result)), [data])

  if (data.notFound) return <DocNotFound id={data.id} />

  const { id, caseDef, input, result, sParam } = data
  const nameUi = caseDef ? caseName(caseDef, pick) : t('wb.custom.title')
  const petName = caseDef ? pk(caseDef.name) : tr('ho.yourPet')
  const breed = resolvedBreed(input)
  const petFacts = [
    input.species === 'cat' ? tr('pt.cat') : tr('pt.dog'),
    breed ? breedLabel(breed, input.breedText, hl) : input.breedText || null,
    input.weightKg != null ? `${fmtNum(input.weightKg)} kg` : null,
  ].filter(Boolean)
  const { readiness } = handout

  const setHandoutLang = (v) => {
    const base = casePath(id, 'handout', sParam)
    navigate(`${base}${base.includes('?') ? '&' : '?'}hl=${v}`, { replace: true })
  }

  const footer = (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
      <span className="font-medium text-foreground">{tr('doc.footer.disclaimer')}</span>
      <span>{tr('ho.footer', { id: reportId(input) })}</span>
    </div>
  )
  const blockingSev = readiness.blocked ? readiness.blocking[0].severity : null

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8 print:block print:p-0">
      <DocToolbar
        crumbs={[{ label: t('nav.cases'), href: HREF.cases }, { label: nameUi, href: caseHref(id, 'workbench', sParam) }, { label: t('rv.handout') }]}
        title={t('rv.handout')}
      >
        {/* The handout's own language (an owner may read a different language from the vet's UI).
            A labelled select, so it never reads as a second copy of the header's language switch. */}
        <div className="flex items-center gap-2">
          <FieldLabel id="ho-lang-label" className="text-xs font-normal text-text-2">{t('ho.langLabel')}</FieldLabel>
          <SelectInput
            size="sm"
            ariaLabelledBy="ho-lang-label"
            value={hl}
            onChange={(v) => v && setHandoutLang(v)}
            options={[{ value: 'ko', label: '한국어' }, { value: 'en', label: 'English' }]}
            className="w-28"
          />
        </div>
        <Button variant="secondary" size="sm" asChild>
          <a href={caseHref(id, 'report', sParam)}>
            <FileText aria-hidden="true" strokeWidth={1.5} />
            {t('rv.report')}
          </a>
        </Button>
      </DocToolbar>

      {readiness.blocked || readiness.confirmDrugs.length > 0 ? (
        <Alert variant={readiness.blocked ? 'critical' : 'neutral'} role="note" className="print:hidden">
          <AlertTitle>{readiness.blocked ? t('ho.blockedTitle') : t('ho.confirmTitle')}</AlertTitle>
          <AlertDescription>
            {readiness.blocked ? (
              <p>
                {t('ho.blocked', { sev: lang === 'en' ? severityWord(blockingSev, pick).toLowerCase() : severityWord(blockingSev, pick) })}{' '}
                <a href={caseHref(id, 'workbench', sParam)} className="text-brand underline-offset-4 hover:underline">{t('ho.blockedLink')}</a>
              </p>
            ) : null}
            {readiness.confirmDrugs.length > 0 ? (
              <p>{t('ho.confirmAlert', { drugs: readiness.confirmDrugs.map((d) => drugShort(d, pick)).join(', ') })}</p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <PrintSheet label={tr('ho.docTitle', { name: petName })} footer={footer} lang={hl}>
        {readiness.blocked ? (
          <p className="pf-keep mb-4 border-b border-border-strong pb-2 text-sm font-semibold text-foreground">{tr('ho.draft')}</p>
        ) : null}
        <header className="pf-keep flex flex-wrap items-start justify-between gap-6 border-b border-border-strong pb-4">
          <div className="flex max-w-[460px] flex-col gap-1">
            <h2 className="text-2xl font-bold text-foreground">{tr('ho.docTitle', { name: petName })}</h2>
            <p className="text-sm text-text-2">{petFacts.join(', ')}</p>
            <p className="pt-1 text-sm text-foreground">{tr('ho.intro')}</p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium text-foreground">{tr('ho.clinic')}</p>
            <p className="flex items-end gap-2 text-text-2">{tr('ho.phone')} <span className="pf-blank" aria-hidden="true" /></p>
          </div>
        </header>

        {handout.meds.length === 0 ? (
          <p className="mt-6 text-sm text-text-2">{tr('ho.noMeds')}</p>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            {handout.meds.map((m) => <MedicineBlock key={m.key} med={m} tr={tr} pk={pk} />)}
          </div>
        )}

        {/* Conditions and the emergency box print as one block, so "Call us immediately" is never
            left alone on a page with the signature line. */}
        <div className="pf-keep mt-6 flex flex-col gap-4">
          {handout.conditions.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="pf-keep-next text-base font-semibold text-foreground">{tr('ho.conditions')}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {handout.conditions.map((c) => (
                  <div key={c.id} className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">{pk(c.title)}</p>
                    {c.watch.length ? (
                      <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm text-text-2">
                        {c.watch.map((w, i) => <li key={i}>{pk(w)}</li>)}
                      </ul>
                    ) : null}
                    {c.tip ? <p className="text-xs text-text-2">{pk(c.tip)}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-2 border-y-2 border-foreground py-3">
            <h3 className="text-base font-semibold text-foreground">{tr('ho.emergency')}</h3>
            <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm font-medium text-foreground">
              {handout.emergency.map((s, i) => <li key={i}>{pk(s)}</li>)}
              <li>{pk(EMERGENCY_GENERIC)}</li>
            </ul>
            {result.findings.length > 0 ? <p className="text-xs text-text-2">{tr('ho.emergencyNote')}</p> : null}
          </section>
        </div>

        <section className="pf-keep mt-10 grid grid-cols-[2fr_2fr_1fr] gap-4">
          <Line label={tr('ho.vet')} />
          <Line label={tr('rp.ack.signature')} />
          <Line label={tr('rp.ack.date')} />
        </section>
      </PrintSheet>
    </div>
  )
}
