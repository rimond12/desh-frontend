import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';
import { LeafBadge, ColoredLeaf } from '../../components/shared/LeafLogo.jsx';
import html2pdf from 'html2pdf.js';

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
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
                            onClick={() => startCertificateFlow(p._id)} 
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
      {/* Certificate Preview Modal (Read-Only / Approve-Only for Manager) */}
      {previewModalOpen && previewProjData && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', zIndex: 100,
          backdropFilter: 'blur(8px)', padding: '20px 16px', overflowY: 'auto',
        }}>
          {/* Modal Header Controls */}
          <div className="glass-card w-full max-w-2xl p-4 mb-4 flex justify-between items-center sticky top-0" style={{ background: '#091E11', border: '1.5px solid var(--border-md)', zIndex: 110 }}>
            <div>
              <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: '#FFF' }} className="text-sm font-bold">Certificate Preview</h2>
              <p className="text-3xs text-gray-400">Review the generated layout. Only Admins can modify these fields.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPreviewModalOpen(false); setPreviewProjData(null); }} className="text-2xs px-3 py-1.5 rounded-lg border font-bold transition-all" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: '#FFF', cursor: 'pointer' }}>
                Cancel
              </button>
              <button 
                onClick={approveAndPublishCertificate} 
                disabled={generatingPdf} 
                className="btn-primary-green text-2xs px-4 py-1.5 font-bold flex items-center gap-1" 
                style={{ cursor: 'pointer' }}
              >
                {generatingPdf ? 'Generating PDF...' : '✓ Generate & Approve'}
              </button>
            </div>
          </div>

          {/* Centered Preview Card */}
          <div style={{ flex: '0 0 794px', height: '955px', overflow: 'hidden', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', background: '#fff', marginBottom: 40 }}>
            <div 
              style={{
                transform: 'scale(0.85)',
                transformOrigin: 'top center',
                width: '794px',
                height: '1123px',
              }}
            >
              {/* The exact A4 rendering area */}
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
      )}
    </Layout>
  );
}
