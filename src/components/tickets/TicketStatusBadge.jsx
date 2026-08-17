import React from 'react';
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  PRIORITY_ACCENT,
} from '../../constants/ticketConstants';

export { STATUS_CONFIG, PRIORITY_CONFIG, PRIORITY_ACCENT };

function Badge({ cfg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 99,
      fontSize: 11, fontWeight: 700,
      fontFamily: "'Montserrat',sans-serif",
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cfg.dot, flexShrink: 0,
        boxShadow: `0 0 5px ${cfg.dot}88`,
      }} />
      {cfg.label}
    </span>
  );
}

export function TicketStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status ? String(status).replace(/_/g, ' ') : 'Unknown',
    dot: '#6B7280',
    bg: 'rgba(107,114,128,0.1)',
    border: 'rgba(107,114,128,0.2)',
    color: '#4B5563'
  };
  return <Badge cfg={cfg} />;
}

export function TicketPriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return <Badge cfg={cfg} />;
}
