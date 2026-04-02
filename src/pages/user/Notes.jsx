// import { useState } from 'react';
// import Layout from '../../components/shared/Layout.jsx';
// import toast from 'react-hot-toast';

// // Mock data — replace with real API
// const mockProjects = [
//     {
//         id: 1,
//         title: 'Green Residence Phase 1',
//         userNote: 'Please review the site survey document I uploaded. The drainage plan needs special attention.',
//         adminNote: 'Reviewed. Your site survey looks good. Please upload the stormwater management plan as well.',
//         lastUpdated: '2025-03-28',
//     },
//     {
//         id: 2,
//         title: 'Eco Office Complex',
//         userNote: '',
//         adminNote: '',
//         lastUpdated: null,
//     },
//     {
//         id: 3,
//         title: 'Urban Garden Tower',
//         userNote: 'I have questions about the energy efficiency module scoring.',
//         adminNote: '',
//         lastUpdated: '2025-03-25',
//     },
// ];

// export default function Notes() {
//     const [projects, setProjects] = useState(mockProjects);
//     const [activeId, setActiveId] = useState(mockProjects[0].id);
//     const [saving, setSaving] = useState(false);

//     const active = projects.find(p => p.id === activeId);

//     const handleSave = async () => {
//         setSaving(true);
//         // TODO: PATCH /api/projects/:id/notes
//         await new Promise(r => setTimeout(r, 600));
//         setSaving(false);
//         toast.success('Note saved!');
//     };

//     const updateNote = (text) => {
//         setProjects(projects.map(p =>
//             p.id === activeId ? { ...p, userNote: text } : p
//         ));
//     };

//     return (
//         <Layout>
//             <div className="mb-8 fade-in-up">
//                 <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Notes</h1>
//                 <p className="text-sm mt-1" style={{ color: 'rgba(232,245,233,0.4)' }}>
//                     Communicate with admin per project
//                 </p>
//             </div>

//             <div className="grid lg:grid-cols-3 gap-6">

//                 {/* Project list */}
//                 <div className="lg:col-span-1">
//                     <p className="text-xs font-semibold mb-3 px-1"
//                         style={{ color: 'rgba(232,245,233,0.3)', letterSpacing: '0.08em' }}>
//                         YOUR PROJECTS
//                     </p>
//                     <div className="space-y-2">
//                         {projects.map(p => (
//                             <button key={p.id} onClick={() => setActiveId(p.id)}
//                                 className="w-full text-left p-4 rounded-xl border transition-all"
//                                 style={{
//                                     background: activeId === p.id ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)',
//                                     borderColor: activeId === p.id ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.08)',
//                                 }}>
//                                 <p className={`text-sm font-semibold leading-snug ${activeId === p.id ? 'text-green-300' : 'text-white'}`}>
//                                     {p.title}
//                                 </p>
//                                 <div className="flex items-center gap-2 mt-1.5">
//                                     {p.userNote && (
//                                         <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
//                                             My note
//                                         </span>
//                                     )}
//                                     {p.adminNote && (
//                                         <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
//                                             Admin reply
//                                         </span>
//                                     )}
//                                     {!p.userNote && !p.adminNote && (
//                                         <span className="text-xs" style={{ color: 'rgba(232,245,233,0.25)' }}>No notes yet</span>
//                                     )}
//                                 </div>
//                             </button>
//                         ))}
//                     </div>
//                 </div>

//                 {/* Note editor */}
//                 <div className="lg:col-span-2">
//                     {active && (
//                         <div className="space-y-4 fade-in-up">

//                             {/* Admin reply — read only */}
//                             <div className="glass-card p-5">
//                                 <div className="flex items-center gap-2 mb-3">
//                                     <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
//                                         style={{ background: 'linear-gradient(135deg,#E2670C,#97542A)', color: 'white' }}>
//                                         A
//                                     </div>
//                                     <p className="text-sm font-semibold text-white">Admin Note</p>
//                                     <span className="text-xs ml-auto" style={{ color: 'rgba(232,245,233,0.25)' }}>Read only</span>
//                                 </div>
//                                 {active.adminNote ? (
//                                     <div className="p-4 rounded-xl text-sm leading-relaxed"
//                                         style={{ background: 'rgba(226,103,12,0.06)', border: '1px solid rgba(226,103,12,0.12)', color: 'rgba(232,245,233,0.8)' }}>
//                                         {active.adminNote}
//                                     </div>
//                                 ) : (
//                                     <div className="p-4 rounded-xl text-sm text-center"
//                                         style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)', color: 'rgba(232,245,233,0.25)' }}>
//                                         No admin reply yet
//                                     </div>
//                                 )}
//                             </div>

//                             {/* User note — editable */}
//                             <div className="glass-card p-5">
//                                 <div className="flex items-center gap-2 mb-3">
//                                     <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
//                                         style={{ background: 'linear-gradient(135deg,#16520A,#22C55E)' }}>
//                                         U
//                                     </div>
//                                     <p className="text-sm font-semibold text-white">My Note</p>
//                                     <span className="text-xs ml-auto" style={{ color: 'rgba(232,245,233,0.25)' }}>
//                                         {active.title}
//                                     </span>
//                                 </div>
//                                 <textarea
//                                     value={active.userNote}
//                                     onChange={e => updateNote(e.target.value)}
//                                     rows={6}
//                                     placeholder="Write a note or question for the admin about this project..."
//                                     className="input-dark w-full px-4 py-3 text-sm resize-none mb-3"
//                                 />
//                                 <div className="flex items-center justify-between">
//                                     <p className="text-xs" style={{ color: 'rgba(232,245,233,0.25)' }}>
//                                         {active.userNote.length} characters
//                                     </p>
//                                     <button onClick={handleSave} disabled={saving || !active.userNote.trim()}
//                                         className="btn-primary-green text-sm px-5 disabled:opacity-50">
//                                         {saving ? (
//                                             <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
//                                         ) : '💾 Save Note'}
//                                     </button>
//                                 </div>
//                             </div>

//                         </div>
//                     )}
//                 </div>
//             </div>
//         </Layout>
//     );
// }

import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function Notes() {
    const axiosSecure = useAxiosSecure();
    const [projects, setProjects] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosSecure.get('/projects')
            .then(res => {
                const p = res.data.projects || [];
                setProjects(p);
                if (p.length) setActiveId(p[0]._id);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const active = projects.find(p => p._id === activeId);

    const userNote = active?.notes?.filter(n => n.senderRole === 'user').slice(-1)[0]?.message || '';
    const adminNote = active?.notes?.filter(n => n.senderRole === 'admin').slice(-1)[0]?.message || '';

    useEffect(() => { setNoteText(userNote); }, [activeId]);

    const handleSave = async () => {
        if (!noteText.trim() || !activeId) return;
        setSaving(true);
        try {
            await axiosSecure.patch(`/projects/${activeId}/notes`, { message: noteText });
            toast.success('Note saved!');
            // Refresh
            const res = await axiosSecure.get('/projects');
            setProjects(res.data.projects || []);
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout>
            <div className="mb-8 fade-in-up">
                <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Notes</h1>
                <p className="text-sm mt-1" style={{ color: 'rgba(232,245,233,0.4)' }}>Communicate with admin per project</p>
            </div>

            {loading ? <p className="text-white text-center py-20">Loading...</p> : (
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <p className="text-xs font-semibold mb-3 px-1" style={{ color: 'rgba(232,245,233,0.3)', letterSpacing: '0.08em' }}>YOUR PROJECTS</p>
                        <div className="space-y-2">
                            {projects.map(p => {
                                const hasUserNote = p.notes?.some(n => n.senderRole === 'user');
                                const hasAdminNote = p.notes?.some(n => n.senderRole === 'admin');
                                return (
                                    <button key={p._id} onClick={() => setActiveId(p._id)}
                                        className="w-full text-left p-4 rounded-xl border transition-all"
                                        style={{
                                            background: activeId === p._id ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)',
                                            borderColor: activeId === p._id ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.08)',
                                        }}>
                                        <p className={`text-sm font-semibold ${activeId === p._id ? 'text-green-300' : 'text-white'}`}>{p.title}</p>
                                        <div className="flex gap-2 mt-1.5">
                                            {hasUserNote && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">My note</span>}
                                            {hasAdminNote && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">Admin reply</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                        <div className="glass-card p-5">
                            <p className="text-sm font-semibold text-white mb-3">Admin Note <span className="text-xs ml-2" style={{ color: 'rgba(232,245,233,0.25)' }}>Read only</span></p>
                            {adminNote ? (
                                <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(226,103,12,0.06)', border: '1px solid rgba(226,103,12,0.12)', color: 'rgba(232,245,233,0.8)' }}>
                                    {adminNote}
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl text-sm text-center" style={{ color: 'rgba(232,245,233,0.25)', border: '1px dashed rgba(255,255,255,0.06)' }}>
                                    No admin reply yet
                                </div>
                            )}
                        </div>

                        <div className="glass-card p-5">
                            <p className="text-sm font-semibold text-white mb-3">My Note</p>
                            <textarea
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                rows={6}
                                placeholder="Write a note or question for the admin..."
                                className="input-dark w-full px-4 py-3 text-sm resize-none mb-3"
                            />
                            <div className="flex justify-end">
                                <button onClick={handleSave} disabled={saving || !noteText.trim()}
                                    className="btn-primary-green text-sm px-5 disabled:opacity-50">
                                    {saving ? 'Saving...' : '💾 Save Note'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}