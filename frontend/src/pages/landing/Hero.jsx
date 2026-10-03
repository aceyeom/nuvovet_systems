// Landing hero (DESIGN_SYSTEM.md §5.1): a left-aligned two-line headline, one sentence, one ink button
// and one text link, over a full-width crop of the live claim screen. The crop renders heroClaim.json
// synchronously (ClaimDetailPreview), so nothing shimmers at first paint.
import { Link } from 'react-router-dom'
import { Button } from '@/ui/primitives/button'
import { fmtNum } from '@/ui/lib/format'
import { ClaimDetailPreview } from '../insurance/preview/index.js'
import { CONTACT_EMAIL, useI18n } from '../../i18n'

/** The headline's preferred line breaks are written as `\n` in ko.js (one founder-editable key). */
export const headlineParts = (s) =>
  String(s)
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)

const TEXT_LINK =
  'inline-flex h-10 items-center rounded-sm text-sm font-medium text-brand underline-offset-4 transition-colors duration-100 hover:text-brand-hover hover:underline'

export function Hero({ claim }) {
  const { t } = useI18n()
  const h = t.landing.hero
  const n = t.landing.nav
  return (
    <section aria-labelledby="hero-title" className="pt-24 pb-16 max-sm:pt-12 max-sm:pb-12">
      <div className="mx-auto max-w-300 px-4 sm:px-6">
        {/* Each `\n`-separated part of the headline is its own line; on a narrow screen a part wraps inside
            itself (balanced), so the break never falls inside a phrase such as "수 있는" (review P1-16). */}
        <h1 id="hero-title" className="text-5xl font-bold text-foreground max-lg:text-3xl">
          {headlineParts(h.headline).map((part, i) => (
            <span key={i} className="block text-balance">
              {i > 0 ? <span className="sr-only"> </span> : null}
              {part}
            </span>
          ))}
        </h1>
        <p className="mt-4 text-lg text-text-2">{h.lead}</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          {CONTACT_EMAIL ? (
            <Button asChild size="lg">
              <a href={`mailto:${CONTACT_EMAIL}`}>{n.pilot}</a>
            </Button>
          ) : null}
          <Button asChild size="lg" variant={CONTACT_EMAIL ? 'secondary' : 'default'}>
            <Link to="/insurance">{h.primary}</Link>
          </Button>
          <Link to="/insurance/api" className={TEXT_LINK}>
            {h.secondary}
          </Link>
        </div>
        <figure className="mt-12 max-sm:mt-10">
          <div
            data-hero-crop=""
            aria-label={h.previewLabel(claim.claim_id)}
            role="group"
            className="h-140 overflow-hidden rounded-lg border border-border max-sm:h-120"
          >
            <ClaimDetailPreview claimId={claim.claim_id} hideBreadcrumb />
          </div>
          <figcaption className="mt-3 text-xs text-muted-foreground">{h.caption(fmtNum(claim.claimsCount))}</figcaption>
        </figure>
      </div>
    </section>
  )
}

export default Hero
