import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import { TicketStatusBadge, TicketPriorityBadge } from '../../components/tickets/TicketStatusBadge';
import TicketTimeline from '../../components/tickets/TicketTimeline';
import TicketResponseForm from '../../components/tickets/TicketResponseForm';
import LinkedQuestionCard from '../../components/tickets/LinkedQuestionCard';
import { ArrowLeft, CheckCircle, XCircle, Send, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManagerTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const axiosSecure = useAxiosSecure();
  const [ticket, setTicket] = useState(null);
  const [assessors, setAssessors] = useState([]);
  const [selectedAssessor, setSelectedAssessor] = useState('');
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
    // Load assessors list
    axiosSecure.get('/users').then((res) => {
      const users = res.data.users || res.data || [];
      setAssessors(users.filter((u) => u.roles?.includes('desh_assessor') || u.roles?.includes('admin')));
    }).catch(() => {});
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

  const handleForwardToAssessor = async () => {
    if (!selectedAssessor) return toast.error('Please select an Assessor to assign');
    try {
      await axiosSecure.patch(`/tickets/${id}/assign`, { assignedAssessor: selectedAssessor });
      await axiosSecure.patch(`/tickets/${id}/status`, { status: 'assigned', reason: 'Forwarded by Manager to Assessor' });
      toast.success('Ticket forwarded to Assessor!');
      fetchTicket();
    } catch (err) {
      toast.error('Failed to forward ticket');
    }
  };

  if (loading) return <Layout isManager><div className="text-center py-12">Loading ticket detail...</div></Layout>;
  if (!ticket) return <Layout isManager><div className="text-center py-12">Ticket not found</div></Layout>;

  return (
    <Layout isManager>
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </button>

        {/* Manager Action Bar */}
        <div className="flex items-center gap-2">
          {ticket.status === 'manager_review' && (
            <>
              <div className="flex items-center gap-2 bg-emerald-500/10 p-1 rounded-xl border border-emerald-500/20">
                <select
                  value={selectedAssessor}
                  onChange={(e) => setSelectedAssessor(e.target.value)}
                  className="input-field text-xs py-1"
                >
                  <option value="">Select Assessor</option>
                  {assessors.map((a) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleForwardToAssessor}
                  className="btn-primary-green text-xs px-3 py-1.5 inline-flex items-center gap-1"
                >
                  <Send size={13} /> Forward
                </button>
              </div>

              <button
                onClick={() => handleStatusTransition('returned', 'Returned by Manager for revision')}
                className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1 text-orange-600"
              >
                <RotateCcw size={13} /> Return
              </button>

              <button
                onClick={() => handleStatusTransition('rejected', 'Rejected by Manager')}
                className="btn-danger text-xs px-3 py-1.5 inline-flex items-center gap-1"
              >
                <XCircle size={13} /> Reject
              </button>
            </>
          )}

          {ticket.status !== 'closed' && (
            <button
              onClick={() => handleStatusTransition('closed', 'Closed by Manager')}
              className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1"
            >
              <CheckCircle size={13} /> Close Ticket
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
              Activity & Workflow Timeline
            </h3>
            <TicketTimeline ticket={ticket} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-5 rounded-2xl space-y-4 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
              Workflow Summary
            </h3>
            <div>
              <span className="text-gray-500 block font-semibold">Mode:</span>
              <span className="font-bold uppercase text-emerald-700">{ticket.routingMode}</span>
            </div>
            <div>
              <span className="text-gray-500 block font-semibold">Project:</span>
              <span className="font-medium">{ticket.projectId?.title}</span>
            </div>
            <div>
              <span className="text-gray-500 block font-semibold">Creator:</span>
              <span className="font-medium">{ticket.createdBy?.name} ({ticket.creatorRole})</span>
            </div>
            <div>
              <span className="text-gray-500 block font-semibold">Assigned Assessor:</span>
              <span className="font-medium">{ticket.assignedAssessor?.name || 'None'}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
