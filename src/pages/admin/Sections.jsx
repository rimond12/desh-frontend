import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const SERVER_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

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

  const moveSection = async (idx, dir) => {
    if (reordering) return;
    const arr = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= arr.length) return;
    const a = arr[idx];
    const b = arr[targetIdx];
    // Optimistic swap
    setSections(prev => prev.map(s => {
      if (s._id === a._id) return { ...s, sortOrder: b.sortOrder };
      if (s._id === b._id) return { ...s, sortOrder: a.sortOrder };
      return s;
    }));
    setReordering(true);
    try {
      const fdA = new FormData(); fdA.append('title', a.title); fdA.append('sortOrder', b.sortOrder);
      const fdB = new FormData(); fdB.append('title', b.title); fdB.append('sortOrder', a.sortOrder);
      await Promise.all([ax.put(`/sections/${a._id}`, fdA), ax.put(`/sections/${b._id}`, fdB)]);
    } catch {
      toast.error('Failed to reorder');
      fetchSections();
    } finally {
      setReordering(false);
    }
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
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card fade-in-up" style={{ width: '100%', maxWidth: 440, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 800, fontSize: 17, color: 'var(--tx)', margin: 0 }}>
                {editItem ? 'Edit Section' : 'New Section'}
              </h3>
              <button className="btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--tx-muted)', marginBottom: 6,
                  fontFamily: 'Montserrat,sans-serif'
                }}>Section Name *</label>
                <input className="input-field" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Site & Environment, Before Construction"
                  autoFocus />
              </div>
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--tx-muted)', marginBottom: 6,
                  fontFamily: 'Montserrat,sans-serif'
                }}>Sort Order</label>
                <input
                  type="number" min="1"
                  className="input-field"
                  value={form.sortOrder}
                  onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  placeholder="e.g. 1, 2, 3…"
                  style={{ width: 120 }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--tx-muted)', marginBottom: 6,
                  fontFamily: 'Montserrat,sans-serif'
                }}>Section Icon</label>
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
              {/* Constant Section toggle */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 16px', borderRadius: 12,
                background: form.isConstant ? 'linear-gradient(135deg,#FFF7ED,#FFEDD5)' : 'var(--bg-soft)',
                border: `1.5px solid ${form.isConstant ? '#FED7AA' : 'var(--border)'}`,
                cursor: 'pointer', transition: 'all 0.2s',
              }} onClick={() => setForm({ ...form, isConstant: !form.isConstant })}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  border: `2px solid ${form.isConstant ? '#EA580C' : 'var(--border-md)'}`,
                  background: form.isConstant ? '#EA580C' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {form.isConstant && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1, fontWeight: 900 }}>✓</span>}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: form.isConstant ? '#9A3412' : 'var(--tx)' }}>
                    Constant Section
                    {form.isConstant && (
                      <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99, background: '#EA580C', color: '#fff', verticalAlign: 'middle' }}>
                        ⚡ ON
                      </span>
                    )}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: form.isConstant ? '#C2410C' : 'var(--tx-muted)', lineHeight: 1.4 }}>
                    Always visible alongside other sections. Its score is added to every section's total. Not shown in section filter dropdown.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn-primary-green" onClick={save} style={{ flex: 1, justifyContent: 'center' }}>
                  {editItem ? 'Save Changes' : 'Create Section'}
                </button>
                <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
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
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Order</th>
                <th style={{ width: 64 }}>Icon</th>
                <th>Section Name</th>
                <th style={{ width: 120 }}>Type</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* <button
                          onClick={() => moveSection(i, -1)}
                          disabled={i === 0 || reordering}
                          title="Move up"
                          style={{
                            width: 22, height: 20, padding: 0, border: 'none', borderRadius: 5,
                            background: i === 0 ? 'transparent' : 'var(--bg-subtle)',
                            color: i === 0 ? 'var(--border-md)' : 'var(--tx-muted)',
                            cursor: i === 0 ? 'default' : 'pointer',
                            fontSize: 11, lineHeight: 1, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.15s, color 0.15s',
                          }}
                          onMouseEnter={e => { if (i !== 0) { e.currentTarget.style.background = 'var(--g100)'; e.currentTarget.style.color = 'var(--g700)'; } }}
                          onMouseLeave={e => { e.currentTarget.style.background = i === 0 ? 'transparent' : 'var(--bg-subtle)'; e.currentTarget.style.color = i === 0 ? 'var(--border-md)' : 'var(--tx-muted)'; }}
                        >▲</button>
                        <button
                          onClick={() => moveSection(i, 1)}
                          disabled={i === sorted.length - 1 || reordering}
                          title="Move down"
                          style={{
                            width: 22, height: 20, padding: 0, border: 'none', borderRadius: 5,
                            background: i === sorted.length - 1 ? 'transparent' : 'var(--bg-subtle)',
                            color: i === sorted.length - 1 ? 'var(--border-md)' : 'var(--tx-muted)',
                            cursor: i === sorted.length - 1 ? 'default' : 'pointer',
                            fontSize: 11, lineHeight: 1, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.15s, color 0.15s',
                          }}
                          onMouseEnter={e => { if (i !== sorted.length - 1) { e.currentTarget.style.background = 'var(--g100)'; e.currentTarget.style.color = 'var(--g700)'; } }}
                          onMouseLeave={e => { e.currentTarget.style.background = i === sorted.length - 1 ? 'transparent' : 'var(--bg-subtle)'; e.currentTarget.style.color = i === sorted.length - 1 ? 'var(--border-md)' : 'var(--tx-muted)'; }}
                        >▼</button> */}
                      </div>
                      <span style={{
                        fontSize: 11, fontFamily: 'monospace', padding: '2px 6px',
                        borderRadius: 6, background: 'var(--bg-subtle)', color: 'var(--tx-muted)'
                      }}>#{i + 1}</span>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
