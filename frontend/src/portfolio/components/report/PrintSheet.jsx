import A4Sheet from '../A4Sheet.jsx'

/**
 * An A4 sheet whose footer repeats on every printed page without covering content. The visible
 * footer is A4Sheet's (position: fixed in print, so Chrome and Firefox repeat it on each page);
 * the table's <tfoot> holds an empty spacer of the same height, which browsers also repeat on
 * every page, reserving the space the footer sits in. On screen the table is a plain block.
 */
export default function PrintSheet({ children, footer, label, className = '', lang }) {
  return (
    <div className="overflow-x-auto" lang={lang}>
      <A4Sheet className={className} label={label} footer={footer}>
        <table className="pf-printwrap block w-full" role="presentation">
          <tbody className="block">
            <tr className="block">
              <td className="block">{children}</td>
            </tr>
          </tbody>
          <tfoot aria-hidden="true" className="block">
            <tr className="block">
              <td className="block"><div className="pf-printwrap__space" /></td>
            </tr>
          </tfoot>
        </table>
      </A4Sheet>
    </div>
  )
}
