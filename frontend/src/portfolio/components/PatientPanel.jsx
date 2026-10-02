import { useId } from 'react'
import { X } from 'lucide-react'
import { useLang } from '../i18n/index.js'
import { CONDITIONS, CONDITION_BY_ID, interpretLab } from '../knowledge/conditions.js'
import { ALLERGY_CLASSES, ALLERGY_BY_ID } from '../knowledge/allergyClasses.js'
import { BREED_BY_ID } from '../knowledge/breeds.js'
import { resolveBreed } from '../engine/search.js'
import BreedCombobox, { breedName } from './BreedCombobox.jsx'
import SpeciesGlyph from './SpeciesGlyph.jsx'
import CitationChip from './CitationChip.jsx'
import { Field, NumberInput, Select, Segmented, Checkbox } from './fields.jsx'

const T = (en, ko) => ({ en, ko })
const MDR1_OPTIONS = ['unknown', 'normal/normal', 'mutant/normal', 'mutant/mutant']

function LabChip({ kind, value, species }) {
  const { pick } = useLang()
  if (value == null) return null
  const r = interpretLab(kind, value, species)
  return (
    <span className={`pf-labchip pf-labchip--${r.status}`}>
      <span>{pick(r.label)}</span>
      {r.source && <CitationChip id={r.source} />}
    </span>
  )
}

function TokenList({ ids, byId, onRemove, emptyText }) {
  const { t, pick } = useLang()
  if (!ids.length) return <p className="pf-muted pf-small">{emptyText}</p>
  return (
    <ul className="pf-tokens">
      {ids.map((id) => {
        const label = pick(byId[id]?.label || id)
        return (
          <li key={id} className="pf-token">
            <span>{label}</span>
            <button type="button" className="pf-token__x" onClick={() => onRemove(id)} aria-label={t('pt.remove', { name: label })}>
              <X size={13} aria-hidden="true" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Patient panel. onChange(patch, change) — change is a { key, vars } label for
 * the "what changed" chip; vars may hold { en, ko } objects.
 */
export default function PatientPanel({ input, onChange }) {
  const { t, pick } = useLang()
  const uid = useId()
  const fid = (k) => `${uid}-${k}`
  const species = input.species
  const yesNo = (b) => (b ? T('yes', '예') : T('no', '아니오'))

  const setSpecies = (sp) => {
    if (sp === species) return
    onChange({ species: sp }, { key: 'chg.species', vars: { v: sp === 'cat' ? T('Cat', '고양이') : T('Dog', '개') } })
  }

  const conditionOptions = CONDITIONS.filter((c) => c.species.includes(species) && !input.conditions.includes(c.id))
  const allergyOptions = ALLERGY_CLASSES.filter((a) => !input.allergies.includes(a.id))
  const creat = input.labs?.creatinine ?? null
  const alt = input.labs?.alt ?? null

  return (
    <div className="pf-form">
      <Field label={t('pt.species')}>
        <Segmented
          ariaLabel={t('pt.species')}
          value={species}
          onChange={setSpecies}
          options={[
            { value: 'dog', label: t('pt.dog'), icon: <SpeciesGlyph species="dog" size={18} /> },
            { value: 'cat', label: t('pt.cat'), icon: <SpeciesGlyph species="cat" size={18} /> },
          ]}
        />
      </Field>

      <div className="pf-form__row">
        <Field label={t('pt.weight')} htmlFor={fid('w')}>
          <NumberInput
            id={fid('w')}
            positive
            invalidText={t('pt.weightInvalid')}
            value={input.weightKg}
            suffix={t('pt.kg')}
            onCommit={(v) => onChange({ weightKg: v }, { key: 'chg.weight', vars: { v: v == null ? T('blank', '비움') : `${v} kg` } })}
          />
        </Field>
        <Field label={t('pt.age')} htmlFor={fid('age')}>
          <NumberInput
            id={fid('age')}
            value={input.ageYears}
            suffix={t('pt.years')}
            onCommit={(v) => onChange({ ageYears: v }, { key: 'chg.age', vars: { v: v == null ? T('blank', '비움') : T(`${v} y`, `${v}세`) } })}
          />
        </Field>
      </div>

      <Field label={t('pt.breed')} htmlFor={fid('breed')}>
        <BreedCombobox
          id={fid('breed')}
          species={species}
          breedId={input.breedId}
          breedText={input.breedText}
          onChange={({ breedId, breedText }) => {
            const resolved = breedId ? BREED_BY_ID[breedId] : (breedText ? BREED_BY_ID[resolveBreed(breedText, species)] : null)
            const v = resolved ? T(breedName(resolved, 'en'), breedName(resolved, 'ko')) : breedText ? T(`“${breedText}” (not recognised)`, `“${breedText}”(인식 안 됨)`) : null
            onChange({ breedId, breedText }, v ? { key: 'chg.breed', vars: { v } } : { key: 'chg.breedCleared' })
          }}
        />
      </Field>

      <Field label={t('pt.sex')}>
          <Segmented
            ariaLabel={t('pt.sex')}
            size="sm"
            value={input.sex}
            onChange={(v) => onChange({ sex: v, ...(v !== 'female' ? { pregnant: false, lactating: false } : {}) }, { key: 'chg.sex', vars: { v: v === 'male' ? T('male', '수컷') : v === 'female' ? T('female', '암컷') : T('unknown', '미상') } })}
            options={[
              { value: 'male', label: t('pt.male') },
              { value: 'female', label: t('pt.female') },
              { value: null, label: t('pt.sexUnknown') },
            ]}
          />
      </Field>
      <div className="pf-checks">
        <Checkbox checked={input.neutered} label={t('pt.neutered')} onChange={(v) => onChange({ neutered: v }, { key: 'chg.neutered', vars: { v: yesNo(v) } })} />
        {input.sex === 'female' && (
          <>
            <Checkbox checked={input.pregnant} label={t('pt.pregnant')} onChange={(v) => onChange({ pregnant: v }, { key: 'chg.pregnant', vars: { v: yesNo(v) } })} />
            <Checkbox checked={input.lactating} label={t('pt.lactating')} onChange={(v) => onChange({ lactating: v }, { key: 'chg.lactating', vars: { v: yesNo(v) } })} />
          </>
        )}
      </div>

      <Field label={t('pt.problems')} htmlFor={fid('cond')}>
        <TokenList
          ids={input.conditions}
          byId={CONDITION_BY_ID}
          emptyText={t('pt.noProblems')}
          onRemove={(id) => onChange({ conditions: input.conditions.filter((c) => c !== id) }, { key: 'chg.problemRemove', vars: { v: CONDITION_BY_ID[id]?.label || id } })}
        />
        {conditionOptions.length > 0 && (
          <Select
            id={fid('cond')}
            value=""
            ariaLabel={t('pt.addProblem')}
            onChange={(id) => id && onChange({ conditions: [...input.conditions, id] }, { key: 'chg.problemAdd', vars: { v: CONDITION_BY_ID[id].label } })}
          >
            <option value="">{t('pt.addProblem')}</option>
            {conditionOptions.map((c) => <option key={c.id} value={c.id}>{pick(c.label)}</option>)}
          </Select>
        )}
      </Field>

      <fieldset className="pf-fieldset">
        <legend className="pf-label">{t('pt.labs')}</legend>
        <div className="pf-lab">
          <label className="pf-lab__name" htmlFor={fid('cr')}>{t('pt.creatinine')}</label>
          <NumberInput
            id={fid('cr')}
            value={creat}
            suffix="mg/dL"
            className="pf-input-group--lab"
            onCommit={(v) => onChange({ labs: { ...input.labs, creatinine: v } }, { key: 'chg.creatinine', vars: { v: v == null ? T('blank', '비움') : `${v} mg/dL` } })}
          />
          <LabChip kind="creatinine" value={creat} species={species} />
        </div>
        <div className="pf-lab">
          <label className="pf-lab__name" htmlFor={fid('alt')}>{t('pt.alt')}</label>
          <NumberInput
            id={fid('alt')}
            value={alt}
            suffix="U/L"
            className="pf-input-group--lab"
            onCommit={(v) => onChange({ labs: { ...input.labs, alt: v } }, { key: 'chg.alt', vars: { v: v == null ? T('blank', '비움') : `${v} U/L` } })}
          />
          <LabChip kind="alt" value={alt} species={species} />
        </div>
      </fieldset>

      <Field label={t('pt.allergies')} htmlFor={fid('alg')}>
        <TokenList
          ids={input.allergies}
          byId={ALLERGY_BY_ID}
          emptyText={t('pt.noAllergies')}
          onRemove={(id) => onChange({ allergies: input.allergies.filter((a) => a !== id) }, { key: 'chg.allergyRemove', vars: { v: ALLERGY_BY_ID[id]?.label || id } })}
        />
        {allergyOptions.length > 0 && (
          <Select
            id={fid('alg')}
            value=""
            ariaLabel={t('pt.addAllergy')}
            onChange={(id) => id && onChange({ allergies: [...input.allergies, id] }, { key: 'chg.allergyAdd', vars: { v: ALLERGY_BY_ID[id].label } })}
          >
            <option value="">{t('pt.addAllergy')}</option>
            {allergyOptions.map((a) => <option key={a.id} value={a.id}>{pick(a.label)}</option>)}
          </Select>
        )}
      </Field>

      {species === 'dog' ? (
        <Field label={t('pt.mdr1')} htmlFor={fid('mdr1')}>
          <Select
            id={fid('mdr1')}
            value={input.mdr1Status || 'unknown'}
            onChange={(v) => onChange({ mdr1Status: v }, { key: 'chg.mdr1', vars: { v: T(DICT_EN_MDR1[v], DICT_KO_MDR1[v]) } })}
          >
            {MDR1_OPTIONS.map((o) => <option key={o} value={o}>{t(`pt.mdr1.${o}`)}</option>)}
          </Select>
        </Field>
      ) : (
        <p className="pf-muted pf-small">{t('pt.mdr1CatNote')}</p>
      )}
    </div>
  )
}

const DICT_EN_MDR1 = { unknown: 'not tested', 'normal/normal': 'normal/normal', 'mutant/normal': 'mutant/normal', 'mutant/mutant': 'mutant/mutant' }
const DICT_KO_MDR1 = { unknown: '미검사', 'normal/normal': '정상/정상', 'mutant/normal': '변이/정상', 'mutant/mutant': '변이/변이' }
