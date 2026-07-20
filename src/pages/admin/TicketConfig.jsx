import React, { useState, useEffect } from 'react';
import Layout from '../../components/shared/Layout';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import { Settings, Shield, Bell, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

export default function TicketConfig() {
  const axiosSecure = useAxiosSecure();
  const [routingMode, setRoutingMode] = useState('restricted');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosSecure.get('/settings').then((res) => {
      const mode = res.data.settings?.ticketSettings?.routingMode || 'restricted';
      setRoutingMode(mode);
    }).finally(() => setLoading(false));
  }, [axiosSecure]);

  const handleRoutingToggle = async (newMode) => {
    if (newMode === routingMode) return;

    const result = await Swal.fire({
      title: 'Change Routing Mode?',
      text: `Switching to ${newMode.toUpperCase()} mode will change workflow for NEW tickets. In-progress tickets retain their original mode.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#22A84B',
      confirmButtonText: 'Yes, Switch Mode',
    });

    if (result.isConfirmed) {
      try {
        await axiosSecure.patch('/settings/ticket-routing-mode', { routingMode: newMode });
        setRoutingMode(newMode);
        toast.success(`Routing mode updated to ${newMode.toUpperCase()}`);
      } catch (err) {
        toast.error('Failed to update routing mode');
      }
    }
  };

  return (
    <Layout isAdmin>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          <Settings className="text-emerald-600" /> Ticket System Configuration
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--tx-muted)' }}>
          Manage workflow routing mode, notification dispatch rules, and system SLA parameters.
        </p>
      </div>

      <div className="space-y-6">
        {/* Routing Mode Toggle Card */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="text-emerald-600" size={20} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Ticket Routing Mode
            </h3>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300">
            Select how tickets flow through the review workflow. RESTRICTED routes tickets through Manager approval gates. UNRESTRICTED allows direct Reviewer &lt;-&gt; Assessor communication.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => handleRoutingToggle('restricted')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                routingMode === 'restricted'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">RESTRICTED (Manager-Gated)</span>
                {routingMode === 'restricted' && <CheckCircle size={18} className="text-emerald-600" />}
              </div>
              <p className="text-xs text-gray-500">
                Reviewer Creates &rarr; Manager Reviews &rarr; Manager Forwards to Assessor &rarr; Assessor Responds &rarr; Manager Reviews &rarr; Reviewer Resolves.
              </p>
            </div>

            <div
              onClick={() => handleRoutingToggle('unrestricted')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                routingMode === 'unrestricted'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">UNRESTRICTED (Direct Automated)</span>
                {routingMode === 'unrestricted' && <CheckCircle size={18} className="text-emerald-600" />}
              </div>
              <p className="text-xs text-gray-500">
                Reviewer sends DIRECTLY to Assessor &rarr; Assessor sends response DIRECTLY back to Reviewer. Manager retains read-only visibility.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
