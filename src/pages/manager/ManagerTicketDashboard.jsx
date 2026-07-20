import React, { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import TicketCard from '../../components/tickets/TicketCard';
import TicketFilters from '../../components/tickets/TicketFilters';
import CreateTicketModal from '../../components/tickets/CreateTicketModal';
import { Plus, CheckCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ManagerTicketDashboard() {
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
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
      .then((res) => {
        const all = res.data.tickets || [];
        setTickets(all);
        setReviewQueue(all.filter((t) => t.status === 'manager_review'));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
    axiosSecure.get('/projects').then((res) => setProjects(res.data.projects || res.data || [])).catch(() => {});
  }, [filters]);

  const handleFilterChange = (key, val) => {
    setFilters({ ...filters, [key]: val });
  };

  const handleResetFilters = () => {
    setFilters({ search: '', status: '', priority: '', projectId: '' });
  };

  return (
    <Layout isManager>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Manager Ticket Control & Review Center
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--tx-muted)' }}>
            Approve, edit, forward, and manage clarification tickets across all projects.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary-green text-xs px-4 py-2 inline-flex items-center gap-1.5"
        >
          <Plus size={14} /> Create Ticket
        </button>
      </div>

      {/* Review Queue (Restricted Mode) */}
      {reviewQueue.length > 0 && (
        <div className="glass-card p-5 rounded-2xl mb-6 border-l-4 border-l-amber-500 bg-amber-500/5">
          <h3 className="text-sm font-bold flex items-center gap-2 text-amber-700 mb-3">
            <ShieldAlert size={18} /> Manager Review Queue ({reviewQueue.length} Tickets Pending Approval)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewQueue.map((t) => (
              <TicketCard key={t._id} ticket={t} onClick={(t) => navigate(`/manager/tickets/${t._id}`)} />
            ))}
          </div>
        </div>
      )}

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
            <TicketCard key={t._id} ticket={t} onClick={(t) => navigate(`/manager/tickets/${t._id}`)} />
          ))}
        </div>
      )}

      {/* Shared Create Modal */}
      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchTickets()}
      />
    </Layout>
  );
}
