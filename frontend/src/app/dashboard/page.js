'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [deptData, setDeptData] = useState([]);
  const [severityData, setSeverityData] = useState([]);
  const [phaseData, setPhaseData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const SEVERITY_COLORS = {
    Critical: '#dc2626',
    High: '#ea580c',
    Medium: '#ca8a04',
    Low: '#16a34a',
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const [summaryRes, deptRes, severityRes, trendRes, incidentsRes, phaseRes] = await Promise.all([
        api.get('/api/analytics/summary'),
        api.get('/api/analytics/by-department'),
        api.get('/api/analytics/by-severity'),
        api.get('/api/analytics/trends'),
        api.get('/api/incidents', { limit: 10, sortBy: 'dateTime', sortOrder: 'desc' }),
        api.get('/api/analytics/by-phase'),
      ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (deptRes.success) setDeptData(deptRes.data);
      if (severityRes.success) setSeverityData(severityRes.data);
      if (trendRes.success) setTrendData(trendRes.data);
      if (incidentsRes.success) setRecentIncidents(incidentsRes.data.incidents || incidentsRes.data);
      if (phaseRes.success) setPhaseData(phaseRes.data);
      setError('');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <DashboardLayout title="Overview" subtitle="Real-time incident management dashboard">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--color-gray-500)' }}>Aggregating system statistics...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Overview" subtitle="Real-time incident management dashboard">
        <div className="card" style={{ padding: '24px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
          <ShieldAlert size={48} color="var(--color-danger)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ marginBottom: '8px' }}>Connection Failure</h3>
          <p style={{ color: 'var(--color-gray-500)', marginBottom: '20px' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => { setLoading(true); fetchDashboardData(); }}>
            Retry Connection
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Overview" subtitle="Real-time incident management dashboard">
      {/* Summary Cards Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary-600)' }}>
            <Activity size={24} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Total Incidents</span>
            <span className="stat-card-value">{summary?.total || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Open Incidents</span>
            <span className="stat-card-value">{summary?.open || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={24} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Pending Reviews</span>
            <span className="stat-card-value">{summary?.pending || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Closed / Resolved</span>
            <span className="stat-card-value">{summary?.closed || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
            <ShieldAlert size={24} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Active Critical</span>
            <span className="stat-card-value">{summary?.critical || 0}</span>
          </div>
        </div>
      </div>

      {/* CAPA Status Registry Row */}
      <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-navy-900)', marginTop: '24px', marginBottom: '12px' }}>
        Corrective & Preventive Action (CAPA) Metrics
      </h3>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: '24px' }}>
        <div className="stat-card animate-fadeIn">
          <div className="stat-card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary-600)' }}>
            <Clock size={24} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Pending CAPAs</span>
            <span className="stat-card-value">{summary?.capaStats?.pending || 0}</span>
          </div>
        </div>

        <div className="stat-card animate-fadeIn" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(220, 38, 38, 0.1)', color: 'var(--color-danger)' }}>
            <ShieldAlert size={24} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Overdue CAPAs</span>
            <span className="stat-card-value" style={{ color: (summary?.capaStats?.overdue || 0) > 0 ? 'var(--color-danger)' : 'inherit' }}>
              {summary?.capaStats?.overdue || 0}
            </span>
          </div>
        </div>

        <div className="stat-card animate-fadeIn" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Completed CAPAs</span>
            <span className="stat-card-value">{summary?.capaStats?.completed || 0}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-2" style={{ marginTop: '24px' }}>
        {/* Trend Area Chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <TrendingUp size={20} color="var(--color-primary-600)" />
            <h3 className="card-title" style={{ margin: 0 }}>Incident Trends (12 Months)</h3>
          </div>
          <div style={{ height: '300px' }}>
            {mounted && trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="criticalColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                  <XAxis dataKey="period" stroke="var(--color-gray-500)" style={{ fontSize: '11px' }} />
                  <YAxis stroke="var(--color-gray-500)" style={{ fontSize: '11px' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                  <Area type="monotone" name="Total Cases" dataKey="total" stroke="var(--color-primary-600)" fillOpacity={1} fill="url(#totalColor)" strokeWidth={2} />
                  <Area type="monotone" name="Critical" dataKey="critical" stroke="#dc2626" fillOpacity={1} fill="url(#criticalColor)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : !mounted ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
                Loading chart metrics...
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
                No trend data recorded.
              </div>
            )}
          </div>
        </div>

        {/* Severity Donut Chart & Dept Bar Chart Grid */}
        <div className="grid grid-1" style={{ gap: '24px' }}>
          <div className="grid grid-2" style={{ gap: '24px' }}>
            {/* Severity Pie Chart */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <h3 className="card-title" style={{ marginBottom: '16px' }}>Severity Distribution</h3>
              <div style={{ flex: 1, height: '160px', position: 'relative' }}>
                {mounted && severityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="severity"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || '#cbd5e1'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} incidents`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : !mounted ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)', fontSize: '12px' }}>
                    Loading...
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)', fontSize: '13px' }}>
                    No incident data
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                {severityData.map((d) => (
                  <div key={d.severity} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '500' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: SEVERITY_COLORS[d.severity] }} />
                    <span style={{ color: 'var(--color-gray-600)' }}>{d.severity}:</span>
                    <span style={{ color: 'var(--color-gray-900)' }}>{d.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Department breakdown brief */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <h3 className="card-title" style={{ marginBottom: '12px' }}>Top Departments</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'center' }}>
                {deptData.slice(0, 4).map((dept, index) => (
                  <div key={dept.department} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '500' }}>
                      <span style={{ color: 'var(--color-gray-700)' }}>{dept.department}</span>
                      <span style={{ color: 'var(--color-gray-900)' }}>{dept.total} incidents</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--color-gray-200)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, (dept.total / (summary?.total || 1)) * 100)}%`,
                          height: '100%',
                          background: index === 0 ? 'var(--color-primary-600)' : index === 1 ? 'var(--color-accent)' : 'var(--color-gray-400)',
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                  </div>
                ))}
                {deptData.length === 0 && (
                  <span style={{ color: 'var(--color-gray-400)', textAlign: 'center', fontSize: '12px' }}>
                    No department entries yet.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Workflow Phase Distribution */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h3 className="card-title" style={{ marginBottom: '16px' }}>Workflow Phase Distribution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {phaseData.map((phaseItem, index) => {
                const colors = ['var(--color-primary-500)', 'var(--color-warning)', '#8b5cf6', 'var(--color-success)'];
                const percent = summary?.total > 0 ? (phaseItem.count / summary.total) * 100 : 0;
                return (
                  <div key={phaseItem.phase} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '500' }}>
                      <span style={{ color: 'var(--color-gray-700)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[index] || 'var(--color-gray-400)' }} />
                        {phaseItem.name}
                      </span>
                      <span style={{ color: 'var(--color-gray-900)' }}>{phaseItem.count} cases ({Math.round(percent)}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--color-gray-100)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percent}%`,
                          height: '100%',
                          background: colors[index] || 'var(--color-gray-400)',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease-out'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Incidents Table */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--color-gray-200)' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Recent System Incidents</h3>
          <Link href="/incidents" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            View Full Registry <ChevronRight size={16} />
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Date / Time</th>
                <th>Department</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Reported By</th>
                <th style={{ textAlign: 'center' }}>CAPA Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentIncidents.map((incident) => (
                <tr
                  key={incident._id}
                  onClick={() => router.push(`/incidents/${incident._id}`)}
                  style={{ cursor: 'pointer' }}
                  className="table-row-hover"
                >
                  <td style={{ fontWeight: '600', color: 'var(--color-primary-700)' }}>
                    {incident.incidentId}
                  </td>
                  <td>
                    {new Date(incident.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td>{incident.department}</td>
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
                  <td>{incident.reportedBy?.name || incident.reportedBy || 'Unknown'}</td>
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/incidents/${incident._id}?tab=capa`}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      Track CAPA
                    </Link>
                  </td>
                </tr>
              ))}
              {recentIncidents.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-gray-400)' }}>
                    No incidents logged in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
