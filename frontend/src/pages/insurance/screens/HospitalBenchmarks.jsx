import React, { useMemo, useState } from 'react';
import { loadDemo } from '../claimsApi';
import { fmtKRW, fmtKRWShort, fmtPct, claimHeadline } from '../format';
import { DecisionBadge, Loading, SourceNote, useAsync } from '../ui';

export default function HospitalBenchmarks({ onOpenClaim }) {
  const { loading, data } = useAsync(loadDemo, []);
  const [open, setOpen] = useState(null);
  const [sort, setSort] = useState('at_risk');

  const clinics = useMemo(() => {
    if (!data) return [];
    const list = data.summary.clinics.map((c) => ({ ...c, rate: c.flagged / c.claims, share: c.billed ? c.at_risk / c.billed : 0 }));
    return list.sort((a, b) => b[sort] - a[sort]);
  }, [data, sort]);

  if (loading || !data) return <Loading />;
  const maxShare = Math.max(...clinics.map((c) => c.share), 0.01);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">병원 리스크</h1>
          <p className="page-subtitle">병원별 청구 패턴 — 청구액 대비 검토 대상 금액 비중</p>
        </div>
        <div className="page-header-actions">
          <SourceNote source={data.source} />
          <select className="btn btn-secondary" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="at_risk">검토 대상 금액순</option>
            <option value="share">검토 비중순</option>
            <option value="rate">검토 비율순</option>
            <option value="billed">청구액순</option>
          </select>
        </div>
      </div>
      <p className="section-sub" style={{ marginBottom: 12 }}>
        개별 청구 소견을 병원 단위로 누적합니다. 단일 청구로는 우연일 수 있는 가격 이탈이 병원 수준에서 반복되면 계약·심사 정책 검토 대상이 됩니다.
      </p>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>병원</th><th>지역</th><th style={{ textAlign: 'right' }}>청구</th><th style={{ textAlign: 'right' }}>청구액</th><th style={{ textAlign: 'right' }}>검토 비율</th><th style={{ textAlign: 'right' }}>서류 요청</th><th style={{ textAlign: 'right' }}>SIU</th><th>검토 대상 비중</th><th style={{ textAlign: 'right' }}>검토 대상 금액</th></tr>
          </thead>
          <tbody>
            {clinics.map((c) => (
              <React.Fragment key={c.clinic_id}>
                <tr onClick={() => setOpen(open === c.clinic_id ? null : c.clinic_id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{c.name} <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{c.clinic_id}</span></td>
                  <td>{c.region}</td>
                  <td className="mono tnum" style={{ textAlign: 'right' }}>{c.claims}</td>
                  <td className="mono tnum" style={{ textAlign: 'right' }}>{fmtKRWShort(c.billed)}</td>
                  <td className="mono tnum" style={{ textAlign: 'right' }}>{fmtPct(c.rate, 0)}</td>
                  <td className="mono tnum" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{c.pended ?? 0}</td>
                  <td className="mono tnum" style={{ textAlign: 'right', color: c.siu ? 'var(--critical)' : 'var(--text-faint)', fontWeight: c.siu ? 600 : 400 }}>{c.siu ?? 0}</td>
                  <td>
                    <div className="row gap-8" style={{ alignItems: 'center' }}>
                      <div style={{ width: 120, height: 6, background: 'var(--bg-canvas)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${(c.share / maxShare) * 100}%`, height: '100%', background: c.share > 0.25 ? 'var(--critical)' : c.share > 0.1 ? 'var(--warning)' : 'var(--accent)' }} />
                      </div>
                      <span className="mono tnum" style={{ fontSize: 11.5 }}>{fmtPct(c.share, 0)}</span>
                    </div>
                  </td>
                  <td className="mono tnum" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtKRW(c.at_risk)}</td>
                </tr>
                {open === c.clinic_id && (
                  <tr>
                    <td colSpan={9} style={{ background: 'var(--bg-canvas)', padding: '8px 16px' }}>
                      {data.claims.filter((x) => x.clinic === c.name && x.decision !== 'auto_approve').slice(0, 8).map((x) => (
                        <button key={x.claim_id} className="row gap-12" onClick={() => onOpenClaim(x.claim_id)}
                          style={{ width: '100%', padding: '6px 0', background: 'transparent', alignItems: 'center', textAlign: 'left' }}>
                          <span className="mono" style={{ fontSize: 11.5, width: 150 }}>{x.claim_id}</span>
                          <DecisionBadge decision={x.decision} />
                          <span style={{ fontSize: 12.5, flex: 1 }}>{claimHeadline(x)}</span>
                          <span className="mono tnum" style={{ fontSize: 12 }}>{fmtKRW(x.billed)}</span>
                        </button>
                      ))}
                      {!data.claims.some((x) => x.clinic === c.name && x.decision !== 'auto_approve') && <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>검토 대상 청구 없음</span>}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
