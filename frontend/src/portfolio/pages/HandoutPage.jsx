/**
 * Owner handout `#/case/:id/handout` — an A4 preview in plain language, with
 * its own EN/KO switch (independent of the UI language), owner units, a 7-day
 * tick grid, food instructions and what to watch for. Printed with
 * window.print() on this page.
 *
 * It never says medicines are "safe to use together": the absence of a
 * finding is not evidence of safety.
 */

import { useCallback, useMemo } from 'react'
import { FileText, OctagonX, PencilLine, Phone } from 'lucide-react'
import '../styles/pages.css'
import { useLang, translate, pickLang } from '../i18n/index.js'
import { caseHref, casePath, navigate } from '../router.js'
import useCaseResult from '../components/report/useCaseResult.js'
import { buildHandout } from '../components/report/handoutModel.js'
import { EMERGENCY_GENERIC } from '../components/report/ownerText.js'
import { reportId } from '../components/report/reportModel.js'
import { resolvedBreed } from '../components/report/PatientFacts.jsx'
import PrintSheet from '../components/report/PrintSheet.jsx'
import DocToolbar from '../components/report/DocToolbar.jsx'
import DocNotFound from '../components/report/DocNotFound.jsx'
import ScheduleGrid from '../components/report/ScheduleGrid.jsx'
import { Segmented } from '../components/fields.jsx'
import { breedName } from '../components/BreedCombobox.jsx'
import { drugShort, fmtNum, severityWord } from '../components/format.js'

function MedicineBlock({ med, tr, pk }) {
  const amount = med.amount
  return (
    <section className="pf-hmed">
      <header className="pf-hmed__head">
        <h3 className="pf-hmed__name">{pk(med.name)}</h3>
        <p className="pf-hmed__class">{pk(med.drugClass)}</p>
      </header>
      <dl className="pf-hmed__facts">
        <div>
          <dt>{tr('ho.for')}</dt>
          <dd>{med.purpose ? pk(med.purpose) : tr('ho.forUnknown')}</dd>
        </div>
        <div>
          <dt>{tr('ho.howMuch')}</dt>
          <dd>
            {amount.confirm ? (
              <span className="pf-hmed__confirm">
                <span className="pf-hmed__blank" aria-hidden="true" />
                <span className="pf-hmed__confirmtext">
                  <PencilLine size={13} aria-hidden="true" />
                  {amount.calculated ? tr('ho.confirmCalc', { amount: pk(amount.calculated) }) : tr('ho.confirm')}
                </span>
              </span>
            ) : (
              <strong className="pf-num">{pk(amount.text)}</strong>
            )}
          </dd>
        </div>
        <div>
          <dt>{tr('ho.how')}</dt>
          <dd>{pk(med.route)}</dd>
        </div>
        <div>
          <dt>{tr('ho.when')}</dt>
          <dd>
            {pk(med.frequency)}
            {med.schedule.mode === 'grid' || med.schedule.mode === 'interval' || med.schedule.mode === 'prn'
              ? ` · ${med.durationDays != null ? tr('ho.forDays', { n: fmtNum(med.durationDays) }) : tr('ho.noEnd')}`
              : ''}
          </dd>
        </div>
        {/* Only a sourced food instruction is printed; "no instruction" reads like a gap to an owner. */}
        {med.food.known && (
          <div>
            <dt>{tr('ho.food')}</dt>
            <dd>{pk(med.food.text)}</dd>
          </div>
        )}
      </dl>
      {med.schedule.mode === 'grid' && <ScheduleGrid schedule={med.schedule} tr={tr} pk={pk} />}
      {med.schedule.mode === 'once' && <p className="pf-hmed__dates">{tr('ho.givenOn')} <span className="pf-hmed__blank" aria-hidden="true" /></p>}
      {(med.schedule.mode === 'interval' || med.schedule.mode === 'prn') && (
        <p className="pf-hmed__dates">
          {tr('ho.datesGiven')}
          <span className="pf-hmed__blank" aria-hidden="true" />
          <span className="pf-hmed__blank" aria-hidden="true" />
          <span className="pf-hmed__blank" aria-hidden="true" />
        </p>
      )}
      {med.schedule.mode === 'clinic' && <p className="pf-hmed__dates">{tr('ho.inClinic')}</p>}
      {med.signs.length > 0 && (
        <div className="pf-hmed__watch">
          <p className="pf-hmed__label">{tr('ho.watch')}</p>
          <ul className="pf-hlist">
            {med.signs.map((s, i) => <li key={i}>{pk(s)}</li>)}
          </ul>
        </div>
      )}
    </section>
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
  const nameUi = caseDef ? pick(caseDef.name) : t('wb.custom.title')
  const petName = caseDef ? pk(caseDef.name) : tr('ho.yourPet')
  const breed = resolvedBreed(input)
  const petLine = [
    input.species === 'cat' ? tr('pt.cat') : tr('pt.dog'),
    breed ? breedName(breed, hl) : input.breedText || null,
    input.weightKg != null ? `${fmtNum(input.weightKg)} kg` : null,
  ].filter(Boolean).join(' · ')
  const { readiness } = handout

  const setHandoutLang = (v) => {
    const base = casePath(id, 'handout', sParam)
    navigate(`${base}${base.includes('?') ? '&' : '?'}hl=${v}`, { replace: true })
  }

  const footer = (
    <div className="pf-docfoot">
      <strong>{tr('doc.footer.disclaimer')}</strong>
      <span>{tr('ho.footer', { id: reportId(input) })}</span>
    </div>
  )

  return (
    <div className="pf-page pf-docpage">
      <DocToolbar
        backHref={caseHref(id, 'workbench', sParam)}
        backLabel={t('doc.backToCase', { name: nameUi })}
        title={t('rv.handout')}
        sub={t('ho.sub')}
      >
        <div className="pf-doctools__lang">
          <span className="pf-doctools__langlabel" aria-hidden="true">{t('ho.langLabel')}</span>
          <Segmented
            ariaLabel={t('ho.langLabel')}
            size="sm"
            value={hl}
            onChange={setHandoutLang}
            options={[
              { value: 'en', label: 'English', lang: 'en' },
              { value: 'ko', label: '한국어', lang: 'ko' },
            ]}
          />
        </div>
        <a className="pf-btn pf-btn--secondary pf-btn--sm" href={caseHref(id, 'report', sParam)}>
          <FileText size={15} aria-hidden="true" />
          {t('rv.report')}
        </a>
      </DocToolbar>

      {(readiness.blocked || readiness.confirmDrugs.length > 0) && (
        <div className="pf-docalerts pf-no-print" role="note">
          {readiness.blocked && (
            <p className={`pf-docalert pf-tone--${readiness.blocking[0].severity}`}>
              <OctagonX size={16} aria-hidden="true" />
              <span>
                {t('ho.blocked', {
                  sev: lang === 'en' ? severityWord(readiness.blocking[0].severity, pick).toLowerCase() : severityWord(readiness.blocking[0].severity, pick),
                  n: readiness.blocking.length,
                })}{' '}
                <a href={caseHref(id, 'workbench', sParam)}>{t('ho.blockedLink')}</a>
              </span>
            </p>
          )}
          {readiness.confirmDrugs.length > 0 && (
            <p className="pf-docalert pf-docalert--neutral">
              <PencilLine size={16} aria-hidden="true" />
              <span>{t('ho.confirmAlert', { drugs: readiness.confirmDrugs.map((d) => drugShort(d, pick)).join(', ') })}</span>
            </p>
          )}
        </div>
      )}

      <PrintSheet label={tr('ho.docTitle', { name: petName })} footer={footer} className="pf-handout" lang={hl}>
        {readiness.blocked && (
          <p className="pf-draft">
            <OctagonX size={15} aria-hidden="true" />
            {tr('ho.draft')}
          </p>
        )}
        <header className="pf-hhead">
          <div className="pf-hhead__clinic">
            <p className="pf-hhead__clinicname">{tr('ho.clinic')}</p>
            <p className="pf-hhead__clinicline"><Phone size={12} aria-hidden="true" />{tr('ho.phone')} <span className="pf-hmed__blank" aria-hidden="true" /></p>
          </div>
          <div className="pf-hhead__main">
            <h2 className="pf-hhead__title">{tr('ho.docTitle', { name: petName })}</h2>
            <p className="pf-hhead__pet">{petLine}</p>
            <p className="pf-hhead__intro">{tr('ho.intro')}</p>
          </div>
        </header>

        {handout.meds.length === 0 ? (
          <p className="pf-doc__empty">{tr('ho.noMeds')}</p>
        ) : (
          <div className="pf-hmeds">
            {handout.meds.map((m) => <MedicineBlock key={m.key} med={m} tr={tr} pk={pk} />)}
          </div>
        )}

        {/* Conditions and the emergency box print as one block, so "Call us
            immediately" is never left alone on a page with the signature line. */}
        <div className="pf-hclose">
        {handout.conditions.length > 0 && (
          <section className="pf-docsec pf-hcond">
            <h3 className="pf-docsec__title">{tr('ho.conditions')}</h3>
            <div className="pf-hcond__grid">
              {handout.conditions.map((c) => (
                <div key={c.id} className="pf-hcond__item">
                  <p className="pf-hcond__title">{pk(c.title)}</p>
                  <ul className="pf-hlist">
                    {c.watch.map((w, i) => <li key={i}>{pk(w)}</li>)}
                  </ul>
                  {c.tip && <p className="pf-hcond__tip">{pk(c.tip)}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="pf-hemerg">
          <h3 className="pf-hemerg__title">{tr('ho.emergency')}</h3>
          <ul className="pf-hlist pf-hlist--strong">
            {handout.emergency.map((s, i) => <li key={i}>{pk(s)}</li>)}
            <li>{pk(EMERGENCY_GENERIC)}</li>
          </ul>
          {result.findings.length > 0 && <p className="pf-hemerg__note">{tr('ho.emergencyNote')}</p>}
        </section>
        </div>

        <section className="pf-hsign">
          <div className="pf-ack__line"><span>{tr('ho.vet')}</span></div>
          <div className="pf-ack__line"><span>{tr('rp.ack.signature')}</span></div>
          <div className="pf-ack__line pf-ack__line--short"><span>{tr('rp.ack.date')}</span></div>
        </section>
      </PrintSheet>
    </div>
  )
}
