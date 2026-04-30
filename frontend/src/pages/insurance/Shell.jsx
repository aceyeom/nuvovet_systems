import React from 'react';
import { useNavigate } from 'react-router-dom';
import { I } from './icons';
import { NuvovetBrand } from '../../components/NuvovetLogo';

const NAV_ITEMS = [
  { id: 'overview', ko: '개요', en: 'Overview', icon: 'Home' },
  { id: 'validation', ko: '청구 검증', en: 'Claim Validation', icon: 'Validate' },
  { id: 'hospitals', ko: '병원 벤치마크', en: 'Hospital Benchmarks', icon: 'Hospital' },
  { id: 'pricing', ko: '시술 가격', en: 'Procedure Pricing', icon: 'Tag' },
  { id: 'anomaly', ko: '이상치 탐지', en: 'Anomaly Detection', icon: 'Anomaly' },
  { id: 'reports', ko: '분기 보고서', en: 'Quarterly Reports', icon: 'Report' },
];

export default function Shell({ route, setRoute, children }) {
  const navigate = useNavigate();

  const Logo = (
    <div
      className="shell-logo"
      onClick={() => navigate('/start')}
      style={{ cursor: 'pointer' }}
      title="홈으로"
    >
      <NuvovetBrand size={24} />
    </div>
  );

  const Topbar = (
    <div className="shell-topbar">
      <div className="shell-search">
        <I.Search size={14} />
        <span>청구, 병원, 시술 코드 검색…</span>
        <span className="kbd">⌘K</span>
      </div>
      <div className="shell-topbar-right">
        <button className="icon-btn" title="알림">
          <I.Bell size={18} />
          <span className="notif-dot" />
        </button>
        <button className="user-chip">
          <span className="avatar">JH</span>
          <span className="name">이지훈</span>
          <I.ChevronDown size={14} />
        </button>
      </div>
    </div>
  );

  const NavItem = ({ item }) => {
    const Ico = I[item.icon];
    return (
      <button
        className={'nav-item' + (route === item.id ? ' active' : '')}
        onClick={() => setRoute(item.id)}
      >
        <span className="nav-icon"><Ico size={16} /></span>
        <span>{item.ko}</span>
      </button>
    );
  };

  const Sidebar = (
    <div className="shell-sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">메뉴 / Menu</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => <NavItem key={item.id} item={item} />)}
        </div>
      </div>
      <div className="sidebar-section" style={{ paddingTop: 0 }}>
        <div className="sidebar-label">관리 / Admin</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavItem item={{ id: 'settings', ko: '설정', en: 'Settings', icon: 'Settings' }} />
        </div>
      </div>
      <div className="sidebar-spacer" />
      <div className="sidebar-footer">
        <button className="org-switcher">
          <span className="org-mark">KB</span>
          <span className="org-info">
            <div className="org-name">KB손해보험</div>
            <div className="org-team">펫보험팀</div>
          </span>
          <I.ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
        <div className="sidebar-user">
          <span className="avatar">JH</span>
          <span className="info">
            <div className="name">이지훈</div>
            <div className="role">액추어리 부장</div>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app">
      {Logo}
      {Topbar}
      {Sidebar}
      <div className="shell-main" id="main-scroll">{children}</div>
    </div>
  );
}
