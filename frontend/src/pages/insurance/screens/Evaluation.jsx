import React from 'react';
import { I } from '../icons';
import { loadEvaluation } from '../claimsApi';
import { ANOMALY_LABEL, PEND_LABEL, fmtPct, ruleLabel } from '../format';
import { BarList, Loading, SourceNote, useAsync } from '../ui';

export default function Evaluation() {
  const { loading, data } = useAsync(loadEvaluation, []);
  if (loading || !data) return <Loading />;
  const recall = Object.entries(data.recall_by_anomaly).filter(([, v]) => v.injected > 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">엔진 성능</h1>
          <p className="page-subtitle">라벨이 있는 합성 청구로 측정한 탐지율 · 오탐률</p>
        </div>
        <div className="page-header-actions"><SourceNote source={data.source} /></div>
      </div>

      <div className="card card-pad-sm row gap-8" style={{ marginBottom: 16, fontSize: 12.5, color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--warning)', marginTop: 1 }}><I.AlertCircle size={14} /></span>
        <span>
          이 수치는 <b>규칙이 설계대로 작동하는지</b>를 검증할 뿐, 실제 청구에서의 성능을 의미하지 않습니다. 실제 성능은 파트너 보험사의 과거 청구(1,000~5,000건)에
          대한 후향 검증으로 측정합니다: 정형화 정확도(심사역 대비), 검토 대상으로 분류된 누수 금액, 오탐률, 자동 승인율.
        </span>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        <div className="stat-card"><div className="stat-label">합성 청구</div><div className="stat-value tnum">{data.claims}</div></div>
        <div className="stat-card"><div className="stat-label">정상 청구</div><div className="stat-value tnum">{data.clean_claims}</div></div>
        <div className="stat-card"><div className="stat-label">정상 청구 오탐률</div><div className="stat-value tnum">{fmtPct(data.clean_false_alarm_rate)}</div></div>
        <div className="stat-card"><div className="stat-label">정상 청구 자동 승인율</div><div className="stat-value tnum">{fmtPct(data.clean_auto_approve_rate)}</div></div>
        <div className="stat-card">
          <div className="stat-label">서류 요청(대기)율</div><div className="stat-value tnum">{fmtPct(data.pend_rate ?? 0)}</div>
          <div className="stat-delta"><span className="vs" style={{ marginLeft: 0 }}>정상 청구 {fmtPct(data.clean_pend_rate ?? 0)}</span></div>
        </div>
      </div>

      <div className="grid-6040" style={{ marginTop: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="card-pad-sm" style={{ borderBottom: '1px solid var(--border)' }}><span className="section-title">이상 유형별 탐지율</span></div>
          <table className="table">
            <thead><tr><th>주입한 이상 유형</th><th style={{ textAlign: 'right' }}>주입</th><th style={{ textAlign: 'right' }}>탐지</th><th>재현율</th></tr></thead>
            <tbody>
              {recall.map(([k, v]) => (
                <tr key={k}>
                  <td style={{ fontSize: 13 }}>
                    {ANOMALY_LABEL[k] || k}
                    {['total_only_receipt', 'missing_dx', 'above_threshold_no_cert', 'mixed_basket'].includes(k) && <span className="badge badge-info" style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px' }}>대기</span>}
                  </td>
                  <td className="mono tnum" style={{ textAlign: 'right' }}>{v.injected}</td>
                  <td className="mono tnum" style={{ textAlign: 'right' }}>{v.detected}</td>
                  <td>
                    <div className="row gap-8" style={{ alignItems: 'center' }}>
                      <div style={{ width: 120, height: 6, background: 'var(--bg-canvas)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${v.recall * 100}%`, height: '100%', background: v.recall >= 0.9 ? 'var(--accent)' : 'var(--warning)' }} />
                      </div>
                      <span className="mono tnum" style={{ fontSize: 12 }}>{fmtPct(v.recall, 0)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card card-pad">
          <div className="section-title" style={{ marginBottom: 12 }}>규칙별 발동 횟수</div>
          <BarList rows={Object.entries(data.rule_hits).slice(0, 12).map(([r, n]) => ({ key: r, label: ruleLabel(r), value: n }))} />
          {data.pend_reasons && Object.keys(data.pend_reasons).length > 0 && (
            <>
              <div className="section-title" style={{ margin: '20px 0 12px' }}>대기 사유 (서류 요청)</div>
              <BarList color="var(--info)" rows={Object.entries(data.pend_reasons).map(([k, n]) => ({ key: k, label: PEND_LABEL[k] || k, value: n }))} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
