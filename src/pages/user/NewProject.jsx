import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import LeafLogo from '../../components/shared/LeafLogo.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function NewProject() {
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const [title, setSectionTitle] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axiosSecure.get('/sections')
      .then(r => {
        const sorted = [...(r.data.sections || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setSections(sorted);
      })
      .catch(() => toast.error('Failed to load sections'));
  }, []);

  const regularSections = sections.filter(s => !s.isConstant);
  const constantSections = sections.filter(s => s.isConstant);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Project title is required'); return; }
    if (!sectionId) { toast.error('Please select a section / stage'); return; }
    setLoading(true);
    try {
      const res = await axiosSecure.post('/projects', { title, sectionId });
      const projectId = res.data?.project?._id;
      if (!projectId) { toast.error('Project created but ID not found'); return; }
      toast.success('Project created successfully!');
      navigate(`/projects/${projectId}`);
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
          <div className="inline-block mb-4"><LeafLogo size={56} animated /></div>
          <h1 className="text-3xl font-bold">Start a New Project</h1>
          <p className="mt-2 text-sm text-gray-400">Name your project and choose a section / stage</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={submit}>
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

            {/* Section / Stage */}
            <label className="block text-xs font-semibold mb-2 text-gray-400 uppercase tracking-widest">
              Section / Stage *
            </label>
            {sections.length === 0 ? (
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 20,
                background: 'var(--bg-soft)', border: '1.5px solid var(--border)',
                fontSize: 13, color: 'var(--tx-faint)',
              }}>
                Loading sections…
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: constantSections.length > 0 ? 10 : 20 }}>
                  {regularSections.map(s => (
                    <label key={s._id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                      border: `1.5px solid ${sectionId === String(s._id) ? 'var(--g500)' : 'var(--border)'}`,
                      background: sectionId === String(s._id) ? 'var(--g50)' : '#fff',
                      transition: 'all 0.15s',
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

                {constantSections.length > 0 && (
                  // <div style={{
                  //   display: 'flex', alignItems: 'flex-start', gap: 8,
                  //   padding: '10px 14px', borderRadius: 10, marginBottom: 20,
                  //   background: 'rgba(234,179,8,0.07)', border: '1.5px solid rgba(234,179,8,0.25)',
                  //   fontSize: 12, color: '#92660a',
                  // }}>
                  //   <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚡</span>
                  //   <span>
                  //     <strong>Always included:</strong>{' '}
                  //     {constantSections.map(s => s.title).join(', ')} — constant{constantSections.length > 1 ? ' sections are' : ' section is'} automatically added to every project.
                  //   </span>
                  // </div>
                  <></>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading || !title.trim() || !sectionId}
              className="btn-primary-green w-full disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create & Continue →'}
            </button>
          </form>
        </div>

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
