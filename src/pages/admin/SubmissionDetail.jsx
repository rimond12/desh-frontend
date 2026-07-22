import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { ColoredLeaf, LeafBadge } from '../../components/shared/LeafLogo.jsx';
import ProjectSummaryReportModal from '../../components/ProjectSummaryReportModal.jsx';
import CommentThread from '../../components/shared/CommentThread.jsx';
import CreateTicketModal from '../../components/tickets/CreateTicketModal.jsx';
import GpsMap, { parseGps } from '../../components/GpsMap.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import CertificatePanel from './CertificatePanel.jsx';

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

const API_BASE = getDynamicApiBaseUrl();
const SERVER_BASE = API_BASE; // kept for backward compat with imageUrl usages below
const SERVER_URL = API_BASE.replace(/\/api\/?$/, '');

const ACHIEVED_COLORS = ['#C0392B', '#4B5563', '#EA7C0C', '#2563EB', '#166534', '#7C3AED', '#92400E'];
const SKIP_WORDS = new Set(['and', 'or', 'of', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'after', 'before']);

function abbreviateTabName(name, index) {
  const prefix = `${index + 1}.`;
  if (!name) return `${prefix} T`;
  const words = name.split(/[\s\-/]+/).filter(w => w.length > 0 && !SKIP_WORDS.has(w.toLowerCase()));
  const abbr = words.map(w => w[0].toUpperCase()).join('').slice(0, 3) || name.slice(0, 2).toUpperCase();
  return `${prefix} ${abbr}`;
}

function calcTabScore(tab) {
  let earned = 0, max = 0;
  (tab.modules || []).forEach(mod => {
    (mod.inputs || []).forEach(inp => {
      earned += inp.points || 0;
      max += calcInputMax(inp);
    });
  });
  return { earned, max };
}

const STATUS_CFG = {
  under_review: { label: 'Under Review', color: '#92400E', bg: '#FEF9C3', border: '#FDE68A', dot: '#D97706' },
  verified: { label: 'Verified', color: '#145C28', bg: '#D6F5E3', border: '#A8EFC0', dot: '#22A84B' },
  cancelled: { label: 'Cancelled', color: '#991B1B', bg: '#FEE2E2', border: '#FECACA', dot: '#EF4444' },
};

// ── Score helpers ─────────────────────────────────────────────────
function calcInputMax(inp) {
  if (inp.inputType === 'number' && inp.line)
    return Math.max(Number(inp.line.y1 || 0), Number(inp.line.y2 || 0));
  if (inp.inputType === 'checkbox' && inp.options?.length)
    return inp.options.reduce((t, o) => t + (o.points || 0), 0);
  return 0;
}

function calcSectionData(sectionId, tabs, extraIds = []) {
  const ids = new Set([String(sectionId), ...extraIds.map(String)]);
  let earned = 0, max = 0;
  (tabs || []).forEach(tab => {
    (tab.modules || []).forEach(mod => {
      (mod.inputs || []).forEach(inp => {
        if (ids.has(String(inp.sectionId))) {
          earned += inp.points || 0;
          max += calcInputMax(inp);
        }
      });
    });
  });
  const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
  return { earned, max, pct };
}

function getLeafLevel(pct, rules) {
  return rules.find(r => pct >= r.minPercent && pct <= r.maxPercent) || null;
}

// ── Status badge ──────────────────────────────────────────────────
function StatusBadge({ status, large }) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: large ? 6 : 4,
      padding: large ? '4px 12px' : '2px 9px',
      borderRadius: 99,
      fontSize: large ? 13 : 11, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: large ? 7 : 5, height: large ? 7 : 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ── File helpers ──────────────────────────────────────────────────
function getDownloadUrl(doc) {
  const name = doc.originalName || '';
  const query = name ? `?originalName=${encodeURIComponent(name)}` : '';
  if (doc.filename) return `${API_BASE}/uploads/download/documents/${doc.filename}${query}`;
  if (doc.path) {
    const fname = doc.path.replace(/\\/g, '/').split('/').pop();
    return `${API_BASE}/uploads/download/documents/${fname}${query}`;
  }
  return null;
}
function getFileType(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
  return 'other';
}
function fileIcon(name) {
  const t = getFileType(name);
  return t === 'pdf' ? '📄' : t === 'image' ? '🖼️' : '📎';
}
function fileActionLabel(name) {
  const t = getFileType(name);
  return (t === 'pdf' || t === 'image') ? 'View' : '↓';
}

// ── Edit Modal ────────────────────────────────────────────────────
function EditModal({ project, globalSections, onSave, onClose }) {
  const [sectionId, setSectionId] = useState('');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSectionChange = (sid) => {
    setSectionId(sid);
    const existing = project.sectionStatuses?.find(s => String(s.sectionId) === String(sid));
    setStatus(existing?.status || '');
  };

  const save = async () => {
    if (!sectionId) { toast.error('Please select a section'); return; }
    setSaving(true);
    try {
      await onSave({ sectionId, sectionStatus: status || null, adminNote: note || undefined });
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', padding: 16,
    }}>
      <div className="fade-in-up" style={{ width: '100%', maxWidth: 480, padding: 28, background: '#fff', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 16, color: '#111', margin: 0 }}>
              Update Section Status
            </h3>
            <p style={{ fontSize: 12, color: '#666', margin: '3px 0 0' }}>{project.title}</p>
          </div>
          <button onClick={onClose} style={{ color: '#999', fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Section dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: 8, fontFamily: 'Montserrat,sans-serif' }}>
              Section
            </label>
            <select value={sectionId} onChange={e => handleSectionChange(e.target.value)} className="input-dark px-3 py-2.5 text-sm w-full">
              <option value="">— Choose a section —</option>
              {globalSections.map(s => {
                const existing = project.sectionStatuses?.find(st => String(st.sectionId) === String(s._id));
                return (
                  <option key={s._id} value={s._id}>
                    {s.title}{existing ? ` · ${STATUS_CFG[existing.status]?.label || ''}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: 8, fontFamily: 'Montserrat,sans-serif' }}>
              Status for this Section
            </label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-dark px-3 py-2.5 text-sm w-full" disabled={!sectionId}>
              <option value="">— No status / Clear —</option>
              <option value="under_review">Under Review</option>
              <option value="verified">Verified</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Current statuses summary */}
          {project.sectionStatuses?.length > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#f8f8f8', border: '1px solid #e8e8e8' }}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', fontFamily: 'Montserrat,sans-serif', marginBottom: 8 }}>
                Current Section Statuses
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {project.sectionStatuses.map((ss, i) => {
                  const sec = globalSections.find(s => String(s._id) === String(ss.sectionId));
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#666' }}>{sec?.title || 'Section'}:</span>
                      <StatusBadge status={ss.status} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin note */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: 8, fontFamily: 'Montserrat,sans-serif' }}>
              Add Note (optional)
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note to the user..." rows={3} className="input-dark w-full px-4 py-3 text-sm resize-none" />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button onClick={save} disabled={saving} className="btn-primary-green flex-1 justify-center text-sm">
              {saving ? 'Saving…' : 'Save Status'}
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid #e0e0e0', color: '#666', fontWeight: 600, fontSize: 14, cursor: 'pointer', background: 'transparent' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function SubmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const { dbUser } = useAuth();

  const [project, setProject] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [globalSections, setGlobalSections] = useState([]);
  const [leafRules, setLeafRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showCertPanel, setShowCertPanel] = useState(false);
  const [categories, setCategories] = useState([]);
  const [editForm, setEditForm] = useState({
    projectName: '', projectType: '', projectSize: '', address: '', postCode: '',
    gpsCoordinates: '', siteArea: '', totalBuiltUpArea: '', constructionStartDate: '', constructionEndDate: '',
    engineerName: '', designation: '', organization: '', officeAddress: '', officePostCode: '',
    telephone: '', mobile: '', email: '',
    projectCoordinatorDetails: '', architectName: '', iabMembershipNo: '',
    greenBuildingConsultantDetails: '', sredaRegistrationNumber: '',
    collaboratorEmails: '',
    ownerEmails: '',
    extraFields: {},
  });
  const [savingInfo, setSavingInfo] = useState(false);
  // comment counts per inputId (pre-fetched for badges)
  const [commentCounts, setCommentCounts] = useState({});
  const [projectComments, setProjectComments] = useState([]);
  // per-question locked inputs
  const [lockedInputsSet, setLockedInputsSet] = useState(new Set());

  const location = useLocation();
  // Ticket Modal state for question-based ticket creation
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketQuestionContext, setTicketQuestionContext] = useState(null);
  const [highlightedInputId, setHighlightedInputId] = useState(null);

  useEffect(() => {
    if (!tabs || tabs.length === 0) return;

    const queryParams = new URLSearchParams(location.search);
    const targetInputId = queryParams.get('inputId');
    const targetTabId = queryParams.get('tabId');

    if (!targetInputId && !targetTabId) return;

    // Clear section filter so all sections & inputs are visible
    setSelectedSection('');

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
  const [togglingInput, setTogglingInput] = useState(null);
  // score card collapse
  const [scoreOpen, setScoreOpen] = useState(true);
  // edit project info modal
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    Promise.all([
      axiosSecure.get(`/submissions/${id}/detail`),
      axiosSecure.get('/sections'),
      axiosSecure.get('/settings/eval-rules'),
      axiosSecure.get(`/comments/by-project/${id}`),
      axiosSecure.get('/categories'),
    ])
      .then(([detailRes, secRes, rulesRes, commentsRes, catRes]) => {
        const p = detailRes.data.project;
        setProject(p);
        setTabs(detailRes.data.tabs || []);
        setGlobalSections(secRes.data.sections || []);
        setLeafRules(rulesRes.data.rules || []);
        setCategories(catRes.data.categories || []);
        setLockedInputsSet(new Set((p.lockedInputs || []).map(String)));
        setProjectComments(commentsRes.data.comments || []);

        if (p) {
          const fetchedCategories = catRes.data.categories || [];
          const dbCategoryName = 
            (p.projectType && fetchedCategories.find(c => String(c._id) === String(p.projectType))?.name) || 
            p.projectType || 
            fetchedCategories.find(c => String(c._id) === String(p.categoryId?._id || p.categoryId))?.name || 
            '';

          setEditForm({
            projectName: p.projectName || p.title || '',
            projectType: dbCategoryName,
            projectSize: p.projectSize || '',
            address: p.address || '',
            postCode: p.postCode || '',
            gpsCoordinates: p.gpsCoordinates || '',
            siteArea: p.siteArea ?? '',
            totalBuiltUpArea: p.totalBuiltUpArea ?? '',
            constructionStartDate: p.constructionStartDate ? p.constructionStartDate.split('T')[0] : '',
            constructionEndDate: p.constructionEndDate ? p.constructionEndDate.split('T')[0] : '',
            engineerName: p.engineerName || '',
            designation: p.designation || '',
            organization: p.organization || '',
            officeAddress: p.officeAddress || '',
            officePostCode: p.officePostCode || '',
            telephone: p.telephone || '',
            mobile: p.mobile || '',
            email: p.email || '',
            projectCoordinatorDetails: p.projectCoordinatorDetails || '',
            architectName: p.architectName || '',
            iabMembershipNo: p.iabMembershipNo || '',
            greenBuildingConsultantDetails: p.greenBuildingConsultantDetails || '',
            sredaRegistrationNumber: p.sredaRegistrationNumber || '',
            collaboratorEmails: Array.isArray(p.collaboratorEmails) ? p.collaboratorEmails.join(', ') : '',
            ownerEmails: Array.isArray(p.ownerEmails) ? p.ownerEmails.join(', ') : '',
            extraFields: p.extraFields || {},
          });
        }

        // Build a count map: { inputId: count }
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

  const saveStatus = async (payload) => {
    const res = await axiosSecure.patch(`/submissions/${id}`, payload);
    setProject(res.data.project);
    setShowEdit(false);
    toast.success('Section status updated!');
  };

  const saveProjectInfo = async () => {
    setSavingInfo(true);
    try {
      const res = await axiosSecure.patch(`/submissions/${id}/info`, editForm);
      setProject(res.data.project);
      toast.success('Project details updated!');
      setShowInfoModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update details');
    } finally {
      setSavingInfo(false);
    }
  };

  if (loading) return (
    <Layout isAdmin>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid var(--g100)', borderTopColor: 'var(--g600)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    </Layout>
  );

  // ── Score card calculations ──────────────────────────────────────
  const sortedSections = [...globalSections].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const constantSections = sortedSections.filter(s => s.isConstant);
  const regularSections = sortedSections.filter(s => !s.isConstant);
  const constantIds = constantSections.map(s => String(s._id));

  const sectionData = selectedSection ? calcSectionData(selectedSection, tabs, constantIds) : null;

  const displayPct = sectionData ? sectionData.pct : (project?.scorePercent || 0);
  const displayEarned = Math.round(sectionData ? sectionData.earned : (project?.totalPoints || 0));
  const displayMax = Math.round(sectionData ? sectionData.max : (project?.maxPoints || 0));

  const overallRule = leafRules.find(r => r.name === project?.leafLevel) || null;
  const sectionRule = sectionData ? getLeafLevel(sectionData.pct, leafRules) : null;
  const activeRule = sectionData ? sectionRule : overallRule;

  const displayLevel = activeRule?.name || null;
  const displayColorCode = activeRule?.colorCode || null;
  const progressColor = displayColorCode || '#94A3B8';

  const activeSectionStatus = selectedSection
    ? project?.sectionStatuses?.find(s => String(s.sectionId) === selectedSection)?.status || null
    : null;

  const selectedSectionName = sortedSections.find(s => String(s._id) === selectedSection)?.title || '';
  const docs = project?.documents || [];
  const isLocked = project?.isLocked || false;
  const lockStatus = project?.lockStatus || 'pending';
  const ownerId = project?.userId?._id || project?.userId;

  const LOCK_STATUS_CFG = {
    pending: { label: 'Pending Review', bg: '#F3F4F6', border: '#D1D5DB', color: '#4B5563' },
    locked: { label: '🔒 Locked', bg: '#EDE9FE', border: '#C4B5FD', color: '#5B21B6' },
    unlocked_for_edit: { label: '🔓 Unlocked for Edit', bg: '#FEF9C3', border: '#FDE68A', color: '#92400E' },
  };

  const lockSubmission = async () => {
    if (!window.confirm('Lock this submission? The user will no longer be able to edit it.')) return;
    try {
      const res = await axiosSecure.post(`/submissions/${id}/lock`);
      setProject(res.data.project);
      toast.success('Submission locked');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to lock'); }
  };

  const unlockSubmission = async () => {
    if (!window.confirm('Unlock this submission? The user will be able to edit it again.')) return;
    try {
      const res = await axiosSecure.post(`/submissions/${id}/unlock`);
      setProject(res.data.project);
      toast.success('Submission unlocked');
    } catch { toast.error('Failed to unlock'); }
  };

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

  const exportPdf = async () => {
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fIcon = (name) => { const e = (name || '').split('.').pop().toLowerCase(); return e === 'pdf' ? '📄' : ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(e) ? '🖼️' : '📎'; };
    const typeClass = (t) => ({ number: 't-num', text: 't-txt', checkbox: 't-chk', file: 't-fil' }[t] || 't-txt');
    const submittedDate = project?.updatedAt ? new Date(project.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
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
      <div class="rpt-brand">DESH — Submission Report</div>
      <div class="rpt-title">${esc(project?.title)}</div>
      <div class="rpt-meta">
        <span>👤 ${esc(project?.userId?.name)} &bull; ${esc(project?.userId?.email)}</span>
        <span>📅 ${submittedDate}</span>
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
        const modEarned = inputs.reduce((s, i) => s + (i.points || 0), 0);
        const modMax = inputs.reduce((s, i) => s + calcInputMax(i), 0);
        body += `<div class="mod"><div class="mod-hdr"><span class="mod-name">${esc((ti + 1) + '.' + (mi + 1) + ' ' + mod.title)}</span>${modMax > 0 ? `<span class="mod-pts">${modEarned.toFixed(1)} / ${modMax} pts</span>` : ''}</div>`;
        const grouped = {};
        inputs.forEach(inp => {
          const sid = String(inp.sectionId || 'none');
          if (!grouped[sid]) grouped[sid] = [];
          grouped[sid].push(inp);
        });
        const stageGroups = [
          ...sortedSections.filter(s => grouped[String(s._id)]).map(s => ({ title: s.title || '', inputs: grouped[String(s._id)] })),
          ...(grouped['none'] ? [{ title: '', inputs: grouped['none'] }] : [])
        ];
        stageGroups.forEach(group => {
          if (group.title) body += `<div class="stage-hdr">${esc(group.title)}</div>`;
          group.inputs.forEach(inp => {
            let val = '';
            if (inp.inputType === 'file') {
              const linked = (docs || []).filter(d => String(d.inputId) === String(inp._id));
              val = linked.length > 0 ? linked.map(doc => { const url = getDownloadUrl(doc); const name = doc.originalName || doc.filename || 'file'; return `<a href="${url}" target="_blank" class="file-link">${fIcon(name)} ${esc(name)}</a>`; }).join('<br>') : '<span class="val-empty">No file uploaded</span>';
            } else if (inp.inputType === 'checkbox') {
              const sel = Array.isArray(inp.value) ? inp.value : [];
              const opts = inp.options || [];
              const list = opts.length > 0 ? opts : sel.map(l => ({ label: l, points: 0 }));
              val = list.length > 0 ? `<div class="cb-wrap">${list.map(o => { const on = sel.includes(o.label); return `<span class="cb-chip ${on ? 'cb-on' : 'cb-off'}">${on ? '✓ ' : ''}${esc(o.label)}${o.points ? ` (${o.points}pts)` : ''}</span>`; }).join('')}</div>` : '<span class="val-empty">—</span>';
            } else {
              val = inp.value ? esc(String(inp.value)) : '<span class="val-empty">—</span>';
            }
            body += `<div class="inp"><div class="inp-lbl"><span class="inp-type ${typeClass(inp.inputType)}">${inp.inputType}</span>${esc(inp.label)}${inp.isRequired ? '<span class="inp-req"> *</span>' : ''}${inp.points > 0 ? `<span class="inp-pts">${inp.points.toFixed(1)} pts</span>` : ''}</div><div class="inp-val">${val}</div>${getCommentsHtml(inp._id)}</div>`;
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
.print-bar{position:fixed;top:0;left:0;right:0;background:rgba(255,255,255,.96);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid #E5E7EB;padding:11px 22px;display:flex;align-items:center;gap:14px;z-index:200;box-shadow:0 2px 14px rgba(0,0,0,.08)}
.print-bar-info{flex:1;min-width:0}
.print-bar-title{font-family:'Montserrat',sans-serif;font-size:13px;font-weight:800;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.print-bar-sub{font-size:11px;color:#6B7280;margin-top:1px}
.print-btn{display:flex;align-items:center;gap:7px;padding:9px 22px;background:#22A84B;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;white-space:nowrap;flex-shrink:0;box-shadow:0 2px 8px rgba(34,168,75,.28)}
.body-offset{padding-top:62px}
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
        win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${esc(project?.title)} — Submission Report</title><style>${css}</style></head><body><div class="print-bar"><div class="print-bar-info"><div class="print-bar-title">${esc(project?.title)}</div><div class="print-bar-sub">DESH Submission Report &bull; ${submittedDate}</div></div><button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button></div><div class="body-offset">${body}</div><script>setTimeout(()=>window.print(),600)<\/script></body></html>`);
        win.document.close();
      }
    }
  };

  return (
    <Layout isAdmin>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20, flexWrap: 'wrap' }} className="fade-in-up">
        <button onClick={() => navigate('/admin/submissions')} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
          border: '1.5px solid var(--border)', background: '#fff', color: 'var(--tx-muted)',
          fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--sh-xs)',
        }}>
          ← Back to Submissions
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 22, color: 'var(--tx)', margin: 0, lineHeight: 1.2 }}>
            {project?.title}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--tx-muted)', margin: '4px 0 0', fontWeight: 500 }}>
            by <span style={{ fontWeight: 700 }}>{project?.userId?.name}</span>
            {' · '}{project?.userId?.email}
            <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--tx-faint)' }}>
              {new Date(project?.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Lock status badge */}
          {(() => {
            const cfg = LOCK_STATUS_CFG[lockStatus];
            return (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99,
                border: `1.5px solid ${cfg.border}`, background: cfg.bg, color: cfg.color,
                fontWeight: 700, fontSize: 11, fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
              }}>{cfg.label}</span>
            );
          })()}

          {/* View Summary */}
          <button onClick={() => setShowSummary(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
            border: '1.5px solid var(--g200)', background: 'var(--g50)', color: 'var(--g800)',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
          }}>📋 Summary</button>

          {/* Edit Project Info */}
          <button onClick={() => setShowInfoModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
            border: '1.5px solid var(--g300)', background: 'var(--g100)', color: 'var(--g800)',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
          }}>✏️ Edit Info</button>

          {/* Lock / Unlock */}
          {isLocked ? (
            <button onClick={unlockSubmission} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
              border: '1.5px solid #FDE68A', background: '#FEF9C3', color: '#92400E',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
            }}>🔓 Unlock</button>
          ) : (
            <button onClick={lockSubmission} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
              border: '1.5px solid var(--g300)', background: '#fff', color: 'var(--g700)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
            }}>🔒 Lock</button>
          )}

          {/* Download PDF */}
          <button onClick={exportPdf} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
            border: '1.5px solid var(--g200)', background: '#fff', color: 'var(--g700)',
            fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
          }}>⬇ PDF</button>

          {/* 🏅 Certificate Studio button */}
          <button
            onClick={() => setShowCertPanel(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10,
              border: '1.5px solid rgba(31,110,52,0.5)',
              background: project?.project_status === 'CERTIFICATE_ISSUED'
                ? 'linear-gradient(135deg,#1f6e34,#22A84B)'
                : 'linear-gradient(135deg,rgba(31,110,52,0.12),rgba(34,168,75,0.08))',
              color: project?.project_status === 'CERTIFICATE_ISSUED' ? '#fff' : '#1f6e34',
              fontWeight: 800, fontSize: 12, cursor: 'pointer',
              fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
              boxShadow: project?.project_status === 'CERTIFICATE_ISSUED' ? '0 3px 12px rgba(31,110,52,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg,#1f6e34,#22A84B)';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(31,110,52,0.4)';
            }}
            onMouseLeave={e => {
              if (project?.project_status !== 'CERTIFICATE_ISSUED') {
                e.currentTarget.style.background = 'linear-gradient(135deg,rgba(31,110,52,0.12),rgba(34,168,75,0.08))';
                e.currentTarget.style.color = '#1f6e34';
                e.currentTarget.style.boxShadow = 'none';
              } else {
                e.currentTarget.style.background = 'linear-gradient(135deg,#1f6e34,#22A84B)';
                e.currentTarget.style.color = '#fff';
              }
            }}
          >
            🏅 {project?.project_status === 'CERTIFICATE_ISSUED' ? 'View Label' : 'Issue Label'}
          </button>

          {/* Edit Status (primary green CTA) */}
          <button onClick={() => setShowEdit(true)} className="btn-primary-green" style={{ padding: '8px 18px', fontSize: 12 }}>
            ✏ Edit Status
          </button>
        </div>
      </div>

      {/* ── Sticky Score Card ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'linear-gradient(135deg,#EFF9F4,#D6F5E3)',
        border: '1.5px solid var(--g200)', borderRadius: 20, marginBottom: 24,
        boxShadow: '0 4px 24px rgba(34,168,75,0.12)', overflow: 'hidden',
      }} className="fade-in-up">

        {/* Section dropdown strip + toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '10px 20px', borderBottom: scoreOpen ? '1px solid rgba(34,168,75,0.15)' : 'none',
          background: 'rgba(255,255,255,0.5)',
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
            {regularSections.map(s => {
              const ss = project?.sectionStatuses?.find(st => String(st.sectionId) === String(s._id));
              return <option key={s._id} value={s._id}>{s.title}{ss ? ` · ${STATUS_CFG[ss.status]?.label}` : ''}</option>;
            })}
            {constantSections.length > 0 && (
              <></>
            )}
          </select>

          {/* Section status pills */}
          {(project?.sectionStatuses || []).map((ss, i) => {
            const sec = sortedSections.find(s => String(s._id) === String(ss.sectionId));
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', whiteSpace: 'nowrap' }}>
                {sec?.title}: <StatusBadge status={ss.status} />
              </span>
            );
          })}

          {/* Collapsed summary */}
          {!scoreOpen && (
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--g700)', fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap' }}>
              {displayPct}% · {displayEarned}/{displayMax} pts
            </span>
          )}

          {/* Toggle button */}
          <button onClick={() => setScoreOpen(o => !o)} style={{
            marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 8, border: '1.5px solid var(--g300)',
            background: 'rgba(255,255,255,0.7)', color: 'var(--g700)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif',
            transition: 'all 0.15s',
          }}>
            {scoreOpen ? '▲ Hide' : '▼ Show'}
          </button>
        </div>

        {/* Score body — collapsible */}
        {scoreOpen && (() => {
          const sortedLeafRules = [...leafRules].sort((a, b) => a.minPercent - b.minPercent);
          const leafCount = sortedLeafRules.length;
          const leafSize = leafCount >= 6 ? 62 : leafCount >= 5 ? 68 : 76;

          const tabChartData = (tabs || []).map((tab, i) => {
            const { earned, max } = calcTabScore(tab);
            return {
              name: abbreviateTabName(tab.title || tab.name || '', i),
              fullName: tab.title || tab.name || `Tab ${i + 1}`,
              allocated: max,
              achieved: Math.round(earned),
            };
          });

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

          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', width: '100%' }}>
              {/* LEFT: leaf gallery + progress track + score */}
              <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 18px 14px 20px' }}>
                {selectedSection && (
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--g700)', margin: '0 0 2px', fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.04em' }}>
                    ▦ {selectedSectionName}
                  </p>
                )}

                {sortedLeafRules.length > 0 && (
                  <div className="pa-level-track" style={{ display: 'flex', width: '100%', gap: 4, alignItems: 'flex-end' }}>
                    {sortedLeafRules.map((rule) => {
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

                {/* Score summary and details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderTop: '1.5px dashed rgba(34,168,75,0.15)', paddingTop: 12, marginTop: 4 }}>
                  <span style={{
                    fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 30,
                    lineHeight: 1, color: progressColor || 'var(--tx)',
                  }}>
                    {displayPct}%
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--tx-muted)', fontWeight: 600 }}>score</span>
                  <span style={{ fontSize: 13, color: 'var(--tx-muted)', fontWeight: 700 }}>
                    ({displayEarned} / {displayMax} pts)
                  </span>
                  {displayLevel
                    ? <LeafBadge level={displayLevel} />
                    : <span style={{ fontSize: 12, color: 'var(--tx-faint)', fontWeight: 600 }}>Not rated yet</span>}
                  <span className={project?.status === 'submitted' ? 'status-chip status-completed' : 'status-chip status-progress'}>
                    {project?.status === 'submitted' ? '✓ Submitted' : '● Draft'}
                  </span>
                  {activeSectionStatus && <StatusBadge status={activeSectionStatus} large />}
                </div>
              </div>

              {/* RIGHT: per-tab bar chart */}
              <div style={{
                flex: '1 1 260px',
                minWidth: 0,
                display: 'flex', flexDirection: 'column',
                borderLeft: '1.5px solid rgba(34,168,75,0.15)',
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
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#374151', fontFamily: 'Montserrat,sans-serif' }}>Allocated</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#EA7C0C', display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#374151', fontFamily: 'Montserrat,sans-serif' }}>Achieved</span>
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

      {/* ── Edit Project Info Modal ── */}
      {showInfoModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(5,26,10,0.72)', backdropFilter: 'blur(6px)',
          padding: 16,
        }} onClick={e => { if (e.target === e.currentTarget) setShowInfoModal(false); }}>
          <div className="fade-in-up" style={{
            width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto',
            borderRadius: 22, background: '#F4F8F5',
            border: '1.5px solid var(--g200)',
            boxShadow: '0 32px 80px rgba(0,40,16,0.35)',
          }} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{
              background: 'linear-gradient(135deg, #051A0A 0%, #0A2D14 50%, #145C28 100%)',
              borderRadius: '20px 20px 0 0',
              padding: '18px 24px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: 'rgba(34,168,75,0.25)', border: '1.5px solid rgba(93,216,130,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>✏️</div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(93,216,130,0.7)', fontFamily: 'Montserrat,sans-serif', display: 'block', marginBottom: 2 }}>Admin Edit</span>
                <h2 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 16, color: '#fff', margin: 0 }}>Edit Project Registration Details</h2>
              </div>
              <button onClick={() => setShowInfoModal(false)} style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 16, flexShrink: 0,
              }}>✕</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Section 1 */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'linear-gradient(90deg,var(--g50),#fff)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--g600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, fontFamily: 'Montserrat,sans-serif', flexShrink: 0 }}>1</span>
                  <h4 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 11, color: 'var(--g800)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>General Project Information</h4>
                </div>
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, background: '#fff' }}>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Project Name</label>
                    <input type="text" value={editForm.projectName} onChange={e => setEditForm({ ...editForm, projectName: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Project Type</label>
                    <select value={editForm.projectType} onChange={e => setEditForm({ ...editForm, projectType: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" style={{ appearance: 'auto' }}>
                      <option value="">— Select Type —</option>
                      {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                      <option value="Residential">Residential Building</option>
                      <option value="Commercial">Commercial Building</option>
                      <option value="Industrial">Industrial Building</option>
                      <option value="Mixed-Use">Mixed-Use Development</option>
                      <option value="Institutional">Institutional Building</option>
                      <option value="Other">Other / Infrastructure</option>
                    </select></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Project Size</label>
                    <select value={editForm.projectSize} onChange={e => setEditForm({ ...editForm, projectSize: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" style={{ appearance: 'auto' }}>
                      <option value="">— Select Size —</option>
                      <option value="Small">Small</option>
                      <option value="Medium">Medium</option>
                      <option value="Large">Large</option>
                    </select></div>
                  {/* GPS Coordinates — full width with interactive map */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>GPS Coordinates</label>
                    <input
                      type="text"
                      value={editForm.gpsCoordinates}
                      onChange={e => setEditForm({ ...editForm, gpsCoordinates: e.target.value })}
                      placeholder="e.g. 23.8103, 90.4125"
                      className="input-dark w-full px-3 py-2 text-sm"
                      style={{ marginBottom: 10 }}
                    />
                    {/* Interactive map picker */}
                    {(() => {
                      const gpsCoord = parseGps(editForm.gpsCoordinates);
                      return gpsCoord ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 10px',
                            background: 'linear-gradient(90deg, var(--g50), #fff)',
                            borderRadius: 8, border: '1px solid var(--g200)',
                          }}>
                            <span style={{ fontSize: 13 }}>📍</span>
                            <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--g700)' }}>Click map or drag pin to update</span>
                            <span style={{ marginLeft: 'auto', fontFamily: 'Nunito,sans-serif', fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)' }}>
                              {gpsCoord.lat.toFixed(5)}, {gpsCoord.lng.toFixed(5)}
                            </span>
                          </div>
                          <GpsMap
                            lat={gpsCoord.lat}
                            lng={gpsCoord.lng}
                            interactive={true}
                            height={240}
                            onMove={(la, lo) => setEditForm(f => ({ ...f, gpsCoordinates: `${la}, ${lo}` }))}
                          />
                        </div>
                      ) : (
                        <div style={{
                          height: 60, borderRadius: 12, border: '1.5px dashed var(--g200)',
                          background: 'var(--g50)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 8,
                        }}>
                          <span style={{ fontSize: 16 }}>🗺️</span>
                          <span style={{ fontFamily: 'Montserrat,sans-serif', fontSize: 10, fontWeight: 700, color: 'var(--tx-faint)' }}>Enter valid coordinates above to see map</span>
                        </div>
                      );
                    })()}
                  </div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Postal Code</label>
                    <input type="text" value={editForm.postCode} onChange={e => setEditForm({ ...editForm, postCode: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Site Area (sqm)</label>
                    <input type="number" value={editForm.siteArea} onChange={e => setEditForm({ ...editForm, siteArea: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Built-up Area (sqm)</label>
                    <input type="number" value={editForm.totalBuiltUpArea} onChange={e => setEditForm({ ...editForm, totalBuiltUpArea: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Start Date</label>
                    <input type="date" value={editForm.constructionStartDate} onChange={e => setEditForm({ ...editForm, constructionStartDate: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Completion Date</label>
                    <input type="date" value={editForm.constructionEndDate} onChange={e => setEditForm({ ...editForm, constructionEndDate: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Address</label>
                    <input type="text" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                </div>
              </div>

              {/* Section 2 */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'linear-gradient(90deg,var(--g50),#fff)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--g600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, fontFamily: 'Montserrat,sans-serif', flexShrink: 0 }}>2</span>
                  <h4 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 11, color: 'var(--g800)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Engineer / Owner Information</h4>
                </div>
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, background: '#fff' }}>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Name</label>
                    <input type="text" value={editForm.engineerName} onChange={e => setEditForm({ ...editForm, engineerName: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Designation</label>
                    <input type="text" value={editForm.designation} onChange={e => setEditForm({ ...editForm, designation: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Organization</label>
                    <input type="text" value={editForm.organization} onChange={e => setEditForm({ ...editForm, organization: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Mobile</label>
                    <input type="text" value={editForm.mobile} onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Telephone</label>
                    <input type="text" value={editForm.telephone} onChange={e => setEditForm({ ...editForm, telephone: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Email</label>
                    <input type="text" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Office Post Code</label>
                    <input type="text" value={editForm.officePostCode} onChange={e => setEditForm({ ...editForm, officePostCode: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Office Address</label>
                    <input type="text" value={editForm.officeAddress} onChange={e => setEditForm({ ...editForm, officeAddress: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                </div>
              </div>

              {/* Section 3 */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'linear-gradient(90deg,var(--g50),#fff)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--g600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, fontFamily: 'Montserrat,sans-serif', flexShrink: 0 }}>3</span>
                  <h4 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 11, color: 'var(--g800)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Associates and Consultants</h4>
                </div>
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, background: '#fff' }}>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Project Coordinator</label>
                    <input type="text" value={editForm.projectCoordinatorDetails} onChange={e => setEditForm({ ...editForm, projectCoordinatorDetails: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Architect Name</label>
                    <input type="text" value={editForm.architectName} onChange={e => setEditForm({ ...editForm, architectName: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>IAB Membership No.</label>
                    <input type="text" value={editForm.iabMembershipNo} onChange={e => setEditForm({ ...editForm, iabMembershipNo: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Green Building Consultant</label>
                    <input type="text" value={editForm.greenBuildingConsultantDetails} onChange={e => setEditForm({ ...editForm, greenBuildingConsultantDetails: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>SREDA Registration Number</label>
                    <input type="text" value={editForm.sredaRegistrationNumber} onChange={e => setEditForm({ ...editForm, sredaRegistrationNumber: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" /></div>
                </div>
              </div>

              {/* Section 4: Access Control */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'linear-gradient(90deg,var(--g50),#fff)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--g600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, fontFamily: 'Montserrat,sans-serif', flexShrink: 0 }}>4</span>
                  <h4 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 11, color: 'var(--g800)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Access & Permissions</h4>
                </div>
                <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#fff' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Collaborator Emails (comma separated)</label>
                    <input type="text" value={editForm.collaboratorEmails} onChange={e => setEditForm({ ...editForm, collaboratorEmails: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" placeholder="e.g. collaborator@domain.com, assistant@domain.com" />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Project Owner Emails (comma separated)</label>
                    <input type="text" value={editForm.ownerEmails} onChange={e => setEditForm({ ...editForm, ownerEmails: e.target.value })} className="input-dark w-full px-3 py-2 text-sm" placeholder="e.g. owner@domain.com, investor@domain.com" />
                  </div>
                </div>
              </div>

              {/* Section 5: Custom Fields & Other Professionals */}
              {((editForm.extraFields && Object.keys(editForm.extraFields).length > 0) || (editForm.extraFields?.otherProfessionals?.length > 0)) && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'linear-gradient(90deg,var(--g50),#fff)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--g600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, fontFamily: 'Montserrat,sans-serif', flexShrink: 0 }}>5</span>
                    <h4 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 11, color: 'var(--g800)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Additional custom info</h4>
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' }}>
                    {/* Custom fields */}
                    {Object.entries(editForm.extraFields || {})
                      .filter(([k]) => k !== 'otherProfessionals')
                      .map(([k, v]) => {
                        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        return (
                          <div key={k}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>{label}</label>
                            <input
                              type="text"
                              value={Array.isArray(v) ? v.join('; ') : String(v)}
                              onChange={e => {
                                const newVal = Array.isArray(v) ? e.target.value.split(';').map(x => x.trim()) : e.target.value;
                                setEditForm({
                                  ...editForm,
                                  extraFields: {
                                    ...editForm.extraFields,
                                    [k]: newVal
                                  }
                                });
                              }}
                              className="input-dark w-full px-3 py-2 text-sm"
                            />
                          </div>
                        );
                      })
                    }

                    {/* Other Professionals list (read-only display in edit modal for safety) */}
                    {editForm.extraFields?.otherProfessionals?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Montserrat,sans-serif' }}>Other Professionals (Read-Only)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {editForm.extraFields.otherProfessionals.map((prof, idx) => (
                            <div key={idx} style={{ padding: 10, background: 'var(--g50)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}>
                              <strong>{prof.designation || 'Professional'}:</strong> {prof.name || '—'} ({prof.organization || '—'}, {prof.mobile || '—'}, {prof.email || '—'})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--g50)', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowInfoModal(false)} style={{
                padding: '9px 20px', border: '1.5px solid var(--border-md)', color: 'var(--tx-muted)',
                borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#fff',
              }}>Cancel</button>
              <button onClick={async () => { await saveProjectInfo(); setShowInfoModal(false); }} disabled={savingInfo} className="btn-primary-green" style={{ padding: '9px 24px', fontSize: 13 }}>
                {savingInfo ? 'Saving…' : '✓ Save Details'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes ── */}
      {docs.length > 0 && (
        <div className="glass-card fade-in-up" style={{ padding: '18px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tx-muted)', fontFamily: 'Montserrat,sans-serif', marginBottom: 12 }}>
            Uploaded Documents ({docs.length})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {docs.map((doc, i) => {
              const name = doc.originalName || doc.filename || 'file';
              const type = getFileType(name);
              const viewable = type === 'pdf' || type === 'image';
              const filename = doc.filename || (doc.path ? doc.path.replace(/\\/g, '/').split('/').pop() : '');
              const url = viewable ? `${SERVER_BASE}/uploads/documents/${filename}` : getDownloadUrl(doc);
              return (
                <a key={i} href={url}
                  target="_blank" rel="noopener noreferrer"
                  {...(!viewable ? { download: name } : {})}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 10,
                    background: type === 'pdf' ? 'linear-gradient(135deg,#FEF2F2,#FEE2E2)' : type === 'image' ? 'linear-gradient(135deg,#F0FDF4,#DCFCE7)' : 'linear-gradient(135deg,var(--g50),#EFF9F4)',
                    border: `1.5px solid ${type === 'pdf' ? '#FECACA' : type === 'image' ? 'var(--g200)' : 'var(--g200)'}`,
                    color: type === 'pdf' ? '#991B1B' : 'var(--g800)',
                    fontWeight: 600, fontSize: 13, textDecoration: 'none',
                    boxShadow: 'var(--sh-xs)', transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 16 }}>{fileIcon(name)}</span>
                  <span style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 5, background: 'rgba(0,0,0,0.06)', color: 'inherit', flexShrink: 0 }}>
                    {fileActionLabel(name)}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Notes ── */}
      {project?.notes?.some(n => n.senderRole === 'admin') && (
        <div className="glass-card fade-in-up" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tx-muted)', fontFamily: 'Montserrat,sans-serif', marginBottom: 10 }}>Admin Notes</p>
          {project.notes.filter(n => n.senderRole === 'admin').map((n, i) => (
            <div key={i} style={{ padding: '9px 12px', borderRadius: 9, background: 'var(--g50)', border: '1px solid var(--g200)', fontSize: 13, color: 'var(--g800)', marginBottom: 6 }}>{n.message}</div>
          ))}
        </div>
      )}
      {project?.notes?.some(n => n.senderRole === 'user') && (
        <div className="glass-card fade-in-up" style={{ padding: '16px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tx-muted)', fontFamily: 'Montserrat,sans-serif', marginBottom: 10 }}>User Notes</p>
          {project.notes.filter(n => n.senderRole === 'user').map((n, i) => (
            <div key={i} style={{ padding: '9px 12px', borderRadius: 9, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 13, color: '#1D4ED8', marginBottom: 6 }}>{n.message}</div>
          ))}
        </div>
      )}

      {/* ── Tabs → Modules → Inputs ── */}
      {(tabs || []).map((tab, ti) => {
        // When a section is selected, show that section + all constant sections
        const selectedWithConstants = selectedSection
          ? new Set([selectedSection, ...constantIds])
          : null;
        const visibleModules = (tab.modules || []).map(mod => ({
          ...mod,
          visibleInputs: selectedWithConstants
            ? (mod.inputs || []).filter(inp => selectedWithConstants.has(String(inp.sectionId)))
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
                const modMax = mod.visibleInputs.reduce((s, inp) => s + calcInputMax(inp), 0);
                const modPct = modMax > 0 ? Math.round((modEarned / modMax) * 100) : 0;
                const scoreColor = modPct >= 70 ? 'var(--g700)' : modPct >= 40 ? '#92400E' : 'var(--tx-faint)';
                const scoreBg = modPct >= 70 ? 'var(--g100)' : modPct >= 40 ? '#FEF9C3' : 'var(--bg-muted)';

                return (
                  <div key={mod._id} style={{ border: '1px solid var(--border)', borderRadius: 16, background: '#fff', overflow: 'hidden', boxShadow: 'var(--sh-xs)' }}>
                    {/* Module header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'var(--g50)', border: '1px solid var(--g200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--g600)' }}>◈</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--tx)', margin: 0 }}>
                          <span style={{ color: 'var(--tx-faint)', marginRight: 4 }}>{ti + 1}.{mi + 1}</span>{mod.title}
                        </p>
                      </div>
                      <div style={{ padding: '5px 12px', borderRadius: 20, background: scoreBg, border: `1px solid ${modPct >= 70 ? 'var(--g300)' : modPct >= 40 ? '#FDE68A' : 'var(--border)'}` }}>
                        <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 14, color: scoreColor }}>
                          {modEarned.toFixed(1)}
                        </span>
                        {modMax > 0 && <span style={{ fontSize: 11, color: 'var(--tx-faint)', fontWeight: 600 }}> / {modMax} pts</span>}
                      </div>
                    </div>

                    {/* Input rows */}
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {mod.visibleInputs.flatMap((inp, qi) => {
                        const isInputLocked = lockedInputsSet.has(String(inp._id));
                        const isToggling = togglingInput === String(inp._id);
                        const isEmpty = inp.inputType === 'file' ? !inp.uploaded
                          : Array.isArray(inp.value) ? inp.value.length === 0
                            : inp.value === '' || inp.value === undefined;

                        // Find all uploaded documents for file inputs
                        const linkedDocs = inp.inputType === 'file'
                          ? docs.filter(d => String(d.inputId) === String(inp._id))
                          : [];

                        const prevInp = mod.visibleInputs[qi - 1];
                        const isNewSection = !prevInp || String(prevInp.sectionId) !== String(inp.sectionId);
                        const stageSec = isNewSection ? globalSections.find(s => String(s._id) === String(inp.sectionId)) : null;
                        const result = [];
                        if (stageSec?.title) {
                          result.push(
                            <div key={`stage-${qi}`} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              margin: qi === 0 ? '0 0 2px' : '10px 0 2px',
                              padding: '6px 10px',
                              background: 'linear-gradient(90deg,#EFF9F4,transparent)',
                              borderLeft: '3px solid var(--g400)',
                              borderRadius: '0 6px 6px 0',
                            }}>
                              <span style={{
                                fontSize: 10, fontWeight: 800, color: 'var(--g700)',
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                fontFamily: 'Montserrat,sans-serif',
                              }}>{stageSec.title}</span>
                            </div>
                          );
                        }
                        const isHighlighted = String(highlightedInputId) === String(inp._id);
                        result.push(
                          <div
                            key={inp._id}
                            id={`input-${inp._id}`}
                            className={isHighlighted ? 'highlight-question' : ''}
                            style={{
                              padding: '10px 12px', borderRadius: 10,
                              background: isInputLocked ? '#FFFBEB' : isEmpty ? 'var(--bg-subtle)' : '#FAFFFE',
                              border: `1px solid ${isInputLocked ? '#FDE68A' : isEmpty ? 'var(--border)' : 'var(--g100)'}`,
                              opacity: isEmpty && !isInputLocked ? 0.55 : 1,
                              transition: 'border-color 0.2s, background 0.2s',
                            }}
                          >
                            {/* Top row: label + value + points badge + lock button */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', margin: '0 0 3px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  {inp.label}
                                  {inp.isRequired && <span style={{ color: '#EF4444', fontSize: 10 }}>*</span>}
                                  <span style={{
                                    fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif',
                                    background: { number: '#EFF6FF', text: 'var(--g50)', checkbox: '#FEF9C3', file: '#F5F0E8' }[inp.inputType],
                                    color: { number: '#1D4ED8', text: 'var(--g700)', checkbox: '#92400E', file: '#78350F' }[inp.inputType],
                                  }}>{inp.inputType}</span>
                                  {isInputLocked && (
                                    <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}>
                                      🔒 locked
                                    </span>
                                  )}
                                  {selectedSection && constantIds.includes(String(inp.sectionId)) && (
                                    <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA', letterSpacing: '0.05em', fontFamily: 'Montserrat,sans-serif' }}>
                                      ⚡ Constant
                                    </span>
                                  )}
                                </p>
                                <div style={{ fontSize: 13, color: isEmpty ? 'var(--tx-faint)' : 'var(--tx)', wordBreak: 'break-word' }}>
                                  {inp.inputType === 'file'
                                    ? (linkedDocs.length > 0
                                      ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                          {linkedDocs.map((doc, di) => {
                                            const name = doc.originalName || doc.filename || 'file';
                                            const type = getFileType(name);
                                            const viewable = type === 'image' || type === 'pdf';
                                            const filename = doc.filename || (doc.path ? doc.path.replace(/\\/g, '/').split('/').pop() : '');
                                            const url = viewable ? `${SERVER_BASE}/uploads/documents/${filename}` : getDownloadUrl(doc);
                                            return (
                                              <a key={di} href={url}
                                                target={viewable ? "_blank" : undefined}
                                                rel={viewable ? "noopener noreferrer" : undefined}
                                                {...(!viewable ? { download: name } : {})}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 8, background: 'var(--g50)', border: '1px solid var(--g200)', color: 'var(--g800)', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                                                <span>{fileIcon(name)}</span>
                                                <span style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                                <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: 'var(--g200)', color: 'var(--g800)', flexShrink: 0 }}>{fileActionLabel(name)}</span>
                                              </a>
                                            );
                                          })}
                                        </div>
                                      )
                                      : <span style={{ color: 'var(--tx-faint)', fontSize: 12 }}>No file uploaded</span>)
                                    : inp.inputType === 'checkbox'
                                      ? (() => {
                                        const selected = Array.isArray(inp.value) ? inp.value : [];
                                        const allOpts = inp.options || [];
                                        if (allOpts.length === 0 && selected.length === 0)
                                          return <span style={{ color: 'var(--tx-faint)', fontSize: 12 }}>—</span>;
                                        const list = allOpts.length > 0 ? allOpts.map(o => ({ label: o.label, pts: o.points || 0 })) : selected.map(v => ({ label: v, pts: 0 }));
                                        return (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                                            {list.map((o, oi) => {
                                              const on = selected.includes(o.label);
                                              return (
                                                <span key={oi} style={{
                                                  fontSize: 11, fontWeight: on ? 700 : 500,
                                                  padding: '3px 9px', borderRadius: 20,
                                                  background: on ? '#FEF9C3' : 'var(--bg-subtle)',
                                                  color: on ? '#92400E' : 'var(--tx-faint)',
                                                  border: `1px solid ${on ? '#FDE68A' : 'var(--border)'}`,
                                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                                }}>
                                                  {on ? '✓' : '○'} {o.label}
                                                  {o.pts > 0 && <span style={{ fontSize: 9, opacity: 0.7 }}>({o.pts}pts)</span>}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        );
                                      })()
                                      : (inp.value || <span style={{ color: 'var(--tx-faint)', fontSize: 12 }}>—</span>)}
                                </div>
                                {/* Calculate Button (Read-Only Mode for Admin) */}
                                {(inp.calcBtn?.url || inp.calcBtn?.calcId) && (
                                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <a
                                      href={inp.calcBtn.calcId 
                                        ? `/calculations/${inp.calcBtn.calcId}?projectId=${project._id}&inputId=${inp._id}&readOnly=true`
                                        : inp.calcBtn.url
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ textDecoration: 'none' }}
                                    >
                                      <button
                                        style={{
                                          padding: '6px 14px',
                                          borderRadius: 8,
                                          border: 'none',
                                          cursor: 'pointer',
                                          background: inp.calcBtn.color || '#22A84B',
                                          color: '#fff',
                                          fontWeight: 700,
                                          fontSize: 11.5,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 5,
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}
                                      >
                                        🧮 {inp.calcBtn.name || 'Calculate'} (Read Only)
                                      </button>
                                    </a>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                {inp.points > 0 && (
                                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 7, background: 'var(--g100)', color: 'var(--g700)', border: '1px solid var(--g200)', whiteSpace: 'nowrap' }}>
                                    {inp.points.toFixed(1)} pts
                                  </span>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4, alignItems: 'flex-end' }}>
                                  {/* Dual Lock Indicators */}
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    {/* Assessor check indicator */}
                                    <span 
                                      title={inp.assessorChecked ? `Locked by ${inp.assessorCheckedBy?.name || 'Assessor'}${inp.assessorCheckedAt ? ' on ' + new Date(inp.assessorCheckedAt).toLocaleString() : ''}` : 'Assessor Lock Unchecked'}
                                      style={{
                                        fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 5,
                                        background: inp.assessorChecked ? 'rgba(59,130,246,0.1)' : '#F3F4F6',
                                        color: inp.assessorChecked ? '#1D4ED8' : '#7F8C8D',
                                        border: `1px solid ${inp.assessorChecked ? '#93C5FD' : '#E5E7EB'}`
                                      }}
                                    >
                                      Assessor: {inp.assessorChecked ? '🔒' : '✏️'}
                                    </span>
                                    {/* Reviewer check indicator */}
                                    <span 
                                      title={inp.reviewerChecked ? `Locked by ${inp.reviewerCheckedBy?.name || 'Reviewer'}${inp.reviewerCheckedAt ? ' on ' + new Date(inp.reviewerCheckedAt).toLocaleString() : ''}` : 'Reviewer Lock Unchecked'}
                                      style={{
                                        fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 5,
                                        background: inp.reviewerChecked ? 'rgba(124,58,237,0.1)' : '#F3F4F6',
                                        color: inp.reviewerChecked ? '#6D28D9' : '#7F8C8D',
                                        border: `1px solid ${inp.reviewerChecked ? '#C084FC' : '#E5E7EB'}`
                                      }}
                                    >
                                      Reviewer: {inp.reviewerChecked ? '🔒' : '✏️'}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => toggleInputLock(inp._id, isInputLocked)}
                                    disabled={isToggling}
                                    style={{
                                      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7,
                                      border: `1px solid ${isInputLocked ? '#FDE68A' : 'var(--g200)'}`,
                                      background: isInputLocked ? '#FEF9C3' : 'var(--g50)',
                                      color: isInputLocked ? '#92400E' : 'var(--g700)',
                                      cursor: isToggling ? 'wait' : 'pointer',
                                      whiteSpace: 'nowrap', opacity: isToggling ? 0.6 : 1,
                                      transition: 'all 0.2s',
                                    }}
                                  >
                                    {isToggling ? '...' : isInputLocked ? '🔓 Unlock for Applicant' : '🔒 Lock for Applicant'}
                                  </button>

                                  {/* Create Ticket Action Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTicketQuestionContext({
                                        projectId: project._id,
                                        projectTitle: project.title,
                                        tabId: tab._id,
                                        tabTitle: tab.title,
                                        moduleId: mod._id,
                                        moduleTitle: mod.title,
                                        sectionId: inp.sectionId,
                                        sectionTitle: stageSec?.title || '',
                                        inputId: inp._id,
                                        questionSnapshot: {
                                          number: `Q${qi + 1}`,
                                          label: inp.label,
                                          inputType: inp.inputType,
                                          details: inp.details || '',
                                          tabTitle: tab.title,
                                          moduleTitle: mod.title,
                                          sectionTitle: stageSec?.title || '',
                                          projectTitle: project.title,
                                        }
                                      });
                                      setTicketModalOpen(true);
                                    }}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 5,
                                      padding: '4px 9px', borderRadius: 7, fontSize: 10.5, fontWeight: 800,
                                      background: 'linear-gradient(135deg, #10B981, #059669)',
                                      color: '#fff', border: 'none', cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(5,150,105,0.25)',
                                      fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap'
                                    }}
                                    title="Create Clarification Ticket for this question"
                                  >
                                    <span>🎫</span> Create Ticket
                                  </button>
                                </div>
                              </div>
                            </div>
                            {/* Comment thread — admin can view + edit any comment */}
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
                        return result;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {showSummary && (
        <ProjectSummaryReportModal
          project={project}
          categories={categories}
          onClose={() => setShowSummary(false)}
        />
      )}

      {/* Edit modal */}
      {showEdit && (
        <EditModal project={project} globalSections={sortedSections} onSave={saveStatus} onClose={() => setShowEdit(false)} />
      )}

      {/* 🏅 Certificate Studio Panel */}
      {showCertPanel && project && (
        <CertificatePanel
          project={project}
          onClose={() => setShowCertPanel(false)}
          onIssued={() => {
            // Refresh project to reflect CERTIFICATE_ISSUED status
            axiosSecure.get(`/submissions/${id}/detail`)
              .then(res => setProject(res.data.project))
              .catch(() => {});
          }}
        />
      )}

      {/* Shared Create Ticket Modal */}
      <CreateTicketModal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        preselectedQuestion={ticketQuestionContext}
      />

      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </Layout>
  );
}
