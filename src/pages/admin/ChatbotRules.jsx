import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function ChatbotRules() {
    const axiosSecure = useAxiosSecure();
    const [rules, setRules] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form states
    const [editingId, setEditingId] = useState(null);
    const [trigger, setTrigger] = useState("");
    const [answer, setAnswer] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [presets, setPresets] = useState([]);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await axiosSecure.get('/chatbot/admin/rules');
            setRules(res.data.rules || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load Q&A rules");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleOpenCreateModal = () => {
        setEditingId(null);
        setTrigger("");
        setAnswer("");
        setIsActive(true);
        setPresets([]);
        setModalOpen(true);
    };

    const handleOpenEditModal = (rule) => {
        setEditingId(rule._id);
        setTrigger(rule.trigger);
        setAnswer(rule.answer);
        setIsActive(rule.isActive !== false);
        setPresets(rule.presets || []);
        setModalOpen(true);
    };

    const handleDeleteRule = async (id, triggerText) => {
        if (!window.confirm(`Are you sure you want to delete the rule for "${triggerText}"?`)) return;
        try {
            await axiosSecure.delete(`/chatbot/admin/rules/${id}`);
            toast.success("Rule deleted successfully");
            fetchRules();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete rule");
        }
    };

    const handleAddPreset = () => {
        setPresets(prev => [...prev, { label: "", action: "query", url: "" }]);
    };

    const handleRemovePreset = (idx) => {
        setPresets(prev => prev.filter((_, i) => i !== idx));
    };

    const handleUpdatePresetField = (idx, field, value) => {
        setPresets(prev => prev.map((preset, i) => {
            if (i === idx) {
                return { ...preset, [field]: value };
            }
            return preset;
        }));
    };

    const handleSaveRule = async (e) => {
        e.preventDefault();
        if (!trigger.trim() || !answer.trim()) {
            toast.error("Trigger and Answer are required.");
            return;
        }

        // Validate presets
        for (const preset of presets) {
            if (!preset.label.trim()) {
                toast.error("All presets must have a label.");
                return;
            }
            if (preset.action === 'link' && !preset.url.trim()) {
                toast.error("Please provide a URL for link action presets.");
                return;
            }
        }

        setSaving(true);
        const payload = { trigger, answer, isActive, presets };

        try {
            if (editingId) {
                await axiosSecure.put(`/chatbot/admin/rules/${editingId}`, payload);
                toast.success("Rule updated successfully");
            } else {
                await axiosSecure.post('/chatbot/admin/rules', payload);
                toast.success("Rule created successfully");
            }
            setModalOpen(false);
            fetchRules();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to save rule");
        } finally {
            setSaving(false);
        }
    };

    const filteredRules = rules.filter(r => 
        r.trigger.toLowerCase().includes(search.toLowerCase()) ||
        r.answer.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Layout isAdmin={true}>
            <div className="fade-in-up">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            🤖 Chatbot Rules Manager
                        </h1>
                        <p className="text-xs text-white/50 mt-1">
                            Configure triggers, answers, and quick reply presets for the DESH Ai floating assistant.
                        </p>
                    </div>
                    <button
                        onClick={handleOpenCreateModal}
                        className="btn-primary-green text-sm px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
                    >
                        <span>+</span> Add Q&A Rule
                    </button>
                </div>

                {/* Filter and Search */}
                <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                        <input
                            type="text"
                            placeholder="Search by trigger phrase or answer text..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-dark w-full pl-4 pr-4 py-2.5 rounded-xl text-sm"
                        />
                    </div>
                </div>

                {/* Table list */}
                <div className="glass-card overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 gap-3 text-white/50">
                            <div style={{
                                width: 26, height: 26, borderRadius: '50%',
                                border: '3px solid var(--g100)', borderTopColor: 'var(--g600)',
                                animation: 'spin 0.8s linear infinite', flexShrink: 0,
                            }} />
                            <span className="text-sm">Loading Q&A rules...</span>
                        </div>
                    ) : filteredRules.length === 0 ? (
                        <div className="text-center py-20 text-white/40">
                            <p className="text-3xl mb-2">🤖</p>
                            <p className="font-semibold text-sm">No rules found</p>
                            <p className="text-xs mt-1 text-white/30">Create a rule to get started.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead className="text-[11px] font-bold text-white/40 uppercase tracking-wider bg-black/10 border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4">Trigger / Keywords</th>
                                        <th className="px-6 py-4">Answer Response</th>
                                        <th className="px-6 py-4">Presets (Quick Actions)</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredRules.map(rule => (
                                        <tr key={rule._id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-bold text-emerald-300 max-w-[200px] truncate">
                                                {rule.trigger}
                                            </td>
                                            <td className="px-6 py-4 text-white/80 max-w-[320px] truncate">
                                                {rule.answer}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-white/60">
                                                {rule.presets && rule.presets.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {rule.presets.map((preset, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="px-2 py-0.5 rounded bg-white/5 border border-white/10"
                                                                title={`${preset.action} -> ${preset.url || '(none)'}`}
                                                            >
                                                                {preset.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="italic text-white/30">None</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                                                    rule.isActive !== false
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-white/5 text-white/30 border border-white/10'
                                                }`}>
                                                    {rule.isActive !== false ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenEditModal(rule)}
                                                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRule(rule._id, rule.trigger)}
                                                        className="px-3 py-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/40 text-red-300 hover:text-red-200 border border-red-900/30 hover:border-red-600/40 transition-all text-xs font-semibold cursor-pointer"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Edit / Create */}
            {modalOpen && (
                <div style={{ zIndex: 9999 }} className="fixed inset-0 flex items-center justify-center px-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    {/* Card container */}
                    <div
                        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden border border-white/10 text-white bg-neutral-900 shadow-2xl"
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                {editingId ? 'Edit Q&A Rule' : 'Add New Q&A Rule'}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveRule} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                            {/* Trigger Field */}
                            <div>
                                <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">
                                    Trigger Keyword / Phrase
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={trigger}
                                    onChange={(e) => setTrigger(e.target.value)}
                                    placeholder="e.g. How to use, resources, leaf levels"
                                    className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
                                />
                            </div>

                            {/* Answer Field */}
                            <div>
                                <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">
                                    Bot Answer Response
                                </label>
                                <textarea
                                    required
                                    rows={5}
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="Type the bot response text here. Markdown double asterisks (e.g. **bold**) are supported."
                                    className="input-dark w-full px-4 py-2.5 rounded-xl text-sm leading-relaxed"
                                />
                            </div>

                            {/* Active Switch */}
                            <div className="flex items-center gap-2 py-1">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="rounded border-white/10 text-emerald-600 bg-neutral-800"
                                />
                                <label htmlFor="isActive" className="text-xs font-semibold text-white/70 select-none cursor-pointer">
                                    Rule is Active (bot can match this trigger)
                                </label>
                            </div>

                            {/* Presets Manager */}
                            <div className="border-t border-white/5 pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider">
                                        Clickable Presets (Quick Actions)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddPreset}
                                        className="text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                                    >
                                        + Add Preset Button
                                    </button>
                                </div>

                                {presets.length === 0 ? (
                                    <p className="text-xs text-white/30 italic py-2">
                                        No presets configured. Default assistant options will be used if no presets are set.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {presets.map((preset, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-xl border border-white/5 bg-black/10 flex flex-col gap-3 relative"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePreset(idx)}
                                                    className="absolute top-2 right-2 text-xs text-red-400 hover:text-red-300 font-bold cursor-pointer"
                                                    title="Remove preset"
                                                >
                                                    Remove
                                                </button>

                                                <div className="grid sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-white/40 uppercase mb-1">
                                                            Button Label
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="Button Text"
                                                            value={preset.label}
                                                            onChange={(e) => handleUpdatePresetField(idx, "label", e.target.value)}
                                                            className="input-dark w-full px-3 py-1.5 rounded-lg text-xs"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-white/40 uppercase mb-1">
                                                            Action Type
                                                        </label>
                                                        <select
                                                            value={preset.action}
                                                            onChange={(e) => handleUpdatePresetField(idx, "action", e.target.value)}
                                                            className="input-dark w-full px-3 py-1.5 rounded-lg text-xs"
                                                        >
                                                            <option value="query">Ask Trigger (Quick Reply)</option>
                                                            <option value="resources">Show Manual Resources</option>
                                                            <option value="link">Open URL Link</option>
                                                            <option value="human_support">Connect to Human Queue</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {preset.action === "link" && (
                                                    <div>
                                                        <label className="block text-[9px] font-bold text-white/40 uppercase mb-1">
                                                            Redirect URL Link
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="e.g. /manual or https://..."
                                                            value={preset.url || ""}
                                                            onChange={(e) => handleUpdatePresetField(idx, "url", e.target.value)}
                                                            className="input-dark w-full px-3 py-1.5 rounded-lg text-xs"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="border-t border-white/5 pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary-green px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    {saving ? 'Saving...' : 'Save Rule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
