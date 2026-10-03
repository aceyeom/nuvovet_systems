/**
 * Golden screen 1 (§9.9): one claim-queue row in all six DataTable states. WP6 reuses these exact classes
 * (production rows carry data-golden="queue-row"). Hover and keyboard focus are pseudo-states, so the
 * reference rows force their look with the same utilities the states produce.
 */
import { DataTable, createColumnHelper } from '@/ui/patterns/DataTable'
import { DecisionBadge } from '@/ui/patterns/status'
import { fmtNum } from '@/ui/lib/format'

const STATES = [
  { state: 'rest', label: '기본' },
  { state: 'hover', label: '마우스 오버' },
  { state: 'selected', label: '선택 (j/k)' },
  { state: 'focus', label: '키보드 포커스' },
  { state: 'flagged', label: '검토 표시' },
  { state: 'flagged-selected', label: '검토 표시 + 선택' },
]

// Sample rows for the reference screen only (the same claim repeated per state).
const ROWS = STATES.map((s, i) => ({
  id: `SYN-2026-0022${i}`,
  state: s.state,
  stateLabel: s.label,
  received: '2026-09-17',
  clinic: '샘플동물병원 32',
  species: '개',
  diagnosis: '위장관 이물',
  billed: 7383700,
  decision: s.state.startsWith('flagged') ? 'review' : ['pend', 'auto_approve', 'deny_recommended', 'auto_approve'][i % 4],
  reason: '지역 P90 초과',
  findings: s.state.startsWith('flagged') ? 8 : 1,
  siu: s.state.startsWith('flagged') ? '대상' : '',
}))

const col = createColumnHelper()
const columns = [
  col.accessor('id', {
    header: '청구 ID',
    meta: { id: true },
    cell: (info) => (
      <a href={`#${info.getValue()}`} className={info.row.original.state === 'focus' ? 'outline-2 -outline-offset-2 outline-ring' : undefined}>
        {info.getValue()}
      </a>
    ),
  }),
  col.accessor('received', { header: '접수일', meta: { className: 'num text-left' } }),
  col.accessor('clinic', { header: '병원' }),
  col.accessor('species', { header: '종' }),
  col.accessor('diagnosis', { header: '진단명' }),
  col.accessor('billed', { header: '청구액 (원)', meta: { num: true, emphasizeWhenFlagged: true }, cell: (i) => fmtNum(i.getValue()) }),
  col.accessor('decision', { header: '판정', enableSorting: false, cell: (i) => <DecisionBadge decision={i.getValue()} /> }),
  col.accessor('reason', { header: '주요 사유', enableSorting: false, meta: { className: 'text-text-2' } }),
  col.accessor('findings', { header: '소견', meta: { num: true } }),
  col.accessor('siu', { header: 'SIU', enableSorting: false, meta: { className: 'text-text-2' } }),
  col.accessor('stateLabel', { header: '상태 (참고)', enableSorting: false, meta: { className: 'text-muted-foreground text-xs' } }),
]

export default function GoldenQueue() {
  const selected = ROWS.filter((r) => r.state === 'selected' || r.state === 'flagged-selected').map((r) => r.id)
  return (
    <section data-golden-screen="queue" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">1. 청구 심사 대기열: 행 상태 6가지</h2>
      <DataTable
        aria-label="청구 심사 대기열 행 상태"
        density="compact"
        columns={columns}
        data={ROWS}
        paginate={false}
        isFlagged={(r) => r.state.startsWith('flagged')}
        selectedId={selected[0]}
        rowClassName={(r) => (r.state === 'hover' ? 'bg-row-hover' : r.state === 'flagged-selected' ? 'bg-brand-soft' : undefined)}
        getRowProps={(r) => ({ "data-golden": "queue-row", ...(r.state === 'flagged-selected' ? { 'aria-current': 'true' } : {}) })}
      />
    </section>
  )
}
