// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Layout from '../../components/shared/Layout.jsx';
// import LeafLogo from '../../components/shared/LeafLogo.jsx';
// import toast from 'react-hot-toast';

// export default function NewProject() {
//   const navigate = useNavigate();
//   const [title, setTitle] = useState('');
//   const [loading, setLoading] = useState(false);

//   const submit = async (e) => {
//     e.preventDefault();

//     if (!title.trim()) {
//       toast.error('Project title is required');
//       return;
//     }

//     setLoading(true);

//     try {
//       const token = localStorage.getItem('token');

//       const res = await fetch('http://localhost:5000/api/projects', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           ...(token && { Authorization: `Bearer ${token}` }),
//         },
//         body: JSON.stringify({ title }),
//       });

//       const data = await res.json();

//       console.log("API RESPONSE:", data); // 👈 debug help

//       if (!res.ok) {
//         throw new Error(data.message || 'Failed to create project');
//       }

//       toast.success('Project created successfully!');

//       // 🔥 SAFE ID EXTRACTION (main fix)
//       const projectId = data?.project?._id || data?._id;

//       if (!projectId) {
//         toast.error('Project created but ID not found');
//         return;
//       }

//       navigate(`/projects/${projectId}`);

//       setTitle('');

//     } catch (error) {
//       console.error(error);
//       toast.error(error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Layout>
//       <div className="max-w-lg mx-auto fade-in-up">
//         <div className="text-center mb-10">
//           <div className="inline-block mb-4">
//             <LeafLogo size={56} animated />
//           </div>

//           <h1 className="text-3xl font-bold text-white">
//             Start a New Project
//           </h1>

//           <p className="mt-2 text-sm text-gray-400">
//             Give your green building assessment a name
//           </p>
//         </div>

//         <div className="glass-card p-8">
//           <form onSubmit={submit}>
//             <label className="block text-xs font-semibold mb-2 text-gray-400">
//               PROJECT TITLE *
//             </label>

//             <input
//               type="text"
//               value={title}
//               onChange={(e) => setTitle(e.target.value)}
//               placeholder="e.g. Green Residence – Phase 1"
//               className="input-dark w-full px-4 py-4 mb-2"
//               autoFocus
//             />

//             <p className="text-xs text-gray-500 mb-6">
//               Be descriptive so you can identify it later.
//             </p>

//             <button
//               type="submit"
//               disabled={loading || !title.trim()}
//               className="btn-primary-green w-full disabled:opacity-50"
//             >
//               {loading ? 'Creating...' : 'Create & Continue →'}
//             </button>
//           </form>
//         </div>

//         <p className="text-center mt-4">
//           <button
//             onClick={() => navigate('/projects')}
//             className="text-sm text-gray-400 hover:text-green-400"
//           >
//             ← Back to Projects
//           </button>
//         </p>
//       </div>
//     </Layout>
//   );
// }

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import LeafLogo from '../../components/shared/LeafLogo.jsx';
import toast from 'react-hot-toast';
import useAxiosSecure from '../../hooks/useAxiosSecure.jsx';

export default function NewProject() {
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Project title is required'); return; }
    setLoading(true);
    try {
      const res = await axiosSecure.post('/projects', { title });
      const projectId = res.data?.project?._id;
      if (!projectId) { toast.error('Project created but ID not found'); return; }
      toast.success('Project created successfully!');
      navigate(`/projects/${projectId}`);
      setTitle('');
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
          <h1 className="text-3xl font-bold text-white">Start a New Project</h1>
          <p className="mt-2 text-sm text-gray-400">Give your green building assessment a name</p>
        </div>
        <div className="glass-card p-8">
          <form onSubmit={submit}>
            <label className="block text-xs font-semibold mb-2 text-gray-400">PROJECT TITLE *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Green Residence – Phase 1"
              className="input-dark w-full px-4 py-4 mb-2"
              autoFocus
            />
            <p className="text-xs text-gray-500 mb-6">Be descriptive so you can identify it later.</p>
            <button type="submit" disabled={loading || !title.trim()} className="btn-primary-green w-full disabled:opacity-50">
              {loading ? 'Creating...' : 'Create & Continue →'}
            </button>
          </form>
        </div>
        <p className="text-center mt-4">
          <button onClick={() => navigate('/projects')} className="text-sm text-gray-400 hover:text-green-400">
            ← Back to Projects
          </button>
        </p>
      </div>
    </Layout>
  );
}