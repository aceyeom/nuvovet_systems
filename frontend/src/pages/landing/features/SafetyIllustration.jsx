import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };
const checkReveal = {
  hidden: { opacity: 0, x: -16 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, delay: 0.3 + i * 0.15, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const checkItems = [
  {
    status: 'pass',
    label: { ko: '종 적합성 확인', en: 'Species Compatibility' },
    detail: { ko: '개 (Canine) — 해당 약물 모두 허가 확인됨', en: 'Canine — All drugs species-approved' },
  },
  {
    status: 'pass',
    label: { ko: '품종 안전성 확인', en: 'Breed Safety Verified' },
    detail: { ko: '셔틀랜드 쉽독 — 품종 프로필 로드됨', en: 'Shetland Sheepdog — Breed profile loaded' },
  },
  {
    status: 'warning',
    label: { ko: 'MDR1 감수성 감지', en: 'MDR1 Sensitivity Detected' },
    detail: { ko: 'P-gp 결핍 → 이버멕틴 혈뇌장벽 투과 위험', en: 'P-gp deficiency → Ivermectin BBB risk' },
    recommendation: { ko: '셀라멕틴 또는 밀베마이신으로 전환 권고', en: 'Switch to Selamectin or Milbemycin' },
  },
  {
    status: 'pass',
    label: { ko: '알레르기 교차반응 없음', en: 'No Allergy Cross-Reaction' },
    detail: { ko: '73개 알레르기 클래스 대조 — 이상 없음', en: '73 allergy classes checked — Clear' },
  },
  {
    status: 'critical',
    label: { ko: '아세트아미노펜 종 금기', en: 'Acetaminophen Species Block' },
    detail: { ko: '고양이 종 절대 금기 — 치사 위험', en: 'Fatal in felines — Absolute contraindication' },
    recommendation: { ko: 'DUR 스캔 이전 자동 차단됨', en: 'Auto-blocked before DUR scan' },
  },
];

const statusConfig = {
  pass: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="#16a34a" strokeWidth="1.5" fill="#f0fdf4" />
        <path d="M5 8l2 2 4-4" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    bg: '#f0fdf4',
    border: '#bbf7d0',
    labelColor: '#15803d',
    detailColor: '#4ade80',
  },
  warning: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L14 13H2L8 2Z" stroke="#d97706" strokeWidth="1.5" fill="#fffbeb" strokeLinejoin="round" />
        <path d="M8 7v2.5M8 11.5v.5" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    bg: '#fffbeb',
    border: '#fde68a',
    labelColor: '#b45309',
    detailColor: '#d97706',
  },
  critical: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.5" fill="#fef2f2" />
        <path d="M6 6l4 4M10 6l-4 4" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    bg: '#fef2f2',
    border: '#fecaca',
    labelColor: '#b91c1c',
    detailColor: '#dc2626',
  },
};

export default function SafetyIllustration() {
  const { lang } = useI18n();
  const l = lang || 'ko';

  const passCount = checkItems.filter(c => c.status === 'pass').length;
  const total = checkItems.length;

  return (
    <motion.div
      className="min-h-[320px] sm:min-h-[380px]"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {l === 'ko' ? '환자 안전 점검' : 'Patient Safety Check'}
        </span>
        <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          {passCount}/{total} {l === 'ko' ? '통과' : 'passed'}
        </span>
      </motion.div>

      {/* Patient context */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
        <span className="text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">{l === 'ko' ? '셔틀랜드 쉽독' : 'Shetland Sheepdog'}</span>
          {' · '}4{l === 'ko' ? '세' : 'y'} · 8.2 kg
        </span>
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
              className="rounded-xl border px-3.5 py-2.5"
              style={{ backgroundColor: config.bg, borderColor: config.border }}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">{config.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold" style={{ color: config.labelColor }}>
                    {item.label[l]}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: config.detailColor, opacity: 0.7 }}>
                    {item.detail[l]}
                  </div>
                  {item.recommendation && (
                    <div className="mt-1.5 text-[10px] font-medium px-2 py-1 rounded-md bg-white/60 border" style={{ borderColor: config.border, color: config.labelColor }}>
                      → {item.recommendation[l]}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Coverage footer */}
      <motion.div variants={fadeUp} className="mt-3 flex items-center gap-4 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
        <span className="text-[9px] text-slate-400">
          {l === 'ko' ? '50개 품종 프로필' : '50 breed profiles'}
        </span>
        <span className="text-[9px] text-slate-300">·</span>
        <span className="text-[9px] text-slate-400">
          {l === 'ko' ? '16개 MDR1 품종' : '16 MDR1 breeds'}
        </span>
        <span className="text-[9px] text-slate-300">·</span>
        <span className="text-[9px] text-slate-400">
          {l === 'ko' ? '73개 알레르기 클래스' : '73 allergy classes'}
        </span>
      </motion.div>
    </motion.div>
  );
}
