import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import { TicketStatusBadge, TicketPriorityBadge } from '../../components/tickets/TicketStatusBadge';
import TicketTimeline from '../../components/tickets/TicketTimeline';
import TicketResponseForm from '../../components/tickets/TicketResponseForm';
import LinkedQuestionCard from '../../components/tickets/LinkedQuestionCard';
import { ArrowLeft, User, Folder, Paperclip, AlertTriangle, Shield, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTicket = () => {
    setLoading(true);
    axiosSecure.get(`/tickets/${id}`)
      .then((res) => setTicket(res.data.ticket))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load ticket'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleStatusTransition = async (newStatus, reason = '') => {
    try {
      await axiosSecure.patch(`/tickets/${id}/status`, { status: newStatus, reason });
      toast.success(`Ticket status updated to ${newStatus.toUpperCase()}`);
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status transition failed');
    }
  };

  const handleResponseSubmit = async ({ text, files }) => {
    try {
      const formData = new FormData();
      formData.append('text', text);
      files.forEach((f) => formData.append('files', f));

      await axiosSecure.post(`/tickets/${id}/responses`, formData);
      toast.success('Response submitted!');
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit response');
    }
  };

  if (loading) return <Layout isAdmin><div className="text-center py-12">Loading ticket detail...</div></Layout>;
  if (!ticket) return <Layout isAdmin><div className="text-center py-12">Ticket not found</div></Layout>;

  return (
    <Layout isAdmin>
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-2">
          {ticket.status !== 'closed' && (
            <button
              onClick={() => handleStatusTransition('closed', 'Closed by Admin')}
              className="btn-danger text-xs px-3 py-1.5 inline-flex items-center gap-1"
            >
              <XCircle size={14} /> Force Close Ticket
            </button>
          )}

          {ticket.status === 'resolved' && (
            <button
              onClick={() => handleStatusTransition('closed', 'Verified and closed by Admin')}
              className="btn-primary-green text-xs px-3 py-1.5 inline-flex items-center gap-1"
            >
              <CheckCircle size={14} /> Close Ticket
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Info & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Linked Question Information Card */}
          <LinkedQuestionCard ticket={ticket} />

          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-600 tracking-wider">
                  {ticket.ticketNumber}
                </span>
                <h1 className="text-xl font-bold mt-1" style={{ color: 'var(--tx)' }}>
                  {ticket.subject}
                </h1>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <TicketStatusBadge status={ticket.status} />
                <TicketPriorityBadge priority={ticket.priority} />
              </div>
            </div>

            <p className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--tx-muted)' }}>
              {ticket.description}
            </p>

            {/* Dynamic Form Data */}
            {ticket.formData && Object.keys(ticket.formData).length > 0 && (
              <div className="pt-4 border-t border-emerald-500/20 text-xs">
                <h4 className="font-bold text-emerald-700 mb-2">Custom Form Answers</h4>
                <div className="grid grid-cols-2 gap-2 bg-emerald-500/5 p-3 rounded-xl">
                  {Object.entries(ticket.formData).map(([k, v]) => (
                    <div key={k}>
                      <span className="font-semibold text-gray-500 capitalize">{k}:</span> <span className="font-medium">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Response Form */}
          {ticket.status !== 'closed' && (
            <TicketResponseForm onSubmit={handleResponseSubmit} />
          )}

          {/* Audit Timeline */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-4">
              Audit & Activity Timeline
            </h3>
            <TicketTimeline ticket={ticket} />
          </div>
        </div>

        {/* Right 1 Col: Metadata & Participants */}
        <div className="space-y-6">
          <div className="glass-card p-5 rounded-2xl space-y-4 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
              Ticket Details
            </h3>

            <div>
              <span className="text-gray-500 block font-semibold">Routing Mode:</span>
              <span className="font-bold uppercase text-emerald-700">{ticket.routingMode}</span>
            </div>

            <div>
              <span className="text-gray-500 block font-semibold">Project:</span>
              <span className="font-medium">{ticket.projectId?.title || 'Unknown'}</span>
            </div>

            <div>
              <span className="text-gray-500 block font-semibold">Created By:</span>
              <span className="font-medium">{ticket.createdBy?.name} ({ticket.creatorRole})</span>
            </div>

            <div>
              <span className="text-gray-500 block font-semibold">Assigned Assessor:</span>
              <span className="font-medium">{ticket.assignedAssessor?.name || 'Unassigned'}</span>
            </div>

            <div>
              <span className="text-gray-500 block font-semibold">Assigned Reviewer:</span>
              <span className="font-medium">{ticket.assignedReviewer?.name || 'Unassigned'}</span>
            </div>

            <div>
              <span className="text-gray-500 block font-semibold">SLA Deadline:</span>
              <span className="font-medium">
                {ticket.slaDeadline ? new Date(ticket.slaDeadline).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
