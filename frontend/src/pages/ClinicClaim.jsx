// /clinic/claim: the clinic's pre-check before an insurance claim (DESIGN_SYSTEM.md §5.4, WP7).
// Three real steps: 영수증 (photo or manual entry), 항목 확인 (labelled form), 결과 (readiness + checklist).
// API: precheckClaim / extractReceipt with unchanged payloads (claimForm.toClaim).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, CircleAlert, CircleCheck, Printer } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert'
import { Button } from '@/ui/primitives/button'
import { Checkbox } from '@/ui/primitives/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose, DialogTrigger } from '@/ui/primitives/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/ui/primitives/dropdown-menu'
import { Label } from '@/ui/primitives/label'
import { DataTable, createColumnHelper } from '@/ui/patterns/DataTable'
import { DescriptionList } from '@/ui/patterns/DescriptionList'
import { Disclosure } from '@/ui/patterns/Disclosure'
import { EnvironmentMarker } from '@/ui/patterns/EnvironmentMarker'
import { EvidenceRow, EvidenceTrail } from '@/ui/patterns/EvidenceTrail'
import { BrandLockup } from '@/brand/Brand'
import { PageHeader } from '@/ui/patterns/PageHeader'
import { ThemeToggle } from '@/ui/patterns/ThemeToggle'
import { FindingSeverity, StatusText } from '@/ui/patterns/status'
import { useTitle } from '@/ui/patterns/useTitle'
import { fmtDate, fmtDose, fmtNum, fmtWon } from '@/ui/lib/format'
import { cn } from '@/ui/cn'
import { Dropzone } from '@/ui/ext/wp7/Dropzone'
import { Stepper } from '@/ui/ext/wp7/Stepper'
import { extractReceipt, precheckClaim } from './insurance/claimsApi'
import { ClaimForm, DOC_OPTIONS, PRESETS, emptyForm, formTotal, fromDraft, toClaim, today } from './insurance/claimForm'
import { DOC_LABEL, DRUG_CLASS, PEND_LABEL } from './insurance/strings.ko.js'
import { koText, toClaimModel } from './insurance/preview/model.js'
import { FindingList } from './insurance/preview/FindingList.jsx'
import { LineDecision, LineItemTable } from './insurance/preview/LineItemTable.jsx'
import { PayoutLedger } from './insurance/preview/PayoutLedger.jsx'

const STEPS = [
  { id: 'receipt', label: '영수증' },
  { id: 'items', label: '항목 확인' },
  { id: 'result', label: '결과' },
]

const EXAMPLES = [
  [3, '정상 청구'],
  [4, '합계만 있는 영수증'],
  [5, '진단서 없는 수술 청구'],
]

const ACCEPT = 'image/png,image/jpeg,image/webp'
const MAX_BYTES = 10 * 1024 * 1024

const ENV_TOOLTIP = '데모 환경입니다. 예시 청구는 합성 데이터이고, 보험사 서류 요건은 공개 자료를 정리한 미검증 참고자료입니다.'

// The extract endpoint answers in English; the clinic sees Korean with a way forward (§6.1).
function extractError(message) {
  const m = String(message || '')
  if (/Unsupported file type/i.test(m)) return 'JPG, PNG, WEBP 사진만 올릴 수 있습니다.'
  if (/larger than 10 MB/i.test(m)) return '10 MB 이하 사진을 올리세요.'
  if (/Too many/i.test(m)) return '요청이 많습니다. 1분 뒤 다시 올리거나 직접 입력하세요.'
  if (/Extraction unavailable/i.test(m)) return '지금은 영수증을 인식할 수 없습니다. 직접 입력하세요.'
  return m
}

const docName = (id) => DOC_LABEL[id] || DOC_OPTIONS[id]?.ko || id
// The form's toggle that issues a requested document (imaging with its capture time, when asked for).
const toggleFor = (docType) => (docType === 'IMAGING' ? 'IMAGING_TS' : DOC_OPTIONS[docType] ? docType : null)

function presetForm(i) {
  return { ...PRESETS[i].claim, visit_date: today, clinic_name: '' }
}

// ── Page chrome ──────────────────────────────────────────────────

function ClinicHeader() {
  return (
    <header className="flex h-12 items-center justify-between gap-3 border-b border-border bg-background px-6 max-sm:px-4 print:hidden">
      <Link to="/" className="min-w-0 rounded-sm">
        <BrandLockup product="claims" size="sm" suffix={<><span className="max-sm:hidden">병원용 </span>청구 사전 점검</>} />
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <EnvironmentMarker label="합성 데이터" tooltip={ENV_TOOLTIP} />
        <ThemeToggle />
      </div>
    </header>
  )
}

function StepHeading({ id, children, className }) {
  return (
    // A programmatic focus target only (never reached by Tab), so it draws no focus ring.
    <h2 id={id} tabIndex={-1} className={cn(className || 'text-lg font-semibold text-foreground', 'focus:outline-none')}>
      {children}
    </h2>
  )
}

// ── Step 1: receipt ──────────────────────────────────────────────

// Opened from its own DialogTrigger, so Radix returns focus to "동의 내용 보기" on Esc and on 닫기 (§9.5).
function ConsentDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="link" className="h-auto text-sm">
          동의 내용 보기
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>영수증 사진 전송 동의</DialogTitle>
          <DialogDescription>사진을 올리기 전에 보호자에게 아래 내용을 알리고 동의를 받으세요.</DialogDescription>
        </DialogHeader>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-foreground">
          <li>영수증 사진은 글자 인식(전사)을 위해 외부 이미지 인식 API(Anthropic, 국외 처리)로 전송됩니다.</li>
          <li>NuvoVet 서버에는 영수증 이미지를 저장하지 않습니다. 인식된 항목만 이 화면에 채워집니다.</li>
          <li>사진에 보호자 연락처나 주소가 보이면 가린 뒤 올리세요.</li>
          <li>직접 입력할 때는 동의가 필요 없습니다.</li>
        </ul>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">닫기</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReceiptStep({ consent, setConsent, busy, error, onFile, onReject, onManual, onExample }) {
  return (
    <section aria-labelledby="step-receipt" className="flex flex-col gap-4">
      <StepHeading id="step-receipt">영수증 불러오기</StepHeading>
      <Dropzone
        accept={ACCEPT}
        // Touch screens cannot drag a file in, so they are not told to (design review, WP7 form).
        title={
          <>
            <span className="touch:hidden">영수증 사진을 끌어오거나 선택하세요</span>
            <span className="hidden touch:inline">영수증 사진을 선택하거나 촬영하세요</span>
          </>
        }
        hint="JPG, PNG, WEBP 사진, 10 MB 이하"
        disabled={!consent}
        disabledHint="아래 보호자 동의를 확인하면 사진을 올릴 수 있습니다."
        busy={busy}
        busyLabel="영수증을 읽는 중"
        onFile={onFile}
        onReject={onReject}
        describedBy="consent-help"
      />
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-2">
            <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} aria-describedby="consent-help" />
            <Label htmlFor="consent" className="text-sm font-medium text-foreground touch:min-h-10 touch:items-center">
              보호자 동의를 받았습니다
            </Label>
          </div>
          <ConsentDialog />
        </div>
        <p id="consent-help" className="pl-6 text-xs text-muted-foreground">
          사진을 올릴 때만 필요합니다. 직접 입력할 때는 필요 없습니다.
        </p>
      </div>
      {error ? (
        <Alert variant="critical">
          <CircleAlert strokeWidth={1.5} aria-hidden="true" />
          <AlertTitle>영수증을 읽지 못했습니다</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <span className="mr-2 text-sm text-text-2">사진이 없으면</span>
        <Button type="button" variant="outline" onClick={onManual}>
          직접 입력
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost">
              예시 불러오기
              <ChevronDown aria-hidden="true" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {EXAMPLES.map(([i, label]) => (
              <DropdownMenuItem key={i} onSelect={() => onExample(i)}>
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  )
}

// ── Step 2: items ────────────────────────────────────────────────

function ItemsStep({ form, setForm, notice, busy, error, invalid, onRun, onClear }) {
  return (
    <section aria-labelledby="step-items" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StepHeading id="step-items">항목 확인</StepHeading>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          입력 지우기
        </Button>
      </div>
      {notice ? <p className="text-sm text-text-2">{notice}</p> : null}
      <ClaimForm form={form} setForm={setForm} showPolicy={false} linesInvalid={invalid ? { id: 'run-invalid' } : undefined} />
      {error ? (
        <Alert variant="critical">
          <CircleAlert strokeWidth={1.5} aria-hidden="true" />
          <AlertTitle>사전 점검을 실행하지 못했습니다</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {/* Under 640 px the form is several screens long: the run button rides along at the bottom. */}
      <div className="flex flex-wrap items-center gap-3 max-sm:sticky max-sm:bottom-0 max-sm:z-[var(--z-sticky)] max-sm:-mx-4 max-sm:border-t max-sm:border-border max-sm:bg-background max-sm:px-4 max-sm:py-3">
        <Button type="button" size="lg" loading={busy} onClick={onRun} aria-describedby={invalid ? 'run-invalid' : undefined}>
          사전 점검 실행
        </Button>
        <span className="text-sm text-text-2">
          청구 금액 <span className="num">{fmtWon(formTotal(form))}</span>
        </span>
        {invalid ? (
          <span id="run-invalid" role="alert" className="flex items-center gap-1 text-xs text-sev-critical">
            <CircleAlert aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
            {invalid}
          </span>
        ) : null}
      </div>
    </section>
  )
}

// ── Step 3: result ───────────────────────────────────────────────

const DOC_STATUS_VIEW = {
  satisfied: { word: '충족', tone: 'ok' },
  missing: { word: '누락', tone: 'moderate' },
  requested: { word: '요청함', tone: 'minor' },
  unknown: { word: '확인 불가', tone: 'minor' },
}

function SectionTitle({ children, count, meta }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <h3 className="text-base font-semibold text-foreground">{children}</h3>
      {count != null ? <span className="num text-xs text-muted-foreground">{fmtNum(count)}</span> : null}
      {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
    </div>
  )
}

function DocumentRows({ docs, issued, onIssue, busy }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {docs.map((d, i) => {
        const original = d.pend_code === 'ORIGINALS_REQUIRED'
        const optional = d.status === 'missing' && d.required === false
        const view = optional ? { word: '권장', tone: 'minor' } : DOC_STATUS_VIEW[d.status] || DOC_STATUS_VIEW.unknown
        const alts = original ? [] : d.alternatives || []
        const toggle = d.status === 'missing' ? [d.doc_type, ...alts].map(toggleFor).find((t) => t && !issued.includes(t)) : null
        return (
          <li key={`${d.doc_type}-${i}`} className="flex items-start gap-3 py-3">
            <span className="flex w-16 shrink-0 pt-px">
              <StatusText tone={view.tone} icon={false}>
                {view.word}
              </StatusText>
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {original ? '원본 서류' : docName(d.doc_type)}
                {alts.length ? <span className="font-normal text-text-2"> 또는 {alts.map(docName).join(', ')}</span> : null}
              </span>
              {d.why_ko ? <span className="text-xs text-text-2">{d.why_ko}</span> : null}
            </div>
            {toggle ? (
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onIssue(toggle)}>
                발급 목록에 추가
              </Button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function ActionRows({ actions }) {
  return (
    <EvidenceTrail>
      {actions.map((a, i) => (
        <EvidenceRow key={`${a.rule}-${i}`} badge={<FindingSeverity severity={a.severity} />} title={koText(a.title)} ruleId={a.rule}>
          {a.detail ? <p className="text-sm text-text-2">{koText(a.detail)}</p> : null}
        </EvidenceRow>
      ))}
    </EvidenceTrail>
  )
}

function OwnerRows({ items }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {items.map((g) => (
        <li key={g.code} className="flex flex-col gap-0.5 py-3">
          <span className="text-sm font-medium text-foreground">{PEND_LABEL[g.code] || '보호자 확인 사항'}</span>
          <span className="text-sm text-text-2">{koText(g.detail)}</span>
        </li>
      ))}
    </ul>
  )
}

const drugCol = createColumnHelper()
const DRUG_COLUMNS = [
  drugCol.accessor('input_name', { header: '처방 원문', cell: (i) => <span className="text-foreground">{i.getValue()}</span> }),
  drugCol.accessor('ingredient', {
    header: '성분',
    cell: (i) => (i.getValue() ? <span className="text-foreground">{i.getValue()}</span> : <span className="text-muted-foreground">확인 안 됨</span>),
  }),
  drugCol.accessor('therapeutic_class', {
    header: '계열',
    enableSorting: false,
    cell: (i) => <span className="text-text-2">{DRUG_CLASS[i.getValue()] || '분류 없음'}</span>,
  }),
  drugCol.accessor('dose_mg_per_kg', {
    header: '용량 (mg/kg)',
    meta: { num: true },
    cell: (i) => (i.getValue() == null ? <span className="text-muted-foreground">입력 없음</span> : fmtDose(i.getValue())),
  }),
  drugCol.accessor('total', { header: '금액 (원)', meta: { num: true }, cell: (i) => fmtNum(i.getValue()) }),
  drugCol.accessor((d) => d.decision?.eligible, {
    id: 'decision',
    header: '지급 판정',
    enableSorting: false,
    cell: (i) => <LineDecision decision={i.row.original.decision} />,
  }),
]

function ResultStep({ result, form, busy, error, onIssue, onBack }) {
  const actions = result.clinic_actions || []
  const actionRules = new Set(actions.map((a) => a.rule))
  const findingsRaw = (result.issues || []).filter((f) => !actionRules.has(f.rule))
  const model = useMemo(
    () =>
      toClaimModel({
        claim: {},
        adjudication: {
          findings: findingsRaw,
          lines: result.standardized?.lines,
          drugs: result.standardized?.drugs,
          line_decisions: result.line_decisions,
          payable: result.estimated_payable,
          required_documents: result.documents_to_issue,
          insurer_profile: result.insurer_profile,
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result],
  )
  const owner = result.owner_guidance || []
  const issued = form.docs || []
  const ready = !!result.ready_to_submit
  const profile = result.insurer_profile
  const payable = result.estimated_payable
  const softDocs = model.required_documents.some((d) => d.status === 'unknown' || (d.status === 'missing' && d.required === false))

  return (
    <section aria-labelledby="step-result" aria-busy={busy || undefined} className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-4 max-sm:sticky max-sm:top-0 max-sm:z-[var(--z-sticky)] max-sm:bg-background max-sm:pt-3">
          <StepHeading id="step-result" className={ready ? 'flex items-center gap-2 text-xl font-semibold text-ok' : 'flex items-center gap-2 text-xl font-semibold text-sev-moderate'}>
            <span data-status={ready ? 'ok' : 'moderate'} className="inline-flex items-center gap-2">
              {ready ? <CircleCheck aria-hidden="true" strokeWidth={1.5} className="size-5" /> : <CircleAlert aria-hidden="true" strokeWidth={1.5} className="size-5" />}
              {ready ? '청구 준비 완료' : `보완 필요 ${fmtNum(result.blocking_count)}건`}
            </span>
          </StepHeading>
          {payable ? (
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-text-2">예상 지급액</span>
              <span className="num text-xl font-semibold text-foreground">{fmtWon(payable.reimbursed)}</span>
            </div>
          ) : null}
        </div>
        <p className="text-sm text-text-2">
          {ready
            ? '보험사 심사에서 문제가 될 항목이 없습니다. 아래 서류를 함께 발급하세요.'
            : '아래 항목을 보완하면 보호자가 서류를 다시 받으러 오지 않아도 됩니다.'}
          {/* A ready claim can still list "확인 불가" or "권장" documents: say which one wins. */}
          {ready && softDocs ? ' 확인 불가나 권장으로 표시된 서류는 청구를 막지 않습니다.' : null}
        </p>
        <DescriptionList
          columns={3}
          items={[
            profile ? { label: '서류 요건 기준', value: profile.name_ko } : null,
            profile ? { label: '요건 자료 기준일', value: `${fmtDate(profile.as_of, 'header')}${profile.verified ? '' : ' (미검증)'}`, num: true } : null,
            payable ? { label: '청구 금액', value: fmtWon(payable.billed), num: true } : null,
          ]}
        />
        {error ? (
          <Alert variant="critical">
            <CircleAlert strokeWidth={1.5} aria-hidden="true" />
            <AlertTitle>다시 점검하지 못했습니다</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {model.required_documents.length ? (
        <section className="flex flex-col gap-3" aria-label="필요 서류">
          <SectionTitle count={model.required_documents.length}>필요 서류</SectionTitle>
          <DocumentRows docs={model.required_documents} issued={issued} onIssue={onIssue} busy={busy} />
        </section>
      ) : null}

      {actions.length ? (
        <section className="flex flex-col gap-3" aria-label="누락 항목">
          <SectionTitle count={actions.length}>누락 항목</SectionTitle>
          <ActionRows actions={actions} />
        </section>
      ) : null}

      {model.findings.length ? (
        <section className="flex flex-col gap-3" aria-label="소견">
          <SectionTitle count={model.findings.length}>소견</SectionTitle>
          <FindingList findings={model.findings} />
        </section>
      ) : null}

      {!actions.length && !model.findings.length ? (
        // Left-aligned like every other section of this document, not a centred empty-state block.
        <section className="flex flex-col gap-3" aria-label="누락 항목·소견">
          <SectionTitle>누락 항목·소견</SectionTitle>
          <p className="border-y border-border py-3 text-sm text-text-2">누락 항목과 소견이 없습니다.</p>
        </section>
      ) : null}

      {owner.length ? (
        <section className="flex flex-col gap-3" aria-label="보호자 안내">
          <SectionTitle meta="병원 조치는 필요 없습니다.">보호자 안내</SectionTitle>
          <OwnerRows items={owner} />
        </section>
      ) : null}

      {payable ? (
        <section className="flex flex-col gap-3" aria-label="지급액 산정">
          <SectionTitle>지급액 산정</SectionTitle>
          <PayoutLedger payable={model.payable} />
          <p className="text-xs text-muted-foreground">표준 상품(보장 70%, 1회 자기부담 30,000원) 기준 예상액입니다.</p>
        </section>
      ) : null}

      {model.lines.length || model.drugs.length ? (
        <Disclosure title="항목별 지급 판정" meta={`진료 항목 ${fmtNum(model.lines.length)}개, 처방 ${fmtNum(model.drugs.length)}개`}>
          <div className="flex flex-col gap-4">
            {model.lines.length ? <LineItemTable lines={model.lines} aria-label="진료 항목 지급 판정" /> : null}
            {model.drugs.length ? (
              <DataTable aria-label="처방 지급 판정" columns={DRUG_COLUMNS} data={model.drugs} getRowId={(_, i) => `${i}`} paginate={false} />
            ) : null}
          </div>
        </Disclosure>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 print:hidden">
        <Button type="button" variant={ready ? 'outline' : 'default'} onClick={onBack}>
          보완 후 다시 점검
        </Button>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer aria-hidden="true" strokeWidth={1.5} />
          결과 인쇄
        </Button>
      </div>
    </section>
  )
}

// ── Page ─────────────────────────────────────────────────────────

export default function ClinicClaim() {
  useTitle('청구 사전 점검', 'nuvovet')
  const [step, setStep] = useState('receipt')
  const [form, setFormState] = useState(emptyForm)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState({ receipt: '', items: '', result: '' })
  const [invalid, setInvalid] = useState('')
  const [notice, setNotice] = useState('')
  // Receipt photos go to an external transcription API: the clinic confirms owner consent first.
  const [consent, setConsent] = useState(false)

  // Move focus to the new step's heading when the step changes (not on first render; StrictMode-safe).
  const shownStep = useRef(step)
  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    window.scrollTo({ top: 0 })
    document.getElementById(`step-${step}`)?.focus({ preventScroll: true })
  }, [step])

  const fail = (where, message) => setError((e) => ({ ...e, [where]: message }))

  // Any edit makes an earlier result stale: step 3 closes until the check runs again.
  const setForm = (next) => {
    setFormState(next)
    setResult(null)
    setInvalid('')
  }

  const run = async (f = form, where = 'items') => {
    if (!(f.lines || []).some((l) => String(l[0] || '').trim())) {
      // Mark the empty 항목명 fields and put the cursor in the first one (add a row if none is left).
      if (!(f.lines || []).length) setFormState({ ...f, lines: [['', 1, '']] })
      setInvalid('진료 항목을 하나 이상 입력하세요.')
      requestAnimationFrame(() => document.querySelector('[data-line-desc="0"]')?.focus())
      return
    }
    setInvalid('')
    setBusy('check')
    fail(where, '')
    try {
      const r = await precheckClaim(toClaim(f, 'CLINIC', 'emr'), f.insurer_id)
      setResult(r)
      setStep('result')
    } catch (e) {
      fail(where, e.message)
    } finally {
      setBusy('')
    }
  }

  // From the result: issue a requested document (tick it on the form) and check again.
  const issue = (toggle) => {
    const next = { ...form, docs: [...new Set([...(form.docs || []), toggle])] }
    setFormState(next)
    run(next, 'result')
  }

  const onFile = async (file) => {
    if (!consent) return
    if (file.size > MAX_BYTES) {
      fail('receipt', '10 MB 이하 사진을 올리세요.')
      return
    }
    setBusy('extract')
    fail('receipt', '')
    try {
      const draft = await extractReceipt(file)
      const next = fromDraft(draft, form)
      setForm(next)
      const n = (draft.line_items || []).length + (draft.prescriptions || []).length
      setNotice(n ? `영수증에서 항목 ${fmtNum(n)}개를 읽었습니다. 영수증 원문과 대조하세요.` : '영수증에서 항목을 읽지 못했습니다. 직접 입력하세요.')
      setStep('items')
    } catch (e) {
      fail('receipt', extractError(e.message))
    } finally {
      setBusy('')
    }
  }

  const reachable = (id) => id === 'receipt' || id === 'items' || (id === 'result' && !!result)

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <ClinicHeader />
      <main className="mx-auto flex w-full max-w-240 flex-1 flex-col gap-6 px-6 pt-6 pb-16 max-sm:px-4">
        <PageHeader title="청구 사전 점검" meta="보험 청구 전에 서류와 항목 누락을 확인합니다." className="print:hidden" />
        <Stepper steps={STEPS} current={step} reachable={reachable} onStep={setStep} label="사전 점검 단계" />
        {step === 'receipt' ? (
          <ReceiptStep
            consent={consent}
            setConsent={setConsent}
            busy={busy === 'extract'}
            error={error.receipt}
            onFile={onFile}
            onReject={() => fail('receipt', 'JPG, PNG, WEBP 사진만 올릴 수 있습니다.')}
            onManual={() => {
              setNotice('')
              setStep('items')
            }}
            onExample={(i) => {
              setForm(presetForm(i))
              setNotice('')
              setStep('items')
            }}
          />
        ) : null}
        {step === 'items' ? (
          <ItemsStep
            form={form}
            setForm={setForm}
            notice={notice}
            busy={busy === 'check'}
            error={error.items}
            invalid={invalid}
            onRun={() => run()}
            onClear={() => {
              setForm(emptyForm())
              setNotice('')
            }}
          />
        ) : null}
        {step === 'result' && result ? (
          <ResultStep result={result} form={form} busy={busy === 'check'} error={error.result} onIssue={issue} onBack={() => setStep('items')} />
        ) : null}
      </main>
    </div>
  )
}
