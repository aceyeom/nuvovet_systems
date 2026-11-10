// Landing `/`: the brand surface (src/brand). A clinical product page: white paper, near-black ink,
// Pretendard throughout, and the product as the picture. The hero's rendered laptop replays both
// products; below it one chapter per product built on live product UI (the annotated EMR, the island
// states and the demo patients; one worked claim), then integration, controls and the two closing doors.
// Claims figures are read at runtime from heroClaim.json, so `/` never loads the 2.4 MB snapshot.
// Korean only; the page is light by design (the brand layer does not follow the console theme here).
import './landing.css'
import './replays/replays.css'
import { useTitle } from '@/ui/patterns/useTitle'
import heroClaim from '../insurance/preview/heroClaim.json'
import { useI18n } from '../../i18n'
import Nav from './Nav'
import Hero from './Hero'
import { ClaimsChapter, Closing, ControlsSection, DurChapter, IntegrationSection, PilotBand } from './Sections'
import Footer from './Footer'

export default function Landing() {
  const { t } = useI18n()
  useTitle(t.landing.title)
  return (
    <div className="lp nv-scope" data-theme="light">
      <Nav />
      <main>
        <Hero />
        <DurChapter />
        <ClaimsChapter claim={heroClaim} />
        <IntegrationSection />
        <ControlsSection claim={heroClaim} />
        <Closing />
        <PilotBand />
      </main>
      <Footer />
    </div>
  )
}
