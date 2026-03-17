import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Settings, UserCircle, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';

function LoginModal({ open, onClose }) {
  const { lang } = useI18n();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setUsername('');
      setPassword('');
      setShowPassword(false);
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError(lang === 'ko' ? '아이디와 비밀번호를 입력하세요.' : 'Enter both username and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(username.trim(), password);
    setSubmitting(false);

    if (result.ok) {
      onClose();
      return;
    }

    setError(result.error || (lang === 'ko' ? '로그인에 실패했습니다.' : 'Login failed.'));
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              {lang === 'ko' ? '로그인' : 'Login'}
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {lang === 'ko' ? '관리자 계정으로 로그인' : 'Sign in with the admin account'}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {lang === 'ko' ? '허용되는 계정은 admin / admin 뿐입니다.' : 'Only admin / admin is accepted.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label={lang === 'ko' ? '로그인 닫기' : 'Close login'}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="admin"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="admin"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? (lang === 'ko' ? '로그인 중...' : 'Signing in...')
              : (lang === 'ko' ? '로그인' : 'Log in')}
          </button>
        </form>
      </div>
    </div>
  );
}

export function TopBarControls({ autoOpenLogin = false, className = '' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang } = useI18n();
  const { isAuthenticated } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    if (autoOpenLogin && !isAuthenticated) setLoginOpen(true);
  }, [autoOpenLogin, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) setLoginOpen(false);
  }, [isAuthenticated]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!settingsRef.current?.contains(event.target)) setSettingsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSettingsOpen(false);
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            onClick={() => setSettingsOpen((value) => !value)}
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
            <div className="absolute right-0 top-full z-[70] mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
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
              onClick={() => setLoginOpen(true)}
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
          <button
            type="button"
            onClick={() => navigate('/account')}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
              location.pathname === '/account'
                ? 'border-slate-300 bg-slate-100 text-slate-900'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
            aria-label={lang === 'ko' ? '계정' : 'Account'}
          >
            <UserCircle size={18} />
          </button>
        )}
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

export default TopBarControls;