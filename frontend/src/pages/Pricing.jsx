import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { NuvovetWordmark } from '../components/NuvovetLogo';
import { useI18n } from '../i18n';
import { TopBarControls } from '../components/TopBarControls';
import { useAuth } from '../context/AuthContext';

// ── Coming Soon Modal ───────────────────────────────────────────
function ComingSoonModal({ type, onClose }) {
  const { lang } = useI18n();
  const isGoogle = type === 'google';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
          <span className="text-2xl">{isGoogle ? '🔐' : '💳'}</span>
        </div>
        <h3 className="text-[17px] font-bold text-slate-900 mb-1">
          {isGoogle ? '준비 중입니다' : '준비 중입니다'}
        </h3>
        <p className="text-[13px] text-slate-500 mb-1">
          {isGoogle ? 'Google login coming soon' : 'Payment coming soon'}
        </p>
        <p className="typo-body text-center mb-6">
          {isGoogle
            ? 'Google 로그인 기능을 곧 제공할 예정입니다. 조금만 기다려 주세요.'
            : '결제 기능을 곧 제공할 예정입니다. 조금만 기다려 주세요.'}
        </p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors"
        >
          {lang === 'ko' ? '확인' : 'Got it'}
        </button>
      </div>
    </div>
  );
}

// ── FAQ Item ────────────────────────────────────────────────────
function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
        onClick={() => setOpen(!open)}
      >
        <span className="text-[14px] font-semibold text-slate-800">{question}</span>
        {open ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 animate-fade-in">
          <p className="typo-body leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

// ── Plan Card ───────────────────────────────────────────────────
function PlanCard({ plan, onCTA, recommended }) {
  return (
    <div className={`relative flex flex-col rounded-2xl border transition-all duration-200 ${
      recommended
        ? 'border-slate-900 shadow-2xl shadow-slate-900/15 scale-[1.03] bg-white z-10'
        : plan.muted
        ? 'border-slate-200 bg-slate-50/60 opacity-75'
        : 'border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300'
    }`}>

      {recommended && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-full tracking-wide">
            <Star size={10} fill="currentColor" />
            추천 / Recommended
          </span>
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-5">
          <p className="typo-section-header mb-1">{plan.badge}</p>
          <h3 className="text-[20px] font-black text-slate-900 mb-1">{plan.name}</h3>
          <div className="flex items-baseline gap-1">
            {plan.price ? (
              <>
                <span className="text-[28px] font-black text-slate-900">{plan.price}</span>
                <span className="typo-body">{plan.period}</span>
              </>
            ) : (
              <span className="text-[28px] font-black text-slate-900">{plan.priceLabel}</span>
            )}
          </div>
          {plan.subline && (
            <p className="text-[12px] text-slate-500 mt-1">{plan.subline}</p>
          )}
        </div>

        {/* Features */}
        <div className="flex-1 space-y-2.5 mb-6">
          {plan.features.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5">
              {f.included !== false ? (
                <Check size={14} className={`shrink-0 mt-0.5 ${plan.muted ? 'text-slate-400' : 'text-emerald-500'}`} />
              ) : (
                <X size={14} className="shrink-0 mt-0.5 text-slate-300" />
              )}
              <span className={`text-[13px] leading-snug ${f.included !== false ? 'text-slate-700' : 'text-slate-400'}`}>
                {f.text}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onCTA}
          className={`w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
            recommended
              ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20'
              : plan.muted
              ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              : 'bg-white text-slate-900 border border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }`}
        >
          {plan.cta}
        </button>
      </div>
    </div>
  );
}

// ── Main Pricing Page ───────────────────────────────────────────
export default function Pricing() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const { isAuthenticated, user, startTrial } = useAuth();
  const [modal, setModal] = useState(null); // 'google' | 'payment' | null
  const [trialError, setTrialError] = useState('');

  const isTrialNotStarted = isAuthenticated && user?.plan === 'free' && user?.plan_status === 'trial_not_started';
  const isTrialActive = isAuthenticated && user?.plan === 'free' && user?.plan_status === 'active';

  const plans = [
    {
      badge: 'FREE TRIAL',
      name: '무료 체험',
      priceLabel: lang === 'ko' ? '무료' : 'Free',
      period: '',
      subline: lang === 'ko' ? '1개월 무료 체험' : 'One month free',
      features: [
        { text: lang === 'ko' ? '1개월 무료 이용' : 'One month free', included: true },
        { text: lang === 'ko' ? '핵심 DUR 검사' : 'Core DUR check', included: true },
        { text: lang === 'ko' ? '환자 저장 제한' : 'Limited patient saves', included: true },
        { text: lang === 'ko' ? '계정 로그인 필요' : 'Requires account login', included: true },
        { text: lang === 'ko' ? '전체 DUR 엔진 제외' : 'Full DUR engine', included: false },
        { text: lang === 'ko' ? 'EMR 스크린샷 불포함' : 'EMR screenshot import', included: false },
      ],
      cta: isTrialNotStarted
        ? (lang === 'ko' ? '무료 체험 시작 / Start Trial' : 'Start Trial')
        : isTrialActive
        ? (lang === 'ko' ? '체험 진행 중 / Trial Active' : 'Trial Active')
        : (lang === 'ko' ? '계정 만들기 / Create Account' : 'Create Account'),
      ctaType: isTrialNotStarted ? 'start_trial' : isTrialActive ? 'active_trial' : 'register',
      muted: false,
    },
    {
      badge: 'FULL VERSION',
      name: '정식 버전',
      price: '₩4,999',
      period: lang === 'ko' ? '/ 월' : '/ month',
      subline: lang === 'ko' ? '전체 기능 이용' : 'Full access to all features',
      features: [
        { text: lang === 'ko' ? '전체 DUR 엔진' : 'Full DUR engine', included: true },
        { text: lang === 'ko' ? '무제한 환자 관리' : 'Unlimited patients', included: true },
        { text: lang === 'ko' ? 'EMR 스크린샷 가져오기' : 'EMR screenshot import', included: true },
        { text: lang === 'ko' ? '전체 장기 연관도 다이어그램' : 'Full organ involvement diagram', included: true },
        { text: lang === 'ko' ? '품종별 및 유전적 안전성' : 'Breed and genetic safety', included: true },
      ],
      cta: lang === 'ko' ? '시작하기 / Get Started' : 'Get Started',
      ctaType: 'payment',
      muted: false,
    },
    {
      badge: 'ULTRA',
      name: 'Ultra',
      priceLabel: lang === 'ko' ? '준비 중' : 'Coming Soon',
      period: '',
      subline: '',
      features: [
        { text: lang === 'ko' ? '고급 분석 및 병원 전용 기능 준비 중' : 'Advanced analytics and clinic features in development', included: true },
      ],
      cta: lang === 'ko' ? '문의하기 / Contact Us' : 'Contact Us',
      ctaType: 'contact',
      muted: true,
    },
  ];

  const faqs = [
    {
      question: lang === 'ko' ? '무료 체험 이후에는 어떻게 되나요?' : 'What happens after the free trial?',
      answer: lang === 'ko'
        ? '1개월 무료 체험이 끝난 후에는 정식 버전으로 업그레이드하거나 서비스 이용을 중단할 수 있습니다. 자동 결제는 발생하지 않습니다.'
        : 'After the one-month free trial, you can upgrade to the Full Version or stop using the service. No automatic billing occurs.',
    },
    {
      question: lang === 'ko' ? '환자 데이터는 안전하게 저장되나요?' : 'Is patient data stored securely?',
      answer: lang === 'ko'
        ? '환자 데이터는 계정별로 서버 데이터베이스에 저장되며 인증 토큰으로 보호됩니다.'
        : 'Patient data is stored per account in the server database and protected with authenticated access.',
    },
    {
      question: lang === 'ko' ? '한 계정으로 여러 수의사가 사용할 수 있나요?' : 'Can multiple vets use one account?',
      answer: lang === 'ko'
        ? '현재는 단일 계정 사용을 권장합니다. Ultra 플랜에서 멀티-수의사 협업 기능을 준비 중입니다.'
        : 'We currently recommend single-account use. Multi-vet collaboration is planned for the Ultra plan.',
    },
  ];

  const handleCTA = (plan) => {
    setTrialError('');
    if (!isAuthenticated) {
      navigate(`/register?redirect=${encodeURIComponent('/pricing')}`);
      return;
    }

    if (plan.ctaType === 'start_trial') {
      startTrial().then((result) => {
        if (!result.ok) {
          setTrialError(result.error || (lang === 'ko' ? '무료 체험 시작에 실패했습니다.' : 'Could not start trial.'));
        }
      });
    } else if (plan.ctaType === 'active_trial') {
      return;
    } else if (plan.ctaType === 'payment') setModal('payment');
    else if (plan.ctaType === 'register') {
      navigate(`/register?redirect=${encodeURIComponent('/pricing')}`);
    }
    else if (plan.ctaType === 'contact') {
      window.location.href = 'mailto:contact@nuvovet.com';
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb]">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.07)]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[62px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-left">
              <NuvovetWordmark />
            </button>
          </div>
          <TopBarControls />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14 sm:py-20">

        {/* Page title */}
        <div className="text-center mb-14">
          <p className="typo-section-header mb-3">PRICING</p>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
            {lang === 'ko' ? '나에게 맞는 플랜 선택' : 'Choose your plan'}
          </h1>
          <p className="text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
            {lang === 'ko'
              ? '무료 체험으로 시작하고, 준비되면 전체 기능으로 업그레이드하세요.'
              : 'Start with a free trial and upgrade when you\'re ready for the full experience.'}
          </p>
        </div>

        {/* Plan cards */}
        {trialError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {trialError}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-20 pt-5">
          {plans.map((plan, i) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              recommended={i === 1}
              onCTA={() => handleCTA(plan)}
            />
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[22px] font-bold text-slate-900 text-center mb-2">
            {lang === 'ko' ? '자주 묻는 질문' : 'Frequently asked questions'}
          </h2>
          <p className="typo-body text-center mb-8">
            {lang === 'ko' ? 'FAQ' : 'FAQ'}
          </p>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <ComingSoonModal type={modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
