import React, { useState } from 'react';
import { I } from '../icons';
import { claimList, claimDetail, fmtKRW, fmtKRWShort } from '../data';

const FilterChip = ({ label, value, dropdown = true }) => (
  <button className="chip">
    <span className="chip-label">{label}:</span>
    <span>{value}</span>
    {dropdown && <I.ChevronDown size={12} />}
  </button>
);

const StatusDot = ({ s }) => {
  if (s === 'flagged') return <><span className="dot dot-critical" /> 플래그됨</>;
  if (s === 'review') return <><span className="dot dot-warning" /> 검토중</>;
  if (s === 'normal') return <><span className="dot dot-muted" /> 정상</>;
  return null;
};

const ScoreCell = ({ score }) => {
  const color = score >= 80 ? 'var(--accent)' : score >= 50 ? 'var(--warning)' : 'var(--critical)';
  return <span className="mono tnum" style={{ color, fontWeight: 600 }}>{score}</span>;
};

export default function ClaimValidation() {
  const [selected, setSelected] = useState('CLM-2026-04-018472');
  const c = claimDetail;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">청구 검증</h1>
          <p className="page-subtitle">12,847건 처리됨 · 지난 90일</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <I.Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="청구 ID, 병원, 환자 ID 검색…" />
        </div>
        <FilterChip label="상태" value="모두" />
        <FilterChip label="플래그 등급" value="모두" />
        <FilterChip label="병원" value="모두" />
        <FilterChip label="금액" value="모두" />
        <FilterChip label="날짜" value="최근 90일" />
        <span className="spacer" />
        <span className="text-link">필터 초기화</span>
        <button className="btn btn-primary"><I.Plus size={14} />새 검증 실행</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '40% 1fr', gap: 16, alignItems: 'flex-start' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>청구 ID</th>
                <th>일자</th>
                <th>병원</th>
                <th className="right">금액</th>
                <th className="right">점수</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {claimList.map(cl => (
                <tr key={cl.id}
                    className={selected === cl.id ? 'selected' : ''}
                    onClick={() => setSelected(cl.id)}>
                  <td><span className="mono" style={{ fontSize: 12 }}>{cl.id.replace('CLM-2026-', '…')}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{cl.date}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-body)' }}>{cl.hospital.length > 14 ? cl.hospital.slice(0, 14) + '…' : cl.hospital}</td>
                  <td className="right mono tnum">{fmtKRW(cl.amount)}</td>
                  <td className="right"><ScoreCell score={cl.score} /></td>
                  <td style={{ fontSize: 12 }}><StatusDot s={cl.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination" style={{ borderTop: '1px solid var(--border)', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>15 / 12,847건</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button>&lt; 이전</button>
              <button className="active">1</button>
              <button>2</button>
              <button>3</button>
              <span style={{ color: 'var(--text-muted)', padding: '4px 4px' }}>…</span>
              <button>857</button>
              <button>다음 &gt;</button>
            </div>
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{c.id}</span>
                <span className="badge badge-critical"><span className="dot dot-critical" />플래그됨 / FLAGGED</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>점수</span>
                  <span className="mono tnum" style={{ fontSize: 20, fontWeight: 700, color: 'var(--critical)' }}>{c.score}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/100</span>
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm">검증 재실행</button>
                <button className="btn btn-secondary btn-sm">메모 추가</button>
                <button className="btn btn-primary btn-sm"><I.Download size={12} />내보내기</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 24px', fontSize: 12 }}>
              {[
                ['제출일', c.submitted, true], ['병원', c.hospital, false], ['환자', c.patient, false],
                ['진단 (KCD-V)', c.diagnosis, false], ['총 청구액', fmtKRW(c.total), true], ['보험 적용', `${fmtKRW(c.coverage)} (70%)`, true],
                ['NuvoVet 처리', c.processed, true], ['신뢰도', c.confidence + '%', true], ['검토자', c.reviewer, false],
              ].map(([k, v, mono], i) => (
                <div key={i}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k}</div>
                  <div className={mono ? 'mono tnum' : ''} style={{ color: 'var(--text-body)', fontWeight: mono ? 500 : 400 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
            <h3 className="section-title" style={{ marginBottom: 12 }}>청구 항목 <span className="section-title-en">/ Line items</span></h3>
            <table className="table" style={{ border: '1px solid var(--border)', borderRadius: 6 }}>
              <thead>
                <tr>
                  <th>코드</th>
                  <th>시술명</th>
                  <th className="right">단가</th>
                  <th className="right">수량</th>
                  <th className="right">합계</th>
                  <th className="right">시장가 (P50)</th>
                  <th className="right">검증</th>
                </tr>
              </thead>
              <tbody>
                {c.lines.map(l => (
                  <tr key={l.code} style={{ background: l.flagged ? 'rgba(254, 226, 226, 0.4)' : 'transparent', cursor: 'default' }}>
                    <td><span className="mono" style={{ fontSize: 12 }}>{l.code}</span></td>
                    <td>{l.name}</td>
                    <td className="right mono tnum">{fmtKRW(l.unit)}</td>
                    <td className="right mono tnum">{l.qty}</td>
                    <td className="right mono tnum" style={{ fontWeight: 600 }}>{fmtKRW(l.total)}</td>
                    <td className="right mono tnum" style={{ color: 'var(--text-secondary)' }}>{fmtKRWShort(l.p50 * 1000)}</td>
                    <td className="right">
                      {l.flagged ? (
                        <span style={{ color: 'var(--critical)', fontWeight: 600 }} className="mono tnum">+{l.dev}% ↑</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }} className="mono tnum">+{l.dev}%</span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--bg-canvas)', cursor: 'default' }}>
                  <td colSpan={4} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>총 청구액</td>
                  <td className="right mono tnum" style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{fmtKRW(c.total)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
            <h3 className="section-title" style={{ marginBottom: 12 }}>플래그 분석 <span className="section-title-en">/ Flag analysis · {c.flags.length}건</span></h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {c.flags.map(f => {
                const sevColor = f.sev === 'critical' ? 'var(--critical)' : f.sev === 'warning' ? 'var(--warning)' : 'var(--info)';
                const sevBg = f.sev === 'critical' ? 'var(--bg-critical-soft)' : f.sev === 'warning' ? 'var(--bg-warning-soft)' : 'var(--bg-info-soft)';
                return (
                  <div key={f.n} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', background: sevBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: sevColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>FLAG #{f.n}</span>
                      <span className={'badge badge-' + f.sev}>{f.sev}</span>
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{f.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{f.en}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12, fontSize: 12 }}>
                        <div><div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>대상 1</div><div style={{ color: 'var(--text-body)', fontWeight: 500 }}>{f.diag}</div></div>
                        <div><div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>대상 2</div><div style={{ color: 'var(--text-body)', fontWeight: 500 }}>{f.proc}</div></div>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6, margin: '0 0 12px' }}>{f.body}</p>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>근거 인용</div>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        {f.cites.map((cite, i) => <li key={i}>{cite}</li>)}
                      </ul>
                      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <button className="btn btn-secondary btn-sm">가이드라인 원문 보기</button>
                        <button className="btn btn-ghost btn-sm">반려 의견 추가</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
            <h3 className="section-title" style={{ marginBottom: 12 }}>병원 컨텍스트 <span className="section-title-en">/ Hospital context</span></h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 12 }}>
              {[
                ['평균 청구액', '₩1,247K'],
                ['플래그율', '18.3%'],
                ['동급 대비', '+82%'],
                ['NuvoVet 위험', '78/100'],
              ].map(([k, v], i) => (
                <div key={i} style={{ padding: 12, background: 'var(--bg-canvas)', borderRadius: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k}</div>
                  <div className="mono tnum" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>
            <span className="text-link">병원 상세 보기 →</span>
          </div>

          <div style={{ padding: 24 }}>
            <h3 className="section-title" style={{ marginBottom: 12 }}>검토 기록 <span className="section-title-en">/ Review log</span></h3>
            <div style={{ padding: '24px 16px', background: 'var(--bg-canvas)', borderRadius: 6, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              아직 검토 기록이 없습니다. 메모를 추가하면 여기에 표시됩니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
