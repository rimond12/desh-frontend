import React, { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import TicketCard from '../../components/tickets/TicketCard';
import TicketFilters from '../../components/tickets/TicketFilters';
import CreateTicketModal from '../../components/tickets/CreateTicketModal';
import { Plus, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sortTicketsPriority } from '../../constants/ticketConstants';

export default function ManagerTicketDashboard() {
  const axiosSecure = useAxiosSecure();
  const navigate    = useNavigate();
  const [tickets,      setTickets]      = useState([]);
  const [projects,     setProjects]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [filters, setFilters] = useState({ search: '', status: '', priority: '', projectId: '' });

  const fetchTickets = () => {
    setLoading(true);
    const cleanParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
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

  const handleDeleteTicket = async (t) => {
    if (!window.confirm(`Are you sure you want to delete ticket ${t.ticketNumber}? This action cannot be undone.`)) {
      return;
    }
    try {
      await axiosSecure.delete(`/tickets/${t._id}`);
      toast.success(`Ticket ${t.ticketNumber} deleted successfully`);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete ticket');
    }
  };

  const handleFilterChange = (key, val) => setFilters({ ...filters, [key]: val });
  const handleResetFilters = () => setFilters({ search: '', status: '', priority: '', projectId: '' });

  return (
    <Layout isManager>
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,rgba(34,168,75,0.15),rgba(52,201,97,0.08))',
              border: '1px solid rgba(34,168,75,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ticket size={18} color="var(--g600)" />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Montserrat',sans-serif", color: 'var(--tx)', margin: 0, letterSpacing: '-0.02em' }}>
              Ticket Control Center
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--tx-muted)', fontFamily: "'Nunito',sans-serif", margin: 0 }}>
            Approve, forward, and manage clarification tickets across all projects.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary-green"
          style={{ fontSize: 12.5, padding: '8px 18px' }}
        >
          <Plus size={14} /> New Ticket
        </button>
      </div>

      {/* Filters */}
      <TicketFilters filters={filters} onChange={handleFilterChange} onReset={handleResetFilters} projects={projects} />

      {/* All Tickets */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 120, background: '#fff', borderRadius: 14, border: '1px solid var(--border)', opacity: 0.6 }} />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 16, padding: '52px 20px',
          textAlign: 'center', boxShadow: 'var(--sh-xs)',
        }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Ticket size={22} color="var(--tx-faint)" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', fontFamily: "'Montserrat',sans-serif", margin: '0 0 4px' }}>No tickets found</p>
          <p style={{ fontSize: 12.5, color: 'var(--tx-faint)', fontFamily: "'Nunito',sans-serif", margin: 0 }}>No tickets match your current filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 14 }}>
          {tickets.map((t) => (
            <TicketCard key={t._id} ticket={t} onClick={(t) => navigate(`/manager/tickets/${t._id}`)} onDelete={handleDeleteTicket} />
          ))}
        </div>
      )}

      <CreateTicketModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={() => fetchTickets()} />
    </Layout>
  );
}
