import Layout from '../../components/shared/Layout.jsx';
import LeafLogo from '../../components/shared/LeafLogo.jsx';

const leafLevels = [
    { name: 'Green Leaf', range: '80–100%', from: '#16520A', to: '#22C55E', desc: 'Excellent sustainability performance' },
    { name: 'Yellow Leaf', range: '60–79%', from: '#F8A514', to: '#C57D0A', desc: 'Good performance with room to improve' },
    { name: 'Orange Leaf', range: '40–59%', from: '#E2670C', to: '#B5520A', desc: 'Average — significant improvements needed' },
    { name: 'Brown Leaf', range: '20–39%', from: '#97542A', to: '#6B3A1F', desc: 'Below standard — major changes required' },
];

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

export default function Manual() {
    return (
        <Layout>
            <div className="max-w-3xl mx-auto fade-in-up">

                {/* Hero */}
                <div className="text-center mb-12">
                    <div className="inline-block mb-4">
                        <LeafLogo size={64} animated />
                    </div>
                    <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        User Manual
                    </h1>
                    <p className="text-base" style={{ color: 'var(--tx-muted)' }}>
                        Complete guide to using the DESH Green Building Assessment System
                    </p>
                </div>

                {/* Getting started */}
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

                {/* Steps */}
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
                                {i < steps.length - 1 && (
                                    <div className="w-px bg-green-500/10 absolute" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Leaf Level guide */}
                <div className="glass-card p-6 mb-6">
                    <h2 className="text-xl font-bold mb-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        🍃 Leaf Level System
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {leafLevels.map(l => (
                            <div key={l.name} className="p-4 rounded-xl relative overflow-hidden"
                                style={{ background: `${l.from}12`, border: `1px solid ${l.from}30` }}>
                                <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
                                    style={{ background: `linear-gradient(180deg, ${l.from}, ${l.to})` }} />
                                <div className="pl-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <svg viewBox="0 0 20 25" width="14" height="17">
                                            <path d="M10 1 C3 5 2 14 10 23 C18 14 17 5 10 1Z"
                                                fill={`url(#grad-${l.name.replace(' ', '')})`} />
                                            <defs>
                                                <linearGradient id={`grad-${l.name.replace(' ', '')}`} x1="0" y1="0" x2="1" y2="1">
                                                    <stop offset="0%" stopColor={l.from} />
                                                    <stop offset="100%" stopColor={l.to} />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <span className="font-bold text-sm">{l.name}</span>
                                        <span className="ml-auto font-bold text-sm" style={{ color: l.to }}>{l.range}</span>
                                    </div>
                                    <p className="text-xs" style={{ color: 'var(--tx-muted)' }}>{l.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Score bar */}
                    <div className="mt-4">
                        <div className="flex rounded-xl overflow-hidden h-3">
                            {leafLevels.slice().reverse().map(l => (
                                <div key={l.name} className="flex-1"
                                    style={{ background: `linear-gradient(90deg, ${l.from}, ${l.to})` }} />
                            ))}
                        </div>
                        <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--tx-muted)' }}>
                            <span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>100%</span>
                        </div>
                    </div>
                </div>

                {/* Input types */}
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

                {/* FAQ */}
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

                {/* Contact */}
                <div className="text-center py-6 glass-card p-6">
                    <p className="text-2xl mb-2">🌿</p>
                    <p className="font-bold" style={{ color: "var(--tx)" }} style={{ fontFamily: 'Montserrat, sans-serif' }}>Need more help?</p>
                    <p className="text-sm mt-1 mb-4" style={{ color: 'var(--tx-muted)' }}>
                        Use the Notes section to communicate directly with the admin
                    </p>
                    <a href="/notes"
                        className="btn-primary-green text-sm inline-flex">
                        Go to Notes →
                    </a>
                </div>

            </div>
        </Layout>
    );
}