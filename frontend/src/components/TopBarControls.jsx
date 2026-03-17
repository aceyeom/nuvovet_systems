import React, { useEffect, useRef, useState } from 'react';
import { CreditCard, History, LogOut, Settings, UserCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';

export function TopBarControls({ className = '' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang } = useI18n();
  const { isAuthenticated, user, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const settingsRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!settingsRef.current?.contains(event.target)) setSettingsOpen(false);
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
        setProfileOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative" ref={settingsRef}>
        <button
          type="button"
          onClick={() => {
            setSettingsOpen((value) => !value);
            setProfileOpen(false);
          }}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
            settingsOpen
              ? 'border-slate-300 bg-slate-100 text-slate-900'
              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
          aria-label={lang === 'ko' ? '설정' : 'Settings'}
          aria-expanded={settingsOpen}
        >
          <Settings size={17} />
        </button>

        {settingsOpen && (
          <div className="absolute right-0 top-full z-[70] mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-scale-in">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {lang === 'ko' ? '언어' : 'Language'}
              </p>
            </div>
            <div className="space-y-1 p-2">
              <button
                type="button"
                onClick={() => {
                  setLang('ko');
                  setSettingsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                  lang === 'ko' ? 'bg-slate-900 font-semibold text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>한국어</span>
                {lang === 'ko' && <span className="text-[10px]">✓</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLang('en');
                  setSettingsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                  lang === 'en' ? 'bg-slate-900 font-semibold text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>English</span>
                {lang === 'en' && <span className="text-[10px]">✓</span>}
              </button>
            </div>
          </div>
        )}
      </div>

      {!isAuthenticated ? (
        <>
          <button
            type="button"
            onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            {lang === 'ko' ? '로그인' : 'Log in'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            {lang === 'ko' ? '회원가입' : 'Sign up'}
          </button>
        </>
      ) : (
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((value) => !value);
              setSettingsOpen(false);
            }}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
              profileOpen || location.pathname === '/account'
                ? 'border-slate-300 bg-slate-100 text-slate-900'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
            aria-label={lang === 'ko' ? '프로필' : 'Profile'}
            aria-expanded={profileOpen}
          >
            <UserCircle size={18} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-[70] mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-scale-in">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
                    <UserCircle size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{user?.username || 'User'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1 p-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/account');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Settings size={15} className="text-slate-400" />
                  <span>{lang === 'ko' ? '계정' : 'Account'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/pricing');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <CreditCard size={15} className="text-slate-400" />
                  <span>{lang === 'ko' ? '결제' : 'Billing'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/patients');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <History size={15} className="text-slate-400" />
                  <span>{lang === 'ko' ? '환자 기록' : 'Patient History'}</span>
                </button>
              </div>
              <div className="border-t border-slate-100 p-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                    navigate('/');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut size={15} className="text-red-400" />
                  <span>{lang === 'ko' ? '로그아웃' : 'Logout'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TopBarControls;
