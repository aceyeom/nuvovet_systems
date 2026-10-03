// 병원 리스크 (DESIGN_SYSTEM.md §5.3): /insurance/clinics?sort=. Clinics with fewer than 10 claims are
// drawn muted; one footnote explains it. Rows link to /insurance/clinics/:clinicId. CSV is built locally.
import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Button } from '@/ui/primitives/button'
import { DataTable, createColumnHelper } from '@/ui/patterns/DataTable'
import { ProgressBar } from '@/ui/patterns/metrics'
import { PageHeader } from '@/ui/patterns/PageHeader'
import { useTitle } from '@/ui/patterns/useTitle'
import { fmtNum, fmtPct, fmtWon } from '@/ui/lib/format'
import { useMediaQuery, DESKTOP } from '@/ui/ext/wp6/useMediaQuery'
import { useConsole } from '../context'
import { SMALL_SAMPLE, clinicRows, parseSort, toCsv } from '../model'
import { LoadError, Page, PageSkeleton } from './states'

const col = createColumnHelper()
const SORTABLE = ['clinic_id', 'name', 'region', 'claims', 'billed', 'flagged', 'siu', 'at_risk', 'share']
const DEFAULT_SORT = 'at_risk.desc'

function Share({ c }) {
  return (
    <span className="flex items-center gap-2">
      <ProgressBar value={c.share * 100} muted={c.small} label={`검토 대상 비중 ${fmtPct(c.share)}`} className="w-24" />
      <span className={c.small ? 'num w-12 text-xs text-muted-foreground' : 'num w-12 text-xs text-foreground'}>{fmtPct(c.share)}</span>
    </span>
  )
}

export const clinicColumns = [
  col.accessor('clinic_id', {
    header: '병원 ID',
    meta: { id: true },
    cell: (i) => <Link to={`/insurance/clinics/${i.getValue()}`}>{i.getValue()}</Link>,
  }),
  col.accessor('name', { header: '이름' }),
  col.accessor('region', { header: '지역' }),
  col.accessor('claims', { header: '청구 수', meta: { num: true } }),
  col.accessor('billed', { header: '청구액 (원)', meta: { num: true }, cell: (i) => fmtNum(i.getValue()) }),
  col.accessor('flagged', { header: '검토 대상', meta: { num: true } }),
  col.accessor('siu', { header: 'SIU', meta: { num: true } }),
  col.accessor('at_risk', { header: '위험 금액 (원)', meta: { num: true }, cell: (i) => fmtNum(i.getValue()) }),
  col.accessor('share', { header: '검토 대상 비중', cell: (i) => <Share c={i.row.original} /> }),
]

const CSV_COLUMNS = [
  { label: 'clinic_id', value: (c) => c.clinic_id },
  { label: '이름', value: (c) => c.name },
  { label: '지역', value: (c) => c.region },
  { label: '청구 수', value: (c) => c.claims },
  { label: '청구액 (원)', value: (c) => c.billed },
  { label: '검토 대상', value: (c) => c.flagged },
  { label: '서류 요청', value: (c) => c.pended },
  { label: 'SIU', value: (c) => c.siu },
  { label: '위험 금액 (원)', value: (c) => c.at_risk },
  { label: '검토 대상 비중', value: (c) => c.share.toFixed(4) },
]

function exportCsv(rows) {
  const blob = new Blob(['﻿' + toCsv(rows, CSV_COLUMNS)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'nuvovet-clinic-risk.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function ClinicList({ rows }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {rows.map((c) => (
        <li key={c.clinic_id}>
          <Link to={`/insurance/clinics/${c.clinic_id}`} className="flex flex-col gap-1.5 px-4 py-3 hover:bg-row-hover">
            <span className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-foreground">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.region}</span>
              <span className="num ml-auto text-sm text-foreground">{fmtWon(c.at_risk)}</span>
            </span>
            <span className="flex items-center gap-3 text-xs text-text-2">
              <span>
                청구 <span className="num">{fmtNum(c.claims)}</span>건
              </span>
              <span>
                검토 대상 <span className="num">{fmtNum(c.flagged)}</span>건
              </span>
              <span className="ml-auto">
                <Share c={c} />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function Clinics() {
  useTitle('병원 리스크', 'nuvovet')
  const { demo, demoState } = useConsole()
  const [params, setParams] = useSearchParams()
  const desktop = useMediaQuery(DESKTOP)
  const rows = useMemo(() => clinicRows(demo?.summary?.clinics), [demo])
  const sortParam = params.get('sort') || DEFAULT_SORT
  const sorting = useMemo(() => parseSort(sortParam, SORTABLE), [sortParam])
  // ?sort= mirrors the header sort (replace, so sorting does not fill the history).
  const onSortingChange = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const s = next?.[0]
      const value = s ? `${s.id}.${s.desc ? 'desc' : 'asc'}` : ''
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (!value || value === DEFAULT_SORT) p.delete('sort')
          else p.set('sort', value)
          return p
        },
        { replace: true },
      )
    },
    [sorting, setParams],
  )
  if (demoState.error) return <LoadError onRetry={demoState.reload} />
  if (!demo) return <PageSkeleton rows={12} />
  const small = rows.filter((c) => c.small).length

  return (
    <Page>
      <PageHeader
        title="병원 리스크"
        meta={`병원 ${fmtNum(rows.length)}곳`}
        actions={
          <Button variant="ghost" onClick={() => exportCsv(rows)}>
            <Download strokeWidth={1.5} />
            내보내기 (CSV)
          </Button>
        }
      />
      <div className={desktop ? 'min-w-0' : '-mx-6 max-sm:-mx-4'}>
        {desktop ? (
          <DataTable
            aria-label="병원별 청구 위험"
            density="compact"
            columns={clinicColumns}
            data={rows}
            getRowId={(c) => c.clinic_id}
            sorting={sorting}
            onSortingChange={onSortingChange}
            paginate={false}
          />
        ) : (
          <ClinicList rows={[...rows].sort((a, b) => b.at_risk - a.at_risk)} />
        )}
      </div>
      {small ? <p className="text-xs text-muted-foreground">청구 {SMALL_SAMPLE}건 미만 병원은 흐리게 표시합니다.</p> : null}
    </Page>
  )
}
