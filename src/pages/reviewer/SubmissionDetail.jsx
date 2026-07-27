import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { ColoredLeaf, LeafBadge } from '../../components/shared/LeafLogo.jsx';
import CommentThread from '../../components/shared/CommentThread.jsx';
import CreateTicketModal from '../../components/tickets/CreateTicketModal.jsx';
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

const API_BASE = getDynamicApiBaseUrl();
const SERVER_BASE = API_BASE;
const SERVER_URL = API_BASE.replace(/\/api\/?$/, '');

const ACHIEVED_COLORS = ['#C0392B', '#4B5563', '#EA7C0C', '#2563EB', '#166534', '#7C3AED', '#92400E'];
const SKIP_WORDS = new Set(['and', 'or', 'of', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'after', 'before']);

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

function PointsBox({ earned, max }) {
  const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
  const color = pct >= 80 ? 'var(--g600)' : pct >= 60 ? '#D97706' : pct >= 40 ? '#EA580C' : 'var(--tx-muted)';

  return (
    <div style={{
      width: 110, flexShrink: 0,
      background: '#fff',
      border: '1.5px solid var(--border)',
      borderRadius: 14,
      padding: '14px 10px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center',
      boxShadow: 'var(--sh-xs)',
      position: 'sticky', top: 20,
    }}>
      <p style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--tx-faint)',
        fontFamily: 'Montserrat,sans-serif', marginBottom: 4
      }}>Points</p>
      <p style={{
        fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
        fontSize: 22, color, margin: 0, lineHeight: 1
      }}>
        {Math.round(earned)}
      </p>
      {max > 0 && (
        <>
          <p style={{ fontSize: 10, color: 'var(--tx-faint)', fontWeight: 600, margin: '2px 0 5px' }}>
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

function calcInputMax(inp) {
  if (inp.inputType === 'number' && inp.line)
    return Math.max(Number(inp.line.y1 || 0), Number(inp.line.y2 || 0));
  if (inp.inputType === 'checkbox' && inp.options?.length)
    return inp.options.reduce((t, o) => t + (o.points || 0), 0);
  return 0;
}

function isInputFilled(inp) {
  if (inp.inputType === 'file') return !!inp.uploaded;
  const v = inp.value;
  if (Array.isArray(v)) return v.length > 0;
  return v !== '' && v !== undefined && v !== null;
}

function calcSectionData(sectionId, tabs, extraIds = []) {
  const ids = new Set([String(sectionId), ...extraIds.map(String)]);
  let earned = 0, max = 0;
  (tabs || []).forEach(tab =>
    (tab.modules || []).forEach(mod =>
      (mod.inputs || []).forEach(inp => {
        if (ids.has(String(inp.sectionId))) {
          earned += inp.points || 0;
          max += calcInputMax(inp);
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

const TYPE_STYLE = {
  number: { bg: '#EFF6FF', color: '#1D4ED8' },
  text: { bg: 'var(--g50)', color: 'var(--g700)' },
  checkbox: { bg: '#FEF9C3', color: '#92400E' },
  file: { bg: '#F5F0E8', color: '#78350F' },
};

export default function ReviewerSubmissionDetail() {
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
  const [locking, setLocking] = useState(false);
  // score card collapse
  const [scoreOpen, setScoreOpen] = useState(true);
  // active tab selection ('all' or tab index)
  const [activeTab, setActiveTab] = useState(0);
  // Instruction modal state
  const [instrModal, setInstrModal] = useState({ open: false, label: '', html: '' });

  // comment counts per inputId
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
    const targetTabId = queryParams.get('tabId');
    const targetModuleId = queryParams.get('moduleId');
    const targetInputId = queryParams.get('inputId');

    if (!targetInputId && !targetTabId && !targetModuleId) return;

    // Reset selectedSection filter so all questions are visible
    setSelectedSection('');

    let targetTabIdx = -1;
    if (targetInputId) {
      tabs.forEach((tab, tIdx) => {
        (tab.modules || []).forEach((mod) => {
          const modInputs = mod.inputs?.length ? mod.inputs : (mod.sections || []).flatMap(s => s.inputs || []);
          const foundInp = modInputs.find(inp => String(inp._id) === String(targetInputId));
          if (foundInp) targetTabIdx = tIdx;
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
        setProjectComments(commentsRes.data.comments || []);
        const counts = {};
        (commentsRes.data.comments || []).forEach(c => {
          const key = String(c.inputId);
          counts[key] = (counts[key] || 0) + 1;
        });
        setCommentCounts(counts);
      })
      .catch(() => toast.error('Failed to load submission'))
      .finally(() => setLoading(false));
  }, [id, axiosSecure]);

  const [togglingInput, setTogglingInput] = useState(null);

  const toggleQuestionCheck = async (inputId, checked) => {
    setTogglingInput(String(inputId));
    try {
      await axiosSecure.post(`/submissions/${id}/toggle-question-check`, { inputId, checked });
      setTabs(prevTabs => {
        return prevTabs.map(tab => {
          return {
            ...tab,
            modules: (tab.modules || []).map(mod => {
              return {
                ...mod,
                inputs: (mod.inputs || []).map(inp => {
                  if (String(inp._id) === String(inputId)) {
                    const isReviewer = activeRole === 'desh_reviewer' || activeRole === 'reviewer';
                    const isAssessor = activeRole === 'desh_assessor';
                    const updateProps = {};
                    if (isReviewer) {
                      updateProps.reviewerChecked = checked;
                      updateProps.reviewerCheckedBy = checked ? { _id: dbUser?._id, name: dbUser?.name, email: dbUser?.email } : null;
                      updateProps.reviewerCheckedAt = checked ? new Date().toISOString() : null;
                    } else if (isAssessor) {
                      updateProps.assessorChecked = checked;
                      updateProps.assessorCheckedBy = checked ? { _id: dbUser?._id, name: dbUser?.name, email: dbUser?.email } : null;
                      updateProps.assessorCheckedAt = checked ? new Date().toISOString() : null;
                    }
                    return {
                      ...inp,
                      ...updateProps
                    };
                  }
                  return inp;
                })
              };
            })
          };
        });
      });
      toast.success(checked ? 'Question locked.' : 'Question unlocked.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update lock');
    } finally {
      setTogglingInput(null);
    }
  };

  const [finalizingAll, setFinalizingAll] = useState(false);
  const toggleGlobalFinalized = async () => {
    setFinalizingAll(true);
    try {
      const shouldFinalize = !allFinalized;
      const res = await axiosSecure.post('/review/finalize-pillar', {
        projectId: id,
        finalizeAll: shouldFinalize,
      });
      setProject(prev => ({
        ...prev,
        finalized_pillars: res.data.finalized_pillars,
      }));
      toast.success(shouldFinalize ? 'All categories marked as finalized.' : 'Category finalization cleared.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update finalization status');
    } finally {
      setFinalizingAll(false);
    }
  };

  const completeFullReview = async () => {
    if (!window.confirm('Complete full review and LOCK this submission? The user will no longer be able to edit it, and control will return to the Manager.')) return;
    setLocking(true);
    try {
      const res = await axiosSecure.post('/review/complete', { projectId: id });
      setProject(res.data.project);
      toast.success('Review completed! Submission is now locked and sent to the Manager.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to complete review');
    } finally {
      setLocking(false);
    }
  };

  const unlockSubmission = async () => {
    if (!window.confirm('Unlock this submission? The user will be able to edit it again.')) return;
    try {
      const res = await axiosSecure.post(`/submissions/${id}/unlock`);
      setProject(res.data.project);
      toast.success('Submission unlocked for editing.');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to unlock'); }
  };

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await axiosSecure.patch(`/submissions/${id}/status`, { status: newStatus });
      setProject(res.data.project);
      toast.success(`Workflow status updated to ${newStatus}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const exportPdf = async () => {
    const toastId = toast.loading('Generating submission report PDF…');
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.background = '#ffffff';
    container.style.color = '#1E293B';
    container.style.fontFamily = 'Helvetica, Arial, sans-serif';

    const submittedDate = project?.submittedAt
      ? new Date(project.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : project?.createdAt
        ? new Date(project.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A';

    const esc = (str) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const css = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Helvetica, Arial, sans-serif; background: #fff; color: #1E293B; font-size: 11px; line-height: 1.4; }
      .pdf-container { width: 800px; padding: 24px; background: #fff; }
      .pdf-header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 14px; border-bottom: 3px solid #22A84B; margin-bottom: 18px; }
      .brand-title { font-size: 20px; font-weight: 800; color: #0D3B1A; letter-spacing: -0.3px; }
      .brand-sub { font-size: 10px; color: #64748B; font-weight: 600; margin-top: 2px; }
      .doc-type { text-align: right; }
      .doc-type-tag { display: inline-block; padding: 4px 10px; background: #D6F5E3; color: #145C28; font-weight: 800; font-size: 10px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase; }
      .doc-date { font-size: 9px; color: #64748B; margin-top: 4px; }
      .proj-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 18px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
      .proj-title { font-size: 15px; font-weight: 800; color: #0F172A; margin-bottom: 4px; }
      .proj-meta { font-size: 10px; color: #475569; display: flex; gap: 14px; }
      .score-pill { background: #0D3B1A; color: #fff; padding: 8px 16px; border-radius: 10px; text-align: center; }
      .score-num { font-size: 18px; font-weight: 900; line-height: 1; color: #34C961; }
      .score-lbl { font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; margin-top: 2px; }
      .tab-section { margin-bottom: 18px; page-break-inside: avoid; }
      .tab-header { background: #0D3B1A; color: #fff; padding: 7px 12px; font-size: 11px; font-weight: 800; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center; }
      .tab-score-tag { background: rgba(255,255,255,0.2); padding: 2px 7px; borderRadius: 4px; font-size: 9px; }
      .mod-block { border: 1px solid #E2E8F0; border-top: none; padding: 10px 12px; background: #fff; }
      .mod-title { font-size: 10px; font-weight: 800; color: #1E293B; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #F1F5F9; text-transform: uppercase; letter-spacing: 0.3px; }
      .q-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
      .q-table th { background: #F8FAFC; text-align: left; padding: 4px 6px; font-size: 9px; color: #64748B; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; }
      .q-table td { padding: 6px; font-size: 10px; border-bottom: 1px solid #F1F5F9; vertical-align: top; }
      .q-num { font-weight: 800; color: #22A84B; width: 28px; }
      .q-label { font-weight: 600; color: #1E293B; width: 45%; }
      .q-val { color: #334155; }
      .q-pts { font-weight: 800; color: #0D3B1A; text-align: right; width: 50px; }
      .file-tag { display: inline-flex; align-items: center; gap: 4px; background: #F1F5F9; border: 1px solid #CBD5E1; color: #1E293B; font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 9px; text-decoration: none; margin-right: 4px; margin-bottom: 2px; }
      .pdf-footer { text-align: center; font-size: 8px; color: #94A3B8; padding-top: 12px; border-top: 1px solid #E2E8F0; margin-top: 20px; }
      .print-bar { position: fixed; top: 0; left: 0; right: 0; height: 50px; background: #0D3B1A; color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
      .print-bar-title { font-weight: 800; font-size: 14px; }
      .print-bar-sub { font-size: 11px; opacity: 0.8; }
      .print-btn { background: #34C961; color: #0D3B1A; font-weight: 800; padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer; font-size: 12px; }
      @media print { .print-bar { display: none !important; } body { padding-top: 0 !important; } .tab-section + .tab-section { page-break-before: always; break-before: page; } .tab-header { page-break-after: avoid; break-after: avoid; } .mod-block + .mod-block { page-break-before: always; break-before: page; } .mod-title { page-break-after: avoid; break-after: avoid; } .q-table { page-break-inside: avoid; break-inside: avoid; } }
      .body-offset { padding-top: 60px; }
    `;

    let body = `
      <div class="pdf-container">
        <div class="pdf-header">
          <div>
            <div class="brand-title">DESH &bull; Standard Assessment</div>
            <div class="brand-sub">Department of Environment & Human Settlement</div>
          </div>
          <div class="doc-type">
            <div class="doc-type-tag">Submission Report</div>
            <div class="doc-date">Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        <div class="proj-card">
          <div>
            <div class="proj-title">${esc(project?.title)}</div>
            <div class="proj-meta">
              <span>Submitted by: <strong>${esc(project?.userId?.name)}</strong> (${esc(project?.userId?.email)})</span>
              <span>Date: <strong>${submittedDate}</strong></span>
              <span>Level: <strong>${esc(project?.leafLevel || 'N/A')}</strong></span>
            </div>
          </div>
          <div class="score-pill">
            <div class="score-num">${project?.scorePercent || 0}%</div>
            <div class="score-lbl">${Math.round(project?.totalPoints || 0)} / ${Math.round(project?.maxPoints || 0)} pts</div>
          </div>
        </div>
    `;

    (tabs || []).forEach((tab, ti) => {
      const { earned, max } = calcTabScore(tab);
      body += `
        <div class="tab-section">
          <div class="tab-header">
            <span>${ti + 1}. ${esc(tab.title)}</span>
            <span class="tab-score-tag">${Math.round(earned)} / ${max} pts</span>
          </div>
      `;

      (tab.modules || []).forEach((mod, mi) => {
        body += `
          <div class="mod-block">
            <div class="mod-title">${ti + 1}.${mi + 1} ${esc(mod.title)}</div>
            <table class="q-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>Question</th>
                  <th>Answer / Files</th>
                  <th style="text-align:right">Pts</th>
                </tr>
              </thead>
              <tbody>
        `;

        (mod.inputs || []).forEach((inp, qi) => {
          let ansText = '—';
          if (inp.inputType === 'file') {
            const linkedDocs = docs.filter(d => String(d.inputId) === String(inp._id));
            if (linkedDocs.length > 0) {
              ansText = linkedDocs.map(doc => {
                const name = doc.originalName || doc.filename || 'file';
                const filename = doc.filename || (doc.path ? doc.path.replace(/\\/g, '/').split('/').pop() : '');
                const url = `${SERVER_BASE}/uploads/documents/${filename}`;
                return `<a href="${url}" class="file-tag file-link" target="_blank" rel="noopener noreferrer">${fileIcon(name)} ${esc(name)}</a>`;
              }).join(' ');
            } else {
              ansText = '<span style="color:#94A3B8">No file</span>';
            }
          } else if (inp.inputType === 'checkbox') {
            const selected = Array.isArray(inp.value) ? inp.value : [];
            ansText = selected.length > 0 ? selected.map(v => `✓ ${esc(v)}`).join(', ') : '—';
          } else if (inp.inputType === 'number') {
            ansText = inp.value !== '' && inp.value !== undefined && inp.value !== null ? `<strong>${inp.value}</strong>` : '—';
          } else {
            ansText = inp.value ? esc(String(inp.value)) : '—';
          }

          body += `
            <tr>
              <td class="q-num">Q${qi + 1}</td>
              <td class="q-label">${esc(inp.label)}</td>
              <td class="q-val">${ansText}</td>
              <td class="q-pts">${(inp.points || 0).toFixed(1)}</td>
            </tr>
          `;
        });

        body += `
              </tbody>
            </table>
          </div>
        `;
      });

      body += `</div>`;
    });

    body += `
        <div class="pdf-footer">
          DESH Verification & Review Report &bull; Document ID: ${id} &bull; Confidential
        </div>
      </div>
    `;

    const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${esc(project?.title)} — Submission Report</title><style>${css}</style></head><body>${body}</body></html>`;

    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
      const pdfContainer = container.querySelector('.pdf-container');
      const H2C_SCALE = 2;
      const margin = 10;
      const printW = 190;
      const printH = 277;

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      let currentY = margin;

      // ── Build chunks: split each .tab-section into header + individual .mod-block sub-items ──
      const chunks = [];
      let tabSectionCount = 0;
      Array.from(pdfContainer.children).forEach((node) => {
        if (node.classList.contains('tab-section')) {
          const hdrEl = node.querySelector('.tab-header');
          const modEls = Array.from(node.querySelectorAll('.mod-block'));
          if (modEls.length === 0) {
            chunks.push({ el: node, forceNewPage: tabSectionCount > 0 });
          } else {
            // Section header: force new page for every section after the first
            if (hdrEl) chunks.push({ el: hdrEl, forceNewPage: tabSectionCount > 0 });
            // Each sub-item as its own chunk:
            //   first mod (mi === 0) flows after the section header — no blank page
            //   subsequent mods always start on a fresh page
            modEls.forEach((modEl, mi) => {
              chunks.push({ el: modEl, forceNewPage: mi > 0 });
            });
          }
          tabSectionCount++;
        } else {
          chunks.push({ el: node, forceNewPage: false });
        }
      });

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
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

        if (printH - (currentY - margin) < 10) {
          doc.addPage();
          currentY = margin;
        }

        let remainingHMm = printH - (currentY - margin);

        if (chunkHMm <= remainingHMm) {
          const sliceData = chunkCanvas.toDataURL('image/jpeg', 0.92);
          doc.addImage(sliceData, 'JPEG', margin, currentY, printW, chunkHMm);

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
          doc.addPage();
          currentY = margin;

          const sliceData = chunkCanvas.toDataURL('image/jpeg', 0.92);
          doc.addImage(sliceData, 'JPEG', margin, currentY, printW, chunkHMm);

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

      const filename = `${(project?.title || 'Submission').replace(/[^a-zA-Z0-9_-]/g, '_')}_Report.pdf`;
      doc.save(filename);
      document.body.removeChild(container);
      toast.success('PDF downloaded successfully!', { id: toastId });
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

  const activeRole     = dbUser?.activeRole || dbUser?.role;
  const isManager      = activeRole === 'desh_manager';
  const isAdmin        = activeRole === 'admin';
  const isReviewerRole = ['reviewer', 'desh_reviewer', 'desh_assessor'].includes(activeRole);

  if (loading) return (
    <Layout isAdmin={isAdmin} isReviewer={isReviewerRole} isManager={isManager}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '4px solid var(--g100)', borderTopColor: 'var(--g600)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    </Layout>
  );

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
  const displayColor = activeRule?.colorCode || null;
  const progressColor = displayColor || '#94A3B8';
  const docs = project?.documents || [];
  const isLocked = project?.isLocked || false;
  const lockStatus = project?.lockStatus || 'pending';
  const allFinalized = tabs.length > 0 && tabs.every(t => (project?.finalized_pillars || []).some(fp => String(fp) === String(t._id)));
  const ownerId = project?.userId?._id || project?.userId;

  const handleBack = () => {
    if (isManager) {
      navigate('/manager/submissions');
    } else if (isAdmin) {
      navigate('/admin/submissions');
    } else {
      navigate('/reviewer/submissions');
    }
  };

  return (
    <Layout isAdmin={isAdmin} isReviewer={isReviewerRole} isManager={isManager}>
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

      {/* ── Lock / Unlock Banner ── */}
      {activeRole !== 'desh_assessor' && lockStatus !== 'pending' && (
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
        border: '1.5px solid var(--g200)', borderRadius: 20, marginBottom: 20,
        boxShadow: '0 4px 24px rgba(34,168,75,0.12)', overflow: 'hidden',
      }} className="fade-in-up">

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px 10px 20px',
          borderBottom: scoreOpen ? '1px solid rgba(34,168,75,0.15)' : 'none',
          background: 'rgba(255,255,255,0.5)',
          flexWrap: 'wrap',
        }}>
          {/* Back + Title + Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={handleBack} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 7,
                border: '1px solid var(--border)', background: '#fff', color: 'var(--tx-muted)',
                fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0,
              }}>← Back</button>
              <h2 style={{
                fontFamily: 'Montserrat,sans-serif', fontWeight: 900,
                fontSize: 16, color: 'var(--tx)', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {project?.title}
              </h2>
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
                  padding: '5px 10px', borderRadius: 8,
                  border: '1.5px solid var(--g200)', background: '#fff',
                  fontSize: 12, fontWeight: 600, color: 'var(--tx)',
                  cursor: 'pointer', outline: 'none', maxWidth: 260,
                }}>
                <option value="">— Overall Score —</option>
                {regularSections.map(s => (
                  <option key={s._id} value={s._id}>{s.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={exportPdf} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
              background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1D4ED8',
              fontWeight: 700, fontSize: 12, fontFamily: 'Montserrat,sans-serif',
              whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}>
              ⬇ Download Report
            </button>
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

            {/* Status Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <select
                value={(() => {
                  const uid = dbUser?._id || dbUser?.id;
                  if (activeRole === 'desh_assessor') {
                    const entry = project?.assessorStatuses?.find(e => String(e.userId) === String(uid));
                    return entry?.status || 'Pending';
                  }
                  const entry = project?.reviewerStatuses?.find(e => String(e.userId) === String(uid));
                  return entry?.status || 'Pending';
                })()}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updatingStatus}
                style={{
                  padding: '7px 24px 7px 10px', borderRadius: 10,
                  border: '1.5px solid var(--border-md)', background: '#fff', color: 'var(--tx)',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer', outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%231A7A35' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                }}
              >
                <option value="Pending">Pending</option>
                <option value="Started">Started</option>
                <option value="Done">Done</option>
              </select>
            </div>

            {/* Lock / Unlock buttons */}
            {activeRole !== 'desh_assessor' && (
              project?.project_status === 'CERTIFICATE_ISSUED' ? (
                <span style={{ padding: '7px 12px', borderRadius: 10, background: '#D6F5E3', border: '1.5px solid #A8EFC0', color: '#145C28', fontSize: 12, fontWeight: 700 }}>✓ Label Issued</span>
              ) : project?.project_status === 'REVIEW_COMPLETE' ? (
                <span style={{ padding: '7px 12px', borderRadius: 10, background: '#DBEAFE', border: '1.5px solid #BFDBFE', color: '#1E40AF', fontSize: 12, fontWeight: 700 }}>🔒 Review Complete</span>
              ) : isLocked ? (
                <span style={{ padding: '7px 12px', borderRadius: 10, background: '#FEF9C3', border: '1.5px solid #FDE68A', color: '#92400E', fontSize: 12, fontWeight: 700 }}>🔒 Locked</span>
              ) : (
                <button 
                  onClick={completeFullReview} 
                  disabled={locking || !allFinalized} 
                  style={{
                    padding: '7px 14px', borderRadius: 10,
                    background: !allFinalized ? '#E2E8F0' : locking ? 'var(--bg-soft)' : 'linear-gradient(135deg,#16A34A,#4ADE80)',
                    color: !allFinalized ? '#94A3B8' : locking ? 'var(--tx-muted)' : '#fff',
                    fontWeight: 700, fontSize: 12, border: 'none', 
                    cursor: !allFinalized ? 'not-allowed' : 'pointer',
                    boxShadow: !allFinalized ? 'none' : '0 2px 10px rgba(22,163,74,0.3)', 
                    fontFamily: 'Montserrat,sans-serif',
                  }}
                  title={!allFinalized ? "Mark all asset pillars as finalized to enable sign-off" : "Submit review"}
                >
                  {locking ? '…Processing' : '🔒 Complete Full Review & Lock'}
                </button>
              )
            )}

            {/* Toggle button */}
            <button onClick={() => setScoreOpen(o => !o)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 10,
              background: scoreOpen ? 'rgba(34,168,75,0.12)' : 'linear-gradient(135deg,var(--g700),var(--g500))',
              border: `1.5px solid ${scoreOpen ? 'rgba(34,168,75,0.3)' : 'transparent'}`,
              color: scoreOpen ? 'var(--g700)' : '#fff',
              fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 12, cursor: 'pointer',
            }}>
              <span>{scoreOpen ? '▲' : '▼'}</span>
              <span>{scoreOpen ? 'Hide' : 'Score'}</span>
            </button>
          </div>
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
                            width: '100%', paddingBottom: 2,
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
                            textAlign: 'center', whiteSpace: 'nowrap', lineHeight: 1.2,
                          }}>
                            {rangeLabel}
                          </span>

                          {/* Leaf name */}
                          <span style={{
                            fontSize: 9, fontWeight: isActive ? 700 : 400,
                            fontFamily: 'Montserrat,sans-serif',
                            color: isActive ? color : 'var(--tx-faint)',
                            textAlign: 'center', lineHeight: 1.2, width: '100%',
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
                          }}>
                            <div style={{
                              position: 'absolute', left: 0, top: 0, bottom: 0,
                              width: `${segFill}%`, background: color, borderRadius: 99,
                              transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                            }} />
                          </div>

                          {/* Active arrow */}
                          <div style={{ fontSize: 8, lineHeight: 1, color: isActive ? color : 'transparent' }}>▲</div>
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
                  <span style={{ fontSize: 13, color: 'var(--tx-muted)', fontWeight: 700 }}>
                    ({displayEarned} / {displayMax} pts)
                  </span>
                  {displayLevel && <LeafBadge level={displayLevel} />}
                  <span className={project?.status === 'submitted' ? 'status-chip status-completed' : 'status-chip status-progress'}>
                    {project?.status === 'submitted' ? '✓ Submitted' : '● Draft'}
                  </span>
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
                    flex: 1, background: '#EBF7F2', borderRadius: 10,
                    padding: '10px 6px 6px 4px', display: 'flex', flexDirection: 'column',
                    position: 'relative', minHeight: 148, minWidth: 0,
                  }}>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22A84B', display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#374151', fontFamily: 'Montserrat,sans-serif' }}>Allocated Points</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#EA7C0C', display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#374151', fontFamily: 'Montserrat,sans-serif' }}>Achieved Points</span>
                      </div>
                    </div>

                    <div style={{ width: '100%', height: 148, minWidth: 0 }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} key={tabChartData.length}>
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
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--tx-faint)' }}>
                    No tab data yet
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Tab Selector Grid ── */}
      {tabs.length > 0 && (
        <div style={{
          marginBottom: 16, background: '#fff', borderRadius: 16,
          border: '1.5px solid var(--g200)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }} className="fade-in-up">
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {tabs.map((tab, i) => {
              const isActive = i === activeTab;
              const rowSize = Math.ceil(tabs.length / 2);
              const isSecondRow = i >= rowSize;
              return (
                <button
                  key={tab._id}
                  onClick={() => setActiveTab(i)}
                  style={{
                    flex: `1 1 calc(${100 / rowSize}% - 1px)`,
                    minWidth: 0, display: 'flex', alignItems: 'center', gap: 9,
                    padding: '11px 13px', border: 'none',
                    borderTop: isSecondRow ? '1px solid var(--g100)' : 'none',
                    borderRight: '1px solid var(--g100)',
                    background: isActive ? 'var(--g50)' : 'transparent',
                    cursor: 'pointer', position: 'relative',
                    transition: 'background 0.15s', textAlign: 'left',
                  }}>
                  {isActive && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                      background: 'linear-gradient(90deg,var(--g600),var(--g400))',
                      borderRadius: '3px 3px 0 0',
                    }} />
                  )}
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: isActive ? 'linear-gradient(135deg,var(--g700),var(--g500))' : 'var(--bg-subtle)',
                    border: isActive ? 'none' : '1px solid var(--g200)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', boxShadow: isActive ? '0 2px 8px rgba(34,168,75,0.25)' : 'none',
                  }}>
                    {tab.iconUrl ? (
                      <img src={`${SERVER_URL}${tab.iconUrl}`} alt=""
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                        style={{ width: 18, height: 18, objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 900, color: isActive ? '#fff' : 'var(--tx-faint)', fontFamily: 'Montserrat,sans-serif' }}>
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: isActive ? 800 : 600,
                    fontFamily: 'Montserrat,sans-serif',
                    color: isActive ? 'var(--g700)' : 'var(--tx-muted)',
                    lineHeight: 1.35, overflow: 'hidden',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minWidth: 0,
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
      )}

      {/* ── Modules in Active Tab ── */}
      {tabs[activeTab] && (() => {
        const tab = tabs[activeTab];

        return (
          <div key={tab._id} className="fade-in-up" style={{ marginBottom: 28 }}>
            {/* Tab header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid var(--g200)' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 8, background: 'var(--g600)', color: '#fff',
                fontSize: 12, fontWeight: 900, flexShrink: 0, fontFamily: 'Montserrat,sans-serif',
              }}>{activeTab + 1}</span>
              <h2 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--g800)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {tab.title}
              </h2>

            </div>

            {/* Modules */}
            {(tab.modules || []).map((mod, modIdx) => {
              const allInputs = mod.inputs || [];

              // Group inputs by sectionId
              const grouped = {};
              allInputs.forEach(inp => {
                const sid = String(inp.sectionId || 'none');
                if (!grouped[sid]) grouped[sid] = [];
                grouped[sid].push(inp);
              });

              const sectionGroups = [
                ...sortedSections
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

              const visibleGroups = selectedSection
                ? sectionGroups.filter(g => g.id === selectedSection || g.isConstant)
                : sectionGroups;

              const modEarned = allInputs.reduce((s, inp) => s + (inp.points || 0), 0);
              const modMax = allInputs.reduce((s, inp) => s + calcInputMax(inp), 0);
              const modPct = modMax > 0 ? Math.round((modEarned / modMax) * 100) : 0;
              const scoreColor = modPct >= 70 ? 'var(--g700)' : modPct >= 40 ? '#92400E' : 'var(--tx-faint)';
              const scoreBg = modPct >= 70 ? 'var(--g100)' : modPct >= 40 ? '#FEF9C3' : 'var(--bg-muted)';

              return (
                <div key={mod._id} style={{
                  border: '1px solid var(--border)', borderRadius: 16, background: '#fff',
                  marginBottom: 16, boxShadow: 'var(--sh-xs)', overflow: 'hidden',
                }}>
                  {/* Module header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)' }}>
                    <IconImg src={mod.iconUrl ? `${SERVER_URL}${mod.iconUrl}` : ''} fallback="◈" size={36} radius={10} />
                    <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--tx)', margin: 0, flex: 1 }}>
                      <span style={{ color: 'var(--tx-faint)', marginRight: 4 }}>{activeTab + 1}.{modIdx + 1}</span>{mod.title}
                    </p>
                    <div style={{ padding: '5px 12px', borderRadius: 20, background: scoreBg, border: `1px solid ${modPct >= 70 ? 'var(--g300)' : modPct >= 40 ? '#FDE68A' : 'var(--border)'}` }}>
                      <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 14, color: scoreColor }}>
                        {modEarned.toFixed(1)}
                      </span>
                      {modMax > 0 && <span style={{ fontSize: 11, color: 'var(--tx-faint)', fontWeight: 600 }}> / {modMax} pts</span>}
                    </div>
                  </div>

                  {/* Section Groups */}
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {visibleGroups.map(group => {
                      const secEarned = group.inputs.reduce((s, inp) => s + (inp.points || 0), 0);
                      const secMax = group.inputs.reduce((s, inp) => s + calcInputMax(inp), 0);
                      const secFilled = group.inputs.filter(isInputFilled).length;
                      const secTotal = group.inputs.length;
                      const secFillPct = secTotal > 0 ? Math.round((secFilled / secTotal) * 100) : 0;

                      return (
                        <div key={group.id} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                          {/* Section Header */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', background: 'linear-gradient(90deg,#EFF9F4,transparent)',
                            borderBottom: '1px solid var(--border)',
                          }}>
                            <IconImg src={group.iconUrl ? `${SERVER_URL}${group.iconUrl}` : ''} fallback="▦" size={24} radius={6} />
                            <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 13, color: 'var(--g800)', margin: 0, flex: 1 }}>
                              {group.title}
                            </p>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: 'var(--g50)', color: 'var(--g700)', border: '1px solid var(--g200)' }}>
                              {secEarned.toFixed(1)} / {secMax} pts
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-faint)' }}>
                              {secFilled}/{secTotal}
                            </span>
                          </div>

                          {/* Progress bar strip */}
                          <div style={{ height: 3, background: 'var(--bg-muted)' }}>
                            <div style={{ height: '100%', width: `${secFillPct}%`, background: 'var(--g500)', transition: 'width 0.5s ease' }} />
                          </div>

                          {/* Side-by-Side Section Body (Left Inputs + Right PointsBox) */}
                          <div style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                            {/* Left: Input questions */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {group.inputs.map((inp, qi) => {
                                const isEmpty = inp.inputType === 'file' ? !inp.uploaded
                                  : Array.isArray(inp.value) ? inp.value.length === 0
                                    : inp.value === '' || inp.value === undefined;
                                const ts = TYPE_STYLE[inp.inputType] || {};
                                const linkedDocs = inp.inputType === 'file'
                                  ? docs.filter(d => String(d.inputId) === String(inp._id))
                                  : [];
                                const isInputLocked = lockedInputsSet.has(String(inp._id));
                                const isToggling = togglingInput === String(inp._id);
                                const isHighlighted = String(highlightedInputId) === String(inp._id);

                                return (
                                  <div
                                    key={inp._id}
                                    id={`input-${inp._id}`}
                                    className={isHighlighted ? 'highlight-question' : ''}
                                    style={{
                                      padding: '12px 14px', borderRadius: 12,
                                      background: isInputLocked ? '#FFFBEB' : isEmpty ? 'var(--bg-subtle)' : '#FAFFFE',
                                      border: `1.5px solid ${isInputLocked ? '#FDE68A' : isEmpty ? 'var(--border)' : 'var(--g100)'}`,
                                      opacity: isEmpty && !isInputLocked ? 0.85 : 1,
                                      transition: 'all 0.2s',
                                    }}
                                  >
                                    {/* Question header row */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                      <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--tx)', margin: 0, lineHeight: 1.4, flex: 1 }}>
                                        {inp.label}
                                        {inp.isRequired && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
                                      </p>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                        <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: ts.bg, color: ts.color, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}>
                                          {inp.inputType}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Details — immediately after label */}
                                    {inp.details && (
                                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 8, marginTop: 3 }}>
                                        <span style={{ fontSize: 15, color: '#6B7280', flexShrink: 0, lineHeight: 1.5 }}><RiInformation2Fill /></span>
                                        <p style={{ margin: 0, fontSize: 12, color: '#6B7280', lineHeight: 1.5, fontStyle: 'italic', fontFamily: 'Inter,sans-serif' }}>
                                          {inp.details}
                                        </p>
                                      </div>
                                    )}

                                    {/* Instruction button */}
                                    {inp.instruction && (
                                      <div style={{ marginBottom: 10, marginTop: 2 }}>
                                        <button
                                          type="button"
                                          onClick={() => setInstrModal({ open: true, label: inp.label, html: inp.instruction })}
                                          style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            padding: '4px 11px', borderRadius: 8, cursor: 'pointer',
                                            border: '1.5px solid #A8EFC0', background: '#F0FDF4', color: '#145C28',
                                            fontSize: 11.5, fontWeight: 700, fontFamily: 'Montserrat,sans-serif',
                                          }}
                                        >
                                          <span>📋</span> Instruction
                                        </button>
                                      </div>
                                    )}

                                    {/* Answer display */}
                                    <div style={{ fontSize: 13, color: isEmpty ? 'var(--tx-faint)' : 'var(--tx)', wordBreak: 'break-word', marginBottom: 8 }}>
                                      {inp.inputType === 'file' ? (
                                        linkedDocs.length > 0 ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {linkedDocs.map((doc, di) => {
                                              const name = doc.originalName || doc.filename || 'file';
                                              const type = getFileType(name);
                                              const viewable = type === 'image' || type === 'pdf';
                                              const filename = doc.filename || (doc.path ? doc.path.replace(/\\/g, '/').split('/').pop() : '');
                                              const url = viewable ? `${SERVER_BASE}/uploads/documents/${filename}` : getDownloadUrl(doc);
                                              return (
                                                <a key={di} href={url} target={viewable ? "_blank" : undefined} rel={viewable ? "noopener noreferrer" : undefined}
                                                  {...(!viewable ? { download: name } : {})}
                                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 7, background: 'var(--g50)', border: '1px solid var(--g200)', color: 'var(--g800)', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                                                  <span>{fileIcon(name)}</span>
                                                  <span style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                                  <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--g200)', color: 'var(--g800)', flexShrink: 0 }}>{fileActionLabel(name)}</span>
                                                </a>
                                              );
                                            })}
                                          </div>
                                        ) : <span style={{ color: 'var(--tx-faint)', fontSize: 12 }}>No file uploaded</span>
                                      ) : inp.inputType === 'checkbox' ? (
                                        (() => {
                                          const selected = Array.isArray(inp.value) ? inp.value : [];
                                          const allOpts = inp.options || [];
                                          if (allOpts.length === 0 && selected.length === 0) return <span style={{ color: 'var(--tx-faint)', fontSize: 12 }}>—</span>;
                                          const list = allOpts.length > 0 ? allOpts.map(o => ({ label: o.label, pts: o.points || 0 })) : selected.map(v => ({ label: v, pts: 0 }));
                                          return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                                              {list.map((o, oi) => {
                                                const on = selected.includes(o.label);
                                                return (
                                                  <div key={oi} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '6px 12px', borderRadius: 8,
                                                    background: on ? '#FEF9C3' : 'var(--bg-subtle)',
                                                    border: `1px solid ${on ? '#FDE68A' : 'var(--border)'}`,
                                                  }}>
                                                    <span style={{ fontSize: 12, fontWeight: on ? 700 : 500, color: on ? '#92400E' : 'var(--tx-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                      <span>{on ? '☑' : '☐'}</span> {o.label}
                                                    </span>
                                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(0,0,0,0.05)', color: 'var(--tx-faint)' }}>
                                                      {o.pts}pts
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()
                                      ) : inp.inputType === 'number' ? (
                                        (() => {
                                          const sMin = inp.sliderMin != null ? Number(inp.sliderMin) : (inp.line?.x1 ?? 0);
                                          const sMax = inp.sliderMax != null ? Number(inp.sliderMax) : (inp.line?.x2 ?? 100);
                                          const rawVal = inp.value;
                                          const hasVal = rawVal !== '' && rawVal !== undefined && rawVal !== null;
                                          const numVal = hasVal ? Number(rawVal) : null;
                                          const pct = (hasVal && sMax > sMin)
                                            ? Math.min(Math.max(((numVal - sMin) / (sMax - sMin)) * 100, 0), 100)
                                            : 0;
                                          const maxPts = calcInputMax(inp);
                                          const earnedPts = inp.points || 0;
                                          return (
                                            <div style={{ marginTop: 2, maxWidth: 360 }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <div style={{ padding: '6px 12px', borderRadius: 8, background: '#F3F4F6', border: '1px solid #E5E7EB', fontSize: 14, fontWeight: 700 }}>
                                                  {hasVal ? rawVal : '—'}
                                                </div>
                                              </div>

                                              {/* Slider Range Track */}
                                              <div style={{ width: '100%', height: 8, borderRadius: 99, background: 'var(--bg-muted)', overflow: 'hidden', position: 'relative' }}>
                                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: '#22A84B', borderRadius: 99 }} />
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                                                <span style={{ fontSize: 10, color: 'var(--tx-faint)' }}>{sMin}</span>
                                                <span style={{ fontSize: 10, color: 'var(--tx-faint)' }}>{sMax}</span>
                                              </div>

                                              {inp.line && (inp.line.x1 != null || inp.line.x2 != null) && (
                                                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                                                  ({inp.line.x1}, {inp.line.y1}pts) → ({inp.line.x2}, {inp.line.y2}pts) = {earnedPts.toFixed(1)} pts ✓
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })()
                                      ) : (inp.value || <span style={{ color: 'var(--tx-faint)', fontSize: 12 }}>—</span>)}
                                    </div>

                                    {/* Calculate Button (Shown when URL or Calculation is configured) */}
                                    {(inp.calcBtn?.url || inp.calcBtn?.calcId) && (
                                      <div style={{ marginTop: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
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
                                            type="button"
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
                                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                              transition: 'opacity 0.18s, transform 0.18s',
                                            }}
                                            onMouseEnter={e => {
                                              e.currentTarget.style.opacity = '0.9';
                                              e.currentTarget.style.transform = 'translateY(-1px)';
                                            }}
                                            onMouseLeave={e => {
                                              e.currentTarget.style.opacity = '1';
                                              e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                          >
                                            🧮 {inp.calcBtn.name || 'Calculate'}
                                          </button>
                                        </a>
                                      </div>
                                    )}

                                    {/* Action Row: Ticket, Lock Controls, Comments */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        {/* Clarification Ticket */}
                                        {(() => {
                                           const isAssignedStaff = (() => {
                                             if (!dbUser) return false;
                                             const activeRole = dbUser.activeRole || dbUser.role;
                                             if (['admin', 'desh_manager'].includes(activeRole)) return true;
                                             const uid = String(dbUser._id);
                                             const isOwner = String(project?.userId?._id || project?.userId) === uid;
                                             const isAssignedRev = project?.assignedReviewers?.some(r => String(r._id || r) === uid);
                                             const isAssignedAss = project?.assignedAssessors?.some(a => String(a._id || a) === uid);
                                             return isOwner || isAssignedRev || isAssignedAss;
                                           })();

                                           if (!isAssignedStaff) {
                                             return (
                                               <span title="Manager project staff assignment required to create tickets" style={{ fontSize: 10.5, color: 'var(--tx-faint)', fontStyle: 'italic', padding: '3px 6px' }}>
                                                 🔒 Staff assignment required
                                               </span>
                                             );
                                           }

                                           return (
                                             <button
                                               onClick={() => {
                                                 setTicketQuestionContext({
                                                   projectId: project._id,
                                                   projectTitle: project.title,
                                                   tabId: tab._id,
                                                   tabTitle: tab.title,
                                                   moduleId: mod._id,
                                                   moduleTitle: mod.title,
                                                   sectionId: group.id,
                                                   sectionTitle: group.title,
                                                   inputId: inp._id,
                                                   questionSnapshot: {
                                                     number: `Q${qi + 1}`,
                                                     label: inp.label,
                                                     inputType: inp.inputType,
                                                     details: inp.details || '',
                                                     tabTitle: tab.title,
                                                     moduleTitle: mod.title,
                                                     sectionTitle: group.title,
                                                     projectTitle: project.title,
                                                   }
                                                 });
                                                 setTicketModalOpen(true);
                                               }}
                                               style={{
                                                 display: 'inline-flex', alignItems: 'center', gap: 4,
                                                 padding: '4px 9px', borderRadius: 7, fontSize: 11, fontWeight: 800,
                                                 background: 'linear-gradient(135deg, #10B981, #059669)',
                                                 color: '#fff', border: 'none', cursor: 'pointer',
                                                 fontFamily: 'Montserrat,sans-serif'
                                               }}
                                             >
                                               <span>🎫</span> Create Ticket
                                             </button>
                                           );
                                         })()}
                                      </div>

                                      {/* Right: Lock Checkboxes */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {/* Assessor Checkbox */}
                                        <label style={{
                                          display: 'flex', alignItems: 'center', gap: 5,
                                          padding: '3px 7px', borderRadius: 6, fontSize: 10.5, fontWeight: 700,
                                          background: inp.assessorChecked ? 'rgba(59,130,246,0.1)' : '#F3F4F6',
                                          color: inp.assessorChecked ? '#1D4ED8' : '#4B5563',
                                          border: `1px solid ${inp.assessorChecked ? '#93C5FD' : '#E5E7EB'}`,
                                          cursor: activeRole === 'desh_assessor' && !isToggling ? 'pointer' : 'default',
                                        }}>
                                          <input
                                            type="checkbox"
                                            checked={!!inp.assessorChecked}
                                            onChange={(e) => toggleQuestionCheck(inp._id, e.target.checked)}
                                            disabled={activeRole !== 'desh_assessor' || isToggling}
                                            style={{ width: 12, height: 12, accentColor: '#1D4ED8' }}
                                          />
                                          <span>Assessor Lock {inp.assessorChecked ? '🔒' : '✏️'}</span>
                                        </label>

                                        {/* Reviewer Checkbox */}
                                        <label style={{
                                          display: 'flex', alignItems: 'center', gap: 5,
                                          padding: '3px 7px', borderRadius: 6, fontSize: 10.5, fontWeight: 700,
                                          background: inp.reviewerChecked ? 'rgba(124,58,237,0.1)' : '#F3F4F6',
                                          color: inp.reviewerChecked ? '#6D28D9' : '#4B5563',
                                          border: `1px solid ${inp.reviewerChecked ? '#C084FC' : '#E5E7EB'}`,
                                          cursor: (activeRole === 'desh_reviewer' || activeRole === 'reviewer') && !isToggling ? 'pointer' : 'default',
                                        }}>
                                          <input
                                            type="checkbox"
                                            checked={!!inp.reviewerChecked}
                                            onChange={(e) => toggleQuestionCheck(inp._id, e.target.checked)}
                                            disabled={((activeRole !== 'desh_reviewer' && activeRole !== 'reviewer') || isToggling)}
                                            style={{ width: 12, height: 12, accentColor: '#6D28D9' }}
                                          />
                                          <span>Reviewer Lock {inp.reviewerChecked ? '🔒' : '✏️'}</span>
                                        </label>
                                      </div>
                                    </div>

                                    {/* Comment Thread */}
                                    {dbUser && (
                                      <CommentThread
                                        projectId={project._id}
                                        inputId={inp._id}
                                        currentUserId={dbUser._id}
                                        currentRole={dbUser.role}
                                        isLocked={
                                          isLocked || 
                                          (
                                            (activeRole === 'desh_reviewer' || activeRole === 'reviewer')
                                              ? !!inp.reviewerChecked
                                              : activeRole === 'desh_assessor'
                                                ? !!inp.assessorChecked
                                                : true
                                          )
                                        }
                                        projectOwnerId={ownerId}
                                        initialCount={commentCounts[String(inp._id)] || 0}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Right: PointsBox Sticky Card */}
                            <PointsBox earned={secEarned} max={secMax} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Global Finalization & Review Completion Footer Container ── */}
      {activeRole !== 'desh_assessor' && !project?.isLocked && (
        <div style={{
          marginTop: 24,
          marginBottom: 32,
          padding: '20px 24px',
          borderRadius: 16,
          background: allFinalized ? 'linear-gradient(135deg, #F0FDF4, #DCFCE7)' : '#FFFFFF',
          border: `1.5px solid ${allFinalized ? '#A8EFC0' : 'var(--border-md)'}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }} className="fade-in-up">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>{allFinalized ? '✓' : '◯'}</span>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, fontFamily: 'Montserrat,sans-serif', color: allFinalized ? 'var(--g800)' : 'var(--tx)' }}>
                {allFinalized ? 'All Categories Finalized' : 'Global Assessment Finalization'}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--tx-muted)', fontWeight: 500 }}>
              {allFinalized
                ? 'All categories across this assessment are marked as finalized. You can now complete the full review.'
                : 'Mark all categories as finalized to proceed with final submission and sign-off.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              disabled={finalizingAll}
              onClick={toggleGlobalFinalized}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                fontFamily: 'Montserrat,sans-serif', cursor: 'pointer',
                border: allFinalized ? '1.5px solid var(--g400)' : '1.5px solid var(--g600)',
                background: allFinalized ? '#fff' : 'linear-gradient(135deg, var(--g700), var(--g500))',
                color: allFinalized ? 'var(--g700)' : '#fff',
                boxShadow: allFinalized ? 'none' : '0 2px 10px rgba(34,168,75,0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              {finalizingAll
                ? 'Updating…'
                : allFinalized
                  ? '✓ All Categories Finalized (Click to Unfinalize)'
                  : '◯ Mark As Finalized'}
            </button>

            {project?.project_status !== 'REVIEW_COMPLETE' && (
              <button
                onClick={completeFullReview}
                disabled={locking || !allFinalized}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  background: !allFinalized ? '#E2E8F0' : locking ? 'var(--bg-soft)' : 'linear-gradient(135deg,#16A34A,#4ADE80)',
                  color: !allFinalized ? '#94A3B8' : locking ? 'var(--tx-muted)' : '#fff',
                  fontWeight: 800, fontSize: 13, border: 'none',
                  cursor: !allFinalized ? 'not-allowed' : 'pointer',
                  boxShadow: !allFinalized ? 'none' : '0 2px 10px rgba(22,163,74,0.3)',
                  fontFamily: 'Montserrat,sans-serif',
                  transition: 'all 0.2s ease',
                }}
                title={!allFinalized ? "Mark all categories as finalized first to enable sign-off" : "Submit full review"}
              >
                {locking ? '…Processing' : '🔒 Complete Full Review & Lock'}
              </button>
            )}
          </div>
        </div>
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
