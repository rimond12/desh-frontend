import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { ColoredLeaf, LeafBadge } from '../../components/shared/LeafLogo.jsx';
import CommentThread from '../../components/shared/CommentThread.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const SERVER_BASE = 'http://localhost:5000';

const STATUS_CFG = {
  under_review: { label: 'Under Review', color: '#92400E', bg: '#FEF9C3', border: '#FDE68A', dot: '#D97706' },
  verified:     { label: 'Verified',     color: '#145C28', bg: '#D6F5E3', border: '#A8EFC0', dot: '#22A84B' },
  cancelled:    { label: 'Cancelled',    color: '#991B1B', bg: '#FEE2E2', border: '#FECACA', dot: '#EF4444' },
};

function calcInputMax(inp) {
  if (inp.inputType === 'number' && inp.line)
    return Math.max(Number(inp.line.y1 || 0), Number(inp.line.y2 || 0));
  if (inp.inputType === 'checkbox' && inp.options?.length)
    return inp.options.reduce((t, o) => t + (o.points || 0), 0);
  return 0;
}

function calcSectionData(sectionId, tabs) {
  let earned = 0, max = 0;
  (tabs || []).forEach(tab =>
    (tab.modules || []).forEach(mod =>
      (mod.inputs || []).forEach(inp => {
        if (String(inp.sectionId) === String(sectionId)) {
          earned += inp.points || 0;
          max    += calcInputMax(inp);
        }
      })
    )
  );
  const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
  return { earned, max, pct };
}

function getLeafLevel(pct, rules) {
  return rules.find(r => pct >= r.minPercent && pct <= r.maxPercent) || null;
}

function getDownloadUrl(doc) {
  if (doc.filename) return `${SERVER_BASE}/uploads/documents/${doc.filename}`;
  if (doc.path)     return `${SERVER_BASE}/${doc.path.replace(/\\/g, '/')}`;
  return null;
}

// ── Input type badge colors ───────────────────────────────────────
const TYPE_STYLE = {
  number:   { bg: '#EFF6FF', color: '#1D4ED8' },
  text:     { bg: 'var(--g50)', color: 'var(--g700)' },
  checkbox: { bg: '#FEF9C3', color: '#92400E' },
  file:     { bg: '#F5F0E8', color: '#78350F' },
};

export default function ReviewerSubmissionDetail() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const { dbUser }  = useAuth();

  const [project, setProject]               = useState(null);
  const [tabs, setTabs]                     = useState([]);
  const [globalSections, setGlobalSections] = useState([]);
  const [leafRules, setLeafRules]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selectedSection, setSelectedSection] = useState('');
  const [locking, setLocking]               = useState(false);
  // comment counts per inputId (pre-fetched for badges)
  const [commentCounts, setCommentCounts]   = useState({});
  // per-question locked inputs (updated live when reviewer posts a comment)
  const [lockedInputsSet, setLockedInputsSet] = useState(new Set());

  useEffect(() => {
    Promise.all([
      axiosSecure.get(`/submissions/${id}/detail`),
      axiosSecure.get('/sections'),
      axiosSecure.get('/settings/eval-rules'),
      axiosSecure.get(`/comments/by-project/${id}`),
    ])
      .then(([detailRes, secRes, rulesRes, commentsRes]) => {
        setProject(detailRes.data.project);
        setTabs(detailRes.data.tabs || []);
        setGlobalSections(secRes.data.sections || []);
        setLeafRules(rulesRes.data.rules || []);
        setLockedInputsSet(new Set((detailRes.data.project.lockedInputs || []).map(String)));
        const counts = {};
        (commentsRes.data.comments || []).forEach(c => {
          const key = String(c.inputId);
          counts[key] = (counts[key] || 0) + 1;
        });
        setCommentCounts(counts);
      })
      .catch(() => toast.error('Failed to load submission'))
      .finally(() => setLoading(false));
  }, [id]);

  const [togglingInput, setTogglingInput] = useState(null); // inputId currently being toggled

  const toggleInputLock = async (inputId, currentlyLocked) => {
    setTogglingInput(String(inputId));
    const endpoint = currentlyLocked ? 'unlock-input' : 'lock-input';
    try {
      const res = await axiosSecure.post(`/submissions/${id}/${endpoint}`, { inputId });
      setLockedInputsSet(new Set((res.data.lockedInputs || []).map(String)));
      toast.success(currentlyLocked ? 'Question unlocked.' : 'Question locked.');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to update lock'); }
    finally { setTogglingInput(null); }
  };

  const lockSubmission = async () => {
    if (!window.confirm('Submit your review and LOCK this submission? The user will no longer be able to edit it.')) return;
    setLocking(true);
    try {
      const res = await axiosSecure.post(`/submissions/${id}/lock`);
      setProject(res.data.project);
      toast.success('Review submitted! Submission is now locked.');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to lock'); }
    finally { setLocking(false); }
  };

  const unlockSubmission = async () => {
    if (!window.confirm('Unlock this submission? The user will be able to edit it again.')) return;
    try {
      const res = await axiosSecure.post(`/submissions/${id}/unlock`);
      setProject(res.data.project);
      toast.success('Submission unlocked for editing.');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to unlock'); }
  };

  if (loading) return (
    <Layout isReviewer>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid var(--g100)', borderTopColor: 'var(--g600)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    </Layout>
  );

  // ── Score card calculations ──────────────────────────────────────
  const sortedSections = [...globalSections].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const sectionData    = selectedSection ? calcSectionData(selectedSection, tabs) : null;
  const displayPct     = sectionData ? sectionData.pct    : (project?.scorePercent || 0);
  const displayEarned  = sectionData ? sectionData.earned : (project?.totalPoints  || 0);
  const displayMax     = sectionData ? sectionData.max    : (project?.maxPoints    || 0);
  const overallRule    = leafRules.find(r => r.name === project?.leafLevel) || null;
  const sectionRule    = sectionData ? getLeafLevel(sectionData.pct, leafRules) : null;
  const activeRule     = sectionData ? sectionRule : overallRule;
  const displayLevel   = activeRule?.name     || null;
  const displayColor   = activeRule?.colorCode || null;
  const progressColor  = displayColor || '#94A3B8';
  const docs           = project?.documents || [];
  const isLocked       = project?.isLocked || false;
  const lockStatus     = project?.lockStatus || 'pending';
  const ownerId        = project?.userId?._id || project?.userId;

  return (
    <Layout isReviewer>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20, flexWrap: 'wrap' }} className="fade-in-up">
        <button onClick={() => navigate('/reviewer/submissions')} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          border: '1.5px solid var(--border)', background: '#fff', color: 'var(--tx-muted)',
          fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0,
        }}>← Back</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 22, color: 'var(--tx)', margin: 0 }}>
            {project?.title}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--tx-muted)', margin: '4px 0 0' }}>
            by <span style={{ fontWeight: 700 }}>{project?.userId?.name}</span>
            {' · '}{project?.userId?.email}
          </p>
        </div>

        {/* Lock / Unlock buttons */}
        {isLocked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 12,
              background: '#FEF9C3', border: '1.5px solid #FDE68A', color: '#92400E',
              fontSize: 13, fontWeight: 700, fontFamily: 'Montserrat,sans-serif',
            }}>
              🔒 Locked
            </div>
            <button onClick={unlockSubmission} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12,
              background: '#fff', border: '1.5px solid #E0E0E0', color: '#555',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              fontFamily: 'Montserrat,sans-serif',
            }}>
              🔓 Unlock
            </button>
          </div>
        ) : (
          <button onClick={lockSubmission} disabled={locking} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 12,
            background: locking ? 'var(--bg-soft)' : 'linear-gradient(135deg,#5B21B6,#7C3AED)',
            color: locking ? 'var(--tx-muted)' : '#fff',
            fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 2px 12px rgba(91,33,182,0.3)', fontFamily: 'Montserrat,sans-serif',
          }}>
            {locking ? '…Locking' : '🔒 Submit Review & Lock'}
          </button>
        )}
      </div>

      {/* ── Lock / Unlock Banner ── */}
      {lockStatus !== 'pending' && (
        <div style={{
          padding: '14px 20px', borderRadius: 14, marginBottom: 20,
          background: lockStatus === 'unlocked_for_edit' ? 'linear-gradient(135deg,#FEF9C3,#FFFBEB)' : 'linear-gradient(135deg,#EDE9FE,#F5F3FF)',
          border: `1.5px solid ${lockStatus === 'unlocked_for_edit' ? '#FDE68A' : '#C4B5FD'}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }} className="fade-in-up">
          <span style={{ fontSize: 24 }}>{lockStatus === 'unlocked_for_edit' ? '🔓' : '🔒'}</span>
          <div>
            <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 14, color: lockStatus === 'unlocked_for_edit' ? '#92400E' : '#5B21B6', margin: 0 }}>
              {lockStatus === 'unlocked_for_edit' ? 'Unlocked for Editing' : 'Submission Locked'}
            </p>
            <p style={{ fontSize: 12, color: lockStatus === 'unlocked_for_edit' ? '#B45309' : '#7C3AED', margin: '2px 0 0', fontWeight: 500 }}>
              {lockStatus === 'unlocked_for_edit'
                ? 'The user can now edit their submission. Lock again when ready.'
                : `Review submitted on ${new Date(project?.reviewSubmittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. The user can now reply to your comments.`}
            </p>
          </div>
        </div>
      )}

      {/* ── Sticky Score Card ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'linear-gradient(135deg,#EFF9F4,#D6F5E3)',
        border: '1.5px solid var(--g200)', borderRadius: 20, marginBottom: 24,
        boxShadow: '0 4px 24px rgba(34,168,75,0.12)', overflow: 'hidden',
      }} className="fade-in-up">

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 20px', borderBottom: '1px solid rgba(34,168,75,0.15)',
          background: 'rgba(255,255,255,0.5)', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--g700)', fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap' }}>
            Section
          </span>
          <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} style={{
            flex: 1, maxWidth: 360, padding: '6px 12px', borderRadius: 8,
            border: '1.5px solid var(--g200)', background: '#fff',
            fontSize: 13, fontWeight: 600, color: 'var(--tx)', cursor: 'pointer', outline: 'none',
          }}>
            <option value="">— Overall Score —</option>
            {sortedSections.map(s => (
              <option key={s._id} value={s._id}>{s.title}</option>
            ))}
          </select>
          {(project?.sectionStatuses || []).map((ss, i) => {
            const sec = sortedSections.find(s => String(s._id) === String(ss.sectionId));
            const cfg = STATUS_CFG[ss.status];
            if (!cfg) return null;
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap' }}>
                {sec?.title}: <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} /> {cfg.label}
              </span>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 24px', flexWrap: 'wrap' }}>
          <ColoredLeaf level={displayLevel} colorCode={displayColor} size={82} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 34, color: 'var(--tx)', lineHeight: 1 }}>
                {displayPct}%
              </span>
              <span style={{ fontSize: 13, color: 'var(--tx-muted)', fontWeight: 600 }}>score</span>
              <span style={{ fontSize: 14, color: 'var(--tx-muted)', fontWeight: 700 }}>
                {typeof displayEarned === 'number' ? displayEarned.toFixed(1) : '0.0'} / {displayMax} pts
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {displayLevel ? <LeafBadge level={displayLevel} /> : <span style={{ fontSize: 12, color: 'var(--tx-faint)' }}>Not rated</span>}
              <span className={project?.status === 'submitted' ? 'status-chip status-completed' : 'status-chip status-progress'}>
                {project?.status === 'submitted' ? '✓ Submitted' : '● Draft'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 24px 14px' }}>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.5)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: progressColor, width: `${Math.min(displayPct, 100)}%`, transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      {/* ── Tabs → Modules → Inputs + Comment threads ── */}
      {(tabs || []).map((tab, ti) => {
        const visibleModules = (tab.modules || []).map(mod => ({
          ...mod,
          visibleInputs: selectedSection
            ? (mod.inputs || []).filter(inp => String(inp.sectionId) === selectedSection)
            : (mod.inputs || []),
        })).filter(mod => mod.visibleInputs.length > 0);

        if (visibleModules.length === 0) return null;

        return (
          <div key={tab._id} className="fade-in-up" style={{ marginBottom: 28 }}>
            {/* Tab heading */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid var(--g200)' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 8, background: 'var(--g600)', color: '#fff',
                fontSize: 12, fontWeight: 900, flexShrink: 0, fontFamily: 'Montserrat,sans-serif',
              }}>{ti + 1}</span>
              <h2 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--g800)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {tab.title}
              </h2>
            </div>

            {/* Modules */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {visibleModules.map((mod, mi) => {
                const modEarned = mod.visibleInputs.reduce((s, inp) => s + (inp.points || 0), 0);
                const modMax    = mod.visibleInputs.reduce((s, inp) => s + calcInputMax(inp), 0);
                const modPct    = modMax > 0 ? Math.round((modEarned / modMax) * 100) : 0;
                const scoreColor = modPct >= 70 ? 'var(--g700)' : modPct >= 40 ? '#92400E' : 'var(--tx-faint)';
                const scoreBg    = modPct >= 70 ? 'var(--g100)' : modPct >= 40 ? '#FEF9C3' : 'var(--bg-muted)';

                return (
                  <div key={mod._id} style={{ border: '1px solid var(--border)', borderRadius: 16, background: '#fff', overflow: 'hidden', boxShadow: 'var(--sh-xs)' }}>
                    {/* Module header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'var(--g50)', border: '1px solid var(--g200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--g600)' }}>◈</div>
                      <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--tx)', margin: 0, flex: 1 }}>
                        <span style={{ color: 'var(--tx-faint)', marginRight: 4 }}>{ti + 1}.{mi + 1}</span>{mod.title}
                      </p>
                      <div style={{ padding: '5px 12px', borderRadius: 20, background: scoreBg, border: `1px solid ${modPct >= 70 ? 'var(--g300)' : modPct >= 40 ? '#FDE68A' : 'var(--border)'}` }}>
                        <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 14, color: scoreColor }}>
                          {modEarned.toFixed(1)}
                        </span>
                        {modMax > 0 && <span style={{ fontSize: 11, color: 'var(--tx-faint)', fontWeight: 600 }}> / {modMax} pts</span>}
                      </div>
                    </div>

                    {/* Input rows */}
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {mod.visibleInputs.map((inp, qi) => {
                        const isEmpty = inp.inputType === 'file' ? !inp.uploaded
                          : Array.isArray(inp.value) ? inp.value.length === 0
                          : inp.value === '' || inp.value === undefined;
                        const ts = TYPE_STYLE[inp.inputType] || {};
                        const linkedDoc = inp.inputType === 'file'
                          ? docs.find(d => String(d.inputId) === String(inp._id))
                          : null;
                        const linkedUrl = linkedDoc ? getDownloadUrl(linkedDoc) : null;

                        const isInputLocked = lockedInputsSet.has(String(inp._id));
                        const isToggling    = togglingInput === String(inp._id);
                        return (
                          <div key={inp._id} style={{
                            padding: '12px 14px', borderRadius: 12,
                            background: isInputLocked ? '#FFFBEB' : isEmpty ? 'var(--bg-subtle)' : '#FAFFFE',
                            border: `1.5px solid ${isInputLocked ? '#FDE68A' : isEmpty ? 'var(--border)' : 'var(--g100)'}`,
                            opacity: isEmpty && !isInputLocked ? 0.55 : 1,
                            transition: 'border-color 0.2s, background 0.2s',
                          }}>
                            {/* Q number + label row */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                              <span style={{
                                flexShrink: 0, fontSize: 10, fontWeight: 800, padding: '2px 7px',
                                borderRadius: 6, background: 'var(--g700)', color: '#fff',
                                fontFamily: 'Montserrat,sans-serif', marginTop: 1,
                              }}>Q{qi + 1}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', margin: '0 0 3px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  {inp.label}
                                  {inp.isRequired && <span style={{ color: '#EF4444', fontSize: 10 }}>*</span>}
                                  <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: ts.bg, color: ts.color, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}>
                                    {inp.inputType}
                                  </span>
                                </p>

                                {/* Answer */}
                                <div style={{ fontSize: 13, color: isEmpty ? 'var(--tx-faint)' : 'var(--tx)', wordBreak: 'break-word', marginBottom: 6 }}>
                                  {inp.inputType === 'file'
                                    ? (linkedDoc
                                      ? <a href={linkedUrl} download={linkedDoc.originalName} target="_blank" rel="noopener noreferrer"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 7, background: 'var(--g50)', border: '1px solid var(--g200)', color: 'var(--g800)', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                                          📎 {linkedDoc.originalName || 'Download'} <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--g200)', color: 'var(--g800)' }}>↓</span>
                                        </a>
                                      : <span style={{ color: 'var(--tx-faint)', fontSize: 12 }}>No file uploaded</span>)
                                    : inp.inputType === 'checkbox'
                                      ? (Array.isArray(inp.value) && inp.value.length > 0 ? inp.value.join(', ') : <span style={{ color: 'var(--tx-faint)', fontSize: 12 }}>—</span>)
                                      : (inp.value || <span style={{ color: 'var(--tx-faint)', fontSize: 12 }}>—</span>)}
                                </div>
                              </div>
                              {/* Right-side: points + lock controls */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                {inp.points > 0 && (
                                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 7, background: 'var(--g100)', color: 'var(--g700)', border: '1px solid var(--g200)', whiteSpace: 'nowrap' }}>
                                    {inp.points.toFixed(1)} pts
                                  </span>
                                )}

                                {/* Lock status badge */}
                                <span style={{
                                  fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                                  background: isInputLocked ? '#FEF9C3' : '#D6F5E3',
                                  color: isInputLocked ? '#92400E' : '#145C28',
                                  border: `1px solid ${isInputLocked ? '#FDE68A' : '#A8EFC0'}`,
                                  fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
                                }}>
                                  {isInputLocked ? '🔒 Locked' : '✏️ Editable'}
                                </span>

                                {/* Lock / Unlock toggle button */}
                                <button
                                  onClick={() => toggleInputLock(inp._id, isInputLocked)}
                                  disabled={isToggling}
                                  title={isInputLocked ? 'Unlock this question' : 'Lock this question'}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                                    cursor: isToggling ? 'wait' : 'pointer',
                                    border: `1px solid ${isInputLocked ? '#C4B5FD' : '#FDE68A'}`,
                                    background: isInputLocked ? '#EDE9FE' : '#FFFBEB',
                                    color: isInputLocked ? '#5B21B6' : '#92400E',
                                    fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
                                    opacity: isToggling ? 0.6 : 1,
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {isToggling ? '…' : isInputLocked ? '🔓 Unlock' : '🔒 Lock'}
                                </button>
                              </div>
                            </div>

                            {/* Comment thread */}
                            {dbUser && (
                              <CommentThread
                                projectId={project._id}
                                inputId={inp._id}
                                currentUserId={dbUser._id}
                                currentRole={dbUser.role}
                                isLocked={isLocked}
                                projectOwnerId={ownerId}
                                initialCount={commentCounts[String(inp._id)] || 0}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </Layout>
  );
}
