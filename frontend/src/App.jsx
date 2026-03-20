import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Demo from './pages/Demo';
import FullSystem from './pages/FullSystem';
import Patients from './pages/Patients';
import Pricing from './pages/Pricing';
import Account from './pages/Account';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// Protect /system — redirect to /system with login if unauthenticated
function ProtectedRoute({ children }) {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }
  // If not authenticated, render children anyway — FullSystem shows its own login gate
  return children;
}

function AppRoutes() {
  return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/dashboard" element={<Account />} />
        <Route path="/analytics" element={<Dashboard />} />
        <Route path="/system" element={
          <ProtectedRoute>
            <FullSystem />
          </ProtectedRoute>
        } />
        <Route path="/patients" element={<Patients />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/account" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
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
