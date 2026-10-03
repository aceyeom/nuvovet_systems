/**
 * Dose display shared by the prescription rows, the report and the case-study crop: the status
 * word (StatusText, §4.5), the "how to give" text (or why the plan is not the instruction), the
 * label-status badge and the reference range bar.
 */
import { CircleSlash } from 'lucide-react'
import { StatusText } from '@/ui/patterns/status'
import { Badge } from '@/ui/primitives/badge'
import { RangeBar } from '@/ui/ext/wp5/RangeBar'
import { useLang } from '../i18n/index.js'
import { FREQUENCY_BY_ID } from '../engine/dose.js'
import { fmtNum, fmtQ, amountCheck, doseStatusKey, doseBand, rangeText, unitText } from './format.js'

/**
 * Dose status word. check: the amount needs the vet (amountCheck().needsCheck): then "투여량 확인"
 * replaces "범위 내" (or "참고 용량 없음"), so a plan adjusted by rounding is never shown beside a green word.
 * "범위 초과/미만" stay: they are the more important message.
 */
export function DoseStatus({ status, check = false, className }) {
  const { t, lang } = useLang()
  const key = doseStatusKey(status, check)
  if (key === 'unit_mismatch') {
    return (
      <StatusText tone="minor" icon={false} className={className}>
        <CircleSlash aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
        {t('dc.status.unit_mismatch')}
      </StatusText>
    )
  }
  return <StatusText status={key} lang={lang} className={className} />
}

/** "허가 외 사용" outline badge (solid border, never dashed). Label protocols show nothing. */
export function LabelStatus({ status }) {
  const { t } = useLang()
  if (status !== 'extra-label') return null
  return <Badge variant="outline">{t('rx.extraLabel')}</Badge>
}

/** Per-day amount text for a dose row. */
export function perDayText(row, t, lang) {
  if (row.perDay) return fmtQ(row.perDay, lang)
  if (row.frequency === 'once') return t('dc.single')
  const f = FREQUENCY_BY_ID[row.frequency]
  if (!f || f.perDay == null || f.perDay < 1) return t('dc.notDaily')
  return '–'
}

/**
 * The amount to give, or why it cannot be given as calculated. `ceilingNote` (D15) replaces the
 * plan when the engine's planned amount would pass a safety ceiling.
 */
export function AmountText({ row, ceilingNote = null }) {
  const { t, pick, lang } = useLang()
  const check = amountCheck(row)
  const amount = fmtQ(row.perDose, lang)
  const plan = pick(row.administration)
  if (ceilingNote) return <span className="text-sm text-foreground">{pick(ceilingNote.text)}</span>
  if (!check || check.kind === 'ok') return <span className="text-sm text-foreground tabular-nums">{plan}</span>
  if (check.kind === 'empty') return <span className="text-sm text-muted-foreground">{t('rx.noAmount')}</span>
  let head
  let sub = null
  if (check.kind === 'implausible') { head = t('dc.implausible'); sub = t('dc.calculated', { amount }) }
  else if (check.kind === 'gap') { head = t('dc.gap', { amount }); sub = t('dc.nearest', { plan, delivered: check.delivered, pct: check.pct }) }
  else if (check.kind === 'range') { head = t('dc.rangeHead', { amount }); sub = t('dc.planSee', { plan }) }
  else head = plan
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-foreground">{head}</span>
      {sub ? <span className="text-xs text-text-2">{sub}</span> : null}
    </span>
  )
}

/** Reference range as RangeBar + range text, or null when there is nothing to compare. */
export function DoseRange({ row, compact = true }) {
  const { t, lang } = useLang()
  const check = amountCheck(row)
  const band = check?.kind !== 'empty' ? doseBand(row) : null
  if (!band) return null
  const unit = unitText(band.unit, lang)
  const label = t('rb.aria', {
    range: rangeText(band.min, band.max, unit),
    value: `${fmtNum(band.value)} ${unit}`,
    status: t(`dc.status.${doseStatusKey(row.status, Boolean(check?.needsCheck))}`),
  })
  return <RangeBar min={band.min} max={band.max ?? band.min} value={band.value} label={label} format={fmtNum} compact={compact} />
}
