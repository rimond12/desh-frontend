import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import useAxiosSecure from '../../hooks/useAxiosSecure';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await axiosSecure.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch (_) {}
  };

  const fetchNotifications = async () => {
    try {
      const res = await axiosSecure.get('/notifications?limit=10');
      setNotifications(res.data.notifications || []);
    } catch (_) {}
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    try {
      await axiosSecure.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (_) {}
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      try {
        await axiosSecure.patch(`/notifications/${n._id}/read`);
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (_) {}
    }
    setIsOpen(false);
    if (n.ticketId) {
      // Navigate based on role portal
      navigate(`/admin/tickets/${n.ticketId._id || n.ticketId}`);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-card shadow-2xl rounded-2xl z-50 overflow-hidden border border-emerald-500/20">
          <div className="flex items-center justify-between p-3.5 border-b bg-emerald-950/20" style={{ borderColor: 'var(--border)' }}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Bell size={14} /> Notifications
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 cursor-pointer text-xs transition-colors hover:bg-emerald-500/5 ${
                    !n.isRead ? 'bg-emerald-500/10 font-semibold' : 'opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-bold text-emerald-700">{n.title}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 line-clamp-2">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
