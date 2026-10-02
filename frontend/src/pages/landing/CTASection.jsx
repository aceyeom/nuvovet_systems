import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '../../i18n';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export default function CTASection() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const l = lang || 'ko';

  return (
    <section className="relative py-20 sm:py-28 bg-slate-900 overflow-hidden">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[300px] rounded-full bg-indigo-500/5 blur-[80px]" />
      </div>

      <motion.div
        className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.h2
          variants={fadeUp}
          className={`text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight ${
            l === 'ko' ? 'leading-[1.3] break-keep' : 'leading-tight'
          }`}
        >
          {l === 'ko' ? (
            <>
              청구 샘플로
              <br />
              <span className="text-white/50">먼저 검증하세요</span>
            </>
          ) : (
            <>
              Validate on
              <br />
              <span className="text-white/50">your own claims first</span>
            </>
          )}
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className={`mt-5 text-[15px] text-white/40 max-w-lg mx-auto ${
            l === 'ko' ? 'leading-[1.8] break-keep' : 'leading-relaxed'
          }`}
        >
          {l === 'ko'
            ? '과거 청구 1,000~5,000건으로 후향 검증을 진행합니다 — 정형화 정확도, 검토 대상 누수 금액, 오탐률을 리포트로 드립니다.'
            : 'We run a retrospective study on 1,000–5,000 of your historical claims and report coding accuracy, leakage found, and false-alarm rate.'}
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10">
          <button
            onClick={() => navigate('/start')}
            className="px-10 py-4 rounded-full text-base font-semibold bg-white text-slate-900 hover:bg-white/90 transition-all hover:shadow-lg hover:shadow-white/10"
          >
            {l === 'ko' ? '데모 열기' : 'Open the demo'}
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
