import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ChevronDown, Zap,
  AlertTriangle, CheckCircle, Activity,
  Timer, Scale, Heart, Shield,
} from 'lucide-react';
import { SeverityBadge } from '../components/SeverityBadge';
import { NuvovetLogo } from '../components/NuvovetLogo';
import { MolecularBackground } from '../components/MolecularBackground';
import { RequestAccessModal } from '../components/RequestAccessModal';
import { useI18n } from '../i18n';
import { TopBarControls } from '../components/TopBarControls';
import AnatomyDiagram from '../components/charts/AnatomyDiagram';

/* ═══════════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════════ */

function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useCountUp(target, duration, visible) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const end = parseInt(target);
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target, duration]);
  return count;
}

function useAutoReplay(intervalMs, visible) {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setCycle(c => c + 1), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, visible]);
  return cycle;
}

function RevealSection({ children, className = '', delay = 0 }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function AnimatedStat({ value, label, suffix = '' }) {
  const [ref, visible] = useReveal();
  const count = useCountUp(value, 1200, visible);
  return (
    <div ref={ref} className="text-center px-4">
      <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
        {count}{suffix}
      </div>
      <div className="text-[11px] text-slate-400 mt-1.5 uppercase tracking-wider font-medium">{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HERO — Floating Result Preview
   ═══════════════════════════════════════════════════════════════════ */

function FloatingResultPreview() {
  const [ref, visible] = useReveal(0.2);
  const [activeAlert, setActiveAlert] = useState(0);
  const { t } = useI18n();

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setActiveAlert(p => (p + 1) % 3), 3000);
    return () => clearInterval(timer);
  }, [visible]);

  const alerts = [
    { severity: 'Critical', drugs: 'Meloxicam + Prednisolone', rule: 'NSAID + Corticosteroid GI Risk', color: 'border-l-red-500 bg-red-50/50' },
    { severity: 'Moderate', drugs: 'Metronidazole + Ketoconazole', rule: 'CYP3A4 Inhibition', color: 'border-l-amber-500 bg-amber-50/50' },
    { severity: 'Minor', drugs: 'Phenobarbital + Prednisolone', rule: 'CYP Enzyme Induction', color: 'border-l-yellow-400 bg-yellow-50/30' },
  ];

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      <div className="animate-float">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 max-w-md mx-auto transform rotate-1 hover:rotate-0 transition-transform duration-500">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NuvovetLogo size={14} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-600">{t.results.durReport}</span>
            </div>
            <span className="text-xs text-slate-400">{`3 ${t.results.interactionsFound}`}</span>
          </div>
          <div className="p-3 space-y-2">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`border-l-4 rounded-lg px-3 py-2.5 transition-all duration-500 ${alert.color} ${
                  i === activeAlert ? 'scale-[1.02] shadow-sm' : 'scale-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-semibold ${
                    alert.severity === 'Critical' ? 'text-red-700' :
                    alert.severity === 'Moderate' ? 'text-amber-700' : 'text-yellow-700'
                  }`}>
                    {alert.severity === 'Critical' ? t.results.critical :
                     alert.severity === 'Moderate' ? t.results.moderate : t.results.minor}
                  </span>
                  <span className="text-xs text-slate-400">{alert.rule}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{alert.drugs}</p>
              </div>
            ))}
          </div>
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">{t.results.confidence}</span>
              <span className="font-semibold text-emerald-600">92%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: visible ? '92%' : '0%', transition: 'width 1.5s ease-out 0.5s' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FEATURE 1 — LIVE DDI CHECK (hero feature, most prominent)
   Full-width animated drug interaction screening visualization
   ═══════════════════════════════════════════════════════════════════ */

const DDI_SCENARIOS = [
  {
    drugA: 'Meloxicam', drugB: 'Prednisolone', severity: 'Critical', mechanism: 'NSAID + Corticosteroid',
    result: 'GI ulceration risk ×15', cypPath: 'COX-1/COX-2 → Prostaglandin depletion', score: 100,
    pillA: 'bg-blue-500/15 border-blue-500/30', textA: 'text-blue-300', dotA: 'bg-blue-400',
    pillB: 'bg-violet-500/15 border-violet-500/30', textB: 'text-violet-300', dotB: 'bg-violet-400',
    sevBg: 'bg-red-950/60', sevBorder: 'border-red-500/30', sevText: 'text-red-400',
    sevDot: 'bg-red-500', hitBar: 'bg-red-500/80',
    strokeColor: '#ef4444', barGrad: 'from-red-600 to-red-400',
  },
  {
    drugA: 'Metronidazole', drugB: 'Ketoconazole', severity: 'Moderate', mechanism: 'CYP3A4 Inhibition',
    result: 'Plasma concentration ↑ 2.3×', cypPath: 'CYP3A4 substrate → inhibitor block', score: 58,
    pillA: 'bg-emerald-500/15 border-emerald-500/30', textA: 'text-emerald-300', dotA: 'bg-emerald-400',
    pillB: 'bg-amber-500/15 border-amber-500/30', textB: 'text-amber-300', dotB: 'bg-amber-400',
    sevBg: 'bg-amber-950/60', sevBorder: 'border-amber-500/30', sevText: 'text-amber-400',
    sevDot: 'bg-amber-500', hitBar: 'bg-amber-500/80',
    strokeColor: '#f59e0b', barGrad: 'from-amber-600 to-amber-400',
  },
  {
    drugA: 'Tramadol', drugB: 'Trazodone', severity: 'Critical', mechanism: 'Serotonin Syndrome',
    result: 'Dual 5-HT reuptake inhibition', cypPath: 'SRI + SRI → 5-HT toxicity cascade', score: 92,
    pillA: 'bg-rose-500/15 border-rose-500/30', textA: 'text-rose-300', dotA: 'bg-rose-400',
    pillB: 'bg-purple-500/15 border-purple-500/30', textB: 'text-purple-300', dotB: 'bg-purple-400',
    sevBg: 'bg-red-950/60', sevBorder: 'border-red-500/30', sevText: 'text-red-400',
    sevDot: 'bg-red-500', hitBar: 'bg-red-500/80',
    strokeColor: '#ef4444', barGrad: 'from-red-600 to-red-400',
  },
];

function LiveDDIShowcase({ visible }) {
  const [phase, setPhase] = useState(0);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const cycle = useAutoReplay(8000, visible);

  useEffect(() => {
    if (!visible) return;
    setPhase(0);
    setScenarioIdx(cycle % DDI_SCENARIOS.length);
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1500);
    const t4 = setTimeout(() => setPhase(4), 2200);
    const t5 = setTimeout(() => setPhase(5), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [visible, cycle]);

  const s = DDI_SCENARIOS[scenarioIdx];

  return (
    <div className="relative">
      {/* Scanning grid background */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
        {phase >= 1 && (
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="landing-scan-line" />
          </div>
        )}
      </div>

      <div className="relative z-10 p-6 sm:p-8">
        {/* Header status bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${phase >= 2 ? `${s.sevDot} animate-pulse` : phase >= 1 ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">
              {phase >= 3 ? 'INTERACTION DETECTED' : phase >= 1 ? 'SCANNING...' : 'READY'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {DDI_SCENARIOS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === scenarioIdx ? 'bg-indigo-400 scale-125' : 'bg-white/20'}`} />
            ))}
          </div>
        </div>

        {/* Drug pair visualization with connecting lines */}
        <div className="relative mb-6">
          {/* Connection SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 100" preserveAspectRatio="none">
            <path
              d="M 120,50 C 200,50 220,20 300,20 C 380,20 400,50 480,50"
              fill="none"
              stroke={phase >= 2 ? s.strokeColor : '#334155'}
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity={phase >= 1 ? 0.6 : 0}
              style={{ transition: 'all 0.8s ease-out' }}
            />
            {phase >= 3 && (
              <circle cx="300" cy="20" r={phase >= 4 ? '18' : '6'} fill="none"
                stroke={s.strokeColor}
                strokeWidth="2"
                opacity="0.4"
                style={{ transition: 'all 0.6s ease-out' }}
              />
            )}
          </svg>

          <div className="flex items-center justify-between relative z-10">
            {/* Drug A */}
            <div className={`transition-all duration-700 ease-out ${phase >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <div className={`${s.pillA} border rounded-xl px-5 py-4 backdrop-blur-sm min-w-[140px]`}>
                <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Drug A</div>
                <div className={`text-base font-bold ${s.textA}`}>{s.drugA}</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className={`w-1 h-1 rounded-full ${s.dotA}`} />
                  <span className="text-[9px] text-white/30 font-mono">Active</span>
                </div>
              </div>
            </div>

            {/* Center — CYP pathway animated */}
            <div className={`transition-all duration-600 ${phase >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} absolute left-1/2 -translate-x-1/2 top-0`}>
              <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                <span className="text-[8px] font-mono text-white/40">{s.cypPath}</span>
              </div>
            </div>

            {/* Drug B */}
            <div className={`transition-all duration-700 ease-out ${phase >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
              style={{ transitionDelay: '150ms' }}>
              <div className={`${s.pillB} border rounded-xl px-5 py-4 backdrop-blur-sm min-w-[140px] text-right`}>
                <div className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Drug B</div>
                <div className={`text-base font-bold ${s.textB}`}>{s.drugB}</div>
                <div className="mt-2 flex items-center gap-1.5 justify-end">
                  <span className="text-[9px] text-white/30 font-mono">Active</span>
                  <div className={`w-1 h-1 rounded-full ${s.dotB}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated pairwise matrix grid */}
        <div className={`transition-all duration-600 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} mb-5`}>
          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: 18 }).map((_, i) => {
              const isHit = i === 4 || i === 7 || i === 11;
              const delay = i * 40;
              return (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    phase >= 3 && isHit ? s.hitBar :
                    phase >= 2 ? 'bg-white/[0.06]' : 'bg-transparent'
                  }`}
                  style={{ transitionDelay: `${delay}ms` }}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[8px] text-white/20 font-mono">Pairwise matrix scan</span>
            <span className="text-[8px] text-white/20 font-mono">{phase >= 3 ? `${Math.min(3, Math.floor(phase))} hits` : 'scanning...'}</span>
          </div>
        </div>

        {/* Result card with severity & score */}
        <div className={`transition-all duration-700 ease-out ${phase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className={`${s.sevBg} ${s.sevBorder} border rounded-xl overflow-hidden ${phase >= 4 ? 'animate-pulse-glow' : ''}`}>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <SeverityBadge severity={{ label: s.severity }} />
                  <span className="text-[10px] text-white/40 font-medium">{s.mechanism}</span>
                </div>
                <div className={`text-[20px] font-black font-mono ${s.sevText}`}>
                  {phase >= 5 ? s.score : '--'}
                </div>
              </div>
              <p className="text-sm font-semibold text-white">{s.drugA} + {s.drugB}</p>
              <p className="text-[11px] text-white/50 mt-1">{s.result}</p>
            </div>

            {/* Animated severity bar */}
            <div className="h-1 bg-white/5">
              <div
                className={`h-full bg-gradient-to-r ${s.barGrad} rounded-full`}
                style={{
                  width: phase >= 5 ? `${s.score}%` : '0%',
                  transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FEATURE 2 — DOSAGE CALCULATIONS
   Animated weight-based dose with gauge + live adjustment
   ═══════════════════════════════════════════════════════════════════ */

function DosageShowcase({ visible }) {
  const [phase, setPhase] = useState(0);
  const cycle = useAutoReplay(10000, visible);

  useEffect(() => {
    if (!visible) return;
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => setPhase(3), 1800);
    const t4 = setTimeout(() => setPhase(4), 2600);
    const t5 = setTimeout(() => setPhase(5), 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [visible, cycle]);

  const weight = 12;
  const stdDose = 2.4;
  const adjDose = 1.2;

  // SVG gauge parameters
  const gaugeRadius = 58;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const stdPct = 0.6; // 60% of gauge
  const adjPct = 0.3; // 30% of gauge

  return (
    <div className="p-5 sm:p-6">
      {/* Patient strip */}
      <div className={`flex items-center gap-3 mb-5 transition-all duration-500 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-sm">🐕</div>
        <div className="flex-1">
          <div className="text-[11px] font-bold text-white">Meloxicam · NSAID</div>
          <div className="text-[9px] text-white/40">Border Collie · {weight} kg · CKD Stage II</div>
        </div>
        <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all duration-500 ${
          phase >= 3 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-white/5 text-white/30 border border-white/10'
        }`}>
          {phase >= 3 ? 'RENAL FLAG' : 'CHECKING'}
        </div>
      </div>

      {/* Center: Gauge + dose comparison */}
      <div className="flex items-center gap-6">
        {/* SVG Dose Gauge */}
        <div className="relative shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            {/* Background arc */}
            <circle cx="70" cy="70" r={gaugeRadius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"
              strokeDasharray={`${gaugeCircumference * 0.75} ${gaugeCircumference * 0.25}`}
              strokeDashoffset={gaugeCircumference * 0.125}
              strokeLinecap="round" transform="rotate(135 70 70)"
            />
            {/* Standard dose arc */}
            <circle cx="70" cy="70" r={gaugeRadius} fill="none"
              stroke={phase >= 4 ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.7)'}
              strokeWidth="10"
              strokeDasharray={`${phase >= 2 ? gaugeCircumference * stdPct * 0.75 : 0} ${gaugeCircumference}`}
              strokeDashoffset={gaugeCircumference * 0.125}
              strokeLinecap="round" transform="rotate(135 70 70)"
              style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease' }}
            />
            {/* Adjusted dose arc (overlaid) */}
            {phase >= 4 && (
              <circle cx="70" cy="70" r={gaugeRadius} fill="none"
                stroke="#10b981"
                strokeWidth="10"
                strokeDasharray={`${gaugeCircumference * adjPct * 0.75} ${gaugeCircumference}`}
                strokeDashoffset={gaugeCircumference * 0.125}
                strokeLinecap="round" transform="rotate(135 70 70)"
                style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
              />
            )}
            {/* Center text */}
            <text x="70" y="62" textAnchor="middle" className="fill-white text-[22px] font-black font-mono"
              style={{ transition: 'all 0.5s ease' }}>
              {phase >= 5 ? `${adjDose}` : phase >= 2 ? `${stdDose}` : '--'}
            </text>
            <text x="70" y="78" textAnchor="middle" className="fill-white/40 text-[10px]">
              mg
            </text>
            {phase >= 5 && (
              <text x="70" y="96" textAnchor="middle" className="fill-emerald-400 text-[8px] font-bold uppercase">
                Adjusted
              </text>
            )}
          </svg>
        </div>

        {/* Dose breakdown */}
        <div className="flex-1 space-y-3">
          {/* Standard dose */}
          <div className={`transition-all duration-600 ${phase >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
            <div className={`rounded-lg p-3 border transition-all duration-500 ${
              phase >= 4 ? 'bg-white/[0.02] border-white/[0.05] opacity-50' : 'bg-white/[0.04] border-white/[0.08]'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-white/40 uppercase tracking-wider">Standard</span>
                <span className="text-[10px] font-mono text-white/30">0.2 mg/kg</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold font-mono transition-all duration-500 ${phase >= 4 ? 'text-white/30 line-through decoration-red-500/50' : 'text-white'}`}>
                  {stdDose} mg
                </span>
              </div>
              {/* Dose bar */}
              <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${phase >= 4 ? 'bg-red-500/40' : 'bg-indigo-500'}`}
                  style={{ width: phase >= 2 ? '60%' : '0%', transition: 'width 1s ease-out, background-color 0.5s' }} />
              </div>
            </div>
          </div>

          {/* Adjustment factors */}
          <div className={`transition-all duration-500 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
            <div className="flex gap-1.5">
              <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1.5">
                <div className="text-[8px] text-amber-400/60 uppercase">Creatinine</div>
                <div className="text-[11px] font-bold text-amber-400 font-mono">2.4 ↑</div>
              </div>
              <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1.5">
                <div className="text-[8px] text-amber-400/60 uppercase">GFR</div>
                <div className="text-[11px] font-bold text-amber-400 font-mono">42 mL/min</div>
              </div>
              <div className={`flex-1 rounded-md px-2 py-1.5 transition-all duration-500 ${
                phase >= 4 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.02] border border-white/[0.05]'
              }`}>
                <div className={`text-[8px] uppercase transition-colors duration-500 ${phase >= 4 ? 'text-emerald-400/60' : 'text-white/20'}`}>Factor</div>
                <div className={`text-[11px] font-bold font-mono transition-colors duration-500 ${phase >= 4 ? 'text-emerald-400' : 'text-white/20'}`}>
                  {phase >= 4 ? '×0.5' : '--'}
                </div>
              </div>
            </div>
          </div>

          {/* Adjusted dose */}
          <div className={`transition-all duration-700 ${phase >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-lg p-3 animate-glow-green">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-emerald-400/60 uppercase tracking-wider">Renal-Adjusted</span>
                <span className="text-[10px] font-mono text-emerald-400/50">0.1 mg/kg ×0.5</span>
              </div>
              <div className="text-lg font-bold font-mono text-emerald-300">{adjDose} mg</div>
              <div className="mt-2 h-1 bg-emerald-900/30 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full"
                  style={{ width: phase >= 5 ? '30%' : '0%', transition: 'width 0.8s ease-out' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FEATURE 3 — ORGAN INVOLVEMENT
   Animated AnatomyDiagram with progressive organ reveals
   ═══════════════════════════════════════════════════════════════════ */

const ORGAN_MOCK_DRUGS = [
  { id: 'meloxicam-demo', name: 'Meloxicam', renalElimination: 0.40, hepaticElimination: 0.55, pk: { primaryElimination: 'hepatic' }, defaultDose: { dog: 0.1 }, dosePerKg: 0.1 },
  { id: 'prednisolone-demo', name: 'Prednisolone', renalElimination: 0.20, hepaticElimination: 0.75, pk: { primaryElimination: 'hepatic' }, defaultDose: { dog: 0.5 }, dosePerKg: 0.5 },
];

const ORGAN_FULL_SCORES = {
  brain:  { finalScore: 14, contributingDrugs: [{ drugId: 'prednisolone-demo', drugName: 'Prednisolone', baseScore: 14, scaledScore: 14, doseScalingApplied: false }], keywords: ['CNS penetration'], evidence: null },
  heart:  { finalScore: 8,  contributingDrugs: [], keywords: [], evidence: null },
  liver:  { finalScore: 72, contributingDrugs: [
    { drugId: 'meloxicam-demo', drugName: 'Meloxicam', baseScore: 42, scaledScore: 42, doseScalingApplied: false },
    { drugId: 'prednisolone-demo', drugName: 'Prednisolone', baseScore: 30, scaledScore: 30, doseScalingApplied: false },
  ], keywords: ['hepatotoxic', 'CYP3A4'], evidence: null },
  kidney: { finalScore: 35, contributingDrugs: [{ drugId: 'meloxicam-demo', drugName: 'Meloxicam', baseScore: 35, scaledScore: 35, doseScalingApplied: false }], keywords: ['nephrotoxic'], evidence: null },
  blood:  { finalScore: 22, contributingDrugs: [{ drugId: 'meloxicam-demo', drugName: 'Meloxicam', baseScore: 22, scaledScore: 22, doseScalingApplied: false }], keywords: ['bleeding_risk'], evidence: null },
};

const ORGAN_REVEAL_ORDER = ['liver', 'kidney', 'blood', 'brain', 'heart'];

function OrganShowcase({ visible }) {
  const [revealPhase, setRevealPhase] = useState(0);
  const cycle = useAutoReplay(12000, visible);

  useEffect(() => {
    if (!visible) { setRevealPhase(0); return; }
    setRevealPhase(0);
    ORGAN_REVEAL_ORDER.forEach((_, i) => {
      setTimeout(() => setRevealPhase(i + 1), 700 + i * 450);
    });
  }, [visible, cycle]);

  const animatedScores = Object.fromEntries(
    Object.entries(ORGAN_FULL_SCORES).map(([organ, data]) => {
      const revealIdx = ORGAN_REVEAL_ORDER.indexOf(organ);
      const revealed = revealPhase > revealIdx;
      return [organ, revealed ? data : { ...data, finalScore: null, contributingDrugs: [] }];
    })
  );

  return (
    <div className="p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Multi-organ burden mapping</div>
          <div className="text-[11px] font-bold text-white/70">Meloxicam + Prednisolone · Border Collie · 12 kg</div>
        </div>
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all duration-500 ${
          revealPhase >= 1 ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/20 border border-white/10'
        }`}>
          {revealPhase >= 5 ? `${Object.keys(ORGAN_FULL_SCORES).length} organs scored` : 'Mapping...'}
        </div>
      </div>

      {/* Anatomy diagram in white card */}
      <div className="bg-white rounded-xl overflow-hidden p-3 mb-3">
        <AnatomyDiagram
          species="dog"
          organScores={animatedScores}
          patientBreed="Border Collie"
          mdr1SensitiveDrugs={[]}
          drugs={ORGAN_MOCK_DRUGS}
          patientInfo={{ flaggedLabs: [] }}
          overallRisk={null}
        />
      </div>

      {/* Live score tickers */}
      <div className="grid grid-cols-5 gap-1.5">
        {ORGAN_REVEAL_ORDER.map((organ, i) => {
          const score = ORGAN_FULL_SCORES[organ].finalScore;
          const revealed = revealPhase > i;
          const isHigh = score >= 50;
          return (
            <div
              key={organ}
              className={`text-center rounded-lg py-2 px-1 transition-all duration-500 ${
                revealed
                  ? isHigh ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-white/[0.04] border border-white/[0.08]'
                  : 'bg-white/[0.02] border border-white/[0.04]'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className={`text-[14px] font-black font-mono transition-all duration-500 ${
                revealed ? isHigh ? 'text-blue-400' : 'text-white/60' : 'text-white/10'
              }`}>
                {revealed ? score : '--'}
              </div>
              <div className="text-[7px] text-white/30 uppercase tracking-wider mt-0.5 capitalize">{organ}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FEATURE 4 — BREED & ALLERGY SAFETY
   DNA-themed breed detection with animated alerts
   ═══════════════════════════════════════════════════════════════════ */

const MDR1_BREEDS = ['Border Collie', 'Rough Collie', 'Shetland Sheepdog', 'Australian Shepherd', 'Old English Sheepdog', 'Silken Windhound'];

function BreedSafetyShowcase({ visible }) {
  const [phase, setPhase] = useState(0);
  const cycle = useAutoReplay(11000, visible);

  useEffect(() => {
    if (!visible) return;
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 900);
    const t3 = setTimeout(() => setPhase(3), 1600);
    const t4 = setTimeout(() => setPhase(4), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [visible, cycle]);

  return (
    <div className="p-5 sm:p-6">
      {/* Patient card */}
      <div className={`transition-all duration-600 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-700/80 flex items-center justify-center text-lg border border-slate-600/50">🐕</div>
          <div className="flex-1">
            <div className="text-[12px] font-bold text-white">Border Collie · 12 kg · 4y</div>
            <div className="text-[10px] text-white/40">Neutered Male</div>
          </div>
          <div className={`transition-all duration-500 ${phase >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-full animate-pulse-glow-amber">
              <Shield size={10} />
              MDR1 Risk
            </span>
          </div>
        </div>
      </div>

      {/* DNA helix animation */}
      <div className={`transition-all duration-500 mb-4 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
        <svg viewBox="0 0 300 40" className="w-full h-8">
          {/* Double helix strands */}
          <path d="M 0,20 Q 37.5,0 75,20 Q 112.5,40 150,20 Q 187.5,0 225,20 Q 262.5,40 300,20"
            fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.4"
            strokeDasharray="400" strokeDashoffset={phase >= 2 ? '0' : '400'}
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
          <path d="M 0,20 Q 37.5,40 75,20 Q 112.5,0 150,20 Q 187.5,40 225,20 Q 262.5,0 300,20"
            fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.4"
            strokeDasharray="400" strokeDashoffset={phase >= 2 ? '0' : '400'}
            style={{ transition: 'stroke-dashoffset 1.5s ease-out 0.2s' }}
          />
          {/* Cross-links */}
          {[37.5, 75, 112.5, 150, 187.5, 225, 262.5].map((x, i) => (
            <line key={i} x1={x} y1="8" x2={x} y2="32" stroke="#f59e0b" strokeWidth="0.5"
              opacity={phase >= 2 ? '0.2' : '0'} style={{ transition: `opacity 0.3s ease ${i * 100}ms` }}
            />
          ))}
          {/* Mutation marker */}
          {phase >= 3 && (
            <g>
              <circle cx="150" cy="20" r="8" fill="#ef4444" opacity="0.2" style={{ animation: 'collisionFlash 1.5s ease-in-out infinite' }} />
              <circle cx="150" cy="20" r="3" fill="#ef4444" opacity="0.7" />
              <text x="150" y="24" textAnchor="middle" className="fill-white text-[6px] font-bold">!</text>
            </g>
          )}
        </svg>
      </div>

      {/* MDR1 detection alert */}
      <div className={`transition-all duration-600 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} mb-4`}>
        <div className="bg-amber-950/60 border border-amber-500/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={12} className="text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">MDR1 Sensitivity Detected</span>
          </div>
          <p className="text-[10px] text-amber-300/80 leading-relaxed">Ivermectin: P-gp transporter deficiency → Blood-brain barrier penetration ↑</p>
          <p className="text-[9px] text-amber-400/40 mt-1">Recommendation: Switch to Selamectin or Milbemycin</p>
        </div>
      </div>

      {/* Affected breeds with staggered reveal */}
      <div className={`transition-all duration-500 ${phase >= 4 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-2">Affected Breeds</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {MDR1_BREEDS.map((breed, i) => (
            <div key={breed} className="flex items-center gap-1.5 text-[10px]"
              style={{ animation: phase >= 4 ? `fadeIn 0.3s ease-out ${i * 80}ms both` : 'none' }}>
              <span className="w-1 h-1 bg-amber-400 rounded-full shrink-0" />
              <span className="text-white/50">{breed}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Species hardstop */}
      <div className={`transition-all duration-600 mt-4 ${phase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={{ transitionDelay: '300ms' }}>
        <div className="bg-red-950/60 border border-red-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
          <Activity size={11} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[9px] font-bold text-red-400 uppercase tracking-wide">Species Hardstop · Cat</p>
            <p className="text-[9px] text-red-300/70">Acetaminophen — fatal. Cats lack glucuronyl transferase.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FEATURE 5 — PK TIMELINE & WASHOUT
   Animated pharmacokinetic decay curves + washout periods
   ═══════════════════════════════════════════════════════════════════ */

function WashoutShowcase({ visible }) {
  const [phase, setPhase] = useState(0);
  const cycle = useAutoReplay(10000, visible);

  useEffect(() => {
    if (!visible) return;
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => setPhase(3), 1800);
    const t4 = setTimeout(() => setPhase(4), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [visible, cycle]);

  return (
    <div className="p-5 sm:p-6">
      {/* Drug pair header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all duration-500 ${
            phase >= 1 ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-white/5 text-white/30 border-white/10'
          }`}>Tramadol</div>
          <span className="text-white/20 text-xs">→</span>
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all duration-500 ${
            phase >= 1 ? 'bg-violet-500/15 text-violet-300 border-violet-500/30' : 'bg-white/5 text-white/30 border-white/10'
          }`}>Trazodone</div>
        </div>
        <div className={`text-[9px] font-mono transition-all duration-500 ${
          phase >= 3 ? 'text-amber-400' : 'text-white/20'
        }`}>
          {phase >= 3 ? '5× t½ rule' : '...'}
        </div>
      </div>

      {/* PK curve visualization */}
      <div className="bg-slate-800/50 border border-white/[0.06] rounded-xl p-4 mb-4">
        <svg viewBox="0 0 400 120" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Grid */}
          {[30, 50, 70, 90].map((y, i) => (
            <line key={i} x1="30" y1={y} x2="380" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          ))}
          <line x1="30" y1="20" x2="30" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          {/* Y-axis labels */}
          <text x="22" y="34" textAnchor="end" className="fill-white/20 text-[7px]">Cmax</text>
          <text x="22" y="94" textAnchor="end" className="fill-white/20 text-[7px]">0</text>
          {/* X-axis time labels */}
          <text x="30" y="112" textAnchor="middle" className="fill-white/20 text-[7px]">0h</text>
          <text x="130" y="112" textAnchor="middle" className="fill-white/20 text-[7px]">6h</text>
          <text x="230" y="112" textAnchor="middle" className="fill-white/20 text-[7px]">12h</text>
          <text x="330" y="112" textAnchor="middle" className="fill-white/20 text-[7px]">18h</text>

          {/* Drug A — Tramadol decay curve */}
          <path
            d="M 30,95 C 50,95 60,30 80,30 C 100,30 120,55 160,70 C 200,82 240,90 280,93 L 380,95"
            fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"
            strokeDasharray="500"
            strokeDashoffset={phase >= 1 ? '0' : '500'}
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
          {/* Drug A area fill */}
          <path
            d="M 30,95 C 50,95 60,30 80,30 C 100,30 120,55 160,70 C 200,82 240,90 280,93 L 380,95 L 380,100 L 30,100 Z"
            fill="url(#drugAGrad)"
            opacity={phase >= 1 ? '0.15' : '0'}
            style={{ transition: 'opacity 1s ease-out 0.5s' }}
          />

          {/* Drug B — Trazodone decay curve (delayed start) */}
          {phase >= 3 && (
            <>
              <path
                d="M 220,95 C 240,95 250,35 270,35 C 290,35 310,58 340,72 C 360,82 370,90 380,93"
                fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"
                strokeDasharray="300"
                strokeDashoffset={phase >= 3 ? '0' : '300'}
                style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
              />
              <path
                d="M 220,95 C 240,95 250,35 270,35 C 290,35 310,58 340,72 C 360,82 370,90 380,93 L 380,100 L 220,100 Z"
                fill="url(#drugBGrad)"
                opacity="0.15"
                style={{ animation: 'fadeIn 0.8s ease-out forwards' }}
              />
            </>
          )}

          {/* Washout zone */}
          {phase >= 2 && (
            <rect x="130" y="20" width="90" height="80" fill="#f59e0b" opacity="0.06" rx="4"
              style={{ animation: 'fadeIn 0.5s ease-out forwards' }}
            />
          )}
          {phase >= 2 && (
            <text x="175" y="50" textAnchor="middle" className="fill-amber-400 text-[8px] font-bold uppercase tracking-wider"
              opacity="0.7" style={{ animation: 'fadeIn 0.5s ease-out forwards' }}>
              Washout
            </text>
          )}
          {phase >= 2 && (
            <text x="175" y="62" textAnchor="middle" className="fill-amber-400/50 text-[7px] font-mono">
              ≥9h (5×1.8h)
            </text>
          )}

          {/* Half-life markers */}
          {phase >= 2 && (
            <>
              <line x1="80" y1="30" x2="80" y2="100" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
              <text x="80" y="18" textAnchor="middle" className="fill-blue-400 text-[7px] font-mono">t½ 1.8h</text>
            </>
          )}
          {phase >= 3 && (
            <>
              <line x1="270" y1="35" x2="270" y2="100" stroke="#8b5cf6" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
              <text x="270" y="18" textAnchor="middle" className="fill-violet-400 text-[7px] font-mono">t½ 3.5h</text>
            </>
          )}

          {/* Gradients */}
          <defs>
            <linearGradient id="drugAGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="drugBGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Warning banner */}
      <div className={`transition-all duration-600 ${phase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="bg-amber-950/60 border border-amber-500/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Timer size={12} className="text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Serotonin Syndrome Risk</span>
          </div>
          <p className="text-[10px] text-amber-300/70">Dual SRI mechanism — minimum 1 day washout before switching. 5× half-life clearance protocol.</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════════════ */

export default function Landing() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f7fb]">

      {/* ─── Sticky Nav ─────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.07)] transition-all duration-700 ${
          heroVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[62px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[22px] font-black tracking-[-0.045em] text-slate-900 leading-none select-none">
              nuvovet
            </span>
          </div>
          <TopBarControls />
        </div>
      </header>

      {/* ─── Hero — Full Viewport ───────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-blue-50/30 to-[#f5f7fb] min-h-[calc(100vh-62px)] flex flex-col">
        <MolecularBackground />

        <div className="relative flex-1 flex items-center">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16 w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

              {/* Left — text */}
              <div>
                <div className={`transition-all duration-700 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/80 border border-slate-200 rounded-full text-xs text-slate-500 mb-6 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    {t.landing.heroBadge}
                  </div>
                </div>

                <div className={`transition-all duration-700 ease-out delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ transitionDelay: '150ms' }}>
                  <h1 className={`text-3xl sm:text-4xl lg:text-[52px] font-black text-slate-900 tracking-tight mb-5 ${lang === 'ko' ? 'leading-[1.35]' : 'leading-[1.1]'}`}>
                    <span className={lang === 'ko' ? 'block' : 'inline'}>{t.landing.heroTitle}</span>
                    <span
                      className={`${lang === 'ko' ? 'block mt-1' : 'inline'}`}
                      style={{
                        background: 'linear-gradient(90deg, #94a3b8, #475569, #94a3b8)',
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        animation: 'shimmer 3s linear infinite',
                      }}
                    >
                      {t.landing.heroTitleAccent}
                    </span>
                  </h1>
                </div>

                <div className={`transition-all duration-700 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ transitionDelay: '300ms' }}>
                  <p className={`text-base sm:text-lg text-slate-500 mb-8 max-w-lg ${lang === 'ko' ? 'leading-[1.9]' : 'leading-relaxed'}`}>
                    {t.landing.heroDesc}
                  </p>
                </div>

                <div className={`transition-all duration-700 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ transitionDelay: '450ms' }}>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => navigate('/demo')}
                      className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-slate-900/20"
                    >
                      {t.nav.tryDemo}
                      <ArrowRight size={15} />
                    </button>
                    <button
                      onClick={() => navigate('/pricing')}
                      className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white text-slate-700 text-sm font-medium rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:scale-[1.02] transition-all duration-200"
                    >
                      {lang === 'ko' ? '플랜 보기' : 'View Plans'}
                      <span className="text-slate-400 text-xs font-normal">{lang === 'ko' ? '/ View Plans' : ''}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right — floating result preview */}
              <div className={`transition-all duration-1000 ease-out ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
                style={{ transitionDelay: '400ms' }}>
                <FloatingResultPreview />
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 -mb-10">
          <div className="max-w-4xl mx-auto px-5 sm:px-8">
            <RevealSection>
              <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl shadow-slate-200/30 py-8 px-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <AnimatedStat value="877" label={t.landing.statsProducts} suffix="+" />
                  <AnimatedStat value="8" label={t.landing.statsEngines} />
                  <AnimatedStat value="10" label={t.landing.statsRules} />
                  <AnimatedStat value="2" label={t.landing.statsSpecies} />
                </div>
              </div>
            </RevealSection>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="flex justify-center pb-4 pt-14 animate-bounce">
          <ChevronDown size={20} className="text-slate-300" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         FEATURE 1 — LIVE DDI CHECK (Hero Feature)
         Full-width dark immersive section
         ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#070c18] overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-14 items-center">
            {/* Left — minimal text */}
            <RevealSection>
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
                    01
                  </span>
                  <span className="text-[10px] text-white/30 uppercase tracking-widest">Core Engine</span>
                </div>
                <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-4 ${lang === 'ko' ? 'leading-[1.4]' : 'leading-tight'}`}>
                  {lang === 'ko' ? (
                    <><span className="text-white">실시간 다제</span><br /><span className="text-red-400/80">상호작용 검사</span></>
                  ) : (
                    <><span className="text-white">Live Multi-Drug</span><br /><span className="text-red-400/80">Interaction Check</span></>
                  )}
                </h2>
                <p className={`text-sm text-white/40 max-w-sm ${lang === 'ko' ? 'leading-[1.9]' : 'leading-relaxed'}`}>
                  {t.panels?.panel1Desc}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {['CYP Profiling', 'QT Stacking', 'Serotonin Risk', 'Bleeding Risk'].map((tag, i) => (
                    <span key={i} className="text-[9px] text-white/25 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            </RevealSection>

            {/* Right — live DDI animation */}
            <RevealSection delay={200}>
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden backdrop-blur-sm">
                <LiveDDIDemo />
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         FEATURES 2–3 — DOSING + ORGAN (Side by Side)
         Dense bento layout
         ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#0a0f1e] border-t border-white/[0.04] overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-18">
          <div className="grid lg:grid-cols-2 gap-5">

            {/* Feature 2 — Dosage */}
            <RevealSection>
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden h-full">
                <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full uppercase tracking-widest">02</span>
                  <h3 className="text-sm font-bold text-white/80">
                    {lang === 'ko' ? '체중 기반 용량 계산' : 'Weight-Adjusted Dosing'}
                  </h3>
                </div>
                <DosageDemo />
              </div>
            </RevealSection>

            {/* Feature 3 — Organ Involvement */}
            <RevealSection delay={150}>
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden h-full">
                <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2.5 py-1 rounded-full uppercase tracking-widest">03</span>
                  <h3 className="text-sm font-bold text-white/80">
                    {lang === 'ko' ? '장기 관여 다이어그램' : 'Organ Involvement Map'}
                  </h3>
                </div>
                <OrganDemo />
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         FEATURES 4–5 — BREED + WASHOUT (Side by Side)
         Dense bento layout
         ═══════════════════════════════════════════════════════════ */}
      <section className="bg-[#070c18] border-t border-white/[0.04] overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-18">
          <div className="grid lg:grid-cols-2 gap-5">

            {/* Feature 4 — Breed & Allergy */}
            <RevealSection>
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden h-full">
                <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full uppercase tracking-widest">04</span>
                  <h3 className="text-sm font-bold text-white/80">
                    {lang === 'ko' ? '품종 및 알레르기 안전성' : 'Breed & Allergy Safety'}
                  </h3>
                </div>
                <BreedDemo />
              </div>
            </RevealSection>

            {/* Feature 5 — Washout */}
            <RevealSection delay={150}>
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden h-full">
                <div className="px-5 pt-5 pb-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-violet-400 bg-violet-400/10 border border-violet-400/20 px-2.5 py-1 rounded-full uppercase tracking-widest">05</span>
                  <h3 className="text-sm font-bold text-white/80">
                    {lang === 'ko' ? '약물 PK 타임라인 & 휴약' : 'PK Timeline & Washout'}
                  </h3>
                </div>
                <WashoutDemo />
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         DEMO CTA — Immersive
         ═══════════════════════════════════════════════════════════ */}
      <section className="bg-slate-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <RevealSection>
            <div className="bg-slate-900 rounded-3xl p-8 sm:p-14 text-center overflow-hidden relative">
              {/* Drifting particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white/20 rounded-full"
                    style={{
                      left: `${5 + (i * 47) % 90}%`,
                      top: `${10 + (i * 31) % 80}%`,
                      animation: `driftUp ${4 + (i % 4) * 1.5}s ease-in-out infinite`,
                      animationDelay: `${(i * 0.7) % 5}s`,
                    }}
                  />
                ))}
              </div>

              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }} />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-xs text-white/70 mb-6 backdrop-blur-sm">
                  <Zap size={12} />
                  {t.landing.demoPreviewBadge}
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  {t.landing.demoPreviewTitle}
                </h2>
                <p className="text-sm sm:text-base text-white/50 max-w-lg mx-auto mb-10 leading-relaxed">
                  {t.landing.demoPreviewDesc}
                </p>

                <button
                  onClick={() => navigate('/demo')}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-100 hover:scale-[1.03] transition-all duration-200 shadow-lg"
                >
                  {t.nav.launchDemo}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <RevealSection>
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">
                {t.landing.ctaTitle}
              </h2>
              <p className="text-sm sm:text-base text-slate-500 mb-10 leading-relaxed">
                {t.landing.ctaDesc}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={() => navigate('/pricing')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-slate-900/20"
                >
                  {lang === 'ko' ? '플랜 보기 / View Plans' : 'View Plans'}
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/70 bg-slate-100/80">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <NuvovetLogo size={16} className="text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">NUVOVET</span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">{t.appTagline}</span>
          </div>
          <p className="text-xs text-slate-400">
            {t.landing.footerDisclaimer}
          </p>
        </div>
      </footer>

      {/* Modal */}
      <RequestAccessModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   WRAPPER COMPONENTS (self-contained with useReveal)
   These wrap the showcase components to trigger animations on scroll
   ═══════════════════════════════════════════════════════════════════ */

function LiveDDIDemo() {
  const [ref, visible] = useReveal(0.15);
  return (
    <div ref={ref}>
      <LiveDDIShowcase visible={visible} />
    </div>
  );
}

function DosageDemo() {
  const [ref, visible] = useReveal(0.15);
  return (
    <div ref={ref}>
      <DosageShowcase visible={visible} />
    </div>
  );
}

function OrganDemo() {
  const [ref, visible] = useReveal(0.15);
  return (
    <div ref={ref}>
      <OrganShowcase visible={visible} />
    </div>
  );
}

function BreedDemo() {
  const [ref, visible] = useReveal(0.15);
  return (
    <div ref={ref}>
      <BreedSafetyShowcase visible={visible} />
    </div>
  );
}

function WashoutDemo() {
  const [ref, visible] = useReveal(0.15);
  return (
    <div ref={ref}>
      <WashoutShowcase visible={visible} />
    </div>
  );
}
