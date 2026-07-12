import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import { ColoredLeaf } from '../../components/shared/LeafLogo.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DEFAULT_LEAF_LEVELS = [
  { name: 'Green Leaf',  colorCode: '#22C55E' },
  { name: 'Yellow Leaf', colorCode: '#F8A514' },
  { name: 'Orange Leaf', colorCode: '#E2670C' },
  { name: 'Brown Leaf',  colorCode: '#97542A' },
];

export default function NewProject() {
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const [title, setSectionTitle] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leafLevels, setLeafLevels] = useState(DEFAULT_LEAF_LEVELS);

  useEffect(() => {
    axiosSecure.get('/categories')
      .then(r => setCategories(r.data.categories || []))
      .catch(() => toast.error('Failed to load project types'));

    axiosSecure.get('/sections')
      .then(r => {
        const sorted = [...(r.data.sections || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setSections(sorted);
      })
      .catch(() => toast.error('Failed to load sections'));

    axiosSecure.get('/settings/eval-rules')
      .then(r => {
        const rules = r.data.rules || [];
        if (rules.length > 0) {
          setLeafLevels(rules.map(rule => ({
            name: rule.name,
            colorCode: rule.colorCode,
            imageUrl: rule.imageUrl
              ? (rule.imageUrl.startsWith('data:') ? rule.imageUrl : (rule.imageUrl.startsWith('/uploads/') ? `${SERVER_URL}${rule.imageUrl}` : rule.imageUrl))
              : undefined,
          })));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regularSections = sections.filter(s => !s.isConstant);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Project title is required'); return; }
    if (!categoryId) { toast.error('Please select a project type'); return; }
    if (!sectionId) { toast.error('Please select a section / stage'); return; }
    
    setLoading(true);
    try {
      const res = await axiosSecure.post('/projects', { 
        title, 
        sectionId, 
        categoryId,
        collaboratorEmails: [],
        ownerEmails: []
      });
      const projectId = res.data?.project?._id;
      if (!projectId) { toast.error('Project created but ID not found'); return; }
      toast.success('Project created successfully!');
      navigate(`/projects/${projectId}/info`);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto fade-in-up">
        <div className="text-center mb-10">
          {/* All 4 leaf levels — visual representation only */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
            gap: 16, marginBottom: 20,
          }}>
            {leafLevels.map((leaf, i) => {
              return (
                <div key={leaf.name} style={{
                  opacity: 1,
                  transition: 'opacity 0.3s',
                }}>
                  <ColoredLeaf
                    level={leaf.name}
                    colorCode={leaf.colorCode}
                    imageUrl={leaf.imageUrl}
                    size={40}
                  />
                </div>
              );
            })}
          </div>
          <h1 className="text-3xl font-bold">Start a New Project</h1>
          <p className="mt-2 text-sm text-gray-400">Name your project and choose a section / stage</p>
        </div>

        <form onSubmit={submit}>
          <div className="glass-card p-8">
            {/* Project title */}
            <label className="block text-xs font-semibold mb-2 text-gray-400 uppercase tracking-widest">
              Project Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setSectionTitle(e.target.value)}
              placeholder="e.g. Green Residence – Phase 1"
              className="input-dark w-full px-4 py-4 mb-5"
              autoFocus
            />

            {/* Project Type */}
            <label className="block text-xs font-semibold mb-2 text-gray-400 uppercase tracking-widest">
              Project Type *
            </label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="input-dark w-full px-4 py-4 mb-5"
              style={{ appearance: 'auto', cursor: 'pointer' }}
            >
              <option value="">— Select project type —</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>

            {/* Section / Stage */}
            <label className="block text-xs font-semibold mb-2 text-gray-400 uppercase tracking-widest">
              Section / Stage *
            </label>
            {sections.length === 0 ? (
              <div style={{
                padding: '12px 16px', borderRadius: 10,
                background: 'var(--bg-soft)', border: '1.5px solid var(--border)',
                fontSize: 13, color: 'var(--tx-faint)',
              }}>
                Loading sections…
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                maxHeight: 280, overflowY: 'auto',
                paddingRight: 4,
              }}>
                {regularSections.map(s => (
                  <label key={s._id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                    border: `1.5px solid ${sectionId === String(s._id) ? 'var(--g500)' : 'var(--border)'}`,
                    background: sectionId === String(s._id) ? 'var(--g50)' : '#fff',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}>
                    <input
                      type="radio"
                      name="section"
                      value={s._id}
                      checked={sectionId === String(s._id)}
                      onChange={() => setSectionId(String(s._id))}
                      style={{ accentColor: 'var(--g600)', width: 16, height: 16, flexShrink: 0 }}
                    />
                    <span style={{
                      fontWeight: sectionId === String(s._id) ? 700 : 500,
                      fontSize: 14,
                      color: sectionId === String(s._id) ? 'var(--g800)' : 'var(--tx)',
                    }}>{s.title}</span>
                  </label>
                ))}
              </div>
            )}


            {/* Create Button will be placed here */}
          </div>

          {/* ── Submit button OUTSIDE the card so it is ALWAYS visible ── */}
          <button
            type="submit"
            disabled={loading || !title.trim() || !sectionId || !categoryId}
            style={{
              display: 'flex', width: '100%', justifyContent: 'center',
              marginTop: 20,
            }}
            className="btn-primary-green disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create & Continue →'}
          </button>
        </form>

        <p className="text-center mt-4">
          <button
            onClick={() => navigate('/projects')}
            className="text-sm text-gray-400 hover:text-green-400"
          >
            ← Back to Projects
          </button>
        </p>
      </div>
    </Layout>
  );
}
