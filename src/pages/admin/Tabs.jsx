import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function IconImg({ src, fallback, size = 32 }) {
    const [failed, setFailed] = useState(false);
    const r = Math.round(size * 0.2);
    if (!src || failed) {
        return (
            <div style={{
                width: size, height: size, borderRadius: r, flexShrink: 0,
                background: 'linear-gradient(135deg,var(--g700),var(--g500))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: Math.round(size * 0.4), fontWeight: 800,
                fontFamily: 'Montserrat,sans-serif',
            }}>{fallback}</div>
        );
    }
    return (
        <img src={src} alt="" onError={() => setFailed(true)}
            style={{ width: size, height: size, objectFit: 'contain', borderRadius: r, background: 'var(--bg-subtle)', padding: 4, flexShrink: 0 }} />
    );
}

export default function Tabs() {
    const axiosSecure = useAxiosSecure();
    const [tabs, setTabs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    
    const [form, setForm] = useState({ title: '', sortOrder: '', categories: [] });
    const [iconFile, setIconFile] = useState(null);
    const [iconPreview, setIconPreview] = useState('');
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const fetchTabs = (searchVal = search, catFilter = categoryFilter) => {
        setLoading(true);
        const params = {};
        if (searchVal.trim()) params.search = searchVal.trim();
        if (catFilter) params.categoryId = catFilter;

        axiosSecure.get('/tabs/all', { params })
            .then(res => setTabs(res.data.tabs || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const fetchCategories = () => {
        axiosSecure.get('/categories')
            .then(res => setCategories(res.data.categories || []))
            .catch(console.error);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchCategories();
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchTabs(search, categoryFilter);
    }, [search, categoryFilter]);

    const openNew = () => {
        setEditItem(null);
        setForm({ title: '', sortOrder: tabs.length + 1, categories: [] });
        setIconFile(null);
        setIconPreview('');
        setShowForm(true);
    };

    const openEdit = (t) => {
        setEditItem(t);
        setForm({ 
            title: t.title, 
            sortOrder: t.sortOrder, 
            categories: t.categories ? t.categories.map(c => c._id || c) : [] 
        });
        setIconFile(null);
        setIconPreview(t.iconUrl ? `${SERVER_URL}${t.iconUrl}` : '');
        setShowForm(true);
    };

    const handleIconChange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setIconFile(f);
        setIconPreview(URL.createObjectURL(f));
    };

    const save = async () => {
        if (!form.title.trim()) { toast.error('Title required'); return; }
        try {
            const fd = new FormData();
            fd.append('title', form.title);
            fd.append('sortOrder', Number(form.sortOrder));
            fd.append('categories', JSON.stringify(form.categories));
            if (iconFile) fd.append('icon', iconFile);

            if (editItem) {
                await axiosSecure.put(`/tabs/${editItem._id}`, fd);
                toast.success('Tab updated!');
            } else {
                await axiosSecure.post('/tabs', fd);
                toast.success('Tab created!');
            }
            setShowForm(false);
            fetchTabs(search, categoryFilter);
        } catch { toast.error('Failed to save'); }
    };

    const toggleActive = async (t) => {
        try {
            await axiosSecure.put(`/tabs/${t._id}`, { isActive: !t.isActive });
            toast.success('Status updated!');
            fetchTabs(search, categoryFilter);
        } catch { toast.error('Failed'); }
    };

    const deleteTab = async (id) => {
        if (!window.confirm('Delete this tab?')) return;
        try {
            await axiosSecure.delete(`/tabs/${id}`);
            toast.success('Tab deleted!');
            fetchTabs(search, categoryFilter);
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

            <div className="flex flex-wrap gap-3 mb-6">
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search tabs..."
                    className="input-dark pl-4 pr-4 py-2.5 text-sm w-56" />
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                    className="input-dark px-3 py-2.5 text-sm">
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-md p-6 fade-in-up border border-white/10" style={{ background: 'rgba(20, 20, 20, 0.95)', boxShadow: '0 20px 45px rgba(0,0,0,0.6)' }}>
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
                            <h2 className="font-bold text-lg text-[#34C961]" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editItem ? 'Edit Tab' : 'New Tab'}</h2>
                            <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white transition-colors text-lg">✕</button>
                        </div>
                        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>TAB TITLE *</label>
                                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Site & Environment" 
                                    className="w-full px-4 py-3 text-sm rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all" autoFocus />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>SORT ORDER</label>
                                <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                                    className="w-full px-4 py-3 text-sm rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>PROJECT CATEGORIES</label>
                                <div className="space-y-2 p-3 rounded-xl border max-h-40 overflow-y-auto bg-black/30 border-white/10">
                                    {categories.length === 0 ? (
                                        <p className="text-xs text-white/40">No categories created yet.</p>
                                    ) : categories.map(cat => {
                                        const checked = form.categories.includes(cat._id);
                                        return (
                                            <label key={cat._id} className="flex items-center gap-2 text-sm cursor-pointer select-none text-white/80 hover:text-white transition-colors">
                                                <input type="checkbox" checked={checked}
                                                    onChange={() => {
                                                        const next = checked
                                                            ? form.categories.filter(id => id !== cat._id)
                                                            : [...form.categories, cat._id];
                                                        setForm({ ...form, categories: next });
                                                    }}
                                                    style={{ accentColor: '#22A84B' }}
                                                    className="w-4 h-4 cursor-pointer" />
                                                <span>{cat.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>TAB ICON</label>
                                {iconPreview && (
                                    <div style={{ marginBottom: 8 }}>
                                        <img src={iconPreview} alt="icon preview"
                                            onError={e => { e.currentTarget.style.display = 'none'; }}
                                            style={{
                                                height: 48, width: 48, objectFit: 'contain',
                                                borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'rgba(0,0,0,0.25)', padding: 4, display: 'block'
                                            }} />
                                    </div>
                                )}
                                <label style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8,
                                    cursor: 'pointer', padding: '10px 16px', borderRadius: 12,
                                    border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.25)',
                                    fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600
                                }} className="hover:bg-white/5 hover:text-white transition-all">
                                    <span>📎</span>
                                    <span>{iconFile ? iconFile.name : (iconPreview ? 'Replace icon…' : 'Upload icon…')}</span>
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIconChange} />
                                </label>
                            </div>
                            <div className="flex gap-3 pt-3 border-t border-white/5 mt-6">
                                <button onClick={save} className="btn-primary-green flex-1 justify-center text-sm py-3">
                                    {editItem ? 'Save Changes' : 'Create Tab'}
                                </button>
                                <button onClick={() => setShowForm(false)}
                                    className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-white/5 hover:text-white"
                                    style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-card overflow-hidden">
                {loading ? <p className="text-center py-8">Loading...</p> : (
                    <div className="table-scroll"><table className="premium-table">
                        <thead><tr><th>Order</th><th>Icon</th><th>Tab Title</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {tabs.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-12" style={{ color: 'var(--tx-muted)' }}>No tabs found</td></tr>
                            ) : tabs.map(t => (
                                <tr key={t._id}>
                                    <td><span className="text-xs font-mono px-2 py-1 rounded"
                                        style={{ background: 'var(--bg-subtle)', color: 'var(--tx-muted)' }}>
                                        #{t.sortOrder}
                                    </span></td>
                                    <td>
                                        <IconImg
                                            src={t.iconUrl ? `${SERVER_URL}${t.iconUrl}` : ''}
                                            fallback={t.title?.[0]?.toUpperCase() || '?'}
                                            size={32}
                                        />
                                    </td>
                                    <td className="font-semibold">
                                        <div>{t.title}</div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {t.categories?.map(c => (
                                                <span key={c._id} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(34,168,75,0.15)', color: '#34c961', border: '1px solid rgba(34,168,75,0.2)' }}>
                                                    {c.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
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
                    </table></div>
                )}
            </div>
        </Layout>
    );
}
