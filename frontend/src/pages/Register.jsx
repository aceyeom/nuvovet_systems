import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { NuvovetWordmark } from '../components/NuvovetLogo';
import { TopBarControls } from '../components/TopBarControls';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useI18n();
  const { signup, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('redirect') || '/pricing';
  }, [location.search]);

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !password) {
      setError(lang === 'ko' ? '이메일과 비밀번호를 입력하세요.' : 'Please enter both email and password.');
      return;
    }
    if (!emailRegex.test(normalizedEmail)) {
      setError(lang === 'ko' ? '유효한 이메일 주소를 입력하세요.' : 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError(lang === 'ko' ? '비밀번호는 6자 이상이어야 합니다.' : 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError(lang === 'ko' ? '비밀번호가 일치하지 않습니다.' : 'Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await signup(normalizedEmail, password);
    setSubmitting(false);

    if (result.ok) {
      navigate(redirectTo, { replace: true });
      return;
    }

    setError(result.error || (lang === 'ko' ? '회원가입에 실패했습니다.' : 'Sign up failed.'));
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
              <UserPlus size={24} className="text-slate-500" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              {lang === 'ko' ? '회원가입' : 'Register'}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              {lang === 'ko' ? '새 계정 만들기' : 'Create your account'}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {lang === 'ko' ? '이메일' : 'Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoFocus
                placeholder={lang === 'ko' ? 'example@clinic.com' : 'example@clinic.com'}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {lang === 'ko' ? '비밀번호' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder={lang === 'ko' ? '6자 이상 입력' : 'At least 6 characters'}
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

            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {lang === 'ko' ? '비밀번호 확인' : 'Confirm password'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder={lang === 'ko' ? '비밀번호를 다시 입력' : 'Re-enter password'}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                ? (lang === 'ko' ? '계정 생성 중...' : 'Creating account...')
                : (lang === 'ko' ? '계정 만들기' : 'Create account')}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">
            {lang === 'ko' ? '이미 계정이 있나요?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirectTo)}`)}
              className="font-semibold text-slate-700 hover:text-slate-900"
            >
              {lang === 'ko' ? '로그인' : 'Log in'}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}
