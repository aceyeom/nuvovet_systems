/**
 * 대기목록 (EMR popup spec §2.2): search by name or number, tabs 대기 | 진료중 | 수납, one link
 * per fictional visit. ≥ 1280 px a 220 px column; 1024–1279 a 48 px rail that opens the list over
 * the chart; < 1024 the list opens from the title bar's "대기목록" button.
 */

import { useState } from 'react'
import { ListOrdered } from 'lucide-react'
import { SPECIES_KO } from './calc.js'

/** Fictional reception times for the demo visits. */
const TIMES = { V1: '09:10', V2: '09:25', V3: '09:40', V4: '10:05', V5: '10:20', V6: '10:45', V7: '11:00', V8: '11:30', V9: '13:40', V10: '14:05' }

const TABS = [
  { key: 'wait', label: '대기' },
  { key: 'active', label: '진료중' },
  { key: 'pay', label: '수납' },
]

/** ←/→ (and Home/End) move between tabs and focus the new one (WAI-ARIA tabs pattern). */
export function tabKeys(e, keys, current, set) {
  const i = keys.indexOf(current)
  let n = -1
  if (e.key === 'ArrowRight') n = (i + 1) % keys.length
  else if (e.key === 'ArrowLeft') n = (i - 1 + keys.length) % keys.length
  else if (e.key === 'Home') n = 0
  else if (e.key === 'End') n = keys.length - 1
  if (n < 0) return
  e.preventDefault()
  set(keys[n])
  const tabs = e.currentTarget.querySelectorAll('[role="tab"]')
  tabs[n]?.focus()
}

export function WaitList({ visits, currentId, hrefFor, open, onClose, onNavigate }) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('wait')
  const query = q.trim()
  const entries = visits
    .map((v) => ({ id: v.id, time: TIMES[v.id] ?? '', name: v.patient.name, no: v.patient.id, species: SPECIES_KO[v.patient.species] ?? '', active: v.id === currentId }))
    .filter((e) => (tab === 'active' ? e.active : tab === 'pay' ? false : true))
    .filter((e) => !query || e.name.includes(query) || e.no.includes(query.replace(/^#/, '')))

  return (
    <nav className="emr-wait" aria-label="대기목록" data-open={open || undefined}>
      <div className="emr-wait-head">
        <span>대기목록</span>
        <button type="button" className="emr-btn emr-btn-sm emr-wait-close" onClick={onClose}>닫기</button>
      </div>
      <div className="emr-wait-search">
        <input className="emr-input" type="search" aria-label="대기목록 검색: 이름 또는 번호" placeholder="이름·번호" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="emr-tabs" role="tablist" aria-label="대기 상태" onKeyDown={(e) => tabKeys(e, TABS.map((t) => t.key), tab, setTab)}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            className="emr-tab"
            aria-selected={tab === t.key}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ul className="emr-wait-list" role="tabpanel" aria-label={TABS.find((t) => t.key === tab).label}>
        {entries.length === 0 ? (
          <li className="emr-wait-empty">{tab === 'pay' ? '수납 대기 환자가 없습니다' : '검색 결과가 없습니다'}</li>
        ) : entries.map((e) => (
          <li key={e.id}>
            <a className="emr-wait-item" href={hrefFor(e.id)} aria-current={e.active ? 'page' : undefined} onClick={onNavigate}>
              <span className="emr-num">{e.time}</span>
              <span className="emr-wait-name">{e.name} <span className="emr-muted">{e.species}</span></span>
              <span className="emr-wait-status">{e.active ? '진료중' : '대기'}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** 48 px rail (1024–1279 px): opens the list over the chart. */
export function WaitRail({ onOpen, open }) {
  return (
    <div className="emr-wait-rail">
      <button type="button" className="emr-btn" aria-label="대기목록 열기" aria-expanded={open} onClick={onOpen} title="대기목록">
        <ListOrdered aria-hidden="true" strokeWidth={1.75} />
      </button>
    </div>
  )
}

export default WaitList
