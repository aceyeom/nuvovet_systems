/**
 * Chart tabs [S][O][A][P][검사결과][이력] of the fictional EMR (EMR popup spec §2.2, §2.3).
 * A shows the diagnosis chips (fictional `code + name`); a free-text diagnosis gets a `D-FREE-nn`
 * code and its typed name. 검사결과 lists labs (date, test, value, unit, reference); creatinine is
 * entered in mg/dL. Notes in S/O/P stay in this page's memory only.
 */

import { CONDITION_BY_ID } from '../../knowledge/conditions.js'
import { CONDITION_MAP } from '../conditionMap.js'
import { LAB_INFO } from './calc.js'
import { clinicalFor } from './clinical.js'
import { tabKeys } from './WaitList.jsx'

export const CHART_TABS = [
  { key: 'S', label: 'S 주관', title: '주관적 소견' },
  { key: 'O', label: 'O 객관', title: '객관적 소견' },
  { key: 'A', label: 'A 진단', title: '평가 (진단명)' },
  { key: 'P', label: 'P 계획', title: '계획' },
  { key: 'labs', label: '검사결과', title: '검사결과' },
  { key: 'history', label: '이력·백신', title: '이력' },
]

/** Earlier visits (timeline) and vaccinations, display only (clinical.js). */
function History({ visit }) {
  const info = clinicalFor(visit.id)
  if (!info) return <p className="emr-muted">이전 방문 기록 없음</p>
  return (
    <div className="emr-history" data-emr="history">
      <ol className="emr-timeline" aria-label="이전 방문">
        <li data-now="">
          <span className="emr-num">{visit.date}</span>
          <b>오늘 진료</b>
          <span className="emr-muted">{info.complaint}</span>
        </li>
        {info.history.map((h) => (
          <li key={h.date + h.title}>
            <span className="emr-num">{h.date}</span>
            <b>{h.title}</b>
            <span className="emr-muted">{h.detail}</span>
          </li>
        ))}
      </ol>
      <table className="emr-labs emr-vax" aria-label="예방접종">
        <thead><tr><th scope="col">예방접종</th><th scope="col">접종일</th><th scope="col">다음 예정</th></tr></thead>
        <tbody>
          {info.vaccines.map((x) => (
            <tr key={x.name}><td>{x.name}</td><td className="emr-num">{x.date}</td><td className="emr-num" data-overdue={/지남/.test(x.due) || undefined}>{x.due}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const DX_OPTIONS = Object.entries(CONDITION_MAP).map(([code, id]) => ({ code, display: CONDITION_BY_ID[id]?.label.ko ?? code }))

function Diagnoses({ visit, refs, onDiagnoses }) {
  const dx = visit.diagnoses || []
  const has = new Set(dx.map((d) => d.code))
  function addFree(input) {
    const name = input.value.trim()
    if (!name) return
    let n = 1
    while (has.has(`D-FREE-${String(n).padStart(2, '0')}`)) n += 1
    onDiagnoses([...dx, { code: `D-FREE-${String(n).padStart(2, '0')}`, display: name }])
    input.value = ''
  }
  return (
    <div className="emr-pt-line" data-emr="diagnoses">
      <span className="emr-k emr-muted">진단명</span>
      <span className="emr-chips">
        {dx.length === 0 ? <span className="emr-muted">입력된 진단 없음</span> : null}
        {dx.map((d) => (
          <span key={d.code} className={d.code.startsWith('D-FREE') ? 'emr-chip emr-chip-free' : 'emr-chip'}>
            <span className="emr-code">{d.code}</span> {d.display || ''}
            <button type="button" aria-label={`진단 삭제: ${d.display || d.code}`} onClick={() => onDiagnoses(dx.filter((x) => x.code !== d.code))}>×</button>
          </span>
        ))}
      </span>
      <span className="emr-dx-add">
        <select
          ref={refs.dx}
          className="emr-select"
          aria-label="진단 추가 (코드)"
          value=""
          onChange={(e) => {
            const o = DX_OPTIONS.find((x) => x.code === e.target.value)
            if (o && !has.has(o.code)) onDiagnoses([...dx, { code: o.code, display: o.display }])
          }}
        >
          <option value="">진단 추가</option>
          {DX_OPTIONS.filter((o) => !has.has(o.code)).map((o) => <option key={o.code} value={o.code}>{o.code} {o.display}</option>)}
        </select>
        <input
          className="emr-input"
          type="text"
          aria-label="자유 입력 진단"
          placeholder="자유 입력 진단"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFree(e.currentTarget) } }}
        />
      </span>
    </div>
  )
}

/** 'H' when a creatinine value is above the reference cut-off shown in the 참고 column. */
function labFlag(l, species) {
  const ref = LAB_INFO[l.code]?.ref?.[species]
  const m = /<\s*([\d.]+)/.exec(ref || '')
  return m && l.value !== '' && Number(l.value) >= Number(m[1])
}

function Labs({ visit, refs, onLabs }) {
  const labs = visit.patient.labs || []
  const species = visit.patient.species
  const set = (i, patch) => onLabs(labs.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  return (
    <div data-emr="labs">
      {labs.length ? (
        <table className="emr-labs">
          <thead>
            <tr><th scope="col">검사일</th><th scope="col">검사</th><th scope="col">결과</th><th scope="col">단위</th><th scope="col">참고</th><th scope="col" aria-label="삭제" /></tr>
          </thead>
          <tbody>
            {labs.map((l, i) => {
              const info = LAB_INFO[l.code] || { name: l.code, ref: {} }
              return (
                <tr key={`${l.code}-${i}`}>
                  <td>
                    <input className="emr-input emr-num" type="date" aria-label={`${info.name} 검사일`} value={l.date || ''} onChange={(e) => set(i, { date: e.target.value })} />
                  </td>
                  <td>{info.name}</td>
                  <td>
                    <input
                      ref={i === 0 ? refs.labs : undefined}
                      className="emr-input emr-num"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      aria-label={`${info.name} 결과`}
                      value={l.value ?? ''}
                      onChange={(e) => set(i, { value: e.target.value })}
                    />
                  </td>
                  <td>{l.unit}{labFlag(l, species) ? <span className="emr-labflag">H</span> : null}</td>
                  <td className="emr-muted">{info.ref[species] ?? ''}</td>
                  <td>
                    <button type="button" className="emr-btn emr-btn-sm" aria-label={`검사 삭제: ${info.name}`} onClick={() => onLabs(labs.filter((_, j) => j !== i))}>삭제</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : <p className="emr-muted">검사 결과 없음</p>}
      <p style={{ marginTop: 4 }}>
        <button
          type="button"
          ref={labs.length ? undefined : refs.labs}
          className="emr-btn emr-btn-sm"
          onClick={() => onLabs([...labs, { code: 'creatinine', value: '', unit: 'mg/dL', date: visit.date }])}
        >
          크레아티닌 결과 추가
        </button>
      </p>
    </div>
  )
}

export function ChartTabs({ visit, tab, onTab, refs, onDiagnoses, onLabs, onNote }) {
  const notes = { ...(clinicalFor(visit.id)?.notes || {}), ...(visit.notes || {}) }
  return (
    <section className="emr-box emr-soap" aria-label="진료 기록">
      <div className="emr-tabs" role="tablist" aria-label="진료 기록 탭" onKeyDown={(e) => tabKeys(e, CHART_TABS.map((t) => t.key), tab, onTab)}>
        {CHART_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`emr-tab-${t.key}`}
            aria-controls="emr-tabpanel"
            aria-selected={tab === t.key}
            tabIndex={tab === t.key ? 0 : -1}
            title={t.title}
            className="emr-tab"
            onClick={() => onTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="emr-soap-body" role="tabpanel" id="emr-tabpanel" aria-labelledby={`emr-tab-${tab}`}>
        {tab === 'A' ? <Diagnoses visit={visit} refs={refs} onDiagnoses={onDiagnoses} /> : null}
        {tab === 'labs' ? <Labs visit={visit} refs={refs} onLabs={onLabs} /> : null}
        {tab === 'history' ? <History visit={visit} /> : null}
        {['S', 'O', 'P'].includes(tab) ? (
          <textarea
            aria-label={CHART_TABS.find((t) => t.key === tab).title}
            value={notes[tab] ?? ''}
            onChange={(e) => onNote(tab, e.target.value)}
          />
        ) : null}
      </div>
    </section>
  )
}

export default ChartTabs
