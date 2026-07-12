import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import ProjectSummaryReportModal from '../../components/ProjectSummaryReportModal.jsx';
import { LeafBadge } from '../../components/shared/LeafLogo.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import CertificatePanel from './CertificatePanel.jsx';



const LEVELS = ['All', 'Green Leaf', 'Yellow Leaf', 'Orange Leaf', 'Brown Leaf'];
const PAGE_SIZES = [10, 25, 30, 50, 100];

const STATUS_FILTERS = [
  { key: 'all',       label: 'All Projects' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'draft',     label: 'Draft' },
];

const REVIEW_STATUS_CFG = {
  under_review: { label: 'Under Review', color: '#92400E', bg: '#FEF9C3', dot: '#D97706' },
  verified:     { label: 'Verified',     color: '#145C28', bg: '#D6F5E3', dot: '#22A84B' },
  cancelled:    { label: 'Cancelled',    color: '#991B1B', bg: '#FEE2E2', dot: '#EF4444' },
};

const PROJECT_STATUS_CFG = {
  submitted: { label: 'Submitted', bg: '#D6F5E3', color: '#145C28' },
  draft:     { label: 'Draft',     bg: '#FEF9C3', color: '#92400E' },
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
function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

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

function PaginationBar({ pagination, onPageChange, onLimitChange }) {
  if (!pagination || pagination.totalPages <= 0) return null;
  const { page, totalPages, total, limit, hasNext, hasPrev } = pagination;

  const pages = [];
  const delta = 2;
  const left  = Math.max(1, page - delta);
  const right = Math.min(totalPages, page + delta);

  if (left > 1)           { pages.push(1); if (left > 2) pages.push('...'); }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages) { if (right < totalPages - 1) pages.push('...'); pages.push(totalPages); }

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', border: '1.5px solid var(--border-md)',
    background: 'transparent', color: 'var(--tx-muted)',
    transition: 'all 0.15s', fontFamily: 'Montserrat,sans-serif',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10, marginTop: 16, padding: '10px 4px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--tx-muted)' }}>
        <span>
          Showing{' '}
          <b style={{ color: 'var(--tx)' }}>{Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)}</b>
          {' '}of{' '}
          <b style={{ color: 'var(--tx)' }}>{total}</b> projects
        </span>
        <span style={{ color: 'var(--border-md)' }}>|</span>
        <span>Rows per page:</span>
        <select
          value={limit}
          onChange={e => onLimitChange(Number(e.target.value))}
          className="input-dark"
          style={{ padding: '2px 8px', borderRadius: 7, fontSize: 12, height: 28 }}
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          style={{ ...btnBase, opacity: hasPrev ? 1 : 0.35, cursor: hasPrev ? 'pointer' : 'not-allowed' }}
        >
          <IconChevronLeft />
        </button>

        {pages.map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} style={{ padding: '0 4px', fontSize: 13, color: 'var(--tx-faint)' }}>…</span>
            : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                style={{
                  ...btnBase,
                  background:  p === page ? 'var(--g600)'                    : 'transparent',
                  color:       p === page ? '#fff'                             : 'var(--tx-muted)',
                  borderColor: p === page ? 'var(--g600)'                    : 'var(--border-md)',
                  boxShadow:   p === page ? '0 2px 8px rgba(34,168,75,0.3)' : 'none',
                }}
              >
                {p}
              </button>
            )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          style={{ ...btnBase, opacity: hasNext ? 1 : 0.35, cursor: hasNext ? 'pointer' : 'not-allowed' }}
        >
          <IconChevronRight />
        </button>
      </div>
    </div>
  );
}

export default function Submissions() {
  const axiosSecure = useAxiosSecure();
  const navigate    = useNavigate();

  const [projects,    setProjects]    = useState([]);
  const [pagination,  setPagination]  = useState(null);
  const [categories,  setCategories]  = useState([]);
  const [selectedProjectForSummary, setSelectedProjectForSummary] = useState(null);

  const [search,       setSearch]       = useState('');
  const [levelFilter,  setLevelFilter]  = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');  // all | submitted | draft

  const [page,    setPage]    = useState(1);
  const [limit,   setLimit]   = useState(30);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = useCallback((overrides = {}) => {
    const p  = overrides.page         ?? page;
    const l  = overrides.limit        ?? limit;
    const s  = overrides.search       !== undefined ? overrides.search       : search;
    const st = overrides.statusFilter !== undefined ? overrides.statusFilter : statusFilter;

    const params = new URLSearchParams({ page: p, limit: l });
    if (s && s.trim())  params.set('search', s);
    if (st !== 'all')   params.set('status', st);

    setLoading(true);
    axiosSecure.get(`/submissions?${params.toString()}`)
      .then(res => {
        const received = res.data.projects    || [];
        const pg       = res.data.pagination  || null;

        setProjects(received);
        setPagination(pg);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, limit, search, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch on page / limit change
  useEffect(() => { fetchSubmissions(); }, [page, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Categories (once)
  useEffect(() => {
    axiosSecure.get('/categories')
      .then(res => setCategories(res.data.categories || []))
      .catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    fetchSubmissions({ search: val, page: 1 });
  };

  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    setPage(1);
    fetchSubmissions({ statusFilter: val, page: 1 });
  };

  const handlePageChange = (p) => { setPage(p); };
  const handleLimitChange = (l) => { setLimit(l); setPage(1); };

  const [previewProjData, setPreviewProjData] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const startCertificateFlow = (project) => {
    setPreviewProjData(project);
    setPreviewModalOpen(true);
  };

  const downloadCertificate = (id, serial) => {
    axiosSecure.get(`/projects/${id}/certificate/download`, { responseType: 'blob' })
      .then((response) => {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Certificate-${serial || id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Certificate downloaded');
      })
      .catch(() => {
        toast.error('Failed to download certificate');
      });
  };

  const deleteProject = async (s) => {
    if (!window.confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    try {
      await axiosSecure.delete(`/submissions/${s._id}`);
      toast.success('Project deleted');
      fetchSubmissions();
    } catch { toast.error('Failed to delete'); }
  };

  // Client-side leaf-level filter (applied after server-paginated results arrive)
  const filtered = projects.filter(s =>
    levelFilter === 'All' || (s.adminOverride || s.leafLevel) === levelFilter
  );

  const exportCSV = () => {
    const rows = [['Title', 'DESH Professional', 'Email', 'Status', 'Score', 'Level', 'Date']];
    filtered.forEach(s => rows.push([
      s.title, s.userId?.name, s.userId?.email,
      s.status,
      `${s.scorePercent || 0}%`, s.adminOverride || s.leafLevel || '—',
      new Date(s.updatedAt).toLocaleDateString(),
    ]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a   = document.createElement('a');
    a.href     = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = 'submissions.csv'; a.click();
    toast.success('CSV exported!');
  };

  return (
    <Layout isAdmin>
      {/* ── Header ── */}
      <div className="mb-6 fade-in-up">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Submissions</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>
          {pagination
            ? <>
                Showing <b style={{ color: 'var(--tx)' }}>{filtered.length}</b> of{' '}
                <b style={{ color: 'var(--tx)' }}>{pagination.total}</b> total projects
                {' '}(page {pagination.page}/{pagination.totalPages || 1})
              </>
            : 'Loading…'}
        </p>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search projects or DESH Professionals..."
          className="input-dark pl-4 pr-4 py-2.5 text-sm"
          style={{ minWidth: 260 }}
        />
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="input-dark px-3 py-2.5 text-sm"
        >
          {LEVELS.map(l => <option key={l}>{l}</option>)}
        </select>
        <button
          onClick={exportCSV}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold"
          style={{ borderColor: 'var(--border-md)', color: 'var(--g600)', background: 'var(--g50)' }}
        >
          ↓ Download CSV
        </button>
      </div>

      {/* ── Status filter tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => handleStatusFilter(f.key)}
            style={{
              padding: '5px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
              border:      statusFilter === f.key ? '1.5px solid var(--g500)' : '1.5px solid var(--border)',
              background:  statusFilter === f.key ? 'var(--g700)'             : 'transparent',
              color:       statusFilter === f.key ? '#fff'                     : 'var(--tx-muted)',
              fontFamily: 'Montserrat,sans-serif',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="glass-card overflow-hidden">
        {loading ? <p className="text-center py-8">Loading…</p> : (
          <div className="table-scroll"><table className="premium-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>DESH Professional</th>
                <th>Status</th>
                <th>Level</th>
                <th>Score</th>
                <th>Section Statuses</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--tx-muted)' }}>No submissions found</td></tr>
              ) : filtered.map(s => {
                const level = s.adminOverride || s.leafLevel;
                const stCfg = PROJECT_STATUS_CFG[s.status] || PROJECT_STATUS_CFG.draft;
                return (
                  <tr key={s._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/submissions/${s._id}`)}>
                    <td className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{s.title}</td>
                    <td>
                      <p className="text-xs font-semibold">{s.userId?.name || '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--tx-muted)' }}>{s.userId?.email}</p>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                        background: stCfg.bg, color: stCfg.color, fontFamily: 'Montserrat,sans-serif',
                      }}>
                        {stCfg.label}
                      </span>
                    </td>
                    <td>{level ? <LeafBadge level={level} /> : '—'}</td>
                    <td className="font-bold" style={{ color: 'var(--tx)' }}>{s.scorePercent || 0}%</td>
                    <td onClick={e => e.stopPropagation()}>
                      <SectionStatusSummary sectionStatuses={s.sectionStatuses} />
                    </td>
                    <td className="text-xs">{new Date(s.updatedAt).toLocaleDateString()}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {s.project_status === 'REVIEW_COMPLETE' && (
                          <button 
                            onClick={() => startCertificateFlow(s)} 
                            className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                            style={{ background: 'linear-gradient(135deg,#047857,#10B981)', color: '#fff', border: 'none', fontFamily: 'Montserrat, sans-serif' }}
                          >
                            Analyze & Preview Cert
                          </button>
                        )}
                        {s.project_status === 'CERTIFICATE_ISSUED' && (
                          <button 
                            onClick={() => downloadCertificate(s._id, s.certificate_serial)} 
                            className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                            style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontFamily: 'Montserrat, sans-serif' }}
                          >
                            Download Cert
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedProjectForSummary(s)}
                          title="View Details"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 5, padding: '5px 12px', borderRadius: 8,
                            border: '1.5px solid var(--g200)', background: 'var(--g50)',
                            color: 'var(--g800)', fontSize: 11, fontWeight: 800,
                            fontFamily: 'Montserrat,sans-serif',
                            cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background  = 'var(--g500)';
                            e.currentTarget.style.color       = '#fff';
                            e.currentTarget.style.borderColor = 'var(--g500)';
                            e.currentTarget.style.boxShadow   = '0 2px 10px rgba(34,168,75,0.28)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background  = 'var(--g50)';
                            e.currentTarget.style.color       = 'var(--g800)';
                            e.currentTarget.style.borderColor = 'var(--g200)';
                            e.currentTarget.style.boxShadow   = 'none';
                          }}
                        >
                          <IconEye />
                          View Details
                        </button>
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

      {/* ── Pagination bar ── */}
      {!loading && pagination && (
        <PaginationBar
          pagination={pagination}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      {selectedProjectForSummary && (
        <ProjectSummaryReportModal
          project={selectedProjectForSummary}
          categories={categories}
          onClose={() => setSelectedProjectForSummary(null)}
        />
      )}

      {/* Certificate Studio Panel (Admin view) */}
      {previewModalOpen && previewProjData && (
        <CertificatePanel
          project={previewProjData}
          onClose={() => {
            setPreviewModalOpen(false);
            setPreviewProjData(null);
          }}
          onIssued={() => {
            setPreviewModalOpen(false);
            setPreviewProjData(null);
            fetchSubmissions();
          }}
        />
      )}
          </Layout>
  );
}
