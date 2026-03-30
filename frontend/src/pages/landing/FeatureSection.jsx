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
  accentColor = 'white',
  index = 0,
}) {
  const { lang } = useI18n();

  return (
    <section className="relative py-20 sm:py-28 lg:py-36 overflow-hidden">
      {/* Subtle section separator gradient */}
      <div className="absolute inset-0 bg-[#050510]" />
      {index % 2 === 1 && (
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent" />
      )}

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <motion.div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
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
                style={{ color: accentColor, opacity: 0.5 }}
              >
                {label}
              </span>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className={`text-2xl sm:text-3xl lg:text-[40px] font-bold text-white tracking-tight ${
                lang === 'ko' ? 'leading-[1.3] break-keep' : 'leading-tight'
              }`}
            >
              {title}
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className={`mt-5 text-[15px] sm:text-base text-white/40 max-w-lg ${
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
            <div className="relative">
              {/* Glow behind card */}
              <div
                className="absolute -inset-4 rounded-[40px] opacity-20 blur-3xl"
                style={{
                  background: `radial-gradient(ellipse at center, ${accentColor}15, transparent 70%)`,
                }}
              />
              {/* Frosted glass card */}
              <div className="relative bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-3xl p-6 sm:p-8 overflow-hidden">
                {illustration}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
