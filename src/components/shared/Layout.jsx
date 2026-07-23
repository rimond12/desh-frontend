import { useState } from 'react';
import Sidebar from './Sidebar';
import PartnerFooter from './PartnerFooter';
import NotificationBell from '../tickets/NotificationBell';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Layout({ children, isAdmin = false, isReviewer = false, isManager = false }) {
  const { dbUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  );

  const toggleCollapse = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  const activeRole = dbUser?.activeRole || dbUser?.role;
  const effectiveAdmin = activeRole ? activeRole === 'admin' : isAdmin;
  const effectiveManager = activeRole ? activeRole === 'desh_manager' : isManager;
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
        {/* Desktop Topbar */}
        <div 
          className="hidden sm:flex items-center justify-between px-6 py-2.5 shadow-xs"
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div 
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full"
            style={{
              background: 'var(--g50)',
              border: '1px solid var(--g200)'
            }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--g500)' }} />
            <span 
              className="text-xs font-extrabold uppercase tracking-wider"
              style={{ color: 'var(--g800)', fontFamily: 'Montserrat, sans-serif' }}
            >
              {effectiveAdmin
                ? 'Admin Control System'
                : effectiveManager
                ? 'DESH Manager Portal'
                : effectiveReviewer
                ? 'Reviewer & Assessor Portal'
                : 'DESH Professional Workspace'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </div>

        {/* Mobile topbar */}
        <div className="mobile-topbar">
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
          <div style={{ marginLeft: 'auto' }} className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>

        <div className="page-content">
          <div style={{ flex: 1 }}>{children}</div>
          <PartnerFooter />
        </div>
      </div>
    </div>
  );
}
