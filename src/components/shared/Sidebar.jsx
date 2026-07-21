import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import useNavLabels from '../../hooks/useNavLabels.js';
import { NAV_CONFIG } from '../../config/navConfig.js';
import { userHasRole, getActiveRole } from '../../context/AuthContext.jsx';
import ChangeRoleModal from './ChangeRoleModal.jsx';
import useHiddenRoutes from '../../hooks/useHiddenRoutes.js';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function Sidebar({
  isAdmin = false,
  isReviewer = false,
  isManager = false,
  mobileOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, dbUser } = useAuth();
  const axiosSecure = useAxiosSecure();
  const L = useNavLabels();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await axiosSecure.get('/notifications/unread-count');
        setUnreadCount(res.data.count || 0);
      } catch (_) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  const role = isAdmin ? 'admin' : isManager ? 'manager' : isReviewer ? 'reviewer' : 'user';
  const roleConfig = NAV_CONFIG.find(r => r.role === role);

  // Whether this user has multiple roles (show the switcher button)
  const assignedRoles  = Array.isArray(dbUser?.roles) ? dbUser.roles : ['user'];
  const hasMultiRoles  = assignedRoles.length > 1;
  const currentActive  = getActiveRole(dbUser);

  const hiddenRoutes = useHiddenRoutes();

  // Build nav groups from config + saved labels, filtering out hidden items
  const navGroups = roleConfig.sections.map(section => {
    const visibleItems = section.items
      .filter(item => !hiddenRoutes[item.key])
      .map(item => ({
        icon: item.icon,
        label: L[item.key] ?? item.defaultLabel,
        path: item.path,
      }));
    return {
      section: section.sectionKey
        ? (L[section.sectionKey] ?? section.sectionDefault)
        : section.sectionDefault,
      items: visibleItems,
    };
  }).filter(group => group.items.length > 0);

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const sidebarClass = [
    'sidebar',
    mobileOpen ? 'open' : '',
    collapsed ? 'collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={sidebarClass}>

        {/* ── Logo row ─────────────────────────────────────────── */}
        <div className="sidebar-logo" style={{ position: 'relative' }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, overflow: 'hidden',
            background: 'white', border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <img src="/images/logo (1).png" alt="DESH"
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
          </div>

          <div className="sb-logo-text" style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
              fontSize: 17, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2,
            }}>
              {L.logoText}
            </div>
            <div style={{
              fontSize: 10.5, color: 'rgba(255,255,255,0.38)',
              fontWeight: 600, letterSpacing: '0.04em', marginTop: 2,
            }}>
              {isAdmin ? L.adminSubtitle : isManager ? 'Manager Panel' : L.userSubtitle}
            </div>
          </div>

          <button
            className={`sb-toggle-btn${collapsed ? ' collapsed' : ''}`}
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">✕</button>
        </div>

        {/* Green accent line */}
        <div style={{
          height: 2, margin: '0 18px',
          background: 'linear-gradient(90deg,rgba(52,201,97,0.6),transparent)',
          borderRadius: 99,
        }} />

        {/* ── Nav ──────────────────────────────────────────────── */}
        <nav className="sidebar-nav">
          {navGroups.map(group => (
            <div key={group.section}>
              <div className="sidebar-section-label">{group.section}</div>
              {group.items.map(item => {
                const active = location.pathname === item.path;
                const isNotif = item.path === '/notifications';
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    data-label={item.label}
                    className={`sidebar-item${active ? ' active' : ''}`}
                  >
                    <div className="sidebar-icon">{item.icon}</div>
                    <span className="sb-label">{item.label}</span>
                    {isNotif && unreadCount > 0 && (
                      <span className="sb-badge" style={{
                        marginLeft: 'auto',
                        background: '#EF4444',
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 99,
                        lineHeight: 1.2,
                        boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                        flexShrink: 0
                      }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {active && (!isNotif || unreadCount === 0) && (
                      <div className="sb-active-dot" style={{
                        marginLeft: 'auto', width: 7, height: 7,
                        borderRadius: '50%', background: '#34C961',
                        boxShadow: '0 0 10px #34C961', flexShrink: 0,
                      }} />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Role Switcher trigger (multi-role users only) ─────────────── */}
        {hasMultiRoles && (
          <div style={{ padding: '0 12px', marginBottom: 8 }}>
            <div className="sidebar-section-label" style={{ color: 'rgba(255,255,255,0.22)' }}>SWITCH ROLE</div>
            <button
              onClick={() => setRoleSwitcherOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 14px', borderRadius: 11,
                border: '1px dashed rgba(52,201,97,0.3)',
                background: 'rgba(52,201,97,0.05)',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', transition: 'all 0.18s',
                fontSize: 13, fontWeight: 600,
                fontFamily: 'Nunito,sans-serif',
                textAlign: 'left',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(52,201,97,0.1)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                e.currentTarget.style.borderColor = 'rgba(52,201,97,0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(52,201,97,0.05)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                e.currentTarget.style.borderColor = 'rgba(52,201,97,0.3)';
              }}
            >
              <div className="sidebar-icon" style={{ fontSize: 14 }}>⇄</div>
              <div className="sb-label" style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5 }}>Change Role</span>
                {!collapsed && (
                  <span style={{ fontSize: 10, color: 'rgba(52,201,97,0.6)', display: 'block', marginTop: 1 }}>
                    Active: {currentActive === 'user' ? 'DESH Professional' : (currentActive || '—')}
                  </span>
                )}
              </div>
            </button>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="sidebar-footer">
          <div className="sb-user-card" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 12, marginBottom: 8,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#145C28,#34C961)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: 'white',
              fontFamily: 'Montserrat,sans-serif', boxShadow: '0 2px 10px rgba(34,168,75,0.4)',
            }}>
              {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="sb-user-text" style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.displayName || user?.email?.split('@')[0] || 'DESH Professional'}
              </p>
              <p style={{
                fontSize: 10.5, color: 'rgba(255,255,255,0.3)', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="sb-logout-btn"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
              color: 'rgba(252,165,165,0.85)', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'Nunito,sans-serif',
              textAlign: 'left', justifyContent: collapsed ? 'center' : 'flex-start',
            }}
            title={collapsed ? 'Logout' : undefined}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.16)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>↩</span>
            <span className="sb-logout-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Change Role Modal ──────────────────────────────────────────── */}
      {roleSwitcherOpen && (
        <ChangeRoleModal onClose={() => setRoleSwitcherOpen(false)} />
      )}
    </>
  );
}
