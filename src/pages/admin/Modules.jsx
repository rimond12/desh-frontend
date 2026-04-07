import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const INPUT_TYPES = [
  { value: 'number', label: 'Number', color: '#1D4ED8', bg: '#EFF6FF' },
  { value: 'text', label: 'Text', color: 'var(--g700)', bg: 'var(--g50)' },
  { value: 'checkbox', label: 'Checkbox', color: '#92400E', bg: '#FEF9C3' },
  { value: 'file', label: 'File', color: '#78350F', bg: '#F5F0E8' },
];

function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box fade-in-up" style={{ maxWidth: width, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 17, color: 'var(--tx)', margin: 0 }}>
            {title}
          </h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Lbl({ children, req }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase',
      color: 'var(--tx-muted)', marginBottom: 6, fontFamily: 'Montserrat,sans-serif'
    }}>
      {children}{req && <span style={{ color: '#EF4444' }}> *</span>}
    </p>
  );
}

export default function Modules() {
  const ax = useAxiosSecure();
  const [tabs, setTabs] = useState([]);
  const [tabSearch, setTabSearch] = useState('');
  const [activeTab, setActiveTab] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMod, setOpenMod] = useState(null);
  const [globalSections, setGlobalSections] = useState([]);

  const [MM, setMM] = useState({ open: false, d: null });
  const [IM, setIM] = useState({ open: false, d: null, mId: null });
  const [dragState, setDragState] = useState({ dragId: null, overId: null, groupId: null });

  const loadTabs = useCallback(async () => {
    try {
      const r = await ax.get('/tabs/all');
      const t = r.data.tabs || [];
      setTabs(t);
      if (t.length && !activeTab) setActiveTab(t[0]._id);
    } catch { toast.error('Failed to load tabs'); }
  }, []);

  const loadModules = useCallback(async (tid) => {
    if (!tid) return;
    setLoading(true);
    try {
      const r = await ax.get(`/tabs/${tid}/modules`);
      setModules(r.data.modules || []);
    } catch { toast.error('Failed to load modules'); }
    finally { setLoading(false); }
  }, []);

  const loadGlobalSections = useCallback(async () => {
    try {
      const r = await ax.get('/sections');
      setGlobalSections(r.data.sections || []);
    } catch { /* sections may not be critical */ }
  }, []);

  useEffect(() => { loadTabs(); loadGlobalSections(); }, []);
  useEffect(() => { if (activeTab) loadModules(activeTab); }, [activeTab]);

  const refresh = () => loadModules(activeTab);

  const filteredTabs = tabs.filter(t =>
    t.title.toLowerCase().includes(tabSearch.toLowerCase())
  );

  // ── Module Modal ──────────────────────────────────────────────
  function ModuleModal() {
    const editing = !!MM.d?._id;
    const [f, setF] = useState({
      title: MM.d?.title || '',
      readDetails: MM.d?.readDetails || '',
      sortOrder: MM.d?.sortOrder ?? modules.length + 1,
    });

    const save = async () => {
      if (!f.title.trim()) { toast.error('Title required'); return; }
      try {
        editing
          ? await ax.put(`/tabs/${activeTab}/modules/${MM.d._id}`, f)
          : await ax.post(`/tabs/${activeTab}/modules`, f);
        toast.success(editing ? 'Updated!' : 'Created!');
        setMM({ open: false, d: null }); refresh();
      } catch { toast.error('Failed'); }
    };

    const del = async () => {
      if (!window.confirm('Delete module + all inputs?')) return;
      try {
        await ax.delete(`/tabs/${activeTab}/modules/${MM.d._id}`);
        toast.success('Deleted!');
        setMM({ open: false, d: null }); refresh();
      } catch { toast.error('Failed'); }
    };

    return (
      <Modal open={MM.open} onClose={() => setMM({ open: false, d: null })}
        title={editing ? 'Edit Module' : 'New Module'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Lbl req>Module Title</Lbl>
            <input className="input-field" value={f.title}
              onChange={e => setF({ ...f, title: e.target.value })}
              placeholder="e.g. Energy Efficiency" autoFocus />
          </div>
          <div>
            <Lbl>Guidelines / Read Details</Lbl>
            <textarea className="input-field" rows={3} value={f.readDetails}
              onChange={e => setF({ ...f, readDetails: e.target.value })}
              placeholder="Describe this module…" style={{ resize: 'vertical' }} />
          </div>
          <div>
            <Lbl>Sort Order</Lbl>
            <input type="number" className="input-field" value={f.sortOrder}
              onChange={e => setF({ ...f, sortOrder: Number(e.target.value) })}
              style={{ maxWidth: 100 }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn-primary-green" onClick={save} style={{ flex: 1, justifyContent: 'center' }}>
              {editing ? 'Save Changes' : 'Create Module'}
            </button>
            {editing && <button className="btn-danger" onClick={del}>Delete</button>}
            <button className="btn-secondary" onClick={() => setMM({ open: false, d: null })}>Cancel</button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Input Modal ───────────────────────────────────────────────
  function InputModal() {
    const editing = !!IM.d?._id;

    const [f, setF] = useState({
      label: IM.d?.label || '',
      instruction: IM.d?.instruction || '',
      inputType: IM.d?.inputType || 'number',
      sectionId: IM.d?.sectionId || '',
      isRequired: IM.d?.isRequired ?? false,
      sortOrder: IM.d?.sortOrder ?? 0,
      options: IM.d?.options || [{ label: '', points: 0 }],
      line: IM.d?.line || { x1: 0, y1: 0, x2: 100, y2: 10 },
    });

    const addOpt = () => setF({ ...f, options: [...f.options, { label: '', points: 0 }] });
    const delOpt = i => setF({ ...f, options: f.options.filter((_, j) => j !== i) });
    const setOpt = (i, k, v) => {
      const o = [...f.options]; o[i] = { ...o[i], [k]: v }; setF({ ...f, options: o });
    };
    const setLine = (k, v) => setF({ ...f, line: { ...f.line, [k]: v } });

    const save = async () => {
      if (!f.label.trim()) { toast.error('Label required'); return; }
      if (!f.sectionId) { toast.error('Select a section'); return; }

      const payload = {
        label: f.label,
        instruction: f.instruction,
        inputType: f.inputType,
        sectionId: f.sectionId,
        isRequired: f.isRequired,
        sortOrder: f.sortOrder,
        options: f.inputType === 'checkbox' ? f.options : [],
        line: f.inputType === 'number' ? {
          x1: Number(f.line.x1), y1: Number(f.line.y1),
          x2: Number(f.line.x2), y2: Number(f.line.y2),
        } : undefined,
      };

      try {
        editing
          ? await ax.put(`/tabs/${activeTab}/modules/${IM.mId}/inputs/${IM.d._id}`, payload)
          : await ax.post(`/tabs/${activeTab}/modules/${IM.mId}/inputs`, payload);
        toast.success(editing ? 'Updated!' : 'Created!');
        setIM({ open: false, d: null, mId: null }); refresh();
      } catch { toast.error('Failed'); }
    };

    const del = async () => {
      if (!window.confirm('Delete this input?')) return;
      try {
        await ax.delete(`/tabs/${activeTab}/modules/${IM.mId}/inputs/${IM.d._id}`);
        toast.success('Deleted!');
        setIM({ open: false, d: null, mId: null }); refresh();
      } catch { toast.error('Failed'); }
    };

    const typeInfo = INPUT_TYPES.find(t => t.value === f.inputType);
    const sortedGlobalSections = [...globalSections].sort((a, b) => a.sortOrder - b.sortOrder);

    return (
      <Modal open={IM.open} onClose={() => setIM({ open: false, d: null, mId: null })}
        title={editing ? 'Edit Input Field' : 'Add Input Field'} width={600}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Label */}
          <div>
            <Lbl req>Question / Label</Lbl>
            <input className="input-field" value={f.label}
              onChange={e => setF({ ...f, label: e.target.value })}
              placeholder="e.g. Total site area (sqm)" autoFocus />
          </div>

          {/* Instruction */}
          <div>
            <Lbl>Instruction (shown to user)</Lbl>
            <textarea className="input-field" rows={2} value={f.instruction}
              onChange={e => setF({ ...f, instruction: e.target.value })}
              placeholder="e.g. Enter the total built-up area in square metres..."
              style={{ resize: 'vertical' }} />
          </div>

          {/* Type + Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Lbl req>Input Type</Lbl>
              <select className="input-field" value={f.inputType}
                onChange={e => setF({ ...f, inputType: e.target.value })}>
                {INPUT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {typeInfo && (
                <p style={{ fontSize: 11, color: 'var(--tx-faint)', marginTop: 5, fontWeight: 500 }}>
                  {f.inputType === 'number' && '🔢 Numeric — calculated via straight line equation'}
                  {f.inputType === 'text' && '📝 Free text — no points'}
                  {f.inputType === 'checkbox' && '☑ Multi-select with points per option'}
                  {f.inputType === 'file' && '📎 Document/file upload'}
                </p>
              )}
            </div>
            <div>
              <Lbl req>Section</Lbl>
              <select className="input-field" value={f.sectionId}
                onChange={e => setF({ ...f, sectionId: e.target.value })}>
                <option value="">— Select section —</option>
                {sortedGlobalSections.map(s => (
                  <option key={s._id} value={s._id}>{s.title}</option>
                ))}
              </select>
              {sortedGlobalSections.length === 0 && (
                <p style={{ fontSize: 11, color: '#EF4444', marginTop: 5, fontWeight: 600 }}>
                  No sections found — create sections first via the Sections page
                </p>
              )}
            </div>
          </div>

          {/* Required */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            padding: '10px 14px', background: 'var(--bg-soft)',
            borderRadius: 10, border: '1px solid var(--border)'
          }}>
            <input type="checkbox" checked={f.isRequired}
              onChange={e => setF({ ...f, isRequired: e.target.checked })}
              style={{ width: 17, height: 17, accentColor: 'var(--g600)', cursor: 'pointer' }} />
            <div>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--tx)' }}>Required field</span>
              <span style={{ fontSize: 11.5, color: 'var(--tx-muted)', marginLeft: 8 }}>
                User must fill this before saving
              </span>
            </div>
          </label>

          {/* ── Number: Straight Line Points ── */}
          {f.inputType === 'number' && (
            <div>
              <Lbl>Straight Line Points</Lbl>
              <p style={{ fontSize: 12, color: 'var(--tx-faint)', marginBottom: 12, fontWeight: 500 }}>
                y = [(y2−y1)/(x2−x1)] × (x−x1) + y1 &nbsp;|&nbsp;
                Clamp: x ≤ x1 → y1 pts, x ≥ x2 → y2 pts
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Point 1 */}
                <div style={{
                  padding: '14px 16px', background: 'var(--bg-soft)',
                  border: '1.5px solid var(--border)', borderRadius: 12,
                }}>
                  <p style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--g700)',
                    fontFamily: 'Montserrat,sans-serif', marginBottom: 10
                  }}>Point 1 (x1, y1)</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-muted)', marginBottom: 4 }}>x1 (input value)</p>
                      <input type="number" className="input-field" value={f.line.x1}
                        onChange={e => setLine('x1', e.target.value)}
                        placeholder="0" style={{ padding: '8px 10px' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-muted)', marginBottom: 4 }}>y1 (points)</p>
                      <input type="number" className="input-field" value={f.line.y1}
                        onChange={e => setLine('y1', e.target.value)}
                        placeholder="0" style={{ padding: '8px 10px' }} />
                    </div>
                  </div>
                </div>

                {/* Point 2 */}
                <div style={{
                  padding: '14px 16px', background: 'var(--bg-soft)',
                  border: '1.5px solid var(--border)', borderRadius: 12,
                }}>
                  <p style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--g700)',
                    fontFamily: 'Montserrat,sans-serif', marginBottom: 10
                  }}>Point 2 (x2, y2)</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-muted)', marginBottom: 4 }}>x2 (input value)</p>
                      <input type="number" className="input-field" value={f.line.x2}
                        onChange={e => setLine('x2', e.target.value)}
                        placeholder="100" style={{ padding: '8px 10px' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-muted)', marginBottom: 4 }}>y2 (points)</p>
                      <input type="number" className="input-field" value={f.line.y2}
                        onChange={e => setLine('y2', e.target.value)}
                        placeholder="10" style={{ padding: '8px 10px' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Formula preview */}
              {(f.line.x1 !== '' && f.line.x2 !== '') && (
                <div style={{
                  marginTop: 10, padding: '10px 14px',
                  background: 'var(--g50)', border: '1px solid var(--g200)',
                  borderRadius: 10, fontSize: 12.5, color: 'var(--g800)', fontWeight: 600
                }}>
                  📐 y = [({f.line.y2}−{f.line.y1})/({f.line.x2}−{f.line.x1})] × (x−{f.line.x1}) + {f.line.y1}
                  &nbsp;|&nbsp; max: {Math.max(Number(f.line.y1), Number(f.line.y2))} pts
                </div>
              )}
            </div>
          )}

          {/* ── Checkbox options ── */}
          {f.inputType === 'checkbox' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Lbl>Options &amp; Points</Lbl>
                <button onClick={addOpt} style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--g600)',
                  background: 'var(--g50)', border: '1px solid var(--g200)',
                  borderRadius: 8, padding: '4px 12px', cursor: 'pointer'
                }}>+ Add Option</button>
              </div>
              {f.options.map((o, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 36px', gap: 8, marginBottom: 8 }}>
                  <input className="input-field" value={o.label}
                    onChange={e => setOpt(i, 'label', e.target.value)}
                    placeholder={`Option ${i + 1} label`} style={{ padding: '9px 12px' }} />
                  <div style={{ position: 'relative' }}>
                    <input type="number" className="input-field" value={o.points}
                      onChange={e => setOpt(i, 'points', Number(e.target.value))}
                      placeholder="0" style={{ padding: '9px 12px', paddingRight: 32 }} />
                    <span style={{
                      position: 'absolute', right: 10, top: '50%',
                      transform: 'translateY(-50%)', fontSize: 10,
                      color: 'var(--tx-faint)', fontWeight: 700, pointerEvents: 'none'
                    }}>pts</span>
                  </div>
                  <button onClick={() => delOpt(i)} style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, color: '#EF4444', cursor: 'pointer', fontSize: 14
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Text input preview */}
          {f.inputType === 'text' && (
            <div>
              <div style={{
                padding: '10px 14px', background: 'var(--bg-subtle)',
                borderRadius: 10, border: '1px solid var(--border)',
                fontSize: 13, color: 'var(--tx-muted)', fontWeight: 500,
                marginBottom: 10
              }}>
                📝 Text input — descriptive answers, no points awarded.
              </div>
              <Lbl>Preview (how it looks to user)</Lbl>
              <textarea
                className="input-field"
                rows={3}
                placeholder="User will type their answer here…"
                disabled
                style={{ resize: 'vertical', opacity: 0.6, cursor: 'not-allowed', background: 'var(--bg-subtle)' }}
              />
            </div>
          )}

          {/* File upload preview */}
          {f.inputType === 'file' && (
            <div>
              <div style={{
                padding: '10px 14px', background: 'var(--bg-subtle)',
                borderRadius: 10, border: '1px solid var(--border)',
                fontSize: 13, color: 'var(--tx-muted)', fontWeight: 500,
                marginBottom: 10
              }}>
                📎 File upload — supports PDF, JPG, PNG (max 10MB).
              </div>
              <Lbl>Preview (how it looks to user)</Lbl>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, padding: '14px',
                border: '1.5px dashed var(--border-md)', borderRadius: 10,
                background: 'var(--bg-soft)', opacity: 0.6, cursor: 'not-allowed'
              }}>
                <span style={{ fontSize: 20 }}>📎</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-muted)' }}>
                  Upload document (PDF, JPG, PNG)
                </span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <button className="btn-primary-green" onClick={save} style={{ flex: 1, justifyContent: 'center' }}>
              {editing ? 'Save Changes' : 'Create Input'}
            </button>
            {editing && <button className="btn-danger" onClick={del}>Delete</button>}
            <button className="btn-secondary"
              onClick={() => setIM({ open: false, d: null, mId: null })}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── RENDER ────────────────────────────────────────────────────
  const curTab = tabs.find(t => t._id === activeTab);

  return (
    <Layout isAdmin>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}
        className="fade-in-up">
        <div>
          <h1 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>
            Modules
          </h1>
          <p style={{ color: 'var(--tx-muted)', fontSize: 14 }}>
            Build assessment structure: Tabs → Modules → Input Fields (grouped by Section)
          </p>
        </div>
        {activeTab && (
          <button className="btn-primary-green" onClick={() => setMM({ open: true, d: null })}>
            + New Module
          </button>
        )}
      </div>

      {/* Tab selector */}
      {tabs.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>📁</p>
          <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--tx)', marginBottom: 8 }}>
            No tabs yet
          </h3>
          <p style={{ color: 'var(--tx-muted)', fontSize: 13, marginBottom: 16 }}>
            Create tabs first from the Tabs page
          </p>
          <a href="/admin/tabs" className="btn-primary-green" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            Go to Tabs →
          </a>
        </div>
      ) : (
        <>
          {/* Tab Search + Dropdown */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 280 }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--tx-faint)', fontSize: 14, pointerEvents: 'none'
                }}>🔍</span>
                <input className="input-field" value={tabSearch}
                  onChange={e => setTabSearch(e.target.value)}
                  placeholder="Search tabs..."
                  style={{ paddingLeft: 36 }} />
              </div>

              <select className="input-field"
                value={activeTab || ''}
                onChange={e => { setActiveTab(e.target.value); setOpenMod(null); }}
                style={{ flex: 1, minWidth: 200, maxWidth: 340 }}>
                <option value="">— Select a tab —</option>
                {filteredTabs.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.title}{!t.isActive ? ' (inactive)' : ''}
                  </option>
                ))}
              </select>

              {curTab && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 16px', background: 'var(--g100)',
                  border: '1px solid var(--g200)', borderRadius: 10,
                  fontSize: 13, fontWeight: 700, color: 'var(--g800)', whiteSpace: 'nowrap'
                }}>
                  <span>📁</span>
                  {curTab.title}
                  {!curTab.isActive && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx-faint)' }}>(inactive)</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modules list */}
          {!activeTab ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>👆</p>
              <p style={{ color: 'var(--tx-muted)', fontSize: 14 }}>Select a tab to view its modules</p>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx-muted)' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: '3px solid var(--g100)', borderTopColor: 'var(--g600)',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 14px'
              }} />
              Loading modules…
            </div>
          ) : modules.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>📦</p>
              <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--tx)', marginBottom: 8 }}>
                No modules in "{curTab?.title}"
              </h3>
              <p style={{ color: 'var(--tx-muted)', fontSize: 13, marginBottom: 16 }}>
                Create your first module to get started
              </p>
              <button className="btn-primary-green" onClick={() => setMM({ open: true, d: null })}>
                + New Module
              </button>
            </div>
          ) : (
            modules.map((mod, mi) => {
              const isOpen = openMod === mod._id;

              // Flatten all inputs from old sections structure OR new flat structure
              const allInputs = mod.inputs?.length
                ? mod.inputs
                : (mod.sections || []).flatMap(s => (s.inputs || []).map(inp => ({ ...inp, sectionId: inp.sectionId || s._id })));

              // Group inputs by their sectionId
              const grouped = {};
              allInputs.forEach(inp => {
                const sid = String(inp.sectionId || 'none');
                if (!grouped[sid]) grouped[sid] = [];
                grouped[sid].push(inp);
              });

              // Build ordered section groups using globalSections order
              const sectionGroups = [
                ...globalSections
                  .filter(s => grouped[String(s._id)])
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(s => ({ id: String(s._id), title: s.title, inputs: grouped[String(s._id)] })),
                ...(grouped['none'] ? [{ id: 'none', title: 'Uncategorized', inputs: grouped['none'] }] : []),
              ];

              return (
                <div key={mod._id} className="fade-in-up" style={{
                  border: '1px solid var(--border)', borderRadius: 16,
                  background: '#fff', marginBottom: 12,
                  boxShadow: isOpen ? 'var(--sh-md)' : 'var(--sh-xs)',
                  transition: 'box-shadow 0.2s',
                  animationDelay: `${mi * 0.05}s`
                }}>
                  {/* Module header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', cursor: 'pointer',
                    borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                    background: isOpen ? 'var(--bg-soft)' : 'transparent',
                    borderRadius: isOpen ? '16px 16px 0 0' : 16,
                    transition: 'background 0.18s'
                  }} onClick={() => setOpenMod(isOpen ? null : mod._id)}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg,var(--g700),var(--g500))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 13, fontWeight: 800,
                      fontFamily: 'Montserrat,sans-serif', boxShadow: '0 2px 8px rgba(26,122,53,0.3)'
                    }}>
                      {mi + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--tx)', margin: 0 }}>
                        {mod.title}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--tx-muted)', margin: 0, marginTop: 2 }}>
                        {allInputs.length} input{allInputs.length !== 1 ? 's' : ''} · {sectionGroups.length} section{sectionGroups.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button className="btn-icon" title="Edit module"
                        onClick={e => { e.stopPropagation(); setMM({ open: true, d: mod }); }}>✎</button>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--tx-faint)', fontSize: 16,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s'
                      }}>▾</div>
                    </div>
                  </div>

                  {/* Module body */}
                  {isOpen && (
                    <div style={{ padding: '20px' }}>
                      {mod.readDetails && (
                        <div style={{
                          padding: '10px 14px', background: '#EFF6FF',
                          border: '1px solid #BFDBFE', borderRadius: 10,
                          fontSize: 13, color: '#1D4ED8', fontWeight: 500, marginBottom: 20
                        }}>
                          📋 <strong>Guidelines:</strong> {mod.readDetails}
                        </div>
                      )}

                      {/* Add Input button at module level */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <p style={{
                          fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
                          textTransform: 'uppercase', color: 'var(--tx-muted)',
                          fontFamily: 'Montserrat,sans-serif', margin: 0
                        }}>Input Fields</p>
                        <button onClick={() => setIM({ open: true, d: null, mId: mod._id })}
                          style={{
                            fontSize: 12, fontWeight: 700, color: 'var(--g600)',
                            background: 'var(--g50)', border: '1px solid var(--g200)',
                            borderRadius: 8, padding: '5px 14px', cursor: 'pointer'
                          }}>+ Add Input</button>
                      </div>

                      {allInputs.length === 0 ? (
                        <div style={{
                          padding: 24, textAlign: 'center', background: 'var(--bg-subtle)',
                          borderRadius: 12, border: '1.5px dashed var(--border-md)'
                        }}>
                          <p style={{ color: 'var(--tx-faint)', fontSize: 13, margin: 0 }}>
                            No input fields yet — click "+ Add Input" to create questions
                          </p>
                        </div>
                      ) : (
                        sectionGroups.map(group => (
                          <div key={group.id} style={{
                            border: '1.5px solid var(--border)', borderRadius: 14,
                            overflow: 'hidden', marginBottom: 12, background: 'var(--bg-soft)',
                          }}>
                            {/* Section group header */}
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 16px', background: '#fff',
                              borderBottom: '1px solid var(--border)'
                            }}>
                              <div style={{
                                padding: '3px 10px', borderRadius: 20,
                                background: 'linear-gradient(135deg,var(--g700),var(--g500))',
                                fontSize: 11, fontWeight: 800, color: 'white',
                                fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                              }}>▦ {group.title}</div>
                              <span style={{ fontSize: 11.5, color: 'var(--tx-faint)', fontWeight: 600 }}>
                                {group.inputs.length} field{group.inputs.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {/* Inputs in this section */}
                            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {group.inputs.map((inp, qIdx) => {
                                const tc = INPUT_TYPES.find(t => t.value === inp.inputType);
                                const isDragging = dragState.dragId === inp._id;
                                const isOver = dragState.overId === inp._id && dragState.groupId === group.id;
                                return (
                                  <div key={inp._id}
                                    draggable
                                    onDragStart={e => {
                                      e.dataTransfer.effectAllowed = 'move';
                                      setDragState({ dragId: inp._id, overId: null, groupId: group.id });
                                    }}
                                    onDragOver={e => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'move';
                                      if (inp._id !== dragState.dragId) {
                                        setDragState(s => ({ ...s, overId: inp._id }));
                                      }
                                    }}
                                    onDrop={e => {
                                      e.preventDefault();
                                      const { dragId, overId, groupId: dg } = dragState;
                                      setDragState({ dragId: null, overId: null, groupId: null });
                                      if (!dragId || !overId || dragId === overId || dg !== group.id) return;
                                      const items = [...group.inputs];
                                      const from = items.findIndex(i => i._id === dragId);
                                      const to   = items.findIndex(i => i._id === overId);
                                      if (from === -1 || to === -1) return;
                                      items.splice(to, 0, items.splice(from, 1)[0]);
                                      const orderedIds = sectionGroups.flatMap(g =>
                                        g.id === group.id ? items.map(i => i._id) : g.inputs.map(i => i._id)
                                      );
                                      ax.patch(`/tabs/${activeTab}/modules/${mod._id}/inputs/reorder`, { orderedIds })
                                        .then(() => { toast.success('Order saved'); refresh(); })
                                        .catch(() => toast.error('Failed to save order'));
                                    }}
                                    onDragEnd={() => setDragState({ dragId: null, overId: null, groupId: null })}
                                    style={{
                                      background: '#fff', borderRadius: 11, padding: '12px 14px',
                                      display: 'flex', alignItems: 'flex-start', gap: 12,
                                      border: isOver ? '1.5px solid var(--g400)' : '1px solid var(--border)',
                                      opacity: isDragging ? 0.4 : 1,
                                      cursor: 'grab', transition: 'border-color 0.12s, opacity 0.12s',
                                      boxShadow: isOver ? '0 0 0 3px rgba(34,168,75,0.12)' : 'none',
                                    }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                                        {/* Q number badge — always reflects current sort order */}
                                        <span style={{
                                          fontSize: 10, fontWeight: 900, padding: '2px 7px',
                                          borderRadius: 5, background: 'var(--g700)', color: '#fff',
                                          fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.04em',
                                        }}>Q{qIdx + 1}</span>
                                        <span style={{
                                          fontSize: 10.5, fontWeight: 800, padding: '2px 8px',
                                          borderRadius: 6, background: tc?.bg, color: tc?.color,
                                          letterSpacing: '0.06em', textTransform: 'uppercase',
                                          fontFamily: 'Montserrat,sans-serif'
                                        }}>{inp.inputType}</span>
                                        {inp.isRequired && (
                                          <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 700 }}>● Required</span>
                                        )}
                                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--tx-faint)', fontWeight: 600 }}>
                                          Order: {inp.sortOrder || qIdx + 1}
                                        </span>
                                      </div>
                                      <p style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--tx)', margin: 0, lineHeight: 1.4 }}>
                                        {inp.label}
                                      </p>
                                      {inp.instruction && (
                                        <p style={{ fontSize: 12, color: 'var(--tx-muted)', margin: '3px 0 0', fontStyle: 'italic' }}>
                                          ℹ {inp.instruction}
                                        </p>
                                      )}
                                      {inp.inputType === 'number' && inp.line && (
                                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#EFF6FF', color: '#1D4ED8' }}>
                                            ({inp.line.x1}, {inp.line.y1}pts) → ({inp.line.x2}, {inp.line.y2}pts)
                                          </span>
                                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--g50)', color: 'var(--g700)' }}>
                                            max: {Math.max(Number(inp.line.y1), Number(inp.line.y2))}pts
                                          </span>
                                        </div>
                                      )}
                                      {inp.inputType === 'checkbox' && inp.options?.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                                          {inp.options.map((o, oi) => (
                                            <span key={oi} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#FEF9C3', color: '#92400E' }}>
                                              {o.label} ({o.points}pts)
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <span title="Drag to reorder" style={{ color: 'var(--tx-faint)', fontSize: 14, cursor: 'grab', flexShrink: 0, paddingTop: 2, lineHeight: 1, userSelect: 'none' }}>⠿</span>
                                    <button className="btn-icon" style={{ flexShrink: 0 }}
                                      onClick={() => setIM({ open: true, d: inp, mId: mod._id })}
                                      title="Edit input">✎</button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}

      <ModuleModal />
      <InputModal />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
