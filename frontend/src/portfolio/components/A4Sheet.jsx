/**
 * A4 page preview for the report and the owner handout. On screen it is a bordered sheet on the
 * page; in print it is the page itself (@page A4 in styles/print.css). The footer repeats on every
 * printed page.
 */
export default function A4Sheet({ children, footer = null, className = '', label }) {
  return (
    <article className={`pf-a4 border border-border bg-background text-foreground ${className}`.trim()} aria-label={label}>
      <div className="pf-a4__content">{children}</div>
      {footer ? <div className="pf-a4__footer mt-12 border-t border-border pt-3 text-xs text-text-2">{footer}</div> : null}
    </article>
  )
}
