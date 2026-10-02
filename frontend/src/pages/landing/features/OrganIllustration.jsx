import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../../i18n';

// "Find the condition the claim left out": a heart drug on an ear-infection claim, 92 days into the policy. The
// finding, its evidence and the SIU referral are the claims engine's output for this input
// (clinical.undisclosed_chronic_condition → SIU UNDISCLOSED_CHRONIC, backend/claims/engine.py).
// (File name kept from the retired DUR landing so Landing.jsx imports stay unchanged.)

const items = [
  { text: '귀 도말검사', note: { ko: '진단과 일치', en: 'fits the diagnosis' }, ok: true },
  { text: '귀 세척', note: { ko: '진단과 일치', en: 'fits the diagnosis' }, ok: true },
  { text: '베트메딘 → 피모벤단', textEn: 'Vetmedin → pimobendan', note: { ko: '심장약 · 진단으로 설명 안 됨', en: 'heart drug · not explained by the diagnosis' }, ok: false },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };
const pop = { hidden: { opacity: 0, scale: 0.95 }, visible: (d) => ({ opacity: 1, scale: 1, transition: { duration: 0.45, delay: d } }) };

export default function OrganIllustration() {
  const { lang } = useI18n();
  const l = lang === 'en' ? 'en' : 'ko';

  return (
    <motion.div
      className="min-h-[320px] sm:min-h-[380px]"
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {l === 'ko' ? '예시 청구 · 엔진 출력' : 'Sample claim · engine output'}
        </span>
        <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
          {l === 'ko' ? '보험 개시 후 92일' : 'Day 92 of the policy'}
        </span>
      </motion.div>

      {/* The claim as submitted */}
      <motion.div variants={fadeUp} className="rounded-xl border border-slate-200 bg-white p-3 mb-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{l === 'ko' ? '청구 진단' : 'Claimed diagnosis'}</span>
          <span className="text-[10px] text-slate-400">{l === 'ko' ? '개 · 말티즈 · 4.0 kg' : 'Dog · Maltese · 4.0 kg'}</span>
        </div>
        <div className="mt-1 text-[15px] font-bold text-slate-800">{l === 'ko' ? '외이염' : 'Otitis externa'}</div>
        <div className="mt-2.5 space-y-1.5">
          {items.map((it) => (
            <div
              key={it.text}
              className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${
                it.ok ? 'border-slate-100 bg-slate-50' : 'border-blue-300 bg-blue-50'
              }`}
            >
              <span className={it.ok ? 'text-slate-600' : 'font-semibold text-blue-800'}>{l === 'en' && it.textEn ? it.textEn : it.text}</span>
              <span className={`text-[9.5px] ${it.ok ? 'text-slate-400' : 'font-medium text-blue-700'}`}>{it.note[l]}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Finding */}
      <motion.div custom={0.5} variants={pop} className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 mb-2">
        <div className="text-[12px] font-semibold text-amber-800">
          {l === 'ko' ? '미신고 만성질환 신호: 피모벤단' : 'Undisclosed chronic condition signal: pimobendan'}
        </div>
        <div className="mt-1 text-[10px] leading-relaxed text-amber-800/80">
          {l === 'ko'
            ? '추정 질환: 이첨판 폐쇄부전증 (MMVD), 비대성 심근병증 (HCM) · 가입 1년 이내 청구'
            : 'Implied: mitral valve disease (MMVD), hypertrophic cardiomyopathy (HCM) · claim within the first policy year'}
        </div>
        <div className="mt-1 font-mono text-[9px] text-amber-700/70">clinical.undisclosed_chronic_condition</div>
      </motion.div>

      {/* SIU referral */}
      <motion.div custom={0.8} variants={pop} className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
          <path d="M8 1.5l5.5 2v4c0 3.4-2.3 5.9-5.5 7-3.2-1.1-5.5-3.6-5.5-7v-4l5.5-2z" stroke="#dc2626" strokeWidth="1.3" fill="#fef2f2" />
          <path d="M8 5v3.5M8 10.5v.5" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <div className="min-w-0">
          <div className="text-[11.5px] font-semibold text-red-700">
            {l === 'ko' ? 'SIU 의뢰 · 미신고 만성질환 의심' : 'SIU referral · suspected undisclosed condition'}
          </div>
          <div className="mt-0.5 text-[10px] text-red-700/75">
            {l === 'ko' ? '가입 전 진료 이력 확인을 위해 진료기록을 요청합니다.' : 'Requests the medical record to check care before the policy started.'}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
