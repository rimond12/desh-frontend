import { useState, useCallback } from 'react';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import toast from 'react-hot-toast';

// Role display config
const ROLE_CFG = {
  reviewer:      { label: 'Reviewer', bg: '#EDE9FE', color: '#5B21B6', border: '#C4B5FD' },
  desh_reviewer: { label: 'Reviewer', bg: '#EDE9FE', color: '#5B21B6', border: '#C4B5FD' },
  desh_assessor: { label: 'Assessor', bg: 'rgba(59,130,246,0.12)', color: '#2563EB', border: 'rgba(59,130,246,0.25)' },
  desh_manager:  { label: 'Manager',  bg: 'rgba(249,115,22,0.12)', color: '#C2410C', border: 'rgba(249,115,22,0.25)' },
  admin:         { label: 'Admin',    bg: '#D6F5E3', color: '#145C28', border: '#A8EFC0' },
  user:          { label: 'DESH Professional',     bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  owner:         { label: 'Owner',    bg: '#FEF9C3', color: '#92400E', border: '#FDE68A' },
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
function CommentItem({ comment, currentUserId, currentRole, onReply, onEdit, onDelete, onDownloadAttachment, depth = 0, isLocked = false }) {
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
          <div>
            <p style={{ fontSize: 13, color: 'var(--tx)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {comment.text}
            </p>
            {comment.isPrivateStaff && (
              <span style={{
                display: 'inline-flex', marginTop: 4, padding: '1px 6px', borderRadius: 4,
                background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA',
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              }}>
                🔒 Staff Private
              </span>
            )}
            {comment.attachment && (
              <div style={{ marginTop: 6 }}>
                <button
                  onClick={() => onDownloadAttachment(comment.attachment.filename, comment.attachment.originalName)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    background: 'var(--bg-soft)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: 'var(--g700)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📎 {comment.attachment.originalName} (Download)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {!editing && (
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            {onReply && !isLocked && (
              <button onClick={() => onReply(comment._id)} style={{
                fontSize: 11, fontWeight: 700, color: 'var(--tx-muted)', background: 'none',
                border: 'none', cursor: 'pointer', padding: '1px 0',
              }}>↩ Reply</button>
            )}
            {(isOwn || isAdmin) && !isLocked && (
              <button onClick={() => setEditing(true)} style={{
                fontSize: 11, fontWeight: 700, color: 'var(--tx-faint)', background: 'none',
                border: 'none', cursor: 'pointer', padding: '1px 0',
              }}>✎ Edit</button>
            )}
            {(isOwn || isAdmin) && !isLocked && (
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
export default function CommentThread({
  projectId, inputId, currentUserId, currentRole, isLocked,
  projectOwnerId, initialCount = 0, disableComments = false,
  isCollaborator = false,
}) {
  const ax = useAxiosSecure();
  const [open, setOpen]         = useState(false);
  const [comments, setComments] = useState([]);
  const [loaded, setLoaded]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [newText, setNewText]   = useState('');
  const [sending, setSending]   = useState(false);
  const [replyTo, setReplyTo]   = useState(null); // parentId
  const [isPrivateStaff, setIsPrivateStaff] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);

  // Mentions Auto-complete state
  const [mentionableUsers, setMentionableUsers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionTriggerIdx, setMentionTriggerIdx] = useState(0);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);

  const canComment =
    !disableComments &&
    (currentRole === 'reviewer' ||
     currentRole === 'desh_reviewer' ||
     currentRole === 'desh_assessor' ||
     currentRole === 'desh_manager' ||
     currentRole === 'admin' ||
     (currentRole === 'user' && (String(projectOwnerId) === String(currentUserId) || isCollaborator)));

  const isStaff = ['admin', 'desh_manager', 'desh_reviewer', 'desh_assessor', 'reviewer'].includes(currentRole);

  const loadComments = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const r = await ax.get(`/comments?projectId=${projectId}&inputId=${inputId}`);
      setComments(r.data.comments || []);
      setLoaded(true);
    } catch { toast.error('Failed to load comments'); }
    finally { setLoading(false); }
  }, [projectId, inputId, loaded, ax]);

  const fetchMentionableUsers = async () => {
    try {
      const res = await ax.get(`/comments/project/${projectId}/mentionable-users`);
      setMentionableUsers(res.data.users || []);
    } catch (e) {
      console.error("Failed to load mentionable users", e);
    }
  };

  const handleOpen = () => {
    setOpen(o => !o);
    if (!loaded) {
      loadComments();
      fetchMentionableUsers();
    }
  };

  const downloadAttachment = async (filename, originalName) => {
    try {
      const response = await ax.get(`/comments/download/${filename}`, {
        responseType: 'blob',
        params: { originalName }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      toast.error('Failed to download attachment');
    }
  };

  const submitComment = async (parentId = null) => {
    const text = newText.trim();
    if (!text) return;
    setSending(true);
    try {
      const parent = parentId ? comments.find(c => c._id === parentId) : null;
      const sendPrivateStaff = parent ? !!parent.isPrivateStaff : isPrivateStaff;

      let resComment;
      if (attachmentFile) {
        const fd = new FormData();
        fd.append('projectId', projectId);
        fd.append('inputId', inputId);
        fd.append('text', text);
        if (parentId) fd.append('parentId', parentId);
        fd.append('isPrivateStaff', sendPrivateStaff);
        fd.append('attachment', attachmentFile);

        const r = await ax.post('/comments', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        resComment = r.data.comment;
      } else {
        const r = await ax.post('/comments', { projectId, inputId, text, parentId, isPrivateStaff: sendPrivateStaff });
        resComment = r.data.comment;
      }

      setComments(c => [...c, resComment]);
      setNewText('');
      setReplyTo(null);
      setIsPrivateStaff(false);
      setAttachmentFile(null);
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
      setComments(c => c.filter(cm => cm._id !== commentId && String(cm.parentId) !== commentId));
    } catch { toast.error('Failed to delete comment'); }
  };

  // Autocomplete logic
  const handleTextareaChange = (val) => {
    setNewText(val);

    const words = val.split(/[\s\n]/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      const query = lastWord.slice(1);
      const triggerIdx = val.length - lastWord.length;
      setMentionQuery(query);
      setMentionTriggerIdx(triggerIdx);
      setShowMentions(true);
      setActiveMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user) => {
    const textBefore = newText.slice(0, mentionTriggerIdx);
    const updatedText = `${textBefore}@${user.username} `;
    setNewText(updatedText);
    setShowMentions(false);
  };

  const handleKeyDown = (e) => {
    if (showMentions && filteredMentionables.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveMentionIndex(prev => (prev + 1) % filteredMentionables.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveMentionIndex(prev => (prev - 1 + filteredMentionables.length) % filteredMentionables.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredMentionables[activeMentionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
      }
    }
  };

  const filteredMentionables = mentionableUsers.filter(u =>
    u.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    u.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const roots   = comments.filter(c => !c.parentId);
  const replies = (parentId) => comments.filter(c => String(c.parentId) === String(parentId));

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
                onReply={canComment && !isLocked ? (pid) => { setReplyTo(pid); } : null}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDownloadAttachment={downloadAttachment}
                depth={0}
                isLocked={isLocked}
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
                  onDownloadAttachment={downloadAttachment}
                  depth={1}
                  isLocked={isLocked}
                />
              ))}
              {/* Reply input for this comment */}
              {replyTo === cm._id && (
                <div style={{ marginLeft: 20, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', position: 'relative' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <textarea
                        value={newText}
                        onChange={e => handleTextareaChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        autoFocus
                        disabled={isLocked}
                        placeholder={isLocked ? '🔒 Locked' : `Reply to ${cm.authorName}…`}
                        style={{
                          width: '100%', padding: '7px 10px', borderRadius: 8,
                          border: '1.5px solid var(--g300)', outline: 'none', resize: 'vertical',
                          fontSize: 13, fontFamily: 'Nunito,sans-serif',
                          background: isLocked ? '#F3F4F6' : '#fff',
                        }}
                      />
                      {showMentions && filteredMentionables.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          background: '#153E24',
                          border: '1.5px solid var(--g300)',
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 50,
                          width: '100%',
                          maxWidth: 260,
                          maxHeight: 140,
                          overflowY: 'auto',
                          bottom: '100%',
                          marginBottom: 4,
                        }}>
                          {filteredMentionables.map((user, idx) => (
                            <div
                              key={user.id}
                              onClick={() => insertMention(user)}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                background: activeMentionIndex === idx ? 'rgba(52,201,97,0.15)' : 'transparent',
                                color: '#fff',
                                fontSize: 12,
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                              onMouseEnter={() => setActiveMentionIndex(idx)}
                            >
                              <span>@{user.username}</span>
                              <span style={{ fontSize: 10, opacity: 0.6 }}>{user.displayName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 6 }}>
                        <label style={{ cursor: isLocked ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--g700)', fontWeight: 700 }}>
                          📎 Attach file
                          <input
                            type="file"
                            onChange={e => !isLocked && setAttachmentFile(e.target.files[0])}
                            disabled={isLocked}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {attachmentFile && (
                          <span style={{ fontSize: 10, background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {attachmentFile.name}
                            <button type="button" onClick={() => setAttachmentFile(null)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button onClick={() => submitComment(cm._id)} disabled={sending || isLocked} style={{
                        padding: '6px 12px', borderRadius: 7, border: 'none', fontSize: 12,
                        background: isLocked ? '#94A3B8' : 'var(--g600)', color: '#fff', fontWeight: 700, cursor: isLocked ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}>↩ Send</button>
                      <button onClick={() => { setReplyTo(null); setNewText(''); setAttachmentFile(null); }} style={{
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
            <div style={{ display: 'flex', gap: 8, marginTop: roots.length > 0 ? 10 : 0, alignItems: 'flex-start', position: 'relative' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  value={newText}
                  onChange={e => handleTextareaChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  disabled={isLocked}
                  placeholder={isLocked ? '🔒 Locked' : (currentRole === 'reviewer' || currentRole === 'desh_reviewer' ? 'Add a review comment…' : 'Add a comment…')}
                  style={{
                    width: '100%', padding: '8px 11px', borderRadius: 9,
                    border: '1.5px solid var(--border-md)', outline: 'none', resize: 'vertical',
                    fontSize: 13, fontFamily: 'Nunito,sans-serif', background: isLocked ? '#F3F4F6' : '#fff',
                    cursor: isLocked ? 'not-allowed' : 'text',
                  }}
                />
                {showMentions && filteredMentionables.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    background: '#153E24',
                    border: '1.5px solid var(--g300)',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 50,
                    width: '100%',
                    maxWidth: 260,
                    maxHeight: 140,
                    overflowY: 'auto',
                    bottom: '100%',
                    marginBottom: 4,
                  }}>
                    {filteredMentionables.map((user, idx) => (
                      <div
                        key={user.id}
                        onClick={() => insertMention(user)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: activeMentionIndex === idx ? 'rgba(52,201,97,0.15)' : 'transparent',
                          color: '#fff',
                          fontSize: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                        onMouseEnter={() => setActiveMentionIndex(idx)}
                      >
                        <span>@{user.username}</span>
                        <span style={{ fontSize: 10, opacity: 0.6 }}>{user.displayName}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 6 }}>
                  {isStaff && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--tx-muted)', cursor: isLocked ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={isPrivateStaff}
                        disabled={isLocked}
                        onChange={e => setIsPrivateStaff(e.target.checked)}
                        style={{ accentColor: 'var(--g600)', cursor: isLocked ? 'not-allowed' : 'pointer' }}
                      />
                      Private to Staff
                    </label>
                  )}
                  <label style={{ cursor: isLocked ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--g700)', fontWeight: 700 }}>
                    📎 Attach file
                    <input
                      type="file"
                      disabled={isLocked}
                      onChange={e => setAttachmentFile(e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {attachmentFile && (
                    <span style={{ fontSize: 10, background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {attachmentFile.name}
                      <button type="button" onClick={() => setAttachmentFile(null)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => submitComment(null)} disabled={sending || !newText.trim() || isLocked} style={{
                padding: '8px 14px', borderRadius: 9, border: 'none',
                background: isLocked ? '#94A3B8' : 'linear-gradient(135deg,var(--g700),var(--g500))',
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: isLocked ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap', opacity: !newText.trim() || isLocked ? 0.5 : 1,
              }}>
                {sending ? '…' : '✓ Post'}
              </button>
            </div>
          )}

          {/* Message when user is not the project owner */}
          {currentRole === 'user' && String(projectOwnerId) !== String(currentUserId) && (
            <p style={{ fontSize: 11, color: 'var(--tx-faint)', marginTop: 6, fontStyle: 'italic' }}>
              You can only comment on your own project.
            </p>
          )}


        </div>
      )}
    </div>
  );
}
