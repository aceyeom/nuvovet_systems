import React, { useState } from 'react';
import { PEER_REVIEWS } from '../data';
import { I } from '../icons';

const SCORE_LABELS = [
  { id: 'accuracy',    ko: '처방 정확성',      en: 'Clinical Accuracy' },
  { id: 'logic',       ko: '추론 논리성',      en: 'Reasoning Logic' },
  { id: 'guideline',   ko: '가이드라인 인용',  en: 'Guideline Citation' },
  { id: 'patient',     ko: '환자 특성 반영',   en: 'Patient Consideration' },
  { id: 'alternative', ko: '대안 고려',        en: 'Alternative Considered' },
];

function ScoreRow({ label, value, onChange }) {
  return (
    <div className="review-score-row">
      <div className="review-score-label">
        {label.ko}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{label.en}</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            className={`score-btn ${value === n ? 'active' : ''}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
        {value === 0 ? '—' : ['매우 부족', '부족', '보통', '좋음', '매우 좋음'][value - 1]}
      </div>
    </div>
  );
}

function ReviewCard({ review, idx }) {
  const [scores, setScores] = useState({ ...review.scores });
  const [feedback, setFeedback] = useState(review.feedback);
  const [submitted, setSubmitted] = useState(false);

  const setScore = (key, val) => setScores(prev => ({ ...prev, [key]: val }));

  const totalScored = Object.values(scores).filter(v => v > 0).length;
  const allScored   = totalScored === SCORE_LABELS.length;
  const canSubmit   = allScored && feedback.length >= 200;

  const avgScore = allScored
    ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / SCORE_LABELS.length * 20)
    : null;

  if (submitted) {
    return (
      <div className="review-card" style={{ border: '1px solid rgba(5,150,105,0.35)' }}>
        <div className="review-card-header" style={{ background: 'var(--bg-success-soft)' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <I.Check size={16} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>검토 제출 완료</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{review.caseTitle} · {review.revieweeCode}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 800, color: 'var(--success)' }}>
            {avgScore}점
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-card">
      {/* Header */}
      <div className="review-card-header">
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--bg-accent-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--accent)',
        }}>
          #{idx + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {review.revieweeCode}의 답변
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            케이스: {review.caseId} — {review.caseTitle}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--warning)', fontWeight: 500 }}>
          <I.Clock size={13} />
          마감 {review.deadline} 후
        </div>
      </div>

      <div className="review-card-body">
        {/* Reviewee's selected options */}
        <div style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>
            선택한 처방
            <span className="section-title-en">Selected Prescription</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {review.selectedOptions.map((opt, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 13, color: 'var(--text-body)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--border-strong)', color: 'white',
                  fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                {opt}
              </div>
            ))}
          </div>
        </div>

        {/* Reviewee's reasoning */}
        <div style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>
            작성한 추론
            <span className="section-title-en">Reasoning Written</span>
          </div>
          <div style={{
            padding: '14px 16px',
            background: '#F5F3FF',
            border: '1px solid #DDD6FE',
            borderRadius: 10,
            fontSize: 13, color: 'var(--text-body)', lineHeight: 1.8,
          }}>
            {review.reasoning}
          </div>
        </div>

        <div className="divider" />

        {/* Scoring */}
        <div style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>
            평가 항목 (각 1~5점)
            <span className="section-title-en">Evaluation (1–5 per item)</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            1 = 매우 부족 · 3 = 보통 · 5 = 매우 좋음
          </div>

          {SCORE_LABELS.map(label => (
            <ScoreRow
              key={label.id}
              label={label}
              value={scores[label.id]}
              onChange={val => setScore(label.id, val)}
            />
          ))}

          {allScored && (
            <div style={{
              marginTop: 12, padding: '8px 12px',
              background: 'var(--bg-accent-soft)',
              border: '1px solid rgba(196,107,10,0.2)',
              borderRadius: 8, fontSize: 12, color: 'var(--accent)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <I.Star size={13} />
              평균 점수: <strong>{avgScore}점</strong> ({(Object.values(scores).reduce((a,b)=>a+b,0)/5).toFixed(1)} / 5.0)
            </div>
          )}
        </div>

        {/* Free-text feedback */}
        <div style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>
            자유 피드백 <span style={{ color: 'var(--critical)', fontWeight: 400 }}>(200자 이상 필수)</span>
            <span className="section-title-en">Free Feedback</span>
          </div>
          <textarea
            className="reasoning-area"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="이 학생의 처방 추론에서 잘된 점, 개선할 점, 놓친 임상적 고려사항을 구체적으로 작성해주세요. 단순히 '틀렸다'가 아닌 왜 틀렸는지, 어떻게 다르게 생각해야 하는지를 설명해주세요."
            rows={6}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 11, marginTop: 4,
          }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {feedback.length < 200 ? '💡 검토자의 피드백 품질도 평가됩니다. 구체적으로 작성하세요.' : ''}
            </span>
            <span style={{ color: feedback.length >= 200 ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
              {feedback.length} / 200자 {feedback.length >= 200 ? '✓' : '필요'}
            </span>
          </div>
        </div>

        {/* Gaming prevention notice */}
        {!canSubmit && (
          <div style={{
            padding: '10px 14px', marginBottom: 16,
            background: 'var(--bg-muted-soft)',
            border: '1px solid var(--border)',
            borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <I.Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              {!allScored && <div>· 5개 평가 항목을 모두 채워주세요 ({totalScored}/5 완료)</div>}
              {feedback.length < 200 && <div>· 자유 피드백을 200자 이상 작성해주세요 ({feedback.length}/200자)</div>}
            </div>
          </div>
        )}

        <button
          className="btn btn-primary btn-lg"
          style={{
            width: '100%',
            opacity: canSubmit ? 1 : 0.4,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
          disabled={!canSubmit}
          onClick={() => setSubmitted(true)}
        >
          <I.Send size={14} /> 검토 제출
        </button>
      </div>
    </div>
  );
}

export default function PeerReview() {
  const pending = PEER_REVIEWS.filter(r => !r.submitted);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title-en">Peer Review</div>
          <h1 className="page-title">동료 검토</h1>
          <p className="page-subtitle">
            이번 주 할당된 검토 {PEER_REVIEWS.length}건 · 익명 쌍방 시스템
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="card card-pad" style={{ marginBottom: 24, background: 'var(--bg-info-soft)', border: '1px solid #BFDBFE' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <I.Info size={16} style={{ color: 'var(--info)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: '#1E3A8A', lineHeight: 1.7 }}>
            <strong>동료 검토 안내:</strong> 검토자와 피검토자는 서로 익명입니다.
            검토자의 피드백 품질도 피검토자가 평가합니다. 평균 검토 시간이 10분 미만이면 시스템 경고가 발생합니다.
            모든 점수를 5점으로만 줄 경우 교수님께 알림이 전송됩니다.{' '}
            <span className="text-link" style={{ color: 'var(--info)' }}>동료 검토를 잘 작성하는 법 →</span>
          </div>
        </div>
      </div>

      {pending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <I.CheckCircle size={40} style={{ marginBottom: 12, color: 'var(--success)' }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            이번 주 검토를 모두 완료했습니다.
          </div>
          <div style={{ fontSize: 13 }}>다음 주 월요일에 새 검토가 할당됩니다.</div>
        </div>
      ) : (
        pending.map((review, idx) => (
          <ReviewCard key={review.id} review={review} idx={idx} />
        ))
      )}

      {/* My received reviews */}
      <div style={{ marginTop: 32 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>
          내가 받은 피드백
          <span className="section-title-en">Feedback Received</span>
        </div>
        <div className="card card-pad" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '24px' }}>
          <I.Lock size={20} style={{ marginBottom: 8 }} />
          <div>동료 검토를 제출하면 내 케이스에 대한 피드백이 공개됩니다.</div>
        </div>
      </div>
    </div>
  );
}
