import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';

const ROLE_COLORS = {
  desh_reviewer: { label: 'Reviewer', bg: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: 'rgba(139,92,246,0.25)' },
  reviewer: { label: 'Reviewer', bg: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: 'rgba(139,92,246,0.25)' },
  desh_assessor: { label: 'Assessor', bg: 'rgba(59,130,246,0.12)', color: '#93C5FD', border: 'rgba(59,130,246,0.25)' }
};

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
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || 
                          u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || 
                        (roleFilter === 'reviewer' && (u.role === 'desh_reviewer' || u.role === 'reviewer')) ||
                        (roleFilter === 'assessor' && u.role === 'desh_assessor');
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
              className="input-dark px-3 py-1.5 text-xs"
              style={{
                appearance: 'none',
                cursor: 'pointer',
                paddingRight: '28px',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'11\' height=\'11\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%231A7A35\' stroke-width=\'2.5\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                background: '#fff',
                border: '1.5px solid var(--border-md)',
                color: 'var(--tx)',
              }}
            >
              <option value="all">All Roles</option>
              <option value="reviewer">Reviewers</option>
              <option value="assessor">Assessors</option>
            </select>
          </div>
          <div>
            <label className="block text-3xs font-semibold mb-1 text-gray-400 uppercase tracking-widest">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input-dark px-3 py-1.5 text-xs"
              style={{
                appearance: 'none',
                cursor: 'pointer',
                paddingRight: '28px',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'11\' height=\'11\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%231A7A35\' stroke-width=\'2.5\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                background: '#fff',
                border: '1.5px solid var(--border-md)',
                color: 'var(--tx)',
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
        <div className="overflow-x-auto glass-card">
          <table className="w-full text-left border-collapse" style={{ minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Name</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Email</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Role</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Status</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Created Date</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const badge = ROLE_COLORS[u.role] || { label: u.role, bg: 'rgba(255,255,255,0.05)', color: '#fff', border: 'rgba(255,255,255,0.1)' };
                return (
                  <tr key={u._id} style={{ borderBottom: '1px solid var(--border)' }} className="hover:bg-gray-800/10">
                    <td className="p-4 font-bold text-sm">{u.name}</td>
                    <td className="p-4 text-sm">{u.email}</td>
                    <td className="p-4 text-sm">
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 99,
                        fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color,
                        border: `1px solid ${badge.border}`, fontFamily: 'Montserrat,sans-serif',
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`inline-block text-2xs px-2 py-0.5 rounded-full font-bold ${
                        u.isActive !== false ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                      }`}>
                        {u.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => handleToggleStatus(u)} 
                          className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                          style={{ background: '#1F2937', borderColor: '#374151', color: '#FFF', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#374151'}
                          onMouseLeave={e => e.currentTarget.style.background = '#1F2937'}
                        >
                          {u.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u)} 
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-950/20 text-red-400 border border-red-900/40 hover:bg-red-900/40 transition-all"
                          style={{ cursor: 'pointer' }}
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
