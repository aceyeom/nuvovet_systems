import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n';

// "Explainable review": one sample claim as the claims engine actually codes and reviews it — receipt lines mapped
// to standard codes, then findings with their rule ID, amount at risk and evidence. Values are the engine's output
// for this input (backend/claims/engine.py); the price benchmark is the seed estimate and is labelled as such.
// (File name kept from the retired DUR landing so Landing.jsx imports stay unchanged.)

const lines = [
  { text: '초진료', code: 'CON-001', name: { ko: '초진 진찰료', en: 'Initial consultation' }, amount: 15000 },
  { text: '복부 초음파', code: 'IMG-002', name: { ko: '복부 초음파', en: 'Abdominal ultrasound' }, amount: 180000 },
  { text: '수액처치', code: 'TRT-001', name: { ko: '정맥 수액처치', en: 'IV fluid therapy' }, amount: 60000 },
  { text: '사료', code: 'NON-003', name: { ko: '사료·처방식 (지급 제외)', en: 'Food (not covered)' }, amount: 30000, excluded: true },
];

const findings = [
  {
    rule: 'pricing.regional_outlier',
    severity: 'warning',
    title: { ko: '지역 대비 고가: 복부 초음파 (P99)', en: 'Regional price outlier: abdominal ultrasound (P99)' },
    amount: 68000,
    evidence: { ko: '서울 중앙값 ₩67,200 · 벤치마크 추정치', en: 'Seoul median ₩67,200 · estimated benchmark' },
  },
  {
    rule: 'pricing.above_posted_fee',
    severity: 'warning',
    title: { ko: '게시 진료비 초과: 초진 진찰료', en: 'Above the clinic’s posted fee: consultation' },
    amount: 6000,
    evidence: { ko: '게시가 ₩9,000 · 청구 단가 ₩15,000', en: 'Posted ₩9,000 · billed ₩15,000' },
  },
  {
    rule: 'coverage.line_ineligible',
    severity: 'info',
    title: { ko: '지급 제외 항목: 사료', en: 'Not covered: food' },
    amount: 30000,
    evidence: { ko: '비의료 항목(사료·용품)', en: 'Non-medical item (food, supplies)' },
  },
];

const sev = {
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
  info: { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },
};

const won = (n) => `₩${n.toLocaleString('ko-KR')}`;

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeIn = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const pop = { hidden: { opacity: 0, scale: 0.95 }, visible: (i) => ({ opacity: 1, scale: 1, transition: { duration: 0.4, delay: 0.6 + i * 0.15 } }) };

export default function DDIIllustration() {
  const { lang } = useI18n();
  const l = lang === 'en' ? 'en' : 'ko';

  return (
    <motion.div
      className="min-h-[340px] sm:min-h-[380px]"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <motion.div variants={fadeIn} className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {l === 'ko' ? '예시 청구 · 엔진 출력' : 'Sample claim · engine output'}
        </span>
        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          {l === 'ko' ? '심사 필요' : 'Review'}
        </span>
      </motion.div>

      {/* Receipt lines → standard codes */}
      <motion.div variants={fadeIn} className="rounded-xl border border-slate-200 bg-white mb-3 overflow-hidden">
        {lines.map((ln, i) => (
          <div
            key={ln.code}
            className={`grid grid-cols-[1fr_auto] gap-2 px-3 py-1.5 text-[11px] ${i < lines.length - 1 ? 'border-b border-slate-100' : ''}`}
          >
            <div className="min-w-0 truncate">
              <span className="text-slate-500">{ln.text}</span>
              <span className="mx-1.5 text-slate-300">→</span>
              <span className={`font-mono text-[10px] ${ln.excluded ? 'text-slate-400' : 'text-indigo-600'}`}>{ln.code}</span>
              <span className={`ml-1.5 ${ln.excluded ? 'text-slate-400' : 'text-slate-700'}`}>{ln.name[l]}</span>
            </div>
            <span className={`tabular-nums ${ln.excluded ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{won(ln.amount)}</span>
          </div>
        ))}
      </motion.div>

      {/* Findings: rule ID, amount at risk, evidence */}
      <div className="space-y-2">
        {findings.map((f, i) => {
          const s = sev[f.severity];
          return (
            <motion.div
              key={f.rule}
              custom={i}
              variants={pop}
              className="rounded-xl border px-3 py-2"
              style={{ backgroundColor: s.bg, borderColor: s.border }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11.5px] font-semibold leading-snug" style={{ color: s.text }}>{f.title[l]}</span>
                <span className="shrink-0 text-[10.5px] font-semibold tabular-nums" style={{ color: s.text }}>{won(f.amount)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px]">
                <span className="font-mono text-slate-500">{f.rule}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500">{f.evidence[l]}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div variants={fadeIn} className="mt-3 text-[9.5px] text-slate-400">
        {l === 'ko' ? '판정은 심사역이 확정합니다 · 자동 거절 없음' : 'An adjuster confirms every decision · no auto-denials'}
      </motion.div>
    </motion.div>
  );
}
