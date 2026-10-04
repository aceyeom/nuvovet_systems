/**
 * Landing nav: a full-width white bar, 64 px, with a hairline under it once the page scrolls (no glass,
 * no float). Left the master wordmark; right the section links as plain text, the Claims console as a
 * text link and the EMR demo as the one solid button. On phones the links fold into a plain sheet behind
 * a CSS-drawn menu glyph (two hairlines; two crossed hairlines to close).
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLockup } from '@/brand/Brand'
import { CONTACT_EMAIL, useI18n } from '../../i18n'

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return scrolled
}

export function Nav() {
  const { t } = useI18n()
  const n = t.landing.nav
  const scrolled = useScrolled()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const close = () => setOpen(false)
  const links = [
    ['#dur', n.dur],
    ['#claims', n.claims],
    ['#integration', n.integration],
    ['#security', n.security],
  ]
  return (
    <header className="lp-nav" data-scrolled={scrolled || undefined} data-open={open || undefined}>
      <div className="lp-container lp-nav-bar">
        <Link to="/" aria-label={n.home} className="lp-nav-home" onClick={close}>
          <BrandLockup height={22} />
        </Link>
        <nav aria-label={n.label} className="lp-nav-links">
          {links.map(([href, label]) => <a key={href} href={href} className="lp-nav-link">{label}</a>)}
          {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`} className="lp-nav-link">{n.pilot}</a> : null}
        </nav>
        <div className="lp-nav-end">
          <Link to="/insurance" className="lp-nav-link lp-nav-console">{n.claimsCta}</Link>
          <Link to="/dur#/emr/V1" className="nvb-btn lp-nav-btn">{n.durCta}</Link>
          <button
            type="button"
            className="lp-nav-menu"
            aria-label={open ? n.menuClose : n.menu}
            aria-expanded={open}
            aria-controls="lp-nav-sheet"
            onClick={() => setOpen((o) => !o)}
          >
            <span className={open ? 'nvb-close' : 'nvb-menu'} aria-hidden="true" />
          </button>
        </div>
      </div>
      {open ? (
        <nav id="lp-nav-sheet" aria-label={n.label} className="lp-nav-sheet">
          <div className="lp-container">
            {links.map(([href, label]) => <a key={href} href={href} onClick={close}>{label}</a>)}
            <Link to="/insurance" onClick={close}>{n.claimsCta}</Link>
          </div>
        </nav>
      ) : null}
    </header>
  )
}

export default Nav
