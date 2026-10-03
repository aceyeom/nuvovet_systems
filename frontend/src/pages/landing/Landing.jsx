// Landing `/` (DESIGN_SYSTEM.md §5.1): built around the live product UI. No stat strip, no shader, no
// illustrations. Every number is read at runtime from heroClaim.json (WP6), so `/` never loads the
// 2.4 MB snapshot. Korean only; the page follows the system theme and has no toggle.
import { useTitle } from '@/ui/patterns/useTitle'
import { heroClaim } from '../insurance/preview/index.js'
import { useI18n } from '../../i18n'
import Nav from './Nav'
import Hero from './Hero'
import { IntegrationSection, LedgerSection, PilotBand, SecuritySection } from './Sections'
import Footer from './Footer'

export default function Landing() {
  const { t } = useI18n()
  useTitle(t.landing.title)
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Nav />
      <main>
        <Hero claim={heroClaim} />
        <LedgerSection claim={heroClaim} />
        <IntegrationSection />
        <SecuritySection />
        <PilotBand />
      </main>
      <Footer />
    </div>
  )
}
