'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { STATUSES } from '@/lib/constants';
import {
  ArrowLeft,
  Calendar,
  User,
  Shield,
  Activity,
  AlertOctagon,
  CheckCircle,
  FileText,
  UserCheck,
  Edit2,
  Trash2,
  Clock,
  Briefcase,
} from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';

export default function IncidentDetail() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const router = useRouter();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Status transition states
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [remarks, setRemarks] = useState('');

  // Interactive sections states
  const [editingCapa, setEditingCapa] = useState(false);
  const [capaText, setCapaText] = useState('');

  const [editingMgmtResponse, setEditingMgmtResponse] = useState(false);
  const [mgmtResponseText, setMgmtResponseText] = useState('');

  const [editingNotices, setEditingNotices] = useState(false);
  const [noticeDetails, setNoticeDetails] = useState('');

  const [editingSensitization, setEditingSensitization] = useState(false);
  const [sensitizationDetails, setSensitizationDetails] = useState('');

  // Sheet tab state: 'sheet1' or 'sheet2'
  const [activeSheetTab, setActiveSheetTab] = useState('sheet1');

  const fetchIncident = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/incidents/${id}`);
      if (res.success) {
        setIncident(res.data);
        setCapaText(res.data.capa || '');
        setMgmtResponseText(res.data.managementResponse || '');
        setNoticeDetails(res.data.noticeDetails || '');
        setSensitizationDetails(res.data.sensitizationDetails || '');
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to load incident detail.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete incident ${incident?.incidentId}?`)) {
      return;
    }

    try {
      const res = await api.del(`/api/incidents/${id}`);
      if (res.success) {
        setToast({ type: 'success', message: 'Incident deleted successfully.' });
        setTimeout(() => router.push('/incidents'), 1500);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to delete incident.' });
    }
  };

  const handleStatusChange = (status) => {
    setTargetStatus(status);
    setRemarks(incident?.remarks || '');
    setShowStatusModal(true);
  };

  const submitStatusChange = async (e) => {
    e.preventDefault();
    setUpdatingStatus(true);

    try {
      const checklistUpdate = { ...incident.checklist };
      const payload = {
        status: targetStatus,
        remarks,
        ...(targetStatus === 'Closed' && { resolutionDate: new Date() }),
      };

      if (targetStatus === 'Closed') {
        checklistUpdate.incidentClosed = true;
        checklistUpdate.resolutionDetailsRecorded = true;
        payload.currentPhase = 4;
      } else if (targetStatus === 'Open') {
        checklistUpdate.incidentClosed = false;
      }
      payload.checklist = checklistUpdate;

      const res = await api.put(`/api/incidents/${id}`, payload);
      if (res.success) {
        setIncident(res.data);
        setToast({ type: 'success', message: `Status updated to ${targetStatus} successfully.` });
        setShowStatusModal(false);
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to update status.' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePhaseChange = async (targetPhase) => {
    if (!hasRole('admin', 'dept_head')) {
      setToast({ type: 'error', message: 'Unauthorized. Only admins and department heads can change workflow phases.' });
      return;
    }

    try {
      const payload = { currentPhase: targetPhase };
      const checklistUpdate = { ...incident.checklist };

      if (targetPhase === 4 && incident.status !== 'Closed') {
        if (window.confirm('Do you want to close this incident as part of transitioning to Phase 4?')) {
          payload.status = 'Closed';
          payload.resolutionDate = new Date();
          checklistUpdate.resolutionDetailsRecorded = true;
          checklistUpdate.incidentClosed = true;
        }
      }
      payload.checklist = checklistUpdate;

      const res = await api.put(`/api/incidents/${id}`, payload);
      if (res.success) {
        setIncident(res.data);
        setToast({ type: 'success', message: `Workflow transitioned to Phase ${targetPhase}` });
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to update workflow phase.' });
    }
  };

  const toggleChecklistItem = async (itemName, phaseNum) => {
    if (!hasRole('admin', 'dept_head')) {
      setToast({ type: 'error', message: 'Unauthorized. Only admins and department heads can manage the checklist.' });
      return;
    }

    if (incident.currentPhase < phaseNum) {
      setToast({ type: 'warning', message: `Advance to Phase ${phaseNum} first to record steps in this stage.` });
      return;
    }

    try {
      const currentVal = incident.checklist?.[itemName] || false;
      const updatedChecklist = {
        ...incident.checklist,
        [itemName]: !currentVal,
      };

      const payload = { checklist: updatedChecklist };

      if (itemName === 'noticesIssuedChecked') {
        payload.noticesIssued = !currentVal;
      } else if (itemName === 'sensitizationDoneChecked') {
        payload.sensitizationDone = !currentVal;
      } else if (itemName === 'incidentClosed') {
        payload.status = !currentVal ? 'Closed' : 'Open';
        payload.resolutionDate = !currentVal ? new Date() : null;
        updatedChecklist.resolutionDetailsRecorded = !currentVal;
      }

      const res = await api.put(`/api/incidents/${id}`, payload);
      if (res.success) {
        setIncident(res.data);
        setToast({ type: 'success', message: 'Checklist updated successfully.' });
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to update checklist item.' });
    }
  };

  const saveCapa = async (e) => {
    e.preventDefault();
    try {
      const checklistUpdate = { ...incident.checklist };
      if (capaText.trim()) {
        checklistUpdate.capaFormulated = true;
      }

      const res = await api.put(`/api/incidents/${id}`, {
        capa: capaText,
        checklist: checklistUpdate,
      });
      if (res.success) {
        setIncident(res.data);
        setToast({ type: 'success', message: 'CAPA details saved.' });
        setEditingCapa(false);
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to save CAPA.' });
    }
  };

  const saveMgmtResponse = async (e) => {
    e.preventDefault();
    try {
      const checklistUpdate = { ...incident.checklist };
      if (mgmtResponseText.trim()) {
        checklistUpdate.managementResponseRecorded = true;
      }

      const res = await api.put(`/api/incidents/${id}`, {
        managementResponse: mgmtResponseText,
        checklist: checklistUpdate,
      });
      if (res.success) {
        setIncident(res.data);
        setToast({ type: 'success', message: 'Management response saved.' });
        setEditingMgmtResponse(false);
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to save response.' });
    }
  };

  const toggleActionField = async (field, val) => {
    try {
      const checklistUpdate = { ...incident.checklist };
      if (field === 'noticesIssued') {
        checklistUpdate.noticesIssuedChecked = val;
      } else if (field === 'sensitizationDone') {
        checklistUpdate.sensitizationDoneChecked = val;
      }

      const res = await api.put(`/api/incidents/${id}`, {
        [field]: val,
        checklist: checklistUpdate,
      });
      if (res.success) {
        setIncident(res.data);
        setToast({ type: 'success', message: `${field === 'noticesIssued' ? 'Notices' : 'Sensitization'} status updated.` });
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to update action status.' });
    }
  };

  const saveActionDetails = async (type, detailsText, e) => {
    e.preventDefault();
    try {
      const fieldName = type === 'notices' ? 'noticeDetails' : 'sensitizationDetails';
      const res = await api.put(`/api/incidents/${id}`, {
        [fieldName]: detailsText,
      });
      if (res.success) {
        setIncident(res.data);
        setToast({ type: 'success', message: 'Action details saved successfully.' });
        if (type === 'notices') setEditingNotices(false);
        if (type === 'sensitization') setEditingSensitization(false);
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to save action details.' });
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Incident Registry" subtitle="Loading record details...">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--color-gray-500)' }}>Retrieving secure ledger entries...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!incident) {
    return (
      <DashboardLayout title="Incident Registry" subtitle="Record not found">
        <div className="card" style={{ padding: '24px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
          <AlertOctagon size={48} color="var(--color-danger)" style={{ margin: '0 auto 16px' }} />
          <h3>Incident Not Found</h3>
          <p style={{ color: 'var(--color-gray-500)', marginBottom: '20px' }}>
            The incident record you are trying to view does not exist or you lack sufficient clearance to view it.
          </p>
          <button className="btn btn-primary" onClick={() => router.push('/incidents')}>
            Back to Registry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Record: ${incident.incidentId}`} subtitle={`Logged on ${new Date(incident.dateTime).toLocaleDateString()}`}>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Navigation and Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => router.push('/incidents')} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={16} /> Back to Registry
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          {hasRole('admin', 'dept_head') && (
            <button
              onClick={() => router.push(`/incidents/${id}/edit`)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Edit2 size={15} /> Edit Record
            </button>
          )}

          {hasRole('admin') && (
            <button
              onClick={handleDelete}
              className="btn btn-danger"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Trash2 size={15} /> Delete Record
            </button>
          )}
        </div>
      </div>

      {/* Process Workflow Tracker */}
      <div className="workflow-stepper animate-fadeIn" style={{ marginBottom: '24px' }}>
        <div className="workflow-progress-line">
          <div
            className="workflow-progress-fill"
            style={{ width: `${((incident.currentPhase - 1) / 3) * 100}%` }}
          />
        </div>
        {[
          { phase: 1, label: 'Incident Entry' },
          { phase: 2, label: 'Data Fill-up & Dashboard' },
          { phase: 3, label: 'Management Review' },
          { phase: 4, label: 'Closing Incident' },
        ].map((step) => {
          const isActive = incident.currentPhase === step.phase;
          const isCompleted = incident.currentPhase > step.phase;
          return (
            <div
              key={step.phase}
              className={`workflow-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => handlePhaseChange(step.phase)}
              title={hasRole('admin', 'dept_head') ? `Change to Phase ${step.phase}` : `Phase ${step.phase}`}
            >
              <div className="workflow-step-icon">
                {isCompleted ? '✓' : step.phase}
              </div>
              <div className="workflow-step-label">
                Phase {step.phase}: {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sheet Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setActiveSheetTab('sheet1')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeSheetTab === 'sheet1' ? 'var(--color-primary-600)' : '#fff',
            color: activeSheetTab === 'sheet1' ? '#fff' : 'var(--color-gray-600)',
            border: '1px solid var(--color-gray-200)',
            boxShadow: activeSheetTab === 'sheet1' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          Sheet 1: Incident Reporting Form
        </button>
        <button
          type="button"
          onClick={() => setActiveSheetTab('sheet2')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeSheetTab === 'sheet2' ? 'var(--color-primary-600)' : '#fff',
            color: activeSheetTab === 'sheet2' ? '#fff' : 'var(--color-gray-600)',
            border: '1px solid var(--color-gray-200)',
            boxShadow: activeSheetTab === 'sheet2' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          Sheet 2: Investigation & Management Purpose
        </button>
      </div>

      {/* Main Info Card */}
      <div className="grid grid-3" style={{ gap: '24px', alignItems: 'start' }}>
        {/* Core Metadata Panel (Left Column) */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px', background: '#fff', border: '1px solid var(--color-gray-200)', borderRadius: '12px' }}>
            
            {/* Severity and status indicators at the top */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className={`badge badge--severity-${incident.severity?.toLowerCase()}`} style={{ fontSize: '11px', padding: '3px 8px' }}>
                  {incident.severity} Severity
                </span>
                <span className={`badge badge--status-${incident.status?.toLowerCase()}`} style={{ fontSize: '11px', padding: '3px 8px' }}>
                  {incident.status}
                </span>
                <span className={`badge badge-phase-${incident.currentPhase || 1}`} style={{ fontSize: '11px', padding: '3px 8px' }}>
                  Phase {incident.currentPhase || 1}
                </span>
              </div>
              <span style={{ fontSize: '12.5px', color: 'var(--color-gray-500)', fontWeight: '600' }}>
                ID: {incident.incidentId}
              </span>
            </div>

            {/* SHEET 1 DETAILS */}
            {activeSheetTab === 'sheet1' && (
              <div className="animate-fadeIn">
                {/* Header Cell */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr', border: '2px solid #000', borderBottom: 'none', textAlign: 'center', fontWeight: 'bold', minHeight: '50px', alignItems: 'center', color: '#000', background: '#f8fafc' }}>
                  <div style={{ borderRight: '2px solid #000', padding: '8px', fontSize: '12px', textTransform: 'uppercase', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>VIROC HOSPITAL</div>
                  <div style={{ borderRight: '2px solid #000', padding: '8px', fontSize: '14px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>INCIDENT REPORTING FORM</div>
                  <div style={{ padding: '8px', fontSize: '10px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>VIROC/ROM/FM/01</div>
                </div>

                {/* Event date/time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', borderBottom: 'none', color: '#000' }}>
                  <div style={{ borderRight: '2px solid #000', padding: '6px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Date of Event</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '600' }}>
                      {incident.dateOfEvent ? new Date(incident.dateOfEvent).toLocaleDateString() : new Date(incident.dateTime).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ padding: '6px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Time of Event</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '600' }}>
                      {incident.timeOfEvent || new Date(incident.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Reporting date/time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', borderBottom: 'none', color: '#000' }}>
                  <div style={{ borderRight: '2px solid #000', padding: '6px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Date of Reporting</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '600' }}>
                      {incident.dateOfReporting ? new Date(incident.dateOfReporting).toLocaleDateString() : (incident.dateReporting ? new Date(incident.dateReporting).toLocaleDateString() : 'N/A')}
                    </span>
                  </div>
                  <div style={{ padding: '6px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Time of Reporting</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '600' }}>
                      {incident.timeOfReporting || (incident.dateReporting ? new Date(incident.dateReporting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A')}
                    </span>
                  </div>
                </div>

                {/* Identifier & Reporter */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', borderBottom: 'none', color: '#000' }}>
                  <div style={{ borderRight: '2px solid #000', padding: '6px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Identified By</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{incident.identifiedBy || 'N/A'}</span>
                  </div>
                  <div style={{ padding: '6px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Reported By</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{incident.reportedBy || 'N/A'}</span>
                  </div>
                </div>

                {/* Person Affected & Responsible Person */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', borderBottom: 'none', color: '#000' }}>
                  <div style={{ borderRight: '2px solid #000', padding: '6px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Person / Department Affected</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '600' }}>
                      {incident.personAffected ? `${incident.personAffected} (${incident.department})` : incident.department}
                    </span>
                  </div>
                  <div style={{ padding: '6px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Responsible Person</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{incident.responsiblePerson || 'N/A'}</span>
                  </div>
                </div>

                {/* Brief */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '6px 10px', color: '#000' }}>
                  <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>Brief of Incident</span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{incident.brief || 'N/A'}</span>
                </div>

                {/* Description */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '10px 12px', color: '#000' }}>
                  <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '4px' }}>Description of Event</span>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '13.5px', color: '#111', lineHeight: '1.6', margin: 0 }}>
                    {incident.description || 'N/A'}
                  </p>
                </div>

                {/* Event Type checkbox layout */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '8px 12px', color: '#000' }}>
                  <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '6px' }}>Event Type</span>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontWeight: 'bold' }}>
                    {['Near Miss', 'No Harm', 'Adverse Event', 'Sentinel Event'].map(t => {
                      const isSelected = incident.event === t;
                      return (
                        <span key={t} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: isSelected ? 'var(--color-primary-700)' : 'var(--color-gray-400)' }}>
                          <span style={{
                            width: '14px', height: '14px', border: '1px solid', borderColor: isSelected ? 'var(--color-primary-700)' : 'var(--color-gray-300)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '900', borderRadius: '2px'
                          }}>
                            {isSelected ? '✓' : ''}
                          </span>
                          {t.toUpperCase()}{t === 'Sentinel Event' ? ' *' : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Immediate Action & Probable Reason */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', borderBottom: 'none', color: '#000' }}>
                  <div style={{ borderRight: '2px solid #000', padding: '8px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '4px' }}>IMMEDIATE ACTION TAKEN :</span>
                    <p style={{ whiteSpace: 'pre-wrap', fontSize: '13px', color: '#111', lineHeight: '1.5', margin: 0 }}>
                      {incident.immediateAction || 'None documented.'}
                    </p>
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '4px' }}>PROBABLE REASON :</span>
                    <p style={{ whiteSpace: 'pre-wrap', fontSize: '13px', color: '#111', lineHeight: '1.5', margin: 0 }}>
                      {incident.probableReason || 'None documented.'}
                    </p>
                  </div>
                </div>

                {/* Sign-off box */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', border: '2px solid #000', padding: '10px 12px', color: '#000', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-gray-500)' }}>Reported by :</div>
                    <div style={{ fontSize: '13px' }}>
                      <strong>Sign:</strong> {incident.reportedBySign ? <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓ Digitally Signed</span> : <span style={{ color: 'var(--color-gray-400)', fontStyle: 'italic' }}>Pending Signature</span>}
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      <strong>Name:</strong> {incident.reportedBy}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', fontSize: '12.5px' }}>
                    <div><strong>Date:</strong> {incident.reportedByDate ? new Date(incident.reportedByDate).toLocaleDateString() : (incident.reportedBySign ? new Date(incident.createdAt).toLocaleDateString() : '—')}</div>
                    <div><strong>Time:</strong> {incident.reportedByTime || '—'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* SHEET 2 DETAILS */}
            {activeSheetTab === 'sheet2' && (
              <div className="animate-fadeIn">
                {/* 1. Root Cause points */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '12px', color: '#000' }}>
                  <span style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '8px' }}>ROOT CAUSE ANALYSIS :</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(() => {
                      const displayRCs = incident.rootCauses && incident.rootCauses.length > 0
                        ? incident.rootCauses
                        : (incident.rootCause ? incident.rootCause.split('\n').map(l => l.replace(/^\d+\.\s*/, '')).filter(Boolean) : []);
                      
                      if (displayRCs.length === 0) {
                        return <p style={{ color: 'var(--color-gray-400)', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>No root causes documented yet.</p>;
                      }
                      
                      return displayRCs.map((rc, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--color-primary-600)' }}>{idx + 1}.</span>
                          <span style={{ color: '#111' }}>{rc}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* 2. Recurrence prevention */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '12px', color: '#000' }}>
                  <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '4px' }}>FURTHER ACTION TAKEN PREVENT RECURRENCE :</span>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '13px', color: '#111', lineHeight: '1.5', margin: 0 }}>
                    {incident.actionTaken || 'No recurrence action logged.'}
                  </p>
                </div>

                {/* Management purpose headers */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', textAlign: 'center', background: '#f1f5f9', fontWeight: '800', padding: '6px 0', textTransform: 'uppercase', fontSize: '12px', color: '#000', textDecoration: 'underline' }}>
                  FOR MANAGEMENT PURPOSE
                </div>

                {/* 3 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr', border: '2px solid #000', borderBottom: 'none', color: '#000' }}>
                  {/* Gradation */}
                  <div style={{ borderRight: '2px solid #000', padding: '8px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '9px', color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '6px' }}>Gradation of Incidence</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      {['Minor', 'Major', 'Critical'].map(c => {
                        const isSel = incident.category === c;
                        return (
                          <span key={c} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isSel ? 'var(--color-gray-800)' : 'var(--color-gray-400)', fontWeight: isSel ? 'bold' : 'normal' }}>
                            <span style={{ width: '12px', height: '12px', border: '1px solid', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
                              {isSel ? '✓' : ''}
                            </span>
                            {c}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Impact */}
                  <div style={{ borderRight: '2px solid #000', padding: '8px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '9px', color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '6px' }}>Impact Category</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: '12px' }}>
                      {['Safety', 'Reputational', 'Operational', 'Compliance', 'Finance'].map(i => {
                        const isSel = incident.impacts?.includes(i) || incident.impact?.includes(i);
                        return (
                          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isSel ? 'var(--color-gray-800)' : 'var(--color-gray-400)', fontWeight: isSel ? 'bold' : 'normal' }}>
                            <span style={{ width: '12px', height: '12px', border: '1px solid', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
                              {isSel ? '✓' : ''}
                            </span>
                            {i}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category */}
                  <div style={{ padding: '8px 10px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '9px', color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '6px' }}>Category</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      {['Person', 'System'].map(c => {
                        const isSel = incident.investigationCategory === c;
                        return (
                          <span key={c} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isSel ? 'var(--color-gray-800)' : 'var(--color-gray-400)', fontWeight: isSel ? 'bold' : 'normal' }}>
                            <span style={{ width: '12px', height: '12px', border: '1px solid', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
                              {isSel ? '✓' : ''}
                            </span>
                            {c}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Review Comments Details */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '10px 12px', color: '#000' }}>
                  <span style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '8px' }}>Review Comments Incidence :</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                    {[
                      { checked: incident.reviewSopChecked, label: 'Change in SOP Policy / New SOP', details: incident.reviewSopDetails },
                      { checked: incident.reviewTrainingChecked, label: 'Training', details: incident.reviewTrainingDetails },
                      { checked: incident.reviewDisciplinaryChecked, label: 'Disciplinary Action', details: incident.reviewDisciplinaryDetails },
                      { checked: incident.reviewInfrastructureChecked, label: 'Infrastructure', details: incident.reviewInfrastructureDetails }
                    ].map((row, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '12px', color: row.checked ? '#000' : 'var(--color-gray-400)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                          <span style={{ width: '13px', height: '13px', border: '1px solid', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
                            {row.checked ? '✓' : ''}
                          </span>
                          {row.label}
                        </span>
                        <span>{row.details || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sensitisation Required checkboxes */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '8px 12px', color: '#000' }}>
                  <span style={{ fontWeight: '700', display: 'block', fontSize: '10px', color: 'var(--color-gray-500)', textTransform: 'uppercase', marginBottom: '6px' }}>Sensitisation Required :</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px', fontWeight: 'bold' }}>
                    {['Immediate Hospitalwide (Standing Meeting)', 'Discussion in Department'].map(opt => {
                      const isSel = incident.sensitisationRequired?.includes(opt) || (opt === 'Discussion in Department' && incident.sensitizationDone);
                      return (
                        <span key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isSel ? '#000' : 'var(--color-gray-400)' }}>
                          <span style={{ width: '13px', height: '13px', border: '1px solid', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
                            {isSel ? '✓' : ''}
                          </span>
                          {opt}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Management signoff */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', padding: '10px 12px', color: '#000', background: '#f8fafc' }}>
                  {/* Analysed by */}
                  <div style={{ borderRight: '1px solid var(--color-gray-300)', paddingRight: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-gray-500)' }}>Analysed by :</span>
                    <div style={{ fontSize: '13px' }}><strong>Sign:</strong> {incident.analysedBySign ? <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓ Signed</span> : <span style={{ color: 'var(--color-gray-400)', fontStyle: 'italic' }}>Pending Signature</span>}</div>
                    <div style={{ fontSize: '13px' }}><strong>Name:</strong> {incident.analysedByName || '—'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-600)' }}>
                      <strong>Date:</strong> {incident.analysedByDate ? new Date(incident.analysedByDate).toLocaleDateString() : '—'} | <strong>Time:</strong> {incident.analysedByTime || '—'}
                    </div>
                  </div>

                  {/* Reviewed by */}
                  <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-gray-500)' }}>Reviewed by :</span>
                    <div style={{ fontSize: '13px' }}><strong>Sign:</strong> {incident.reviewedBySign ? <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓ Signed</span> : <span style={{ color: 'var(--color-gray-400)', fontStyle: 'italic' }}>Pending Signature</span>}</div>
                    <div style={{ fontSize: '13px' }}><strong>Name:</strong> {incident.reviewedByName || '—'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-600)' }}>
                      <strong>Date:</strong> {incident.reviewedByDate ? new Date(incident.reviewedByDate).toLocaleDateString() : '—'} | <strong>Time:</strong> {incident.reviewedByTime || '—'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666', marginTop: '8px', fontWeight: '600' }}>
                  <span>Joba/Viroc Jobs. New.cdr</span>
                  <span>* ( If needed attach blank Page )</span>
                </div>
              </div>
            )}

            {/* Quick Admin Actions Row */}
            {hasRole('admin', 'dept_head') && (
              <div style={{ borderTop: '1px solid var(--color-gray-200)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-navy-900)' }}>
                  System Incident Triage Panel
                </h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleStatusChange('Open')}
                    className={`btn btn-sm ${incident.status === 'Open' ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={incident.status === 'Open'}
                  >
                    Set Open
                  </button>
                  <button
                    onClick={() => handleStatusChange('Pending')}
                    className={`btn btn-sm ${incident.status === 'Pending' ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={incident.status === 'Pending'}
                  >
                    Set Pending
                  </button>
                  <button
                    onClick={() => handleStatusChange('Closed')}
                    className={`btn btn-sm ${incident.status === 'Closed' ? 'btn-success' : 'btn-secondary'}`}
                    disabled={incident.status === 'Closed'}
                  >
                    Set Closed / Resolved
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Sidebar Metadata Card, Checklist & Timeline (Right Column) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Checklist Card */}
          <div className="checklist-card animate-fadeIn">
            <h3 style={{ fontSize: '15px', fontWeight: '700', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '10px', marginBottom: '16px' }}>
              Incident Review Checklist
            </h3>
            
            {/* Phase 1 Checklist */}
            <div style={{ marginBottom: '16px' }}>
              <div className="checklist-group-title">
                <span>Phase 1: Incident Entry</span>
                {incident.currentPhase === 1 && <span className="badge badge-phase-1" style={{ fontSize: '10px', padding: '1px 6px' }}>Active</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('incidentLogged', 1)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.incidentLogged ? 'checked' : ''}`}>
                    {incident.checklist?.incidentLogged && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.incidentLogged ? 'completed' : ''}`}>
                    Log incident metadata & details
                  </span>
                </div>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('detailsRecorded', 1)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.detailsRecorded ? 'checked' : ''}`}>
                    {incident.checklist?.detailsRecorded && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.detailsRecorded ? 'completed' : ''}`}>
                    Record department & reported by
                  </span>
                </div>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('immediateActionsDocumented', 1)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.immediateActionsDocumented ? 'checked' : ''}`}>
                    {incident.checklist?.immediateActionsDocumented && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.immediateActionsDocumented ? 'completed' : ''}`}>
                    Document immediate mitigations
                  </span>
                </div>
              </div>
            </div>

            {/* Phase 2 Checklist */}
            <div style={{ marginBottom: '16px' }}>
              <div className="checklist-group-title">
                <span>Phase 2: Data Fill-up & Dashboard</span>
                {incident.currentPhase === 2 && <span className="badge badge-phase-2" style={{ fontSize: '10px', padding: '1px 6px' }}>Active</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('peopleInvolvedRecorded', 2)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.peopleInvolvedRecorded ? 'checked' : ''}`}>
                    {incident.checklist?.peopleInvolvedRecorded && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.peopleInvolvedRecorded ? 'completed' : ''}`}>
                    Identify and record people involved
                  </span>
                </div>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('responsiblePersonAssigned', 2)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.responsiblePersonAssigned ? 'checked' : ''}`}>
                    {incident.checklist?.responsiblePersonAssigned && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.responsiblePersonAssigned ? 'completed' : ''}`}>
                    Assign responsible clinician/agent
                  </span>
                </div>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('capaFormulated', 2)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.capaFormulated ? 'checked' : ''}`}>
                    {incident.checklist?.capaFormulated && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.capaFormulated ? 'completed' : ''}`}>
                    Formulate and document CAPA
                  </span>
                </div>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('dashboardUpdated', 2)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.dashboardUpdated ? 'checked' : ''}`}>
                    {incident.checklist?.dashboardUpdated && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.dashboardUpdated ? 'completed' : ''}`}>
                    Update dashboard stats & tracking
                  </span>
                </div>
              </div>
            </div>

            {/* Phase 3 Checklist */}
            <div style={{ marginBottom: '16px' }}>
              <div className="checklist-group-title">
                <span>Phase 3: Management Review</span>
                {incident.currentPhase === 3 && <span className="badge badge-phase-3" style={{ fontSize: '10px', padding: '1px 6px' }}>Active</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('managementResponseRecorded', 3)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.managementResponseRecorded ? 'checked' : ''}`}>
                    {incident.checklist?.managementResponseRecorded && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.managementResponseRecorded ? 'completed' : ''}`}>
                    Record management feedback
                  </span>
                </div>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('noticesIssuedChecked', 3)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.noticesIssuedChecked ? 'checked' : ''}`}>
                    {incident.checklist?.noticesIssuedChecked && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.noticesIssuedChecked ? 'completed' : ''}`}>
                    Issue formal notices/warning letters
                  </span>
                </div>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('sensitizationDoneChecked', 3)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.sensitizationDoneChecked ? 'checked' : ''}`}>
                    {incident.checklist?.sensitizationDoneChecked && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.sensitizationDoneChecked ? 'completed' : ''}`}>
                    Conduct staff sensitization sessions
                  </span>
                </div>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('reviewerRemarksAdded', 3)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.reviewerRemarksAdded ? 'checked' : ''}`}>
                    {incident.checklist?.reviewerRemarksAdded && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.reviewerRemarksAdded ? 'completed' : ''}`}>
                    Add internal reviewer remarks
                  </span>
                </div>
              </div>
            </div>

            {/* Phase 4 Checklist */}
            <div>
              <div className="checklist-group-title">
                <span>Phase 4: Closure</span>
                {incident.currentPhase === 4 && <span className="badge badge-phase-4" style={{ fontSize: '10px', padding: '1px 6px' }}>Active</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('resolutionDetailsRecorded', 4)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.resolutionDetailsRecorded ? 'checked' : ''}`}>
                    {incident.checklist?.resolutionDetailsRecorded && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.resolutionDetailsRecorded ? 'completed' : ''}`}>
                    Record resolution date & notes
                  </span>
                </div>
                <div
                  className="checklist-item-row"
                  onClick={() => toggleChecklistItem('incidentClosed', 4)}
                >
                  <div className={`checklist-item-checkbox ${incident.checklist?.incidentClosed ? 'checked' : ''}`}>
                    {incident.checklist?.incidentClosed && <span style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>✓</span>}
                  </div>
                  <span className={`checklist-item-text ${incident.checklist?.incidentClosed ? 'completed' : ''}`}>
                    Resolve & close incident entry
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '10px' }}>
              Incident Identity
            </h3>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Briefcase size={16} color="var(--color-gray-500)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', textTransform: 'uppercase' }}>Department</span>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{incident.department}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Calendar size={16} color="var(--color-gray-500)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', textTransform: 'uppercase' }}>Incident Time</span>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>
                  {new Date(incident.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <User size={16} color="var(--color-gray-500)" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', textTransform: 'uppercase' }}>Reporter</span>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>
                  {incident.reportedBy}
                  {incident.reportedByPhone && (
                    <span style={{ color: 'var(--color-gray-500)', fontSize: '12px', marginLeft: '6px', fontWeight: '400' }}>
                      ({incident.reportedByPhone})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {incident.responsiblePerson && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <UserCheck size={16} color="var(--color-gray-500)" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', textTransform: 'uppercase' }}>Responsible Agent</span>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{incident.responsiblePerson}</span>
                </div>
              </div>
            )}

            {incident.peopleInvolved && incident.peopleInvolved.length > 0 && (
              <div style={{ borderTop: '1px solid var(--color-gray-200)', paddingTop: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  People Involved ({incident.peopleInvolved.length})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {incident.peopleInvolved.map((p) => (
                    <span key={p} className="badge" style={{ background: 'var(--color-gray-100)', color: 'var(--color-gray-700)', fontSize: '11px' }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SMS Dispatch Receipt Card */}
          {incident.reportedByPhone && (
            <div className="card animate-fadeIn" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>
                  SMS Dispatch Log
                </h3>
                <span className="badge badge--success" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  ✓ Dispatch Sent
                </span>
              </div>
              <div style={{ background: 'var(--color-gray-50)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid var(--color-primary-500)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Simulated Outgoing Text
                </span>
                <p style={{ fontSize: '13px', color: 'var(--color-gray-700)', fontStyle: 'italic', margin: 0 }}>
                  "Hello {incident.reportedBy}, your report (Ref: {incident.incidentId}) has been logged in CareTrace HIMS. It is currently under review. Thank you for your feedback."
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--color-gray-505)' }}>
                <span style={{ color: 'var(--color-gray-600)' }}><strong>Recipient:</strong> {incident.reportedBy}</span>
                <span style={{ color: 'var(--color-gray-600)' }}><strong>Phone:</strong> {incident.reportedByPhone}</span>
                <span style={{ color: 'var(--color-gray-400)', fontSize: '11px' }}><strong>Timestamp:</strong> {new Date(incident.createdAt).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Incident Timeline */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>
              Case Timeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '16px', borderLeft: '2px solid var(--color-gray-200)' }}>
              {/* Event 1: Reported */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', width: '10px', height: '10px', background: 'var(--color-primary-500)', borderRadius: '50%', left: '-22px', top: '4px' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Incident Lodged</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>
                    By {incident.createdBy?.name || 'Authorized Portal'} on {new Date(incident.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Event 2: Under Review (Open or Pending) */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', width: '10px', height: '10px', background: incident.status !== 'Open' ? 'var(--color-warning)' : 'var(--color-gray-300)', borderRadius: '50%', left: '-22px', top: '4px' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: incident.status === 'Open' ? 'var(--color-gray-400)' : 'var(--color-gray-800)' }}>
                    Internal Evaluation
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>
                    {incident.status === 'Open' ? 'Awaiting administrative triage' : `Updated on ${new Date(incident.updatedAt).toLocaleDateString()}`}
                  </span>
                </div>
              </div>

              {/* Event 3: Resolved */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', width: '10px', height: '10px', background: incident.status === 'Closed' ? 'var(--color-success)' : 'var(--color-gray-300)', borderRadius: '50%', left: '-22px', top: '4px' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: incident.status !== 'Closed' ? 'var(--color-gray-400)' : 'var(--color-gray-800)' }}>
                    Case Resolved & Sealed
                  </span>
                  {incident.status === 'Closed' && (
                    <span style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>
                      Closed on {incident.resolutionDate ? new Date(incident.resolutionDate).toLocaleDateString() : new Date(incident.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Transition Overlay Modal */}
      {showStatusModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="card animate-scaleIn" style={{ width: '100%', maxWidth: '460px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>
              Transition Incident to {targetStatus}
            </h3>
            <form onSubmit={submitStatusChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Triage & Investigation Remarks *</label>
                <textarea
                  required
                  placeholder="Summarize reasons for this status change or resolution steps taken..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="form-textarea--light"
                  rows={4}
                  disabled={updatingStatus}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="btn btn-secondary"
                  disabled={updatingStatus}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updatingStatus}
                >
                  {updatingStatus ? <Spinner size="sm" color="white" /> : 'Confirm Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
