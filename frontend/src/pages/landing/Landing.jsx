// Landing `/`: the brand surface (src/brand). Ink on white paper, the display face for the voice and
// Pretendard for the work. One memorable element: the rendered laptop in the hero, which replays both
// products. Below it an index, one chapter per product, integration, security and a closing line.
// Claims figures are read at runtime from heroClaim.json, so `/` never loads the 2.4 MB snapshot.
// Korean only; the page is light by design (the brand layer does not follow the console theme here).
import '@/brand/displayFont'
import './landing.css'
import { useTitle } from '@/ui/patterns/useTitle'
import heroClaim from '../insurance/preview/heroClaim.json'
import { useI18n } from '../../i18n'
import Nav from './Nav'
import Hero from './Hero'
import { ClaimsChapter, Closing, DurChapter, IndexSection, IntegrationSection, PilotBand, SecuritySection } from './Sections'
import Footer from './Footer'

export default function Landing() {
  const { t } = useI18n()
  useTitle(t.landing.title)
  return (
    <div className="lp nv-scope" data-theme="light">
      <Nav />
      <main>
        <Hero />
        <IndexSection />
        <DurChapter />
        <ClaimsChapter claim={heroClaim} />
        <IntegrationSection />
        <SecuritySection />
        <Closing />
        <PilotBand />
      </main>
      <Footer />
    </div>
  )
}
