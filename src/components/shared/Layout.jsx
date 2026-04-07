import { useState } from 'react';
import Sidebar from './Sidebar';
import PartnerFooter from './PartnerFooter';

export default function Layout({ children, isAdmin = false, isReviewer = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isAdmin={isAdmin} isReviewer={isReviewer} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="main-content">
        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button onClick={() => setMobileOpen(true)}
            className="btn-icon" style={{ width:38, height:38 }}>
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" clipRule="evenodd"/>
            </svg>
          </button>
          <img src="/images/DESH_Picture1.png" alt="DESH" style={{ height:34, objectFit:'contain' }}/>
          <span style={{ fontFamily:'Montserrat,sans-serif', fontWeight:800,
            fontSize:15, color:'var(--g800)' }}>DESH</span>
          <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700,
            padding:'3px 10px', background:'var(--g100)', color:'var(--g700)', borderRadius:99 }}>
            {isAdmin ? 'Admin' : isReviewer ? 'Reviewer' : 'Portal'}
          </span>
        </div>

        <div className="page-content">
          {children}
        </div>
        <PartnerFooter />
      </div>
    </div>
  );
}
