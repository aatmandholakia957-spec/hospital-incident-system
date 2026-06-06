'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Bell, Menu, LogOut, AlertTriangle, Info, CheckCircle } from 'lucide-react';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Header({ title, subtitle, onMenuToggle }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/api/notifications');
      if (data.success) {
        setNotifications(data.data.slice(0, 5));
        setUnreadCount(data.unreadCount);
      }
    } catch {}
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      fetchNotifications();
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      fetchNotifications();
    } catch {}
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'critical_alert': return <div className="notification-icon notification-icon--critical"><AlertTriangle size={16} /></div>;
      case 'status_change': return <div className="notification-icon notification-icon--status"><CheckCircle size={16} /></div>;
      default: return <div className="notification-icon notification-icon--new"><Info size={16} /></div>;
    }
  };

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-hamburger" onClick={onMenuToggle}>
          <Menu size={22} />
        </button>
        <div className="header-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className="header-right">
        <div className="live-dot" title="Connected — Auto-refreshing" />

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button className="header-notification" onClick={() => setShowDropdown(!showDropdown)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>

          {showDropdown && (
            <div className="notification-dropdown">
              <div className="notification-dropdown-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
                )}
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                      onClick={() => {
                        markAsRead(notif._id);
                        if (notif.incidentId) {
                          router.push(`/incidents/${notif.incidentId._id || notif.incidentId}`);
                        }
                        setShowDropdown(false);
                      }}
                    >
                      {getNotificationIcon(notif.type)}
                      <div className="notification-content">
                        <h4>{notif.title}</h4>
                        <p>{notif.message}</p>
                        <div className="notification-time">{timeAgo(notif.createdAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ padding: '8px 16px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { router.push('/notifications'); setShowDropdown(false); }}
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="header-user" onClick={logout} title="Sign Out">
          <div className="header-avatar">{initials}</div>
          <div className="header-user-info">
            <span className="header-user-name">{user?.name}</span>
            <span className="header-user-role">{user?.role?.replace('_', ' ')}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
