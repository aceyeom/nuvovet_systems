// Landing `/`: the expressive brand surface (src/brand, landing.css). A 3D laptop replays both
// products in the hero; below it, a role chooser and one section per product in its own colour.
// Claims figures are read at runtime from heroClaim.json, so `/` never loads the 2.4 MB snapshot.
// Korean only; the page is light by design (the brand layer does not follow the console theme).
import '@fontsource-variable/geist'
import './landing.css'
import { useTitle } from '@/ui/patterns/useTitle'
import heroClaim from '../insurance/preview/heroClaim.json'
import { useI18n } from '../../i18n'
import Nav from './Nav'
import Hero from './Hero'
import { Band, ChooserSection, ClaimsSection, DurSection, IntegrationSection, PilotBand, SecuritySection } from './Sections'
import Footer from './Footer'

export default function Landing() {
  const { t } = useI18n()
  useTitle(t.landing.title)
  return (
    <div className="lp nv-scope" data-theme="light">
      <Nav />
      <main>
        <Hero />
        <ChooserSection />
        <DurSection />
        <ClaimsSection claim={heroClaim} />
        <IntegrationSection />
        <SecuritySection />
        <Band />
        <PilotBand />
      </main>
      <Footer />
    </div>
  )
}
