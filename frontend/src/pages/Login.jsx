import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { NuvovetWordmark } from '../components/NuvovetLogo';
import { TopBarControls } from '../components/TopBarControls';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useI18n();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('redirect') || '/dashboard';
  }, [location.search]);

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError(lang === 'ko' ? '이메일 또는 사용자명과 비밀번호를 입력하세요.' : 'Please enter your email or username and password.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    setSubmitting(true);
    const result = await login(normalizedEmail, password);
    setSubmitting(false);

    if (result.ok) {
      navigate(redirectTo, { replace: true });
      return;
    }

    setError(result.error || (lang === 'ko' ? '로그인에 실패했습니다.' : 'Login failed.'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[62px] w-full max-w-5xl items-center justify-between px-5 sm:px-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-700"
          >
            <ArrowLeft size={16} />
            <NuvovetWordmark />
          </button>
          <TopBarControls />
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-62px)] w-full max-w-5xl items-center justify-center px-5 py-10 sm:px-8">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 animate-scale-in sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Lock size={24} className="text-slate-500" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              {t.login.pageLabel}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              {t.login.pageTitle}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {lang === 'ko' ? '이메일 또는 사용자명' : 'Email or Username'}
              </label>
              <input
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                autoFocus
                placeholder={lang === 'ko' ? 'example@clinic.com 또는 사용자명' : 'example@clinic.com or username'}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {t.login.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder={t.login.passwordPlaceholder}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
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
              {submitting ? t.login.signingIn : t.login.signIn}
            </button>

            <p className="pt-1 text-center text-xs text-slate-500">
              {lang === 'ko' ? '계정이 없나요?' : 'Need an account?'}{' '}
              <button
                type="button"
                onClick={() => navigate(`/register?redirect=${encodeURIComponent(redirectTo)}`)}
                className="font-semibold text-slate-700 hover:text-slate-900"
              >
                {lang === 'ko' ? '회원가입' : 'Sign up'}
              </button>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
