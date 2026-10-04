/**
 * Patient header of the fictional EMR (EMR popup spec §2.3): photo, signalment, status cells,
 * insurance and a vitals strip (clinical.js, display only). Legacy look on purpose: a square framed
 * photo, square bordered key/value cells (MDR1, 알레르기, 만성, 보험) and labels without icons. Field names follow
 * EMR_Field_Analysis.md. The fields a vet corrects during a visit (종, 품종, 체중, 특이사항 /
 * MDR1, 알레르기) are editable in place; every change re-checks (order-select, §3.5), and the
 * widget's "차트 수정" (fix-chart) focuses them through `fieldRefs`.
 */

import { useEffect, useId, useState } from 'react'
import { PetAvatar } from '@/brand/PetAvatar'
import { ALLERGY_CLASSES, ALLERGY_BY_ID } from '../../knowledge/allergyClasses.js'
import { MDR1_OPTIONS, SEX_KO, SPECIES_KO, SPECIES_OPTIONS, ageText, weightStaleDays } from './calc.js'
import { RECEPTION, clinicalFor, vitalFlag } from './clinical.js'

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

/** A select as wide as its chosen label plus the arrow (a native select sizes to its longest option). */
function selectWidth(label) {
  const t = String(label || '')
  const wide = (t.match(/[\u3131-\uD7A3]/g) || []).length
  return Math.ceil(wide * 13 + (t.length - wide) * 7.6 + 26)
}

/** Weight trend (oldest → today) as a 64 × 20 sparkline. */
function Sparkline({ values }) {
  if (!values || values.length < 2) return null
  const w = 64
  const h = 20
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 4) + 2, h - 3 - ((v - lo) / span) * (h - 6)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const down = values[values.length - 1] < values[0]
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg className="emr-spark" data-trend={down ? 'down' : 'up'} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.2" />
    </svg>
  )
}

function Vital({ label, value, unit, flag }) {
  return (
    <span className="emr-vital" data-flag={flag || undefined}>
      <span className="emr-k">{label}</span>
      <b className="emr-num">{value}</b>
      {unit ? <span className="emr-unit">{unit}</span> : null}
      {flag ? <span className="emr-flag">{flag === 'high' ? 'H' : 'L'}</span> : null}
    </span>
  )
}

export function PatientHeader({ visit, fieldRefs, onPatient }) {
  const p = visit.patient
  const dog = p.species === 'Canine'
  const info = clinicalFor(visit.id)
  const rec = RECEPTION[visit.id]
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

  const chronic = (visit.diagnoses || []).filter((d) => /URO-010|CAR-005|END-003|NEU-001/.test(d.code))
  const allergyLabels = (p.allergies || []).map((a) => (a.code ? ALLERGY_BY_ID[a.code]?.label.ko ?? a.code : a.text))
  const insured = info?.insurance?.status === '가입'
  const v = info?.vitals

  return (
    <section className="emr-box emr-pt" aria-label="환자 정보" data-emr="patient">
      <div className="emr-pt-main">
        <span className="emr-pt-photo">
          <PetAvatar id={p.id} species={p.species} name={p.name} size={64} shape="square" />
        </span>
        <div className="emr-pt-info">
          <div className="emr-pt-line emr-pt-title">
            <span className="emr-pt-id"><span className="emr-pt-name">{p.name}</span> <span className="emr-num emr-muted">#{p.id}</span></span>
            <span className="emr-pt-field">
              <select
                ref={fieldRefs.species}
                className="emr-select emr-flat"
                aria-label="종"
                style={{ width: selectWidth(SPECIES_OPTIONS.find((o) => o.value === (p.species ?? ''))?.label) }}
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
            <span className="emr-num">{ageText(p.birthDate, visit.date)} <span className="emr-muted">({p.birthDate})</span></span>
          </div>
          <div className="emr-pt-line">
            <WeightField patient={p} visitDate={visit.date} inputRef={fieldRefs.weight} onChange={(weight) => onPatient({ weight })} />
            <span className="emr-pt-field"><span className="emr-k">보호자</span>{p.guardian || ''} <span className="emr-muted emr-num">010-****-{p.id}</span></span>
            <span className="emr-pt-field"><span className="emr-k">담당의</span>김민서</span>
            <Allergies allergies={p.allergies || []} inputRef={fieldRefs.allergies} onChange={(allergies) => onPatient({ allergies })} />
          </div>
          <div className="emr-pt-line emr-pt-flags">
            <span className="emr-pt-field">
              <span className="emr-k">특이</span>
              {mdr1Remark ? (
                <span className="emr-cell" data-tone="warn">
                  <span className="emr-cell-k">MDR1</span>
                  {mdr1Select}
                </span>
              ) : <span>{p.remarks || '없음'}</span>}
            </span>
            {dog && !mdr1Remark ? (
              <span className="emr-pt-field">
                <span className="emr-k">MDR1</span>
                {mdr1Select}
              </span>
            ) : null}
            {allergyLabels.map((a) => (
              <span key={a} className="emr-cell" data-tone="danger"><span className="emr-cell-k">알레르기</span><span className="emr-cell-v">{a}</span></span>
            ))}
            {chronic.map((d) => (
              <span key={d.code} className="emr-cell" data-tone="info"><span className="emr-cell-k">만성</span><span className="emr-cell-v">{d.display}</span></span>
            ))}
          </div>
        </div>
        <div className="emr-pt-side">
          <span className="emr-cell emr-ins" data-tone={insured ? 'ok' : undefined}>
            <span className="emr-cell-k">보험</span>
            <span className="emr-cell-v">{info?.insurance?.plan || '정보 없음'}</span>
          </span>
          {rec ? (
            <span className="emr-visitinfo emr-num">접수 {rec.time} · {rec.room} · {SPECIES_KO[p.species] ?? ''} 재진</span>
          ) : null}
        </div>
      </div>
      {info ? (
        <div className="emr-vitals" aria-label="활력징후">
          <span className="emr-cc" title={info.complaint}><span className="emr-k">주호소</span>{info.complaint}</span>
          <span className="emr-vitals-row">
            <Vital label="체온" value={v.temp.toFixed(1)} unit="°C" flag={vitalFlag(p.species, 'temp', v.temp)} />
            <Vital label="심박" value={v.hr} unit="bpm" flag={vitalFlag(p.species, 'hr', v.hr)} />
            <Vital label="호흡" value={v.rr} unit="/분" flag={vitalFlag(p.species, 'rr', v.rr)} />
            <Vital label="BCS" value={`${v.bcs}/9`} />
            <span className="emr-vital"><span className="emr-k">체중 추이</span><Sparkline values={info.weights} /></span>
          </span>
        </div>
      ) : null}
    </section>
  )
}

export default PatientHeader
