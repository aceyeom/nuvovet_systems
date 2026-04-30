import React, { useState } from 'react';
import { I } from '../icons';
import { TrendCompare, PriceRange } from '../charts';
import { hospitals, claimList, fmtKRW, fmtKRWShort } from '../data';

export default function HospitalBenchmarks() {
  const [selected, setSelected] = useState(null);

  const RiskScore = ({ score }) => {
    const color = score >= 60 ? 'var(--critical)' : score >= 40 ? 'var(--warning)' : 'var(--accent)';
    return <span className="mono tnum" style={{ color, fontWeight: 700, fontSize: 16 }}>{score}</span>;
  };

  const PeerCell = ({ peer }) => {
    const color = peer >= 30 ? 'var(--critical)' : peer >= 10 ? 'var(--warning)' : peer <= -5 ? 'var(--accent)' : 'var(--text-secondary)';
    const arrow = peer > 5 ? '↑' : peer < -5 ? '↓' : '';
    return <span className="mono tnum" style={{ color, fontWeight: 600 }}>{peer > 0 ? '+' : ''}{peer}% {arrow}</span>;
  };

  const FlagBar = ({ flag }) => {
    const color = flag >= 12 ? 'var(--critical)' : flag >= 7 ? 'var(--warning)' : 'var(--accent)';
    return (
      <div style={{ minWidth: 80 }}>
        <div className="mono tnum" style={{ fontWeight: 600, color: 'var(--text-body)' }}>{flag.toFixed(1)}%</div>
        <div className="mini-progress"><div style={{ width: Math.min(flag * 5, 100) + '%', background: color }} /></div>
      </div>
    );
  };

  const sel = selected ? hospitals.find(h => h.id === selected) : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">병원 벤치마크</h1>
          <p className="page-subtitle">4,287개 병원 분석 · 90일 누적 데이터 기준</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary"><I.Download size={14} />CSV 내보내기</button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">분석 대상 병원</div>
          <div className="stat-value tnum">4,287</div>
          <div className="stat-delta positive"><I.ArrowUp size={12} /><span>+143 vs 지난 분기</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">위험 등급 병원 수</div>
          <div className="stat-value tnum" style={{ color: 'var(--critical)' }}>127</div>
          <div className="stat-delta"><span style={{ color: 'var(--text-secondary)' }}>상위 3% (Tier 1)</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">식별된 이상 패턴</div>
          <div className="stat-value tnum">2,184<span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>건</span></div>
          <div className="stat-delta"><span style={{ color: 'var(--text-secondary)' }}>47개 병원에 집중</span></div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <I.Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="병원명, 지역, EMR 검색…" />
        </div>
        <button className="chip"><span className="chip-label">지역:</span><span>모두</span><I.ChevronDown size={12} /></button>
        <button className="chip"><span className="chip-label">규모:</span><span>모두</span><I.ChevronDown size={12} /></button>
        <button className="chip"><span className="chip-label">EMR:</span><span>모두</span><I.ChevronDown size={12} /></button>
        <button className="chip"><span className="chip-label">위험 등급:</span><span>모두</span><I.ChevronDown size={12} /></button>
        <span className="spacer" />
        <button className="chip"><span className="chip-label">정렬:</span><span>청구액 높은 순</span><I.ChevronDown size={12} /></button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>병원명</th>
              <th>지역</th>
              <th>규모</th>
              <th>EMR</th>
              <th className="right">청구건수 (90d)</th>
              <th className="right">평균 청구액</th>
              <th className="right">동급 대비</th>
              <th>플래그율</th>
              <th className="right">위험 점수</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {hospitals.map(h => (
              <tr key={h.id} onClick={() => setSelected(h.id)} className={selected === h.id ? 'selected' : ''}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 24, height: 24, background: 'var(--bg-canvas)', borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><I.Building size={12} /></span>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{h.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{h.region}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{h.tier}</td>
                <td style={{ fontSize: 12 }}><span className="badge">{h.emr}</span></td>
                <td className="right mono tnum">{h.vol}</td>
                <td className="right mono tnum" style={{ fontWeight: 600 }}>{fmtKRW(h.avg)}</td>
                <td className="right"><PeerCell peer={h.peer} /></td>
                <td><FlagBar flag={h.flag} /></td>
                <td className="right"><RiskScore score={h.risk} /></td>
                <td><I.ChevronRight size={14} style={{ color: 'var(--text-muted)' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={'panel-overlay' + (sel ? ' open' : '')} onClick={() => setSelected(null)} />
      <div className={'slide-panel' + (sel ? ' open' : '')}>
        {sel && (
          <>
            <div className="slide-panel-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sel.id}</span>
                  <span className="badge">{sel.emr}</span>
                  {sel.risk >= 60 && <span className="badge badge-critical">TIER 1 위험</span>}
                </div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{sel.name}</h2>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{sel.region} · {sel.tier}</div>
              </div>
              <button className="icon-btn" onClick={() => setSelected(null)}><I.X size={16} /></button>
            </div>
            <div className="slide-panel-body">
              <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <button className="btn btn-secondary btn-sm">청구 내역 보기</button>
                <button className="btn btn-secondary btn-sm">보고서 생성</button>
                <button className="btn btn-secondary btn-sm"><I.Pin size={12} />워치리스트</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  ['누적 청구액', fmtKRWShort(sel.avg * sel.vol)],
                  ['청구 건수', sel.vol.toLocaleString()],
                  ['평균 청구액', fmtKRWShort(sel.avg)],
                  ['플래그율', sel.flag.toFixed(1) + '%'],
                ].map(([k, v], i) => (
                  <div key={i} style={{ padding: 12, background: 'var(--bg-canvas)', borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k}</div>
                    <div className="mono tnum" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 className="section-title">주간 청구 건수 추이 <span className="section-title-en">/ Weekly volume</span></h3>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 2, background: '#0F766E' }} />이 병원</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 2, background: '#A3A3A3', borderTop: '1px dashed' }} />동급 평균</span>
                  </div>
                </div>
                <TrendCompare
                  a={[28, 32, 41, 38, 47, 52, 58, 56, 49, 54, 61, 58, 53]}
                  b={[18, 19, 20, 22, 21, 22, 23, 22, 21, 23, 24, 24, 23]}
                  labels={['W14','W15','W16','W17','W18','W19','W20','W21','W22','W23','W24','W25','W26']}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 className="section-title" style={{ marginBottom: 12 }}>시술 구성 <span className="section-title-en">/ Procedure mix · 상위 8</span></h3>
                {[
                  { p: 'MRI 전신 (P-3201)', count: 38, peer: 340 },
                  { p: 'CT 복부 (P-3104)', count: 52, peer: 184 },
                  { p: '혈액검사 패키지 (L-2104)', count: 124, peer: 22 },
                  { p: '진료상담 1차 (C-1010)', count: 482, peer: -2 },
                  { p: '초음파 복부 (P-3052)', count: 68, peer: 41 },
                  { p: '입원 1일 (C-7001)', count: 94, peer: 18 },
                  { p: 'X-ray 흉부 (P-3001)', count: 142, peer: 8 },
                  { p: '처치료 (C-5012)', count: 386, peer: 4 },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, fontSize: 12 }}>{row.p}</div>
                    <div className="mono tnum" style={{ fontSize: 12, fontWeight: 600, minWidth: 40, textAlign: 'right' }}>{row.count}건</div>
                    <div className="mono tnum" style={{ fontSize: 11, minWidth: 90, textAlign: 'right', color: row.peer > 30 ? 'var(--critical)' : row.peer > 10 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {row.peer > 0 ? '+' : ''}{row.peer}% vs 동급
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 className="section-title" style={{ marginBottom: 12 }}>주요 시술 가격 위치 <span className="section-title-en">/ Price position</span></h3>
                {[
                  { p: 'MRI 전신', med: 1250, p25: 580, p50: 780, p75: 920, p95: 980 },
                  { p: 'CT 복부', med: 920, p25: 460, p50: 620, p75: 760, p95: 820 },
                  { p: '혈액 패키지', med: 198, p25: 158, p50: 178, p75: 198, p95: 220 },
                  { p: '초음파', med: 142, p25: 92, p50: 118, p75: 142, p95: 168 },
                  { p: '입원 1일', med: 94, p25: 72, p50: 84, p75: 96, p95: 110 },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12 }}>{r.p}</div>
                    <PriceRange p25={r.p25} p50={r.p50} p75={r.p75} p95={r.p95} marker={r.med} markerColor={r.med > r.p95 ? 'var(--critical)' : 'var(--accent)'} />
                    <div className="mono tnum" style={{ fontSize: 11, color: r.med > r.p95 ? 'var(--critical)' : 'var(--text-secondary)', textAlign: 'right', fontWeight: 600 }}>₩{r.med}K</div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="section-title" style={{ marginBottom: 12 }}>최근 플래그된 청구 <span className="section-title-en">/ Recent flagged claims</span></h3>
                {claimList.filter(c => c.status === 'flagged').slice(0, 5).map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-canvas)', borderRadius: 6, marginBottom: 6, fontSize: 12 }}>
                    <span className="mono">{c.id}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c.date}</span>
                    <span className="mono tnum" style={{ marginLeft: 'auto', fontWeight: 600 }}>{fmtKRW(c.amount)}</span>
                    <span className="badge badge-critical">{c.score}</span>
                    <I.ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
