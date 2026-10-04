/** Landing footer: master lockup, both products with their demos, the API docs, copyright. */
import { Link } from 'react-router-dom'
import { BrandLockup } from '@/brand/Brand'
import { useI18n } from '../../i18n'

export default function Footer() {
  const { t } = useI18n()
  const f = t.landing.footer
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-grid">
        <div className="lp-footer-brand">
          <BrandLockup />
          <p>{f.note}</p>
        </div>
        <nav aria-label={f.label} className="lp-footer-cols">
          <div>
            <BrandLockup product="dur" size="sm" />
            <Link to="/dur#/emr/V1">{f.emr}</Link>
            <Link to="/dur">{f.dur}</Link>
          </div>
          <div>
            <BrandLockup product="claims" size="sm" />
            <Link to="/insurance">{f.console}</Link>
            <Link to="/insurance/api">{f.api}</Link>
          </div>
        </nav>
      </div>
      <div className="lp-container lp-footer-base">
        <span>{f.copyright}</span>
      </div>
    </footer>
  )
}
