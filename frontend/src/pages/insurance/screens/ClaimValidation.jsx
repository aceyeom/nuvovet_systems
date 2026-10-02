import React, { useEffect, useMemo, useState } from 'react';
import { I } from '../icons';
import { adjudicateClaim, loadClaimDetail, loadDemo } from '../claimsApi';
import { ANOMALY_LABEL, DECISION, PEND_LABEL, SIU_LABEL, fmtKRW, claimHeadline } from '../format';
import { AdjudicationView, DecisionBadge, Loading, SourceNote, useAsync } from '../ui';
import { ClaimForm, PRESETS, toClaim, toPolicy, today } from '../claimForm';

const FILTERS = [
  { id: 'open', ko: '처리 대상' },
  { id: 'pend', ko: DECISION.pend.short },
  { id: 'review', ko: DECISION.review.ko },
  { id: 'deny_recommended', ko: DECISION.deny_recommended.ko },
  { id: 'auto_approve', ko: DECISION.auto_approve.ko },
  { id: 'all', ko: '전체' },
];

// ── Live composer ────────────────────────────────────────────────

function Composer({ onResult }) {
  const [form, setForm] = useState(() => ({ ...PRESETS[0].claim, visit_date: today }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true); setError('');
    try {
      const claim = toClaim(form);
      onResult(await adjudicateClaim(claim, toPolicy(form)), claim);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad col gap-16">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="section-title">새 청구 심사 — 실시간 엔진</div>
          <div className="section-sub">영수증 원문과 받은 서류를 입력하면 표준 코드 매핑 → 보장·임상·가격·무결성 규칙 → 보험사별 서류 요건을 실행합니다.</div>
        </div>
        <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button key={p.id} className="btn btn-secondary btn-sm" onClick={() => { setForm({ ...p.claim, visit_date: today }); setError(''); }}>{p.ko}</button>
          ))}
        </div>
      </div>
      <ClaimForm form={form} setForm={setForm} />
      <div className="row gap-12" style={{ alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={run} disabled={busy}>{busy ? '심사 중…' : '엔진으로 심사'}</button>
        {error && <span style={{ fontSize: 12.5, color: 'var(--critical)' }}>{error}</span>}
      </div>
    </div>
  );
}

// ── Screen ───────────────────────────────────────────────────────

export default function ClaimValidation({ initialClaimId }) {
  const { loading, data } = useAsync(loadDemo, []);
  const [filter, setFilter] = useState('open');
  const [selected, setSelected] = useState(initialClaimId || null);
  const [detail, setDetail] = useState(null);
  const [composing, setComposing] = useState(false);
  const [live, setLive] = useState(null);

  useEffect(() => { if (initialClaimId) { setSelected(initialClaimId); setComposing(false); } }, [initialClaimId]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    let alive = true;
    loadClaimDetail(selected).then((d) => alive && setDetail(d));
    return () => { alive = false; };
  }, [selected]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.claims.filter((c) => (filter === 'all' ? true : filter === 'open' ? c.decision !== 'auto_approve' : c.decision === filter));
  }, [data, filter]);

  useEffect(() => { if (!selected && rows.length && !composing) setSelected(rows[0].claim_id); }, [rows, selected, composing]);

  if (loading || !data) return <Loading />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">청구 심사</h1>
          <p className="page-subtitle">표준 코드 정형화 → 규칙 기반 심사 → 설명 가능한 판정</p>
        </div>
        <div className="page-header-actions">
          <SourceNote source={data.source} />
          <button className={'btn ' + (composing ? 'btn-secondary' : 'btn-primary')} onClick={() => { setComposing((c) => !c); setLive(null); }}>
            {composing ? <><I.ChevronLeft size={14} />대기열로</> : <><I.Plus size={14} />새 청구 심사</>}
          </button>
        </div>
      </div>

      {composing ? (
        <div className="col gap-16">
          <Composer onResult={(result, claim) => setLive({ result, claim })} />
          {live && <AdjudicationView result={live.result} claim={live.claim} />}
        </div>
      ) : (
        <div className="split-list">
          <div className="card" style={{ position: 'sticky', top: 0, maxHeight: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
            <div className="tabs" style={{ padding: '8px 10px 0', flexWrap: 'wrap' }}>
              {FILTERS.map((f) => (
                <button key={f.id} className={'tab' + (filter === f.id ? ' active' : '')} onClick={() => { setFilter(f.id); setSelected(null); }}>{f.ko}</button>
              ))}
            </div>
            <div style={{ overflowY: 'auto' }}>
              {rows.map((c) => (
                <button key={c.claim_id} onClick={() => setSelected(c.claim_id)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid var(--border)',
                    background: selected === c.claim_id ? 'var(--bg-canvas)' : 'transparent', borderLeft: selected === c.claim_id ? '3px solid var(--accent)' : '3px solid transparent' }}>
                  <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
                    <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{c.claim_id}</span>
                    <DecisionBadge decision={c.decision} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, color: 'var(--text-primary)' }}>{claimHeadline(c)}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>{c.clinic} · {c.diagnosis} · <span className="mono tnum">{fmtKRW(c.billed)}</span></div>
                  {(c.pend_codes?.length > 0 || c.siu?.length > 0) && (
                    <div className="row gap-4" style={{ marginTop: 5, flexWrap: 'wrap' }}>
                      {(c.pend_codes || []).map((p) => <span key={p} className="badge badge-info" style={{ fontSize: 10, padding: '1px 6px' }}>{PEND_LABEL[p] || p}</span>)}
                      {(c.siu || []).map((s) => <span key={s} className="badge badge-critical" style={{ fontSize: 10, padding: '1px 6px' }}>SIU · {SIU_LABEL[s] || s}</span>)}
                    </div>
                  )}
                </button>
              ))}
              {!rows.length && <div style={{ padding: 20, fontSize: 13, color: 'var(--text-muted)' }}>해당 청구가 없습니다.</div>}
            </div>
          </div>
          <div>
            {detail ? (
              <AdjudicationView
                result={detail.adjudication}
                claim={detail.claim}
                header={detail.labels?.length > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                    합성 데이터 정답 라벨: {detail.labels.map((l) => ANOMALY_LABEL[l] || l).join(', ')}
                  </div>
                )}
              />
            ) : <div className="card card-pad" style={{ color: 'var(--text-muted)', fontSize: 13 }}>청구를 선택하세요.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
