import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const SERVER_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function LeafPreview({ colorCode, imageUrl, size = 40 }) {
    if (imageUrl) {
        return (
            <img src={imageUrl} alt="leaf"
                style={{ width: size, height: size * 1.25, objectFit: 'contain', display: 'block' }} />
        );
    }
    return (
        <svg viewBox="0 0 20 25" width={size} height={size * 1.25}>
            <path d="M10 1 C3 5 2 14 10 23 C18 14 17 5 10 1Z" fill={colorCode || '#999'} />
        </svg>
    );
}

export default function LeafLevels() {
    const axiosSecure = useAxiosSecure();
    const [levels, setLevels] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ name: '', minPercent: '', maxPercent: '', colorCode: '#22C55E' });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingId, setUploadingId] = useState(null);
    const fileInputRef = useRef(null);

    const fetchLevels = () => {
        axiosSecure.get('/settings/eval-rules')
            .then(res => setLevels(res.data.rules || []))
            .catch(console.error);
    };

    useEffect(() => { fetchLevels(); }, []);

    const openNew = () => {
        setEditItem(null);
        setForm({ name: '', minPercent: '', maxPercent: '', colorCode: '#22C55E' });
        setImageFile(null);
        setImagePreview(null);
        setRemoveImage(false);
        setShowForm(true);
    };

    const openEdit = (l) => {
        setEditItem(l);
        setForm({ name: l.name, minPercent: l.minPercent, maxPercent: l.maxPercent, colorCode: l.colorCode });
        setImageFile(null);
        setImagePreview(null);
        setRemoveImage(false);
        setShowForm(true);
    };

    const handleImagePick = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setRemoveImage(false);
        setImagePreview(URL.createObjectURL(file));
    };

    const save = async () => {
        if (!form.name || form.minPercent === '' || form.maxPercent === '') {
            toast.error('All fields required'); return;
        }
        setSaving(true);
        try {
            const data = { ...form, minPercent: Number(form.minPercent), maxPercent: Number(form.maxPercent) };
            let rule;
            if (editItem) {
                const res = await axiosSecure.put(`/settings/eval-rules/${editItem._id}`, data);
                rule = res.data.rule;
                toast.success('Level updated!');
            } else {
                const res = await axiosSecure.post('/settings/eval-rules', data);
                rule = res.data.rule;
                toast.success('Level created!');
            }

            // Handle image upload / removal
            if (imageFile && rule?._id) {
                const fd = new FormData();
                fd.append('image', imageFile);
                await axiosSecure.post(`/settings/eval-rules/${rule._id}/image`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else if (removeImage && editItem?._id) {
                await axiosSecure.delete(`/settings/eval-rules/${editItem._id}/image`);
            }

            setShowForm(false);
            
            fetchLevels();
        } catch { toast.error('Failed to save'); }
        finally { setSaving(false); }
    };

    const deleteLevel = async (id) => {
        if (!window.confirm('Delete this level?')) return;
        try {
            await axiosSecure.delete(`/settings/eval-rules/${id}`);
            toast.success('Deleted!');
            fetchLevels();
            

        } catch { toast.error('Failed'); }
    };

    // Quick image upload directly from card (no modal needed)
    const handleQuickImageUpload = async (l, file) => {
        if (!file) return;
        setUploadingId(l._id);
        try {
            const fd = new FormData();
            fd.append('image', file);
            await axiosSecure.post(`/settings/eval-rules/${l._id}/image`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Image uploaded!');
            fetchLevels();
        } catch { toast.error('Upload failed'); }
        finally { setUploadingId(null); }
    };

    const handleRemoveImage = async (l) => {
        if (!window.confirm('Remove image for this level?')) return;
        try {
            await axiosSecure.delete(`/settings/eval-rules/${l._id}/image`);
            toast.success('Image removed');
            fetchLevels();
        } catch { toast.error('Failed'); }
    };

    const currentImageUrl = editItem?.imageUrl
        ? (imagePreview || `${SERVER_BASE}${editItem.imageUrl}`)
        : imagePreview;

    return (
        <Layout isAdmin>
            <div className="flex items-start justify-between mb-8 fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Leaf Levels</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>Configure evaluation scoring levels</p>
                </div>
                <button onClick={openNew} className="btn-primary-green text-sm">+ New Level</button>
            </div>

            {/* ── Create / Edit Modal ── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-md p-6 fade-in-up border border-white/10" style={{ background: 'rgba(20, 20, 20, 0.95)', boxShadow: '0 20px 45px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
                            <h2 className="font-bold text-lg text-[#34C961]" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editItem ? 'Edit Level' : 'New Level'}</h2>
                            <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white transition-colors text-lg">✕</button>
                        </div>
                        <div className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>LEVEL NAME *</label>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Green Leaf" 
                                    className="w-full px-4 py-3 text-sm rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all" autoFocus />
                            </div>

                            {/* Percent range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>MIN %</label>
                                    <input type="number" value={form.minPercent} onChange={e => setForm({ ...form, minPercent: e.target.value })}
                                        className="w-full px-4 py-3 text-sm rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>MAX %</label>
                                    <input type="number" value={form.maxPercent} onChange={e => setForm({ ...form, maxPercent: e.target.value })}
                                        className="w-full px-4 py-3 text-sm rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all" />
                                </div>
                            </div>

                            {/* Color */}
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>COLOR</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" value={form.colorCode} onChange={e => setForm({ ...form, colorCode: e.target.value })}
                                        className="w-12 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                                    <input value={form.colorCode} onChange={e => setForm({ ...form, colorCode: e.target.value })}
                                        className="px-4 py-3 text-sm font-mono rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all flex-1" />
                                    <span className="px-3 py-1.5 rounded-full text-xs font-bold"
                                        style={{ background: form.colorCode, color: '#fff' }}>{form.name || 'Preview'}</span>
                                </div>
                                <p className="text-[11px] mt-1.5 text-white/40">
                                    Color is shown when no image is uploaded.
                                </p>
                            </div>

                            {/* Image upload */}
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>
                                    LEAF IMAGE <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — replaces color display)</span>
                                </label>

                                {/* Preview */}
                                {(currentImageUrl && !removeImage) ? (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '10px 14px', borderRadius: 12,
                                        background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 8,
                                    }}>
                                        <img src={currentImageUrl} alt="leaf preview"
                                            style={{ width: 40, height: 50, objectFit: 'contain', borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
                                        <div style={{ flex: 1 }}>
                                            <p className="text-xs font-semibold text-white m-0">
                                                {imageFile ? imageFile.name : 'Current image'}
                                            </p>
                                            <p className="text-[11px] text-white/40 m-0" style={{ marginTop: 2 }}>
                                                Image will be shown instead of the leaf color
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => { setImageFile(null); setImagePreview(null); if (editItem?.imageUrl) setRemoveImage(true); }}
                                            className="text-[11px] px-2.5 py-1 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 font-semibold cursor-pointer hover:bg-red-500/20 transition-all">
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <label style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        padding: '14px', borderRadius: 12, cursor: 'pointer',
                                        border: '1.5px dashed rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.25)',
                                        marginBottom: 8,
                                    }} className="hover:bg-white/5 hover:text-white transition-all text-white/60">
                                        <span className="text-xl">🖼️</span>
                                        <span className="text-sm font-semibold">
                                            {removeImage ? 'Image removed — click to re-upload' : 'Upload leaf image (PNG, JPG, SVG)'}
                                        </span>
                                        <input type="file" style={{ display: 'none' }}
                                            accept="image/*"
                                            onChange={handleImagePick} />
                                    </label>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-3 border-t border-white/5 mt-6">
                                <button onClick={save} disabled={saving} className="btn-primary-green flex-1 justify-center text-sm py-3">
                                    {saving ? 'Saving…' : editItem ? 'Save Changes' : 'Create Level'}
                                </button>
                                <button onClick={() => setShowForm(false)}
                                    className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-white/5 hover:text-white"
                                    style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Level cards ── */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {levels.sort((a, b) => b.minPercent - a.minPercent).map(l => {
                    const imgUrl = l.imageUrl ? `${SERVER_BASE}${l.imageUrl}` : null;
                    return (
                        <div key={l._id} className="glass-card p-5 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: l.colorCode }} />
                            <div className="mt-2">
                                {/* Leaf preview */}
                                <div style={{
                                    width: 44, height: 54, marginBottom: 10,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: 10, background: imgUrl ? 'transparent' : `${l.colorCode}20`,
                                }}>
                                    <LeafPreview colorCode={l.colorCode} imageUrl={imgUrl} size={36} />
                                </div>
                                <p className="font-bold" style={{ color: 'var(--tx)' }}>{l.name}</p>
                                <p className="text-2xl font-bold mt-1" style={{ color: l.colorCode }}>{l.minPercent}–{l.maxPercent}%</p>

                                {/* Image status */}
                                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {imgUrl ? (
                                        <>
                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#D6F5E3', color: '#145C28' }}>
                                                🖼️ Image active
                                            </span>
                                            <button
                                                onClick={() => handleRemoveImage(l)}
                                                style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
                                                Remove
                                            </button>
                                        </>
                                    ) : (
                                        <label style={{ cursor: 'pointer' }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'var(--g50)', color: 'var(--tx-muted)', border: '1px solid var(--border)' }}>
                                                {uploadingId === l._id ? 'Uploading…' : '+ Upload image'}
                                            </span>
                                            <input type="file" accept="image/*" style={{ display: 'none' }}
                                                disabled={uploadingId === l._id}
                                                onChange={e => handleQuickImageUpload(l, e.target.files[0])} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                                <button onClick={() => openEdit(l)}
                                    className="flex-1 text-xs py-1.5 rounded-lg border text-center"
                                    style={{ borderColor: 'var(--border-md)', color: 'var(--tx-muted)' }}>✎ Edit</button>
                                <button onClick={() => deleteLevel(l._id)}
                                    className="flex-1 text-xs py-1.5 rounded-lg border text-center"
                                    style={{ borderColor: 'rgba(226,103,12,0.15)', color: 'rgba(226,103,12,0.6)' }}>✕ Delete</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Layout>
    );
}
