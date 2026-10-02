import { useState } from 'react'
import { useLang } from '../i18n/index.js'
import { getDrug } from '../knowledge/drugs.js'
import DrugSearch from './DrugSearch.jsx'
import MedRow from './MedRow.jsx'
import { newMed } from './caseModel.js'

const T = (en, ko) => ({ en, ko })

/** Prescription editor: drug search + one row per medication. */
export default function RxEditor({ input, doses, onChange, highlightDrugIds = null }) {
  const { t } = useLang()
  const meds = input.meds
  const [added, setAdded] = useState(null)
  const dn = (id) => {
    const d = getDrug(id)
    return d ? T(d.name.en.replace(/\s*\(.*\)\s*$/, ''), d.name.ko) : id
  }

  return (
    <div className="pf-rx">
      <DrugSearch
        species={input.species}
        existing={meds.map((m) => m.drugId)}
        onAdd={(drugId) => { setAdded(drugId); onChange({ meds: [...meds, newMed(drugId, input.species)] }, { key: 'chg.drugAdd', vars: { v: dn(drugId) } }) }}
      />
      {meds.length === 0 ? (
        <p className="pf-empty">{t('rx.empty')}</p>
      ) : (
        <ul className="pf-meds">
          {meds.map((m, i) => (
            <MedRow
              key={m.drugId}
              defaultOpen={added === m.drugId}
              med={m}
              species={input.species}
              row={doses[i]}
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
