// src/pages/user/ProjectAssessment.js
// import { useState } from 'react';
// import { useParams, Link } from 'react-router-dom';
// import Layout from '../../components/shared/Layout.jsx';
// import { LeafBadge } from '../../components/shared/LeafLogo.jsx';
// import toast from 'react-hot-toast';

// // Mock data — replace with API calls
// const mockProject = {
//   id: 1,
//   title: 'Green Residence Phase 1',
//   score: 84,
//   totalPoints: 126,
//   maxPoints: 150,
//   level: 'Green Leaf',
//   tabs: [
//     {
//       id: 1, title: 'Site & Environment',
//       modules: [
//         {
//           id: 1, title: 'Site Selection',
//           readDetails: 'Evaluate site suitability for green construction based on proximity to public transit, urban density, and environmental impact.',
//           inputs: [
//             { id: 1, label: 'Distance to public transport (m)', type: 'number', value: '' },
//             { id: 2, label: 'Site zoning type', type: 'dropdown', value: '', options: ['Urban', 'Suburban', 'Rural', 'Industrial'] },
//             { id: 3, label: 'Brownfield site?', type: 'radio', value: '', options: ['Yes', 'No'] },
//           ],
//           docs: [{ id: 1, label: 'Site Survey Document', required: true, uploaded: false }],
//           points: 18, maxPoints: 24,
//         },
//         {
//           id: 2, title: 'Stormwater Management',
//           readDetails: 'Assess on-site stormwater management including permeable surfaces, retention ponds, and rain gardens.',
//           inputs: [
//             { id: 4, label: 'Permeable surface area (%)', type: 'number', value: '' },
//             { id: 5, label: 'Rainwater harvesting system', type: 'radio', value: '', options: ['Yes', 'No'] },
//           ],
//           docs: [{ id: 2, label: 'Drainage Plan', required: false, uploaded: true }],
//           points: 14, maxPoints: 18,
//         },
//       ],
//     },
//     {
//       id: 2, title: 'Energy Efficiency',
//       modules: [
//         {
//           id: 3, title: 'Building Envelope',
//           readDetails: 'Thermal performance of walls, roof, floors and openings.',
//           inputs: [
//             { id: 6, label: 'Wall U-value (W/m²K)', type: 'number', value: '' },
//             { id: 7, label: 'Roof insulation type', type: 'dropdown', value: '', options: ['None', 'Mineral Wool', 'EPS Foam', 'PIR Board', 'Green Roof'] },
//           ],
//           docs: [],
//           points: 22, maxPoints: 28,
//         },
//       ],
//     },
//     {
//       id: 3, title: 'Water Efficiency',
//       modules: [
//         {
//           id: 4, title: 'Indoor Water Use',
//           readDetails: 'Low-flow fixtures, sensor taps, and dual flush systems.',
//           inputs: [
//             { id: 8, label: 'Low-flow fixtures installed (%)', type: 'number', value: '' },
//             { id: 9, label: 'Greywater recycling', type: 'radio', value: '', options: ['Full System', 'Partial', 'None'] },
//           ],
//           docs: [{ id: 3, label: 'Plumbing Schedule', required: true, uploaded: false }],
//           points: 20, maxPoints: 24,
//         },
//       ],
//     },
//   ],
// };

// export default function ProjectAssessment() {
//   const { id } = useParams();
//   const [activeTab, setActiveTab] = useState(0);
//   const [activeModule, setActiveModule] = useState(0);
//   const [formValues, setFormValues] = useState({});
//   const [saving, setSaving] = useState(false);
//   const [expandedRead, setExpandedRead] = useState(false);

//   const project = mockProject;
//   const tab = project.tabs[activeTab];
//   const module = tab?.modules[activeModule];

//   const scorePercent = Math.round((project.totalPoints / project.maxPoints) * 100);

//   const handleInput = (inputId, value) => {
//     setFormValues(prev => ({ ...prev, [inputId]: value }));
//   };

//   const handleSave = async () => {
//     setSaving(true);
//     // TODO: PATCH /api/projects/:id/responses
//     await new Promise(r => setTimeout(r, 700));
//     setSaving(false);
//     toast.success('Responses saved!');
//   };

//   const switchTab = (i) => { setActiveTab(i); setActiveModule(0); };

//   return (
//     <Layout>
//       {/* Header bar */}
//       <div className="flex items-start justify-between mb-6 fade-in-up">
//         <div>
//           <Link to="/projects" className="text-xs mb-2 inline-flex items-center gap-1 hover:text-green-400 transition-colors"
//             style={{ color: 'rgba(232,245,233,0.3)' }}>
//             ← My Projects
//           </Link>
//           <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
//             {project.title}
//           </h1>
//         </div>
//         <div className="flex items-center gap-3">
//           <LeafBadge level={project.level} score={scorePercent} />
//           <button onClick={handleSave} disabled={saving}
//             className="btn-primary-green text-sm px-4 py-2.5 disabled:opacity-60">
//             {saving
//               ? <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
//               : <>💾 Save</>}
//           </button>
//         </div>
//       </div>

//       {/* Score strip */}
//       <div className="glass-card p-5 mb-6">
//         <div className="flex items-center justify-between mb-3">
//           <div>
//             <p className="text-xs font-semibold" style={{ color: 'rgba(232,245,233,0.4)', letterSpacing: '0.06em' }}>
//               TOTAL SCORE
//             </p>
//             <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
//               {project.totalPoints} <span className="text-base font-normal" style={{ color: 'rgba(232,245,233,0.3)' }}>/ {project.maxPoints} pts</span>
//             </p>
//           </div>
//           <div className="text-right">
//             <p className="text-3xl font-bold" style={{ color: '#4ADE80', fontFamily: 'Syne, sans-serif' }}>{scorePercent}%</p>
//             <p className="text-xs" style={{ color: 'rgba(232,245,233,0.3)' }}>{project.level}</p>
//           </div>
//         </div>
//         <div className="progress-leaf">
//           <div className="progress-leaf-fill" style={{ width: `${scorePercent}%` }} />
//         </div>
//         {/* Tab mini scores */}
//         <div className="flex gap-3 mt-3 flex-wrap">
//           {project.tabs.map((t, i) => {
//             const tabTotal = t.modules.reduce((a, m) => a + m.points, 0);
//             const tabMax = t.modules.reduce((a, m) => a + m.maxPoints, 0);
//             const pct = Math.round((tabTotal / tabMax) * 100);
//             return (
//               <button key={t.id} onClick={() => switchTab(i)}
//                 className="text-xs px-3 py-1.5 rounded-full transition-all font-semibold"
//                 style={{
//                   background: activeTab === i ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
//                   color: activeTab === i ? '#4ADE80' : 'rgba(232,245,233,0.4)',
//                   border: `1px solid ${activeTab === i ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
//                 }}>
//                 {t.title} · {pct}%
//               </button>
//             );
//           })}
//         </div>
//       </div>

//       {/* Main layout */}
//       <div className="grid lg:grid-cols-4 gap-6">
//         {/* Module list sidebar */}
//         <div className="lg:col-span-1">
//           <h3 className="text-xs font-semibold mb-3" style={{ color: 'rgba(232,245,233,0.3)', letterSpacing: '0.08em' }}>
//             MODULES — {tab?.title}
//           </h3>
//           <div className="space-y-2">
//             {tab?.modules.map((m, i) => {
//               const pct = Math.round((m.points / m.maxPoints) * 100);
//               return (
//                 <button key={m.id} onClick={() => setActiveModule(i)}
//                   className="w-full text-left p-3 rounded-xl border transition-all"
//                   style={{
//                     background: activeModule === i ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)',
//                     borderColor: activeModule === i ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.08)',
//                   }}>
//                   <div className="flex items-start justify-between gap-2">
//                     <p className={`text-sm font-semibold leading-snug ${activeModule === i ? 'text-green-300' : 'text-white'}`}>
//                       {m.title}
//                     </p>
//                     <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: 'rgba(232,245,233,0.4)' }}>
//                       {m.points}/{m.maxPoints}
//                     </span>
//                   </div>
//                   <div className="progress-leaf mt-2">
//                     <div className="progress-leaf-fill" style={{ width: `${pct}%` }} />
//                   </div>
//                 </button>
//               );
//             })}
//           </div>
//         </div>

//         {/* Module form */}
//         <div className="lg:col-span-3">
//           {module && (
//             <div className="glass-card p-6 fade-in-up">
//               {/* Module header */}
//               <div className="flex items-start justify-between mb-5 pb-5 border-b" style={{ borderColor: 'rgba(34,197,94,0.1)' }}>
//                 <div>
//                   <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
//                     {module.title}
//                   </h2>
//                   <p className="text-xs mt-1" style={{ color: 'rgba(232,245,233,0.4)' }}>
//                     {module.points} / {module.maxPoints} points earned
//                   </p>
//                 </div>
//                 <div className="text-right">
//                   <p className="text-2xl font-bold" style={{ color: '#4ADE80', fontFamily: 'Syne, sans-serif' }}>
//                     {Math.round((module.points / module.maxPoints) * 100)}%
//                   </p>
//                 </div>
//               </div>

//               {/* Read details collapsible */}
//               {module.readDetails && (
//                 <div className="mb-6 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(34,197,94,0.12)' }}>
//                   <button
//                     onClick={() => setExpandedRead(!expandedRead)}
//                     className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
//                     style={{ background: 'rgba(34,197,94,0.06)', color: '#4ADE80' }}>
//                     <span>📋 Module Guidelines</span>
//                     <span className="text-xs transition-transform duration-200" style={{ transform: expandedRead ? 'rotate(180deg)' : '' }}>▼</span>
//                   </button>
//                   {expandedRead && (
//                     <div className="px-4 py-3 text-sm leading-relaxed" style={{ color: 'rgba(232,245,233,0.6)', background: 'rgba(34,197,94,0.03)' }}>
//                       {module.readDetails}
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Input fields */}
//               <div className="space-y-5">
//                 {module.inputs.map((input) => (
//                   <div key={input.id}>
//                     <label className="block text-sm font-semibold mb-2 text-white">
//                       {input.label}
//                     </label>

//                     {input.type === 'number' && (
//                       <input
//                         type="number"
//                         value={formValues[input.id] ?? input.value}
//                         onChange={e => handleInput(input.id, e.target.value)}
//                         className="input-dark w-full max-w-xs px-4 py-3 text-sm"
//                         placeholder="Enter value"
//                       />
//                     )}

//                     {input.type === 'dropdown' && (
//                       <select
//                         value={formValues[input.id] ?? input.value}
//                         onChange={e => handleInput(input.id, e.target.value)}
//                         className="input-dark px-4 py-3 text-sm min-w-48"
//                         style={{ appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(232,245,233,0.4)' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
//                         <option value="">Select option</option>
//                         {input.options.map(o => <option key={o} value={o}>{o}</option>)}
//                       </select>
//                     )}

//                     {input.type === 'radio' && (
//                       <div className="flex flex-wrap gap-2">
//                         {input.options.map(o => {
//                           const selected = (formValues[input.id] ?? input.value) === o;
//                           return (
//                             <button key={o} type="button"
//                               onClick={() => handleInput(input.id, o)}
//                               className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
//                               style={{
//                                 background: selected ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
//                                 borderColor: selected ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)',
//                                 color: selected ? '#4ADE80' : 'rgba(232,245,233,0.6)',
//                               }}>
//                               {selected && '✓ '}{o}
//                             </button>
//                           );
//                         })}
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>

//               {/* Document uploads */}
//               {module.docs.length > 0 && (
//                 <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(34,197,94,0.08)' }}>
//                   <h3 className="text-sm font-bold text-white mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
//                     📎 Required Documents
//                   </h3>
//                   <div className="space-y-3">
//                     {module.docs.map(doc => (
//                       <div key={doc.id}
//                         className="flex items-center justify-between p-4 rounded-xl border"
//                         style={{
//                           background: doc.uploaded ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
//                           borderColor: doc.uploaded ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
//                         }}>
//                         <div className="flex items-center gap-3">
//                           <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
//                             style={{ background: doc.uploaded ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)' }}>
//                             {doc.uploaded ? '✓' : '📄'}
//                           </div>
//                           <div>
//                             <p className="text-sm font-semibold text-white">{doc.label}</p>
//                             <p className="text-xs" style={{ color: 'rgba(232,245,233,0.3)' }}>
//                               {doc.required ? 'Required' : 'Optional'} · {doc.uploaded ? 'Uploaded' : 'Not uploaded'}
//                             </p>
//                           </div>
//                         </div>
//                         <label className="cursor-pointer">
//                           <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
//                           <span className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:border-green-500/40"
//                             style={{
//                               color: doc.uploaded ? '#4ADE80' : 'rgba(232,245,233,0.4)',
//                               borderColor: 'rgba(34,197,94,0.15)',
//                               background: 'rgba(34,197,94,0.05)',
//                             }}>
//                             {doc.uploaded ? '↺ Replace' : '↑ Upload'}
//                           </span>
//                         </label>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* Navigation */}
//               <div className="flex items-center justify-between mt-8 pt-5 border-t" style={{ borderColor: 'rgba(34,197,94,0.08)' }}>
//                 <button
//                   onClick={() => activeModule > 0 && setActiveModule(activeModule - 1)}
//                   disabled={activeModule === 0}
//                   className="text-sm px-4 py-2 rounded-lg border disabled:opacity-30 transition-all hover:border-green-500/30"
//                   style={{ borderColor: 'rgba(34,197,94,0.15)', color: 'rgba(232,245,233,0.5)' }}>
//                   ← Previous
//                 </button>
//                 <button onClick={handleSave} disabled={saving}
//                   className="btn-primary-green text-sm px-6">
//                   {saving ? 'Saving...' : '💾 Save Responses'}
//                 </button>
//                 <button
//                   onClick={() => activeModule < tab.modules.length - 1 && setActiveModule(activeModule + 1)}
//                   disabled={activeModule === tab.modules.length - 1}
//                   className="text-sm px-4 py-2 rounded-lg border disabled:opacity-30 transition-all hover:border-green-500/30"
//                   style={{ borderColor: 'rgba(34,197,94,0.15)', color: 'rgba(232,245,233,0.5)' }}>
//                   Next →
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </Layout>
//   );
// }

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { LeafBadge } from '../../components/shared/LeafLogo.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function ProjectAssessment() {
  const { id } = useParams();
  const axiosSecure = useAxiosSecure();

  const [project, setProject] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [activeModule, setActiveModule] = useState(0);
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedRead, setExpandedRead] = useState(false);

  useEffect(() => {
    axiosSecure.get(`/projects/${id}`)
      .then(res => {
        setProject(res.data.project);
        setTabs(res.data.tabs || []);
        // Saved values load করো
        const saved = {};
        res.data.tabs?.forEach(tab =>
          tab.modules?.forEach(mod =>
            mod.inputs?.forEach(inp => {
              if (inp.value !== '') saved[inp._id] = inp.value;
            })
          )
        );
        setFormValues(saved);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const tab = tabs[activeTab];
  const module = tab?.modules?.[activeModule];

  const handleInput = (inputId, value) => {
    setFormValues(prev => ({ ...prev, [inputId]: value }));
  };

  const handleSave = async () => {
    if (!module) return;
    setSaving(true);
    try {
      const answers = module.inputs.map(inp => ({
        inputId: inp._id,
        value: formValues[inp._id] ?? '',
      }));

      const res = await axiosSecure.patch(`/projects/${id}/answers`, { answers });
      const { totalPoints, maxPoints, scorePercent, leafLevel } = res.data;

      setProject(prev => ({ ...prev, totalPoints, maxPoints, scorePercent, leafLevel }));
      toast.success('Responses saved!');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const switchTab = (i) => { setActiveTab(i); setActiveModule(0); };

  if (loading) return <Layout><p className="text-white text-center py-20">Loading...</p></Layout>;
  if (!project) return <Layout><p className="text-white text-center py-20">Project not found</p></Layout>;

  const scorePercent = project.scorePercent || 0;

  return (
    <Layout>
      <div className="flex items-start justify-between mb-6 fade-in-up">
        <div>
          <Link to="/projects" className="text-xs mb-2 inline-flex items-center gap-1 hover:text-green-400 transition-colors"
            style={{ color: 'rgba(232,245,233,0.3)' }}>← My Projects</Link>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{project.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {project.leafLevel && <LeafBadge level={project.leafLevel} score={scorePercent} />}
          <button onClick={handleSave} disabled={saving} className="btn-primary-green text-sm px-4 py-2.5 disabled:opacity-60">
            {saving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* Score strip */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold" style={{ color: 'rgba(232,245,233,0.4)' }}>TOTAL SCORE</p>
            <p className="text-2xl font-bold text-white">
              {project.totalPoints || 0} <span className="text-base font-normal" style={{ color: 'rgba(232,245,233,0.3)' }}>/ {project.maxPoints || 0} pts</span>
            </p>
          </div>
          <p className="text-3xl font-bold" style={{ color: '#4ADE80', fontFamily: 'Syne, sans-serif' }}>{scorePercent}%</p>
        </div>
        <div className="progress-leaf">
          <div className="progress-leaf-fill" style={{ width: `${scorePercent}%` }} />
        </div>
        <div className="flex gap-3 mt-3 flex-wrap">
          {tabs.map((t, i) => (
            <button key={t._id} onClick={() => switchTab(i)}
              className="text-xs px-3 py-1.5 rounded-full transition-all font-semibold"
              style={{
                background: activeTab === i ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                color: activeTab === i ? '#4ADE80' : 'rgba(232,245,233,0.4)',
                border: `1px solid ${activeTab === i ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}>
              {t.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Module sidebar */}
        <div className="lg:col-span-1">
          <h3 className="text-xs font-semibold mb-3" style={{ color: 'rgba(232,245,233,0.3)', letterSpacing: '0.08em' }}>
            MODULES — {tab?.title}
          </h3>
          <div className="space-y-2">
            {tab?.modules?.map((m, i) => {
              const pct = m.maxPoints > 0 ? Math.round((m.points / m.maxPoints) * 100) : 0;
              return (
                <button key={m._id} onClick={() => setActiveModule(i)}
                  className="w-full text-left p-3 rounded-xl border transition-all"
                  style={{
                    background: activeModule === i ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)',
                    borderColor: activeModule === i ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.08)',
                  }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${activeModule === i ? 'text-green-300' : 'text-white'}`}>{m.title}</p>
                    <span className="text-xs flex-shrink-0" style={{ color: 'rgba(232,245,233,0.4)' }}>{m.points}/{m.maxPoints}</span>
                  </div>
                  <div className="progress-leaf mt-2">
                    <div className="progress-leaf-fill" style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Module form */}
        <div className="lg:col-span-3">
          {module && (
            <div className="glass-card p-6 fade-in-up">
              <div className="flex items-start justify-between mb-5 pb-5 border-b" style={{ borderColor: 'rgba(34,197,94,0.1)' }}>
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{module.title}</h2>
                  <p className="text-xs mt-1" style={{ color: 'rgba(232,245,233,0.4)' }}>{module.points} / {module.maxPoints} points earned</p>
                </div>
                <p className="text-2xl font-bold" style={{ color: '#4ADE80', fontFamily: 'Syne, sans-serif' }}>
                  {module.maxPoints > 0 ? Math.round((module.points / module.maxPoints) * 100) : 0}%
                </p>
              </div>

              {module.readDetails && (
                <div className="mb-6 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(34,197,94,0.12)' }}>
                  <button onClick={() => setExpandedRead(!expandedRead)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
                    style={{ background: 'rgba(34,197,94,0.06)', color: '#4ADE80' }}>
                    <span>📋 Module Guidelines</span>
                    <span style={{ transform: expandedRead ? 'rotate(180deg)' : '' }}>▼</span>
                  </button>
                  {expandedRead && (
                    <div className="px-4 py-3 text-sm leading-relaxed" style={{ color: 'rgba(232,245,233,0.6)' }}>
                      {module.readDetails}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-5">
                {module.inputs?.map((input) => (
                  <div key={input._id}>
                    <label className="block text-sm font-semibold mb-2 text-white">{input.label}</label>

                    {input.inputType === 'number' && (
                      <input type="number"
                        value={formValues[input._id] ?? ''}
                        onChange={e => handleInput(input._id, e.target.value)}
                        className="input-dark w-full max-w-xs px-4 py-3 text-sm"
                        placeholder="Enter value" />
                    )}

                    {input.inputType === 'text' && (
                      <input type="text"
                        value={formValues[input._id] ?? ''}
                        onChange={e => handleInput(input._id, e.target.value)}
                        className="input-dark w-full px-4 py-3 text-sm"
                        placeholder="Enter text" />
                    )}

                    {input.inputType === 'dropdown' && (
                      <select
                        value={formValues[input._id] ?? ''}
                        onChange={e => handleInput(input._id, e.target.value)}
                        className="input-dark px-4 py-3 text-sm min-w-48">
                        <option value="">Select option</option>
                        {input.options?.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
                      </select>
                    )}

                    {input.inputType === 'radio' && (
                      <div className="flex flex-wrap gap-2">
                        {input.options?.map(o => {
                          const selected = (formValues[input._id] ?? '') === o.label;
                          return (
                            <button key={o.label} type="button"
                              onClick={() => handleInput(input._id, o.label)}
                              className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
                              style={{
                                background: selected ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                                borderColor: selected ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)',
                                color: selected ? '#4ADE80' : 'rgba(232,245,233,0.6)',
                              }}>
                              {selected && '✓ '}{o.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {module.docs?.length > 0 && (
                <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(34,197,94,0.08)' }}>
                  <h3 className="text-sm font-bold text-white mb-4">📎 Required Documents</h3>
                  <div className="space-y-3">
                    {module.docs.map(doc => (
                      <div key={doc._id} className="flex items-center justify-between p-4 rounded-xl border"
                        style={{
                          background: doc.uploaded ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
                          borderColor: doc.uploaded ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
                        }}>
                        <div>
                          <p className="text-sm font-semibold text-white">{doc.docLabel}</p>
                          <p className="text-xs" style={{ color: 'rgba(232,245,233,0.3)' }}>
                            {doc.isRequired ? 'Required' : 'Optional'} · {doc.uploaded ? `Uploaded: ${doc.filename}` : 'Not uploaded'}
                          </p>
                        </div>
                        <label className="cursor-pointer">
                          <input type="file" className="hidden"
                            accept={doc.allowedTypes?.split(',').map(t => `.${t}`).join(',')}
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append('file', file);
                              formData.append('moduleDocId', doc._id);
                              try {
                                await axiosSecure.post(`/projects/${id}/documents`, formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                toast.success('Document uploaded!');
                                // Refresh
                                const res = await axiosSecure.get(`/projects/${id}`);
                                setTabs(res.data.tabs || []);
                              } catch { toast.error('Upload failed'); }
                            }}
                          />
                          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
                            style={{ color: doc.uploaded ? '#4ADE80' : 'rgba(232,245,233,0.4)', borderColor: 'rgba(34,197,94,0.15)' }}>
                            {doc.uploaded ? '↺ Replace' : '↑ Upload'}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-8 pt-5 border-t" style={{ borderColor: 'rgba(34,197,94,0.08)' }}>
                <button onClick={() => activeModule > 0 && setActiveModule(activeModule - 1)}
                  disabled={activeModule === 0}
                  className="text-sm px-4 py-2 rounded-lg border disabled:opacity-30 transition-all"
                  style={{ borderColor: 'rgba(34,197,94,0.15)', color: 'rgba(232,245,233,0.5)' }}>
                  ← Previous
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary-green text-sm px-6">
                  {saving ? 'Saving...' : '💾 Save Responses'}
                </button>
                <button onClick={() => activeModule < tab.modules.length - 1 && setActiveModule(activeModule + 1)}
                  disabled={activeModule === tab.modules.length - 1}
                  className="text-sm px-4 py-2 rounded-lg border disabled:opacity-30 transition-all"
                  style={{ borderColor: 'rgba(34,197,94,0.15)', color: 'rgba(232,245,233,0.5)' }}>
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}