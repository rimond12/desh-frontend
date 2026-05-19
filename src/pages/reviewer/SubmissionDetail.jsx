import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { ColoredLeaf, LeafBadge } from '../../components/shared/LeafLogo.jsx';
import CommentThread from '../../components/shared/CommentThread.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SERVER_BASE = API_BASE; // kept for backward compat with imageUrl usages below

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
  if (doc.filename) return `${API_BASE}/uploads/documents/${doc.filename}`;
  if (doc.path) {
    const fname = doc.path.replace(/\\/g, '/').split('/').pop();
    return `${API_BASE}/uploads/documents/${fname}`;
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
  return t === 'pdf' ? 'View' : t === 'image' ? 'View' : '↓';
}

// ── Input type badge colors ───────────────────────────────────────
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
  // comment counts per inputId (pre-fetched for badges)
  const [commentCounts, setCommentCounts] = useState({});
  const [projectComments, setProjectComments] = useState([]);
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

  const exportPdf = () => {
    const win = window.open('', '_blank', 'width=1040,height=900');
    if (!win) { toast.error('Please allow popups to export PDF'); return; }

    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fIcon = (name) => { const e = (name||'').split('.').pop().toLowerCase(); return e==='pdf'?'📄':['jpg','jpeg','png','gif','webp','svg'].includes(e)?'🖼️':'📎'; };
    const typeClass = (t) => ({number:'t-num',text:'t-txt',checkbox:'t-chk',file:'t-fil'}[t]||'t-txt');
    const submittedDate = project?.updatedAt ? new Date(project.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) : '';
    const pctFill = Math.min(project?.scorePercent || 0, 100);

    const getCommentsHtml = (inputId) => {
      const list = (projectComments || []).filter(c => String(c.inputId) === String(inputId));
      if (list.length === 0) return '';

      const roots = list.filter(c => !c.parentId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      let html = `<div class="inp-comments">
        <div class="comment-hdr">💬 Comments (${list.length})</div>
        <div class="comment-thread">`;

      roots.forEach(root => {
        const rootRole = root.role || 'user';
        const rootRoleClass = rootRole === 'admin' ? 'r-admin' : rootRole === 'reviewer' ? 'r-reviewer' : 'r-user';
        const rootRoleLabel = rootRole === 'admin' ? 'Admin' : rootRole === 'reviewer' ? 'Reviewer' : 'User';
        const rootTime = new Date(root.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

        html += `<div class="comment-box">
          <div class="comment-meta">
            <span class="comment-role ${rootRoleClass}">${rootRoleLabel}</span>
            <span class="comment-author">${esc(root.authorName || 'Anonymous')}</span>
            <span class="comment-time">${rootTime}</span>
          </div>
          <div class="comment-text">${esc(root.text)}</div>
        </div>`;

        const replies = list.filter(c => String(c.parentId) === String(root._id)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        replies.forEach(reply => {
          const repRole = reply.role || 'user';
          const repRoleClass = repRole === 'admin' ? 'r-admin' : repRole === 'reviewer' ? 'r-reviewer' : 'r-user';
          const repRoleLabel = repRole === 'admin' ? 'Admin' : repRole === 'reviewer' ? 'Reviewer' : 'User';
          const repTime = new Date(reply.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

          html += `<div class="comment-box reply">
            <div class="comment-meta">
              <span class="comment-role ${repRoleClass}">${repRoleLabel}</span>
              <span class="comment-author">${esc(reply.authorName || 'Anonymous')}</span>
              <span class="comment-time">${repTime}</span>
            </div>
            <div class="comment-text">${esc(reply.text)}</div>
          </div>`;
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
      <div class="sc-num">${project?.scorePercent||0}<span class="sc-pct">%</span></div>
      <div class="sc-vline"></div>
      <div>
        <div class="sc-pts">${Math.round(project?.totalPoints||0)} / ${Math.round(project?.maxPoints||0)} pts</div>
        <div class="sc-level">
          ${project?.leafLevel ? `<span class="sc-pill p-green">${esc(project.leafLevel)}</span>` : ''}
          <span class="sc-pill ${project?.status==='submitted'?'p-green':'p-amber'}">${project?.status==='submitted'?'✓ Submitted':'● Draft'}</span>
        </div>
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
      body += `<div class="tab-sec">
        <div class="tab-hdr">
          <div class="tab-badge">${ti + 1}</div>
          <div class="tab-name">${esc(tab.title)}</div>
        </div>`;
      mods.forEach((mod, mi) => {
        const inputs = mod.inputs || [];
        const modEarned = inputs.reduce((s, i) => s + (i.points || 0), 0);
        const modMax = inputs.reduce((s, i) => s + calcInputMax(i), 0);
        body += `<div class="mod">
          <div class="mod-hdr">
            <span class="mod-name">${esc((ti+1)+'.'+(mi+1)+' '+mod.title)}</span>
            ${modMax > 0 ? `<span class="mod-pts">${modEarned.toFixed(1)} / ${modMax} pts</span>` : ''}
          </div>`;
        // Group inputs by stage (sectionId) sorted by global section sortOrder
        const grouped = {};
        inputs.forEach(inp => {
          const sid = String(inp.sectionId || 'none');
          if (!grouped[sid]) grouped[sid] = [];
          grouped[sid].push(inp);
        });

        const sortedGlobalSections = [...globalSections].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        const stageGroups = [
          ...sortedGlobalSections
            .filter(s => grouped[String(s._id)])
            .map(s => ({
              title: s.title || '',
              inputs: grouped[String(s._id)],
            })),
          ...(grouped['none'] ? [{ title: '', inputs: grouped['none'] }] : []),
        ];
        stageGroups.forEach(group => {
          if (group.title) body += `<div class="stage-hdr">${esc(group.title)}</div>`;
          group.inputs.forEach(inp => {
          let val = '';
          if (inp.inputType === 'file') {
            const linked = (docs || []).filter(d => String(d.inputId) === String(inp._id));
            val = linked.length > 0
              ? linked.map(doc => { const url = getDownloadUrl(doc); const name = doc.originalName || doc.filename || 'file'; return `<a href="${url}" target="_blank" class="file-link">${fIcon(name)} ${esc(name)}</a>`; }).join('<br>')
              : '<span class="val-empty">No file uploaded</span>';
          } else if (inp.inputType === 'checkbox') {
            const sel = Array.isArray(inp.value) ? inp.value : [];
            const opts = inp.options || [];
            const list = opts.length > 0 ? opts : sel.map(l => ({ label: l, points: 0 }));
            val = list.length > 0
              ? `<div class="cb-wrap">${list.map(o => { const on = sel.includes(o.label); return `<span class="cb-chip ${on?'cb-on':'cb-off'}">${on?'✓ ':''}${esc(o.label)}${o.points?` (${o.points}pts)`:''}</span>`; }).join('')}</div>`
              : '<span class="val-empty">—</span>';
          } else {
            val = inp.value ? esc(String(inp.value)) : '<span class="val-empty">—</span>';
          }
          body += `<div class="inp">
            <div class="inp-lbl">
              <span class="inp-type ${typeClass(inp.inputType)}">${inp.inputType}</span>
              ${esc(inp.label)}${inp.isRequired ? '<span class="inp-req"> *</span>' : ''}
              ${inp.points > 0 ? `<span class="inp-pts">${inp.points.toFixed(1)} pts</span>` : ''}
            </div>
            <div class="inp-val">${val}</div>
            ${getCommentsHtml(inp._id)}
          </div>`;
          }); // end group.inputs.forEach
        }); // end stageGroups.forEach
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
.sc-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 12px;border-radius:99px;font-size:11px;font-weight:700;font-family:'Montserrat',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
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
.inp{display:grid;grid-template-columns:1fr 1.3fr;gap:12px;padding:9px 15px;border-bottom:1px solid #F3F4F6;align-items:start}
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
.cb-wrap{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}
.cb-chip{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid;-webkit-print-color-adjust:exact;print-color-adjust:exact}
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
@media print{.print-bar{display:none!important}.body-offset{padding-top:0!important}.tab-sec+.tab-sec{page-break-before:always}.mod{page-break-inside:avoid}.tab-hdr{page-break-after:avoid}.stage-hdr{background:#F0FDF4!important}.comment-box{page-break-inside:avoid}}`;

    win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${esc(project?.title)} — Submission Report</title>
<style>${css}</style></head><body>
<div class="print-bar">
  <div class="print-bar-info">
    <div class="print-bar-title">${esc(project?.title)}</div>
    <div class="print-bar-sub">DESH Submission Report &bull; ${submittedDate}</div>
  </div>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
</div>
<div class="body-offset">${body}</div>
<script>setTimeout(()=>window.print(),600)<\/script></body></html>`);
    win.document.close();
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
  const ownerId = project?.userId?._id || project?.userId;

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

        {/* Export PDF */}
        <button onClick={exportPdf} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12,
          border: '1.5px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8',
          fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif', flexShrink: 0,
        }}>⬇ Export PDF</button>

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

        {/* Section strip + toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 20px', borderBottom: scoreOpen ? '1px solid rgba(34,168,75,0.15)' : 'none',
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
            {regularSections.map(s => (
              <option key={s._id} value={s._id}>{s.title}</option>
            ))}
            {constantSections.length > 0 && (
              <></>
            )}
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
        {scoreOpen && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '18px 24px', flexWrap: 'wrap' }}>
              <ColoredLeaf level={displayLevel} colorCode={displayColor} imageUrl={activeRule?.imageUrl ? `${SERVER_BASE}${activeRule.imageUrl}` : null} size={82} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 34, color: 'var(--tx)', lineHeight: 1 }}>
                    {displayPct}%
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--tx-muted)', fontWeight: 600 }}>score</span>
                  <span style={{ fontSize: 14, color: 'var(--tx-muted)', fontWeight: 700 }}>
                    {displayEarned} / {displayMax} pts
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
          </>
        )}
      </div>

      {/* ── Tabs → Modules → Inputs + Comment threads ── */}
      {(tabs || []).map((tab, ti) => {
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
                      {mod.visibleInputs.flatMap((inp, qi) => {
                        const isEmpty = inp.inputType === 'file' ? !inp.uploaded
                          : Array.isArray(inp.value) ? inp.value.length === 0
                            : inp.value === '' || inp.value === undefined;
                        const ts = TYPE_STYLE[inp.inputType] || {};
                        const linkedDocs = inp.inputType === 'file'
                          ? docs.filter(d => String(d.inputId) === String(inp._id))
                          : [];

                        const isInputLocked = lockedInputsSet.has(String(inp._id));
                        const isToggling = togglingInput === String(inp._id);
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
                        result.push(
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
                                  {selectedSection && constantIds.includes(String(inp.sectionId)) && (
                                    <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA', fontFamily: 'Montserrat,sans-serif' }}>
                                      ⚡ Constant
                                    </span>
                                  )}
                                </p>

                                {/* Answer */}
                                <div style={{ fontSize: 13, color: isEmpty ? 'var(--tx-faint)' : 'var(--tx)', wordBreak: 'break-word', marginBottom: 6 }}>
                                  {inp.inputType === 'file'
                                    ? (linkedDocs.length > 0
                                      ? <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        {linkedDocs.map((doc, di) => {
                                          const url = getDownloadUrl(doc);
                                          const name = doc.originalName || doc.filename || 'file';
                                          const type = getFileType(name);
                                          const viewable = type === 'pdf' || type === 'image';
                                          return (
                                            <a key={di} href={url}
                                              target="_blank" rel="noopener noreferrer"
                                              {...(!viewable ? { download: name } : {})}
                                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 7, background: 'var(--g50)', border: '1px solid var(--g200)', color: 'var(--g800)', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                                              <span>{fileIcon(name)}</span>
                                              <span style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--g200)', color: 'var(--g800)', flexShrink: 0 }}>{fileActionLabel(name)}</span>
                                            </a>
                                          );
                                        })}
                                      </div>
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

      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </Layout>
  );
}
