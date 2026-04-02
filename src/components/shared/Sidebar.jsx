import { Link, useLocation, useNavigate } from 'react-router-dom';
import LeafLogo from './LeafLogo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const userNav = [
  {
    section: 'NAVIGATION',
    items: [
      { icon: '⊞', label: 'Dashboard', path: '/dashboard' },
      { icon: '◫', label: 'My Projects', path: '/projects' },
      { icon: '＋', label: 'New Project', path: '/projects/new' },
      { icon: '📝', label: 'My Notes', path: '/notes' },
      { icon: '◎', label: 'User Manual', path: '/manual' },
    ],
  },
];

const adminNav = [
  {
    section: 'MAIN',
    items: [
      { icon: '⊞', label: 'Dashboard', path: '/admin' },
    ],
  },
  {
    section: 'CONTENT',
    items: [
      { icon: '◧', label: 'Tabs', path: '/admin/tabs' },
      { icon: '◈', label: 'Modules', path: '/admin/modules' },
      { icon: '🍃', label: 'Leaf Levels', path: '/admin/evaluation' },
    ],
  },
  {
    section: 'MANAGEMENT',
    items: [
      { icon: '◉', label: 'Users', path: '/admin/users' },
      { icon: '◫', label: 'Submissions', path: '/admin/submissions' },
      { icon: '⏱', label: 'Activity Logs', path: '/admin/activity' },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      { icon: '⚙', label: 'Settings', path: '/admin/settings' },
    ],
  },
];

export default function Sidebar({ isAdmin = false, mobileOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const navGroups = isAdmin ? adminNav : userNav;

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const sidebarClass = `sidebar fixed left-0 top-0 h-full w-64 flex flex-col z-40 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    }`;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside className={sidebarClass}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b"
          style={{ borderColor: 'rgba(34,197,94,0.1)' }}>
          <LeafLogo size={32} />
          <div>
            <span className="font-bold text-white text-base"
              style={{ fontFamily: 'Syne, sans-serif' }}>
              DESH Project
            </span>
            <span className="block text-xs" style={{ color: 'rgba(232,245,233,0.3)' }}>
              {isAdmin ? 'Admin Panel' : 'User Portal'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
          {navGroups.map((group) => (
            <div key={group.section}>
              <p className="text-xs font-semibold px-3 mb-2"
                style={{ color: 'rgba(232,245,233,0.25)', letterSpacing: '0.08em' }}>
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`sidebar-item ${active ? 'active' : ''}`}
                    >
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      {item.label}
                      {active && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Account section */}
        <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(34,197,94,0.1)' }}>
          <p className="text-xs font-semibold px-3 mb-2"
            style={{ color: 'rgba(232,245,233,0.25)', letterSpacing: '0.08em' }}>
            ACCOUNT
          </p>
          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-1"
            style={{ background: 'rgba(34,197,94,0.06)' }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #16520A, #22C55E)' }}>
              {user?.displayName?.[0]?.toUpperCase() ||
                user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs truncate" style={{ color: 'rgba(232,245,233,0.3)' }}>
                {user?.email}
              </p>
            </div>
          </div>
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="sidebar-item w-full text-left mt-0.5"
            style={{ color: 'rgba(239,68,68,0.7)' }}
          >
            <span>↩</span> Logout
          </button>
        </div>
      </aside>
    </>
  );
}