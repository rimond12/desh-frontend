import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function IconImg({ src, fallback, size = 32 }) {
  const [failed, setFailed] = useState(false);
  const r = Math.round(size * 0.2);
  if (!src || failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: r, flexShrink: 0,
        background: 'linear-gradient(135deg,var(--g700),var(--g500))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: Math.round(size * 0.4), fontWeight: 800,
        fontFamily: 'Montserrat,sans-serif',
      }}>{fallback}</div>
    );
  }
  return (
    <img src={src} alt="" onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain', borderRadius: r, background: 'var(--bg-subtle)', padding: 4, flexShrink: 0 }} />
  );
}

export default function Sections() {
  const ax = useAxiosSecure();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [dragState, setDragState] = useState({ dragId: null, overId: null });
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ title: '', sortOrder: '', isConstant: false });
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState('');

  const fetchSections = () => {
    setLoading(true);
    ax.get('/sections')
      .then(res => setSections(res.data.sections || []))
      .catch(() => toast.error('Failed to load sections'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSections(); }, []);

  const openNew = () => {
    setEditItem(null);
    setForm({ title: '', sortOrder: sections.length + 1, isConstant: false });
    setIconFile(null);
    setIconPreview('');
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditItem(s);
    setForm({ title: s.title, sortOrder: s.sortOrder ?? 0, isConstant: s.isConstant || false });
    setIconFile(null);
    setIconPreview(s.iconUrl ? `${SERVER_URL}${s.iconUrl}` : '');
    setShowForm(true);
  };

  const handleIconChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setIconFile(f);
    setIconPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('sortOrder', form.sortOrder);
      fd.append('isConstant', form.isConstant ? 'true' : 'false');
      if (iconFile) fd.append('icon', iconFile);

      if (editItem) {
        await ax.put(`/sections/${editItem._id}`, fd);
        toast.success('Section updated!');
      } else {
        await ax.post('/sections', fd);
        toast.success('Section created!');
      }
      setShowForm(false);
      fetchSections();
    } catch { toast.error('Failed to save'); }
  };

  const deleteSection = async (id) => {
    if (!window.confirm('Delete this section? Input fields linked to it will be uncategorized.')) return;
    try {
      await ax.delete(`/sections/${id}`);
      toast.success('Section deleted!');
      fetchSections();
    } catch { toast.error('Failed to delete'); }
  };

  const reorderSections = (dragId, overId) => {
    if (reordering) return;
    const arr = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    const from = arr.findIndex(x => x._id === dragId);
    const to = arr.findIndex(x => x._id === overId);
    if (from === -1 || to === -1) return;
    const reordered = [...arr];
    reordered.splice(to, 0, reordered.splice(from, 1)[0]);
    setSections(reordered);
    setReordering(true);
    ax.patch('/sections/reorder', { orderedIds: reordered.map(s => s._id) })
      .then(() => toast.success('Order saved'))
      .catch(() => { toast.error('Failed to save order'); fetchSections(); })
      .finally(() => setReordering(false));
  };

  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Layout isAdmin>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}
        className="fade-in-up">
        <div>
          <h1 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 900, fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>
            Sections
          </h1>
          <p style={{ color: 'var(--tx-muted)', fontSize: 14 }}>
            Global assessment sections — assigned to input fields inside modules
          </p>
        </div>
        <button className="btn-primary-green" onClick={openNew}>+ New Section</button>
      </div>

      {/* Info banner */}
      <div style={{
        padding: '12px 16px', background: '#EFF6FF',
        border: '1px solid #BFDBFE', borderRadius: 12,
        fontSize: 13, color: '#1D4ED8', fontWeight: 500, marginBottom: 20
      }}>
        💡 Sections act like <strong>categories</strong> for input fields. When creating an input field inside a module,
        you assign it to one of these sections. Users then see inputs grouped by section within each module.
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 fade-in-up border border-white/10" style={{ background: 'rgba(20, 20, 20, 0.95)', boxShadow: '0 20px 45px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
              <h2 className="font-bold text-lg text-[#34C961]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {editItem ? 'Edit Section' : 'New Section'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white transition-colors text-lg">✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div>
                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>Section Name *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Operational Water Demand" 
                  className="w-full px-4 py-3 text-sm rounded-xl border outline-none bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all" autoFocus />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--g300)' }}>Section Icon</label>
                {iconPreview && (
                  <div style={{ marginBottom: 8 }}>
                    <img src={iconPreview} alt="icon preview"
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                      style={{
                        height: 48, width: 48, objectFit: 'contain',
                        borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.25)', padding: 4, display: 'block'
                      }} />
                  </div>
                )}
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer', padding: '10px 16px', borderRadius: 12,
                  border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.25)',
                  fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600
                }} className="hover:bg-white/5 hover:text-white transition-all">
                  <span>📎</span>
                  <span>{iconFile ? iconFile.name : (iconPreview ? 'Replace icon…' : 'Upload icon…')}</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIconChange} />
                </label>
              </div>
              {/* Constant Section toggle */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 16px', borderRadius: 12,
                background: form.isConstant ? 'rgba(234,179,8,0.15)' : 'rgba(0,0,0,0.25)',
                border: `1.5px solid ${form.isConstant ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.1)'}`,
                cursor: 'pointer', transition: 'all 0.2s',
              }} onClick={() => setForm({ ...form, isConstant: !form.isConstant })}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  border: `2px solid ${form.isConstant ? '#F8A514' : 'rgba(255,255,255,0.2)'}`,
                  background: form.isConstant ? '#F8A514' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {form.isConstant && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1, fontWeight: 900 }}>✓</span>}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: form.isConstant ? '#F8A514' : '#fff' }}>
                    Constant Section
                    {form.isConstant && (
                      <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99, background: '#F8A514', color: '#000', verticalAlign: 'middle' }}>
                        ⚡ ON
                      </span>
                    )}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: form.isConstant ? 'rgba(248,165,20,0.7)' : 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                    Always visible alongside other sections. Its score is added to every section's total. Not shown in section filter dropdown.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/5 mt-6">
                <button onClick={save} className="btn-primary-green flex-1 justify-center text-sm py-3">
                  {editItem ? 'Save Changes' : 'Create Section'}
                </button>
                <button className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-white/5 hover:text-white"
                  style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }} onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--tx-muted)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '3px solid var(--g100)', borderTopColor: 'var(--g600)',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
            }} />
            Loading sections…
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: '56px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>▦</p>
            <h3 style={{
              fontFamily: 'Montserrat,sans-serif', fontWeight: 800,
              fontSize: 16, color: 'var(--tx)', marginBottom: 8
            }}>No sections yet</h3>
            <p style={{ color: 'var(--tx-muted)', fontSize: 13, marginBottom: 16 }}>
              Create your first section to start categorizing input fields
            </p>
            <button className="btn-primary-green" onClick={openNew}>+ New Section</button>
          </div>
        ) : (
          <div className="table-scroll"><table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Drag & Order</th>
                <th style={{ width: 64 }}>Icon</th>
                <th>Section Name</th>
                <th style={{ width: 120 }}>Type</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => {
                const isDragging = dragState.dragId === s._id;
                const isOver = dragState.overId === s._id;
                return (
                  <tr key={s._id}
                      draggable
                      onDragStart={e => {
                          e.dataTransfer.effectAllowed = 'move';
                          setDragState({ dragId: s._id, overId: null });
                      }}
                      onDragOver={e => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (s._id !== dragState.dragId) setDragState(s => ({ ...s, overId: s._id }));
                      }}
                      onDrop={e => {
                          e.preventDefault();
                          const { dragId, overId } = dragState;
                          setDragState({ dragId: null, overId: null });
                          if (dragId && overId && dragId !== overId) reorderSections(dragId, overId);
                      }}
                      onDragEnd={() => setDragState({ dragId: null, overId: null })}
                      style={{
                          opacity: isDragging ? 0.4 : 1,
                          background: isOver ? 'rgba(34,168,75,0.04)' : '',
                          outline: isOver ? '1.5px solid var(--g400)' : 'none',
                          transition: 'opacity 0.12s, background 0.12s',
                          cursor: 'grab',
                      }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span title="Drag to reorder" style={{ color: 'var(--tx-faint)', fontSize: 16, cursor: 'grab', flexShrink: 0, userSelect: 'none', lineHeight: 1 }}>⠿</span>
                        <span className="text-xs font-mono px-2 py-1 rounded"
                          style={{ background: 'var(--bg-subtle)', color: 'var(--tx-muted)' }}>
                          #{i + 1}
                        </span>
                      </div>
                    </td>
                    <td>
                      <IconImg
                        src={s.iconUrl ? `${SERVER_URL}${s.iconUrl}` : ''}
                        fallback={s.title?.[0]?.toUpperCase() || String(i + 1)}
                        size={32}
                      />
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--tx)' }}>{s.title}</span>
                    </td>
                    <td>
                      {s.isConstant ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99,
                          background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA',
                          fontFamily: 'Montserrat,sans-serif',
                        }}>⚡ Constant</span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                          background: 'var(--g50)', color: 'var(--g700)', border: '1px solid var(--g200)',
                          fontFamily: 'Montserrat,sans-serif',
                        }}>Regular</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(s)} style={{
                          fontSize: 12, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                          fontWeight: 600, border: '1px solid var(--border-md)',
                          color: 'var(--tx-muted)', background: 'var(--g50)'
                        }}>✎ Edit</button>
                        <button onClick={() => deleteSection(s._id)} style={{
                          fontSize: 12, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                          fontWeight: 600, border: '1px solid rgba(226,103,12,0.15)',
                          color: 'rgba(226,103,12,0.7)', background: 'rgba(226,103,12,0.05)'
                        }}>✕ Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
