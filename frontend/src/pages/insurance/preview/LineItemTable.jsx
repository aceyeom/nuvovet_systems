// LineItemTable({ lines, flaggedOnly }): the 진료 항목 table of a claim (DESIGN_SYSTEM.md §5.3).
// Frozen API (§8.1). `lines` are claim-model lines (preview/model.js); `flaggedOnly` keeps the lines that
// carry an actionable finding. Flagged lines use the DataTable flagged state (leading icon, no fill).
import { useMemo } from 'react'
import { DataTable, createColumnHelper } from '@/ui/patterns/DataTable'
import { fmtNum } from '@/ui/lib/format'
import { RangeGlyph } from '@/ui/ext/wp6/RangeGlyph'
import { BENEFIT, reasonLabel } from '../strings.ko.js'

const col = createColumnHelper()

export function LineDecision({ decision }) {
  if (!decision) return <span className="text-muted-foreground">판정 없음</span>
  const paid = decision.eligible
  const word = paid ? (decision.reason_code === 'discount' ? '차감' : '지급') : '제외'
  const why = paid ? BENEFIT[decision.benefit_type] || '' : reasonLabel(decision.reason_code)
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={paid ? 'font-medium text-foreground' : 'font-medium text-text-2'}>{word}</span>
      {why ? <span className="text-xs text-muted-foreground">{why}</span> : null}
    </span>
  )
}

export function Percentile({ line }) {
  const p = line.benchmark_percentile
  if (p == null) return <span className="text-xs text-muted-foreground">벤치마크 없음</span>
  const word = `P${Math.round(p)}`
  return (
    <RangeGlyph
      value={p}
      low={10}
      mid={50}
      high={90}
      word={word}
      tone={p > 90 ? 'moderate' : undefined}
      label={`지역 분위 ${word}, 참고 범위 P10–P90`}
    />
  )
}

const columns = [
  col.accessor('description', {
    header: '청구 원문',
    cell: (i) => <span className="text-foreground">{i.getValue()}</span>,
  }),
  col.accessor('code', {
    header: '표준 코드',
    enableSorting: false,
    cell: (i) => {
      const l = i.row.original
      if (l.code) {
        return (
          <span className="inline-flex items-baseline gap-2">
            <span className="id text-text-2">{l.code}</span>
            <span className="text-foreground">{l.code_name}</span>
          </span>
        )
      }
      if (l.drug_ingredient) {
        return (
          <span className="inline-flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">약품</span>
            <span className="text-foreground">{l.drug_ingredient}</span>
          </span>
        )
      }
      return <span className="text-muted-foreground">코드 없음</span>
    },
  }),
  col.accessor('quantity', { header: '수량', meta: { num: true }, cell: (i) => fmtNum(i.getValue()) }),
  col.accessor('total', { header: '금액 (원)', meta: { num: true, emphasizeWhenFlagged: true }, cell: (i) => fmtNum(i.getValue()) }),
  col.accessor('benchmark_percentile', { header: '지역 분위', cell: (i) => <Percentile line={i.row.original} /> }),
  col.accessor((l) => l.decision?.eligible, { id: 'decision', header: '지급 판정', enableSorting: false, cell: (i) => <LineDecision decision={i.row.original.decision} /> }),
]

/**
 * The leading flag marks only lines with money at risk that stand out: a pricing/integrity/clinical
 * amount above zero and, when the line has a regional benchmark, a price above P99. Lines that merely
 * carry a coverage note stay unflagged, so the icon is not on most rows (§1.2 L12).
 */
export const isFlaggedLine = (l) => !!l.flagged && (l.at_risk || 0) > 0 && (l.benchmark_percentile == null || l.benchmark_percentile > 99)

export function LineItemTable({ lines, flaggedOnly = false, className, 'aria-label': ariaLabel = '진료 항목' }) {
  const data = useMemo(() => (flaggedOnly ? (lines || []).filter((l) => l.flagged) : lines || []), [lines, flaggedOnly])
  return (
    <DataTable
      aria-label={ariaLabel}
      className={className}
      columns={columns}
      data={data}
      getRowId={(l, i) => `${i}`}
      density="default"
      paginate={false}
      isFlagged={isFlaggedLine}
      flagLabel="검토 대상 금액 있음"
      empty="진료 항목이 없습니다."
    />
  )
}

export default LineItemTable
