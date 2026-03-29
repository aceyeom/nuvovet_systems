import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const organReveal = {
  hidden: { opacity: 0, scale: 0.7 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: 0.4 + i * 0.15, ease: [0.34, 1.56, 0.64, 1] },
  }),
};

const scanSweep = {
  hidden: { x: '-100%' },
  visible: {
    x: '200%',
    transition: { duration: 1.8, delay: 0.3, ease: 'linear', repeat: 0 },
  },
};

const organs = [
  { id: 'liver', label: { ko: '간', en: 'Liver' }, score: 72, cx: 42, cy: 38, r: 18, color: '#3b82f6' },
  { id: 'kidney', label: { ko: '신장', en: 'Kidney' }, score: 85, cx: 65, cy: 48, r: 14, color: '#1d4ed8' },
  { id: 'heart', label: { ko: '심장', en: 'Heart' }, score: 30, cx: 38, cy: 22, r: 12, color: '#60a5fa' },
  { id: 'brain', label: { ko: '뇌', en: 'Brain' }, score: 15, cx: 50, cy: 8, r: 11, color: '#94a3b8' },
  { id: 'blood', label: { ko: '혈액', en: 'Blood' }, score: 55, cx: 22, cy: 50, r: 13, color: '#2563eb' },
];

function getBurdenLevel(score) {
  if (score >= 70) return { label: { ko: '높음', en: 'High' }, color: '#ef4444' };
  if (score >= 40) return { label: { ko: '보통', en: 'Moderate' }, color: '#f59e0b' };
  return { label: { ko: '낮음', en: 'Low' }, color: '#10b981' };
}

export default function OrganIllustration() {
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
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
        <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
          {l === 'ko' ? '장기 관여도 스캔' : 'Organ Burden Scan'}
        </span>
      </motion.div>

      {/* Body scan visualization */}
      <motion.div variants={fadeUp} className="relative">
        <div className="relative rounded-2xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
          {/* Scan line sweep */}
          <motion.div
            className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent z-10"
            variants={scanSweep}
          />

          {/* Grid overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" preserveAspectRatio="none">
            <defs>
              <pattern id="organ-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#organ-grid)" />
          </svg>

          {/* Corner brackets */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-blue-400/20" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-blue-400/20" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-blue-400/20" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-blue-400/20" />

          {/* Abstract body silhouette with organ nodes */}
          <svg viewBox="0 0 100 70" className="w-full h-auto py-6 px-4" style={{ minHeight: 180 }}>
            {/* Abstract body outline */}
            <motion.path
              d="M50 4 C38 4 32 10 30 18 C28 26 26 30 20 35 C14 40 12 48 16 55 C20 62 30 65 40 64 C45 63.5 48 62 50 60 C52 62 55 63.5 60 64 C70 65 80 62 84 55 C88 48 86 40 80 35 C74 30 72 26 70 18 C68 10 62 4 50 4Z"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="0.4"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />

            {/* Organ nodes */}
            {organs.map((organ, i) => {
              const burden = getBurdenLevel(organ.score);
              return (
                <motion.g key={organ.id} custom={i} variants={organReveal}>
                  {/* Glow ring */}
                  <circle
                    cx={organ.cx}
                    cy={organ.cy}
                    r={organ.r}
                    fill={`${organ.color}10`}
                    stroke={`${organ.color}30`}
                    strokeWidth="0.4"
                  />
                  {/* Inner fill based on score */}
                  <circle
                    cx={organ.cx}
                    cy={organ.cy}
                    r={organ.r * 0.65}
                    fill={`${organ.color}25`}
                    stroke={`${organ.color}50`}
                    strokeWidth="0.3"
                  />
                  {/* Score text */}
                  <text
                    x={organ.cx}
                    y={organ.cy + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="5"
                    fontWeight="600"
                    opacity="0.8"
                  >
                    {organ.score}%
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>
      </motion.div>

      {/* Organ score list */}
      <motion.div variants={fadeUp} className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {organs.map((organ, i) => {
          const burden = getBurdenLevel(organ.score);
          return (
            <motion.div
              key={organ.id}
              custom={i}
              variants={organReveal}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: burden.color }}
              />
              <span className="text-[11px] text-white/50 font-medium">{organ.label[l]}</span>
              <span className="text-[11px] font-bold ml-auto" style={{ color: burden.color }}>
                {organ.score}%
              </span>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
