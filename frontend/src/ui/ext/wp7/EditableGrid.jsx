/**
 * EditableGrid (WP7, DESIGN_SYSTEM.md §4.0, §5.4): editable line items with 44 px rows.
 *
 * ≥ 1024 px it is a real <table>: the column header is the visible label and every control carries
 * aria-label = column + row number (§4.6). Below 1024 px the same markup restacks into one group per row
 * with a visible label above each control, a group title ("항목 1") and the delete button beside it.
 * No box around a group (the grid already sits in a Card): groups are separated by hairlines.
 *
 *   columns  [{ key, header, cell(row, i, { id, ariaLabel }), num?, readOnly?, className?, stackClassName? }]
 *            className      width / alignment of the desktop column (e.g. "w-24")
 *            stackClassName span in the stacked layout (default one of 2 or 4 columns; read-only cells
 *                           span 2 and put the value on the label's line)
 *   rows, getRowKey(row, i)
 *   rowTitle(i)            "항목 1"
 *   onRemove(i)            delete button per row (aria-label "<rowTitle> 삭제")
 *   total                  { label, value, columnKey }: a ledger-total row under that column
 *   empty                  text when there are no rows
 */
import { useId } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Button } from '@/ui/primitives/button'

export function EditableGrid({ columns, rows, getRowKey = (_, i) => i, rowTitle = (i) => `${i + 1}행`, onRemove, total, empty, label, className }) {
  const gid = useId().replace(/:/g, '')
  const totalAt = total ? columns.findIndex((c) => c.key === total.columnKey) : -1
  return (
    <div className={cn('w-full', className)}>
      <table aria-label={label} className="w-full border-collapse text-sm max-lg:block">
        <thead className="max-lg:hidden">
          <tr className="h-9 border-b border-border-strong">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-1.5 align-middle text-xs font-medium text-muted-foreground first:pl-0', c.num ? 'num' : 'text-left', c.className)}>
                {c.header}
              </th>
            ))}
            {onRemove ? (
              <th scope="col" className="w-10 pr-0">
                <span className="sr-only">삭제</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="max-lg:flex max-lg:flex-col">
          {rows.length === 0 && empty ? (
            <tr className="max-lg:block">
              <td colSpan={columns.length + (onRemove ? 1 : 0)} className="py-4 text-sm text-muted-foreground max-lg:block">
                {empty}
              </td>
            </tr>
          ) : null}
          {rows.map((row, i) => {
            const title = rowTitle(i)
            return (
              <tr
                key={getRowKey(row, i)}
                className="h-11 border-b border-border max-lg:grid max-lg:h-auto max-lg:grid-cols-2 max-lg:gap-3 max-lg:py-4 sm:max-lg:grid-cols-4"
              >
                <th scope="row" className="hidden text-left text-sm font-medium text-foreground max-lg:col-span-1 max-lg:flex max-lg:items-center sm:max-lg:col-span-3">
                  {title}
                </th>
                {columns.map((c) => {
                  const id = `${gid}-${c.key}-${i}`
                  const ariaLabel = `${c.header} ${i + 1}행`
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        'px-1.5 py-0.5 align-middle first:pl-0 max-lg:flex max-lg:flex-col max-lg:gap-1.5 max-lg:p-0',
                        c.readOnly && 'max-lg:col-span-2 max-lg:flex-row max-lg:items-center max-lg:justify-between',
                        c.stackClassName,
                      )}
                    >
                      {c.readOnly ? (
                        <span aria-hidden="true" className="text-xs text-muted-foreground lg:hidden">
                          {c.header}
                        </span>
                      ) : (
                        <label htmlFor={id} className="text-xs font-medium text-text-2 lg:hidden">
                          {c.header}
                        </label>
                      )}
                      {c.cell(row, i, { id, ariaLabel })}
                    </td>
                  )
                })}
                {onRemove ? (
                  <td className="w-10 py-0.5 pr-0 text-right align-middle max-lg:w-auto max-lg:justify-self-end max-lg:order-first max-lg:col-start-2 max-lg:row-start-1 max-lg:p-0 sm:max-lg:col-start-4">
                    <Button type="button" variant="ghost" size="icon" aria-label={`${title} 삭제`} title={`${title} 삭제`} onClick={() => onRemove(i)}>
                      <X aria-hidden="true" strokeWidth={1.5} />
                    </Button>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
        {total && rows.length ? (
          <tfoot className="max-lg:block">
            <tr className="h-11 max-lg:flex max-lg:items-center max-lg:justify-between">
              <th scope="row" colSpan={Math.max(1, totalAt)} className="ledger-total pr-1.5 text-right text-sm font-medium text-foreground max-lg:flex-1 max-lg:py-3 max-lg:text-left">
                {total.label}
              </th>
              <td className="ledger-total num px-1.5 text-sm font-semibold text-foreground max-lg:py-3 max-lg:pr-0">{total.value}</td>
              {columns.length - totalAt - 1 + (onRemove ? 1 : 0) > 0 ? (
                <td colSpan={columns.length - totalAt - 1 + (onRemove ? 1 : 0)} className="ledger-total max-lg:hidden" />
              ) : null}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}

export default EditableGrid
