/**
 * Standalone entry for the portfolio showcase (portfolio.html →
 * vite.portfolio.config.js → dist-portfolio/index.html).
 *
 * Routing is hash-based, so the build works from any host path and from a
 * file:// URL. The stylesheet is src/ui/app.css (the same Tailwind entry as the
 * main app's src/index.css) and the font is the one inlined @font-face of
 * src/ui/fonts-standalone.css (subset and inlined at build time, DESIGN_SYSTEM.md §2.4).
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/ui/fonts-standalone.css'
import '@/ui/app.css'
import PortfolioApp from './PortfolioApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PortfolioApp />
  </StrictMode>,
)
