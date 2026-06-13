import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function Categories() {
    const axiosSecure = useAxiosSecure();
    const [categories, setCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showCloneForm, setShowCloneForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [cloneItem, setCloneItem] = useState(null);
    
    const [form, setForm] = useState({ name: '', sortOrder: '' });
    const [cloneName, setCloneName] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchCategories = () => {
        axiosSecure.get('/categories/all')
            .then(res => setCategories(res.data.categories || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchCategories(); }, []);

    const openNew = () => {
        setEditItem(null);
        setForm({ name: '', sortOrder: categories.length + 1 });
        setShowForm(true);
    };

    const openEdit = (c) => {
        setEditItem(c);
        setForm({ name: c.name, sortOrder: c.sortOrder });
        setShowForm(true);
    };

    const openClone = (c) => {
        setCloneItem(c);
        setCloneName(`${c.name} (Copy)`);
        setShowCloneForm(true);
    };

    const save = async () => {
        if (!form.name.trim()) { toast.error('Category name required'); return; }
        try {
            const payload = {
                name: form.name,
                sortOrder: Number(form.sortOrder)
            };

            if (editItem) {
                await axiosSecure.put(`/categories/${editItem._id}`, payload);
                toast.success('Category updated!');
            } else {
                await axiosSecure.post('/categories', payload);
                toast.success('Category created!');
            }
            setShowForm(false);
            fetchCategories();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save');
        }
    };

    const handleClone = async () => {
        if (!cloneName.trim()) { toast.error('Cloned category name required'); return; }
        try {
            await axiosSecure.post(`/categories/${cloneItem._id}/clone`, { name: cloneName });
            toast.success('Category cloned successfully!');
            setShowCloneForm(false);
            fetchCategories();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to clone');
        }
    };

    const toggleActive = async (c) => {
        try {
            await axiosSecure.put(`/categories/${c._id}`, { isActive: !c.isActive });
            toast.success('Status updated!');
            fetchCategories();
        } catch { toast.error('Failed'); }
    };

    const deleteCategory = async (id) => {
        if (!window.confirm('Delete this category? Associated tabs will be unassigned (modules, inputs etc. will remain intact under those tabs, but the category association will be removed).')) return;
        try {
            await axiosSecure.delete(`/categories/${id}`);
            toast.success('Category deleted!');
            fetchCategories();
        } catch { toast.error('Failed to delete'); }
    };

    return (
        <Layout isAdmin>
            <div className="flex items-start justify-between mb-8 fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Project Categories</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>{categories.length} categories total</p>
                </div>
                <button onClick={openNew} className="btn-primary-green text-sm">+ New Category</button>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-md p-6 fade-in-up border border-white/10" style={{ background: 'rgba(20, 20, 20, 0.95)', boxShadow: '0 20px 45px rgba(0,0,0,0.6)' }}>
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
                            <h2 className="font-bold text-lg text-[#34C961]" style={{ fontFamily: 'Montserrat, sans-serif' }}>{editItem ? 'Edit Category' : 'New Category'}</h2>
                            <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white transition-colors text-lg">✕</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>CATEGORY NAME *</label>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. General Building" 
                                    className="w-full px-4 py-3 text-sm rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all" autoFocus />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>SORT ORDER</label>
                                <input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                                    className="w-full px-4 py-3 text-sm rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all" />
                            </div>
                            <div className="flex gap-3 pt-3 border-t border-white/5 mt-6">
                                <button onClick={save} className="btn-primary-green flex-1 justify-center text-sm py-3">
                                    {editItem ? 'Save Changes' : 'Create Category'}
                                </button>
                                <button onClick={() => setShowForm(false)}
                                    className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-white/5 hover:text-white"
                                    style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCloneForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-md p-6 fade-in-up border border-white/10" style={{ background: 'rgba(20, 20, 20, 0.95)', boxShadow: '0 20px 45px rgba(0,0,0,0.6)' }}>
                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
                            <h2 className="font-bold text-lg text-[#34C961]" style={{ fontFamily: 'Montserrat, sans-serif' }}>Clone Category</h2>
                            <button onClick={() => setShowCloneForm(false)} className="text-white/40 hover:text-white transition-colors text-lg">✕</button>
                        </div>
                        <p className="text-xs mb-4 text-white/70">
                            This will duplicate the category <strong className="text-white">{cloneItem?.name}</strong> along with all its tabs, modules, sections, and inputs.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>NEW CLONED CATEGORY NAME *</label>
                                <input value={cloneName} onChange={e => setCloneName(e.target.value)}
                                    placeholder="e.g. Specialized Industrial" 
                                    className="w-full px-4 py-3 text-sm rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all" autoFocus />
                            </div>
                            <div className="flex gap-3 pt-3 border-t border-white/5 mt-6">
                                <button onClick={handleClone} className="btn-primary-green flex-1 justify-center text-sm py-3">
                                    Clone Category
                                </button>
                                <button onClick={() => setShowCloneForm(false)}
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
                        <thead><tr><th>Order</th><th>Category Name</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {categories.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-8" style={{ color: 'var(--tx-muted)' }}>No categories found</td></tr>
                            ) : categories.sort((a, b) => a.sortOrder - b.sortOrder).map(c => (
                                <tr key={c._id}>
                                    <td><span className="text-xs font-mono px-2 py-1 rounded"
                                        style={{ background: 'var(--bg-subtle)', color: 'var(--tx-muted)' }}>
                                        #{c.sortOrder}
                                    </span></td>
                                    <td className="font-semibold">{c.name}</td>
                                    <td>
                                        <button onClick={() => toggleActive(c)}
                                            className={`text-xs px-3 py-1 rounded-full font-semibold ${c.isActive ? 'status-completed' : 'bg-red-500/10 text-red-400'
                                                }`}>
                                            {c.isActive ? '● Active' : '○ Inactive'}
                                        </button>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEdit(c)}
                                                className="text-xs px-3 py-1.5 rounded-lg border"
                                                style={{ borderColor: 'var(--border-md)', color: 'var(--tx-muted)', background: 'var(--g50)' }}>
                                                ✎ Edit
                                            </button>
                                            <button onClick={() => openClone(c)}
                                                className="text-xs px-3 py-1.5 rounded-lg border"
                                                style={{ borderColor: 'var(--border-md)', color: 'var(--tx-muted)', background: 'var(--g50)' }}>
                                                ⎘ Clone
                                            </button>
                                            <button onClick={() => deleteCategory(c._id)}
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
