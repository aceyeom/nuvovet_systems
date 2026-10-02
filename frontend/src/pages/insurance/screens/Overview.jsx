import React from 'react';
import { I } from '../icons';
import { loadDemo } from '../claimsApi';
import { DECISION, DECISION_KEYS, PEND_LABEL, SIU_LABEL, fmtKRWShort, fmtPct, ruleLabel, claimHeadline } from '../format';
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
  const decisions = DECISION_KEYS.map((k) => ({ k, n: summary.decisions[k] || 0 }));
  const pendRows = Object.entries(summary.pend_reasons || {}).map(([k, n]) => ({ key: k, label: PEND_LABEL[k] || k, value: n, color: 'var(--info)' }));
  const siuRows = Object.entries(summary.siu_flags || {}).map(([k, n]) => ({ key: k, label: SIU_LABEL[k] || k, value: n, color: 'var(--critical)' }));
  const actionableRules = Object.entries(summary.rule_hits)
    .filter(([r]) => !r.startsWith('data.') && r !== 'coverage.policy_terms_check')
    .slice(0, 8)
    .map(([r, n]) => ({ key: r, label: ruleLabel(r), value: n }));
  // Queue: the heaviest review / deny items plus the first information requests, so both work types show.
  const reviews = claims.filter((c) => c.decision === 'review' || c.decision === 'deny_recommended');
  const pends = claims.filter((c) => c.decision === 'pend');
  const queue = [...reviews.slice(0, pends.length ? 4 : 6), ...pends.slice(0, 2)];

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
        <Stat label="자동 승인율" value={fmtPct(summary.auto_approve_rate)} sub={`서류 요청(대기) ${fmtPct(summary.pend_rate ?? 0)}`} />
        <Stat label="검토 대상 금액" value={fmtKRWShort(summary.amount_flagged)} sub="가격·임상·무결성 소견" />
      </div>

      <div className="grid-6040" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card card-pad">
          <div className="section-title" style={{ marginBottom: 4 }}>판정 분포</div>
          <div className="section-sub" style={{ marginBottom: 14 }}>엔진은 자동 거절하지 않습니다 — 거절 권고도 심사역이 확정합니다.</div>
          <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
            {decisions.map(({ k, n }) => (
              <div key={k} title={`${DECISION[k].ko} ${n}`} style={{ width: `${(n / summary.claims) * 100}%`, background: DECISION[k].color }} />
            ))}
          </div>
          <div className="row" style={{ flexWrap: 'wrap', columnGap: 20, rowGap: 8 }}>
            {decisions.map(({ k, n }) => (
              <div key={k} className="row gap-8" style={{ alignItems: 'center' }}>
                <DecisionBadge decision={k} />
                <span className="mono tnum" style={{ fontSize: 13, fontWeight: 600 }}>{n}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtPct(n / summary.claims, 0)}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
            <b style={{ color: 'var(--info)', fontWeight: 600 }}>대기 · 서류 요청</b>은 정보가 부족한 청구입니다 — 거절이 아니라 병원·보호자에게 필요한 서류를 요청하고 같은 규칙으로 재심사합니다.
          </div>
          <div className="divider" style={{ margin: '18px 0' }} />
          <div className="section-title" style={{ marginBottom: 12 }}>주요 심사 소견</div>
          <BarList rows={actionableRules} />
          {(pendRows.length > 0 || siuRows.length > 0) && (
            <div className="grid-2" style={{ marginTop: 20, gap: 24 }}>
              <div>
                <div className="section-title" style={{ marginBottom: 10 }}>대기 사유</div>
                <BarList rows={pendRows} color="var(--info)" labelWidth={112} valueWidth={32} />
              </div>
              <div>
                <div className="section-title" style={{ marginBottom: 10 }}>SIU 의뢰 신호 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({summary.siu_claims ?? 0}건)</span></div>
                <BarList rows={siuRows} color="var(--critical)" labelWidth={112} valueWidth={32} />
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-pad-sm row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <span className="section-title">처리 대기열 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>심사·서류 요청</span></span>
            <button className="text-link" onClick={() => setRoute('validation')}>전체 보기 →</button>
          </div>
          {queue.map((c) => (
            <button key={c.claim_id} onClick={() => onOpenClaim(c.claim_id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'transparent' }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{claimHeadline(c)}</span>
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
