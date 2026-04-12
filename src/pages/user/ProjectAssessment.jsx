import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { LeafBadge, ColoredLeaf } from '../../components/shared/LeafLogo.jsx';
import CommentThread from '../../components/shared/CommentThread.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const SERVER_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

function IconImg({ src, fallback, size = 36, radius = 10 }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        background: 'var(--g50)', border: '1px solid var(--g200)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.45), color: 'var(--g500)',
      }}>{fallback}</div>
    );
  }
  return (
    <img src={src} alt="" onError={() => setFailed(true)}
      style={{
        width: size, height: size, borderRadius: radius, flexShrink: 0,
        objectFit: 'contain', background: 'var(--bg-subtle)', padding: 4,
        border: '1px solid var(--border)',
      }} />
  );
}

// ── Points calculator — straight line equation ─────────────────
function calcInputPoints(inp, value) {
  if (inp.inputType === 'number') {
    const x = parseFloat(value);
    if (isNaN(x) || value === '' || value === undefined) return 0;

    const line = inp.line;
    if (!line) return 0;

    const x1 = Number(line.x1), y1 = Number(line.y1);
    const x2 = Number(line.x2), y2 = Number(line.y2);

    if (x <= x1) return y1;
    if (x >= x2) return y2;
    if (x2 === x1) return y1;
    return ((y2 - y1) / (x2 - x1)) * (x - x1) + y1;
  }

  if (inp.inputType === 'checkbox') {
    const sel = Array.isArray(value) ? value : [];
    return sel.reduce((s, v) => {
      const o = inp.options?.find(o => o.label === v);
      return s + (o ? o.points : 0);
    }, 0);
  }

  return 0;
}

function calcInputMax(inp) {
  if (inp.inputType === 'number' && inp.line) {
    return Math.max(Number(inp.line.y1), Number(inp.line.y2));
  }
  if (inp.inputType === 'checkbox' && inp.options?.length) {
    return inp.options.reduce((t, o) => t + o.points, 0);
  }
  return 0;
}

// Returns true if user has provided a value for this input
function isInputFilled(inp, answers) {
  if (inp.inputType === 'file') return !!inp.uploaded;
  const v = answers[inp._id];
  if (Array.isArray(v)) return v.length > 0;
  return v !== '' && v !== undefined && v !== null;
}

// Flatten all inputs from a module (supports both flat mod.inputs and old mod.sections[].inputs)
function getModuleInputs(mod) {
  if (mod.inputs?.length) return mod.inputs;
  return (mod.sections || []).flatMap(s =>
    (s.inputs || []).map(inp => ({ ...inp, sectionId: inp.sectionId || s._id }))
  );
}

// Calculate earned + max for a specific global section across all tabs
function calcSectionScore(sectionId, tabs, answers) {
  let earned = 0, max = 0;
  tabs.forEach(tab => {
    (tab.modules || []).forEach(mod => {
      getModuleInputs(mod).forEach(inp => {
        if (String(inp.sectionId) === String(sectionId)) {
          earned += calcInputPoints(inp, answers[inp._id]);
          max += calcInputMax(inp);
        }
      });
    });
  });
  const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
  return { earned, max, pct };
}

// Find leaf level from percentage using eval rules
function getLeafLevel(pct, rules) {
  return rules.find(r => pct >= r.minPercent && pct <= r.maxPercent) || null;
}

// ── Points box (per section within module) ─────────────────────
function PointsBox({ earned, max }) {
  const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
  const color = pct >= 80 ? 'var(--g600)' : pct >= 60 ? '#D97706' : pct >= 40 ? '#EA580C' : 'var(--tx-muted)';

  return (
    <div style={{
      width: 120, flexShrink: 0,
      background: '#fff',
      border: '1.5px solid var(--border)',
      borderRadius: 14,
      padding: '14px 12px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center',
      boxShadow: 'var(--sh-xs)',
      position: 'sticky', top: 20,
    }}>
      <p style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--tx-faint)',
        fontFamily: 'Montserrat,sans-serif', marginBottom: 6
      }}>Points</p>
      <p style={{
        fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
        fontSize: 24, color, margin: 0, lineHeight: 1
      }}>
        {earned.toFixed(1)}
      </p>
      {max > 0 && (
        <>
          <p style={{ fontSize: 10, color: 'var(--tx-faint)', fontWeight: 600, margin: '3px 0 6px' }}>
            of {max}
          </p>
          <div style={{
            width: '100%', height: 4, borderRadius: 99,
            background: 'var(--bg-muted)', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', borderRadius: 99, background: color,
              width: `${Math.min(pct, 100)}%`,
              transition: 'width 0.8s ease'
            }} />
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, color, margin: '4px 0 0' }}>{pct}%</p>
        </>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function ProjectAssessment() {
  const { id } = useParams();
  const ax = useAxiosSecure();
  const { dbUser } = useAuth();

  const [project, setProject] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [openMod, setOpenMod] = useState(null);
  const [openSections, setOpenSections] = useState({}); // track which section panels are open
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [displayLeaf, setDisplayLeaf] = useState(null);

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const titleInputRef = useRef(null);

  // Global sections + leaf rules
  const [globalSections, setGlobalSections] = useState([]);
  const [leafRules, setLeafRules] = useState([]);
  const [selectedSection, setSelectedSection] = useState(''); // for the section score dropdown
  // comment counts per inputId (pre-fetched for badges)
  const [commentCounts, setCommentCounts] = useState({});
  // Mobile tab drawer
  const [tabMenuOpen, setTabMenuOpen] = useState(false);
  // Score card expand/collapse toggle
  const [scoreOpen, setScoreOpen] = useState(true);
  // Score card banner image from admin settings
  const [scoreCardBanner, setScoreCardBanner] = useState('');

  // Close mobile tab dropdown when clicking outside
  useEffect(() => {
    if (!tabMenuOpen) return;
    const close = () => setTabMenuOpen(false);
    document.addEventListener('click', close, true);
    return () => document.removeEventListener('click', close, true);
  }, [tabMenuOpen]);

  const loadProject = useCallback(async () => {
    try {
      const r = await ax.get(`/projects/${id}`);
      setProject(r.data.project);
      setTabs(r.data.tabs || []);
      setDisplayLeaf(r.data.displayLeaf);
      // Initialise section filter from the project's saved active section
      if (r.data.project?.activeSection) {
        setSelectedSection(String(r.data.project.activeSection));
      }

      const ans = {};
      (r.data.tabs || []).forEach(tab => {
        (tab.modules || []).forEach(mod => {
          getModuleInputs(mod).forEach(inp => {
            if (inp.inputType !== 'file') {
              ans[inp._id] = inp.value ?? (inp.inputType === 'checkbox' ? [] : '');
            }
          });
        });
      });
      setAnswers(ans);
    } catch { toast.error('Failed to load project'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  useEffect(() => {
    ax.get('/sections')
      .then(r => setGlobalSections(r.data.sections || []))
      .catch(() => { });
    ax.get('/settings/eval-rules')
      .then(r => setLeafRules(r.data.rules || []))
      .catch(() => { });
    ax.get('/settings')
      .then(r => { if (r.data.settings?.scoreCardBanner) setScoreCardBanner(r.data.settings.scoreCardBanner); })
      .catch(() => { });
    ax.get(`/comments/by-project/${id}`)
      .then(r => {
        const counts = {};
        (r.data.comments || []).forEach(c => {
          const key = String(c.inputId);
          counts[key] = (counts[key] || 0) + 1;
        });
        setCommentCounts(counts);
      })
      .catch(() => { });
  }, [id]);

  const handleChange = (inputId, value, inputType) => {
    if (inputType === 'checkbox') {
      const cur = answers[inputId] || [];
      const upd = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
      setAnswers(p => ({ ...p, [inputId]: upd }));
    } else {
      setAnswers(p => ({ ...p, [inputId]: value }));
    }
  };

  const saveModule = async (mod) => {
    setSaving(mod._id);
    try {
      const toSave = [];
      getModuleInputs(mod).forEach(inp => {
        if (inp.inputType !== 'file' && answers[inp._id] !== undefined) {
          toSave.push({ inputId: inp._id, value: answers[inp._id] });
        }
      });
      const r = await ax.patch(`/projects/${id}/answers`, { answers: toSave });
      setProject(p => ({
        ...p,
        totalPoints: r.data.totalPoints,
        maxPoints: r.data.maxPoints,
        scorePercent: r.data.scorePercent,
        leafLevel: r.data.leafLevel,
      }));
      setDisplayLeaf(r.data.leafLevel);
      toast.success('Saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(null); }
  };

  const handleFile = async (inputId, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('inputId', inputId);
    try {
      await ax.post(`/projects/${id}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Uploaded!');
      loadProject();
    } catch { toast.error('Upload failed'); }
  };

  const submitProject = async () => {
    if (!window.confirm('Submit for review? You cannot edit after this.')) return;
    setSubmitting(true);
    try {
      await ax.patch(`/projects/${id}/submit`);
      toast.success('Project submitted!');
      loadProject();
    } catch { toast.error('Failed'); }
    finally { setSubmitting(false); }
  };

  const toggleSection = (key) => {
    setOpenSections(p => ({ ...p, [key]: !p[key] }));
  };

  const startTitleEdit = () => {
    setEditTitle(project?.title || '');
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 50);
  };

  const cancelTitleEdit = () => {
    setEditTitle('');
    setEditingTitle(false);
  };

  const saveTitleEdit = async () => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === project?.title) { setEditingTitle(false); return; }
    setSavingTitle(true);
    try {
      const res = await ax.patch(`/projects/${id}`, { title: trimmed });
      setProject(p => ({ ...p, title: res.data.project.title }));
      setEditingTitle(false);
      toast.success('Renamed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename');
    } finally {
      setSavingTitle(false);
    }
  };

  if (loading) return (
    <Layout>
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '4px solid var(--g100)', borderTopColor: 'var(--g600)',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
        }} />
        <p style={{ color: 'var(--tx-muted)', fontSize: 15 }}>Loading project…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    </Layout>
  );

  const pct = project?.scorePercent || 0;

  // Section score dropdown calculation
  const sortedGlobalSections = [...globalSections].sort((a, b) => a.sortOrder - b.sortOrder);
  const sectionScore = selectedSection
    ? calcSectionScore(selectedSection, tabs, answers)
    : null;
  const sectionLeaf = sectionScore
    ? getLeafLevel(sectionScore.pct, leafRules)
    : null;
  const selectedSectionName = sortedGlobalSections.find(s => String(s._id) === selectedSection)?.title || '';

  // Resolve colorCode from leafRules for the overall leaf
  const overallLeafRule = leafRules.find(r => r.name === displayLeaf) || null;

  // Per-section admin status — only shown when user has selected a specific section
  const reviewStatusConfig = {
    under_review: { label: 'Under Review', bg: '#FEF9C3', color: '#92400E', border: '#FDE68A', dot: '#D97706' },
    verified: { label: 'Verified', bg: '#D6F5E3', color: '#145C28', border: '#A8EFC0', dot: '#22A84B' },
    cancelled: { label: 'Cancelled', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA', dot: '#EF4444' },
  };
  const activeSectionStatus = selectedSection && project?.sectionStatuses
    ? (project.sectionStatuses.find(s => String(s.sectionId) === selectedSection)?.status || null)
    : null;
  const reviewCfg = activeSectionStatus ? reviewStatusConfig[activeSectionStatus] : null;

  // Displayed values — section mode or overall mode
  const displayMode = !!selectedSection;
  const displayPct = displayMode ? (sectionScore?.pct ?? 0) : pct;
  const displayPts = displayMode ? (sectionScore?.earned ?? 0) : (project?.totalPoints || 0);
  const displayMax = displayMode ? (sectionScore?.max ?? 0) : (project?.maxPoints || 0);
  const displayLevel = displayMode ? (sectionLeaf?.name || null) : displayLeaf;
  const displayColorCode = displayMode ? (sectionLeaf?.colorCode || null) : (overallLeafRule?.colorCode || null);
  const progressColor = displayColorCode || '#94A3B8';

  const isLocked = project?.isLocked || false;
  const ownerId = project?.userId || dbUser?._id;

  // Per-question lock set (populated as reviewer adds comments)
  const lockedInputIds = new Set((project?.lockedInputs || []).map(String));

  // A question is editable unless it has been individually locked by a reviewer/admin
  const isInputEditable = (inp) => !lockedInputIds.has(String(inp._id));

  // Show lock/editable status badges once the project is submitted (in review phase)
  const showLockBadges = project?.status === 'submitted' || lockedInputIds.size > 0;

  // Legacy flag kept only for the Submit button and module-level save visibility
  const isEditable = !isLocked && project?.status !== 'submitted';

  return (
    <Layout>
      {/* ── Unified Sticky Score Card ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'linear-gradient(135deg, #EFF9F4, #D6F5E3)',
        border: '1.5px solid var(--g200)',
        borderRadius: 20,
        marginBottom: 20,
        boxShadow: '0 4px 24px rgba(34,168,75,0.12)',
        overflow: 'hidden',
        transition: 'box-shadow 0.25s ease',
      }} className="fade-in-up">

        {/* ── Top bar: always visible ── */}
        <div className="pa-scorecard-toprow" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px 10px 20px',
          borderBottom: scoreOpen ? '1px solid rgba(34,168,75,0.15)' : 'none',
          background: 'rgba(255,255,255,0.5)',
          flexWrap: 'wrap',
        }}>
          {/* Section dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--g700)',
              fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
            }}>Section</span>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              style={{
                flex: 1, padding: '6px 12px', borderRadius: 8,
                border: '1.5px solid var(--g200)', background: '#fff',
                fontSize: 13, fontWeight: 600, color: 'var(--tx)',
                cursor: 'pointer', outline: 'none', maxWidth: 340,
              }}>
              <option value="">— Overall Score —</option>
              {sortedGlobalSections.map(s => (
                <option key={s._id} value={s._id}>{s.title}</option>
              ))}
            </select>
          </div>

          {/* Collapsed mini-summary — shown only when card is closed */}
          {!scoreOpen && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 12px', borderRadius: 10,
              background: 'rgba(34,168,75,0.1)',
              border: '1px solid rgba(34,168,75,0.2)',
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
                fontSize: 16, color: 'var(--g700)',
              }}>{displayPct}%</span>
              <div style={{ width: 1, height: 14, background: 'var(--g300)' }} />
              {/* <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx-muted)' }}>
                {displayPts.toFixed(1)} / {displayMax} pts
              </span> */}
              <span style={{
                fontSize: 13, color: 'var(--tx-muted)', fontWeight: 700,
                background: 'rgba(0,0,0,0.06)', borderRadius: 6,
                padding: '2px 8px',
              }}>
                {Math.round(displayPts)} / {displayMax} pts
              </span>
              {displayLevel && <LeafBadge level={displayLevel} />}
            </div>
          )}

          {/* Buttons */}
          <div className="pa-scorecard-buttons" style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <Link to="/notes" style={{ textDecoration: 'none' }} className="btn-secondary">
              📝 Notes
            </Link>
            {project?.status !== 'submitted' && (
              <button className="btn-primary-green" onClick={submitProject} disabled={submitting}>
                {submitting ? 'Submitting…' : '✓ Submit'}
              </button>
            )}
            {isLocked && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 11, fontSize: 13, fontWeight: 700,
                background: '#EDE9FE', border: '1.5px solid #C4B5FD', color: '#5B21B6',
                fontFamily: 'Montserrat,sans-serif',
              }}>🔒 Locked</span>
            )}

            {/* ── Score card toggle button ── */}
            <button
              onClick={() => setScoreOpen(o => !o)}
              title={scoreOpen ? 'Collapse score card' : 'Expand score card'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 13px', borderRadius: 10, cursor: 'pointer',
                background: scoreOpen ? 'rgba(34,168,75,0.12)' : 'linear-gradient(135deg,var(--g700),var(--g500))',
                border: `1.5px solid ${scoreOpen ? 'rgba(34,168,75,0.3)' : 'transparent'}`,
                color: scoreOpen ? 'var(--g700)' : '#fff',
                fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 12,
                transition: 'all 0.2s ease', whiteSpace: 'nowrap',
              }}>
              <span style={{
                display: 'inline-block',
                transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
                transform: scoreOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                fontSize: 14, lineHeight: 1,
              }}>▲</span>
              <span className="pa-toggle-label">{scoreOpen ? 'Hide' : 'Score'}</span>
            </button>
          </div>
        </div>

        {/* ── Main body (collapsible) ── */}
        {scoreOpen && (() => {
          const sortedLeafRules = [...leafRules].sort((a, b) => a.minPercent - b.minPercent);
          return (
            <>
              {/* body row: left info group + right banner */}
              <div className="pa-score-body" style={{
                display: 'flex', alignItems: 'stretch',
              }}>
                {/* ── Left group: leaf + score info — only as wide as content ── */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 22,
                  padding: '20px 26px', flex: '0 0 auto', maxWidth: '58%',
                  alignSelf: 'center',
                }}>
                  {/* Colored leaf — bigger */}
                  <div className="pa-score-leaf" style={{ flexShrink: 0 }}>
                    <ColoredLeaf level={displayLevel} colorCode={displayColorCode} size={96} />
                  </div>

                  {/* Score info */}
                  <div className="pa-score-info" style={{ minWidth: 0, maxWidth: 420 }}>
                    {/* Editable title */}
                    {editingTitle ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <input
                          ref={titleInputRef}
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveTitleEdit();
                            if (e.key === 'Escape') cancelTitleEdit();
                          }}
                          maxLength={120}
                          disabled={savingTitle}
                          style={{
                            flex: 1, padding: '5px 10px', borderRadius: 8, fontSize: 16,
                            fontFamily: 'Montserrat,sans-serif', fontWeight: 700,
                            border: '1.5px solid var(--g300)', background: '#fff',
                            color: 'var(--tx)', outline: 'none',
                          }}
                        />
                        <button onClick={saveTitleEdit} disabled={savingTitle || !editTitle.trim()} style={{
                          background: 'rgba(34,168,75,0.12)', border: '1px solid rgba(34,168,75,0.4)',
                          color: 'var(--g700)', borderRadius: 7, padding: '4px 12px',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                          opacity: savingTitle || !editTitle.trim() ? 0.5 : 1,
                        }}>
                          {savingTitle ? '…' : 'Save'}
                        </button>
                        <button onClick={cancelTitleEdit} style={{
                          background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.12)',
                          color: 'var(--tx-muted)', borderRadius: 7, padding: '4px 12px',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <h2 style={{
                          fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
                          fontSize: 20, color: 'var(--tx)', margin: 0,
                        }}>
                          {project?.title}
                        </h2>
                        {project?.status !== 'submitted' && !isLocked && (
                          <button onClick={startTitleEdit} title="Rename project" style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: 'var(--g500)', fontSize: 15, padding: '2px 5px',
                            borderRadius: 6, lineHeight: 1, flexShrink: 0,
                            transition: 'color 0.15s',
                          }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--g700)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--g500)'}
                          >
                            ✎
                          </button>
                        )}
                      </div>
                    )}

                    {displayMode && (
                      <p style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--g700)',
                        margin: '0 0 4px', fontFamily: 'Montserrat,sans-serif',
                        letterSpacing: '0.04em',
                      }}>
                        ▦ {selectedSectionName}
                      </p>
                    )}

                    {/* Score row */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span className="pa-score-pct" style={{
                        fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
                        fontSize: 34, color: progressColor || 'var(--tx)', lineHeight: 1,
                      }}>{displayPct}%</span>
                      <span style={{ fontSize: 13, color: 'var(--tx-muted)', fontWeight: 600 }}>score</span>
                      {/* <span style={{
                        fontSize: 13, color: 'var(--tx-muted)', fontWeight: 700,
                        background: 'rgba(0,0,0,0.06)', borderRadius: 6,
                        padding: '2px 8px',
                      }}>
                        {displayPts.toFixed(1)} / {displayMax} pts
                      </span> */}
                      <span style={{
                        fontSize: 13, color: 'var(--tx-muted)', fontWeight: 700,
                        background: 'rgba(0,0,0,0.06)', borderRadius: 6,
                        padding: '2px 8px',
                      }}>
                        {Math.round(displayPts)} / {displayMax} pts
                      </span>
                    </div>

                    {/* Badges row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                      {displayLevel
                        ? <LeafBadge level={displayLevel} />
                        : <span style={{ fontSize: 11, color: 'var(--tx-faint)', fontWeight: 600 }}>No Level yet</span>}

                      <span className={project?.status === 'submitted'
                        ? 'status-chip status-completed' : 'status-chip status-progress'}>
                        {project?.status === 'submitted' ? '✓ Submitted' : '● Draft'}
                      </span>

                      {reviewCfg && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 99,
                          background: reviewCfg.bg, color: reviewCfg.color,
                          border: `1px solid ${reviewCfg.border}`,
                          fontSize: 12, fontWeight: 700,
                          fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: reviewCfg.dot, flexShrink: 0 }} />
                          {reviewCfg.label}
                        </span>
                      )}
                    </div>

                    {/* ── Leaf Level Progress Track ── */}
                    {sortedLeafRules.length > 0 && (
                      <div className="pa-level-track" style={{ minWidth: 260, maxWidth: 400 }}>
                        {/* Segmented bar */}
                        <div style={{ display: 'flex', gap: 3, height: 9 }}>
                          {sortedLeafRules.map((rule, i) => {
                            const segSpan = rule.maxPercent - rule.minPercent;
                            const segFill =
                              displayPct <= rule.minPercent ? 0
                                : displayPct >= rule.maxPercent ? 100
                                  : ((displayPct - rule.minPercent) / segSpan) * 100;
                            const isActive = displayLevel === rule.name;
                            const color = rule.colorCode || '#94A3B8';
                            return (
                              <div key={i} style={{
                                flex: segSpan,
                                borderRadius: 99,
                                background: 'rgba(0,0,0,0.10)',
                                overflow: 'hidden',
                                position: 'relative',
                                boxShadow: isActive ? `0 0 0 1.5px ${color}88` : 'none',
                                transition: 'box-shadow 0.3s',
                              }}>
                                <div style={{
                                  position: 'absolute', left: 0, top: 0, bottom: 0,
                                  width: `${segFill}%`,
                                  background: color,
                                  transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                                  borderRadius: 99,
                                }} />
                              </div>
                            );
                          })}
                        </div>

                        {/* Level labels */}
                        <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                          {sortedLeafRules.map((rule, i) => {
                            const segSpan = rule.maxPercent - rule.minPercent;
                            const isActive = displayLevel === rule.name;
                            const color = rule.colorCode || '#94A3B8';
                            return (
                              <div key={i} style={{
                                flex: segSpan,
                                textAlign: 'center',
                                fontSize: 9,
                                fontWeight: isActive ? 800 : 500,
                                color: isActive ? color : 'var(--tx-faint)',
                                fontFamily: 'Montserrat,sans-serif',
                                letterSpacing: isActive ? '0.02em' : 0,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                transition: 'color 0.3s, font-weight 0.3s',
                              }}>
                                {isActive && (
                                  <span style={{ display: 'block', fontSize: 7, marginBottom: 1, opacity: 0.7 }}>▲</span>
                                )}
                                {rule.name}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Right banner: fills remaining space, shows full image height ── */}
                {scoreCardBanner && (
                  <div className="pa-score-banner rounded-xl" style={{
                    flex: 1, minWidth: 260,
                    overflow: 'hidden',
                    borderLeft: '1px solid rgba(34,168,75,0.18)',
                    display: 'flex', alignItems: 'stretch',
                  }}>
                    <img
                      src={`${SERVER_URL}${scoreCardBanner}`}
                      alt="Score card banner"
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        objectFit: 'fill',
                      }}
                      onError={e => {
                        const col = e.currentTarget.closest('.pa-score-banner');
                        if (col) col.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* ── No tabs ── */}
      {tabs.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>📋</p>
          <h3 style={{
            fontFamily: 'Montserrat,sans-serif', fontWeight: 800,
            fontSize: 16, color: 'var(--tx)', marginBottom: 8
          }}>
            No assessment configured
          </h3>
          <p style={{ color: 'var(--tx-muted)', fontSize: 13 }}>
            Please contact the administrator.
          </p>
        </div>
      ) : (
        <>
          {/* ── Tab bar — desktop horizontal ── */}
          <div className="pa-tabs-desktop" style={{ overflowX: 'auto', marginBottom: 20 }}>
            <div className="tab-bar" style={{ minWidth: 'max-content' }}>
              {tabs.map((tab, i) => (
                <button key={tab._id}
                  className={`tab-btn ${i === activeTab ? 'active' : ''}`}
                  onClick={() => { setActiveTab(i); setOpenMod(null); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  {tab.iconUrl && (
                    <img src={`${SERVER_URL}${tab.iconUrl}`} alt=""
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                      style={{ width: 18, height: 18, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }} />
                  )}
                  {i + 1}. {tab.title}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab bar — mobile toggle dropdown ── */}
          <div className="pa-tabs-mobile" style={{ marginBottom: 16, position: 'relative' }}>
            {/* Current tab button */}
            <button
              onClick={() => setTabMenuOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px', borderRadius: 16,
                background: 'linear-gradient(135deg,var(--g700),var(--g500))',
                border: 'none', color: '#fff', cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(34,168,75,0.32)',
              }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 14,
              }}>
                {activeTab + 1}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                  textTransform: 'uppercase', opacity: 0.7,
                  fontFamily: 'Montserrat,sans-serif', marginBottom: 2,
                }}>
                  Tab {activeTab + 1} of {tabs.length}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 800,
                  fontFamily: 'Montserrat,sans-serif', lineHeight: 1.2,
                }}>
                  {tabs[activeTab]?.title}
                </div>
              </div>
              <div style={{
                fontSize: 20, transition: 'transform 0.25s ease',
                transform: tabMenuOpen ? 'rotate(180deg)' : 'none',
              }}>▾</div>
            </button>

            {/* Dropdown list */}
            {tabMenuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 50,
                background: '#fff', borderRadius: 16, overflow: 'hidden',
                border: '1.5px solid var(--g200)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
              }}>
                {tabs.map((tab, i) => {
                  const isActive = i === activeTab;
                  return (
                    <button key={tab._id}
                      onClick={() => { setActiveTab(i); setOpenMod(null); setTabMenuOpen(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                        background: isActive ? 'var(--g50)' : '#fff',
                        borderBottom: i < tabs.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background 0.15s',
                      }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        background: isActive ? 'linear-gradient(135deg,var(--g700),var(--g500))' : 'var(--bg-subtle)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 900,
                        color: isActive ? '#fff' : 'var(--tx-faint)',
                        fontFamily: 'Montserrat,sans-serif',
                        boxShadow: isActive ? '0 2px 8px rgba(34,168,75,0.3)' : 'none',
                      }}>
                        {i + 1}
                      </div>
                      <span style={{
                        flex: 1, fontWeight: isActive ? 800 : 600, fontSize: 13.5,
                        fontFamily: 'Montserrat,sans-serif',
                        color: isActive ? 'var(--g700)' : 'var(--tx)',
                      }}>
                        {tab.title}
                      </span>
                      {isActive && (
                        <span style={{
                          fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                          background: 'var(--g100)', color: 'var(--g700)',
                          fontFamily: 'Montserrat,sans-serif',
                        }}>Active</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modules */}
          {(tabs[activeTab]?.modules || []).length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ color: 'var(--tx-muted)', fontSize: 14 }}>No modules in this tab.</p>
            </div>
          ) : (
            (tabs[activeTab]?.modules || []).map((mod, modIdx) => {
              const isOpen = openMod === mod._id;
              const allInputs = getModuleInputs(mod);

              // Group inputs by sectionId
              const grouped = {};
              allInputs.forEach(inp => {
                const sid = String(inp.sectionId || 'none');
                if (!grouped[sid]) grouped[sid] = [];
                grouped[sid].push(inp);
              });

              // Build ordered section groups (all sections present in this module)
              const sectionGroups = [
                ...sortedGlobalSections
                  .filter(s => grouped[String(s._id)])
                  .map(s => ({
                    id: String(s._id),
                    title: s.title,
                    inputs: grouped[String(s._id)],
                  })),
                ...(grouped['none'] ? [{ id: 'none', title: 'Uncategorized', inputs: grouped['none'] }] : []),
              ];

              // Only show the currently selected section's group (or all if none selected)
              const visibleGroups = selectedSection
                ? sectionGroups.filter(g => g.id === selectedSection)
                : sectionGroups;

              // Sections available in this module (for per-module switcher)
              const moduleSections = sortedGlobalSections.filter(s => grouped[String(s._id)]);

              // Total pts for this module (all inputs)
              const modPts = allInputs.reduce((s, inp) => s + calcInputPoints(inp, answers[inp._id]), 0);

              return (
                <div key={mod._id} style={{
                  border: '1px solid var(--border)',
                  borderRadius: 16, background: '#fff',
                  marginBottom: 12,
                  boxShadow: isOpen ? 'var(--sh-md)' : 'var(--sh-xs)',
                  transition: 'box-shadow 0.2s',
                }} className="fade-in-up">

                  {/* Module header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', cursor: 'pointer',
                    borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                    background: isOpen ? 'var(--bg-soft)' : 'transparent',
                    borderRadius: isOpen ? '16px 16px 0 0' : 16
                  }}
                    onClick={() => setOpenMod(isOpen ? null : mod._id)}>
                    <IconImg
                      src={mod.iconUrl ? `${SERVER_URL}${mod.iconUrl}` : ''}
                      fallback="◈"
                      size={38}
                      radius={11}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontFamily: 'Montserrat,sans-serif', fontWeight: 800,
                        fontSize: 15, color: 'var(--tx)', margin: 0
                      }}>
                        <span style={{ color: 'var(--tx-faint)', marginRight: 4 }}>
                          {activeTab + 1}.{modIdx + 1}
                        </span>
                        {mod.title}
                      </p>
                      {/* Collapsed: show section progress chips; Open: show counts */}
                      {!isOpen ? (
                        visibleGroups.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                            {visibleGroups.map(g => {
                              const filled = g.inputs.filter(inp => isInputFilled(inp, answers)).length;
                              const total = g.inputs.length;
                              const done = filled === total && total > 0;
                              const pct = total > 0 ? Math.round(filled / total * 100) : 0;
                              return (
                                <span key={g.id} style={{
                                  fontSize: 10, fontWeight: 700,
                                  padding: '2px 7px', borderRadius: 99,
                                  background: done ? 'var(--g50)' : 'var(--bg-muted)',
                                  color: done ? 'var(--g700)' : 'var(--tx-muted)',
                                  border: `1px solid ${done ? 'var(--g200)' : 'var(--border)'}`,
                                  display: 'inline-flex', alignItems: 'center', gap: 3,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {done && <span>✓</span>}
                                  {g.title}: {pct}% ({filled}/{total})
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <p style={{ fontSize: 12, color: 'var(--tx-muted)', margin: '2px 0 0' }}>
                            {allInputs.length} field{allInputs.length !== 1 ? 's' : ''}
                          </p>
                        )
                      ) : (
                        <p style={{ fontSize: 12, color: 'var(--tx-muted)', margin: '2px 0 0' }}>
                          {visibleGroups.length} section{visibleGroups.length !== 1 ? 's' : ''} · {visibleGroups.reduce((s, g) => s + g.inputs.length, 0)} field{visibleGroups.reduce((s, g) => s + g.inputs.length, 0) !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="pa-mod-pts" style={{ textAlign: 'right', marginRight: 8 }}>
                      <p style={{
                        fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
                        fontSize: 18, color: 'var(--g600)', margin: 0
                      }}>
                        {modPts.toFixed(1)}
                      </p>
                      <p style={{
                        fontSize: 10.5, color: 'var(--tx-faint)',
                        fontWeight: 600, margin: 0
                      }}>pts</p>
                    </div>
                    <div style={{
                      fontSize: 18, color: 'var(--tx-faint)',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.2s'
                    }}>▾</div>
                  </div>

                  {/* Module body */}
                  {isOpen && (
                    <div style={{ padding: '20px' }}>
                      {/* Per-module section switcher */}
                      {moduleSections.length > 1 && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
                          padding: '10px 14px', borderRadius: 12,
                          background: 'var(--g50)', border: '1.5px solid var(--g200)',
                        }}>
                          <span style={{
                            fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
                            textTransform: 'uppercase', color: 'var(--g700)',
                            fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
                          }}>▦ Section</span>
                          <select
                            value={selectedSection}
                            onChange={e => setSelectedSection(e.target.value)}
                            style={{
                              flex: 1, padding: '5px 10px', borderRadius: 8,
                              border: '1.5px solid var(--g300)', background: '#fff',
                              fontSize: 13, fontWeight: 600, color: 'var(--tx)',
                              cursor: 'pointer', outline: 'none',
                            }}
                          >
                            <option value="">— All Sections —</option>
                            {moduleSections.map(s => (
                              <option key={s._id} value={String(s._id)}>{s.title}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Guidelines */}
                      {mod.readDetails && (
                        <div style={{
                          padding: '10px 14px', background: '#EFF6FF',
                          border: '1px solid #BFDBFE', borderRadius: 10,
                          fontSize: 13, color: '#1D4ED8', fontWeight: 500, marginBottom: 20
                        }}>
                          📋 {mod.readDetails}
                        </div>
                      )}

                      {/* Section category panels */}
                      {sectionGroups.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx-faint)', fontSize: 13 }}>
                          No input fields in this module.
                        </div>
                      ) : visibleGroups.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx-faint)', fontSize: 13 }}>
                          No inputs for the selected section in this module.
                        </div>
                      ) : (
                        visibleGroups.map((group) => {
                          const secKey = `${mod._id}-${group.id}`;
                          const isSecOpen = openSections[secKey] !== false; // default open
                          const secEarned = group.inputs.reduce((s, inp) => s + calcInputPoints(inp, answers[inp._id]), 0);
                          const secMax = group.inputs.reduce((s, inp) => s + calcInputMax(inp), 0);

                          const secFilled = group.inputs.filter(inp => isInputFilled(inp, answers)).length;
                          const secTotal = group.inputs.length;
                          const secFillPct = secTotal > 0 ? Math.round(secFilled / secTotal * 100) : 0;
                          const secAllDone = secFilled === secTotal && secTotal > 0;

                          return (
                            <div key={group.id} style={{
                              border: `1.5px solid ${secAllDone ? 'var(--g300)' : 'var(--border)'}`,
                              borderRadius: 14, overflow: 'hidden',
                              marginBottom: 14,
                              background: 'var(--bg-soft)',
                              boxShadow: 'var(--sh-xs)',
                            }}>
                              {/* Section category header — e-commerce style */}
                              <div
                                onClick={() => toggleSection(secKey)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: '12px 16px',
                                  background: isSecOpen
                                    ? 'linear-gradient(135deg,var(--g700),var(--g500))'
                                    : '#fff',
                                  cursor: 'pointer',
                                  borderBottom: isSecOpen ? '1px solid var(--g600)' : 'none',
                                  transition: 'background 0.2s',
                                }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                                  background: isSecOpen ? 'rgba(255,255,255,0.18)' : 'var(--g100)',
                                  border: isSecOpen ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--g200)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 14,
                                }}>▦</div>
                                <p style={{
                                  fontFamily: 'Montserrat,sans-serif', fontWeight: 800,
                                  fontSize: 14, margin: 0, flex: 1,
                                  color: isSecOpen ? '#fff' : 'var(--tx)',
                                }}>
                                  {group.title}
                                </p>
                                {/* Section mini score pill */}
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  padding: '4px 10px', borderRadius: 20,
                                  background: isSecOpen ? 'rgba(255,255,255,0.18)' : 'var(--g50)',
                                  border: isSecOpen ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--g200)',
                                }}>
                                  <span style={{
                                    fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
                                    fontSize: 13, color: isSecOpen ? '#fff' : 'var(--g700)',
                                  }}>{secEarned.toFixed(1)}</span>
                                  {secMax > 0 && (
                                    <span style={{
                                      fontSize: 11, fontWeight: 600,
                                      color: isSecOpen ? 'rgba(255,255,255,0.65)' : 'var(--tx-faint)',
                                    }}>/ {secMax} pts</span>
                                  )}
                                </div>
                                {/* Filled count chip */}
                                <span style={{
                                  fontSize: 10, fontWeight: 700,
                                  color: isSecOpen
                                    ? (secAllDone ? '#86EFAC' : 'rgba(255,255,255,0.65)')
                                    : (secAllDone ? 'var(--g700)' : 'var(--tx-faint)'),
                                  whiteSpace: 'nowrap',
                                }}>
                                  {secAllDone ? '✓ ' : ''}{secFilled}/{secTotal}
                                </span>
                                <div style={{
                                  fontSize: 16,
                                  color: isSecOpen ? 'rgba(255,255,255,0.8)' : 'var(--tx-faint)',
                                  transform: isSecOpen ? 'rotate(180deg)' : 'rotate(0)',
                                  transition: 'transform 0.2s',
                                }}>▾</div>
                              </div>
                              {/* Progress bar strip */}
                              <div style={{ height: 3, background: isSecOpen ? 'rgba(255,255,255,0.15)' : 'var(--bg-muted)' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${secFillPct}%`,
                                  background: isSecOpen ? 'rgba(255,255,255,0.6)' : 'var(--g500)',
                                  transition: 'width 0.5s ease',
                                  borderRadius: secFillPct < 100 ? '0 2px 2px 0' : 0,
                                }} />
                              </div>

                              {/* Section inputs */}
                              {isSecOpen && (
                                <div style={{ padding: 16 }}>
                                  <div className="pa-section-body" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

                                    {/* Left: input fields */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                      {group.inputs.map(inp => {
                                        const inputLocked = lockedInputIds.has(String(inp._id));
                                        return (
                                          <div key={inp._id} style={{
                                            background: inputLocked ? '#FAFAFA' : '#fff',
                                            border: `1px solid ${inputLocked ? '#E5E7EB' : 'var(--border)'}`,
                                            borderRadius: 12, padding: '14px',
                                            opacity: inputLocked ? 0.85 : 1,
                                          }}>
                                            {/* Question label */}
                                            <div style={{
                                              display: 'flex', alignItems: 'flex-start',
                                              justifyContent: 'space-between', gap: 8, marginBottom: 6
                                            }}>
                                              <p style={{
                                                fontWeight: 700, fontSize: 14,
                                                color: 'var(--tx)', margin: 0, lineHeight: 1.4, flex: 1
                                              }}>
                                                {inp.label}
                                                {inp.isRequired && (
                                                  <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>
                                                )}
                                              </p>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                                {showLockBadges && (
                                                  lockedInputIds.has(String(inp._id)) ? (
                                                    <span style={{
                                                      fontSize: 10, fontWeight: 800, padding: '2px 8px',
                                                      borderRadius: 6, background: '#FEF9C3',
                                                      color: '#92400E', border: '1px solid #FDE68A',
                                                      fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
                                                    }}>🔒 Locked</span>
                                                  ) : (
                                                    <span style={{
                                                      fontSize: 10, fontWeight: 800, padding: '2px 8px',
                                                      borderRadius: 6, background: '#D6F5E3',
                                                      color: '#145C28', border: '1px solid #A8EFC0',
                                                      fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
                                                    }}>✏️ Editable</span>
                                                  )
                                                )}
                                                <span style={{
                                                  fontSize: 10, fontWeight: 800,
                                                  padding: '2px 8px', borderRadius: 6,
                                                  background: {
                                                    number: '#EFF6FF', text: 'var(--g50)',
                                                    checkbox: '#FEF9C3', file: '#F5F0E8'
                                                  }[inp.inputType],
                                                  color: {
                                                    number: '#1D4ED8', text: 'var(--g700)',
                                                    checkbox: '#92400E', file: '#78350F'
                                                  }[inp.inputType],
                                                  letterSpacing: '0.06em', textTransform: 'uppercase',
                                                  fontFamily: 'Montserrat,sans-serif'
                                                }}>
                                                  {inp.inputType}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Instruction */}
                                            {inp.instruction && (
                                              <p style={{
                                                fontSize: 12.5, color: 'var(--tx-muted)',
                                                fontStyle: 'italic', margin: '0 0 10px',
                                                padding: '6px 10px', background: 'var(--bg-subtle)',
                                                borderRadius: 8, borderLeft: '3px solid var(--g300)'
                                              }}>
                                                {inp.instruction}
                                              </p>
                                            )}

                                            {/* Number */}
                                            {inp.inputType === 'number' && (() => {
                                              const sMin = inp.sliderMin != null ? Number(inp.sliderMin) : (inp.line?.x1 ?? 0);
                                              const sMax = inp.sliderMax != null ? Number(inp.sliderMax) : (inp.line?.x2 ?? 100);
                                              const rawVal = answers[inp._id];
                                              const hasVal = rawVal !== '' && rawVal !== undefined && rawVal !== null;
                                              const numVal = hasVal ? Math.min(Math.max(Number(rawVal), sMin), sMax) : sMin;
                                              const pct = sMax > sMin ? ((numVal - sMin) / (sMax - sMin)) * 100 : 0;
                                              const editable = isInputEditable(inp);
                                              return (
                                                <div>
                                                  {/* Number input + calculate button */}
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                                    <input type="number" className="input-field"
                                                      value={rawVal ?? ''}
                                                      onChange={e => handleChange(inp._id, e.target.value, 'number')}
                                                      placeholder="Enter value"
                                                      disabled={!editable}
                                                      style={{ maxWidth: 200 }} />
                                                    <a href="https://www.carbonfootprint.com/calculator.aspx" target='blank'>
                                                      <button className='p-1 border-2 text-white bg-green-500 rounded-lg'>calculate</button>
                                                    </a>
                                                  </div>

                                                  {/* ── Slider ── */}
                                                  <div style={{ marginBottom: 10, maxWidth: 360 }}>
                                                    <div style={{ position: 'relative', paddingTop: hasVal ? 24 : 6 }}>
                                                      {/* Bubble — only when value exists */}
                                                      {hasVal && (
                                                        <div style={{
                                                          position: 'absolute', top: 0,
                                                          left: `clamp(0px, calc(${pct}% - 18px), calc(100% - 36px))`,
                                                          background: 'var(--g600)', color: '#fff',
                                                          fontSize: 11, fontWeight: 700,
                                                          padding: '2px 7px', borderRadius: 6,
                                                          pointerEvents: 'none',
                                                          boxShadow: '0 2px 6px rgba(34,168,75,0.3)',
                                                        }}>
                                                          {rawVal}
                                                        </div>
                                                      )}

                                                      {/* Range slider */}
                                                      <input
                                                        type="range"
                                                        min={sMin} max={sMax} step={1}
                                                        value={numVal}
                                                        onChange={e => handleChange(inp._id, e.target.value, 'number')}
                                                        disabled={!editable}
                                                        style={{
                                                          width: '100%',
                                                          accentColor: 'var(--g600)',
                                                          cursor: editable ? 'pointer' : 'default',
                                                          opacity: editable ? 1 : 0.6,
                                                        }}
                                                      />
                                                    </div>

                                                    {/* Min / Max labels */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                                                      <span style={{ fontSize: 10, color: 'var(--tx-faint)', fontWeight: 600 }}>{sMin}</span>
                                                      <span style={{ fontSize: 10, color: 'var(--tx-faint)', fontWeight: 600 }}>{sMax}</span>
                                                    </div>
                                                  </div>

                                                  {/* Points info */}
                                                  {inp.line && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                                                      <span style={{
                                                        fontSize: 11, fontWeight: 600,
                                                        padding: '3px 9px', borderRadius: 7,
                                                        background: '#EFF6FF', color: '#1D4ED8',
                                                      }}>
                                                        ({inp.line.x1}, {inp.line.y1}pts) → ({inp.line.x2}, {inp.line.y2}pts)
                                                      </span>
                                                      {hasVal && (
                                                        <span style={{
                                                          fontSize: 11, fontWeight: 700,
                                                          padding: '3px 9px', borderRadius: 7,
                                                          background: 'var(--g100)', color: 'var(--g800)',
                                                          border: '1px solid var(--g300)',
                                                        }}>
                                                          = {calcInputPoints(inp, rawVal).toFixed(1)} pts ✓
                                                        </span>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}

                                            {/* Text */}
                                            {inp.inputType === 'text' && (
                                              <textarea className="input-field" rows={2}
                                                value={answers[inp._id] || ''}
                                                onChange={e => handleChange(inp._id, e.target.value, 'text')}
                                                placeholder="Enter your answer"
                                                disabled={!isInputEditable(inp)}
                                                style={{ resize: 'vertical' }} />
                                            )}

                                            {/* Checkbox */}
                                            {inp.inputType === 'checkbox' && (
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {inp.options?.map((opt, oi) => {
                                                  const checked = (answers[inp._id] || []).includes(opt.label);
                                                  return (
                                                    <label key={oi} style={{
                                                      display: 'flex',
                                                      alignItems: 'center', gap: 10, cursor: !isInputEditable(inp) ? 'default' : 'pointer',
                                                      padding: '9px 12px', borderRadius: 10,
                                                      background: checked ? 'var(--g50)' : 'var(--bg-soft)',
                                                      border: `1px solid ${checked ? 'var(--g300)' : 'var(--border)'}`,
                                                      transition: 'all 0.15s'
                                                    }}>
                                                      <input type="checkbox" checked={checked}
                                                        onChange={() => isInputEditable(inp) && handleChange(inp._id, opt.label, 'checkbox')}
                                                        disabled={!isInputEditable(inp)}
                                                        style={{
                                                          width: 16, height: 16,
                                                          accentColor: 'var(--g600)', cursor: 'pointer', flexShrink: 0
                                                        }} />
                                                      <span style={{
                                                        fontSize: 13.5, flex: 1,
                                                        fontWeight: checked ? 700 : 500,
                                                        color: checked ? 'var(--g800)' : 'var(--tx)'
                                                      }}>
                                                        {opt.label}
                                                      </span>
                                                      <span style={{
                                                        fontSize: 11.5, fontWeight: 700,
                                                        padding: '2px 8px', borderRadius: 6, flexShrink: 0,
                                                        background: checked ? 'var(--g100)' : 'var(--bg-muted)',
                                                        color: checked ? 'var(--g600)' : 'var(--tx-faint)',
                                                        transition: 'all 0.15s'
                                                      }}>
                                                        {opt.points}pts
                                                      </span>
                                                    </label>
                                                  );
                                                })}
                                              </div>
                                            )}

                                            {/* File */}
                                            {inp.inputType === 'file' && (
                                              <div>
                                                {inp.uploaded && (
                                                  <div style={{
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                    padding: '8px 12px', background: 'var(--g50)',
                                                    border: '1px solid var(--g200)', borderRadius: 9,
                                                    marginBottom: 8
                                                  }}>
                                                    <span style={{ color: 'var(--g600)' }}>✓</span>
                                                    <span style={{
                                                      fontSize: 12.5, fontWeight: 600,
                                                      color: 'var(--g700)', flex: 1, overflow: 'hidden',
                                                      textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                    }}>
                                                      {inp.originalName || 'File uploaded'}
                                                    </span>
                                                  </div>
                                                )}
                                                {isInputEditable(inp) && (
                                                  <label style={{
                                                    display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', gap: 10, padding: '14px',
                                                    border: '1.5px dashed var(--border-md)', borderRadius: 10,
                                                    cursor: 'pointer', background: 'var(--bg-soft)',
                                                    transition: 'all 0.2s'
                                                  }}
                                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--g400)'}
                                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-md)'}>
                                                    <span style={{ fontSize: 20 }}>📎</span>
                                                    <span style={{
                                                      fontSize: 13, fontWeight: 600,
                                                      color: 'var(--tx-muted)'
                                                    }}>
                                                      {inp.uploaded ? 'Replace file' : 'Upload document'}
                                                    </span>
                                                    <input type="file" style={{ display: 'none' }}
                                                      accept=".pdf,.jpg,.jpeg,.png"
                                                      onChange={e => handleFile(inp._id, e.target.files[0])} />
                                                  </label>
                                                )}
                                              </div>
                                            )}
                                            {/* Comment thread — visible to user; replies after full lock */}
                                            {dbUser && (
                                              <CommentThread
                                                projectId={project._id}
                                                inputId={inp._id}
                                                currentUserId={dbUser._id}
                                                currentRole={dbUser.role}
                                                isLocked={project?.status === 'submitted'}
                                                projectOwnerId={ownerId}
                                                initialCount={commentCounts[String(inp._id)] || 0}
                                              />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Right: section points box */}
                                    <PointsBox earned={secEarned} max={secMax} />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}

                      {/* Save button — show if any individually-unlocked input exists in this module */}
                      {allInputs.some(inp => !lockedInputIds.has(String(inp._id))) && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                          <button className="btn-primary-green"
                            onClick={() => saveModule(mod)}
                            disabled={saving === mod._id}>
                            {saving === mod._id
                              ? <><span style={{
                                display: 'inline-block', width: 14, height: 14,
                                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                                borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                              }} /> Saving…</>
                              : '💾 Save Module'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {/* ── Prev / Next tab navigation ── */}
          <div className="pa-tab-nav" style={{
            display: 'flex', justifyContent: 'space-between', gap: 12,
            marginTop: 24, paddingTop: 20,
            borderTop: '1px solid var(--border)',
          }}>
            <button
              disabled={activeTab === 0}
              onClick={() => { setActiveTab(t => t - 1); setOpenMod(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 12,
                border: '1.5px solid var(--border)',
                background: activeTab === 0 ? 'transparent' : '#fff',
                color: activeTab === 0 ? 'var(--tx-faint)' : 'var(--tx)',
                fontWeight: 700, fontSize: 13, cursor: activeTab === 0 ? 'default' : 'pointer',
                fontFamily: 'Montserrat,sans-serif',
                opacity: activeTab === 0 ? 0.4 : 1,
                transition: 'all 0.15s',
                boxShadow: activeTab === 0 ? 'none' : 'var(--sh-xs)',
              }}>
              ← <span>{activeTab > 0 ? `${activeTab}. ${tabs[activeTab - 1]?.title}` : 'Previous'}</span>
            </button>

            <button
              disabled={activeTab === tabs.length - 1}
              onClick={() => { setActiveTab(t => t + 1); setOpenMod(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 12,
                border: '1.5px solid var(--g300)',
                background: activeTab === tabs.length - 1 ? 'transparent' : 'linear-gradient(135deg,var(--g600),var(--g500))',
                color: activeTab === tabs.length - 1 ? 'var(--tx-faint)' : '#fff',
                fontWeight: 700, fontSize: 13,
                cursor: activeTab === tabs.length - 1 ? 'default' : 'pointer',
                fontFamily: 'Montserrat,sans-serif',
                opacity: activeTab === tabs.length - 1 ? 0.4 : 1,
                transition: 'all 0.15s',
                boxShadow: activeTab === tabs.length - 1 ? 'none' : '0 2px 12px rgba(34,168,75,0.25)',
              }}>
              <span>{activeTab < tabs.length - 1 ? `${activeTab + 2}. ${tabs[activeTab + 1]?.title}` : 'Next'}</span> →
            </button>
          </div>
        </>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Desktop: hide mobile tab toggle ── */
        @media (min-width: 769px) {
          .pa-tabs-mobile { display: none !important; }
        }

        /* ═══════════════════════════════════════
           MOBILE  ≤ 768px
        ═══════════════════════════════════════ */
        @media (max-width: 768px) {

          /* Hide desktop tab bar, show mobile toggle */
          .pa-tabs-desktop { display: none !important; }
          .pa-tabs-mobile  { display: block !important; }

          /* Score card: top row wraps nicely */
          .pa-scorecard-toprow {
            gap: 8px !important;
            padding: 8px 12px !important;
          }
          .pa-scorecard-buttons {
            justify-content: flex-start !important;
          }

          /* Toggle button — hide text label on mobile, icon only */
          .pa-toggle-label { display: none !important; }

          /* Score card body */
          .pa-score-body {
            gap: 12px !important;
            padding: 14px 14px !important;
          }
          .pa-score-leaf    { display: none !important; }
          /* Hide banner + level track on mobile — no space */
          .pa-score-banner  { display: none !important; }
          .pa-level-track   { display: none !important; }
          .pa-score-info    { min-width: 0 !important; }
          .pa-score-pct     { font-size: 26px !important; }

          /* Section inputs: stack PointsBox below inputs */
          .pa-section-body {
            flex-direction: column-reverse !important;
            gap: 10px !important;
          }

          /* PointsBox: horizontal bar when stacked */
          .pa-section-body > div:last-child {
            width: 100% !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 10px 16px !important;
            position: static !important;
          }

          /* Module header: hide pts number */
          .pa-mod-pts { display: none !important; }

          /* Prev/Next nav: full width buttons */
          .pa-tab-nav > button {
            flex: 1 !important;
            justify-content: center !important;
            font-size: 12px !important;
            padding: 10px 10px !important;
          }
          .pa-tab-nav > button > span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 100px;
          }
        }

        /* ═══════════════════════════════════════
           SMALL  ≤ 480px — extra compact
        ═══════════════════════════════════════ */
        @media (max-width: 480px) {
          .pa-score-pct  { font-size: 22px !important; }
          .pa-scorecard-toprow { padding: 6px 10px !important; }
          .pa-score-body { padding: 10px !important; }
          .pa-scorecard-buttons > a,
          .pa-scorecard-buttons > button { font-size: 12px !important; padding: 7px 12px !important; }
        }
      `}</style>
    </Layout>
  );
}
