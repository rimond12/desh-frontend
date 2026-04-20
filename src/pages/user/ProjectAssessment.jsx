import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { LeafBadge, ColoredLeaf } from '../../components/shared/LeafLogo.jsx';
import CommentThread from '../../components/shared/CommentThread.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

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

// Calculate earned + max for a section (+ optional extra constant section IDs)
function calcSectionScore(sectionId, tabs, answers, extraIds = []) {
  const ids = new Set([String(sectionId), ...extraIds.map(String)]);
  let earned = 0, max = 0;
  tabs.forEach(tab => {
    (tab.modules || []).forEach(mod => {
      getModuleInputs(mod).forEach(inp => {
        if (ids.has(String(inp.sectionId))) {
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

// Abbreviate a tab name to a short code, e.g. "Climate Change" → "1. CC"
const SKIP_WORDS = new Set(['and', 'or', 'of', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'after', 'before']);
function abbreviateTabName(name, index) {
  const prefix = `${index + 1}.`;
  if (!name) return `${prefix} T`;
  const words = name.split(/[\s\-/]+/).filter(w => w.length > 0 && !SKIP_WORDS.has(w.toLowerCase()));
  const abbr = words.map(w => w[0].toUpperCase()).join('').slice(0, 3) || name.slice(0, 2).toUpperCase();
  return `${prefix} ${abbr}`;
}

// Sum earned + max points across all modules of a single tab
function calcTabScore(tab, answers) {
  let earned = 0, max = 0;
  (tab.modules || []).forEach(mod => {
    getModuleInputs(mod).forEach(inp => {
      earned += calcInputPoints(inp, answers[inp._id] ?? (inp.inputType === 'checkbox' ? [] : ''));
      max += calcInputMax(inp);
    });
  });
  return { earned: Math.round(earned * 10) / 10, max };
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
        {Math.round(earned)}
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
  // Score card expand/collapse toggle
  const [scoreOpen, setScoreOpen] = useState(true);
  // Instruction popup modal
  const [instrModal, setInstrModal] = useState({ open: false, label: '', html: '' });

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

  // Surgical update: update one input's documents inside tabs without full reload
  const patchInputDocs = (inputId, updater) => {
    setTabs(prev => prev.map(tab => ({
      ...tab,
      modules: tab.modules.map(mod => ({
        ...mod,
        inputs: mod.inputs.map(inp => {
          if (String(inp._id) !== String(inputId)) return inp;
          const newDocs = updater(inp.documents || []);
          return { ...inp, documents: newDocs, uploaded: newDocs.length > 0 };
        }),
      })),
    })));
  };

  const handleFile = async (inputId, files) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    for (const file of files) fd.append('files', file);
    fd.append('inputId', inputId);
    try {
      const res = await ax.post(`/projects/${id}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Surgically append new docs — no full reload, no scroll jump
      const newFiles = res.data.files || [];
      patchInputDocs(inputId, existing => [...existing, ...newFiles]);
      toast.success(files.length > 1 ? `${files.length} files uploaded!` : 'File uploaded!');
    } catch { toast.error('Upload failed'); }
  };

  const handleDeleteFile = async (inputId, filename) => {
    if (!window.confirm('Remove this file?')) return;
    try {
      await ax.delete(`/projects/${id}/documents/${encodeURIComponent(filename)}`);
      // Surgically remove the doc — no scroll jump
      patchInputDocs(inputId, existing => existing.filter(d => d.filename !== filename));
      toast.success('File removed.');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to remove file'); }
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
  const constantSections = sortedGlobalSections.filter(s => s.isConstant);
  const regularSections = sortedGlobalSections.filter(s => !s.isConstant);
  const constantSectionIds = constantSections.map(s => String(s._id));

  const sectionScore = selectedSection
    ? calcSectionScore(selectedSection, tabs, answers, constantSectionIds)
    : null;
  const sectionLeaf = sectionScore
    ? getLeafLevel(sectionScore.pct, leafRules)
    : null;
  const selectedSectionName = regularSections.find(s => String(s._id) === selectedSection)?.title || '';

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
  const displayPts = Math.round(displayMode ? (sectionScore?.earned ?? 0) : (project?.totalPoints || 0));
  const displayMax = Math.round(displayMode ? (sectionScore?.max ?? 0) : (project?.maxPoints || 0));
  const activeRule = displayMode ? sectionLeaf : overallLeafRule;
  const displayLevel = displayMode ? (sectionLeaf?.name || null) : displayLeaf;
  const displayColorCode = displayMode ? (sectionLeaf?.colorCode || null) : (overallLeafRule?.colorCode || null);
  const progressColor = displayColorCode || '#94A3B8';

  const isLocked = project?.isLocked || false;
  const ownerId = project?.userId || dbUser?._id;

  // Per-question lock set (populated as reviewer adds comments)
  const lockedInputIds = new Set((project?.lockedInputs || []).map(String));

  // A question is editable only when project is not globally locked AND not individually locked
  const isInputEditable = (inp) => !isLocked && !lockedInputIds.has(String(inp._id));

  // Show lock/editable status badges once the project is submitted (in review phase)
  const showLockBadges = project?.status === 'submitted' || lockedInputIds.size > 0;

  // Legacy flag kept only for the Submit button and module-level save visibility
  const isEditable = !isLocked && project?.status !== 'submitted';

  return (
    <Layout>
      {/* ── Instruction Popup Modal ── */}
      {instrModal.open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setInstrModal({ open: false, label: '', html: '' })}
        >
          <div
            style={{
              background: '#fff', borderRadius: 20, width: '100%', maxWidth: 660,
              maxHeight: '82vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 22px', borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 10, background: '#22A84B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>📋</span>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22A84B', margin: 0, fontFamily: 'Montserrat,sans-serif' }}>Instruction</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', margin: 0, lineHeight: 1.3 }}>{instrModal.label}</p>
                </div>
              </div>
              <button
                onClick={() => setInstrModal({ open: false, label: '', html: '' })}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-soft)', color: 'var(--tx-muted)',
                  cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>✕</button>
            </div>
            {/* Body */}
            <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
              <div className="instruction-html-body" dangerouslySetInnerHTML={{ __html: instrModal.html }} />
            </div>
          </div>
        </div>
      )}

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--g700)',
              fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
            }}>Section</span>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: 8,
                border: '1.5px solid var(--g200)', background: '#fff',
                fontSize: 13, fontWeight: 600, color: 'var(--tx)',
                cursor: 'pointer', outline: 'none', maxWidth: 260,
              }}>
              <option value="">— Overall Score —</option>
              {regularSections.map(s => (
                <option key={s._id} value={s._id}>{s.title}</option>
              ))}
            </select>
          </div>

          {/* Project title — centered */}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '0 8px' }}>
            {editingTitle ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
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
                    padding: '5px 10px', borderRadius: 8, fontSize: 14,
                    fontFamily: 'Montserrat,sans-serif', fontWeight: 700,
                    border: '1.5px solid var(--g300)', background: '#fff',
                    color: 'var(--tx)', outline: 'none', minWidth: 0, maxWidth: 380, width: '100%',
                  }}
                />
                <button onClick={saveTitleEdit} disabled={savingTitle || !editTitle.trim()} style={{
                  background: 'rgba(34,168,75,0.12)', border: '1px solid rgba(34,168,75,0.4)',
                  color: 'var(--g700)', borderRadius: 7, padding: '4px 10px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  opacity: savingTitle || !editTitle.trim() ? 0.5 : 1, flexShrink: 0,
                }}>{savingTitle ? '…' : 'Save'}</button>
                <button onClick={cancelTitleEdit} style={{
                  background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.12)',
                  color: 'var(--tx-muted)', borderRadius: 7, padding: '4px 10px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
                <h2 style={{
                  fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
                  fontSize: 15, color: 'var(--tx)', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {project?.title}
                </h2>
                {project?.status !== 'submitted' && !isLocked && (
                  <button onClick={startTitleEdit} title="Rename project" style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--g500)', fontSize: 14, padding: '2px 4px',
                    borderRadius: 5, lineHeight: 1, flexShrink: 0,
                    transition: 'color 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--g700)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--g500)'}
                  >✎</button>
                )}
              </div>
            )}
            {displayMode && (
              <p style={{
                fontSize: 10, fontWeight: 700, color: 'var(--g700)',
                margin: '2px 0 0', fontFamily: 'Montserrat,sans-serif',
                letterSpacing: '0.04em',
              }}>▦ {selectedSectionName}</p>
            )}
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

          // Per-tab bar chart data
          const tabChartData = tabs.map((tab, i) => {
            const { earned, max } = calcTabScore(tab, answers);
            return {
              name: abbreviateTabName(tab.title || tab.name || '', i),
              fullName: tab.title || tab.name || `Tab ${i + 1}`,
              allocated: max,
              achieved: Math.round(earned),
            };
          });

          // Custom tooltip for the bar chart
          const ChartTooltip = ({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const item = tabChartData.find(d => d.name === label);
            return (
              <div style={{
                background: '#fff', border: '1.5px solid var(--border)',
                borderRadius: 10, padding: '10px 14px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 160,
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', margin: '0 0 6px', fontFamily: 'Montserrat,sans-serif' }}>
                  {item?.fullName || label}
                </p>
                {payload.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: entry.fill, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--tx-muted)' }}>{entry.name}:</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            );
          };

          // Leaf size: shrink slightly when many leaves so they always fit
          const leafCount = sortedLeafRules.length;
          const leafSize = leafCount >= 6 ? 62 : leafCount >= 5 ? 68 : 76;

          return (
            <div className="pa-score-body" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', width: '100%' }}>

              {/* ── LEFT: leaf gallery + progress track + score ── */}
              <div className="pa-score-left" style={{
                flex: '1 1 300px',
                minWidth: 0,
                display: 'flex', flexDirection: 'column', gap: 10,
                padding: '14px 18px 14px 20px',
              }}>

                {/* Unified leaf + bar columns — each leaf sits exactly above its bar segment */}
                {sortedLeafRules.length > 0 && (
                  <div className="pa-level-track" style={{ display: 'flex', width: '100%', gap: 4, alignItems: 'flex-end' }}>
                    {sortedLeafRules.map((rule, i) => {
                      const segSpan = rule.maxPercent - rule.minPercent;
                      const isActive = displayLevel === rule.name;
                      const color = rule.colorCode || '#94A3B8';
                      const rangeLabel = `${rule.minPercent}–${rule.maxPercent}%`;
                      const segFill = displayPct <= rule.minPercent ? 0
                        : displayPct >= rule.maxPercent ? 100
                        : ((displayPct - rule.minPercent) / segSpan) * 100;
                      return (
                        <div
                          key={rule._id || rule.name}
                          style={{
                            flex: segSpan,
                            minWidth: 0,
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          {/* Leaf */}
                          <div style={{
                            display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
                            width: '100%',
                            paddingBottom: 2,
                            opacity: isActive ? 1 : 0.4,
                            transform: isActive ? 'scale(1.08) translateY(-3px)' : 'scale(1)',
                            transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                          }}>
                            <ColoredLeaf
                              level=""
                              colorCode={rule.colorCode}
                              imageUrl={rule.imageUrl ? `${SERVER_URL}${rule.imageUrl}` : null}
                              size={leafSize}
                            />
                          </div>

                          {/* Range % */}
                          <span style={{
                            fontSize: 9, fontWeight: isActive ? 800 : 500,
                            fontFamily: 'Montserrat,sans-serif',
                            color: isActive ? color : 'var(--tx-faint)',
                            textAlign: 'center', whiteSpace: 'nowrap',
                            lineHeight: 1.2,
                          }}>
                            {rangeLabel}
                          </span>

                          {/* Leaf name */}
                          <span style={{
                            fontSize: 9, fontWeight: isActive ? 700 : 400,
                            fontFamily: 'Montserrat,sans-serif',
                            color: isActive ? color : 'var(--tx-faint)',
                            textAlign: 'center', lineHeight: 1.2,
                            width: '100%',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {rule.name}
                          </span>

                          {/* Progress bar segment */}
                          <div style={{
                            width: '100%', height: 8, borderRadius: 99,
                            background: 'rgba(0,0,0,0.10)', overflow: 'hidden',
                            position: 'relative',
                            boxShadow: isActive ? `0 0 0 1.5px ${color}66` : 'none',
                            transition: 'box-shadow 0.3s',
                          }}>
                            <div style={{
                              position: 'absolute', left: 0, top: 0, bottom: 0,
                              width: `${segFill}%`,
                              background: color,
                              borderRadius: 99,
                              transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                            }} />
                          </div>

                          {/* Active arrow */}
                          <div style={{
                            fontSize: 8, lineHeight: 1,
                            color: isActive ? color : 'transparent',
                            transition: 'color 0.3s',
                          }}>▲</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Score % + pts + badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="pa-score-pct" style={{
                    fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 30,
                    lineHeight: 1, color: progressColor || 'var(--tx)',
                  }}>
                    {displayPct}%
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--tx-muted)',
                    background: 'rgba(0,0,0,0.06)', borderRadius: 6,
                    padding: '2px 8px',
                  }}>
                    {Math.round(displayPts)} / {displayMax} pts
                  </span>
                  {displayLevel ? <LeafBadge level={displayLevel} /> : null}
                  <span className={project?.status === 'submitted'
                    ? 'status-chip status-completed'
                    : 'status-chip status-progress'}>
                    {project?.status === 'submitted' ? '✓ Submitted' : '● Draft'}
                  </span>
                  {reviewCfg && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '2px 10px', borderRadius: 99, fontSize: 11,
                      fontWeight: 700, fontFamily: 'Montserrat,sans-serif',
                      whiteSpace: 'nowrap', border: `1px solid ${reviewCfg.border}`,
                      background: reviewCfg.bg, color: reviewCfg.color,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: reviewCfg.dot, flexShrink: 0 }} />
                      {reviewCfg.label}
                    </span>
                  )}
                </div>
              </div>

              {/* ── RIGHT: per-tab bar chart ── */}
              <div className="pa-score-chart" style={{
                flex: '1 1 260px',
                minWidth: 0,
                display: 'flex', flexDirection: 'column',
                borderLeft: '1px solid rgba(34,168,75,0.15)',
                padding: '14px 14px 10px 12px',
              }}>
                <p style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--g700)',
                  fontFamily: 'Montserrat,sans-serif', marginBottom: 4,
                }}>
                  Score by Tab
                </p>

                {tabChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={tabChartData}
                      barGap={0}
                      barCategoryGap="12%"
                      margin={{ top: 2, right: 4, left: -22, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 9, fontWeight: 600, fill: '#6B7280', fontFamily: 'Montserrat,sans-serif' }}
                        axisLine={false} tickLine={false} interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 8, fill: '#9CA3AF' }}
                        axisLine={false} tickLine={false} width={26}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(34,168,75,0.05)' }} />
                      <Legend
                        iconType="circle" iconSize={7}
                        wrapperStyle={{ fontSize: 10, paddingTop: 4, fontFamily: 'Nunito,sans-serif' }}
                      />
                      <Bar dataKey="achieved" name="Achieved" fill="#F59E0B" radius={[3,3,0,0]} maxBarSize={10} />
                      <Bar dataKey="allocated" name="Allocated" fill="#34C961" radius={[3,3,0,0]} maxBarSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: 'var(--tx-faint)',
                  }}>
                    No tab data yet
                  </div>
                )}
              </div>

            </div>
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
          {/* ── Tab selector — two-row grid ── */}
          <div style={{
            marginBottom: 16,
            background: '#fff',
            borderRadius: 16,
            border: '1.5px solid var(--g200)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>
            {/* Tab grid — wraps into 2 rows */}
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {tabs.map((tab, i) => {
                const isActive = i === activeTab;
                const rowSize = Math.ceil(tabs.length / 2);
                const isSecondRow = i >= rowSize;
                return (
                  <button
                    key={tab._id}
                    onClick={() => { setActiveTab(i); setOpenMod(null); }}
                    style={{
                      flex: `1 1 calc(${100 / rowSize}% - 1px)`,
                      minWidth: 0,
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '11px 13px',
                      border: 'none',
                      borderTop: isSecondRow ? '1px solid var(--g100)' : 'none',
                      borderRight: '1px solid var(--g100)',
                      background: isActive ? 'var(--g50)' : 'transparent',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.15s',
                      textAlign: 'left',
                    }}>
                    {/* Green active bottom bar */}
                    {isActive && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: 3,
                        background: 'linear-gradient(90deg,var(--g600),var(--g400))',
                        borderRadius: '3px 3px 0 0',
                      }} />
                    )}

                    {/* Icon badge */}
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: isActive
                        ? 'linear-gradient(135deg,var(--g700),var(--g500))'
                        : 'var(--bg-subtle)',
                      border: isActive ? 'none' : '1px solid var(--g200)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                      boxShadow: isActive ? '0 2px 8px rgba(34,168,75,0.25)' : 'none',
                      transition: 'all 0.15s',
                    }}>
                      {tab.iconUrl ? (
                        <img src={`${SERVER_URL}${tab.iconUrl}`} alt=""
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                          style={{ width: 18, height: 18, objectFit: 'contain' }} />
                      ) : (
                        <span style={{
                          fontSize: 12, fontWeight: 900,
                          color: isActive ? '#fff' : 'var(--tx-faint)',
                          fontFamily: 'Montserrat,sans-serif',
                        }}>{i + 1}</span>
                      )}
                    </div>

                    {/* Tab title */}
                    <span style={{
                      fontSize: 12, fontWeight: isActive ? 800 : 600,
                      fontFamily: 'Montserrat,sans-serif',
                      color: isActive ? 'var(--g700)' : 'var(--tx-muted)',
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      minWidth: 0,
                    }}>
                      {i + 1}. {tab.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: 'var(--g100)' }}>
              <div style={{
                height: '100%',
                width: `${((activeTab + 1) / tabs.length) * 100}%`,
                background: 'linear-gradient(90deg,var(--g600),var(--g400))',
                borderRadius: '0 2px 0 0',
                transition: 'width 0.35s ease',
              }} />
            </div>
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
                    iconUrl: s.iconUrl || '',
                    isConstant: s.isConstant || false,
                    inputs: grouped[String(s._id)],
                  })),
                ...(grouped['none'] ? [{ id: 'none', title: 'Uncategorized', iconUrl: '', isConstant: false, inputs: grouped['none'] }] : []),
              ];

              // When a section is selected, show that section + all constant sections
              const visibleGroups = selectedSection
                ? sectionGroups.filter(g => g.id === selectedSection || g.isConstant)
                : sectionGroups;

              // Only regular (non-constant) sections in per-module switcher
              const moduleSections = regularSections.filter(s => grouped[String(s._id)]);

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
                        {Math.round(modPts)}
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
                                  fontSize: 14, overflow: 'hidden',
                                }}>
                                  {group.iconUrl
                                    ? <img src={`${SERVER_URL}${group.iconUrl}`} alt=""
                                      style={{ width: 22, height: 22, objectFit: 'contain', filter: isSecOpen ? 'brightness(10)' : 'none' }}
                                      onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                                    : null}
                                  <span style={{ display: group.iconUrl ? 'none' : 'flex', color: isSecOpen ? '#fff' : 'var(--g600)', fontSize: 14 }}>▦</span>
                                </div>
                                <p style={{
                                  fontFamily: 'Montserrat,sans-serif', fontWeight: 800,
                                  fontSize: 14, margin: 0, flex: 1,
                                  color: isSecOpen ? '#fff' : 'var(--tx)',
                                  display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                  {group.title}
                                  {/* {group.isConstant && (
                                    <span style={{
                                      fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99,
                                      background: isSecOpen ? 'rgba(255,255,255,0.22)' : '#FFF7ED',
                                      color: isSecOpen ? '#fff' : '#9A3412',
                                      border: isSecOpen ? '1px solid rgba(255,255,255,0.3)' : '1px solid #FED7AA',
                                      flexShrink: 0,
                                    }}>⚡ Constant</span>
                                  )} */}
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

                                            {/* Instruction button */}
                                            {inp.instruction && (
                                              <div style={{ marginBottom: 10 }}>
                                                <button
                                                  type="button"
                                                  onClick={() => setInstrModal({ open: true, label: inp.label, html: inp.instruction })}
                                                  style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                                    padding: '4px 11px', borderRadius: 8, cursor: 'pointer',
                                                    border: '1.5px solid #A8EFC0',
                                                    background: '#F0FDF4', color: '#145C28',
                                                    fontSize: 12, fontWeight: 700,
                                                    fontFamily: 'Montserrat,sans-serif',
                                                    transition: 'background 0.15s, border-color 0.15s',
                                                  }}
                                                  onMouseEnter={e => { e.currentTarget.style.background = '#DCFCE7'; e.currentTarget.style.borderColor = '#22A84B'; }}
                                                  onMouseLeave={e => { e.currentTarget.style.background = '#F0FDF4'; e.currentTarget.style.borderColor = '#A8EFC0'; }}
                                                >
                                                  <span style={{ fontSize: 13 }}>📋</span> Instruction
                                                </button>
                                              </div>
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
                                                  {/* Number input */}
                                                  <div style={{ marginBottom: 14 }}>
                                                    <input type="number" className="input-field"
                                                      value={rawVal ?? ''}
                                                      onChange={e => handleChange(inp._id, e.target.value, 'number')}
                                                      placeholder="Enter value"
                                                      disabled={!editable}
                                                      style={{ maxWidth: 200 }} />
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
                                                {inp.documents && inp.documents.length > 0 && (
                                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                                                    {inp.documents.map((doc, di) => (
                                                      <div key={doc.filename || di} style={{
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                        padding: '7px 12px', background: 'var(--g50)',
                                                        border: '1px solid var(--g200)', borderRadius: 9,
                                                      }}>
                                                        <span style={{ color: 'var(--g600)', fontSize: 14, flexShrink: 0 }}>📎</span>
                                                        <span style={{
                                                          fontSize: 12.5, fontWeight: 600,
                                                          color: 'var(--g700)', flex: 1, overflow: 'hidden',
                                                          textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                        }}>
                                                          {doc.originalName || 'Uploaded file'}
                                                        </span>
                                                        <span style={{ fontSize: 10, color: 'var(--g500)', flexShrink: 0 }}>#{di + 1}</span>
                                                        {isInputEditable(inp) && (
                                                          <button
                                                            onClick={() => handleDeleteFile(inp._id, doc.filename)}
                                                            title="Remove this file"
                                                            style={{
                                                              flexShrink: 0, width: 20, height: 20,
                                                              borderRadius: '50%', border: 'none',
                                                              background: 'rgba(239,68,68,0.1)',
                                                              color: '#EF4444', fontSize: 13, fontWeight: 700,
                                                              cursor: 'pointer', display: 'flex',
                                                              alignItems: 'center', justifyContent: 'center',
                                                              lineHeight: 1, padding: 0,
                                                            }}
                                                          >×</button>
                                                        )}
                                                      </div>
                                                    ))}
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
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-muted)' }}>
                                                      {inp.uploaded ? 'Add more files' : 'Upload documents'}
                                                    </span>
                                                    <input type="file" style={{ display: 'none' }}
                                                      accept=".pdf,.jpg,.jpeg,.png"
                                                      multiple
                                                      onChange={e => handleFile(inp._id, Array.from(e.target.files))} />
                                                  </label>
                                                )}
                                              </div>
                                            )}
                                            {/* Calculate Button — shown only when URL is configured */}
                                            {inp.calcBtn?.url && (
                                              <div style={{
                                                marginTop: 14,
                                                paddingTop: 12,
                                                borderTop: '1px solid var(--border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                flexWrap: 'wrap',
                                              }}>
                                                <a
                                                  href={inp.calcBtn.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  style={{ textDecoration: 'none', flexShrink: 0 }}
                                                >
                                                  <button
                                                    style={{
                                                      padding: '9px 22px',
                                                      borderRadius: 10,
                                                      border: 'none',
                                                      cursor: 'pointer',
                                                      background: inp.calcBtn.color || '#22A84B',
                                                      color: '#fff',
                                                      fontWeight: 700,
                                                      fontSize: 13,
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: 7,
                                                      boxShadow: `0 3px 12px ${(inp.calcBtn.color || '#22A84B')}44`,
                                                      transition: 'opacity 0.18s, transform 0.18s, box-shadow 0.18s',
                                                      fontFamily: 'inherit',
                                                      letterSpacing: '0.01em',
                                                    }}
                                                    onMouseEnter={e => {
                                                      e.currentTarget.style.opacity = '0.88';
                                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                                      e.currentTarget.style.boxShadow = `0 6px 18px ${(inp.calcBtn.color || '#22A84B')}55`;
                                                    }}
                                                    onMouseLeave={e => {
                                                      e.currentTarget.style.opacity = '1';
                                                      e.currentTarget.style.transform = 'translateY(0)';
                                                      e.currentTarget.style.boxShadow = `0 3px 12px ${(inp.calcBtn.color || '#22A84B')}44`;
                                                    }}
                                                  >
                                                    🧮 {inp.calcBtn.name || 'Calculate'}
                                                  </button>
                                                </a>
                                                <span style={{
                                                  fontSize: 11,
                                                  color: 'var(--tx-faint)',
                                                  fontWeight: 500,
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: 4,
                                                }}>
                                                  ↗ opens in new tab
                                                </span>
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

          /* Score card body — stack on mobile */
          .pa-score-body  { flex-direction: column !important; }
          .pa-score-left  { flex: 1 1 100% !important; padding: 12px 14px 10px !important; }
          /* Chart: full width, top border instead of left border */
          .pa-score-chart {
            flex: 1 1 100% !important;
            border-left: none !important;
            border-top: 1px solid rgba(34,168,75,0.15) !important;
            padding: 10px 14px 10px !important;
          }
          .pa-level-track { display: none !important; }
          .pa-score-pct   { font-size: 26px !important; }

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
