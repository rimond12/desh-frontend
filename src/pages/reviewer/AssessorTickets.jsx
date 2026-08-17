import React, { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import TicketCard from '../../components/tickets/TicketCard';
import TicketFilters from '../../components/tickets/TicketFilters';
import CreateTicketModal from '../../components/tickets/CreateTicketModal';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sortTicketsPriority } from '../../constants/ticketConstants';

export default function AssessorTickets() {
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
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
    const cleanParams = new URLSearchParams();
    Object.entries({ ...filters, role: 'desh_assessor' }).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        cleanParams.append(key, val);
      }
    });

    axiosSecure.get(`/tickets?${cleanParams.toString()}`)
      .then((res) => {
        const all = res.data.tickets || [];
        setTickets(sortTicketsPriority(all));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
    axiosSecure.get('/projects').then((res) => setProjects(res.data.projects || res.data || [])).catch(() => {});
  }, [filters]);

  return (
    <Layout isReviewer>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Assessor Assigned Tickets
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--tx-muted)' }}>
            Review assigned tickets, submit requested evidence, and respond to clarification requests.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary-green text-xs px-4 py-2 inline-flex items-center gap-1.5"
        >
          <Plus size={14} /> Create Ticket
        </button>
      </div>

      <TicketFilters
        filters={filters}
        onChange={(k, v) => setFilters({ ...filters, [k]: v })}
        onReset={() => setFilters({ search: '', status: '', priority: '', projectId: '' })}
        projects={projects}
      />

      {loading ? (
        <div className="text-center py-12 text-xs text-gray-500">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="glass-card p-12 text-center text-xs text-gray-500 rounded-xl">
          No assigned tickets found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((t) => (
            <TicketCard key={t._id} ticket={t} onClick={(t) => navigate(`/reviewer/tickets/${t._id}`)} />
          ))}
        </div>
      )}

      <CreateTicketModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchTickets()}
      />
    </Layout>
  );
}
