import React from 'react';
import { TicketStatusBadge, TicketPriorityBadge, PRIORITY_ACCENT } from './TicketStatusBadge';
import { Calendar, User, Folder, MessageSquare, AlertTriangle, Hash, Paperclip, Trash2 } from 'lucide-react';

export default function TicketCard({ ticket, onClick, onDelete }) {
  const isOverdue = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date() && ticket.status !== 'closed' && ticket.status !== 'resolved';
  const accentColor = PRIORITY_ACCENT[ticket.priority] || PRIORITY_ACCENT.medium;

  return (
    <div
      onClick={() => onClick && onClick(ticket)}
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: 'var(--sh-xs)',
        transition: 'transform 0.18s, box-shadow 0.18s, border-color 0.18s',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = 'var(--sh-md)';
        e.currentTarget.style.borderColor = 'var(--border-md)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--sh-xs)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* Priority accent bar */}
      <div style={{ height: 3, background: accentColor, flexShrink: 0 }} />

      <div style={{ padding: '14px 16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Top row: ticket number + badges + actions */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Hash size={11} color={accentColor} />
              <span style={{
                fontSize: 11, fontWeight: 800,
                fontFamily: "'Montserrat',sans-serif",
                color: accentColor, letterSpacing: '0.04em',
              }}>
                {ticket.ticketNumber}
              </span>
              {isOverdue && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '1px 7px', borderRadius: 99,
                  fontSize: 10, fontWeight: 800,
                  fontFamily: "'Montserrat',sans-serif",
                  background: 'rgba(220,38,38,0.1)',
                  color: '#DC2626',
                  border: '1px solid rgba(220,38,38,0.25)',
                  animation: 'pulseRing 2s infinite',
                }}>
                  <AlertTriangle size={9} /> SLA
                </span>
              )}
            </div>
            <h3 style={{
              fontSize: 13.5, fontWeight: 700,
              fontFamily: "'Montserrat',sans-serif",
              color: 'var(--tx)',
              overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', lineHeight: 1.35,
            }}>
              {ticket.subject}
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TicketStatusBadge status={ticket.status} />
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(ticket);
                  }}
                  title="Delete Ticket"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#DC2626',
                    cursor: 'pointer',
                    padding: '3px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <TicketPriorityBadge priority={ticket.priority} />
          </div>
        </div>

        {/* Description preview */}
        {ticket.description && (
          <p style={{
            fontSize: 12, color: 'var(--tx-muted)',
            fontFamily: "'Nunito',sans-serif",
            lineHeight: 1.55,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            flex: 1,
          }}>
            {ticket.description}
          </p>
        )}

        {/* Meta footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 10, borderTop: '1px solid var(--border)',
          flexWrap: 'wrap', gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MetaItem icon={<Folder size={11} />}>{ticket.projectId?.title || 'Project'}</MetaItem>
            <MetaItem icon={<User size={11} />}>{ticket.createdBy?.name || 'User'}</MetaItem>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {ticket.attachments?.length > 0 && (
              <MetaItem icon={<Paperclip size={11} />} color="var(--g600)">
                {ticket.attachments.length}
              </MetaItem>
            )}
            {ticket.responses?.length > 0 && (
              <MetaItem icon={<MessageSquare size={11} />} color="var(--g600)">
                {ticket.responses.length}
              </MetaItem>
            )}
            <MetaItem icon={<Calendar size={11} />}>
              {new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </MetaItem>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon, children, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11.5, fontFamily: "'Nunito',sans-serif",
      fontWeight: 600, color: color || 'var(--tx-faint)',
      maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {icon}{children}
    </span>
  );
}
