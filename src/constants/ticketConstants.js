/**
 * Central Ticket Status & Priority Constants (Frontend)
 */

export const TICKET_STATUSES = {
  OPEN: 'open',
  SUBMITTED: 'submitted',
  PENDING_APPROVAL: 'pending_approval',
  FORWARDED_TO_ASSESSOR: 'forwarded_to_assessor',
  IN_PROGRESS: 'in_progress',
  RESPONSE_SUBMITTED: 'response_submitted',
  RETURNED: 'returned',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REOPENED: 'reopened',
  ON_HOLD: 'on_hold',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',

  // Legacy aliases
  MANAGER_REVIEW: 'manager_review',
  ASSIGNED: 'assigned',
};

export const STATUS_CONFIG = {
  open: {
    label: 'Open',
    dot: '#3B82F6',
    bg: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.25)',
    color: '#2563EB',
  },
  submitted: {
    label: 'Submitted',
    dot: '#6366F1',
    bg: 'rgba(99,102,241,0.10)',
    border: 'rgba(99,102,241,0.25)',
    color: '#4F46E5',
  },
  pending_approval: {
    label: 'Pending Manager Approval',
    dot: '#F59E0B',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.28)',
    color: '#D97706',
  },
  manager_review: {
    label: 'Pending Manager Approval',
    dot: '#F59E0B',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.28)',
    color: '#D97706',
  },
  forwarded_to_assessor: {
    label: 'Forwarded to Assessor',
    dot: '#0EA5E9',
    bg: 'rgba(14,165,233,0.10)',
    border: 'rgba(14,165,233,0.25)',
    color: '#0284C7',
  },
  assigned: {
    label: 'Forwarded to Assessor',
    dot: '#0EA5E9',
    bg: 'rgba(14,165,233,0.10)',
    border: 'rgba(14,165,233,0.25)',
    color: '#0284C7',
  },
  in_progress: {
    label: 'In Progress',
    dot: '#14B8A6',
    bg: 'rgba(20,184,166,0.10)',
    border: 'rgba(20,184,166,0.25)',
    color: '#0D9488',
  },
  response_submitted: {
    label: 'Response Submitted',
    dot: '#A855F7',
    bg: 'rgba(168,85,247,0.10)',
    border: 'rgba(168,85,247,0.25)',
    color: '#9333EA',
  },
  returned: {
    label: 'Sent Back for Re-review',
    dot: '#F97316',
    bg: 'rgba(249,115,22,0.10)',
    border: 'rgba(249,115,22,0.25)',
    color: '#EA580C',
  },
  resolved: {
    label: 'Resolved',
    dot: '#22C55E',
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.25)',
    color: '#16A34A',
  },
  closed: {
    label: 'Closed',
    dot: '#6B7280',
    bg: 'rgba(107,114,128,0.10)',
    border: 'rgba(107,114,128,0.22)',
    color: '#4B5563',
  },
  reopened: {
    label: 'Reopened',
    dot: '#EC4899',
    bg: 'rgba(236,72,153,0.10)',
    border: 'rgba(236,72,153,0.25)',
    color: '#DB2777',
  },
  on_hold: {
    label: 'On Hold',
    dot: '#EAB308',
    bg: 'rgba(234,179,8,0.10)',
    border: 'rgba(234,179,8,0.28)',
    color: '#CA8A04',
  },
  rejected: {
    label: 'Rejected',
    dot: '#EF4444',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.25)',
    color: '#DC2626',
  },
  cancelled: {
    label: 'Cancelled',
    dot: '#9CA3AF',
    bg: 'rgba(156,163,175,0.10)',
    border: 'rgba(156,163,175,0.22)',
    color: '#6B7280',
  },
};

export const PRIORITY_CONFIG = {
  critical: { label: 'Critical', dot: '#DC2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.28)', color: '#DC2626' },
  high:     { label: 'High',     dot: '#EA580C', bg: 'rgba(234,88,12,0.10)', border: 'rgba(234,88,12,0.25)', color: '#EA580C' },
  medium:   { label: 'Medium',   dot: '#CA8A04', bg: 'rgba(202,138,4,0.10)', border: 'rgba(202,138,4,0.28)', color: '#CA8A04' },
  low:      { label: 'Low',      dot: '#16A34A', bg: 'rgba(22,163,74,0.10)', border: 'rgba(22,163,74,0.25)', color: '#16A34A' },
};

export const PRIORITY_ACCENT = {
  critical: '#DC2626',
  high:     '#EA580C',
  medium:   '#EAB308',
  low:      '#22C55E',
};

export const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending_approval', label: 'Pending Manager Approval' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'forwarded_to_assessor', label: 'Forwarded to Assessor' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'response_submitted', label: 'Response Submitted' },
  { value: 'returned', label: 'Sent Back for Re-review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'open', label: 'Open' },
];

export const TOP_PRIORITY_STATUSES = [
  'submitted',
  'pending_approval',
  'manager_review',
  'open',
];

/**
 * Sorts tickets array so Submitted & Pending Approval are on top, then sorted by createdAt descending.
 */
export function sortTicketsPriority(tickets = []) {
  return [...tickets].sort((a, b) => {
    const isTopA = TOP_PRIORITY_STATUSES.includes(a.status);
    const isTopB = TOP_PRIORITY_STATUSES.includes(b.status);

    if (isTopA && !isTopB) return -1;
    if (!isTopA && isTopB) return 1;

    // Both top or both non-top -> sort by createdAt desc
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}
