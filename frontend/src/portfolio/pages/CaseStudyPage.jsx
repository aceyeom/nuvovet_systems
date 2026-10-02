/**
 * Case study `#/` — one honest scroll: the problem, what was built and by
 * whom, a live render of case Choco from the real engine, the project's
 * status, and links to the cases and to how it works. No marketing claims:
 * every number on this page is computed from the showcase's own data.
 */

import { useMemo } from 'react'
import { ArrowRight, FlaskConical, Layers, ShieldAlert, Repeat2, Pill, UserRound, Stethoscope } from 'lucide-react'
import '../styles/pages.css'
import { useLang } from '../i18n/index.js'
import { HREF, caseHref } from '../router.js'
import { RULES } from '../engine/rules/index.js'
import { analyze } from '../engine/engine.js'
import { DRUGS } from '../knowledge/drugs.js'
import { SOURCE_IDS } from '../knowledge/sources.js'
import { CASES, CASE_BY_ID } from '../cases/cases.js'
import { Section } from '../components/pages/Prose.jsx'
import LiveCaseRender from '../components/pages/LiveCaseRender.jsx'
import VerdictBanner from '../components/VerdictBanner.jsx'
import SeverityTag from '../components/SeverityTag.jsx'
import SpeciesGlyph from '../components/SpeciesGlyph.jsx'
import { drugShort } from '../components/format.js'

const PROBLEM_ICONS = { polypharmacy: Pill, offlabel: Stethoscope, nodur: ShieldAlert }
const STATUS_ICONS = { prototype: FlaskConical, data: Layers, pivot: Repeat2 }

/**
 * The product on the first screen: a compact, live render of case Choco (the
 * real engine runs on its inputs), linking to its workbench.
 */
function HeroPreview({ caseId = 'choco' }) {
  const { t, pick } = useLang()
  const c = CASE_BY_ID[caseId]
  const result = useMemo(() => analyze(c.input), [c])
  const top = result.findings[0] || null
  const name = pick(c.name)
  return (
    <a className="pf-hero__preview" href={caseHref(caseId)}>
      <span className="pf-hero__pvhead">
        <span className="pf-livecase__glyph"><SpeciesGlyph species={c.species} size={22} /></span>
        <span className="pf-hero__pvtitles">
          <span className="pf-eyebrow">{t('cs.preview.eyebrow')}</span>
          <span className="pf-hero__pvname">{pick(c.title)}</span>
        </span>
      </span>
      <span className="pf-hero__pvrx">{c.input.meds.map((m) => drugShort(m.drugId, pick)).join(' + ')}</span>
      <VerdictBanner result={result} compact />
      {top && (
        <span className="pf-hero__pvfinding">
          <SeverityTag severity={top.severity} size="sm" />
          <span className="pf-hero__pvfindingtitle">{pick(top.title)}</span>
        </span>
      )}
      <span className="pf-hero__pvopen">
        {t('cs.live.open', { name })}
        <ArrowRight size={15} aria-hidden="true" />
      </span>
    </a>
  )
}

export default function CaseStudyPage() {
  const { t } = useLang()
  const counts = { drugs: DRUGS.length, sources: SOURCE_IDS.length, rules: RULES.length, cases: CASES.length }

  return (
    <div className="pf-page pf-prose-page pf-study">
      <div className="pf-herowrap">
      <header className="pf-hero">
        <p className="pf-eyebrow">{t('cs.eyebrow')}</p>
        <h1 className="pf-hero__title">{t('cs.title')}</h1>
        <p className="pf-lead">{t('cs.lead')}</p>
        <p className="pf-statuspill">
          <FlaskConical size={14} aria-hidden="true" />
          {t('cs.statusPill')}
        </p>
        <div className="pf-cta">
          <a className="pf-btn pf-btn--primary" href={HREF.cases}>
            {t('cs.ctaCases')}
            <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a className="pf-btn pf-btn--secondary" href={HREF.how}>{t('nav.how')}</a>
        </div>
      </header>
      <HeroPreview caseId="choco" />
      </div>

      <Section id="problem" title={t('cs.problem.title')} lead={t('cs.problem.lead')}>
        <ul className="pf-points">
          {['polypharmacy', 'offlabel', 'nodur'].map((k) => {
            const Icon = PROBLEM_ICONS[k]
            return (
              <li key={k} className="pf-point">
                <span className="pf-point__icon"><Icon size={18} aria-hidden="true" /></span>
                <div>
                  <h3 className="pf-point__title">{t(`cs.problem.${k}.title`)}</h3>
                  <p className="pf-point__body">{t(`cs.problem.${k}.body`)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section id="built" title={t('cs.built.title')}>
        <div className="pf-twocol">
          <div className="pf-card">
            <h3 className="pf-h3">{t('cs.built.originalTitle')}</h3>
            <p className="pf-card__body">{t('cs.built.original')}</p>
            <ul className="pf-bullets">
              {['review', 'search', 'handout'].map((k) => <li key={k}>{t(`cs.built.original.${k}`)}</li>)}
            </ul>
          </div>
          <div className="pf-card">
            <h3 className="pf-h3">{t('cs.built.rebuildTitle')}</h3>
            <p className="pf-card__body">{t('cs.built.rebuild')}</p>
            <ul className="pf-bullets">
              <li>{t('cs.built.rebuild.engine', { rules: counts.rules })}</li>
              <li>{t('cs.built.rebuild.data', { drugs: counts.drugs, sources: counts.sources })}</li>
              <li>{t('cs.built.rebuild.tests', { cases: counts.cases })}</li>
              <li>{t('cs.built.rebuild.static')}</li>
            </ul>
          </div>
        </div>
        <div className="pf-role">
          <span className="pf-point__icon"><UserRound size={18} aria-hidden="true" /></span>
          <div>
            <h3 className="pf-point__title">{t('cs.role.title')}</h3>
            <p className="pf-point__body">{t('cs.role.body')}</p>
          </div>
        </div>
      </Section>

      <Section id="live" title={t('cs.live.title')} lead={t('cs.live.lead')}>
        <LiveCaseRender caseId="choco" />
      </Section>

      <Section id="status" title={t('cs.status.title')}>
        <ul className="pf-points pf-points--stack">
          {['prototype', 'data', 'pivot'].map((k) => {
            const Icon = STATUS_ICONS[k]
            return (
              <li key={k} className="pf-point">
                <span className="pf-point__icon"><Icon size={18} aria-hidden="true" /></span>
                <div>
                  <h3 className="pf-point__title">{t(`cs.status.${k}.title`)}</h3>
                  <p className="pf-point__body">{t(`cs.status.${k}.body`)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section id="learned" title={t('cs.learned.title')}>
        <ul className="pf-bullets">
          {['buyer', 'data', 'silence'].map((k) => <li key={k}>{t(`cs.learned.${k}`)}</li>)}
        </ul>
      </Section>

      <nav className="pf-cta pf-cta--end" aria-label={t('cs.ctaLabel')}>
        <a className="pf-btn pf-btn--primary" href={HREF.cases}>
          {t('cs.ctaCases')}
          <ArrowRight size={16} aria-hidden="true" />
        </a>
        <a className="pf-btn pf-btn--secondary" href={HREF.how}>{t('nav.how')}</a>
      </nav>
    </div>
  )
}
