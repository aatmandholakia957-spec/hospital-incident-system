'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { DEPARTMENTS, SEVERITIES, STATUSES } from '@/lib/constants';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Download,
  X,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';

export default function IncidentsList() {
  const { user, hasRole } = useAuth();
  const router = useRouter();

  // Filter States
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState(
    user?.role === 'dept_head' ? user.department : ''
  );
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [currentPhase, setCurrentPhase] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Table/Pagination States
  const [incidents, setIncidents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, pages: 1, total: 0 });
  const [sortBy, setSortBy] = useState('dateTime');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);

  // General States
  const [toast, setToast] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(department && { department }),
        ...(severity && { severity }),
        ...(status && { status }),
        ...(currentPhase && { currentPhase }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      };

      const res = await api.get('/api/incidents', params);
      if (res.success) {
        setIncidents(res.data);
        setPagination({
          page: res.pagination.page,
          limit: res.pagination.limit,
          pages: res.pagination.pages,
          total: res.pagination.total,
        });
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to fetch incidents.' });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortBy, sortOrder, search, department, severity, status, currentPhase, dateFrom, dateTo]);

  useEffect(() => {
    if (user?.role === 'dept_head') {
      setDepartment(user.department);
    }
  }, [user]);

  useEffect(() => {
    fetchIncidents();
  }, [pagination.page, sortBy, sortOrder, department, severity, status, currentPhase]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
    fetchIncidents();
  };

  const handleClearFilters = () => {
    setSearch('');
    setDepartment(user?.role === 'dept_head' ? user.department : '');
    setSeverity('');
    setStatus('');
    setCurrentPhase('');
    setDateFrom('');
    setDateTo('');
    setPagination(p => ({ ...p, page: 1 }));
    // Wait for state updates to trigger fetch through dependency
    setTimeout(fetchIncidents, 0);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleDelete = async (id, incidentId) => {
    if (!window.confirm(`Are you sure you want to permanently delete incident ${incidentId}?`)) {
      return;
    }

    try {
      const res = await api.del(`/api/incidents/${id}`);
      if (res.success) {
        setToast({ type: 'success', message: `Incident ${incidentId} deleted successfully.` });
        fetchIncidents();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete incident.' });
    }
  };

  const handleExport = async () => {
    if (!hasRole('admin', 'dept_head')) return;
    setExporting(true);
    try {
      const params = {
        ...(search && { search }),
        ...(department && { department }),
        ...(severity && { severity }),
        ...(status && { status }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      };

      const blob = await api.getBlob('/api/export/excel', params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Hospital_Incidents_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setToast({ type: 'success', message: 'Report exported successfully.' });
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Export failed.' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout title="Incidents Log" subtitle="Comprehensive hospital incident log and search panel">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Filter and Actions Panel */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit} className="grid grid-4" style={{ gap: '16px' }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Search Keywords</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="ID, description, people involved, etc..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input form-input--light"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="submit"
                style={{ position: 'absolute', right: '12px', top: '11px', color: 'var(--color-gray-400)' }}
              >
                <Search size={18} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="form-select--light"
              disabled={user?.role === 'dept_head'}
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Severity</label>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="form-select--light"
            >
              <option value="">All Severities</option>
              {SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>{sev}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Incident Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="form-select--light"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Workflow Phase</label>
            <select
              value={currentPhase}
              onChange={(e) => {
                setCurrentPhase(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="form-select--light"
            >
              <option value="">All Phases</option>
              <option value="1">Phase 1: Incident Entry</option>
              <option value="2">Phase 2: Data Fill-up</option>
              <option value="3">Phase 3: Management Review</option>
              <option value="4">Phase 4: Closure</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="form-input form-input--light"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="form-input form-input--light"
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '8px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, height: '40px' }}
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-secondary btn-icon"
              style={{ height: '40px' }}
              title="Clear all filters"
            >
              <X size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Main Table Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--color-gray-200)' }}>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Incident Registry</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
              Found {pagination.total} registered incidents
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {hasRole('admin', 'dept_head') && (
              <button
                className="btn btn-secondary"
                onClick={handleExport}
                disabled={exporting}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {exporting ? <Spinner size="sm" /> : <FileSpreadsheet size={16} />}
                Export Excel
              </button>
            )}
            {!hasRole('viewer') && (
              <Link href="/incidents/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} />
                Report Incident
              </Link>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '16px' }}>
              <Spinner size="lg" />
              <p style={{ color: 'var(--color-gray-500)', fontSize: '13px' }}>Querying index...</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('incidentId')} style={{ cursor: 'pointer' }}>
                    Incident ID <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline-block' }} />
                  </th>
                  <th onClick={() => handleSort('dateTime')} style={{ cursor: 'pointer' }}>
                    Date / Time <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline-block' }} />
                  </th>
                  <th onClick={() => handleSort('department')} style={{ cursor: 'pointer' }}>
                    Department <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline-block' }} />
                  </th>
                  <th>Brief</th>
                  <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>
                    Category <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline-block' }} />
                  </th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Workflow Phase</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident._id} className="table-row-hover">
                    <td style={{ fontWeight: '600', color: 'var(--color-primary-700)' }}>
                      {incident.incidentId}
                    </td>
                    <td>
                      {new Date(incident.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td>{incident.department}</td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={incident.brief}>
                      {incident.brief || <span style={{ color: 'var(--color-gray-400)', fontStyle: 'italic' }}>No brief</span>}
                    </td>
                    <td>{incident.category}</td>
                    <td>
                      <span className={`badge badge--severity-${incident.severity?.toLowerCase()}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge--status-${incident.status?.toLowerCase()}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-phase-${incident.currentPhase || 1}`}>
                        Phase {incident.currentPhase || 1}: {
                          incident.currentPhase === 4 ? 'Closure' :
                          incident.currentPhase === 3 ? 'Review' :
                          incident.currentPhase === 2 ? 'Data Fill-up' : 'Entry'
                        }
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => router.push(`/incidents/${incident._id}`)}
                          className="btn btn-ghost btn-sm btn-icon"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        {hasRole('admin', 'dept_head') && (
                          <button
                            onClick={() => router.push(`/incidents/${incident._id}/edit`)}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Edit Incident"
                          >
                            <Edit2 size={15} color="var(--color-primary-600)" />
                          </button>
                        )}
                        {hasRole('admin') && (
                          <button
                            onClick={() => handleDelete(incident._id, incident.incidentId)}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Delete"
                          >
                            <Trash2 size={15} color="var(--color-danger)" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {incidents.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>
                      No matching records found.
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
