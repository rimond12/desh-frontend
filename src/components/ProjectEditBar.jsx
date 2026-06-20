import { useNavigate } from 'react-router-dom';
import { Edit3 } from 'lucide-react';

export default function ProjectEditBar({ projectName, projectId }) {
  const navigate = useNavigate();

  const handleEditClick = () => {
    navigate(`/projects/${projectId}/info`);
  };

  return (
    <div 
      className="sticky top-0 z-30 w-full mb-4 px-6 py-4 flex items-center justify-between border transition-all duration-300"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(37, 99, 235, 0.15)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px -2px rgba(37, 99, 235, 0.05)'
      }}
    >
      {/* Left side: Project Name in Royal Blue */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse flex-shrink-0" />
        <h2 
          className="text-base font-extrabold tracking-tight text-blue-900 truncate"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          {projectName || 'Unnamed Project'}
        </h2>
      </div>

      {/* Right side: Minimal Edit button in Orange */}
      <button
        onClick={handleEditClick}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-orange-500 bg-orange-500/5 hover:bg-orange-500 hover:text-white text-orange-600 font-bold rounded-lg text-xs tracking-wider uppercase transition-all duration-250 cursor-pointer shadow-sm shadow-orange-500/5"
      >
        <Edit3 size={12} />
        Edit Project Info
      </button>
    </div>
  );
}
