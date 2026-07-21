import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/shared/Layout.jsx';
import useAxiosSecure from '../hooks/useAxiosSecure.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  RefreshCw, 
  Ticket, 
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Clock,
  Filter
} from 'lucide-react';

export default function NotificationsPage() {
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();
  const { dbUser } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [unreadCount, setUnreadCount] = useState(0);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [actionId, setActionId] = useState(null);

  const activeRole = dbUser?.activeRole || dbUser?.role;

  const fetchNotifications = async (showQuiet = false) => {
    if (!showQuiet) setLoading(true);
    else setRefreshing(true);

    try {
      const [notifRes, unreadRes] = await Promise.all([
        axiosSecure.get('/notifications?limit=50'),
        axiosSecure.get('/notifications/unread-count')
      ]);

      setNotifications(notifRes.data.notifications || []);
      setUnreadCount(unreadRes.data.count || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      toast.error('Could not load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    setMarkAllLoading(true);
    try {
      await axiosSecure.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    } finally {
      setMarkAllLoading(false);
    }
  };

  const handleMarkSingleRead = async (id, currentStatus, e) => {
    e.stopPropagation();
    setActionId(id);
    try {
      if (!currentStatus) {
        await axiosSecure.patch(`/notifications/${id}/read`);
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        toast.success('Marked as read');
      }
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id, isRead, e) => {
    e.stopPropagation();
    setActionId(id);
    try {
      await axiosSecure.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (!isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success('Notification removed');
    } catch (err) {
      toast.error('Failed to delete notification');
    } finally {
      setActionId(null);
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      axiosSecure.patch(`/notifications/${n._id}/read`).then(() => {
        setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, isRead: true } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }).catch(() => {});
    }

    if (n.ticketId) {
      const tid = typeof n.ticketId === 'object' ? n.ticketId._id : n.ticketId;
      if (activeRole === 'admin') {
        navigate(`/admin/tickets/${tid}`);
      } else if (activeRole === 'desh_manager') {
        navigate(`/manager/tickets/${tid}`);
      } else if (['reviewer', 'desh_reviewer', 'desh_assessor'].includes(activeRole)) {
        navigate(`/reviewer/tickets/${tid}`);
      } else {
        navigate(`/admin/tickets/${tid}`);
      }
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'ticket_created':
        return { label: 'New Ticket', bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)', icon: Ticket };
      case 'ticket_approved':
      case 'ticket_resolved':
        return { label: 'Resolved / Approved', bg: 'rgba(34, 197, 94, 0.15)', color: '#4ADE80', border: 'rgba(34, 197, 94, 0.3)', icon: Check };
      case 'ticket_rejected':
      case 'ticket_returned':
      case 'ticket_cancelled':
        return { label: 'Action Needed', bg: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: 'rgba(239, 68, 68, 0.3)', icon: AlertCircle };
      case 'ticket_comment':
      case 'response_submitted':
        return { label: 'Comment / Update', bg: 'rgba(168, 85, 247, 0.15)', color: '#C084FC', border: 'rgba(168, 85, 247, 0.3)', icon: MessageSquare };
      default:
        return { label: 'Notification', bg: 'rgba(52, 201, 97, 0.15)', color: '#34C961', border: 'rgba(52, 201, 97, 0.3)', icon: Bell };
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-2">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(52,201,97,0.2), rgba(13,59,26,0.6))',
                border: '1px solid rgba(52,201,97,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#34C961', boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
              }}>
                <Bell size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Notifications
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Stay updated on ticket updates, status changes, and announcements
                </p>
              </div>
            </div>
          </div>

          {/* Top Header Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchNotifications(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)'
              }}
              title="Refresh notifications"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(52,201,97,0.25), rgba(20,92,40,0.4))',
                  border: '1px solid rgba(52,201,97,0.4)',
                  color: '#34C961'
                }}
              >
                <CheckCheck size={15} />
                <span>Mark all as read</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              filter === 'all' ? 'ring-2 ring-emerald-500/50' : ''
            }`}
            style={{
              background: filter === 'all' ? 'rgba(52,201,97,0.1)' : 'rgba(255,255,255,0.03)',
              borderColor: filter === 'all' ? 'rgba(52,201,97,0.4)' : 'rgba(255,255,255,0.08)'
            }}
          >
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>All Notifications</span>
              <Filter size={14} className={filter === 'all' ? 'text-emerald-400' : 'text-gray-500'} />
            </div>
            <div className="text-2xl font-extrabold text-white">
              {notifications.length}
            </div>
          </button>

          <button
            onClick={() => setFilter('unread')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              filter === 'unread' ? 'ring-2 ring-emerald-500/50' : ''
            }`}
            style={{
              background: filter === 'unread' ? 'rgba(52,201,97,0.1)' : 'rgba(255,255,255,0.03)',
              borderColor: filter === 'unread' ? 'rgba(52,201,97,0.4)' : 'rgba(255,255,255,0.08)'
            }}
          >
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">
              {unreadCount}
            </div>
          </button>

          <button
            onClick={() => setFilter('read')}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              filter === 'read' ? 'ring-2 ring-emerald-500/50' : ''
            }`}
            style={{
              background: filter === 'read' ? 'rgba(52,201,97,0.1)' : 'rgba(255,255,255,0.03)',
              borderColor: filter === 'read' ? 'rgba(52,201,97,0.4)' : 'rgba(255,255,255,0.08)'
            }}
          >
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Read</span>
              <Check size={14} className="text-gray-500" />
            </div>
            <div className="text-2xl font-extrabold text-gray-300">
              {Math.max(0, notifications.length - unreadCount)}
            </div>
          </button>
        </div>

        {/* Notifications List Container */}
        <div className="glass-card p-4 sm:p-6 rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-3" />
              <p className="text-xs text-gray-400 font-medium">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                <Bell size={28} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No Notifications</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                {filter === 'unread' 
                  ? 'You have caught up with all your unread notifications!' 
                  : filter === 'read' 
                  ? 'No read notifications found.' 
                  : 'You do not have any notifications at this moment.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((n) => {
                const badge = getTypeBadge(n.type);
                const BadgeIcon = badge.icon;
                const isItemBusy = actionId === n._id;

                return (
                  <div
                    key={n._id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-4 rounded-xl transition-all duration-200 border relative group cursor-pointer ${
                      !n.isRead ? 'bg-emerald-950/20 border-emerald-500/30 shadow-lg' : 'bg-white/[0.02] border-white/5 opacity-85 hover:opacity-100 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Status indicator dot / Icon */}
                      <div className="relative flex-shrink-0 mt-0.5">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center border"
                          style={{
                            background: badge.bg,
                            borderColor: badge.border,
                            color: badge.color
                          }}
                        >
                          <BadgeIcon size={18} />
                        </div>
                        {!n.isRead && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-[#0D3B1A] rounded-full animate-pulse" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white tracking-tight">
                              {n.title}
                            </span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                              style={{
                                background: badge.bg,
                                color: badge.color,
                                borderColor: badge.border
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono flex-shrink-0">
                            <Clock size={12} />
                            <span>{formatTime(n.createdAt)}</span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-300 leading-relaxed mb-2.5">
                          {n.message}
                        </p>

                        {/* Card Footer Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                          {n.ticketId ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400 hover:text-emerald-300">
                              <span>View Ticket / Details</span>
                              <ExternalLink size={13} />
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-500">System Notification</span>
                          )}

                          <div className="flex items-center gap-2 opacity-90 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                            {!n.isRead && (
                              <button
                                onClick={(e) => handleMarkSingleRead(n._id, n.isRead, e)}
                                disabled={isItemBusy}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1"
                                title="Mark as Read"
                              >
                                <Check size={13} />
                                <span className="hidden sm:inline">Mark Read</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => handleDelete(n._id, n.isRead, e)}
                              disabled={isItemBusy}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete notification"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
