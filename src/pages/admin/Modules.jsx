import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function IconImg({ src, fallback, size = 40 }) {
  const [failed, setFailed] = useState(false);
  const r = Math.round(size * 0.28);
  if (!src || failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: r, flexShrink: 0,
        background: 'linear-gradient(135deg,var(--g700),var(--g500))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: Math.round(size * 0.35), fontWeight: 800,
        fontFamily: 'Montserrat,sans-serif', boxShadow: '0 2px 8px rgba(26,122,53,0.3)',
      }}>{fallback}</div>
    );
  }
  return (
    <img src={src} alt="" onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain', borderRadius: r, flexShrink: 0, background: 'var(--bg-subtle)', padding: 5, border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(26,122,53,0.15)' }} />
  );
}

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
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');

  const [MM, setMM] = useState({ open: false, d: null });
  const [IM, setIM] = useState({ open: false, d: null, mId: null });
  const [dragState, setDragState] = useState({ dragId: null, overId: null, groupId: null });
  const [moduleDragState, setModuleDragState] = useState({ dragId: null, overId: null });
  const [globalCalcDefaults, setGlobalCalcDefaults] = useState({ name: 'Calculate', color: '#22A84B' });

  const loadTabs = useCallback(async () => {
    try {
      const r = await ax.get('/tabs/all');
      const t = r.data.tabs || [];
      setTabs(t);
      if (t.length && !activeTab) setActiveTab(t[0]._id);
    } catch { toast.error('Failed to load tabs'); }
  }, [ax, activeTab]);

  const loadCategories = useCallback(async () => {
    try {
      const r = await ax.get('/categories');
      setCategories(r.data.categories || []);
    } catch { toast.error('Failed to load categories'); }
  }, [ax]);

  const loadModules = useCallback(async (tid) => {
    if (!tid) return;
    setLoading(true);
    try {
      const r = await ax.get(`/tabs/${tid}/modules`);
      setModules(r.data.modules || []);
    } catch { toast.error('Failed to load modules'); }
    finally { setLoading(false); }
  }, [ax]);

  const loadGlobalSections = useCallback(async () => {
    try {
      const r = await ax.get('/sections');
      setGlobalSections(r.data.sections || []);
    } catch { /* sections may not be critical */ }
  }, [ax]);

  useEffect(() => {
    loadTabs();
    loadCategories();
    loadGlobalSections();
    ax.get('/settings').then(r => {
      const s = r.data.settings;
      if (s.calcBtnName || s.calcBtnColor) {
        setGlobalCalcDefaults({
          name:  s.calcBtnName  || 'Calculate',
          color: s.calcBtnColor || '#22A84B',
        });
      }
    }).catch(() => {});
  }, [loadTabs, loadCategories, loadGlobalSections, ax]);

  useEffect(() => {
    if (activeTab) {
      loadModules(activeTab);
    } else {
      setModules([]);
    }
  }, [activeTab, loadModules]);

  const refresh = () => loadModules(activeTab);

  const reorderModules = (dragId, overId) => {
    const arr = [...modules].sort((a, b) => a.sortOrder - b.sortOrder);
    const from = arr.findIndex(x => x._id === dragId);
    const to = arr.findIndex(x => x._id === overId);
    if (from === -1 || to === -1) return;
    const reordered = [...arr];
    reordered.splice(to, 0, reordered.splice(from, 1)[0]);
    setModules(reordered);
    ax.patch(`/tabs/${activeTab}/modules/reorder`, { orderedIds: reordered.map(m => m._id) })
      .then(() => toast.success('Order saved'))
      .catch(() => { toast.error('Failed to save order'); refresh(); });
  };

  const filteredTabs = tabs.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(tabSearch.toLowerCase());
    if (!categoryFilter) return matchesSearch;
    return matchesSearch && t.categories?.some(cat => (cat._id || cat) === categoryFilter);
  });

  const handleCategoryFilterChange = (catId) => {
    setCategoryFilter(catId);
    setOpenMod(null);
    const newFiltered = tabs.filter(t => {
      if (!catId) return true;
      return t.categories?.some(cat => (cat._id || cat) === catId);
    });
    if (newFiltered.length > 0) {
      if (!newFiltered.some(t => t._id === activeTab)) {
        setActiveTab(newFiltered[0]._id);
      }
    } else {
      setActiveTab(null);
    }
  };

  // ── Module Modal ──────────────────────────────────────────────
  function ModuleModal() {
    const editing = !!MM.d?._id;

    // Find tab of the module we are editing (if editing) or the active tab (if creating)
    const initialTabId = editing ? MM.d?.tabId : activeTab;
    const initialTabObj = tabs.find(t => t._id === initialTabId);

    // Find initial category ID
    let initialCategoryId = "";
    if (editing) {
      if (initialTabObj && initialTabObj.categories?.length > 0) {
        initialCategoryId = initialTabObj.categories[0]._id || initialTabObj.categories[0];
      }
    } else {
      if (categoryFilter) {
        initialCategoryId = categoryFilter;
      } else if (initialTabObj && initialTabObj.categories?.length > 0) {
        initialCategoryId = initialTabObj.categories[0]._id || initialTabObj.categories[0];
      }
    }

    const [f, setF] = useState({
      title: MM.d?.title || '',
      readDetails: MM.d?.readDetails || '',
      sortOrder: MM.d?.sortOrder ?? modules.length + 1,
      categoryId: initialCategoryId,
      tabId: initialTabId || '',
    });

    const [iconFile, setIconFile] = useState(null);
    const [iconPreview, setIconPreview] = useState(
      MM.d?.iconUrl ? `${SERVER_URL}${MM.d.iconUrl}` : ''
    );

    // Filter tabs by category chosen in modal
    const modalFilteredTabs = tabs.filter(t => {
      if (!f.categoryId) return true;
      return t.categories?.some(cat => (cat._id || cat) === f.categoryId);
    });

    const handleModalCategoryChange = (catId) => {
      const filtered = tabs.filter(t => {
        if (!catId) return true;
        return t.categories?.some(cat => (cat._id || cat) === catId);
      });
      let nextTabId = "";
      if (filtered.length > 0) {
        if (filtered.some(t => t._id === f.tabId)) {
          nextTabId = f.tabId;
        } else {
          nextTabId = filtered[0]._id;
        }
      }
      setF(prev => ({
        ...prev,
        categoryId: catId,
        tabId: nextTabId
      }));
    };

    const handleIconChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    };

    const save = async () => {
      if (!f.title.trim()) { toast.error('Title required'); return; }
      if (!f.tabId) { toast.error('Tab selection required'); return; }
      try {
        const fd = new FormData();
        fd.append('title', f.title);
        fd.append('readDetails', f.readDetails);
        fd.append('sortOrder', Number(f.sortOrder));
        fd.append('tabId', f.tabId);
        if (iconFile) fd.append('icon', iconFile);

        editing
          ? await ax.put(`/tabs/${f.tabId}/modules/${MM.d._id}`, fd)
          : await ax.post(`/tabs/${f.tabId}/modules`, fd);
        toast.success(editing ? 'Updated!' : 'Created!');
        
        if (f.categoryId && categoryFilter && f.categoryId !== categoryFilter) {
          setCategoryFilter(f.categoryId);
        }
        setActiveTab(f.tabId);
        setMM({ open: false, d: null });
        loadModules(f.tabId);
      } catch { toast.error('Failed'); }
    };

    const del = async () => {
      if (!window.confirm('Delete module + all inputs?')) return;
      try {
        await ax.delete(`/tabs/${f.tabId}/modules/${MM.d._id}`);
        toast.success('Deleted!');
        setMM({ open: false, d: null });
        loadModules(f.tabId);
      } catch { toast.error('Failed'); }
    };

    return (
      <Modal open={MM.open} onClose={() => setMM({ open: false, d: null })}
        title={editing ? 'Edit Module' : 'New Module'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Lbl req>Project Category</Lbl>
            <select className="input-field" value={f.categoryId}
              onChange={e => handleModalCategoryChange(e.target.value)}>
              <option value="">— Select Category —</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Lbl req>Tab</Lbl>
            <select className="input-field" value={f.tabId}
              onChange={e => setF({ ...f, tabId: e.target.value })}>
              <option value="">— Select Tab —</option>
              {modalFilteredTabs.map(t => (
                <option key={t._id} value={t._id}>
                  {t.title}{!t.isActive ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
          </div>
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
            <Lbl>Module Icon</Lbl>
            {iconPreview && (
              <div style={{ marginBottom: 8 }}>
                <img src={iconPreview} alt="icon preview"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                  style={{
                    height: 48, width: 48, objectFit: 'contain',
                    borderRadius: 8, border: '1px solid var(--border-md)',
                    background: 'var(--bg-subtle)', padding: 4, display: 'block'
                  }} />
              </div>
            )}
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', padding: '8px 14px', borderRadius: 10,
              border: '1.5px dashed var(--border-md)', background: 'var(--bg-subtle)',
              fontSize: 12, color: 'var(--tx-muted)', fontWeight: 600
            }}>
              <span>📎</span>
              <span>{iconFile ? iconFile.name : (iconPreview ? 'Replace icon…' : 'Upload icon…')}</span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIconChange} />
            </label>
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
    const [instrTab, setInstrTab] = useState('write'); // 'write' | 'preview'

    const insertHtml = (snippet) => {
      setF(prev => ({ ...prev, instruction: prev.instruction + snippet }));
    };

    const [f, setF] = useState({
      label: IM.d?.label || '',
      instruction: IM.d?.instruction || '',
      details: IM.d?.details || '',
      inputType: IM.d?.inputType || 'number',
      sectionId: IM.d?.sectionId || '',
      isRequired: IM.d?.isRequired ?? false,
      sortOrder: IM.d?.sortOrder ?? 0,
      options: IM.d?.options || [{ label: '', points: 0 }],
      line: IM.d?.line || { x1: 0, y1: 0, x2: 100, y2: 10 },
      showSlider: IM.d?.showSlider ?? false,
      sliderMin: IM.d?.sliderMin != null ? String(IM.d.sliderMin) : '',
      sliderMax: IM.d?.sliderMax != null ? String(IM.d.sliderMax) : '',
      calcBtn: {
        url:   IM.d?.calcBtn?.url   ?? '',
        name:  IM.d?.calcBtn?.name  ?? globalCalcDefaults.name,
        color: IM.d?.calcBtn?.color ?? globalCalcDefaults.color,
        calcId: IM.d?.calcBtn?.calcId ?? '',
      },
    });

    const [calcSearch, setCalcSearch] = useState('');
    const [calcDropdownOpen, setCalcDropdownOpen] = useState(false);
    const [calcOptions, setCalcOptions] = useState([]);

    useEffect(() => {
      async function loadCalcOptions() {
        if (!IM.open) return;
        const activeTabObj = tabs.find(t => t._id === activeTab);
        const catId = categoryFilter || (activeTabObj?.categories?.[0]?._id || activeTabObj?.categories?.[0]);
        const tabId = activeTab;
        const modId = IM.mId;

        if (!catId || !tabId || !modId) {
          setCalcOptions([]);
          return;
        }

        try {
          const res = await ax.get('/calc/calculations', {
            params: { categoryId: catId, tabId, moduleId: modId }
          });
          setCalcOptions(res.data.data || []);
        } catch (err) {
          console.error("Failed to load calculations options", err);
        }
      }
      loadCalcOptions();
    }, [IM.open, IM.mId, activeTab, categoryFilter, tabs]);

    const addOpt = () => setF({ ...f, options: [...f.options, { label: '', points: 0 }] });
    const delOpt = i => setF({ ...f, options: f.options.filter((_, j) => j !== i) });
    const setOpt = (i, k, v) => {
      const o = [...f.options]; o[i] = { ...o[i], [k]: v }; setF({ ...f, options: o });
    };
    const moveOpt = (i, dir) => {
      const j = i + dir;
      if (j < 0 || j >= f.options.length) return;
      const opts = [...f.options];
      [opts[i], opts[j]] = [opts[j], opts[i]];
      setF({ ...f, options: opts });
    };
    const reorderOpt = (from, toPos) => {
      const to = Math.max(0, Math.min(f.options.length - 1, toPos - 1));
      if (from === to) return;
      const opts = [...f.options];
      const [item] = opts.splice(from, 1);
      opts.splice(to, 0, item);
      setF({ ...f, options: opts });
    };
    const setLine = (k, v) => setF({ ...f, line: { ...f.line, [k]: v } });

    const save = async () => {
      if (!f.label.trim()) { toast.error('Label required'); return; }
      if (!f.sectionId) { toast.error('Select a section'); return; }

      const payload = {
        label: f.label,
        instruction: f.instruction,
        details: f.details,
        inputType: f.inputType,
        sectionId: f.sectionId,
        isRequired: f.isRequired,
        sortOrder: f.sortOrder,
        options: f.inputType === 'checkbox' ? f.options : [],
        line: f.inputType === 'number' ? {
          x1: Number(f.line.x1), y1: Number(f.line.y1),
          x2: Number(f.line.x2), y2: Number(f.line.y2),
        } : undefined,
        sliderMin: f.inputType === 'number' && f.sliderMin !== '' && f.sliderMin !== null ? Number(f.sliderMin) : null,
        sliderMax: f.inputType === 'number' && f.sliderMax !== '' && f.sliderMax !== null ? Number(f.sliderMax) : null,
        calcBtn: {
          url:   f.calcBtn.url.trim(),
          name:  f.calcBtn.name.trim() || globalCalcDefaults.name,
          color: f.calcBtn.color || globalCalcDefaults.color,
          calcId: f.calcBtn.calcId || null,
        },
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

          {/* Instruction — HTML editor */}
          <div>
            <Lbl>Instruction <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(HTML — shown in a popup to users)</span></Lbl>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {['write', 'preview'].map(tab => (
                <button key={tab} type="button"
                  onClick={() => setInstrTab(tab)}
                  style={{
                    padding: '4px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: '1px solid',
                    borderColor: instrTab === tab ? '#22A84B' : 'var(--border)',
                    background: instrTab === tab ? '#F0FDF4' : 'var(--bg-soft)',
                    color: instrTab === tab ? '#145C28' : 'var(--tx-muted)',
                    cursor: 'pointer',
                  }}>
                  {tab === 'write' ? '✏️ Write HTML' : '👁 Preview'}
                </button>
              ))}
              <span style={{ flex: 1 }} />
              {f.instruction && (
                <span style={{ fontSize: 11, color: 'var(--tx-faint)', alignSelf: 'center' }}>
                  {f.instruction.length} chars
                </span>
              )}
            </div>

            {instrTab === 'write' ? (
              <>
                {/* Quick-insert toolbar */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                  {[
                    { label: 'B', title: 'Bold', html: '<strong></strong>' },
                    { label: 'I', title: 'Italic', html: '<em></em>' },
                    { label: 'H3', title: 'Heading', html: '<h3></h3>' },
                    { label: '¶', title: 'Paragraph', html: '<p></p>' },
                    { label: '•List', title: 'Unordered list', html: '<ul>\n  <li></li>\n</ul>' },
                    { label: '1.List', title: 'Ordered list', html: '<ol>\n  <li></li>\n</ol>' },
                    { label: 'Table', title: 'Insert table', html: '<table>\n  <thead><tr><th>Column 1</th><th>Column 2</th></tr></thead>\n  <tbody><tr><td></td><td></td></tr></tbody>\n</table>' },
                    { label: '❝', title: 'Blockquote', html: '<blockquote></blockquote>' },
                  ].map(({ label, title, html }) => (
                    <button key={label} type="button" title={title}
                      onClick={() => insertHtml(html)}
                      style={{
                        padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        border: '1px solid var(--border)', background: 'var(--bg-soft)',
                        color: 'var(--tx-muted)', cursor: 'pointer', fontFamily: label === 'B' ? 'serif' : label === 'I' ? 'serif' : 'Montserrat,sans-serif',
                        fontStyle: label === 'I' ? 'italic' : 'normal',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
                <textarea className="input-field" rows={6} value={f.instruction}
                  onChange={e => setF({ ...f, instruction: e.target.value })}
                  placeholder={'Write HTML here, e.g.:\n<p>Enter total built-up area in <strong>square metres</strong>.</p>\n<table>...</table>'}
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12.5 }} />
              </>
            ) : (
              <div style={{
                minHeight: 80, padding: '12px 16px', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--bg-soft)',
                overflow: 'auto',
              }}>
                {f.instruction
                  ? <div className="instruction-html-body" dangerouslySetInnerHTML={{ __html: f.instruction }} />
                  : <p style={{ fontSize: 13, color: 'var(--tx-faint)', fontStyle: 'italic', margin: 0 }}>No instruction written yet.</p>
                }
              </div>
            )}

            <p style={{ fontSize: 11, color: 'var(--tx-faint)', marginTop: 5 }}>
              If left empty, the Instruction button will not appear for users.
            </p>
          </div>

          {/* Details — plain text shown inline below the question */}
          <div>
            <Lbl>Details <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(plain text — shown inline below the question)</span></Lbl>
            <textarea
              className="input-field"
              rows={3}
              value={f.details}
              onChange={e => setF({ ...f, details: e.target.value })}
              placeholder="Add any additional details, context, or guidance for this question…"
              style={{ resize: 'vertical' }}
            />
            <p style={{ fontSize: 11, color: 'var(--tx-faint)', marginTop: 5 }}>
              If left empty, no details block will appear under this question.
            </p>
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

              {/* ── Slider Config ── */}
              <div style={{
                marginTop: 14, padding: '14px 16px',
                background: 'var(--bg-soft)', border: '1.5px solid var(--border)',
                borderRadius: 12,
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--g700)', marginBottom: 12 }}>
                  🎚 Slider Range <span style={{ color: 'var(--tx-faint)', fontWeight: 500, fontSize: 11 }}>(shown below number input for users)</span>
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-muted)', marginBottom: 4 }}>
                      Min Value <span style={{ color: 'var(--tx-faint)', fontWeight: 500 }}>(default: x1 = {f.line.x1})</span>
                    </p>
                    <input type="number" className="input-field"
                      value={f.sliderMin}
                      onChange={e => setF({ ...f, sliderMin: e.target.value })}
                      placeholder={`${f.line.x1}`}
                      style={{ padding: '8px 10px' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-muted)', marginBottom: 4 }}>
                      Max Value <span style={{ color: 'var(--tx-faint)', fontWeight: 500 }}>(default: x2 = {f.line.x2})</span>
                    </p>
                    <input type="number" className="input-field"
                      value={f.sliderMax}
                      onChange={e => setF({ ...f, sliderMax: e.target.value })}
                      placeholder={`${f.line.x2}`}
                      style={{ padding: '8px 10px' }} />
                  </div>
                </div>

                {/* Live preview */}
                {(() => {
                  const sMin = f.sliderMin !== '' ? Number(f.sliderMin) : Number(f.line.x1);
                  const sMax = f.sliderMax !== '' ? Number(f.sliderMax) : Number(f.line.x2);
                  const mid  = Math.round((sMin + sMax) / 2);
                  const pct  = sMax > sMin ? ((mid - sMin) / (sMax - sMin)) * 100 : 0;
                  return (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx-faint)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Preview</p>
                      <div style={{ position: 'relative', paddingTop: 22 }}>
                        <div style={{
                          position: 'absolute', top: 0,
                          left: `calc(${pct}% - 16px)`,
                          background: 'var(--g600)', color: '#fff',
                          fontSize: 10, fontWeight: 700,
                          padding: '2px 6px', borderRadius: 5,
                          whiteSpace: 'nowrap', pointerEvents: 'none',
                        }}>{mid}</div>
                        <input type="range" readOnly value={mid} min={sMin} max={sMax}
                          style={{ width: '100%', accentColor: 'var(--g600)', cursor: 'default' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--tx-faint)', fontWeight: 600 }}>{sMin}</span>
                        <span style={{ fontSize: 10, color: 'var(--tx-faint)', fontWeight: 600 }}>{sMax}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
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
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {f.options.map((o, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 62px 30px 30px 36px', gap: 6, marginBottom: 8, alignItems: 'center', minWidth: 400 }}>
                  {/* Label */}
                  <input className="input-field" value={o.label}
                    onChange={e => setOpt(i, 'label', e.target.value)}
                    placeholder={`Option ${i + 1} label`} style={{ padding: '9px 12px' }} />

                  {/* Points */}
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

                  {/* Position / sort-order input */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" className="input-field"
                      value={i + 1} min={1} max={f.options.length}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v)) reorderOpt(i, v);
                      }}
                      title="Set position"
                      style={{ padding: '9px 6px 9px 10px', textAlign: 'center', paddingRight: 20 }}
                    />
                    <span style={{
                      position: 'absolute', right: 5, top: '50%',
                      transform: 'translateY(-50%)', fontSize: 8,
                      color: 'var(--tx-faint)', fontWeight: 800,
                      pointerEvents: 'none', letterSpacing: '0.04em'
                    }}>#</span>
                  </div>

                  {/* Move up */}
                  <button
                    onClick={() => moveOpt(i, -1)}
                    disabled={i === 0}
                    title="Move up"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: '100%', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: i === 0 ? 'var(--bg-subtle)' : 'var(--g50)',
                      border: `1px solid ${i === 0 ? 'var(--border)' : 'var(--g200)'}`,
                      color: i === 0 ? 'var(--tx-faint)' : 'var(--g600)',
                      cursor: i === 0 ? 'default' : 'pointer',
                      opacity: i === 0 ? 0.45 : 1,
                    }}>▲</button>

                  {/* Move down */}
                  <button
                    onClick={() => moveOpt(i, 1)}
                    disabled={i === f.options.length - 1}
                    title="Move down"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: '100%', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: i === f.options.length - 1 ? 'var(--bg-subtle)' : 'var(--g50)',
                      border: `1px solid ${i === f.options.length - 1 ? 'var(--border)' : 'var(--g200)'}`,
                      color: i === f.options.length - 1 ? 'var(--tx-faint)' : 'var(--g600)',
                      cursor: i === f.options.length - 1 ? 'default' : 'pointer',
                      opacity: i === f.options.length - 1 ? 0.45 : 1,
                    }}>▼</button>

                  {/* Delete */}
                  <button onClick={() => delOpt(i)} title="Remove option" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: '100%', background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, color: '#EF4444', cursor: 'pointer', fontSize: 14
                  }}>✕</button>
                </div>
              ))}
              </div>
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

          {/* ── Calculate Button ── */}
          <div style={{
            padding: '16px 18px',
            background: 'linear-gradient(135deg, #f0fdf4, #f8fafc)',
            border: '1.5px solid var(--border)',
            borderRadius: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: f.calcBtn.color || '#22A84B',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}>🧮</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)', margin: 0, fontFamily: 'Montserrat,sans-serif' }}>
                  Calculate Button
                </p>
                <p style={{ fontSize: 11, color: 'var(--tx-muted)', margin: 0, marginTop: 1 }}>
                  Shown alongside this field when a URL or Calculation is set
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* URL */}
              <div>
                <Lbl>URL / Link</Lbl>
                <input
                  className="input-field"
                  value={f.calcBtn.url}
                  onChange={e => setF({ ...f, calcBtn: { ...f.calcBtn, url: e.target.value } })}
                  placeholder="https://example.com/calculator (leave empty to hide)"
                />
              </div>

              {/* Searchable Calculation Dropdown */}
              <div>
                <Lbl>Or Select Calculation (from Cal Engine)</Lbl>
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => setCalcDropdownOpen(!calcDropdownOpen)}
                    style={{
                      padding: '10px 14px',
                      border: '1.5px solid var(--border-md)',
                      borderRadius: 10,
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 13.5,
                    }}
                  >
                    <span style={{ color: f.calcBtn.calcId ? 'var(--tx)' : 'var(--tx-muted)' }}>
                      {f.calcBtn.calcId
                        ? calcOptions.find(c => (c._id || c.id) === f.calcBtn.calcId)?.name || 'Select Calculation'
                        : 'None / Select Calculation'}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--tx-faint)' }}>{calcDropdownOpen ? '▲' : '▼'}</span>
                  </div>

                  {calcDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1px solid var(--border-md)',
                        borderRadius: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                        marginTop: 4,
                        maxHeight: 200,
                        overflowY: 'auto',
                        padding: 8,
                      }}
                    >
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Search calculations..."
                        value={calcSearch}
                        onChange={e => setCalcSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{ marginBottom: 8, fontSize: 12.5, padding: '6px 10px' }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div
                          onClick={() => {
                            setF({ ...f, calcBtn: { ...f.calcBtn, calcId: '' } });
                            setCalcDropdownOpen(false);
                            setCalcSearch('');
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            background: !f.calcBtn.calcId ? 'var(--bg-muted)' : 'transparent',
                            fontSize: 13,
                            fontWeight: !f.calcBtn.calcId ? 'bold' : 'normal',
                          }}
                        >
                          None
                        </div>
                        {calcOptions.filter(c => c.name.toLowerCase().includes(calcSearch.toLowerCase())).map(c => (
                          <div
                            key={c._id || c.id}
                            onClick={() => {
                              setF({ ...f, calcBtn: { ...f.calcBtn, calcId: c._id || c.id } });
                              setCalcDropdownOpen(false);
                              setCalcSearch('');
                            }}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              background: f.calcBtn.calcId === (c._id || c.id) ? 'var(--bg-muted)' : 'transparent',
                              fontSize: 13,
                              fontWeight: f.calcBtn.calcId === (c._id || c.id) ? 'bold' : 'normal',
                            }}
                          >
                            {c.name}
                          </div>
                        ))}
                        {calcOptions.filter(c => c.name.toLowerCase().includes(calcSearch.toLowerCase())).length === 0 && (
                          <div style={{ padding: '8px 12px', color: 'var(--tx-faint)', fontSize: 12, textAlign: 'center' }}>
                            No calculations found for this category/tab/module.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Name + Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <Lbl>Button Name</Lbl>
                  <input
                    className="input-field"
                    value={f.calcBtn.name}
                    onChange={e => setF({ ...f, calcBtn: { ...f.calcBtn, name: e.target.value } })}
                    placeholder={globalCalcDefaults.name}
                  />
                </div>
                <div>
                  <Lbl>Button Color</Lbl>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={f.calcBtn.color}
                      onChange={e => setF({ ...f, calcBtn: { ...f.calcBtn, color: e.target.value } })}
                      style={{
                        width: 40, height: 40, border: '2px solid var(--border-md)',
                        borderRadius: 8, cursor: 'pointer', padding: 3,
                        background: 'var(--bg-soft)', flexShrink: 0,
                      }}
                    />
                    <input
                      className="input-field"
                      value={f.calcBtn.color}
                      onChange={e => setF({ ...f, calcBtn: { ...f.calcBtn, color: e.target.value } })}
                      placeholder="#22A84B"
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>

              {/* Live preview */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: '#fff',
                borderRadius: 10, border: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Preview</span>
                <button
                  style={{
                    padding: '7px 16px', borderRadius: 9, border: 'none',
                    background: f.calcBtn.color || '#22A84B', color: '#fff',
                    fontWeight: 700, fontSize: 12.5, cursor: 'default',
                    opacity: (f.calcBtn.url || f.calcBtn.calcId) ? 1 : 0.35,
                    boxShadow: (f.calcBtn.url || f.calcBtn.calcId) ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    transition: 'opacity 0.2s, box-shadow 0.2s',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  🧮 {f.calcBtn.name || globalCalcDefaults.name}
                </button>
                {!f.calcBtn.url && !f.calcBtn.calcId && (
                  <span style={{ fontSize: 11, color: 'var(--tx-faint)', fontStyle: 'italic' }}>
                    hidden — no URL or Calculation selected
                  </span>
                )}
              </div>
            </div>
          </div>

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

              {/* Project Category Filter */}
              <select className="input-field"
                value={categoryFilter}
                onChange={e => handleCategoryFilterChange(e.target.value)}
                style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
                <option value="">— All Project Categories —</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select className="input-field"
                value={activeTab || ''}
                onChange={e => { setActiveTab(e.target.value); setOpenMod(null); }}
                style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
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
              <p style={{ fontSize: 32, marginBottom: 12 }}>{categoryFilter && filteredTabs.length === 0 ? '📁' : '👆'}</p>
              <p style={{ color: 'var(--tx-muted)', fontSize: 14 }}>
                {categoryFilter && filteredTabs.length === 0
                  ? 'No tabs associated with this category. Go to the Tabs page to associate tabs.'
                  : 'Select a tab to view its modules'}
              </p>
              {categoryFilter && filteredTabs.length === 0 && (
                <a href="/admin/tabs" className="btn-primary-green" style={{ textDecoration: 'none', display: 'inline-flex', marginTop: 12 }}>
                  Go to Tabs →
                </a>
              )}
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

              const isModDragging = moduleDragState.dragId === mod._id;
              const isModOver = moduleDragState.overId === mod._id;
              return (
                <div key={mod._id}
                  draggable
                  onDragStart={e => {
                    // Avoid conflict with input dragging
                    if (e.target.closest('[draggable]') !== e.currentTarget) return;
                    e.dataTransfer.effectAllowed = 'move';
                    setModuleDragState({ dragId: mod._id, overId: null });
                  }}
                  onDragOver={e => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (mod._id !== moduleDragState.dragId) {
                      setModuleDragState(s => ({ ...s, overId: mod._id }));
                    }
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    const { dragId, overId } = moduleDragState;
                    setModuleDragState({ dragId: null, overId: null });
                    if (dragId && overId && dragId !== overId) reorderModules(dragId, overId);
                  }}
                  onDragEnd={() => setModuleDragState({ dragId: null, overId: null })}
                  className="fade-in-up" 
                  style={{
                    border: isModOver ? '1.5px solid var(--g400)' : '1px solid var(--border)', 
                    borderRadius: 16,
                    background: '#fff', marginBottom: 12,
                    boxShadow: isModOver ? '0 0 0 3px rgba(34,168,75,0.12)' : (isOpen ? 'var(--sh-md)' : 'var(--sh-xs)'),
                    opacity: isModDragging ? 0.4 : 1,
                    transition: 'border-color 0.12s, opacity 0.12s, box-shadow 0.2s',
                    animationDelay: `${mi * 0.05}s`,
                    cursor: 'grab'
                  }}
                >
                  {/* Module header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', cursor: 'pointer',
                    borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                    background: isOpen ? 'var(--bg-soft)' : 'transparent',
                    borderRadius: isOpen ? '16px 16px 0 0' : 16,
                    transition: 'background 0.18s'
                  }} onClick={() => setOpenMod(isOpen ? null : mod._id)}>
                    <span title="Drag to reorder module" style={{ color: 'var(--tx-faint)', fontSize: 16, cursor: 'grab', flexShrink: 0, userSelect: 'none', lineHeight: 1 }}>⠿</span>
                    <IconImg
                      src={mod.iconUrl ? `${SERVER_URL}${mod.iconUrl}` : ''}
                      fallback={String(mi + 1)}
                      size={40}
                    />
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                                          <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 5,
                                            background: '#F0FDF4', color: '#15803D', border: '1px solid #A8EFC0',
                                            fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
                                          }}>📋 Instruction</span>
                                        </div>
                                      )}
                                      {inp.details && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                                          <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 5,
                                            background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
                                            fontFamily: 'Montserrat,sans-serif', whiteSpace: 'nowrap',
                                          }}>ℹ️ Details</span>
                                          <span style={{
                                            fontSize: 11, color: 'var(--tx-muted)', overflow: 'hidden',
                                            textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280,
                                          }}>{inp.details}</span>
                                        </div>
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
                                      {inp.calcBtn?.url && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                                          <span style={{
                                            fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 6,
                                            background: inp.calcBtn.color || '#22A84B', color: '#fff',
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                          }}>
                                            🧮 {inp.calcBtn.name || 'Calculate'}
                                          </span>
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
