import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function Tabs() {
    const axiosSecure = useAxiosSecure();
    const [tabs, setTabs] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ title: '', sortOrder: '' });
    const [loading, setLoading] = useState(true);

    const fetchTabs = () => {
        axiosSecure.get('/tabs')
            .then(res => setTabs(res.data.tabs || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTabs(); }, []);

    const openNew = () => { setEditItem(null); setForm({ title: '', sortOrder: tabs.length + 1 }); setShowForm(true); };
    const openEdit = (t) => { setEditItem(t); setForm({ title: t.title, sortOrder: t.sortOrder }); setShowForm(true); };

    const save = async () => {
        if (!form.title.trim()) { toast.error('Title required'); return; }
        try {
            if (editItem) {
                await axiosSecure.put(`/tabs/${editItem._id}`, { title: form.title, sortOrder: Number(form.sortOrder) });
                toast.success('Tab updated!');
            } else {
                await axiosSecure.post('/tabs', { title: form.title, sortOrder: Number(form.sortOrder) });
                toast.success('Tab created!');
            }
            setShowForm(false);
            fetchTabs();
        } catch { toast.error('Failed to save'); }
    };

    const toggleActive = async (t) => {
        try {
            await axiosSecure.put(`/tabs/${t._id}`, { isActive: !t.isActive });
            toast.success('Status updated!');
            fetchTabs();
        } catch { toast.error('Failed'); }
    };

    const deleteTab = async (id) => {
        if (!window.confirm('Delete this tab?')) return;
        try {
            await axiosSecure.delete(`/tabs/${id}`);
            toast.success('Tab deleted!');
            fetchTabs();
        } catch { toast.error('Failed to delete'); }
    };

    return (
        <Layout isAdmin>
            <div className="flex items-start justify-between mb-8 fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Tabs</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>{tabs.length} tabs total</p>
                </div>
                <button onClick={openNew} className="btn-primary-green text-sm">+ New Tab</button>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-md p-6 fade-in-up">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-lg">{editItem ? 'Edit Tab' : 'New Tab'}</h2>
                            <button onClick={() => setShowForm(false)} style={{ color: 'var(--tx-muted)' }}>✕</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>TAB TITLE *</label>
                                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Site & Environment" className="input-dark w-full px-4 py-3 text-sm" autoFocus />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.06em' }}>SORT ORDER</label>
                                <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                                    className="input-dark w-full px-4 py-3 text-sm" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={save} className="btn-primary-green flex-1 justify-center text-sm">
                                    {editItem ? 'Save Changes' : 'Create Tab'}
                                </button>
                                <button onClick={() => setShowForm(false)}
                                    className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
                                    style={{ borderColor: 'var(--border-md)', color: 'var(--tx-muted)' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-card overflow-hidden">
                {loading ? <p className="text-center py-8">Loading...</p> : (
                    <table className="premium-table">
                        <thead><tr><th>Order</th><th>Tab Title</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {tabs.sort((a, b) => a.sortOrder - b.sortOrder).map(t => (
                                <tr key={t._id}>
                                    <td><span className="text-xs font-mono px-2 py-1 rounded"
                                        style={{ background: 'var(--bg-subtle)', color: 'var(--tx-muted)' }}>
                                        #{t.sortOrder}
                                    </span></td>
                                    <td className="font-semibold">{t.title}</td>
                                    <td>
                                        <button onClick={() => toggleActive(t)}
                                            className={`text-xs px-3 py-1 rounded-full font-semibold ${t.isActive ? 'status-completed' : 'bg-red-500/10 text-red-400'
                                                }`}>
                                            {t.isActive ? '● Active' : '○ Inactive'}
                                        </button>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEdit(t)}
                                                className="text-xs px-3 py-1.5 rounded-lg border"
                                                style={{ borderColor: 'var(--border-md)', color: 'var(--tx-muted)', background: 'var(--g50)' }}>
                                                ✎ Edit
                                            </button>
                                            <button onClick={() => deleteTab(t._id)}
                                                className="text-xs px-3 py-1.5 rounded-lg border"
                                                style={{ borderColor: 'rgba(226,103,12,0.15)', color: 'rgba(226,103,12,0.6)', background: 'rgba(226,103,12,0.05)' }}>
                                                ✕ Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Layout>
    );
}