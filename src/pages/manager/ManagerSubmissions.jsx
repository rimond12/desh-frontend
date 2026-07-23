import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';
import { LeafBadge } from '../../components/shared/LeafLogo.jsx';
import CertificatePanel from '../admin/CertificatePanel.jsx';
import {
  Search,
  Filter,
  AlertCircle,
  FileSpreadsheet,
  Eye,
  UserPlus,
  RotateCcw,
  BarChart3,
  Award,
  Download,
  X,
  Check,
  ChevronDown
} from 'lucide-react';

// Multi-select searchable dropdown — allows selecting multiple users (Light Theme)
function MultiSearchableSelect({ label, value = [], onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedOptions = options.filter(o => value.includes(o.value));
  const filteredOptions = options.filter(o =>
    o.label?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClose = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClose);
    return () => document.removeEventListener('mousedown', handleClose);
  }, []);

  const toggleOption = (optValue) => {
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const removeOption = (e, optValue) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== optValue));
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-2xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--tx-muted)' }}>
        {label}
      </label>

      {/* Selector Box */}
      <div
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full px-3 py-2 text-xs flex items-center justify-between min-h-[38px] rounded-xl transition-all cursor-pointer border bg-white"
        style={{
          borderColor: isOpen ? 'var(--g600)' : 'var(--border-md)',
          color: 'var(--tx)',
          boxShadow: isOpen ? 'var(--glow)' : 'var(--sh-xs)'
        }}
      >
        <div className="flex flex-wrap gap-1 items-center flex-1 pr-2">
          {selectedOptions.length === 0 ? (
            <span className="text-xs text-gray-400">{placeholder}</span>
          ) : (
            selectedOptions.map(o => (
              <span
                key={o.value}
                className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-md font-semibold"
                style={{ background: 'var(--g100)', border: '1px solid var(--g200)', color: 'var(--g800)' }}
              >
                <span>{o.label.split(' (')[0]}</span>
                <button
                  type="button"
                  onClick={(e) => removeOption(e, o.value)}
                  className="hover:text-red-600 transition-colors"
                >
                  <X size={11} />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown size={14} className={`text-emerald-600 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 p-2 rounded-xl z-50 border flex flex-col fade-in-up bg-white"
          style={{
            borderColor: 'var(--border-md)',
            boxShadow: 'var(--sh-lg)'
          }}
        >
          <div className="relative mb-1.5">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border outline-none bg-gray-50 text-gray-800 focus:bg-white focus:border-emerald-500"
              autoFocus
            />
          </div>

          <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-0.5">
            {selectedOptions.length > 0 && (
              <div
                onClick={() => onChange([])}
                className="px-2 py-1 text-2xs rounded-lg cursor-pointer text-red-600 hover:bg-red-50 flex items-center justify-between font-medium"
              >
                <span>Clear selection</span>
                <X size={11} />
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 italic text-center">No staff found</div>
            ) : (
              filteredOptions.map(o => {
                const isSelected = value.includes(o.value);
                return (
                  <div
                    key={o.value}
                    onClick={() => toggleOption(o.value)}
                    className="px-2 py-1.5 text-xs rounded-lg cursor-pointer transition-all flex items-center justify-between"
                    style={{
                      background: isSelected ? 'var(--g50)' : 'transparent',
                      color: isSelected ? 'var(--g800)' : 'var(--tx-2)',
                      fontWeight: isSelected ? 700 : 500
                    }}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div
                        className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          borderColor: isSelected ? 'var(--g600)' : 'var(--border-md)',
                          background: isSelected ? 'var(--g600)' : '#FFF',
                        }}
                      >
                        {isSelected && <Check size={9} className="text-white stroke-[3]" />}
                      </div>
                      <span className="truncate text-2xs">{o.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagerSubmissions() {
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');

  // Modals state
  const [assignProj, setAssignProj] = useState(null);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [selectedAssessors, setSelectedAssessors] = useState([]);

  const [progressProj, setProgressProj] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [previewProjData, setPreviewProjData] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const [stageProj, setStageProj] = useState(null);
  const [targetStage, setTargetStage] = useState('DESH Professional');

  const getCalculatedStage = (project) => {
    if (project.project_status === 'REVIEW_COMPLETE' || project.project_status === 'CERTIFICATE_ISSUED') {
      return 'Completed';
    }
    if (project.assignedAssessors?.length > 0) {
      return 'Assessor';
    }
    if (project.assignedReviewers?.length > 0) {
      return 'Reviewer';
    }
    return 'DESH Professional';
  };

  const openStageModal = (proj) => {
    setStageProj(proj);
    setTargetStage(proj.stage || getCalculatedStage(proj));
  };

  const saveStageChange = async () => {
    if (!stageProj) return;
    try {
      await axiosSecure.patch(`/submissions/${stageProj._id}/status`, {
        stage: targetStage
      });
      toast.success('Project stage updated successfully');
      setStageProj(null);
      fetchSubmissions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project stage');
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await axiosSecure.get(`/submissions?managerFilter=${managerFilter}`);
      setSubmissions(res.data.projects || []);
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await axiosSecure.get('/users?role=staff&isActive=true');
      setStaff(res.data.users || []);
    } catch {
      toast.error('Failed to load reviewers and assessors');
    }
  };

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerFilter]);

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const filtered = submissions.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.userId?.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Metrics for tab counts
  const metrics = {
    total: submissions.length,
    unassignedReviewer: submissions.filter(p => !p.assignedReviewers || p.assignedReviewers.length === 0).length,
    unassignedAssessor: submissions.filter(p => !p.assignedAssessors || p.assignedAssessors.length === 0).length,
    assignedReviewer: submissions.filter(p => p.assignedReviewers?.length > 0).length,
    assignedAssessor: submissions.filter(p => p.assignedAssessors?.length > 0).length,
  };

  const openAssignModal = (proj) => {
    setAssignProj(proj);
    setSelectedReviewers((proj.assignedReviewers || []).map(r => r._id || r));
    setSelectedAssessors((proj.assignedAssessors || []).map(a => a._id || a));
  };

  const saveAssignments = async () => {
    if (!assignProj) return;
    try {
      await axiosSecure.patch(`/submissions/${assignProj._id}/assign`, {
        assignedReviewers: selectedReviewers,
        assignedAssessors: selectedAssessors,
      });
      toast.success('Assignments updated successfully');
      setAssignProj(null);
      fetchSubmissions();
    } catch {
      toast.error('Failed to save assignments');
    }
  };

  const openProgressModal = async (proj) => {
    setProgressProj(proj);
    setLoadingProgress(true);
    setProgressData(null);
    try {
      const res = await axiosSecure.get(`/submissions/${proj._id}/progress`);
      setProgressData(res.data);
    } catch {
      toast.error('Failed to load progress data');
    } finally {
      setLoadingProgress(false);
    }
  };

  const startCertificateFlow = (proj) => {
    setPreviewProjData(proj);
    setPreviewModalOpen(true);
  };

  const downloadCertificate = (id, serial) => {
    axiosSecure.get(`/projects/${id}/certificate/download`, { responseType: 'blob' })
      .then((response) => {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Label-${serial || id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Label downloaded');
      })
      .catch(() => {
        toast.error('Failed to download label');
      });
  };

  const downloadReport = () => {
    axiosSecure.get('/submissions/consolidated-report', { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'desh_consolidated_report.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Report downloaded');
      })
      .catch(() => {
        toast.error('Failed to download report');
      });
  };

  const reviewers = staff.filter(u => (u.roles || []).includes('desh_reviewer'));
  const assessors = staff.filter(u => (u.roles || []).includes('desh_assessor'));

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  };

  // Helper for small, clean stage badge
  const renderStageBadge = (stage) => {
    const config = {
      Completed: { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
      Assessor: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
      Reviewer: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
      'DESH Professional': { bg: '#F3E8FF', color: '#7E22CE', border: '#E9D5FF' },
    };
    const c = config[stage] || config['DESH Professional'];

    return (
      <span
        className="inline-flex items-center font-semibold border shrink-0 rounded-md"
        style={{
          background: c.bg,
          color: c.color,
          borderColor: c.border,
          fontSize: '9.5px',
          padding: '1px 6px',
          lineHeight: '1.2'
        }}
      >
        {stage}
      </span>
    );
  };

  return (
    <Layout isManager>
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 fade-in-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Submissions Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-0.5" style={{ color: 'var(--tx-muted)' }}>
            Oversee workflows, assign review staff, track progress, and issue certificates.
          </p>
        </div>

        <button
          onClick={downloadReport}
          className="btn-primary-green text-xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <FileSpreadsheet size={15} />
          <span>Download Consolidated Report</span>
        </button>
      </div>

      {/* ── Filters & Search Controls ─────────────────────────── */}
      <div className="glass-card p-3 sm:p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 fade-in-up">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {[
            { id: 'all', label: 'All Submissions', count: metrics.total },
            { id: 'unassigned_reviewer', label: 'Unassigned Reviewer', count: metrics.unassignedReviewer },
            { id: 'assigned_reviewer', label: 'Assigned Reviewer', count: metrics.assignedReviewer },
            { id: 'unassigned_assessor', label: 'Unassigned Assessor', count: metrics.unassignedAssessor },
            { id: 'assigned_assessor', label: 'Assigned Assessor', count: metrics.assignedAssessor },
          ].map(tab => {
            const isActive = managerFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setManagerFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                  isActive
                    ? 'bg-[var(--g600)] text-white border-transparent shadow-xs'
                    : 'bg-white text-[var(--tx-2)] border-[var(--border-md)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-3xs font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[var(--g100)] text-[var(--g800)]'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search title, creator..."
            className="input-dark pl-8 pr-7 py-1.5 text-xs w-full bg-white border border-[var(--border-md)] text-[var(--tx)] rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Submissions Table & Mobile View ─────────────────────── */}
      {loading ? (
        <div className="glass-card p-12 text-center text-gray-500 fade-in-up">
          <div className="w-7 h-7 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto mb-2" />
          <p className="text-xs font-semibold">Loading submissions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-500 fade-in-up">
          <Filter size={32} className="mx-auto mb-2 text-emerald-600/40" />
          <h3 className="text-base font-bold text-gray-800 mb-1">No Submissions Found</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto mb-3">
            No projects found matching the current search or filter criteria.
          </p>
          {(managerFilter !== 'all' || search !== '') && (
            <button
              onClick={() => { setManagerFilter('all'); setSearch(''); }}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (hidden on mobile < 768px) */}
          <div className="glass-card overflow-hidden hidden md:block fade-in-up">
            <div className="table-scroll">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Project Title & Stage</th>
                    <th>Creator</th>
                    <th className="text-center">Score</th>
                    <th className="text-center">Leaf Level</th>
                    <th>Reviewer / Status</th>
                    <th>Assessor / Status</th>
                    <th className="text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const currentStage = p.stage || getCalculatedStage(p);
                    return (
                      <tr key={p._id} className="hover:bg-[var(--g50)] transition-colors">
                        {/* Title & Stage */}
                        <td>
                          <div className="font-bold text-xs text-gray-900 mb-1 line-clamp-1">{p.title}</div>
                          <div>{renderStageBadge(currentStage)}</div>
                        </td>

                        {/* Creator Info */}
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[var(--g100)] border border-[var(--g200)] flex items-center justify-center text-3xs font-bold text-[var(--g800)] shrink-0">
                              {getInitials(p.userId?.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-gray-900 truncate">{p.userId?.name || 'Anonymous'}</div>
                              <div className="text-3xs text-gray-500 truncate">{p.userId?.email || 'No email'}</div>
                            </div>
                          </div>
                        </td>

                        {/* Score */}
                        <td className="text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.scorePercent || 0}%
                          </span>
                        </td>

                        {/* Leaf Level */}
                        <td className="text-center">
                          {p.leafLevel ? <LeafBadge level={p.leafLevel} /> : <span className="text-gray-400 text-xs italic">—</span>}
                        </td>

                        {/* Reviewer / Status */}
                        <td className="text-xs">
                          {p.assignedReviewers?.length > 0 ? (
                            <div className="space-y-1">
                              {p.assignedReviewers.map((r, i) => {
                                const rStatus = p.reviewerStatuses?.find(s => String(s.userId) === String(r._id || r));
                                const st = rStatus?.status || 'Pending';
                                return (
                                  <div key={r._id || i} className="flex items-center gap-1.5">
                                    <span className="font-medium text-xs text-gray-800">{r.name || r}</span>
                                    <span
                                      className={`rounded-md font-semibold border ${
                                        st === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        st === 'Started' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                                      }`}
                                      style={{ fontSize: '9px', padding: '1px 5px', textTransform: 'capitalize' }}
                                    >
                                      {st}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-amber-600 italic text-xs flex items-center gap-1">
                              <AlertCircle size={11} /> Unassigned
                            </span>
                          )}
                        </td>

                        {/* Assessor / Status */}
                        <td className="text-xs">
                          {p.assignedAssessors?.length > 0 ? (
                            <div className="space-y-1">
                              {p.assignedAssessors.map((a, i) => {
                                const aStatus = p.assessorStatuses?.find(s => String(s.userId) === String(a._id || a));
                                const st = aStatus?.status || 'Pending';
                                return (
                                  <div key={a._id || i} className="flex items-center gap-1.5">
                                    <span className="font-medium text-xs text-gray-800">{a.name || a}</span>
                                    <span
                                      className={`rounded-md font-semibold border ${
                                        st === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        st === 'Started' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                                      }`}
                                      style={{ fontSize: '9px', padding: '1px 5px', textTransform: 'capitalize' }}
                                    >
                                      {st}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-blue-600 italic text-xs flex items-center gap-1">
                              <AlertCircle size={11} /> Unassigned
                            </span>
                          )}
                        </td>

                        {/* Actions — Icon with text on left, Icon-only on right */}
                        <td className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 👥 Assign Staff: Icon + Text */}
                            <button
                              onClick={() => openAssignModal(p)}
                              className="px-2.5 py-1.5 text-3xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                              title="Assign Staff"
                            >
                              <UserPlus size={13} className="text-blue-600" />
                              <span>Assign Staff</span>
                            </button>

                            {/* 🔄 Revert Stage: Icon + Text */}
                            <button
                              onClick={() => openStageModal(p)}
                              className="px-2.5 py-1.5 text-3xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                              title="Revert Stage"
                            >
                              <RotateCcw size={13} className="text-amber-600" />
                              <span>Revert Stage</span>
                            </button>

                            {/* 📜 Preview Cert: Icon + Small Text */}
                            {p.project_status === 'REVIEW_COMPLETE' && (
                              <button
                                onClick={() => startCertificateFlow(p)}
                                className="px-2.5 py-1.5 text-3xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                                title="Preview Certificate"
                              >
                                <Award size={13} />
                                <span>Preview Cert</span>
                              </button>
                            )}

                            {/* 📥 Download Cert: Icon + Small Text */}
                            {p.project_status === 'CERTIFICATE_ISSUED' && (
                              <button
                                onClick={() => downloadCertificate(p._id, p.certificate_serial)}
                                className="px-2.5 py-1.5 text-3xs font-bold rounded-lg text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                title="Download Label PDF"
                              >
                                <Download size={13} />
                                <span>Download Cert</span>
                              </button>
                            )}

                            {/* 👁️ View: Icon ONLY (Right side) */}
                            <button
                              onClick={() => navigate(`/reviewer/submissions/${p._id}`)}
                              className="p-1.5 rounded-lg border border-gray-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center cursor-pointer shrink-0"
                              title="View Details"
                            >
                              <Eye size={14} />
                            </button>

                            {/* 📊 View Progress: Icon ONLY (Right side) */}
                            <button
                              onClick={() => openProgressModal(p)}
                              className="p-1.5 rounded-lg border border-gray-200 bg-white text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-all flex items-center justify-center cursor-pointer shrink-0"
                              title="View Progress"
                            >
                              <BarChart3 size={14} />
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

          {/* MOBILE CARDS VIEW (visible on mobile < 768px) */}
          <div className="grid grid-cols-1 gap-3 md:hidden fade-in-up">
            {filtered.map(p => {
              const currentStage = p.stage || getCalculatedStage(p);
              return (
                <div
                  key={p._id}
                  className="card p-4 flex flex-col gap-3 rounded-xl border bg-white"
                >
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{p.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderStageBadge(currentStage)}
                        <span className="text-2xs font-bold text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                          Score: {p.scorePercent || 0}%
                        </span>
                      </div>
                    </div>
                    {p.leafLevel && (
                      <div className="shrink-0">
                        <LeafBadge level={p.leafLevel} />
                      </div>
                    )}
                  </div>

                  {/* Creator Info */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-soft)] border border-[var(--border)]">
                    <div className="w-6 h-6 rounded-full bg-[var(--g100)] border border-[var(--g200)] flex items-center justify-center text-3xs font-bold text-[var(--g800)] shrink-0">
                      {getInitials(p.userId?.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-800 truncate">{p.userId?.name || 'Anonymous'}</div>
                      <div className="text-3xs text-gray-500 truncate">{p.userId?.email || 'No email'}</div>
                    </div>
                  </div>

                  {/* Reviewer / Assessor Summary */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="text-3xs font-bold uppercase text-gray-500 mb-1">Reviewers</div>
                      {p.assignedReviewers?.length > 0 ? (
                        <div className="space-y-0.5">
                          {p.assignedReviewers.map((r, i) => (
                            <div key={i} className="text-3xs font-semibold text-gray-700 truncate">{r.name || 'Reviewer'}</div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-amber-600 text-3xs italic">Unassigned</span>
                      )}
                    </div>

                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="text-3xs font-bold uppercase text-gray-500 mb-1">Assessors</div>
                      {p.assignedAssessors?.length > 0 ? (
                        <div className="space-y-0.5">
                          {p.assignedAssessors.map((a, i) => (
                            <div key={i} className="text-3xs font-semibold text-gray-700 truncate">{a.name || 'Assessor'}</div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-blue-600 text-3xs italic">Unassigned</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Grid Bar (Mobile) */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/reviewer/submissions/${p._id}`)}
                      className="btn-secondary text-2xs p-2 justify-center"
                      title="View Details"
                    >
                      <Eye size={14} className="text-emerald-600" />
                    </button>

                    <button
                      onClick={() => openAssignModal(p)}
                      className="btn-secondary text-3xs p-1.5 justify-center col-span-1"
                      title="Assign Staff"
                    >
                      <UserPlus size={13} className="text-blue-600" />
                    </button>

                    <button
                      onClick={() => openStageModal(p)}
                      className="btn-secondary text-3xs p-1.5 justify-center col-span-1"
                      title="Revert Stage"
                    >
                      <RotateCcw size={13} className="text-amber-600" />
                    </button>

                    <button
                      onClick={() => openProgressModal(p)}
                      className="btn-secondary text-2xs p-2 justify-center"
                      title="View Progress"
                    >
                      <BarChart3 size={14} className="text-purple-600" />
                    </button>

                    {p.project_status === 'REVIEW_COMPLETE' && (
                      <button
                        onClick={() => startCertificateFlow(p)}
                        className="col-span-4 btn-primary-green text-3xs py-1.5 px-2 justify-center"
                      >
                        <Award size={13} />
                        <span>Preview Cert</span>
                      </button>
                    )}

                    {p.project_status === 'CERTIFICATE_ISSUED' && (
                      <button
                        onClick={() => downloadCertificate(p._id, p.certificate_serial)}
                        className="col-span-4 btn-secondary text-3xs py-1.5 px-2 justify-center text-blue-700 bg-blue-50"
                      >
                        <Download size={13} />
                        <span>Download Cert</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Assign Staff Modal (Light Theme) ───────────────────── */}
      {assignProj && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 fade-in">
          <div className="w-full max-w-md p-5 rounded-2xl border bg-white shadow-xl fade-in-up" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <UserPlus size={18} className="text-emerald-600" />
                <span>Assign Project Staff</span>
              </h2>
              <button
                onClick={() => setAssignProj(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Project: <strong className="text-gray-900">{assignProj.title}</strong>
            </p>

            {/* Reviewer Multi-Select */}
            <div className="mb-4">
              <MultiSearchableSelect
                label="DESH Reviewer(s)"
                value={selectedReviewers}
                onChange={setSelectedReviewers}
                options={reviewers.map(r => ({ value: r._id, label: `${r.name} (${r.email})` }))}
                placeholder="— Select Reviewer(s) —"
              />
            </div>

            {/* Assessor Multi-Select */}
            <div className="mb-5">
              <MultiSearchableSelect
                label="DESH Assessor(s)"
                value={selectedAssessors}
                onChange={setSelectedAssessors}
                options={assessors.map(a => ({ value: a._id, label: `${a.name} (${a.email})` }))}
                placeholder="— Select Assessor(s) —"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setAssignProj(null)}
                className="btn-secondary text-xs px-3.5 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={saveAssignments}
                className="btn-primary-green text-xs px-4 py-1.5"
              >
                <Check size={13} />
                <span>Save Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submission Progress Modal (Light Theme) ────────────── */}
      {progressProj && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 fade-in">
          <div className="w-full max-w-lg p-5 rounded-2xl border bg-white shadow-xl fade-in-up" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <BarChart3 size={18} className="text-purple-600" />
                <span>Submission Progress</span>
              </h2>
              <button
                onClick={() => setProgressProj(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Project: <strong className="text-gray-900">{progressProj.title}</strong>
            </p>

            {loadingProgress ? (
              <div className="text-center py-10 text-xs text-gray-500 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Calculating metrics...</span>
              </div>
            ) : progressData ? (
              <div className="space-y-4 mb-5">
                {/* Professional Input Completion */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex justify-between text-xs font-bold text-gray-800 mb-1.5">
                    <span>Professional Input Completion</span>
                    <span className="text-blue-600 font-extrabold">{progressData.filledPercent}%</span>
                  </div>
                  <div className="progress-leaf">
                    <div className="progress-leaf-fill bg-blue-600" style={{ width: `${progressData.filledPercent}%` }} />
                  </div>
                  <div className="text-3xs text-gray-500 mt-1.5">
                    {progressData.answeredCount} of {progressData.totalInputsCount} questions completed
                  </div>
                </div>

                {/* Audit Checks */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex justify-between text-xs font-bold text-gray-800 mb-1.5">
                    <span>Structured Audit Checks</span>
                    <span className="text-emerald-600 font-extrabold">{progressData.lockedPercent}%</span>
                  </div>
                  <div className="progress-leaf">
                    <div className="progress-leaf-fill" style={{ width: `${progressData.lockedPercent}%` }} />
                  </div>
                  <div className="text-3xs text-gray-500 mt-1.5">
                    {progressData.lockedCount} of {progressData.totalInputsCount} questions verified & locked
                  </div>
                </div>

                {/* Workflow Statuses */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-3">
                  <div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Reviewer Workflow</span>
                    {progressData.reviewerStatuses?.length > 0 ? (
                      <div className="space-y-1">
                        {progressData.reviewerStatuses.map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-800">{s.userName || `Reviewer #${i + 1}`}</span>
                            <span className={`px-2 py-0.2 rounded-full text-3xs font-bold ${
                              s.status === 'Done' ? 'bg-emerald-100 text-emerald-800' :
                              s.status === 'Started' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-600'
                            }`}>{s.status || 'Pending'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">No reviewers assigned</span>
                    )}
                  </div>

                  <div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Assessor Workflow</span>
                    {progressData.assessorStatuses?.length > 0 ? (
                      <div className="space-y-1">
                        {progressData.assessorStatuses.map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-800">{s.userName || `Assessor #${i + 1}`}</span>
                            <span className={`px-2 py-0.2 rounded-full text-3xs font-bold ${
                              s.status === 'Done' ? 'bg-emerald-100 text-emerald-800' :
                              s.status === 'Started' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-600'
                            }`}>{s.status || 'Pending'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">No assessors assigned</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl mb-4">
                Failed to load metrics.
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setProgressProj(null)}
                className="btn-primary-green text-xs px-4 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Certificate Studio Panel ──────────────────────────── */}
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

      {/* ── Revert Stage Modal (Light Theme) ───────────────────── */}
      {stageProj && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 fade-in">
          <div className="w-full max-w-md p-5 rounded-2xl border bg-white shadow-xl fade-in-up" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <RotateCcw size={18} className="text-amber-600" />
                <span>Revert / Change Stage</span>
              </h2>
              <button
                onClick={() => setStageProj(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Project: <strong className="text-gray-900">{stageProj.title}</strong>
            </p>

            <div className="mb-3">
              <label className="block text-2xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Current Stage
              </label>
              <div className="w-full px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-800 border border-gray-200 font-semibold">
                {stageProj.stage || getCalculatedStage(stageProj)}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-2xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Select Target Stage
              </label>
              <select
                value={targetStage}
                onChange={e => setTargetStage(e.target.value)}
                className="input-field text-xs py-1.5"
              >
                <option value="DESH Professional">DESH Professional</option>
                <option value="Reviewer">Reviewer</option>
                <option value="Assessor">Assessor</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Warning Callout Box */}
            <div className="p-3 mb-4 rounded-xl text-xs bg-amber-50 border border-amber-200 text-amber-900">
              <p className="font-extrabold mb-1 flex items-center gap-1.5 text-amber-900 text-2xs">
                <AlertCircle size={13} />
                <span>Rollback Implications:</span>
              </p>
              {targetStage === 'DESH Professional' && (
                <ul className="list-disc list-inside space-y-0.5 text-3xs text-amber-800">
                  <li>Reviewer & Assessor assignments cleared.</li>
                  <li>Statuses and lock checkmarks reset.</li>
                  <li>Questionnaire data is preserved.</li>
                </ul>
              )}
              {targetStage === 'Reviewer' && (
                <ul className="list-disc list-inside space-y-0.5 text-3xs text-amber-800">
                  <li>Assessor assignments cleared.</li>
                  <li>Reviewer assignments preserved.</li>
                </ul>
              )}
              {targetStage === 'Assessor' && (
                <ul className="list-disc list-inside space-y-0.5 text-3xs text-amber-800">
                  <li>Reviewer & Assessor assignments preserved.</li>
                </ul>
              )}
              {targetStage === 'Completed' && (
                <ul className="list-disc list-inside space-y-0.5 text-3xs text-amber-800">
                  <li>Marked as complete & locked for certificate.</li>
                </ul>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setStageProj(null)}
                className="btn-secondary text-xs px-3.5 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={saveStageChange}
                className="btn-primary-green text-xs px-4 py-1.5"
              >
                <Check size={13} />
                <span>Confirm Change</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
