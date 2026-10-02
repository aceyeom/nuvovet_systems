import React from 'react';
import ShaderHero from './ShaderHero';
import FeatureSection from './FeatureSection';
import DDIIllustration from './features/DDIIllustration';
import DosingIllustration from './features/DosingIllustration';
import OrganIllustration from './features/OrganIllustration';
import SafetyIllustration from './features/SafetyIllustration';
import CTASection from './CTASection';
import Footer from './Footer';
import { useI18n } from '../../i18n';

function resolve(obj, path) {
  return path.split('.').reduce((acc, k) => acc?.[k], obj);
}

const features = [
  {
    key: 'ddi',
    labelKey: 'landing.feat1Label',
    titleKey: 'landing.feat1Title',
    descKey: 'landing.feat1Desc',
    illustration: DDIIllustration,
    accentColor: '#6366f1',
    fallback: {
      label: { ko: '설명 가능한 심사', en: 'Explainable review' },
      title: { ko: '모든 판정에\n근거를 붙입니다', en: 'Every decision\ncomes with evidence' },
      desc: { ko: '자동 승인 · 심사 필요 · 거절 권고. 각 소견에 규칙 ID, 금액 영향, 문헌·벤치마크 근거가 함께 나옵니다. 엔진은 자동 거절하지 않습니다.', en: 'Auto-approve, review, or deny-recommended — each finding carries its rule ID, amount at risk, and literature or benchmark evidence. The engine never auto-denies.' },
    },
  },
  {
    key: 'dosing',
    labelKey: 'landing.feat2Label',
    titleKey: 'landing.feat2Title',
    descKey: 'landing.feat2Desc',
    illustration: DosingIllustration,
    accentColor: '#10b981',
    fallback: {
      label: { ko: '처방 타당성', en: 'Prescription plausibility' },
      title: { ko: '한글 상품명부터\n용량까지 해석', en: 'From Korean brand\nnames to doses' },
      desc: { ko: '아포퀠·베트메딘·소론도 같은 국내 상품명을 성분으로 해석하고, 종별 참고 용량과 비교해 소수점 오기·과다 청구를 찾습니다.', en: 'Resolves Korean product names to ingredients and compares doses with species references to catch decimal-shift errors and inflated quantities.' },
    },
  },
  {
    key: 'organ',
    labelKey: 'landing.feat3Label',
    titleKey: 'landing.feat3Title',
    descKey: 'landing.feat3Desc',
    illustration: OrganIllustration,
    accentColor: '#3b82f6',
    fallback: {
      label: { ko: '기왕증 신호', en: 'Pre-existing signals' },
      title: { ko: '청구서에 없는\n만성질환 찾기', en: 'Find the condition\nthe claim left out' },
      desc: { ko: '외이염 청구에 심장약이, 피부염 청구에 갑상선약이 들어 있다면 — 청구 진단으로 설명되지 않는 처방은 미신고 만성질환(기왕증)의 신호입니다.', en: 'A heart drug on an ear-infection claim, a thyroid drug on a skin claim — prescriptions the claimed diagnosis cannot explain signal an undisclosed chronic condition.' },
    },
  },
  {
    key: 'safety',
    labelKey: 'landing.feat4Label',
    titleKey: 'landing.feat4Title',
    descKey: 'landing.feat4Desc',
    illustration: SafetyIllustration,
    accentColor: '#f59e0b',
    fallback: {
      label: { ko: '청구 무결성', en: 'Claim integrity' },
      title: { ko: '다른 동물,\n중복 청구 탐지', en: 'Wrong animal,\nduplicate claims' },
      desc: { ko: '고양이 청구의 개 전용 백신, 품종과 맞지 않는 체중, 같은 날 재청구, 보험 개시 전 진료를 규칙으로 걸러냅니다.', en: 'Flags dog-only vaccines on cat claims, weights that do not fit the breed, same-day resubmissions, and care before the policy started.' },
    },
  },
];

export default function Landing() {
  const { t, lang } = useI18n();
  const l = lang || 'ko';

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Dark shader hero → gradient → white */}
      <ShaderHero />

      {/* Feature sections (white/light bg) */}
      {features.map((feat, i) => {
        const Illustration = feat.illustration;
        const label = resolve(t, feat.labelKey) || feat.fallback.label[l];
        const title = resolve(t, feat.titleKey) || feat.fallback.title[l];
        const desc = resolve(t, feat.descKey) || feat.fallback.desc[l];

        return (
          <FeatureSection
            key={feat.key}
            label={label}
            title={title}
            description={desc}
            illustration={<Illustration />}
            reverseLayout={i % 2 === 1}
            accentColor={feat.accentColor}
            index={i}
          />
        );
      })}

      {/* Dark CTA */}
      <CTASection />

      {/* Light footer */}
      <Footer />
    </div>
  );
}
