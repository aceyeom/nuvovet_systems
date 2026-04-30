import React from 'react';
import { I } from '../icons';
import { reports } from '../data';

export default function QuarterlyReports() {
  const featured = reports[0];
  const archive = reports.slice(1);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">분기 보고서</h1>
          <p className="page-subtitle">정기 인텔리전스 리포트 · KB손해보험 펫보험팀</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary"><I.Plus size={14} />새 보고서 생성</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32, alignItems: 'flex-start' }}>
        <div style={{ position: 'sticky', top: 0 }}>
          <div style={{ marginBottom: 24 }}>
            <div className="sidebar-label" style={{ padding: 0, marginBottom: 8 }}>보고서 유형</div>
            {['정기 분기', '특별 분석', '임원 브리핑', '액추어리 데이터'].map((t, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, color: 'var(--text-body)', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked={i < 2} style={{ accentColor: 'var(--accent)' }} />
                <span>{t}</span>
              </label>
            ))}
          </div>
          <div style={{ marginBottom: 24 }}>
            <div className="sidebar-label" style={{ padding: 0, marginBottom: 8 }}>기간</div>
            <button className="chip" style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>2024.01 — 2026.04</span>
              <I.Calendar size={12} />
            </button>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div className="sidebar-label" style={{ padding: 0, marginBottom: 8 }}>작성자</div>
            <button className="chip" style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>모든 작성자</span>
              <I.ChevronDown size={12} />
            </button>
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: 32, marginBottom: 32, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 320, background: 'linear-gradient(135deg, transparent, rgba(15, 118, 110, 0.04))', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 12 }}>최신 보고서 / Latest</div>
              <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{featured.q} {featured.title}</h2>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)', maxWidth: 720, lineHeight: 1.6 }}>
                KB손해보험 펫보험 청구 데이터 정규화·검증·벤치마크 분석. 분석 기간: 2026.01.01 — 2026.03.31. 분석 청구: <span className="mono tnum">38,847</span>건 · 분석 병원: <span className="mono tnum">1,247</span>개.
              </p>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 8 }}>주요 발견</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.9, color: 'var(--text-body)' }}>
                  <li>식별된 부적합 청구액 <strong className="mono tnum">₩4.2B</strong> (전체 청구액의 6.8%)</li>
                  <li>Tier 1 위험 병원 <strong className="mono tnum">47</strong>개소 (지난 분기 대비 <span style={{ color: 'var(--critical)' }}>+12</span>)</li>
                  <li>MRI/CT 청구의 P95 초과 비율 <strong className="mono tnum">18.3%</strong></li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary"><I.FileText size={14} />전체 보고서 보기</button>
                <button className="btn btn-secondary"><I.Download size={14} />PDF 다운로드</button>
                <button className="btn btn-secondary">임원 브리핑 자료</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h3 className="section-title" style={{ fontSize: 16 }}>아카이브 <span className="section-title-en">/ Archive · {archive.length}건</span></h3>
            <button className="chip"><span className="chip-label">정렬:</span><span>최신 순</span><I.ChevronDown size={12} /></button>
          </div>

          <div className="grid-3" style={{ gap: 16 }}>
            {archive.map((r, i) => (
              <div key={i} className="card" style={{ padding: 20, transition: 'border-color 0.12s, box-shadow 0.12s', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, height: 240 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.1 }}>{r.q}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-body)', marginTop: 6, lineHeight: 1.4 }}>{r.title}</div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>분석 청구 <span className="mono tnum">{r.claims ? r.claims.toLocaleString() : '—'}</span>건 · {r.pages}페이지</span>
                  <span>생성일: <span className="mono tnum">{r.date}</span></span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {r.tags.map((t, j) => <span key={j} className="badge" style={{ fontSize: 10 }}>{t}</span>)}
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                  <button className="icon-btn" style={{ width: 28, height: 28 }}><I.Eye size={14} /></button>
                  <button className="icon-btn" style={{ width: 28, height: 28 }}><I.Download size={14} /></button>
                  <button className="icon-btn" style={{ width: 28, height: 28 }}><I.Share size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
