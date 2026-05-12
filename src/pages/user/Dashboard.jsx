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
  const [loading, setLoading]   = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    axiosSecure.get('/projects')
      .then(r => setProjects(r.data.projects || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total:     projects.length,
    submitted: projects.filter(p => p.status === 'submitted').length,
    avg:       projects.length
      ? Math.round(projects.reduce((s,p) => s + (p.scorePercent||0), 0) / projects.length)
      : 0,
    best: projects.reduce((b,p) => (p.scorePercent||0) > (b.scorePercent||0) ? p : b, {}).leafLevel || '—',
  };

  const statCards = [
    { label:'Total Projects', value:stats.total,     icon:'◫', color:'var(--g600)', bg:'var(--g50)' },
    { label:'Submitted',      value:stats.submitted,  icon:'✓', color:'#15803D',    bg:'#DCFCE7' },
    { label:'Avg. Score',     value:`${stats.avg}%`, icon:'◎', color:'#D97706',    bg:'#FEF9C3' },
    { label:'Best Level',     value:stats.best,       icon:'🍃',color:'var(--g800)',bg:'var(--g100)', small:true },
  ];

  return (
    <Layout>
      {/* Header */}
      <div className="fade-in-up" style={{ marginBottom:28 }}>
        <p style={{ color:'var(--tx-muted)', fontSize:14, fontWeight:500, marginBottom:4 }}>
          {greeting},
        </p>
        <h1 style={{ fontFamily:'Montserrat,sans-serif', fontWeight:900,
          fontSize:28, color:'var(--tx)', marginBottom:4 }}>
          {user?.displayName || 'Welcome Back'} 👋
        </h1>
        <p style={{ color:'var(--tx-muted)', fontSize:14 }}>
          Here's your green building assessment overview
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))',
        gap:16, marginBottom:28 }}>
        {statCards.map((s,i) => (
          <div key={i} className="stat-card fade-in-up"
            style={{ animationDelay:`${i*0.08}s` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ width:40, height:40, borderRadius:11,
                background:s.bg, display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:18, color:s.color }}>
                {s.icon}
              </div>
              <div style={{ width:8, height:8, borderRadius:'50%',
                background:s.color, opacity:0.6 }}/>
            </div>
            <div style={{ fontFamily:'Montserrat,sans-serif', fontWeight:800,
              fontSize: s.small ? 15 : 26, color:'var(--tx)', lineHeight:1.2 }}>
              {s.value}
            </div>
            <div style={{ color:'var(--tx-muted)', fontSize:12.5,
              fontWeight:600, marginTop:4 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20 }}
        className="lg-grid">

        {/* Recent Projects */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            marginBottom:14 }}>
            <h2 style={{ fontFamily:'Montserrat,sans-serif', fontWeight:800,
              fontSize:16, color:'var(--tx)' }}>
              Recent Projects
            </h2>
            <Link to="/projects" style={{ color:'var(--g600)', fontSize:13,
              fontWeight:700, textDecoration:'none' }}>
              View all →
            </Link>
          </div>

          <div className="card" style={{ overflow:'hidden' }}>
            {loading ? (
              <div className="empty-state">
                <div style={{ width:36, height:36, borderRadius:'50%',
                  border:'3px solid var(--g200)', borderTopColor:'var(--g600)',
                  animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
                <p style={{ color:'var(--tx-muted)', fontSize:14 }}>Loading…</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize:48, marginBottom:12 }}>🌱</div>
                <h3 style={{ fontFamily:'Montserrat,sans-serif', fontWeight:700,
                  fontSize:16, color:'var(--tx)', marginBottom:6 }}>
                  No projects yet
                </h3>
                <p style={{ color:'var(--tx-muted)', fontSize:13, marginBottom:20 }}>
                  Start your first green building assessment
                </p>
                <Link to="/projects/new" className="btn-primary-green"
                  style={{ textDecoration:'none' }}>
                  + New Project
                </Link>
              </div>
            ) : (
              <div className="table-scroll"><table className="premium-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Leaf Level</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.slice(0,5).map(p => (
                    <tr key={p._id}>
                      <td>
                        <span style={{ fontWeight:700, color:'var(--tx)',
                          fontSize:13.5 }}>{p.title}</span>
                      </td>
                      <td>
                        {(p.adminOverride || p.leafLevel)
                          ? <LeafBadge level={p.adminOverride || p.leafLevel}/>
                          : <span style={{ color:'var(--tx-faint)', fontSize:12 }}>—</span>}
                      </td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div className="progress-leaf" style={{ width:60 }}>
                            <div className="progress-leaf-fill"
                              style={{ width:`${p.scorePercent||0}%` }}/>
                          </div>
                          <span style={{ fontWeight:700, fontSize:13,
                            color:'var(--tx)' }}>{p.scorePercent||0}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={p.status==='submitted'
                          ? 'status-chip status-completed'
                          : 'status-chip status-progress'}>
                          {p.status==='submitted' ? '✓ Submitted' : '● Draft'}
                        </span>
                      </td>
                      <td>
                        <Link to={`/projects/${p._id}`}
                          style={{ color:'var(--g600)', fontSize:12,
                            fontWeight:700, textDecoration:'none' }}>
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
        </div>

        {/* Quick Actions + Leaf Guide */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Quick Actions */}
          <div>
            <h2 style={{ fontFamily:'Montserrat,sans-serif', fontWeight:800,
              fontSize:16, color:'var(--tx)', marginBottom:12 }}>
              Quick Actions
            </h2>
            <Link to="/projects/new" className="card"
              style={{ display:'flex', alignItems:'center', gap:12, padding:14,
                textDecoration:'none', marginBottom:8 }}>
              <div style={{ width:40, height:40, borderRadius:11, flexShrink:0,
                background:'linear-gradient(135deg,var(--g700),var(--g500))',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:18, color:'white', boxShadow:'0 3px 10px rgba(26,122,53,0.3)' }}>
                +
              </div>
              <div>
                <p style={{ fontWeight:700, fontSize:13.5, color:'var(--tx)',
                  margin:0, lineHeight:1.3 }}>New Project</p>
                <p style={{ fontSize:12, color:'var(--tx-muted)', margin:0 }}>
                  Start an assessment
                </p>
              </div>
            </Link>
            <Link to="/manual" className="card"
              style={{ display:'flex', alignItems:'center', gap:12, padding:14,
                textDecoration:'none' }}>
              <div style={{ width:40, height:40, borderRadius:11, flexShrink:0,
                background:'#FEF9C3', display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:18 }}>
                📖
              </div>
              <div>
                <p style={{ fontWeight:700, fontSize:13.5, color:'var(--tx)',
                  margin:0, lineHeight:1.3 }}>User Manual</p>
                <p style={{ fontSize:12, color:'var(--tx-muted)', margin:0 }}>
                  How it works
                </p>
              </div>
            </Link>
          </div>

          {/* Leaf Guide */}
          <div className="card" style={{ padding:18 }}>
            <h3 style={{ fontFamily:'Montserrat,sans-serif', fontWeight:800,
              fontSize:14, color:'var(--tx)', marginBottom:14 }}>
              🍃 Leaf Level Guide
            </h3>
            {[
              { name:'Green Leaf',  range:'80–100%', color:'#15803D', bg:'#DCFCE7' },
              { name:'Yellow Leaf', range:'60–79%',  color:'#92400E', bg:'#FEF9C3' },
              { name:'Orange Leaf', range:'40–59%',  color:'#9A3412', bg:'#FEF3C7' },
              { name:'Brown Leaf',  range:'20–39%',  color:'#78350F', bg:'#F5F0E8' },
            ].map(l => (
              <div key={l.name} style={{ display:'flex', alignItems:'center',
                justifyContent:'space-between', padding:'8px 0',
                borderBottom:'1px solid var(--border)' }}
                className="last:border-0">
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:20, height:20, borderRadius:6,
                    background:l.bg, display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:11 }}>🍃</div>
                  <span style={{ fontSize:12.5, fontWeight:700,
                    color:'var(--tx)' }}>{l.name}</span>
                </div>
                <span style={{ fontSize:12, fontWeight:600,
                  color:'var(--tx-muted)' }}>{l.range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @media(max-width:768px){.lg-grid{grid-template-columns:1fr!important;}}
      `}</style>
    </Layout>
  );
}
