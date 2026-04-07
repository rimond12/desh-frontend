import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function LeafLevels() {
    const axiosSecure = useAxiosSecure();
    const [levels, setLevels] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ name: '', minPercent: '', maxPercent: '', colorCode: '#22C55E' });

    const fetchLevels = () => {
        axiosSecure.get('/settings/eval-rules')
            .then(res => setLevels(res.data.rules || []))
            .catch(console.error);
    };

    useEffect(() => { fetchLevels(); }, []);

    const openNew = () => { setEditItem(null); setForm({ name: '', minPercent: '', maxPercent: '', colorCode: '#22C55E' }); setShowForm(true); };
    const openEdit = (l) => { setEditItem(l); setForm({ name: l.name, minPercent: l.minPercent, maxPercent: l.maxPercent, colorCode: l.colorCode }); setShowForm(true); };

    const save = async () => {
        if (!form.name || !form.minPercent || !form.maxPercent) { toast.error('All fields required'); return; }
        try {
            const data = { ...form, minPercent: Number(form.minPercent), maxPercent: Number(form.maxPercent) };
            if (editItem) {
                await axiosSecure.put(`/settings/eval-rules/${editItem._id}`, data);
                toast.success('Level updated!');
            } else {
                await axiosSecure.post('/settings/eval-rules', data);
                toast.success('Level created!');
            }
            setShowForm(false);
            fetchLevels();
        } catch { toast.error('Failed to save'); }
    };

    const deleteLevel = async (id) => {
        try {
            await axiosSecure.delete(`/settings/eval-rules/${id}`);
            toast.success('Deleted!');
            fetchLevels();
        } catch { toast.error('Failed'); }
    };

    return (
        <Layout isAdmin>
            <div className="flex items-start justify-between mb-8 fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Leaf Levels</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>Configure evaluation scoring levels</p>
                </div>
                <button onClick={openNew} className="btn-primary-green text-sm">+ New Level</button>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-md p-6 fade-in-up">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-lg">{editItem ? 'Edit Level' : 'New Level'}</h2>
                            <button onClick={() => setShowForm(false)} style={{ color: 'var(--tx-muted)' }}>✕</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>LEVEL NAME *</label>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Green Leaf" className="input-dark w-full px-4 py-3 text-sm" autoFocus />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>MIN %</label>
                                    <input type="number" value={form.minPercent} onChange={e => setForm({ ...form, minPercent: e.target.value })}
                                        className="input-dark w-full px-4 py-3 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>MAX %</label>
                                    <input type="number" value={form.maxPercent} onChange={e => setForm({ ...form, maxPercent: e.target.value })}
                                        className="input-dark w-full px-4 py-3 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>COLOR</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" value={form.colorCode} onChange={e => setForm({ ...form, colorCode: e.target.value })}
                                        className="w-12 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                                    <input value={form.colorCode} onChange={e => setForm({ ...form, colorCode: e.target.value })}
                                        className="input-dark flex-1 px-4 py-3 text-sm font-mono" />
                                    <span className="px-3 py-1.5 rounded-full text-xs font-bold"
                                        style={{ background: form.colorCode }}>{form.name || 'Preview'}</span>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={save} className="btn-primary-green flex-1 justify-center text-sm">
                                    {editItem ? 'Save Changes' : 'Create Level'}
                                </button>
                                <button onClick={() => setShowForm(false)}
                                    className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
                                    style={{ borderColor: 'var(--border-md)', color: 'var(--tx-muted)' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {levels.sort((a, b) => b.minPercent - a.minPercent).map(l => (
                    <div key={l._id} className="glass-card p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: l.colorCode }} />
                        <div className="mt-2">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${l.colorCode}20` }}>
                                <svg viewBox="0 0 20 25" width="16" height="20">
                                    <path d="M10 1 C3 5 2 14 10 23 C18 14 17 5 10 1Z" fill={l.colorCode} />
                                </svg>
                            </div>
                            <p className="font-bold" style={{ color: "var(--tx)" }}>{l.name}</p>
                            <p className="text-2xl font-bold mt-1" style={{ color: l.colorCode }}>{l.minPercent}–{l.maxPercent}%</p>
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
                ))}
            </div>
        </Layout>
    );
}