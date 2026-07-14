import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';
import { LeafBadge } from '../../components/shared/LeafLogo.jsx';
import CertificatePanel from '../admin/CertificatePanel.jsx';


// Multi-select searchable dropdown — allows selecting multiple users
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

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
        {label}
      </label>
      <div
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full px-3 py-2 text-sm flex justify-between items-center"
        style={{
          background: '#0D3B1A',
          border: '1.5px solid rgba(52, 201, 97, 0.3)',
          color: '#FFF',
          borderRadius: '10px',
          cursor: 'pointer',
          minHeight: '38px',
        }}
      >
        <span style={{ color: selectedOptions.length > 0 ? '#FFF' : 'rgba(255,255,255,0.4)', fontSize: 13, flex: 1 }}>
          {selectedOptions.length === 0
            ? placeholder
            : selectedOptions.map(o => o.label.split(' (')[0]).join(', ')}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34C961" strokeWidth="2.5" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
          background: '#091E11', border: '1.5px solid rgba(52, 201, 97, 0.4)',
          borderRadius: 12, zIndex: 110, padding: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.65)',
          display: 'flex', flexDirection: 'column'
        }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full px-3 py-1.5 text-xs mb-2"
            style={{
              background: '#04160B',
              border: '1px solid rgba(52, 201, 97, 0.25)',
              color: '#FFF',
              borderRadius: 8,
              outline: 'none',
            }}
            autoFocus
          />
          <div style={{ overflowY: 'auto', maxHeight: 180 }} className="custom-scrollbar">
            {/* Clear all option */}
            <div
              onClick={() => { onChange([]); }}
              className="px-3 py-2 text-xs hover:bg-green-950/40 rounded-lg cursor-pointer text-gray-400 italic"
            >
              — Clear selection —
            </div>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500 italic">No matches found</div>
            ) : (
              filteredOptions.map(o => {
                const isSelected = value.includes(o.value);
                return (
                  <div
                    key={o.value}
                    onClick={() => toggleOption(o.value)}
                    className="px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-all flex items-center gap-2"
                    style={{
                      background: isSelected ? 'rgba(52, 201, 97, 0.15)' : 'transparent',
                      color: isSelected ? '#34C961' : '#e5e7eb',
                    }}
                  >
                    <span style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      border: `2px solid ${isSelected ? '#34C961' : 'rgba(255,255,255,0.3)'}`,
                      background: isSelected ? '#34C961' : 'transparent',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && (
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    {o.label}
                  </div>
                );
              })
            )}
          </div>
          {selectedOptions.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(52,201,97,0.15)', padding: '6px 4px 2px', marginTop: 4 }} className="text-xs text-green-400">
              {selectedOptions.length} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default function ManagerSubmissions() {
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [staff, setStaff] = useState([]); // Reviewers & Assessors
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');

  // Modals state
  const [assignProj, setAssignProj] = useState(null); // Project object to assign staff
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [selectedAssessors, setSelectedAssessors] = useState([]);
  
  const [progressProj, setProgressProj] = useState(null); // Project object to show progress
  const [progressData, setProgressData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [previewProjData, setPreviewProjData] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

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

  const openAssignModal = (proj) => {
    setAssignProj(proj);
    // Support both populated objects and plain IDs in the array
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

  return (
    <Layout isManager>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8 fade-in-up">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Submissions Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>
            Oversee workflows, assign staff, and track submission progress
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={downloadReport} className="btn-primary-green text-sm flex items-center gap-2">
            📊 Download Consolidated Report
          </button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 glass-card p-4">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['all', 'unassigned_reviewer', 'assigned_reviewer', 'unassigned_assessor', 'assigned_assessor'].map(type => {
            const labels = {
              all: 'All Submissions',
              unassigned_reviewer: 'Unassigned Reviewer',
              assigned_reviewer: 'Assigned Reviewer',
              unassigned_assessor: 'Unassigned Assessor',
              assigned_assessor: 'Assigned Assessor'
            };
            const isActive = managerFilter === type;
            return (
              <button key={type} onClick={() => setManagerFilter(type)} 
                style={{
                  padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s', cursor: 'pointer',
                  border: isActive ? '1.5px solid var(--g600)' : '1.5px solid var(--border-md)',
                  background: isActive ? 'var(--g600)' : 'var(--bg-soft)',
                  color: isActive ? '#FFF' : 'var(--tx-2)'
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = 'var(--bg-subtle)';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = 'var(--bg-soft)';
                }}
              >
                {labels[type]}
              </button>
            );
          })}
        </div>
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Search by title, creator..."
          className="input-dark px-4 py-2 text-sm w-full max-w-xs"
          style={{ borderRadius: '11px' }}
        />
      </div>

      {/* Submissions list */}
      {loading ? (
        <div className="text-center py-20">Loading Submissions...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <p className="text-3xl mb-2">📋</p>
          <p style={{ color: 'var(--tx-muted)' }}>No submitted projects found matching the criteria.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="table-scroll">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Project Title</th>
                  <th>Creator</th>
                  <th className="text-center">Score</th>
                  <th className="text-center">Leaf Level</th>
                  <th>Reviewer / Status</th>
                  <th>Assessor / Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p._id}>
                    <td className="font-bold text-sm" style={{ color: 'var(--tx-2)' }}>{p.title}</td>
                    <td>
                      <div className="text-sm font-semibold">{p.userId?.name || 'Anonymous'}</div>
                      <div className="text-xs text-gray-500">{p.userId?.email}</div>
                    </td>
                    <td className="text-center font-bold text-sm text-green-600">{p.scorePercent || 0}%</td>
                    <td className="text-center">
                      {p.leafLevel ? <LeafBadge level={p.leafLevel} /> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="text-sm">
                      {p.assignedReviewers?.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {p.assignedReviewers.map((r, i) => {
                            const rStatus = p.reviewerStatuses?.find(s => String(s.userId) === String(r._id || r));
                            const st = rStatus?.status || 'Pending';
                            return (
                              <div key={r._id || i} className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold" style={{ color: 'var(--tx-2)' }}>{r.name || r}</span>
                                <span className={`inline-block text-2xs px-2 py-0.5 rounded-full font-bold ${
                                  st === 'Done' ? 'bg-green-900/10 text-green-600 border border-green-200' :
                                  st === 'Started' ? 'bg-amber-900/10 text-amber-600 border border-amber-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                                }`}>{st}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="text-sm">
                      {p.assignedAssessors?.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {p.assignedAssessors.map((a, i) => {
                            const aStatus = p.assessorStatuses?.find(s => String(s.userId) === String(a._id || a));
                            const st = aStatus?.status || 'Pending';
                            return (
                              <div key={a._id || i} className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold" style={{ color: 'var(--tx-2)' }}>{a.name || a}</span>
                                <span className={`inline-block text-2xs px-2 py-0.5 rounded-full font-bold ${
                                  st === 'Done' ? 'bg-green-900/10 text-green-600 border border-green-200' :
                                  st === 'Started' ? 'bg-amber-900/10 text-amber-600 border border-amber-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                                }`}>{st}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex gap-2 justify-end flex-wrap">
                        {p.project_status === 'REVIEW_COMPLETE' && (
                          <button 
                            onClick={() => startCertificateFlow(p)} 
                            className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                            style={{ background: 'linear-gradient(135deg,#047857,#10B981)', color: '#fff', border: 'none' }}
                          >
                            Analyze & Preview Cert
                          </button>
                        )}
                        {p.project_status === 'CERTIFICATE_ISSUED' && (
                          <button 
                            onClick={() => downloadCertificate(p._id, p.certificate_serial)} 
                            className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                            style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1D4ED8' }}
                          >
                            Download Cert
                          </button>
                        )}
                        <button 
                          onClick={() => navigate(`/reviewer/submissions/${p._id}`)} 
                          className="text-xs px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer" 
                          style={{ background: 'var(--bg-soft)', borderColor: 'var(--border-md)', color: 'var(--tx-2)' }} 
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; }} 
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)'; }}
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => openAssignModal(p)} 
                          className="text-xs px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer" 
                          style={{ background: 'var(--bg-soft)', borderColor: 'var(--border-md)', color: 'var(--tx-2)' }} 
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; }} 
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-soft)'; }}
                        >
                          Assign Staff
                        </button>
                        <button onClick={() => openProgressModal(p)} className="btn-primary-green text-xs px-3 py-1.5 rounded-lg font-bold" style={{ cursor: 'pointer' }}>
                          View Progress
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {assignProj && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          backdropFilter: 'blur(4px)', padding: 16,
        }}>
          <div className="glass-card w-full max-w-md p-6 fade-in-up" style={{ background: '#091E11', border: '1.5px solid var(--border-md)' }}>
            <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: '#FFF' }} className="text-xl font-bold mb-2">Assign Project Staff</h2>
            <p className="text-xs text-gray-400 mb-6">Project: <strong>{assignProj.title}</strong></p>

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
            <div className="mb-6">
              <MultiSearchableSelect
                label="DESH Assessor(s)"
                value={selectedAssessors}
                onChange={setSelectedAssessors}
                options={assessors.map(a => ({ value: a._id, label: `${a.name} (${a.email})` }))}
                placeholder="— Select Assessor(s) —"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setAssignProj(null)} className="text-sm px-4 py-2 rounded-xl border transition-all" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: '#FFF', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
                Cancel
              </button>
              <button onClick={saveAssignments} className="btn-primary-green text-sm px-4 py-2" style={{ cursor: 'pointer' }}>
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bars Modal */}
      {progressProj && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          backdropFilter: 'blur(4px)', padding: 16,
        }}>
          <div className="glass-card w-full max-w-lg p-6 fade-in-up" style={{ background: '#091E11', border: '1.5px solid var(--border-md)' }}>
            <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: '#FFF' }} className="text-xl font-bold mb-2">Submission Progress</h2>
            <p className="text-xs text-gray-400 mb-6">Project: <strong>{progressProj.title}</strong></p>

            {loadingProgress ? (
              <div className="text-center py-10 text-sm">Calculating progress metrics...</div>
            ) : progressData ? (
              <div className="flex flex-col gap-6 mb-6">
                
                {/* Answers / Uploads Progress */}
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span>Professional Input Completion</span>
                    <span>{progressData.filledPercent}%</span>
                  </div>
                  <div className="h-4 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progressData.filledPercent}%`, transition: 'width 0.4s' }}></div>
                  </div>
                  <div className="text-2xs text-gray-500 mt-1">
                    {progressData.answeredCount} of {progressData.totalInputsCount} questions completed
                  </div>
                </div>

                {/* Audit / Lock Checks Progress */}
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span>Structured Audit / Lock Checks</span>
                    <span>{progressData.lockedPercent}%</span>
                  </div>
                  <div className="h-4 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
                    <div className="h-full bg-green-600 rounded-full" style={{ width: `${progressData.lockedPercent}%`, transition: 'width 0.4s' }}></div>
                  </div>
                  <div className="text-2xs text-gray-500 mt-1">
                    {progressData.lockedCount} of {progressData.totalInputsCount} questions verified & locked
                  </div>
                </div>

                {/* Workflow Statuses info box */}
                <div className="bg-gray-900/40 p-4 border border-gray-800 rounded-xl mt-2 text-xs">
                  <div className="mb-3">
                    <span className="text-gray-500 uppercase font-semibold text-3xs tracking-widest block mb-2">Reviewer Workflow</span>
                    {progressData.reviewerStatuses?.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {progressData.reviewerStatuses.map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className={`inline-block text-2xs px-2 py-0.5 rounded-full font-bold ${
                              s.status === 'Done' ? 'bg-green-900/40 text-green-400' :
                              s.status === 'Started' ? 'bg-amber-900/40 text-amber-400' : 'bg-gray-800 text-gray-400'
                            }`}>{s.status || 'Pending'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">No reviewers assigned</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase font-semibold text-3xs tracking-widest block mb-2">Assessor Workflow</span>
                    {progressData.assessorStatuses?.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {progressData.assessorStatuses.map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className={`inline-block text-2xs px-2 py-0.5 rounded-full font-bold ${
                              s.status === 'Done' ? 'bg-green-900/40 text-green-400' :
                              s.status === 'Started' ? 'bg-amber-900/40 text-amber-400' : 'bg-gray-800 text-gray-400'
                            }`}>{s.status || 'Pending'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">No assessors assigned</span>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-10 text-sm text-red-500">Failed to load metrics</div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setProgressProj(null)} className="btn-primary-green text-sm px-4 py-2" style={{ cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Certificate Studio Panel (Manager view) */}
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
