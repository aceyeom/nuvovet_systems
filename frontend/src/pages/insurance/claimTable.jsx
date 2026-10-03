// Queue columns and the mobile list form of the queue (DESIGN_SYSTEM.md §5.3). The overview's 처리 대상
// table uses the same columns, so both look exactly like the golden queue rows (§9.9).
import { Link } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { createColumnHelper } from '@/ui/patterns/DataTable'
import { DecisionBadge } from '@/ui/patterns/status'
import { fmtNum, fmtWon } from '@/ui/lib/format'
import { PEND_LABEL, SIU_LABEL, SPECIES } from './strings.ko.js'
import { diagnosisOf } from './data/claimIndex.js'

const NO_DX = '진단명 없음'
/** aria-label of the leading flag icon (high-severity SIU signal, model.isFlaggedClaim). */
export const FLAG_LABEL = 'SIU 신호'

export const claimReason = (c) => {
  if (c.top_finding) return c.top_finding
  if (c.pend_codes?.length) return `서류 요청: ${c.pend_codes.map((p) => PEND_LABEL[p] || p).join(', ')}`
  return ''
}
export const siuText = (c) => (c.siu || []).map((s) => SIU_LABEL[s] || s).join(', ')

const col = createColumnHelper()

/** hrefFor(claim) returns the first-cell link target (the detail page, or `?sel=` at wide). */
export function claimColumns(hrefFor, index = {}) {
  return [
    col.accessor('claim_id', {
      header: '청구 ID',
      meta: { id: true },
      cell: (info) => (
        <Link to={hrefFor(info.row.original)} className="rounded-sm">
          {info.getValue()}
        </Link>
      ),
    }),
    col.accessor('visit_date', { header: '진료일', meta: { className: 'num text-left', hideBelow: 'xl' } }),
    col.accessor('clinic', { header: '병원', meta: { truncate: 'max-w-32' } }),
    col.accessor((c) => SPECIES[c.species] || c.species, { id: 'species', header: '종' }),
    col.accessor((c) => diagnosisOf(index, c) || '', {
      id: 'diagnosis',
      header: '진단명',
      meta: { truncate: 'max-w-36' },
      cell: (i) => {
        const c = i.row.original
        const ko = i.getValue()
        if (!ko) return <span className="text-muted-foreground">{NO_DX}</span>
        return ko !== c.diagnosis ? <span title={c.diagnosis}>{ko}</span> : ko
      },
    }),
    col.accessor('billed', { header: '청구액 (원)', meta: { num: true, emphasizeWhenFlagged: true }, cell: (i) => fmtNum(i.getValue()) }),
    col.accessor('decision', { header: '판정', enableSorting: false, cell: (i) => <DecisionBadge decision={i.getValue()} /> }),
    col.accessor(claimReason, {
      id: 'reason',
      header: '주요 사유',
      enableSorting: false,
      // Below 1440 px the long text columns go (진료일 below 1280); all of it is one click away on the claim.
      meta: { className: 'text-text-2', truncate: 'max-w-32', hideBelow: 'wide' },
    }),
    col.accessor('finding_count', { header: '소견', meta: { num: true } }),
    col.accessor(siuText, { id: 'siu', header: 'SIU', enableSorting: false, meta: { className: 'text-text-2', truncate: 'max-w-24', hideBelow: 'wide' } }),
  ]
}

/**
 * While the queue's 720 px side panel is open the list keeps 청구 ID, 청구액 and 판정 (the panel shows the
 * rest of the selected claim); the other columns are hidden, not cut at the edge.
 */
export const PANEL_VISIBILITY = { visit_date: false, clinic: false, species: false, diagnosis: false, reason: false, finding_count: false, siu: false }

export const SORTABLE = ['claim_id', 'visit_date', 'clinic', 'species', 'diagnosis', 'billed', 'finding_count']

/** Under 1024 px the queue is a list of stacked rows; each row is one link. */
export function ClaimList({ claims, hrefFor, selectedId, isFlagged, index = {}, className, empty = '해당하는 청구가 없습니다.' }) {
  if (!claims.length) return <p className="py-10 text-center text-sm text-text-2">{empty}</p>
  return (
    <ul className={className ? `divide-y divide-border border-y border-border ${className}` : 'divide-y divide-border border-y border-border'}>
      {claims.map((c) => {
        const reason = claimReason(c)
        return (
          <li key={c.claim_id} className={selectedId === c.claim_id ? 'bg-brand-soft' : undefined} aria-current={selectedId === c.claim_id ? 'true' : undefined}>
            <Link to={hrefFor(c)} className="flex flex-col gap-1 px-4 py-3 hover:bg-row-hover">
              <span className="flex items-center gap-2">
                <span className="id text-sm text-foreground">{c.claim_id}</span>
                {isFlagged?.(c) ? <CircleAlert role="img" aria-label={FLAG_LABEL} strokeWidth={1.5} className="size-3.5 shrink-0 text-sev-moderate" /> : null}
                <DecisionBadge decision={c.decision} className="ml-auto" />
              </span>
              <span className={diagnosisOf(index, c) ? 'text-sm text-foreground' : 'text-sm text-muted-foreground'}>{diagnosisOf(index, c) || NO_DX}</span>
              {reason ? (
                <span data-truncate="" title={reason} className="truncate text-xs text-text-2">
                  {reason}
                </span>
              ) : null}
              <span className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">{c.clinic}</span>
                <span className={isFlagged?.(c) ? 'num text-sm font-medium text-foreground' : 'num text-sm text-foreground'}>{fmtWon(c.billed)}</span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
