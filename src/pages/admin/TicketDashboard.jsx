import React, { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import TicketCard from '../../components/tickets/TicketCard';
import TicketFilters from '../../components/tickets/TicketFilters';
import CreateTicketModal from '../../components/tickets/CreateTicketModal';
import { Plus, Download, FileText, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TicketDashboard() {
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    projectId: '',
  });

  const fetchTickets = () => {
    setLoading(true);
    const params = new URLSearchParams(filters).toString();
    axiosSecure.get(`/tickets?${params}`)
      .then((res) => setTickets(res.data.tickets || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  useEffect(() => {
    axiosSecure.get('/tickets/stats').then((res) => setStats(res.data.stats)).catch(() => {});
    axiosSecure.get('/projects').then((res) => setProjects(res.data.projects || res.data || [])).catch(() => {});
  }, [axiosSecure]);

  const handleFilterChange = (key, val) => {
    setFilters({ ...filters, [key]: val });
  };

  const handleResetFilters = () => {
    setFilters({ search: '', status: '', priority: '', projectId: '' });
  };

  return (
    <Layout isAdmin>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Ticket Management Dashboard
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--tx-muted)' }}>
            System-wide overview, active clarification tickets, KPI analytics & audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="http://localhost:5000/api/tickets/export"
            download
            className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1.5"
          >
            <Download size={14} /> Export CSV
          </a>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary-green text-xs px-4 py-2 inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Create Ticket
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="stat-card p-4">
          <span className="text-xs font-semibold text-gray-500">Total Tickets</span>
          <p className="text-xl font-bold mt-1 text-emerald-600">{stats?.total || 0}</p>
        </div>
        <div className="stat-card p-4">
          <span className="text-xs font-semibold text-gray-500">Open / Pending</span>
          <p className="text-xl font-bold mt-1 text-blue-600">{stats?.open || 0}</p>
        </div>
        <div className="stat-card p-4">
          <span className="text-xs font-semibold text-gray-500">In Progress</span>
          <p className="text-xl font-bold mt-1 text-teal-600">{stats?.inProgress || 0}</p>
        </div>
        <div className="stat-card p-4">
          <span className="text-xs font-semibold text-gray-500">Resolved</span>
          <p className="text-xl font-bold mt-1 text-purple-600">{stats?.resolved || 0}</p>
        </div>
        <div className="stat-card p-4">
          <span className="text-xs font-semibold text-gray-500">Overdue SLA</span>
          <p className="text-xl font-bold mt-1 text-red-600">{stats?.overdue || 0}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <TicketFilters filters={filters} onChange={handleFilterChange} onReset={handleResetFilters} projects={projects} />

      {/* Ticket Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs text-gray-500">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="glass-card p-12 text-center text-xs text-gray-500 rounded-xl">
          No tickets found matching current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((t) => (
            <TicketCard key={t._id} ticket={t} onClick={(t) => navigate(`/admin/tickets/${t._id}`)} />
          ))}
        </div>
      )}

      {/* Create Ticket Shared Modal */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchTickets()}
      />
    </Layout>
  );
}
