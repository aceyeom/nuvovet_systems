/**
 * NavigationBar — Unified top navigation for authenticated pages.
 *
 * Layout:  Logo | Dashboard | Analytics | Patient Records  ···  Start Diagnosis | Settings icon | Profile icon
 *
 * Used on Dashboard, Analytics, Patients, and FullSystem pages.
 * On unauthenticated pages (Landing, Demo, Pricing, Login) the old TopBarControls is still used.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CreditCard, LogOut, Settings, UserCircle, Zap, LayoutDashboard, ClipboardList, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NuvovetWordmark } from './NuvovetLogo';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';

export default function NavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang } = useI18n();
  const { isAuthenticated, user, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const settingsRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (!settingsRef.current?.contains(e.target)) setSettingsOpen(false);
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') { setSettingsOpen(false); setProfileOpen(false); }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `relative px-3 py-1.5 text-[13px] font-semibold rounded-lg transition-colors ${
      isActive(path)
        ? 'text-slate-900 bg-slate-100'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.07)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-[58px] flex items-center gap-6">

        {/* ── Logo ── */}
        <button
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
          className="flex items-center shrink-0"
        >
          <NuvovetWordmark className="text-[20px] sm:text-[20px]" />
        </button>

        {/* ── Center nav links ── */}
        {isAuthenticated && (
          <nav className="flex items-center gap-1 ml-2">
            <button onClick={() => navigate('/dashboard')} className={navLinkClass('/dashboard')}>
              <span className="flex items-center gap-1.5">
                <LayoutDashboard size={14} />
                {lang === 'ko' ? '대시보드' : 'Dashboard'}
              </span>
            </button>
            <button onClick={() => navigate('/analytics')} className={navLinkClass('/analytics')}>
              <span className="flex items-center gap-1.5">
                <BarChart3 size={14} />
                {lang === 'ko' ? '애널리틱스' : 'Analytics'}
              </span>
            </button>
            <button onClick={() => navigate('/patients')} className={navLinkClass('/patients')}>
              <span className="flex items-center gap-1.5">
                <ClipboardList size={14} />
                {lang === 'ko' ? '환자 기록' : 'Patient Records'}
              </span>
            </button>
          </nav>
        )}

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Right controls ── */}
        <div className="flex items-center gap-1.5">
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate('/system')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                isActive('/system')
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Zap size={14} />
              {lang === 'ko' ? '진단 시작' : 'Start Diagnosis'}
            </button>
          )}

          {/* Settings dropdown */}
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => { setSettingsOpen(v => !v); setProfileOpen(false); }}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                settingsOpen
                  ? 'border-slate-300 bg-slate-100 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700'
              }`}
              aria-label={lang === 'ko' ? '설정' : 'Settings'}
            >
              <Settings size={16} />
            </button>

            {settingsOpen && (
              <div className="absolute right-0 top-full z-[70] mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-scale-in">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {lang === 'ko' ? '언어' : 'Language'}
                  </p>
                </div>
                <div className="space-y-1 p-2">
                  {[{ code: 'ko', label: '한국어' }, { code: 'en', label: 'English' }].map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => { setLang(code); setSettingsOpen(false); }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                        lang === code ? 'bg-slate-900 font-semibold text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{label}</span>
                      {lang === code && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Auth controls */}
          {!isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {lang === 'ko' ? '로그인' : 'Log in'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/pricing')}
                className="rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800"
              >
                {lang === 'ko' ? '회원가입' : 'Sign up'}
              </button>
            </>
          ) : (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => { setProfileOpen(v => !v); setSettingsOpen(false); }}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                  profileOpen
                    ? 'border-slate-300 bg-slate-100 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
                aria-label={lang === 'ko' ? '프로필' : 'Profile'}
              >
                <UserCircle size={18} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full z-[70] mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-scale-in">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-[13px] font-bold">
                        {(user?.username || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{user?.username || 'User'}</p>
                        <p className="text-[11px] text-slate-400">Free {lang === 'ko' ? '플랜' : 'Plan'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0.5 p-1.5">
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); navigate('/dashboard'); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Settings size={14} className="text-slate-400" />
                      <span>{lang === 'ko' ? '대시보드' : 'Dashboard'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); navigate('/pricing'); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <CreditCard size={14} className="text-slate-400" />
                      <span>{lang === 'ko' ? '결제' : 'Billing'}</span>
                    </button>
                  </div>
                  <div className="border-t border-slate-100 p-1.5">
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); logout(); navigate('/'); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut size={14} className="text-red-400" />
                      <span>{lang === 'ko' ? '로그아웃' : 'Logout'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
