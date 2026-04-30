import React from 'react';
import { I } from '../icons';
import { users } from '../data';

export default function Settings() {
  const subnav = [
    { id: 'org', ko: '조직 정보', en: 'Organization', icon: 'Building' },
    { id: 'users', ko: '사용자 관리', en: 'Users', icon: 'Users', active: true },
    { id: 'api', ko: 'API 통합', en: 'API Integration', icon: 'Key' },
    { id: 'data', ko: '데이터 거버넌스', en: 'Data Governance', icon: 'Database' },
    { id: 'compliance', ko: 'K-ISMS-P 인증', en: 'Compliance', icon: 'Shield' },
    { id: 'billing', ko: '청구', en: 'Billing', icon: 'CreditCard' },
  ];

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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">설정</h1>
          <p className="page-subtitle">KB손해보험 NuvoVet 설정</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 40, alignItems: 'flex-start' }}>
        <div>
          {subnav.map(s => {
            const Ico = I[s.icon];
            return (
              <button key={s.id} className={'nav-item' + (s.active ? ' active' : '')} style={{ marginBottom: 2 }}>
                <span className="nav-icon"><Ico size={14} /></span>
                <span>{s.ko}</span>
              </button>
            );
          })}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>사용자 관리</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{users.length}명 · 활성 {users.filter(u => u.status === 'active').length}명 · 초대됨 {users.filter(u => u.status === 'invited').length}명</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="search-input" style={{ width: 240 }}>
                <I.Search size={14} style={{ color: 'var(--text-muted)' }} />
                <input placeholder="이름, 이메일 검색…" />
              </div>
              <button className="btn btn-primary"><I.Plus size={14} />사용자 초대</button>
            </div>
          </div>

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
                {users.map((u, i) => (
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
                {[
                  ['청구 검증', [1, 1, 1, 0]],
                  ['보고서 생성', [1, 1, 0, 0]],
                  ['보고서 조회', [1, 1, 1, 1]],
                  ['사용자 관리', [1, 0, 0, 0]],
                  ['API 키 관리', [1, 0, 0, 0]],
                  ['데이터 내보내기', [1, 1, 0, 0]],
                  ['병원 워치리스트 편집', [1, 1, 1, 0]],
                  ['감사 로그 조회', [1, 0, 0, 0]],
                ].map((row, i) => (
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
      </div>
    </div>
  );
}
