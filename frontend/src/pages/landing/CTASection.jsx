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
              귀원의 처방을
              <br />
              <span className="text-white/50">안전하게</span>
            </>
          ) : (
            <>
              Secure Every
              <br />
              <span className="text-white/50">Prescription</span>
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
            ? '전체 약물 데이터베이스, 환자 기록 연동, 감사 추적이 포함된 전체 DUR 시스템을 무료로 시작하세요.'
            : 'Start with the full DUR system including the complete drug database, patient records integration, and audit trails — free.'}
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10">
          <button
            onClick={() => navigate('/start')}
            className="px-10 py-4 rounded-full text-base font-semibold bg-white text-slate-900 hover:bg-white/90 transition-all hover:shadow-lg hover:shadow-white/10"
          >
            {l === 'ko' ? '무료로 시작하기' : 'Start for Free'}
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
