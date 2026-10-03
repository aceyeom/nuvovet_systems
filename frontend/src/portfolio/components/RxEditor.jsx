import { useId, useState } from 'react'
import { useLang } from '../i18n/index.js'
import { getDrug } from '../knowledge/drugs.js'
import DrugSearch from './DrugSearch.jsx'
import MedRow from './MedRow.jsx'
import { newMed } from './caseModel.js'

const T = (en, ko) => ({ en, ko })

/**
 * Prescription editor: drug search + one dense row per medication (dose check merged into each
 * row, §5.5). notes: the engine's notes, for the D15 ceiling note that replaces a plan.
 */
export default function RxEditor({ input, doses, notes = [], onChange, highlightDrugIds = null }) {
  const { t } = useLang()
  const hintId = useId()
  const meds = input.meds
  const [added, setAdded] = useState(null)
  const dn = (id) => {
    const d = getDrug(id)
    return d ? T(d.name.en.replace(/\s*\(.*\)\s*$/, ''), d.name.ko) : id
  }
  const ceilingFor = (i, drugId) => (doses[i]?.planExceedsCeiling ? notes.find((n) => n.id === `ceiling_plan_${drugId}_${i}`) || null : null)

  return (
    <div className="flex flex-col gap-3">
      <DrugSearch
        species={input.species}
        existing={meds.map((m) => m.drugId)}
        hintId={hintId}
        onAdd={(drugId) => { setAdded(drugId); onChange({ meds: [...meds, newMed(drugId, input.species)] }, { key: 'chg.drugAdd', vars: { v: dn(drugId) } }) }}
      />
      {meds.length === 0 ? (
        <p className="border-y border-border py-6 text-sm text-muted-foreground">{t('rx.empty')}</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border" id="pf-rx-list">
          {meds.map((m, i) => (
            <MedRow
              key={m.drugId}
              defaultOpen={added === m.drugId}
              med={m}
              species={input.species}
              row={doses[i]}
              ceilingNote={ceilingFor(i, m.drugId)}
              highlighted={Boolean(highlightDrugIds?.includes(m.drugId))}
              onChange={(next, change) => onChange({ meds: meds.map((x, j) => (j === i ? next : x)) }, change)}
              onRemove={() => onChange({ meds: meds.filter((_, j) => j !== i) }, { key: 'chg.drugRemove', vars: { v: dn(m.drugId) } })}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
