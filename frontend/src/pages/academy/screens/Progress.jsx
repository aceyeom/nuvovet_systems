import React, { useState } from 'react';
import { COMPETENCIES, WEEKLY_PROGRESS, CASES, STATS } from '../data';
import { I } from '../icons';

const COMP_DESCRIPTIONS = {
  'data-gather':   '환자 기록에서 임상적으로 유의미한 정보를 선별하는 능력',
  'data-interp':   '검사 결과와 신체검사 소견을 임상 맥락에서 해석하는 능력',
  'hypo-gen':      '수집된 자료에서 가능한 진단 목록(차감 진단)을 생성하는 능력',
  'hypo-test':     '진단 가설을 검증하기 위한 추가 검사를 선택하고 정당화하는 능력',
  'decision':      '가용한 정보와 가이드라인에 근거하여 처방·시술을 결정하는 능력',
  'reasoning-art': '자신의 임상 추론 과정을 명확하게 글로 외부화하는 능력',
  'metacog':       '자신의 지식 한계와 확신 수준을 정확히 인식하는 능력',
};

function WeeklyChart({ data }) {
  const max = Math.max(...data.map(d => d.score));
  const min = Math.min(...data.map(d => d.score));
  const range = max - min || 1;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
        {data.map((d, i) => {
          const pct = ((d.score - min) / range) * 60 + 20;
          const isLatest = i === data.length - 1;
          return (
            <div key={d.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: isLatest ? 'var(--accent)' : 'var(--text-muted)' }}>
                {d.score}
              </div>
              <div style={{
                width: '100%', borderRadius: '4px 4px 0 0',
                height: `${pct}%`,
                background: isLatest ? 'var(--accent)' : 'var(--border-strong)',
                transition: 'height 0.4s ease',
                minHeight: 4,
              }} />
            </div>
          );
        })}
      </div>
      {/* Week labels */}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {data.map(d => (
          <div key={d.week} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
            {d.week}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetencyDetail({ comp }) {
  const fillClass = comp.score >= 70 ? 'comp-fill-accent'
    : comp.score >= 50 ? 'comp-fill-warn'
    : 'comp-fill-low';

  return (
    <div className="card card-pad" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{comp.ko}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{comp.en}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {comp.score}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: comp.delta > 0 ? 'var(--success)' : comp.delta < 0 ? 'var(--critical)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end',
          }}>
            {comp.delta > 0 ? <I.TrendingUp size={11} /> : comp.delta < 0 ? <I.TrendingDown size={11} /> : <I.Minus size={11} />}
            {comp.weekDelta} (이번 주)
          </div>
        </div>
      </div>

      <div className="comp-track" style={{ height: 10, marginBottom: 10 }}>
        <div className={`comp-fill ${fillClass}`} style={{ width: `${comp.score}%` }} />
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {COMP_DESCRIPTIONS[comp.id]}
      </div>

      {comp.delta < 0 && (
        <div style={{
          marginTop: 10, padding: '8px 12px',
          background: '#FFF7ED', border: '1px solid rgba(196,107,10,0.25)',
          borderRadius: 6, fontSize: 11, color: '#92400E',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <I.AlertTriangle size={12} />
          이 역량이 하락 중입니다. 해당 역량에 집중하는 케이스를 추천합니다.
        </div>
      )}
    </div>
  );
}

export default function Progress() {
  const [tab, setTab] = useState('overview');

  const completedCases = CASES.filter(c => c.status === 'completed');
  const firstWeek  = WEEKLY_PROGRESS[0];
  const lastWeek   = WEEKLY_PROGRESS[WEEKLY_PROGRESS.length - 1];
  const improvement = lastWeek.score - firstWeek.score;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title-en">Learning Progress</div>
          <h1 className="page-title">학습 기록</h1>
          <p className="page-subtitle">
            임상 추론 7개 역량 · 8주 추적 · {WEEKLY_PROGRESS.length}주 데이터
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary">
            <I.Download size={13} /> 리포트 다운로드
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid-4 stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">총 학습 시간</div>
          <div className="stat-value" style={{ fontSize: 24 }}>{STATS.studyHoursTotal}</div>
          <div className="stat-delta accent">
            <I.TrendingUp size={12} />
            이번 주 {STATS.studyHoursWeek}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">완료 케이스</div>
          <div className="stat-value">{STATS.casesCompleted}</div>
          <div className="stat-delta" style={{ color: 'var(--text-muted)' }}>
            전체 {STATS.casesTotal}개 중
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">평균 점수</div>
          <div className="stat-value">{lastWeek.score}</div>
          <div className="stat-delta positive">
            <I.TrendingUp size={12} />
            시작 대비 +{improvement}점
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">케이스 당 시간</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{STATS.avgMinPerCase}분</div>
          <div className="stat-delta" style={{ color: 'var(--text-muted)' }}>
            반 평균 {STATS.classAvgMin}분
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'overview', label: '점수 추이', en: 'Score Trend' },
          { id: 'competencies', label: '역량별 분석', en: 'Competency Analysis' },
          { id: 'history', label: '케이스 기록', en: 'Case History' },
        ].map(t => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Score Trend */}
      {tab === 'overview' && (
        <div className="grid-2" style={{ alignItems: 'start', gap: 20 }}>
          <div className="card card-pad-lg">
            <div className="section-title" style={{ marginBottom: 4 }}>
              주별 평균 점수
              <span className="section-title-en">Weekly Avg Score</span>
            </div>
            <div className="section-sub" style={{ marginBottom: 12 }}>최근 8주 · 케이스 채점 평균</div>
            <WeeklyChart data={WEEKLY_PROGRESS} />
          </div>

          <div className="card card-pad-lg">
            <div className="section-title" style={{ marginBottom: 16 }}>
              학습 패턴 요약
              <span className="section-title-en">Learning Pattern</span>
            </div>

            {[
              { label: '주별 케이스 수', value: `평균 ${(WEEKLY_PROGRESS.reduce((a,d)=>a+d.cases,0)/WEEKLY_PROGRESS.length).toFixed(1)}개`, icon: 'Layers' },
              { label: '주별 학습 시간', value: `평균 ${Math.round(WEEKLY_PROGRESS.reduce((a,d)=>a+d.minutes,0)/WEEKLY_PROGRESS.length)}분`, icon: 'Clock' },
              { label: '8주 점수 향상', value: `+${improvement}점 (${firstWeek.score} → ${lastWeek.score})`, icon: 'TrendingUp' },
              { label: '1차 → 2차 정답 전환율', value: '43% (Creevy et al. 기준)', icon: 'RefreshCw' },
            ].map(row => {
              const Ico = I[row.icon];
              return (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Ico size={14} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{row.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{row.value}</span>
                </div>
              );
            })}

            {/* IRB note */}
            <div style={{
              marginTop: 16, padding: '10px 12px',
              background: 'var(--bg-info-soft)',
              border: '1px solid #BFDBFE',
              borderRadius: 8, fontSize: 11, color: '#1E3A8A', lineHeight: 1.6,
            }}>
              <I.Info size={12} style={{ display: 'inline', marginRight: 4 }} />
              <strong>IRB 동의 필요:</strong> 학습 데이터를 익명화하여 연구에 활용하고 싶으신가요?{' '}
              <span style={{ color: 'var(--info)', fontWeight: 500, cursor: 'pointer' }}>동의 설정 →</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Competency Analysis */}
      {tab === 'competencies' && (
        <div>
          <div style={{
            padding: '12px 16px', marginBottom: 20,
            background: 'var(--bg-accent-soft)',
            border: '1px solid rgba(196,107,10,0.2)',
            borderRadius: 8, fontSize: 13, color: '#92400E', lineHeight: 1.6,
          }}>
            <I.Info size={14} style={{ display: 'inline', marginRight: 6 }} />
            7개 역량은 Iowa State University의 Klehm et al. (2024) 임상 추론 분류 모델을 한국 수의 맥락에 적용한 것입니다.
          </div>

          {/* Global bar */}
          <div className="card card-pad-lg" style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>
              7개 역량 현황
              <span className="section-title-en">All Competencies</span>
            </div>
            <div className="comp-bar-wrap">
              {COMPETENCIES.map(c => {
                const fillClass = c.score >= 70 ? 'comp-fill-accent'
                  : c.score >= 50 ? 'comp-fill-warn' : 'comp-fill-low';
                const deltaClass = c.delta > 0 ? 'up' : c.delta < 0 ? 'down' : 'flat';
                return (
                  <div key={c.id} className="comp-row">
                    <div className="comp-label">{c.ko}</div>
                    <div className="comp-track">
                      <div className={`comp-fill ${fillClass}`} style={{ width: `${c.score}%` }} />
                    </div>
                    <div className="comp-score">{c.score}</div>
                    <div className={`comp-delta ${deltaClass}`}>
                      {c.delta > 0 ? <I.TrendingUp size={11}/> : c.delta < 0 ? <I.TrendingDown size={11}/> : <I.Minus size={11}/>}
                      {c.weekDelta}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual cards */}
          {COMPETENCIES.map(c => <CompetencyDetail key={c.id} comp={c} />)}
        </div>
      )}

      {/* Tab: Case History */}
      {tab === 'history' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>케이스 ID</th>
                <th>제목</th>
                <th>트랙</th>
                <th style={{ textAlign: 'right' }}>1차</th>
                <th style={{ textAlign: 'right' }}>2차</th>
                <th style={{ textAlign: 'right' }}>평균</th>
                <th>확신도</th>
              </tr>
            </thead>
            <tbody>
              {completedCases.map(c => (
                <tr key={c.id}>
                  <td>
                    <span className="badge badge-accent" style={{ fontSize: 10 }}>{c.id}</span>
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', maxWidth: 280 }}>
                    {c.title}
                  </td>
                  <td>
                    <span className="badge">{`Track ${c.track}`}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 13, color: c.score >= 80 ? 'var(--success)' : c.score >= 60 ? 'var(--accent)' : 'var(--critical)', fontWeight: 700 }}>
                    {c.score ? Math.max(40, c.score - 10) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 13, color: c.score >= 80 ? 'var(--success)' : c.score >= 60 ? 'var(--accent)' : 'var(--critical)', fontWeight: 700 }}>
                    {c.score || '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {c.score ? Math.round((Math.max(40, c.score - 10) + c.score) / 2) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1,2,3,4,5].map(i => (
                        <span key={i} style={{ fontSize: 11, color: i <= 3 ? 'var(--accent)' : 'var(--border-strong)' }}>★</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
