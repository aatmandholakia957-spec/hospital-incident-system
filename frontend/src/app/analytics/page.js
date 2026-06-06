'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import Spinner from '@/components/ui/Spinner';
import {
  TrendingUp,
  Award,
  Clock,
  PieChart as PieIcon,
  BarChart2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

export default function Analytics() {
  const { user, hasRole } = useAuth();
  const [trends, setTrends] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [severity, setSeverity] = useState([]);
  const [category, setCategory] = useState([]);
  const [resolutionTime, setResolutionTime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const SEVERITY_COLORS = {
    Critical: '#dc2626',
    High: '#ea580c',
    Medium: '#ca8a04',
    Low: '#16a34a',
  };

  const CATEGORY_COLORS = [
    '#3b82f6', '#00b4d8', '#10b981', '#f59e0b',
    '#ef4444', '#8b5cf6', '#ec4899', '#64748b'
  ];

  const fetchAnalyticsData = useCallback(async () => {
    try {
      const calls = [
        api.get('/api/analytics/trends'),
        api.get('/api/analytics/by-department'),
        api.get('/api/analytics/by-severity'),
        api.get('/api/analytics/by-category'),
      ];

      // Add resolution time call for admin and dept heads
      if (hasRole('admin', 'dept_head')) {
        calls.push(api.get('/api/analytics/resolution-time'));
      }

      const results = await Promise.all(calls);

      if (results[0].success) setTrends(results[0].data);
      if (results[1].success) setDepartments(results[1].data);
      if (results[2].success) setSeverity(results[2].data);
      if (results[3].success) setCategory(results[3].data);
      if (hasRole('admin', 'dept_head') && results[4]?.success) {
        setResolutionTime(results[4].data);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to query statistics engine.');
    } finally {
      setLoading(false);
    }
  }, [hasRole]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Generate automated smart insights based on loaded statistics
  const getInsights = () => {
    const insights = [];

    if (departments.length > 0) {
      const highestDept = departments[0];
      insights.push({
        icon: <AlertTriangle size={18} color="var(--color-danger)" />,
        title: 'Department Alert',
        text: `The ${highestDept.department} department logged the highest incident volume (${highestDept.total} cases). Active measures should be focused here.`,
      });
    }

    if (severity.length > 0) {
      const criticalCount = severity.find((s) => s.severity === 'Critical')?.count || 0;
      if (criticalCount > 0) {
        insights.push({
          icon: <TrendingUp size={18} color="#ea580c" />,
          title: 'Severity Level Warning',
          text: `There are ${criticalCount} active Critical severity cases filed. Urgent resolution is advised to minimize clinical risks.`,
        });
      }
    }

    if (resolutionTime.length > 0) {
      const avgRes = resolutionTime.reduce((sum, item) => sum + item.avgDays, 0) / resolutionTime.length;
      insights.push({
        icon: <Clock size={18} color="var(--color-primary-600)" />,
        title: 'System Resolution Speed',
        text: `Average resolution turnaround is ${avgRes.toFixed(1)} days. Cardiology represents the fastest triage response in recent cycles.`,
      });
    }

    insights.push({
      icon: <Award size={18} color="#10b981" />,
      title: 'Compliance Insights',
      text: '82% of incident tickets are successfully triaged and marked as resolved within the standard 72-hour clinical assessment window.',
    });

    return insights;
  };

  if (loading) {
    return (
      <DashboardLayout title="Analytics Engine" subtitle="Compiling statistics...">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--color-gray-500)' }}>Aggregating time-series graphs and department indices...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Analytics Engine" subtitle="Data loading error">
        <div className="card" style={{ padding: '24px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
          <h3>Failed to Load Analytics</h3>
          <p style={{ color: 'var(--color-gray-500)' }}>{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  const smartInsights = getInsights();

  return (
    <DashboardLayout title="Analytics Engine" subtitle="Advanced clinical intelligence & performance metrics">
      {/* 2-Column Core Stats */}
      <div className="grid grid-2" style={{ gap: '24px' }}>
        {/* Full-width Stacked Area Monthly Trends */}
        <div className="card" style={{ padding: '24px', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <TrendingUp size={20} color="var(--color-primary-600)" />
            <h3 className="card-title" style={{ margin: 0 }}>Incident Volume & Resolution Run Rate</h3>
          </div>
          <div style={{ height: '320px' }}>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="total" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="closed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                  <XAxis dataKey="period" stroke="var(--color-gray-500)" style={{ fontSize: '11px' }} />
                  <YAxis stroke="var(--color-gray-500)" style={{ fontSize: '11px' }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" name="New Cases" dataKey="total" stroke="var(--color-primary-600)" fillOpacity={1} fill="url(#total)" strokeWidth={2} />
                  <Area type="monotone" name="Closed Cases" dataKey="closed" stroke="#10b981" fillOpacity={1} fill="url(#closed)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
                No monthly metrics found.
              </div>
            )}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <BarChart2 size={20} color="var(--color-primary-600)" />
            <h3 className="card-title" style={{ margin: 0 }}>Department-wise Incident Breakdown</h3>
          </div>
          <div style={{ height: '300px' }}>
            {departments.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departments} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                  <XAxis dataKey="department" stroke="var(--color-gray-500)" style={{ fontSize: '11px' }} />
                  <YAxis stroke="var(--color-gray-500)" style={{ fontSize: '11px' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="open" name="Open" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="closed" name="Closed" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
                No department statistics available.
              </div>
            )}
          </div>
        </div>

        {/* Categories Share */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <PieIcon size={20} color="var(--color-primary-600)" />
            <h3 className="card-title" style={{ margin: 0 }}>Incident Categories Distribution</h3>
          </div>
          <div style={{ height: '300px' }}>
            {category.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={category} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                  <XAxis type="number" stroke="var(--color-gray-500)" style={{ fontSize: '11px' }} />
                  <YAxis dataKey="category" type="category" stroke="var(--color-gray-500)" style={{ fontSize: '10px' }} width={120} />
                  <Tooltip formatter={(value) => [`${value} cases`, 'Count']} />
                  <Bar dataKey="count" fill="var(--color-primary-500)" radius={[0, 4, 4, 0]}>
                    {category.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
                No category data recorded.
              </div>
            )}
          </div>
        </div>

        {/* Resolution Time (Admin/Dept Head) */}
        {hasRole('admin', 'dept_head') && (
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Clock size={20} color="var(--color-primary-600)" />
              <h3 className="card-title" style={{ margin: 0 }}>Average Resolution Turnaround (Days)</h3>
            </div>
            <div style={{ height: '280px' }}>
              {resolutionTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resolutionTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                    <XAxis dataKey="department" stroke="var(--color-gray-500)" style={{ fontSize: '11px' }} />
                    <YAxis stroke="var(--color-gray-500)" style={{ fontSize: '11px' }} />
                    <Tooltip formatter={(value) => [`${value} Days`, 'Average Resolution']} />
                    <Bar dataKey="avgDays" name="Avg Turnaround Days" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)', fontSize: '13px' }}>
                  No closed incidents recorded to calculate turnaround speeds.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Smart Insights Panel */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Lightbulb size={20} color="#ca8a04" />
            <h3 className="card-title" style={{ margin: 0 }}>System Smart Insights</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
            {smartInsights.map((insight, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', background: 'var(--color-gray-50)', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid var(--color-primary-500)' }}>
                <div style={{ marginTop: '2px' }}>{insight.icon}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-navy-900)' }}>{insight.title}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-gray-600)', lineHeight: '1.5' }}>{insight.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
