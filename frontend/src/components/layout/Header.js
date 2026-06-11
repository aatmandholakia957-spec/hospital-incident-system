'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Bell, Menu, LogOut, AlertTriangle, Info, CheckCircle, CalendarClock } from 'lucide-react';

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

function formatReminderDueDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = d1 - d2;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const formattedDate = date.toLocaleDateString('en-US', dateOptions);

  if (diffDays === 0) {
    return `Due today (${formattedDate})`;
  } else if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return `Overdue by ${absDays} day${absDays > 1 ? 's' : ''} (${formattedDate})`;
  } else {
    return `Due in ${diffDays} day${diffDays > 1 ? 's' : ''} (${formattedDate})`;
  }
}

export default function Header({ title, subtitle, onMenuToggle }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [reminders, setReminders] = useState([]);
  const [showReminders, setShowReminders] = useState(false);
  const remindersDropdownRef = useRef(null);

  const isAuthorizedForReminders = user && (user.role === 'admin' || user.role === 'dept_head');

  useEffect(() => {
    fetchNotifications();
    const notificationInterval = setInterval(fetchNotifications, 30000);

    let remindersInterval = null;
    if (isAuthorizedForReminders) {
      fetchReminders();
      remindersInterval = setInterval(fetchReminders, 30000);
    }

    return () => {
      clearInterval(notificationInterval);
      if (remindersInterval) clearInterval(remindersInterval);
    };
  }, [user, isAuthorizedForReminders]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (remindersDropdownRef.current && !remindersDropdownRef.current.contains(event.target)) {
        setShowReminders(false);
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

  const fetchReminders = async () => {
    try {
      const data = await api.get('/api/incidents/reminders');
      if (data.success) {
        setReminders(data.data);
      }
    } catch {}
  };

  const handleMarkAudited = async (id) => {
    try {
      const res = await api.patch(`/api/incidents/${id}/audit`);
      if (res.success) {
        fetchReminders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkReaudited = async (id) => {
    try {
      const res = await api.patch(`/api/incidents/${id}/reaudit`);
      if (res.success) {
        fetchReminders();
      }
    } catch (err) {
      console.error(err);
    }
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

  const overdueReminders = reminders.filter(r => r.isOverdue);
  const upcomingReminders = reminders.filter(r => !r.isOverdue);
  const overdueCount = overdueReminders.length;

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

        {/* Reminders Button and Dropdown */}
        {isAuthorizedForReminders && (
          <div ref={remindersDropdownRef} style={{ position: 'relative' }}>
            <button 
              className={`header-notification ${showReminders ? 'active' : ''}`}
              onClick={() => {
                setShowReminders(!showReminders);
                setShowDropdown(false);
              }}
              title="Audit Reminders"
            >
              <CalendarClock size={20} />
              {overdueCount > 0 && (
                <span className="notification-badge notification-badge--danger">
                  {overdueCount}
                </span>
              )}
            </button>

            {showReminders && (
              <div className="notification-dropdown reminders-dropdown">
                <div className="notification-dropdown-header">
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CalendarClock size={16} className="text-primary" />
                      Audit Reminders
                    </h3>
                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Post-closure verification tasks
                    </p>
                  </div>
                </div>

                <div className="notification-list" style={{ maxHeight: '380px' }}>
                  {reminders.length === 0 ? (
                    <div style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>
                      <CheckCircle size={32} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                      <p style={{ fontSize: '13px', fontWeight: '500' }}>All Caught Up!</p>
                      <p style={{ fontSize: '11px', marginTop: '4px' }}>No active or upcoming audit reminders.</p>
                    </div>
                  ) : (
                    <>
                      {overdueReminders.length > 0 && (
                        <div className="reminder-section">
                          <div className="reminder-section-title overdue">
                            <span>Overdue Reminders ({overdueReminders.length})</span>
                          </div>
                          {overdueReminders.map((reminder) => (
                            <div key={`${reminder._id}-${reminder.type}`} className="reminder-item overdue">
                              <div className="reminder-item-main" onClick={() => {
                                router.push(`/incidents/${reminder._id}?tab=capa`);
                                setShowReminders(false);
                              }}>
                                <div className="reminder-incident-id">{reminder.incidentId}</div>
                                <div className="reminder-meta">
                                  <span className="reminder-dept">{reminder.department}</span>
                                  <span className="reminder-type-badge">{reminder.type}</span>
                                </div>
                                <div className="reminder-due-date overdue">
                                  {formatReminderDueDate(reminder.dueDate)}
                                </div>
                              </div>
                              <button 
                                className="reminder-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (reminder.type === '1st Audit') {
                                    handleMarkAudited(reminder._id);
                                  } else {
                                    handleMarkReaudited(reminder._id);
                                  }
                                }}
                                title="Mark Completed"
                              >
                                <CheckCircle size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {upcomingReminders.length > 0 && (
                        <div className="reminder-section">
                          <div className="reminder-section-title upcoming">
                            <span>Upcoming Reminders ({upcomingReminders.length})</span>
                          </div>
                          {upcomingReminders.map((reminder) => (
                            <div key={`${reminder._id}-${reminder.type}`} className="reminder-item upcoming">
                              <div className="reminder-item-main" onClick={() => {
                                router.push(`/incidents/${reminder._id}?tab=capa`);
                                setShowReminders(false);
                              }}>
                                <div className="reminder-incident-id">{reminder.incidentId}</div>
                                <div className="reminder-meta">
                                  <span className="reminder-dept">{reminder.department}</span>
                                  <span className="reminder-type-badge">{reminder.type}</span>
                                </div>
                                <div className="reminder-due-date upcoming">
                                  {formatReminderDueDate(reminder.dueDate)}
                                </div>
                              </div>
                              <button 
                                className="reminder-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (reminder.type === '1st Audit') {
                                    handleMarkAudited(reminder._id);
                                  } else {
                                    handleMarkReaudited(reminder._id);
                                  }
                                }}
                                title="Mark Completed"
                              >
                                <CheckCircle size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button className="header-notification" onClick={() => { setShowDropdown(!showDropdown); setShowReminders(false); }}>
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
