import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { LeafBadge } from '../../components/shared/LeafLogo.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function Projects() {
  const axiosSecure = useAxiosSecure();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosSecure.get('/projects')
      .then(res => setProjects(res.data.projects || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex items-start justify-between mb-8 fade-in-up">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>My Projects</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tx-muted)' }}>
            {projects.length} projects
          </p>
        </div>
        <Link to="/projects/new" className="btn-primary-green text-sm">+ New Project</Link>
      </div>

      <div className="relative mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="input-dark w-full pl-4 pr-4 py-3 text-sm max-w-md"
        />
      </div>

      {loading ? (
        <div className="text-center py-20">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <p className="text-4xl mb-3">🌱</p>
          <p className="font-semibold" style={{ color: "var(--tx)" }}>No projects found</p>
          <Link to="/projects/new" className="btn-primary-green mt-4 text-sm inline-flex">+ Start One</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p, i) => <ProjectCard key={p._id} project={p} delay={i * 0.07} />)}
          <Link to="/projects/new"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed min-h-48 transition-all hover:border-green-500/40"
            style={{ borderColor: 'var(--border-md)' }}>
            <span className="text-3xl" style={{ color: 'var(--tx-muted)' }}>+</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--tx-muted)' }}>New Project</p>
          </Link>
        </div>
      )}
    </Layout>
  );
}

function ProjectCard({ project: p, delay }) {
  const ringColor = {
    'Green Leaf': '#22C55E', 'Yellow Leaf': '#F8A514',
    'Orange Leaf': '#E2670C', 'Brown Leaf': '#97542A',
  }[p.leafLevel] || '#22C55E';

  return (
    <Link to={`/projects/${p._id}`}
      className="glass-card p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all block"
      style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 mr-3">
          <p className="font-bold text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>{p.title}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--tx-muted)' }}>
            Updated {new Date(p.updatedAt).toLocaleDateString()}
          </p>
        </div>
        {p.leafLevel && <LeafBadge level={p.leafLevel} />}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 64 64" width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="32" cy="32" r="26" fill="none" stroke={ringColor} strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - (p.scorePercent || 0) / 100)}`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold">{p.scorePercent || 0}%</span>
          </div>
        </div>
        <div className="flex-1">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${p.status === 'submitted' ? 'status-completed' : 'status-pending'
            }`}>
            {p.status === 'submitted' ? '✓ Submitted' : '◌ Draft'}
          </span>
        </div>
      </div>
    </Link>
  );
}