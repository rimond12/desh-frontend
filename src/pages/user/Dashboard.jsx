// src/pages/user/Dashboard.js
// import { useAuth } from '../../context/AuthContext.jsx';
// import { Link } from 'react-router-dom';
// import Layout from '../../components/shared/Layout.jsx';
// import { LeafBadge } from '../../components/shared/LeafLogo.jsx';

// // Mock data — replace with real API calls to your Express/MongoDB backend
// const mockStats = {
//   totalProjects: 4,
//   completed: 2,
//   avgScore: 72,
//   bestLevel: 'Yellow Leaf',
// };

// const mockProjects = [
//   { id: 1, title: 'Green Residence Phase 1', score: 84, level: 'Green Leaf', updatedAt: '2025-03-20', status: 'completed' },
//   { id: 2, title: 'Eco Office Complex', score: 67, level: 'Yellow Leaf', updatedAt: '2025-03-18', status: 'in_progress' },
//   { id: 3, title: 'Urban Garden Tower', score: 42, level: 'Orange Leaf', updatedAt: '2025-03-10', status: 'in_progress' },
// ];

// export default function UserDashboard() {
//   const { user } = useAuth();
//   const hour = new Date().getHours();
//   const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

//   return (
//     <Layout>
//       {/* Header */}
//       <div className="mb-8 fade-in-up">
//         <p className="text-sm mb-1" style={{ color: 'rgba(232,245,233,0.4)' }}>{greeting},</p>
//         <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
//           {user?.displayName || 'Welcome Back'} 👋
//         </h1>
//         <p className="text-sm mt-1" style={{ color: 'rgba(232,245,233,0.35)' }}>
//           Here's your green building assessment overview
//         </p>
//       </div>

//       {/* Stats */}
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
//         {[
//           { label: 'Total Projects', value: mockStats.totalProjects, icon: '◫', color: '#22C55E' },
//           { label: 'Completed', value: mockStats.completed, icon: '✓', color: '#4ADE80' },
//           { label: 'Avg. Score', value: `${mockStats.avgScore}%`, icon: '◎', color: '#F8A514' },
//           { label: 'Best Level', value: mockStats.bestLevel, icon: '⬡', color: '#16520A', small: true },
//         ].map((s, i) => (
//           <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.1}s` }}>
//             <div className="flex items-start justify-between mb-3">
//               <span className="text-2xl" style={{ color: s.color }}>{s.icon}</span>
//               <div className="w-8 h-8 rounded-lg flex items-center justify-center"
//                 style={{ background: `${s.color}15` }}>
//                 <div className="w-2 h-2 rounded-full pulse-green" style={{ background: s.color }} />
//               </div>
//             </div>
//             <p className={`font-bold text-white ${s.small ? 'text-base' : 'text-2xl'}`}
//               style={{ fontFamily: 'Syne, sans-serif' }}>
//               {s.value}
//             </p>
//             <p className="text-xs mt-1" style={{ color: 'rgba(232,245,233,0.4)' }}>{s.label}</p>
//           </div>
//         ))}
//       </div>

//       {/* Projects + Quick Actions */}
//       <div className="grid lg:grid-cols-3 gap-6">
//         {/* Recent Projects */}
//         <div className="lg:col-span-2">
//           <div className="flex items-center justify-between mb-4">
//             <h2 className="font-bold text-white text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>
//               Recent Projects
//             </h2>
//             <Link to="/projects" className="text-xs font-semibold"
//               style={{ color: '#4ADE80' }}>
//               View all →
//             </Link>
//           </div>
//           <div className="glass-card overflow-hidden">
//             {mockProjects.length === 0 ? (
//               <div className="text-center py-12">
//                 <p className="text-4xl mb-3">🌱</p>
//                 <p className="text-white font-semibold">No projects yet</p>
//                 <p className="text-sm mt-1 mb-4" style={{ color: 'rgba(232,245,233,0.4)' }}>Start your first assessment</p>
//                 <Link to="/projects/new" className="btn-primary-green text-sm">+ New Project</Link>
//               </div>
//             ) : (
//               <table className="premium-table">
//                 <thead>
//                   <tr>
//                     <th>Project</th>
//                     <th>Level</th>
//                     <th>Score</th>
//                     <th>Updated</th>
//                     <th></th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {mockProjects.map((p) => (
//                     <tr key={p.id}>
//                       <td>
//                         <p className="font-semibold text-white text-sm">{p.title}</p>
//                         <span className={`text-xs px-2 py-0.5 rounded-full ${
//                           p.status === 'completed'
//                             ? 'bg-green-500/10 text-green-400'
//                             : 'bg-yellow-500/10 text-yellow-400'
//                         }`}>
//                           {p.status === 'completed' ? 'Completed' : 'In Progress'}
//                         </span>
//                       </td>
//                       <td><LeafBadge level={p.level} /></td>
//                       <td>
//                         <div className="flex items-center gap-2">
//                           <div className="progress-leaf w-16">
//                             <div className="progress-leaf-fill" style={{ width: `${p.score}%` }} />
//                           </div>
//                           <span className="text-sm text-white font-semibold">{p.score}%</span>
//                         </div>
//                       </td>
//                       <td className="text-xs">{p.updatedAt}</td>
//                       <td>
//                         <Link to={`/projects/${p.id}`}
//                           className="text-xs font-semibold hover:text-green-400 transition-colors"
//                           style={{ color: 'rgba(232,245,233,0.4)' }}>
//                           Open →
//                         </Link>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             )}
//           </div>
//         </div>

//         {/* Right panel */}
//         <div className="space-y-4">
//           {/* Quick actions */}
//           <div>
//             <h2 className="font-bold text-white text-lg mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
//               Quick Actions
//             </h2>
//             <div className="space-y-2">
//               <Link to="/projects/new"
//                 className="flex items-center gap-3 p-4 rounded-xl border transition-all group"
//                 style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.15)' }}>
//                 <div className="w-10 h-10 rounded-lg flex items-center justify-center"
//                   style={{ background: 'linear-gradient(135deg, #16520A, #22C55E)' }}>
//                   <span className="text-white text-lg">＋</span>
//                 </div>
//                 <div>
//                   <p className="text-sm font-semibold text-white">New Project</p>
//                   <p className="text-xs" style={{ color: 'rgba(232,245,233,0.4)' }}>Start an assessment</p>
//                 </div>
//               </Link>
//               <Link to="/manual"
//                 className="flex items-center gap-3 p-4 rounded-xl border transition-all"
//                 style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(34,197,94,0.08)' }}>
//                 <div className="w-10 h-10 rounded-lg flex items-center justify-center"
//                   style={{ background: 'rgba(248,165,20,0.15)' }}>
//                   <span style={{ color: '#F8A514' }}>📖</span>
//                 </div>
//                 <div>
//                   <p className="text-sm font-semibold text-white">User Manual</p>
//                   <p className="text-xs" style={{ color: 'rgba(232,245,233,0.4)' }}>Learn how it works</p>
//                 </div>
//               </Link>
//             </div>
//           </div>

//           {/* Leaf legend */}
//           <div className="glass-card p-5">
//             <h3 className="font-bold text-white text-sm mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
//               🍃 Leaf Level Guide
//             </h3>
//             {[
//               { name: 'Green Leaf', range: '80–100%', from: '#16520A', to: '#22C55E' },
//               { name: 'Yellow Leaf', range: '60–79%', from: '#F8A514', to: '#C57D0A' },
//               { name: 'Orange Leaf', range: '40–59%', from: '#E2670C', to: '#B5520A' },
//               { name: 'Brown Leaf', range: '20–39%', from: '#97542A', to: '#6B3A1F' },
//             ].map((l) => (
//               <div key={l.name} className="flex items-center justify-between py-2 border-b last:border-0"
//                 style={{ borderColor: 'rgba(34,197,94,0.06)' }}>
//                 <div className="flex items-center gap-2">
//                   <div className="w-3 h-3 rounded-full"
//                     style={{ background: `linear-gradient(135deg, ${l.from}, ${l.to})` }} />
//                   <span className="text-xs font-semibold text-white">{l.name}</span>
//                 </div>
//                 <span className="text-xs" style={{ color: 'rgba(232,245,233,0.4)' }}>{l.range}</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </Layout>
//   );
// }

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { LeafBadge } from '../../components/shared/LeafLogo.jsx';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function UserDashboard() {
  const { user } = useAuth();
  const axiosSecure = useAxiosSecure();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    axiosSecure.get('/projects')
      .then(res => setProjects(res.data.projects || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: projects.length,
    submitted: projects.filter(p => p.status === 'submitted').length,
    avg: projects.length
      ? Math.round(projects.reduce((s, p) => s + (p.scorePercent || 0), 0) / projects.length)
      : 0,
    best: projects.reduce((best, p) =>
      (p.scorePercent || 0) > (best.scorePercent || 0) ? p : best, {}
    ).leafLevel || '—',
  };

  return (
    <Layout>
      <div className="mb-8 fade-in-up">
        <p className="text-sm mb-1" style={{ color: 'rgba(232,245,233,0.4)' }}>{greeting},</p>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
          {user?.displayName || 'Welcome Back'} 👋
        </h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Projects', value: stats.total, icon: '◫', color: '#22C55E' },
          { label: 'Submitted', value: stats.submitted, icon: '✓', color: '#4ADE80' },
          { label: 'Avg. Score', value: `${stats.avg}%`, icon: '◎', color: '#F8A514' },
          { label: 'Best Level', value: stats.best, icon: '⬡', color: '#16520A', small: true },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <p className={`font-bold text-white ${s.small ? 'text-base' : 'text-2xl'}`}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(232,245,233,0.4)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white text-lg">Recent Projects</h2>
            <Link to="/projects" className="text-xs font-semibold" style={{ color: '#4ADE80' }}>View all →</Link>
          </div>
          <div className="glass-card overflow-hidden">
            {loading ? (
              <p className="text-center py-8 text-white">Loading...</p>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🌱</p>
                <p className="text-white font-semibold">No projects yet</p>
                <Link to="/projects/new" className="btn-primary-green text-sm mt-4 inline-flex">+ New Project</Link>
              </div>
            ) : (
              <table className="premium-table">
                <thead><tr><th>Project</th><th>Level</th><th>Score</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {projects.slice(0, 5).map(p => (
                    <tr key={p._id}>
                      <td className="font-semibold text-white text-sm">{p.title}</td>
                      <td>{p.leafLevel ? <LeafBadge level={p.leafLevel} /> : '—'}</td>
                      <td className="text-sm text-white font-semibold">{p.scorePercent || 0}%</td>
                      <td className="text-xs">{new Date(p.updatedAt).toLocaleDateString()}</td>
                      <td><Link to={`/projects/${p._id}`} className="text-xs font-semibold hover:text-green-400" style={{ color: 'rgba(232,245,233,0.4)' }}>Open →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="font-bold text-white text-lg mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link to="/projects/new" className="flex items-center gap-3 p-4 rounded-xl border transition-all"
                style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.15)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #16520A, #22C55E)' }}>
                  <span className="text-white text-lg">＋</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">New Project</p>
                  <p className="text-xs" style={{ color: 'rgba(232,245,233,0.4)' }}>Start an assessment</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}