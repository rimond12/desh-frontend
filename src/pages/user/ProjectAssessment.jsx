import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { LeafBadge, ColoredLeaf } from '../../components/shared/LeafLogo.jsx';
import CommentThread from '../../components/shared/CommentThread.jsx';
import CreateTicketModal from '../../components/tickets/CreateTicketModal.jsx';
import CollaboratorsOwnersModal from '../../components/CollaboratorsOwnersModal.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { RiInformation2Fill } from 'react-icons/ri';

const getDynamicApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_URL.includes("localhost")) {
    return process.env.REACT_APP_API_URL;
  }
  if (typeof window !== "undefined" && window.location) {
    const { hostname } = window.location;
    if (hostname.includes("deshboard.org")) {
      return "https://api.deshboard.org/api";
    }
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return window.location.origin.replace(/\/\/(app|www)\./, '//api.') + '/api';
    }
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

const getDynamicServerUrl = () => {
  return getDynamicApiBaseUrl().replace(/\/api\/?$/, '');
};

const SERVER_URL = getDynamicServerUrl();

const ACHIEVED_COLORS = ['#C0392B', '#4B5563', '#EA7C0C', '#2563EB', '#166534', '#7C3AED', '#92400E'];

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
  const location = useLocation();
  const ax = useAxiosSecure();
  const { dbUser } = useAuth();

  const [project, setProject] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [openMod, setOpenMod] = useState(null);
  const [openSections, setOpenSections] = useState({}); // track which section panels are open
  const [answers, setAnswers] = useState({});
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved' | 'error'
  const [submitting, setSubmitting] = useState(false);
  const saveTimerRef = useRef(null);
  const pendingChangesRef = useRef({}); // { inputId: value } — only what changed
  const pendingSaveRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [displayLeaf, setDisplayLeaf] = useState(null);

  // Ticket Modal & Question Highlight state
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketQuestionContext, setTicketQuestionContext] = useState(null);
  const [highlightedInputId, setHighlightedInputId] = useState(null);

  // Check role permission for Create Ticket button — professionals do not create tickets
  const canCreateTicket = false;

  // URL Query Parameters listener for "Go to Linked Question" navigation
  useEffect(() => {
    if (!tabs || tabs.length === 0) return;

    const queryParams = new URLSearchParams(location.search);
    const targetTabId = queryParams.get('tabId');
    const targetModuleId = queryParams.get('moduleId');
    const targetInputId = queryParams.get('inputId');

    if (!targetInputId && !targetTabId && !targetModuleId) return;

    let targetTabIdx = -1;
    let targetModId = targetModuleId || null;
    let targetSecId = null;

    if (targetInputId) {
      tabs.forEach((tab, tIdx) => {
        (tab.modules || []).forEach((mod) => {
          const modInputs = getModuleInputs(mod);
          const foundInp = modInputs.find(inp => String(inp._id) === String(targetInputId));
          if (foundInp) {
            targetTabIdx = tIdx;
            targetModId = mod._id;
            targetSecId = foundInp.sectionId || null;
          }
        });
      });
    }

    if (targetTabIdx === -1 && targetTabId) {
      const idx = tabs.findIndex(t => String(t._id) === String(targetTabId));
      if (idx !== -1) targetTabIdx = idx;
    }

    if (targetTabIdx !== -1) {
      setActiveTab(targetTabIdx);
    }
    if (targetModId) {
      setOpenMod(targetModId);
    }
    if (targetSecId) {
      setOpenSections(prev => ({ ...prev, [targetSecId]: true }));
    }

    if (targetInputId) {
      setHighlightedInputId(targetInputId);
      let attempts = 0;
      const tryScroll = () => {
        attempts++;
        const el = document.getElementById(`input-${targetInputId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (attempts < 10) {
          setTimeout(tryScroll, 200);
        }
      };
      setTimeout(tryScroll, 200);
      setTimeout(() => setHighlightedInputId(null), 5000);
    }
  }, [location.search, tabs]);

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
  const [projectComments, setProjectComments] = useState([]);
  // Score card expand/collapse toggle
  const [scoreOpen, setScoreOpen] = useState(true);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
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
      .then(r => {
        setGlobalSections(r.data.sections || []);
      })
      .catch(() => { });
    ax.get('/settings/eval-rules')
      .then(r => {
        setLeafRules(r.data.rules || []);
      })
      .catch(() => { });
    ax.get(`/comments/by-project/${id}`)
      .then(r => {
        setProjectComments(r.data.comments || []);
        const counts = {};
        (r.data.comments || []).forEach(c => {
          const key = String(c.inputId);
          counts[key] = (counts[key] || 0) + 1;
        });
        setCommentCounts(counts);
      })
      .catch(() => { });
  }, [id]);

  useLayoutEffect(() => {
    if (openMod) {
      const element = document.getElementById(`module-${openMod}`);
      if (element) {
        const scorecard = document.getElementById('sticky-scorecard');
        const scorecardHeight = scorecard ? scorecard.offsetHeight : 0;
        const pageContent = document.querySelector('.page-content');
        if (pageContent) {
          const rect = element.getBoundingClientRect();
          const pageContentRect = pageContent.getBoundingClientRect();
          const absoluteTop = pageContent.scrollTop + (rect.top - pageContentRect.top);
          const targetY = absoluteTop - scorecardHeight - 15;
          pageContent.scrollTo({ top: targetY, behavior: 'auto' });
        } else {
          const rect = element.getBoundingClientRect();
          const targetY = window.pageYOffset + rect.top - scorecardHeight - 15;
          window.scrollTo({ top: targetY, behavior: 'auto' });
        }
      }
    }
  }, [openMod]);

  const scrollToTop = (behavior = 'smooth') => {
    const pageContent = document.querySelector('.page-content');
    if (pageContent) {
      pageContent.scrollTo({ top: 0, behavior });
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const performSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    // Snapshot and clear pending changes atomically
    const changedEntries = Object.entries(pendingChangesRef.current);
    if (changedEntries.length === 0) {
      setSaveStatus('saved');
      pendingSaveRef.current = false;
      return;
    }

    setSaveStatus('saving');
    const toSave = changedEntries.map(([inputId, value]) => ({ inputId, value }));
    // Clear pending right away so concurrent edits accumulate fresh
    pendingChangesRef.current = {};

    try {
      const r = await ax.patch(`/projects/${id}/answers`, { answers: toSave });
      setProject(p => ({
        ...p,
        totalPoints: r.data.totalPoints,
        maxPoints: r.data.maxPoints,
        scorePercent: r.data.scorePercent,
        leafLevel: r.data.leafLevel,
      }));
      setDisplayLeaf(r.data.leafLevel);
      pendingSaveRef.current = false;
      setSaveStatus('saved');
    } catch (err) {
      console.error('Autosave error:', err);
      // Restore the failed changes so they can be retried
      changedEntries.forEach(([inputId, value]) => {
        if (pendingChangesRef.current[inputId] === undefined) {
          pendingChangesRef.current[inputId] = value;
        }
      });
      setSaveStatus('error');
    }
  }, [ax, id]);

  const triggerAutosave = useCallback(() => {
    pendingSaveRef.current = true;
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      performSave();
    }, 800);
  }, [performSave]);

  const handleChange = (inputId, value, inputType) => {
    let updVal = value;
    if (inputType === 'checkbox') {
      const cur = answers[inputId] || [];
      updVal = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    }
    setAnswers(p => ({ ...p, [inputId]: updVal }));
    // Track only the changed input
    pendingChangesRef.current[inputId] = updVal;
    triggerAutosave();
  };

  const handleBlur = () => {
    if (pendingSaveRef.current) {
      performSave();
    }
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
    setSaveStatus('saving');
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
      setSaveStatus('saved');
    } catch {
      toast.error('Upload failed');
      setSaveStatus('error');
    }
  };

  const handleDeleteFile = async (inputId, filename) => {
    if (!window.confirm('Remove this file?')) return;
    setSaveStatus('saving');
    try {
      await ax.delete(`/projects/${id}/documents/${encodeURIComponent(filename)}`);
      // Surgically remove the doc — no scroll jump
      patchInputDocs(inputId, existing => existing.filter(d => d.filename !== filename));
      toast.success('File removed.');
      setSaveStatus('saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to remove file');
      setSaveStatus('error');
    }
  };

  const triggerDownload = (filename, originalName) => {
    try {
      const query = originalName ? `?originalName=${encodeURIComponent(originalName)}` : '';
      const url = `${SERVER_URL}/api/uploads/download/documents/${filename}${query}`;
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      const query = originalName ? `?originalName=${encodeURIComponent(originalName)}` : '';
      window.open(`${SERVER_URL}/api/uploads/download/documents/${filename}${query}`, '_blank');
    }
  };

  const submitProject = async () => {
    if (!window.confirm('Submit for review? You cannot edit after this.')) return;
    setSubmitting(true);
    try {
      if (pendingSaveRef.current) {
        await performSave();
      }
      const res = await ax.patch(`/projects/${id}/submit`);
      if (res.data?.project) {
        setProject(res.data.project);
      } else {
        setProject(p => p ? { ...p, status: 'submitted', project_status: 'submitted' } : p);
      }
      toast.success('Project submitted!');
      await loadProject();
    } catch (err) {
      console.error('Submit project error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit project');
    } finally {
      setSubmitting(false);
    }
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

  const isCreator = project && dbUser && String(project.userId?._id || project.userId) === String(dbUser._id);
  const isCollaborator = project && dbUser && (
    (project.collaborators || []).some(c => String(c._id || c) === String(dbUser._id)) ||
    (project.collaboratorEmails || []).some(e => e.toLowerCase() === dbUser.email?.toLowerCase())
  );
  const isOwner = project && dbUser && (
    (project.owners || []).some(o => String(o._id || o) === String(dbUser._id)) ||
    (project.ownerEmails || []).some(e => e.toLowerCase() === dbUser.email?.toLowerCase())
  );

  // Per-question lock set (populated as reviewer adds comments)
  const lockedInputIds = new Set((project?.lockedInputs || []).map(String));

  // A question is editable only when project is not globally locked AND not individually locked AND current user is not project owner
  const isInputEditable = (inp) => {
    if (isOwner) return false;
    return !isLocked && !lockedInputIds.has(String(inp._id));
  };

  // Show lock/editable status badges once the project is submitted (in review phase)
  const showLockBadges = project?.status === 'submitted' || lockedInputIds.size > 0;

  // Legacy flag kept only for the Submit button and module-level save visibility
  const isEditable = !isOwner && !isLocked && project?.status !== 'submitted';

  const downloadOfficialCertificate = () => {
    const toastId = toast.loading('Downloading label...');
    ax.get(`/projects/${id}/certificate/download`, { responseType: 'blob' })
      .then((response) => {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Label-${project?.certificate_serial || id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Label downloaded successfully!', { id: toastId });
      })
      .catch(() => {
        toast.error('Failed to download label', { id: toastId });
      });
  };

  const exportPdf = async () => {
    const API_PDF_BASE = getDynamicApiBaseUrl();
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fIcon = (name) => { const e = (name || '').split('.').pop().toLowerCase(); return e === 'pdf' ? '📄' : ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(e) ? '🖼️' : '📎'; };
    const typeClass = (t) => ({ number: 't-num', text: 't-txt', checkbox: 't-chk', file: 't-fil' }[t] || 't-txt');
    const updatedDate = project?.updatedAt ? new Date(project.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const pctFill = Math.min(project?.scorePercent || 0, 100);

    const getCommentsHtml = (inputId) => {
      const list = (projectComments || []).filter(c => String(c.inputId) === String(inputId));
      if (list.length === 0) return '';
      const roots = list.filter(c => !c.parentId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      let html = `<div class="inp-comments"><div class="comment-hdr">💬 Comments (${list.length})</div><div class="comment-thread">`;
      roots.forEach(root => {
        const rootRole = root.role || 'user';
        const rootRoleClass = rootRole === 'admin' ? 'r-admin' : (rootRole === 'reviewer' || rootRole === 'desh_reviewer') ? 'r-reviewer' : 'r-user';
        const rootRoleLabel = rootRole === 'admin' ? 'Admin' : (rootRole === 'reviewer' || rootRole === 'desh_reviewer') ? 'Reviewer' : rootRole === 'desh_assessor' ? 'Assessor' : rootRole === 'desh_manager' ? 'Manager' : 'DESH Professional';
        const rootTime = new Date(root.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        html += `<div class="comment-box"><div class="comment-meta"><span class="comment-role ${rootRoleClass}">${rootRoleLabel}</span><span class="comment-author">${esc(root.authorName || 'Anonymous')}</span><span class="comment-time">${rootTime}</span></div><div class="comment-text">${esc(root.text)}</div></div>`;
        const replies = list.filter(c => String(c.parentId) === String(root._id)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        replies.forEach(reply => {
          const repRole = reply.role || 'user';
          const repRoleClass = repRole === 'admin' ? 'r-admin' : (repRole === 'reviewer' || repRole === 'desh_reviewer') ? 'r-reviewer' : 'r-user';
          const repRoleLabel = repRole === 'admin' ? 'Admin' : (repRole === 'reviewer' || repRole === 'desh_reviewer') ? 'Reviewer' : repRole === 'desh_assessor' ? 'Assessor' : repRole === 'desh_manager' ? 'Manager' : 'DESH Professional';
          const repTime = new Date(reply.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          html += `<div class="comment-box reply"><div class="comment-meta"><span class="comment-role ${repRoleClass}">${repRoleLabel}</span><span class="comment-author">${esc(reply.authorName || 'Anonymous')}</span><span class="comment-time">${repTime}</span></div><div class="comment-text">${esc(reply.text)}</div></div>`;
        });
      });
      html += `</div></div>`;
      return html;
    };

    let body = '';
    body += `<div class="rpt-cover">
      <div class="rpt-brand">DESH — Project Report</div>
      <div class="rpt-title">${esc(project?.title)}</div>
      <div class="rpt-meta">
        <span>👤 ${esc(dbUser?.name)} &bull; ${esc(dbUser?.email)}</span>
        <span>📅 ${updatedDate}</span>
      </div>
    </div>
    <div class="score-strip">
      <div class="sc-num">${project?.scorePercent || 0}<span class="sc-pct">%</span></div>
      <div class="sc-vline"></div>
      <div>
        <div class="sc-pts">${Math.round(project?.totalPoints || 0)} / ${Math.round(project?.maxPoints || 0)} pts</div>
        <div class="sc-level">${project?.leafLevel ? `<span class="sc-pill p-green">${esc(project.leafLevel)}</span>` : ''}<span class="sc-pill ${project?.status === 'submitted' ? 'p-green' : 'p-amber'}">${project?.status === 'submitted' ? '✓ Submitted' : '● Draft'}</span></div>
      </div>
      <div class="sc-bar-wrap">
        <div class="sc-bar-label">Overall Score</div>
        <div class="sc-bar-track"><div class="sc-bar-fill" style="width:${pctFill}%"></div></div>
        <div class="sc-bar-sub">${pctFill}% achieved</div>
      </div>
    </div>`;

    body += `<div class="content">`;
    (tabs || []).forEach((tab, ti) => {
      const mods = (tab.modules || []).filter(m => (m.inputs || []).length > 0);
      if (!mods.length) return;
      body += `<div class="tab-sec"><div class="tab-hdr"><div class="tab-badge">${ti + 1}</div><div class="tab-name">${esc(tab.title)}</div></div>`;
      mods.forEach((mod, mi) => {
        const inputs = mod.inputs || [];
        const modEarned = inputs.reduce((s, i) => s + calcInputPoints(i, answers[i._id]), 0);
        const modMax = inputs.reduce((s, i) => s + calcInputMax(i), 0);
        body += `<div class="mod"><div class="mod-hdr"><span class="mod-name">${esc((ti + 1) + '.' + (mi + 1) + ' ' + mod.title)}</span>${modMax > 0 ? `<span class="mod-pts">${modEarned.toFixed(1)} / ${modMax} pts</span>` : ''}</div>`;
        const grouped = {};
        inputs.forEach(inp => {
          const sid = String(inp.sectionId || 'none');
          if (!grouped[sid]) grouped[sid] = [];
          grouped[sid].push(inp);
        });
        const stageGroups = [
          ...sortedGlobalSections.filter(s => grouped[String(s._id)]).map(s => ({ title: s.title || '', inputs: grouped[String(s._id)] })),
          ...(grouped['none'] ? [{ title: '', inputs: grouped['none'] }] : [])
        ];
        stageGroups.forEach(group => {
          if (group.title) body += `<div class="stage-hdr">${esc(group.title)}</div>`;
          group.inputs.forEach(inp => {
            let val = '';
            if (inp.inputType === 'file') {
              const linkedDocs = inp.documents || [];
              val = linkedDocs.length > 0 ? linkedDocs.map(doc => {
                const name = doc.originalName || doc.filename || 'file';
                const query = name ? `?originalName=${encodeURIComponent(name)}` : '';
                const url = `${API_PDF_BASE}/uploads/download/documents/${doc.filename}${query}`;
                return `<a href="${url}" target="_blank" class="file-link">${fIcon(name)} ${esc(name)}</a>`;
              }).join('<br>') : '<span class="val-empty">No file uploaded</span>';
            } else if (inp.inputType === 'checkbox') {
              const sel = Array.isArray(answers[inp._id]) ? answers[inp._id] : [];
              const opts = inp.options || [];
              val = (opts.length > 0 ? `<div class="cb-wrap">${opts.map(o => { const on = sel.includes(o.label); return `<span class="cb-chip ${on ? 'cb-on' : 'cb-off'}">${on ? '✓ ' : ''}${esc(o.label)}</span>`; }).join('')}</div>` : '<span class="val-empty">—</span>');
            } else {
              const v = answers[inp._id];
              val = (v !== '' && v !== undefined && v !== null) ? esc(String(v)) : '<span class="val-empty">—</span>';
            }
            body += `<div class="inp"><div class="inp-lbl"><span class="inp-type ${typeClass(inp.inputType)}">${inp.inputType}</span>${esc(inp.label)}</div><div class="inp-val">${val}</div>${getCommentsHtml(inp._id)}</div>`;
          });
        });
        body += `</div>`;
      });
      body += `</div>`;
    });
    body += `</div>`;

    const css = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',Arial,sans-serif;font-size:13px;color:#111827;line-height:1.6;background:#fff}
.rpt-cover{background:linear-gradient(135deg,#0a3d20,#1a6b35 55%,#22A84B);color:#fff;padding:34px 40px 26px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rpt-brand{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.2em;color:rgba(255,255,255,.65);margin-bottom:13px;font-family:'Montserrat',sans-serif}
.rpt-title{font-family:'Montserrat',sans-serif;font-size:24px;font-weight:900;line-height:1.25;margin-bottom:10px;word-break:break-word}
.rpt-meta{display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:rgba(255,255,255,.82)}
.score-strip{display:flex;align-items:center;gap:28px;padding:20px 40px;background:#F0FDF4;border-bottom:1.5px solid #A8EFC0;flex-wrap:wrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sc-num{font-family:'Montserrat',sans-serif;font-size:52px;font-weight:900;color:#145C28;line-height:1}
.sc-pct{font-size:26px}
.sc-vline{width:1.5px;height:44px;background:#A8EFC0;flex-shrink:0}
.sc-pts{font-family:'Montserrat',sans-serif;font-size:15px;font-weight:800;color:#145C28}
.sc-level{display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap}
.sc-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 12px;border-radius:99px;font-size:11px;font-weight:700;font-family:'Montserrat',sans-serif}
.p-green{background:#D6F5E3;color:#145C28;border:1px solid #A8EFC0}
.p-amber{background:#FEF9C3;color:#92400E;border:1px solid #FDE68A}
.sc-bar-wrap{flex:1;min-width:180px}
.sc-bar-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#145C28;font-family:'Montserrat',sans-serif;margin-bottom:6px}
.sc-bar-track{height:10px;background:#D1FAE5;border-radius:99px;overflow:hidden}
.sc-bar-fill{height:100%;background:linear-gradient(90deg,#22A84B,#16A34A);border-radius:99px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sc-bar-sub{font-size:10px;font-weight:700;color:#166534;margin-top:5px}
.content{padding:24px 40px 40px}
.tab-sec{margin-bottom:28px}
.tab-hdr{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:2.5px solid #22A84B;margin-bottom:12px;page-break-after:avoid}
.tab-badge{min-width:26px;height:26px;padding:0 7px;border-radius:6px;background:#22A84B;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-family:'Montserrat',sans-serif;font-size:12px;font-weight:900;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tab-name{font-family:'Montserrat',sans-serif;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#145C28}
.mod{border:1px solid #E5E7EB;border-radius:10px;margin-bottom:10px;overflow:hidden;page-break-inside:avoid}
.mod-hdr{background:#F9FAFB;padding:10px 15px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center;gap:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.mod-name{font-family:'Montserrat',sans-serif;font-size:12px;font-weight:800;color:#111}
.mod-pts{font-size:10.5px;font-weight:700;color:#145C28;background:#D6F5E3;padding:3px 9px;border-radius:20px;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.inp{display:grid;grid-template-columns:1fr 1.3fr;gap:12px;padding:9px 15px;border-bottom:1px solid #F3F4F6;align-items:center}
.inp:last-child{border-bottom:none}
.inp:nth-child(even){background:#FAFAFA}
.inp-lbl{font-size:11.5px;font-weight:700;color:#374151;display:flex;align-items:flex-start;gap:5px;flex-wrap:wrap;line-height:1.45}
.inp-type{font-size:8px;font-weight:800;padding:1px 5px;border-radius:3px;text-transform:uppercase;letter-spacing:.05em;font-family:'Montserrat',sans-serif;white-space:nowrap;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.t-num{background:#EFF6FF;color:#1D4ED8}.t-txt{background:#F0FDF4;color:#166534}.t-chk{background:#FEF9C3;color:#92400E}.t-fil{background:#FFF7ED;color:#78350F}
.inp-req{color:#EF4444;font-size:9px}
.inp-pts{font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;background:#D6F5E3;color:#145C28;white-space:nowrap;margin-left:auto;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.inp-val{font-size:12.5px;color:#374151;word-break:break-word;line-height:1.55}
.val-empty{color:#9CA3AF;font-style:italic;font-size:12px}
.file-link{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;background:#EFF6FF;color:#1D4ED8;text-decoration:none;font-size:11px;font-weight:600;border:1px solid #BFDBFE;margin:2px 0;word-break:break-all}
.cb-wrap{display:block;line-height:2.0;margin-top:2px}
.cb-chip{display:inline-block;vertical-align:middle;margin:3px 6px 3px 0;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cb-on{background:#FEF9C3;color:#92400E;border-color:#FDE68A}.cb-off{background:#F9FAFB;color:#9CA3AF;border-color:#E5E7EB}
.body-offset{padding-top:10px}
.stage-hdr{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#145C28;padding:8px 15px 6px;background:linear-gradient(90deg,#F0FDF4,#fff);border-left:3px solid #22A84B;margin:8px -1px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.inp-comments{grid-column:span 2;margin-top:10px;background:#f9fbf9;border:1px solid #e6efe8;border-radius:8px;padding:10px 12px}
.comment-hdr{font-family:'Montserrat',sans-serif;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#145C28;margin-bottom:6px;display:flex;align-items:center;gap:4px}
.comment-thread{display:flex;flex-direction:column;gap:8px}
.comment-box{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;box-shadow:0 1px 2px rgba(0,0,0,0.02)}
.comment-box.reply{margin-left:20px;border-left:3px solid #22A84B;background:#fafcfb}
.comment-meta{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.comment-role{font-size:7.5px;font-weight:800;padding:1px 5px;border-radius:99px;text-transform:uppercase;font-family:'Montserrat',sans-serif;letter-spacing:.02em}
.r-user{background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE}
.r-admin{background:#D6F5E3;color:#145C28;border:1px solid #A8EFC0}
.r-reviewer{background:#EDE9FE;color:#5B21B6;border:1px solid #C4B5FD}
.comment-author{font-size:11px;font-weight:700;color:#374151}
.comment-time{font-size:10px;color:#9CA3AF;margin-left:auto}
.comment-text{font-size:11.5px;color:#1f2937;line-height:1.5;white-space:pre-wrap}
@media print{.print-bar{display:none!important}.body-offset{padding-top:0!important}.tab-sec+.tab-sec{page-break-before:always;break-before:page}.tab-hdr{page-break-after:avoid;break-after:avoid}.mod+.mod{page-break-before:always;break-before:page}.mod{break-inside:avoid-page}.mod-hdr{page-break-after:avoid;break-after:avoid}.stage-hdr{background:#F0FDF4!important;page-break-after:avoid;break-after:avoid;page-break-inside:avoid;break-inside:avoid}.inp{page-break-inside:avoid;break-inside:avoid}.comment-box{page-break-inside:avoid;break-inside:avoid}.inp-comments{page-break-inside:avoid;break-inside:avoid}}`;

    const getProjectReportFilename = (title) => {
      if (!title) return 'report.pdf';
      let sanitized = title.trim().replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
      sanitized = sanitized.replace(/[.\s]+$/, '');
      return `${sanitized || 'report'}.pdf`;
    };
    const filename = getProjectReportFilename(project?.title);
    const toastId = toast.loading('Generating PDF… Please wait.');

    const container = document.createElement('div');
    container.innerHTML = `<style>${css}</style><div class="body-offset">${body}</div>`;
    container.style.cssText = 'position:absolute;left:-9999px;top:0;width:800px;background:white;font-family:Inter,Arial,sans-serif;';
    document.body.appendChild(container);

    try {
      // ── Find all the sub-elements (chunks) we want to render ──
      // Each .mod sub-item becomes its own chunk so it can start on a fresh page.
      const chunks = [];
      const coverEl = container.querySelector('.rpt-cover');
      if (coverEl) chunks.push({ el: coverEl, type: 'cover', forceNewPage: false });
      const scoreEl = container.querySelector('.score-strip');
      if (scoreEl) chunks.push({ el: scoreEl, type: 'score', forceNewPage: false });
      const tabEls = container.querySelectorAll('.tab-sec');
      tabEls.forEach((tabEl, ti) => {
        const hdrEl = tabEl.querySelector('.tab-hdr');
        const modEls = Array.from(tabEl.querySelectorAll('.mod'));
        if (modEls.length === 0) {
          // No sub-items: push the whole section (new page for every section after the first)
          chunks.push({ el: tabEl, type: 'tab', forceNewPage: ti > 0 });
        } else {
          // Section header: always force a new page for sections after the first
          if (hdrEl) chunks.push({ el: hdrEl, type: 'tab-hdr', forceNewPage: ti > 0 });
          // Each sub-item (.mod) as its own chunk:
          //   first mod (mi === 0) flows naturally after the section header — no blank page
          //   every subsequent mod always starts on a fresh page
          modEls.forEach((modEl, mi) => {
            chunks.push({ el: modEl, type: 'mod', forceNewPage: mi > 0 });
          });
        }
      });

      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 10;
      const printW = pageW - margin * 2;
      const printH = pageH - margin * 2;
      
      const H2C_SCALE = 2;
      let currentY = margin;

      // Process each chunk sequentially
      for (const chunk of chunks) {
        const chunkEl = chunk.el;

        // Force a fresh page before sub-items that must always start at the top
        if (chunk.forceNewPage) {
          doc.addPage();
          currentY = margin;
        }

        const chunkCanvas = await html2canvas(chunkEl, {
          scale: H2C_SCALE,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 800,
        });

        // ── Collect file-link positions relative to chunkEl ──
        const chunkRect = chunkEl.getBoundingClientRect();
        const fileLinkData = [];
        chunkEl.querySelectorAll('a.file-link[href]').forEach(a => {
          const r = a.getBoundingClientRect();
          fileLinkData.push({
            url: a.href,
            relX: r.left - chunkRect.left,
            relY: r.top - chunkRect.top,
            w: r.width,
            h: r.height,
          });
        });

        const pxPerMm = chunkCanvas.width / printW;
        const chunkHMm = chunkCanvas.height / pxPerMm;

        // Safely check if we need to start a new page before drawing this chunk
        if (printH - (currentY - margin) < 10) {
          doc.addPage();
          currentY = margin;
        }

        let remainingHMm = printH - (currentY - margin);

        if (chunkHMm <= remainingHMm) {
          // Fits completely on the current page
          const sliceData = chunkCanvas.toDataURL('image/jpeg', 0.92);
          doc.addImage(sliceData, 'JPEG', margin, currentY, printW, chunkHMm);

          // Stamp clickable links
          for (const { url, relX, relY, w, h } of fileLinkData) {
            if (!url) continue;
            const xMm = (relX * H2C_SCALE) / pxPerMm + margin;
            const yMm = (relY * H2C_SCALE) / pxPerMm + currentY;
            const wMm = (w * H2C_SCALE) / pxPerMm;
            const hMm = (h * H2C_SCALE) / pxPerMm;
            doc.link(xMm, yMm, wMm, hMm, { url });
          }

          currentY += chunkHMm;
        } else if (chunkHMm <= printH) {
          // Doesn't fit on current page, but fits completely on a fresh page
          doc.addPage();
          currentY = margin;

          const sliceData = chunkCanvas.toDataURL('image/jpeg', 0.92);
          doc.addImage(sliceData, 'JPEG', margin, currentY, printW, chunkHMm);

          // Stamp clickable links
          for (const { url, relX, relY, w, h } of fileLinkData) {
            if (!url) continue;
            const xMm = (relX * H2C_SCALE) / pxPerMm + margin;
            const yMm = (relY * H2C_SCALE) / pxPerMm + currentY;
            const wMm = (w * H2C_SCALE) / pxPerMm;
            const hMm = (h * H2C_SCALE) / pxPerMm;
            doc.link(xMm, yMm, wMm, hMm, { url });
          }

          currentY += chunkHMm;
        } else {
          // Chunk is larger than a single page - slice it across multiple pages
          let sliceY = 0;
          while (sliceY < chunkCanvas.height) {
            remainingHMm = printH - (currentY - margin);
            if (remainingHMm < 10) {
              doc.addPage();
              currentY = margin;
              remainingHMm = printH;
            }
            const remainingHPx = Math.round(remainingHMm * pxPerMm);
            const srcH = Math.min(remainingHPx, chunkCanvas.height - sliceY);

            if (srcH <= 0) break;

            const slice = document.createElement('canvas');
            slice.width = chunkCanvas.width;
            slice.height = srcH;
            const ctx = slice.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, slice.width, slice.height);
            ctx.drawImage(chunkCanvas,
              0, sliceY, chunkCanvas.width, srcH,
              0, 0, chunkCanvas.width, srcH
            );

            const sliceData = slice.toDataURL('image/jpeg', 0.92);
            const sliceHMm = srcH / pxPerMm;
            doc.addImage(sliceData, 'JPEG', margin, currentY, printW, sliceHMm);

            // Stamp links in this slice
            for (const { url, relX, relY, w, h } of fileLinkData) {
              if (!url) continue;
              const cY = relY * H2C_SCALE;
              if (cY >= sliceY && cY < sliceY + srcH) {
                const xMm = (relX * H2C_SCALE) / pxPerMm + margin;
                const yMm = (cY - sliceY) / pxPerMm + currentY;
                const wMm = (w * H2C_SCALE) / pxPerMm;
                const hMm = (h * H2C_SCALE) / pxPerMm;
                doc.link(xMm, yMm, wMm, hMm, { url });
              }
            }

            sliceY += srcH;
            currentY += sliceHMm;
          }
        }
      }

      doc.save(filename);
      document.body.removeChild(container);
      toast.success('PDF downloaded successfully!', { id: toastId });
      // PDF generated successfully
    } catch (err) {
      if (document.body.contains(container)) document.body.removeChild(container);
      console.error('[PDF EXPORT ERROR]', err);
      toast.error('PDF generation failed. Opening print dialog as fallback.', { id: toastId });
      const win = window.open('', '_blank', 'width=1040,height=900');
      if (win) {
        win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${esc(project?.title)} — Project Report</title><style>${css}</style></head><body><div class="print-bar"><div class="print-bar-info"><div class="print-bar-title">${esc(project?.title)}</div><div class="print-bar-sub">DESH Project Report &bull; ${updatedDate}</div></div><button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button></div><div class="body-offset">${body}</div><script>setTimeout(()=>window.print(),600)<\/script></body></html>`);
        win.document.close();
      }
    }
  };

  return (
    <Layout>
      <style>{`
        .file-row-hover {
          transition: all 0.2s ease !important;
        }
        .file-row-hover:hover {
          background-color: var(--g100) !important;
          border-color: var(--g300) !important;
          box-shadow: var(--sh-xs) !important;
        }
        .file-row-hover:hover .file-icon-hover {
          transform: scale(1.18);
        }
        .file-row-hover:hover .file-name-text {
          color: var(--g950) !important;
        }
        .file-row-hover:hover .file-action-badge {
          background-color: var(--g300) !important;
          color: var(--g900) !important;
          box-shadow: 0 2px 6px rgba(34,168,75,0.15) !important;
        }
        .file-download-btn {
          transition: all 0.2s ease !important;
        }
        .file-download-btn:hover {
          background-color: var(--g600) !important;
          color: #fff !important;
          border-color: var(--g600) !important;
          box-shadow: 0 2px 6px rgba(34,168,75,0.2) !important;
        }
      `}</style>
      {/* ── Collaborators & Owners Modal ── */}
      {accessModalOpen && (
        <CollaboratorsOwnersModal
          project={project}
          onClose={() => setAccessModalOpen(false)}
          onSaved={loadProject}
        />
      )}

      {/* ── Instruction Popup Modal ── */}
      {instrModal.open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) setInstrModal({ open: false, label: '', html: '' }); }}
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
      <div id="sticky-scorecard" style={{
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
          {/* Project title + section — stacked left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
            <div style={{ minWidth: 0 }}>
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
                  {isCreator && project?.status !== 'submitted' && !isLocked && (
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
            </div>
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
          </div>{/* end column wrapper */}



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
          <div className="pa-scorecard-buttons" style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* ── ICON + TEXT BUTTONS (LEFT SIDE) ── */}

            {/* Save Status Indicator */}
            {!isLocked && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 13px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'Montserrat, sans-serif',
                  transition: 'all 0.2s ease',
                  cursor: saveStatus === 'error' ? 'pointer' : 'default',
                  ...(saveStatus === 'saved' ? {
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: '#15803D',
                    border: '1.5px solid rgba(34, 197, 94, 0.25)',
                  } : saveStatus === 'saving' ? {
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#1D4ED8',
                    border: '1.5px solid rgba(59, 130, 246, 0.25)',
                  } : saveStatus === 'unsaved' ? {
                    background: 'rgba(234, 179, 8, 0.1)',
                    color: '#A16207',
                    border: '1.5px solid rgba(234, 179, 8, 0.25)',
                  } : {
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#B91C1C',
                    border: '1.5px solid rgba(239, 68, 68, 0.25)',
                  }),
                }}
                onClick={saveStatus === 'error' ? () => performSave() : undefined}
                title={saveStatus === 'error' ? 'Click to retry autosave' : undefined}
              >
                {saveStatus === 'saved' && (
                  <>
                    <span style={{ fontSize: 13, color: '#16A34A' }}>✓</span> All changes saved
                  </>
                )}
                {saveStatus === 'saving' && (
                  <>
                    <span style={{
                      display: 'inline-block', width: 12, height: 12,
                      border: '2px solid rgba(29, 78, 216, 0.3)', borderTopColor: '#1D4ED8',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                    }} /> Saving...
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <>
                    <span style={{ fontSize: 10, color: '#EAB308' }}>●</span> Unsaved changes
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <span style={{ fontSize: 13 }}>⚠️</span> Save failed (Retry)
                  </>
                )}
              </div>
            )}

            {/* Download Report */}
            <button onClick={exportPdf} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
              background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1D4ED8',
              fontWeight: 700, fontSize: 13, fontFamily: 'Montserrat,sans-serif',
              whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}>
              ⬇ Download Report
            </button>

            {/* Submit */}
            {isCreator && (
              <button
                className="btn-primary-green"
                onClick={submitProject}
                disabled={submitting || project?.status === 'submitted'}
              >
                {submitting ? (
                  <>
                    <span style={{
                      display: 'inline-block',
                      width: 13,
                      height: 13,
                      border: '2px solid rgba(255, 255, 255, 0.4)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} /> Submitting…
                  </>
                ) : project?.status === 'submitted' ? '✓ Submitted' : '✓ Submit'}
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

            {/* ── ICON ONLY BUTTONS (RIGHT SIDE) ── */}

            {/* Notes (Icon only) */}
            <Link
              to="/notes"
              title="Notes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                padding: 0,
                borderRadius: 10,
                fontSize: 16,
                textDecoration: 'none'
              }}
              className="btn-secondary"
            >
              📝
            </Link>

            {/* Edit Project Info (Icon only) */}
            {(isCreator || dbUser?.role === 'admin' || dbUser?.role === 'reviewer' || dbUser?.role === 'desh_reviewer' || dbUser?.role === 'desh_assessor') && (
              <Link
                to={`/projects/${id}/info`}
                title="Edit Project Info"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  padding: 0,
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: 'rgba(249,115,22,0.08)',
                  border: '1.5px solid rgba(249,115,22,0.45)',
                  color: '#C2410C',
                  fontWeight: 700,
                  fontSize: 15,
                  fontFamily: 'Montserrat,sans-serif',
                  transition: 'all 0.18s',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.18)'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.8)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(249,115,22,0.08)'; e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)'; }}
              >
                ✎
              </Link>
            )}

            {/* Score card / Hide toggle (Icon only) */}
            <button
              onClick={() => setScoreOpen(o => !o)}
              title={scoreOpen ? 'Hide' : 'Expand score card'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                padding: 0,
                borderRadius: 10,
                cursor: 'pointer',
                background: scoreOpen ? 'rgba(34,168,75,0.12)' : 'linear-gradient(135deg,var(--g700),var(--g500))',
                border: `1.5px solid ${scoreOpen ? 'rgba(34,168,75,0.3)' : 'transparent'}`,
                color: scoreOpen ? 'var(--g700)' : '#fff',
                fontFamily: 'Montserrat,sans-serif',
                fontWeight: 800,
                fontSize: 12,
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{
                display: 'inline-block',
                transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
                transform: scoreOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                fontSize: 14,
                lineHeight: 1,
              }}>▲</span>
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
                              imageUrl={rule.imageUrl ? (rule.imageUrl.startsWith('data:') ? rule.imageUrl : `${SERVER_URL}${rule.imageUrl}`) : null}
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
                  {project?.allow_user_download && (
                    <button
                      onClick={downloadOfficialCertificate}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 12px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: 'Montserrat,sans-serif',
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #059669, #10B981)',
                        color: '#fff',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(5,150,105,0.35)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(5,150,105,0.25)'; }}
                    >
                      <span>📜</span> Download Official Leaf Label
                    </button>
                  )}
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
                padding: '12px 12px 10px 12px',
              }}>
                <p style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--g700)',
                  fontFamily: 'Montserrat,sans-serif', marginBottom: 6,
                }}>
                  Score by Tab
                </p>

                {tabChartData.length > 0 ? (
                  <div style={{
                    flex: 1,
                    background: '#EBF7F2',
                    borderRadius: 10,
                    padding: '10px 6px 6px 4px',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative',
                    minHeight: 148,
                    minWidth: 0,
                  }}>
                    {/* Legend */}
                    <div style={{
                      display: 'flex', gap: 14, justifyContent: 'center',
                      marginBottom: 8, flexWrap: 'wrap',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22A84B', display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#374151', fontFamily: 'Montserrat,sans-serif' }}>Allocated Points</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#EA7C0C', display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#374151', fontFamily: 'Montserrat,sans-serif' }}>Achieved Points</span>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 148 }}>
                      <ResponsiveContainer width="100%" height="100%" key={tabChartData.length}>
                        <BarChart
                          data={tabChartData}
                          barGap={3}
                          barCategoryGap="28%"
                          margin={{ top: 2, right: 6, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#4B5563', fontFamily: 'Montserrat,sans-serif' }}
                            axisLine={false} tickLine={false} interval={0}
                          />
                          <YAxis
                            tick={{ fontSize: 8, fill: '#9CA3AF', fontFamily: 'Montserrat,sans-serif' }}
                            axisLine={false} tickLine={false} width={24}
                          />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(34,168,75,0.07)' }} />
                          <Bar dataKey="allocated" name="Allocated" fill="#22A84B" radius={[4, 4, 0, 0]} maxBarSize={22} />
                          <Bar dataKey="achieved" name="Achieved" radius={[4, 4, 0, 0]} maxBarSize={22}>
                            {tabChartData.map((_, idx) => (
                              <Cell key={`cell-${idx}`} fill={ACHIEVED_COLORS[idx % ACHIEVED_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
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
            <div style={{ height: 5, background: 'var(--g100)' }}>
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
                <div key={mod._id} id={`module-${mod._id}`} style={{
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
                                      style={{ width: 22, height: 22, objectFit: 'contain' }}
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
                                      {group.inputs.map((inp, inpIdx) => {
                                        const inputLocked = lockedInputIds.has(String(inp._id));
                                        const isHighlighted = String(highlightedInputId) === String(inp._id);

                                        return (
                                          <div
                                            key={inp._id}
                                            id={`input-${inp._id}`}
                                            className={isHighlighted ? 'highlight-question' : ''}
                                            style={{
                                              background: inputLocked ? '#FAFAFA' : '#fff',
                                              border: `1px solid ${inputLocked ? '#E5E7EB' : 'var(--border)'}`,
                                              borderRadius: 12, padding: '14px',
                                              opacity: inputLocked ? 0.85 : 1,
                                              transition: 'all 0.3s ease',
                                            }}
                                          >
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
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, flexWrap: 'wrap' }}>
                                                {/* Create Ticket Button (for authorized roles) */}
                                                {canCreateTicket && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setTicketQuestionContext({
                                                        projectId: project._id,
                                                        projectTitle: project.title,
                                                        tabId: tabs[activeTab]?._id,
                                                        tabTitle: tabs[activeTab]?.title,
                                                        moduleId: mod._id,
                                                        moduleTitle: mod.title,
                                                        sectionId: group.id,
                                                        sectionTitle: group.title,
                                                        inputId: inp._id,
                                                        questionSnapshot: {
                                                          number: `${activeTab + 1}.${modIdx + 1}.${inpIdx + 1}`,
                                                          label: inp.label,
                                                          inputType: inp.inputType,
                                                          details: inp.details || '',
                                                          tabTitle: tabs[activeTab]?.title,
                                                          moduleTitle: mod.title,
                                                          sectionTitle: group.title,
                                                          projectTitle: project.title,
                                                        }
                                                      });
                                                      setTicketModalOpen(true);
                                                    }}
                                                    style={{
                                                      fontSize: 10, fontWeight: 800, padding: '2px 8px',
                                                      borderRadius: 6, background: 'rgba(34,168,75,0.12)',
                                                      color: '#145C28', border: '1px solid rgba(34,168,75,0.3)',
                                                      fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
                                                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3
                                                    }}
                                                    title="Create Clarification Ticket for this question"
                                                  >
                                                    <span>🎫</span> Create Ticket
                                                  </button>
                                                )}

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

                                            {/* Details — immediately after question */}
                                            {inp.details && (
                                              <div style={{
                                                display: 'flex', alignItems: 'flex-start', gap: 7,
                                                marginBottom: 9, marginTop: 1,
                                              }}>
                                                <span style={{
                                                  fontSize: 16, color: '#6B7280', flexShrink: 0,
                                                  lineHeight: 5.5, marginTop: 1,
                                                  fontStyle: 'normal', userSelect: 'none',
                                                }}><RiInformation2Fill /></span>
                                                <p style={{
                                                  margin: 0, fontSize: 12,
                                                  color: '#6B7280', lineHeight: 1.6,
                                                  fontStyle: 'italic',
                                                  fontFamily: 'Inter,sans-serif',
                                                }}>
                                                  {inp.details}
                                                </p>
                                              </div>
                                            )}

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
                                              const sRange = sMax - sMin;
                                              const sStep = sRange > 10 ? 1 : sRange > 1 ? 0.1 : 0.01;
                                              const pct = sMax > sMin ? ((numVal - sMin) / (sMax - sMin)) * 100 : 0;
                                              const editable = isInputEditable(inp);
                                              return (
                                                <div>
                                                  {/* Number input */}
                                                  <div style={{ marginBottom: 14 }}>
                                                    <input type="number" className="input-field"
                                                      value={rawVal ?? ''}
                                                      onChange={e => handleChange(inp._id, e.target.value, 'number')}
                                                      onBlur={handleBlur}
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
                                                        min={sMin} max={sMax} step={sStep}
                                                        value={numVal}
                                                        onChange={e => handleChange(inp._id, e.target.value, 'number')}
                                                        onBlur={handleBlur}
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
                                                onBlur={handleBlur}
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
                                                    {inp.documents.map((doc, di) => {
                                                      const ext = (doc.originalName || '').split('.').pop().toLowerCase();
                                                      const viewable = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext);
                                                      return (
                                                        <div key={doc.filename || di} style={{
                                                          display: 'flex', alignItems: 'center', gap: 8,
                                                          padding: '7px 12px', background: 'var(--g50)',
                                                          border: '1px solid var(--g200)', borderRadius: 9,
                                                        }}
                                                          className="file-row-hover"
                                                        >
                                                          <a
                                                            href={viewable ? `${SERVER_URL}/uploads/documents/${doc.filename}` : '#'}
                                                            target={viewable ? "_blank" : undefined}
                                                            rel={viewable ? "noopener noreferrer" : undefined}
                                                            onClick={e => {
                                                              if (!viewable) {
                                                                e.preventDefault();
                                                                triggerDownload(doc.filename, doc.originalName);
                                                              }
                                                            }}
                                                            style={{
                                                              display: 'flex',
                                                              alignItems: 'center',
                                                              gap: 8,
                                                              flex: 1,
                                                              minWidth: 0,
                                                              textDecoration: 'none',
                                                              cursor: 'pointer',
                                                            }}
                                                            title={viewable ? "Click to preview" : "Click to download"}
                                                          >
                                                            <span style={{ color: 'var(--g600)', fontSize: 14, flexShrink: 0, transition: 'transform 0.2s ease' }} className="file-icon-hover">
                                                              {ext === 'pdf' ? '📄' : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? '🖼️' : '📎'}
                                                            </span>
                                                            <span style={{
                                                              fontSize: 12.5, fontWeight: 600,
                                                              color: 'var(--g700)', flex: 1, overflow: 'hidden',
                                                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                              transition: 'color 0.2s ease'
                                                            }}
                                                              className="file-name-text"
                                                            >
                                                              {doc.originalName || 'Uploaded file'}
                                                            </span>
                                                            <span style={{
                                                              fontSize: 10,
                                                              fontWeight: 800,
                                                              padding: '2px 7px',
                                                              borderRadius: 5,
                                                              background: 'var(--g200)',
                                                              color: 'var(--g800)',
                                                              flexShrink: 0,
                                                              fontFamily: 'Montserrat,sans-serif',
                                                              transition: 'all 0.2s ease',
                                                            }}
                                                              className="file-action-badge"
                                                            >
                                                              {viewable ? 'View ↗' : 'Download ↓'}
                                                            </span>
                                                          </a>
                                                          {viewable && (
                                                            <button
                                                              type="button"
                                                              onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                triggerDownload(doc.filename, doc.originalName);
                                                              }}
                                                              style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: '2px 8px',
                                                                borderRadius: 5,
                                                                background: 'var(--g50)',
                                                                border: '1px solid var(--g200)',
                                                                color: 'var(--g800)',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                fontSize: 10,
                                                                fontWeight: 800,
                                                                fontFamily: 'Montserrat,sans-serif',
                                                                flexShrink: 0,
                                                              }}
                                                              className="file-download-btn"
                                                              title="Download file directly"
                                                            >
                                                              Download ↓
                                                            </button>
                                                          )}
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
                                                      );
                                                    })}
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
                                            {/* Calculate Button — shown when URL or Calculation is configured */}
                                            {(inp.calcBtn?.url || inp.calcBtn?.calcId) && (
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
                                                  href={inp.calcBtn.calcId 
                                                    ? `/calculations/${inp.calcBtn.calcId}?projectId=${project._id}&inputId=${inp._id}`
                                                    : inp.calcBtn.url
                                                  }
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

                                            {/* Question Action Bar: Create Ticket Button */}
                                            {canCreateTicket && (
                                              <div style={{ marginTop: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setTicketQuestionContext({
                                                      projectId: project._id,
                                                      projectTitle: project.title,
                                                      tabId: tabs[activeTab]?._id,
                                                      tabTitle: tabs[activeTab]?.title,
                                                      moduleId: mod._id,
                                                      moduleTitle: mod.title,
                                                      sectionId: group.id,
                                                      sectionTitle: group.title,
                                                      inputId: inp._id,
                                                      questionSnapshot: {
                                                        number: `${activeTab + 1}.${modIdx + 1}.${inpIdx + 1}`,
                                                        label: inp.label,
                                                        inputType: inp.inputType,
                                                        details: inp.details || '',
                                                        tabTitle: tabs[activeTab]?.title,
                                                        moduleTitle: mod.title,
                                                        sectionTitle: group.title,
                                                        projectTitle: project.title,
                                                      }
                                                    });
                                                    setTicketModalOpen(true);
                                                  }}
                                                  style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '5px 12px',
                                                    borderRadius: 8,
                                                    background: 'linear-gradient(135deg, #10B981, #059669)',
                                                    color: '#fff',
                                                    border: 'none',
                                                    fontSize: 12,
                                                    fontWeight: 800,
                                                    fontFamily: 'Montserrat, sans-serif',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
                                                    transition: 'all 0.2s ease',
                                                  }}
                                                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(5,150,105,0.35)'; }}
                                                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(5,150,105,0.25)'; }}
                                                >
                                                  <span>🎫</span> Create Clarification Ticket
                                                </button>
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
                                                disableComments={false}
                                                isCollaborator={isCollaborator}
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
              onClick={() => { setActiveTab(t => t - 1); setOpenMod(null); scrollToTop('smooth'); }}
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
              onClick={() => { setActiveTab(t => t + 1); setOpenMod(null); scrollToTop('smooth'); }}
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

      {/* Shared Create Ticket Modal with preselected question context */}
      <CreateTicketModal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        preselectedQuestion={ticketQuestionContext}
      />

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
