import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './academy/academy.css';
import Shell from './academy/Shell';
import Overview from './academy/screens/Overview';
import CaseList from './academy/screens/CaseList';
import CasePlayer from './academy/screens/CasePlayer';
import PeerReview from './academy/screens/PeerReview';
import Reference from './academy/screens/Reference';
import Progress from './academy/screens/Progress';

export default function Academy() {
  const [route, setRoute]           = useState('overview');
  const [playingCase, setPlayingCase] = useState(null);

  useEffect(() => {
    const el = document.getElementById('acad-main-scroll');
    if (el) el.scrollTo({ top: 0 });
  }, [route, playingCase]);

  const handlePlayCase = (c) => {
    setPlayingCase(c);
    setRoute('case-player');
  };

  const handleBackFromCase = () => {
    setPlayingCase(null);
    setRoute('cases');
  };

  const handleNavigate = (target) => {
    setPlayingCase(null);
    setRoute(target);
  };

  const Page = () => {
    switch (route) {
      case 'overview':
        return <Overview onNavigate={handleNavigate} />;
      case 'cases':
        return <CaseList onPlayCase={handlePlayCase} />;
      case 'case-player':
        return (
          <CasePlayer
            activeCase={playingCase}
            onBack={handleBackFromCase}
            onNavigateToCases={handleBackFromCase}
          />
        );
      case 'peer-review':
        return <PeerReview />;
      case 'reference':
        return <Reference />;
      case 'progress':
        return <Progress />;
      case 'settings':
        return <SettingsPlaceholder />;
      default:
        return <Overview onNavigate={handleNavigate} />;
    }
  };

  /* Keep sidebar nav in sync when case-player is active */
  const activeRoute = route === 'case-player' ? 'cases' : route;

  return (
    <motion.div
      className="nuvo-academy"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <Shell
        route={activeRoute}
        setRoute={(r) => { setPlayingCase(null); setRoute(r); }}
      >
        <div data-screen={route}><Page /></div>
      </Shell>
    </motion.div>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title-en">Settings</div>
          <h1 className="page-title">설정</h1>
        </div>
      </div>
      <div className="card card-pad-lg" style={{ maxWidth: 560 }}>
        <div className="section-title" style={{ marginBottom: 20 }}>계정 설정</div>

        {[
          { label: '이름', value: '김서연' },
          { label: '학교', value: '건국대학교 수의과대학' },
          { label: '학년', value: '본과 3학년' },
          { label: '이메일', value: 'suyeon.kim@konkuk.ac.kr' },
        ].map(row => (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.value}</span>
          </div>
        ))}

        <div className="divider" />
        <div className="section-title" style={{ marginBottom: 12 }}>연구 데이터 동의</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          NuvoVet은 IRB 승인 하에 익명화된 학습 데이터를 수의 임상 교육 연구에 활용합니다.
          동의하지 않아도 모든 학습 기능을 정상적으로 이용할 수 있습니다.
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
          <span style={{ fontSize: 13, color: 'var(--text-body)', fontWeight: 500 }}>
            익명화된 학습 데이터의 연구 활용에 동의합니다
          </span>
        </label>
      </div>
    </div>
  );
}
