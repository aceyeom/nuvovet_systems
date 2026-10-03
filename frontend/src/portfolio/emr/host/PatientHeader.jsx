/**
 * Patient header of the fictional EMR (EMR popup spec §2.3), two 13 px lines. Field names follow
 * EMR_Field_Analysis.md. The fields a vet corrects during a visit (종, 품종, 체중, 특이사항 /
 * MDR1, 알레르기) are editable in place; every change re-checks (order-select, §3.5), and the
 * widget's "차트 수정" (fix-chart) focuses them through `fieldRefs`.
 */

import { useEffect, useId, useState } from 'react'
import { ALLERGY_CLASSES, ALLERGY_BY_ID } from '../../knowledge/allergyClasses.js'
import { MDR1_OPTIONS, SEX_KO, SPECIES_OPTIONS, ageText, weightStaleDays } from './calc.js'

function WeightField({ patient, visitDate, inputRef, onChange }) {
  const kg = patient.weight?.kg
  const [text, setText] = useState(kg == null ? '' : kg.toFixed(1))
  useEffect(() => {
    setText((t) => (Number(t) === kg && t !== '' ? t : kg == null ? '' : kg.toFixed(1)))
  }, [kg])
  const stale = weightStaleDays(patient, visitDate)
  return (
    <span className="emr-pt-field">
      <span className="emr-k" id="emr-weight-label">체중</span>
      <input
        ref={inputRef}
        className="emr-input emr-weight emr-num"
        type="number"
        step="0.1"
        min="0"
        inputMode="decimal"
        aria-labelledby="emr-weight-label"
        aria-describedby="emr-weight-date"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          const v = e.target.value.trim()
          const n = Number(v)
          onChange(v === '' || !Number.isFinite(n) || n <= 0 ? null : { kg: n, measuredAt: visitDate })
        }}
        data-emr="weight"
      />
      <span>kg</span>
      <span id="emr-weight-date" className={stale ? 'emr-stale' : 'emr-muted'}>
        {kg == null ? '(미입력)' : stale ? `(${stale}일 전 측정)` : `(${patient.weight.measuredAt} 측정)`}
      </span>
    </span>
  )
}

function Allergies({ allergies, inputRef, onChange }) {
  const [text, setText] = useState('')
  const listId = useId()
  function add() {
    const t = text.trim()
    if (!t) return
    const coded = ALLERGY_CLASSES.find((c) => c.id === t || c.label.ko === t)
    onChange([...allergies, coded ? { code: coded.id } : { text: t }])
    setText('')
  }
  return (
    <span className="emr-pt-field">
      <span className="emr-k">알레르기</span>
      <span className="emr-chips">
        {allergies.map((a, i) => {
          const label = a.code ? ALLERGY_BY_ID[a.code]?.label.ko ?? a.code : a.text
          return (
            <span key={`${a.code || a.text}-${i}`} className={a.code ? 'emr-chip' : 'emr-chip emr-chip-free'} title={a.code ? '코드 입력' : '자유 입력'}>
              {label}
              <button type="button" aria-label={`알레르기 삭제: ${label}`} onClick={() => onChange(allergies.filter((_, j) => j !== i))}>×</button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          className="emr-input"
          style={{ width: 96 }}
          type="text"
          list={listId}
          aria-label="알레르기 추가: 목록에서 선택하면 코드, 직접 입력하면 자유 입력"
          placeholder={allergies.length ? '추가' : '없음 (추가)'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          onBlur={add}
          data-emr="allergy"
        />
        <datalist id={listId}>
          {ALLERGY_CLASSES.map((c) => <option key={c.id} value={c.label.ko} />)}
        </datalist>
      </span>
    </span>
  )
}

/** Input width that fits its text (Hangul ≈ 13 px, Latin ≈ 7.5 px at 13 px). */
function textWidth(text) {
  const t = String(text || '')
  const wide = (t.match(/[\u3131-\uD7A3]/g) || []).length
  return Math.min(320, Math.max(96, Math.ceil(wide * 13 + (t.length - wide) * 7.6 + 14)))
}

export function PatientHeader({ visit, fieldRefs, onPatient }) {
  const p = visit.patient
  const dog = p.species === 'Canine'
  // A remark that records the genotype ("MDR1 미검사") is the coded MDR1 field itself (§4.1).
  const mdr1Remark = /^MDR1\b/.test(p.remarks || '')
  const mdr1Select = (
    <select
      ref={fieldRefs.mdr1}
      className="emr-select"
      aria-label="특이사항: MDR1 유전자형"
      value={p.mdr1 || 'unknown'}
      onChange={(e) => setMdr1(e.target.value)}
      data-emr="mdr1"
    >
      {MDR1_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  function setMdr1(value) {
    const label = MDR1_OPTIONS.find((o) => o.value === value)?.label ?? value
    const remarks = /^MDR1\b/.test(p.remarks || '') ? `MDR1 ${label}` : p.remarks
    onPatient({ mdr1: value, remarks })
  }

  return (
    <section className="emr-box emr-pt" aria-label="환자 정보" data-emr="patient">
      <div className="emr-pt-clip">
      <div className="emr-pt-line">
        <span className="emr-pt-id"><span className="emr-pt-name">{p.name}</span> <span className="emr-num">#{p.id}</span></span>
        <span className="emr-pt-field">
          <select
            ref={fieldRefs.species}
            className="emr-select emr-flat"
            aria-label="종"
            value={p.species ?? ''}
            onChange={(e) => onPatient({ species: e.target.value })}
            data-emr="species"
          >
            {SPECIES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </span>
        <span className="emr-pt-field">
          <input
            ref={fieldRefs.breed}
            className="emr-input emr-flat emr-breed"
            style={{ width: textWidth(p.breed) }}
            type="text"
            aria-label="품종"
            value={p.breed ?? ''}
            onChange={(e) => onPatient({ breed: e.target.value })}
            data-emr="breed"
          />
        </span>
        <span>{SEX_KO[p.sex] ?? (p.sex || '미상')}</span>
        <span className="emr-num">{ageText(p.birthDate, visit.date)} ({p.birthDate})</span>
        <Allergies allergies={p.allergies || []} inputRef={fieldRefs.allergies} onChange={(allergies) => onPatient({ allergies })} />
      </div>
      <div className="emr-pt-line">
        <WeightField patient={p} visitDate={visit.date} inputRef={fieldRefs.weight} onChange={(weight) => onPatient({ weight })} />
        <span className="emr-pt-field"><span className="emr-k">보호자</span>{p.guardian || ''}</span>
        <span className="emr-pt-field"><span className="emr-k">담당의</span>김민서</span>
        <span className="emr-pt-field">
          <span className="emr-k">특이</span>
          {mdr1Remark ? (
            <>
              <span className="emr-warn" aria-hidden="true">⚠</span>
              <span>MDR1</span>
              {mdr1Select}
            </>
          ) : <span>{p.remarks || '없음'}</span>}
        </span>
        {dog && !mdr1Remark ? (
          <span className="emr-pt-field">
            <span className="emr-k">MDR1</span>
            {mdr1Select}
          </span>
        ) : null}
      </div>
      </div>
    </section>
  )
}

export default PatientHeader
