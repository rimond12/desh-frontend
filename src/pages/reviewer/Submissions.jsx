import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { LeafBadge } from '../../components/shared/LeafLogo.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const LOCK_CFG = {
  locked:   { label: 'Locked',     bg: '#FEF9C3', color: '#92400E', dot: '#D97706' },
  unlocked: { label: 'Pending Review', bg: '#EFF6FF', color: '#1D4ED8', dot: '#60A5FA' },
};

function IconEye() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export default function ReviewerSubmissions() {
  const axiosSecure = useAxiosSecure();
  const navigate    = useNavigate();
  const { dbUser }  = useAuth();

  const [projects, setProjects] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [lockFilter, setLockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    axiosSecure.get(`/submissions?status=${statusFilter}`)
      .then(res => setProjects(res.data.projects || []))
      .catch(() => toast.error('Failed to load submissions'))
      .finally(() => setLoading(false));
  }, [statusFilter, axiosSecure]);

  const filtered = projects.filter(s => {
    const matchSearch = search === '' ||
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.userId?.name?.toLowerCase().includes(search.toLowerCase());
    const matchLock =
      lockFilter === 'all' ||
      (lockFilter === 'locked' && s.isLocked) ||
      (lockFilter === 'pending' && !s.isLocked);
    return matchSearch && matchLock;
  });

  return (
    <Layout isReviewer>
      <div className="mb-8 fade-in-up">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Submissions
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>
          {filtered.length} of {projects.length} projects · Review and add comments
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search projects or users…"
          className="input-dark pl-4 pr-4 py-2.5 text-sm w-56" />
        
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="input-dark px-3 py-2.5 text-sm">
          <option value="all">All Projects</option>
          <option value="Pending">Pending</option>
          <option value="Started">Started</option>
          <option value="Done">Done</option>
        </select>

        {dbUser?.role !== 'desh_assessor' && (
          <select value={lockFilter} onChange={e => setLockFilter(e.target.value)}
            className="input-dark px-3 py-2.5 text-sm">
            <option value="all">All Lock Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="locked">Review Submitted</option>
          </select>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? <p className="text-center py-8">Loading…</p> : (
          <div className="table-scroll"><table className="premium-table">
            <thead>
              <tr>
                <th>Project</th><th>User</th><th>Level</th>
                <th>Score</th>{dbUser?.role !== 'desh_assessor' && <th>Review Status</th>}
                <th>Workflow Status</th><th>Date</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={dbUser?.role === 'desh_assessor' ? 7 : 8} className="text-center py-12" style={{ color: 'var(--tx-muted)' }}>
                  No submissions found
                </td></tr>
              ) : filtered.map(s => {
                const level  = s.adminOverride || s.leafLevel;
                const locked = s.isLocked;
                const cfg    = locked ? LOCK_CFG.locked : LOCK_CFG.unlocked;
                const workflowStatus = dbUser?.role === 'desh_assessor' ? s.assessorStatus : s.reviewerStatus;
                
                return (
                  <tr key={s._id} style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/reviewer/submissions/${s._id}`)}>
                    <td className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>
                      {s.title}
                      {dbUser?.role !== 'desh_assessor' && locked && (
                        <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: '#FEF9C3', color: '#92400E' }}>
                          🔒 LOCKED
                        </span>
                      )}
                    </td>
                    <td>
                      <p className="text-xs font-semibold">{s.userId?.name || '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--tx-muted)' }}>{s.userId?.email}</p>
                    </td>
                    <td>{level ? <LeafBadge level={level} /> : '—'}</td>
                    <td className="font-bold" style={{ color: 'var(--tx)' }}>{s.scorePercent || 0}%</td>
                    {dbUser?.role !== 'desh_assessor' && (
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                          background: cfg.bg, color: cfg.color, fontFamily: 'Montserrat,sans-serif',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot }} />
                          {cfg.label}
                        </span>
                      </td>
                    )}
                    <td>
                      <span className={`inline-block text-2xs px-2 py-0.5 rounded-full font-bold ${
                        workflowStatus === 'Done' ? 'bg-green-900/40 text-green-400' :
                        workflowStatus === 'Started' ? 'bg-amber-900/40 text-amber-400' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {workflowStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="text-xs">{new Date(s.updatedAt).toLocaleDateString()}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/reviewer/submissions/${s._id}`)}
                        title="Open for review" style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 30, height: 30, borderRadius: 8,
                          border: '1px solid var(--border)', background: 'var(--bg-soft)',
                          color: 'var(--g700)', cursor: 'pointer',
                        }}>
                        <IconEye />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </Layout>
  );
}
