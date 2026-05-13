import { useState } from 'react';
import Sidebar from './Sidebar';
import PartnerFooter from './PartnerFooter';

export default function Layout({ children, isAdmin = false, isReviewer = false }) {
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

  return (
    <div className="app-shell">
      <Sidebar
        isAdmin={isAdmin}
        isReviewer={isReviewer}
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

          <img src="/images/DESH_Picture1.png" alt="DESH" style={{ height: 34, objectFit: 'contain' }} />
          <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--g800)' }}>
            DESH
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 700,
            padding: '3px 10px', background: 'var(--g100)', color: 'var(--g700)', borderRadius: 99,
          }}>
            {isAdmin ? 'Admin' : isReviewer ? 'Reviewer' : 'Portal'}
          </span>
        </div>

        <div className="page-content">
          <div style={{ flex: 1 }}>{children}</div>
          <PartnerFooter />
        </div>
      </div>
    </div>
  );
}
