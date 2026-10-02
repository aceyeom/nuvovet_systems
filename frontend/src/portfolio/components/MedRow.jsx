import { useId, useState } from 'react'
import { X, ArrowRight, ChevronDown } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import { getDrug, protocolsFor } from '../knowledge/drugs.js'
import { FREQUENCIES } from '../engine/dose.js'
import { applyProtocol } from './caseModel.js'
import { Field, NumberInput, Select } from './fields.jsx'
import { LabelStatus, DoseStatus, AmountText } from './DoseTable.jsx'
import RangeBar from './RangeBar.jsx'
import { fmtNum, fmtQ, doseBand, rangeText, unitText, freqShort, FREQ_SHORT, sourceShort, amountCheck } from './format.js'

const T = (en, ko) => ({ en, ko })
const ROUTES = ['PO', 'SC', 'IM', 'IV', 'topical', 'spot-on']
const FREE_UNITS = ['mg/kg', 'mcg/kg', 'mg', 'mcg', 'mg/m2', 'mL', 'tablet', 'capsule', 'chewable', 'pipette']

function strengthLabel(s, t) {
  const amt = `${fmtNum(s.amount.value)} ${s.amount.unit}`
  const conc = s.per ? `${amt}/${s.per.value === 1 ? '' : fmtNum(s.per.value)}${s.per.unit}` : amt
  return `${conc} ${t(`form.${s.form}`)}`
}

/**
 * One prescription line. onChange(nextMed, change) · onRemove()
 * row: the engine's DoseRow for this line (may be undefined while invalid).
 */
export default function MedRow({ med, species, row, onChange, onRemove, highlighted = false, defaultOpen = false }) {
  const { t, pick, lang } = useLang()
  const uid = useId()
  const [open, setOpen] = useState(defaultOpen)
  const fid = (k) => `${uid}-${k}`
  const drug = getDrug(med.drugId)
  if (!drug) return null
  const protocols = protocolsFor(drug.id, species)
  const protocol = protocols.find((p) => p.id === med.protocolId) || null
  const name = pick(drug.name)
  const shortName = name.replace(/\s*\(.*\)\s*$/, '')
  const dn = T(drug.name.en.replace(/\s*\(.*\)\s*$/, ''), drug.name.ko)
  const check = row ? amountCheck(row) : null
  // Nothing to give (dose 0): no administration line, no range bar.
  const band = row && check?.kind !== 'empty' ? doseBand(row) : null
  const unit = med.dose?.unit || ''
  const freeUnits = FREE_UNITS.includes(unit) ? FREE_UNITS : [unit, ...FREE_UNITS].filter(Boolean)

  const update = (patch, key, v) => onChange({ ...med, ...patch }, { key, vars: { drug: dn, v } })

  return (
    <li className={`pf-med${highlighted ? ' is-highlighted' : ''}${open ? ' is-open' : ''}`} data-drug={drug.id}>
      <div className="pf-med__head">
        <h3 className="pf-med__h">
        <button type="button" className="pf-med__toggle" aria-expanded={open} aria-controls={fid('body')} onClick={() => setOpen((o) => !o)}>
          <span className="pf-med__titles">
            <span className="pf-med__name">{shortName}</span>
            <span className="pf-med__summary pf-num">
              {[med.dose?.value != null ? `${fmtNum(med.dose.value)} ${unitText(unit, lang)}` : '—', med.frequency ? freqShort(med.frequency, pick) : null, med.route || null].filter(Boolean).join(' · ')}
            </span>
          </span>
          <ChevronDown size={16} aria-hidden="true" className="pf-med__chev" />
          <span className="pf-sr">{open ? t('fc.collapse') : t('rx.edit')}</span>
        </button>
        </h3>
        <button type="button" className="pf-icon-btn" onClick={onRemove} aria-label={t('rx.remove', { name: shortName })}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="pf-med__amount">
        {check?.kind === 'ok' ? (
          <>
            <div className="pf-med__amount-line">
              <span className="pf-num pf-strong">{fmtQ(row.perDose, lang)}</span>
              <ArrowRight size={14} aria-hidden="true" className="pf-muted" />
              <span className="pf-num">{pick(row.administration)}</span>
            </div>
            <div className="pf-med__working">{pick(row.working)}</div>
          </>
        ) : check && check.kind !== 'empty' ? (
          <>
            {/* The calculated amount, and why the plan is not the instruction (same wording as the dose check). */}
            <div className="pf-med__amount-line"><AmountText row={row} compact /></div>
            <div className="pf-med__working">{pick(row.working)}</div>
          </>
        ) : check?.kind === 'empty' ? (
          <div className="pf-muted pf-small">{t('rx.noAmount')}</div>
        ) : (
          <div className="pf-muted pf-small">{row && med.dose?.value != null ? pick(row.working) : t('rx.noAmount')}</div>
        )}
        {row?.strengthNote && (
          // A count or volume (e.g. "1 chewable") that cannot be converted to mg until a strength is chosen.
          <div className="pf-med__working" role="note" style={{ color: 'var(--pf-sev-moderate)' }}>{pick(row.strengthNote)}</div>
        )}
        {band && (
          <div className="pf-med__range">
            <RangeBar band={{ ...band, unit: unitText(band.unit, lang) }} status={row.status} compact />
            <DoseStatus status={row.status} check={Boolean(check?.needsCheck)} />
          </div>
        )}
      </div>

      <div className="pf-med__body" id={fid('body')} hidden={!open}>
      <div className="pf-med__class">{pick(drug.class)}</div>
      {protocols.length > 0 ? (
        <fieldset className="pf-protos">
          <legend className="pf-label">{t('rx.protocol')}</legend>
          {[...protocols, null].map((p) => {
            const value = p ? p.id : ''
            const checked = (med.protocolId || '') === value
            const choose = () => {
              if (checked) return
              onChange(applyProtocol(med, p), { key: 'chg.protocol', vars: { drug: dn, v: p ? p.indication : T('none', '없음') } })
            }
            return (
              <label key={value || 'none'} className={`pf-proto${checked ? ' is-on' : ''}${p ? '' : ' pf-proto--none'}`}>
                <input type="radio" name={fid('p')} value={value} checked={checked} onChange={choose} className="pf-proto__radio" />
                <span className="pf-proto__body">
                  <span className="pf-proto__name">{p ? pick(p.indication) : t('rx.noProtocol')}</span>
                  {p && (
                    <span className="pf-proto__meta">
                      <LabelStatus status={p.labelStatus} />
                      <span className="pf-num">{rangeText(p.dose.min, p.dose.max, unitText(p.dose.per === 'day' ? `${p.dose.unit}/day` : p.dose.unit, lang))}</span>
                      <span>· {sourceShort(p.source, lang)}</span>
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </fieldset>
      ) : (
        <Field label={t('rx.protocol')}>
          <p className="pf-muted pf-small">{t('rx.noProtocolForSpecies', { species: species === 'cat' ? t('pt.cat') : t('pt.dog') })}</p>
        </Field>
      )}

      <div className="pf-form__row">
        <Field label={t('rx.dose')} htmlFor={fid('d')}>
          <div className="pf-dose-input">
            <NumberInput
              id={fid('d')}
              positive
              invalidText={t('rx.doseInvalid')}
              value={med.dose?.value ?? null}
              suffix={protocol ? <span title={t('rx.unitLocked')}>{unitText(unit, lang)}</span> : null}
              onCommit={(v) => update({ dose: { ...med.dose, value: v } }, 'chg.dose', v == null ? T('blank', '비움') : `${v} ${unit}`)}
            />
            {!protocol && (
              <Select value={unit} ariaLabel={t('rx.unit')} className="pf-select--unit" onChange={(u) => update({ dose: { ...med.dose, unit: u } }, 'chg.dose', `${med.dose?.value ?? ''} ${u}`.trim())}>
                {freeUnits.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            )}
          </div>
        </Field>
        <Field label={t('rx.frequency')} htmlFor={fid('f')}>
          <Select id={fid('f')} value={med.frequency || ''} onChange={(f) => update({ frequency: f || null }, 'chg.frequency', f ? FREQ_SHORT[f] || f : T('blank', '비움'))}>
            <option value="">—</option>
            {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{freqShort(f.id, pick)}</option>)}
          </Select>
        </Field>
      </div>

      <div className="pf-form__row">
        <Field label={t('rx.route')} htmlFor={fid('r')}>
          <Select id={fid('r')} value={med.route || ''} onChange={(r) => update({ route: r, strengthId: null }, 'chg.route', r)}>
            {ROUTES.map((r) => <option key={r} value={r}>{t(`route.${r}`)}</option>)}
          </Select>
        </Field>
        <Field label={t('rx.duration')} htmlFor={fid('du')}>
          <NumberInput
            id={fid('du')}
            value={med.durationDays ?? null}
            suffix={t('rx.days')}
            inputMode="numeric"
            onCommit={(v) => update({ durationDays: v }, 'chg.duration', v == null ? T('blank', '비움') : T(`${v} days`, `${v}일`))}
          />
        </Field>
      </div>

      {drug.strengths.length > 0 && (
        <Field label={t('rx.strength')} htmlFor={fid('s')}>
          <Select
            id={fid('s')}
            value={med.strengthId || ''}
            onChange={(s) => {
              const st = drug.strengths.find((x) => x.id === s)
              update({ strengthId: s || null }, 'chg.strength', st ? strengthLabel(st, t) : T('best fit', '자동 선택'))
            }}
          >
            <option value="">{row?.suggestedStrengthId && !med.strengthId ? `${t('rx.autoStrength')} — ${strengthLabel(drug.strengths.find((x) => x.id === row.suggestedStrengthId), t)}` : t('rx.autoStrength')}</option>
            {drug.strengths.map((s) => <option key={s.id} value={s.id}>{strengthLabel(s, t)}</option>)}
          </Select>
        </Field>
      )}

      </div>
    </li>
  )
}
