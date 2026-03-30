import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n';

const drugs = [
  { name: { ko: '멜록시캄', en: 'Meloxicam' }, class: 'NSAID' },
  { name: { ko: '프레드니솔론', en: 'Prednisolone' }, class: 'Corticosteroid' },
  { name: { ko: '엔로플록사신', en: 'Enrofloxacin' }, class: 'Fluoroquinolone' },
  { name: { ko: '트라마돌', en: 'Tramadol' }, class: 'Opioid' },
];

const interactions = [
  { a: 0, b: 1, severity: 'critical', label: { ko: 'GI 출혈 위험', en: 'GI Bleeding Risk' } },
  { a: 2, b: 3, severity: 'moderate', label: { ko: 'QT 연장', en: 'QT Prolongation' } },
];

const severityColors = {
  critical: { dot: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', text: '#fca5a5' },
  moderate: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: '#fcd34d' },
  safe: { dot: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', text: '#6ee7b7' },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeIn = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
};

const scanLine = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.8, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const alertPop = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, delay: 1.0 + i * 0.25, ease: [0.34, 1.56, 0.64, 1] },
  }),
};

export default function DDIIllustration() {
  const { lang } = useI18n();
  const l = lang || 'ko';

  return (
    <motion.div
      className="relative min-h-[280px] sm:min-h-[320px]"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {/* Header label */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
          {l === 'ko' ? '처방전 스캔 결과' : 'Prescription Scan Result'}
        </span>
      </div>

      {/* Drug list */}
      <motion.div className="space-y-2.5" variants={stagger}>
        {drugs.map((drug, i) => {
          const interaction = interactions.find(ix => ix.a === i || ix.b === i);
          const sev = interaction ? severityColors[interaction.severity] : severityColors.safe;

          return (
            <motion.div
              key={i}
              variants={fadeIn}
              className="flex items-center justify-between py-2.5 px-3.5 rounded-xl border"
              style={{
                backgroundColor: interaction ? sev.bg : 'rgba(255,255,255,0.02)',
                borderColor: interaction ? sev.border : 'rgba(255,255,255,0.04)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: sev.dot }}
                />
                <div>
                  <span className="text-[13px] font-semibold text-white/90">
                    {drug.name[l]}
                  </span>
                  <span className="ml-2 text-[10px] text-white/25 font-medium">
                    {drug.class}
                  </span>
                </div>
              </div>
              {interaction && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                  style={{ color: sev.text, backgroundColor: sev.bg }}
                >
                  {interaction.severity === 'critical'
                    ? (l === 'ko' ? '위험' : 'Critical')
                    : (l === 'ko' ? '주의' : 'Moderate')}
                </span>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Scan line */}
      <motion.div
        className="mt-4 h-[1px] bg-gradient-to-r from-transparent via-red-400/40 to-transparent origin-left"
        variants={scanLine}
      />

      {/* Interaction alerts */}
      <div className="mt-4 space-y-2">
        {interactions.map((ix, i) => {
          const sev = severityColors[ix.severity];
          return (
            <motion.div
              key={i}
              custom={i}
              variants={alertPop}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border"
              style={{ backgroundColor: sev.bg, borderColor: sev.border }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1L13 12H1L7 1Z"
                  stroke={sev.dot}
                  strokeWidth="1.2"
                  fill={`${sev.dot}20`}
                />
              </svg>
              <span className="text-[11px] font-medium" style={{ color: sev.text }}>
                {drugs[ix.a].name[l]} + {drugs[ix.b].name[l]}
              </span>
              <span className="text-[10px] text-white/30 ml-auto">
                {ix.label[l]}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
