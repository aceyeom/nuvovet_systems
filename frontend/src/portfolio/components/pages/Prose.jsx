/** Long-form page section: heading, optional lead, content. */
export function Section({ id, title, lead = null, children, className = '' }) {
  const hid = `pf-sec-${id}`
  return (
    <section className={`pf-psec ${className}`.trim()} aria-labelledby={hid} id={`sec-${id}`}>
      <h2 className="pf-psec__title" id={hid}>{title}</h2>
      {lead && <p className="pf-psec__lead">{lead}</p>}
      {children}
    </section>
  )
}
