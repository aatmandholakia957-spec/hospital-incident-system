'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Bell, CheckCheck, ShieldAlert, AlertCircle, Info, ChevronRight, Clock } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';

export default function NotificationsList() {
  const { user } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [triggering, setTriggering] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/api/notifications');
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to fetch notifications.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id, incidentId) => {
    try {
      const res = await api.patch(`/api/notifications/${id}/read`);
      if (res.success) {
        // Optimistic state update or fetch
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        if (incidentId) {
          router.push(`/incidents/${incidentId._id || incidentId}`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      const res = await api.patch('/api/notifications/read-all');
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        setToast({ type: 'success', message: 'All alerts marked as read.' });
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Action failed.' });
    }
  };

  const handleTriggerReminders = async () => {
    setTriggering(true);
    try {
      const res = await api.post('/api/notifications/run-reminders');
      if (res.success) {
        setToast({ type: 'success', message: 'Automated lifecycle phase checks executed.' });
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to trigger SLA check.' });
    } finally {
      setTriggering(false);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'critical_alert':
        return <ShieldAlert size={18} color="#dc2626" />;
      case 'new_incident':
        return <AlertCircle size={18} color="#16a34a" />;
      default:
        return <Info size={18} color="var(--color-primary-500)" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Alert Center" subtitle="Accessing system notifications...">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--color-gray-500)' }}>Syncing notification channels...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Alert Center" subtitle="Audit notifications and real-time clinical warnings">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Control Card */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={20} color="var(--color-primary-600)" />
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-navy-900)' }}>
            You have {unreadCount} unread announcements
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {user?.role === 'admin' && (
            <button
              className="btn btn-secondary"
              onClick={handleTriggerReminders}
              disabled={triggering}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {triggering ? <Spinner size="sm" /> : <Clock size={16} />} Trigger SLA Check
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <CheckCheck size={16} /> Mark All as Read
          </button>
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {notifications.map((notif) => (
          <div
            key={notif._id}
            onClick={() => handleMarkAsRead(notif._id, notif.incidentId)}
            className="table-row-hover"
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--color-gray-150)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: notif.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.03)',
              position: 'relative',
            }}
          >
            {/* Unread indicator */}
            {!notif.isRead && (
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--color-primary-500)' }} />
            )}

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ marginTop: '3px', background: 'var(--color-gray-50)', padding: '8px', borderRadius: '50%' }}>
                {getNotifIcon(notif.type)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: notif.isRead ? '600' : '700', color: 'var(--color-navy-900)' }}>
                  {notif.title}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-gray-600)', lineHeight: '1.4' }}>
                  {notif.message}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>
                  {new Date(notif.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            <ChevronRight size={18} color="var(--color-gray-400)" />
          </div>
        ))}

        {notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-gray-400)' }}>
            <Bell size={48} style={{ strokeWidth: '1.2', margin: '0 auto 16px' }} />
            <p>Your notification tray is clean and clear.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
