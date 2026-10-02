/**
 * A4 page preview for the report and the owner handout. On screen it is a
 * sheet on the page background; in print it is the page itself (@page A4 in
 * portfolio.css). The footer repeats on every printed page.
 */
export default function A4Sheet({ children, footer = null, className = '', label }) {
  return (
    <article className={`pf-a4 ${className}`.trim()} aria-label={label}>
      <div className="pf-a4__content">{children}</div>
      {footer && <div className="pf-a4__footer">{footer}</div>}
    </article>
  )
}
