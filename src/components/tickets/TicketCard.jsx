import React from 'react';
import { TicketStatusBadge, TicketPriorityBadge } from './TicketStatusBadge';
import { Calendar, User, Folder, MessageSquare } from 'lucide-react';

export default function TicketCard({ ticket, onClick }) {
  const isOverdue = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date() && ticket.status !== 'closed';

  return (
    <div
      onClick={() => onClick && onClick(ticket)}
      className={`glass-card p-5 cursor-pointer ticket-card prio-${ticket.priority || 'medium'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <span className="font-mono text-xs font-bold text-emerald-600 tracking-wider">
            {ticket.ticketNumber}
          </span>
          <h3 className="text-base font-bold line-clamp-1 mt-0.5" style={{ color: 'var(--tx)' }}>
            {ticket.subject}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <p className="text-xs line-clamp-2 mb-4" style={{ color: 'var(--tx-muted)' }}>
        {ticket.description}
      </p>

      <div className="flex items-center justify-between text-xs pt-3 border-t flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--tx-muted)' }}>
            <Folder size={13} /> {ticket.projectId?.title || 'Project'}
          </span>
          <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--tx-muted)' }}>
            <User size={13} /> {ticket.createdBy?.name || 'User'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {ticket.responses?.length > 0 && (
            <span className="flex items-center gap-1 text-purple-600 font-semibold">
              <MessageSquare size={13} /> {ticket.responses.length}
            </span>
          )}

          <span className="flex items-center gap-1 text-gray-500">
            <Calendar size={13} /> {new Date(ticket.createdAt).toLocaleDateString()}
          </span>

          {isOverdue && (
            <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 font-bold text-[10px] uppercase border border-red-500/20">
              Overdue SLA
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
