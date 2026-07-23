import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import useAxiosSecure from '../hooks/useAxiosSecure';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, ExternalLink, X, CheckCheck } from 'lucide-react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const axiosSecure = useAxiosSecure();
  const { user, dbUser } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Use refs to avoid stale closures in the polling interval
  const toastedIds = useRef(new Set());
  const isInitialLoad = useRef(true);
  // Keep a stable ref to navigate & activeRole so interval closure stays fresh
  const navigateRef = useRef(navigate);
  const activeRoleRef = useRef(null);

  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  const activeRole = dbUser?.activeRole || dbUser?.role;
  useEffect(() => { activeRoleRef.current = activeRole; }, [activeRole]);

  // ── Navigation helper ──────────────────────────────────────────────────────
  const navigateToNotificationTarget = useCallback((n) => {
    if (!n.ticketId) return;
    const tid = typeof n.ticketId === 'object' ? n.ticketId._id : n.ticketId;
    if (!tid) return;

    const role = activeRoleRef.current;
    if (role === 'admin') {
      navigateRef.current(`/admin/tickets/${tid}`);
    } else if (role === 'desh_manager') {
      navigateRef.current(`/manager/tickets/${tid}`);
    } else if (['reviewer', 'desh_reviewer', 'desh_assessor'].includes(role)) {
      navigateRef.current(`/reviewer/tickets/${tid}`);
    } else {
      // Professional/user role — navigate to the notifications hub instead
      // (they don't have a standalone ticket detail page)
      navigateRef.current('/notifications');
    }
  }, []);

  // ── Toast notification ─────────────────────────────────────────────────────
  // Defined as a ref-based function so the interval closure always calls the
  // latest version without needing it in the useCallback dep array.
  const markAsReadRef = useRef(null); // populated below after markAsRead is defined

  const showNotificationToast = useCallback((n) => {
    toast.custom((t) => (
      <div
        className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-[340px] w-full shadow-xl rounded-xl p-2.5 px-3 pointer-events-auto flex items-center justify-between gap-2.5 relative border transition-all`}
        style={{
          background: 'linear-gradient(135deg, rgba(12,42,20,0.96), rgba(6,20,10,0.98))',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(52,201,97,0.3)',
          color: '#ffffff',
          boxShadow: '0 8px 20px rgba(0,0,0,0.35), 0 0 12px rgba(52,201,97,0.12)',
        }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(52,201,97,0.15)', border: '1px solid rgba(52,201,97,0.3)' }}>
          <Bell size={14} className="text-emerald-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
            <h4 className="text-xs font-bold text-white truncate leading-tight">{n.title}</h4>
          </div>
          <p className="text-[11px] text-gray-300 truncate mt-0.5 leading-tight">{n.message}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {n.ticketId && (
            <button
              onClick={() => {
                toast.dismiss(t.id);
                if (markAsReadRef.current) markAsReadRef.current(n._id, true);
                navigateToNotificationTarget(n);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md font-bold text-[10px] transition-all hover:scale-105 active:scale-95"
              style={{ background: '#22A84B', color: '#fff' }}
            >
              <span>View</span>
              <ExternalLink size={10} />
            </button>
          )}
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-gray-400 hover:text-white p-0.5 rounded transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    ), { duration: 5000, position: 'top-right' });
  }, [navigateToNotificationTarget]);

  // ── Core fetch — wrapped in useCallback for stable reference ──────────────
  const fetchNotifications = useCallback(async (quiet = false) => {
    if (!user) return;
    if (!quiet) setLoading(true);

    try {
      const [notifRes, countRes] = await Promise.all([
        axiosSecure.get('/notifications?limit=30'),
        axiosSecure.get('/notifications/unread-count'),
      ]);

      const list = notifRes.data.notifications || [];
      const count = countRes.data.count ?? 0;

      setNotifications(list);
      setUnreadCount(count);

      // Toast unread notifications that haven't been toasted yet
      const unreadList = list.filter(n => !n.isRead && !toastedIds.current.has(n._id));

      if (unreadList.length > 0) {
        // On initial load, toast up to 2 most recent unread notifications
        // On polling updates, toast all new unread notifications
        const toToast = isInitialLoad.current ? unreadList.slice(0, 2) : unreadList;
        
        toToast.forEach(n => {
          toastedIds.current.add(n._id);
          showNotificationToast(n);
        });

        // Mark all items currently in list as processed in toastedIds set
        list.forEach(n => {
          toastedIds.current.add(n._id);
        });
      }

      isInitialLoad.current = false;
    } catch (err) {
      console.error('[NotificationContext] fetch error:', err?.response?.data || err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [user, axiosSecure, showNotificationToast]);

  // Keep a stable ref so the interval always calls the latest version
  const fetchRef = useRef(fetchNotifications);
  useEffect(() => { fetchRef.current = fetchNotifications; }, [fetchNotifications]);

  // ── Polling setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      toastedIds.current.clear();
      return;
    }

    // Reset on login / user change
    isInitialLoad.current = true;
    toastedIds.current.clear();

    // Initial fetch
    fetchRef.current();

    // Poll every 5 seconds via stable ref for fast real-time notifications
    const interval = setInterval(() => fetchRef.current(true), 5000);
    return () => clearInterval(interval);
  }, [user]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (id, silent = false) => {
    try {
      await axiosSecure.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (!silent) toast.success('Marked as read');
    } catch {
      toast.error('Could not update notification');
    }
  }, [axiosSecure]);

  // Wire the markAsRead ref so the toast callback always gets the latest function
  useEffect(() => { markAsReadRef.current = markAsRead; }, [markAsRead]);

  const markAsUnread = useCallback(async (id) => {
    try {
      await axiosSecure.patch(`/notifications/${id}/unread`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: false } : n));
      setUnreadCount(prev => prev + 1);
      toast.success('Marked as unread');
    } catch {
      toast.error('Could not update notification');
    }
  }, [axiosSecure]);

  const markAllAsRead = useCallback(async () => {
    try {
      await axiosSecure.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  }, [axiosSecure]);

  const deleteNotification = useCallback(async (id, isRead) => {
    try {
      await axiosSecure.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (!isRead) setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Notification removed');
    } catch {
      toast.error('Failed to delete notification');
    }
  }, [axiosSecure]);

  const notifyActionSent = useCallback((message = 'Notification sent to assigned team members and admins.') => {
    toast.success(message, {
      icon: '🔔',
      style: {
        borderRadius: '12px',
        background: '#0D3B1A',
        color: '#fff',
        border: '1px solid rgba(52,201,97,0.4)',
      },
    });
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAsUnread,
        markAllAsRead,
        deleteNotification,
        navigateToNotificationTarget,
        notifyActionSent,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
