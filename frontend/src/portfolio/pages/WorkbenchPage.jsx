import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Link as LinkIcon, RotateCcw, Check } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import { analyze } from '../engine/engine.js'
import { diffResults } from '../engine/findings.js'
import { RULES } from '../engine/rules/index.js'
import { BREED_BY_ID } from '../knowledge/breeds.js'
import { resolveBreed } from '../engine/search.js'
import { navigate, casePath, caseHref, HREF } from '../router.js'
import { resolveCase, stateParam, sameInput, remapMedsForSpecies } from '../components/caseModel.js'
import SpeciesGlyph from '../components/SpeciesGlyph.jsx'
import PatientPanel from '../components/PatientPanel.jsx'
import RxEditor from '../components/RxEditor.jsx'
import VerdictBanner from '../components/VerdictBanner.jsx'
import WhatChanged from '../components/WhatChanged.jsx'
import FindingCard from '../components/FindingCard.jsx'
import NotesList from '../components/NotesList.jsx'
import OrganMatrix from '../components/OrganMatrix.jsx'
import DoseTable from '../components/DoseTable.jsx'
import { breedName } from '../components/BreedCombobox.jsx'

function liveSignalment(input, t, lang) {
  const breed = input.breedId ? BREED_BY_ID[input.breedId] : input.breedText ? BREED_BY_ID[resolveBreed(input.breedText, input.species)] : null
  const parts = []
  parts.push(breed ? breedName(breed, lang) : input.breedText || (input.species === 'cat' ? t('pt.cat') : t('pt.dog')))
  if (input.sex) parts.push(`${input.sex === 'male' ? t('pt.male') : t('pt.female')}${input.neutered ? ` (${t('pt.neutered')})` : ''}`)
  if (input.ageYears != null) parts.push(`${input.ageYears} ${t('pt.years')}`)
  if (input.weightKg != null) parts.push(`${input.weightKg} kg`)
  return parts.join(' · ')
}

function CaseHeader({ resolved, input, edited, onReset }) {
  const { t, pick, lang } = useLang()
  const [copied, setCopied] = useState(null)
  const c = resolved.caseDef
  const title = c ? pick(c.title) : t('wb.custom.title')
  const sig = c && !edited ? pick(c.signalment) : liveSignalment(input, t, lang)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied('ok')
    } catch {
      setCopied('fail')
    }
    setTimeout(() => setCopied(null), 2400)
  }

  return (
    <header className="pf-casehead">
      <a className="pf-back" href={HREF.cases}>
        <ArrowLeft size={15} aria-hidden="true" />
        {t('wb.back')}
      </a>
      <div className="pf-casehead__row">
        <span className="pf-casehead__glyph"><SpeciesGlyph species={input.species} size={28} /></span>
        <div className="pf-casehead__titles">
          <h1 className="pf-casehead__title">
            {title}
            {edited && c && <span className="pf-badge-edited">{t('wb.edited')}</span>}
          </h1>
          <p className="pf-casehead__sig">{sig}</p>
        </div>
        <div className="pf-casehead__actions">
          {edited && (
            <button type="button" className="pf-btn pf-btn--ghost pf-btn--sm" onClick={onReset}>
              <RotateCcw size={14} aria-hidden="true" />
              {t('wb.reset')}
            </button>
          )}
          <button type="button" className="pf-btn pf-btn--ghost pf-btn--sm" onClick={copy} aria-live="polite">
            {copied === 'ok' ? <Check size={14} aria-hidden="true" /> : <LinkIcon size={14} aria-hidden="true" />}
            {copied === 'ok' ? t('wb.copied') : copied === 'fail' ? t('wb.copyFailed') : t('wb.copyLink')}
          </button>
        </div>
      </div>
      {c ? (
        <div className="pf-casehead__brief">
          <div>
            <div className="pf-eyebrow">{t('wb.question')}</div>
            <p>{pick(c.question)}</p>
          </div>
          <div>
            <div className="pf-eyebrow">{t('wb.shouldCatch')}</div>
            <p>{pick(c.shouldCatch)}</p>
          </div>
        </div>
      ) : (
        <p className="pf-casehead__custom">{t('wb.custom.sub')}</p>
      )}
    </header>
  )
}

/** True while the element fits in the viewport below the sticky header (so sticky never hides content). */
function useFitsViewport(ref, deps) {
  const [fits, setFits] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const check = () => {
      const header = parseFloat(getComputedStyle(el).getPropertyValue('--pf-header-h')) || 0
      setFits(window.innerWidth >= 1200 && el.offsetHeight <= window.innerHeight - header - 32)
    }
    check()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null
    ro?.observe(el)
    window.addEventListener('resize', check)
    return () => { ro?.disconnect(); window.removeEventListener('resize', check) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return fits
}

function Workbench({ id, query }) {
  const { t } = useLang()
  const [resolved] = useState(() => resolveCase(id, query))
  const [input, setInput] = useState(() => resolved.input)
  const [tab, setTab] = useState(resolved.isCustom ? 'patient' : 'review')
  const [hoverId, setHoverId] = useState(null)
  const [change, setChange] = useState(null)
  const pendingLabel = useRef(null)
  const prevResult = useRef(null)
  const lastWritten = useRef(query.s || null)
  const doseRef = useRef(null)
  const doseFits = useFitsViewport(doseRef, [])

  // Live recompute: the engine is synchronous and pure, so a memo is enough.
  const result = useMemo(() => analyze(input), [input])

  // "What changed" — diff against the result before the current burst of edits
  // to the same field (typing "Labrador" is one change, not eight).
  const baseline = useRef(null)
  useEffect(() => {
    const prev = prevResult.current
    prevResult.current = result
    const label = pendingLabel.current
    pendingLabel.current = null
    if (!prev || !label) return
    const field = `${label.key.replace(/Cleared$/, '')}:${label.vars?.drug?.en || ''}`
    if (!baseline.current || baseline.current.field !== field) baseline.current = { field, result: prev }
    setChange({ label, diff: diffResults(baseline.current.result, result) })
  }, [result])

  const sParam = useMemo(() => stateParam(input, resolved.base), [input, resolved.base])

  // Keep the case in the hash (debounced, replacing the history entry).
  useEffect(() => {
    const h = setTimeout(() => {
      lastWritten.current = sParam
      navigate(casePath(id, 'workbench', sParam), { replace: true })
    }, 150)
    return () => clearTimeout(h)
  }, [sParam, id])

  // A different case pasted into the address bar for the same id.
  useEffect(() => {
    const s = query.s || null
    if (s === lastWritten.current) return
    const next = resolveCase(id, query)
    if (!sameInput(next.input, input)) {
      pendingLabel.current = null
      setInput(next.input)
    }
    lastWritten.current = s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.s])

  const applyChange = useCallback((patch, label) => {
    pendingLabel.current = label || null
    setInput((prev) => {
      let next = { ...prev, ...patch }
      if (patch.species && patch.species !== prev.species) {
        const b = prev.breedId ? BREED_BY_ID[prev.breedId] : null
        if (b && b.species !== patch.species) { next.breedId = null; next.breedText = '' }
        if (!prev.breedId && prev.breedText && !resolveBreed(prev.breedText, patch.species)) next.breedText = ''
        next.meds = remapMedsForSpecies(prev.meds, patch.species)
        next.conditions = prev.conditions
      }
      return next
    })
  }, [])

  const reset = () => {
    pendingLabel.current = { key: 'chg.reset', vars: {} }
    setInput(JSON.parse(JSON.stringify(resolved.base)))
  }

  const hovered = hoverId ? result.findings.find((f) => f.id === hoverId) : null
  const highlight = hovered ? { drugIds: hovered.drugIds, organs: hovered.organs || [] } : null
  const hlDrugs = highlight?.drugIds || null
  const edited = sParam != null
  const hasDrugs = input.meds.length > 0
  const reportHref = caseHref(id, 'report', sParam)
  const handoutHref = caseHref(id, 'handout', sParam)

  const tabs = [
    { id: 'patient', label: t('wb.tabs.patient') },
    { id: 'rx', label: t('wb.tabs.rx'), count: input.meds.length },
    { id: 'review', label: t('wb.tabs.review') },
  ]

  return (
    <div className="pf-page pf-page--wide pf-wb">
      <CaseHeader resolved={resolved} input={input} edited={edited && !resolved.isCustom} onReset={reset} />

      <div className="pf-wb-mobilebar">
        <button type="button" className="pf-wb-mobilebar__verdict" onClick={() => setTab('review')} aria-label={`${t('rv.verdict')} — ${t('wb.tabs.review')}`}>
          <VerdictBanner result={result} compact empty={!hasDrugs} />
        </button>
        <div className="pf-tabs" role="tablist" aria-label={t('wb.tabs.label')}>
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              id={`pf-tab-${x.id}`}
              aria-selected={tab === x.id}
              aria-controls={`pf-panel-${x.id}`}
              className={tab === x.id ? 'is-on' : ''}
              onClick={() => setTab(x.id)}
            >
              {x.label}
              {x.count != null && <span className="pf-tabs__n">{x.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="pf-wb-grid" data-tab={tab}>
        {/* The prescription (add a drug, edit a dose) comes first: it is the core interaction. */}
        <div className="pf-wb-side">
          <section className="pf-panel pf-wb-rx" id="pf-panel-rx" aria-labelledby="pf-h-rx">
            <h2 className="pf-panel__title" id="pf-h-rx">
              {t('rx.title')}
              {hasDrugs && <span className="pf-panel__count">{input.meds.length === 1 ? t('rx.medicationCountOne') : t('rx.medicationCount', { n: input.meds.length })}</span>}
            </h2>
            <RxEditor input={input} doses={result.doses} onChange={applyChange} highlightDrugIds={hlDrugs} />
          </section>
          <section className="pf-panel pf-wb-patient" id="pf-panel-patient" aria-labelledby="pf-h-patient">
            <h2 className="pf-panel__title" id="pf-h-patient">{t('pt.title')}</h2>
            <PatientPanel input={input} onChange={applyChange} />
          </section>
        </div>

        <div className="pf-wb-body">
        <div className="pf-wb-top">
        <div className="pf-wb-main pf-wb-review" id="pf-panel-review">
          <p className="pf-live"><span className="pf-live__dot" aria-hidden="true" />{t('wb.live')}</p>
          <VerdictBanner
            result={result}
            reportHref={reportHref}
            handoutHref={handoutHref}
            empty={!hasDrugs}
            onAddDrug={() => {
              setTab('rx')
              setTimeout(() => {
                const el = document.querySelector('#pf-panel-rx .pf-search__input')
                el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                el?.focus({ preventScroll: true })
              }, 0)
            }}
          />
          <WhatChanged change={change} onDismiss={() => { setChange(null); baseline.current = null }} />

          {hasDrugs && (
            <section className="pf-section" aria-labelledby="pf-h-findings">
              <h2 className="pf-section__title" id="pf-h-findings">
                {t('rv.findings')}
                <span className="pf-section__count">{result.findings.length}</span>
              </h2>
              {result.findings.length === 0 ? (
                <p className="pf-empty">{t('rv.noFindings', { n: RULES.length })}</p>
              ) : (
                <div className="pf-findings">
                  {result.findings.map((f) => (
                    <FindingCard key={f.id} finding={f} onHighlight={setHoverId} highlighted={hoverId === f.id} />
                  ))}
                </div>
              )}
            </section>
          )}

          {hasDrugs && (
            <section className="pf-section" aria-labelledby="pf-h-notes">
              <h2 className="pf-section__title" id="pf-h-notes">
                {t('rv.notes')}
                <span className="pf-section__count">{result.notes.length}</span>
              </h2>
              {result.notes.length > 0 && <p className="pf-section__sub">{t('rv.notesHint')}</p>}
              <NotesList notes={result.notes} highlightDrugIds={hlDrugs} />
            </section>
          )}

        </div>

        <aside className="pf-wb-dose pf-wb-review" aria-labelledby="pf-h-dose" ref={doseRef} data-sticky={doseFits ? 'true' : 'false'}>
          <div className="pf-panel pf-wb-dose__panel">
            <h2 className="pf-panel__title" id="pf-h-dose">{t('dc.title')}</h2>
            <p className="pf-section__sub">{t('dc.sub')}</p>
            <DoseTable doses={result.doses} highlightDrugIds={hlDrugs} />
          </div>
        </aside>
        </div>

        {/* Below findings and dose check, across both columns: wide enough for the grid, and no empty right column. */}
        {hasDrugs && (
          <section className="pf-section pf-panel pf-wb-matrix pf-wb-review" aria-labelledby="pf-h-matrix">
            <h2 className="pf-section__title" id="pf-h-matrix">{t('om.title')}</h2>
            <p className="pf-section__sub">{t('om.sub')}</p>
            <OrganMatrix matrix={result.organMatrix} highlight={highlight} />
          </section>
        )}
        </div>
      </div>
    </div>
  )
}

export default function WorkbenchPage({ route }) {
  const { t } = useLang()
  const id = route.params.id
  const probe = resolveCase(id, {})
  if (probe.notFound) {
    return (
      <div className="pf-page">
        <div className="pf-empty-state">
          <h1 className="pf-h1">{t('notfound.title')}</h1>
          <p>{t('wb.notFound', { id })}</p>
          <a className="pf-btn pf-btn--primary" href={HREF.cases}>{t('notfound.back')}</a>
        </div>
      </div>
    )
  }
  return <Workbench key={id} id={id} query={route.query} />
}
