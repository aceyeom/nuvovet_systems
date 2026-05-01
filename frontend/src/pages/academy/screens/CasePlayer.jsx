import React, { useState } from 'react';
import { ACTIVE_CASE } from '../data';
import { I } from '../icons';

/* Stage constants */
const STAGE = { INTRO: 0, STAGE1: 1, EXPERT: 2, STAGE2: 3, RESULT: 4 };

function StageBreadcrumb({ stage }) {
  const steps = [
    { label: '1차 답변', sub: 'First Answer', stageVal: STAGE.STAGE1 },
    { label: '전문가 사고', sub: 'Expert Thinking', stageVal: STAGE.EXPERT },
    { label: '2차 답변', sub: 'Revised Answer', stageVal: STAGE.STAGE2 },
    { label: '결과', sub: 'Result', stageVal: STAGE.RESULT },
  ];

  return (
    <div className="stage-bar">
      {steps.map((s, idx) => {
        const isDone   = stage > s.stageVal;
        const isActive = stage === s.stageVal;
        const isExpert = s.stageVal === STAGE.EXPERT;

        return (
          <React.Fragment key={s.label}>
            <div className={`stage-step ${isDone ? 'done' : isActive && isExpert ? 'indigo-active' : isActive ? 'active' : ''}`}>
              <div className={`stage-dot ${isDone ? 'done' : isActive && isExpert ? 'indigo' : isActive ? 'active' : ''}`}>
                {isDone ? <I.Check size={10} /> : idx + 1}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{s.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{s.sub}</div>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className={`stage-connector ${isDone ? 'done-line' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PatientCard({ patient }) {
  const statusColor = { normal: 'var(--success)', mild: 'var(--warning)', pathogen: 'var(--critical)', sensitive: 'var(--info)' };

  return (
    <div className="card card-pad-lg" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div className="section-title">
            환자 정보
            <span className="section-title-en">Patient</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ACTIVE_CASE.competencies.map(c => (
            <span key={c} className="badge badge-indigo">{c}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { label: '이름', value: patient.name },
          { label: '종/품종', value: `${patient.species} · ${patient.breed}` },
          { label: '나이', value: patient.age },
          { label: '체중', value: patient.weight },
          { label: '성별', value: patient.sex },
          { label: '신기능', value: patient.renal },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 56, flexShrink: 0 }}>{row.label}</span>
            <span style={{ fontSize: 13, color: 'var(--text-body)', fontWeight: 500 }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="divider" style={{ margin: '12px 0' }} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 2 }}>진단</span>
        {patient.conditions.map(c => <span key={c} className="badge badge-warning">{c}</span>)}
        {patient.allergies[0] !== '없음' && patient.allergies.map(a => (
          <span key={a} className="badge badge-critical">알레르기: {a}</span>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>검사 결과</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {patient.labResults.map(l => (
            <div key={l.name} style={{
              padding: '8px 10px',
              background: 'var(--bg-hover)',
              borderRadius: 6,
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l.name}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: statusColor[l.status] || 'var(--text-primary)', marginTop: 2 }}>{l.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnswerSection({ selected, setSelected, reasoning, setReasoning, disabled, title }) {
  return (
    <div className="card card-pad-lg" style={{ marginBottom: 20 }}>
      <div className="section-title" style={{ marginBottom: 16 }}>
        {title}
        <span className="section-title-en">{disabled ? 'Locked' : 'Select one'}</span>
      </div>

      <p style={{ fontSize: 14, color: 'var(--text-body)', marginBottom: 16, lineHeight: 1.6, fontWeight: 500 }}>
        {ACTIVE_CASE.question}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {ACTIVE_CASE.options.map(opt => (
          <div
            key={opt.id}
            className={`answer-option ${selected === opt.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && setSelected(opt.id)}
          >
            <div className="answer-key">{opt.id}</div>
            <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6 }}>{opt.text}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div className="section-title" style={{ marginBottom: 8 }}>
          처방 추론 작성
          <span className="section-title-en">Reasoning Articulation</span>
        </div>
        <div style={{
          fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.6,
          padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 6,
        }}>
          💡 <strong>임상 추론 가이드:</strong> ① 진단을 어떻게 해석했는가 ② 환자 특성을 어떻게 고려했는가
          ③ 약물 선택 근거는 무엇인가 ④ 대안을 고려했다면 왜 배제했는가
        </div>
        <textarea
          className="reasoning-area"
          disabled={disabled}
          value={reasoning}
          onChange={e => setReasoning(e.target.value)}
          placeholder={disabled ? '1차 추론이 잠금 처리되었습니다.' : '3~5문장으로 왜 이 처방을 선택했는지 설명하세요…'}
          rows={5}
        />
        {!disabled && (
          <div style={{ fontSize: 11, color: reasoning.length < 100 ? 'var(--warning)' : 'var(--success)', marginTop: 4, textAlign: 'right' }}>
            {reasoning.length}자 {reasoning.length < 100 ? `(최소 100자 권장)` : '✓'}
          </div>
        )}
      </div>
    </div>
  );
}

function ExpertThinkingSection() {
  return (
    <div className="card card-pad-lg" style={{ marginBottom: 20, border: '1px solid #DDD6FE' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <I.Brain size={16} style={{ color: 'white' }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#3730A3' }}>전문가 사고 공개</div>
          <div style={{ fontSize: 11, color: '#6D28D9' }}>Expert Thinking Revealed</div>
        </div>
      </div>

      <div style={{
        padding: '10px 14px', marginBottom: 16,
        background: '#EEF2FF', border: '1px solid #C7D2FE',
        borderRadius: 8, fontSize: 13, color: '#3730A3', lineHeight: 1.6,
      }}>
        정답은 아직 공개되지 않습니다. 전문가가 <strong>어떻게 추론</strong>했는지 읽고,
        2차 답변에서 자신의 생각을 수정하거나 유지할 수 있습니다.
      </div>

      {ACTIVE_CASE.expertThinking.map((expert, i) => (
        <div key={i} className="expert-card">
          <div className="expert-name">{expert.expert}</div>
          <div className="expert-text">{expert.text}</div>
        </div>
      ))}
    </div>
  );
}

function ResultSection({ answer1, answer2, reasoning1, reasoning2, confidence, setConfidence }) {
  const opt1 = ACTIVE_CASE.options.find(o => o.id === answer1);
  const opt2 = ACTIVE_CASE.options.find(o => o.id === answer2);
  const correct = ACTIVE_CASE.options.find(o => o.correct);
  const score1 = opt1?.correct ? 100 : 40;
  const score2 = opt2?.correct ? 100 : 40;
  const avgScore = Math.round((score1 + score2) / 2);

  return (
    <div>
      {/* Score summary */}
      <div className="card card-pad-lg" style={{ marginBottom: 20, border: '1px solid rgba(5,150,105,0.3)', background: '#F0FDF9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>케이스 완료</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {ACTIVE_CASE.id} — {ACTIVE_CASE.title}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: avgScore >= 80 ? 'var(--success)' : avgScore >= 60 ? 'var(--accent)' : 'var(--critical)', letterSpacing: '-0.02em' }}>
              {avgScore}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>평균 점수</div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 12 }}>
          <div style={{ padding: '10px 14px', background: 'white', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>1차 답변</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: opt1?.correct ? 'var(--success)' : 'var(--critical)' }}>
              {opt1?.correct ? '✓ 정답' : '✗ 오답'} — {opt1?.id}. {opt1?.text.slice(0, 40)}…
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>점수: {score1}</div>
          </div>
          <div style={{ padding: '10px 14px', background: 'white', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>2차 답변</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: opt2?.correct ? 'var(--success)' : 'var(--critical)' }}>
              {opt2?.correct ? '✓ 정답' : '✗ 오답'} — {opt2?.id}. {opt2?.text.slice(0, 40)}…
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>점수: {score2}</div>
          </div>
        </div>
      </div>

      {/* Correct answer + explanation */}
      <div className="card card-pad-lg" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>
          정답 해설
          <span className="section-title-en">Answer & Explanation</span>
        </div>

        <div style={{
          padding: '12px 16px', marginBottom: 16,
          background: 'var(--bg-success-soft)',
          border: '1px solid rgba(5,150,105,0.3)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', marginBottom: 4 }}>정답</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {correct?.id}. {correct?.text}
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.8, marginBottom: 16 }}>
          {ACTIVE_CASE.explanation}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          {ACTIVE_CASE.options.map(opt => (
            <div key={opt.id} style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${opt.correct ? 'rgba(5,150,105,0.3)' : 'var(--border)'}`,
              background: opt.correct ? 'var(--bg-success-soft)' : 'var(--bg-hover)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: opt.correct ? 'var(--success)' : 'var(--text-muted)', marginBottom: 4 }}>
                {opt.id}. {opt.correct ? '정답 ✓' : '오답'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{opt.explanation}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>인용 가이드라인</div>
          {ACTIVE_CASE.guidelines.map(g => (
            <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--info)', marginBottom: 4 }}>
              <I.ExternalLink size={12} /> {g}
            </div>
          ))}
        </div>
      </div>

      {/* Metacognition — confidence */}
      <div className="card card-pad-lg" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginBottom: 8 }}>
          자기 평가 — 확신도
          <span className="section-title-en">Metacognition · Confidence</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
          이 케이스의 처방 결정에 얼마나 자신 있었나요? (1 = 전혀 자신 없음 · 5 = 매우 자신 있음)
        </p>
        <div className="confidence-row">
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              className={`conf-btn ${confidence === n ? 'active' : ''}`}
              onClick={() => setConfidence(n)}
            >
              <div style={{ fontSize: 16, marginBottom: 2 }}>{'★'.repeat(n)}</div>
              <div style={{ fontSize: 10 }}>{['전혀','별로','보통','자신','매우'][n-1]}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CasePlayer({ onBack, onNavigateToCases }) {
  const [stage, setStage] = useState(STAGE.INTRO);
  const [answer1, setAnswer1] = useState(null);
  const [reasoning1, setReasoning1] = useState('');
  const [answer2, setAnswer2] = useState(null);
  const [reasoning2, setReasoning2] = useState('');
  const [confidence, setConfidence] = useState(0);

  const canSubmit1 = answer1 !== null && reasoning1.length >= 50;
  const canSubmit2 = answer2 !== null && reasoning2.length >= 50;

  if (stage === STAGE.INTRO) {
    return (
      <div className="page" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
            <I.ChevronLeft size={14} /> 케이스 목록
          </button>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span className="badge badge-accent">{ACTIVE_CASE.id}</span>
            <span className="badge badge-accent">Track {ACTIVE_CASE.track}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <I.Clock size={11} /> ~{ACTIVE_CASE.estMin}분
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 8 }}>
            {ACTIVE_CASE.title}
          </h1>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ACTIVE_CASE.competencies.map(c => (
              <span key={c} className="badge badge-indigo">{c}</span>
            ))}
          </div>
        </div>

        <div className="card card-pad-lg" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>이 케이스의 진행 방식</div>
          {[
            { step: '1단계', color: '#C46B0A', bg: 'var(--bg-accent-soft)', title: '1차 답변', desc: '처방을 선택하고 추론을 글로 작성하세요. 제출 후에는 수정할 수 없습니다.' },
            { step: '2단계', color: '#4F46E5', bg: '#EEF2FF', title: '전문가 사고 공개', desc: '정답은 아직 공개하지 않습니다. 전문가가 어떻게 추론했는지 읽어보세요.' },
            { step: '3단계', color: '#C46B0A', bg: 'var(--bg-accent-soft)', title: '2차 답변', desc: '전문가 사고를 보고 자신의 답변을 수정하거나 유지할 수 있습니다.' },
            { step: '결과', color: 'var(--success)', bg: 'var(--bg-success-soft)', title: '채점 + 해설', desc: '1차·2차 점수 평균 + 가이드라인 인용 해설 + 자기 확신도 기록.' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 8, flexShrink: 0,
                background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: s.color, letterSpacing: '0.04em',
              }}>{s.step}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          onClick={() => setStage(STAGE.STAGE1)}
        >
          <I.Play size={15} /> 케이스 시작하기
        </button>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>
          <I.ChevronLeft size={14} /> 케이스 목록
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge badge-accent">{ACTIVE_CASE.id}</span>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
            {ACTIVE_CASE.title}
          </h2>
        </div>
      </div>

      <StageBreadcrumb stage={stage} />
      <PatientCard patient={ACTIVE_CASE.patient} />

      {/* Stage 1 — First answer */}
      {stage === STAGE.STAGE1 && (
        <>
          <AnswerSection
            selected={answer1}
            setSelected={setAnswer1}
            reasoning={reasoning1}
            setReasoning={setReasoning1}
            disabled={false}
            title="1차 답변 / First Answer"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
              {!canSubmit1 && '처방 선택 후 추론을 50자 이상 작성하세요'}
            </div>
            <button
              className="btn btn-stage1 btn-lg"
              disabled={!canSubmit1}
              style={{ opacity: canSubmit1 ? 1 : 0.4, cursor: canSubmit1 ? 'pointer' : 'not-allowed' }}
              onClick={() => setStage(STAGE.EXPERT)}
            >
              1차 답변 제출 → 전문가 사고 보기
            </button>
          </div>
        </>
      )}

      {/* Stage 2 — Expert thinking */}
      {stage === STAGE.EXPERT && (
        <>
          <AnswerSection
            selected={answer1}
            setSelected={() => {}}
            reasoning={reasoning1}
            setReasoning={() => {}}
            disabled={true}
            title="1차 답변 (잠금) / First Answer — Locked"
          />
          <ExpertThinkingSection />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-stage2 btn-lg"
              onClick={() => { setAnswer2(answer1); setStage(STAGE.STAGE2); }}
            >
              전문가 사고를 읽었습니다 → 2차 답변 작성
            </button>
          </div>
        </>
      )}

      {/* Stage 3 — Second answer */}
      {stage === STAGE.STAGE2 && (
        <>
          <AnswerSection
            selected={answer1}
            setSelected={() => {}}
            reasoning={reasoning1}
            setReasoning={() => {}}
            disabled={true}
            title="1차 답변 (잠금) / First Answer — Locked"
          />
          <ExpertThinkingSection />
          <AnswerSection
            selected={answer2}
            setSelected={setAnswer2}
            reasoning={reasoning2}
            setReasoning={setReasoning2}
            disabled={false}
            title="2차 답변 / Revised Answer"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
              {!canSubmit2 && '2차 처방 선택 후 추론을 50자 이상 작성하세요'}
            </div>
            <button
              className="btn btn-primary btn-lg"
              disabled={!canSubmit2}
              style={{ opacity: canSubmit2 ? 1 : 0.4, cursor: canSubmit2 ? 'pointer' : 'not-allowed' }}
              onClick={() => setStage(STAGE.RESULT)}
            >
              최종 제출 → 결과 보기
            </button>
          </div>
        </>
      )}

      {/* Stage 4 — Result */}
      {stage === STAGE.RESULT && (
        <>
          <ResultSection
            answer1={answer1}
            answer2={answer2}
            reasoning1={reasoning1}
            reasoning2={reasoning2}
            confidence={confidence}
            setConfidence={setConfidence}
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-lg" onClick={onBack}>
              케이스 목록으로
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => { setStage(STAGE.INTRO); setAnswer1(null); setAnswer2(null); setReasoning1(''); setReasoning2(''); setConfidence(0); }}
            >
              <I.RefreshCw size={14} /> 다시 풀기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
