import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';

const ROLE_COLORS = {
  desh_reviewer: { label: 'Reviewer', bg: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: 'rgba(139,92,246,0.25)' },
  reviewer:      { label: 'Reviewer', bg: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: 'rgba(139,92,246,0.25)' },
  desh_assessor: { label: 'Assessor', bg: 'rgba(59,130,246,0.12)', color: '#93C5FD', border: 'rgba(59,130,246,0.25)' },
  user:          { label: 'DESH Professional', bg: 'rgba(34,168,75,0.12)', color: '#4ADE80', border: 'rgba(34,168,75,0.25)' },
};

// Normalise user.roles (supports both legacy `role` and new `roles` array)
function getUserRoles(u) {
  if (Array.isArray(u.roles) && u.roles.length > 0) return u.roles;
  if (u.role) return [u.role];
  return ['user'];
}

function RoleBadge({ role }) {
  const cfg = ROLE_COLORS[role] || { label: role, bg: 'rgba(255,255,255,0.05)', color: '#fff', border: 'rgba(255,255,255,0.1)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`, fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

export default function ManagerUsers() {
  const axiosSecure = useAxiosSecure();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('desh_reviewer');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axiosSecure.get('/users');
      setUsers(res.data.users || []);
    } catch {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      const nextStatus = !user.isActive;
      await axiosSecure.patch(`/users/${user._id}/status`, { isActive: nextStatus });
      toast.success(`Account ${nextStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update account status');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.name} (${user.email})? This action cannot be undone.`)) {
      return;
    }
    try {
      await axiosSecure.delete(`/users/${user._id}`);
      toast.success('Account deleted successfully');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      toast.error('All fields are required');
      return;
    }
    try {
      setSubmitting(true);
      await axiosSecure.post('/users/create-reviewer-assessor', { name, email, password, role });
      toast.success('Account created successfully');
      setName('');
      setEmail('');
      setPassword('');
      setRole('desh_reviewer');
      setShowCreateModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const roles = getUserRoles(u);
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || 
                          u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || 
                        (roleFilter === 'reviewer' && (roles.includes('desh_reviewer') || roles.includes('reviewer'))) ||
                        (roleFilter === 'assessor' && roles.includes('desh_assessor')) ||
                        (roleFilter === 'user' && roles.includes('user'));
    const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'active' && u.isActive !== false) ||
                          (statusFilter === 'inactive' && u.isActive === false);
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <Layout isManager>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8 fade-in-up">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Manage Staff Accounts</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>
            Create and manage DESH Reviewers and DESH Assessors accounts
          </p>
        </div>
        <div>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="btn-primary-green text-sm flex items-center gap-2"
          >
            ➕ Add Staff Account
          </button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 glass-card p-4">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <label className="block text-3xs font-semibold mb-1 text-gray-400 uppercase tracking-widest">Role</label>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="input-dark px-3 py-1.5 text-xs font-semibold"
              style={{
                appearance: 'none',
                cursor: 'pointer',
                paddingRight: '28px',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'11\' height=\'11\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%231A7A35\' stroke-width=\'2.5\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                background: 'var(--bg-soft)',
                border: '1.5px solid var(--border-md)',
                color: 'var(--tx-2)',
                borderRadius: '10px'
              }}
            >
              <option value="all">All Roles</option>
              <option value="reviewer">Reviewers</option>
              <option value="assessor">Assessors</option>
              <option value="user">DESH Professionals</option>
            </select>
          </div>
          <div>
            <label className="block text-3xs font-semibold mb-1 text-gray-400 uppercase tracking-widest">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input-dark px-3 py-1.5 text-xs font-semibold"
              style={{
                appearance: 'none',
                cursor: 'pointer',
                paddingRight: '28px',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'11\' height=\'11\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%231A7A35\' stroke-width=\'2.5\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                background: 'var(--bg-soft)',
                border: '1.5px solid var(--border-md)',
                color: 'var(--tx-2)',
                borderRadius: '10px'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-3xs font-semibold mb-1 text-gray-400 uppercase tracking-widest">Search</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email..."
            className="input-dark px-4 py-1.5 text-xs w-full max-w-xs"
            style={{ borderRadius: '11px' }}
          />
        </div>
      </div>

      {/* Staff Accounts List */}
      {loading ? (
        <div className="text-center py-20">Loading Staff Accounts...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <p className="text-3xl mb-2">👥</p>
          <p style={{ color: 'var(--tx-muted)' }}>No staff accounts found.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="table-scroll">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const badge = ROLE_COLORS[u.role] || { label: u.role, bg: 'rgba(255,255,255,0.05)', color: '#fff', border: 'rgba(255,255,255,0.1)' };
                  return (
                    <tr key={u._id}>
                      <td className="font-bold text-sm" style={{ color: 'var(--tx-2)' }}>{u.name}</td>
                      <td className="text-sm">{u.email}</td>
                      <td className="text-sm">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {getUserRoles(u).map(r => <RoleBadge key={r} role={r} />)}
                        </div>
                      </td>
                      <td className="text-sm">
                        <span className={`inline-block text-2xs px-2 py-0.5 rounded-full font-bold ${
                          u.isActive !== false ? 'bg-green-900/10 text-green-600 border border-green-200' : 'bg-red-900/10 text-red-600 border border-red-200'
                        }`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="text-right">
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => handleToggleStatus(u)} 
                            disabled={u.role === 'user'}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all ${u.role === 'user' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            style={{ background: 'var(--bg-soft)', borderColor: 'var(--border-md)', color: 'var(--tx-2)' }}
                            onMouseEnter={e => { if (u.role !== 'user') e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                            onMouseLeave={e => { if (u.role !== 'user') e.currentTarget.style.background = 'var(--bg-soft)'; }}
                          >
                            {u.isActive !== false ? 'Deactivate' : 'Activate'}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u)} 
                            disabled={u.role === 'user'}
                            className={`text-xs px-3 py-1.5 rounded-lg bg-red-950/10 text-red-600 border border-red-200 transition-all font-bold ${u.role === 'user' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-900/20 cursor-pointer'}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account Creation Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          backdropFilter: 'blur(4px)', padding: 16,
        }}>
          <form onSubmit={handleCreateUser} className="glass-card w-full max-w-md p-6 fade-in-up" style={{ background: '#091E11', border: '1.5px solid var(--border-md)' }}>
            <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: '#FFF' }} className="text-xl font-bold mb-4">Create Staff Account</h2>
            
            {/* Name */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Full Name
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter full name"
                className="input-dark w-full px-3 py-2 text-sm"
                style={{ background: '#0D3B1A', border: '1.5px solid rgba(52, 201, 97, 0.3)', color: '#FFF' }}
              />
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Email Address
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="input-dark w-full px-3 py-2 text-sm"
                style={{ background: '#0D3B1A', border: '1.5px solid rgba(52, 201, 97, 0.3)', color: '#FFF' }}
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Password
              </label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="input-dark w-full px-3 py-2 text-sm"
                style={{ background: '#0D3B1A', border: '1.5px solid rgba(52, 201, 97, 0.3)', color: '#FFF' }}
              />
            </div>

            {/* Role select */}
            <div className="mb-6">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Staff Role
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="input-dark w-full px-3 py-2 text-sm"
                style={{
                  background: '#0D3B1A',
                  border: '1.5px solid rgba(52, 201, 97, 0.3)',
                  color: '#FFF',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2334C961' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '34px',
                  cursor: 'pointer',
                }}
              >
                <option value="desh_reviewer" style={{ background: '#091E11' }}>DESH Reviewer</option>
                <option value="desh_assessor" style={{ background: '#091E11' }}>DESH Assessor</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)} 
                className="text-sm px-4 py-2 rounded-xl border transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: '#FFF', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary-green text-sm px-4 py-2"
                style={{ cursor: 'pointer' }}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}
