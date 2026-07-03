import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const PAGE_SIZES = [10, 25, 50, 100];

function IconChevronLeft() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}
function IconChevronRight() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

function PaginationBar({ pagination, onPageChange, onLimitChange }) {
    if (!pagination || pagination.totalPages <= 0) return null;
    const { page, totalPages, total, limit, hasNext, hasPrev } = pagination;

    const pages = [];
    const delta = 2;
    const left  = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);
    if (left > 1)           { pages.push(1); if (left > 2) pages.push('...'); }
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages) { if (right < totalPages - 1) pages.push('...'); pages.push(totalPages); }

    const btnBase = {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 32, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 700,
        cursor: 'pointer', border: '1.5px solid var(--border-md)',
        background: 'transparent', color: 'var(--tx-muted)',
        transition: 'all 0.15s', fontFamily: 'Montserrat,sans-serif',
    };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 10, marginTop: 16, padding: '10px 4px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--tx-muted)' }}>
                <span>
                    Showing{' '}
                    <b style={{ color: 'var(--tx)' }}>{Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)}</b>
                    {' '}of{' '}
                    <b style={{ color: 'var(--tx)' }}>{total}</b> users
                </span>
                <span style={{ color: 'var(--border-md)' }}>|</span>
                <span>Rows per page:</span>
                <select
                    value={limit}
                    onChange={e => onLimitChange(Number(e.target.value))}
                    className="input-dark"
                    style={{ padding: '2px 8px', borderRadius: 7, fontSize: 12, height: 28 }}
                >
                    {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!hasPrev}
                    style={{ ...btnBase, opacity: hasPrev ? 1 : 0.35, cursor: hasPrev ? 'pointer' : 'not-allowed' }}
                >
                    <IconChevronLeft />
                </button>
                {pages.map((p, i) =>
                    p === '...'
                        ? <span key={`e${i}`} style={{ padding: '0 4px', fontSize: 13, color: 'var(--tx-faint)' }}>…</span>
                        : (
                            <button
                                key={p}
                                onClick={() => onPageChange(p)}
                                style={{
                                    ...btnBase,
                                    background:  p === page ? 'var(--g600)'                    : 'transparent',
                                    color:       p === page ? '#fff'                             : 'var(--tx-muted)',
                                    borderColor: p === page ? 'var(--g600)'                    : 'var(--border-md)',
                                    boxShadow:   p === page ? '0 2px 8px rgba(34,168,75,0.3)' : 'none',
                                }}
                            >
                                {p}
                            </button>
                        )
                )}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!hasNext}
                    style={{ ...btnBase, opacity: hasNext ? 1 : 0.35, cursor: hasNext ? 'pointer' : 'not-allowed' }}
                >
                    <IconChevronRight />
                </button>
            </div>
        </div>
    );
}

const ROLE_CFG = {
    admin:         { label: 'DESH Admin',        bg: 'rgba(249,115,22,0.15)', color: '#FB923C', border: 'rgba(249,115,22,0.3)' },
    desh_manager:  { label: 'DESH Manager',      bg: 'rgba(14,165,233,0.15)', color: '#38BDF8', border: 'rgba(14,165,233,0.3)' },
    desh_reviewer: { label: 'DESH Reviewer',     bg: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: 'rgba(139,92,246,0.3)' },
    desh_assessor: { label: 'DESH Assessor',     bg: 'rgba(59,130,246,0.15)', color: '#93C5FD', border: 'rgba(59,130,246,0.3)' },
    user:          { label: 'DESH Professional', bg: 'rgba(34,168,75,0.15)',  color: '#4ADE80', border: 'rgba(34,168,75,0.3)' },
};

const TYPE_CFG = {
    student:      { label: 'Student',        bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    professional: { label: 'Professional',   bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
    owner:        { label: 'Building Owner', bg: '#FEF9C3', color: '#92400E', border: '#FDE68A' },
    architect:    { label: 'Architect',      bg: '#FDF4FF', color: '#7E22CE', border: '#E9D5FF' },
    engineer:     { label: 'Engineer',       bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
    researcher:   { label: 'Researcher',     bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
    other:        { label: 'Other',          bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
};

// ── Normalise user.roles from backend (supports both legacy `role` and new `roles`) ──
function getUserRoles(u) {
    if (Array.isArray(u.roles) && u.roles.length > 0) return u.roles;
    if (u.role) return [u.role];
    return ['user'];
}

function RoleBadge({ role }) {
    const cfg = ROLE_CFG[role] || ROLE_CFG.user;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 99,
            fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.border}`, fontFamily: 'Montserrat,sans-serif',
            whiteSpace: 'nowrap',
        }}>{cfg.label}</span>
    );
}

function RoleBadges({ roles }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {roles.map(r => <RoleBadge key={r} role={r} />)}
        </div>
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

// ── Multi-role tile component ─────────────────────────────────────────────────
function RoleTile({ roleKey, cfg, isSelected, onToggle }) {
    return (
        <button
            onClick={() => onToggle(roleKey)}
            style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.18s', textAlign: 'left',
                border: `1.5px solid ${isSelected ? cfg.border : 'rgba(255,255,255,0.08)'}`,
                background: isSelected ? cfg.bg : 'rgba(255,255,255,0.02)',
                color: isSelected ? cfg.color : 'rgba(255,255,255,0.45)',
                boxShadow: isSelected ? `0 0 12px ${cfg.bg}` : 'none',
            }}
        >
            {/* Checkbox indicator */}
            <span style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${isSelected ? cfg.color : 'rgba(255,255,255,0.2)'}`,
                background: isSelected ? cfg.color : 'transparent',
                fontSize: 11, color: '#fff',
                transition: 'all 0.15s',
            }}>
                {isSelected && '✓'}
            </span>
            {cfg.label}
        </button>
    );
}

const ROLE_OPTIONS = ['user', 'desh_manager', 'desh_reviewer', 'desh_assessor', 'admin'];

export default function Users() {
    const axiosSecure = useAxiosSecure();
    const [users,      setUsers]      = useState([]);
    const [pagination, setPagination] = useState(null);
    const [search,     setSearch]     = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selected,   setSelected]   = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [page,       setPage]       = useState(1);
    const [limit,      setLimit]      = useState(10);

    // Modal state: pending role selections (not yet saved)
    const [pendingRoles, setPendingRoles] = useState([]);
    const [saving,       setSaving]       = useState(false);

    const fetchUsers = useCallback((overrides = {}) => {
        const p  = overrides.page   ?? page;
        const l  = overrides.limit  ?? limit;
        const s  = overrides.search !== undefined ? overrides.search : search;
        const rf = overrides.role   !== undefined ? overrides.role   : roleFilter;

        const params = new URLSearchParams({ page: p, limit: l });
        if (s && s.trim())   params.set('search', s);
        if (rf !== 'all')    params.set('role',   rf);

        setLoading(true);
        axiosSecure.get(`/users?${params.toString()}`)
            .then(res => {
                const received = res.data.users      || [];
                const pg       = res.data.pagination || null;
                setUsers(received);
                setPagination(pg);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [page, limit, search, roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchUsers(); }, [page, limit]); // eslint-disable-line react-hooks/exhaustive-deps

    // Open modal: initialise pending roles from current user's roles
    const openManageModal = (u) => {
        setSelected(u);
        setPendingRoles([...getUserRoles(u)]);
    };

    // Toggle a role in pendingRoles
    const togglePendingRole = (role) => {
        setPendingRoles(prev => {
            if (prev.includes(role)) {
                // Prevent de-selecting last role
                if (prev.length === 1) return prev;
                return prev.filter(r => r !== role);
            }
            return [...prev, role];
        });
    };

    // Client-side type filter
    const filtered = users.filter(u => {
        const matchType = typeFilter === 'all' || u.userType === typeFilter;
        return matchType;
    });

    const handleSearch = (val) => {
        setSearch(val);
        setPage(1);
        fetchUsers({ search: val, page: 1 });
    };

    const handleRoleFilter = (val) => {
        setRoleFilter(val);
        setPage(1);
        fetchUsers({ role: val, page: 1 });
    };

    const handlePageChange  = (p) => { setPage(p); };
    const handleLimitChange = (l) => { setLimit(l); setPage(1); };

    const deleteUser = async (id, name) => {
        if (!window.confirm(`Delete ${name}?`)) return;
        try {
            await axiosSecure.delete(`/users/${id}`);
            toast.success('Account deleted');
            fetchUsers();
        } catch { toast.error('Failed to delete'); }
    };

    // Save pending roles to server
    const saveRoles = async () => {
        if (!selected || saving) return;
        setSaving(true);
        try {
            const res = await axiosSecure.patch(`/users/${selected._id}/roles`, { roles: pendingRoles });
            const updated = res.data.user;
            toast.success(`Roles updated: ${pendingRoles.map(r => ROLE_CFG[r]?.label || r).join(', ')}`);
            fetchUsers();
            // Update selected state with server response (includes auto-corrected activeRole)
            setSelected(prev => prev ? {
                ...prev,
                roles:      updated.roles      || pendingRoles,
                activeRole: updated.activeRole || prev.activeRole,
            } : null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update roles');
        } finally {
            setSaving(false);
        }
    };

    const exportCSV = () => {
        const rows = [['#', 'Name', 'Email', 'System Roles', 'User Type', 'Joined']];
        filtered.forEach((u, i) => rows.push([
            i + 1,
            `"${u.name}"`,
            u.email,
            `"${getUserRoles(u).join('; ')}"`,
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

    const total = pagination?.total ?? users.length;
    const countByRole = (r) => users.filter(u => getUserRoles(u).includes(r)).length;
    const countByType = (t) => users.filter(u => u.userType === t).length;

    const ROLE_FILTERS = [
        { key: 'all',           label: 'All',              count: total },
        { key: 'user',          label: 'DESH Professional', count: countByRole('user') },
        { key: 'desh_manager',  label: 'DESH Manager',      count: countByRole('desh_manager') },
        { key: 'desh_reviewer', label: 'DESH Reviewer',     count: countByRole('desh_reviewer') },
        { key: 'desh_assessor', label: 'DESH Assessor',     count: countByRole('desh_assessor') },
        { key: 'admin',         label: 'DESH Admin',        count: countByRole('admin') },
    ];

    const TYPE_FILTERS = [
        { key: 'all',          label: 'All Types',      count: filtered.length },
        { key: 'student',      label: 'Student',        count: countByType('student') },
        { key: 'professional', label: 'Professional',   count: countByType('professional') },
        { key: 'owner',        label: 'Building Owner', count: countByType('owner') },
        { key: 'architect',    label: 'Architect',      count: countByType('architect') },
        { key: 'engineer',     label: 'Engineer',       count: countByType('engineer') },
        { key: 'researcher',   label: 'Researcher',     count: countByType('researcher') },
        { key: 'other',        label: 'Other',          count: countByType('other') },
    ];

    // Check if pending roles differ from current roles
    const selectedRoles = selected ? getUserRoles(selected) : [];
    const rolesChanged = selected
        ? JSON.stringify([...pendingRoles].sort()) !== JSON.stringify([...selectedRoles].sort())
        : false;

    return (
        <Layout isAdmin>
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }} className="fade-in-up">
                <div>
                    <h1 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 26, color: 'var(--tx)', margin: 0 }}>Users</h1>
                    <p style={{ fontSize: 13, color: 'var(--tx-muted)', marginTop: 4 }}>
                        {pagination
                            ? <>Showing <b style={{ color: 'var(--tx)' }}>{filtered.length}</b> of <b style={{ color: 'var(--tx)' }}>{pagination.total}</b> total users (page {pagination.page}/{pagination.totalPages || 1})</>
                            : 'Loading…'}
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
                <input value={search} onChange={e => handleSearch(e.target.value)}
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
                        <button key={f.key} onClick={() => handleRoleFilter(f.key)} style={{
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
                                <th>System Roles</th>
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
                                            #{((pagination?.page ?? 1) - 1) * (pagination?.limit ?? limit) + i + 1}
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
                                    <td>
                                        <RoleBadges roles={getUserRoles(u)} />
                                    </td>
                                    <td><TypeBadge userType={u.userType} /></td>
                                    <td style={{ fontSize: 12, color: 'var(--tx-muted)' }}>
                                        {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button onClick={() => openManageModal(u)} style={{
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

            {/* ── Pagination bar ── */}
            {!loading && pagination && (
                <PaginationBar
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                />
            )}

            {/* ── Manage Modal ── */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: 460, padding: '28px 24px', background: '#091E11', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1.5px solid rgba(52,201,97,0.25)', color: 'var(--tx)' }}>

                        {/* User info */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#16520A,#22C55E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                                    {selected.name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: 14, color: '#fff', margin: 0 }}>{selected.name}</p>
                                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{selected.email}</p>
                                    {/* Show ALL current roles as badges */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                                        {getUserRoles(selected).map(r => <RoleBadge key={r} role={r} />)}
                                        <TypeBadge userType={selected.userType} />
                                    </div>
                                    {/* Show current active role */}
                                    {selected.activeRole && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                            <span style={{
                                                fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
                                                textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
                                                fontFamily: 'Montserrat,sans-serif',
                                            }}>Active Role</span>
                                            <span style={{
                                                fontSize: 10.5, fontWeight: 700, color: 'rgba(52,201,97,0.8)',
                                                padding: '2px 9px', borderRadius: 99,
                                                background: 'rgba(52,201,97,0.1)', border: '1px solid rgba(52,201,97,0.25)',
                                                fontFamily: 'Montserrat,sans-serif',
                                            }}>
                                                {ROLE_CFG[selected.activeRole]?.label || selected.activeRole}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}>✕</button>
                        </div>

                        {/* Assign System Roles — multi-select */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: 0, fontFamily: 'Montserrat,sans-serif' }}>
                                    Assign System Roles
                                </p>
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                                    Select one or more
                                </span>
                            </div>

                            {/* Role tiles – multi-select checkboxes */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                {ROLE_OPTIONS.map(r => {
                                    const cfg = ROLE_CFG[r] || { label: r, bg: 'rgba(255,255,255,0.05)', color: '#fff', border: 'rgba(255,255,255,0.1)' };
                                    return (
                                        <RoleTile
                                            key={r}
                                            roleKey={r}
                                            cfg={cfg}
                                            isSelected={pendingRoles.includes(r)}
                                            onToggle={togglePendingRole}
                                        />
                                    );
                                })}
                            </div>

                            {/* Pending summary */}
                            {rolesChanged && (
                                <div style={{
                                    marginTop: 12, padding: '8px 12px', borderRadius: 10,
                                    background: 'rgba(52,201,97,0.08)', border: '1px solid rgba(52,201,97,0.2)',
                                    fontSize: 11, color: 'rgba(52,201,97,0.9)',
                                }}>
                                    <b>New roles:</b>{' '}
                                    {pendingRoles.map(r => ROLE_CFG[r]?.label || r).join(', ')}
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={saveRoles}
                                disabled={saving || !rolesChanged}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                                    background: rolesChanged
                                        ? 'linear-gradient(135deg,var(--g700),var(--g500))'
                                        : 'rgba(255,255,255,0.06)',
                                    color: rolesChanged ? '#fff' : 'rgba(255,255,255,0.3)',
                                    border: 'none', cursor: rolesChanged ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {saving ? 'Saving…' : rolesChanged ? '✓ Save Roles' : 'No Changes'}
                            </button>
                            <button
                                onClick={() => setSelected(null)}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                                    background: 'rgba(255,255,255,0.06)',
                                    color: 'rgba(255,255,255,0.7)',
                                    border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                                }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
