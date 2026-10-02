import React from 'react';
import { API_BASE_URL } from '../../../lib/api';

const ENDPOINTS = [
  ['POST', '/api/claims/extract', '영수증·진료비 세부내역서 이미지 → 청구 초안 (LLM 전사 전용, 판정 없음)'],
  ['POST', '/api/claims/adjudicate', '청구 + 계약 → 표준 코드 정형화, 지급액 산정, 판정과 근거'],
  ['POST', '/api/claims/precheck', '병원용: 제출 전 청구 사전점검 (미매핑 항목, 비보장 항목, 임상 경고)'],
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
    "diagnoses": ["외이염"],
    "line_items": [{"description": "초진료", "unit_price": 12000},
                   {"description": "귀 도말검사", "unit_price": 15000}],
    "prescriptions": [{"drug": "베트메딘 1.25mg", "dose_mg_per_kg": 0.25, "frequency": "BID", "days": 30}]
  },
  "policy": {"policy_id": "P-1", "start_date": "2026-07-01", "coverage_ratio": 0.7, "deductible_per_visit": 30000}
}'`;

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
            ['자동 거절 없음', '가장 강한 판정은 "지급 거절 권고"이며 심사역이 확정합니다.'],
            ['모든 소견에 근거', '규칙 ID, 금액 영향, 근거 데이터(문헌·벤치마크 출처)를 함께 반환합니다.'],
            ['배포 옵션', 'SaaS 또는 보험사 VPC 내 설치. 개인정보는 가명 ID로 처리하며 영수증 이미지는 저장하지 않습니다.'],
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
