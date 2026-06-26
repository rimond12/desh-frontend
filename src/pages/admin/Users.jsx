import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const ROLE_CFG = {
    admin: { label: 'DESH Admin', bg: 'rgba(249,115,22,0.15)', color: '#FB923C', border: 'rgba(249,115,22,0.3)' },
    desh_manager: { label: 'DESH Manager', bg: 'rgba(14,165,233,0.15)', color: '#38BDF8', border: 'rgba(14,165,233,0.3)' },
    desh_reviewer: { label: 'DESH Reviewer', bg: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: 'rgba(139,92,246,0.3)' },
    desh_assessor: { label: 'DESH Assessor', bg: 'rgba(59,130,246,0.15)', color: '#93C5FD', border: 'rgba(59,130,246,0.3)' },
    user: { label: 'DESH Professional', bg: 'rgba(34,168,75,0.15)', color: '#4ADE80', border: 'rgba(34,168,75,0.3)' },
};

const TYPE_CFG = {
    student: { label: 'Student', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    professional: { label: 'Professional', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
    owner: { label: 'Building Owner', bg: '#FEF9C3', color: '#92400E', border: '#FDE68A' },
    architect: { label: 'Architect', bg: '#FDF4FF', color: '#7E22CE', border: '#E9D5FF' },
    engineer: { label: 'Engineer', bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
    researcher: { label: 'Researcher', bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
    other: { label: 'Other', bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
};

function RoleBadge({ role }) {
    const cfg = ROLE_CFG[role] || ROLE_CFG.user;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 99,
            fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.border}`, fontFamily: 'Montserrat,sans-serif',
        }}>{cfg.label}</span>
    );
}

function TypeBadge({ userType }) {
    if (!userType) return <span style={{ fontSize: 11, color: 'var(--tx-faint)' }}>—</span>;
    const cfg = TYPE_CFG[userType] || TYPE_CFG.other;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 99,
            fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.border}`,
        }}>{cfg.label}</span>
    );
}

export default function Users() {
    const axiosSecure = useAxiosSecure();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUsers = () => {
        axiosSecure.get('/users')
            .then(res => setUsers(res.data.users || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchUsers(); }, []);

    const filtered = users.filter(u => {
        const matchSearch = !search ||
            u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
        const matchType = typeFilter === 'all' || u.userType === typeFilter;
        return matchSearch && matchRole && matchType;
    });

    const deleteUser = async (id, name) => {
        if (!window.confirm(`Delete ${name}?`)) return;
        try {
            await axiosSecure.delete(`/users/${id}`);
            toast.success('Account deleted');
            fetchUsers();
        } catch { toast.error('Failed to delete'); }
    };

    const changeRole = async (id, role) => {
        try {
            await axiosSecure.patch(`/users/${id}/role`, { role });
            toast.success(`Role updated to ${role}`);
            fetchUsers();
            setSelected(prev => prev ? { ...prev, role } : null);
        } catch { toast.error('Failed to update role'); }
    };

    const exportCSV = () => {
        const rows = [['#', 'Name', 'Email', 'System Role', 'User Type', 'Joined']];
        filtered.forEach((u, i) => rows.push([
            i + 1,
            `"${u.name}"`,
            u.email,
            u.role,
            u.userType || '',
            new Date(u.createdAt).toLocaleDateString(),
        ]));
        const csv = rows.map(r => r.join(',')).join('\n');
        const label = [
            roleFilter !== 'all' ? roleFilter : '',
            typeFilter !== 'all' ? typeFilter : '',
        ].filter(Boolean).join('_') || 'all';
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        a.download = `users_${label}.csv`;
        a.click();
        toast.success(`Exported ${filtered.length} users`);
    };

    // Count helpers for filter badges
    const countByRole = (r) => users.filter(u => u.role === r).length;
    const countByType = (t) => users.filter(u => u.userType === t).length;

    const ROLE_FILTERS = [
        { key: 'all', label: 'All', count: users.length },
        { key: 'user', label: 'DESH Professional', count: countByRole('user') },
        { key: 'desh_manager', label: 'DESH Manager', count: countByRole('desh_manager') },
        { key: 'desh_reviewer', label: 'DESH Reviewer', count: countByRole('desh_reviewer') },
        { key: 'desh_assessor', label: 'DESH Assessor', count: countByRole('desh_assessor') },
        { key: 'admin', label: 'DESH Admin', count: countByRole('admin') },
    ];

    const TYPE_FILTERS = [
        { key: 'all', label: 'All Types', count: users.length },
        { key: 'student', label: 'Student', count: countByType('student') },
        { key: 'professional', label: 'Professional', count: countByType('professional') },
        { key: 'owner', label: 'Building Owner', count: countByType('owner') },
        { key: 'architect', label: 'Architect', count: countByType('architect') },
        { key: 'engineer', label: 'Engineer', count: countByType('engineer') },
        { key: 'researcher', label: 'Researcher', count: countByType('researcher') },
        { key: 'other', label: 'Other', count: countByType('other') },
    ];

    return (
        <Layout isAdmin>
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }} className="fade-in-up">
                <div>
                    <h1 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 26, color: 'var(--tx)', margin: 0 }}>Users</h1>
                    <p style={{ fontSize: 13, color: 'var(--tx-muted)', marginTop: 4 }}>
                        {filtered.length} of {users.length} registered users
                    </p>
                </div>
                <button onClick={exportCSV} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12,
                    border: '1.5px solid var(--g200)', background: 'var(--g50)', color: 'var(--g700)',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Montserrat,sans-serif',
                }}>
                    ↓ Download CSV
                    {(roleFilter !== 'all' || typeFilter !== 'all') && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'var(--g200)', color: 'var(--g800)' }}>
                            filtered
                        </span>
                    )}
                </button>
            </div>

            {/* ── Search ── */}
            <div style={{ marginBottom: 16, maxWidth: 380 }}>
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="input-dark"
                    style={{ width: '100%', padding: '9px 14px', borderRadius: 10, fontSize: 13 }} />
            </div>

            {/* ── Role filter ── */}
            <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tx-muted)', marginBottom: 6, fontFamily: 'Montserrat,sans-serif' }}>
                    Filter by System Role
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ROLE_FILTERS.map(f => (
                        <button key={f.key} onClick={() => setRoleFilter(f.key)} style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.15s',
                            border: roleFilter === f.key ? '1.5px solid var(--g500)' : '1.5px solid var(--border)',
                            background: roleFilter === f.key ? 'var(--g700)' : '#fff',
                            color: roleFilter === f.key ? '#fff' : 'var(--tx-muted)',
                            fontFamily: 'Montserrat,sans-serif',
                        }}>
                            {f.label}
                            <span style={{
                                fontSize: 10, padding: '0px 5px', borderRadius: 99,
                                background: roleFilter === f.key ? 'rgba(255,255,255,0.2)' : 'var(--g100)',
                                color: roleFilter === f.key ? '#fff' : 'var(--tx-muted)',
                                fontWeight: 800,
                            }}>{f.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── User Type filter ── */}
            <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tx-muted)', marginBottom: 6, fontFamily: 'Montserrat,sans-serif' }}>
                    Filter by Professional Type
                </p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {TYPE_FILTERS.map(f => {
                        const tCfg = TYPE_CFG[f.key];
                        const isActive = typeFilter === f.key;
                        return (
                            <button key={f.key} onClick={() => setTypeFilter(f.key)} style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.15s',
                                border: isActive
                                    ? `1.5px solid ${tCfg ? tCfg.color : 'var(--g500)'}`
                                    : '1.5px solid var(--border)',
                                background: isActive ? (tCfg ? tCfg.bg : 'var(--g700)') : '#fff',
                                color: isActive ? (tCfg ? tCfg.color : '#fff') : 'var(--tx-muted)',
                            }}>
                                {f.label}
                                <span style={{
                                    fontSize: 10, padding: '0px 5px', borderRadius: 99,
                                    background: isActive ? (tCfg ? tCfg.border : 'rgba(255,255,255,0.2)') : 'var(--g100)',
                                    color: isActive ? (tCfg ? tCfg.color : '#fff') : 'var(--tx-muted)',
                                    fontWeight: 800,
                                }}>{f.count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Table ── */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <p style={{ textAlign: 'center', padding: 32, color: 'var(--tx-muted)' }}>Loading...</p>
                ) : filtered.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: 32, color: 'var(--tx-muted)', fontSize: 13 }}>No users match the current filters.</p>
                ) : (
                    <div className="table-scroll"><table className="premium-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}>#</th>
                                <th>DESH Professional</th>
                                <th>System Role</th>
                                <th>Professional Type</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u, i) => (
                                <tr key={u._id}>
                                    <td>
                                        <span style={{ fontSize: 11, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 5, background: 'var(--bg-subtle)', color: 'var(--tx-muted)' }}>
                                            #{i + 1}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 13, fontWeight: 700, color: '#fff',
                                                background: 'linear-gradient(135deg,#16520A,#22C55E)',
                                            }}>
                                                {u.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', margin: 0 }}>{u.name}</p>
                                                <p style={{ fontSize: 11, color: 'var(--tx-muted)', margin: 0 }}>{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td><RoleBadge role={u.role} /></td>
                                    <td><TypeBadge userType={u.userType} /></td>
                                    <td style={{ fontSize: 12, color: 'var(--tx-muted)' }}>
                                        {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => setSelected(u)} style={{
                                                fontSize: 11, padding: '4px 12px', borderRadius: 8,
                                                border: '1px solid var(--border-md)', background: 'var(--g50)',
                                                color: 'var(--tx-muted)', cursor: 'pointer', fontWeight: 600,
                                            }}>Manage</button>
                                            <button onClick={() => deleteUser(u._id, u.name)} style={{
                                                fontSize: 11, padding: '4px 12px', borderRadius: 8,
                                                border: '1px solid rgba(226,103,12,0.2)',
                                                background: 'rgba(226,103,12,0.06)',
                                                color: 'rgba(200,80,0,0.8)', cursor: 'pointer', fontWeight: 600,
                                            }}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
            </div>

            {/* ── Manage Modal ── */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: 420, padding: '28px 24px', background: '#091E11', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1.5px solid rgba(52,201,97,0.25)', color: 'var(--tx)' }}>
                        {/* User info */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#16520A,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                                    {selected.name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: 14, color: '#fff', margin: 0 }}>{selected.name}</p>
                                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{selected.email}</p>
                                    <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                                        <RoleBadge role={selected.role} />
                                        <TypeBadge userType={selected.userType} />
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}>✕</button>
                        </div>

                        {/* Change system role */}
                        <div style={{ marginBottom: 20 }}>
                            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontFamily: 'Montserrat,sans-serif' }}>
                                Change System Role
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                {['user', 'desh_manager', 'desh_reviewer', 'desh_assessor', 'admin'].map(r => {
                                    const cfg = ROLE_CFG[r] || { label: r, bg: 'rgba(255,255,255,0.05)', color: '#fff', border: 'rgba(255,255,255,0.1)' };
                                    const isActive = selected.role === r;
                                    return (
                                        <button key={r} onClick={() => changeRole(selected._id, r)} style={{
                                            padding: '8px 0', borderRadius: 12, fontSize: 12, fontWeight: 700,
                                            cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                                            border: `1.5px solid ${isActive ? cfg.border : 'rgba(255,255,255,0.08)'}`,
                                            background: isActive ? cfg.bg : 'rgba(255,255,255,0.02)',
                                            color: isActive ? cfg.color : 'rgba(255,255,255,0.45)',
                                        }}>{cfg.label}</button>
                                    );
                                })}
                            </div>
                        </div>

                        <button onClick={() => setSelected(null)} style={{
                            width: '100%', padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                            background: 'linear-gradient(135deg,var(--g700),var(--g500))', color: '#fff',
                            border: 'none', cursor: 'pointer',
                        }}>
                            Done
                        </button>
                    </div>
                </div>
            )}
        </Layout>
    );
}
