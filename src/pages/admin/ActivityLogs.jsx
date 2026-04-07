import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const actionColors = {
    CREATE_PROJECT: { bg: 'rgba(34,197,94,0.1)', text: '#4ADE80' },
    SUBMIT_PROJECT: { bg: 'rgba(34,197,94,0.15)', text: '#22C55E' },
    UPLOAD_DOC: { bg: 'rgba(248,165,20,0.1)', text: '#F8A514' },
    OVERRIDE_LEVEL: { bg: 'rgba(226,103,12,0.1)', text: '#E2670C' },
    ADD_MODULE: { bg: 'rgba(74,222,128,0.1)', text: '#4ADE80' },
    DELETE_USER: { bg: 'rgba(239,68,68,0.1)', text: '#F87171' },
    SAVE_RESPONSES: { bg: 'rgba(34,197,94,0.08)', text: '#86EFAC' },
    UPDATE_SETTINGS: { bg: 'rgba(151,84,42,0.1)', text: '#97542A' },
    REGISTER: { bg: 'rgba(34,197,94,0.1)', text: '#4ADE80' },
};

export default function ActivityLogs() {
    const axiosSecure = useAxiosSecure();
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosSecure.get('/activity')
            .then(res => setLogs(res.data.logs || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = logs.filter(l => filter === 'all' ? true : l.actorType === filter);

    return (
        <Layout isAdmin>
            <div className="mb-8 fade-in-up">
                <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Activity Logs</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>{filtered.length} entries</p>
            </div>

            <div className="flex gap-2 mb-6">
                {['all', 'user', 'admin'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
                        style={{
                            background: filter === f ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)',
                            color: filter === f ? '#4ADE80' : 'var(--tx-muted)',
                            border: `1px solid ${filter === f ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        }}>
                        {f === 'all' ? '⊞ All' : f === 'user' ? '◉ Users' : '⚙ Admin'}
                    </button>
                ))}
            </div>

            <div className="glass-card overflow-hidden">
                {loading ? <p className="text-center py-8">Loading...</p> : (
                    <div className="divide-y" style={{ borderColor: 'var(--border-md)' }}>
                        {filtered.length === 0 ? (
                            <p className="text-center py-12" style={{ color: 'var(--tx-muted)' }}>No logs yet</p>
                        ) : filtered.map((log, i) => {
                            const ac = actionColors[log.action] || { bg: 'rgba(255,255,255,0.05)', text: 'var(--tx-muted)' };
                            return (
                                <div key={log._id || i} className="flex items-start gap-4 px-5 py-4">
                                    <div className="flex flex-col items-center flex-shrink-0 mt-1">
                                        <div className="w-2 h-2 rounded-full" style={{ background: log.actorType === 'admin' ? '#E2670C' : '#22C55E' }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${log.actorType === 'admin' ? 'bg-orange-500/15 text-orange-400' : 'status-completed'
                                                }`}>{log.actorType}</span>
                                            {log.action && (
                                                <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold"
                                                    style={{ background: ac.bg, color: ac.text }}>{log.action}</span>
                                            )}
                                        </div>
                                        <p className="text-sm" style={{ color: 'var(--tx-muted)' }}>{log.description}</p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--tx-muted)' }}>
                                            {new Date(log.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
}