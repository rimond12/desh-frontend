import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import { TicketStatusBadge, TicketPriorityBadge } from '../../components/tickets/TicketStatusBadge';
import TicketTimeline from '../../components/tickets/TicketTimeline';
import TicketResponseForm from '../../components/tickets/TicketResponseForm';
import LinkedQuestionCard from '../../components/tickets/LinkedQuestionCard';
import { ArrowLeft, CheckCircle, RotateCcw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AssessorTicketDetail from './AssessorTicketDetail';

export default function ReviewerTicketDetail() {
  const { activeRole } = useAuth();

  if (activeRole === 'desh_assessor') {
    return <AssessorTicketDetail />;
  }

  return <ReviewerTicketDetailContent />;
}

function ReviewerTicketDetailContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const { dbUser } = useAuth();
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

  if (loading) return <Layout isReviewer><div className="text-center py-12">Loading ticket...</div></Layout>;
  if (!ticket) return <Layout isReviewer><div className="text-center py-12">Ticket not found</div></Layout>;

  const isOwnTicket = String(ticket.createdBy?._id || ticket.createdBy) === String(dbUser?._id);

  return (
    <Layout isReviewer>
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-2">
          {ticket.status === 'response_submitted' && (
            <button
              onClick={() => handleStatusTransition('resolved', 'Response accepted by Reviewer')}
              className="btn-primary-green text-xs px-3.5 py-1.5 inline-flex items-center gap-1"
            >
              <CheckCircle size={14} /> Resolve Ticket
            </button>
          )}

          {ticket.status === 'resolved' && (
            <button
              onClick={() => handleStatusTransition('reopened', 'Reopened by Reviewer for further info')}
              className="btn-secondary text-xs px-3.5 py-1.5 inline-flex items-center gap-1 text-pink-600"
            >
              <RotateCcw size={14} /> Reopen Ticket
            </button>
          )}

          {/* OWN TICKET CLOSE RULE: Reviewer can ONLY close tickets THEY created */}
          {isOwnTicket && ticket.status !== 'closed' && (
            <button
              onClick={() => handleStatusTransition('closed', 'Closed by Creator')}
              className="btn-secondary text-xs px-3.5 py-1.5 inline-flex items-center gap-1"
            >
              <XCircle size={14} /> Close Ticket
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-4">
              Activity & Responses
            </h3>
            <TicketTimeline ticket={ticket} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-5 rounded-2xl space-y-4 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
              Ticket Context
            </h3>
            <div>
              <span className="text-gray-500 block font-semibold">Project:</span>
              <span className="font-medium">{ticket.projectId?.title}</span>
            </div>
            <div>
              <span className="text-gray-500 block font-semibold">Creator:</span>
              <span className="font-medium">{ticket.createdBy?.name}</span>
            </div>
            <div>
              <span className="text-gray-500 block font-semibold">Assigned Assessor:</span>
              <span className="font-medium">{ticket.assignedAssessor?.name || 'Unassigned'}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
