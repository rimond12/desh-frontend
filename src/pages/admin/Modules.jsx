import { useState } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';

// ─── Mock Data ───────────────────────────────────────────────
const initTabs = [
  { id: 1, title: 'Site & Environment' },
  { id: 2, title: 'Energy Efficiency' },
  { id: 3, title: 'Water Efficiency' },
];

const initModules = [
  {
    id: 1, tab_id: 1, title: 'Site Selection', sort_order: 1, is_active: true,
    read_details: 'Evaluate site suitability for green construction based on proximity to public transit and environmental impact.',
    inputs: [
      { id: 1, label: 'Distance to public transport (m)', input_type: 'number', sort_order: 1, ranges: [{ id: 1, from: 0, to: 200, points: 10 }, { id: 2, from: 201, to: 500, points: 5 }] },
      { id: 2, label: 'Site zoning type', input_type: 'dropdown', sort_order: 2, options: [{ id: 1, label: 'Urban', points: 10 }, { id: 2, label: 'Suburban', points: 6 }, { id: 3, label: 'Rural', points: 2 }] },
      { id: 3, label: 'Brownfield site?', input_type: 'radio', sort_order: 3, options: [{ id: 4, label: 'Yes', points: 8 }, { id: 5, label: 'No', points: 0 }] },
    ],
    docs: [
      { id: 1, label: 'Site Survey Document', is_required: true, allowed_types: 'pdf,jpg,png', max_size_mb: 10 },
    ],
  },
  {
    id: 2, tab_id: 1, title: 'Stormwater Management', sort_order: 2, is_active: true,
    read_details: 'Assess on-site stormwater management including permeable surfaces and retention ponds.',
    inputs: [
      { id: 4, label: 'Permeable surface area (%)', input_type: 'number', sort_order: 1, ranges: [{ id: 3, from: 0, to: 30, points: 4 }, { id: 4, from: 31, to: 100, points: 10 }] },
      { id: 5, label: 'Rainwater harvesting?', input_type: 'radio', sort_order: 2, options: [{ id: 6, label: 'Yes', points: 8 }, { id: 7, label: 'No', points: 0 }] },
    ],
    docs: [{ id: 2, label: 'Drainage Plan', is_required: false, allowed_types: 'pdf', max_size_mb: 10 }],
  },
  {
    id: 3, tab_id: 2, title: 'Building Envelope', sort_order: 1, is_active: true,
    read_details: 'Thermal performance of walls, roof, floors and openings.',
    inputs: [
      { id: 6, label: 'Wall U-value (W/m²K)', input_type: 'number', sort_order: 1, ranges: [{ id: 5, from: 0, to: 0.3, points: 10 }, { id: 6, from: 0.31, to: 1, points: 5 }] },
      { id: 7, label: 'Roof insulation type', input_type: 'dropdown', sort_order: 2, options: [{ id: 8, label: 'Green Roof', points: 10 }, { id: 9, label: 'PIR Board', points: 8 }, { id: 10, label: 'EPS Foam', points: 6 }, { id: 11, label: 'None', points: 0 }] },
    ],
    docs: [],
  },
];

// ─── Helpers ──────────────────────────────────────────────────
let nextId = 100;
const uid = () => ++nextId;

export default function Modules() {
  const [tabs] = useState(initTabs);
  const [modules, setModules] = useState(initModules);
  const [filterTab, setFilterTab] = useState(0);
  const [viewId, setViewId] = useState(null); // null = list, id = detail

  const filtered = filterTab
    ? modules.filter(m => m.tab_id === filterTab)
    : modules;

  const viewModule = modules.find(m => m.id === viewId);

  // ── module CRUD ──
  const createModule = (tabId, title, order) => {
    const m = { id: uid(), tab_id: Number(tabId), title, sort_order: Number(order), is_active: true, read_details: '', inputs: [], docs: [] };
    setModules(prev => [...prev, m]);
    toast.success('Module created!');
    return m.id;
  };

  const deleteModule = (id) => {
    if (!window.confirm('Delete module and all its inputs?')) return;
    setModules(prev => prev.filter(m => m.id !== id));
    toast.success('Module deleted!');
  };

  const updateReadDetails = (moduleId, text) => {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, read_details: text } : m));
    toast.success('Guidelines saved!');
  };

  // ── input CRUD ──
  const addInput = (moduleId, input) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, inputs: [...m.inputs, { ...input, id: uid() }] } : m
    ));
    toast.success('Input added!');
  };

  const deleteInput = (moduleId, inputId) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, inputs: m.inputs.filter(i => i.id !== inputId) } : m
    ));
    toast.success('Input deleted!');
  };

  // ── doc CRUD ──
  const addDoc = (moduleId, doc) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, docs: [...m.docs, { ...doc, id: uid() }] } : m
    ));
    toast.success('Document slot added!');
  };

  const deleteDoc = (moduleId, docId) => {
    setModules(prev => prev.map(m =>
      m.id === moduleId ? { ...m, docs: m.docs.filter(d => d.id !== docId) } : m
    ));
    toast.success('Document slot deleted!');
  };

  return (
    <Layout isAdmin>
      {viewModule
        ? <ModuleDetail
          module={viewModule}
          tabs={tabs}
          onBack={() => setViewId(null)}
          onUpdateReadDetails={updateReadDetails}
          onAddInput={addInput}
          onDeleteInput={deleteInput}
          onAddDoc={addDoc}
          onDeleteDoc={deleteDoc}
        />
        : <ModuleList
          tabs={tabs}
          modules={filtered}
          allModules={modules}
          filterTab={filterTab}
          setFilterTab={setFilterTab}
          onView={setViewId}
          onDelete={deleteModule}
          onCreate={createModule}
        />
      }
    </Layout>
  );
}

// ══════════════════════════════════════════════════
// MODULE LIST VIEW
// ══════════════════════════════════════════════════
function ModuleList({ tabs, modules, filterTab, setFilterTab, onView, onDelete, onCreate }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tab_id: '', title: '', sort_order: 1 });

  const submit = () => {
    if (!form.tab_id || !form.title.trim()) { toast.error('Tab and title required'); return; }
    onCreate(form.tab_id, form.title, form.sort_order);
    setShowForm(false);
    setForm({ tab_id: '', title: '', sort_order: 1 });
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 fade-in-up">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            Modules
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(232,245,233,0.4)' }}>
            {modules.length} modules — click a module to manage inputs & documents
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary-green text-sm">
          + New Module
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left — filters + new module form */}
        <div className="lg:col-span-1 space-y-4">
          {/* Tab filter */}
          <div>
            <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'rgba(232,245,233,0.3)', letterSpacing: '0.08em' }}>
              FILTER BY TAB
            </p>
            <div className="space-y-1">
              <button onClick={() => setFilterTab(0)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                style={{ background: filterTab === 0 ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.02)', color: filterTab === 0 ? '#4ADE80' : 'rgba(232,245,233,0.5)', border: `1px solid ${filterTab === 0 ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.06)'}` }}>
                All Tabs
              </button>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setFilterTab(t.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all"
                  style={{ background: filterTab === t.id ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.02)', color: filterTab === t.id ? '#4ADE80' : 'rgba(232,245,233,0.5)', border: `1px solid ${filterTab === t.id ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.06)'}` }}>
                  {t.title}
                </button>
              ))}
            </div>
          </div>

          {/* New module form */}
          {showForm && (
            <div className="glass-card p-4" style={{ border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="font-bold text-white text-sm mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>New Module</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'rgba(232,245,233,0.4)' }}>TAB *</label>
                  <select value={form.tab_id} onChange={e => setForm({ ...form, tab_id: e.target.value })}
                    className="input-dark w-full px-3 py-2 text-sm">
                    <option value="">— Select Tab —</option>
                    {tabs.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'rgba(232,245,233,0.4)' }}>TITLE *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Site Area Assessment"
                    className="input-dark w-full px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'rgba(232,245,233,0.4)' }}>SORT ORDER</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })}
                    className="input-dark w-full px-3 py-2 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={submit} className="btn-primary-green text-xs px-3 py-2 flex-1 justify-center">Create</button>
                  <button onClick={() => setShowForm(false)} className="text-xs px-3 py-2 rounded-lg flex-1 text-center"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,245,233,0.4)' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — modules table */}
        <div className="lg:col-span-3">
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Tab</th>
                    <th>Module Title</th>
                    <th>Inputs</th>
                    <th>Docs</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10">
                      <p className="text-2xl mb-2">◈</p>
                      <p className="text-sm" style={{ color: 'rgba(232,245,233,0.3)' }}>No modules yet</p>
                    </td></tr>
                  ) : modules.map(m => {
                    const tab = tabs.find(t => t.id === m.tab_id);
                    return (
                      <tr key={m.id}>
                        <td>
                          <span className="text-xs px-2 py-0.5 rounded font-semibold"
                            style={{ background: 'rgba(34,197,94,0.1)', color: '#4ADE80' }}>
                            {tab?.title || '—'}
                          </span>
                        </td>
                        <td>
                          <p className="font-semibold text-white text-sm">{m.title}</p>
                        </td>
                        <td>
                          <span className="text-xs px-2 py-0.5 rounded font-bold"
                            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}>
                            {m.inputs.length}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs px-2 py-0.5 rounded font-bold"
                            style={{ background: 'rgba(248,165,20,0.1)', color: '#F8A514' }}>
                            {m.docs.length}
                          </span>
                        </td>
                        <td>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${m.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {m.is_active ? '● Active' : '○ Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => onView(m.id)}
                              className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:border-green-500/30"
                              style={{ borderColor: 'rgba(34,197,94,0.15)', color: 'rgba(232,245,233,0.6)', background: 'rgba(34,197,94,0.05)' }}>
                              ✎ Manage
                            </button>
                            <button onClick={() => onDelete(m.id)}
                              className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:border-red-500/30"
                              style={{ borderColor: 'rgba(226,103,12,0.15)', color: 'rgba(226,103,12,0.6)', background: 'rgba(226,103,12,0.04)' }}>
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════
// MODULE DETAIL VIEW
// ══════════════════════════════════════════════════
function ModuleDetail({ module: m, tabs, onBack, onUpdateReadDetails, onAddInput, onDeleteInput, onAddDoc, onDeleteDoc }) {
  const tab = tabs.find(t => t.id === m.tab_id);
  const [readDetails, setReadDetails] = useState(m.read_details);
  const [showAddInput, setShowAddInput] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);

  return (
    <>
      {/* Back + header */}
      <div className="mb-6 fade-in-up">
        <button onClick={onBack} className="flex items-center gap-2 text-sm mb-4 transition-colors hover:text-green-400"
          style={{ color: 'rgba(232,245,233,0.4)' }}>
          ← Back to Modules
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#4ADE80' }}>◈</div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{m.title}</h1>
            <p className="text-xs" style={{ color: 'rgba(232,245,233,0.35)' }}>{tab?.title}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── LEFT: Input Fields ── */}
        <div className="space-y-4">
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(34,197,94,0.08)' }}>
              <h2 className="font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Input Fields <span className="text-sm font-normal ml-1" style={{ color: 'rgba(232,245,233,0.4)' }}>({m.inputs.length})</span>
              </h2>
              <button onClick={() => setShowAddInput(!showAddInput)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#4ADE80' }}>
                + Add Input
              </button>
            </div>

            {/* Add Input Form */}
            {showAddInput && (
              <AddInputForm
                onSave={(input) => { onAddInput(m.id, input); setShowAddInput(false); }}
                onCancel={() => setShowAddInput(false)}
              />
            )}

            {/* Input List */}
            <div className="divide-y" style={{ borderColor: 'rgba(34,197,94,0.06)' }}>
              {m.inputs.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: 'rgba(232,245,233,0.25)' }}>No inputs yet</p>
              ) : m.inputs.map(inp => (
                <div key={inp.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded font-mono font-bold uppercase"
                          style={{ background: typeColor(inp.input_type).bg, color: typeColor(inp.input_type).text }}>
                          {inp.input_type}
                        </span>
                        <p className="text-sm font-semibold text-white">{inp.label}</p>
                      </div>
                      {/* Ranges */}
                      {inp.input_type === 'number' && inp.ranges?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {inp.ranges.map(r => (
                            <span key={r.id} className="text-xs px-2 py-0.5 rounded"
                              style={{ background: 'rgba(34,197,94,0.08)', color: '#4ADE80' }}>
                              {r.from}–{r.to} = {r.points}pts
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Options */}
                      {(inp.input_type === 'dropdown' || inp.input_type === 'radio') && inp.options?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {inp.options.map(o => (
                            <span key={o.id} className="text-xs px-2 py-0.5 rounded"
                              style={{ background: 'rgba(74,222,128,0.08)', color: '#86EFAC' }}>
                              {o.label} = {o.points}pts
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => onDeleteInput(m.id, inp.id)}
                      className="text-xs flex-shrink-0 px-2 py-1 rounded transition-all"
                      style={{ color: 'rgba(226,103,12,0.6)', background: 'rgba(226,103,12,0.05)' }}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Documents + Read Details ── */}
        <div className="space-y-4">
          {/* Document Slots */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(34,197,94,0.08)' }}>
              <h2 className="font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                Support Documents <span className="text-sm font-normal ml-1" style={{ color: 'rgba(232,245,233,0.4)' }}>({m.docs.length})</span>
              </h2>
              <button onClick={() => setShowAddDoc(!showAddDoc)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: 'rgba(248,165,20,0.1)', color: '#F8A514' }}>
                + Add Doc Slot
              </button>
            </div>

            {/* Add Doc Form */}
            {showAddDoc && (
              <AddDocForm
                onSave={(doc) => { onAddDoc(m.id, doc); setShowAddDoc(false); }}
                onCancel={() => setShowAddDoc(false)}
              />
            )}

            {/* Doc List */}
            <div className="divide-y" style={{ borderColor: 'rgba(34,197,94,0.06)' }}>
              {m.docs.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: 'rgba(232,245,233,0.25)' }}>No document slots yet</p>
              ) : m.docs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(248,165,20,0.1)', color: '#F8A514' }}>📄</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{doc.label}</p>
                      <p className="text-xs" style={{ color: 'rgba(232,245,233,0.3)' }}>
                        {doc.allowed_types} · max {doc.max_size_mb}MB ·{' '}
                        <span style={{ color: doc.is_required ? '#E2670C' : '#4ADE80' }}>
                          {doc.is_required ? 'Required' : 'Optional'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button onClick={() => onDeleteDoc(m.id, doc.id)}
                    className="text-xs px-2 py-1 rounded flex-shrink-0"
                    style={{ color: 'rgba(226,103,12,0.6)', background: 'rgba(226,103,12,0.05)' }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Read Details / Guidelines */}
          <div className="glass-card p-5">
            <h2 className="font-bold text-white mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
              📋 Module Guidelines
            </h2>
            <textarea
              value={readDetails}
              onChange={e => setReadDetails(e.target.value)}
              rows={6}
              placeholder="Write guidelines or instructions for this module. Users will see this when filling the assessment..."
              className="input-dark w-full px-4 py-3 text-sm resize-none mb-3"
            />
            <button
              onClick={() => onUpdateReadDetails(m.id, readDetails)}
              className="btn-primary-green w-full justify-center text-sm">
              💾 Save Guidelines
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════
// ADD INPUT FORM
// ══════════════════════════════════════════════════
function AddInputForm({ onSave, onCancel }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState('number');
  const [sortOrder, setSortOrder] = useState(1);
  const [ranges, setRanges] = useState([{ from: '', to: '', points: '' }]);
  const [options, setOptions] = useState([{ label: '', points: '' }]);

  const addRange = () => setRanges([...ranges, { from: '', to: '', points: '' }]);
  const addOption = () => setOptions([...options, { label: '', points: '' }]);
  const removeRange = (i) => setRanges(ranges.filter((_, idx) => idx !== i));
  const removeOption = (i) => setOptions(options.filter((_, idx) => idx !== i));

  const save = () => {
    if (!label.trim()) { toast.error('Label is required'); return; }
    const input = { label, input_type: type, sort_order: Number(sortOrder) };
    if (type === 'number') {
      input.ranges = ranges.filter(r => r.from !== '' && r.to !== '').map(r => ({ id: uid(), from: Number(r.from), to: Number(r.to), points: Number(r.points) }));
    } else if (type === 'dropdown' || type === 'radio') {
      input.options = options.filter(o => o.label.trim()).map(o => ({ id: uid(), label: o.label, points: Number(o.points) }));
    }
    onSave(input);
  };

  return (
    <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(34,197,94,0.08)', background: 'rgba(34,197,94,0.03)' }}>
      <div className="grid sm:grid-cols-3 gap-3 mb-3">
        <div className="sm:col-span-2">
          <label className="block text-xs mb-1.5" style={{ color: 'rgba(232,245,233,0.4)' }}>LABEL *</label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Floor area (m²)"
            className="input-dark w-full px-3 py-2 text-sm" autoFocus />
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'rgba(232,245,233,0.4)' }}>TYPE</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="input-dark w-full px-3 py-2 text-sm">
            <option value="number">Number</option>
            <option value="text">Text</option>
            <option value="dropdown">Dropdown</option>
            <option value="radio">Radio</option>
          </select>
        </div>
      </div>

      {/* Number ranges */}
      {type === 'number' && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold" style={{ color: 'rgba(232,245,233,0.4)' }}>POINT RANGES</label>
            <button onClick={addRange} className="text-xs px-2 py-0.5 rounded"
              style={{ background: 'rgba(34,197,94,0.08)', color: '#4ADE80' }}>+ Add Range</button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-1 text-xs mb-1" style={{ color: 'rgba(232,245,233,0.3)' }}>
              <span>From</span><span>To</span><span>Points</span><span></span>
            </div>
            {ranges.map((r, i) => (
              <div key={i} className="grid grid-cols-4 gap-1 items-center">
                <input type="number" value={r.from} onChange={e => setRanges(ranges.map((x, j) => j === i ? { ...x, from: e.target.value } : x))}
                  placeholder="0" className="input-dark px-2 py-1.5 text-sm" />
                <input type="number" value={r.to} onChange={e => setRanges(ranges.map((x, j) => j === i ? { ...x, to: e.target.value } : x))}
                  placeholder="100" className="input-dark px-2 py-1.5 text-sm" />
                <input type="number" value={r.points} onChange={e => setRanges(ranges.map((x, j) => j === i ? { ...x, points: e.target.value } : x))}
                  placeholder="10" className="input-dark px-2 py-1.5 text-sm" />
                <button onClick={() => removeRange(i)} className="text-xs text-center" style={{ color: 'rgba(226,103,12,0.6)' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dropdown/Radio options */}
      {(type === 'dropdown' || type === 'radio') && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold" style={{ color: 'rgba(232,245,233,0.4)' }}>OPTIONS & POINTS</label>
            <button onClick={addOption} className="text-xs px-2 py-0.5 rounded"
              style={{ background: 'rgba(34,197,94,0.08)', color: '#4ADE80' }}>+ Add Option</button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1 text-xs mb-1" style={{ color: 'rgba(232,245,233,0.3)' }}>
              <span className="col-span-2">Option Label</span><span>Points</span>
            </div>
            {options.map((o, i) => (
              <div key={i} className="grid grid-cols-4 gap-1 items-center">
                <input value={o.label} onChange={e => setOptions(options.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                  placeholder="Option label" className="input-dark col-span-2 px-3 py-1.5 text-sm" />
                <input type="number" value={o.points} onChange={e => setOptions(options.map((x, j) => j === i ? { ...x, points: e.target.value } : x))}
                  placeholder="Pts" className="input-dark px-2 py-1.5 text-sm" />
                <button onClick={() => removeOption(i)} className="text-xs text-center" style={{ color: 'rgba(226,103,12,0.6)' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={save} className="btn-primary-green text-xs px-4 py-2">💾 Save Input</button>
        <button onClick={onCancel} className="text-xs px-4 py-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,245,233,0.4)' }}>Cancel</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// ADD DOC FORM
// ══════════════════════════════════════════════════
function AddDocForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ label: '', allowed_types: 'pdf,jpg,jpeg,png', max_size_mb: 10, is_required: true });

  const save = () => {
    if (!form.label.trim()) { toast.error('Document label required'); return; }
    onSave(form);
  };

  return (
    <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(34,197,94,0.08)', background: 'rgba(248,165,20,0.02)' }}>
      <div className="space-y-3 mb-3">
        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'rgba(232,245,233,0.4)' }}>DOCUMENT LABEL *</label>
          <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
            placeholder="e.g. Site Plan PDF" className="input-dark w-full px-3 py-2 text-sm" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'rgba(232,245,233,0.4)' }}>ALLOWED TYPES</label>
            <input value={form.allowed_types} onChange={e => setForm({ ...form, allowed_types: e.target.value })}
              className="input-dark w-full px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'rgba(232,245,233,0.4)' }}>MAX SIZE (MB)</label>
            <input type="number" value={form.max_size_mb} onChange={e => setForm({ ...form, max_size_mb: Number(e.target.value) })}
              className="input-dark w-full px-3 py-2 text-sm" />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={() => setForm({ ...form, is_required: !form.is_required })}
            className="w-10 h-5 rounded-full relative transition-all"
            style={{ background: form.is_required ? '#22C55E' : 'rgba(255,255,255,0.1)' }}>
            <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
              style={{ left: form.is_required ? '22px' : '2px' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: form.is_required ? '#4ADE80' : 'rgba(232,245,233,0.4)' }}>
            {form.is_required ? 'Required' : 'Optional'}
          </span>
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={save} className="btn-primary-green text-xs px-4 py-2">💾 Add Document Slot</button>
        <button onClick={onCancel} className="text-xs px-4 py-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(232,245,233,0.4)' }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Util ──
function typeColor(type) {
  return {
    number: { bg: 'rgba(34,197,94,0.12)', text: '#4ADE80' },
    text: { bg: 'rgba(148,163,184,0.12)', text: '#94A3B8' },
    dropdown: { bg: 'rgba(248,165,20,0.12)', text: '#F8A514' },
    radio: { bg: 'rgba(226,103,12,0.12)', text: '#E2670C' },
  }[type] || { bg: 'rgba(255,255,255,0.06)', text: 'rgba(232,245,233,0.5)' };
}