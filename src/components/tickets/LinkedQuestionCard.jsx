import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Target } from 'lucide-react';
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
  const tabId = ticket.tabId?._id || ticket.tabId || '';
  const moduleId = ticket.moduleId?._id || ticket.moduleId || '';
  const inputId = ticket.inputId?._id || ticket.inputId || '';

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

    const queryParts = [];
    if (tabId) queryParts.push(`tabId=${encodeURIComponent(tabId)}`);
    if (moduleId) queryParts.push(`moduleId=${encodeURIComponent(moduleId)}`);
    if (inputId) queryParts.push(`inputId=${encodeURIComponent(inputId)}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    navigate(`${targetBasePath}${queryString}`);
  };

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 14,
      background: 'linear-gradient(135deg, rgba(34,168,75,0.06), rgba(52,201,97,0.03))',
      border: '1.5px solid rgba(34,168,75,0.25)',
      marginBottom: 18,
      boxShadow: 'var(--sh-xs)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg,#1A7A35,#34C961)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Target size={14} color="#fff" />
          </div>
          <h3 style={{ fontSize: 13, fontWeight: 800, fontFamily: "'Montserrat',sans-serif", color: '#1A7A35', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Linked Question Context
          </h3>
        </div>

        {projectId && (
          <button
            onClick={handleGoToQuestion}
            className="btn-primary-green"
            style={{ fontSize: 12, padding: '6px 14px', gap: 6 }}
          >
            <ExternalLink size={13} /> Go to Linked Question
          </button>
        )}
      </div>

      <div style={{
        background: '#fff',
        borderRadius: 10,
        padding: '10px 12px',
        border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, color: 'var(--tx-muted)', fontFamily: "'Nunito',sans-serif" }}>
          <span>
            <strong style={{ color: 'var(--tx-2)' }}>Project:</strong>{' '}
            {ticket.projectId?.title || snapshot.projectTitle || 'N/A'}
          </span>
          {snapshot.tabTitle && (
            <span>
              <strong style={{ color: 'var(--tx-2)' }}>Location:</strong>{' '}
              {snapshot.tabTitle} {snapshot.moduleTitle ? `→ ${snapshot.moduleTitle}` : ''}
            </span>
          )}
        </div>

        <p style={{
          fontSize: 12.5, fontWeight: 700, color: '#145C28',
          fontFamily: "'Nunito',sans-serif", margin: 0,
          lineHeight: 1.5,
          background: 'rgba(34,168,75,0.06)',
          padding: '6px 10px', borderRadius: 6,
          borderLeft: '3px solid #22A84B',
        }}>
          {snapshot.number ? `[${snapshot.number}] ` : ''}{snapshot.label || 'Question'}
        </p>

        {snapshot.details && (
          <p style={{ fontSize: 11, color: 'var(--tx-faint)', fontStyle: 'italic', margin: 0, fontFamily: "'Nunito',sans-serif" }}>
            {snapshot.details}
          </p>
        )}
      </div>
    </div>
  );
}
