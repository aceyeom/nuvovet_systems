import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './i18n';
import Landing from './pages/Landing';
import Start from './pages/Start';
import Insurance from './pages/Insurance';
import ClinicClaim from './pages/ClinicClaim';

// Portfolio DUR showcase (self-contained under src/portfolio, hash-routed inside /dur).
// It replaces the retired DUR product pages (Demo, FullSystem, Patients, Pricing, ...);
// that code is recoverable from git history (see docs/portfolio/DUR_SHOWCASE_SPEC.md §8).
const PortfolioApp = lazy(() => import('./portfolio/PortfolioApp'));

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/start" element={<Start />} />
      <Route path="/insurance" element={<Insurance />} />
      <Route path="/clinic/claim" element={<ClinicClaim />} />
      <Route path="/academy" element={<Navigate to="/start" replace />} />
      <Route path="/dur" element={<Suspense fallback={null}><PortfolioApp /></Suspense>} />
      <Route path="/demo" element={<Navigate to="/dur" replace />} />
      <Route path="/system" element={<Navigate to="/dur" replace />} />
      {/* Retired routes (/pricing, /patients, /dashboard, /login, ...) and any unknown path. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </I18nProvider>
  );
}
