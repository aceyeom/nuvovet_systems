/**
 * 대기목록 (EMR popup spec §2.2): search by name or number, tabs 대기 | 진료중 | 수납, one link
 * per fictional visit. ≥ 1280 px a 220 px column; 1024–1279 a 48 px rail that opens the list over
 * the chart; < 1024 the list opens from the title bar's "대기목록" button.
 */

import { useState } from 'react'
import { ListOrdered } from 'lucide-react'
import { PetAvatar } from '@/brand/PetAvatar'
import { SPECIES_KO } from './calc.js'
import { RECEPTION, RECEPTION_STATE } from './clinical.js'

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
    .map((v) => {
      const r = RECEPTION[v.id] || {}
      const active = v.id === currentId
      const state = active ? 'active' : r.state === 'active' ? 'waiting' : r.state || 'waiting'
      return {
        id: v.id, time: r.time ?? '', name: v.patient.name, no: v.patient.id, speciesCode: v.patient.species,
        species: SPECIES_KO[v.patient.species] ?? '', breed: String(v.patient.breed || '').split('/').pop(),
        reason: r.reason || '', wait: r.wait || 0, active, state,
      }
    })
    .filter((e) => (tab === 'active' ? e.active : tab === 'pay' ? e.state === 'billing' : true))
    .filter((e) => !query || e.name.includes(query) || e.no.includes(query.replace(/^#/, '')))

  return (
    <nav className="emr-wait" aria-label="대기목록" data-open={open || undefined}>
      <div className="emr-wait-head">
        <span>대기목록</span>
        <span className="emr-wait-count emr-num">{visits.length}명</span>
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
            <a className="emr-wait-item" href={hrefFor(e.id)} aria-current={e.active ? 'page' : undefined} onClick={onNavigate} data-state={e.state}>
              <PetAvatar id={e.no} species={e.speciesCode} size={34} alt="" className="emr-wait-photo" />
              <span className="emr-wait-main">
                <span className="emr-wait-name" data-truncate="" title={`${e.name} · ${e.species} · ${e.breed}`}>{e.name} <span className="emr-muted">{e.species} · {e.breed}</span></span>
                <span className="emr-wait-reason" data-truncate="" title={e.reason}>{e.reason}</span>
              </span>
              <span className="emr-wait-meta">
                <span className="emr-num">{e.time}</span>
                <span className="emr-wait-status">{RECEPTION_STATE[e.state] ?? '대기'}{e.state === 'waiting' && e.wait ? <span className="emr-num"> {e.wait}분</span> : null}</span>
              </span>
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
