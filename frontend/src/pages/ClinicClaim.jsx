import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './insurance/insurance.css';
import { I } from './insurance/icons';
import { extractReceipt, precheckClaim } from './insurance/claimsApi';
import { ClaimForm, PRESETS, emptyForm, fromDraft, toClaim, today } from './insurance/claimForm';
import { DocumentChecklist, FindingCard, LinesTable, DrugsTable, PayableBreakdown } from './insurance/ui';
import { DOC_LABEL, PEND_LABEL } from './insurance/format';

const EXAMPLES = [[3, '정상 청구'], [4, '합계만 있는 영수증'], [5, '수술 · 진단서 없음']];

const VALUE = [
  ['보호자 문의 감소', '보험사가 문제 삼을 항목(비보장 항목, 코드 미매핑, 진단과 맞지 않는 처방)을 수납 전에 확인합니다.'],
  ['표준 코드 자동 정리', '영수증 원문을 자체 표준 코드(NVP 진료항목 · NVD 질병)로 정리합니다. 농식품부 「동물 진료의 권장 표준」 코드표와의 매핑은 준비 중입니다.'],
  ['병원 데이터는 병원 소유', '보호자 동의 하에 청구 건만 전송합니다. 병원 식별 정보를 제3자에게 판매하지 않습니다.'],
];

export default function ClinicClaim() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({ ...PRESETS[3].claim, visit_date: today, clinic_name: '' }));
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  // Receipt photos go to an external AI API for transcription: the clinic confirms owner consent first.
  const [uploadConsent, setUploadConsent] = useState(false);
  const fileRef = useRef(null);

  const run = async (f = form) => {
    setBusy('check'); setError('');
    try {
      setResult(await precheckClaim(toClaim(f, 'CLINIC', 'emr'), f.insurer_id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  // Once a result is on screen, ticking a document to issue (or switching insurer) re-runs the check.
  const docsKey = `${(form.docs || []).join(',')}|${form.insurer_id}`;
  const lastKey = useRef(docsKey);
  useEffect(() => {
    if (result && lastKey.current !== docsKey) run(form);
    lastKey.current = docsKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docsKey]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadConsent) return;
    setBusy('extract'); setError('');
    try {
      const draft = await extractReceipt(file);
      setForm((f) => fromDraft(draft, f));
      setResult(null);
    } catch (err) {
      setError(`영수증 인식 실패: ${err.message}`);
    } finally {
      setBusy('');
      e.target.value = '';
    }
  };

  const actions = result?.clinic_actions || [];
  const actionRules = new Set(actions.map((a) => a.rule));
  const blocking = result?.issues?.filter((i) => i.severity !== 'info' && !actionRules.has(i.rule)) || [];
  const notes = result?.issues?.filter((i) => i.severity === 'info') || [];
  const owner = result?.owner_guidance || [];

  return (
    <div className="nuvo-insurance" style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="row gap-12" style={{ alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/start')}>
          <span style={{ fontSize: 21, fontWeight: 900, letterSpacing: '-0.045em', color: '#0A0A0A' }}>nuvovet</span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: '#0E7F6A', textTransform: 'uppercase' }}>Clinic</span>
        </div>
        <div className="row gap-8">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dur')} title="임상 검증되지 않은 교육용 프로토타입입니다">교육용 DUR 프로토타입</button>
          <span className="badge badge-warning">데모</span>
        </div>
      </header>

      <div className="page" style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">보험 청구 사전점검</h1>
            <p className="page-subtitle">보호자에게 서류를 드리기 전에, 보험사가 볼 화면 그대로 확인하세요. 무료.</p>
          </div>
        </div>

        <div className="grid-3" style={{ marginBottom: 16 }}>
          {VALUE.map(([t, d]) => (
            <div key={t} className="card card-pad-sm">
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>

        <div className="card card-pad col gap-16">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div className="section-title">진료비 내역</div>
              <div className="section-sub">영수증 사진을 올리거나 직접 입력하세요. 항목명은 원문 그대로 두면 됩니다.</div>
            </div>
            <div className="row gap-8">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={onFile} />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fileRef.current?.click()}
                disabled={!!busy || !uploadConsent}
                title={uploadConsent ? undefined : '아래 동의 항목을 먼저 확인하세요'}
                style={uploadConsent ? undefined : { opacity: 0.45, cursor: 'not-allowed' }}
              >
                <I.Download size={13} />{busy === 'extract' ? '인식 중…' : '영수증 사진으로 채우기'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setForm(emptyForm()); setResult(null); }}>초기화</button>
            </div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)', marginTop: -6, cursor: 'pointer' }}>
            <input type="checkbox" checked={uploadConsent} onChange={(e) => setUploadConsent(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              영수증 사진을 올리기 전에 확인하세요: 보호자의 동의를 받았으며, 영수증 이미지는 글자 인식(전사)을 위해
              외부 AI API(Anthropic, 국외 처리)로 전송되고 NuvoVet 서버에는 저장되지 않습니다. 직접 입력할 때는 필요 없습니다.
            </span>
          </label>
          <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>예시</span>
            {EXAMPLES.map(([i, ko]) => (
              <button key={i} className="btn btn-secondary btn-sm" onClick={() => { setForm({ ...PRESETS[i].claim, visit_date: today, clinic_name: '' }); setResult(null); }}>{ko}</button>
            ))}
          </div>
          <ClaimForm form={form} setForm={setForm} showPolicy={false} />
          <div className="row gap-12" style={{ alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => run()} disabled={!!busy}>{busy === 'check' ? '점검 중…' : '사전점검 실행'}</button>
            {error && <span style={{ fontSize: 12.5, color: 'var(--critical)' }}>{error}</span>}
          </div>
        </div>

        {result && (
          <div className="col gap-16" style={{ marginTop: 16 }}>
            <div className="card card-pad row gap-12" style={{ alignItems: 'center', borderLeft: `4px solid ${result.ready_to_submit ? 'var(--accent)' : 'var(--warning)'}` }}>
              <span style={{ color: result.ready_to_submit ? 'var(--accent)' : 'var(--warning)' }}>
                {result.ready_to_submit ? <I.CheckCircle size={22} /> : <I.AlertCircle size={22} />}
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{result.ready_to_submit ? '제출 준비 완료' : `확인이 필요한 항목 ${result.blocking_count}건`}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {result.ready_to_submit
                    ? '보험사 심사에서 문제가 될 항목이 발견되지 않았습니다. 아래 서류를 함께 발급하세요.'
                    : '아래 항목을 고치거나 필요한 서류를 함께 발급하면, 보호자가 서류를 다시 받으러 오지 않아도 됩니다.'}
                  {result.insurer_profile && <> · {result.insurer_profile.name_ko} 기준</>}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 340px)', gap: 16, alignItems: 'start' }}>
              <div className="col gap-8" style={{ minWidth: 0 }}>
                {actions.length > 0 && <div className="section-title">병원에서 처리할 일 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({actions.length})</span></div>}
                {actions.map((f, i) => <FindingCard key={'a' + i} f={{ ...f, evidence: (f.requests || []).length ? [`발급 서류: ${f.requests.map((d) => DOC_LABEL[d] || d).join(' · ')}`] : [] }} />)}
                {(blocking.length > 0 || notes.length > 0) && <div className="section-title" style={{ marginTop: actions.length ? 8 : 0 }}>심사 소견</div>}
                {blocking.map((f, i) => <FindingCard key={i} f={f} />)}
                {notes.map((f, i) => <FindingCard key={'n' + i} f={f} />)}
                {!actions.length && !blocking.length && !notes.length && <div className="card card-pad-sm" style={{ fontSize: 13, color: 'var(--accent)' }}>소견 없음</div>}
                {owner.length > 0 && (
                  <div className="card card-pad-sm" style={{ marginTop: 8, borderLeft: '3px solid var(--warning)' }}>
                    <div className="section-title" style={{ marginBottom: 6 }}>보호자에게 안내할 사항 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>병원 조치 불필요</span></div>
                    {owner.map((g) => (
                      <div key={g.code} style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 4 }}>
                        <b style={{ fontWeight: 600 }}>{PEND_LABEL[g.code] || g.code}</b> — {g.detail}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="col gap-16" style={{ minWidth: 0 }}>
                <DocumentChecklist docs={result.documents_to_issue} profile={result.insurer_profile} title="병원이 발급할 서류" />
                <PayableBreakdown p={result.estimated_payable} />
              </div>
            </div>
            <div className="card">
              <div className="card-pad-sm" style={{ borderBottom: '1px solid var(--border)' }}><span className="section-title">표준 코드로 정리된 청구 · 항목별 지급 판정</span></div>
              <div style={{ overflowX: 'auto' }}><LinesTable lines={result.standardized.lines} findings={result.issues} decisions={result.line_decisions} /></div>
            </div>
            <div className="card">
              <div className="card-pad-sm" style={{ borderBottom: '1px solid var(--border)' }}><span className="section-title">처방</span></div>
              <div style={{ overflowX: 'auto' }}><DrugsTable drugs={result.standardized.drugs} decisions={result.line_decisions} /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
