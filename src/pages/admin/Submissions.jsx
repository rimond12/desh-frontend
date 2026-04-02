import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import { LeafBadge } from '../../components/shared/LeafLogo.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const LEVELS = ['All', 'Green Leaf', 'Yellow Leaf', 'Orange Leaf', 'Brown Leaf'];

export default function Submissions() {
  const axiosSecure = useAxiosSecure();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [override, setOverride] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = () => {
    axiosSecure.get('/submissions')
      .then(res => setProjects(res.data.projects || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSubmissions(); }, []);

  const openSelected = (s) => {
    setSelected(s);
    setOverride(s.adminOverride || s.leafLevel || '');
    setAdminNote('');
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await axiosSecure.patch(`/submissions/${selected._id}`, {
        adminOverride: override,
        adminNote: adminNote || undefined,
      });
      toast.success('Changes saved!');
      setSelected(null);
      fetchSubmissions();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const filtered = projects.filter(s =>
    (search === '' || s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.userId?.name?.toLowerCase().includes(search.toLowerCase())) &&
    (levelFilter === 'All' || (s.adminOverride || s.leafLevel) === levelFilter)
  );

  const exportCSV = () => {
    const rows = [['Title', 'User', 'Email', 'Score', 'Level', 'Date']];
    filtered.forEach(s => rows.push([
      s.title, s.userId?.name, s.userId?.email,
      `${s.scorePercent || 0}%`, s.adminOverride || s.leafLevel || '—',
      new Date(s.updatedAt).toLocaleDateString()
    ]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = 'submissions.csv'; a.click();
    toast.success('CSV exported!');
  };

  return (
    <Layout isAdmin>
      <div className="mb-8 fade-in-up">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Submissions</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(232,245,233,0.4)' }}>{filtered.length} of {projects.length} projects</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search projects or users..."
          className="input-dark pl-4 pr-4 py-2.5 text-sm w-56" />
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
          className="input-dark px-3 py-2.5 text-sm">
          {LEVELS.map(l => <option key={l}>{l}</option>)}
        </select>
        <button onClick={exportCSV}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold"
          style={{ borderColor: 'rgba(34,197,94,0.15)', color: '#4ADE80', background: 'rgba(34,197,94,0.06)' }}>
          ↓ Export CSV
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? <p className="text-center py-8 text-white">Loading...</p> : (
          <table className="premium-table">
            <thead>
              <tr><th>Project</th><th>User</th><th>Level</th><th>Score</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12" style={{ color: 'rgba(232,245,233,0.4)' }}>No submissions found</td></tr>
              ) : filtered.map(s => {
                const level = s.adminOverride || s.leafLevel;
                return (
                  <tr key={s._id}>
                    <td className="font-semibold text-white text-sm">{s.title}</td>
                    <td>
                      <p className="text-xs font-semibold text-white">{s.userId?.name || '—'}</p>
                      <p className="text-xs" style={{ color: 'rgba(232,245,233,0.3)' }}>{s.userId?.email}</p>
                    </td>
                    <td>{level ? <LeafBadge level={level} /> : '—'}</td>
                    <td className="font-bold text-white">{s.scorePercent || 0}%</td>
                    <td className="text-xs">{new Date(s.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => openSelected(s)}
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{ color: 'rgba(232,245,233,0.5)', background: 'rgba(34,197,94,0.06)' }}>
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 fade-in-up">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-bold text-white text-lg">{selected.title}</h2>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(232,245,233,0.4)' }}>by {selected.userId?.name}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: 'rgba(232,245,233,0.4)' }}>✕</button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)' }}>
                <div>
                  <p className="text-xs" style={{ color: 'rgba(232,245,233,0.4)' }}>Score</p>
                  <p className="text-2xl font-bold text-white">{selected.scorePercent || 0}%</p>
                </div>
                {(selected.adminOverride || selected.leafLevel) &&
                  <LeafBadge level={selected.adminOverride || selected.leafLevel} />}
              </div>

              {/* User notes */}
              {selected.notes?.filter(n => n.senderRole === 'user').length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(232,245,233,0.4)', letterSpacing: '0.06em' }}>USER NOTES</p>
                  <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.06)', color: 'rgba(232,245,233,0.7)' }}>
                    {selected.notes.filter(n => n.senderRole === 'user').slice(-1)[0]?.message}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(232,245,233,0.4)', letterSpacing: '0.06em' }}>
                  OVERRIDE LEAF LEVEL
                </label>
                <select value={override} onChange={e => setOverride(e.target.value)}
                  className="input-dark px-3 py-2.5 text-sm w-full">
                  <option value="">— No override —</option>
                  {LEVELS.slice(1).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(232,245,233,0.4)', letterSpacing: '0.06em' }}>
                  ADD ADMIN NOTE
                </label>
                <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                  placeholder="Add note to user..." rows={3}
                  className="input-dark w-full px-4 py-3 text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveChanges} disabled={saving} className="btn-primary-green flex-1 justify-center text-sm">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setSelected(null)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
                  style={{ borderColor: 'rgba(34,197,94,0.15)', color: 'rgba(232,245,233,0.5)' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}