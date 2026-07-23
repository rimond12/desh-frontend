import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import { TicketStatusBadge, TicketPriorityBadge, PRIORITY_ACCENT } from '../../components/tickets/TicketStatusBadge';
import TicketTimeline from '../../components/tickets/TicketTimeline';
import TicketResponseForm from '../../components/tickets/TicketResponseForm';
import LinkedQuestionCard from '../../components/tickets/LinkedQuestionCard';
import {
  ArrowLeft, CheckCircle, XCircle, Hash, Calendar,
  User, Folder, GitBranch, Clock, Shield, Paperclip
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminTicketDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const axiosSecure  = useAxiosSecure();
  const [ticket,  setTicket]  = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTicket = () => {
    setLoading(true);
    axiosSecure.get(`/tickets/${id}`)
      .then((res)  => setTicket(res.data.ticket))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load ticket'))
      .finally(()  => setLoading(false));
  };

  useEffect(() => { fetchTicket(); }, [id]);

  const handleStatusTransition = async (newStatus, reason = '') => {
    try {
      await axiosSecure.patch(`/tickets/${id}/status`, { status: newStatus, reason });
      toast.success(`Ticket status updated to ${newStatus.replace('_', ' ').toUpperCase()}`);
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status transition failed');
    }
  };

  const handleResponseSubmit = async ({ text, files }) => {
    try {
      const fd = new FormData();
      fd.append('text', text);
      files.forEach((f) => fd.append('files', f));
      await axiosSecure.post(`/tickets/${id}/responses`, fd);
      toast.success('Response submitted!');
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit response');
    }
  };

  if (loading) return (
    <Layout isAdmin>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--g500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, color: 'var(--tx-muted)', fontFamily: "'Nunito',sans-serif" }}>Loading ticket…</p>
        </div>
      </div>
    </Layout>
  );

  if (!ticket) return <Layout isAdmin><div style={{ textAlign: 'center', padding: 60 }}>Ticket not found.</div></Layout>;

  const accentColor = PRIORITY_ACCENT[ticket.priority] || PRIORITY_ACCENT.medium;

  return (
    <Layout isAdmin>
      {/* Top nav bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <button onClick={() => navigate(-1)} className="btn-secondary" style={{ fontSize: 12.5, padding: '7px 16px' }}>
          <ArrowLeft size={14} /> Back to Tickets
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {ticket.status !== 'closed' && (
            <button
              onClick={() => handleStatusTransition('closed', 'Closed by Admin')}
              className="btn-danger"
              style={{ fontSize: 12.5, padding: '7px 16px' }}
            >
              <XCircle size={14} /> Force Close
            </button>
          )}
          {ticket.status === 'resolved' && (
            <button
              onClick={() => handleStatusTransition('closed', 'Verified and closed by Admin')}
              className="btn-primary-green"
              style={{ fontSize: 12.5, padding: '7px 16px' }}
            >
              <CheckCircle size={14} /> Close Ticket
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* ─── Main Column ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Linked question */}
          <LinkedQuestionCard ticket={ticket} />

          {/* Ticket header card */}
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid var(--border)',
            boxShadow: 'var(--sh-xs)',
            overflow: 'hidden',
          }}>
            <div style={{ height: 4, background: accentColor }} />
            <div style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    <Hash size={13} color={accentColor} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: accentColor, fontFamily: "'Montserrat',sans-serif", letterSpacing: '0.05em' }}>
                      {ticket.ticketNumber}
                    </span>
                  </div>
                  <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Montserrat',sans-serif", color: 'var(--tx)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                    {ticket.subject}
                  </h1>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <TicketStatusBadge status={ticket.status} />
                  <TicketPriorityBadge priority={ticket.priority} />
                </div>
              </div>

              <p style={{
                fontSize: 13.5, color: 'var(--tx-muted)',
                lineHeight: 1.7, whiteSpace: 'pre-wrap',
                fontFamily: "'Nunito',sans-serif",
                padding: '14px 16px',
                background: 'var(--bg-soft)',
                borderRadius: 10,
                border: '1px solid var(--border)',
                margin: 0,
              }}>
                {ticket.description}
              </p>

              {/* Uploaded Ticket Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Paperclip size={13} color="var(--g700)" />
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--tx-2)', fontFamily: "'Montserrat',sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Ticket Attachments & Evidence ({ticket.attachments.length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ticket.attachments.map((att, i) => (
                      <a
                        key={att._id || i}
                        href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/uploads/download/tickets/${att.filename}?originalName=${encodeURIComponent(att.originalName)}`}
                        target="_blank" rel="noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 14px', borderRadius: 8,
                          fontSize: 12, fontWeight: 700,
                          fontFamily: "'Nunito',sans-serif",
                          background: 'var(--g50)', color: 'var(--g700)',
                          border: '1.5px solid var(--g200)', textDecoration: 'none',
                          boxShadow: 'var(--sh-xs)', transition: 'all 0.15s'
                        }}
                      >
                        <Paperclip size={13} /> {att.originalName}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic form data */}
              {ticket.formData && Object.keys(ticket.formData).length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--g700)', fontFamily: "'Montserrat',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Custom Form Answers
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {Object.entries(ticket.formData).map(([k, v]) => (
                      <div key={k} style={{ padding: '8px 12px', background: 'var(--bg-soft)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--tx-faint)', textTransform: 'capitalize', display: 'block', marginBottom: 2, fontFamily: "'Montserrat',sans-serif" }}>{k}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', fontFamily: "'Nunito',sans-serif" }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Response form */}
          {ticket.status !== 'closed' && (
            <TicketResponseForm onSubmit={handleResponseSubmit} />
          )}

          {/* Timeline */}
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid var(--border)',
            boxShadow: 'var(--sh-xs)',
            padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,168,75,0.1)', border: '1px solid rgba(34,168,75,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GitBranch size={14} color="var(--g600)" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', fontFamily: "'Montserrat',sans-serif", margin: 0 }}>Activity Timeline</p>
            </div>
            <TicketTimeline ticket={ticket} />
          </div>
        </div>

        {/* ─── Sidebar ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 20 }}>

          {/* Ticket details card */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--sh-xs)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--tx-muted)', fontFamily: "'Montserrat',sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Ticket Details</p>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <MetaRow icon={<Shield size={13} />} label="Routing" value={<span style={{ fontWeight: 700, color: 'var(--g700)', textTransform: 'uppercase', fontSize: 11 }}>{ticket.routingMode}</span>} />
              <MetaRow icon={<Folder size={13} />} label="Project" value={ticket.projectId?.title || 'Unknown'} />
              <MetaRow icon={<User size={13} />} label="Created By" value={`${ticket.createdBy?.name} (${ticket.creatorRole})`} />
              <MetaRow icon={<User size={13} />} label="Assessor" value={ticket.assignedAssessor?.name || <span style={{ color: 'var(--tx-faint)', fontStyle: 'italic' }}>Unassigned</span>} />
              <MetaRow icon={<User size={13} />} label="Reviewer" value={ticket.assignedReviewer?.name || <span style={{ color: 'var(--tx-faint)', fontStyle: 'italic' }}>Unassigned</span>} />
              <MetaRow icon={<Clock size={13} />} label="SLA Deadline" value={ticket.slaDeadline ? new Date(ticket.slaDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} />
              <MetaRow icon={<Calendar size={13} />} label="Created" value={new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function MetaRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ color: 'var(--g600)', marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--tx-faint)', fontFamily: "'Montserrat',sans-serif", textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px' }}>{label}</p>
        <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', fontFamily: "'Nunito',sans-serif", margin: 0, wordBreak: 'break-word' }}>{value}</p>
      </div>
    </div>
  );
}
