import A4Sheet from '../A4Sheet.jsx'

/**
 * An A4 sheet whose footer repeats on every printed page without covering
 * content. The visible footer is A4Sheet's (position: fixed in print, so
 * Chrome and Firefox repeat it on each page); the table's <tfoot> holds an
 * empty spacer of the same height, which browsers also repeat on every page,
 * reserving the space the footer sits in. On screen the table is a plain block.
 */
export default function PrintSheet({ children, footer, label, className = '', lang }) {
  return (
    <div className="pf-sheetwrap" lang={lang}>
      <A4Sheet className={`pf-paper ${className}`.trim()} label={label} footer={footer}>
        <table className="pf-printwrap" role="presentation">
          <tbody>
            <tr>
              <td>{children}</td>
            </tr>
          </tbody>
          <tfoot aria-hidden="true">
            <tr>
              <td><div className="pf-printwrap__space" /></td>
            </tr>
          </tfoot>
        </table>
      </A4Sheet>
    </div>
  )
}
