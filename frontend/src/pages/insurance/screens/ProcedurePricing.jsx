import React, { useState } from 'react';
import { I } from '../icons';
import { Histogram, RegionBars, PriceRange, TrendCompare } from '../charts';
import { procedureCategories, mriProcedures, hospitals } from '../data';

const ProcedureDetail = ({ code, onBack }) => {
  const p = mriProcedures.find(x => x.code === code) || mriProcedures[0];

  const bins = [2, 4, 8, 14, 22, 31, 42, 58, 76, 92, 108, 124, 138, 142, 138, 128, 116, 102, 88, 76, 68, 58, 50, 44, 38, 34, 30, 27, 24, 22, 20, 18, 16, 15, 14, 12, 11, 10, 9, 8, 7, 6, 6, 5, 4, 3, 3, 2, 2, 1];

  const regions = [
    { region: '서울', p25: 580, p50: 780, p75: 920, p95: 980, n: 612 },
    { region: '경기', p25: 540, p50: 720, p75: 860, p95: 940, n: 412 },
    { region: '인천', p25: 510, p50: 680, p75: 820, p95: 890, n: 184 },
    { region: '부산', p25: 490, p50: 650, p75: 790, p95: 870, n: 248 },
    { region: '대구', p25: 470, p50: 620, p75: 760, p95: 840, n: 142 },
    { region: '광주', p25: 460, p50: 600, p75: 740, p95: 820, n: 98 },
    { region: '대전', p25: 480, p50: 640, p75: 780, p95: 850, n: 84 },
    { region: '제주', p25: 520, p50: 700, p75: 840, p95: 920, n: 67 },
  ];

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <button className="text-link" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <I.ChevronLeft size={12} />시술 가격으로
        </button>
      </div>

      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>영상의학 › MRI › 전신</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <span className="mono" style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 600 }}>{p.code}</span>
            <h1 className="page-title" style={{ margin: 0 }}>{p.name}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.en}</span>
            <span className="mono badge" style={{ fontSize: 10 }}>VeNom: ven-img-mri-1.0.4-whole-body</span>
          </div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">12개월 청구 건수</div>
          <div className="stat-value tnum">{p.count.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">평균 청구액</div>
          <div className="stat-value tnum">₩784K</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">시행 병원 수</div>
          <div className="stat-value tnum">{p.hospitals}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">가격 변동 (YoY)</div>
          <div className="stat-value tnum" style={{ color: 'var(--warning)' }}>+4.2%</div>
        </div>
      </div>

      <div className="card card-pad-lg" style={{ marginBottom: 16 }}>
        <h3 className="section-title" style={{ marginBottom: 4 }}>가격 분포 히스토그램 <span className="section-title-en">/ Price distribution</span></h3>
        <p className="section-sub" style={{ marginBottom: 12 }}>서울 지역 · 12개월 누적 · n=612</p>
        <Histogram data={bins} h={220} marks={[
          { pos: 22, label: 'P25 ₩580K' },
          { pos: 42, label: 'P50 ₩780K' },
          { pos: 62, label: 'P75 ₩920K' },
          { pos: 78, label: 'P95 ₩980K' },
        ]} />
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card card-pad-lg">
          <h3 className="section-title" style={{ marginBottom: 4 }}>지역별 가격 비교 <span className="section-title-en">/ By region</span></h3>
          <p className="section-sub" style={{ marginBottom: 12 }}>P25–P95 범위 · 마커는 P50 중앙값</p>
          <RegionBars data={regions} h={240} />
        </div>
        <div className="card card-pad-lg">
          <h3 className="section-title" style={{ marginBottom: 4 }}>가격 추이 <span className="section-title-en">/ 12-month price trend</span></h3>
          <p className="section-sub" style={{ marginBottom: 12 }}>P25 / P50 / P95 월별 변화</p>
          <TrendCompare
            a={[760, 765, 768, 772, 770, 775, 778, 782, 785, 788, 790, 794]}
            b={[560, 565, 568, 570, 572, 575, 578, 580, 580, 582, 580, 582]}
            labels={['5월','6월','7월','8월','9월','10월','11월','12월','1월','2월','3월','4월']}
            h={240}
          />
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 2, background: '#0F766E' }} />P50 중앙값</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 2, background: '#A3A3A3' }} />P25</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="section-title">이 시술의 가격 이상치 병원 <span className="section-title-en">/ P95 초과 · 상위 8</span></h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>병원명</th>
              <th>지역</th>
              <th className="right">평균 청구액</th>
              <th className="right">동급 평균 대비</th>
              <th className="right">청구 건수</th>
            </tr>
          </thead>
          <tbody>
            {hospitals.filter(h => h.peer > 30).slice(0, 8).map(h => (
              <tr key={h.id}>
                <td><div style={{ fontWeight: 500 }}>{h.name}</div><div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.id}</div></td>
                <td style={{ color: 'var(--text-secondary)' }}>{h.region}</td>
                <td className="right mono tnum" style={{ fontWeight: 600, color: 'var(--critical)' }}>₩{(h.avg/1000).toFixed(0)}K</td>
                <td className="right mono tnum" style={{ color: 'var(--critical)', fontWeight: 600 }}>+{h.peer}% ↑</td>
                <td className="right mono tnum">{Math.round(h.vol * 0.08)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function ProcedurePricing() {
  const [selectedProc, setSelectedProc] = useState(null);

  if (selectedProc) return <ProcedureDetail code={selectedProc} onBack={() => setSelectedProc(null)} />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">시술 가격</h1>
          <p className="page-subtitle">4,930개 표준 시술 코드 · 12개월 누적 데이터</p>
        </div>
      </div>

      <div className="grid-3070" style={{ alignItems: 'flex-start' }}>
        <div className="card" style={{ padding: '16px 8px', position: 'sticky', top: 0 }}>
          <div className="search-input" style={{ width: 'auto', margin: '0 8px 12px' }}>
            <I.Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input placeholder="카테고리 검색…" />
          </div>
          {procedureCategories.map(c => (
            <button
              key={c.id}
              className={'nav-item' + (c.active ? ' active' : '')}
              style={{
                paddingLeft: 12 + c.level * 16,
                fontWeight: c.level === 0 ? 600 : 500,
                fontSize: c.level === 0 ? 13 : 12,
              }}
            >
              {c.level > 0 && <I.ChevronRight size={10} style={{ color: 'var(--text-muted)', transform: c.expanded ? 'rotate(90deg)' : 'none' }} />}
              <span style={{ flex: 1, textAlign: 'left' }}>{c.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{c.count}</span>
            </button>
          ))}
        </div>

        <div>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>영상의학 / MRI</h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>9개 시술 · 6,632건 청구</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mriProcedures.map(p => (
              <div key={p.code} className="card" style={{ padding: 20, cursor: 'pointer', transition: 'border-color 0.12s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                onClick={() => setSelectedProc(p.code)}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 24, alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{p.code}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.en}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>가격 분포 (서울)</div>
                    <PriceRange p25={p.p[0]} p50={p.p[1]} p75={p.p[2]} p95={p.p[3]} marker={p.p[1]} w={260} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }} className="mono tnum">
                      <span>₩{p.p[0]}K<br/><span style={{ color: 'var(--text-faint)' }}>P25</span></span>
                      <span>₩{p.p[1]}K<br/><span style={{ color: 'var(--text-faint)' }}>P50</span></span>
                      <span>₩{p.p[2]}K<br/><span style={{ color: 'var(--text-faint)' }}>P75</span></span>
                      <span>₩{p.p[3]}K<br/><span style={{ color: 'var(--text-faint)' }}>P95</span></span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>12개월</div>
                    <div className="mono tnum" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{p.count.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.hospitals}개 병원</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
