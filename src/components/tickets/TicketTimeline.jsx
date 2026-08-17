import React from 'react';
import { TicketStatusBadge } from './TicketStatusBadge';
import { Clock, User, MessageSquare, Paperclip, ArrowRight, GitBranch, CheckCircle2 } from 'lucide-react';

const TYPE_CONFIG = {
  status:   { icon: GitBranch,     color: '#059669', bg: 'rgba(5,150,105,0.1)',  border: 'rgba(5,150,105,0.25)',  line: '#A7F3D0' },
  response: { icon: MessageSquare, color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.25)', line: '#DDD6FE' },
  comment:  { icon: Clock,         color: '#0284C7', bg: 'rgba(2,132,199,0.1)',  border: 'rgba(2,132,199,0.25)',  line: '#BAE6FD' },
};

const ROLE_STYLES = {
  desh_reviewer: { label: 'DESH REVIEWER', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  reviewer:      { label: 'REVIEWER',      color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  desh_manager:  { label: 'DESH MANAGER',  color: '#059669', bg: '#D1FAE5', border: '#A7F3D0' },
  manager:       { label: 'MANAGER',       color: '#059669', bg: '#D1FAE5', border: '#A7F3D0' },
  desh_assessor: { label: 'DESH ASSESSOR', color: '#7C3AED', bg: '#EDE9FE', border: '#DDD6FE' },
  assessor:      { label: 'ASSESSOR',      color: '#7C3AED', bg: '#EDE9FE', border: '#DDD6FE' },
  admin:         { label: 'ADMIN',         color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
  user:          { label: 'APPLICANT',     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
};

function getTransitionLabel(from, to) {
  if (from === 'open' && to === 'submitted') return 'Ticket Created & Submitted';
  if ((from === 'submitted' || from === 'open') && (to === 'pending_approval' || to === 'manager_review')) return 'Routed for Manager Approval';
  if ((from === 'pending_approval' || from === 'manager_review' || from === 'submitted') && (to === 'forwarded_to_assessor' || to === 'assigned')) return 'Forwarded to Assessor';
  if ((from === 'forwarded_to_assessor' || from === 'assigned') && to === 'in_progress') return 'Assessor Accepted & In Progress';
  if (from === 'in_progress' && to === 'response_submitted') return 'Assessor Submitted Official Response';
  if (from === 'response_submitted' && to === 'resolved') return 'Manager Approved & Resolved Ticket';
  if (from === 'response_submitted' && to === 'returned') return 'Manager Returned Response for Re-review';
  if (to === 'returned') return 'Sent Back for Re-review';
  if (to === 'closed') return 'Ticket Closed';
  if (to === 'rejected') return 'Ticket Rejected by Manager';
  if (to === 'reopened') return 'Ticket Reopened';
  return `Status updated: ${from?.replace(/_/g,' ').toUpperCase()} → ${to?.replace(/_/g,' ').toUpperCase()}`;
}

export default function TicketTimeline({ ticket }) {
  const history   = ticket?.statusHistory || [];
  const responses = ticket?.responses     || [];
  const comments  = ticket?.comments      || [];

  const items = [
    ...history.map(h  => ({ type: 'status',   date: new Date(h.timestamp),  data: h  })),
    ...responses.map(r => ({ type: 'response', date: new Date(r.createdAt),  data: r  })),
    ...comments.map(c  => ({ type: 'comment',  date: new Date(c.createdAt),  data: c  })),
  ].sort((a, b) => b.date - a.date);

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 20px' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <Clock size={18} color="var(--tx-faint)" />
        </div>
        <p style={{ fontSize: 13, color: 'var(--tx-faint)', fontFamily: "'Nunito',sans-serif" }}>No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((item, idx) => {
        const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.comment;
        const Icon = cfg.icon;
        const isLast = idx === items.length - 1;
        const roleKey = (item.data.changedByRole || item.data.authorRole || 'user').toLowerCase();
        const roleStyle = ROLE_STYLES[roleKey] || ROLE_STYLES.user;

        return (
          <div key={idx} style={{ display: 'flex', gap: 14 }}>
            {/* Spine */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 32 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: cfg.bg, border: `2px solid ${cfg.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, zIndex: 1, boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}>
                <Icon size={14} color={cfg.color} />
              </div>
              {!isLast && (
                <div style={{ width: 2, flex: 1, background: cfg.line, minHeight: 20, margin: '4px 0' }} />
              )}
            </div>

            {/* Card */}
            <div style={{
              flex: 1, marginBottom: isLast ? 0 : 14,
              background: '#fff', borderRadius: 14,
              border: '1.5px solid var(--border)',
              boxShadow: 'var(--sh-xs)', overflow: 'hidden',
            }}>
              {/* Card header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--bg-soft)',
                borderBottom: '1px solid var(--border)', gap: 8, flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: roleStyle.bg, border: `1px solid ${roleStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={12} color={roleStyle.color} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)', fontFamily: "'Montserrat',sans-serif" }}>
                    {item.data.changedByName || item.data.authorName || 'System'}
                  </span>
                  <span style={{
                    fontSize: 9.5, fontWeight: 800,
                    fontFamily: "'Montserrat',sans-serif",
                    color: roleStyle.color, background: roleStyle.bg,
                    border: `1px solid ${roleStyle.border}`,
                    padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    {roleStyle.label}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--tx-faint)', fontFamily: "'Nunito',sans-serif", fontWeight: 600 }}>
                  {item.date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Card body */}
              <div style={{ padding: '12px 14px' }}>
                {item.type === 'status' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)', fontFamily: "'Montserrat',sans-serif" }}>
                        {getTransitionLabel(item.data.from, item.data.to)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                      <TicketStatusBadge status={item.data.from} />
                      <ArrowRight size={12} color="var(--tx-faint)" />
                      <TicketStatusBadge status={item.data.to} />
                    </div>

                    {item.data.reason && (
                      <p style={{ fontSize: 12, color: 'var(--tx-muted)', fontStyle: 'italic', margin: '4px 0 0', fontFamily: "'Nunito',sans-serif", padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: 8, borderLeft: '3px solid var(--g300)' }}>
                        "{item.data.reason}"
                      </p>
                    )}
                  </div>
                )}

                {item.type === 'response' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <CheckCircle2 size={15} color="#7C3AED" />
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#7C3AED', fontFamily: "'Montserrat',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Official Assessor Response Submitted
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--tx)', whiteSpace: 'pre-wrap', lineHeight: 1.65, fontFamily: "'Nunito',sans-serif", margin: 0, padding: '10px 12px', background: '#FAF5FF', borderRadius: 10, border: '1px solid #E9D5FF' }}>
                      {item.data.text}
                    </p>
                    {item.data.attachments?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        {item.data.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={`http://localhost:5000/api/uploads/download/tickets/${att.filename}?originalName=${encodeURIComponent(att.originalName)}`}
                            target="_blank" rel="noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '5px 12px', borderRadius: 8,
                              fontSize: 11.5, fontWeight: 700,
                              fontFamily: "'Nunito',sans-serif",
                              background: '#F3E8FF', color: '#6B21A8',
                              border: '1px solid #D8B4FE', textDecoration: 'none',
                            }}
                          >
                            <Paperclip size={12} /> {att.originalName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {item.type === 'comment' && (
                  <p style={{ fontSize: 13, color: 'var(--tx)', whiteSpace: 'pre-wrap', lineHeight: 1.65, fontFamily: "'Nunito',sans-serif", margin: 0 }}>
                    {item.data.text}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
