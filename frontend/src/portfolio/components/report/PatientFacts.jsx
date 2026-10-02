import { useLang } from '../../i18n/index.js'
import { BREED_BY_ID, MDR1_RISK_LABELS } from '../../knowledge/breeds.js'
import { CONDITION_BY_ID, interpretLab } from '../../knowledge/conditions.js'
import { ALLERGY_BY_ID } from '../../knowledge/allergyClasses.js'
import { resolveBreed } from '../../engine/search.js'
import { breedName } from '../BreedCombobox.jsx'
import { fmtNum } from '../format.js'

export function resolvedBreed(input) {
  if (input.breedId && BREED_BY_ID[input.breedId]) return BREED_BY_ID[input.breedId]
  if (input.breedText) {
    const id = resolveBreed(input.breedText, input.species)
    return id ? BREED_BY_ID[id] : null
  }
  return null
}

/** Patient facts as label/value rows (UI language). */
export function patientRows(input, t, pick, lang) {
  const breed = resolvedBreed(input)
  const rows = []
  rows.push({ k: 'species', label: t('pt.species'), value: input.species === 'cat' ? t('pt.cat') : t('pt.dog') })
  let breedText = breed ? breedName(breed, lang) : input.breedText ? `${input.breedText} — ${t('rp.breedUnrecognised')}` : t('rp.notEntered')
  if (input.species === 'dog') breedText += ` · ${pick(MDR1_RISK_LABELS[breed ? breed.mdr1 : 'unknown'])}`
  rows.push({ k: 'breed', label: t('pt.breed'), value: breedText })
  const sex = input.sex ? `${input.sex === 'male' ? t('pt.male') : t('pt.female')}${input.neutered ? ` (${t('pt.neutered')})` : ''}` : t('rp.notEntered')
  rows.push({ k: 'sex', label: t('pt.sex'), value: sex })
  rows.push({ k: 'age', label: t('pt.age'), value: input.ageYears != null ? `${fmtNum(input.ageYears)} ${t('pt.years')}` : t('rp.notEntered') })
  rows.push({ k: 'weight', label: t('pt.weight'), value: input.weightKg != null ? `${fmtNum(input.weightKg)} kg` : t('rp.notEntered') })
  const repro = [input.pregnant && t('pt.pregnant'), input.lactating && t('pt.lactating')].filter(Boolean)
  if (repro.length) rows.push({ k: 'repro', label: t('rp.reproductive'), value: repro.join(', ') })
  const problems = (input.conditions || []).map((c) => pick(CONDITION_BY_ID[c]?.label || c))
  rows.push({ k: 'problems', label: t('pt.problems'), value: problems.length ? problems.join('; ') : t('pt.noProblems') })
  const labs = []
  if (input.labs?.creatinine != null) labs.push(`${t('pt.creatinine')} ${fmtNum(input.labs.creatinine)} mg/dL — ${pick(interpretLab('creatinine', input.labs.creatinine, input.species).label)}`)
  if (input.labs?.alt != null) labs.push(`${t('pt.alt')} ${fmtNum(input.labs.alt)} U/L`)
  rows.push({ k: 'labs', label: t('pt.labs'), value: labs.length ? labs.join('; ') : t('rp.notEntered') })
  const allergies = (input.allergies || []).map((a) => pick(ALLERGY_BY_ID[a]?.label || a))
  rows.push({ k: 'allergies', label: t('pt.allergies'), value: allergies.length ? allergies.join('; ') : t('pt.noAllergies') })
  if (input.species === 'dog') rows.push({ k: 'mdr1', label: t('pt.mdr1'), value: t(`pt.mdr1.${input.mdr1Status || 'unknown'}`) })
  return rows
}

export default function PatientFacts({ input }) {
  const { t, pick, lang } = useLang()
  return (
    <dl className="pf-facts">
      {patientRows(input, t, pick, lang).map((r) => (
        <div key={r.k} className={`pf-facts__row pf-facts__row--${r.k}`}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}
