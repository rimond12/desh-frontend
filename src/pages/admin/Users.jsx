import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function Users() {
    const axiosSecure = useAxiosSecure();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUsers = () => {
        axiosSecure.get('/users')
            .then(res => setUsers(res.data.users || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchUsers(); }, []);

    const filtered = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const deleteUser = async (id, name) => {
        if (!window.confirm(`Delete ${name}?`)) return;
        try {
            await axiosSecure.delete(`/users/${id}`);
            toast.success('User deleted');
            fetchUsers();
        } catch { toast.error('Failed to delete'); }
    };

    const changeRole = async (id, role) => {
        try {
            await axiosSecure.patch(`/users/${id}/role`, { role });
            toast.success(`Role updated to ${role}`);
            fetchUsers();
            setSelected(null);
        } catch { toast.error('Failed to update role'); }
    };

    const exportCSV = () => {
        const rows = [['Name', 'Email', 'Role', 'Joined']];
        filtered.forEach(u => rows.push([u.name, u.email, u.role, new Date(u.createdAt).toLocaleDateString()]));
        const csv = rows.map(r => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = 'data:text/csv,' + encodeURIComponent(csv);
        a.download = 'users.csv'; a.click();
        toast.success('CSV exported!');
    };

    return (
        <Layout isAdmin>
            <div className="flex items-start justify-between mb-8 fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Users</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>
                        {filtered.length} of {users.length} registered users
                    </p>
                </div>
                <button onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold"
                    style={{ borderColor: 'var(--border-md)', color: 'var(--g600)', background: 'var(--g50)' }}>
                    ↓ Export CSV
                </button>
            </div>

            <div className="relative mb-6 max-w-sm">
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="input-dark w-full pl-4 pr-4 py-2.5 text-sm" />
            </div>

            <div className="glass-card overflow-hidden">
                {loading ? <p className="text-center py-8">Loading...</p> : (
                    <table className="premium-table">
                        <thead>
                            <tr><th>#</th><th>User</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {filtered.map((u, i) => (
                                <tr key={u._id}>
                                    <td><span className="text-xs font-mono px-2 py-0.5 rounded"
                                        style={{ background: 'var(--bg-subtle)', color: 'var(--tx-muted)' }}>
                                        #{i + 1}
                                    </span></td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                                                style={{ background: 'linear-gradient(135deg,#16520A,#22C55E)' }}>
                                                {u.name?.[0] || '?'}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm" style={{ color: "var(--tx)" }}>{u.name}</p>
                                                <p className="text-xs" style={{ color: 'var(--tx-muted)' }}>{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${u.role === 'admin' ? 'bg-orange-500/15 text-orange-400' :
                                            u.role === 'reviewer' ? 'bg-purple-500/15 text-purple-400' :
                                                u.role === 'student' ? 'bg-blue-500/15 text-blue-400' :
                                                    'status-completed'
                                            }`}>{u.role}</span>
                                    </td>
                                    <td className="text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button onClick={() => setSelected(u)}
                                                className="text-xs px-3 py-1.5 rounded-lg border"
                                                style={{ borderColor: 'var(--border-md)', color: 'var(--tx-muted)', background: 'var(--g50)' }}>
                                                Manage
                                            </button>
                                            <button onClick={() => deleteUser(u._id, u.name)}
                                                className="text-xs px-3 py-1.5 rounded-lg border"
                                                style={{ borderColor: 'rgba(226,103,12,0.15)', color: 'rgba(226,103,12,0.6)', background: 'rgba(226,103,12,0.05)' }}>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="fade-in-up" style={{ width: '100%', maxWidth: 400, padding: '28px 24px', background: '#fff', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                                    style={{ background: 'linear-gradient(135deg,#16520A,#22C55E)', color: '#fff' }}>
                                    {selected.name?.[0]}
                                </div>
                                <div>
                                    <p className="font-bold" style={{ color: '#111' }}>{selected.name}</p>
                                    <p className="text-xs" style={{ color: '#888' }}>{selected.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ color: '#aaa', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>✕</button>
                        </div>

                        <div className="mb-5">
                            <p className="text-xs font-semibold mb-2" style={{ color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Montserrat,sans-serif' }}>
                                Change Role
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={() => changeRole(selected._id, 'user')}
                                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${selected.role === 'user' ? 'bg-green-500/15 text-green-600 border-green-500/30' : 'border-gray-200 text-gray-400'
                                        }`}>
                                    User
                                </button>
                                <button onClick={() => changeRole(selected._id, 'student')}
                                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${selected.role === 'student' ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' : 'border-gray-200 text-gray-400'
                                        }`}>
                                    Student
                                </button>
                                <button onClick={() => changeRole(selected._id, 'reviewer')}
                                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${selected.role === 'reviewer' ? 'bg-purple-500/15 text-purple-600 border-purple-500/30' : 'border-gray-200 text-gray-400'
                                        }`}>
                                    Reviewer
                                </button>
                                <button onClick={() => changeRole(selected._id, 'admin')}
                                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${selected.role === 'admin' ? 'bg-orange-500/15 text-orange-600 border-orange-500/30' : 'border-gray-200 text-gray-400'
                                        }`}>
                                    Admin
                                </button>
                            </div>
                        </div>

                        <button onClick={() => setSelected(null)} className="btn-primary-green w-full justify-center text-sm">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </Layout>
    );
}