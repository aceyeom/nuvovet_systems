import React from 'react';
import { API_BASE_URL } from '../../../lib/api';

const ENDPOINTS = [
  ['POST', '/api/claims/extract', '영수증·진료비 세부내역서 이미지 → 청구 초안 (LLM 전사 전용, 판정 없음 · 이미지 10MB 이하 · 요청 수 제한)'],
  ['POST', '/api/claims/adjudicate', '청구 + 계약 → 표준 코드 정형화, 항목별 지급 판정, 서류 요청(대기) 사유, SIU 신호, 판정과 근거'],
  ['POST', '/api/claims/precheck', '병원용: 제출 전 사전점검 — 병원이 고칠 항목, 발급할 서류 (?insurer_id=kb)'],
  ['GET', '/api/claims/insurers', '보험사별 서류 요건 프로필 (출처 URL · 기준일 · 미검증 표시)'],
  ['GET', '/api/claims/codes', '표준 진료항목(NVP) · 질병(NVD) 코드북'],
  ['GET', '/api/claims/evaluation', '합성 라벨 데이터 기준 엔진 탐지율'],
];

const SAMPLE = `curl -X POST ${API_BASE_URL}/api/claims/adjudicate \\
  -H 'Content-Type: application/json' \\
  -d '{
  "claim": {
    "claim_id": "CLM-0001", "visit_date": "2026-09-14",
    "clinic": {"clinic_id": "H-001", "region": "서울"},
    "patient": {"patient_id": "PET-1", "species": "dog", "breed": "말티즈", "weight_kg": 4.2},
    "diagnoses": [{"text_raw": "외이염", "certainty": "final", "onset_date": "2026-09-12"}],
    "line_items": [{"description": "진찰-초진", "unit_price": 12000},
                   {"description": "검사-귀도말", "unit_price": 15000},
                   {"description": "의료폐기물", "unit_price": 2000}],
    "prescriptions": [{"drug": "베트메딘 1.25mg", "dose_mg_per_kg": 0.25, "frequency": "BID", "days": 30}],
    "documents": [{"doc_type": "RECEIPT_ITEMIZED", "source": "photo"}],
    "intake_channel": "insurer_app", "invoice_total": 29000
  },
  "policy": {"policy_id": "P-1", "start_date": "2026-07-01", "insurer_id": "kb",
             "copay_ratio": 0.3, "deductible": {"amount": 30000, "basis": "per_visit"}}
}'
# v1 본문(diagnoses: ["외이염"], coverage_ratio, deductible_per_visit)도 그대로 받습니다.`;

export default function Integration() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">API 연동</h1>
          <p className="page-subtitle">기존 청구 시스템 앞단에 붙이는 정형화·심사 API</p>
        </div>
      </div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-pad-sm" style={{ borderBottom: '1px solid var(--border)' }}><span className="section-title">엔드포인트</span></div>
          <table className="table">
            <tbody>
              {ENDPOINTS.map(([m, p, d]) => (
                <tr key={p}>
                  <td><span className={'badge ' + (m === 'POST' ? 'badge-info' : 'badge-ok')}>{m}</span></td>
                  <td className="mono" style={{ fontSize: 12 }}>{p}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card card-pad col gap-12">
          <div className="section-title">설계 원칙</div>
          {[
            ['결정은 규칙, 전사는 모델', 'LLM은 문서를 구조화하는 데만 쓰고, 지급 판정은 재현 가능한 규칙이 내립니다. 같은 입력은 항상 같은 결과입니다.'],
            ['자동 거절 없음', '가장 강한 판정은 "지급 거절 권고"이며 심사역이 확정합니다. 정보가 부족하면 "대기 · 서류 요청"으로 필요한 서류와 요청 대상(병원·보호자)을 돌려줍니다.'],
            ['진료부는 SIU 의뢰 시에만', '기본 경로는 영수증·세부내역서·진단서입니다. 진료부는 SIU 신호가 있을 때만 요청하며 그 규칙 ID를 응답에 남깁니다.'],
            ['모든 소견에 규칙 ID와 설명', '소견마다 규칙 ID, 설명, 금액 영향을 반환하고, 근거 데이터(문헌·벤치마크 출처)가 있는 소견은 그 출처를 함께 반환합니다.'],
            ['배포 옵션', 'SaaS 또는 보험사 VPC 내 설치. 개인정보는 가명 ID로 처리합니다. 영수증 이미지는 전사를 위해 외부 LLM API(Anthropic, 국외 처리)로 전송되며 NuvoVet 서버에 저장하지 않습니다.'],
          ].map(([t, d]) => (
            <div key={t}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ marginBottom: 8 }}>요청 예시</div>
        <pre className="mono" style={{ fontSize: 11.5, background: 'var(--bg-canvas)', padding: 14, borderRadius: 8, overflowX: 'auto', margin: 0 }}>{SAMPLE}</pre>
      </div>
    </div>
  );
}
