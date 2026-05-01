import React from 'react';
import { useNavigate } from 'react-router-dom';
import { I } from './icons';
import { STUDENT } from './data';

const NAV_ITEMS = [
  { id: 'overview',    ko: '대시보드',   en: 'Dashboard',   icon: 'Home' },
  { id: 'cases',       ko: '케이스',     en: 'Cases',       icon: 'Layers' },
  { id: 'peer-review', ko: '동료 검토',  en: 'Peer Review', icon: 'Users',   badge: 2 },
  { id: 'reference',   ko: '약물 사전',  en: 'Reference',   icon: 'BookOpen' },
  { id: 'progress',    ko: '학습 기록',  en: 'Progress',    icon: 'BarChart' },
];

export default function Shell({ route, setRoute, children }) {
  const navigate = useNavigate();

  const Logo = (
    <div className="shell-logo" onClick={() => navigate('/start')} title="홈으로">
      <span style={{
        fontSize: 20, fontWeight: 900, letterSpacing: '-0.045em',
        color: '#0A0A0A', lineHeight: 1, userSelect: 'none', fontFamily: 'inherit',
      }}>nuvovet</span>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
        color: '#C46B0A', textTransform: 'uppercase', paddingTop: 2,
      }}>아카데미</span>
    </div>
  );

  const Topbar = (
    <div className="shell-topbar">
      <div className="shell-search">
        <I.Search size={14} />
        <span>케이스, 약물, 가이드라인 검색…</span>
        <span className="kbd">⌘K</span>
      </div>
      <div className="shell-topbar-right">
        <span className="track-badge">Track A · B · C</span>
        <button className="icon-btn" title="알림">
          <I.Bell size={18} />
          <span className="notif-dot" />
        </button>
        <button className="user-chip">
          <span className="avatar">{STUDENT.initials}</span>
          <span className="name">{STUDENT.name}</span>
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
        {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
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
        <div className="semester-card">
          <span className="sem-mark">KU</span>
          <span className="sem-info">
            <div className="sem-name">{STUDENT.school}</div>
            <div className="sem-sub">{STUDENT.semester}</div>
          </span>
        </div>
        <div className="sidebar-user">
          <span className="avatar">{STUDENT.initials}</span>
          <span className="info">
            <div className="name">{STUDENT.name}</div>
            <div className="role">{STUDENT.year}</div>
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
      <div className="shell-main" id="acad-main-scroll">{children}</div>
    </div>
  );
}
