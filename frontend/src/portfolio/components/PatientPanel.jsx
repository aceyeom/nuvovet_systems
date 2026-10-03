import { useId } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/ui/primitives/toggle-group'
import { MultiCombobox } from '@/ui/ext/wp5/MultiCombobox'
import { useLang } from '../i18n/index.js'
import { CONDITIONS, CONDITION_BY_ID, interpretLab } from '../knowledge/conditions.js'
import { ALLERGY_CLASSES, ALLERGY_BY_ID } from '../knowledge/allergyClasses.js'
import { BREED_BY_ID } from '../knowledge/breeds.js'
import { resolveBreed } from '../engine/search.js'
import BreedCombobox, { breedName } from './BreedCombobox.jsx'
import SpeciesGlyph from './SpeciesGlyph.jsx'
import CitationChip from './CitationChip.jsx'
import { FieldLabel, NumberField, NumberInput, SelectField, CheckField } from './fields.jsx'

const T = (en, ko) => ({ en, ko })
const MDR1_OPTIONS = ['unknown', 'normal/normal', 'mutant/normal', 'mutant/mutant']
const MDR1_WORD = {
  unknown: T('not tested', '미검사'),
  'normal/normal': T('normal/normal', '정상/정상'),
  'mutant/normal': T('mutant/normal', '변이/정상'),
  'mutant/mutant': T('mutant/mutant', '변이/변이'),
}

function LabNote({ kind, value, species }) {
  const { pick } = useLang()
  if (value == null) return null
  const r = interpretLab(kind, value, species)
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-text-2">
      <span>{pick(r.label)}</span>
      {r.source ? <CitationChip id={r.source} /> : null}
    </p>
  )
}

/** A labelled group of controls (species, sex) whose label is not a <label>. */
function Group({ label, children }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-1.5">
      <span id={id} className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </div>
  )
}

/**
 * Patient panel. onChange(patch, change): change is a { key, vars } label for the "what changed"
 * line; vars may hold { en, ko } objects.
 */
export default function PatientPanel({ input, onChange }) {
  const { t, pick } = useLang()
  const uid = useId()
  const species = input.species
  const yesNo = (b) => (b ? T('yes', '예') : T('no', '아니오'))
  const problemsId = `${uid}-problems`
  const allergyId = `${uid}-allergy`

  const setSpecies = (sp) => {
    if (!sp || sp === species) return
    onChange({ species: sp }, { key: 'chg.species', vars: { v: sp === 'cat' ? T('Cat', '고양이') : T('Dog', '개') } })
  }
  const sexValue = input.sex || 'unknown'
  const setSex = (v) => {
    if (!v) return
    const sex = v === 'unknown' ? null : v
    onChange(
      { sex, ...(sex !== 'female' ? { pregnant: false, lactating: false } : {}) },
      { key: 'chg.sex', vars: { v: sex === 'male' ? T('male', '수컷') : sex === 'female' ? T('female', '암컷') : T('unknown', '미상') } },
    )
  }

  const conditionOptions = CONDITIONS.filter((c) => c.species.includes(species)).map((c) => ({ value: c.id, label: pick(c.label), keywords: `${c.label.en} ${c.label.ko}` }))
  const allergyOptions = ALLERGY_CLASSES.map((a) => ({ value: a.id, label: pick(a.label), keywords: `${a.label.en} ${a.label.ko}` }))
  const creat = input.labs?.creatinine ?? null
  const alt = input.labs?.alt ?? null
  const blank = T('blank', '비움')

  return (
    <div className="flex flex-col gap-5">
      <Group label={t('pt.species')}>
        <ToggleGroup type="single" value={species} onValueChange={setSpecies} aria-label={t('pt.species')} className="w-full">
          {['dog', 'cat'].map((sp) => (
            <ToggleGroupItem key={sp} value={sp} className="flex-1">
              <SpeciesGlyph species={sp} size={16} />
              {t(`pt.${sp}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Group>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label={t('pt.weight')}
          positive
          invalidText={t('pt.weightInvalid')}
          value={input.weightKg}
          suffix="kg"
          onCommit={(v) => onChange({ weightKg: v }, { key: 'chg.weight', vars: { v: v == null ? blank : `${v} kg` } })}
        />
        <NumberField
          label={t('pt.age')}
          value={input.ageYears}
          suffix={t('pt.years')}
          onCommit={(v) => onChange({ ageYears: v }, { key: 'chg.age', vars: { v: v == null ? blank : T(`${v} y`, `${v}세`) } })}
        />
      </div>

      <BreedCombobox
        label={t('pt.breed')}
        species={species}
        breedId={input.breedId}
        breedText={input.breedText}
        onChange={({ breedId, breedText }) => {
          const resolved = breedId ? BREED_BY_ID[breedId] : (breedText ? BREED_BY_ID[resolveBreed(breedText, species)] : null)
          const v = resolved ? T(breedName(resolved, 'en'), breedName(resolved, 'ko')) : breedText ? T(`${breedText} (not recognised)`, `${breedText}(인식 안 됨)`) : null
          onChange({ breedId, breedText }, v ? { key: 'chg.breed', vars: { v } } : { key: 'chg.breedCleared' })
        }}
      />

      <Group label={t('pt.sex')}>
        <ToggleGroup type="single" size="sm" value={sexValue} onValueChange={setSex} aria-label={t('pt.sex')} className="w-full">
          <ToggleGroupItem value="male" className="flex-1">{t('pt.male')}</ToggleGroupItem>
          <ToggleGroupItem value="female" className="flex-1">{t('pt.female')}</ToggleGroupItem>
          <ToggleGroupItem value="unknown" className="flex-1">{t('pt.sexUnknown')}</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
          <CheckField checked={input.neutered} label={t('pt.neutered')} onChange={(v) => onChange({ neutered: v }, { key: 'chg.neutered', vars: { v: yesNo(v) } })} />
          {input.sex === 'female' ? (
            <>
              <CheckField checked={input.pregnant} label={t('pt.pregnant')} onChange={(v) => onChange({ pregnant: v }, { key: 'chg.pregnant', vars: { v: yesNo(v) } })} />
              <CheckField checked={input.lactating} label={t('pt.lactating')} onChange={(v) => onChange({ lactating: v }, { key: 'chg.lactating', vars: { v: yesNo(v) } })} />
            </>
          ) : null}
        </div>
      </Group>

      <div className="flex flex-col gap-1.5">
        <span id={problemsId} className="text-sm font-medium text-foreground">{t('pt.problems')}</span>
        <MultiCombobox
          labelledBy={problemsId}
          options={conditionOptions}
          value={input.conditions}
          onAdd={(id) => onChange({ conditions: [...input.conditions, id] }, { key: 'chg.problemAdd', vars: { v: CONDITION_BY_ID[id].label } })}
          onRemove={(id) => onChange({ conditions: input.conditions.filter((c) => c !== id) }, { key: 'chg.problemRemove', vars: { v: CONDITION_BY_ID[id]?.label || id } })}
          addLabel={t('pt.addProblem')}
          emptyText={t('pt.noProblems')}
          searchPlaceholder={t('pt.searchList')}
          noMatchText={t('pt.noMatch')}
          removeLabel={(name) => t('pt.remove', { name })}
        />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-medium text-foreground">{t('pt.labs')}</legend>
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3">
            <FieldLabel htmlFor={`${uid}-cr`} className="font-normal">{t('pt.creatinine')}</FieldLabel>
            <NumberInput
              id={`${uid}-cr`}
              value={creat}
              suffix="mg/dL"
              onCommit={(v) => onChange({ labs: { ...input.labs, creatinine: v } }, { key: 'chg.creatinine', vars: { v: v == null ? blank : `${v} mg/dL` } })}
            />
          </div>
          <LabNote kind="creatinine" value={creat} species={species} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3">
            <FieldLabel htmlFor={`${uid}-alt`} className="font-normal">{t('pt.alt')}</FieldLabel>
            <NumberInput
              id={`${uid}-alt`}
              value={alt}
              suffix="U/L"
              onCommit={(v) => onChange({ labs: { ...input.labs, alt: v } }, { key: 'chg.alt', vars: { v: v == null ? blank : `${v} U/L` } })}
            />
          </div>
          <LabNote kind="alt" value={alt} species={species} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <span id={allergyId} className="text-sm font-medium text-foreground">{t('pt.allergies')}</span>
        <MultiCombobox
          labelledBy={allergyId}
          options={allergyOptions}
          value={input.allergies}
          onAdd={(id) => onChange({ allergies: [...input.allergies, id] }, { key: 'chg.allergyAdd', vars: { v: ALLERGY_BY_ID[id].label } })}
          onRemove={(id) => onChange({ allergies: input.allergies.filter((a) => a !== id) }, { key: 'chg.allergyRemove', vars: { v: ALLERGY_BY_ID[id]?.label || id } })}
          addLabel={t('pt.addAllergy')}
          emptyText={t('pt.noAllergies')}
          searchPlaceholder={t('pt.searchList')}
          noMatchText={t('pt.noMatch')}
          removeLabel={(name) => t('pt.remove', { name })}
        />
      </div>

      {species === 'dog' ? (
        <SelectField
          label={t('pt.mdr1')}
          value={input.mdr1Status || 'unknown'}
          onChange={(v) => onChange({ mdr1Status: v || 'unknown' }, { key: 'chg.mdr1', vars: { v: MDR1_WORD[v || 'unknown'] } })}
          options={MDR1_OPTIONS.map((o) => ({ value: o, label: t(`pt.mdr1.${o}`) }))}
        />
      ) : (
        <p className="text-xs text-muted-foreground">{t('pt.mdr1CatNote')}</p>
      )}
    </div>
  )
}
