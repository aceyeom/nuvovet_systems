import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n';

// "From Korean brand names to doses": how the claims engine reads a prescription line. Product names resolve to
// ingredients through NuvoVet's curated aliases or the QIA product-licence registry (with the licence number as
// provenance); a dose far above the species reference is flagged as a likely unit or decimal error. The resolutions
// and the 5.0× figure are the engine's output for these inputs (backend/claims/knowledge.py, engine.py).

const resolutions = [
  { input: '아포퀠 3.6mg', out: { ko: '오클라시티닙', en: 'oclacitinib' }, source: 'curated' },
  { input: '바이트릴 50mg 정', out: { ko: '엔로플록사신', en: 'enrofloxacin' }, source: 'curated' },
  { input: '넥스가드 스펙트라', out: { ko: '아폭솔라너 + 밀베마이신 옥심', en: 'afoxolaner + milbemycin oxime' }, source: 'qia', licence: '동물용의약품-수입-128-109' },
  { input: '메타캄', out: { ko: '멜록시캄', en: 'meloxicam' }, source: 'curated' },
];

const sourceLabel = {
  curated: { ko: '직접 정리 별칭', en: 'Curated alias' },
  qia: { ko: 'QIA 품목허가', en: 'QIA licence' },
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };
const grow = { hidden: { width: 0 }, visible: (w) => ({ width: w, transition: { duration: 0.8, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] } }) };

export default function DosingIllustration() {
  const { lang } = useI18n();
  const l = lang === 'en' ? 'en' : 'ko';

  return (
    <motion.div
      className="min-h-[320px] sm:min-h-[360px]"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {l === 'ko' ? '처방 해석' : 'Prescription lines'}
        </span>
        <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          {l === 'ko' ? '개 · 6.0 kg · 아토피 피부염' : 'Dog · 6.0 kg · atopic dermatitis'}
        </span>
      </motion.div>

      {/* Product name → ingredient, with the source of the match */}
      <div className="space-y-1.5 mb-4">
        {resolutions.map((r) => (
          <motion.div
            key={r.input}
            variants={fadeUp}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
          >
            <div className="min-w-0 text-[11.5px]">
              <span className="font-medium text-slate-700">{r.input}</span>
              <span className="mx-1.5 text-slate-300">→</span>
              <span className="font-semibold text-emerald-700">{r.out[l]}</span>
              {r.licence && <div className="mt-0.5 truncate font-mono text-[9px] text-slate-400">{r.licence}</div>}
            </div>
            <span
              className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-medium ${
                r.source === 'qia' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {sourceLabel[r.source][l]}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Dose check against the species reference */}
      <motion.div variants={fadeUp} className="rounded-xl border border-red-200 bg-red-50/70 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[12px] font-semibold text-red-700">
            {l === 'ko' ? '참고 용량 초과: 멜록시캄 (통상 용량의 5.0배)' : 'Above reference dose: meloxicam (5.0× typical)'}
          </span>
          <span className="shrink-0 rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
            {l === 'ko' ? '심각' : 'Critical'}
          </span>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[9.5px] text-slate-500">{l === 'ko' ? '통상' : 'Typical'}</span>
            <div className="h-2 flex-1 rounded-full bg-white">
              <motion.div className="h-2 rounded-full bg-slate-400" custom="20%" variants={grow} />
            </div>
            <span className="w-8 text-right text-[9.5px] tabular-nums text-slate-500">1×</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[9.5px] text-red-700">{l === 'ko' ? '청구' : 'Billed'}</span>
            <div className="h-2 flex-1 rounded-full bg-white">
              <motion.div className="h-2 rounded-full bg-red-500" custom="100%" variants={grow} />
            </div>
            <span className="w-8 text-right text-[9.5px] font-semibold tabular-nums text-red-700">5.0×</span>
          </div>
        </div>
        <div className="mt-2.5 text-[10px] leading-relaxed text-red-700/80">
          {l === 'ko'
            ? '청구 1.0 mg/kg — 단위 오기(소수점·mg↔mL) 또는 수량 과다 청구 여부를 확인하세요.'
            : 'Billed 1.0 mg/kg — check for a unit or decimal error, or an inflated quantity.'}
        </div>
        <div className="mt-1.5 font-mono text-[9px] text-red-700/60">clinical.dose_above_reference</div>
      </motion.div>
    </motion.div>
  );
}
