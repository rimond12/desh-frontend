import React from 'react';

const STATUS_CONFIG = {
  open:               { label: 'Open',               dot: '#3B82F6', bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.25)',  color: '#2563EB' },
  submitted:          { label: 'Submitted',           dot: '#6366F1', bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.25)',  color: '#4F46E5' },
  manager_review:     { label: 'Manager Review',      dot: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.28)',  color: '#D97706' },
  assigned:           { label: 'Assigned',            dot: '#0EA5E9', bg: 'rgba(14,165,233,0.10)',  border: 'rgba(14,165,233,0.25)',  color: '#0284C7' },
  in_progress:        { label: 'In Progress',         dot: '#14B8A6', bg: 'rgba(20,184,166,0.10)',  border: 'rgba(20,184,166,0.25)',  color: '#0D9488' },
  response_submitted: { label: 'Response Submitted',  dot: '#A855F7', bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.25)',  color: '#9333EA' },
  resolved:           { label: 'Resolved',            dot: '#22C55E', bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.25)',   color: '#16A34A' },
  closed:             { label: 'Closed',              dot: '#6B7280', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.22)', color: '#4B5563' },
  returned:           { label: 'Returned',            dot: '#F97316', bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.25)',  color: '#EA580C' },
  reopened:           { label: 'Reopened',            dot: '#EC4899', bg: 'rgba(236,72,153,0.10)',  border: 'rgba(236,72,153,0.25)',  color: '#DB2777' },
  on_hold:            { label: 'On Hold',             dot: '#EAB308', bg: 'rgba(234,179,8,0.10)',   border: 'rgba(234,179,8,0.28)',   color: '#CA8A04' },
  rejected:           { label: 'Rejected',            dot: '#EF4444', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)',   color: '#DC2626' },
  cancelled:          { label: 'Cancelled',           dot: '#9CA3AF', bg: 'rgba(156,163,175,0.10)', border: 'rgba(156,163,175,0.22)', color: '#6B7280' },
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', dot: '#DC2626', bg: 'rgba(220,38,38,0.10)',  border: 'rgba(220,38,38,0.28)',  color: '#DC2626' },
  high:     { label: 'High',     dot: '#EA580C', bg: 'rgba(234,88,12,0.10)',  border: 'rgba(234,88,12,0.25)',  color: '#EA580C' },
  medium:   { label: 'Medium',   dot: '#CA8A04', bg: 'rgba(202,138,4,0.10)',  border: 'rgba(202,138,4,0.28)',  color: '#CA8A04' },
  low:      { label: 'Low',      dot: '#16A34A', bg: 'rgba(22,163,74,0.10)',  border: 'rgba(22,163,74,0.25)',  color: '#16A34A' },
};

export const PRIORITY_ACCENT = {
  critical: '#DC2626',
  high:     '#EA580C',
  medium:   '#EAB308',
  low:      '#22C55E',
};

function Badge({ cfg, prefix }) {
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
  const cfg = STATUS_CONFIG[status] || { label: status, dot: '#6B7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', color: '#4B5563' };
  return <Badge cfg={cfg} />;
}

export function TicketPriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return <Badge cfg={cfg} />;
}
