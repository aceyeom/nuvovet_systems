import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n';

const drugs = [
  { name: { ko: '멜록시캄', en: 'Meloxicam' }, class: 'NSAID' },
  { name: { ko: '프레드니솔론', en: 'Prednisolone' }, class: 'Corticosteroid' },
  { name: { ko: '엔로플록사신', en: 'Enrofloxacin' }, class: 'Fluoroquinolone' },
  { name: { ko: '트라마돌', en: 'Tramadol' }, class: 'Opioid' },
];

const ruleEngines = [
  { label: { ko: 'CYP 효소 분석', en: 'CYP Enzyme' }, color: '#6366f1' },
  { label: { ko: 'QT 연장', en: 'QT Prolong.' }, color: '#8b5cf6' },
  { label: { ko: '출혈 위험', en: 'Bleeding Risk' }, color: '#a855f7' },
  { label: { ko: '세로토닌', en: 'Serotonin' }, color: '#c084fc' },
  { label: { ko: '중복 처방', en: 'Duplication' }, color: '#7c3aed' },
];

const flaggedPairs = [
  {
    drugA: { ko: '멜록시캄', en: 'Meloxicam' },
    drugB: { ko: '프레드니솔론', en: 'Prednisolone' },
    rule: { ko: 'GI 출혈 위험', en: 'GI Bleeding Risk' },
    severity: 'critical',
  },
  {
    drugA: { ko: '엔로플록사신', en: 'Enrofloxacin' },
    drugB: { ko: '트라마돌', en: 'Tramadol' },
    rule: { ko: 'QT 연장 중첩', en: 'QT Prolongation' },
    severity: 'moderate',
  },
];

const sevConfig = {
  critical: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', badge: '#dc2626', badgeText: '#fff', label: { ko: '위험', en: 'Critical' } },
  moderate: { bg: '#fffbeb', border: '#fed7aa', text: '#d97706', badge: '#d97706', badgeText: '#fff', label: { ko: '주의', en: 'Moderate' } },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeIn = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const dropIn = { hidden: { opacity: 0, y: -16 }, visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.5 + i * 0.08 } }) };
const resultPop = { hidden: { opacity: 0, scale: 0.9 }, visible: (i) => ({ opacity: 1, scale: 1, transition: { duration: 0.4, delay: 1.2 + i * 0.2 } }) };

export default function DDIIllustration() {
  const { lang } = useI18n();
  const l = lang || 'ko';

  return (
    <motion.div
      className="min-h-[340px] sm:min-h-[380px]"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {/* ── INPUT: Drug entries ── */}
      <motion.div variants={fadeIn} className="mb-1">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {l === 'ko' ? '입력 약물' : 'Input Drugs'}
        </span>
      </motion.div>
      <motion.div className="flex flex-wrap gap-1.5 mb-4" variants={stagger}>
        {drugs.map((drug, i) => (
          <motion.div
            key={i}
            variants={fadeIn}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-700"
          >
            {drug.name[l]}
            <span className="ml-1 text-slate-400 text-[9px]">{drug.class}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Arrow down ── */}
      <motion.div variants={fadeIn} className="flex justify-center mb-3">
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <path d="M8 2v18M3 16l5 5 5-5" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>

      {/* ── PROCESSING: Rule engine layers ── */}
      <motion.div variants={fadeIn} className="mb-1">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {l === 'ko' ? '검사 엔진 (9,746 규칙)' : 'Screening Engines (9,746 Rules)'}
        </span>
      </motion.div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {ruleEngines.map((rule, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={dropIn}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white"
            style={{ backgroundColor: rule.color }}
          >
            {rule.label[l]}
          </motion.div>
        ))}
      </div>

      {/* ── Arrow down ── */}
      <motion.div variants={fadeIn} className="flex justify-center mb-3">
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <path d="M8 2v18M3 16l5 5 5-5" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>

      {/* ── OUTPUT: Flagged pairs ── */}
      <motion.div variants={fadeIn} className="mb-2">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {l === 'ko' ? '검출 결과' : 'Flagged Results'}
        </span>
      </motion.div>
      <div className="space-y-2">
        {flaggedPairs.map((pair, i) => {
          const sev = sevConfig[pair.severity];
          return (
            <motion.div
              key={i}
              custom={i}
              variants={resultPop}
              className="rounded-xl border px-3.5 py-3"
              style={{ backgroundColor: sev.bg, borderColor: sev.border }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold" style={{ color: sev.text }}>
                    {pair.drugA[l]}
                  </span>
                  <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                    <path d="M0 4h12M10 1l3 3-3 3" stroke={sev.text} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[12px] font-semibold" style={{ color: sev.text }}>
                    {pair.drugB[l]}
                  </span>
                </div>
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-md text-white"
                  style={{ backgroundColor: sev.badge }}
                >
                  {sev.label[l]}
                </span>
              </div>
              <div className="text-[10px]" style={{ color: sev.text, opacity: 0.7 }}>
                {pair.rule[l]}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
