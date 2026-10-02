/**
 * Standalone entry for the portfolio showcase (portfolio.html →
 * vite.portfolio.config.js → dist-portfolio/index.html).
 *
 * Routing is hash-based, so the build works from any host path and from a
 * file:// URL. Imports only react, react-dom and files under src/portfolio.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PortfolioApp from './PortfolioApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PortfolioApp />
  </StrictMode>,
)
