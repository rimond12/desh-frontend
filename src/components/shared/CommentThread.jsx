import { useState, useCallback } from 'react';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';

// Role display config
const ROLE_CFG = {
  reviewer: { label: 'Reviewer', bg: '#EDE9FE', color: '#5B21B6', border: '#C4B5FD' },
  admin:    { label: 'Admin',    bg: '#D6F5E3', color: '#145C28', border: '#A8EFC0' },
  user:     { label: 'User',     bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Single Comment Row ────────────────────────────────────────────
function CommentItem({ comment, currentUserId, currentRole, onReply, onEdit, onDelete, depth = 0 }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const cfg = ROLE_CFG[comment.role] || ROLE_CFG.user;
  const isOwn   = String(comment.userId) === String(currentUserId);
  const isAdmin = currentRole === 'admin';

  const submitEdit = () => {
    if (!editText.trim()) return;
    onEdit(comment._id, editText.trim());
    setEditing(false);
  };

  return (
    <div style={{
      marginLeft: depth > 0 ? 20 : 0,
      borderLeft: depth > 0 ? '2px solid var(--g200)' : 'none',
      paddingLeft: depth > 0 ? 12 : 0,
      marginBottom: 8,
    }}>
      <div style={{
        padding: '10px 12px', borderRadius: 10,
        background: depth > 0 ? '#FAFFFE' : '#F8FBF9',
        border: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.05em',
          }}>{cfg.label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>
            {comment.authorName || 'Anonymous'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--tx-faint)', marginLeft: 'auto' }}>
            {timeAgo(comment.createdAt)}
          </span>
        </div>

        {/* Body */}
        {editing ? (
          <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={2}
              autoFocus
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 8,
                border: '1.5px solid var(--g400)', outline: 'none', resize: 'vertical',
                fontSize: 13, fontFamily: 'Nunito,sans-serif',
              }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={submitEdit} style={{
                padding: '4px 12px', borderRadius: 7, border: 'none', fontSize: 12,
                background: 'var(--g600)', color: '#fff', fontWeight: 700, cursor: 'pointer',
              }}>Save</button>
              <button onClick={() => { setEditing(false); setEditText(comment.text); }} style={{
                padding: '4px 12px', borderRadius: 7, border: '1px solid var(--border)',
                fontSize: 12, background: '#fff', fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--tx)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {comment.text}
          </p>
        )}

        {/* Actions */}
        {!editing && (
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            {onReply && (
              <button onClick={() => onReply(comment._id)} style={{
                fontSize: 11, fontWeight: 700, color: 'var(--tx-muted)', background: 'none',
                border: 'none', cursor: 'pointer', padding: '1px 0',
              }}>↩ Reply</button>
            )}
            {(isOwn || isAdmin) && (
              <button onClick={() => setEditing(true)} style={{
                fontSize: 11, fontWeight: 700, color: 'var(--tx-faint)', background: 'none',
                border: 'none', cursor: 'pointer', padding: '1px 0',
              }}>✎ Edit</button>
            )}
            {isAdmin && (
              <button onClick={() => onDelete(comment._id)} style={{
                fontSize: 11, fontWeight: 700, color: '#EF4444', background: 'none',
                border: 'none', cursor: 'pointer', padding: '1px 0',
              }}>✕ Delete</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CommentThread ─────────────────────────────────────────────────
// Props:
//   projectId      - string
//   inputId        - string
//   currentUserId  - string  (dbUser._id)
//   currentRole    - 'user' | 'admin' | 'reviewer'
//   isLocked       - bool   (true when project.status === 'submitted' — enables user comments)
//   projectOwnerId - string (project.userId._id or project.userId)
//   initialCount   - number (pre-loaded comment count for badge display)
export default function CommentThread({
  projectId, inputId, currentUserId, currentRole, isLocked,
  projectOwnerId, initialCount = 0,
}) {
  const ax = useAxiosSecure();
  const [open, setOpen]         = useState(false);
  const [comments, setComments] = useState([]);
  const [loaded, setLoaded]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [newText, setNewText]   = useState('');
  const [sending, setSending]   = useState(false);
  const [replyTo, setReplyTo]   = useState(null); // parentId

  // Reviewers/admins can always comment; users can comment once their project is submitted
  const canComment =
    currentRole === 'reviewer' ||
    currentRole === 'admin' ||
    (currentRole === 'user' && isLocked && String(projectOwnerId) === String(currentUserId));

  const loadComments = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const r = await ax.get(`/comments?projectId=${projectId}&inputId=${inputId}`);
      setComments(r.data.comments || []);
      setLoaded(true);
    } catch { toast.error('Failed to load comments'); }
    finally { setLoading(false); }
  }, [projectId, inputId, loaded]);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!loaded) loadComments();
  };

  const submitComment = async (parentId = null) => {
    const text = newText.trim();
    if (!text) return;
    setSending(true);
    try {
      const r = await ax.post('/comments', { projectId, inputId, text, parentId });
      setComments(c => [...c, r.data.comment]);
      setNewText('');
      setReplyTo(null);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to post comment'); }
    finally { setSending(false); }
  };

  const handleEdit = async (commentId, text) => {
    try {
      const r = await ax.put(`/comments/${commentId}`, { text });
      setComments(c => c.map(cm => cm._id === commentId ? r.data.comment : cm));
    } catch { toast.error('Failed to edit comment'); }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await ax.delete(`/comments/${commentId}`);
      // Remove comment and its replies
      setComments(c => c.filter(cm => cm._id !== commentId && String(cm.parentId) !== commentId));
    } catch { toast.error('Failed to delete comment'); }
  };

  // Build tree: roots + replies grouped by parentId
  const roots   = comments.filter(c => !c.parentId);
  const replies = (parentId) => comments.filter(c => String(c.parentId) === String(parentId));

  // Use loaded count once available; fall back to pre-loaded initialCount
  const count = loaded ? comments.length : initialCount;
  const hasComments = count > 0;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Toggle button */}
      <button onClick={handleOpen} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 700,
        color: open ? 'var(--g700)' : hasComments ? 'var(--g700)' : 'var(--tx-faint)',
        background: open ? 'var(--g50)' : hasComments ? 'var(--g50)' : 'transparent',
        border: `1px solid ${open || hasComments ? 'var(--g200)' : 'var(--border)'}`,
        borderRadius: 7, padding: '3px 10px', cursor: 'pointer', transition: 'all 0.15s',
      }}>
        💬 {hasComments ? `${count} Comment${count !== 1 ? 's' : ''}` : 'Add Comment'}
        {hasComments && <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>}
      </button>

      {open && (
        <div style={{
          marginTop: 8, padding: '12px 14px', borderRadius: 12,
          background: '#F7FBF8', border: '1px solid var(--g100)',
        }}>
          {/* Loading */}
          {loading && (
            <p style={{ fontSize: 12, color: 'var(--tx-faint)', margin: '0 0 8px' }}>Loading…</p>
          )}

          {/* Comment list */}
          {!loading && roots.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--tx-faint)', margin: '0 0 8px' }}>
              No comments yet.
            </p>
          )}
          {roots.map(cm => (
            <div key={cm._id}>
              <CommentItem
                comment={cm}
                currentUserId={currentUserId}
                currentRole={currentRole}
                onReply={canComment ? (pid) => { setReplyTo(pid); } : null}
                onEdit={handleEdit}
                onDelete={handleDelete}
                depth={0}
              />
              {/* Replies */}
              {replies(cm._id).map(reply => (
                <CommentItem
                  key={reply._id}
                  comment={reply}
                  currentUserId={currentUserId}
                  currentRole={currentRole}
                  onReply={null}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  depth={1}
                />
              ))}
              {/* Reply input for this comment */}
              {replyTo === cm._id && (
                <div style={{ marginLeft: 20, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <textarea
                      value={newText}
                      onChange={e => setNewText(e.target.value)}
                      rows={2}
                      autoFocus
                      placeholder={`Reply to ${cm.authorName}…`}
                      style={{
                        flex: 1, padding: '7px 10px', borderRadius: 8,
                        border: '1.5px solid var(--g300)', outline: 'none', resize: 'vertical',
                        fontSize: 13, fontFamily: 'Nunito,sans-serif',
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button onClick={() => submitComment(cm._id)} disabled={sending} style={{
                        padding: '6px 12px', borderRadius: 7, border: 'none', fontSize: 12,
                        background: 'var(--g600)', color: '#fff', fontWeight: 700, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}>↩ Send</button>
                      <button onClick={() => { setReplyTo(null); setNewText(''); }} style={{
                        padding: '5px 12px', borderRadius: 7, border: '1px solid var(--border)',
                        fontSize: 12, background: '#fff', fontWeight: 600, cursor: 'pointer',
                      }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* New root comment input */}
          {canComment && !replyTo && (
            <div style={{ display: 'flex', gap: 8, marginTop: roots.length > 0 ? 10 : 0, alignItems: 'flex-start' }}>
              <textarea
                value={newText}
                onChange={e => setNewText(e.target.value)}
                rows={2}
                placeholder={currentRole === 'reviewer' ? 'Add a review comment…' : 'Add a comment…'}
                style={{
                  flex: 1, padding: '8px 11px', borderRadius: 9,
                  border: '1.5px solid var(--border-md)', outline: 'none', resize: 'vertical',
                  fontSize: 13, fontFamily: 'Nunito,sans-serif', background: '#fff',
                }}
              />
              <button onClick={() => submitComment(null)} disabled={sending || !newText.trim()} style={{
                padding: '8px 14px', borderRadius: 9, border: 'none',
                background: 'linear-gradient(135deg,var(--g700),var(--g500))',
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                whiteSpace: 'nowrap', opacity: !newText.trim() ? 0.5 : 1,
              }}>
                {sending ? '…' : '✓ Post'}
              </button>
            </div>
          )}

          {/* User pre-submit message */}
          {currentRole === 'user' && !isLocked && (
            <p style={{ fontSize: 11, color: 'var(--tx-faint)', marginTop: 6, fontStyle: 'italic' }}>
              Comments will be available after you submit your project for review.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
