import { useState } from 'react';
import Sidebar from './Sidebar';
import PartnerFooter from './PartnerFooter';
import NotificationBell from '../tickets/NotificationBell';
import { useAuth } from '../../context/AuthContext.jsx';

// ── Layout — shell wrapper for all authenticated pages ────────────────────────
// Pages pass isAdmin/isReviewer/isManager as hints, but Layout also reads
// dbUser.activeRole as the authoritative source. This prevents any mismatch
// between what a page declares and what the user has actually switched to.
export default function Layout({ children, isAdmin = false, isReviewer = false, isManager = false }) {
  const { dbUser } = useAuth();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [collapsed,   setCollapsed]   = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  );

  const toggleCollapse = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  // ── Derive sidebar type from activeRole (authoritative) ──────────────────────
  // The page-level props (isAdmin, isReviewer, isManager) are used as fallbacks
  // only when activeRole is not available (e.g., during initial load).
  const activeRole    = dbUser?.activeRole || dbUser?.role;
  const effectiveAdmin    = activeRole ? activeRole === 'admin'                                               : isAdmin;
  const effectiveManager  = activeRole ? activeRole === 'desh_manager'                                        : isManager;
  const effectiveReviewer = activeRole ? ['reviewer', 'desh_reviewer', 'desh_assessor'].includes(activeRole) : isReviewer;

  return (
    <div className="app-shell">
      <Sidebar
        isAdmin={effectiveAdmin}
        isReviewer={effectiveReviewer}
        isManager={effectiveManager}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        {/* Mobile topbar */}
        <div className="mobile-topbar">
          {/* Animated hamburger → X button */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="btn-icon"
            style={{ width: 38, height: 38, flexShrink: 0 }}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', width: 18 }}>
              <span className="hamburger-bar" style={{ transform: mobileOpen ? 'translateY(6px) rotate(45deg)' : 'none' }} />
              <span className="hamburger-bar" style={{ opacity: mobileOpen ? 0 : 1, width: mobileOpen ? 0 : 18 }} />
              <span className="hamburger-bar" style={{ transform: mobileOpen ? 'translateY(-6px) rotate(-45deg)' : 'none' }} />
            </span>
          </button>

          <img src="/images/logo (1).png" alt="DESH" style={{ height: 34, objectFit: 'contain' }} />
          <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--g800)' }}>
            DESH
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 700,
            padding: '3px 10px', background: 'var(--g100)', color: 'var(--g700)', borderRadius: 99,
          }}>
            {effectiveAdmin ? 'Admin' : effectiveManager ? 'Manager' : effectiveReviewer ? 'Reviewer' : 'Portal'}
          </span>
        </div>

        <div className="page-content">
          <div className="flex items-center justify-end mb-4 px-2">
            <NotificationBell />
          </div>
          <div style={{ flex: 1 }}>{children}</div>
          <PartnerFooter />
        </div>
      </div>
    </div>
  );
}
