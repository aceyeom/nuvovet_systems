import { Check, ArrowUp, ArrowDown, Minus, CircleSlash, TriangleAlert } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import { FREQUENCY_BY_ID } from '../engine/dose.js'
import RangeBar from './RangeBar.jsx'
import CitationChip from './CitationChip.jsx'
import { drugName, fmtQ, fmtAmount, doseBand, rangeText, unitText, freqShort, amountCheck, doseStatusKey } from './format.js'

const STATUS_ICON = { within: Check, above: ArrowUp, below: ArrowDown, no_reference: Minus, unit_mismatch: CircleSlash, check: TriangleAlert }

/**
 * Dose status word. check: the amount needs the vet (amountCheck().needsCheck)
 * — then "Check amount" replaces a "Within range" (or "No reference"), so a
 * rounded plan is never shown beside a green check. "Above"/"Below range" stay:
 * they are the more important message.
 */
export function DoseStatus({ status, check = false }) {
  const { t } = useLang()
  const key = doseStatusKey(status, check)
  const Icon = STATUS_ICON[key] || Minus
  return (
    <span className={`pf-status pf-status--${key}`}>
      <Icon size={13} strokeWidth={2.25} aria-hidden="true" />
      {t(`dc.status.${key}`)}
    </span>
  )
}

/**
 * The amount to give, or why it cannot be given as calculated. Shared by the
 * prescription line and the dose check card so they say the same thing.
 * compact: one line of instruction (prescription line) vs. the dose card cell.
 */
export function AmountText({ row, compact = false }) {
  const { t, pick, lang } = useLang()
  const check = amountCheck(row)
  const amount = fmtQ(row.perDose, lang)
  const plan = pick(row.administration)
  if (!check || check.kind === 'ok') return <span className="pf-num">{plan}</span>
  let head
  let sub = null
  if (check.kind === 'empty') head = t('rx.noAmount')
  else if (check.kind === 'implausible') { head = t('dc.implausible'); sub = t('dc.calculated', { amount }) }
  else if (check.kind === 'gap') { head = compact ? t('dc.gap', { amount }) : t('dc.gapShort'); sub = t('dc.nearest', { plan, delivered: check.delivered, pct: check.pct }) }
  else if (check.kind === 'range') { head = compact ? t('dc.rangeHead', { amount }) : t('dc.status.check'); sub = compact ? pick(row.rounding.text) : t('dc.planSee', { plan }) }
  else head = plan
  const warn = check.kind !== 'empty'
  return (
    <span className={`pf-amountwarn${warn ? ' is-warn' : ''}`}>
      <span className="pf-amountwarn__head">
        {warn && <TriangleAlert size={14} strokeWidth={2.25} aria-hidden="true" />}
        <span className="pf-num">{head}</span>
      </span>
      {sub && <span className="pf-amountwarn__sub pf-num">{sub}</span>}
    </span>
  )
}

export function LabelStatus({ status }) {
  const { t } = useLang()
  if (!status) return null
  return <span className={`pf-label-status pf-label-status--${status}`}>{status === 'label' ? t('rx.label') : t('rx.extraLabel')}</span>
}

function perDayText(row, t, lang) {
  if (row.perDay) return fmtQ(row.perDay, lang)
  if (row.frequency === 'once') return t('dc.single')
  const f = FREQUENCY_BY_ID[row.frequency]
  if (!f || f.perDay == null || f.perDay < 1) return t('dc.notDaily')
  return '—'
}

function DoseBlock({ row, highlighted }) {
  const { t, pick, lang } = useLang()
  const band = doseBand(row)
  const check = amountCheck(row)
  const ref = row.ref
  const refUnit = ref ? unitText(ref.per === 'day' ? `${ref.unit}/day` : ref.unit, lang) : ''
  return (
    <section className={`pf-dose${highlighted ? ' is-highlighted' : ''}`} data-drug={row.drugId}>
      <header className="pf-dose__head">
        <h3 className="pf-dose__name">{drugName(row.drugId, pick)}</h3>
        <DoseStatus status={row.status} check={Boolean(check?.needsCheck)} />
      </header>
      <table className="pf-dose__table">
        <thead>
          <tr>
            <th scope="col">{t('dc.perDose')}</th>
            <th scope="col">{t('dc.perDay')}</th>
            <th scope="col">{t('dc.howToGive')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span className="pf-num pf-strong">{fmtQ(row.perDose, lang)}</span>
              {row.frequency && <span className="pf-dose__freq">{freqShort(row.frequency, pick)}</span>}
            </td>
            <td><span className="pf-num">{perDayText(row, t, lang)}</span></td>
            <td><AmountText row={row} /></td>
          </tr>
        </tbody>
      </table>
      <p className="pf-dose__working">{pick(row.working)}</p>
      <div className="pf-dose__ref">
        <div className="pf-dose__refhead">
          <span className="pf-dose__reflabel">{t('dc.reference')}</span>
          {ref ? (
            <span className="pf-num">
              {rangeText(ref.min, ref.max, refUnit)}
              {ref.per !== 'day' && <span className="pf-muted"> {t('dc.perDoseUnit')}</span>}
            </span>
          ) : (
            <span className="pf-muted">{t('dc.noRef')}</span>
          )}
        </div>
        {band && (
          <>
            <RangeBar band={{ ...band, unit: unitText(band.unit, lang) }} status={row.status} />
            <div className="pf-dose__entered">
              <span className="pf-muted">{t('dc.entered')}</span>{' '}
              <span className="pf-num pf-strong">{`${fmtAmount(band.value, lang)} ${unitText(band.unit, lang)}`}</span>
            </div>
          </>
        )}
        {ref && (
          <div className="pf-dose__refmeta">
            <LabelStatus status={ref.labelStatus} />
            <span className="pf-muted">{pick(ref.indication)}</span>
            {ref.source && <CitationChip id={ref.source} />}
          </div>
        )}
        {band?.reason === 'frequency' && <p className="pf-dose__note">{t('dc.freqCompare')}</p>}
        {band?.reason === 'repeat' && <p className="pf-dose__note">{t('dc.repeat')}</p>}
        {band && !band.reason && ref?.per === 'day' && <p className="pf-dose__note">{t('dc.perDayCompare')}</p>}
        {!band && row.status === 'unit_mismatch' && <p className="pf-dose__note">{t('dc.unitMismatch')}</p>}
      </div>
      {row.rounding && (
        <p className="pf-dose__note pf-dose__note--rounding">
          <strong>{t('dc.rounding')}:</strong> {pick(row.rounding.text)}
        </p>
      )}
    </section>
  )
}

/** Dose check column: one small table per drug. */
export default function DoseTable({ doses, highlightDrugIds = null }) {
  const { t } = useLang()
  if (!doses.length) return <p className="pf-muted">{t('dc.empty')}</p>
  return (
    <div className="pf-doses">
      {doses.map((row, i) => (
        <DoseBlock key={`${row.drugId}-${i}`} row={row} highlighted={Boolean(highlightDrugIds?.includes(row.drugId))} />
      ))}
    </div>
  )
}
