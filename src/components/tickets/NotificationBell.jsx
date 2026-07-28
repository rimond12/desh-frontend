import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink, ArrowRight, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    navigateToNotificationTarget,
    fetchNotifications
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications(true);
    }
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      await markAsRead(n._id, true);
    }
    setIsOpen(false);
    navigateToNotificationTarget(n);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2.5 rounded-xl transition-all flex items-center justify-center shadow-xs"
        style={{
          background: isOpen ? 'var(--g50)' : '#FFFFFF',
          border: isOpen ? '1.5px solid var(--g500)' : '1px solid var(--border-md)',
          color: 'var(--g800)'
        }}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 font-extrabold text-[9px] rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse"
            style={{ background: '#EF4444', color: '#FFFFFF' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl z-50 overflow-hidden flex flex-col"
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-md)',
            boxShadow: 'var(--sh-lg)'
          }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-3.5 border-b"
            style={{ background: 'var(--g50)', borderColor: 'var(--border)' }}
          >
            <h4 
              className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: 'var(--g800)' }}
            >
              <Bell size={14} style={{ color: 'var(--g600)' }} /> Notifications ({unreadCount} unread)
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-bold inline-flex items-center gap-1 transition-colors hover:underline"
                style={{ color: 'var(--g700)' }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-xs font-semibold" style={{ color: 'var(--tx-muted)' }}>
                No notifications right now
              </div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className="p-3.5 cursor-pointer text-xs transition-colors flex items-start gap-2.5"
                  style={{
                    background: !n.isRead ? 'var(--g50)' : '#FFFFFF',
                    borderLeft: !n.isRead ? '3px solid var(--g500)' : '3px solid transparent'
                  }}
                >
                  {!n.isRead && (
                    <span 
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 animate-pulse"
                      style={{ background: 'var(--g500)' }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-bold truncate" style={{ color: 'var(--tx)' }}>{n.title}</span>
                      <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'var(--tx-faint)' }}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: !n.isRead ? 'var(--tx-2)' : 'var(--tx-muted)' }}>
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div 
            className="p-2.5 border-t text-center"
            style={{ background: 'var(--bg-soft)', borderColor: 'var(--border)' }}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              style={{
                background: 'var(--g100)',
                color: 'var(--g800)',
                border: '1px solid var(--g200)'
              }}
            >
              <span>View All Notifications</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
