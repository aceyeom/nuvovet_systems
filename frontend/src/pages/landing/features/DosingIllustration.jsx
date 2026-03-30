import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };
const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (d) => ({ opacity: 1, scale: 1, transition: { duration: 0.4, delay: d || 0 } }),
};

export default function DosingIllustration() {
  const { lang } = useI18n();
  const l = lang || 'ko';

  return (
    <motion.div
      className="min-h-[320px] sm:min-h-[360px]"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {l === 'ko' ? '용량 계산' : 'Dose Calculation'}
        </span>
        <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          {l === 'ko' ? '자동 조정 적용됨' : 'Auto-Adjusted'}
        </span>
      </motion.div>

      {/* Drug name */}
      <motion.div variants={fadeUp} className="mb-4">
        <div className="text-[15px] font-bold text-slate-800">
          {l === 'ko' ? '멜록시캄' : 'Meloxicam'}
          <span className="ml-2 text-[11px] font-normal text-slate-400">NSAID</span>
        </div>
      </motion.div>

      {/* Patient parameters grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: l === 'ko' ? '체중' : 'Weight', value: '12.5 kg', icon: '⚖' },
          { label: l === 'ko' ? '종' : 'Species', value: l === 'ko' ? '개' : 'Canine', icon: '🐕' },
          { label: l === 'ko' ? '투여 경로' : 'Route', value: 'PO', icon: '💊' },
        ].map((param, i) => (
          <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2 text-center">
            <div className="text-[9px] text-slate-400 font-medium uppercase mb-0.5">{param.label}</div>
            <div className="text-[12px] font-semibold text-slate-700">{param.value}</div>
          </div>
        ))}
      </motion.div>

      {/* Lab values (triggers) */}
      <motion.div variants={fadeUp} className="mb-4">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          {l === 'ko' ? '이상 검사값' : 'Flagged Labs'}
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[11px] font-medium text-amber-700">Cr 2.1 mg/dL</span>
            <span className="text-[9px] text-amber-500">↑</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span className="text-[11px] font-medium text-slate-500">ALT 45 U/L</span>
          </div>
        </div>
      </motion.div>

      {/* Dose calculation result */}
      <motion.div
        custom={0.4}
        variants={scaleIn}
        className="rounded-xl border-2 border-slate-200 bg-white p-4 mb-3"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {l === 'ko' ? '계산 결과' : 'Calculation Result'}
          </span>
        </div>

        {/* Standard dose → adjusted */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-slate-500">
              {l === 'ko' ? '표준 용량' : 'Standard Dose'}
            </span>
            <span className="text-[13px] text-slate-400 line-through">0.2 mg/kg</span>
          </div>

          <div className="flex items-center gap-2 justify-center">
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
              <path d="M6 2v10M2 9l4 4 4-4" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] text-amber-600 font-medium">
              {l === 'ko' ? 'Cr 상승 → 신장 조정 ×0.5' : 'Cr elevated → Renal adj. ×0.5'}
            </span>
          </div>

          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
            <span className="text-[12px] font-semibold text-emerald-700">
              {l === 'ko' ? '조정 용량' : 'Adjusted Dose'}
            </span>
            <span className="text-[18px] font-black text-emerald-600">0.1 mg/kg</span>
          </div>
        </div>
      </motion.div>

      {/* Total daily dose */}
      <motion.div custom={0.6} variants={scaleIn} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
        <span className="text-[10px] text-slate-400">
          {l === 'ko' ? '1일 총 투여량 (12.5 kg)' : 'Daily Total (12.5 kg)'}
        </span>
        <span className="text-[13px] font-bold text-slate-700">1.25 mg</span>
      </motion.div>
    </motion.div>
  );
}
