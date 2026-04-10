import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const userNav = [
  { section:'MAIN', items:[
    { icon:'⊞', label:'Dashboard',   path:'/dashboard' },
    { icon:'◫', label:'My Projects', path:'/projects' },
    { icon:'+', label:'New Project',  path:'/projects/new' },
  ]},
  { section:'TOOLS', items:[
    { icon:'✎', label:'My Notes',    path:'/notes' },
    { icon:'?', label:'User Manual', path:'/manual' },
  ]},
];

const adminNav = [
  { section:'OVERVIEW', items:[
    { icon:'⊞', label:'Dashboard',    path:'/admin' },
  ]},
  { section:'CONTENT', items:[
    { icon:'◧', label:'Tabs',         path:'/admin/tabs' },
    { icon:'◈', label:'Modules',      path:'/admin/modules' },
    { icon:'▦', label:'Sections',     path:'/admin/sections' },
    { icon:'🍃', label:'Leaf Levels', path:'/admin/evaluation' },
  ]},
  { section:'MANAGEMENT', items:[
    { icon:'◉', label:'Users',         path:'/admin/users' },
    { icon:'◫', label:'Submissions',   path:'/admin/submissions' },
    { icon:'⏱', label:'Activity',      path:'/admin/activity' },
  ]},
  { section:'SYSTEM', items:[
    { icon:'⚙', label:'Settings',     path:'/admin/settings' },
    { icon:'⇅', label:'Import/Export', path:'/admin/import-export' },
  ]},
];

const reviewerNav = [
  { section:'REVIEW', items:[
    { icon:'◫', label:'Submissions', path:'/reviewer/submissions' },
  ]},
];

export default function Sidebar({ isAdmin=false, isReviewer=false, mobileOpen, onClose }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const navGroups = isAdmin ? adminNav : isReviewer ? reviewerNav : userNav;

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={onClose} style={{
          position:'fixed',inset:0,zIndex:39,
          background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'
        }}/>
      )}

      <aside className="sidebar" style={{
        transform: mobileOpen ? 'translateX(0)' : undefined
      }}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{
            width:42, height:42, borderRadius:12, overflow:'hidden',
            background:'rgba(255,255,255,0.1)',
            border:'1px solid rgba(255,255,255,0.15)',
            display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0
          }}>
            <img src="/images/DESH_Picture1.png" alt="DESH"
              style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:900,
              fontSize:17, color:'#fff', letterSpacing:'-0.01em', lineHeight:1.2 }}>
              DESHBOARD
            </div>
            <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.38)',
              fontWeight:600, letterSpacing:'0.04em', marginTop:2 }}>
              {isAdmin ? 'Admin Panel' : 'User Portal'}
            </div>
          </div>
          {/* <span style={{
            background:'rgba(52,201,97,0.18)',
            border:'1px solid rgba(52,201,97,0.3)',
            color:'#5DD882', fontSize:9, fontWeight:800,
            padding:'2px 7px', borderRadius:99,
            letterSpacing:'0.1em', fontFamily:'Montserrat,sans-serif',
            flexShrink:0
          }}>GOV</span> */}
        </div>

        {/* Green accent */}
        <div style={{ height:2, margin:'0 18px',
          background:'linear-gradient(90deg,rgba(52,201,97,0.6),transparent)',
          borderRadius:99 }}/>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navGroups.map(group => (
            <div key={group.section}>
              <div className="sidebar-section-label">{group.section}</div>
              {group.items.map(item => {
                const active = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} onClick={onClose}
                    className={`sidebar-item ${active?'active':''}`}>
                    <div className="sidebar-icon">{item.icon}</div>
                    <span>{item.label}</span>
                    {active && (
                      <div style={{ marginLeft:'auto', width:7, height:7,
                        borderRadius:'50%', background:'#34C961',
                        boxShadow:'0 0 10px #34C961', flexShrink:0 }}/>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* User card */}
          <div style={{
            display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
            background:'rgba(255,255,255,0.06)',
            border:'1px solid rgba(255,255,255,0.09)',
            borderRadius:12, marginBottom:8
          }}>
            <div style={{
              width:36, height:36, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg,#145C28,#34C961)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:14, fontWeight:800, color:'white',
              fontFamily:'Montserrat,sans-serif',
              boxShadow:'0 2px 10px rgba(34,168,75,0.4)'
            }}>
              {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12.5, fontWeight:700,
                color:'rgba(255,255,255,0.85)', margin:0,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </p>
              <p style={{ fontSize:10.5, color:'rgba(255,255,255,0.3)', margin:0,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.email}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10,
            padding:'9px 12px', borderRadius:10,
            background:'rgba(239,68,68,0.08)',
            border:'1px solid rgba(239,68,68,0.18)',
            color:'rgba(252,165,165,0.85)',
            fontSize:13, fontWeight:600, cursor:'pointer',
            transition:'all 0.18s', fontFamily:'Nunito,sans-serif',
            textAlign:'left'
          }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.16)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.08)'}>
            <span style={{ fontSize:14 }}>↩</span> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
