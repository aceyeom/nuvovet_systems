import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const checkReveal = {
  hidden: { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, delay: 0.3 + i * 0.2, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const checkItems = [
  {
    status: 'pass',
    label: { ko: '종 적합성 확인', en: 'Species Compatibility' },
    detail: { ko: '개 (Canine) — 해당 약물 허가 확인됨', en: 'Canine — Drug approval confirmed' },
  },
  {
    status: 'pass',
    label: { ko: '품종 안전성 확인', en: 'Breed Safety Check' },
    detail: { ko: '셔틀랜드 쉽독 — 품종 프로필 로드됨', en: 'Shetland Sheepdog — Profile loaded' },
  },
  {
    status: 'warning',
    label: { ko: 'MDR1 감수성 감지', en: 'MDR1 Sensitivity Detected' },
    detail: { ko: 'P-gp 결핍 → 이버멕틴 혈뇌장벽 투과 위험', en: 'P-gp deficiency → Ivermectin BBB penetration risk' },
  },
  {
    status: 'pass',
    label: { ko: '알레르기 교차반응 없음', en: 'No Allergy Cross-Reaction' },
    detail: { ko: '73개 알레르기 클래스 대조 완료', en: '73 allergy classes verified' },
  },
  {
    status: 'critical',
    label: { ko: '아세트아미노펜 절대 금기', en: 'Acetaminophen Contraindicated' },
    detail: { ko: '고양이 종 — 사용 금지 (치사)', en: 'Feline species — Fatal, prohibited' },
  },
];

const statusConfig = {
  pass: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="#10b981" strokeWidth="1.2" fill="#10b98115" />
        <path d="M4 7l2 2 4-4" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    border: 'rgba(16,185,129,0.1)',
    bg: 'rgba(16,185,129,0.03)',
    labelColor: '#6ee7b7',
  },
  warning: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5L12.5 11.5H1.5L7 1.5Z" stroke="#f59e0b" strokeWidth="1.2" fill="#f59e0b15" />
        <path d="M7 6v2.5M7 10v.5" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    border: 'rgba(245,158,11,0.15)',
    bg: 'rgba(245,158,11,0.05)',
    labelColor: '#fcd34d',
    glow: true,
  },
  critical: {
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="#ef4444" strokeWidth="1.2" fill="#ef444415" />
        <path d="M5 5l4 4M9 5l-4 4" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    border: 'rgba(239,68,68,0.15)',
    bg: 'rgba(239,68,68,0.05)',
    labelColor: '#fca5a5',
    glow: true,
  },
};

export default function SafetyIllustration() {
  const { lang } = useI18n();
  const l = lang || 'ko';

  return (
    <motion.div
      className="relative min-h-[280px] sm:min-h-[340px]"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-2 mb-5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
          {l === 'ko' ? '환자 안전 점검' : 'Patient Safety Check'}
        </span>
      </motion.div>

      {/* Shield icon */}
      <motion.div variants={fadeUp} className="flex justify-center mb-5">
        <div className="relative">
          <svg width="40" height="44" viewBox="0 0 40 44" fill="none">
            <path
              d="M20 2L4 10v12c0 11.1 6.8 18.4 16 20 9.2-1.6 16-8.9 16-20V10L20 2Z"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
              fill="rgba(255,255,255,0.02)"
            />
            <path
              d="M20 8l-10 5v8c0 7.4 4.5 12.3 10 13.4"
              stroke="rgba(16,185,129,0.3)"
              strokeWidth="0.8"
              fill="rgba(16,185,129,0.03)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white/40">4/5</span>
          </div>
        </div>
      </motion.div>

      {/* Checklist */}
      <div className="space-y-2">
        {checkItems.map((item, i) => {
          const config = statusConfig[item.status];
          return (
            <motion.div
              key={i}
              custom={i}
              variants={checkReveal}
              className={`relative px-3.5 py-3 rounded-xl border transition-all ${
                config.glow ? 'shadow-sm' : ''
              }`}
              style={{
                backgroundColor: config.bg,
                borderColor: config.border,
                boxShadow: config.glow
                  ? `0 0 20px ${config.border}`
                  : 'none',
              }}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">{config.icon}</div>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold" style={{ color: config.labelColor }}>
                    {item.label[l]}
                  </div>
                  <div className="text-[10px] text-white/25 mt-0.5 leading-relaxed">
                    {item.detail[l]}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary bar */}
      <motion.div
        variants={fadeUp}
        className="mt-4 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]"
      >
        <span className="text-[10px] text-white/25">
          {l === 'ko' ? '50개 품종 · 16개 MDR1 품종 · 73개 알레르기 클래스' : '50 breeds · 16 MDR1 breeds · 73 allergy classes'}
        </span>
      </motion.div>
    </motion.div>
  );
}
