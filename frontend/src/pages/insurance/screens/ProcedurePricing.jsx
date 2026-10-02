import React, { useMemo, useState } from 'react';
import { loadProcedures } from '../claimsApi';
import { fmtKRW } from '../format';
import { Loading, PercentileBar, useAsync } from '../ui';

const CATEGORY_KO = { consult: '진찰', hospitalization: '입원', lab: '검사', imaging: '영상', treatment: '처치', anesthesia: '마취', surgery: '수술', preventive: '예방', dental: '치과', pharmacy: '약제', non_medical: '비의료', admin: '행정' };
const Z90 = 1.2815515655446004;
const erf = (x) => { // Abramowitz–Stegun 7.1.26
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
};
const percentile = (price, { p10, p50, p90 }) => {
  if (!price) return null;
  const sigma = price >= p50 ? Math.log(p90 / p50) / Z90 : Math.log(p50 / p10) / Z90;
  return 100 * 0.5 * (1 + erf(Math.log(price / p50) / sigma / Math.SQRT2));
};

export default function ProcedurePricing() {
  const { loading, data } = useAsync(loadProcedures, []);
  const [region, setRegion] = useState('서울');
  const [cat, setCat] = useState('all');
  const [probe, setProbe] = useState({});

  const rows = useMemo(() => {
    if (!data) return [];
    const m = data.regionMultipliers[region] ?? data.regionMultipliers.default;
    return data.procedures
      .filter((p) => cat === 'all' || p.category === cat)
      .map((p) => ({ ...p, b: { p10: p.benchmark.p10 * m, p50: p.benchmark.p50 * m, p90: p.benchmark.p90 * m } }));
  }, [data, region, cat]);

  if (loading || !data) return <Loading />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">진료비 벤치마크</h1>
          <p className="page-subtitle">표준 진료항목별 지역 가격 분포 (P10 · 중앙값 · P90)</p>
        </div>
        <div className="page-header-actions">
          <select className="btn btn-secondary" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">전체 분류</option>
            {Object.entries(CATEGORY_KO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="btn btn-secondary" value={region} onChange={(e) => setRegion(e.target.value)}>
            {Object.keys(data.regionMultipliers).filter((r) => r !== 'default').map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="card card-pad-sm" style={{ marginBottom: 16, fontSize: 12.5, color: 'var(--text-secondary)' }}>
        현재 분포는 개발용 <b>추정치</b>이며, 공개 근거가 있는 항목만 출처를 표시합니다(예: 초진료 — 농식품부 2025 진료비 현황조사 전국 평균 ₩10,520).
        파일럿 단계에서 농식품부 진료비 현황조사(20개 항목) · 2026.12 병원별 진료비 공개 자료 · 파트너 보험사 청구 이력으로 교체합니다.
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>코드</th><th>항목</th><th>분류</th><th style={{ textAlign: 'right' }}>P10</th><th style={{ textAlign: 'right' }}>중앙값</th><th style={{ textAlign: 'right' }}>P90</th><th>가격 확인</th><th>출처</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.code}>
                <td className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{p.code}</td>
                <td style={{ fontSize: 13 }}>{p.name_ko} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/{p.unit}</span></td>
                <td style={{ fontSize: 12 }}>{CATEGORY_KO[p.category]}</td>
                <td className="mono tnum" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmtKRW(Math.round(p.b.p10 / 100) * 100)}</td>
                <td className="mono tnum" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtKRW(Math.round(p.b.p50 / 100) * 100)}</td>
                <td className="mono tnum" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmtKRW(Math.round(p.b.p90 / 100) * 100)}</td>
                <td>
                  <div className="row gap-8" style={{ alignItems: 'center' }}>
                    <input placeholder="청구 단가" value={probe[p.code] || ''} onChange={(e) => setProbe({ ...probe, [p.code]: e.target.value.replace(/[^0-9]/g, '') })}
                      style={{ width: 92, padding: '4px 6px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 5 }} />
                    {probe[p.code] && <PercentileBar p={percentile(Number(probe[p.code]), p.b)} />}
                  </div>
                </td>
                <td style={{ fontSize: 11 }}>
                  {p.benchmark.is_estimate ? <span className="badge badge-warning" title={p.benchmark.source}>추정</span> : <span className="badge badge-ok">공개</span>}
                  {p.benchmark.source_url && <span title={p.benchmark.source} style={{ marginLeft: 4, color: 'var(--info)' }}>근거</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
