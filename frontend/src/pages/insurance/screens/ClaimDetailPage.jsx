// Claim detail (DESIGN_SYSTEM.md §5.3): the full page /insurance/claims/:claimId and the body of the
// wide side panel. Header, two description rows, tabs (소견 · 진료 항목 · 지급 계산 · 이력) and the
// action bar. Actions are local to this browser (actions.js).
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronDown, Info, SearchX } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/ui/primitives/breadcrumb'
import { Button } from '@/ui/primitives/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/ui/primitives/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/ui/primitives/dropdown-menu'
import { Label } from '@/ui/primitives/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select'
import { Textarea } from '@/ui/primitives/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/primitives/tooltip'
import { DataTable, createColumnHelper } from '@/ui/patterns/DataTable'
import { StatusText } from '@/ui/patterns/status'
import { EmptyState } from '@/ui/patterns/EmptyState'
import { PageHeader } from '@/ui/patterns/PageHeader'
import { useTitle } from '@/ui/patterns/useTitle'
import { fmtDose, fmtNum } from '@/ui/lib/format'
import { ActivityLog } from '@/ui/ext/wp6/ActivityLog'
import { StickyActionBar } from '@/ui/ext/wp6/StickyActionBar'
import { ClaimDetailView, TABS } from '../preview/ClaimDetailView.jsx'
import { LineDecision } from '../preview/LineItemTable.jsx'
import { isActionable } from '../preview/model.js'
import { useClaim } from '../data/resources'
import { useClaimActions } from '../actions'
import {
  ACTIONS,
  ACTIONS_TOOLTIP,
  ACTION_REASONS,
  ACTOR,
  CHANNEL,
  DOC_LABEL,
  DOC_STATUS,
  DRUG_CLASS,
  PEND_LABEL,
  SIU_LABEL,
} from '../strings.ko.js'
import { LoadError, Page, PageSkeleton } from './states'

const DECISION_WORD = { auto_approve: '자동 승인', pend: '서류 요청', review: '심사 필요', deny_recommended: '지급 거절 권고' }

// ── Console-only sections ─────────────────────────────────────────

function SubSection({ title, meta, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-baseline gap-2 text-sm font-semibold text-foreground">
        {title}
        {meta ? <span className="num text-xs font-normal text-muted-foreground">{meta}</span> : null}
      </h3>
      {children}
    </section>
  )
}

function PendReasons({ reasons }) {
  if (!reasons?.length) return null
  return (
    <SubSection title="서류 요청 사유" meta={`${reasons.length}건`}>
      <ul className="divide-y divide-border border-y border-border">
        {reasons.map((p) => (
          <li key={p.code} className="flex flex-col gap-1 py-3">
            <p className="flex items-baseline gap-2 text-sm">
              <span className="font-medium text-foreground">{PEND_LABEL[p.code] || p.code}</span>
              <span className="text-xs text-text-2">{ACTOR[p.actor] || p.actor} 보완</span>
            </p>
            <p className="text-sm text-text-2">{p.detail_ko}</p>
            {p.requests?.length ? <p className="text-xs text-text-2">요청 서류: {p.requests.map((d) => DOC_LABEL[d] || d).join(', ')}</p> : null}
          </li>
        ))}
      </ul>
    </SubSection>
  )
}

function SiuSignals({ flags, recordRuleId }) {
  if (!flags?.length) return null
  return (
    <SubSection title="SIU 의뢰 신호" meta={`${flags.length}건`}>
      <ul className="divide-y divide-border border-y border-border">
        {flags.map((s) => (
          <li key={s.code} className="flex flex-col gap-1 py-3">
            <p className="flex items-baseline gap-2 text-sm">
              <span className="font-medium text-foreground">{s.title_ko || SIU_LABEL[s.code]}</span>
              <span className="id text-xs text-text-2">{s.code}</span>
            </p>
            <p className="text-sm text-text-2">{s.detail_ko}</p>
            {s.evidence?.length ? (
              <ul className="flex flex-col gap-0.5 text-xs text-text-2">
                {s.evidence.slice(0, 4).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {recordRuleId ? (
          <>
            진료부는 이 신호가 있을 때만 요청합니다. 규칙 <span className="id">{recordRuleId}</span>
          </>
        ) : (
          '병원·청구 이력 비교 신호라 진료부를 요청하지 않습니다.'
        )}
      </p>
    </SubSection>
  )
}

const DOC_TONE = { satisfied: 'ok', missing: 'moderate', requested: 'minor', unknown: 'minor' }

function Documents({ docs, profile }) {
  if (!docs?.length) return null
  return (
    <SubSection title="제출 서류" meta={profile?.name_ko}>
      <ul className="divide-y divide-border border-y border-border">
        {docs.map((d, i) => {
          const optional = !d.required && d.status === 'missing'
          return (
            <li key={`${d.doc_type}-${i}`} className="flex items-start gap-4 py-2.5 max-sm:flex-col max-sm:gap-1">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{d.pend_code === 'ORIGINALS_REQUIRED' ? '원본 서류' : DOC_LABEL[d.doc_type] || d.doc_type}</span>
                  {d.alternatives?.length && d.pend_code !== 'ORIGINALS_REQUIRED' ? (
                    <span className="text-text-2"> 또는 {d.alternatives.map((a) => DOC_LABEL[a] || a).join(', ')}</span>
                  ) : null}
                </p>
                <p className="text-xs text-text-2">
                  {ACTOR[d.actor] || d.actor} 제출. {d.why_ko}
                </p>
              </div>
              <StatusText tone={optional ? 'minor' : DOC_TONE[d.status] || 'minor'} icon={false} className="text-xs">
                {optional ? '권장' : DOC_STATUS[d.status] || d.status}
              </StatusText>
            </li>
          )
        })}
      </ul>
    </SubSection>
  )
}

const drugCol = createColumnHelper()
const drugColumns = [
  drugCol.accessor('input_name', { header: '처방 원문' }),
  drugCol.accessor('ingredient', { header: '성분', cell: (i) => i.getValue() || <span className="text-muted-foreground">확인 불가</span> }),
  drugCol.accessor((d) => DRUG_CLASS[d.therapeutic_class] || '', { id: 'class', header: '계열', meta: { className: 'text-text-2' } }),
  drugCol.accessor('dose_mg_per_kg', { header: '용량 (mg/kg)', meta: { num: true }, cell: (i) => (i.getValue() == null ? '' : fmtDose(i.getValue())) }),
  drugCol.accessor('total', { header: '금액 (원)', meta: { num: true, emphasizeWhenFlagged: true }, cell: (i) => fmtNum(i.getValue()) }),
  drugCol.accessor((d) => d.decision?.eligible, { id: 'decision', header: '지급 판정', enableSorting: false, cell: (i) => <LineDecision decision={i.row.original.decision} /> }),
]

function Drugs({ drugs }) {
  return (
    <SubSection title="처방" meta={drugs?.length ? `${drugs.length}건` : null}>
      {drugs?.length ? (
        <DataTable aria-label="처방" columns={drugColumns} data={drugs} getRowId={(d, i) => `${i}`} paginate={false} isFlagged={(d) => !!d.flagged} />
      ) : (
        <p className="text-sm text-text-2">처방이 없습니다.</p>
      )}
    </SubSection>
  )
}

// ── Actions ──────────────────────────────────────────────────────

function ActionDialog({ action, onClose, onSave }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const needsReason = action && action.type !== 'note'
  const reasons = action ? ACTION_REASONS[action.type] || [] : []
  const submit = (e) => {
    e.preventDefault()
    setTried(true)
    if (needsReason && !reason) return
    if (action.type === 'note' && !note.trim()) return
    onSave({ type: action.type, doc: action.doc || null, reason: reason || null, note: note.trim() || null })
  }
  const title = action ? (action.type === 'request' && action.doc ? `서류 요청: ${DOC_LABEL[action.doc] || action.doc}` : ACTIONS[action.type].label) : ''
  return (
    <Dialog open={!!action} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{needsReason ? '판정을 바꾸려면 사유를 선택하세요.' : '이 청구에 남길 메모를 입력하세요.'}</DialogDescription>
          </DialogHeader>
          {needsReason ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="action-reason" className="text-sm font-medium text-foreground">
                사유 <span className="text-muted-foreground">(필수)</span>
              </Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="action-reason" aria-invalid={tried && !reason ? true : undefined} aria-describedby={tried && !reason ? 'action-reason-err' : undefined} className="w-full">
                  <SelectValue placeholder="사유 선택" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tried && !reason ? (
                <p id="action-reason-err" className="text-xs text-sev-critical">
                  사유를 선택하세요.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="action-note" className="text-sm font-medium text-foreground">
              메모 {needsReason ? <span className="text-muted-foreground">(선택)</span> : <span className="text-muted-foreground">(필수)</span>}
            </Label>
            <Textarea id="action-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            {tried && !needsReason && !note.trim() ? <p className="text-xs text-sev-critical">메모를 입력하세요.</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">{action?.type === 'note' ? '메모 저장' : `${ACTIONS[action?.type]?.label || ''} 기록`}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ClaimActions({ model, add, className }) {
  const [action, setAction] = useState(null)
  const docs = useMemo(() => {
    const set = new Set(['DX_CERT_STATUTORY', 'DETAIL_STATEMENT', 'OPINION_WITH_RX', 'MEDICAL_RECORD', 'PET_PHOTO_FRONT'])
    for (const p of model.pend_reasons || []) for (const d of p.requests || []) set.add(d)
    return [...set]
  }, [model])
  const save = (entry) => {
    const ok = add(entry)
    setAction(null)
    if (ok) toast(ACTIONS[entry.type].done)
    else toast('이 브라우저에 저장할 수 없습니다. 저장소 사용이 막혀 있는지 확인하세요.')
  }
  return (
    <StickyActionBar aria-label="청구 처리" className={className}>
      <Button onClick={() => setAction({ type: 'approve' })}>청구 승인</Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            서류 요청
            <ChevronDown strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">요청할 서류</DropdownMenuLabel>
          {docs.map((d) => (
            <DropdownMenuItem key={d} onSelect={() => setAction({ type: 'request', doc: d })}>
              {DOC_LABEL[d] || d}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="secondary" onClick={() => setAction({ type: 'siu' })}>
        SIU 이관
      </Button>
      <Button variant="ghost" onClick={() => setAction({ type: 'note' })}>
        메모
      </Button>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="처리 기록 저장 위치" className="ml-auto text-muted-foreground">
              <Info strokeWidth={1.5} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{ACTIONS_TOOLTIP}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ActionDialog key={action ? `${action.type}-${action.doc || ''}` : 'none'} action={action} onClose={() => setAction(null)} onSave={save} />
    </StickyActionBar>
  )
}

function actionTitle(a) {
  if (a.type === 'request') return `서류 요청: ${DOC_LABEL[a.doc] || a.doc || '서류'}`
  return ACTIONS[a.type]?.label || a.type
}

function logEntries(model, actions) {
  const out = actions
    .slice()
    .reverse()
    .map((a) => ({ id: a.id, at: a.at, title: actionTitle(a), actor: '김 심사역 (가상)', detail: [a.reason, a.note].filter(Boolean).join('. ') || null }))
  const n = model.findings.filter(isActionable).length
  if (model.submitted_date) {
    out.push({
      id: 'engine',
      at: model.submitted_date,
      title: '자동 심사',
      actor: model.engine_version ? `엔진 v${model.engine_version}` : '엔진',
      detail: `판정 ${DECISION_WORD[model.decision] || model.decision}, 소견 ${n}건`,
    })
    out.push({ id: 'intake', at: model.submitted_date, title: '청구 접수', actor: CHANNEL[model.intake_channel] || null, detail: null })
  }
  return out
}

const LAST_WORD = { approve: '승인', request: '서류 요청', siu: 'SIU 이관' }

/** The reviewer's latest decision-changing action, shown next to the engine decision. */
function LocalDecision({ actions }) {
  const last = [...actions].reverse().find((a) => a.type !== 'note')
  if (!last) return null
  return (
    <span className="text-sm text-text-2">
      심사역 처리: <span className="font-medium text-foreground">{LAST_WORD[last.type]}</span>
    </span>
  )
}

// ── Body (page and panel) ────────────────────────────────────────

export function ClaimDetailBody({ claimId, variant = 'page', tab, onTabChange, breadcrumb }) {
  const res = useClaim(claimId)
  const { list, add } = useClaimActions(claimId)
  if (res.error) return <LoadError onRetry={res.reload} />
  if (res.loading || res.data === null) {
    if (!res.loading && res.data === null) {
      const empty = (
        <EmptyState
          icon={SearchX}
          title={`${claimId} 청구를 찾을 수 없습니다.`}
          action={
            <Button asChild variant="secondary">
              <Link to="/insurance/claims">청구 심사로 돌아가기</Link>
            </Button>
          }
        />
      )
      if (variant !== 'page') return empty
      // The full page keeps its one <h1> even when the claim does not exist.
      return (
        <Page>
          <PageHeader title="청구 심사" breadcrumb={breadcrumb} />
          {empty}
        </Page>
      )
    }
    return variant === 'page' ? <PageSkeleton /> : <div data-skeleton="" className="h-40" />
  }
  const { model } = res.data
  const view = (
    <ClaimDetailView
      model={model}
      headingAs={variant === 'page' ? 'h1' : 'h2'}
      breadcrumb={breadcrumb}
      headerAside={<LocalDecision actions={list} />}
      tab={tab}
      onTabChange={onTabChange}
      findingsExtra={
        <>
          <PendReasons reasons={model.pend_reasons} />
          <SiuSignals flags={model.siu_flags} recordRuleId={model.record_request_rule_id} />
          <Documents docs={model.required_documents} profile={model.insurer_profile} />
        </>
      }
      linesExtra={<Drugs drugs={model.drugs} />}
      log={<ActivityLog entries={logEntries(model, list)} />}
    />
  )
  if (variant === 'panel') {
    return (
      <>
        <div className="pb-6">{view}</div>
        <ClaimActions model={model} add={add} className="-mx-6 mt-auto" />
      </>
    )
  }
  return (
    <>
      <Page className="flex-1">{view}</Page>
      <ClaimActions model={model} add={add} />
    </>
  )
}

export default function ClaimDetailPage() {
  const { claimId } = useParams()
  const [params, setParams] = useSearchParams()
  useTitle(claimId, '청구 심사', 'nuvovet')
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'findings'
  const setTab = (t) => {
    const next = new URLSearchParams(params)
    if (t === 'findings') next.delete('tab')
    else next.set('tab', t)
    setParams(next, { replace: true })
  }
  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <ClaimDetailBody
        claimId={claimId}
        tab={tab}
        onTabChange={setTab}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/insurance/claims">청구 심사</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="id">{claimId}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
    </div>
  )
}

