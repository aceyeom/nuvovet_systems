import { useId, useMemo } from 'react'
import { ArrowRight, Plus } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import { CASES } from '../cases/cases.js'
import { DRUGS } from '../knowledge/drugs.js'
import { analyze } from '../engine/engine.js'
import { caseHref, HREF } from '../router.js'
import SpeciesGlyph from '../components/SpeciesGlyph.jsx'
import SeverityTag from '../components/SeverityTag.jsx'
import { drugShort, fmtNum, freqShort, unitText } from '../components/format.js'

function splitTitle(title) {
  const i = title.indexOf(' — ')
  return i < 0 ? [title, ''] : [title.slice(0, i), title.slice(i + 3)]
}

function MedChip({ med }) {
  const { pick, lang } = useLang()
  const dose = med.dose?.value != null ? `${fmtNum(med.dose.value)} ${unitText(med.dose.unit, lang)}` : ''
  return (
    <li className="pf-chip pf-chip--med">
      <span className="pf-chip__strong">{drugShort(med.drugId, pick)}</span>
      {dose && <span className="pf-num">{dose}</span>}
      {med.frequency && <span className="pf-muted">{freqShort(med.frequency, pick)}</span>}
    </li>
  )
}

function CaseCard({ c, result }) {
  const { t, pick } = useLang()
  const titleId = useId()
  const [name, rawDesc] = splitTitle(pick(c.title))
  const desc = rawDesc ? rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1) : ''
  return (
    <li className="pf-casegrid__item">
      <a className="pf-casecard" href={caseHref(c.id)} aria-labelledby={titleId}>
        <div className="pf-casecard__top">
          <span className="pf-casecard__glyph"><SpeciesGlyph species={c.species} size={26} /></span>
          <div className="pf-casecard__titles" id={titleId}>
            <h2 className="pf-casecard__name">{name}</h2>
            {desc && <p className="pf-casecard__desc">{desc}</p>}
          </div>
        </div>
        <p className="pf-casecard__sig">{pick(c.signalment)}</p>
        <div className="pf-casecard__block">
          <div className="pf-eyebrow">{t('cases.question')}</div>
          <p className="pf-casecard__q">{pick(c.question)}</p>
        </div>
        <div className="pf-casecard__block">
          <div className="pf-eyebrow">{t('cases.rx')}</div>
          <ul className="pf-chips pf-chips--list">
            {c.input.meds.map((m) => <MedChip key={m.drugId} med={m} />)}
          </ul>
        </div>
        <div className="pf-casecard__block pf-casecard__catch">
          <div className="pf-eyebrow">{t('cases.shouldCatch')}</div>
          <p>{pick(c.shouldCatch)}</p>
        </div>
        <div className="pf-casecard__foot">
          <span className="pf-casecard__live">
            <span className="pf-muted">{t('cases.liveResult')}</span>
            <SeverityTag severity={result.verdict.level} size="sm" />
          </span>
          <span className="pf-casecard__cta">
            {t('cases.open')}
            <ArrowRight size={15} aria-hidden="true" />
          </span>
        </div>
      </a>
    </li>
  )
}

export default function CasesPage() {
  const { t } = useLang()
  // The real engine, run once per case for the "live result" tag.
  const results = useMemo(() => Object.fromEntries(CASES.map((c) => [c.id, analyze(c.input)])), [])
  return (
    <div className="pf-page pf-cases">
      <header className="pf-pagehead">
        <p className="pf-eyebrow">{t('cases.eyebrow')}</p>
        <h1 className="pf-h1">{t('cases.title')}</h1>
        <p className="pf-lead">{t('cases.intro')}</p>
      </header>
      <ul className="pf-casegrid">
        {CASES.map((c) => <CaseCard key={c.id} c={c} result={results[c.id]} />)}
        <li className="pf-casegrid__item">
          <a className="pf-casecard pf-casecard--blank" href={HREF.custom}>
            <span className="pf-casecard__glyph pf-casecard__glyph--blank"><Plus size={22} aria-hidden="true" /></span>
            <h2 className="pf-casecard__name">{t('cases.blank.title')}</h2>
            <p className="pf-casecard__q">{t('cases.blank.body', { n: DRUGS.length })}</p>
            <span className="pf-casecard__cta">
              {t('cases.blank.cta')}
              <ArrowRight size={15} aria-hidden="true" />
            </span>
          </a>
        </li>
      </ul>
    </div>
  )
}
