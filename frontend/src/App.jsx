import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Demo from './pages/Demo';
import FullSystem from './pages/FullSystem';
import Patients from './pages/Patients';
import Pricing from './pages/Pricing';
import Account from './pages/Account';
import Dashboard from './pages/Dashboard';
import Start from './pages/Start';
import Insurance from './pages/Insurance';

function AppRoutes() {
  return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/start" element={<Start />} />
        <Route path="/insurance" element={<Insurance />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/dashboard" element={<Account />} />
        <Route path="/analytics" element={<Dashboard />} />
        <Route path="/system" element={<FullSystem />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/account" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/system" replace />} />
        <Route path="/register" element={<Navigate to="/system" replace />} />
      </Routes>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}
