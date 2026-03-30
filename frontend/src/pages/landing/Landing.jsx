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
      label: { ko: '약물 상호작용 검사', en: 'Drug Interaction Screening' },
      title: {
        ko: '실시간 다제\n상호작용 검사',
        en: 'Real-Time Multi-Drug\nInteraction Screening',
      },
      desc: {
        ko: '처방된 모든 약물 쌍에 대해 CYP 효소 프로파일, 동일 계열 중복, QT 연장, 출혈 위험, 세로토닌 증후군을 3단계 심각도로 분류합니다.',
        en: 'Screens every drug pair for CYP enzyme profiles, therapeutic duplication, QT prolongation, bleeding risk, and serotonin syndrome — classified by 3-tier severity.',
      },
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
      label: { ko: '용량 계산', en: 'Dose Calculation' },
      title: {
        ko: '체중 기반\n용량 자동 계산',
        en: 'Weight-Adjusted\nDose Calculation',
      },
      desc: {
        ko: '환자 체중에 맞춰 용량 범위를 자동 조정합니다. 크레아티닌·ALT 수치가 기준을 초과하면 신장·간 조정 계수가 자동 적용됩니다.',
        en: 'Auto-scales dose ranges to patient weight. When creatinine or ALT values exceed thresholds, renal and hepatic adjustment factors are applied automatically.',
      },
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
      label: { ko: '장기 관여도', en: 'Organ Burden' },
      title: {
        ko: '장기 관여\n다이어그램',
        en: 'Organ Involvement\nDiagram',
      },
      desc: {
        ko: '처방 전체에 걸쳐 간, 신장, 심장, 뇌, 혈액의 소실 경로를 매핑합니다. 복합 장기 부담이 임계값을 초과하면 모니터링 우선순위를 표시합니다.',
        en: 'Maps elimination pathways across liver, kidney, heart, brain, and blood. Surfaces monitoring priorities when combined organ burden exceeds thresholds.',
      },
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
      label: { ko: '환자 안전', en: 'Patient Safety' },
      title: {
        ko: '환자 안전\n지능 시스템',
        en: 'Patient Safety\nIntelligence',
      },
      desc: {
        ko: '종 적합성, 품종별 MDR1 감수성, 알레르기 교차반응, 절대 금기를 다층적으로 검증합니다. 50개 품종 프로필과 73개 알레르기 클래스를 대조합니다.',
        en: 'Multi-layer verification across species compatibility, breed-specific MDR1 sensitivity, allergy cross-reactions, and absolute contraindications. 50 breed profiles, 73 allergy classes.',
      },
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
