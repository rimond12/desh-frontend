import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import ProjectSummaryReportModal from '../../components/ProjectSummaryReportModal.jsx';
import { LeafBadge } from '../../components/shared/LeafLogo.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const LEVELS = ['All', 'Green Leaf', 'Yellow Leaf', 'Orange Leaf', 'Brown Leaf'];

const REVIEW_STATUS_CFG = {
  under_review: { label: 'Under Review', color: '#92400E', bg: '#FEF9C3', dot: '#D97706' },
  verified: { label: 'Verified', color: '#145C28', bg: '#D6F5E3', dot: '#22A84B' },
  cancelled: { label: 'Cancelled', color: '#991B1B', bg: '#FEE2E2', dot: '#EF4444' },
};

function IconEye() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// Summarise section statuses as small chips in table
function SectionStatusSummary({ sectionStatuses }) {
  if (!sectionStatuses?.length) return <span style={{ color: 'var(--tx-faint)', fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {sectionStatuses.slice(0, 2).map((ss, i) => {
        const cfg = REVIEW_STATUS_CFG[ss.status];
        if (!cfg) return null;
        return (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700,
            background: cfg.bg, color: cfg.color, fontFamily: 'Montserrat,sans-serif',
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.dot }} />
            {cfg.label}
          </span>
        );
      })}
      {sectionStatuses.length > 2 && (
        <span style={{ fontSize: 10, color: 'var(--tx-faint)', fontWeight: 600 }}>+{sectionStatuses.length - 2}</span>
      )}
    </div>
  );
}

export default function Submissions() {
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedProjectForSummary, setSelectedProjectForSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = () => {
    axiosSecure.get('/submissions')
      .then(res => setProjects(res.data.projects || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubmissions();
    axiosSecure.get('/categories')
      .then(res => setCategories(res.data.categories || []))
      .catch(console.error);
  }, []);

  const deleteProject = async (s) => {
    if (!window.confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    try {
      await axiosSecure.delete(`/submissions/${s._id}`);
      toast.success('Project deleted');
      fetchSubmissions();
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = projects.filter(s =>
    (search === '' || s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.userId?.name?.toLowerCase().includes(search.toLowerCase())) &&
    (levelFilter === 'All' || (s.adminOverride || s.leafLevel) === levelFilter)
  );

  const exportCSV = () => {
    const rows = [['Title', 'DESH Professional', 'Email', 'Score', 'Level', 'Date']];
    filtered.forEach(s => rows.push([
      s.title, s.userId?.name, s.userId?.email,
      `${s.scorePercent || 0}%`, s.adminOverride || s.leafLevel || '—',
      new Date(s.updatedAt).toLocaleDateString(),
    ]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = 'submissions.csv'; a.click();
    toast.success('CSV exported!');
  };

  return (
    <Layout isAdmin>
      <div className="mb-8 fade-in-up">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Submissions</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>{filtered.length} of {projects.length} projects</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search projects or DESH Professionals..."
          className="input-dark pl-4 pr-4 py-2.5 text-sm w-56" />
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
          className="input-dark px-3 py-2.5 text-sm">
          {LEVELS.map(l => <option key={l}>{l}</option>)}
        </select>
        <button onClick={exportCSV}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold"
          style={{ borderColor: 'var(--border-md)', color: 'var(--g600)', background: 'var(--g50)' }}>
          ↓ Download CSV
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? <p className="text-center py-8">Loading...</p> : (
          <div className="table-scroll"><table className="premium-table">
            <thead>
              <tr>
                <th>Project</th><th>DESH Professional</th><th>Level</th><th>Score</th>
                <th>Section Statuses</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--tx-muted)' }}>No submissions found</td></tr>
              ) : filtered.map(s => {
                const level = s.adminOverride || s.leafLevel;
                return (
                  <tr key={s._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/submissions/${s._id}`)}>
                    <td className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{s.title}</td>
                    <td>
                      <p className="text-xs font-semibold">{s.userId?.name || '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--tx-muted)' }}>{s.userId?.email}</p>
                    </td>
                    <td>{level ? <LeafBadge level={level} /> : '—'}</td>
                    <td className="font-bold" style={{ color: 'var(--tx)' }}>{s.scorePercent || 0}%</td>
                    <td onClick={e => e.stopPropagation()}>
                      <SectionStatusSummary sectionStatuses={s.sectionStatuses} />
                    </td>
                    <td className="text-xs">{new Date(s.updatedAt).toLocaleDateString()}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {/* View Details — opens summary modal */}
                        <button
                          onClick={() => setSelectedProjectForSummary(s)}
                          title="View Details"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 5, padding: '5px 12px', borderRadius: 8,
                            border: '1.5px solid var(--g200)',
                            background: 'var(--g50)',
                            color: 'var(--g800)',
                            fontSize: 11, fontWeight: 800,
                            fontFamily: 'Montserrat,sans-serif',
                            cursor: 'pointer', transition: 'all 0.18s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--g500)';
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.borderColor = 'var(--g500)';
                            e.currentTarget.style.boxShadow = '0 2px 10px rgba(34,168,75,0.28)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'var(--g50)';
                            e.currentTarget.style.color = 'var(--g800)';
                            e.currentTarget.style.borderColor = 'var(--g200)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <IconEye />
                          View Details
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => deleteProject(s)}
                          title="Delete project"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 30, height: 30, borderRadius: 8,
                            border: '1px solid #FECACA', background: '#FEF2F2',
                            color: '#DC2626', cursor: 'pointer',
                          }}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
      {selectedProjectForSummary && (
        <ProjectSummaryReportModal
          project={selectedProjectForSummary}
          categories={categories}
          onClose={() => setSelectedProjectForSummary(null)}
        />
      )}
    </Layout>
  );
}
