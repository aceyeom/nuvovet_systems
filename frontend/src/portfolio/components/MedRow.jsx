import { useId, useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Button } from '@/ui/primitives/button'
import { RadioGroup, RadioGroupItem } from '@/ui/primitives/radio-group'
import { Label } from '@/ui/primitives/label'
import { useLang } from '../i18n/index.js'
import { getDrug, protocolsFor } from '../knowledge/drugs.js'
import { FREQUENCIES } from '../engine/dose.js'
import { applyProtocol } from './caseModel.js'
import { NumberField, NumberInput, SelectField, SelectInput, FieldLabel } from './fields.jsx'
import { AmountText, DoseRange, DoseStatus, LabelStatus, perDayText } from './dose.jsx'
import CitationChip from './CitationChip.jsx'
import { fmtNum, fmtQ, rangeText, unitText, freqShort, FREQ_SHORT, sourceShort, amountCheck } from './format.js'

const T = (en, ko) => ({ en, ko })
const ROUTES = ['PO', 'SC', 'IM', 'IV', 'topical', 'spot-on']
const FREE_UNITS = ['mg/kg', 'mcg/kg', 'mg', 'mcg', 'mg/m2', 'mL', 'tablet', 'capsule', 'chewable', 'pipette']

function strengthLabel(s, t) {
  const amt = `${fmtNum(s.amount.value)} ${s.amount.unit}`
  const conc = s.per ? `${amt}/${s.per.value === 1 ? '' : fmtNum(s.per.value)}${s.per.unit}` : amt
  return `${conc} ${t(`form.${s.form}`)}`
}

/** "미국 라벨 기준" (D13), "시작 용량 기준" (D10) for the reference line. */
function refQualifiers(ref, t) {
  if (!ref) return []
  const out = []
  if (ref.labelStatus === 'label' && ref.jurisdiction === 'US') out.push(t('dc.usLabel'))
  if (ref.labelStatus === 'label' && ref.jurisdiction === 'UK') out.push(t('dc.ukLabel'))
  if (ref.phase === 'start') out.push(t('dc.startDose'))
  return out
}

/**
 * One prescription line with its dose check merged in (§5.5): per dose / per day, how to give,
 * the RangeBar and the status word once. The edit form (protocol, dose, frequency, route,
 * duration, strength) opens below. onChange(nextMed, change) · onRemove()
 * row: the engine's DoseRow for this line (may be undefined while invalid).
 */
export default function MedRow({ med, species, row, ceilingNote = null, onChange, onRemove, highlighted = false, defaultOpen = false }) {
  const { t, pick, lang } = useLang()
  const uid = useId()
  const [open, setOpen] = useState(defaultOpen)
  const drug = getDrug(med.drugId)
  if (!drug) return null
  const protocols = protocolsFor(drug.id, species)
  const protocol = protocols.find((p) => p.id === med.protocolId) || null
  const shortName = pick(drug.name).replace(/\s*\(.*\)\s*$/, '')
  const dn = T(drug.name.en.replace(/\s*\(.*\)\s*$/, ''), drug.name.ko)
  const check = row ? amountCheck(row) : null
  const unit = med.dose?.unit || ''
  const freeUnits = FREE_UNITS.includes(unit) ? FREE_UNITS : [unit, ...FREE_UNITS].filter(Boolean)
  const ref = row?.ref || null
  const refUnit = ref ? unitText(ref.per === 'day' ? `${ref.unit}/day` : ref.unit, lang) : ''
  const bodyId = `${uid}-body`
  const protoLabelId = `${uid}-proto`

  const update = (patch, key, v) => onChange({ ...med, ...patch }, { key, vars: { drug: dn, v } })
  const showNumbers = row && check && check.kind !== 'empty'

  return (
    <li data-drug={drug.id} className={cn('flex flex-col gap-2 py-3 transition-colors duration-100', highlighted && 'bg-row-hover')}>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-sm font-semibold text-foreground">{shortName}</h3>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{protocol ? pick(protocol.indication) : t('rx.noProtocol')}</span>
            {ref ? <LabelStatus status={ref.labelStatus} /> : null}
          </p>
        </div>
        {row && row.status ? <DoseStatus status={row.status} check={Boolean(check?.needsCheck)} className="pt-0.5" /> : null}
        <Button variant="ghost" size="sm" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)} className="-my-0.5">
          <ChevronRight aria-hidden="true" strokeWidth={1.5} className={cn('transition-transform duration-150', open && 'rotate-90')} />
          {open ? t('rx.done') : t('rx.edit')}
          <span className="sr-only">{shortName}</span>
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t('rx.remove', { name: shortName })} className="-my-0.5">
          <X aria-hidden="true" strokeWidth={1.5} />
        </Button>
      </div>

      {showNumbers ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-[minmax(7rem,auto)_minmax(6rem,auto)_minmax(0,1fr)] lg:grid-cols-[minmax(7rem,auto)_minmax(6rem,auto)_minmax(0,1.2fr)_minmax(9rem,1fr)]">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{t('dc.perDose')}</dt>
            <dd className="text-sm text-foreground">
              <span className="num text-left font-medium">{fmtQ(row.perDose, lang)}</span>
              {med.frequency ? <span className="text-text-2"> {freqShort(med.frequency, pick)}</span> : null}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{t('dc.perDay')}</dt>
            <dd className="num text-left text-sm text-foreground">{perDayText(row, t, lang)}</dd>
          </div>
          <div className="col-span-2 flex min-w-0 flex-col gap-0.5 sm:col-span-1">
            <dt className="text-xs text-muted-foreground">{t('dc.howToGive')}</dt>
            <dd><AmountText row={row} ceilingNote={ceilingNote} /></dd>
          </div>
          <div className="col-span-2 flex min-w-0 flex-col gap-0.5 sm:col-span-3 lg:col-span-1">
            <dt className="text-xs text-muted-foreground">{t('dc.reference')}</dt>
            <dd className="flex flex-col gap-1">
              {ref ? (
                <span className="num text-left text-sm text-foreground">
                  {rangeText(ref.min, ref.max, refUnit)}
                  {ref.per !== 'day' ? <span className="text-text-2"> {t('dc.perDoseUnit')}</span> : null}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">{t('dc.noRefShort')}</span>
              )}
              <DoseRange row={row} />
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">{row && med.dose?.value != null && check?.kind !== 'empty' ? pick(row.working) : t('rx.noAmount')}</p>
      )}

      {showNumbers ? (
        <div className="flex flex-col gap-1 text-xs text-text-2">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* The working line is a phrase, not a figure: tabular digits but free to wrap (.num is nowrap). */}
            <span className="tabular-nums">{pick(row.working)}</span>
            {refQualifiers(ref, t).length ? <span className="text-muted-foreground">{refQualifiers(ref, t).join(', ')}</span> : null}
            {ref?.source ? <CitationChip id={ref.source} /> : null}
          </p>
          {doseNotes(row, t)}
          {row.rounding && check?.kind !== 'gap' ? <p>{pick(row.rounding.text)}</p> : null}
          {row.strengthNote ? <p>{pick(row.strengthNote)}</p> : null}
        </div>
      ) : row?.strengthNote ? (
        <p className="text-xs text-text-2">{pick(row.strengthNote)}</p>
      ) : null}

      <div id={bodyId} hidden={!open} className="mt-1 flex flex-col gap-4 rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">{pick(drug.class)}</p>
        {protocols.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span id={protoLabelId} className="text-sm font-medium text-foreground">{t('rx.protocol')}</span>
            <RadioGroup
              aria-labelledby={protoLabelId}
              value={med.protocolId || '__none'}
              onValueChange={(v) => {
                const p = v === '__none' ? null : protocols.find((x) => x.id === v)
                onChange(applyProtocol(med, p), { key: 'chg.protocol', vars: { drug: dn, v: p ? p.indication : T('none', '없음') } })
              }}
              className="gap-2"
            >
              {[...protocols, null].map((p) => {
                const value = p ? p.id : '__none'
                const id = `${uid}-p-${value}`
                return (
                  <div key={value} className="flex items-start gap-2">
                    <RadioGroupItem id={id} value={value} className="mt-0.5" />
                    <Label htmlFor={id} className="flex flex-col items-start gap-0.5 leading-5 font-normal">
                      <span className="text-sm text-foreground">{p ? pick(p.indication) : t('rx.noProtocol')}</span>
                      {p ? (
                        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="num text-left">{rangeText(p.dose.min, p.dose.max, unitText(p.dose.per === 'day' ? `${p.dose.unit}/day` : p.dose.unit, lang))}</span>
                          <span>{sourceShort(p.source, lang)}</span>
                          <LabelStatus status={p.labelStatus} />
                        </span>
                      ) : null}
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </div>
        ) : (
          <p className="text-sm text-text-2">{t('rx.noProtocolForSpecies', { species: species === 'cat' ? t('pt.cat') : t('pt.dog') })}</p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <FieldLabel htmlFor={`${uid}-d`}>{t('rx.dose')}</FieldLabel>
            <div className="flex gap-2">
              <NumberInput
                id={`${uid}-d`}
                className="min-w-0 flex-1"
                positive
                value={med.dose?.value ?? null}
                suffix={protocol ? unitText(unit, lang) : null}
                invalidText={t('rx.doseInvalid')}
                onCommit={(v) => update({ dose: { unit: unit || 'mg/kg', ...med.dose, value: v } }, 'chg.dose', v == null ? T('blank', '비움') : `${v} ${unit}`)}
              />
              {!protocol ? (
                <SelectInput
                  ariaLabel={t('rx.unit')}
                  value={unit}
                  onChange={(u) => update({ dose: { value: null, ...med.dose, unit: u } }, 'chg.dose', `${med.dose?.value ?? ''} ${u}`.trim())}
                  options={freeUnits.map((u) => ({ value: u, label: u }))}
                  className="w-32"
                />
              ) : null}
            </div>
          </div>
          <SelectField
            label={t('rx.frequency')}
            value={med.frequency || ''}
            onChange={(f) => update({ frequency: f || null }, 'chg.frequency', f ? FREQ_SHORT[f] || f : T('blank', '비움'))}
            options={[{ value: '', label: t('rx.notSet') }, ...FREQUENCIES.map((f) => ({ value: f.id, label: freqShort(f.id, pick) }))]}
          />
          <SelectField
            label={t('rx.route')}
            value={med.route || ''}
            onChange={(r) => update({ route: r, strengthId: null }, 'chg.route', r)}
            options={ROUTES.map((r) => ({ value: r, label: t(`route.${r}`) }))}
          />
          <NumberField
            label={t('rx.duration')}
            value={med.durationDays ?? null}
            suffix={t('rx.days')}
            inputMode="numeric"
            onCommit={(v) => update({ durationDays: v }, 'chg.duration', v == null ? T('blank', '비움') : T(`${v} days`, `${v}일`))}
          />
          {drug.strengths.length > 0 ? (
            <SelectField
              className="sm:col-span-2"
              label={t('rx.strength')}
              value={med.strengthId || ''}
              onChange={(s) => {
                const st = drug.strengths.find((x) => x.id === s)
                update({ strengthId: s || null }, 'chg.strength', st ? strengthLabel(st, t) : T('best fit', '자동 선택'))
              }}
              options={[
                {
                  value: '',
                  label: row?.suggestedStrengthId && !med.strengthId
                    ? t('rx.autoStrengthIs', { strength: strengthLabel(drug.strengths.find((x) => x.id === row.suggestedStrengthId), t) })
                    : t('rx.autoStrength'),
                },
                ...drug.strengths.map((s) => ({ value: s.id, label: strengthLabel(s, t) })),
              ]}
            />
          ) : null}
        </div>
      </div>
    </li>
  )
}

/** Comparison notes the engine made for this row (daily total, single dose, repeat). */
function doseNotes(row, t) {
  const band = row.ref && row.compared ? row.compared : null
  if (!band) return row.status === 'unit_mismatch' ? <p>{t('dc.unitMismatch')}</p> : null
  if (band.reason === 'frequency') return <p>{t('dc.freqCompare')}</p>
  if (band.reason === 'repeat') return <p>{t('dc.repeat')}</p>
  return null
}
