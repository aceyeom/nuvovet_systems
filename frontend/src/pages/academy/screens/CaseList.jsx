import React, { useState } from 'react';
import { CASES } from '../data';
import { I } from '../icons';

const TRACKS = [
  { id: 'all', ko: '전체', en: 'All' },
  { id: 'A',   ko: 'Track A — 처방 안전성',       en: 'Track A — Prescription Safety' },
  { id: 'B',   ko: 'Track B — 진단-처방 적합성',   en: 'Track B — Diagnosis Alignment' },
  { id: 'C',   ko: 'Track C — 시술 적합성',        en: 'Track C — Procedure Fit' },
];

const STATUS_LABEL = {
  completed:   { text: '완료',    badge: 'badge-success' },
  in_progress: { text: '진행 중', badge: 'badge-accent' },
  locked:      { text: '잠금',    badge: '' },
};

function DifficultyDots({ n }) {
  return (
    <div className="diff-dots">
      {[1,2,3,4,5].map(i => (
        <div
          key={i}
          className={`diff-dot ${i <= n ? (n >= 4 ? 'filled-hard' : n >= 3 ? 'filled-warn' : 'filled') : ''}`}
        />
      ))}
    </div>
  );
}

function CaseCard({ c, onPlay }) {
  const statusInfo = STATUS_LABEL[c.status] || {};
  const accentColor = c.track === 'A' ? '#C46B0A' : c.track === 'B' ? '#0E7F6A' : '#1B4FBF';

  return (
    <div
      className={`case-card ${c.status === 'locked' ? 'locked' : ''} ${c.status === 'completed' ? 'completed' : ''}`}
      onClick={() => c.status !== 'locked' && onPlay(c)}
    >
      <div className="case-accent-bar" style={{ background: accentColor }} />

      <div className="case-meta">
        <span className="badge badge-accent" style={{ background: `${accentColor}18`, color: accentColor, borderColor: 'transparent' }}>
          {c.id}
        </span>
        <DifficultyDots n={c.difficulty} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <I.Clock size={11} /> ~{c.estMin}분
        </span>
        <span style={{ marginLeft: 'auto' }}>
          {c.status === 'locked' ? (
            <I.Lock size={14} style={{ color: 'var(--text-faint)' }} />
          ) : c.status === 'completed' ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
              <I.CheckCircle size={14} /> {c.score}점
            </span>
          ) : (
            <span style={{ fontSize: 11, color: accentColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <I.Play size={11} /> 진행 중
            </span>
          )}
        </span>
      </div>

      <div className="case-title">{c.title}</div>
      <div className="case-desc">{c.desc}</div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {c.competencies.map(comp => (
          <span key={comp} className="badge badge-indigo">{comp}</span>
        ))}
        {c.status !== 'locked' && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: accentColor, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            {c.status === 'completed' ? '다시 풀기' : c.status === 'in_progress' ? '이어서 풀기' : '시작하기'}
            <I.ChevronRight size={13} />
          </span>
        )}
      </div>
    </div>
  );
}

export default function CaseList({ onPlayCase }) {
  const [activeTrack, setActiveTrack] = useState('all');
  const [diffFilter, setDiffFilter] = useState(0);

  const filtered = CASES.filter(c => {
    if (activeTrack !== 'all' && c.track !== activeTrack) return false;
    if (diffFilter > 0 && c.difficulty !== diffFilter) return false;
    return true;
  });

  const completedCount = CASES.filter(c => c.status === 'completed').length;
  const inProgressCount = CASES.filter(c => c.status === 'in_progress').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title-en">Case Library</div>
          <h1 className="page-title">케이스 라이브러리</h1>
          <p className="page-subtitle">
            완료 {completedCount}개 · 진행 중 {inProgressCount}개 · 전체 {CASES.length}개
          </p>
        </div>
        <div className="page-header-actions">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1.6 }}>
            <div>케이스 1~3: 매우 쉬움 (10분)</div>
            <div>케이스 4~7: 표준 (18-22분)</div>
            <div>케이스 8+: 도전적 (28-32분)</div>
          </div>
        </div>
      </div>

      {/* Track tabs */}
      <div className="tabs">
        {TRACKS.map(t => {
          const count = t.id === 'all' ? CASES.length : CASES.filter(c => c.track === t.id).length;
          return (
            <button
              key={t.id}
              className={`tab ${activeTrack === t.id ? 'active' : ''}`}
              onClick={() => setActiveTrack(t.id)}
            >
              {t.ko} <span className="count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>난이도:</span>
        {[0,1,2,3,4,5].map(d => (
          <button
            key={d}
            className={`btn btn-sm btn-secondary ${diffFilter === d ? 'btn-primary' : ''}`}
            onClick={() => setDiffFilter(d)}
            style={diffFilter === d ? { background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' } : {}}
          >
            {d === 0 ? '전체' : `${'★'.repeat(d)}`}
          </button>
        ))}
        <div className="spacer" />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length}개 결과</span>
      </div>

      {/* Track info banner */}
      {activeTrack !== 'all' && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--bg-accent-soft)',
          border: '1px solid rgba(196,107,10,0.2)',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 13,
          color: '#92400E',
          lineHeight: 1.6,
        }}>
          {activeTrack === 'A' && (
            <>
              <strong>Track A — 처방 안전성:</strong> 한국 임상에서 빈발하는 질환의 1차 처방 결정, 약물 상호작용, 용량 안전성을 훈련합니다.
              총 60개 케이스 (초급 20 + 중급 25 + 고급 15).
            </>
          )}
          {activeTrack === 'B' && (
            <>
              <strong>Track B — 진단-처방 적합성:</strong> 검사 결과 해석과 진단에 맞는 처방 근거를 훈련합니다.
              총 55개 케이스. 각 케이스는 가설 생성 및 검증 역량을 집중적으로 평가합니다.
            </>
          )}
          {activeTrack === 'C' && (
            <>
              <strong>Track C — 시술 적합성:</strong> 마취 전처치, 시술 프로토콜, 사후 처방의 적절성을 훈련합니다.
              총 50개 케이스.
            </>
          )}
        </div>
      )}

      {/* Case grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            조건에 맞는 케이스가 없습니다.
          </div>
        ) : (
          filtered.map(c => (
            <CaseCard key={c.id} c={c} onPlay={onPlayCase} />
          ))
        )}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 32, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[
          { color: '#C46B0A', label: 'Track A — 처방 안전성' },
          { color: '#0E7F6A', label: 'Track B — 진단-처방 적합성' },
          { color: '#1B4FBF', label: 'Track C — 시술 적합성' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
