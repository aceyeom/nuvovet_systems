import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../../i18n';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const illustrationVariant = {
  hidden: { opacity: 0, y: 50, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.75, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export default function FeatureSection({
  label,
  title,
  description,
  illustration,
  reverseLayout = false,
  accentColor = '#3b82f6',
  index = 0,
}) {
  const { lang } = useI18n();

  return (
    <section className={`relative py-16 sm:py-24 lg:py-28 overflow-hidden ${
      index % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fc]'
    }`}>
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <motion.div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
            reverseLayout ? 'lg:[direction:rtl]' : ''
          }`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* Text side */}
          <div className={reverseLayout ? 'lg:[direction:ltr]' : ''}>
            <motion.div variants={fadeUp}>
              <span
                className="inline-block text-[11px] font-semibold tracking-widest uppercase mb-4"
                style={{ color: accentColor }}
              >
                {label}
              </span>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className={`text-2xl sm:text-3xl lg:text-[36px] font-bold text-slate-900 tracking-tight whitespace-pre-line ${
                lang === 'ko' ? 'leading-[1.35] break-keep' : 'leading-tight'
              }`}
            >
              {title}
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className={`mt-5 text-[15px] text-slate-500 max-w-lg ${
                lang === 'ko' ? 'leading-[1.85] break-keep' : 'leading-relaxed'
              }`}
            >
              {description}
            </motion.p>
          </div>

          {/* Illustration side */}
          <motion.div
            variants={illustrationVariant}
            className={reverseLayout ? 'lg:[direction:ltr]' : ''}
          >
            {/* Frosted glass card */}
            <div className="relative bg-white/70 backdrop-blur-xl border border-slate-200/70 rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-200/40 overflow-hidden">
              {illustration}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
