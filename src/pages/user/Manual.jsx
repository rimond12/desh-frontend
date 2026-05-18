import { useState, useEffect } from 'react';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';
import Layout from '../../components/shared/Layout.jsx';
import LeafLogo, { ColoredLeaf } from '../../components/shared/LeafLogo.jsx';

// Fallback descriptions keyed by lowercase first word of the level name
const LEVEL_DESC_MAP = {
    green: 'Excellent sustainability performance',
    yellow: 'Good performance with room to improve',
    orange: 'Average — significant improvements needed',
    brown: 'Below standard — major changes required',
};
function levelDesc(name = '') {
    const key = name.toLowerCase().split(' ')[0];
    return LEVEL_DESC_MAP[key] || 'Meets defined sustainability criteria';
}

const steps = [
    { num: '01', title: 'Create a Project', desc: 'Go to "My Projects" and click "New Project". Give your project a descriptive name.' },
    { num: '02', title: 'Fill Assessment', desc: 'Open your project. You will see multiple Tabs and Modules. Fill in each input field carefully.' },
    { num: '03', title: 'Upload Documents', desc: 'Each module may require supporting documents. Upload PDF, JPG, or PNG files as required.' },
    { num: '04', title: 'Save Responses', desc: 'Click "Save" after filling each module. Your score updates in real-time as you fill inputs.' },
    { num: '05', title: 'Get Your Leaf Level', desc: 'Once all modules are filled, your project receives a Leaf Level rating based on total score.' },
    { num: '06', title: 'Communicate with Admin', desc: 'Use the Notes section to send messages or ask questions to the admin about your project.' },
];

const faqs = [
    { q: 'Can I edit my responses after saving?', a: 'Yes, you can edit and re-save your responses at any time before the admin finalizes your submission.' },
    { q: 'What file types can I upload?', a: 'PDF, JPG, JPEG, and PNG files are accepted. Maximum file size is 10MB per file.' },
    { q: 'How is my score calculated?', a: 'Each input field has defined point ranges. Your total points divided by maximum possible points gives your percentage score.' },
    { q: 'Can the admin change my leaf level?', a: 'Yes, the admin can override your leaf level after reviewing your submission and documents.' },
    { q: 'How many projects can I create?', a: 'You can create unlimited projects under your account.' },
];

const BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

function PdfIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="10" fill="#EFF6FF" />
            <path d="M10 8h8l6 6v12a2 2 0 01-2 2H10a2 2 0 01-2-2V10a2 2 0 012-2z" fill="#BFDBFE" stroke="#1D4ED8" strokeWidth="1.2" />
            <path d="M18 8v6h6" stroke="#1D4ED8" strokeWidth="1.2" fill="none" />
            <path d="M12 18h8M12 21h5" stroke="#1D4ED8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}

function VideoIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="10" fill="#FFF7ED" />
            <rect x="6" y="10" width="16" height="12" rx="3" fill="#FED7AA" stroke="#EA580C" strokeWidth="1.2" />
            <path d="M22 13l5-3v12l-5-3V13z" fill="#FED7AA" stroke="#EA580C" strokeWidth="1.2" />
            <circle cx="14" cy="16" r="3" fill="#EA580C" />
            <path d="M13 15l3 1-3 1v-2z" fill="white" />
        </svg>
    );
}

export default function Manual() {
    const axiosSecure = useAxiosSecure();
    const [activeTab, setActiveTab] = useState('guide');
    const [resources, setResources] = useState([]);
    const [loadingResources, setLoadingResources] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all' | 'pdf' | 'video'
    const [evalRules, setEvalRules] = useState([]);
    const [loadingLevels, setLoadingLevels] = useState(true);

    // Fetch leaf levels once on mount — used by the System Guide tab
    useEffect(() => {
        axiosSecure.get('/settings/eval-rules')
            .then(res => setEvalRules(res.data.rules || []))
            .catch(() => { }) // silently fall back to empty; static fallback shown
            .finally(() => setLoadingLevels(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (activeTab !== 'resources') return;
        setLoadingResources(true);
        axiosSecure.get('/resources')
            .then(res => setResources(res.data.resources || []))
            .catch(err => console.error('Error fetching resources:', err))
            .finally(() => setLoadingResources(false));
        // axiosSecure is intentionally omitted: the hook now returns a stable
        // instance (via useRef), so including it would cause no benefit but
        // previously caused an infinite re-render loop on every state update.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const filtered = filter === 'all' ? resources : resources.filter(r => r.type === filter);
    const pdfCount = resources.filter(r => r.type === 'pdf').length;
    const videoCount = resources.filter(r => r.type === 'video').length;

    const getResourceLink = (res) => {
        let link = res.fileUrl ? `${BASE_URL}${res.fileUrl}` : res.linkUrl;
        if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
        return link;
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto fade-in-up">

                {/* Hero */}
                <div className="text-center mb-10">
                    <div className="flex items-end justify-center gap-2 mb-5">
                        {loadingLevels ? (
                            /* Placeholder while levels load */
                            <LeafLogo size={64} animated />
                        ) : evalRules.length === 0 ? (
                            <LeafLogo size={64} animated />
                        ) : (
                            /* Real leaf level icons — smallest at edges, tallest in centre */
                            [...evalRules]
                                .sort((a, b) => a.minPercent - b.minPercent)
                                .map((l, i, arr) => {
                                    const imgUrl = l.imageUrl ? `${BASE_URL}${l.imageUrl}` : null;
                                    const color = l.colorCode || '#94A3B8';
                                    const mid = (arr.length - 1) / 2;
                                    const dist = Math.abs(i - mid);
                                    const size = Math.round(72 - dist * 14);
                                    return (
                                        <div
                                            key={l._id || i}
                                            title={`${l.name}: ${l.minPercent}–${l.maxPercent}%`}
                                            style={{
                                                transition: 'transform 0.25s ease',
                                                cursor: 'default',
                                                filter: `drop-shadow(0 4px 10px ${color}55)`,
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-6px) scale(1.08)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
                                        >
                                            <ColoredLeaf
                                                colorCode={color}
                                                imageUrl={imgUrl}
                                                size={size}
                                            />
                                        </div>
                                    );
                                })
                        )}
                    </div>
                    <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        User Manual
                    </h1>
                    <p className="text-base" style={{ color: 'var(--tx-muted)' }}>
                        Complete guide to using the DESH Sustainable Design Assessment System
                    </p>
                </div>

                {/* Tab switcher */}
                <div className="tab-bar mb-10 max-w-sm mx-auto">
                    <button
                        className={`tab-btn flex-1 ${activeTab === 'guide' ? 'active' : ''}`}
                        onClick={() => setActiveTab('guide')}
                    >
                        📖 System Guide
                    </button>
                    <button
                        className={`tab-btn flex-1 ${activeTab === 'resources' ? 'active' : ''}`}
                        onClick={() => setActiveTab('resources')}
                    >
                        🌿 Eco-Park Resources
                    </button>
                </div>

                {/* ──────────────── TAB 1: SYSTEM GUIDE ──────────────── */}
                {activeTab === 'guide' && (
                    <div className="fade-in-up">
                        <div className="glass-card p-6 mb-6">
                            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                📖 Getting Started
                            </h2>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-muted)' }}>
                                The <strong className="text-white">DESH</strong> system helps you assess and score construction or development
                                projects across multiple evaluation criteria. Your project receives a <strong className="text-white">Leaf Level</strong> rating
                                based on your total score percentage.
                            </p>
                        </div>

                        <div className="glass-card p-6 mb-6">
                            <h2 className="text-xl font-bold mb-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                🪜 How to Use
                            </h2>
                            <div className="space-y-4">
                                {steps.map((s, i) => (
                                    <div key={i} className="flex gap-4 items-start">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                                            style={{ background: 'var(--g100)', color: 'var(--g600)', fontFamily: 'Montserrat, sans-serif' }}>
                                            {s.num}
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <p className="font-semibold text-sm mb-0.5">{s.title}</p>
                                            <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-muted)' }}>{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Leaf Level System ── */}
                        <div className="glass-card p-6 mb-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'var(--g100)' }}>
                                    <LeafLogo size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                        Leaf Level System
                                    </h2>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--tx-muted)' }}>
                                        Your project score is rated across four sustainability tiers
                                    </p>
                                </div>
                            </div>

                            {loadingLevels ? (
                                <div className="flex items-center justify-center py-12 gap-3">
                                    <div style={{
                                        width: 22, height: 22, borderRadius: '50%',
                                        border: '2.5px solid var(--g100)', borderTopColor: 'var(--g600)',
                                        animation: 'spin 0.8s linear infinite', flexShrink: 0,
                                    }} />
                                    <span className="text-sm" style={{ color: 'var(--tx-muted)' }}>Loading levels…</span>
                                </div>
                            ) : evalRules.length === 0 ? (
                                <p className="text-sm text-center py-8" style={{ color: 'var(--tx-muted)' }}>
                                    No leaf levels configured yet. Check back soon.
                                </p>
                            ) : (
                                <>
                                    {/* Level cards */}
                                    <div className="grid sm:grid-cols-2 gap-4 mb-6">
                                        {[...evalRules]
                                            .sort((a, b) => b.minPercent - a.minPercent)
                                            .map((l, idx) => {
                                                const imgUrl = l.imageUrl ? `${BASE_URL}${l.imageUrl}` : null;
                                                const color = l.colorCode || '#94A3B8';
                                                return (
                                                    <div
                                                        key={l._id || idx}
                                                        className="relative overflow-hidden rounded-2xl"
                                                        style={{
                                                            background: `${color}0D`,
                                                            border: `1.5px solid ${color}30`,
                                                            transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                                                        }}
                                                        onMouseEnter={e => {
                                                            e.currentTarget.style.transform = 'translateY(-3px)';
                                                            e.currentTarget.style.boxShadow = `0 10px 28px ${color}28`;
                                                        }}
                                                        onMouseLeave={e => {
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                            e.currentTarget.style.boxShadow = 'none';
                                                        }}
                                                    >
                                                        {/* Top accent bar */}
                                                        <div style={{
                                                            height: 4,
                                                            background: color,
                                                            borderRadius: '16px 16px 0 0',
                                                        }} />

                                                        <div className="p-5 flex gap-4 items-start">
                                                            {/* Leaf icon */}
                                                            <div className="flex-shrink-0 flex items-center justify-center rounded-xl pt-1"
                                                                style={{
                                                                    width: 64, height: 80,
                                                                    background: imgUrl ? 'transparent' : `${color}15`,
                                                                }}>
                                                                <ColoredLeaf
                                                                    colorCode={color}
                                                                    imageUrl={imgUrl}
                                                                    size={54}
                                                                />
                                                            </div>

                                                            {/* Text content */}
                                                            <div className="flex-1 min-w-0 pt-1">
                                                                {/* Name + range row */}
                                                                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                                                                    <span
                                                                        className="font-bold text-sm leading-none"
                                                                        style={{ fontFamily: 'Montserrat, sans-serif', color }}
                                                                    >
                                                                        {l.name}
                                                                    </span>
                                                                    <span
                                                                        className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                                                                        style={{
                                                                            background: `${color}18`,
                                                                            color,
                                                                            border: `1px solid ${color}35`,
                                                                            fontFamily: 'Montserrat, sans-serif',
                                                                        }}
                                                                    >
                                                                        {l.minPercent}–{l.maxPercent}%
                                                                    </span>
                                                                </div>

                                                                {/* Score bar */}
                                                                <div className="rounded-full overflow-hidden mb-3"
                                                                    style={{ height: 5, background: `${color}18` }}>
                                                                    <div
                                                                        className="h-full rounded-full"
                                                                        style={{
                                                                            width: `${l.maxPercent}%`,
                                                                            background: color,
                                                                            opacity: 0.7,
                                                                        }}
                                                                    />
                                                                </div>

                                                                {/* Description */}
                                                                <p className="text-xs leading-relaxed" style={{ color: 'var(--tx-muted)' }}>
                                                                    {levelDesc(l.name)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>

                                    {/* Spectrum bar */}
                                    <div>
                                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--tx-muted)', letterSpacing: '0.05em' }}>
                                            SCORE SPECTRUM
                                        </p>
                                        <div className="flex rounded-xl overflow-hidden" style={{ height: 10 }}>
                                            {[...evalRules]
                                                .sort((a, b) => a.minPercent - b.minPercent)
                                                .map((l, i) => (
                                                    <div
                                                        key={l._id || i}
                                                        style={{
                                                            flex: l.maxPercent - l.minPercent,
                                                            background: l.colorCode || '#94A3B8',
                                                        }}
                                                        title={`${l.name}: ${l.minPercent}–${l.maxPercent}%`}
                                                    />
                                                ))}
                                        </div>
                                        <div className="flex mt-2">
                                            {[...evalRules]
                                                .sort((a, b) => a.minPercent - b.minPercent)
                                                .map((l, i) => (
                                                    <div
                                                        key={l._id || i}
                                                        className="text-center"
                                                        style={{ flex: l.maxPercent - l.minPercent }}
                                                    >
                                                        <span className="text-[10px] font-semibold" style={{ color: l.colorCode || 'var(--tx-muted)' }}>
                                                            {l.minPercent}%
                                                        </span>
                                                    </div>
                                                ))}
                                            <span className="text-[10px] font-semibold ml-auto" style={{ color: 'var(--tx-muted)' }}>
                                                100%
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="glass-card p-6 mb-6">
                            <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                📝 Input Field Types
                            </h2>
                            <div className="space-y-3">
                                {[
                                    { type: 'NUMBER', color: 'var(--g500)', desc: 'Enter a numeric value. Points are awarded based on predefined ranges.' },
                                    { type: 'DROPDOWN', color: '#F8A514', desc: 'Select one option from a list. Each option carries different points.' },
                                    { type: 'RADIO', color: '#E2670C', desc: 'Choose one option from multiple buttons. Similar to dropdown but displayed differently.' },
                                    { type: 'TEXT', color: '#97542A', desc: 'Free text input for descriptive answers. Used for qualitative information.' },
                                ].map(f => (
                                    <div key={f.type} className="flex items-start gap-3 p-3 rounded-xl"
                                        style={{ background: 'var(--bg)', border: '1px solid rgba(34,197,94,0.06)' }}>
                                        <span className="text-xs px-2 py-1 rounded font-mono font-bold flex-shrink-0"
                                            style={{ background: `${f.color}15`, color: f.color }}>
                                            {f.type}
                                        </span>
                                        <p className="text-sm" style={{ color: 'var(--tx-muted)' }}>{f.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card p-6 mb-6">
                            <h2 className="text-xl font-bold mb-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                ❓ Frequently Asked Questions
                            </h2>
                            <div className="space-y-4">
                                {faqs.map((f, i) => (
                                    <div key={i} className="pb-4 border-b last:border-0 last:pb-0"
                                        style={{ borderColor: 'var(--border-md)' }}>
                                        <p className="text-sm font-semibold mb-1">Q: {f.q}</p>
                                        <p className="text-sm" style={{ color: 'var(--tx-muted)' }}>A: {f.a}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="text-center py-6 glass-card p-6">
                            <p className="text-2xl mb-2">🌿</p>
                            <p className="font-bold" style={{ color: 'var(--tx)', fontFamily: 'Montserrat, sans-serif' }}>Need more help?</p>
                            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--tx-muted)' }}>
                                Use the Notes section to communicate directly with the admin
                            </p>
                            <a href="/notes" className="btn-primary-green text-sm inline-flex">Go to Notes →</a>
                        </div>
                    </div>
                )}

                {/* ──────────────── TAB 2: ECO-PARK RESOURCES ──────────────── */}
                {activeTab === 'resources' && (
                    <div className="fade-in-up">

                        {/* Section header */}
                        <div className="glass-card p-6 mb-6" style={{ background: 'linear-gradient(135deg, rgba(22,82,10,0.08) 0%, rgba(34,197,94,0.04) 100%)', border: '1px solid rgba(34,197,94,0.15)' }}>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span style={{ fontSize: 22 }}>🏙️</span>
                                        <h2 className="text-xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--tx)' }}>
                                            Useful Resources for Urban Eco-Park Design
                                        </h2>
                                    </div>
                                    <p className="text-sm" style={{ color: 'var(--tx-muted)' }}>
                                        Access architectural templates, planting checklists, design guidelines, and video tutorials uploaded by the Administrator.
                                    </p>
                                </div>
                                {resources.length > 0 && (
                                    <div className="flex gap-2 flex-shrink-0">
                                        <div className="text-center px-4 py-2 rounded-xl" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                                            <p className="font-bold text-base leading-none" style={{ color: '#1D4ED8' }}>{pdfCount}</p>
                                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#1D4ED8' }}>PDFs</p>
                                        </div>
                                        <div className="text-center px-4 py-2 rounded-xl" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                                            <p className="font-bold text-base leading-none" style={{ color: '#EA580C' }}>{videoCount}</p>
                                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#EA580C' }}>Videos</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Filter pills */}
                        {!loadingResources && resources.length > 0 && (
                            <div className="flex gap-2 mb-6 flex-wrap">
                                {[
                                    { key: 'all', label: `All Resources (${resources.length})` },
                                    { key: 'pdf', label: `📄 PDF Documents (${pdfCount})` },
                                    { key: 'video', label: `🎥 Videos (${videoCount})` },
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => setFilter(f.key)}
                                        className="text-xs font-semibold px-4 py-2 rounded-full transition-all"
                                        style={{
                                            background: filter === f.key ? 'var(--g600)' : 'var(--bg-soft)',
                                            color: filter === f.key ? '#fff' : 'var(--tx-muted)',
                                            border: `1.5px solid ${filter === f.key ? 'var(--g600)' : 'var(--border)'}`,
                                        }}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Loading state */}
                        {loadingResources ? (
                            <div className="text-center py-20">
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    border: '3px solid var(--g100)', borderTopColor: 'var(--g600)',
                                    animation: 'spin 0.8s linear infinite', margin: '0 auto 14px'
                                }} />
                                <p style={{ color: 'var(--tx-muted)', fontSize: 14 }}>Loading resources…</p>
                            </div>
                        ) : resources.length === 0 ? (
                            /* Empty state */
                            <div className="glass-card p-14 text-center my-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                                    style={{ background: 'var(--g100)' }}>
                                    <span style={{ fontSize: 30 }}>🌱</span>
                                </div>
                                <p className="font-bold text-base mb-2" style={{ color: 'var(--tx)', fontFamily: 'Montserrat, sans-serif' }}>
                                    No resources uploaded yet
                                </p>
                                <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-muted)', maxWidth: 360, margin: '0 auto' }}>
                                    The administration team hasn't uploaded any design documents or video resources yet. Check back soon!
                                </p>
                            </div>
                        ) : filtered.length === 0 ? (
                            /* No results for filter */
                            <div className="glass-card p-10 text-center my-4">
                                <p style={{ fontSize: 26, marginBottom: 8 }}>🔍</p>
                                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--tx)' }}>
                                    No {filter === 'pdf' ? 'PDF' : 'Video'} resources found
                                </p>
                                <button onClick={() => setFilter('all')} className="text-xs mt-3 underline" style={{ color: 'var(--g500)' }}>
                                    Show all resources
                                </button>
                            </div>
                        ) : (
                            /* Resource cards grid */
                            <div className="grid sm:grid-cols-2 gap-5 mb-8">
                                {filtered.map(res => {
                                    const isPdf = res.type === 'pdf';
                                    const link = getResourceLink(res);

                                    return (
                                        <div
                                            key={res._id}
                                            className="flex flex-col justify-between overflow-hidden"
                                            style={{
                                                background: 'var(--bg-card, #fff)',
                                                border: '1.5px solid var(--border)',
                                                borderRadius: 20,
                                                boxShadow: 'var(--sh-xs)',
                                                transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, border-color 0.25s ease',
                                                cursor: 'default',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.13)';
                                                e.currentTarget.style.borderColor = isPdf ? '#BFDBFE' : '#FED7AA';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'var(--sh-xs)';
                                                e.currentTarget.style.borderColor = 'var(--border)';
                                            }}
                                        >
                                            {/* Card top accent */}
                                            <div style={{
                                                height: 4,
                                                background: isPdf
                                                    ? 'linear-gradient(90deg, #1D4ED8, #60A5FA)'
                                                    : 'linear-gradient(90deg, #EA580C, #FB923C)',
                                                borderRadius: '20px 20px 0 0',
                                            }} />

                                            <div className="p-5 flex flex-col flex-1">
                                                {/* Icon + badge row */}
                                                <div className="flex items-start justify-between mb-4">
                                                    {isPdf ? <PdfIcon /> : <VideoIcon />}
                                                    <span
                                                        className="text-[11px] font-bold px-3 py-1 rounded-full"
                                                        style={{
                                                            background: isPdf ? '#EFF6FF' : '#FFF7ED',
                                                            color: isPdf ? '#1D4ED8' : '#EA580C',
                                                            border: `1px solid ${isPdf ? '#BFDBFE' : '#FED7AA'}`,
                                                            letterSpacing: '0.04em',
                                                        }}
                                                    >
                                                        {isPdf ? 'PDF' : 'VIDEO'}
                                                    </span>
                                                </div>

                                                {/* Title */}
                                                <h3
                                                    className="font-bold text-base mb-2 leading-snug"
                                                    style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--tx)' }}
                                                >
                                                    {res.title}
                                                </h3>

                                                {/* Description */}
                                                <p
                                                    className="text-sm leading-relaxed flex-1 mb-5"
                                                    style={{ color: 'var(--tx-muted)' }}
                                                >
                                                    {res.description || 'No description provided.'}
                                                </p>

                                                {/* Action button */}
                                                <a
                                                    href={link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                                                    style={{
                                                        background: isPdf
                                                            ? 'linear-gradient(135deg, #1D4ED8, #3B82F6)'
                                                            : 'linear-gradient(135deg, #EA580C, #F97316)',
                                                        color: '#fff',
                                                        boxShadow: isPdf
                                                            ? '0 4px 14px rgba(29,78,216,0.25)'
                                                            : '0 4px 14px rgba(234,88,12,0.25)',
                                                        textDecoration: 'none',
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.transform = 'scale(1.02)';
                                                        e.currentTarget.style.opacity = '0.92';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                        e.currentTarget.style.opacity = '1';
                                                    }}
                                                >
                                                    <span>{isPdf ? '📄' : '▶'}</span>
                                                    <span>{isPdf ? 'Open PDF' : 'Watch Video'}</span>
                                                    <span style={{ opacity: 0.7 }}>↗</span>
                                                </a>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Footer note */}
                        {!loadingResources && resources.length > 0 && (
                            <p className="text-center text-xs mb-6" style={{ color: 'var(--tx-faint)' }}>
                                All resources are provided by the DESH administration team · Opens in a new tab
                            </p>
                        )}
                    </div>
                )}

            </div>
        </Layout>
    );
}
