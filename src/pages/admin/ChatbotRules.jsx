import { useState, useEffect, useCallback } from 'react';
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

    const fetchRules = useCallback(async () => {
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
    }, [axiosSecure]);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

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
                        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            🤖 DESH Ai Manager
                        </h1>
                        <p className="text-xs mt-1" style={{ color: 'var(--tx-muted)' }}>
                            Configure triggers, answers, and quick reply presets for the DESH Ai floating assistant.
                        </p>
                    </div>
                    <button
                        onClick={handleOpenCreateModal}
                        className="btn-primary-green"
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
                            className="input-field w-full pl-4 pr-4 py-2.5 rounded-xl text-sm"
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
                            <span className="text-sm" style={{ color: 'var(--tx-muted)' }}>Loading rules...</span>
                        </div>
                    ) : filteredRules.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--tx-faint)' }}>
                            <p className="text-3xl mb-2">🤖</p>
                            <p className="font-semibold text-sm">No rules found</p>
                            <p className="text-xs mt-1">Create a rule to get started.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="premium-table">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-4">Trigger / Keywords</th>
                                        <th className="px-6 py-4">Answer Response</th>
                                        <th className="px-6 py-4">Presets (Quick Actions)</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRules.map(rule => (
                                        <tr key={rule._id}>
                                            <td className="px-6 py-4 font-bold max-w-[200px] truncate" style={{ color: 'var(--g700)' }}>
                                                {rule.trigger}
                                            </td>
                                            <td className="px-6 py-4 max-w-[320px] truncate" style={{ color: 'var(--tx-2)' }}>
                                                {rule.answer}
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                {rule.presets && rule.presets.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {rule.presets.map((preset, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="px-2 py-0.5 rounded text-[10px] font-semibold"
                                                                style={{ 
                                                                    background: 'var(--bg-soft)', 
                                                                    border: '1px solid var(--border)', 
                                                                    color: 'var(--tx-muted)' 
                                                                }}
                                                                title={`${preset.action} -> ${preset.url || '(none)'}`}
                                                            >
                                                                {preset.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="italic" style={{ color: 'var(--tx-faint)' }}>None</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                                                    rule.isActive !== false
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                        : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                                                }`}>
                                                    {rule.isActive !== false ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenEditModal(rule)}
                                                        className="btn-secondary"
                                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRule(rule._id, rule.trigger)}
                                                        className="btn-danger"
                                                        style={{ padding: '6px 12px', fontSize: '12px' }}
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
                <div className="modal-overlay">
                    {/* Backdrop */}
                    <div className="absolute inset-0" onClick={() => setModalOpen(false)} />
                    {/* Card container */}
                    <div
                        className="modal-box relative w-full max-w-xl max-h-[90vh] flex flex-col p-6 shadow-2xl"
                    >
                        {/* Modal Header */}
                        <div className="pb-4 border-b border-white/5 flex items-center justify-between mb-4">
                            <h3 className="font-bold text-base" style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--tx)' }}>
                                {editingId ? 'Edit Q&A Rule' : 'Add New Q&A Rule'}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1 rounded hover:bg-black/5"
                                style={{ color: 'var(--tx-muted)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveRule} className="flex-1 overflow-y-auto space-y-4 pr-1">
                            {/* Trigger Field */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--tx-muted)' }}>
                                    Trigger Keyword / Phrase
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={trigger}
                                    onChange={(e) => setTrigger(e.target.value)}
                                    placeholder="e.g. How to use, resources, leaf levels"
                                    className="input-field w-full"
                                />
                            </div>

                            {/* Answer Field */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--tx-muted)' }}>
                                    Bot Answer Response
                                </label>
                                <textarea
                                    required
                                    rows={5}
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="Type the bot response text here. Markdown double asterisks (e.g. **bold**) are supported."
                                    className="input-field w-full leading-relaxed"
                                />
                            </div>

                            {/* Active Switch */}
                            <div className="flex items-center gap-2 py-1">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <label htmlFor="isActive" className="text-xs font-semibold select-none cursor-pointer" style={{ color: 'var(--tx-muted)' }}>
                                    Rule is Active (bot can match this trigger)
                                </label>
                            </div>

                            {/* Presets Manager */}
                            <div className="border-t border-neutral-100 pt-4">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--tx-muted)' }}>
                                        Clickable Presets (Quick Actions)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddPreset}
                                        className="text-xs font-bold hover:underline cursor-pointer"
                                        style={{ color: 'var(--g700)' }}
                                    >
                                        + Add Preset Button
                                    </button>
                                </div>

                                {presets.length === 0 ? (
                                    <p className="text-xs italic py-2" style={{ color: 'var(--tx-faint)' }}>
                                        No presets configured. Default assistant options will be used if no presets are set.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {presets.map((preset, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-xl relative"
                                                style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePreset(idx)}
                                                    className="absolute top-2 right-2 text-xs font-bold cursor-pointer"
                                                    style={{ color: '#DC2626', border: 'none', background: 'transparent' }}
                                                    title="Remove preset"
                                                >
                                                    Remove
                                                </button>

                                                <div className="grid sm:grid-cols-2 gap-3 mt-1.5">
                                                    <div>
                                                        <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: 'var(--tx-faint)' }}>
                                                            Button Label
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="Button Text"
                                                            value={preset.label}
                                                            onChange={(e) => handleUpdatePresetField(idx, "label", e.target.value)}
                                                            className="input-field w-full"
                                                            style={{ padding: '6px 10px', fontSize: '12px' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: 'var(--tx-faint)' }}>
                                                            Action Type
                                                        </label>
                                                        <select
                                                            value={preset.action}
                                                            onChange={(e) => handleUpdatePresetField(idx, "action", e.target.value)}
                                                            className="input-field w-full"
                                                            style={{ padding: '6px 10px', fontSize: '12px' }}
                                                        >
                                                            <option value="query">Ask Trigger (Quick Reply)</option>
                                                            <option value="resources">Show Manual Resources</option>
                                                            <option value="link">Open URL Link</option>
                                                            <option value="human_support">Connect to Human Queue</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {preset.action === "link" && (
                                                    <div className="mt-2.5">
                                                        <label className="block text-[9px] font-bold uppercase mb-1" style={{ color: 'var(--tx-faint)' }}>
                                                            Redirect URL Link
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="e.g. /manual or https://..."
                                                            value={preset.url || ""}
                                                            onChange={(e) => handleUpdatePresetField(idx, "url", e.target.value)}
                                                            className="input-field w-full"
                                                            style={{ padding: '6px 10px', fontSize: '12px' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="border-t border-neutral-100 pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary-green"
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
