import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from './i18n';
import Landing from './pages/Landing';
import Demo from './pages/Demo';
import FullSystem from './pages/FullSystem';

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/system" element={<FullSystem />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}
