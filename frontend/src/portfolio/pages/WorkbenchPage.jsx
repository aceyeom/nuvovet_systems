import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ClipboardList, FileText, Link as LinkIcon, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { Disclosure } from '@/ui/patterns/Disclosure'
import { useLang } from '../i18n/index.js'
import { analyze } from '../engine/engine.js'
import { diffResults } from '../engine/findings.js'
import { RULES } from '../engine/rules/index.js'
import { BREED_BY_ID } from '../knowledge/breeds.js'
import { resolveBreed } from '../engine/search.js'
import { navigate, casePath, caseHref, emrHref, EMR_VISIT_BY_CASE, HREF } from '../router.js'
import { resolveCase, stateParam, sameInput, remapMedsForSpecies } from '../components/caseModel.js'
import PatientPanel from '../components/PatientPanel.jsx'
import RxEditor from '../components/RxEditor.jsx'
import VerdictBanner from '../components/VerdictBanner.jsx'
import WhatChanged from '../components/WhatChanged.jsx'
import { FindingList } from '../components/FindingCard.jsx'
import NotesList from '../components/NotesList.jsx'
import OrganMatrix from '../components/OrganMatrix.jsx'
import PageCrumbs from '../components/PageCrumbs.jsx'
import { caseName, caseSubtitle } from '../components/format.js'

function SectionTitle({ id, children, count }) {
  return (
    <h2 id={id} className="flex items-baseline gap-2 text-lg font-semibold text-foreground">
      {children}
      {count != null ? <span className="num text-sm font-normal text-muted-foreground">{count}</span> : null}
    </h2>
  )
}

function CaseHeader({ resolved, id, edited, onReset }) {
  const { t, pick } = useLang()
  const [copied, setCopied] = useState(null)
  const c = resolved.caseDef
  const title = c ? caseName(c, pick) : t('wb.custom.title')
  const sub = c ? caseSubtitle(c, pick) : t('wb.custom.sub')
  const visit = EMR_VISIT_BY_CASE[id]

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
    <header className="flex flex-col gap-3">
      <PageCrumbs items={[{ label: t('nav.cases'), href: HREF.cases }, { label: title }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">
            {title}
            {edited ? <span className="ml-2 align-middle text-xs font-medium text-muted-foreground">{t('wb.edited')}</span> : null}
          </h1>
          <p className="text-sm text-text-2">{sub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {edited ? (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw aria-hidden="true" strokeWidth={1.5} />
              {t('wb.reset')}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={copy} aria-live="polite">
            {copied === 'ok' ? <Check aria-hidden="true" strokeWidth={1.5} /> : <LinkIcon aria-hidden="true" strokeWidth={1.5} />}
            {copied === 'ok' ? t('wb.copied') : copied === 'fail' ? t('wb.copyFailed') : t('wb.copyLink')}
          </Button>
          {visit ? (
            <Button variant="outline" size="sm" asChild>
              <a href={emrHref(visit)}>{t('cases.inEmr')}</a>
            </Button>
          ) : null}
        </div>
      </div>
      {c ? (
        <Disclosure title={t('wb.brief')} className="max-w-[760px]">
          <dl className="flex flex-col gap-3 pb-1">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{t('wb.question')}</dt>
              <dd className="text-sm text-foreground">{pick(c.question)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{t('wb.shouldCatch')}</dt>
              <dd className="text-sm text-foreground">{pick(c.shouldCatch)}</dd>
            </div>
          </dl>
        </Disclosure>
      ) : null}
    </header>
  )
}

function Workbench({ id, query }) {
  const { t } = useLang()
  const [resolved] = useState(() => resolveCase(id, query))
  const [input, setInput] = useState(() => resolved.input)
  const [hoverId, setHoverId] = useState(null)
  const [change, setChange] = useState(null)
  const pendingLabel = useRef(null)
  const prevResult = useRef(null)
  const lastWritten = useRef(query.s || null)

  // Live recompute: the engine is synchronous and pure, so a memo is enough.
  const result = useMemo(() => analyze(input), [input])

  // "What changed": diff against the result before the current burst of edits to the same
  // field (typing "Labrador" is one change, not eight).
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
      const next = { ...prev, ...patch }
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
  const edited = sParam != null && !resolved.isCustom
  const hasDrugs = input.meds.length > 0

  const focusSearch = () => {
    const el = document.querySelector('#pf-rx [cmdk-input]')
    el?.scrollIntoView({ block: 'center' })
    el?.focus({ preventScroll: true })
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <CaseHeader resolved={resolved} id={id} edited={edited} onReset={reset} />

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="order-1 flex min-w-0 flex-col gap-6 lg:order-2">
          <VerdictBanner
            result={result}
            empty={!hasDrugs}
            emptyAction={
              <Button size="sm" onClick={focusSearch}>
                <Plus aria-hidden="true" strokeWidth={1.5} />
                {t('rv.addDrug')}
              </Button>
            }
            actions={
              <>
                <Button variant="secondary" size="sm" asChild>
                  <a href={caseHref(id, 'report', sParam)}>
                    <FileText aria-hidden="true" strokeWidth={1.5} />
                    {t('rv.report')}
                  </a>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <a href={caseHref(id, 'handout', sParam)}>
                    <ClipboardList aria-hidden="true" strokeWidth={1.5} />
                    {t('rv.handout')}
                  </a>
                </Button>
              </>
            }
          />
          <WhatChanged change={change} onDismiss={() => { setChange(null); baseline.current = null }} />

          <section id="pf-rx" aria-labelledby="pf-h-rx" className="flex flex-col gap-3">
            <SectionTitle id="pf-h-rx" count={hasDrugs ? input.meds.length : null}>{t('rx.title')}</SectionTitle>
            <RxEditor input={input} doses={result.doses} notes={result.notes} onChange={applyChange} highlightDrugIds={hlDrugs} />
          </section>

          {hasDrugs ? (
            <section aria-labelledby="pf-h-findings" className="flex flex-col gap-3">
              <SectionTitle id="pf-h-findings" count={result.findings.length}>{t('rv.findings')}</SectionTitle>
              {result.findings.length === 0 ? (
                <p className="border-y border-border py-4 text-sm text-text-2">{t('rv.noFindings', { n: RULES.length })}</p>
              ) : (
                <FindingList findings={result.findings} onHighlight={setHoverId} highlightedId={hoverId} />
              )}
            </section>
          ) : null}

          {hasDrugs ? (
            <section aria-labelledby="pf-h-notes" className="flex flex-col gap-3">
              <SectionTitle id="pf-h-notes" count={result.notes.length}>{t('rv.notes')}</SectionTitle>
              <NotesList notes={result.notes} highlightDrugIds={hlDrugs} />
            </section>
          ) : null}

          {hasDrugs ? (
            <Disclosure title={t('om.open')} className="border-b border-border pb-2">
              <div className="pt-2 pb-4">
                <OrganMatrix matrix={result.organMatrix} highlight={highlight} />
              </div>
            </Disclosure>
          ) : null}
        </div>

        <aside aria-labelledby="pf-h-patient" className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
          <SectionTitle id="pf-h-patient">{t('pt.title')}</SectionTitle>
          <PatientPanel input={input} onChange={applyChange} />
        </aside>
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
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-3 px-4 py-16 sm:px-6">
        <h1 className="text-xl font-semibold text-foreground">{t('notfound.title')}</h1>
        <p className="text-sm text-text-2">{t('wb.notFound', { id })}</p>
        <Button asChild>
          <a href={HREF.cases}>{t('notfound.back')}</a>
        </Button>
      </div>
    )
  }
  return <Workbench key={id} id={id} query={route.query} />
}
