import { History, X } from 'lucide-react'
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
  return parts.join(' · ')
}

/** change: { label:{ key, vars }, diff } */
export default function WhatChanged({ change, onDismiss }) {
  const { t, pick, lang } = useLang()
  if (!change) return null
  const vars = {}
  for (const [k, v] of Object.entries(change.label.vars || {})) vars[k] = typeof v === 'object' && v ? pick(v) : v
  const label = t(change.label.key, vars)
  return (
    <div className="pf-changed" role="status">
      <History size={14} aria-hidden="true" className="pf-changed__icon" />
      <span className="pf-changed__text">
        <span className="pf-sr">{t('wc.label')}: </span>
        <strong>{label}</strong>
        <span aria-hidden="true">: </span>
        {describeDiff(change.diff, t, pick, lang)}
      </span>
      <button type="button" className="pf-icon-btn pf-icon-btn--sm" onClick={onDismiss} aria-label={t('wc.dismiss')}>
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
