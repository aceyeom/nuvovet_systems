import React from 'react';
import { useNavigate } from 'react-router-dom';
import { I } from './icons';

export const NAV_ITEMS = [
  { id: 'overview', ko: '개요', en: 'Overview', icon: 'Home' },
  { id: 'validation', ko: '청구 심사', en: 'Claim review', icon: 'Validate' },
  { id: 'hospitals', ko: '병원 리스크', en: 'Clinic risk', icon: 'Hospital' },
  { id: 'pricing', ko: '진료비 벤치마크', en: 'Fee benchmarks', icon: 'Tag' },
  { id: 'evaluation', ko: '엔진 성능', en: 'Engine performance', icon: 'Anomaly' },
];

export default function Shell({ route, setRoute, children }) {
  const navigate = useNavigate();

  const NavItem = ({ item }) => {
    const Ico = I[item.icon];
    return (
      <button className={'nav-item' + (route === item.id ? ' active' : '')} onClick={() => setRoute(item.id)}>
        <span className="nav-icon"><Ico size={16} /></span>
        <span>{item.ko}</span>
      </button>
    );
  };

  return (
    <div className="app">
      <div className="shell-logo" onClick={() => navigate('/start')} style={{ cursor: 'pointer' }} title="홈으로">
        <span style={{ fontSize: 21, fontWeight: 900, letterSpacing: '-0.045em', color: '#0A0A0A', lineHeight: 1, userSelect: 'none' }}>nuvovet</span>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--accent)', marginLeft: 8, textTransform: 'uppercase' }}>Claims</span>
      </div>
      <div className="shell-topbar">
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>펫보험 청구 정형화 · 임상 심사 엔진</div>
        <div className="shell-topbar-right">
          <span className="badge badge-warning" title="이 콘솔의 모든 청구·병원 데이터는 합성 데이터입니다">데모 · 합성 데이터</span>
        </div>
      </div>
      <div className="shell-sidebar">
        <div className="sidebar-section">
          <div className="sidebar-label">보험사 콘솔</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_ITEMS.map((item) => <NavItem key={item.id} item={item} />)}
          </div>
        </div>
        <div className="sidebar-section" style={{ paddingTop: 0 }}>
          <div className="sidebar-label">연동</div>
          <NavItem item={{ id: 'integration', ko: 'API 연동', icon: 'Key' }} />
        </div>
        <div className="sidebar-spacer" />
        <div className="sidebar-footer">
          <div className="org-switcher" style={{ cursor: 'default' }}>
            <span className="org-mark">D</span>
            <span className="org-info">
              <div className="org-name">데모 보험사</div>
              <div className="org-team">청구 심사팀 (가상)</div>
            </span>
          </div>
        </div>
      </div>
      <div className="shell-main" id="main-scroll">{children}</div>
    </div>
  );
}
