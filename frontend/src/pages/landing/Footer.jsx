/**
 * Landing footer: the wordmark and its note, two link columns (DUR, Claims), then the base row with
 * the copyright and the photo credits. The credits are a disclosure (id="credits"): the list of the
 * demo patients' photographs is one click away without filling the footer. The EMR demo's "사진 출처"
 * links to /#credits, so the disclosure opens itself when the page arrives on, or moves to, that hash.
 */
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BrandLockup } from '@/brand/Brand'
import { PhotoCredits } from '@/brand/PhotoCredits'
import { useI18n } from '../../i18n'

export default function Footer() {
  const { t, lang } = useI18n()
  const f = t.landing.footer
  const credits = useRef(null)
  useEffect(() => {
    const open = () => {
      if (window.location.hash !== '#credits' || !credits.current) return
      credits.current.open = true
      credits.current.scrollIntoView({ block: 'start' })
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <BrandLockup height={22} />
            <p>{f.note}</p>
          </div>
          <nav aria-label={f.label} className="lp-footer-cols">
            <div>
              <p className="lp-footer-head">{f.dur}</p>
              <Link to="/dur#/emr/V1">{f.emr}</Link>
              {/* the case study is bilingual: open it in the landing's language */}
              <Link to={`/dur#/?lang=${lang || 'ko'}`}>{f.study}</Link>
            </div>
            <div>
              <p className="lp-footer-head">{f.claims}</p>
              <Link to="/insurance">{f.console}</Link>
              <Link to="/insurance/api">{f.api}</Link>
            </div>
          </nav>
        </div>
        <div className="lp-footer-base">
          <p>{f.copyright}</p>
          <details ref={credits} id="credits" className="lp-credits">
            <summary>{f.credits}</summary>
            <PhotoCredits />
          </details>
        </div>
      </div>
    </footer>
  )
}
