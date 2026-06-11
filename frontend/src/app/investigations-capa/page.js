'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { DEPARTMENTS } from '@/lib/constants';
import {
  Search,
  Eye,
  X,
  ArrowUpDown,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Building,
  Calendar,
} from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';

export default function InvestigationsCapaDashboard() {
  const { user, loading: authLoading, hasRole } = useAuth();
  const router = useRouter();

  // Loading and Error States
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Data States
  const [incidents, setIncidents] = useState([]);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState(
    user?.role === 'dept_head' ? user.department : ''
  );
  const [investigationCategory, setInvestigationCategory] = useState('');
  const [capaStatus, setCapaStatus] = useState(''); // 'pending', 'completed', 'none', ''
  
  // Sorting States
  const [sortBy, setSortBy] = useState('incidentId');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch all incidents
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all records without low pagination limits to allow rich client-side filters
      const res = await api.get('/api/incidents', { limit: 1000 });
      if (res.success) {
        setIncidents(res.data);
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to fetch incident data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Update department state once the authenticated user loads
  useEffect(() => {
    if (user?.role === 'dept_head') {
      setDepartment(user.department);
    }
  }, [user]);

  // Only run the fetch once the authenticated user details are resolved
  useEffect(() => {
    if (!authLoading && user) {
      fetchIncidents();
    }
  }, [authLoading, user, fetchIncidents]);

  // Handle clearing all filters
  const handleClearFilters = () => {
    setSearch('');
    setDepartment(user?.role === 'dept_head' ? user.department : '');
    setInvestigationCategory('');
    setCapaStatus('');
  };

  // Sorting logic
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Process data to calculate CAPA metrics
  const processedIncidents = useMemo(() => {
    return incidents.map((inc) => {
      const corrective = inc.correctiveActions || [];
      const preventive = inc.preventiveActions || [];
      const allActions = [...corrective, ...preventive];
      
      const totalActions = allActions.length;
      const completedActions = allActions.filter(a => a.status === 'Completed').length;
      const pendingActions = allActions.filter(a => a.status !== 'Completed').length;
      
      // Determine overall CAPA status
      let overallStatus = 'None';
      if (totalActions > 0) {
        if (completedActions === totalActions) {
          overallStatus = 'Completed';
        } else if (completedActions > 0) {
          overallStatus = 'In Progress';
        } else {
          overallStatus = 'Pending';
        }
      }

      // Find earliest target date for pending actions
      let nextTargetDate = null;
      const pendingWithDates = allActions.filter(a => a.status !== 'Completed' && a.targetDate);
      if (pendingWithDates.length > 0) {
        const dates = pendingWithDates.map(a => new Date(a.targetDate).getTime());
        nextTargetDate = new Date(Math.min(...dates));
      }

      // Collect all unique responsible persons in actions
      const actionResponsible = allActions
        .map(a => a.responsiblePerson)
        .filter(Boolean)
        .map(p => p.trim());
      
      if (inc.responsiblePerson) {
        actionResponsible.push(inc.responsiblePerson.trim());
      }
      
      const uniqueResponsible = Array.from(new Set(actionResponsible)).join(', ');

      return {
        ...inc,
        totalActions,
        completedActions,
        pendingActions,
        overallStatus,
        nextTargetDate,
        uniqueResponsible,
      };
    });
  }, [incidents]);

  // Compute stat card metrics based on total data
  const metrics = useMemo(() => {
    let pendingActionsCount = 0;
    let completedActionsCount = 0;
    let overdueActionsCount = 0;
    let personCategoryCount = 0;
    let systemCategoryCount = 0;
    const now = new Date();

    processedIncidents.forEach((inc) => {
      const corrective = inc.correctiveActions || [];
      const preventive = inc.preventiveActions || [];
      const allActions = [...corrective, ...preventive];

      allActions.forEach((act) => {
        if (act.status === 'Completed') {
          completedActionsCount++;
        } else {
          pendingActionsCount++;
          if (act.targetDate && new Date(act.targetDate) < now) {
            overdueActionsCount++;
          }
        }
      });

      const lowerCat = String(inc.investigationCategory || '').trim().toLowerCase();
      if (lowerCat === 'person') {
        personCategoryCount++;
      } else if (lowerCat === 'system') {
        systemCategoryCount++;
      }
    });

    return {
      pendingActionsCount,
      completedActionsCount,
      overdueActionsCount,
      personCategoryCount,
      systemCategoryCount,
      totalIncidents: processedIncidents.length,
    };
  }, [processedIncidents]);

  // Apply filters and sorting
  const filteredAndSortedIncidents = useMemo(() => {
    let result = [...processedIncidents];

    // 1. Department Filter
    if (department) {
      result = result.filter(inc => inc.department === department);
    }

    // 2. Investigation Category Filter
    if (investigationCategory) {
      if (investigationCategory === 'Unspecified') {
        result = result.filter(inc => !inc.investigationCategory || String(inc.investigationCategory).trim() === '');
      } else {
        result = result.filter(inc => String(inc.investigationCategory).trim().toLowerCase() === investigationCategory.toLowerCase());
      }
    }

    // 3. CAPA Status Filter
    if (capaStatus) {
      if (capaStatus === 'pending') {
        result = result.filter(inc => inc.pendingActions > 0);
      } else if (capaStatus === 'completed') {
        result = result.filter(inc => inc.totalActions > 0 && inc.pendingActions === 0);
      } else if (capaStatus === 'none') {
        result = result.filter(inc => inc.totalActions === 0);
      }
    }

    // 4. Keyword Search
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      result = result.filter(inc => {
        const incidentIdMatch = inc.incidentId?.toLowerCase().includes(query);
        const descMatch = inc.description?.toLowerCase().includes(query);
        const briefMatch = inc.brief?.toLowerCase().includes(query);
        const rootCauseMatch = inc.rootCause?.toLowerCase().includes(query) || 
          (inc.rootCauses && inc.rootCauses.some(rc => rc.toLowerCase().includes(query)));
        
        const actionMatch = 
          (inc.correctiveActions && inc.correctiveActions.some(ca => ca.description.toLowerCase().includes(query))) ||
          (inc.preventiveActions && inc.preventiveActions.some(pa => pa.description.toLowerCase().includes(query))) ||
          inc.capa?.toLowerCase().includes(query);
        
        const responsibleMatch = inc.uniqueResponsible?.toLowerCase().includes(query);

        return incidentIdMatch || descMatch || briefMatch || rootCauseMatch || actionMatch || responsibleMatch;
      });
    }

    // 5. Apply Sorting
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      // Handle null/undefined values
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      // Handle dates specifically
      if (sortBy === 'dateTime' || sortBy === 'nextTargetDate') {
        const timeA = valA ? new Date(valA).getTime() : 0;
        const timeB = valB ? new Date(valB).getTime() : 0;
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      // String sorting
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
      if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [processedIncidents, department, investigationCategory, capaStatus, search, sortBy, sortOrder]);

  return (
    <DashboardLayout title="Investigation & CAPA Panel" subtitle="System-wide Corrective Actions and Root Cause Tracker">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Stats Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card animate-fadeIn">
          <div className="stat-card-icon" style={{ background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c' }}>
            <Clock size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Pending CAPA Actions</span>
            <span className="stat-card-value">{metrics.pendingActionsCount}</span>
          </div>
        </div>

        <div className="stat-card animate-fadeIn" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(220, 38, 38, 0.1)', color: 'var(--color-danger)' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Overdue Actions</span>
            <span className="stat-card-value" style={{ color: metrics.overdueActionsCount > 0 ? 'var(--color-danger)' : 'inherit' }}>
              {metrics.overdueActionsCount}
            </span>
          </div>
        </div>

        <div className="stat-card animate-fadeIn" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Completed Actions</span>
            <span className="stat-card-value">{metrics.completedActionsCount}</span>
          </div>
        </div>

        <div className="stat-card animate-fadeIn">
          <div className="stat-card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary-600)' }}>
            <UserCheck size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Person-Caused Incidents</span>
            <span className="stat-card-value">{metrics.personCategoryCount}</span>
          </div>
        </div>

        <div className="stat-card animate-fadeIn">
          <div className="stat-card-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Building size={22} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">System-Caused Incidents</span>
            <span className="stat-card-value">{metrics.systemCategoryCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Card Panel */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div className="grid grid-4" style={{ gap: '16px' }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Search Tracker</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search Incident ID, Root Cause, Action, Responsible Person..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input form-input--light"
                style={{ paddingRight: '40px' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--color-gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
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
            <label className="form-label">Investigation Category</label>
            <select
              value={investigationCategory}
              onChange={(e) => setInvestigationCategory(e.target.value)}
              className="form-select--light"
            >
              <option value="">All Categories</option>
              <option value="Person">Person</option>
              <option value="System">System</option>
              <option value="Unspecified">Unspecified / Blank</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">CAPA Action Status</label>
            <select
              value={capaStatus}
              onChange={(e) => setCapaStatus(e.target.value)}
              className="form-select--light"
            >
              <option value="">All Actions Status</option>
              <option value="pending">Has Pending CAPA Actions</option>
              <option value="completed">All CAPAs Completed</option>
              <option value="none">No Actions Defined</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: 'span 3' }} />

          <div className="form-group" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn btn-secondary"
              style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <X size={16} />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Registry */}
      <div className="card" style={{ maxWidth: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--color-gray-200)' }}>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Investigations & CAPAs Log</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
              Showing {filteredAndSortedIncidents.length} of {processedIncidents.length} incidents
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '16px' }}>
              <Spinner size="lg" />
              <p style={{ color: 'var(--color-gray-500)', fontSize: '13px' }}>Querying secure CAPA index...</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('incidentId')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Incident ID <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline-block' }} />
                  </th>
                  <th onClick={() => handleSort('dateTime')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Date <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline-block' }} />
                  </th>
                  <th onClick={() => handleSort('department')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Department <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline-block' }} />
                  </th>
                  <th onClick={() => handleSort('investigationCategory')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Inv. Category <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline-block' }} />
                  </th>
                  <th>Root Cause Analysis</th>
                  <th>CAPA Action Progress</th>
                  <th>Responsible Person(s)</th>
                  <th onClick={() => handleSort('nextTargetDate')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Next Target <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline-block' }} />
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedIncidents.map((incident) => {
                  const hasPending = incident.pendingActions > 0;
                  const isCompleted = incident.totalActions > 0 && incident.pendingActions === 0;

                  return (
                    <tr key={incident._id} className="table-row-hover">
                      {/* ID */}
                      <td style={{ fontWeight: '600', color: 'var(--color-primary-700)', whiteSpace: 'nowrap' }}>
                        <Link href={`/incidents/${incident._id}?tab=capa`} title="Access CAPA Tracker">
                          {incident.incidentId}
                        </Link>
                      </td>
                      {/* Date */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(incident.dateTime).toLocaleDateString([], { dateStyle: 'short' })}
                      </td>
                      {/* Department */}
                      <td>{incident.department}</td>
                      {/* Inv Category */}
                      <td>
                        {incident.investigationCategory ? (
                          <span className={`badge badge--status-${String(incident.investigationCategory).trim().toLowerCase() === 'person' ? 'pending' : 'open'}`} style={{ textTransform: 'uppercase', fontSize: '10.5px' }}>
                            {incident.investigationCategory}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-gray-400)', fontStyle: 'italic', fontSize: '11.5px' }}>Unspecified</span>
                        )}
                      </td>
                      {/* Root Cause */}
                      <td style={{ maxWidth: '250px' }}>
                        <div style={{ maxHeight: '60px', overflowY: 'auto', fontSize: '12.5px', color: 'var(--color-gray-700)', lineHeight: '1.4' }}>
                          {(() => {
                            if (incident.rootCauses && incident.rootCauses.length > 0) {
                              return incident.rootCauses.map((rc, index) => (
                                <div key={index} style={{ marginBottom: '2px', display: 'flex', gap: '4px' }}>
                                  <span>•</span> <span>{rc}</span>
                                </div>
                              ));
                            }
                            if (incident.rootCause) {
                              return <p style={{ margin: 0 }}>{incident.rootCause}</p>;
                            }
                            return <span style={{ color: 'var(--color-gray-400)', fontStyle: 'italic' }}>No RCA details</span>;
                          })()}
                        </div>
                      </td>
                      {/* CAPA Progress */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
                          {incident.totalActions > 0 ? (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600' }}>
                                <span style={{
                                  color: isCompleted ? 'var(--color-success)' : hasPending ? 'var(--color-warning-800)' : 'inherit'
                                }}>
                                  {isCompleted ? 'Completed' : 'In Progress'}
                                </span>
                                <span>{incident.completedActions} / {incident.totalActions} Done</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: 'var(--color-gray-200)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${(incident.completedActions / incident.totalActions) * 100}%`,
                                    height: '100%',
                                    background: isCompleted ? 'var(--color-success)' : 'var(--color-warning)',
                                    borderRadius: '3px'
                                  }}
                                />
                              </div>
                            </>
                          ) : (
                            <span className="badge badge--status-open" style={{ background: 'var(--color-gray-100)', color: 'var(--color-gray-500)', border: 'none', alignSelf: 'flex-start' }}>
                              No Actions Defined
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Responsible Person */}
                      <td style={{ fontSize: '12.5px', color: 'var(--color-gray-700)' }}>
                        {incident.uniqueResponsible || (
                          <span style={{ color: 'var(--color-gray-400)', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>
                      {/* Next Target Date */}
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12.5px' }}>
                        {incident.nextTargetDate ? (
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: incident.nextTargetDate < new Date() ? 'var(--color-danger)' : 'inherit',
                            fontWeight: incident.nextTargetDate < new Date() ? 'bold' : 'normal'
                          }}>
                            <Calendar size={12} />
                            {incident.nextTargetDate.toLocaleDateString([], { dateStyle: 'short' })}
                            {incident.nextTargetDate < new Date() && ' (Overdue)'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-gray-400)', fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                      {/* Action */}
                      <td>
                        <Link
                          href={`/incidents/${incident._id}?tab=capa`}
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Access Investigation & CAPA Tracker"
                          style={{ border: '1px solid var(--color-gray-200)' }}
                        >
                          <Eye size={15} color="var(--color-primary-600)" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filteredAndSortedIncidents.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>
                      No matching investigation or CAPA records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
