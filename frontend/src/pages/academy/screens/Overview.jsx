import React from 'react';
import { COMPETENCIES, STATS, RECENT_ACTIVITY, CASES } from '../data';
import { I } from '../icons';

function CompetencyBars({ onNavigate }) {
  return (
    <div className="card card-pad-lg" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="section-title">
            임상 추론 7개 역량
            <span className="section-title-en">Clinical Reasoning Competencies</span>
          </div>
          <div className="section-sub">지난 7일 기준 · 케이스 34개 누적</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('progress')}>
          전체 기록 <I.ArrowRight size={13} />
        </button>
      </div>

      <div className="comp-bar-wrap">
        {COMPETENCIES.map(c => {
          const fillClass = c.score >= 70 ? 'comp-fill-accent'
            : c.score >= 50 ? 'comp-fill-warn'
            : 'comp-fill-low';
          const deltaClass = c.delta > 0 ? 'up' : c.delta < 0 ? 'down' : 'flat';
          const deltaIcon = c.delta > 0 ? <I.TrendingUp size={11} /> : c.delta < 0 ? <I.TrendingDown size={11} /> : <I.Minus size={11} />;

          return (
            <div key={c.id} className="comp-row">
              <div className="comp-label">{c.ko}</div>
              <div className="comp-track">
                <div
                  className={`comp-fill ${fillClass}`}
                  style={{ width: `${c.score}%` }}
                />
              </div>
              <div className="comp-score">{c.score}</div>
              <div className={`comp-delta ${deltaClass}`}>
                {deltaIcon}
                {c.weekDelta}
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning note for low-score competency */}
      {(() => {
        const low = COMPETENCIES.find(c => c.delta < 0);
        if (!low) return null;
        return (
          <div style={{
            marginTop: 16,
            padding: '10px 14px',
            background: '#FFF7ED',
            border: '1px solid rgba(196,107,10,0.25)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <I.AlertTriangle size={14} style={{ color: '#C46B0A', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#92400E' }}>
              <strong>{low.ko}</strong> 역량이 지난 주 대비 하락했습니다. 아래 추천 케이스를 확인하세요.
            </span>
          </div>
        );
      })()}
    </div>
  );
}

function StatCards() {
  const pct = Math.round((STATS.casesCompleted / STATS.casesTotal) * 100);

  return (
    <div className="grid-4 stat-grid" style={{ marginBottom: 20 }}>
      <div className="stat-card">
        <div className="stat-label">완료 케이스</div>
        <div className="stat-value">{STATS.casesCompleted}</div>
        <div style={{ marginTop: 4 }}>
          <div className="mini-progress">
            <div style={{ width: `${pct}%`, background: '#C46B0A' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{pct}% · {STATS.casesTotal}개 중</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">이번 주 학습</div>
        <div className="stat-value" style={{ fontSize: 22 }}>{STATS.studyHoursWeek}</div>
        <div className="stat-delta accent">
          <I.TrendingUp size={12} />
          누적 {STATS.studyHoursTotal}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">평균 점수</div>
        <div className="stat-value">{STATS.avgScore}</div>
        <div className="stat-delta positive">
          <I.TrendingUp size={12} />
          지난 주 대비 +3점
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">동료 검토</div>
        <div className="stat-value">{STATS.peerReviewsDone}</div>
        <div className="stat-delta" style={{ color: STATS.peerReviewsPending > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
          {STATS.peerReviewsPending > 0 ? (
            <><I.AlertTriangle size={12} /> 대기 {STATS.peerReviewsPending}건</>
          ) : '모두 완료'}
        </div>
      </div>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="card card-pad-lg" style={{ marginBottom: 20 }}>
      <div className="section-title" style={{ marginBottom: 16 }}>
        최근 활동
        <span className="section-title-en">Recent Activity</span>
      </div>

      <div className="timeline">
        {RECENT_ACTIVITY.map(act => (
          <div key={act.id} className="timeline-item">
            <div className={`timeline-dot ${act.done ? 'done' : ''}`}>
              {act.done ? <I.Check size={11} /> : <I.Clock size={11} />}
            </div>
            <div className="timeline-content">
              <div className="timeline-label">
                [{act.id}] {act.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span className="badge badge-accent">Track {act.track}</span>
                {act.score && (
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    점수 <strong style={{ color: act.score >= 80 ? 'var(--success)' : act.score >= 60 ? 'var(--accent)' : 'var(--critical)' }}>{act.score}</strong>
                  </span>
                )}
                <span className="timeline-time">{act.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendedCases({ onNavigate }) {
  const recommended = CASES.filter(c => c.status !== 'completed' && c.status !== 'locked').slice(0, 2);
  const locked = CASES.filter(c => c.status === 'locked').slice(0, 1);

  return (
    <div className="card card-pad-lg">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="section-title">
          추천 케이스
          <span className="section-title-en">Recommended</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('cases')}>
          전체 보기 →
        </button>
      </div>

      {recommended.map(c => (
        <div
          key={c.id}
          className="case-card"
          style={{ marginBottom: 12 }}
          onClick={() => onNavigate('cases')}
        >
          <div className="case-accent-bar" style={{ background: '#C46B0A' }} />
          <div className="case-meta">
            <span className="badge badge-accent">Track {c.track}</span>
            <DifficultyDots n={c.difficulty} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <I.Clock size={11} /> ~{c.estMin}분
            </span>
          </div>
          <div className="case-title">{c.title}</div>
          <div className="case-desc">{c.desc}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {c.competencies.map(comp => (
              <span key={comp} className="badge badge-indigo">{comp}</span>
            ))}
          </div>
        </div>
      ))}

      {locked.length > 0 && (
        <div className="case-card locked" style={{ marginBottom: 0 }}>
          <div className="case-accent-bar" style={{ background: 'var(--border-strong)' }} />
          <div className="case-meta">
            <span className="badge">Track {locked[0].track}</span>
            <DifficultyDots n={locked[0].difficulty} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <I.Lock size={11} /> 잠금
            </span>
          </div>
          <div className="case-title" style={{ color: 'var(--text-muted)' }}>{locked[0].title}</div>
        </div>
      )}
    </div>
  );
}

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

export default function Overview({ onNavigate }) {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title-en">Dashboard</div>
          <h1 className="page-title">학습 대시보드</h1>
          <p className="page-subtitle">임상 추론 7개 역량 기반 · 총 165개 케이스</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => onNavigate('cases')}>
            <I.Play size={13} /> 케이스 시작
          </button>
        </div>
      </div>

      <StatCards />
      <CompetencyBars onNavigate={onNavigate} />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <RecentActivity />
        <RecommendedCases onNavigate={onNavigate} />
      </div>
    </div>
  );
}
