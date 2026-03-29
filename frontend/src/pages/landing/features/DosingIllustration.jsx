import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scaleY: 0 },
  visible: { opacity: 1, scaleY: 1, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};

const slideRight = {
  hidden: { opacity: 0, width: 0 },
  visible: (w) => ({
    opacity: 1,
    width: w,
    transition: { duration: 0.7, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const dosePop = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, delay: 0.9, ease: [0.34, 1.56, 0.64, 1] },
  },
};

export default function DosingIllustration() {
  const { lang } = useI18n();
  const l = lang || 'ko';

  const zones = [
    { label: { ko: '독성', en: 'Toxic' }, color: '#ef4444', width: '15%', opacity: 0.12 },
    { label: { ko: '치료 범위', en: 'Therapeutic' }, color: '#10b981', width: '35%', opacity: 0.12 },
    { label: { ko: '치료 미만', en: 'Sub-therapeutic' }, color: '#64748b', width: '50%', opacity: 0.06 },
  ];

  return (
    <motion.div
      className="relative min-h-[280px] sm:min-h-[320px]"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
          {l === 'ko' ? '용량 계산 결과' : 'Dose Calculation Result'}
        </span>
      </motion.div>

      {/* Patient info bar */}
      <motion.div
        variants={fadeUp}
        className="flex items-center gap-4 mb-6 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]"
      >
        <div className="text-[11px] text-white/30">
          <span className="text-white/60 font-medium">{l === 'ko' ? '체중' : 'Weight'}</span>{' '}
          12.5 kg
        </div>
        <div className="w-[1px] h-3 bg-white/10" />
        <div className="text-[11px] text-white/30">
          <span className="text-white/60 font-medium">{l === 'ko' ? '종' : 'Species'}</span>{' '}
          {l === 'ko' ? '개 (Canine)' : 'Canine'}
        </div>
        <div className="w-[1px] h-3 bg-white/10" />
        <div className="text-[11px] text-white/30">
          <span className="text-white/60 font-medium">Cr</span>{' '}
          <span className="text-amber-400/80">2.1 mg/dL ↑</span>
        </div>
      </motion.div>

      {/* Therapeutic window scale */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="text-[10px] text-white/20 uppercase tracking-wider mb-2 font-medium">
          {l === 'ko' ? '치료 범위 스케일' : 'Therapeutic Window'}
        </div>

        {/* Scale bar */}
        <div className="relative h-10 rounded-lg overflow-hidden bg-white/[0.02] border border-white/[0.05]">
          {/* Zone backgrounds - rendered right to left (toxic at top/right) */}
          <div className="absolute inset-0 flex flex-row-reverse">
            {zones.map((zone, i) => (
              <motion.div
                key={i}
                className="h-full origin-bottom"
                style={{
                  width: zone.width,
                  backgroundColor: zone.color,
                  opacity: zone.opacity,
                }}
                variants={scaleIn}
              />
            ))}
          </div>

          {/* Zone labels */}
          <div className="absolute inset-0 flex flex-row-reverse items-center">
            <div className="w-[15%] text-center text-[9px] text-red-400/50 font-medium">
              {zones[0].label[l]}
            </div>
            <div className="w-[35%] text-center text-[9px] text-emerald-400/50 font-medium">
              {zones[1].label[l]}
            </div>
            <div className="w-[50%] text-center text-[9px] text-white/20 font-medium">
              {zones[2].label[l]}
            </div>
          </div>

          {/* Dose marker - positioned in therapeutic zone */}
          <motion.div
            className="absolute top-0 bottom-0 flex items-center"
            style={{ left: '58%' }}
            variants={dosePop}
          >
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/30" />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md bg-emerald-400/15 border border-emerald-400/20">
                <span className="text-[10px] font-semibold text-emerald-300">0.1 mg/kg</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Dose details */}
      <motion.div variants={fadeUp} className="space-y-2.5">
        {/* Standard dose */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[12px] text-white/40">
            {l === 'ko' ? '표준 용량' : 'Standard Dose'}
          </span>
          <span className="text-[12px] text-white/30 line-through">0.2 mg/kg</span>
        </div>

        {/* Adjusted dose */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.12]">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[12px] text-emerald-300/80 font-medium">
              {l === 'ko' ? '신장 조정 용량' : 'Renal-Adjusted Dose'}
            </span>
          </div>
          <span className="text-[13px] text-emerald-300 font-bold">0.1 mg/kg</span>
        </div>

        {/* Adjustment reason */}
        <div className="px-3.5 py-2 rounded-lg bg-amber-500/[0.04] border border-amber-500/[0.08]">
          <span className="text-[10px] text-amber-300/50">
            {l === 'ko'
              ? 'Cr 2.1 mg/dL 상승 → 신장 용량 조정 계수 0.5× 적용'
              : 'Cr 2.1 mg/dL elevated → Renal adjustment factor 0.5× applied'}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
