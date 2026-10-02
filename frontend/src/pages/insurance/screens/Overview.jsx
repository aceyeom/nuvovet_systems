import React from 'react';
import { I } from '../icons';
import { loadDemo } from '../claimsApi';
import { DECISION, fmtKRWShort, fmtPct, ruleLabel } from '../format';
import { BarList, DecisionBadge, Loading, SourceNote, useAsync } from '../ui';

const Stat = ({ label, value, sub }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className="stat-value tnum">{value}</div>
    {sub && <div className="stat-delta"><span className="vs" style={{ marginLeft: 0 }}>{sub}</span></div>}
  </div>
);

export default function Overview({ onOpenClaim, setRoute }) {
  const { loading, data } = useAsync(loadDemo, []);
  if (loading || !data) return <Loading />;
  const { summary, claims, source } = data;
  const decisions = ['auto_approve', 'review', 'deny_recommended'].map((k) => ({ k, n: summary.decisions[k] || 0 }));
  const actionableRules = Object.entries(summary.rule_hits)
    .filter(([r]) => !r.startsWith('data.') && r !== 'coverage.policy_terms_check')
    .slice(0, 8)
    .map(([r, n]) => ({ key: r, label: ruleLabel(r), value: n }));
  const queue = claims.filter((c) => c.decision !== 'auto_approve').slice(0, 6);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">개요</h1>
          <p className="page-subtitle">청구 정형화 · 자동 심사 현황</p>
        </div>
        <div className="page-header-actions"><SourceNote source={source} /></div>
      </div>

      <div className="card card-pad-sm row gap-8" style={{ marginBottom: 16, fontSize: 12.5, color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--info)', marginTop: 1 }}><I.Info size={14} /></span>
        <span>
          표시된 청구는 엔진 검증용으로 생성한 <b>합성 데이터</b>입니다(병원명·환자·금액 모두 가상). 실제 보험사·병원 데이터가 아니며,
          가격 벤치마크는 공개 통계로 교체 예정인 추정치를 포함합니다.
        </span>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        <Stat label="청구 건수" value={summary.claims.toLocaleString('en-US')} sub="합성 배치" />
        <Stat label="청구 금액" value={fmtKRWShort(summary.billed)} />
        <Stat label="지급 예정액" value={fmtKRWShort(summary.reimbursed)} sub="보장비율·자기부담금 적용" />
        <Stat label="자동 승인율" value={fmtPct(summary.auto_approve_rate)} sub="사람 검토 없이 처리" />
        <Stat label="검토 대상 금액" value={fmtKRWShort(summary.amount_flagged)} sub="가격·임상·무결성 소견" />
      </div>

      <div className="grid-6040" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card card-pad">
          <div className="section-title" style={{ marginBottom: 4 }}>판정 분포</div>
          <div className="section-sub" style={{ marginBottom: 14 }}>엔진은 자동 거절하지 않습니다 — 거절 권고도 심사역이 확정합니다.</div>
          <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
            {decisions.map(({ k, n }) => (
              <div key={k} title={`${DECISION[k].ko} ${n}`} style={{
                width: `${(n / summary.claims) * 100}%`,
                background: k === 'auto_approve' ? 'var(--accent)' : k === 'review' ? 'var(--warning)' : 'var(--critical)',
              }} />
            ))}
          </div>
          <div className="row gap-24" style={{ flexWrap: 'wrap' }}>
            {decisions.map(({ k, n }) => (
              <div key={k} className="row gap-8" style={{ alignItems: 'center' }}>
                <DecisionBadge decision={k} />
                <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600 }}>{n}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtPct(n / summary.claims, 0)}</span>
              </div>
            ))}
          </div>
          <div className="divider" style={{ margin: '18px 0' }} />
          <div className="section-title" style={{ marginBottom: 12 }}>주요 심사 소견</div>
          <BarList rows={actionableRules} />
        </div>

        <div className="card">
          <div className="card-pad-sm row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <span className="section-title">심사 대기열</span>
            <button className="text-link" onClick={() => setRoute('validation')}>전체 보기 →</button>
          </div>
          {queue.map((c) => (
            <button key={c.claim_id} onClick={() => onOpenClaim(c.claim_id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'transparent' }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.top_finding || c.diagnosis}</span>
                <DecisionBadge decision={c.decision} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                <span className="mono">{c.claim_id}</span> · {c.clinic} · {c.diagnosis} · {fmtKRWShort(c.billed)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-pad-sm row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <span className="section-title">검토 금액 상위 병원</span>
          <button className="text-link" onClick={() => setRoute('hospitals')}>병원 리스크 →</button>
        </div>
        <table className="table">
          <thead><tr><th>병원</th><th>지역</th><th style={{ textAlign: 'right' }}>청구</th><th style={{ textAlign: 'right' }}>검토 비율</th><th style={{ textAlign: 'right' }}>검토 대상 금액</th></tr></thead>
          <tbody>
            {summary.clinics.slice(0, 5).map((h) => (
              <tr key={h.clinic_id}>
                <td style={{ fontWeight: 600 }}>{h.name}</td>
                <td>{h.region}</td>
                <td className="mono tnum" style={{ textAlign: 'right' }}>{h.claims}</td>
                <td className="mono tnum" style={{ textAlign: 'right' }}>{fmtPct(h.flagged / h.claims, 0)}</td>
                <td className="mono tnum" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtKRWShort(h.at_risk)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
