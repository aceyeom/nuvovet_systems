/**
 * Landing footer: the wordmark and its note, two text columns (DUR, Claims), the photo credits
 * (id="credits"; the EMR demo's "사진 출처" links here) and the copyright. Text only.
 */
import { Link } from 'react-router-dom'
import { BrandLockup } from '@/brand/Brand'
import { PhotoCredits } from '@/brand/PhotoCredits'
import { useI18n } from '../../i18n'

export default function Footer() {
  const { t, lang } = useI18n()
  const f = t.landing.footer
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <BrandLockup height={20} />
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
        <section id="credits" aria-labelledby="credits-title" className="lp-credits">
          <h2 id="credits-title" className="lp-footer-head">{f.credits}</h2>
          <PhotoCredits />
        </section>
        <p className="lp-footer-base">{f.copyright}</p>
      </div>
    </footer>
  )
}
