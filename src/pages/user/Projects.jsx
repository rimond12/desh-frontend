import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { LeafBadge } from '../../components/shared/LeafLogo.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

export default function Projects() {
  const axiosSecure = useAxiosSecure();
  const { dbUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosSecure.get('/projects')
      .then(res => setProjects(res.data.projects || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRename = async (id, newTitle) => {
    try {
      const res = await axiosSecure.patch(`/projects/${id}`, { title: newTitle });
      setProjects(prev => prev.map(p => p._id === id ? { ...p, title: res.data.project.title } : p));
      toast.success('Project renamed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename');
      throw err; // re-throw so card can revert
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosSecure.delete(`/projects/${id}`);
      setProjects(prev => prev.filter(p => p._id !== id));
      toast.success('Project deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8 fade-in-up">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>My Projects</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>
            {projects.length} projects
          </p>
        </div>
        <Link to="/projects/new" className="btn-primary-green text-sm">+ New Project</Link>
      </div>

      <div className="relative mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="input-dark w-full pl-4 pr-4 py-3 text-sm max-w-md"
        />
      </div>

      {loading ? (
        <div className="text-center py-20">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <p className="text-4xl mb-3">🌱</p>
          <p className="font-semibold" style={{ color: "var(--tx)" }}>No projects found</p>
          <Link to="/projects/new" className="btn-primary-green mt-4 text-sm inline-flex">+ Start One</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p, i) => (
            <ProjectCard
              key={p._id}
              project={p}
              delay={i * 0.07}
              onRename={handleRename}
              onDelete={handleDelete}
              dbUser={dbUser}
            />
          ))}
          <Link to="/projects/new"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed min-h-48 transition-all hover:border-green-500/40"
            style={{ borderColor: 'var(--border-md)' }}>
            <span className="text-3xl" style={{ color: 'var(--tx-muted)' }}>+</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--tx-muted)' }}>New Project</p>
          </Link>
        </div>
      )}
    </Layout>
  );
}

function ProjectCard({ project: p, delay, onRename, onDelete, dbUser }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(p.title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const isCreator = dbUser && String(p.userId?._id || p.userId) === String(dbUser._id);

  const ringColor = {
    'Green Leaf': '#22C55E', 'Yellow Leaf': '#F8A514',
    'Orange Leaf': '#E2670C', 'Brown Leaf': '#97542A',
  }[p.leafLevel] || '#22C55E';

  const startEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditTitle(p.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const cancelEdit = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditTitle(p.title);
    setEditing(false);
  };

  const saveEdit = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === p.title) { setEditing(false); return; }
    setSaving(true);
    try {
      await onRename(p._id, trimmed);
      setEditing(false);
    } catch {
      setEditTitle(p.title);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit(e);
    if (e.key === 'Escape') cancelEdit(e);
  };

  const handleDeleteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Delete Draft Project?',
      text: `"${p.title}" will be permanently deleted. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      focusCancel: true,
      reverseButtons: true,
      customClass: {
        popup: 'swal-desh-popup',
      },
    });
    if (result.isConfirmed) {
      await onDelete(p._id);
    }
  };

  return (
    <div
      className="glass-card p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all cursor-pointer fade-in-up"
      style={{ animationDelay: `${delay}s` }}
      onClick={() => navigate(`/projects/${p._id}`)}
    >
      {/* Title row */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-3">
          {editing ? (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                ref={inputRef}
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input-dark text-sm font-bold flex-1 min-w-0 px-2 py-1"
                style={{ fontFamily: 'Montserrat, sans-serif', minWidth: 0 }}
                maxLength={120}
                disabled={saving}
              />
              <button
                onClick={saveEdit}
                disabled={saving || !editTitle.trim()}
                style={{
                  background: 'rgba(52,201,97,0.18)', border: '1px solid rgba(52,201,97,0.4)',
                  color: '#5DD882', borderRadius: 8, padding: '3px 10px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  opacity: saving || !editTitle.trim() ? 0.5 : 1,
                }}
              >
                {saving ? '...' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: '3px 10px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/title">
              <p className="font-bold text-base truncate" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {p.title}
              </p>
              {isCreator && (
                <button
                  onClick={startEdit}
                  title="Rename project"
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '2px 4px',
                    borderRadius: 6, flexShrink: 0, lineHeight: 1,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                >
                  ✎
                </button>
              )}
            </div>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--tx-muted)' }}>
            Updated {new Date(p.updatedAt).toLocaleDateString()}
          </p>
        </div>
        {p.leafLevel && <LeafBadge level={p.leafLevel} />}
      </div>

      {/* Score ring + status */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 64 64" width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="32" cy="32" r="26" fill="none" stroke={ringColor} strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - (p.scorePercent || 0) / 100)}`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold">{p.scorePercent || 0}%</span>
          </div>
        </div>
        <div className="flex-1">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${p.status === 'submitted' ? 'status-completed' : 'status-pending'}`}>
            {p.status === 'submitted' ? '✓ Submitted' : '◌ Draft'}
          </span>
        </div>
      </div>

      {/* Delete button — draft only */}
      {isCreator && p.status === 'draft' && (
        <div onClick={e => e.stopPropagation()}>
          <button onClick={handleDeleteClick} style={{
            background: 'transparent', border: '1px solid rgba(239,68,68,0.2)',
            color: 'rgba(252,165,165,0.5)', borderRadius: 8, padding: '5px 12px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              e.currentTarget.style.color = 'rgba(252,165,165,0.85)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(252,165,165,0.5)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
            }}
          >
            Delete Draft
          </button>
        </div>
      )}
    </div>
  );
}
