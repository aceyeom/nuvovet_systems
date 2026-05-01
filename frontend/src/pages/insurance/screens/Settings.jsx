import React, { useState, useEffect } from 'react';
import { I } from '../icons';
import { users } from '../data';

const SUBNAV = [
  { id: 'org', ko: '조직 정보', en: 'Organization', icon: 'Building' },
  { id: 'users', ko: '사용자 관리', en: 'Users', icon: 'Users' },
  { id: 'api', ko: 'API 통합', en: 'API Integration', icon: 'Key' },
  { id: 'data', ko: '데이터 거버넌스', en: 'Data Governance', icon: 'Database' },
  { id: 'compliance', ko: 'K-ISMS-P 인증', en: 'Compliance', icon: 'Shield' },
  { id: 'billing', ko: '청구', en: 'Billing', icon: 'CreditCard' },
];

const ROLE_PERMS = [
  ['청구 검증', [1, 1, 1, 0]],
  ['보고서 생성', [1, 1, 0, 0]],
  ['보고서 조회', [1, 1, 1, 1]],
  ['사용자 관리', [1, 0, 0, 0]],
  ['API 키 관리', [1, 0, 0, 0]],
  ['데이터 내보내기', [1, 1, 0, 0]],
  ['병원 워치리스트 편집', [1, 1, 1, 0]],
  ['감사 로그 조회', [1, 0, 0, 0]],
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('users');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('검토자');
  const [userSearch, setUserSearch] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    setInviteOpen(false);
    setInviteEmail('');
    setInviteRole('검토자');
    setToast(`${inviteEmail}에 초대 이메일을 발송했습니다.`);
  };

  const StatusBadge = ({ s }) => {
    if (s === 'active') return <span className="badge badge-ok"><span className="dot dot-ok" />활성</span>;
    if (s === 'invited') return <span className="badge badge-warning">초대됨</span>;
    return <span className="badge"><span className="dot dot-muted" />비활성</span>;
  };

  const initials = (name) => name.slice(0, 1) + (name.length > 1 ? name.slice(1, 2) : '');

  const colorForName = (name) => {
    const colors = ['#0F766E', '#1E40AF', '#7C2D12', '#581C87', '#0E7490', '#831843'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    return colors[Math.abs(h) % colors.length];
  };

  const renderContent = () => {
    if (activeTab === 'users') {
      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>사용자 관리</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{users.length}명 · 활성 {users.filter(u => u.status === 'active').length}명 · 초대됨 {users.filter(u => u.status === 'invited').length}명</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="search-input" style={{ width: 240 }}>
                <I.Search size={14} style={{ color: 'var(--text-muted)' }} />
                <input
                  placeholder="이름, 이메일 검색…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={() => setInviteOpen(true)}><I.Plus size={14} />사용자 초대</button>
            </div>
          </div>

          {inviteOpen && (
            <div style={{ marginBottom: 20, padding: 20, background: 'var(--bg-canvas)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>새 사용자 초대</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>이메일</div>
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); if (e.key === 'Escape') setInviteOpen(false); }}
                    style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>역할</div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    style={{ border: '1px solid var(--border)', borderRadius: 7, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-body)' }}
                  >
                    {['관리자', '분석가', '검토자', '뷰어'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary" onClick={handleInvite}>초대 발송</button>
                  <button className="btn btn-secondary" onClick={() => { setInviteOpen(false); setInviteEmail(''); }}>취소</button>
                </div>
              </div>
            </div>
          )}

          <div className="card" style={{ overflow: 'hidden', marginBottom: 32 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>역할</th>
                  <th>부서</th>
                  <th>마지막 활동</th>
                  <th>상태</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: 13 }}>검색 결과가 없습니다.</td></tr>
                )}
                {filteredUsers.map((u, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: colorForName(u.name), color: 'white', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(u.name)}</span>
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>{u.role}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.dept}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{u.last}</td>
                    <td><StatusBadge s={u.status} /></td>
                    <td><button className="icon-btn" style={{ width: 24, height: 24 }}><I.MoreV size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>역할별 권한 <span className="section-title-en">/ Role permissions</span></h3>
            <p className="section-sub" style={{ marginBottom: 16 }}>각 역할이 수행할 수 있는 작업입니다.</p>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>권한</th>
                  <th style={{ textAlign: 'center' }}>관리자</th>
                  <th style={{ textAlign: 'center' }}>분석가</th>
                  <th style={{ textAlign: 'center' }}>검토자</th>
                  <th style={{ textAlign: 'center' }}>뷰어</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_PERMS.map((row, i) => (
                  <tr key={i} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 500 }}>{row[0]}</td>
                    {row[1].map((v, j) => (
                      <td key={j} style={{ textAlign: 'center' }}>
                        {v ? <I.Check size={16} style={{ color: 'var(--accent)' }} /> : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    const tabInfo = SUBNAV.find(s => s.id === activeTab);
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{tabInfo?.ko}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{tabInfo?.en}</p>
          </div>
        </div>
        <div style={{ padding: '64px 32px', background: 'var(--bg-canvas)', borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {tabInfo?.ko} 설정 준비 중입니다.
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#0A0A0A', color: '#fff', borderRadius: 8,
          padding: '10px 18px', fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">설정</h1>
          <p className="page-subtitle">KB손해보험 NuvoVet 설정</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 40, alignItems: 'flex-start' }}>
        <div>
          {SUBNAV.map(s => {
            const Ico = I[s.icon];
            return (
              <button
                key={s.id}
                className={'nav-item' + (activeTab === s.id ? ' active' : '')}
                style={{ marginBottom: 2 }}
                onClick={() => setActiveTab(s.id)}
              >
                <span className="nav-icon"><Ico size={14} /></span>
                <span>{s.ko}</span>
              </button>
            );
          })}
        </div>

        <div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
