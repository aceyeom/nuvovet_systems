import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './i18n';

// Every page is its own chunk (DESIGN_SYSTEM.md §8.2 WP0). The fallback is an empty canvas block:
// no skeleton, so nothing shimmers on `/` at first paint.
const Landing = lazy(() => import('./pages/Landing'));
const Insurance = lazy(() => import('./pages/Insurance'));
const ClinicClaim = lazy(() => import('./pages/ClinicClaim'));
// Portfolio DUR showcase (self-contained under src/portfolio, hash-routed inside /dur).
const PortfolioApp = lazy(() => import('./portfolio/PortfolioApp'));
// Dev-only kitchen sink: every primitive and pattern, plus the golden reference screens.
const KitchenSink = import.meta.env.DEV ? lazy(() => import('./ui/KitchenSink')) : null;

function Blank() {
  return <div className="min-h-dvh bg-background" />;
}

function page(el) {
  return <Suspense fallback={<Blank />}>{el}</Suspense>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={page(<Landing />)} />
      <Route path="/insurance/*" element={page(<Insurance />)} />
      <Route path="/clinic/claim" element={page(<ClinicClaim />)} />
      <Route path="/dur" element={page(<PortfolioApp />)} />
      <Route path="/start" element={<Navigate to="/" replace />} />
      <Route path="/academy" element={<Navigate to="/" replace />} />
      <Route path="/demo" element={<Navigate to="/dur" replace />} />
      <Route path="/system" element={<Navigate to="/dur" replace />} />
      {KitchenSink && <Route path="/__ui/*" element={page(<KitchenSink />)} />}
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
