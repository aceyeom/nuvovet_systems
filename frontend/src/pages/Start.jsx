import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '../i18n';
import { NuvovetWordmark } from '../components/NuvovetLogo';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

function TopNav() {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="select-none"
          aria-label="홈으로"
        >
          <NuvovetWordmark />
        </button>
        <button
          onClick={() => navigate('/')}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          ← 홈으로
        </button>
      </div>
    </nav>
  );
}

function ProductCard({ index, accent, brandName, brandSuffix, tagline, taglineEn, bullets, ctaLabel, onClick, disabled, badge }) {
  return (
    <motion.button
      type="button"
      variants={fadeUp}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`group relative text-left w-full bg-white border rounded-xl p-7 sm:p-8 transition-all
        ${disabled
          ? 'border-slate-200 cursor-not-allowed opacity-70'
          : 'border-slate-200 hover:border-slate-900 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] cursor-pointer'}
      `}
    >
      <div className="flex items-start justify-between mb-6">
        <div
          className="font-mono text-[11px] font-semibold tracking-[0.18em] uppercase"
          style={{ color: accent }}
        >
          0{index} / Track
        </div>
        {badge && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.06em] uppercase px-2 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200">
            {badge}
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-[28px] font-extrabold tracking-[-0.03em] text-slate-900 leading-none">
            nuvovet
          </span>
          <span
            className="text-[28px] font-extrabold tracking-[-0.03em] leading-none"
            style={{ color: accent }}
          >
            {brandSuffix}
          </span>
        </div>
        <div className="text-[15px] font-semibold text-slate-900 break-keep">{tagline}</div>
        <div className="text-[12px] text-slate-500 mt-0.5">{taglineEn}</div>
      </div>

      <ul className="space-y-2.5 mb-8">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px] text-slate-700 leading-[1.6] break-keep">
            <span
              className="mt-[7px] w-1 h-1 rounded-full flex-shrink-0"
              style={{ background: accent }}
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div
        className={`inline-flex items-center gap-1.5 text-[13px] font-semibold transition-all ${
          disabled ? 'text-slate-400' : 'text-slate-900 group-hover:gap-2.5'
        }`}
      >
        {ctaLabel}
        {!disabled && <span aria-hidden>→</span>}
      </div>
    </motion.button>
  );
}

export default function Start() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const l = lang || 'ko';

  const products = [
    {
      key: 'insurance',
      accent: '#0F766E',
      brandSuffix: ' insurance',
      tagline: l === 'ko' ? '청구 인텔리전스 대시보드' : 'Claim Intelligence Dashboard',
      taglineEn: 'For insurance carriers · 보험사 대상',
      bullets: l === 'ko' ? [
        '청구 OCR · 정규화 · 임상 가이드라인 검증',
        '4,287개 병원 벤치마크 및 위험 등급',
        'P25–P95 가격 분포 및 이상치 탐지',
        '분기 인텔리전스 리포트 자동 생성',
      ] : [
        'OCR, normalization, and guideline-based claim validation',
        'Benchmarks across 4,287 hospitals with risk tiers',
        'P25–P95 price distributions and anomaly detection',
        'Auto-generated quarterly intelligence reports',
      ],
      ctaLabel: l === 'ko' ? '대시보드 열기' : 'Open dashboard',
      onClick: () => navigate('/insurance'),
    },
    {
      key: 'emr',
      accent: '#1E40AF',
      brandSuffix: ' EMR',
      tagline: l === 'ko' ? '수의 처방 점검 · 환자 기록' : 'Prescription Safety & Patient Records',
      taglineEn: 'For veterinary clinics · 동물병원 대상',
      bullets: l === 'ko' ? [
        '실시간 약물 상호작용 · CYP 효소 분석',
        '체중·신장·간 기반 자동 용량 조정',
        '5개 DUR 엔진 · 9,746개 상호작용 규칙',
        '50개 품종 프로필 · 73개 알레르기 클래스',
      ] : [
        'Real-time drug-drug interaction & CYP analysis',
        'Auto-dosing by weight, renal, hepatic adjustment',
        '5 DUR engines · 9,746 interaction rules',
        '50 breed profiles · 73 allergy classes',
      ],
      ctaLabel: l === 'ko' ? '시스템 시작' : 'Launch system',
      onClick: () => navigate('/system'),
    },
    {
      key: 'edu',
      accent: '#7C2D12',
      brandSuffix: ' edu',
      tagline: l === 'ko' ? '수의 약학 교육 플랫폼' : 'Veterinary Pharmacology Education',
      taglineEn: 'For students & residents · 학생·전공의 대상',
      bullets: l === 'ko' ? [
        '준비 중인 모듈입니다.',
      ] : [
        'Module under development.',
      ],
      ctaLabel: l === 'ko' ? '준비 중' : 'Coming soon',
      onClick: () => {},
      disabled: true,
      badge: l === 'ko' ? '준비 중' : 'Soon',
    },
  ];

  return (
    <div
      className="min-h-screen bg-[#FAFAFA] text-slate-900"
      style={{
        fontFamily: "'Inter', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <TopNav />

      <main className="pt-32 pb-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="mb-14 sm:mb-20"
          >
            <motion.div variants={fadeUp} className="mb-5">
              <span className="inline-block font-mono text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 border border-slate-200 rounded-full px-3 py-1 bg-white">
                NuvoVet · 무엇으로 시작할까요?
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className={`text-[36px] sm:text-[44px] lg:text-[52px] font-extrabold tracking-[-0.03em] text-slate-900 ${
                l === 'ko' ? 'leading-[1.25] break-keep' : 'leading-[1.1]'
              }`}
            >
              {l === 'ko' ? (
                <>
                  세 가지 트랙.
                  <br />
                  <span className="text-slate-500">하나의 NuvoVet.</span>
                </>
              ) : (
                <>
                  Three tracks.
                  <br />
                  <span className="text-slate-500">One NuvoVet.</span>
                </>
              )}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className={`mt-5 max-w-2xl text-[15px] text-slate-600 ${
                l === 'ko' ? 'leading-[1.8] break-keep' : 'leading-relaxed'
              }`}
            >
              {l === 'ko'
                ? '동물병원부터 보험사, 학습 환경까지. 사용하실 제품을 선택해주세요.'
                : 'From clinics to insurers to classrooms — pick the surface you want to start with.'}
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid gap-5 sm:gap-6 lg:grid-cols-3"
          >
            {products.map((p, i) => (
              <ProductCard
                key={p.key}
                index={i + 1}
                accent={p.accent}
                brandSuffix={p.brandSuffix}
                tagline={p.tagline}
                taglineEn={p.taglineEn}
                bullets={p.bullets}
                ctaLabel={p.ctaLabel}
                onClick={p.onClick}
                disabled={p.disabled}
                badge={p.badge}
              />
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.5 }}
            className="mt-14 pt-8 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px] text-slate-500"
          >
            <span>
              {l === 'ko'
                ? '확정 전이라면 데모를 먼저 둘러보세요.'
                : 'Not sure yet? Browse the demo first.'}
            </span>
            <button
              onClick={() => navigate('/demo')}
              className="self-start sm:self-auto font-semibold text-slate-900 hover:text-slate-700 transition-colors"
            >
              {l === 'ko' ? '데모 보기 →' : 'View demo →'}
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
