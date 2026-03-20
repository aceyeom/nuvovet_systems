import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, LogOut, Settings, Search, Zap, BarChart2, Building2, Users,
  ArrowRight, Clock, Beaker, ChevronRight, AlertCircle, CheckCircle,
  AlertTriangle, Shield
} from 'lucide-react';
import NavigationBar from '../components/NavigationBar';
import { useI18n } from '../i18n';
import { getAllPatients } from '../lib/patientStorage';
import { useAuth } from '../context/AuthContext';

// ── Risk Badge ──────────────────────────────────────────────────
function RiskBadge({ level }) {
  const { lang } = useI18n();
  const cfg = {
    Critical: { bg: 'bg-red-100 text-red-700 border-red-200', label: lang === 'ko' ? '위험' : 'Critical', Icon: AlertTriangle },
    Moderate: { bg: 'bg-amber-100 text-amber-700 border-amber-200', label: lang === 'ko' ? '주의' : 'Moderate', Icon: AlertCircle },
    Minor: { bg: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: lang === 'ko' ? '경미' : 'Minor', Icon: AlertCircle },
    Clear: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: lang === 'ko' ? '이상없음' : 'Clear', Icon: CheckCircle },
  };
  const c = cfg[level] || cfg['Clear'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${c.bg}`}>
      <c.Icon size={9} />
      {c.label}
    </span>
  );
}

// ── Coming Soon Feature Card ────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc, lang }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-slate-500" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-slate-800 mb-0.5">{title}</p>
        <p className="text-[12px] text-slate-500 leading-snug">{desc}</p>
      </div>
      <span className="self-start px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded-full tracking-wide">
        {lang === 'ko' ? '준비 중 / In Development' : 'In Development'}
      </span>
    </div>
  );
}

// ── Patient Row ─────────────────────────────────────────────────
function PatientRow({ patient, onClick }) {
  const { lang } = useI18n();
  const lastVisit = patient.visit_history?.length
    ? patient.visit_history[patient.visit_history.length - 1]
    : null;
  const lastRisk = lastVisit?.dur_summary;
  const lastDate = lastVisit?.date
    ? new Date(lastVisit.date).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', year: '2-digit' })
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group border-b border-slate-100 last:border-0"
    >
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-sm">
        {patient.species === 'dog' ? '🐕' : '🐈'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-900 truncate">{patient.name}</p>
        <p className="text-[11px] text-slate-400 truncate">{patient.breed || patient.species} {lastDate ? `· ${lastDate}` : ''}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {lastRisk && <RiskBadge level={lastRisk} />}
        <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
    </button>
  );
}

// ── Main Account Page ───────────────────────────────────────────
export default function Account() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const all = getAllPatients();
    setPatients(all);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const displayName = user?.username || 'Guest';
  const initials = displayName.slice(0, 2).toUpperCase();
  const plan = 'Free'; // placeholder plan

  const planBadge = {
    Free: 'bg-slate-100 text-slate-600',
    Full: 'bg-indigo-100 text-indigo-700',
    Ultra: 'bg-amber-100 text-amber-700',
  }[plan] || 'bg-slate-100 text-slate-600';

  const filteredPatients = search.trim()
    ? patients.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.breed?.toLowerCase().includes(search.toLowerCase())
      )
    : patients;

  const comingSoonFeatures = [
    {
      icon: BarChart2,
      title: lang === 'ko' ? '처방 분석' : 'Prescription Analytics',
      desc: lang === 'ko' ? '처방 패턴 및 상호작용 추이 분석' : 'Analyze prescription patterns and interaction trends',
    },
    {
      icon: Building2,
      title: lang === 'ko' ? '클리닉 통계 대시보드' : 'Clinic Statistics Dashboard',
      desc: lang === 'ko' ? '클리닉 전체 DUR 활동 통계' : 'Clinic-wide DUR activity and usage statistics',
    },
    {
      icon: Users,
      title: lang === 'ko' ? '멀티-수의사 협업' : 'Multi-Vet Collaboration',
      desc: lang === 'ko' ? '여러 수의사가 하나의 계정에서 협업' : 'Multiple vets collaborating under one account',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb]">

      {/* Header */}
      <NavigationBar />

      {loading ? (
        <div className="flex min-h-[calc(100vh-62px)] items-center justify-center px-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        </div>
      ) : !isAuthenticated ? (
        <div className="mx-auto flex min-h-[calc(100vh-62px)] max-w-2xl items-center justify-center px-6 text-center">
          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-12 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
              {lang === 'ko' ? '계정' : 'Account'}
            </p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
              {lang === 'ko' ? '계정을 보려면 로그인하세요.' : 'Sign in to open your account.'}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {lang === 'ko'
                ? '로그인 페이지에서 계정으로 로그인해 주세요.'
                : 'Please sign in from the login page.'}
            </p>
            <button
              onClick={() => navigate('/login?redirect=/account')}
              className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              {lang === 'ko' ? '로그인 페이지로 이동' : 'Go to Login'}
            </button>
          </div>
        </div>
      ) : (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left Sidebar ── */}
          <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
            {/* Profile card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white text-xl font-bold mb-3">
                  {initials}
                </div>
                <p className="text-[15px] font-bold text-slate-900 mb-0.5">{displayName}</p>
                <p className="text-[12px] text-slate-400 mb-2">{user?.email || (lang === 'ko' ? '계정 이메일 없음' : 'No email on file')}</p>
                <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${planBadge}`}>
                  {plan} {lang === 'ko' ? '플랜' : 'Plan'}
                </span>
              </div>

              <hr className="border-slate-100 mb-4" />

              {/* Links */}
              <div className="space-y-1">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                  <Settings size={15} className="text-slate-400" />
                  {lang === 'ko' ? '계정 설정' : 'Account Settings'}
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={15} />
                  {lang === 'ko' ? '로그아웃' : 'Sign out'}
                </button>
              </div>
            </div>

            {/* Plan upgrade nudge */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm">
              <p className="text-[12px] font-bold tracking-wide mb-1 opacity-60">UPGRADE</p>
              <p className="text-[13px] font-semibold mb-3">
                {lang === 'ko' ? '정식 버전으로 전환하세요' : 'Go Full Version'}
              </p>
              <button
                onClick={() => navigate('/pricing')}
                className="w-full py-2 bg-white text-slate-900 text-[12px] font-bold rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
              >
                {lang === 'ko' ? '플랜 보기' : 'View Plans'} <ArrowRight size={12} />
              </button>
            </div>
          </aside>

          {/* ── Center Column ── */}
          <main className="flex-1 min-w-0 flex flex-col gap-6">
            {/* Start Diagnosis CTA */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-4 shadow-lg shadow-slate-900/20">
                <Zap size={26} className="text-white" />
              </div>
              <h2 className="text-[22px] font-black text-slate-900 mb-1">
                {lang === 'ko' ? '진단 시작' : 'Start Diagnosis'}
              </h2>
              <p className="typo-body mb-6 max-w-xs">
                {lang === 'ko'
                  ? '새 처방을 검토하거나 환자를 불러와 DUR 분석을 시작하세요.'
                  : 'Review a new prescription or load a patient for DUR analysis.'}
              </p>
              <button
                onClick={() => navigate('/system')}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.99] transition-all duration-150 shadow-lg shadow-slate-900/20"
              >
                <Zap size={15} />
                {lang === 'ko' ? '진단 시작 / Start Diagnosis' : 'Start Diagnosis'}
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Coming Soon feature cards */}
            <div>
              <p className="typo-section-header mb-3">{lang === 'ko' ? '출시 예정 기능' : 'COMING SOON'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {comingSoonFeatures.map((f, i) => (
                  <FeatureCard key={i} {...f} lang={lang} />
                ))}
              </div>
            </div>
          </main>

          {/* ── Right Panel — Recent Patients ── */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-100">
                <h3 className="text-[14px] font-bold text-slate-900 mb-2">
                  {lang === 'ko' ? '최근 환자' : 'Recent Patients'}
                </h3>
                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={lang === 'ko' ? '이름으로 검색...' : 'Search by name...'}
                    className="w-full pl-7 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
              </div>

              {filteredPatients.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <User size={18} className="text-slate-400" />
                  </div>
                  <p className="text-[13px] font-medium text-slate-500 mb-0.5">
                    {lang === 'ko' ? '아직 저장된 환자가 없습니다' : 'No saved patients yet'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ko' ? '처방을 저장하면 여기에 표시됩니다' : 'Saved prescriptions will appear here'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                  {filteredPatients.map((p) => (
                    <PatientRow
                      key={p.id}
                      patient={p}
                      onClick={() => navigate('/system', { state: { patientId: p.id } })}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

        </div>
      </div>
      )}
    </div>
  );
}
