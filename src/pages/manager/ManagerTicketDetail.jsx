import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/shared/Layout';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import { TicketStatusBadge, TicketPriorityBadge, PRIORITY_ACCENT } from '../../components/tickets/TicketStatusBadge';
import TicketTimeline from '../../components/tickets/TicketTimeline';
import LinkedQuestionCard from '../../components/tickets/LinkedQuestionCard';
import { ArrowLeft, CheckCircle, XCircle, Send, RotateCcw, Hash, Calendar, User, Folder, Clock, Shield, GitBranch, ChevronDown, MessageSquare, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManagerTicketDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const axiosSecure  = useAxiosSecure();
  const [ticket,           setTicket]           = useState(null);
  const [assessors,        setAssessors]        = useState([]);
  const [selectedAssessor, setSelectedAssessor] = useState('');
  const [loading,          setLoading]          = useState(true);

  const fetchTicket = () => {
    setLoading(true);
    axiosSecure.get(`/tickets/${id}`)
      .then((res)  => {
        const t = res.data.ticket;
        setTicket(t);
        // Auto-select assigned ticket assessor OR first project assigned assessor
        const ticketAssessorId = t?.assignedAssessor?._id || t?.assignedAssessor;
        const projectAssessorId = t?.projectId?.assignedAssessors?.[0]?._id || t?.projectId?.assignedAssessors?.[0];
        if (ticketAssessorId) {
          setSelectedAssessor(String(ticketAssessorId));
        } else if (projectAssessorId) {
          setSelectedAssessor(String(projectAssessorId));
        }
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load ticket'))
      .finally(()  => setLoading(false));
  };

  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    fetchTicket();
    axiosSecure.get('/users').then((res) => {
      const users = res.data.users || res.data || [];
      setAllUsers(users);
    }).catch(() => {});
  }, [id]);

  const handleStatusTransition = async (newStatus, reason = '') => {
    try {
      await axiosSecure.patch(`/tickets/${id}/status`, { status: newStatus, reason });
      toast.success(`Status updated to ${newStatus.replace('_',' ').toUpperCase()}`);
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status transition failed');
    }
  };

  const handleForwardToAssessor = async () => {
    if (!selectedAssessor) return toast.error('Please select an Assessor');
    try {
      await axiosSecure.patch(`/tickets/${id}/assign`, { assignedAssessor: selectedAssessor });
      if (ticket.status === 'submitted') {
        try {
          await axiosSecure.patch(`/tickets/${id}/status`, { status: 'manager_review', reason: 'Manager Review' });
        } catch (_) {}
      }
      await axiosSecure.patch(`/tickets/${id}/status`, { status: 'assigned', reason: 'Forwarded by Manager' });
      toast.success('Ticket forwarded to Assessor!');
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to forward ticket');
    }
  };

  if (loading) return (
    <Layout isManager>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--g500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, color: 'var(--tx-muted)', fontFamily: "'Nunito',sans-serif" }}>Loading ticket…</p>
        </div>
      </div>
    </Layout>
  );

  if (!ticket) return <Layout isManager><div style={{ textAlign: 'center', padding: 60 }}>Ticket not found.</div></Layout>;

  const accentColor = PRIORITY_ACCENT[ticket.priority] || PRIORITY_ACCENT.medium;
  const isManagerReviewState = ticket.status === 'manager_review' || ticket.status === 'submitted';

  return (
    <Layout isManager>
      {/* Nav bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <button onClick={() => navigate(-1)} className="btn-secondary" style={{ fontSize: 12.5, padding: '7px 16px' }}>
          <ArrowLeft size={14} /> Back
        </button>

        {/* Manager Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isManagerReviewState && (
            <>
              {/* Forward to assessor */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 8px',
                background: 'rgba(34,168,75,0.06)',
                border: '1.5px solid rgba(34,168,75,0.25)',
                borderRadius: 10,
              }}>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedAssessor}
                    onChange={(e) => setSelectedAssessor(e.target.value)}
                    style={{
                      height: 34, paddingLeft: 10, paddingRight: 28,
                      border: '1.5px solid var(--border-md)',
                      borderRadius: 8, fontSize: 12,
                      fontFamily: "'Nunito',sans-serif", fontWeight: 600,
                      color: 'var(--tx)', background: '#fff',
                      outline: 'none', cursor: 'pointer',
                      appearance: 'none', WebkitAppearance: 'none',
                    }}
                  >
                    <option value="">Select Assessor…</option>
                    {(() => {
                      const projectAssessorObjs = ticket?.projectId?.assignedAssessors || [];
                      const projectAssessorIds = projectAssessorObjs.map(a => String(a._id || a));

                      // Include all users who are project assessors OR have assessor/admin/manager role
                      const available = allUsers.filter(u => {
                        const uid = String(u._id);
                        if (projectAssessorIds.includes(uid)) return true;
                        const roles = u.roles || [];
                        return roles.includes('desh_assessor') || roles.includes('admin') || roles.includes('desh_manager');
                      });

                      // Also ensure any populated projectAssessorObjs that might not be in allUsers yet are added
                      projectAssessorObjs.forEach(pa => {
                        if (typeof pa === 'object' && pa?._id) {
                          const exists = available.some(u => String(u._id) === String(pa._id));
                          if (!exists) available.push(pa);
                        }
                      });

                      const sorted = available.sort((a, b) => {
                        const aIsProj = projectAssessorIds.includes(String(a._id));
                        const bIsProj = projectAssessorIds.includes(String(b._id));
                        if (aIsProj && !bIsProj) return -1;
                        if (!aIsProj && bIsProj) return 1;
                        return 0;
                      });

                      return sorted.map((a) => {
                        const isProjAssessor = projectAssessorIds.includes(String(a._id));
                        return (
                          <option key={a._id} value={a._id}>
                            {a.name} ({a.email}){isProjAssessor ? ' ⭐ (Project Assessor)' : ''}
                          </option>
                        );
                      });
                    })()}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-faint)', pointerEvents: 'none' }} />
                </div>
                <button onClick={handleForwardToAssessor} className="btn-primary-green" style={{ fontSize: 12, padding: '6px 14px' }}>
                  <Send size={13} /> Forward
                </button>
              </div>

              <button onClick={() => handleStatusTransition('returned', 'Returned by Manager for revision')} className="btn-secondary" style={{ fontSize: 12, padding: '7px 14px', color: '#EA580C', borderColor: 'rgba(234,88,12,0.3)' }}>
                <RotateCcw size={13} /> Return
              </button>

              <button onClick={() => handleStatusTransition('rejected', 'Rejected by Manager')} className="btn-danger" style={{ fontSize: 12, padding: '7px 14px' }}>
                <XCircle size={13} /> Reject
              </button>
            </>
          )}

          {ticket.status !== 'closed' && (
            <button onClick={() => handleStatusTransition('closed', 'Closed by Manager')} className="btn-secondary" style={{ fontSize: 12, padding: '7px 14px' }}>
              <CheckCircle size={13} /> Close Ticket
            </button>
          )}
        </div>
      </div>

      {/* Workflow Guidance Banner */}
      {ticket.status === 'response_submitted' && (
        <div style={{ padding: '16px 20px', borderRadius: 14, marginBottom: 20, background: 'linear-gradient(135deg, #F3E8FF, #EDE9FE)', border: '1.5px solid #C084FC', boxShadow: '0 4px 12px rgba(124,58,237,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={20} color="#fff" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#5B21B6', fontFamily: 'Montserrat,sans-serif' }}>
                  Assessor Response Submitted & Ready for Review
                </h4>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#6B21A8', fontFamily: 'Nunito,sans-serif' }}>
                  Assessor <b>{ticket.assignedAssessor?.name || 'Assessor'}</b> has submitted an official response. Review the response below and take action:
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => handleStatusTransition('resolved', 'Response approved & ticket resolved by Manager')} className="btn-primary-green" style={{ fontSize: 12, padding: '7px 14px' }}>
                ✓ Approve & Resolve
              </button>
              <button onClick={() => handleStatusTransition('returned', 'Returned to Assessor for further revision')} className="btn-secondary" style={{ fontSize: 12, padding: '7px 14px', color: '#EA580C', borderColor: 'rgba(234,88,12,0.3)' }}>
                <RotateCcw size={13} /> Return to Assessor
              </button>
              <button onClick={() => handleStatusTransition('rejected', 'Rejected by Manager')} className="btn-danger" style={{ fontSize: 12, padding: '7px 14px' }}>
                <XCircle size={13} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {isManagerReviewState && (
        <div style={{
          padding: '12px 16px', borderRadius: 12, marginBottom: 16,
          background: 'rgba(245,158,11,0.07)',
          border: '1.5px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Shield size={16} color="#D97706" />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', fontFamily: "'Nunito',sans-serif", margin: 0 }}>
            This ticket is awaiting your review. Please select an assessor and click Forward, or Return / Reject.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <LinkedQuestionCard ticket={ticket} />

          {/* Ticket header */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', boxShadow: 'var(--sh-xs)', overflow: 'hidden' }}>
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
              <p style={{ fontSize: 13.5, color: 'var(--tx-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: "'Nunito',sans-serif", padding: '14px 16px', background: 'var(--bg-soft)', borderRadius: 10, border: '1px solid var(--border)', margin: 0 }}>
                {ticket.description}
              </p>
            </div>
          </div>

          {/* Dedicated Official Assessor Response Section */}
          {ticket.responses && ticket.responses.length > 0 && (
            <div style={{ background: '#FAF5FF', borderRadius: 16, border: '2px solid #C084FC', boxShadow: '0 4px 14px rgba(124,58,237,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={16} color="#fff" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: 'Montserrat,sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Official Assessor Response
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#E9D5FF', fontFamily: 'Nunito,sans-serif' }}>
                  {new Date(ticket.responses[ticket.responses.length - 1].createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#4C1D95', fontFamily: 'Montserrat,sans-serif' }}>
                    {ticket.responses[ticket.responses.length - 1].authorName || 'Assessor'}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#7C3AED', background: '#EDE9FE', border: '1px solid #DDD6FE', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>
                    {ticket.responses[ticket.responses.length - 1].authorRole || 'desh_assessor'}
                  </span>
                </div>
                <p style={{ fontSize: 13.5, color: '#1E1B4B', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'Nunito,sans-serif', margin: 0 }}>
                  {ticket.responses[ticket.responses.length - 1].text}
                </p>

                {ticket.responses[ticket.responses.length - 1].attachments?.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #E9D5FF' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#6B21A8', fontFamily: 'Montserrat,sans-serif', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                      Submitted Attachments:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {ticket.responses[ticket.responses.length - 1].attachments.map((att, i) => (
                        <a
                          key={i}
                          href={`http://localhost:5000/api/uploads/download/tickets/${att.filename}?originalName=${encodeURIComponent(att.originalName)}`}
                          target="_blank" rel="noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', borderRadius: 8,
                            fontSize: 12, fontWeight: 700,
                            fontFamily: 'Nunito,sans-serif',
                            background: '#F3E8FF', color: '#6B21A8',
                            border: '1.5px solid #D8B4FE', textDecoration: 'none',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                          }}
                        >
                          <Paperclip size={13} /> {att.originalName}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', boxShadow: 'var(--sh-xs)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,168,75,0.1)', border: '1px solid rgba(34,168,75,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GitBranch size={14} color="var(--g600)" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', fontFamily: "'Montserrat',sans-serif", margin: 0 }}>Activity Timeline</p>
            </div>
            <TicketTimeline ticket={ticket} />
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', boxShadow: 'var(--sh-xs)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--tx-muted)', fontFamily: "'Montserrat',sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Workflow Summary</p>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <MetaRow icon={<Shield size={13} />} label="Mode" value={<span style={{ fontWeight: 700, color: 'var(--g700)', textTransform: 'uppercase', fontSize: 11 }}>{ticket.routingMode}</span>} />
              <MetaRow icon={<Folder size={13} />} label="Project" value={ticket.projectId?.title || 'Unknown'} />
              <MetaRow icon={<User size={13} />} label="Created By" value={`${ticket.createdBy?.name} (${ticket.creatorRole})`} />
              <MetaRow icon={<User size={13} />} label="Assessor" value={ticket.assignedAssessor?.name || <span style={{ color: 'var(--tx-faint)', fontStyle: 'italic' }}>Unassigned</span>} />
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
