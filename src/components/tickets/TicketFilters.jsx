import React from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { STATUS_OPTIONS, STATUS_CONFIG } from '../../constants/ticketConstants';

export default function TicketFilters({ filters, onChange, onReset, projects = [] }) {
  const hasActive = filters.status || filters.priority || filters.projectId || filters.search;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 20,
      boxShadow: 'var(--sh-xs)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 10, alignItems: 'center' }}>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-faint)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search tickets, subjects, IDs…"
            value={filters.search || ''}
            onChange={(e) => onChange('search', e.target.value)}
            style={{
              width: '100%', height: 36,
              paddingLeft: 34, paddingRight: 12,
              border: '1.5px solid var(--border-md)',
              borderRadius: 9, fontSize: 12.5,
              fontFamily: "'Nunito',sans-serif",
              fontWeight: 500, color: 'var(--tx)',
              background: 'var(--bg-soft)',
              outline: 'none', transition: 'all 0.18s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--g500)'; e.target.style.background = '#fff'; e.target.style.boxShadow = 'var(--glow)'; }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--border-md)'; e.target.style.background = 'var(--bg-soft)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Status */}
        <FilterSelect label="Status" value={filters.status || ''} onChange={(v) => onChange('status', v)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FilterSelect>

        {/* Priority */}
        <FilterSelect label="Priority" value={filters.priority || ''} onChange={(v) => onChange('priority', v)}>
          <option value="">All Priorities</option>
          <option value="critical">🔴 Critical</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </FilterSelect>

        {/* Project */}
        <FilterSelect label="Project" value={filters.projectId || ''} onChange={(v) => onChange('projectId', v)}>
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.title}</option>
          ))}
        </FilterSelect>

        {/* Reset button */}
        {hasActive && (
          <button
            onClick={onReset}
            title="Clear all filters"
            style={{
              height: 36, width: 36, borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(220,38,38,0.07)',
              border: '1px solid rgba(220,38,38,0.2)',
              color: '#DC2626', cursor: 'pointer',
              transition: 'all 0.18s', flexShrink: 0,
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.14)'; }}
            onMouseOut={(e)  => { e.currentTarget.style.background = 'rgba(220,38,38,0.07)'; }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActive && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, color: 'var(--tx-faint)', fontFamily: "'Nunito',sans-serif", alignSelf: 'center', marginRight: 2 }}>Active:</span>
          {filters.search    && <Chip label={`"${filters.search}"`}  onRemove={() => onChange('search', '')} />}
          {filters.status    && <Chip label={STATUS_CONFIG[filters.status]?.label || filters.status.replace(/_/g, ' ')} onRemove={() => onChange('status', '')} />}
          {filters.priority  && <Chip label={filters.priority.charAt(0).toUpperCase() + filters.priority.slice(1)} onRemove={() => onChange('priority', '')} />}
          {filters.projectId && <Chip label={projects.find(p => p._id === filters.projectId)?.title || 'Project'} onRemove={() => onChange('projectId', '')} />}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 36, paddingLeft: 10, paddingRight: 28,
          border: `1.5px solid ${value ? 'var(--g400)' : 'var(--border-md)'}`,
          borderRadius: 9, fontSize: 12,
          fontFamily: "'Nunito',sans-serif", fontWeight: 600,
          color: value ? 'var(--g700)' : 'var(--tx-muted)',
          background: value ? 'var(--g50)' : 'var(--bg-soft)',
          outline: 'none', cursor: 'pointer',
          appearance: 'none', WebkitAppearance: 'none',
          transition: 'all 0.18s', whiteSpace: 'nowrap',
        }}
      >
        {children}
      </select>
      <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx-faint)', pointerEvents: 'none' }} />
    </div>
  );
}

function Chip({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px 3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 700,
      fontFamily: "'Montserrat',sans-serif",
      background: 'var(--g50)', color: 'var(--g700)',
      border: '1px solid var(--g200)',
    }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--g600)', padding: 0, display: 'flex', lineHeight: 1 }}>
        <X size={10} />
      </button>
    </span>
  );
}
