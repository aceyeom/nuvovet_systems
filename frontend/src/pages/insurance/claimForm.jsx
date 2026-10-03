// Claim input form shared by the clinic pre-check (/clinic/claim) and any console screen that builds a
// claim by hand. DESIGN_SYSTEM.md §5.4: labelled fields in two columns, editable line-item and
// prescription grids, won amounts with thousands separators, dates with a Korean echo.
//
// Stable exports (WP6 may import them; §8.2 WP7): ClaimForm, PRESETS, emptyForm, fromDraft, toClaim,
// today, plus REGIONS, INSURER_OPTIONS, DOC_OPTIONS and toPolicy. The form shape and the request payload
// built by toClaim are unchanged.
import { Plus } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Button } from '@/ui/primitives/button'
import { Card, CardContent, CardHeader } from '@/ui/primitives/card'
import { Checkbox } from '@/ui/primitives/checkbox'
import { Input } from '@/ui/primitives/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/ui/primitives/input-group'
import { Label } from '@/ui/primitives/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select'
import { Field } from '@/ui/patterns/Field'
import { fmtDate, fmtNum } from '@/ui/lib/format'
import { EditableGrid } from '@/ui/ext/wp7/EditableGrid'
import { DecimalInput, IntegerInput } from '@/ui/ext/wp7/NumberInput'
import { SuggestInput } from '@/ui/patterns/Autocomplete'

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

// ── Display helpers ──────────────────────────────────────────────

/** Frequency codes stay the payload values; the form shows them in Korean. */
export const FREQUENCY_OPTIONS = [['SID', '1일 1회'], ['BID', '1일 2회'], ['TID', '1일 3회'], ['QID', '1일 4회'], ['EOD', '2일 1회']];

/** 수량 × 단가 for one grid row, the way toClaim reads it (empty 수량 counts as 1); null while 단가 is empty. */
export const rowAmount = (qty, price) =>
  price === '' || price == null ? null : Math.round((Number(qty) || 1) * (Number(price) || 0));
const sumRows = (rows, qi, pi) => rows.reduce((s, r) => s + (r[0] ? rowAmount(r[qi], r[pi]) || 0 : 0), 0);
/** Billed total of the form (line items + prescriptions), as toClaim would send it. */
export const formTotal = (f) => sumRows(f.lines || [], 1, 2) + sumRows(f.rx || [], 5, 4);

// Korean ingredient and product names the engine's drug dictionary resolves (backend
// claims/data/kr_drug_aliases.json, Hangul entries only). "성분:상품,상품" per entry. Suggestions only:
// the field stays free text.
const DRUG_NAME_SOURCE =
  '멜록시캄:메타캄,페트캄|카프로펜:리마딜,카프로딜|피로콕시브:프리비콕스|로베나콕시브:온시올|그라피프란트:갈리프란트|' +
  '아세트아미노펜:타이레놀,파라세타몰|트라마돌:트리돌,울트람|가바펜틴:뉴론틴|부프레노르핀:부프레넥스|부토르파놀:토르부게식|' +
  '오클라시티닙:아포퀠|로키베트맙:사이토포인트|사이클로스포린:아토피카,산디문,네오랄|사이클로스포린 점안:옵티뮨,레스타시스|' +
  '프레드니솔론:프레드니손,소론도|메틸프레드니솔론:메드롤,솔루메드롤|덱사메타손:덱사|엔로플록사신:바이트릴|마르보플록사신:마보실|' +
  '아목시실린클라불란산:클라바목스,오구멘틴,아목시클라브|아목시실린:|세팔렉신:케플렉스,릴렉신|세포베신:컨베니아|클린다마이신:안티로브|' +
  '독시사이클린:비브라마이신|메트로니다졸:후라시닐,플라질|이버멕틴:하트가드|셀라멕틴:레볼루션|아폭솔라너:넥스가드|플루랄라너:브라벡토|' +
  '사롤라너:심파리카|셀라멕틴·사롤라너:레볼루션플러스|밀베마이신:인터셉터,밀베맥스|피프로닐:프론트라인|프라지콴텔:드론탈,드론시트|' +
  '펜벤다졸:파나쿠어|퍼메트린:|마로피탄트:세레니아|온단세트론:조프란|메토클로프라미드:맥페란|파모티딘:가스터|오메프라졸:로섹|' +
  '에스오메프라졸:넥시움|수크랄페이트:아루사루민|우르소데옥시콜산:우루사|사메:데노실|피모벤단:베트메딘,피모벤|푸로세미드:라식스|' +
  '스피로노락톤:알닥톤|베나제프릴:포르테코|에날라프릴:에나칼,레니텍|암로디핀:노바스크|클로피도그렐:플라빅스|페노바르비탈:루미날|' +
  '레비티라세탐:케프라|조니사마이드:엑세그란|브롬화칼륨:포타슘브로마이드|레보티록신:신지로이드|메티마졸:펠리마졸,타파졸|' +
  '트릴로스탄:베토릴|렌테 인슐린:카닌슐린|인슐린글라진:란투스|프로타민 아연 인슐린:프로징크|미르타자핀:레메론|' +
  '플루옥세틴:프로작,레콘사일|트라조돈:데지렐,트리티코|디아제팜:바리움|덱스메데토미딘:덱스도미터|프로포폴:|알팍살론:알팍산|' +
  '케타민:|이소플루란:|아트로핀:|구연산칼륨:유로시트라|클로람부실:류케란|프루네베트맙:솔렌시아|프레드니솔론 점안액:';

/** [{ value, label, hint }] for SuggestInput: each product name hints its ingredient. */
export const DRUG_NAME_OPTIONS = DRUG_NAME_SOURCE.split('|').flatMap((entry) => {
  const [ingredient, brands] = entry.split(':');
  const out = [{ value: ingredient, label: ingredient, hint: '성분명' }];
  for (const b of (brands || '').split(',').filter(Boolean)) out.push({ value: b, label: b, hint: ingredient });
  return out;
});

// ── Form ─────────────────────────────────────────────────────────

const TALL = 'h-10'; // clinic form controls are 40 px (§5.4 reference: "labelled 40/44 px fields")

function SelectField({ value, onValueChange, options, id, className, ...props }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={cn('w-full data-[size=default]:h-10', className)} {...props}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Decimal input with a unit suffix; props (id, aria-*) go to the <input>, so a Field label points at it. */
function UnitInput({ unit, value, onChange, className, ...props }) {
  return (
    <InputGroup className={cn(TALL, className)}>
      <InputGroupInput
        inputMode="decimal"
        autoComplete="off"
        className="tabular-nums"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{unit}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}

function Section({ title, description, action, children, className }) {
  return (
    <Card className={cn('gap-4 py-4', className)}>
      <CardHeader className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** 환자·보험: two columns of labelled fields. */
export function PatientFields({ form, set, showPolicy = true }) {
  return (
    <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
      <Field label={showPolicy ? '보험사 (서류 요건 프로필)' : '청구할 보험사'} help="서류 요건은 보험사 프로필(미검증 참고자료)을 따릅니다.">
        <SelectField value={form.insurer_id || 'default'} onValueChange={(v) => set('insurer_id', v)} options={INSURER_OPTIONS} />
      </Field>
      <Field label="진료일" help={fmtDate(form.visit_date, 'prose') || '날짜를 선택하세요'}>
        <Input type="date" className={TALL} value={form.visit_date || ''} onChange={(e) => set('visit_date', e.target.value)} />
      </Field>
      <Field label="종">
        <SelectField value={form.species} onValueChange={(v) => set('species', v)} options={[['dog', '개'], ['cat', '고양이']]} />
      </Field>
      <Field label="품종">
        <Input className={TALL} value={form.breed || ''} autoComplete="off" onChange={(e) => set('breed', e.target.value)} />
      </Field>
      <Field label="체중">
        <UnitInput unit="kg" value={form.weight_kg ?? ''} onChange={(v) => set('weight_kg', v)} />
      </Field>
      <Field label="병원 지역">
        <SelectField value={form.region} onValueChange={(v) => set('region', v)} options={REGIONS.map((r) => [r, r])} />
      </Field>
      <Field label="진단명" help="여러 개는 쉼표로 구분하세요.">
        <Input className={TALL} value={form.diagnoses || ''} autoComplete="off" onChange={(e) => set('diagnoses', e.target.value)} />
      </Field>
      <Field label="동물등록번호 (선택)" help="미등록이면 비워 두세요.">
        <Input className={cn(TALL, 'id')} inputMode="numeric" autoComplete="off" value={form.registration_no || ''} onChange={(e) => set('registration_no', e.target.value)} />
      </Field>
      {showPolicy ? (
        <Field label="보험 개시일" help={fmtDate(form.policy_start, 'prose')}>
          <Input type="date" className={TALL} value={form.policy_start || ''} onChange={(e) => set('policy_start', e.target.value)} />
        </Field>
      ) : null}
    </div>
  );
}

/**
 * 발급할 서류 / 첨부 서류: a grid of labelled checkboxes, 2 columns (3 from 640 px). Several can be
 * chosen, so it must not look like a single-choice segmented control (design review P1-19).
 */
export function DocumentToggles({ form, set, label, help }) {
  const docs = (form.docs || []).filter((d) => DOC_OPTIONS[d]);
  // Same value shape as the old multiple ToggleGroup: ticking appends, unticking removes.
  const toggle = (id, on) => set('docs', on ? (docs.includes(id) ? docs : [...docs, id]) : docs.filter((d) => d !== id));
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {Object.entries(DOC_OPTIONS).map(([id, o]) => {
          const cid = `claim-doc-${id}`;
          return (
            <div key={id} className="flex min-h-8 items-center gap-2 touch:min-h-11">
              <Checkbox id={cid} checked={docs.includes(id)} onCheckedChange={(v) => toggle(id, v === true)} />
              <Label htmlFor={cid} className="text-sm font-normal text-foreground">
                {o.ko}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

const cellInput = 'h-10';
const amountCell = (v) => (v == null ? <span className="num text-muted-foreground">0</span> : <span className="num text-foreground">{fmtNum(v)}</span>);

/**
 * 진료 항목: 항목명 | 수량 | 단가 (원) | 금액 (원).
 * `invalid` = { message id }: while no 항목명 is filled, every empty 항목명 is aria-invalid and points at
 * the message; each 항목명 input carries data-line-desc={row} so the page can focus the first one.
 */
export function LineItemsGrid({ form, setCell, set, invalid }) {
  const lines = form.lines || [];
  const columns = [
    {
      key: 'desc', header: '항목명', stackClassName: 'col-span-2 sm:max-lg:col-span-4',
      cell: (r, i, a) => {
        const bad = !!invalid && !String(r[0] || '').trim();
        return (
          <Input
            id={a.id}
            data-line-desc={i}
            aria-label={a.ariaLabel}
            aria-invalid={bad || undefined}
            aria-describedby={bad ? invalid.id : undefined}
            autoComplete="off"
            className={cellInput}
            value={r[0]}
            onChange={(e) => setCell('lines', i, 0, e.target.value)}
          />
        );
      },
    },
    {
      key: 'qty', header: '수량', className: 'w-20', num: true,
      cell: (r, i, a) => <DecimalInput id={a.id} aria-label={a.ariaLabel} className={cellInput} value={r[1]} onChange={(v) => setCell('lines', i, 1, v)} />,
    },
    {
      key: 'price', header: '단가 (원)', className: 'w-32', num: true,
      cell: (r, i, a) => <IntegerInput id={a.id} aria-label={a.ariaLabel} className={cellInput} value={r[2]} onChange={(v) => setCell('lines', i, 2, v)} />,
    },
    {
      key: 'amount', header: '금액 (원)', className: 'w-28', num: true, readOnly: true,
      cell: (r) => <span className="flex h-10 items-center justify-end max-lg:h-auto">{amountCell(rowAmount(r[1], r[2]))}</span>,
    },
  ];
  return (
    <div className="flex flex-col gap-2">
      <EditableGrid
        label="진료 항목"
        columns={columns}
        rows={lines}
        rowTitle={(i) => `항목 ${i + 1}`}
        onRemove={(i) => set('lines', lines.filter((_, k) => k !== i))}
        total={{ label: '합계', value: fmtNum(sumRows(lines, 1, 2)), columnKey: 'amount' }}
        empty="진료 항목이 없습니다. 항목을 추가하세요."
      />
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={() => set('lines', [...lines, ['', 1, '']])}>
          <Plus aria-hidden="true" strokeWidth={1.5} />
          항목 추가
        </Button>
      </div>
    </div>
  );
}

/** 처방: 약품명 | 용량 (mg/kg) | 투여 횟수 | 일수 | 단가 (원) | 수량 | 금액 (원). */
export function PrescriptionGrid({ form, setCell, set }) {
  const rx = form.rx || [];
  const columns = [
    {
      key: 'drug', header: '약품명', stackClassName: 'col-span-2 sm:max-lg:col-span-4',
      cell: (r, i, a) => (
        <SuggestInput id={a.id} aria-label={a.ariaLabel} inputClassName="h-10 touch:h-10" value={r[0]} options={DRUG_NAME_OPTIONS} onValueChange={(v) => setCell('rx', i, 0, v)} />
      ),
    },
    {
      key: 'dose', header: '용량 (mg/kg)', className: 'w-24', num: true,
      cell: (r, i, a) => <DecimalInput id={a.id} aria-label={a.ariaLabel} className={cellInput} value={r[1]} onChange={(v) => setCell('rx', i, 1, v)} />,
    },
    {
      key: 'freq', header: '투여 횟수', className: 'w-28',
      cell: (r, i, a) => <SelectField id={a.id} aria-label={a.ariaLabel} value={r[2] || 'BID'} onValueChange={(v) => setCell('rx', i, 2, v)} options={FREQUENCY_OPTIONS} />,
    },
    {
      key: 'days', header: '일수', className: 'w-16', num: true,
      cell: (r, i, a) => <DecimalInput id={a.id} aria-label={a.ariaLabel} className={cellInput} value={r[3]} onChange={(v) => setCell('rx', i, 3, v)} />,
    },
    {
      key: 'price', header: '단가 (원)', className: 'w-28', num: true,
      cell: (r, i, a) => <IntegerInput id={a.id} aria-label={a.ariaLabel} className={cellInput} value={r[4]} onChange={(v) => setCell('rx', i, 4, v)} />,
    },
    {
      key: 'qty', header: '수량', className: 'w-16', num: true,
      cell: (r, i, a) => <DecimalInput id={a.id} aria-label={a.ariaLabel} className={cellInput} value={r[5]} onChange={(v) => setCell('rx', i, 5, v)} />,
    },
    {
      key: 'amount', header: '금액 (원)', className: 'w-24', num: true, readOnly: true, stackClassName: 'sm:max-lg:col-span-3',
      cell: (r) => <span className="flex h-10 items-center justify-end max-lg:h-auto">{amountCell(rowAmount(r[5], r[4]))}</span>,
    },
  ];
  return (
    <div className="flex flex-col gap-2">
      <EditableGrid
        label="처방"
        columns={columns}
        rows={rx}
        rowTitle={(i) => `처방 ${i + 1}`}
        onRemove={(i) => set('rx', rx.filter((_, k) => k !== i))}
        total={rx.length ? { label: '합계', value: fmtNum(sumRows(rx, 5, 4)), columnKey: 'amount' } : null}
        empty="처방이 없습니다. 처방약이 있으면 추가하세요."
      />
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={() => set('rx', [...rx, ['', '', 'BID', 7, '', 14]])}>
          <Plus aria-hidden="true" strokeWidth={1.5} />
          처방 추가
        </Button>
      </div>
    </div>
  );
}

/**
 * The whole claim form as three Card sections (환자·보험, 진료 항목, 처방). Props:
 * { form, setForm, showPolicy, linesInvalid? }. `showPolicy` (console use) adds 보험 개시일 and labels the
 * documents as received; the clinic passes false. `linesInvalid` (optional, { id }) marks the empty
 * 항목명 fields invalid and links them to the page's message.
 */
export function ClaimForm({ form, setForm, showPolicy = true, linesInvalid }) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCell = (key, i, j, v) => setForm((f) => ({ ...f, [key]: f[key].map((row, ri) => (ri === i ? row.map((c, ci) => (ci === j ? v : c)) : row)) }));
  return (
    <div className="flex flex-col gap-4">
      <Section title="환자·보험">
        <div className="flex flex-col gap-6">
          <PatientFields form={form} set={set} showPolicy={showPolicy} />
          <DocumentToggles
            form={form}
            set={set}
            label={showPolicy ? '첨부 서류' : '발급할 서류'}
            help={showPolicy ? '보험사가 받은 서류를 선택하세요.' : '보호자에게 드릴 서류를 선택하세요.'}
          />
        </div>
      </Section>
      <Section title="진료 항목" description="영수증의 항목명을 원문 그대로 입력하세요.">
        <LineItemsGrid form={form} set={set} setCell={setCell} invalid={linesInvalid} />
      </Section>
      <Section title="처방" description="한글 상품명도 입력할 수 있습니다.">
        <PrescriptionGrid form={form} set={set} setCell={setCell} />
      </Section>
    </div>
  );
}
