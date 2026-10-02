import React from 'react';
import { I } from './icons';
import { CATEGORY, DECISION, fmtKRW, ruleLabel } from './format';

export const DecisionBadge = ({ decision, size }) => {
  const d = DECISION[decision] || DECISION.review;
  return (
    <span className={'badge ' + d.badge} style={size === 'lg' ? { fontSize: 13, padding: '5px 12px' } : undefined}>
      {d.ko}
    </span>
  );
};

export const SourceNote = ({ source }) => (
  <span className="chip" title={source === 'live' ? '실시간 엔진 API 응답' : 'API 미연결 — 동일 합성 배치의 정적 스냅샷'}>
    <span className={'dot ' + (source === 'live' ? 'dot-ok' : 'dot-muted')} />
    합성 데이터 · {source === 'live' ? '실시간 엔진' : '스냅샷'}
  </span>
);

const SEV_STYLE = {
  critical: { color: 'var(--critical)', bg: 'var(--bg-critical-soft)', Icon: I.AlertTriangle, ko: '심각' },
  warning: { color: 'var(--warning)', bg: 'var(--bg-warning-soft)', Icon: I.AlertCircle, ko: '주의' },
  info: { color: 'var(--info)', bg: 'var(--bg-info-soft)', Icon: I.Info, ko: '정보' },
};

export const FindingCard = ({ f }) => {
  const s = SEV_STYLE[f.severity] || SEV_STYLE.info;
  return (
    <div style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${s.color}`, borderRadius: 8, padding: '12px 14px', background: 'var(--bg-card)' }}>
      <div className="row gap-8" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className="row gap-8" style={{ alignItems: 'flex-start', minWidth: 0 }}>
          <span style={{ color: s.color, marginTop: 2 }}><s.Icon size={15} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{f.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {CATEGORY[f.category] || f.category} · {ruleLabel(f.rule)} · <span className="mono">{f.rule}</span>
            </div>
          </div>
        </div>
        {f.amount_at_risk > 0 && (
          <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: s.color, whiteSpace: 'nowrap' }}>{fmtKRW(f.amount_at_risk)}</span>
        )}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-body)', margin: '8px 0 0 23px', lineHeight: 1.55 }}>{f.detail}</p>
      {f.evidence?.length > 0 && (
        <ul style={{ margin: '8px 0 0 23px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {f.evidence.map((e, i) => (
            <li key={i} style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>— {e}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const PercentileBar = ({ p }) => {
  if (p === null || p === undefined) return <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>;
  const color = p >= 97 ? 'var(--critical)' : p >= 90 ? 'var(--warning)' : 'var(--accent)';
  return (
    <div className="row gap-8" style={{ alignItems: 'center' }}>
      <div style={{ width: 64, height: 5, background: 'var(--border)', borderRadius: 3, position: 'relative' }}>
        <div style={{ position: 'absolute', left: `calc(${Math.min(p, 100)}% - 3px)`, top: -2, width: 6, height: 9, borderRadius: 2, background: color }} />
      </div>
      <span className="mono tnum" style={{ fontSize: 11.5, color }}>P{Math.round(p)}</span>
    </div>
  );
};

export const PayableBreakdown = ({ p }) => {
  if (!p) return null;
  const rows = [
    ['청구 금액', p.billed],
    ['비보장 제외', -p.ineligible],
    ['보장 대상', p.eligible],
    ['자기부담금', -p.deductible],
  ];
  return (
    <div className="card card-pad">
      <div className="section-title" style={{ marginBottom: 10 }}>지급액 산정</div>
      {rows.map(([k, v]) => (
        <div key={k} className="row" style={{ justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
          <span className="mono tnum">{v < 0 ? '−' + fmtKRW(-v) : fmtKRW(v)}</span>
        </div>
      ))}
      <div className="divider" style={{ margin: '8px 0' }} />
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
        <span>지급 예정액</span>
        <span className="mono tnum" style={{ color: 'var(--accent)' }}>{fmtKRW(p.reimbursed)}</span>
      </div>
      {p.capped_by && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>한도 적용: {p.capped_by === 'annual_limit' ? '연간 한도' : '1회 한도'}</div>}
    </div>
  );
};

export const LinesTable = ({ lines, findings }) => {
  const flagged = new Set((findings || []).filter((f) => f.severity !== 'info').map((f) => f.item_ref));
  return (
    <table className="table">
      <thead>
        <tr><th>청구 원문</th><th>표준 코드</th><th style={{ textAlign: 'right' }}>수량</th><th style={{ textAlign: 'right' }}>단가</th><th>지역 분위</th><th style={{ textAlign: 'right' }}>금액</th></tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={i} style={flagged.has(l.code) ? { background: 'var(--bg-warning-soft)' } : undefined}>
            <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{l.description}</td>
            <td>
              {l.code ? (
                <div style={{ whiteSpace: 'nowrap' }}>
                  <span className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{l.code}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>{l.code_name}</span>
                  {l.match_confidence < 0.8 && <span style={{ fontSize: 10.5, color: 'var(--warning)', marginLeft: 6 }}>({Math.round(l.match_confidence * 100)}%)</span>}
                </div>
              ) : <span className="badge badge-warning">미매핑</span>}
            </td>
            <td className="mono tnum" style={{ textAlign: 'right' }}>{l.quantity}</td>
            <td className="mono tnum" style={{ textAlign: 'right' }}>{fmtKRW(l.unit_price)}</td>
            <td><PercentileBar p={l.benchmark_percentile} /></td>
            <td className="mono tnum" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtKRW(l.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const DrugsTable = ({ drugs }) => {
  if (!drugs?.length) return <div style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '8px 2px' }}>처방 없음</div>;
  return (
    <table className="table">
      <thead>
        <tr><th>처방 원문</th><th>성분</th><th>계열</th><th style={{ textAlign: 'right' }}>용량 (mg/kg)</th><th style={{ textAlign: 'right' }}>금액</th></tr>
      </thead>
      <tbody>
        {drugs.map((d, i) => (
          <tr key={i}>
            <td style={{ fontSize: 13 }}>{d.input_name}</td>
            <td style={{ fontSize: 13 }}>{d.ingredient || <span className="badge badge-warning">미확인</span>}</td>
            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.therapeutic_class || '—'}</td>
            <td className="mono tnum" style={{ textAlign: 'right' }}>{d.dose_mg_per_kg ?? '—'}</td>
            <td className="mono tnum" style={{ textAlign: 'right' }}>{fmtKRW(d.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const AdjudicationView = ({ result, claim, header }) => {
  const findings = result.findings || [];
  const actionable = findings.filter((f) => f.severity !== 'info');
  const info = findings.filter((f) => f.severity === 'info');
  return (
    <div className="col gap-16">
      <div className="card card-pad">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{result.claim_id}</div>
            {header}
            {claim && (
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                {claim.clinic?.name || claim.clinic?.clinic_id} · {claim.clinic?.region || '지역 미상'} · {claim.visit_date} ·{' '}
                {claim.patient?.species === 'cat' ? '고양이' : '개'} {claim.patient?.breed || ''} {claim.patient?.weight_kg ? `${claim.patient.weight_kg}kg` : ''}
              </div>
            )}
            <div className="row gap-8" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              {(result.diagnoses || []).map((d, i) => (
                <span key={i} className="chip">
                  {d.code ? <span className="mono" style={{ fontWeight: 600 }}>{d.code}</span> : <span style={{ color: 'var(--warning)' }}>미매핑</span>}
                  <span>{d.name_ko || d.input}</span>
                </span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <DecisionBadge decision={result.decision} size="lg" />
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>정형화 신뢰도 {Math.round((result.confidence || 0) * 100)}% · 엔진 v{result.engine_version}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 300px)', gap: 16, alignItems: 'start' }}>
        <div className="col gap-8" style={{ minWidth: 0 }}>
          <div className="section-title">심사 소견 {actionable.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({actionable.length})</span>}</div>
          {actionable.length === 0 && (
            <div className="card card-pad-sm row gap-8" style={{ fontSize: 13, color: 'var(--accent)' }}>
              <I.CheckCircle size={15} /> 지급에 영향을 주는 소견이 없습니다.
            </div>
          )}
          {actionable.map((f, i) => <FindingCard key={i} f={f} />)}
          {info.length > 0 && (
            <details style={{ fontSize: 12.5 }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px 0' }}>참고 정보 {info.length}건</summary>
              <div className="col gap-8" style={{ marginTop: 8 }}>{info.map((f, i) => <FindingCard key={i} f={f} />)}</div>
            </details>
          )}
        </div>
        <PayableBreakdown p={result.payable} />
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <div className="card-pad-sm" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="section-title">진료 항목 — 표준 코드 매핑</span>
        </div>
        <div style={{ overflowX: 'auto' }}><LinesTable lines={result.lines || []} findings={findings} /></div>
      </div>
      <div className="card" style={{ minWidth: 0 }}>
        <div className="card-pad-sm" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="section-title">처방 약물</span>
        </div>
        <div style={{ overflowX: 'auto' }}><DrugsTable drugs={result.drugs} /></div>
      </div>
    </div>
  );
};

export const BarList = ({ rows, format = (v) => v.toLocaleString('en-US'), color = 'var(--accent)' }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="col gap-8">
      {rows.map((r) => (
        <div key={r.key} className="row gap-12" style={{ alignItems: 'center' }}>
          <div style={{ width: 150, fontSize: 12.5, color: 'var(--text-body)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.label}>{r.label}</div>
          <div style={{ flex: 1, height: 8, background: 'var(--bg-canvas)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(r.value / max) * 100}%`, height: '100%', background: r.color || color, borderRadius: 4 }} />
          </div>
          <div className="mono tnum" style={{ width: 70, textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)' }}>{format(r.value)}</div>
        </div>
      ))}
    </div>
  );
};

export const useAsync = (fn, deps = []) => {
  const [state, setState] = React.useState({ loading: true, data: null, error: null });
  React.useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: null });
    fn().then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((error) => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
};

export const Loading = () => (
  <div className="page"><div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 40 }}>불러오는 중…</div></div>
);
