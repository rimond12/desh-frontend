import React from 'react';
import { TicketStatusBadge } from './TicketStatusBadge';
import { Clock, User, CheckCircle, MessageSquare, Paperclip } from 'lucide-react';

export default function TicketTimeline({ ticket }) {
  const history = ticket?.statusHistory || [];
  const responses = ticket?.responses || [];
  const comments = ticket?.comments || [];

  // Combine history, responses, and comments into chronological order
  const timelineItems = [
    ...history.map(h => ({ type: 'status', date: new Date(h.timestamp), data: h })),
    ...responses.map(r => ({ type: 'response', date: new Date(r.createdAt), data: r })),
    ...comments.map(c => ({ type: 'comment', date: new Date(c.createdAt), data: c })),
  ].sort((a, b) => b.date - a.date);

  if (timelineItems.length === 0) {
    return <div className="text-center py-6 text-sm text-gray-500">No activity yet.</div>;
  }

  return (
    <div className="space-y-4">
      {timelineItems.map((item, idx) => (
        <div key={idx} className="flex gap-3 text-sm">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              item.type === 'status' ? 'bg-emerald-100 text-emerald-700' :
              item.type === 'response' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {item.type === 'status' ? <CheckCircle size={14} /> :
               item.type === 'response' ? <MessageSquare size={14} /> : <Clock size={14} />}
            </div>
            {idx !== timelineItems.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
          </div>

          <div className="flex-1 glass-card p-4 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--tx-muted)' }}>
              <span className="font-semibold flex items-center gap-1" style={{ color: 'var(--tx)' }}>
                <User size={12} /> {item.data.changedByName || item.data.authorName || 'System'}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono uppercase">
                  {item.data.changedByRole || item.data.authorRole || 'user'}
                </span>
              </span>
              <span>{new Date(item.date).toLocaleString()}</span>
            </div>

            {item.type === 'status' && (
              <div className="text-xs font-medium">
                Changed status from <TicketStatusBadge status={item.data.from} /> to <TicketStatusBadge status={item.data.to} />
                {item.data.reason && <p className="mt-1 text-gray-600 italic">"{item.data.reason}"</p>}
              </div>
            )}

            {item.type === 'response' && (
              <div>
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block mb-1">Official Response</span>
                <p className="text-xs whitespace-pre-wrap">{item.data.text}</p>

                {item.data.attachments?.length > 0 && (
                  <div className="mt-2 pt-2 border-t flex flex-wrap gap-2">
                    {item.data.attachments.map((att, aIdx) => (
                      <a
                        key={aIdx}
                        href={`http://localhost:5000/api/uploads/download/tickets/${att.filename}?originalName=${encodeURIComponent(att.originalName)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded font-medium text-emerald-700"
                      >
                        <Paperclip size={12} /> {att.originalName}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {item.type === 'comment' && (
              <p className="text-xs whitespace-pre-wrap">{item.data.text}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
