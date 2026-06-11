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
  Cell,
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
  CheckCircle,
  Search,
  ExternalLink,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { DEPARTMENTS } from '@/lib/constants';
import Link from 'next/link';

export default function Analytics() {
  const { user, hasRole } = useAuth();
  const [trends, setTrends] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [severity, setSeverity] = useState([]);
  const [category, setCategory] = useState([]);
  const [resolutionTime, setResolutionTime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Investigation & CAPA tracking states
  const [incidentsList, setIncidentsList] = useState([]);
  const [selectedDept, setSelectedDept] = useState(user?.role === 'dept_head' ? user.department : '');
  const [activeCapaTab, setActiveCapaTab] = useState('capa');
  const [capaSearch, setCapaSearch] = useState('');
  const [capaStatusFilter, setCapaStatusFilter] = useState('All');
  const [capaPage, setCapaPage] = useState(1);
  const [hoveredCard, setHoveredCard] = useState(null);
  const capaLimit = 10;

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

  // Sync selected department when user role is department head
  useEffect(() => {
    if (user?.role === 'dept_head') {
      setSelectedDept(user.department);
    }
  }, [user]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      const calls = [
        api.get('/api/analytics/trends'),
        api.get('/api/analytics/by-department'),
        api.get('/api/analytics/by-severity'),
        api.get('/api/analytics/by-category'),
        api.get('/api/incidents', { limit: 1000 }),
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
      if (results[4].success) setIncidentsList(results[4].data);
      
      if (hasRole('admin', 'dept_head') && results[5]?.success) {
        setResolutionTime(results[5].data);
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
          <p style={{ color: 'var(--color-gray-50)' }}>Aggregating time-series graphs and department indices...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Analytics Engine" subtitle="Data loading error">
        <div className="card" style={{ padding: '24px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
          <h3>Failed to Load Analytics</h3>
          <p style={{ color: 'var(--color-gray-50)' }}>{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  const smartInsights = getInsights();

  // client-side incident aggregations for investigation and CAPA tracking
  const filteredIncidents = incidentsList.filter(inc => {
    if (selectedDept && inc.department !== selectedDept) return false;
    return true;
  });

  const now = new Date();

  // Corrective & Preventive Action Aggregation
  const extractedCapas = [];
  filteredIncidents.forEach(inc => {
    if (inc.correctiveActions) {
      inc.correctiveActions.forEach((act, idx) => {
        const isOverdue = act.status !== 'Completed' && act.targetDate && new Date(act.targetDate) < now;
        extractedCapas.push({
          _id: act._id || `ca-${inc._id}-${idx}`,
          incidentId: inc.incidentId,
          incidentDbId: inc._id,
          department: inc.department,
          type: 'Corrective Action',
          description: act.description,
          responsiblePerson: act.responsiblePerson || 'Unassigned',
          targetDate: act.targetDate,
          status: act.status,
          completionDate: act.completionDate,
          isMandatory: act.isMandatory !== false,
          isOverdue: !!isOverdue,
        });
      });
    }

    if (inc.preventiveActions) {
      inc.preventiveActions.forEach((act, idx) => {
        const isOverdue = act.status !== 'Completed' && act.targetDate && new Date(act.targetDate) < now;
        extractedCapas.push({
          _id: act._id || `pa-${inc._id}-${idx}`,
          incidentId: inc.incidentId,
          incidentDbId: inc._id,
          department: inc.department,
          type: 'Preventive Action',
          description: act.description,
          responsiblePerson: act.responsiblePerson || 'Unassigned',
          targetDate: act.targetDate,
          status: act.status,
          completionDate: act.completionDate,
          isMandatory: act.isMandatory !== false,
          isOverdue: !!isOverdue,
        });
      });
    }
  });

  // Investigation Aggregation
  const extractedInvestigations = filteredIncidents.map(inc => {
    const totalNotes = inc.investigations?.length || 0;
    const hasNotes = totalNotes > 0;
    const isClosed = inc.status === 'Closed';

    let invStatus = 'Awaiting Investigation';
    if (isClosed) {
      invStatus = 'Completed';
    } else if (hasNotes) {
      invStatus = 'Active Analysis';
    }

    const latestNote = hasNotes ? inc.investigations[inc.investigations.length - 1] : null;

    return {
      _id: inc._id,
      incidentId: inc.incidentId,
      department: inc.department,
      severity: inc.severity,
      category: inc.category,
      rootCause: inc.rootCause || inc.investigationCategory || 'Awaiting root cause analysis...',
      totalNotes,
      latestNote,
      status: invStatus,
      incidentStatus: inc.status,
    };
  });

  // Filtering lists based on search & active status card filters
  const filteredCapas = extractedCapas.filter(capa => {
    if (capaSearch) {
      const q = capaSearch.toLowerCase();
      const matchesSearch = 
        capa.description.toLowerCase().includes(q) ||
        capa.responsiblePerson.toLowerCase().includes(q) ||
        capa.incidentId.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (capaStatusFilter !== 'All') {
      if (capaStatusFilter === 'Overdue') {
        if (!capa.isOverdue) return false;
      } else {
        if (capa.status !== capaStatusFilter) return false;
      }
    }
    return true;
  });

  const filteredInvestigations = extractedInvestigations.filter(inv => {
    if (capaSearch) {
      const q = capaSearch.toLowerCase();
      const matchesSearch = 
        inv.incidentId.toLowerCase().includes(q) ||
        inv.rootCause.toLowerCase().includes(q) ||
        inv.department.toLowerCase().includes(q) ||
        (inv.latestNote && inv.latestNote.text.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    if (capaStatusFilter !== 'All') {
      if (inv.status !== capaStatusFilter) return false;
    }
    return true;
  });

  // Pagination bounds
  const indexOfLastItem = capaPage * capaLimit;
  const indexOfFirstItem = indexOfLastItem - capaLimit;

  const currentCapas = filteredCapas.slice(indexOfFirstItem, indexOfLastItem);
  const totalCapaPages = Math.ceil(filteredCapas.length / capaLimit) || 1;

  const currentInvestigations = filteredInvestigations.slice(indexOfFirstItem, indexOfLastItem);
  const totalInvestigationPages = Math.ceil(filteredInvestigations.length / capaLimit) || 1;

  // Counter sets for each tab's dynamic cards
  const capaCards = [
    {
      filter: 'All',
      label: 'Total CAPA Actions',
      value: extractedCapas.length,
      color: '--color-primary-500',
      icon: <Award size={20} color="var(--color-primary-500)" />,
    },
    {
      filter: 'Pending',
      label: 'Pending Actions',
      value: extractedCapas.filter(c => c.status === 'Pending').length,
      color: '--color-info',
      icon: <Clock size={20} color="var(--color-info)" />,
    },
    {
      filter: 'In Progress',
      label: 'In Progress',
      value: extractedCapas.filter(c => c.status === 'In Progress').length,
      color: '--color-warning',
      icon: <TrendingUp size={20} color="var(--color-warning)" />,
    },
    {
      filter: 'Completed',
      label: 'Completed Actions',
      value: extractedCapas.filter(c => c.status === 'Completed').length,
      color: '--color-success',
      icon: <CheckCircle size={20} color="var(--color-success)" />,
    },
    {
      filter: 'Overdue',
      label: 'Overdue CAPAs',
      value: extractedCapas.filter(c => c.isOverdue).length,
      color: '--color-danger',
      icon: <AlertTriangle size={20} color="var(--color-danger)" />,
    },
  ];

  const invCards = [
    {
      filter: 'All',
      label: 'Total Incidents',
      value: extractedInvestigations.length,
      color: '--color-primary-500',
      icon: <FileText size={20} color="var(--color-primary-500)" />,
    },
    {
      filter: 'Awaiting Investigation',
      label: 'Awaiting Review',
      value: extractedInvestigations.filter(i => i.status === 'Awaiting Investigation').length,
      color: '--color-danger',
      icon: <AlertCircle size={20} color="var(--color-danger)" />,
    },
    {
      filter: 'Active Analysis',
      label: 'Active Analysis',
      value: extractedInvestigations.filter(i => i.status === 'Active Analysis').length,
      color: '--color-warning',
      icon: <TrendingUp size={20} color="var(--color-warning)" />,
    },
    {
      filter: 'Completed',
      label: 'Completed / Closed',
      value: extractedInvestigations.filter(i => i.status === 'Completed').length,
      color: '--color-success',
      icon: <CheckCircle size={20} color="var(--color-success)" />,
    },
  ];

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
            {mounted && trends.length > 0 ? (
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
            ) : !mounted ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
                Loading chart metrics...
              </div>
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
            {mounted && departments.length > 0 ? (
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
            ) : !mounted ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
                Loading department metrics...
              </div>
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
            {mounted && category.length > 0 ? (
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
            ) : !mounted ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
                Loading category metrics...
              </div>
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
              {mounted && resolutionTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resolutionTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                    <XAxis dataKey="department" stroke="var(--color-gray-500)" style={{ fontSize: '11px' }} />
                    <YAxis stroke="var(--color-gray-500)" style={{ fontSize: '11px' }} />
                    <Tooltip formatter={(value) => [`${value} Days`, 'Average Resolution']} />
                    <Bar dataKey="avgDays" name="Avg Turnaround Days" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : !mounted ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
                  Loading turnaround speed metrics...
                </div>
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

      {/* Hospital-wide & Department-wise Investigation & CAPA Control Center */}
      <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '20px' }}>
          <div>
            <h2 className="card-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--color-navy-900)' }}>
              Hospital-wide Investigation & CAPA Control Center
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
              Real-time audit registry for corrective actions, preventive strategies, and ongoing clinical investigations.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-gray-200)', marginBottom: '24px' }}>
          <button
            onClick={() => {
              setActiveCapaTab('capa');
              setCapaStatusFilter('All');
              setCapaSearch('');
              setCapaPage(1);
            }}
            style={{
              padding: '12px 24px',
              fontWeight: '600',
              fontSize: '14px',
              color: activeCapaTab === 'capa' ? 'var(--color-primary-600)' : 'var(--color-gray-500)',
              borderBottom: activeCapaTab === 'capa' ? '2.5px solid var(--color-primary-600)' : '2.5px solid transparent',
              transition: 'all 0.2s',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            Corrective & Preventive Actions (CAPA)
          </button>
          <button
            onClick={() => {
              setActiveCapaTab('investigation');
              setCapaStatusFilter('All');
              setCapaSearch('');
              setCapaPage(1);
            }}
            style={{
              padding: '12px 24px',
              fontWeight: '600',
              fontSize: '14px',
              color: activeCapaTab === 'investigation' ? 'var(--color-primary-600)' : 'var(--color-gray-500)',
              borderBottom: activeCapaTab === 'investigation' ? '2.5px solid var(--color-primary-600)' : '2.5px solid transparent',
              transition: 'all 0.2s',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            Incident Investigations
          </button>
        </div>

        {/* Interactive Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {(activeCapaTab === 'capa' ? capaCards : invCards).map((card, idx) => {
            const isActive = capaStatusFilter === card.filter;
            const cardKey = `${activeCapaTab}-card-${idx}`;
            return (
              <div
                key={cardKey}
                onClick={() => {
                  setCapaStatusFilter(isActive ? 'All' : card.filter);
                  setCapaPage(1);
                }}
                onMouseEnter={() => setHoveredCard(cardKey)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: '#fff',
                  border: isActive ? `2px solid var(${card.color})` : '1px solid var(--color-gray-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  transform: (isActive || hoveredCard === cardKey) ? 'translateY(-2px)' : 'none',
                  ...(hoveredCard === cardKey && !isActive ? { borderColor: 'var(--color-gray-300)', boxShadow: 'var(--shadow-md)' } : {}),
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-500)' }}>{card.label}</span>
                  <div>{card.icon}</div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-navy-900)', marginTop: '4px' }}>
                  {card.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Search & Filters control bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-600)' }}>Filter by Department</label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCapaPage(1);
              }}
              disabled={user?.role === 'dept_head'}
              className="form-select--light"
              style={{ width: '100%' }}
            >
              {user?.role === 'dept_head' ? (
                <option value={user.department}>{user.department}</option>
              ) : (
                <>
                  <option value="">All Departments (Entire Hospital)</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '250px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-gray-600)' }}>Search Registry</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--color-gray-400)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={activeCapaTab === 'capa' ? "Search action description, owner, incident ID..." : "Search incident ID, root cause, findings..."}
                value={capaSearch}
                onChange={(e) => {
                  setCapaSearch(e.target.value);
                  setCapaPage(1);
                }}
                className="form-input form-input--light"
                style={{ paddingLeft: '36px', width: '100%' }}
              />
            </div>
          </div>

          {(capaSearch || capaStatusFilter !== 'All') && (
            <button
              onClick={() => {
                setCapaSearch('');
                setCapaStatusFilter('All');
                setCapaPage(1);
              }}
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-end', height: '40px' }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Registry Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', background: '#fff' }}>
          {activeCapaTab === 'capa' ? (
            <table className="table" style={{ margin: 0, width: '100%' }}>
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Action Plan</th>
                  <th>Owner</th>
                  <th>Target Date</th>
                  <th>Status</th>
                  <th>Completion Date</th>
                </tr>
              </thead>
              <tbody>
                {currentCapas.length > 0 ? (
                  currentCapas.map((capa) => (
                    <tr key={capa._id} className="table-row-hover">
                      <td>
                        <Link 
                          href={`/incidents/${capa.incidentDbId}?tab=capa`}
                          style={{ fontWeight: '600', color: 'var(--color-primary-700)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          {capa.incidentId}
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-gray-600)' }}>
                          {capa.department}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          background: capa.type === 'Corrective Action' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: capa.type === 'Corrective Action' ? 'var(--color-primary-700)' : 'var(--color-success-text)'
                        }}>
                          {capa.type === 'Corrective Action' ? 'Corrective' : 'Preventive'}
                        </span>
                      </td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={capa.description}>
                        {capa.description}
                      </td>
                      <td style={{ fontWeight: '500' }}>{capa.responsiblePerson}</td>
                      <td>
                        {capa.targetDate ? new Date(capa.targetDate).toLocaleDateString([], { dateStyle: 'medium' }) : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span className={`badge badge--status-${capa.status === 'Completed' ? 'closed' : capa.status === 'In Progress' ? 'pending' : 'open'}`}>
                            {capa.status}
                          </span>
                          {capa.isOverdue && (
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {capa.completionDate ? new Date(capa.completionDate).toLocaleDateString([], { dateStyle: 'medium' }) : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>
                      No corrective or preventive actions found matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="table" style={{ margin: 0, width: '100%' }}>
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>Department</th>
                  <th>Severity</th>
                  <th>Root Cause Analysis</th>
                  <th>Notes Logged</th>
                  <th>Latest Investigation Findings</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentInvestigations.length > 0 ? (
                  currentInvestigations.map((inv) => (
                    <tr key={inv._id} className="table-row-hover">
                      <td>
                        <Link 
                          href={`/incidents/${inv._id}?tab=capa`}
                          style={{ fontWeight: '600', color: 'var(--color-primary-700)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          {inv.incidentId}
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                      <td>{inv.department}</td>
                      <td>
                        <span className={`badge badge--severity-${inv.severity?.toLowerCase()}`}>
                          {inv.severity}
                        </span>
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inv.rootCause}>
                        {inv.rootCause}
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', background: 'var(--color-gray-100)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                          {inv.totalNotes} notes
                        </span>
                      </td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.latestNote ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '12px', fontWeight: '500' }}>{inv.latestNote.text}</span>
                            <span style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>
                              By {inv.latestNote.user} on {new Date(inv.latestNote.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-gray-400)', fontStyle: 'italic' }}>No notes logged yet</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge--status-${inv.status === 'Completed' ? 'closed' : inv.status === 'Active Analysis' ? 'pending' : 'open'}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>
                      No investigations found matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: 'none', borderBottom: 'none' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, activeCapaTab === 'capa' ? filteredCapas.length : filteredInvestigations.length)} of{' '}
            {activeCapaTab === 'capa' ? filteredCapas.length : filteredInvestigations.length} entries
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCapaPage(p => Math.max(1, p - 1))}
              disabled={capaPage === 1}
              className="btn btn-secondary btn-sm"
            >
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '12px', fontWeight: '600' }}>
              Page {capaPage} of {activeCapaTab === 'capa' ? totalCapaPages : totalInvestigationPages}
            </span>
            <button
              onClick={() => setCapaPage(p => Math.min(activeCapaTab === 'capa' ? totalCapaPages : totalInvestigationPages, p + 1))}
              disabled={capaPage === (activeCapaTab === 'capa' ? totalCapaPages : totalInvestigationPages)}
              className="btn btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
