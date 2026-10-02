import React from 'react';
import { I } from './icons';

const isoDay = (d) => d.toISOString().slice(0, 10);
export const today = isoDay(new Date());
const monthsAgo = (m) => { const d = new Date(); d.setMonth(d.getMonth() - m); return isoDay(d); };
export const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

export const INSURER_OPTIONS = [
  ['default', '기본 (보험사 미지정)'], ['kb', 'KB손해보험'], ['samsung', '삼성화재'], ['meritz', '메리츠화재'], ['db', 'DB손해보험'],
  ['hyundai', '현대해상'], ['nh', 'NH농협손해보험'], ['lotte', '롯데손해보험'], ['mybrown', '마이브라운'],
];

// Attachable documents (schema v2 Document). Imaging is offered with and without the capture timestamp.
export const DOC_OPTIONS = {
  RECEIPT_ITEMIZED: { ko: '항목별 영수증', make: () => ({ doc_type: 'RECEIPT_ITEMIZED' }) },
  RECEIPT_TOTAL_ONLY: { ko: '합계 영수증', make: () => ({ doc_type: 'RECEIPT_TOTAL_ONLY' }) },
  DETAIL_STATEMENT: { ko: '세부내역서', make: () => ({ doc_type: 'DETAIL_STATEMENT' }) },
  DX_CERT_STATUTORY: { ko: '진단서', make: () => ({ doc_type: 'DX_CERT_STATUTORY' }) },
  IMAGING_TS: { ko: '영상 (촬영 일시 표시)', make: (f) => ({ doc_type: 'IMAGING', captured_at: `${f.visit_date || today}T10:00:00` }) },
  IMAGING: { ko: '영상 (일시 없음)', make: () => ({ doc_type: 'IMAGING' }) },
  PET_PHOTO_FRONT: { ko: '정면 사진', make: () => ({ doc_type: 'PET_PHOTO_FRONT' }) },
  PET_PHOTO_SIDE: { ko: '측면 사진', make: () => ({ doc_type: 'PET_PHOTO_SIDE' }) },
  REGISTRATION_CERT: { ko: '동물등록증', make: () => ({ doc_type: 'REGISTRATION_CERT' }) },
};
const REG = '410123456789012';

export const PRESETS = [
  {
    id: 'derm_mri', ko: '피부염 + MRI',
    claim: {
      species: 'dog', breed: '말티즈', weight_kg: 4.2, region: '서울', diagnoses: '알레르기성 피부염', policy_start: monthsAgo(14),
      insurer_id: 'default', registration_no: REG, docs: ['RECEIPT_ITEMIZED', 'DETAIL_STATEMENT'],
      lines: [['초진료', 1, 12000], ['피부 세포검사', 1, 22000], ['혈액검사(CBC)', 1, 38000], ['MRI 촬영', 1, 1250000], ['위생미용', 1, 35000]],
      rx: [['아포퀠 5.4mg', 0.5, 'BID', 14, 2500, 28]],
    },
  },
  {
    id: 'chronic', ko: '외이염 청구 + 심장약',
    claim: {
      species: 'dog', breed: '토이푸들', weight_kg: 3.8, region: '경기', diagnoses: '외이염', policy_start: monthsAgo(2),
      insurer_id: 'meritz', registration_no: REG, docs: ['RECEIPT_ITEMIZED'],
      lines: [['초진료', 1, 10000], ['귀 도말검사', 1, 15000], ['귀 세척', 1, 15000], ['귀약', 1, 18000]],
      rx: [['베트메딘 1.25mg', 0.25, 'BID', 30, 1500, 60], ['라식스', 1.5, 'BID', 30, 600, 60]],
    },
  },
  {
    id: 'cat_tylenol', ko: '고양이 + 타이레놀',
    claim: {
      species: 'cat', breed: '코리안 숏헤어', weight_kg: 4.1, region: '부산', diagnoses: '방광염', policy_start: monthsAgo(20),
      insurer_id: 'default', registration_no: '', docs: ['RECEIPT_ITEMIZED', 'PET_PHOTO_FRONT', 'PET_PHOTO_SIDE'],
      lines: [['초진료', 1, 11000], ['요검사', 1, 20000], ['복부 방사선', 2, 30000]],
      rx: [['타이레놀', 10, 'BID', 3, 500, 6]],
    },
  },
  {
    id: 'clean', ko: '정상 청구',
    claim: {
      species: 'dog', breed: '비숑 프리제', weight_kg: 6.5, region: '대전', diagnoses: '급성 위장염', policy_start: monthsAgo(30),
      insurer_id: 'default', registration_no: REG, docs: ['RECEIPT_ITEMIZED', 'DETAIL_STATEMENT'],
      lines: [['초진료', 1, 10000], ['혈액검사(CBC)', 1, 35000], ['복부 방사선', 2, 30000], ['정맥 수액 처치', 1, 40000]],
      rx: [['세레니아', 1, 'SID', 3, 3000, 3], ['파모티딘', 0.5, 'BID', 5, 300, 10]],
    },
  },
  {
    id: 'total_only', ko: '합계만 있는 영수증',
    claim: {
      species: 'dog', breed: '시츄', weight_kg: 6.1, region: '인천', diagnoses: '외이염', policy_start: monthsAgo(18),
      insurer_id: 'default', registration_no: REG, docs: ['RECEIPT_TOTAL_ONLY'],
      lines: [['진료비 합계', 1, 86000]],
      rx: [],
    },
  },
  {
    id: 'surgery_nocert', ko: '수술 · 진단서 없음',
    claim: {
      species: 'dog', breed: '포메라니안', weight_kg: 3.2, region: '서울', diagnoses: '슬개골 탈구 3기 (좌측)', policy_start: monthsAgo(26),
      insurer_id: 'samsung', registration_no: '', docs: ['RECEIPT_ITEMIZED', 'IMAGING'],
      lines: [['진찰-초진', 1, 12000], ['검사-X-ray(경상)', 2, 35000], ['마취-호흡마취(30분)', 1, 150000], ['수술-슬개골탈구(MPL) 교정술', 1, 1350000], ['입원-소형견(1일)', 2, 60000]],
      rx: [['메타캄 현탁액', 0.1, 'SID', 7, 1500, 7]],
    },
  },
];

export const emptyForm = () => ({
  species: 'dog', breed: '', weight_kg: '', region: '서울', diagnoses: '', policy_start: monthsAgo(24), visit_date: today,
  insurer_id: 'default', registration_no: '', docs: ['RECEIPT_ITEMIZED'], lines: [['', 1, '']], rx: [],
});

export const toClaim = (f, idPrefix = 'LIVE', docSource = 'photo') => ({
  claim_id: `${idPrefix}-${Date.now().toString(36).toUpperCase()}`,
  visit_date: f.visit_date || today,
  submitted_date: today,
  clinic: { clinic_id: 'DEMO-CLINIC', name: f.clinic_name || '입력 병원', region: f.region },
  patient: { patient_id: 'DEMO-PET', species: f.species, breed: f.breed || null, weight_kg: Number(f.weight_kg) || null,
    registration_no: f.registration_no || null },
  diagnoses: (f.diagnoses || '').split(',').map((s) => s.trim()).filter(Boolean),
  line_items: f.lines.filter((l) => l[0]).map(([description, quantity, unit_price]) => ({ description, quantity: Number(quantity) || 1, unit_price: Number(unit_price) || 0 })),
  prescriptions: f.rx.filter((r) => r[0]).map(([drug, dose, frequency, days, unit_price, quantity]) => ({
    drug, dose_mg_per_kg: dose === '' || dose === null ? null : Number(dose), frequency, days: Number(days) || null,
    unit_price: Number(unit_price) || 0, quantity: Number(quantity) || 1,
  })),
  ...(Array.isArray(f.docs) ? { documents: f.docs.filter((id) => DOC_OPTIONS[id]).map((id) => ({ ...DOC_OPTIONS[id].make(f), source: docSource })) } : {}),
  intake_channel: idPrefix === 'CLINIC' ? 'nuvovet_precheck' : 'insurer_app',
});

export const toPolicy = (f) => ({
  policy_id: 'DEMO-POLICY', start_date: f.policy_start, coverage_ratio: 0.7, deductible_per_visit: 30000, per_visit_limit: null,
  insurer_id: f.insurer_id || 'default',
});

// Map an extraction draft (POST /api/claims/extract) onto the form.
export const fromDraft = (draft, base) => ({
  ...base,
  clinic_name: draft.clinic_name || base.clinic_name,
  visit_date: draft.visit_date || base.visit_date,
  species: draft.species === 'cat' ? 'cat' : draft.species === 'dog' ? 'dog' : base.species,
  breed: draft.breed || base.breed,
  weight_kg: draft.weight_kg ?? base.weight_kg,
  diagnoses: draft.diagnoses?.length ? draft.diagnoses.join(', ') : base.diagnoses,
  lines: draft.line_items?.length ? draft.line_items.map((l) => [l.description, l.quantity, l.unit_price]) : base.lines,
  rx: draft.prescriptions?.length ? draft.prescriptions.map((r) => [r.drug, '', r.frequency || 'BID', r.days || '', '', 1]) : base.rx,
});

const cellInput = { width: '100%', padding: '6px 8px', fontSize: 12.5, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)' };

const DocChips = ({ form, set, label }) => {
  const docs = form.docs || [];
  const toggle = (id) => set('docs', docs.includes(id) ? docs.filter((d) => d !== id) : [...docs, id]);
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
        {Object.entries(DOC_OPTIONS).map(([id, o]) => {
          const on = docs.includes(id);
          return (
            <button key={id} type="button" className="chip" onClick={() => toggle(id)}
              style={{ height: 28, background: on ? 'var(--bg-ok-soft)' : 'var(--bg-card)', borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {on ? <I.Check size={12} /> : <I.Plus size={12} />}{o.ko}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export function ClaimForm({ form, setForm, showPolicy = true }) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCell = (key, i, j, v) => setForm((f) => ({ ...f, [key]: f[key].map((row, ri) => (ri === i ? row.map((c, ci) => (ci === j ? v : c)) : row)) }));
  return (
    <div className="col gap-16">
      <div className="grid-4" style={{ gap: 12 }}>
        <label style={{ fontSize: 12 }}>종
          <select style={cellInput} value={form.species} onChange={(e) => set('species', e.target.value)}>
            <option value="dog">개</option><option value="cat">고양이</option>
          </select>
        </label>
        <label style={{ fontSize: 12 }}>품종<input style={cellInput} value={form.breed} onChange={(e) => set('breed', e.target.value)} /></label>
        <label style={{ fontSize: 12 }}>체중 (kg)<input style={cellInput} value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} /></label>
        <label style={{ fontSize: 12 }}>병원 지역
          <select style={cellInput} value={form.region} onChange={(e) => set('region', e.target.value)}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12 }}>진단명 (쉼표 구분)<input style={cellInput} value={form.diagnoses} onChange={(e) => set('diagnoses', e.target.value)} /></label>
        <label style={{ fontSize: 12 }}>진료일<input type="date" style={cellInput} value={form.visit_date} onChange={(e) => set('visit_date', e.target.value)} /></label>
        {showPolicy && <label style={{ fontSize: 12 }}>보험 개시일<input type="date" style={cellInput} value={form.policy_start} onChange={(e) => set('policy_start', e.target.value)} /></label>}
        <label style={{ fontSize: 12 }}>{showPolicy ? '보험사 (서류 요건 프로필)' : '청구할 보험사'}
          <select style={cellInput} value={form.insurer_id || 'default'} onChange={(e) => set('insurer_id', e.target.value)}>
            {INSURER_OPTIONS.map(([id, ko]) => <option key={id} value={id}>{ko}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12 }}>동물등록번호 (선택)<input style={cellInput} value={form.registration_no || ''} placeholder="미등록이면 비워 두세요" onChange={(e) => set('registration_no', e.target.value)} /></label>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'end', paddingBottom: 6, ...(showPolicy ? {} : { gridColumn: '1 / -1', paddingBottom: 0 }) }}>
          {showPolicy ? '상품: 보장 70% · 자기부담 ₩30,000' : '예상 보험금은 표준 상품(보장 70% · 자기부담 ₩30,000) 기준입니다. 서류 요건은 선택한 보험사 프로필(미검증 참고자료)을 따릅니다.'}
        </div>
      </div>

      <DocChips form={form} set={set} label={showPolicy ? '첨부 서류 (보험사가 받은 서류)' : '발급할 서류 (보호자에게 드릴 서류를 선택하면 다시 점검합니다)'} />

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>진료비 세부내역 (영수증 원문 · 수량 · 단가)</div>
        {form.lines.map((l, i) => (
          <div key={i} className="row gap-8" style={{ marginBottom: 6 }}>
            <input style={{ ...cellInput, flex: 3 }} placeholder="항목명" value={l[0]} onChange={(e) => setCell('lines', i, 0, e.target.value)} />
            <input style={{ ...cellInput, flex: 0.6 }} placeholder="수량" value={l[1]} onChange={(e) => setCell('lines', i, 1, e.target.value)} />
            <input style={{ ...cellInput, flex: 1.2 }} placeholder="단가" value={l[2]} onChange={(e) => setCell('lines', i, 2, e.target.value)} />
            <button className="icon-btn" title="삭제" onClick={() => set('lines', form.lines.filter((_, k) => k !== i))}><I.X size={14} /></button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => set('lines', [...form.lines, ['', 1, '']])}><I.Plus size={13} />항목 추가</button>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>처방 (약품명 · mg/kg · 횟수 · 일수 · 단가 · 수량)</div>
        {form.rx.map((r, i) => (
          <div key={i} className="row gap-8" style={{ marginBottom: 6 }}>
            <input style={{ ...cellInput, flex: 2.2 }} placeholder="약품명 (한글 상품명 가능)" value={r[0]} onChange={(e) => setCell('rx', i, 0, e.target.value)} />
            <input style={{ ...cellInput, flex: 0.8 }} placeholder="mg/kg" value={r[1]} onChange={(e) => setCell('rx', i, 1, e.target.value)} />
            <select style={{ ...cellInput, flex: 0.8 }} value={r[2]} onChange={(e) => setCell('rx', i, 2, e.target.value)}>
              {['SID', 'BID', 'TID', 'QID', 'EOD'].map((x) => <option key={x}>{x}</option>)}
            </select>
            <input style={{ ...cellInput, flex: 0.6 }} placeholder="일수" value={r[3]} onChange={(e) => setCell('rx', i, 3, e.target.value)} />
            <input style={{ ...cellInput, flex: 0.8 }} placeholder="단가" value={r[4]} onChange={(e) => setCell('rx', i, 4, e.target.value)} />
            <input style={{ ...cellInput, flex: 0.6 }} placeholder="수량" value={r[5]} onChange={(e) => setCell('rx', i, 5, e.target.value)} />
            <button className="icon-btn" title="삭제" onClick={() => set('rx', form.rx.filter((_, k) => k !== i))}><I.X size={14} /></button>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => set('rx', [...form.rx, ['', '', 'BID', 7, '', 14]])}><I.Plus size={13} />처방 추가</button>
      </div>
    </div>
  );
}
