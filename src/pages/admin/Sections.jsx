import { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function Sections() {
  const ax = useAxiosSecure();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ title: '', sortOrder: '' });

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
    setForm({ title: '', sortOrder: sections.length + 1 });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditItem(s);
    setForm({ title: s.title, sortOrder: s.sortOrder });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    try {
      if (editItem) {
        await ax.put(`/sections/${editItem._id}`, { title: form.title, sortOrder: Number(form.sortOrder) });
        toast.success('Section updated!');
      } else {
        await ax.post('/sections', { title: form.title, sortOrder: Number(form.sortOrder) });
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
                <input type="number" className="input-field" value={form.sortOrder}
                  onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                  style={{ maxWidth: 110 }} />
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
                <th style={{ width: 60 }}>Order</th>
                <th>Section Name</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s._id}>
                  <td>
                    <span style={{
                      fontSize: 11, fontFamily: 'monospace', padding: '2px 8px',
                      borderRadius: 6, background: 'var(--bg-subtle)', color: 'var(--tx-muted)'
                    }}>#{s.sortOrder}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: 'linear-gradient(135deg,var(--g700),var(--g500))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: 11, fontWeight: 800,
                        fontFamily: 'Montserrat,sans-serif'
                      }}>{i + 1}</div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--tx)' }}>{s.title}</span>
                    </div>
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
