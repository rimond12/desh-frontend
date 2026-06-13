import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

/* ── small icon components ── */
function PdfBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
            📄 PDF
        </span>
    );
}
function VideoBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}>
            🎥 Video
        </span>
    );
}

/* ── StatCard ── */
function StatCard({ icon, label, value, accent }) {
    return (
        <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                style={{ background: accent + '15', border: `1px solid ${accent}25` }}>
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold leading-none" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--tx)' }}>{value}</p>
                <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--tx-muted)' }}>{label}</p>
            </div>
        </div>
    );
}

/* ── DropZone ── */
function DropZone({ accept, onChange, currentFileName, label }) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef();

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onChange(file);
    };

    return (
        <div
            onClick={() => inputRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className="w-full rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 py-8 text-white"
            style={{
                border: `2px dashed ${dragging ? 'var(--g500)' : 'rgba(255,255,255,0.15)'}`,
                background: dragging ? 'rgba(52,201,97,0.15)' : 'rgba(0,0,0,0.25)',
            }}
        >
            <span style={{ fontSize: 28 }}>{currentFileName ? '📎' : '📂'}</span>
            {currentFileName ? (
                <div className="text-center">
                    <p className="text-xs font-semibold text-[#5DD882]">{currentFileName}</p>
                    <p className="text-[11px] mt-0.5 text-white/40">Click or drop to replace</p>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-sm font-semibold text-white/95">{label}</p>
                    <p className="text-xs mt-0.5 text-white/40">Click to browse or drag and drop here</p>
                </div>
            )}
            <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) onChange(e.target.files[0]); }} />
        </div>
    );
}

/* ──────────────────────────────────────── MAIN COMPONENT ──────────────────────────────────────── */
export default function Resources() {
    const axiosSecure = useAxiosSecure();
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null); // id of resource pending delete

    const [form, setForm] = useState({
        title: '',
        type: 'pdf',
        description: '',
        sourceType: 'upload',
        linkUrl: '',
    });
    const [resourceFile, setResourceFile] = useState(null);
    const [filePreviewName, setFilePreviewName] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const fetchResources = () => {
        setLoading(true);
        axiosSecure.get('/resources')
            .then(res => setResources(res.data.resources || []))
            .catch(() => toast.error('Failed to load resources'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchResources(); }, []);

    const openNew = () => {
        setEditItem(null);
        setForm({ title: '', type: 'pdf', description: '', sourceType: 'upload', linkUrl: '' });
        setResourceFile(null);
        setFilePreviewName('');
        setShowForm(true);
    };

    const openEdit = (res) => {
        setEditItem(res);
        setForm({
            title: res.title,
            type: res.type,
            description: res.description || '',
            sourceType: res.fileUrl ? 'upload' : 'link',
            linkUrl: res.linkUrl || '',
        });
        setResourceFile(null);
        setFilePreviewName(res.fileUrl ? res.fileUrl.split('/').pop() : '');
        setShowForm(true);
    };

    const closeForm = () => { setShowForm(false); setEditItem(null); };

    const save = async () => {
        if (!form.title.trim()) return toast.error('Title is required');
        if (form.sourceType === 'link' && !form.linkUrl.trim()) return toast.error('External link URL is required');
        if (form.sourceType === 'upload' && !resourceFile && !editItem?.fileUrl) return toast.error('Please upload a file');

        try {
            setSaving(true);
            const fd = new FormData();
            fd.append('title', form.title.trim());
            fd.append('type', form.type);
            fd.append('description', form.description.trim());
            fd.append('linkUrl', form.sourceType === 'link' ? form.linkUrl.trim() : '');
            if (form.sourceType === 'upload' && resourceFile) fd.append('file', resourceFile);
            if (editItem && form.sourceType === 'link' && editItem.fileUrl) fd.append('clearFile', 'true');

            if (editItem) {
                await axiosSecure.put(`/resources/${editItem._id}`, fd);
                toast.success('Resource updated!');
            } else {
                await axiosSecure.post('/resources', fd);
                toast.success('Resource added!');
            }
            closeForm();
            fetchResources();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save resource');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;
        try {
            setDeleting(true);
            await axiosSecure.delete(`/resources/${deleteConfirm}`);
            toast.success('Resource deleted');
            setDeleteConfirm(null);
            fetchResources();
        } catch {
            toast.error('Failed to delete resource');
        } finally {
            setDeleting(false);
        }
    };

    const pdfCount = resources.filter(r => r.type === 'pdf').length;
    const videoCount = resources.filter(r => r.type === 'video').length;

    const displayed = resources
        .filter(r => filter === 'all' || r.type === filter)
        .filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()) || (r.description || '').toLowerCase().includes(search.toLowerCase()));

    const getFileLink = (res) => {
        const raw = res.fileUrl ? `${BASE_URL}${res.fileUrl}` : res.linkUrl;
        if (raw && !/^https?:\/\//i.test(raw)) return `https://${raw}`;
        return raw;
    };

    return (
        <Layout isAdmin>

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Eco-Park Resources
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>
                        Manage resources that appear in the User Dashboard · "Useful Resources for Urban Eco-Park Design"
                    </p>
                </div>
                <button onClick={openNew} className="btn-primary-green text-sm flex items-center gap-2 flex-shrink-0">
                    <span className="text-base leading-none">+</span> Add Resource
                </button>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-3 gap-4 mb-8 fade-in-up">
                <StatCard icon="📚" label="Total Resources" value={resources.length} accent="var(--g600)" />
                <StatCard icon="📄" label="PDF Documents" value={pdfCount} accent="#1D4ED8" />
                <StatCard icon="🎥" label="Video Resources" value={videoCount} accent="#EA580C" />
            </div>

            {/* ── Filter + Search bar ── */}
            {!loading && resources.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3 mb-6 fade-in-up">
                    {/* Filter pills */}
                    <div className="flex gap-2 flex-wrap">
                        {[{ k: 'all', l: 'All' }, { k: 'pdf', l: '📄 PDF' }, { k: 'video', l: '🎥 Video' }].map(f => (
                            <button key={f.k} onClick={() => setFilter(f.k)}
                                className="text-xs font-semibold px-4 py-2 rounded-full transition-all"
                                style={{
                                    background: filter === f.k ? 'var(--g600)' : 'var(--bg-soft)',
                                    color: filter === f.k ? '#fff' : 'var(--tx-muted)',
                                    border: `1.5px solid ${filter === f.k ? 'var(--g600)' : 'var(--border)'}`,
                                }}>
                                {f.l}
                            </button>
                        ))}
                    </div>
                    {/* Search */}
                    <div className="flex-1 sm:max-w-xs">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search resources…"
                            className="input-dark w-full px-4 py-2 text-sm"
                        />
                    </div>
                </div>
            )}

            {/* ── Delete confirmation modal ── */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-sm p-6 fade-in-up text-center border border-white/10" style={{ background: 'rgba(20, 20, 20, 0.95)', boxShadow: '0 20px 45px rgba(0,0,0,0.6)' }}>
                        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            🗑️
                        </div>
                        <h3 className="font-bold text-lg mb-1 text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Delete Resource?</h3>
                        <p className="text-sm mb-6 text-white/60">
                            This will permanently remove the resource and its file from the server. This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:bg-red-600"
                                style={{ background: '#EF4444', opacity: deleting ? 0.7 : 1 }}>
                                {deleting ? 'Deleting…' : 'Yes, Delete'}
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-white/5 hover:text-white"
                                style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add / Edit Modal ── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-lg fade-in-up border border-white/10 overflow-y-auto" style={{ background: 'rgba(20, 20, 20, 0.95)', boxShadow: '0 20px 45px rgba(0,0,0,0.6)', maxHeight: '92vh' }}>

                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                                    style={{ background: 'rgba(52,201,97,0.15)', color: '#34c961' }}>
                                    {editItem ? '✎' : '+'}
                                </div>
                                <h2 className="font-bold text-lg text-[#34C961]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    {editItem ? 'Edit Resource' : 'Add New Resource'}
                                </h2>
                            </div>
                            <button onClick={closeForm} className="text-white/40 hover:text-white transition-colors text-lg">✕</button>
                        </div>

                        <div className="p-6 space-y-5">

                            {/* Title */}
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>
                                    Resource Title *
                                </label>
                                <input
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Wetland Buffer Strip Planting Guidelines"
                                    className="w-full px-4 py-3 text-sm rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Type selector — visual cards */}
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>
                                    Resource Type *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: 'pdf', icon: '📄', label: 'PDF Document', color: '#5DD882', bg: 'rgba(52,201,97,0.15)', border: 'rgba(52,201,97,0.3)' },
                                        { value: 'video', icon: '🎥', label: 'Video Tutorial', color: '#F8A514', bg: 'rgba(248,165,20,0.15)', border: 'rgba(248,165,20,0.3)' },
                                    ].map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setForm({ ...form, type: t.value })}
                                            className="flex items-center gap-3 p-3 rounded-xl text-left transition-all border"
                                            style={{
                                                background: form.type === t.value ? t.bg : 'rgba(0,0,0,0.25)',
                                                borderColor: form.type === t.value ? t.border : 'rgba(255,255,255,0.1)',
                                                color: form.type === t.value ? t.color : 'rgba(255,255,255,0.6)',
                                            }}
                                        >
                                            <span className="text-xl">{t.icon}</span>
                                            <span className="text-sm font-semibold">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>
                                    Short Description
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="Brief explanation of what this resource covers…"
                                    className="w-full px-4 py-3 text-sm rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all resize-none"
                                    rows={3}
                                />
                            </div>

                            {/* Source type toggle */}
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>
                                    Resource Source
                                </label>
                                <div className="flex rounded-xl overflow-hidden border border-white/10 bg-black/30">
                                    {[{ v: 'upload', l: '📂 Upload File' }, { v: 'link', l: '🔗 External Link' }].map(s => (
                                        <button
                                            key={s.v}
                                            type="button"
                                            onClick={() => setForm({ ...form, sourceType: s.v })}
                                            className="flex-1 py-2.5 text-sm font-semibold transition-all"
                                            style={{
                                                background: form.sourceType === s.v ? 'var(--g600)' : 'transparent',
                                                color: form.sourceType === s.v ? '#fff' : 'rgba(255,255,255,0.6)',
                                            }}
                                        >
                                            {s.l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Conditional: file upload or link */}
                            {form.sourceType === 'upload' ? (
                                <div>
                                    <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>
                                        {editItem?.fileUrl ? 'Replace File (optional)' : 'Upload File *'}
                                    </label>
                                    <div className="rounded-xl overflow-hidden border border-white/10 p-1 bg-black/20">
                                        <DropZone
                                            accept={form.type === 'pdf' ? '.pdf' : 'video/*'}
                                            onChange={f => { setResourceFile(f); setFilePreviewName(f.name); }}
                                            currentFileName={filePreviewName || null}
                                            label={`Drop your ${form.type === 'pdf' ? 'PDF' : 'video'} file here`}
                                        />
                                    </div>
                                    {editItem?.fileUrl && !resourceFile && (
                                        <p className="text-[11px] mt-2 text-white/40">
                                            Current: <span className="text-[#34c961]">{editItem.fileUrl.split('/').pop()}</span>
                                            {' · '}Leave blank to keep existing file.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>
                                        External URL *
                                    </label>
                                    <input
                                        value={form.linkUrl}
                                        onChange={e => setForm({ ...form, linkUrl: e.target.value })}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        className="w-full px-4 py-3 text-sm rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                                    />
                                </div>
                            )}

                            {/* Footer buttons */}
                            <div className="flex gap-3 pt-3 border-t border-white/5 mt-6">
                                <button
                                    onClick={save}
                                    disabled={saving}
                                    className="btn-primary-green flex-1 justify-center text-sm py-3"
                                    style={{ opacity: saving ? 0.7 : 1 }}
                                >
                                    {saving ? 'Saving…' : (editItem ? '✓ Save Changes' : '+ Add Resource')}
                                </button>
                                <button
                                    onClick={closeForm}
                                    className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-white/5 hover:text-white"
                                    style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Resource list ── */}
            {loading ? (
                <div className="text-center py-20">
                    <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        border: '3px solid var(--g100)', borderTopColor: 'var(--g600)',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 14px'
                    }} />
                    <p style={{ color: 'var(--tx-muted)', fontSize: 14 }}>Loading resources…</p>
                </div>
            ) : resources.length === 0 ? (
                <div className="glass-card p-16 text-center max-w-xl mx-auto my-6">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
                        style={{ background: 'var(--g100)' }}>
                        📚
                    </div>
                    <p className="font-bold text-lg mb-2" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--tx)' }}>
                        No resources yet
                    </p>
                    <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--tx-muted)' }}>
                        Add PDF documents and video links here. They will instantly appear in the User Dashboard "Useful Resources for Urban Eco-Park Design" section.
                    </p>
                    <button onClick={openNew} className="btn-primary-green text-sm inline-flex">
                        + Add First Resource
                    </button>
                </div>
            ) : displayed.length === 0 ? (
                <div className="glass-card p-10 text-center my-4">
                    <p style={{ fontSize: 24, marginBottom: 8 }}>🔍</p>
                    <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>No results for your search</p>
                    <button onClick={() => { setSearch(''); setFilter('all'); }}
                        className="text-xs mt-3 underline" style={{ color: 'var(--g500)' }}>
                        Clear filters
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 fade-in-up">
                    {displayed.map(res => {
                        const isPdf = res.type === 'pdf';
                        const link = getFileLink(res);

                        return (
                            <div
                                key={res._id}
                                className="flex flex-col overflow-hidden"
                                style={{
                                    background: 'var(--bg-card, #fff)',
                                    border: '1.5px solid var(--border)',
                                    borderRadius: 20,
                                    boxShadow: 'var(--sh-xs)',
                                    transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s ease, border-color 0.22s ease',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                    e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.12)';
                                    e.currentTarget.style.borderColor = isPdf ? '#BFDBFE' : '#FED7AA';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'var(--sh-xs)';
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                }}
                            >
                                {/* Top accent bar */}
                                <div style={{
                                    height: 4,
                                    background: isPdf
                                        ? 'linear-gradient(90deg,#1D4ED8,#60A5FA)'
                                        : 'linear-gradient(90deg,#EA580C,#FB923C)',
                                    borderRadius: '20px 20px 0 0',
                                }} />

                                <div className="p-5 flex flex-col flex-1">
                                    {/* Badge row */}
                                    <div className="flex items-center justify-between mb-4">
                                        {isPdf ? <PdfBadge /> : <VideoBadge />}
                                        <span className="text-[10px] font-mono" style={{ color: 'var(--tx-faint)' }}>
                                            {new Date(res.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-bold text-sm leading-snug mb-2"
                                        style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--tx)' }}>
                                        {res.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-xs leading-relaxed flex-1 mb-4"
                                        style={{ color: 'var(--tx-muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {res.description || 'No description provided.'}
                                    </p>

                                    {/* File/link info */}
                                    <div className="text-[11px] px-3 py-2 rounded-lg mb-4 truncate font-mono"
                                        style={{ background: 'var(--bg-soft)', color: 'var(--tx-faint)', border: '1px solid var(--border)' }}>
                                        {res.fileUrl
                                            ? `📎 ${res.fileUrl.split('/').pop()}`
                                            : `🔗 ${res.linkUrl}`}
                                    </div>

                                    {/* Action row */}
                                    <div className="flex gap-2 mt-auto">
                                        {/* View */}
                                        <a href={link} target="_blank" rel="noopener noreferrer"
                                            className="flex-1 text-center py-2 rounded-xl text-xs font-semibold transition-all no-underline"
                                            style={{
                                                background: isPdf ? '#EFF6FF' : '#FFF7ED',
                                                color: isPdf ? '#1D4ED8' : '#EA580C',
                                                border: `1px solid ${isPdf ? '#BFDBFE' : '#FED7AA'}`,
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                        >
                                            {isPdf ? '📄 Open' : '▶ Watch'} ↗
                                        </a>

                                        {/* Edit */}
                                        <button
                                            onClick={() => openEdit(res)}
                                            title="Edit"
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base transition-colors hover:bg-green-500/10"
                                            style={{ border: '1px solid var(--border)', color: 'var(--g600)' }}
                                        >
                                            ✎
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={() => setDeleteConfirm(res._id)}
                                            title="Delete"
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base transition-colors hover:bg-red-500/10"
                                            style={{ border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer count */}
            {!loading && displayed.length > 0 && (
                <p className="text-center text-xs mt-8" style={{ color: 'var(--tx-faint)' }}>
                    Showing {displayed.length} of {resources.length} resource{resources.length !== 1 ? 's' : ''}
                </p>
            )}
        </Layout>
    );
}
