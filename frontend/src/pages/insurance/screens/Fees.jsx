// 진료비 벤치마크 (DESIGN_SYSTEM.md §5.3): /insurance/fees?q=&region=. One price-check toolbar, a table
// of benchmarked items only (P10–P50–P90 RangeGlyph, Korean units) and a collapsed list of the rest.
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/ui/primitives/input'
import { Label } from '@/ui/primitives/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select'
import { Combobox } from '@/ui/patterns/Combobox'
import { DataTable, createColumnHelper } from '@/ui/patterns/DataTable'
import { Disclosure } from '@/ui/patterns/Disclosure'
import { MoneyInput } from '@/ui/patterns/Field'
import { PageHeader } from '@/ui/patterns/PageHeader'
import { useTitle } from '@/ui/patterns/useTitle'
import { fmtNum, fmtWon } from '@/ui/lib/format'
import { RangeGlyph } from '@/ui/ext/wp6/RangeGlyph'
import { useMediaQuery, DESKTOP } from '@/ui/ext/wp6/useMediaQuery'
import { useProcedures } from '../data/resources'
import { PROC_CATEGORY, UNIT } from '../strings.ko.js'
import { LoadError, Page, PageSkeleton } from './states'

const Z90 = 1.2815515655446004
const erf = (x) => {
  // Abramowitz–Stegun 7.1.26
  const s = Math.sign(x)
  const a = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * a)
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)
  return s * y
}
/** Percentile of a price in a log-normal fitted through P10 / P50 / P90 (the engine's model). */
export function percentileOf(price, { p10, p50, p90 }) {
  if (!price) return null
  const sigma = price >= p50 ? Math.log(p90 / p50) / Z90 : Math.log(p50 / p10) / Z90
  return 100 * 0.5 * (1 + erf(Math.log(price / p50) / sigma / Math.SQRT2))
}

const round100 = (v) => Math.round(v / 100) * 100
const unitOf = (u) => UNIT[u] || u
const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, '')

// Every distribution is an estimate; the few anchored on a public survey get a † after the name and one
// footnote under the table (no column that is empty on almost every row, no badge on most rows, L12).
const SOURCE_NOTE = '농식품부 진료비 현황조사의 전국 평균에 맞춘 추정 분포입니다.'
const sourced = (p) => !!p.benchmark?.source_url

function Name({ p }) {
  return (
    <>
      {p.name_ko}
      {sourced(p) ? (
        <sup className="ml-0.5 text-xs text-text-2" title={SOURCE_NOTE}>
          †<span className="sr-only"> {SOURCE_NOTE}</span>
        </sup>
      ) : null}
    </>
  )
}

const rangeLabel = ({ p10, p50, p90 }) => `P10 ${fmtWon(round100(p10))}, 중앙값 ${fmtWon(round100(p50))}, P90 ${fmtWon(round100(p90))}`

const col = createColumnHelper()
const columns = [
  col.accessor('code', { header: '코드', meta: { id: true }, cell: (i) => <span className="text-text-2">{i.getValue()}</span> }),
  col.accessor('name_ko', { header: '항목', cell: (i) => <Name p={i.row.original} /> }),
  col.accessor((p) => PROC_CATEGORY[p.category] || p.category, { id: 'category', header: '분류', meta: { className: 'text-text-2' } }),
  col.accessor((p) => unitOf(p.unit), { id: 'unit', header: '단위', enableSorting: false, meta: { className: 'text-text-2' } }),
  col.accessor((p) => p.b.p10, { id: 'p10', header: 'P10 (원)', meta: { num: true, className: 'text-text-2' }, cell: (i) => fmtNum(round100(i.getValue())) }),
  col.accessor((p) => p.b.p50, { id: 'p50', header: '중앙값 (원)', meta: { num: true, className: 'font-medium' }, cell: (i) => fmtNum(round100(i.getValue())) }),
  col.accessor((p) => p.b.p90, { id: 'p90', header: 'P90 (원)', meta: { num: true, className: 'text-text-2' }, cell: (i) => fmtNum(round100(i.getValue())) }),
  col.display({
    id: 'range',
    header: '분포',
    cell: (i) => {
      const { p10, p50, p90 } = i.row.original.b
      return <RangeGlyph size="lg" low={p10} mid={p50} high={p90} min={0} max={p90 * 1.4} label={rangeLabel(i.row.original.b)} />
    },
  }),
]

/** Under 1024 px: one stacked row per item, every price visible without sideways scrolling. */
function FeeList({ rows }) {
  if (!rows.length) return <p className="py-10 text-center text-sm text-text-2">일치하는 항목이 없습니다.</p>
  return (
    <ul className="divide-y divide-border border-y border-border">
      {rows.map((p) => (
        <li key={p.code} className="flex flex-col gap-1.5 px-4 py-3">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 text-sm font-medium text-foreground">
              <Name p={p} />
            </span>
            <span className="id ml-auto shrink-0 text-xs text-text-2">{p.code}</span>
          </span>
          <span className="text-xs text-text-2">
            {PROC_CATEGORY[p.category] || p.category} · 1{unitOf(p.unit)} 기준
          </span>
          <dl className="grid grid-cols-3 gap-2 text-xs">
            {[
              ['P10', p.b.p10],
              ['중앙값', p.b.p50],
              ['P90', p.b.p90],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className={k === '중앙값' ? 'num text-left text-sm font-medium text-foreground' : 'num text-left text-sm text-text-2'}>{fmtWon(round100(v))}</dd>
              </div>
            ))}
          </dl>
          <RangeGlyph size="lg" low={p.b.p10} mid={p.b.p50} high={p.b.p90} min={0} max={p.b.p90 * 1.4} label={rangeLabel(p.b)} />
        </li>
      ))}
    </ul>
  )
}

function PriceCheck({ items, region }) {
  const [code, setCode] = useState(items[0]?.code ?? null)
  const [price, setPrice] = useState(null)
  const item = items.find((p) => p.code === code)
  const p = item && price ? percentileOf(price, item.b) : null
  const over = item && price ? price > item.b.p90 : false
  return (
    <section aria-label="가격 확인" className="flex flex-wrap items-end gap-3 border-y border-border py-4">
      <div className="flex w-72 flex-col gap-1.5 max-sm:w-full">
        <Label htmlFor="fee-proc" className="text-sm font-medium text-foreground">
          진료 항목
        </Label>
        <Combobox
          id="fee-proc"
          options={items.map((x) => ({ value: x.code, label: x.name_ko, hint: x.code, keywords: x.name_en }))}
          value={code}
          onChange={setCode}
          placeholder="항목 선택"
          searchPlaceholder="항목 이름 또는 코드"
        />
      </div>
      <div className="flex w-44 flex-col gap-1.5 max-sm:w-full">
        <Label htmlFor="fee-price" className="text-sm font-medium text-foreground">
          청구 단가
        </Label>
        <MoneyInput id="fee-price" value={price} onChange={setPrice} aria-label="청구 단가 (원)" />
      </div>
      <div className="flex min-h-8 min-w-0 flex-1 items-center gap-3 text-sm" aria-live="polite">
        {item && p != null ? (
          <>
            <RangeGlyph
              value={price}
              low={item.b.p10}
              mid={item.b.p50}
              high={item.b.p90}
              min={0}
              max={Math.max(item.b.p90 * 1.4, price * 1.05)}
              word={`P${Math.round(p)}`}
              tone={over ? 'moderate' : undefined}
              label={`${region} 분위 P${Math.round(p)}`}
            />
            <span className="text-text-2">
              {region} 중앙값 <span className="num text-foreground">{fmtWon(round100(item.b.p50))}</span>, P90{' '}
              <span className="num text-foreground">{fmtWon(round100(item.b.p90))}</span>
              {over ? <span className="text-foreground">. P90을 넘습니다.</span> : null}
            </span>
          </>
        ) : (
          <span className="text-text-2">항목과 단가를 입력하면 지역 분위를 계산합니다.</span>
        )}
      </div>
    </section>
  )
}

export default function Fees() {
  useTitle('진료비 벤치마크', 'nuvovet')
  const res = useProcedures()
  const desktop = useMediaQuery(DESKTOP)
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const data = res.data
  const regions = data ? Object.keys(data.regionMultipliers).filter((r) => r !== 'default') : []
  const region = regions.includes(params.get('region')) ? params.get('region') : '서울'

  const { benchmarked, missing } = useMemo(() => {
    if (!data) return { benchmarked: [], missing: [] }
    const m = data.regionMultipliers[region] ?? data.regionMultipliers.default
    const all = data.procedures.map((p) => ({ ...p, b: p.benchmark ? { p10: p.benchmark.p10 * m, p50: p.benchmark.p50 * m, p90: p.benchmark.p90 * m } : null }))
    return { benchmarked: all.filter((p) => p.b), missing: all.filter((p) => !p.b) }
  }, [data, region])
  const needle = norm(q)
  const rows = needle ? benchmarked.filter((p) => norm(p.name_ko).includes(needle) || norm(p.code).includes(needle) || norm(p.name_en).includes(needle)) : benchmarked

  const set = (k, v) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  if (res.error) return <LoadError onRetry={res.reload} />
  if (!data) return <PageSkeleton rows={12} />

  return (
    <Page>
      <PageHeader
        title="진료비 벤치마크"
        meta={`벤치마크 ${fmtNum(benchmarked.length)}개 항목, ${region} 기준`}
        actions={
          <Select value={region} onValueChange={(v) => set('region', v === '서울' ? '' : v)}>
            <SelectTrigger aria-label="지역" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <PriceCheck items={benchmarked} region={region} />
      <div className="relative w-72 max-sm:w-full">
        <Search aria-hidden="true" strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" value={q} onChange={(e) => set('q', e.target.value)} placeholder="항목 이름 또는 코드" aria-label="항목 검색" className="pl-8" />
      </div>
      {desktop ? (
        <DataTable aria-label="진료 항목별 지역 가격 분포" density="compact" columns={columns} data={rows} getRowId={(p) => p.code} paginate={false} empty="일치하는 항목이 없습니다." />
      ) : (
        <div className="-mx-6 max-sm:-mx-4">
          <FeeList rows={rows} />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        분포는 모두 추정치입니다.{benchmarked.some(sourced) ? ' † 표시 항목은 공개 조사의 전국 평균에 맞췄습니다.' : null}
      </p>
      {missing.length ? (
        <Disclosure title={`벤치마크 없는 항목 ${fmtNum(missing.length)}개`}>
          <p className="pb-2 text-sm text-text-2">공개 가격 근거가 없어 분포를 만들지 않았고, 가격 규칙에서 제외합니다.</p>
          <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 xl:grid-cols-3">
            {missing.map((p) => (
              <li key={p.code} className="flex items-baseline gap-2">
                <span className="id text-xs text-text-2">{p.code}</span>
                <span className="text-foreground">{p.name_ko}</span>
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
    </Page>
  )
}
