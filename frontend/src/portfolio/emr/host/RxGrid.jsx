/**
 * TX/RX grid of the fictional EMR (EMR popup spec §2.4). Host rows are React state; every row
 * keeps one `<span data-nv-slot="<rowId>">` inside its DUR cell (a <td> cannot take a shadow
 * root), and the widget re-acquires the slots on every check(). React never renders children
 * into the slot, so the widget's shadow root survives re-renders.
 */

import { DRUG_BY_ID } from '../../knowledge/drugs.js'
import { DISPENSE, ROUTES, UNITS, itemInfo } from './catalog.js'
import { calcAmount, fmtNum, fmtWon, rowPrice, totalMg } from './calc.js'

const DEMO_ADDITION = '데모 추가 열: 관찰된 EMR 화면에는 없습니다'
const CALC_TITLE = 'EMR 계산값 (표시용)'

/** Ingredient name for labels ("이버멕틴"); the code for an unknown product. */
export function ingredientName(code) {
  const info = itemInfo(code)
  if (info.kind === 'product') return DRUG_BY_ID[info.drugId]?.name.ko ?? info.shortName
  return info.shortName
}

const COLUMNS = [
  { key: 'folder', label: '폴더명', cls: 'emr-col-folder' },
  { key: 'kind', label: '구분', title: 'Rx 처방 / Tx 원내 처치·투여' },
  { key: 'code', label: '상품코드', cls: 'emr-col-code' },
  { key: 'name', label: '이름' },
  { key: 'unit', label: '단위', title: '포·mL·mcg는 데모 추가 단위입니다' },
  { key: 'qty', label: '투여량 Qty', cls: 'emr-r' },
  { key: 'calc', label: '계산량', title: CALC_TITLE },
  { key: 'tt', label: '횟수 Tt', cls: 'emr-r', title: '1일 투여 횟수' },
  { key: 'dy', label: '일수 Dy', cls: 'emr-r' },
  { key: 'rt', label: '경로 Rt' },
  { key: 'sig', label: '용법', title: DEMO_ADDITION },
  { key: 'disp', label: '조제', title: DEMO_ADDITION },
  { key: 'total', label: '전체', cls: 'emr-r', title: CALC_TITLE },
  { key: 'price', label: '금액', cls: 'emr-r emr-col-price', title: '가상 단가' },
  { key: 'dur', label: 'DUR', cls: 'emr-col-dur', title: 'NuvoVet DUR 검토 결과' },
  { key: 'del', label: '', cls: 'emr-col-del', sr: '삭제' },
]

function Row({ row, weightKg, selected, highlighted, onChange, onDelete, onSelect }) {
  const info = itemInfo(row.productCode)
  const ing = ingredientName(row.productCode)
  const calc = calcAmount(row, weightKg)
  const total = totalMg(row, weightKg)
  const price = rowPrice(row)
  const set = (k) => (e) => onChange(row.rowId, { [k]: e.target.value })
  const label = (what) => `${what}: ${info.shortName}`
  const unitOptions = UNITS.includes(row.unit) ? UNITS : [...UNITS, row.unit]

  return (
    <tr
      data-row={row.rowId}
      data-selected={selected || undefined}
      data-dur-hl={highlighted || undefined}
      onFocusCapture={() => onSelect(row.rowId)}
    >
      <td className="emr-col-folder">{info.folder}</td>
      <td>
        <select className="emr-select emr-w-kind" aria-label={label('구분')} value={row.kind} onChange={set('kind')}>
          <option value="Rx">Rx</option>
          <option value="Tx">Tx</option>
        </select>
      </td>
      <td className="emr-code emr-col-code">{row.productCode}</td>
      <td className="emr-name" title={info.name} data-truncate="">{info.name}</td>
      <td>
        <select className="emr-select emr-w-unit" aria-label={label('단위')} value={row.unit} onChange={set('unit')}>
          {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td className="emr-r">
        <input
          id={`emr-qty-${row.rowId}`}
          data-emr-qty={row.rowId}
          className="emr-input emr-w-qty emr-num"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          aria-label={label('투여량')}
          value={row.qty ?? ''}
          onChange={set('qty')}
        />
      </td>
      <td className="emr-calc emr-num" title={CALC_TITLE}>{calc.text}</td>
      <td className="emr-r">
        <input className="emr-input emr-w-tt emr-num" type="number" step="1" min="0" inputMode="numeric" aria-label={label('횟수')} value={row.tt ?? ''} onChange={set('tt')} />
      </td>
      <td className="emr-r">
        <input className="emr-input emr-w-tt emr-num" type="number" step="1" min="0" inputMode="numeric" aria-label={label('일수')} value={row.dy ?? ''} onChange={set('dy')} />
      </td>
      <td>
        <select className="emr-select emr-w-rt" aria-label={label('경로')} value={row.rt ?? ''} onChange={set('rt')}>
          <option value="">-</option>
          {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td>
        <input className="emr-input emr-w-sig" type="text" aria-label={label('용법')} value={row.sig ?? ''} onChange={set('sig')} />
      </td>
      <td>
        {info.solid ? (
          <select className="emr-select emr-w-disp" aria-label={label('조제')} value={row.dispense || '정제'} onChange={set('dispense')}>
            {DISPENSE.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : null}
      </td>
      <td className="emr-r emr-num" title={CALC_TITLE}>{total == null ? '' : `${fmtNum(total)} mg`}</td>
      <td className="emr-r emr-num emr-col-price" title="가상 단가">{fmtWon(price)}</td>
      <td className="emr-col-dur">
        <span data-nv-slot={row.rowId} />
      </td>
      <td className="emr-col-del">
        <button type="button" className="emr-del" aria-label={`행 삭제: ${ing}`} title="행 삭제" onClick={() => onDelete(row.rowId)}>×</button>
      </td>
    </tr>
  )
}

/** 금액 total of the grid (fictional prices). */
export const gridTotal = (rows) => rows.reduce((s, r) => s + (rowPrice(r) || 0), 0)

export function RxGrid({ rows, weightKg, selectedRowId, highlightRowIds, onChange, onDelete, onSelect }) {
  return (
    <div className="emr-gridwrap" data-emr="rx-grid">
      <table className="emr-grid" aria-label="처치·처방 목록">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key} scope="col" className={c.cls} title={c.title} aria-label={c.sr}>
                {c.sr ? null : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="emr-grid-empty">
              <td colSpan={COLUMNS.length}>처방이 없습니다. Rx 검색에서 제품을 추가하십시오.</td>
            </tr>
          ) : rows.map((r) => (
            <Row
              key={r.rowId}
              row={r}
              weightKg={weightKg}
              selected={selectedRowId === r.rowId}
              highlighted={highlightRowIds.has(r.rowId)}
              onChange={onChange}
              onDelete={onDelete}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default RxGrid
