import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '../i18n';
import { NuvovetWordmark } from '../components/NuvovetLogo';

const BG = '#F7F6F3';
const BORDER = '#e3e1db';

const PRODUCTS = {
  ko: [
    {
      key: 'insurance',
      num: '01',
      accent: '#1B4FBF',
      accentLight: '#EEF2FC',
      nameSuffix: '보험',
      forWhom: '보험사 · 손해사정사 대상',
      description: '청구 서류를 자동으로 검토하고 이상을 감지합니다.\n심사 시간을 줄이고 리포트를 즉시 생성하세요.',
      cta: '대시보드 열기',
      path: '/insurance',
    },
    {
      key: 'emr',
      num: '02',
      accent: '#0E7F6A',
      accentLight: '#EAF6F2',
      nameSuffix: '진료',
      forWhom: '동물병원 · 수의사 대상',
      description: '처방·환자 기록을 한곳에서 관리합니다.\n실시간 약물 상호작용 검토와 처방 템플릿으로 진료를 빠르게 이어가세요.',
      cta: '시스템 시작',
      path: '/system',
    },
    {
      key: 'edu',
      num: '03',
      accent: '#C46B0A',
      accentLight: '#FDF3E7',
      nameSuffix: '아카데미',
      forWhom: '수의대생 · 예비 수의사 대상',
      description: '수의 약학 지식을 체계적으로 학습합니다.\n출시 알림을 신청하면 가장 먼저 안내드립니다.',
      cta: '출시 알림 신청',
      disabled: true,
      badge: '준비 중',
    },
  ],
  en: [
    {
      key: 'insurance',
      num: '01',
      accent: '#1B4FBF',
      accentLight: '#EEF2FC',
      nameSuffix: 'Insurance',
      forWhom: 'For insurance carriers & adjusters',
      description: 'Automatically review claims and detect anomalies.\nReduce review time and generate reports instantly.',
      cta: 'Open dashboard',
      path: '/insurance',
    },
    {
      key: 'emr',
      num: '02',
      accent: '#0E7F6A',
      accentLight: '#EAF6F2',
      nameSuffix: 'EMR',
      forWhom: 'For veterinary clinics & vets',
      description: 'Manage prescriptions and patient records in one place.\nReal-time drug interaction checks and prescription templates.',
      cta: 'Launch system',
      path: '/system',
    },
    {
      key: 'edu',
      num: '03',
      accent: '#C46B0A',
      accentLight: '#FDF3E7',
      nameSuffix: 'Academy',
      forWhom: 'For vet students & residents',
      description: 'Learn veterinary pharmacology systematically.\nSign up to be notified when we launch.',
      cta: 'Notify me',
      disabled: true,
      badge: 'Soon',
    },
  ],
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.25, 0.1, 0.25, 1] } },
};

function ProductCard({ product, onNavigate, isExiting }) {
  const [hovered, setHovered] = useState(false);
  const { accent, accentLight, num, nameSuffix, forWhom, description, cta, disabled, badge, path } = product;

  return (
    <motion.div
      variants={fadeUp}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !disabled && onNavigate(path)}
      style={{
        background: '#ffffff',
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: '32px 28px 28px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.08)' : 'none',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.22s ease, transform 0.22s ease',
        opacity: disabled ? 0.72 : 1,
      }}
    >
      {/* Coming soon badge */}
      {badge && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '3px 8px',
          borderRadius: 4,
          background: '#F0EEE8',
          color: '#999',
          fontWeight: 500,
        }}>
          {badge}
        </div>
      )}

      {/* Track number */}
      <div style={{
        fontSize: 10,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: '#888',
        marginBottom: 20,
        fontWeight: 500,
      }}>
        {num}
      </div>

      {/* Product name */}
      <div style={{
        fontSize: 22,
        lineHeight: 1,
        marginBottom: 6,
        letterSpacing: '-0.01em',
      }}>
        <span style={{ fontWeight: 300, color: '#999' }}>nuvovet </span>
        <strong style={{ fontWeight: 700, color: accent }}>{nameSuffix}</strong>
      </div>

      {/* For-whom pill */}
      <div style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.04em',
        padding: '4px 10px',
        borderRadius: 100,
        marginTop: 14,
        marginBottom: 20,
        alignSelf: 'flex-start',
        background: accentLight,
        color: accent,
      }}>
        {forWhom}
      </div>

      {/* Divider */}
      <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: 20 }} />

      {/* Description */}
      <p style={{
        fontSize: 14,
        lineHeight: 1.7,
        color: '#555',
        fontWeight: 400,
        flex: 1,
        whiteSpace: 'pre-line',
        marginBottom: 0,
      }}>
        {description}
      </p>

      {/* CTA */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: hovered && !disabled ? 10 : 6,
        marginTop: 24,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.02em',
        color: disabled ? '#aaa' : accent,
        transition: 'gap 0.2s ease',
      }}>
        {cta} {!disabled && '→'}
      </div>

      {/* Bottom accent bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        borderRadius: '0 0 12px 12px',
        background: accent,
        opacity: hovered && !disabled ? 1 : 0,
        transition: 'opacity 0.22s ease',
      }} />
    </motion.div>
  );
}

export default function Start() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const l = (lang === 'en') ? 'en' : 'ko';
  const products = PRODUCTS[l];

  const [exitDest, setExitDest] = useState(null);

  const handleNavigate = (path) => {
    if (!path) return;
    setExitDest(path);
  };

  useEffect(() => {
    if (!exitDest) return;
    const timer = setTimeout(() => navigate(exitDest), 340);
    return () => clearTimeout(timer);
  }, [exitDest, navigate]);

  const isExiting = !!exitDest;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={isExiting ? { opacity: 0, y: -14 } : { opacity: 1, y: 0 }}
      transition={isExiting
        ? { duration: 0.32, ease: [0.4, 0, 1, 1] }
        : { duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }
      }
      style={{
        minHeight: '100vh',
        background: BG,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Nav */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '22px 48px',
        background: BG,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label="홈으로"
        >
          <NuvovetWordmark />
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: '#888',
            letterSpacing: '0.02em',
            fontFamily: 'inherit',
          }}
        >
          → {l === 'ko' ? '로그인' : 'Login'}
        </button>
      </nav>

      {/* Main content */}
      <main style={{
        flex: 1,
        maxWidth: 1100,
        margin: '0 auto',
        width: '100%',
        padding: '0 48px 80px',
      }}>
        {/* Hero */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{ marginTop: 48, marginBottom: 52 }}
        >
          <motion.h1
            variants={fadeUp}
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#1a1a1a',
              marginBottom: 16,
            }}
          >
            {l === 'ko' ? (
              <>국내 최대<br /><em style={{ fontStyle: 'normal', color: '#1B4FBF' }}>수의 약학 데이터베이스.</em></>
            ) : (
              <>Korea's largest<br /><em style={{ fontStyle: 'normal', color: '#1B4FBF' }}>veterinary pharmacology database.</em></>
            )}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            style={{
              fontSize: 14,
              color: '#666',
              fontWeight: 400,
              lineHeight: 1.6,
              maxWidth: 380,
            }}
          >
            {l === 'ko'
              ? '보험사부터 동물병원, 학생까지—\n나에게 맞는 제품을 선택하세요.'
              : 'From insurers to clinics to students —\nchoose the product that fits you.'}
          </motion.p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
          }}
        >
          {products.map((p) => (
            <ProductCard
              key={p.key}
              product={p}
              onNavigate={handleNavigate}
              isExiting={isExiting}
            />
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${BORDER}`,
        padding: '18px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 12,
        color: '#888',
        background: BG,
      }}>
        <span>
          {l === 'ko' ? '직접 보려면 데모를 먼저 둘러보세요.' : 'Not sure yet? Browse the demo first.'}
        </span>
        <button
          onClick={() => navigate('/demo')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            color: '#1a1a1a',
            fontFamily: 'inherit',
          }}
        >
          {l === 'ko' ? '데모 보기 →' : 'View demo →'}
        </button>
      </footer>
    </motion.div>
  );
}
