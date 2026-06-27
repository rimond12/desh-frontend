import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import useNavLabels from '../../hooks/useNavLabels.js';
import { NAV_CONFIG } from '../../config/navConfig.js';
import { userHasRole } from '../../context/AuthContext.jsx';

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
  const L = useNavLabels();

  const role = isAdmin ? 'admin' : isManager ? 'manager' : isReviewer ? 'reviewer' : 'user';
  const roleConfig = NAV_CONFIG.find(r => r.role === role);

  // Compute cross-portal links for multi-role users
  const crossPortalLinks = [];
  if (!isAdmin && !isManager) {
    // Reviewer who also has user/professional role → can switch to professional portal
    if (isReviewer && userHasRole(dbUser, 'user') && !userHasRole(dbUser, 'desh_manager', 'admin')) {
      crossPortalLinks.push({ label: '⇄ Professional Portal', path: '/dashboard', icon: '⊞' });
    }
    // User who also has reviewer role → can switch to reviewer portal
    if (!isReviewer && userHasRole(dbUser, 'desh_reviewer', 'reviewer', 'desh_assessor')) {
      crossPortalLinks.push({ label: '⇄ Reviewer Portal', path: '/reviewer/submissions', icon: '◫' });
    }
  }

  // Build nav groups from config + saved labels
  const navGroups = roleConfig.sections.map(section => ({
    section: section.sectionKey
      ? (L[section.sectionKey] ?? section.sectionDefault)
      : section.sectionDefault,
    items: section.items.map(item => ({
      icon: item.icon,
      label: L[item.key] ?? item.defaultLabel,
      path: item.path,
    })),
  }));

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
            <img src="/images/DESH_Picture1.png" alt="DESH"
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
                    {active && (
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

        {/* ── Cross-portal links for multi-role users ──────────────── */}
        {crossPortalLinks.length > 0 && (
          <div style={{ padding: '0 12px', marginBottom: 8 }}>
            <div className="sidebar-section-label" style={{ color: 'rgba(255,255,255,0.25)' }}>SWITCH PORTAL</div>
            {crossPortalLinks.map(link => {
              const active = location.pathname.startsWith(link.path.split('/').slice(0, 3).join('/'));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={onClose}
                  className={`sidebar-item${active ? ' active' : ''}`}
                  style={{
                    border: '1px dashed rgba(52,201,97,0.25)',
                    background: 'rgba(52,201,97,0.04)',
                    marginBottom: 4,
                  }}
                >
                  <div className="sidebar-icon" style={{ fontSize: 14 }}>{link.icon}</div>
                  <span className="sb-label" style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>{link.label}</span>
                </Link>
              );
            })}
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
    </>
  );
}
