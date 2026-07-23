import React, { useState } from 'react';
import Layout from '../components/shared/Layout.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
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
  Filter,
  RotateCcw,
  Search,
  Sparkles,
  Inbox
} from 'lucide-react';

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    navigateToNotificationTarget,
  } = useNotifications();

  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications(true);
    setRefreshing(false);
  };

  const handleMarkToggle = async (id, isRead, e) => {
    e.stopPropagation();
    setActionId(id);
    if (isRead) {
      await markAsUnread(id);
    } else {
      await markAsRead(id);
    }
    setActionId(null);
  };

  const handleDelete = async (id, isRead, e) => {
    e.stopPropagation();
    setActionId(id);
    await deleteNotification(id, isRead);
    setActionId(null);
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      await markAsRead(n._id, true);
    }
    navigateToNotificationTarget(n);
  };

  const filteredNotifications = notifications.filter(n => {
    // Filter by tab
    if (filter === 'unread' && n.isRead) return false;
    if (filter === 'read' && !n.isRead) return false;

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const titleMatch = n.title?.toLowerCase().includes(q);
      const msgMatch = n.message?.toLowerCase().includes(q);
      const ticketNumMatch = n.metadata?.ticketNumber?.toLowerCase().includes(q);
      return titleMatch || msgMatch || ticketNumMatch;
    }

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
        return { label: 'New Ticket', bg: 'var(--g100)', color: 'var(--g800)', border: 'var(--g200)', icon: Ticket };
      case 'ticket_approved':
      case 'ticket_resolved':
        return { label: 'Resolved / Approved', bg: 'var(--g100)', color: 'var(--g700)', border: 'var(--g200)', icon: Check };
      case 'ticket_rejected':
      case 'ticket_returned':
      case 'ticket_cancelled':
        return { label: 'Action Needed', bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', icon: AlertCircle };
      case 'ticket_comment':
      case 'response_submitted':
        return { label: 'Comment / Update', bg: '#F3E8FF', color: '#6B21A8', border: '#D8B4FE', icon: MessageSquare };
      default:
        return { label: 'Notification', bg: 'var(--g100)', color: 'var(--g800)', border: 'var(--g200)', icon: Bell };
    }
  };

  const readCount = Math.max(0, notifications.length - unreadCount);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4 space-y-6">
        
        {/* ── Hero Header Banner (Matching DESHboard Green Brand Concept) ─────── */}
        <div 
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-xl"
          style={{
            background: 'linear-gradient(135deg, var(--g900) 0%, var(--g800) 100%)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {/* Subtle Glow Overlay */}
          <div 
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(52,201,97,0.15)' }}
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#34C961'
                }}
              >
                <Bell size={28} />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span 
                    className="text-xs font-extrabold uppercase tracking-widest flex items-center gap-1.5"
                    style={{ color: '#34C961' }}
                  >
                    <Sparkles size={13} /> Activity Center
                  </span>
                  {unreadCount > 0 && (
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
                      style={{ background: '#EF4444', color: '#FFFFFF' }}
                    >
                      {unreadCount} UNREAD
                    </span>
                  )}
                </div>

                <h1 
                  className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  Notifications Hub
                </h1>

                <p className="text-xs sm:text-sm mt-1 max-w-xl leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)' }}>
                  Stay updated on ticket status changes, staff assignments, comments, and team activity in real time.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 self-start md:self-center flex-wrap">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#FFFFFF'
                }}
                title="Refresh notification feed"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                <span>Refresh Feed</span>
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                  style={{
                    background: '#34C961',
                    color: '#051A0A',
                    border: 'none'
                  }}
                >
                  <CheckCheck size={16} />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Metric Cards / Tab Selectors (DESHboard Light Theme Concept) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Tab 1: All */}
          <button
            onClick={() => setFilter('all')}
            className="p-5 rounded-2xl text-left transition-all duration-200 relative overflow-hidden group"
            style={{
              background: filter === 'all' ? 'var(--g50)' : '#FFFFFF',
              border: filter === 'all' ? '2px solid var(--g500)' : '1px solid var(--border)',
              boxShadow: filter === 'all' ? 'var(--sh-md)' : 'var(--sh-xs)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span 
                className="text-xs font-extrabold uppercase tracking-wider"
                style={{ color: filter === 'all' ? 'var(--g800)' : 'var(--tx-muted)' }}
              >
                All Notifications
              </span>
              <div 
                className="p-2 rounded-xl border flex items-center justify-center"
                style={{
                  background: filter === 'all' ? 'var(--g100)' : 'var(--bg-soft)',
                  borderColor: filter === 'all' ? 'var(--g200)' : 'var(--border)',
                  color: filter === 'all' ? 'var(--g800)' : 'var(--tx-muted)'
                }}
              >
                <Inbox size={16} />
              </div>
            </div>

            <div 
              className="text-3xl font-black tracking-tight"
              style={{ color: filter === 'all' ? 'var(--g800)' : 'var(--tx)' }}
            >
              {notifications.length}
            </div>

            <div className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--tx-faint)' }}>
              Total received history
            </div>
          </button>

          {/* Tab 2: Unread */}
          <button
            onClick={() => setFilter('unread')}
            className="p-5 rounded-2xl text-left transition-all duration-200 relative overflow-hidden group"
            style={{
              background: filter === 'unread' ? 'var(--g50)' : '#FFFFFF',
              border: filter === 'unread' ? '2px solid var(--g500)' : '1px solid var(--border)',
              boxShadow: filter === 'unread' ? 'var(--sh-md)' : 'var(--sh-xs)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span 
                className="text-xs font-extrabold uppercase tracking-wider"
                style={{ color: filter === 'unread' ? 'var(--g800)' : 'var(--tx-muted)' }}
              >
                Unread
              </span>
              <div 
                className="p-2 rounded-xl border flex items-center justify-center"
                style={{
                  background: unreadCount > 0 ? '#FEE2E2' : 'var(--bg-soft)',
                  borderColor: unreadCount > 0 ? '#FCA5A5' : 'var(--border)',
                  color: unreadCount > 0 ? '#DC2626' : 'var(--tx-muted)'
                }}
              >
                {unreadCount > 0 ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                ) : (
                  <Check size={16} style={{ color: 'var(--g600)' }} />
                )}
              </div>
            </div>

            <div 
              className="text-3xl font-black tracking-tight"
              style={{ color: unreadCount > 0 ? '#DC2626' : 'var(--g800)' }}
            >
              {unreadCount}
            </div>

            <div className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--tx-faint)' }}>
              Awaiting your action
            </div>
          </button>

          {/* Tab 3: Read */}
          <button
            onClick={() => setFilter('read')}
            className="p-5 rounded-2xl text-left transition-all duration-200 relative overflow-hidden group"
            style={{
              background: filter === 'read' ? 'var(--g50)' : '#FFFFFF',
              border: filter === 'read' ? '2px solid var(--g500)' : '1px solid var(--border)',
              boxShadow: filter === 'read' ? 'var(--sh-md)' : 'var(--sh-xs)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span 
                className="text-xs font-extrabold uppercase tracking-wider"
                style={{ color: filter === 'read' ? 'var(--g800)' : 'var(--tx-muted)' }}
              >
                Read Notifications
              </span>
              <div 
                className="p-2 rounded-xl border flex items-center justify-center"
                style={{
                  background: filter === 'read' ? 'var(--g100)' : 'var(--bg-soft)',
                  borderColor: filter === 'read' ? 'var(--g200)' : 'var(--border)',
                  color: filter === 'read' ? 'var(--g800)' : 'var(--tx-muted)'
                }}
              >
                <CheckCheck size={16} />
              </div>
            </div>

            <div 
              className="text-3xl font-black tracking-tight"
              style={{ color: filter === 'read' ? 'var(--g800)' : 'var(--tx)' }}
            >
              {readCount}
            </div>

            <div className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--tx-faint)' }}>
              Processed & archived
            </div>
          </button>

        </div>

        {/* ── Search Bar ───────────────────────────────────────────────────── */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl"
          style={{ background: '#FFFFFF', border: '1px solid var(--border)', boxShadow: 'var(--sh-xs)' }}
        >
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx-muted)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, ticket number, message..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl transition-all font-medium"
              style={{
                background: 'var(--bg-soft)',
                border: '1px solid var(--border-md)',
                color: 'var(--tx)',
                outline: 'none'
              }}
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold self-end sm:self-center" style={{ color: 'var(--tx-muted)' }}>
            <span>Showing <strong style={{ color: 'var(--tx)' }}>{filteredNotifications.length}</strong> notifications</span>
          </div>
        </div>

        {/* ── Notification Feed Container ──────────────────────────────────── */}
        <div 
          className="rounded-3xl p-4 sm:p-6"
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            boxShadow: 'var(--sh-sm)'
          }}
        >
          {loading ? (
            <div className="py-20 text-center">
              <div 
                className="inline-block w-9 h-9 border-3 rounded-full animate-spin mb-3"
                style={{ borderColor: 'var(--g200)', borderTopColor: 'var(--g600)' }}
              />
              <p className="text-xs font-bold" style={{ color: 'var(--tx-muted)' }}>Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm"
                style={{ background: 'var(--g50)', border: '1px solid var(--border-md)', color: 'var(--g600)' }}
              >
                <Bell size={30} />
              </div>

              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--tx)' }}>No Notifications Found</h3>
                <p className="text-xs max-w-md mx-auto mt-1" style={{ color: 'var(--tx-muted)' }}>
                  {searchTerm 
                    ? `No notifications match your search query "${searchTerm}".`
                    : filter === 'unread' 
                    ? 'You have caught up with all your unread notifications!' 
                    : filter === 'read' 
                    ? 'No read notifications found.' 
                    : 'You do not have any notifications at this moment.'}
                </p>
              </div>

              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: 'var(--g100)', color: 'var(--g800)', border: '1px solid var(--g200)' }}
                >
                  Clear Search
                </button>
              )}
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
                    className="p-4 sm:p-5 rounded-2xl transition-all duration-200 relative group cursor-pointer"
                    style={{
                      background: !n.isRead ? 'var(--g50)' : '#FFFFFF',
                      border: !n.isRead ? '1px solid var(--border-md)' : '1px solid var(--border)',
                      borderLeft: !n.isRead ? '4px solid var(--g500)' : '1px solid var(--border)',
                      boxShadow: !n.isRead ? 'var(--sh-sm)' : 'none'
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Left Badge Icon */}
                      <div className="relative flex-shrink-0 mt-0.5">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs transition-transform group-hover:scale-105"
                          style={{
                            background: badge.bg,
                            borderColor: badge.border,
                            color: badge.color
                          }}
                        >
                          <BadgeIcon size={20} />
                        </div>
                        {!n.isRead && (
                          <span 
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full animate-pulse shadow-xs"
                            style={{ background: '#EF4444' }}
                          />
                        )}
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span 
                              className="text-sm sm:text-base font-bold tracking-tight"
                              style={{ color: 'var(--tx)' }}
                            >
                              {n.title}
                            </span>

                            <span
                              className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border uppercase tracking-wider"
                              style={{
                                background: badge.bg,
                                color: badge.color,
                                borderColor: badge.border
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] font-mono flex-shrink-0" style={{ color: 'var(--tx-muted)' }}>
                            <Clock size={13} />
                            <span>{formatTime(n.createdAt)}</span>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm leading-relaxed mb-3 font-medium" style={{ color: !n.isRead ? 'var(--tx-2)' : 'var(--tx-muted)' }}>
                          {n.message}
                        </p>

                        {/* Card Footer */}
                        <div className="flex items-center justify-between pt-3 border-t text-xs" style={{ borderColor: 'var(--border)' }}>
                          {n.ticketId ? (
                            <span 
                              className="inline-flex items-center gap-1.5 font-bold transition-colors"
                              style={{ color: 'var(--g700)' }}
                            >
                              <span>View Ticket / Details</span>
                              <ExternalLink size={14} className="transition-transform group-hover:translate-x-0.5" />
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium" style={{ color: 'var(--tx-faint)' }}>System Announcement</span>
                          )}

                          {/* Quick Actions */}
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleMarkToggle(n._id, n.isRead, e)}
                              disabled={isItemBusy}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border"
                              style={{
                                background: !n.isRead ? '#FFFFFF' : 'var(--bg-soft)',
                                color: !n.isRead ? 'var(--g800)' : 'var(--tx-muted)',
                                borderColor: 'var(--border-md)'
                              }}
                              title={!n.isRead ? 'Mark notification as read' : 'Mark notification as unread'}
                            >
                              {!n.isRead ? (
                                <>
                                  <Check size={14} style={{ color: 'var(--g600)' }} />
                                  <span>Mark Read</span>
                                </>
                              ) : (
                                <>
                                  <RotateCcw size={14} />
                                  <span>Mark Unread</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={(e) => handleDelete(n._id, n.isRead, e)}
                              disabled={isItemBusy}
                              className="p-1.5 sm:p-2 rounded-xl transition-all hover:bg-red-50 hover:text-red-600"
                              style={{ color: 'var(--tx-faint)' }}
                              title="Delete notification"
                            >
                              <Trash2 size={15} />
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
