import React, { useState, useEffect } from 'react';
import { I } from '../icons';
import { anomalies as initialAnomalies, fmtKRW } from '../data';

export default function AnomalyDetection() {
  const [tab, setTab] = useState('queue');
  const [queue, setQueue] = useState(initialAnomalies);
  const [reviewing, setReviewing] = useState([]);
  const [assigned, setAssigned] = useState({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleReview = (id) => {
    const item = queue.find(a => a.id === id);
    if (!item) return;
    setQueue(q => q.filter(a => a.id !== id));
    setReviewing(r => [item, ...r]);
    setTab('progress');
  };

  const handleSkip = (id) => {
    setQueue(q => q.filter(a => a.id !== id));
    setToast('항목을 건너뛰었습니다.');
  };

  const handleAssign = (id) => {
    setAssigned(a => ({ ...a, [id]: '이지훈 부장' }));
    setToast(`${id} — 이지훈 부장에게 할당되었습니다.`);
  };

  const handleDone = (id) => {
    setReviewing(r => r.filter(a => a.id !== id));
    setToast('검토가 완료되었습니다.');
    if (reviewing.length <= 1) setTab('queue');
  };

  const SevDot = ({ s }) => {
    const color = s === 'critical' ? 'var(--critical)' : s === 'warning' ? 'var(--warning)' : 'var(--info)';
    const label = s === 'critical' ? '심각' : s === 'warning' ? '경고' : '정보';
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>
        <span className="dot" style={{ background: color, width: 8, height: 8 }} />{label}
      </span>
    );
  };

  const AnomalyCard = ({ a, isReviewing = false }) => {
    const sevColor = a.sev === 'critical' ? 'var(--critical)' : a.sev === 'warning' ? 'var(--warning)' : 'var(--info)';
    return (
      <div className="card" style={{ padding: 18, borderLeft: '3px solid ' + sevColor, transition: 'box-shadow 0.12s' }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <SevDot s={a.sev} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <I.Clock size={11} />{a.elapsed} 발생
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{a.id}</span>
          <span style={{ color: 'var(--text-faint)' }}>·</span>
          <span className="mono tnum" style={{ fontSize: 14, fontWeight: 600 }}>{fmtKRW(a.amt)}</span>
          <span style={{ color: 'var(--text-faint)' }}>·</span>
          <span style={{ fontSize: 13, color: 'var(--text-body)' }}>{a.hospital}</span>
          {assigned[a.id] && (
            <span className="badge" style={{ marginLeft: 4 }}><I.Users size={10} style={{ marginRight: 3 }} />{assigned[a.id]}</span>
          )}
        </div>
        <div style={{ marginBottom: 12 }}>
          {a.flags.map((f, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <span style={{ color: 'var(--text-muted)' }}>└</span> {f}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isReviewing ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => handleDone(a.id)}>검토 완료 ✓</button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleSkip(a.id)}>건너뛰기</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => handleReview(a.id)}>검토 시작 →</button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleAssign(a.id)}>할당</button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleSkip(a.id)}>건너뛰기</button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#0A0A0A', color: '#fff', borderRadius: 8,
          padding: '10px 18px', fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">이상치 탐지</h1>
          <p className="page-subtitle">검토 대기 중 · 우선순위 정렬됨</p>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">검토 대기</div>
          <div className="stat-value tnum" style={{ color: 'var(--critical)' }}>{queue.length}<span style={{ fontSize: 18, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 4 }}>건</span></div>
          <div className="stat-delta"><span style={{ color: 'var(--text-secondary)' }}>+18 vs 어제</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">오늘 검토 완료</div>
          <div className="stat-value tnum">47<span style={{ fontSize: 18, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 4 }}>건</span></div>
          <div className="stat-delta positive"><I.CheckCircle size={12} /><span>목표 50건 중 94%</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">평균 검토 시간</div>
          <div className="stat-value tnum">4<span style={{ fontSize: 18, fontWeight: 500 }}>분 </span>12<span style={{ fontSize: 18, fontWeight: 500 }}>초</span></div>
          <div className="stat-delta positive"><I.ArrowDown size={12} /><span>-32초 vs 지난주</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">절감 식별 (오늘)</div>
          <div className="stat-value tnum">₩18.4M</div>
          <div className="stat-delta positive"><I.ArrowUp size={12} /><span>+24% vs 어제</span></div>
        </div>
      </div>

      <div className="tabs">
        <button className={'tab' + (tab === 'queue' ? ' active' : '')} onClick={() => setTab('queue')}>
          검토 대기 <span className="count">{queue.length}</span>
        </button>
        <button className={'tab' + (tab === 'progress' ? ' active' : '')} onClick={() => setTab('progress')}>
          검토 중 <span className="count">{reviewing.length}</span>
        </button>
        <button className={'tab' + (tab === 'done' ? ' active' : '')} onClick={() => setTab('done')}>
          완료 <span className="count">지난 7일: 1,247</span>
        </button>
      </div>

      <div className="filter-bar" style={{ marginTop: -8 }}>
        <button className="chip"><span className="chip-label">정렬:</span><span>우선순위</span><I.ChevronDown size={12} /></button>
        <button className="chip"><span className="chip-label">심각도:</span><span>모두</span><I.ChevronDown size={12} /></button>
        <button className="chip"><span className="chip-label">병원:</span><span>모두</span><I.ChevronDown size={12} /></button>
        <button className="chip"><span className="chip-label">날짜:</span><span>오늘</span><I.ChevronDown size={12} /></button>
      </div>

      {tab === 'done' && (
        <div style={{ padding: '64px 16px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <div style={{ width: 48, height: 48, margin: '0 auto 16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <I.CheckCircle size={48} stroke={1} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>오늘 처리할 항목이 없습니다.</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>훌륭합니다. 모든 우선순위 항목이 검토되었습니다.</p>
        </div>
      )}

      {tab === 'queue' && (
        queue.length === 0 ? (
          <div style={{ padding: '64px 16px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ width: 48, height: 48, margin: '0 auto 16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I.CheckCircle size={48} stroke={1} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>대기 중인 항목이 없습니다.</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>모든 항목이 검토되었거나 건너뛰어졌습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {queue.map(a => <AnomalyCard key={a.id} a={a} />)}
          </div>
        )
      )}

      {tab === 'progress' && (
        reviewing.length === 0 ? (
          <div style={{ padding: '64px 16px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>검토 중인 항목이 없습니다. 검토 대기 탭에서 항목을 시작하세요.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reviewing.map(a => <AnomalyCard key={a.id} a={a} isReviewing />)}
          </div>
        )
      )}
    </div>
  );
}
