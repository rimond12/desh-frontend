import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import ProjectSummaryReportModal from '../../components/ProjectSummaryReportModal.jsx';
import { LeafBadge, ColoredLeaf } from '../../components/shared/LeafLogo.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import html2pdf from 'html2pdf.js';

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
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleEditField = (field, val) => {
    setPreviewProjData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleEditHistorical = (index, field, val) => {
    setPreviewProjData(prev => {
      const copy = [...(prev.historicalScores || [])];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, historicalScores: copy };
    });
  };

  const startCertificateFlow = async (projectId) => {
    try {
      const res = await axiosSecure.post('/manager/certificate/generate', { projectId });
      const data = res.data.certificateData;
      setPreviewProjData({
        ...data,
        mainLogoUrl: data.mainLogoUrl || '/images/DESH_Picture1.png',
        watermarkUrl: data.watermarkUrl || '/images/0_HBRI_Picture3-removebg-preview.png',
        watermarkOpacity: data.watermarkOpacity !== undefined ? data.watermarkOpacity : 0.05,
        leftStripeColor: data.leftStripeColor || '#065F46',
        rightStripeColor: data.rightStripeColor || '#DC2626',
        innerBorderColor: data.innerBorderColor || '#065F46',
        labelForProject: data.labelForProject || 'For the project:',
        labelLocatedAt: data.labelLocatedAt || 'Located at:',
        labelScore: data.labelScore || 'SCORE:',
        labelStatus: data.labelStatus || 'STATUS:',
        labelPartners: data.labelPartners || 'Institutional Partners & Supporters',
        partnerLogos: data.partnerLogos || [
          '/images/1_UNOPS_Picture4.png',
          '/images/3_UN_HABITAT_Picture8.png',
          '/images/0_HBRI_Picture3.png',
          '/images/bdLogo.jpg',
          '/images/4_UNEP_Picture6.png',
          '/images/5_GABC_Picture7.png',
          '/images/federal-ministry.png'
        ].join(', ')
      });
      setPreviewModalOpen(true);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to analyze project and generate preview.');
    }
  };

  const approveAndPublishCertificate = async () => {
    if (!previewProjData) return;
    setGeneratingPdf(true);
    const toastId = toast.loading('Compiling and generating certificate PDF...');
    try {
      const element = document.getElementById('cert-render-area');
      const opt = {
        margin:       0,
        filename:     `Certificate-${previewProjData.serialNumber}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2.2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBase64 = await html2pdf().set(opt).from(element).output('datauristring');

      await axiosSecure.post('/manager/certificate/approve', {
        projectId: previewProjData.projectId,
        pdfData: pdfBase64,
        serialNumber: previewProjData.serialNumber,
        issuedAt: previewProjData.issuedAt,
        expiryAt: previewProjData.expiryAt,
        historicalScores: previewProjData.historicalScores,
        recipientName: previewProjData.recipientName,
        projectTitle: previewProjData.projectTitle,
        location: previewProjData.location,
      });

      toast.success('Certificate generated and approved successfully!', { id: toastId });
      setPreviewModalOpen(false);
      setPreviewProjData(null);
      fetchSubmissions();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate or approve certificate.', { id: toastId });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const downloadCertificate = (id, serial) => {
    axiosSecure.get(`/projects/${id}/certificate/download`, { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Certificate-${serial || id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
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
                            onClick={() => startCertificateFlow(s._id)} 
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

      {/* Certificate Preview Modal */}
      {previewModalOpen && previewProjData && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', zIndex: 100,
          backdropFilter: 'blur(8px)', padding: '20px 16px', overflowY: 'auto',
        }}>
          {/* Modal Header Controls */}
          <div className="glass-card w-full max-w-6xl p-4 mb-4 flex justify-between items-center sticky top-0" style={{ background: '#091E11', border: '1.5px solid var(--border-md)', zIndex: 110 }}>
            <div>
              <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: '#FFF' }} className="text-lg font-bold">Certificate Preview & Approval Cockpit</h2>
              <p className="text-2xs text-gray-400">Review metrics, customize parameters, and view the live A4 layout before signing off.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setPreviewModalOpen(false); setPreviewProjData(null); }} className="text-xs px-4 py-2 rounded-xl border font-bold transition-all" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: '#FFF', cursor: 'pointer' }}>
                Cancel
              </button>
              <button 
                onClick={approveAndPublishCertificate} 
                disabled={generatingPdf} 
                className="btn-primary-green text-xs px-5 py-2 font-bold flex items-center gap-1.5" 
                style={{ cursor: 'pointer' }}
              >
                {generatingPdf ? 'Generating PDF...' : '✓ Generate & Approve Certificate'}
              </button>
            </div>
          </div>

          {/* Split-Screen Container */}
          <div style={{ width: '100%', maxWidth: '1150px', display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-start', paddingBottom: 40, flexWrap: 'wrap' }}>
            
            {/* Left Column: Editor controls */}
            <div className="glass-card p-5" style={{ flex: '1 1 350px', maxWidth: '420px', background: '#08170E', border: '1.5px solid var(--border-md)', color: '#fff', borderRadius: 16 }}>
              <h3 className="text-sm font-bold uppercase tracking-wide mb-4 text-green-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>Customize Certificate</h3>
              
              <div className="flex flex-col gap-3 mb-6">
                <div>
                  <label className="block text-2xs uppercase tracking-wider text-gray-400 font-bold mb-1">Recipient Company Name</label>
                  <input 
                    type="text" 
                    value={previewProjData.recipientName || ''} 
                    onChange={e => handleEditField('recipientName', e.target.value)} 
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13 }}
                  />
                </div>
                
                <div>
                  <label className="block text-2xs uppercase tracking-wider text-gray-400 font-bold mb-1">Project Title</label>
                  <textarea 
                    rows={2}
                    value={previewProjData.projectTitle || ''} 
                    onChange={e => handleEditField('projectTitle', e.target.value)} 
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, resize: 'none' }}
                  />
                </div>
                
                <div>
                  <label className="block text-2xs uppercase tracking-wider text-gray-400 font-bold mb-1">Location / Coordinates</label>
                  <textarea 
                    rows={2}
                    value={previewProjData.location || ''} 
                    onChange={e => handleEditField('location', e.target.value)} 
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, resize: 'none' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs uppercase tracking-wider text-gray-400 font-bold mb-1">Date of Issue</label>
                    <input 
                      type="date" 
                      value={previewProjData.issuedAt ? new Date(previewProjData.issuedAt).toISOString().split('T')[0] : ''} 
                      onChange={e => handleEditField('issuedAt', new Date(e.target.value))} 
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label className="block text-2xs uppercase tracking-wider text-gray-400 font-bold mb-1">Valid Till</label>
                    <input 
                      type="date" 
                      value={previewProjData.expiryAt ? new Date(previewProjData.expiryAt).toISOString().split('T')[0] : ''} 
                      onChange={e => handleEditField('expiryAt', new Date(e.target.value))} 
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12 }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-2xs uppercase tracking-wider text-gray-400 font-bold mb-1">Serial Number</label>
                  <input 
                    type="text" 
                    value={previewProjData.serialNumber || ''} 
                    onChange={e => handleEditField('serialNumber', e.target.value)} 
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Visual Settings & Images */}
              <h4 className="text-2xs font-bold uppercase tracking-wider text-green-400 mt-4 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Visuals & Layout Branding</h4>
              <div className="flex flex-col gap-2 mb-4">
                <div>
                  <label className="block text-3xs uppercase tracking-wider text-gray-400 font-bold mb-1">Main Logo URL</label>
                  <input 
                    type="text" 
                    value={previewProjData.mainLogoUrl || ''} 
                    onChange={e => handleEditField('mainLogoUrl', e.target.value)} 
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                  />
                </div>

                <div>
                  <label className="block text-3xs uppercase tracking-wider text-gray-400 font-bold mb-1">Watermark Logo URL</label>
                  <input 
                    type="text" 
                    value={previewProjData.watermarkUrl || ''} 
                    onChange={e => handleEditField('watermarkUrl', e.target.value)} 
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-3xs uppercase tracking-wider text-gray-400 font-bold mb-1">Watermark Opacity</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="1"
                      value={previewProjData.watermarkOpacity} 
                      onChange={e => handleEditField('watermarkOpacity', parseFloat(e.target.value) || 0)} 
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label className="block text-3xs uppercase tracking-wider text-gray-400 font-bold mb-1">Left Band Color</label>
                    <input 
                      type="text" 
                      value={previewProjData.leftStripeColor || ''} 
                      onChange={e => handleEditField('leftStripeColor', e.target.value)} 
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-3xs uppercase tracking-wider text-gray-400 font-bold mb-1">Right Band Color</label>
                    <input 
                      type="text" 
                      value={previewProjData.rightStripeColor || ''} 
                      onChange={e => handleEditField('rightStripeColor', e.target.value)} 
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label className="block text-3xs uppercase tracking-wider text-gray-400 font-bold mb-1">Inner Border Color</label>
                    <input 
                      type="text" 
                      value={previewProjData.innerBorderColor || ''} 
                      onChange={e => handleEditField('innerBorderColor', e.target.value)} 
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                    />
                  </div>
                </div>

                <h4 className="text-2xs font-bold uppercase tracking-wider text-green-400 mt-2 mb-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>Labels & Footer</h4>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-3xs uppercase tracking-wider text-gray-400 font-bold mb-1">"For Project" Label</label>
                    <input 
                      type="text" 
                      value={previewProjData.labelForProject || ''} 
                      onChange={e => handleEditField('labelForProject', e.target.value)} 
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label className="block text-3xs uppercase tracking-wider text-gray-400 font-bold mb-1">"Located At" Label</label>
                    <input 
                      type="text" 
                      value={previewProjData.labelLocatedAt || ''} 
                      onChange={e => handleEditField('labelLocatedAt', e.target.value)} 
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-3xs uppercase tracking-wider text-gray-400 font-bold mb-1">"Score" Label</label>
                    <input 
                      type="text" 
                      value={previewProjData.labelScore || ''} 
                      onChange={e => handleEditField('labelScore', e.target.value)} 
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label className="block text-3xs uppercase tracking-wider text-gray-400 font-bold mb-1">"Status" Label</label>
                    <input 
                      type="text" 
                      value={previewProjData.labelStatus || ''} 
                      onChange={e => handleEditField('labelStatus', e.target.value)} 
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-3xs uppercase tracking-wider text-gray-400 font-bold mb-1">Partners Title</label>
                  <input 
                    type="text" 
                    value={previewProjData.labelPartners || ''} 
                    onChange={e => handleEditField('labelPartners', e.target.value)} 
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                  />
                </div>

                <div>
                  <label className="block text-3xs uppercase tracking-wider text-gray-400 font-bold mb-1">Partner Logos (Comma-separated URLs)</label>
                  <textarea 
                    rows={3}
                    value={previewProjData.partnerLogos || ''} 
                    onChange={e => handleEditField('partnerLogos', e.target.value)} 
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11, resize: 'none' }}
                  />
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-green-400 mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>Historical Comparison</h4>
              <div className="flex flex-col gap-3">
                {(previewProjData.historicalScores || []).map((h, i) => (
                  <div key={i} className="p-3 rounded-lg border border-gray-800 bg-gray-900/40 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Label" 
                        value={h.label} 
                        onChange={e => handleEditHistorical(i, 'label', e.target.value)} 
                        style={{ width: '50%', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11 }}
                      />
                      <select 
                        value={h.leafLevel} 
                        onChange={e => handleEditHistorical(i, 'leafLevel', e.target.value)} 
                        style={{ width: '50%', padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11 }}
                      >
                        <option value="Green Leaf">Green Leaf</option>
                        <option value="Yellow Leaf">Yellow Leaf</option>
                        <option value="Orange Leaf">Orange Leaf</option>
                        <option value="Brown Leaf">Brown Leaf</option>
                      </select>
                    </div>
                    <div className="flex gap-2 items-center text-3xs text-gray-400">
                      <span>Score %</span>
                      <input 
                        type="number" 
                        value={h.scorePercent} 
                        onChange={e => handleEditHistorical(i, 'scorePercent', parseInt(e.target.value) || 0)} 
                        style={{ width: '45px', padding: '4px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11 }}
                      />
                      <span>Pts</span>
                      <input 
                        type="number" 
                        value={h.totalPoints} 
                        onChange={e => handleEditHistorical(i, 'totalPoints', parseInt(e.target.value) || 0)} 
                        style={{ width: '38px', padding: '4px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11 }}
                      />
                      <span>/ Max</span>
                      <input 
                        type="number" 
                        value={h.maxPoints} 
                        onChange={e => handleEditHistorical(i, 'maxPoints', parseInt(e.target.value) || 0)} 
                        style={{ width: '38px', padding: '4px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Visual Certificate */}
            <div style={{ flex: '0 0 794px', height: '955px', overflow: 'hidden', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', background: '#fff' }}>
              <div 
                style={{
                  transform: 'scale(0.85)',
                  transformOrigin: 'top center',
                  width: '794px',
                  height: '1123px',
                }}
              >
                <div 
                  id="cert-render-area" 
                  style={{
                    width: '794px',
                    height: '1123px',
                    padding: '30px 45px 25px',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                    color: '#1F2937',
                    fontFamily: "'Montserrat', sans-serif",
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Left solid Green Band */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '12px', background: previewProjData.leftStripeColor || '#065F46', zIndex: 10 }} />
                  
                  {/* Right solid Red Band */}
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '12px', background: previewProjData.rightStripeColor || '#DC2626', zIndex: 10 }} />
                  
                  {/* Inner double border outline */}
                  <div style={{
                    position: 'absolute',
                    inset: '12px 24px',
                    border: `3px double ${previewProjData.innerBorderColor || '#065F46'}`,
                    pointerEvents: 'none',
                    zIndex: 5
                  }} />

                  {/* Content Wrap to guarantee zIndex > watermark */}
                  <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                    
                    {/* Top Row: Brand & Logo */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '5px 0' }}>
                      <img 
                        src={previewProjData.mainLogoUrl || '/images/DESH_Picture1.png'} 
                        alt="DESH Logo" 
                        style={{ height: 75, objectFit: 'contain' }} 
                      />
                    </div>

                    {/* Recipient and Project Information */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: '8px 0', gap: 5 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', letterSpacing: '0.02em' }}>
                        [RECIPIENT NAME: {(previewProjData.recipientName || '').toUpperCase()}]
                      </div>
                      <div style={{ fontSize: 9, fontStyle: 'italic', color: '#4B5563' }}>
                        {previewProjData.labelForProject || 'For the project:'}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#111827', letterSpacing: '0.02em' }}>
                        [PROJECT NAME: {(previewProjData.projectTitle || '').toUpperCase()}]
                      </div>
                      <div style={{ fontSize: 9, fontStyle: 'italic', color: '#4B5563' }}>
                        {previewProjData.labelLocatedAt || 'Located at:'}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#374151', letterSpacing: '0.02em' }}>
                        [LOCATION: {(previewProjData.location || '').toUpperCase()}]
                      </div>
                    </div>

                    {/* Middle Section: Two Columns */}
                    <div style={{ display: 'flex', gap: 20, margin: '5px 0', alignItems: 'stretch' }}>
                      {/* Left Column: Large Leaf Graphic */}
                      <div style={{ flex: '0 0 25%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #E5E7EB', paddingRight: 12 }}>
                        <ColoredLeaf 
                          level={previewProjData.leafLevel} 
                          colorCode={
                            previewProjData.percentage >= 80 ? '#10B981' : 
                            previewProjData.percentage >= 60 ? '#F59E0B' : 
                            previewProjData.percentage >= 40 ? '#EA580C' : '#97542A'
                          }
                          size={110} 
                        />
                        <span style={{ 
                          fontSize: 11, 
                          fontWeight: 800, 
                          color: previewProjData.percentage >= 80 ? '#145C28' : 
                                 previewProjData.percentage >= 60 ? '#92400E' : 
                                 previewProjData.percentage >= 40 ? '#9A3412' : '#78350F', 
                          marginTop: 6, 
                          textTransform: 'uppercase' 
                        }}>
                          {previewProjData.leafLevel}
                        </span>
                        <span style={{ fontSize: 9, color: '#6B7280', fontWeight: 600 }}>
                          {previewProjData.percentage >= 80 ? '80 - 100%' : 
                          previewProjData.percentage >= 60 ? '60 - 79%' : 
                          previewProjData.percentage >= 40 ? '40 - 59%' : '20 - 39%'}
                        </span>
                      </div>

                      {/* Right Column: Score Widget & Assessment breakdown */}
                      <div style={{ flex: '1 1 75%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        
                        {/* Score & Status Widget Row */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          background: '#FCFAF2', 
                          borderRadius: '10px', 
                          padding: '8px 12px', 
                          border: '1px solid #E5E7EB',
                        }}>
                          <div>
                            <div style={{ fontSize: 8, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{previewProjData.labelScore || 'SCORE:'}</div>
                            <div style={{ fontSize: 24, fontWeight: 950, color: previewProjData.percentage >= 80 ? '#10B981' : previewProjData.percentage >= 60 ? '#F59E0B' : previewProjData.percentage >= 40 ? '#EA580C' : '#97542A', lineHeight: 1.1 }}>{Math.round(previewProjData.percentage)}%</div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: '#6B7280' }}>{Math.round(previewProjData.totalPoints)}/{Math.round(previewProjData.maxPoints)} PTS</div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{
                              background: previewProjData.percentage >= 80 ? '#D1FAE5' : previewProjData.percentage >= 60 ? '#FEF9C3' : previewProjData.percentage >= 40 ? '#FEF3C7' : '#F5F0E8',
                              color: previewProjData.percentage >= 80 ? '#065F46' : previewProjData.percentage >= 60 ? '#92400E' : previewProjData.percentage >= 40 ? '#9A3412' : '#78350F',
                              padding: '3px 8px', borderRadius: 99, fontSize: 9, fontWeight: 800, border: `1px solid ${previewProjData.percentage >= 80 ? '#10B981' : previewProjData.percentage >= 60 ? '#F59E0B' : previewProjData.percentage >= 40 ? '#EA580C' : '#97542A'}`
                            }}>
                              {previewProjData.leafLevel}
                            </span>
                          </div>

                          <div style={{ maxWidth: '50%' }}>
                            <div style={{ fontSize: 8, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{previewProjData.labelStatus || 'STATUS:'}</div>
                            <div style={{ fontSize: 10, fontWeight: 900, color: '#111827', marginTop: 2 }}>
                              {previewProjData.percentage >= 80 ? 'EXCELLENT PERFORMANCE (H)' : 
                              previewProjData.percentage >= 60 ? 'GOOD PERFORMANCE (S)' : 
                              previewProjData.percentage >= 40 ? 'AVERAGE PERFORMANCE (E)' : 'POOR PERFORMANCE (D)'}
                            </div>
                          </div>
                        </div>

                        {/* Assessment Areas & Performance Layout */}
                        <div style={{ 
                          background: '#F9FAF7', 
                          border: '1px solid #E5E7EB', 
                          borderRadius: '10px', 
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}>
                          <div style={{ fontSize: 8, fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Assessment Areas & Performance
                          </div>
                          
                          <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                            {/* Table Breakdown */}
                            <div style={{ flex: '0 0 45%' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
                                <tbody>
                                  {previewProjData.breakdown.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                      <td style={{ padding: '2px 0', fontWeight: 700, color: '#374151' }}>{idx + 1}. {item.abbr}</td>
                                      <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600, color: '#4B5563' }}>
                                        {Math.round(item.achieved)}/{Math.round(item.allocated)}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr style={{ borderTop: '1.5px solid #D1D5DB', fontWeight: 900 }}>
                                    <td style={{ padding: '3px 0', color: '#111827' }}>Total</td>
                                    <td style={{ padding: '3px 0', textAlign: 'right', color: '#111827' }}>
                                      {Math.round(previewProjData.totalPoints)}/{Math.round(previewProjData.maxPoints)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Bar Chart Breakdown */}
                            <div style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '80px', borderBottom: '1px solid #D1D5DB', paddingBottom: '4px', width: '100%' }}>
                                {previewProjData.breakdown.map((item, idx) => {
                                  const percent = item.allocated > 0 ? Math.min(100, Math.round((item.achieved / item.allocated) * 100)) : 0;
                                  const barColor = previewProjData.percentage >= 80 ? '#10B981' : 
                                                   previewProjData.percentage >= 60 ? '#F59E0B' : 
                                                   previewProjData.percentage >= 40 ? '#EA580C' : '#97542A';
                                  return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                      <div style={{ fontSize: 6, fontWeight: 700, color: '#374151', marginBottom: 1 }}>{percent}%</div>
                                      <div style={{ width: 12, height: 50, background: '#E5E7EB', borderRadius: '2px 2px 0 0', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{
                                          position: 'absolute',
                                          bottom: 0,
                                          left: 0,
                                          right: 0,
                                          height: `${percent}%`,
                                          background: barColor,
                                          borderRadius: '1px 1px 0 0'
                                        }} />
                                      </div>
                                      <div style={{ fontSize: 6, fontWeight: 900, color: '#4B5563', marginTop: 3, textAlign: 'center', lineHeight: 1 }}>
                                        <div>{idx + 1}.</div>
                                        <div style={{ fontWeight: 800 }}>{item.abbr}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Watermark & Achieved Badges Row */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px 0', position: 'relative', width: '100%' }}>
                      
                      {/* Faded Watermark Background (HBRI silhouette) positioned lower center */}
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '260px',
                        height: '260px',
                        opacity: previewProjData.watermarkOpacity !== undefined ? previewProjData.watermarkOpacity : 0.05,
                        backgroundImage: `url(${previewProjData.watermarkUrl || '/images/0_HBRI_Picture3-removebg-preview.png'})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        pointerEvents: 'none',
                        zIndex: 0
                      }} />

                      <div style={{ display: 'flex', gap: 35, position: 'relative', padding: '15px 0 5px', zIndex: 1 }}>
                        {['D', 'E', 'S', 'H'].map((letter) => {
                          const badgeConfig = {
                            D: { color: '#97542A', dark: '#78350F' },
                            E: { color: '#EA580C', dark: '#9A3412' },
                            S: { color: '#F59E0B', dark: '#92400E' },
                            H: { color: '#10B981', dark: '#145C28' }
                          };
                          const c = badgeConfig[letter];
                          const activeCircle = previewProjData.percentage >= 80 ? 'H' : 
                                              previewProjData.percentage >= 60 ? 'S' : 
                                              previewProjData.percentage >= 40 ? 'E' : 'D';
                          const isSelected = activeCircle === letter;
                          return (
                            <div key={letter} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                              {isSelected && (
                                <div style={{ position: 'absolute', top: -20, fontSize: 8, fontWeight: 900, color: '#111827', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 60 }}>
                                  <span style={{ fontSize: 7, letterSpacing: '0.05em' }}>ACHIEVED</span>
                                  <span>▼</span>
                                </div>
                              )}
                              <svg viewBox="0 0 80 100" width="30" height="38" xmlns="http://www.w3.org/2000/svg" style={{ filter: isSelected ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' : 'none' }}>
                                <path d="M40 8 C12 22 7 58 40 96 C73 58 68 22 40 8Z" fill={isSelected ? c.color : '#E5E7EB'} />
                                <path d="M40 8 C30 18 22 35 25 55 C30 40 36 25 40 8Z" fill="rgba(255,255,255,0.18)" />
                                <text x="40" y="55" fill={isSelected ? '#ffffff' : '#9CA3AF'} fontSize="20" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontFamily="'Montserrat', sans-serif">
                                  {letter}
                                </text>
                              </svg>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Historical comparison logs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: '5px 0', alignItems: 'center' }}>
                      {(previewProjData.historicalScores || []).map((h, idx) => (
                        <div key={idx} style={{ fontSize: 9, color: '#4B5563', fontFamily: 'monospace', fontWeight: 600 }}>
                          {h.label}: {h.leafLevel}; SCORE {Math.round(h.scorePercent)}% ({Math.round(h.totalPoints)}/{Math.round(h.maxPoints)} PTS)
                        </div>
                      ))}
                    </div>

                    {/* Cryptographic QR code & Verification Signatures */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
                      {previewProjData.qrCodeDataUrl && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <img 
                            src={previewProjData.qrCodeDataUrl} 
                            alt="Verification QR Code" 
                            style={{ width: 65, height: 65, objectFit: 'contain' }} 
                          />
                        </div>
                      )}
                    </div>

                    {/* Footer Info Signoff */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 8, fontWeight: 700, color: '#374151', borderTop: '1px dashed #D1D5DB', paddingTop: 8, margin: '4px 0' }}>
                      <span>DATE OF ISSUE: {new Date(previewProjData.issuedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      <span>|</span>
                      <span>VALID TILL: {new Date(previewProjData.expiryAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      <span>|</span>
                      <span>SERIAL NO: {previewProjData.serialNumber}</span>
                    </div>

                    {/* Institutional Partner Row Footer */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid #E5E7EB', paddingTop: 8, margin: '2px 0' }}>
                      <div style={{ fontSize: 7, fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                        {previewProjData.labelPartners || 'Institutional Partners & Supporters'}
                      </div>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center' }}>
                        {(previewProjData.partnerLogos || '').split(',').map(s => s.trim()).filter(Boolean).map((logo, idx) => (
                          <img 
                            key={idx} 
                            src={logo} 
                            alt="" 
                            style={{ height: 24, objectFit: 'contain' }} 
                          />
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
