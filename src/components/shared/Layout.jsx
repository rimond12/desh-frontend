// src/components/shared/Layout.js
import { useState } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children, isAdmin = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-mesh noise">
      <Sidebar isAdmin={isAdmin} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'rgba(34,197,94,0.1)', background: 'rgba(10,15,10,0.9)', backdropFilter: 'blur(10px)' }}>
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg"
            style={{ background: 'rgba(34,197,94,0.08)' }}>
            <svg viewBox="0 0 20 20" fill="rgba(232,245,233,0.6)" width="18" height="18">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>DESH</span>
        </div>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
