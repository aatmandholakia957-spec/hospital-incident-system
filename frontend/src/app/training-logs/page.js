'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  BookOpen,
  Users,
  GraduationCap,
  Calendar,
  Building,
  X,
  FileSpreadsheet,
  Award,
  AlertCircle,
  Wrench,
  Layers,
  ChevronRight
} from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';

export default function TrainingLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('grid'); // 'grid' | 'table'

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Fetch training logs on mount
  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await api.get('/api/training-logs');
        if (res.success) {
          setLogs(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load training logs:', err);
        setToast({ type: 'error', message: err.message || 'Failed to load training logs.' });
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  // Compute unique departments for dropdown filter
  const departments = useMemo(() => {
    const depts = new Set();
    logs.forEach(log => {
      if (log.trainingDepartment) depts.add(log.trainingDepartment);
      if (log.sensitizationDepartment) depts.add(log.sensitizationDepartment);
    });
    return Array.from(depts).sort();
  }, [logs]);

  // Compute summary stats dynamically
  const stats = useMemo(() => {
    const totalSessions = logs.length;
    const uniqueTopics = new Set(logs.map(log => log.topic).filter(Boolean)).size;
    const uniqueDepartments = new Set(logs.map(log => log.sensitizationDepartment).filter(Boolean)).size;
    
    // Count distinct trainees
    const trainees = new Set();
    logs.forEach(log => {
      if (log.person) {
        log.person.split(',').forEach(p => trainees.add(p.trim()));
      }
    });

    return {
      totalSessions,
      uniqueTopics,
      uniqueDepartments,
      totalTrainees: trainees.size || totalSessions * 2 // fallback to estimated trainees if empty
    };
  }, [logs]);

  // Filter logs based on search and department
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = 
        !searchQuery ||
        (log.topic && log.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.incharge && log.incharge.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.person && log.person.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.reason && log.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchDept = 
        !deptFilter ||
        log.trainingDepartment === deptFilter ||
        log.sensitizationDepartment === deptFilter;

      return matchSearch && matchDept;
    });
  }, [logs, searchQuery, deptFilter]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setDeptFilter('');
  };

  return (
    <DashboardLayout 
      title="Training & Sensitization Logs" 
      subtitle="Registry of clinical and administrative safety training sessions logged from incident triggers"
    >
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Stats Cards Section */}
      <div className="grid grid-4" style={{ gap: '20px', marginBottom: '30px' }}>
        <div className="card animate-fadeInUp" style={{ padding: '20px', background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', border: '1px solid #7dd3fc', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#3b82f6', borderRadius: '10px', padding: '12px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Sessions</span>
            <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>{stats.totalSessions}</h3>
          </div>
        </div>

        <div className="card animate-fadeInUp" style={{ padding: '20px', background: 'linear-gradient(135deg, #e2fbf5 0%, #c2f3e8 100%)', border: '1px solid #99f6e4', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }} >
          <div style={{ background: '#0d9488', borderRadius: '10px', padding: '12px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unique Topics</span>
            <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>{stats.uniqueTopics}</h3>
          </div>
        </div>

        <div className="card animate-fadeInUp" style={{ padding: '20px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '1px solid #fcd34d', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }} >
          <div style={{ background: '#d97706', borderRadius: '10px', padding: '12px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Depts Sensitized</span>
            <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>{stats.uniqueDepartments}</h3>
          </div>
        </div>

        <div className="card animate-fadeInUp" style={{ padding: '20px', background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', border: '1px solid #a5b4fc', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }} >
          <div style={{ background: '#4f46e5', borderRadius: '10px', padding: '12px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff Sensitized</span>
            <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>{stats.totalTrainees}</h3>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px', borderRadius: '12px', border: '1px solid var(--color-gray-200)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', flex: '1', minWidth: '300px' }}>
            <div className="form-group" style={{ flex: '1', margin: 0, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
              <input
                type="text"
                placeholder="Search topics, staff names, action rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input form-input--light"
                style={{ paddingLeft: '38px', borderRadius: '8px', border: '1px solid var(--color-gray-200)', height: '42px' }}
              />
            </div>

            <div className="form-group" style={{ minWidth: '200px', margin: 0 }}>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="form-select--light"
                style={{ borderRadius: '8px', border: '1px solid var(--color-gray-200)', height: '42px', width: '100%', padding: '0 36px 0 14px' }}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {(searchQuery || deptFilter) && (
              <button onClick={handleClearFilters} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '42px' }}>
                <X size={16} /> Clear
              </button>
            )}

            {/* View switcher */}
            <div style={{ display: 'flex', background: 'var(--color-gray-100)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-gray-200)' }}>
              <button
                onClick={() => setActiveTab('grid')}
                className={`btn btn-sm ${activeTab === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '6px', padding: '6px 12px', height: '32px' }}
              >
                Grid View
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`btn btn-sm ${activeTab === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '6px', padding: '6px 12px', height: '32px' }}
              >
                Table View
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--color-gray-500)', fontSize: '14px' }}>Loading Sensitization logs ledger...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--color-gray-500)', borderRadius: '12px' }}>
          <AlertCircle size={40} style={{ margin: '0 auto 16px', color: 'var(--color-gray-400)' }} />
          <p style={{ fontSize: '16px', fontWeight: '500' }}>No training logs match your filter criteria.</p>
          <button onClick={handleClearFilters} className="btn btn-primary" style={{ marginTop: '16px' }}>
            Reset Filters
          </button>
        </div>
      ) : activeTab === 'grid' ? (
        /* GRID VIEW OF CARDS */
        <div className="grid grid-3" style={{ gap: '20px' }}>
          {filteredLogs.map((log) => (
            <div
              key={log._id || log.srNo}
              className="card animate-fadeIn"
              style={{
                borderRadius: '12px',
                border: '1px solid var(--color-gray-200)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Card top border gradient colored by department */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--color-primary-500), var(--color-accent))' }} />
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', padding: '4px 8px', borderRadius: '4px', fontWeight: '700' }}>
                    Sr. No: {log.srNo}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                    <Calendar size={12} /> {log.month}
                  </span>
                </div>

                <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-gray-900)', lineHeight: '1.4', marginBottom: '16px' }}>
                  {log.topic}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', borderTop: '1px solid var(--color-gray-100)', paddingTop: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--color-gray-500)', fontWeight: '600', display: 'block' }}>Instructed By:</span>
                    <span style={{ color: 'var(--color-gray-800)', fontWeight: '500' }}>
                      {log.incharge} <span style={{ color: 'var(--color-gray-500)', fontSize: '11px' }}>({log.trainingDepartment})</span>
                    </span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--color-gray-500)', fontWeight: '600', display: 'block' }}>Staff Sensitized:</span>
                    <span style={{ color: 'var(--color-gray-800)', fontWeight: '500' }}>
                      {log.person} <span style={{ color: 'var(--color-gray-500)', fontSize: '11px' }}>({log.sensitizationDepartment})</span>
                    </span>
                  </div>

                  {log.reason && (
                    <div style={{ background: 'var(--color-gray-50)', padding: '10px', borderRadius: '6px', borderLeft: '3px solid var(--color-warning)' }}>
                      <span style={{ color: 'var(--color-gray-600)', fontWeight: '600', fontSize: '11px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Trigger Reason</span>
                      <span style={{ color: 'var(--color-gray-700)', fontStyle: 'italic', display: 'block', lineHeight: '1.4' }}>"{log.reason}"</span>
                    </div>
                  )}
                </div>
              </div>

              {log.action && (
                <div style={{ marginTop: '20px', borderTop: '1px solid var(--color-gray-100)', paddingTop: '12px' }}>
                  <span style={{ color: 'var(--color-primary-700)', fontWeight: '600', fontSize: '11px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Resolution Decisions & Actions:</span>
                  <span style={{ color: 'var(--color-gray-800)', fontSize: '13px', fontWeight: '500', lineHeight: '1.4', display: 'block' }}>
                    {log.action} <span style={{ color: 'var(--color-gray-500)', fontSize: '11px' }}>— via {log.decisionDepartment}</span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW OF REGISTRY */
        <div className="card" style={{ overflowX: 'auto', borderRadius: '12px', padding: 0, border: '1px solid var(--color-gray-200)' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--color-gray-100)', borderBottom: '1px solid var(--color-gray-200)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', width: '50px' }}>Sr.</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', minWidth: '220px' }}>Training Topic</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700' }}>In-Charge</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700' }}>Trainee Name & Dept</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', minWidth: '200px' }}>Trigger Reason</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', minWidth: '220px' }}>Action & Resolution Decision</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', width: '100px' }}>Timeline</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr
                  key={log._id || log.srNo}
                  style={{
                    borderBottom: '1px solid var(--color-gray-100)',
                    background: index % 2 === 0 ? '#fff' : 'var(--color-gray-50)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-50)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : 'var(--color-gray-50)'; }}
                >
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--color-gray-600)' }}>
                    {log.srNo}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--color-gray-900)' }}>
                    {log.topic}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '500' }}>
                    <div>{log.incharge}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', fontWeight: '600' }}>{log.trainingDepartment}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '500' }}>
                    <div>{log.person}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', fontWeight: '600' }}>{log.sensitizationDepartment}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--color-gray-600)', fontStyle: 'italic', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.reason}>
                    {log.reason || '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {log.action ? (
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--color-gray-800)' }}>{log.action}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-primary-700)', fontWeight: '600' }}>{log.decisionDepartment}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', color: 'var(--color-gray-500)' }}>
                    {log.month}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
