import { History, X } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { useLang } from '../i18n/index.js'
import { severityWord, drugShort } from './format.js'

const SINGLE_DRUG_RULES = new Set(['MDR1_PGP_ML', 'METHIMAZOLE_CKD', 'ENRO_FELINE_RETINA'])

function findingName(f, t, pick) {
  const key = `rule.${f.ruleId}`
  const base = t(key)
  const name = base === key ? pick(f.title) : base
  if (SINGLE_DRUG_RULES.has(f.ruleId) || !f.drugIds?.length) return name
  return `${name} (${f.drugIds.map((d) => drugShort(d, pick)).join(' + ')})`
}

/** Turn diffResults() output into one short sentence. */
export function describeDiff(diff, t, pick, lang) {
  const parts = []
  const sev = (s) => (s === 'none' ? t('sev.none') : severityWord(s, pick))
  const lower = (s) => (lang === 'en' ? s.toLowerCase() : s)
  if (diff.removed.length === 1) parts.push(t('wc.cleared', { name: findingName(diff.removed[0], t, pick) }))
  else if (diff.removed.length > 1) parts.push(t('wc.clearedN', { n: diff.removed.length }))
  if (diff.added.length === 1) parts.push(t('wc.added', { sev: lower(sev(diff.added[0].severity)), name: findingName(diff.added[0], t, pick) }))
  else if (diff.added.length > 1) parts.push(t('wc.addedN', { n: diff.added.length }))
  for (const c of diff.changed) parts.push(t('wc.changed', { name: findingName(c.finding, t, pick), from: sev(c.from), to: sev(c.to) }))
  if (diff.verdictFrom && diff.verdictTo && diff.verdictFrom !== diff.verdictTo) parts.push(t('wc.verdict', { from: sev(diff.verdictFrom), to: sev(diff.verdictTo) }))
  if (!parts.length) parts.push(t('wc.nochange'))
  return parts.join('. ')
}

/** One status line after an edit: what changed in the findings. change: { label:{ key, vars }, diff } */
export default function WhatChanged({ change, onDismiss }) {
  const { t, pick, lang } = useLang()
  if (!change) return null
  const vars = {}
  for (const [k, v] of Object.entries(change.label.vars || {})) vars[k] = typeof v === 'object' && v ? pick(v) : v
  const label = t(change.label.key, vars)
  return (
    <div className="flex items-start gap-2 text-sm text-text-2" role="status">
      <History aria-hidden="true" strokeWidth={1.5} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1">
        <span className="sr-only">{t('wc.label')}: </span>
        <span className="font-medium text-foreground">{label}</span>
        <span aria-hidden="true">. </span>
        {describeDiff(change.diff, t, pick, lang)}
      </p>
      <Button variant="ghost" size="icon-sm" onClick={onDismiss} aria-label={t('wc.dismiss')} className="-my-1">
        <X aria-hidden="true" strokeWidth={1.5} />
      </Button>
    </div>
  )
}
