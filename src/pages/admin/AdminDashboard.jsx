import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { LeafBadge } from '../../components/shared/LeafLogo.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function AdminDashboard() {
  const axiosSecure = useAxiosSecure();
  const [stats, setStats] = useState({ users: 0, projects: 0, tabs: 0, modules: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [leafDist, setLeafDist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axiosSecure.get('/users'),
      axiosSecure.get('/submissions'),
      axiosSecure.get('/tabs'),
      axiosSecure.get('/activity'),
    ]).then(([usersRes, subRes, tabsRes, actRes]) => {
      const users = usersRes.data.users || [];
      const projects = subRes.data.projects || [];
      const tabs = tabsRes.data.tabs || [];

      setStats({
        users: users.length,
        projects: projects.length,
        tabs: tabs.length,
        modules: tabs.reduce((s, t) => s + (t.moduleCount || 0), 0),
      });
      setSubmissions(projects.slice(0, 5));
      setActivity(actRes.data.logs || []);

      // Leaf distribution
      const dist = {};
      projects.forEach(p => {
        const lvl = p.adminOverride || p.leafLevel;
        if (lvl) dist[lvl] = (dist[lvl] || 0) + 1;
      });
      const colors = {
        'Green Leaf': { color: 'var(--g500)', from: '#16520A', to: '#22C55E' },
        'Yellow Leaf': { color: '#F8A514', from: '#F8A514', to: '#C57D0A' },
        'Orange Leaf': { color: '#E2670C', from: '#E2670C', to: '#B5520A' },
        'Brown Leaf': { color: '#97542A', from: '#97542A', to: '#6B3A1F' },
      };
      setLeafDist(Object.entries(dist).map(([level, count]) => ({ level, count, ...colors[level] })));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = leafDist.reduce((a, l) => a + l.count, 0);

  return (
    <Layout isAdmin>
      <div className="mb-8 fade-in-up">
        <p className="text-sm" style={{ color: 'var(--tx-muted)' }}>Admin Panel</p>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats.users, icon: '◉', color: 'var(--g500)' },
          { label: 'Projects', value: stats.projects, icon: '◫', color: 'var(--g600)' },
          { label: 'Tabs', value: stats.tabs, icon: '⬡', color: '#F8A514' },
          { label: 'Modules', value: stats.modules, icon: '◈', color: '#E2670C' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 text-base"
              style={{ background: `${s.color}15`, color: s.color }}>{s.icon}</div>
            <p className="text-xl font-bold">{loading ? '...' : s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tx-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-6 mb-6">
        {/* Recent submissions */}
        <div className="xl:col-span-2 glass-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-md)' }}>
            <h2 className="font-bold" style={{ color: "var(--tx)" }}>Recent Submissions</h2>
            <Link to="/admin/submissions" className="text-xs font-semibold" style={{ color: 'var(--g600)' }}>View all →</Link>
          </div>
          {loading ? (
            <p className="text-center py-8">Loading...</p>
          ) : (
            <table className="premium-table">
              <thead><tr><th>Project</th><th>User</th><th>Level</th><th>Score</th><th>Date</th></tr></thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s._id}>
                    <td className="font-semibold text-sm" style={{ color: "var(--tx)" }}>{s.title}</td>
                    <td>
                      <p className="text-xs font-semibold">{s.userId?.name || '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--tx-muted)' }}>{s.userId?.email}</p>
                    </td>
                    <td>{(s.adminOverride || s.leafLevel) ? <LeafBadge level={s.adminOverride || s.leafLevel} /> : '—'}</td>
                    <td className="font-bold text-sm">{s.scorePercent || 0}%</td>
                    <td className="text-xs">{new Date(s.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {submissions.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8" style={{ color: 'var(--tx-muted)' }}>No submissions yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Leaf distribution */}
          <div className="glass-card p-5">
            <h3 className="font-bold mb-4">🍃 Leaf Distribution</h3>
            {leafDist.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--tx-muted)' }}>No data yet</p>
            ) : (
              <div className="space-y-3">
                {leafDist.map(l => {
                  const pct = Math.round((l.count / total) * 100);
                  return (
                    <div key={l.level}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                          <span className="text-xs font-semibold">{l.level}</span>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--tx-muted)' }}>{l.count} ({pct}%)</span>
                      </div>
                      <div className="progress-leaf">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: l.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="glass-card p-5">
            <h3 className="font-bold mb-4">⚡ Activity Log</h3>
            <div className="space-y-3">
              {activity.slice(0, 5).map((a, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${a.actorType === 'admin' ? 'bg-orange-500/15 text-orange-400' : 'status-completed'
                    }`}>{a.actorType}</span>
                  <div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--tx-muted)' }}>{a.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--tx-muted)' }}>
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && <p className="text-xs text-center" style={{ color: 'var(--tx-muted)' }}>No activity yet</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Submissions', icon: '◫', to: '/admin/submissions', color: 'var(--g500)' },
          { label: 'Tabs & Modules', icon: '◈', to: '/admin/tabs', color: '#F8A514' },
          { label: 'Leaf Levels', icon: '⬡', to: '/admin/leaf-levels', color: 'var(--g600)' },
          { label: 'Users', icon: '◉', to: '/admin/users', color: '#E2670C' },
        ].map(card => (
          <Link key={card.to} to={card.to}
            className="glass-card p-5 flex flex-col gap-3 hover:-translate-y-1 transition-all block">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${card.color}15`, color: card.color }}>{card.icon}</div>
            <p className="font-bold text-sm">{card.label}</p>
          </Link>
        ))}
      </div>
    </Layout>
  );
}