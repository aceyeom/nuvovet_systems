/**
 * Landing nav: a floating glass bar. Left the master lockup; in the middle the two products as
 * coloured sub-brand links plus 연동 / 보안; right one call to action per product. On phones the
 * links fold into a sheet.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { BrandLockup } from '@/brand/Brand'
import { CONTACT_EMAIL, useI18n } from '../../i18n'

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8)
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
  const links = (
    <>
      <a href="#dur" className="lp-navlink" data-product="dur" onClick={() => setOpen(false)}><span className="lp-navdot" />{n.dur}</a>
      <a href="#claims" className="lp-navlink" data-product="claims" onClick={() => setOpen(false)}><span className="lp-navdot" />{n.claims}</a>
      <a href="#start" className="lp-navlink" onClick={() => setOpen(false)}>{n.how}</a>
      <a href="#integration" className="lp-navlink" onClick={() => setOpen(false)}>{n.integration}</a>
      <a href="#security" className="lp-navlink" onClick={() => setOpen(false)}>{n.security}</a>
      {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`} className="lp-navlink">{n.pilot}</a> : null}
    </>
  )
  return (
    <header className="lp-nav-wrap" data-scrolled={scrolled || undefined}>
      <div className="lp-nav">
        <Link to="/" aria-label={n.home} className="lp-nav-home">
          <BrandLockup size="sm" />
        </Link>
        <nav aria-label={n.label} className="lp-nav-links">{links}</nav>
        <div className="lp-nav-cta">
          <Link to="/dur#/emr/V1" className="lp-btn lp-btn-sm" data-product="dur">{n.durCta}</Link>
          <Link to="/insurance" className="lp-btn lp-btn-sm" data-product="claims">{n.claimsCta}</Link>
          <button type="button" className="lp-nav-menu" aria-label={n.menu} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open ? <nav aria-label={n.label} className="lp-nav-sheet">{links}</nav> : null}
    </header>
  )
}

export default Nav
