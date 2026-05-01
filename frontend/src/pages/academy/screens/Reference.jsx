import React, { useState } from 'react';
import { DRUGS } from '../data';
import { I } from '../icons';

const CLASSES = ['전체', '코르티코스테로이드', '베타-락탐 항생제', 'ACE 억제제', '루프 이뇨제', '지속형 인슐린'];
const SPECIES_FILTER = ['전체', '개', '고양이'];

const LEVEL_BADGE = {
  '1차':  { cls: 'badge-success', label: '1차' },
  '2차':  { cls: 'badge-info',    label: '2차' },
  '응급':  { cls: 'badge-critical', label: '응급' },
};

function DrugDetail({ drug, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    }}>
      {/* Overlay */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.2)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div style={{
        position: 'relative', zIndex: 201,
        width: 520, height: '100vh',
        background: 'white',
        borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s cubic-bezier(0.32,0.72,0,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: 4 }}>
              {drug.class}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {drug.nameKo}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {drug.nameEn}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', background: 'var(--bg-card)',
            }}
          >
            <I.X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Brand names */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
              한국 브랜드명 / Korean Brand Names
            </div>
            <div style={{
              padding: '10px 14px', background: 'var(--bg-accent-soft)',
              border: '1px solid rgba(196,107,10,0.2)', borderRadius: 8,
              fontSize: 13, fontWeight: 600, color: 'var(--accent)',
            }}>
              {drug.brandKo}
            </div>
          </div>

          {/* Species */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
              적용 종 / Species
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {drug.species.map(s => (
                <span key={s} className="badge badge-info">{s}</span>
              ))}
            </div>
          </div>

          {/* Dosing table */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
              용량 / Dosing
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {drug.doses.map((d, i) => (
                <div key={i} style={{
                  padding: '12px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 8, background: 'var(--bg-card)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{d.indication}</div>
                    <span className={`badge ${LEVEL_BADGE[d.level]?.cls || ''}`}>
                      {LEVEL_BADGE[d.level]?.label || d.level}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {d.dose}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.species}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical notes */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
              임상 노트 / Clinical Notes
            </div>
            <div style={{
              padding: '12px 14px',
              background: '#FFF7ED', border: '1px solid rgba(196,107,10,0.2)',
              borderRadius: 8, fontSize: 13, color: '#92400E', lineHeight: 1.7,
            }}>
              <I.AlertTriangle size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              {drug.notes}
            </div>
          </div>

          {/* Guideline */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
              출처 가이드라인 / Source Guideline
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--info)', fontWeight: 500 }}>
              <I.ExternalLink size={14} />
              {drug.guideline}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

export default function Reference() {
  const [search, setSearch]     = useState('');
  const [classFilter, setClass] = useState('전체');
  const [speciesFilter, setSpecies] = useState('전체');
  const [selected, setSelected] = useState(null);

  const filtered = DRUGS.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || d.nameKo.includes(q)
      || d.nameEn.toLowerCase().includes(q)
      || d.brandKo.includes(q)
      || d.class.includes(q);
    const matchClass   = classFilter === '전체' || d.class === classFilter;
    const matchSpecies = speciesFilter === '전체' || d.species.includes(speciesFilter);
    return matchSearch && matchClass && matchSpecies;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title-en">Drug &amp; Procedure Reference</div>
          <h1 className="page-title">약물·시술 사전</h1>
          <p className="page-subtitle">
            한국 브랜드명 매핑 · AAHA / WSAVA / ISCAID 가이드라인 인용 · {DRUGS.length}개 약물
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="filter-bar" style={{ marginBottom: 20, gap: 10 }}>
        <div className="search-input" style={{ width: 320 }}>
          <I.Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="약물명, 브랜드명, 적응증 검색…"
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}>
              <I.X size={13} />
            </button>
          )}
        </div>

        <div className="divider" style={{ height: 24, width: 1, margin: '0 4px' }} />

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SPECIES_FILTER.map(s => (
            <button
              key={s}
              className={`btn btn-sm ${speciesFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              style={speciesFilter === s ? { background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' } : {}}
              onClick={() => setSpecies(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="spacer" />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length}개</span>
      </div>

      {/* Class tabs */}
      <div className="tabs">
        {CLASSES.map(c => (
          <button
            key={c}
            className={`tab ${classFilter === c ? 'active' : ''}`}
            onClick={() => setClass(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Drug grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <I.Search size={32} style={{ marginBottom: 8 }} />
          <div>검색 결과가 없습니다.</div>
        </div>
      ) : (
        <div className="grid-3" style={{ gap: 12 }}>
          {filtered.map(drug => (
            <div
              key={drug.id}
              className="drug-card"
              onClick={() => setSelected(drug)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div className="drug-class">{drug.class}</div>
                  <div className="drug-name">{drug.nameKo}</div>
                  <div className="drug-brand">{drug.nameEn}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  {drug.species.map(s => (
                    <span key={s} className="badge" style={{ fontSize: 10 }}>{s}</span>
                  ))}
                </div>
              </div>

              <div style={{
                padding: '6px 10px',
                background: 'var(--bg-accent-soft)',
                border: '1px solid rgba(196,107,10,0.15)',
                borderRadius: 6, fontSize: 11, fontWeight: 600, color: 'var(--accent)',
                marginBottom: 10,
              }}>
                {drug.brandKo}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {drug.doses.slice(0, 2).map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.indication}
                    </span>
                    <span className={`badge ${LEVEL_BADGE[d.level]?.cls || ''}`} style={{ fontSize: 10, flexShrink: 0 }}>
                      {d.level}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                <I.ExternalLink size={11} />
                {drug.guideline.split(' ').slice(0, 3).join(' ')}…
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Guideline disclaimer */}
      <div style={{
        marginTop: 32, padding: '12px 16px',
        background: 'var(--bg-muted-soft)', border: '1px solid var(--border)',
        borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>면책 고지:</strong>{' '}
        이 사전은 교육 목적으로 제공됩니다. 실제 임상 처방은 환자 개별 상태와 최신 가이드라인을 기반으로
        반드시 수의사의 전문적 판단 하에 이루어져야 합니다.
        가이드라인 출처는 WSAVA, AAHA, ISCAID, ACVIM, ISFM입니다.
      </div>

      {selected && <DrugDetail drug={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
