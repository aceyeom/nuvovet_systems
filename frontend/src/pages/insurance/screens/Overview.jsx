import React, { useState, useEffect, useRef } from 'react';
import { I } from '../icons';
import { Sparkline, StackedBarChart, HorizontalBars } from '../charts';
import { weeklyClaims, overviewSparks, alerts, topHospitals, activity } from '../data';

const DATE_RANGE_OPTIONS = [
  { value: '30', label: '최근 30일' },
  { value: '90', label: '최근 90일' },
  { value: '180', label: '최근 6개월' },
  { value: '365', label: '최근 1년' },
];

const StatCard = ({ label, value, delta, deltaTone, vs, sparkData, sparkColor }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className="stat-value tnum">{value}</div>
    <div className={'stat-delta ' + (deltaTone || '')}>
      {deltaTone === 'positive' && <I.ArrowUp size={12} />}
      {deltaTone === 'negative' && <I.ArrowDown size={12} />}
      <span>{delta}</span>
      {vs && <span className="vs">{vs}</span>}
    </div>
    <div className="stat-spark"><Sparkline data={sparkData} w={240} h={28} color={sparkColor || '#0A0A0A'} area /></div>
  </div>
);

const AlertItem = ({ a }) => {
  const Ico = a.sev === 'critical' ? I.AlertTriangle : a.sev === 'warning' ? I.AlertCircle : I.Info;
  const color = a.sev === 'critical' ? 'var(--critical)' : a.sev === 'warning' ? 'var(--warning)' : 'var(--info)';
  return (
    <button
      className="alert-item"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
        borderBottom: '1px solid var(--border)', width: '100%', textAlign: 'left',
        transition: 'background 0.12s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-canvas)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ color, marginTop: 2 }}><Ico size={16} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{a.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.sub}</div>
      </span>
      <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-body)', whiteSpace: 'nowrap' }}>{a.meta}</span>
    </button>
  );
};

export default function Overview() {
  const [dateRange, setDateRange] = useState('90');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState('');
  const dropdownRef = useRef(null);

  const selectedLabel = DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.label || '최근 90일';

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDownload = () => {
    setToast('보고서를 다운로드하는 중...');
  };

  return (
    <div className="page">
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#0A0A0A', color: '#fff', borderRadius: 8,
          padding: '10px 18px', fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <I.Download size={14} />
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">개요</h1>
          <p className="page-subtitle">KB손해보험 펫보험팀 · 2026년 4월 29일</p>
        </div>
        <div className="page-header-actions">
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button className="btn btn-secondary" onClick={() => setDropdownOpen(o => !o)}>
              <I.Calendar size={14} />{selectedLabel}<I.ChevronDown size={14} />
            </button>
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, boxShadow: 'var(--shadow-md)', overflow: 'hidden', minWidth: 140,
              }}>
                {DATE_RANGE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setDateRange(opt.value); setDropdownOpen(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '9px 14px', fontSize: 13, background: dateRange === opt.value ? 'var(--bg-canvas)' : 'transparent',
                      color: dateRange === opt.value ? 'var(--accent)' : 'var(--text-body)',
                      fontWeight: dateRange === opt.value ? 600 : 400, border: 'none', cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { if (dateRange !== opt.value) e.currentTarget.style.background = 'var(--bg-canvas)'; }}
                    onMouseLeave={(e) => { if (dateRange !== opt.value) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-secondary" onClick={handleDownload}>
            <I.Download size={14} />보고서 다운로드
          </button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="처리된 청구 건수" value="12,847" delta="+8.2% vs 지난 분기" deltaTone="positive" sparkData={overviewSparks.claims} sparkColor="#0F766E" />
        <StatCard label="평균 청구 금액" value="₩687,400" delta="+3.1% vs 지난 분기" sparkData={overviewSparks.amount} sparkColor="#666" />
        <StatCard label="플래그 발생률" value="5.4%" delta="-1.2% vs 지난 분기" deltaTone="positive" sparkData={overviewSparks.flag} sparkColor="#0F766E" />
        <StatCard label="식별된 절감 가능액" value="₩340M" delta="+18% vs 지난 분기" deltaTone="positive" sparkData={overviewSparks.saved} sparkColor="#0F766E" />
      </div>

      <div className="grid-6040" style={{ marginBottom: 24 }}>
        <div className="card card-pad-lg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h3 className="section-title">주간 청구 추이 <span className="section-title-en">/ Weekly claims</span></h3>
              <p className="section-sub">13주 누적 · 정상 vs 플래그됨</p>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="dot dot-muted" />정상</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="dot dot-critical" />플래그됨</span>
            </div>
          </div>
          <StackedBarChart data={weeklyClaims} h={240} />
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <h3 className="section-title">주의 필요한 항목 <span className="section-title-en">/ Items requiring attention</span></h3>
            </div>
            <span className="text-link" style={{ fontSize: 12 }}>모두 보기</span>
          </div>
          <div>
            {alerts.map((a, i) => <AlertItem key={i} a={a} />)}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-pad-lg">
          <div style={{ marginBottom: 16 }}>
            <h3 className="section-title">병원 청구액 분포 <span className="section-title-en">/ Top hospitals by claim volume</span></h3>
            <p className="section-sub">최근 90일 · 위험 점수에 따라 색상 표시</p>
          </div>
          <HorizontalBars data={topHospitals} valueKey="amt" labelKey="name" riskKey="risk" w={520} h={300} />
          <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 8, background: '#A3A3A3', display: 'inline-block' }} />낮음 (0-39)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 8, background: '#B45309', display: 'inline-block' }} />중간 (40-59)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 8, background: '#B91C1C', display: 'inline-block' }} />높음 (60+)</span>
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 className="section-title">최근 활동 <span className="section-title-en">/ Recent activity</span></h3>
          </div>
          <div style={{ padding: '8px 20px 20px' }}>
            {activity.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < activity.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 48, paddingTop: 2 }}>{a.t}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-body)' }}>
                  {a.text}{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>· </span>
                  <span style={{ color: 'var(--info)', cursor: 'pointer' }}>{a.link}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
