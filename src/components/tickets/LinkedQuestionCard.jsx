import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, AlertTriangle, HelpCircle } from 'lucide-react';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import { useAuth } from '../../context/AuthContext';

export default function LinkedQuestionCard({ ticket }) {
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const { dbUser } = useAuth();

  if (!ticket?.inputId && !ticket?.questionSnapshot?.label) {
    return null; // Not a question-linked ticket
  }

  const snapshot = ticket.questionSnapshot || {};
  const projectId = ticket.projectId?._id || ticket.projectId;
  const tabId = ticket.tabId || '';
  const moduleId = ticket.moduleId || '';
  const inputId = ticket.inputId || '';

  const handleGoToQuestion = async () => {
    if (!projectId) return;

    try {
      await axiosSecure.post(`/tickets/${ticket._id}/log-question-access`, {
        status: 'linked_question_opened',
      });
    } catch (_) {}

    const activeRole = dbUser?.activeRole || dbUser?.role;
    let targetBasePath = `/projects/${projectId}`;
    if (activeRole === 'admin') {
      targetBasePath = `/admin/submissions/${projectId}`;
    } else if (['desh_manager', 'desh_reviewer', 'desh_assessor', 'reviewer'].includes(activeRole)) {
      targetBasePath = `/reviewer/submissions/${projectId}`;
    }

    // Navigate to submission or project assessment with query params for auto-scroll & highlight
    navigate(`${targetBasePath}?tabId=${tabId}&moduleId=${moduleId}&inputId=${inputId}`);
  };

  return (
    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-emerald-600" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Linked Question Details
          </h3>
        </div>

        {projectId && (
          <button
            onClick={handleGoToQuestion}
            className="btn-primary-green text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5 shadow-md"
          >
            <ExternalLink size={14} /> Go to Linked Question
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-white/60 dark:bg-black/20 p-3 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <div>
          <span className="text-gray-500 block font-semibold">Project:</span>
          <span className="font-bold">{ticket.projectId?.title || snapshot.projectTitle || 'N/A'}</span>
        </div>

        <div>
          <span className="text-gray-500 block font-semibold">Category / Subcategory:</span>
          <span className="font-medium">{snapshot.tabTitle || 'Tab'} &rarr; {snapshot.moduleTitle || 'Module'}</span>
        </div>

        <div className="col-span-1 md:col-span-2">
          <span className="text-gray-500 block font-semibold">Question:</span>
          <p className="font-semibold text-emerald-900 dark:text-emerald-200 mt-0.5">
            {snapshot.number ? `[${snapshot.number}] ` : ''}{snapshot.label || 'Question Label'}
          </p>
          {snapshot.details && (
            <p className="text-[11px] text-gray-500 italic mt-0.5">{snapshot.details}</p>
          )}
        </div>
      </div>
    </div>
  );
}
