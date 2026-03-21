import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, CheckCircle, AlertCircle,
  TrendingUp, Users, Shield, Zap, ChevronRight,
  Clock, Target, Award, BarChart3, Pill,
  Heart, ArrowRight, CalendarClock,
} from 'lucide-react';
import NavigationBar from '../components/NavigationBar';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { getAllPatients } from '../lib/patientStorage';
import { ensureSeedData, getSeedAnalytics } from '../data/seedData';

// ── Animated count-up hook ───────────────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const end = typeof target === 'number' ? target : parseInt(target) || 0;
    if (end === 0) { setCount(0); return; }
    const step = Math.max(1, Math.ceil(end / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return { count, ref };
}

// ── Severity helpers ─────────────────────────────────────────────────
const SEV_CONFIG = {
  Critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500', Icon: AlertTriangle },
  Moderate: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', Icon: AlertCircle },
  Minor:    { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-500', Icon: AlertCircle },
  Clear:    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', Icon: CheckCircle },
};

function SevBadge({ level }) {
  const { lang } = useI18n();
  const c = SEV_CONFIG[level] || SEV_CONFIG.Clear;
  const labels = { Critical: '위험', Moderate: '주의', Minor: '경미', Clear: '이상없음' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${c.bg} ${c.border} ${c.text}`}>
      <c.Icon size={10} />
      {lang === 'ko' ? labels[level] || level : level}
    </span>
  );
}

// ── SVG Mini Bar Chart ───────────────────────────────────────────────
function MiniBarChart({ data, maxVal, color = '#0f172a', height = 100 }) {
  const [hovered, setHovered] = useState(null);
  const barW = Math.max(12, Math.floor(280 / data.length) - 4);
  const totalW = data.length * (barW + 4);

  return (
    <div className="relative overflow-x-auto">
      <svg width={totalW} height={height + 30} className="block">
        {data.map((d, i) => {
          const barH = maxVal > 0 ? (d.count / maxVal) * height : 0;
          const x = i * (barW + 4);
          const y = height - barH;
          return (
            <g key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <rect
                x={x} y={y} width={barW} height={Math.max(barH, 1)}
                rx={3}
                fill={hovered === i ? '#334155' : color}
                opacity={hovered === i ? 1 : 0.7}
                className="transition-all duration-200"
              />
              <text
                x={x + barW / 2} y={height + 14}
                textAnchor="middle"
                className="fill-slate-400 text-[8px]"
              >
                {d.label}
              </text>
              {hovered === i && (
                <g>
                  <rect x={x - 4} y={y - 20} width={barW + 8} height={16} rx={4} fill="#0f172a" />
                  <text x={x + barW / 2} y={y - 8} textAnchor="middle" className="fill-white text-[9px] font-bold">
                    {d.count}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Horizontal bar row ───────────────────────────────────────────────
function HBar({ label, value, maxValue, color = 'bg-slate-800' }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-slate-600 w-28 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} animate-grow-width`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-slate-500 w-6 text-right">{value}</span>
    </div>
  );
}

// ── Donut chart for alert distribution ───────────────────────────────
function AlertDonut({ data }) {
  const { lang } = useI18n();
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  const colors = { Critical: '#ef4444', Moderate: '#f59e0b', Minor: '#eab308', Clear: '#10b981' };
  const labels = { Critical: '위험', Moderate: '주의', Minor: '경미', Clear: '이상없음' };
  const entries = Object.entries(data).filter(([, v]) => v > 0);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {entries.map(([key, value]) => {
          const pct = value / total;
          const dash = pct * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={key}
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={colors[key]}
              strokeWidth="12"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform="rotate(-90 50 50)"
              className="transition-all duration-700"
            />
          );
        })}
        <text x="50" y="48" textAnchor="middle" className="fill-slate-900 text-[18px] font-black">{total}</text>
        <text x="50" y="60" textAnchor="middle" className="fill-slate-400 text-[8px]">{lang === 'ko' ? '총 알림' : 'total'}</text>
      </svg>
      <div className="space-y-1.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[key] }} />
            <span className="text-[11px] text-slate-600">{lang === 'ko' ? labels[key] : key}</span>
            <span className="text-[11px] font-mono text-slate-500">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Performance Score Ring ───────────────────────────────────────────
function ScoreRing({ score, label, size = 80 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = score >= 90 ? '#10b981' : score >= 70 ? '#3b82f6' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          className="transition-all duration-1000"
        />
        <text x={size/2} y={size/2 + 4} textAnchor="middle" className="fill-slate-900 text-[16px] font-black font-mono">
          {score}
        </text>
      </svg>
      <span className="text-[10px] text-slate-500 font-medium text-center">{label}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ANALYTICS PAGE
// ═════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const { user, isAuthenticated, loading } = useAuth();

  // Seed data on mount
  useEffect(() => { ensureSeedData(); }, []);

  const [patients, setPatients] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const loadPatients = async () => {
      const all = await getAllPatients();
      if (!cancelled) setPatients(all);
    };
    void loadPatients();
    return () => {
      cancelled = true;
    };
  }, []);

  // Analytics from seed + real data
  const analytics = useMemo(() => {
    const seed = getSeedAnalytics();

    // Merge real patients (non-seed) into analytics
    const seedIds = new Set(seed.patients.map(p => p.id));
    const realPatients = patients.filter(p => !seedIds.has(p.id));
    const allPatients = [...seed.patients, ...realPatients];
    const allVisits = allPatients.flatMap(p =>
      p.visit_history.map(v => ({ ...v, patientName: p.name, patientId: p.id, species: p.species }))
    );

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const monthVisits = allVisits.filter(v => {
      const d = new Date(v.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    return {
      ...seed,
      uniquePatients: allPatients.length,
      totalDiagnosesThisMonth: monthVisits.length,
      alertsCaughtThisMonth: monthVisits.filter(v => v.dur_summary !== 'Clear').length,
      totalDiagnosesAll: allVisits.length,
      allVisits,
      patients: allPatients,
    };
  }, [patients]);

  // ── Performance scores (derived) ────────────────────────────────
  const perfScores = useMemo(() => {
    const visits = analytics.allVisits;
    if (visits.length === 0) return { alertCatch: 0, accuracy: 0, completeness: 0, overall: 0 };

    // Alert catch rate = non-clear / total (higher = more vigilant)
    const nonClear = visits.filter(v => v.dur_summary !== 'Clear').length;
    const alertCatch = Math.round((nonClear / visits.length) * 100);

    // Prescription accuracy: proportion of visits that are Clear or Minor (within safe range)
    const safeVisits = visits.filter(v => v.dur_summary === 'Clear' || v.dur_summary === 'Minor').length;
    const accuracy = Math.round((safeVisits / visits.length) * 100);

    // Completeness: patients with full data (weight, age, species filled)
    const complete = analytics.patients.filter(p => p.weight_kg && p.age_years && p.species).length;
    const completeness = Math.round((complete / Math.max(analytics.patients.length, 1)) * 100);

    const overall = Math.round((alertCatch * 0.35 + accuracy * 0.40 + completeness * 0.25));

    return { alertCatch, accuracy, completeness, overall };
  }, [analytics]);

  // ── Follow-up candidates ────────────────────────────────────────
  const followUpPatients = useMemo(() => {
    return analytics.patients
      .filter(p => {
        if (!p.visit_history?.length) return false;
        const lastDate = new Date(p.visit_history[0].date);
        const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
        // Flag if >14 days since last visit and chronic conditions
        return daysSince >= 14 || p.conditions?.length > 0;
      })
      .map(p => {
        const lastVisit = p.visit_history[0];
        const daysSince = Math.floor((Date.now() - new Date(lastVisit.date).getTime()) / 86400000);
        return { ...p, daysSince, lastRisk: lastVisit.dur_summary };
      })
      .sort((a, b) => b.daysSince - a.daysSince);
  }, [analytics]);

  // ── Recent alerts feed ──────────────────────────────────────────
  const recentAlerts = useMemo(() => {
    return analytics.allVisits
      .filter(v => v.dur_summary !== 'Clear')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);
  }, [analytics]);

  // ── Loading / auth gate ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb]">
        <NavigationBar />
        <div className="flex min-h-[calc(100vh-58px)] items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f5f7fb]">
        <NavigationBar />
        <div className="flex min-h-[calc(100vh-58px)] items-center justify-center px-6">
          <div className="rounded-2xl border border-slate-200 bg-white px-8 py-12 shadow-sm text-center max-w-md">
            <h1 className="text-xl font-black text-slate-900 mb-2">
              {lang === 'ko' ? '로그인이 필요합니다' : 'Sign in required'}
            </h1>
            <p className="text-sm text-slate-500 mb-5">
              {lang === 'ko' ? '애널리틱스를 보려면 먼저 로그인하세요.' : 'Please sign in to view analytics.'}
            </p>
            <button
              onClick={() => navigate('/login?redirect=/analytics')}
              className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
            >
              {lang === 'ko' ? '로그인' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user?.username || 'Doctor';
  const maxDrugCount = Math.max(...analytics.topDrugs.map(d => d.count), 1);
  const maxClassCount = Math.max(...analytics.topClasses.map(d => d.count), 1);
  const maxWeekly = Math.max(...analytics.weeklyTrend.map(d => d.count), 1);

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <NavigationBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-5">

        {/* ── Welcome + Quick Action ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-black text-slate-900">
              {lang === 'ko' ? `${displayName}님, 안녕하세요` : `Welcome, ${displayName}`}
            </h1>
            <p className="text-[13px] text-slate-400 mt-0.5">
              {lang === 'ko' ? 'NuvoVet 애널리틱스 / Analytics Overview' : 'Analytics Overview'}
            </p>
          </div>
          <button
            onClick={() => navigate('/system')}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-[13px] font-bold rounded-xl hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.99] transition-all shadow-lg shadow-slate-900/15"
          >
            <Zap size={14} />
            {lang === 'ko' ? '진단 시작' : 'Start Diagnosis'}
            <ArrowRight size={14} />
          </button>
        </div>

        {/* ═══ SECTION 1: Quick Stats ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Activity} color="bg-indigo-50 text-indigo-600"
            value={analytics.totalDiagnosesThisMonth}
            label={lang === 'ko' ? '이번 달 진단' : 'Diagnoses This Month'}
            sub="Monthly diagnoses"
          />
          <StatCard
            icon={Shield} color="bg-red-50 text-red-600"
            value={analytics.alertsCaughtThisMonth}
            label={lang === 'ko' ? '이번 달 알림' : 'Alerts This Month'}
            sub="Alerts caught"
          />
          <StatCard
            icon={Users} color="bg-emerald-50 text-emerald-600"
            value={analytics.uniquePatients}
            label={lang === 'ko' ? '등록 환자' : 'Unique Patients'}
            sub="Registered patients"
          />
          <StatCard
            icon={AlertTriangle} color="bg-amber-50 text-amber-600"
            value={null}
            label={lang === 'ko' ? '주의 조합' : 'Most Flagged Combo'}
            sub="Top flagged combination"
            customValue={
              <span className="text-[13px] font-bold text-slate-900 leading-tight">
                {analytics.mostFlaggedCombo.combo}
                <span className="text-[10px] text-slate-400 ml-1">×{analytics.mostFlaggedCombo.count}</span>
              </span>
            }
          />
        </div>

        {/* ═══ SECTION 2 + 3: Analytics + Performance ═══ */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* ── Prescription Analytics (2/3 width) ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Top drugs + drug classes */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Panel title={lang === 'ko' ? '자주 처방되는 약물' : 'Top Prescribed Drugs'} subtitle="Most Frequently Prescribed">
                <div className="space-y-2.5">
                  {analytics.topDrugs.slice(0, 6).map((d, i) => (
                    <HBar key={d.name} label={`${i + 1}. ${d.name}`} value={d.count} maxValue={maxDrugCount} />
                  ))}
                </div>
              </Panel>
              <Panel title={lang === 'ko' ? '약물 계열 분포' : 'Drug Class Distribution'} subtitle="Drug Classes">
                <div className="space-y-2.5">
                  {analytics.topClasses.slice(0, 6).map((d, i) => (
                    <HBar key={d.name} label={d.name} value={d.count} maxValue={maxClassCount} color="bg-indigo-600" />
                  ))}
                </div>
              </Panel>
            </div>

            {/* Alert distribution + weekly trend */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Panel title={lang === 'ko' ? '알림 심각도 분포' : 'Alert Severity Distribution'} subtitle="Severity Breakdown">
                <AlertDonut data={analytics.alertsByType} />
              </Panel>
              <Panel title={lang === 'ko' ? '주간 진단 추이' : 'Weekly Diagnosis Trend'} subtitle="Past 12 Weeks">
                <MiniBarChart data={analytics.weeklyTrend} maxVal={maxWeekly} />
              </Panel>
            </div>
          </div>

          {/* ── Doctor Performance Score (1/3 width) ── */}
          <div>
            <Panel title={lang === 'ko' ? '진료 성과 점수' : 'Doctor Performance Score'} subtitle="Performance Insights" className="h-full">
              <div className="flex flex-col items-center gap-5">
                {/* Overall score */}
                <div className="relative">
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r="58" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                    <circle
                      cx="70" cy="70" r="58" fill="none"
                      stroke={perfScores.overall >= 80 ? '#10b981' : perfScores.overall >= 60 ? '#3b82f6' : '#f59e0b'}
                      strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${(perfScores.overall / 100) * 2 * Math.PI * 58} ${2 * Math.PI * 58}`}
                      transform="rotate(-90 70 70)"
                      className="transition-all duration-1000"
                    />
                    <text x="70" y="64" textAnchor="middle" className="fill-slate-900 text-[28px] font-black font-mono">
                      {perfScores.overall}
                    </text>
                    <text x="70" y="82" textAnchor="middle" className="fill-slate-400 text-[10px] font-medium">
                      {lang === 'ko' ? '종합 점수' : 'OVERALL'}
                    </text>
                  </svg>
                </div>

                {/* Sub-scores */}
                <div className="flex justify-center gap-4">
                  <ScoreRing score={perfScores.alertCatch} label={lang === 'ko' ? '알림 감지율' : 'Alert Catch'} size={64} />
                  <ScoreRing score={perfScores.accuracy} label={lang === 'ko' ? '처방 안전도' : 'Rx Safety'} size={64} />
                  <ScoreRing score={perfScores.completeness} label={lang === 'ko' ? '데이터 완성도' : 'Completeness'} size={64} />
                </div>

                {/* Score breakdown */}
                <div className="w-full space-y-2 pt-2 border-t border-slate-100">
                  <ScoreRow
                    label={lang === 'ko' ? '알림 감지율' : 'Alert Catch Rate'}
                    desc={lang === 'ko' ? '전체 진단 중 위험 감지 비율' : 'Proportion of visits that caught alerts'}
                    value={`${perfScores.alertCatch}%`}
                    color={perfScores.alertCatch >= 60 ? 'text-emerald-600' : 'text-amber-600'}
                  />
                  <ScoreRow
                    label={lang === 'ko' ? '처방 안전도' : 'Prescription Safety'}
                    desc={lang === 'ko' ? '안전 범위 내 처방 비율' : 'Visits within safe range (Clear/Minor)'}
                    value={`${perfScores.accuracy}%`}
                    color={perfScores.accuracy >= 70 ? 'text-emerald-600' : 'text-amber-600'}
                  />
                  <ScoreRow
                    label={lang === 'ko' ? '데이터 완성도' : 'Data Completeness'}
                    desc={lang === 'ko' ? '환자 정보 완전 입력 비율' : 'Patients with full profile data'}
                    value={`${perfScores.completeness}%`}
                    color={perfScores.completeness >= 80 ? 'text-emerald-600' : 'text-amber-600'}
                  />
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {/* ═══ SECTION 4 + 5: Patient Insights + Recent Alerts ═══ */}
        <div className="grid lg:grid-cols-2 gap-5">

          {/* ── Patient Insights ── */}
          <Panel title={lang === 'ko' ? '환자 인사이트' : 'Patient Insights'} subtitle="Patient Overview">
            <div className="space-y-1">
              {/* Recently active + follow-up flags */}
              {followUpPatients.length === 0 ? (
                <p className="text-[13px] text-slate-400 py-4 text-center">
                  {lang === 'ko' ? '환자 데이터가 없습니다' : 'No patient data'}
                </p>
              ) : (
                followUpPatients.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate('/system', { state: { patientId: p.id } })}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-sm">
                      {p.species === 'dog' ? '🐕' : '🐈'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-900 truncate">{p.name}</span>
                        <SevBadge level={p.lastRisk} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400">
                          {p.breed || p.species} · {p.weight_kg}kg
                        </span>
                        <span className="text-[10px] text-slate-300">|</span>
                        <span className="text-[11px] text-slate-400">
                          {lang === 'ko' ? `${p.daysSince}일 전` : `${p.daysSince}d ago`}
                        </span>
                        {p.daysSince >= 21 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            <CalendarClock size={8} />
                            {lang === 'ko' ? '추적 필요' : 'Follow-up'}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                  </button>
                ))
              )}
            </div>
            {followUpPatients.length > 5 && (
              <button
                onClick={() => navigate('/patients')}
                className="mt-3 text-[12px] text-slate-500 hover:text-slate-700 font-medium transition-colors flex items-center gap-1"
              >
                {lang === 'ko' ? '전체 환자 목록 보기' : 'View all patients'}
                <ChevronRight size={12} />
              </button>
            )}
          </Panel>

          {/* ── Recent Alerts Feed ── */}
          <Panel title={lang === 'ko' ? '최근 DUR 알림' : 'Recent DUR Alerts'} subtitle="Recent Alerts Feed">
            <div className="space-y-1">
              {recentAlerts.length === 0 ? (
                <p className="text-[13px] text-slate-400 py-4 text-center">
                  {lang === 'ko' ? '알림 내역이 없습니다' : 'No alerts recorded'}
                </p>
              ) : (
                recentAlerts.map((alert, i) => {
                  const date = new Date(alert.date);
                  const dateStr = date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', {
                    month: 'short', day: 'numeric',
                  });
                  const drugs = (alert.prescribed_drugs || []).map(rx => rx.name).join(' + ') || alert.drugs?.join(' + ') || '—';

                  return (
                    <button
                      key={`${alert.patientId}-${i}`}
                      onClick={() => navigate('/system', { state: { patientId: alert.patientId } })}
                      className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg transition-colors text-left group"
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEV_CONFIG[alert.dur_summary]?.dot || 'bg-slate-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-slate-400">{dateStr}</span>
                          <SevBadge level={alert.dur_summary} />
                          <span className="text-[11px] text-slate-500 font-medium truncate">{alert.patientName}</span>
                        </div>
                        <p className="text-[12px] text-slate-700 font-medium mt-0.5 truncate">{drugs}</p>
                      </div>
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-1" />
                    </button>
                  );
                })
              )}
            </div>
          </Panel>
        </div>

      </main>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, color, value, label, sub, customValue }) {
  const { count, ref } = useCountUp(value ?? 0);

  return (
    <div
      ref={ref}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-fade-in"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        <TrendingUp size={14} className="text-slate-300" />
      </div>
      {customValue ? (
        <div className="mb-1">{customValue}</div>
      ) : (
        <div className="text-[24px] font-black text-slate-900 font-mono leading-none mb-1">
          {count}
        </div>
      )}
      <p className="text-[12px] font-semibold text-slate-700">{label}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

// ── Panel wrapper ────────────────────────────────────────────────────
function Panel({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-[14px] font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-5 py-4">
        {children}
      </div>
    </div>
  );
}

// ── Score breakdown row ──────────────────────────────────────────────
function ScoreRow({ label, desc, value, color }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <p className="text-[12px] font-semibold text-slate-700">{label}</p>
        <p className="text-[10px] text-slate-400">{desc}</p>
      </div>
      <span className={`text-[14px] font-black font-mono ${color}`}>{value}</span>
    </div>
  );
}
