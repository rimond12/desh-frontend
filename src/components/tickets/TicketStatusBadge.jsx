import React from 'react';

const STATUS_CONFIG = {
  open: { label: 'Open', class: 'tkt-status-open' },
  submitted: { label: 'Submitted', class: 'tkt-status-submitted' },
  manager_review: { label: 'Manager Review', class: 'tkt-status-manager_review' },
  assigned: { label: 'Assigned', class: 'tkt-status-assigned' },
  in_progress: { label: 'In Progress', class: 'tkt-status-in_progress' },
  response_submitted: { label: 'Response Submitted', class: 'tkt-status-response_submitted' },
  resolved: { label: 'Resolved', class: 'tkt-status-resolved' },
  closed: { label: 'Closed', class: 'tkt-status-closed' },
  returned: { label: 'Returned', class: 'tkt-status-returned' },
  reopened: { label: 'Reopened', class: 'tkt-status-reopened' },
  on_hold: { label: 'On Hold', class: 'tkt-status-on_hold' },
  rejected: { label: 'Rejected', class: 'tkt-status-rejected' },
  cancelled: { label: 'Cancelled', class: 'tkt-status-cancelled' },
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', class: 'tkt-priority-critical' },
  high: { label: 'High', class: 'tkt-priority-high' },
  medium: { label: 'Medium', class: 'tkt-priority-medium' },
  low: { label: 'Low', class: 'tkt-priority-low' },
};

export function TicketStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, class: 'tkt-status-closed' };
  return <span className={`ticket-badge ${cfg.class}`}>{cfg.label}</span>;
}

export function TicketPriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || { label: priority, class: 'tkt-priority-medium' };
  return <span className={`ticket-badge ${cfg.class}`}>{cfg.label}</span>;
}
