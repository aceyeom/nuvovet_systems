import React from 'react';
import { I } from './icons';
import {
  ACTOR, BENEFIT_LABEL, CAPPED_BY, CATEGORY, CHANNEL_LABEL, DECISION, DOC_LABEL, PEND_LABEL, SIU_LABEL,
  fmtKRW, reasonLabel, ruleLabel,
} from './format';

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

const findingLabel = (rule) => (rule?.startsWith('pend.') ? PEND_LABEL[rule.slice(5)] || rule : ruleLabel(rule));

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
              {CATEGORY[f.category] || f.category} · {findingLabel(f.rule)} · <span className="mono">{f.rule}</span>
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
      <div style={{ width: 52, height: 5, background: 'var(--border)', borderRadius: 3, position: 'relative' }}>
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
    ['비보장 제외', -(p.ineligible || 0)],
    ['보장 대상', p.eligible],
    [`자기부담금${p.deductible_basis === 'per_day' ? ` (${p.days}일)` : ''}`, -(p.deductible || 0)],
  ];
  if (p.copay_amount) rows.push([`자기부담 비율 ${Math.round((1 - (p.coverage_ratio ?? 0.7)) * 100)}%`, -p.copay_amount]);
  if (p.limit_reduction) rows.push([`한도 적용 (${CAPPED_BY[p.capped_by] || p.capped_by})`, -p.limit_reduction]);
  return (
    <div className="card card-pad">
      <div className="section-title" style={{ marginBottom: 10 }}>지급액 산정</div>
      {rows.map(([k, v]) => (
        <div key={k} className="row" style={{ justifyContent: 'space-between', fontSize: 13, padding: '4px 0', gap: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
          <span className="mono tnum">{v < 0 ? '−' + fmtKRW(-v) : fmtKRW(v)}</span>
        </div>
      ))}
      <div className="divider" style={{ margin: '8px 0' }} />
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
        <span>지급 예정액</span>
        <span className="mono tnum" style={{ color: 'var(--accent)' }}>{fmtKRW(p.reimbursed)}</span>
      </div>
      {p.capped_by && !p.limit_reduction && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>한도 적용: {CAPPED_BY[p.capped_by] || p.capped_by}</div>}
      {p.copay_method === 'max' && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>자기부담: 정액·비율 중 큰 금액</div>}
    </div>
  );
};

// ── Pend reasons · SIU flags · document checklist ────────────────

const ACTOR_BADGE = { clinic: 'badge-info', owner: 'badge-warning', insurer: 'badge-ok' };

export const PendPanel = ({ reasons, title = '서류 요청 — 지급 대기', sub = '아래 정보가 보완되면 같은 규칙으로 다시 심사합니다.' }) => {
  if (!reasons?.length) return null;
  return (
    <div className="card card-pad" style={{ borderLeft: '3px solid var(--info)' }}>
      <div className="row gap-8" style={{ alignItems: 'center', marginBottom: 2 }}>
        <span style={{ color: 'var(--info)', display: 'flex' }}><I.Inbox size={15} /></span>
        <span className="section-title" style={{ margin: 0 }}>{title}</span>
      </div>
      <div className="section-sub" style={{ marginBottom: 12 }}>{sub}</div>
      <div className="col gap-12">
        {reasons.map((p) => (
          <div key={p.code} className="row gap-12" style={{ alignItems: 'flex-start' }}>
            <span className={'badge ' + (ACTOR_BADGE[p.actor] || '')} style={{ minWidth: 48, justifyContent: 'center' }}>{ACTOR[p.actor] || p.actor}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {PEND_LABEL[p.code] || p.code} <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>{p.code}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-body)', lineHeight: 1.55, marginTop: 2 }}>{p.detail_ko}</div>
              {p.requests?.length > 0 && (
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3 }}>요청 서류: {p.requests.map((d) => DOC_LABEL[d] || d).join(' · ')}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SiuPanel = ({ flags, recordRuleId }) => {
  if (!flags?.length) return null;
  return (
    <div className="card card-pad" style={{ borderLeft: '3px solid var(--critical)' }}>
      <div className="row gap-8" style={{ alignItems: 'center', marginBottom: 2 }}>
        <span style={{ color: 'var(--critical)', display: 'flex' }}><I.Shield size={15} /></span>
        <span className="section-title" style={{ margin: 0 }}>SIU 의뢰 신호</span>
      </div>
      <div className="section-sub" style={{ marginBottom: 12 }}>조사 의뢰 등급의 신호입니다 — 지급 거절 사유가 아닙니다.</div>
      <div className="col gap-12">
        {flags.map((s) => (
          <div key={s.code} style={{ minWidth: 0 }}>
            <div className="row gap-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge-critical">{SIU_LABEL[s.code] || s.code}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{s.title_ko}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-body)', lineHeight: 1.55, marginTop: 4 }}>{s.detail_ko}</div>
            {s.evidence?.length > 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3 }}>{s.evidence.slice(0, 4).join(' · ')}</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', lineHeight: 1.5 }}>
        {recordRuleId
          ? <>진료부(진료기록)는 이 신호가 있을 때만 요청합니다 · <span className="mono">{recordRuleId}</span></>
          : '이 신호는 진료기록으로 확인되지 않아 진료부를 요청하지 않습니다 (병원·청구 이력 비교).'}
      </div>
    </div>
  );
};

const DOC_STATUS = {
  satisfied: { ko: '충족', color: 'var(--accent)', Icon: I.CheckCircle },
  missing: { ko: '누락', color: 'var(--warning)', Icon: I.AlertCircle },
  unknown: { ko: '확인 불가', color: 'var(--text-muted)', Icon: I.Info },
  requested: { ko: '요청', color: 'var(--info)', Icon: I.Clock },
};

export const DocumentChecklist = ({ docs, profile, title = '제출 서류 체크리스트' }) => {
  if (!docs?.length) return null;
  return (
    <div className="card card-pad">
      <div className="section-title" style={{ marginBottom: 2 }}>{title}</div>
      {profile && (
        <div className="section-sub" style={{ marginBottom: 10 }}>
          {profile.name_ko} · {profile.as_of} 기준 · <span style={{ color: profile.verified ? 'var(--accent)' : 'var(--warning)' }}>{profile.verified ? '검증됨' : '미검증 참고자료'}</span>
        </div>
      )}
      <div className="col" style={{ gap: 10 }}>
        {docs.map((d, i) => {
          const st = DOC_STATUS[d.status] || DOC_STATUS.unknown;
          const label = d.status === 'missing' && d.required === false ? '권장' : st.ko;
          const name = d.pend_code === 'ORIGINALS_REQUIRED' ? '원본 서류' : (DOC_LABEL[d.doc_type] || d.doc_type);
          const alts = d.pend_code === 'ORIGINALS_REQUIRED' ? [] : (d.alternatives || []);
          return (
            <div key={i} className="row gap-8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: d.required === false && d.status === 'missing' ? 'var(--text-muted)' : st.color, marginTop: 1, display: 'flex' }}><st.Icon size={14} /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 6, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {name}
                    {alts.length > 0 && <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}> 또는 {alts.map((a) => DOC_LABEL[a] || a).join(' · ')}</span>}
                  </span>
                  <span style={{ fontSize: 11, color: st.color, whiteSpace: 'nowrap', fontWeight: 600 }}>{label}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: 1 }}>
                  {ACTOR[d.actor] || d.actor}{d.required === false ? ' · 조건부' : ''} · {d.why_ko}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Lines and drugs ──────────────────────────────────────────────

const DecisionCell = ({ d }) => {
  if (!d) return <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>;
  const ok = d.eligible;
  return (
    <div style={{ whiteSpace: 'nowrap', lineHeight: 1.3 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: ok ? 'var(--accent)' : 'var(--text-secondary)' }}>
        {ok ? (d.reason_code === 'discount' ? '차감' : '지급') : '제외'}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 5 }}>
        {ok ? BENEFIT_LABEL[d.benefit_type] || d.benefit_type : reasonLabel(d.reason_code)}
      </span>
    </div>
  );
};

export const LinesTable = ({ lines, findings, decisions }) => {
  const flagged = new Set((findings || []).filter((f) => f.severity !== 'info').map((f) => f.item_ref));
  const byIndex = {};
  (decisions || []).filter((d) => (d.source || 'line') === 'line').forEach((d) => { byIndex[d.line_index] = d; });
  return (
    <table className="table">
      <thead>
        <tr><th>청구 원문</th><th>표준 코드</th><th style={{ textAlign: 'right' }}>수량</th><th style={{ textAlign: 'right' }}>금액</th><th>지역 분위</th><th>지급 판정</th></tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={i} style={flagged.has(l.code) ? { background: 'var(--bg-warning-soft)' } : undefined}>
            <td style={{ fontSize: 13, minWidth: 130 }}>{l.description}</td>
            <td style={{ minWidth: 150 }}>
              {l.code ? (
                <div>
                  <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{l.code}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>{l.code_name}</span>
                  {l.match_confidence < 0.8 && <span style={{ fontSize: 10.5, color: 'var(--warning)', marginLeft: 6 }}>({Math.round(l.match_confidence * 100)}%)</span>}
                  {l.components?.length > 1 && <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>묶음: {l.components.join(' + ')}</div>}
                </div>
              ) : l.drug_id ? (
                <div><span className="badge badge-info">약품</span><span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 6 }}>{l.drug_ingredient || l.drug_id}</span></div>
              ) : l.match_method === 'document_fee_text' ? (
                <span className="badge">서류 수수료</span>
              ) : <span className="badge badge-warning">미매핑</span>}
            </td>
            <td className="mono tnum" style={{ textAlign: 'right' }}>{l.quantity}</td>
            <td className="mono tnum" style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }} title={`단가 ${fmtKRW(l.unit_price)}`}>
              {l.total < 0 ? '−' + fmtKRW(-l.total) : fmtKRW(l.total)}
            </td>
            <td><PercentileBar p={l.benchmark_percentile} /></td>
            <td><DecisionCell d={byIndex[i]} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const DrugsTable = ({ drugs, decisions }) => {
  if (!drugs?.length) return <div style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '8px 16px' }}>처방 없음</div>;
  const byIndex = {};
  (decisions || []).filter((d) => d.source === 'prescription').forEach((d) => { byIndex[d.line_index] = d; });
  return (
    <table className="table">
      <thead>
        <tr><th>처방 원문</th><th>성분</th><th>계열</th><th style={{ textAlign: 'right' }}>용량 (mg/kg)</th><th style={{ textAlign: 'right' }}>금액</th><th>지급 판정</th></tr>
      </thead>
      <tbody>
        {drugs.map((d, i) => (
          <tr key={i}>
            <td style={{ fontSize: 13 }}>{d.input_name}</td>
            <td style={{ fontSize: 13 }}>
              {d.ingredient || <span className="badge badge-warning">미확인</span>}
              {d.ingredients?.length > 1 && <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>복합: {d.ingredients.join(' + ')}</div>}
            </td>
            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.therapeutic_class || '—'}</td>
            <td className="mono tnum" style={{ textAlign: 'right' }}>{d.dose_mg_per_kg ?? '—'}</td>
            <td className="mono tnum" style={{ textAlign: 'right' }}>{fmtKRW(d.total)}</td>
            <td><DecisionCell d={byIndex[i]} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ── Full adjudication view ───────────────────────────────────────

export const AdjudicationView = ({ result, claim, header }) => {
  const findings = result.findings || [];
  const actionable = findings.filter((f) => f.severity !== 'info');
  const info = findings.filter((f) => f.severity === 'info');
  const decisions = result.line_decisions || [];
  const profile = result.insurer_profile;
  return (
    <div className="col gap-16">
      <div className="card card-pad">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 320px' }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{result.claim_id}</div>
            {header}
            {claim && (
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>
                {claim.clinic?.name || claim.clinic?.clinic_id} · {claim.clinic?.region || '지역 미상'} · {claim.visit_date} ·{' '}
                {claim.patient?.species === 'cat' ? '고양이' : '개'} {claim.patient?.breed || ''} {claim.patient?.weight_kg ? `${claim.patient.weight_kg}kg` : ''}
                {claim.patient?.registration_no && <> · 등록번호 <span className="mono">{claim.patient.registration_no}</span></>}
              </div>
            )}
            <div className="row gap-8" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              {(result.diagnoses || []).map((d, i) => (
                <span key={i} className="chip">
                  {d.code ? <span className="mono" style={{ fontWeight: 600 }}>{d.code}</span> : <span style={{ color: 'var(--warning)' }}>미매핑</span>}
                  <span>{d.name_ko || d.input}</span>
                  {d.specificity === 'symptom' && <span style={{ color: 'var(--text-muted)' }}>· 증상</span>}
                </span>
              ))}
              {!(result.diagnoses || []).length && <span className="chip" style={{ color: 'var(--warning)' }}>진단명 없음</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <DecisionBadge decision={result.decision} size="lg" />
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>정형화 신뢰도 {Math.round((result.confidence || 0) * 100)}% · 엔진 v{result.engine_version}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              {profile?.name_ko || '기본 프로필'}{claim?.intake_channel ? ` · ${CHANNEL_LABEL[claim.intake_channel] || claim.intake_channel}` : ''}
            </div>
          </div>
        </div>
      </div>

      <PendPanel reasons={result.pend_reasons} />
      <SiuPanel flags={result.siu_flags} recordRuleId={result.record_request_rule_id} />

      <div className="split-detail">
        <div className="col gap-8" style={{ minWidth: 0 }}>
          <div className="section-title">심사 소견 {actionable.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({actionable.length})</span>}</div>
          {actionable.length === 0 && (
            <div className="card card-pad-sm row gap-8" style={{ fontSize: 13, color: 'var(--accent)' }}>
              <I.CheckCircle size={15} /> 지급에 영향을 주는 임상·가격·무결성 소견이 없습니다.
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
        <div className="col gap-16" style={{ minWidth: 0 }}>
          <PayableBreakdown p={result.payable} />
          <DocumentChecklist docs={result.required_documents} profile={profile} />
        </div>
      </div>

      <div className="card" style={{ minWidth: 0 }}>
        <div className="card-pad-sm row" style={{ borderBottom: '1px solid var(--border)', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span className="section-title" style={{ margin: 0 }}>진료 항목 — 표준 코드 매핑 · 항목별 지급 판정</span>
          {result.benefit_type && <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>급여 유형: {BENEFIT_LABEL[result.benefit_type]}</span>}
        </div>
        <div style={{ overflowX: 'auto' }}><LinesTable lines={result.lines || []} findings={findings} decisions={decisions} /></div>
      </div>
      <div className="card" style={{ minWidth: 0 }}>
        <div className="card-pad-sm" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="section-title">처방 약물</span>
        </div>
        <div style={{ overflowX: 'auto' }}><DrugsTable drugs={result.drugs} decisions={decisions} /></div>
      </div>
    </div>
  );
};

export const BarList = ({ rows, format = (v) => v.toLocaleString('en-US'), color = 'var(--accent)', labelWidth = 150, valueWidth = 70 }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="col gap-8">
      {rows.map((r) => (
        <div key={r.key} className="row gap-12" style={{ alignItems: 'center' }}>
          <div style={{ width: labelWidth, fontSize: 12.5, color: 'var(--text-body)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.label}>{r.label}</div>
          <div style={{ flex: 1, height: 8, background: 'var(--bg-canvas)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(r.value / max) * 100}%`, height: '100%', background: r.color || color, borderRadius: 4 }} />
          </div>
          <div className="mono tnum" style={{ width: valueWidth, textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)' }}>{format(r.value)}</div>
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
