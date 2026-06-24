import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';
import { LeafBadge } from '../../components/shared/LeafLogo.jsx';

export default function ManagerSubmissions() {
  const axiosSecure = useAxiosSecure();
  const [submissions, setSubmissions] = useState([]);
  const [staff, setStaff] = useState([]); // Reviewers & Assessors
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('all');

  // Modals state
  const [assignProj, setAssignProj] = useState(null); // Project object to assign staff
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [selectedAssessor, setSelectedAssessor] = useState('');
  
  const [progressProj, setProgressProj] = useState(null); // Project object to show progress
  const [progressData, setProgressData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

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
      const res = await axiosSecure.get('/users');
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
    setSelectedReviewer(proj.assignedReviewer?._id || '');
    setSelectedAssessor(proj.assignedAssessor?._id || '');
  };

  const saveAssignments = async () => {
    if (!assignProj) return;
    try {
      await axiosSecure.patch(`/submissions/${assignProj._id}/assign`, {
        assignedReviewer: selectedReviewer || null,
        assignedAssessor: selectedAssessor || null,
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

  const reviewers = staff.filter(u => u.role === 'desh_reviewer' || u.role === 'reviewer');
  const assessors = staff.filter(u => u.role === 'desh_assessor');

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
          <button onClick={() => setManagerFilter('all')} 
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s', cursor: 'pointer', border: 'none',
              background: managerFilter === 'all' ? 'var(--g600)' : '#1F2937',
              color: '#FFF'
            }}>
            All Submissions
          </button>
          <button onClick={() => setManagerFilter('unassigned_reviewer')} 
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s', cursor: 'pointer', border: 'none',
              background: managerFilter === 'unassigned_reviewer' ? 'var(--g600)' : '#1F2937',
              color: '#FFF'
            }}>
            Unassigned Reviewer
          </button>
          <button onClick={() => setManagerFilter('assigned_reviewer')} 
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s', cursor: 'pointer', border: 'none',
              background: managerFilter === 'assigned_reviewer' ? 'var(--g600)' : '#1F2937',
              color: '#FFF'
            }}>
            Assigned Reviewer
          </button>
          <button onClick={() => setManagerFilter('unassigned_assessor')} 
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s', cursor: 'pointer', border: 'none',
              background: managerFilter === 'unassigned_assessor' ? 'var(--g600)' : '#1F2937',
              color: '#FFF'
            }}>
            Unassigned Assessor
          </button>
          <button onClick={() => setManagerFilter('assigned_assessor')} 
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s', cursor: 'pointer', border: 'none',
              background: managerFilter === 'assigned_assessor' ? 'var(--g600)' : '#1F2937',
              color: '#FFF'
            }}>
            Assigned Assessor
          </button>
        </div>
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Search by title, creator..."
          className="input-dark px-4 py-2 text-sm w-full max-w-xs"
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
        <div className="overflow-x-auto glass-card">
          <table className="w-full text-left border-collapse" style={{ minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Project Title</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Creator</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Score</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Leaf Level</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Reviewer / Status</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase">Assessor / Status</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid var(--border)' }} className="hover:bg-gray-800/10">
                  <td className="p-4 font-bold text-sm">{p.title}</td>
                  <td className="p-4">
                    <div className="text-sm font-semibold">{p.userId?.name || 'Anonymous'}</div>
                    <div className="text-xs text-gray-500">{p.userId?.email}</div>
                  </td>
                  <td className="p-4 text-center font-bold text-sm text-green-500">{p.scorePercent || 0}%</td>
                  <td className="p-4 text-center">
                    {p.leafLevel ? <LeafBadge level={p.leafLevel} /> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="p-4 text-sm">
                    {p.assignedReviewer ? (
                      <div>
                        <div className="font-semibold">{p.assignedReviewer.name}</div>
                        <span className={`inline-block text-2xs px-2 py-0.5 rounded-full font-bold mt-1 ${
                          p.reviewerStatus === 'Done' ? 'bg-green-900/40 text-green-400' :
                          p.reviewerStatus === 'Started' ? 'bg-amber-900/40 text-amber-400' : 'bg-gray-800 text-gray-400'
                        }`}>{p.reviewerStatus || 'Pending'}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic text-xs">Unassigned</span>
                    )}
                  </td>
                  <td className="p-4 text-sm">
                    {p.assignedAssessor ? (
                      <div>
                        <div className="font-semibold">{p.assignedAssessor.name}</div>
                        <span className={`inline-block text-2xs px-2 py-0.5 rounded-full font-bold mt-1 ${
                          p.assessorStatus === 'Done' ? 'bg-green-900/40 text-green-400' :
                          p.assessorStatus === 'Started' ? 'bg-amber-900/40 text-amber-400' : 'bg-gray-800 text-gray-400'
                        }`}>{p.assessorStatus || 'Pending'}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic text-xs">Unassigned</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openAssignModal(p)} className="text-xs px-3 py-1.5 rounded-lg border transition-all" style={{ background: '#1F2937', borderColor: '#374151', color: '#FFF', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#374151'} onMouseLeave={e => e.currentTarget.style.background = '#1F2937'}>
                        Assign Staff
                      </button>
                      <button onClick={() => openProgressModal(p)} className="btn-primary-green text-xs px-3 py-1.5 rounded-lg" style={{ cursor: 'pointer' }}>
                        View Progress
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

            {/* Reviewer Select */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                DESH Reviewer
              </label>
              <select
                value={selectedReviewer}
                onChange={e => setSelectedReviewer(e.target.value)}
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
                <option value="" style={{ background: '#091E11' }}>— Select Reviewer —</option>
                {reviewers.map(r => (
                  <option key={r._id} value={r._id} style={{ background: '#091E11' }}>{r.name} ({r.email})</option>
                ))}
              </select>
            </div>

            {/* Assessor Select */}
            <div className="mb-6">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                DESH Assessor
              </label>
              <select
                value={selectedAssessor}
                onChange={e => setSelectedAssessor(e.target.value)}
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
                <option value="" style={{ background: '#091E11' }}>— Select Assessor —</option>
                {assessors.map(a => (
                  <option key={a._id} value={a._id} style={{ background: '#091E11' }}>{a.name} ({a.email})</option>
                ))}
              </select>
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
                <div className="grid grid-cols-2 gap-4 bg-gray-900/40 p-4 border border-gray-800 rounded-xl mt-2 text-xs">
                  <div>
                    <span className="text-gray-500 uppercase font-semibold text-3xs tracking-widest block mb-1">Reviewer Workflow</span>
                    <span className={`inline-block text-2xs px-2 py-0.5 rounded-full font-bold ${
                      progressData.reviewerStatus === 'Done' ? 'bg-green-900/40 text-green-400' :
                      progressData.reviewerStatus === 'Started' ? 'bg-amber-900/40 text-amber-400' : 'bg-gray-800 text-gray-400'
                    }`}>{progressData.reviewerStatus || 'Pending'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase font-semibold text-3xs tracking-widest block mb-1">Assessor Workflow</span>
                    <span className={`inline-block text-2xs px-2 py-0.5 rounded-full font-bold ${
                      progressData.assessorStatus === 'Done' ? 'bg-green-900/40 text-green-400' :
                      progressData.assessorStatus === 'Started' ? 'bg-amber-900/40 text-amber-400' : 'bg-gray-800 text-gray-400'
                    }`}>{progressData.assessorStatus || 'Pending'}</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-10 text-sm text-red-500">Failed to load metrics</div>
            )}

            <div className="flex justify-end">
              <button onClick={() => setProgressProj(null)} className="btn-primary-green text-sm px-4 py-2">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
