import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n';

// "Wrong animal, duplicate claims": one sample cat claim through the claims engine's integrity and coverage rules.
// Hits, their rule IDs and the decision are the engine's output for this input, with a same-day claim C-8 for
// the same patient in history (backend/claims/engine.py _integrity, coverage).
// (File name kept from the retired DUR landing so Landing.jsx imports stay unchanged.)

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };
const checkReveal = {
  hidden: { opacity: 0, x: -16 },
  visible: (i) => ({ opacity: 1, x: 0, transition: { duration: 0.4, delay: 0.3 + i * 0.15, ease: [0.25, 0.1, 0.25, 1] } }),
};

const checks = [
  {
    status: 'critical',
    rule: 'integrity.species_mismatch_item',
    label: { ko: '종 불일치 항목: 개 종합백신 (DHPPL)', en: 'Species mismatch: dog vaccine (DHPPL)' },
    detail: { ko: '개 전용 항목이 고양이 청구에 포함되어 있습니다', en: 'A dog-only item on a cat claim' },
  },
  {
    status: 'warning',
    rule: 'integrity.weight_implausible',
    label: { ko: '체중 이상', en: 'Implausible weight' },
    detail: { ko: '고양이 체중 14.5 kg은 통상 범위를 벗어납니다', en: 'A 14.5 kg cat is outside the normal range' },
  },
  {
    status: 'critical',
    rule: 'integrity.duplicate_claim',
    label: { ko: '중복 청구 의심', en: 'Possible duplicate claim' },
    detail: { ko: '같은 날 기존 청구 C-8과 항목 100% 중복', en: 'Same visit date as claim C-8, 100% of items overlap' },
  },
  {
    status: 'pass',
    rule: 'coverage.before_policy_start',
    label: { ko: '보험 개시 전 진료', en: 'Care before the policy started' },
    detail: { ko: '해당 없음 — 보험 개시 2025-06-01', en: 'Not triggered — policy started 2025-06-01' },
  },
];

const statusConfig = {
  pass: { bg: '#f0fdf4', border: '#bbf7d0', label: '#15803d', detail: '#16a34a', mark: '✓' },
  warning: { bg: '#fffbeb', border: '#fde68a', label: '#b45309', detail: '#d97706', mark: '!' },
  critical: { bg: '#fef2f2', border: '#fecaca', label: '#b91c1c', detail: '#dc2626', mark: '×' },
};

export default function SafetyIllustration() {
  const { lang } = useI18n();
  const l = lang === 'en' ? 'en' : 'ko';
  const hits = checks.filter((c) => c.status !== 'pass').length;

  return (
    <motion.div
      className="min-h-[320px] sm:min-h-[380px]"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {l === 'ko' ? '무결성 규칙' : 'Integrity rules'}
        </span>
        <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          {l === 'ko' ? `${checks.length}개 중 ${hits}개 해당` : `${hits} of ${checks.length} triggered`}
        </span>
      </motion.div>

      <motion.div variants={fadeUp} className="flex items-center justify-between gap-3 mb-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
        <span className="text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">{l === 'ko' ? '고양이 · 코리안 숏헤어' : 'Cat · Korean shorthair'}</span>
          {' · '}14.5 kg · {l === 'ko' ? '방광염' : 'cystitis'}
        </span>
        <span className="font-mono text-[10px] text-slate-400">C-9</span>
      </motion.div>

      <div className="space-y-2">
        {checks.map((c, i) => {
          const cfg = statusConfig[c.status];
          return (
            <motion.div
              key={c.rule}
              custom={i}
              variants={checkReveal}
              className="rounded-xl border px-3.5 py-2"
              style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: cfg.detail }}
                  aria-hidden="true"
                >
                  {cfg.mark}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold" style={{ color: cfg.label }}>{c.label[l]}</div>
                  <div className="mt-0.5 text-[10px]" style={{ color: cfg.detail }}>{c.detail[l]}</div>
                  <div className="mt-0.5 font-mono text-[9px] text-slate-400">{c.rule}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div variants={fadeUp} className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-[9.5px]">
        <span className="font-semibold text-red-700">{l === 'ko' ? '지급 거절 권고' : 'Deny recommended'}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{l === 'ko' ? 'SIU: 동물 동일성 불일치, 청구 간 중복' : 'SIU: identity mismatch, duplicate across claims'}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{l === 'ko' ? '심사역이 확정' : 'adjuster decides'}</span>
      </motion.div>
    </motion.div>
  );
}
