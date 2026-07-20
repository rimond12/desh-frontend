import React from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';

export default function TicketFilters({ filters, onChange, onReset, projects = [] }) {
  return (
    <div className="glass-card p-4 rounded-xl mb-6 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative col-span-1 md:col-span-2">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ticket #, subject, description..."
            value={filters.search || ''}
            onChange={(e) => onChange('search', e.target.value)}
            className="input-field w-full text-xs pl-9"
          />
        </div>

        {/* Status */}
        <div>
          <select
            value={filters.status || ''}
            onChange={(e) => onChange('status', e.target.value)}
            className="input-field w-full text-xs"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="submitted">Submitted</option>
            <option value="manager_review">Manager Review</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="response_submitted">Response Submitted</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="returned">Returned</option>
            <option value="reopened">Reopened</option>
            <option value="on_hold">On Hold</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <select
            value={filters.priority || ''}
            onChange={(e) => onChange('priority', e.target.value)}
            className="input-field w-full text-xs"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Project */}
        <div>
          <select
            value={filters.projectId || ''}
            onChange={(e) => onChange('projectId', e.target.value)}
            className="input-field w-full text-xs"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-2 border-t flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2" style={{ color: 'var(--tx-muted)' }}>
          <Filter size={13} /> Active Filters
        </div>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
        >
          <RefreshCw size={12} /> Reset Filters
        </button>
      </div>
    </div>
  );
}
