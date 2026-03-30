import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n';
import {
  ANATOMY_IMAGE_CONFIG,
  ORGAN_RENDER_ORDER,
  getSectionFill,
  getSeverityHex,
} from '../../../components/charts/anatomyConstants';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

const organReveal = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: 0.6 + i * 0.18, ease: [0.34, 1.56, 0.64, 1] },
  }),
};

const scanSweep = {
  hidden: { x: '-10%' },
  visible: {
    x: '110%',
    transition: { duration: 2.0, delay: 0.3, ease: 'linear' },
  },
};

const mockOrganScores = {
  liver: { finalScore: 72 },
  kidney: { finalScore: 85 },
  heart: { finalScore: 30 },
  brain: { finalScore: 15 },
  blood: { finalScore: 55 },
};

const organLabels = {
  liver: { ko: '간', en: 'Liver' },
  kidney: { ko: '신장', en: 'Kidney' },
  heart: { ko: '심장', en: 'Heart' },
  brain: { ko: '뇌', en: 'Brain' },
  blood: { ko: '혈액', en: 'Blood' },
};

export default function OrganIllustration() {
  const { lang } = useI18n();
  const l = lang || 'ko';

  const config = ANATOMY_IMAGE_CONFIG?.dog;
  const viewBox = config ? `0 0 ${config.width} ${config.height}` : '0 0 485 385';

  return (
    <motion.div
      className="min-h-[320px] sm:min-h-[380px]"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {l === 'ko' ? '장기 관여도 분석' : 'Organ Burden Analysis'}
        </span>
        <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
          {l === 'ko' ? '개 (Canine)' : 'Canine'}
        </span>
      </motion.div>

      {/* Anatomy diagram with scan effect */}
      <motion.div variants={fadeUp} className="relative rounded-xl overflow-hidden bg-slate-50 border border-slate-200 mb-4">
        {/* Scan line sweep */}
        <motion.div
          className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-blue-400/15 to-transparent z-10"
          variants={scanSweep}
        />

        {/* Corner brackets */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-blue-300/40 z-10" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-300/40 z-10" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-300/40 z-10" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-blue-300/40 z-10" />

        {/* SVG with dog silhouette + organ overlays */}
        <svg viewBox={viewBox} className="w-full h-auto p-3" style={{ maxHeight: 240 }}>
          {/* Dog silhouette */}
          <image
            href="/anatomy/dog-traced.svg"
            x="0"
            y="0"
            width={config?.width || 485}
            height={config?.height || 385}
            opacity="0.35"
          />

          {/* Organ overlays from actual AnatomyDiagram config */}
          {ORGAN_RENDER_ORDER?.map((organKey, i) => {
            const organPath = config?.sections?.[organKey];
            const score = mockOrganScores[organKey]?.finalScore;
            if (!organPath) return null;

            const fill = getSectionFill(score);
            const hex = getSeverityHex(score);

            if (organPath.type === 'line') {
              return (
                <motion.path
                  key={organKey}
                  custom={i}
                  variants={organReveal}
                  d={organPath.d}
                  fill="none"
                  stroke={fill.replace(/,\s*[\d.]+\)/, ', 0.7)')}
                  strokeWidth={organPath.strokeWidth || 8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            }

            return (
              <motion.path
                key={organKey}
                custom={i}
                variants={organReveal}
                d={organPath.d}
                fill={fill}
                stroke={hex}
                strokeWidth="1.5"
              />
            );
          })}

          {/* Organ labels with leader lines */}
          {config?.labelAnchors && ORGAN_RENDER_ORDER?.map((organKey, i) => {
            const anchor = config.labelAnchors[organKey];
            const score = mockOrganScores[organKey]?.finalScore;
            const hex = getSeverityHex(score);
            if (!anchor) return null;

            return (
              <motion.g key={`label-${organKey}`} custom={i} variants={organReveal}>
                {/* Leader line */}
                <line
                  x1={anchor.organCx}
                  y1={anchor.organCy}
                  x2={anchor.x}
                  y2={anchor.y}
                  stroke="#94a3b8"
                  strokeWidth="0.6"
                  strokeDasharray="3 2"
                  opacity="0.5"
                />
                {/* Score dot */}
                <circle
                  cx={anchor.x}
                  cy={anchor.y}
                  r="3"
                  fill={hex}
                />
                {/* Label text */}
                <text
                  x={anchor.x + 6}
                  y={anchor.y + 1}
                  fontSize="9"
                  fontWeight="600"
                  fill="#334155"
                  dominantBaseline="middle"
                >
                  {organLabels[organKey]?.[l] || organKey}
                </text>
                <text
                  x={anchor.x + 6}
                  y={anchor.y + 12}
                  fontSize="8"
                  fontWeight="700"
                  fill={hex}
                  dominantBaseline="middle"
                >
                  {score != null ? `${score}%` : '—'}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </motion.div>

      {/* Organ score summary row */}
      <motion.div variants={fadeUp} className="grid grid-cols-5 gap-1.5">
        {ORGAN_RENDER_ORDER?.map((organKey, i) => {
          const score = mockOrganScores[organKey]?.finalScore;
          const hex = getSeverityHex(score);

          return (
            <motion.div
              key={organKey}
              custom={i}
              variants={organReveal}
              className="text-center px-1.5 py-2 rounded-lg bg-slate-50 border border-slate-100"
            >
              <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: hex }} />
              <div className="text-[9px] text-slate-500 font-medium">{organLabels[organKey]?.[l]}</div>
              <div className="text-[12px] font-bold" style={{ color: hex }}>{score}%</div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
