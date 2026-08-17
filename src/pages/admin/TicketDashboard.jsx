import React, { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import TicketCard from '../../components/tickets/TicketCard';
import TicketFilters from '../../components/tickets/TicketFilters';
import CreateTicketModal from '../../components/tickets/CreateTicketModal';
import {
  Plus, Download, Ticket, Activity,
  CheckCircle2, Clock, AlertTriangle, TrendingUp, Settings as SettingsIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sortTicketsPriority } from '../../constants/ticketConstants';

const KPI_CONFIG = [
  { key: 'total',     label: 'Total Tickets',  icon: Ticket,       color: '#22A84B', bg: 'rgba(34,168,75,0.09)',   border: 'rgba(34,168,75,0.2)'   },
  { key: 'open',      label: 'Open / Pending', icon: Clock,        color: '#3B82F6', bg: 'rgba(59,130,246,0.09)',  border: 'rgba(59,130,246,0.2)'  },
  { key: 'inProgress',label: 'In Progress',    icon: Activity,     color: '#0D9488', bg: 'rgba(13,148,136,0.09)', border: 'rgba(13,148,136,0.2)'  },
  { key: 'resolved',  label: 'Resolved',       icon: CheckCircle2, color: '#7C3AED', bg: 'rgba(124,58,237,0.09)', border: 'rgba(124,58,237,0.2)'  },
  { key: 'overdue',   label: 'Overdue SLA',    icon: AlertTriangle,color: '#DC2626', bg: 'rgba(220,38,38,0.09)',  border: 'rgba(220,38,38,0.2)'   },
];

export default function TicketDashboard() {
  const axiosSecure = useAxiosSecure();
  const navigate    = useNavigate();
  const [tickets,      setTickets]      = useState([]);
  const [stats,        setStats]        = useState(null);
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

  const fetchStats = () => {
    axiosSecure.get('/tickets/stats').then((res) => setStats(res.data.stats)).catch(() => {});
  };

  useEffect(() => { fetchTickets(); }, [filters]);
  useEffect(() => {
    fetchStats();
    axiosSecure.get('/projects').then((res) => setProjects(res.data.projects || res.data || [])).catch(() => {});
  }, [axiosSecure]);

  const handleDeleteTicket = async (t) => {
    if (!window.confirm(`Are you sure you want to delete ticket ${t.ticketNumber}? This action cannot be undone.`)) {
      return;
    }
    try {
      await axiosSecure.delete(`/tickets/${t._id}`);
      toast.success(`Ticket ${t.ticketNumber} deleted successfully`);
      fetchTickets();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete ticket');
    }
  };

  const handleFilterChange = (key, val) => setFilters({ ...filters, [key]: val });
  const handleResetFilters = () => setFilters({ search: '', status: '', priority: '', projectId: '' });

  return (
    <Layout isAdmin>
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
              Ticket Management
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--tx-muted)', fontFamily: "'Nunito',sans-serif", margin: 0 }}>
            System-wide overview of all clarification tickets and requests.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate('/admin/ticket-config')}
            className="btn-secondary"
            style={{ fontSize: 12.5, padding: '8px 16px' }}
            title="Configure Routing Mode and Ticket Settings"
          >
            <SettingsIcon size={14} /> Routing Settings
          </button>
          <a
            href="http://localhost:5000/api/tickets/export"
            download
            className="btn-secondary"
            style={{ fontSize: 12.5, padding: '8px 16px', textDecoration: 'none' }}
          >
            <Download size={14} /> Export CSV
          </a>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary-green"
            style={{ fontSize: 12.5, padding: '8px 18px' }}
          >
            <Plus size={14} /> New Ticket
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {KPI_CONFIG.map(({ key, label, icon: Icon, color, bg, border }) => (
          <div key={key} style={{
            background: '#fff', border: `1px solid ${border}`,
            borderRadius: 14, padding: '16px 18px',
            boxShadow: 'var(--sh-xs)',
            transition: 'transform 0.18s, box-shadow 0.18s',
            cursor: 'default',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--sh-sm)'; }}
          onMouseOut={(e)  => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--sh-xs)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={color} />
              </div>
              <TrendingUp size={13} color="var(--tx-faint)" />
            </div>
            <p style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Montserrat',sans-serif", color, margin: '0 0 3px', letterSpacing: '-0.03em' }}>
              {stats?.[key] ?? 0}
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--tx-faint)', fontFamily: "'Nunito',sans-serif", fontWeight: 600, margin: 0 }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <TicketFilters filters={filters} onChange={handleFilterChange} onReset={handleResetFilters} projects={projects} />

      {/* Tickets Grid */}
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
          <p style={{ fontSize: 12.5, color: 'var(--tx-faint)', fontFamily: "'Nunito',sans-serif", margin: 0 }}>Try adjusting your filters or create a new ticket.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 14 }}>
          {tickets.map((t) => (
            <TicketCard key={t._id} ticket={t} onClick={(t) => navigate(`/admin/tickets/${t._id}`)} onDelete={handleDeleteTicket} />
          ))}
        </div>
      )}

      <CreateTicketModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={() => fetchTickets()} />
    </Layout>
  );
}
