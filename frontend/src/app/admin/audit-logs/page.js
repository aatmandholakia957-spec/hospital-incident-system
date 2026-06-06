'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, Globe, Clock, User, FileText, Search } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';

export default function AuditLogs() {
  const { user: currentUser } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, pages: 1, total: 0 });
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(actionFilter && { action: actionFilter }),
      };

      const res = await api.get('/api/admin/audit-logs', params);
      if (res.success) {
        setLogs(res.data);
        setPagination({
          page: res.pagination.page,
          limit: res.pagination.limit,
          pages: res.pagination.pages,
          total: res.pagination.total,
        });
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to fetch audit log database.' });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, actionFilter]);

  useEffect(() => {
    // Role guard: Only admin can view audit logs
    if (currentUser && currentUser.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchLogs();
  }, [currentUser, router, fetchLogs]);

  const handleFilterChange = (e) => {
    setActionFilter(e.target.value);
    setPagination(p => ({ ...p, page: 1 }));
  };

  const getActionBadgeClass = (action) => {
    if (action.includes('CREATE')) return 'badge--status-closed'; // green
    if (action.includes('UPDATE')) return 'badge--status-pending'; // orange
    if (action.includes('DELETE')) return 'badge--severity-critical'; // red
    return 'badge--status-open'; // blue
  };

  if (loading && logs.length === 0) {
    return (
      <DashboardLayout title="System Administration" subtitle="Opening audit log secure channel...">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--color-gray-500)' }}>Syncing immutable event logs...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Audit Logs" subtitle="Tamper-proof chronological trail of system operations and ledger actions">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Filters Toolbar */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} color="var(--color-primary-600)" />
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-navy-900)' }}>
            System Ledger: {pagination.total} Actions Recorded
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: '600' }}>Filter Actions:</label>
          <select
            value={actionFilter}
            onChange={handleFilterChange}
            className="form-select--light"
            style={{ width: '200px', height: '36px', padding: '0 12px' }}
          >
            <option value="">All Operations</option>
            <option value="LOGIN">User Logins</option>
            <option value="CREATE_INCIDENT">Filing Incidents</option>
            <option value="UPDATE_INCIDENT">Modifying Incidents</option>
            <option value="DELETE_INCIDENT">Erasing Incidents</option>
            <option value="CREATE_USER">Operator Provisioning</option>
            <option value="UPDATE_USER">Clearance Adjustments</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
              <Spinner size="md" />
              <span style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Syncing blockchain ledger...</span>
            </div>
          ) : (
            <table className="table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Performed By</th>
                  <th>Action Type</th>
                  <th>Target Type</th>
                  <th>IP Address</th>
                  <th>Action Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                        <Clock size={14} color="var(--color-gray-400)" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} color="var(--color-gray-400)" />
                        <span style={{ fontWeight: '500' }}>{log.performedBy?.name || 'Authorized Portal'}</span>
                        <span style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>({log.performedBy?.role})</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${getActionBadgeClass(log.action)}`} style={{ fontSize: '11px' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={14} color="var(--color-gray-400)" />
                        <span>{log.targetModel || 'System'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'Courier New', fontSize: '12px' }}>
                        <Globe size={14} color="var(--color-gray-400)" />
                        <span>{log.ipAddress || '127.0.0.1'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-gray-600)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>
                      No audit trails recorded in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Panel */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--color-gray-200)' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>
              Page {pagination.page} of {pagination.pages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
