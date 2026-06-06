'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { DEPARTMENTS, CATEGORIES, EVENT_TYPES, IMPACT_CATEGORIES, SENSITISATION_OPTIONS, STATUSES } from '@/lib/constants';
import { ArrowLeft, Save, FileText, Settings, ShieldAlert } from 'lucide-react';
import Toast from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';

export default function EditIncident() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const router = useRouter();

  // Tab State: 'sheet1' (Incident Form), 'sheet2' (RCA & Management)
  const [activeTab, setActiveTab] = useState('sheet1');

  // Form states - Sheet 1 (Reporting Form)
  const [dateOfEvent, setDateOfEvent] = useState('');
  const [timeOfEvent, setTimeOfEvent] = useState('');
  const [dateOfReporting, setDateOfReporting] = useState('');
  const [timeOfReporting, setTimeOfReporting] = useState('');
  const [identifiedBy, setIdentifiedBy] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [personAffected, setPersonAffected] = useState('');
  const [department, setDepartment] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [brief, setBrief] = useState('');
  const [description, setDescription] = useState('');
  const [event, setEvent] = useState('Near Miss');
  const [immediateAction, setImmediateAction] = useState('');
  const [probableReason, setProbableReason] = useState('');

  // Signature for Sheet 1
  const [reportedBySign, setReportedBySign] = useState(false);
  const [reportedByDate, setReportedByDate] = useState('');
  const [reportedByTime, setReportedByTime] = useState('');

  // Form states - Sheet 2 (Management Review & RCA)
  const [rootCauses, setRootCauses] = useState(['', '', '', '', '']); // 5 point list
  const [actionTaken, setActionTaken] = useState(''); // Prevent recurrence
  const [category, setCategory] = useState('Minor'); // Gradation
  const [severity, setSeverity] = useState('Low');
  const [selectedImpacts, setSelectedImpacts] = useState([]);
  const [investigationCategory, setInvestigationCategory] = useState('System');

  // Review comments details
  const [reviewSopChecked, setReviewSopChecked] = useState(false);
  const [reviewSopDetails, setReviewSopDetails] = useState('');
  const [reviewTrainingChecked, setReviewTrainingChecked] = useState(false);
  const [reviewTrainingDetails, setReviewTrainingDetails] = useState('');
  const [reviewDisciplinaryChecked, setReviewDisciplinaryChecked] = useState(false);
  const [reviewDisciplinaryDetails, setReviewDisciplinaryDetails] = useState('');
  const [reviewInfrastructureChecked, setReviewInfrastructureChecked] = useState(false);
  const [reviewInfrastructureDetails, setReviewInfrastructureDetails] = useState('');

  // Sensitisation & Management sign-off
  const [sensitisationRequired, setSensitisationRequired] = useState([]);
  const [analysedByName, setAnalysedByName] = useState('');
  const [analysedBySign, setAnalysedBySign] = useState(false);
  const [analysedByDate, setAnalysedByDate] = useState('');
  const [analysedByTime, setAnalysedByTime] = useState('');
  const [reviewedByName, setReviewedByName] = useState('');
  const [reviewedBySign, setReviewedBySign] = useState(false);
  const [reviewedByDate, setReviewedByDate] = useState('');
  const [reviewedByTime, setReviewedByTime] = useState('');

  // Legacy fields preserved for DB compatibility
  const [status, setStatus] = useState('Open');
  const [remarks, setRemarks] = useState('');
  const [capa, setCapa] = useState('');
  const [managementResponse, setManagementResponse] = useState('');
  const [sensitizationDone, setSensitizationDone] = useState(false);
  const [sensitizationDetails, setSensitizationDetails] = useState('');
  const [noticesIssued, setNoticesIssued] = useState(false);
  const [noticeDetails, setNoticeDetails] = useState('');
  const [currentPhase, setCurrentPhase] = useState(1);
  const [checklist, setChecklist] = useState({});

  // Status/Feedback states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  // Sync Severity with Category (Gradation)
  useEffect(() => {
    if (category === 'Minor') setSeverity('Low');
    else if (category === 'Major') setSeverity('Medium');
    else if (category === 'Critical') setSeverity('Critical');
  }, [category]);

  const fetchIncident = useCallback(async () => {
    try {
      const res = await api.get(`/api/incidents/${id}`);
      if (res.success) {
        const incident = res.data;

        // Prefill split fields with fallback to legacy combined fields
        const eventDateStr = incident.dateOfEvent ? new Date(incident.dateOfEvent).toISOString().substring(0, 10) : new Date(incident.dateTime).toISOString().substring(0, 10);
        const eventTimeStr = incident.timeOfEvent || new Date(incident.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        setDateOfEvent(eventDateStr);
        setTimeOfEvent(eventTimeStr);

        const repDate = incident.dateOfReporting || incident.dateReporting || incident.dateTime;
        const repTimeStr = incident.timeOfReporting || new Date(repDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        setDateOfReporting(new Date(repDate).toISOString().substring(0, 10));
        setTimeOfReporting(repTimeStr);

        setIdentifiedBy(incident.identifiedBy || '');
        setReportedBy(incident.reportedBy || '');
        setPersonAffected(incident.personAffected || '');
        setDepartment(incident.department || '');
        setResponsiblePerson(incident.responsiblePerson || '');
        setBrief(incident.brief || '');
        setDescription(incident.description || '');
        setEvent(incident.event || 'Near Miss');
        setImmediateAction(incident.immediateAction || '');
        setProbableReason(incident.probableReason || '');

        setReportedBySign(!!incident.reportedBySign);
        setReportedByDate(incident.reportedByDate ? new Date(incident.reportedByDate).toISOString().substring(0, 10) : '');
        setReportedByTime(incident.reportedByTime || '');

        // Prefill Sheet 2: Root Causes array
        if (incident.rootCauses && incident.rootCauses.length > 0) {
          const padded = [...incident.rootCauses];
          while (padded.length < 5) padded.push('');
          setRootCauses(padded);
        } else if (incident.rootCause) {
          // Parse lines from rootCause text block
          const lines = incident.rootCause.split('\n').map(l => l.replace(/^\d+\.\s*/, '')).filter(Boolean);
          const padded = [...lines];
          while (padded.length < 5) padded.push('');
          setRootCauses(padded);
        } else {
          setRootCauses(['', '', '', '', '']);
        }

        setActionTaken(incident.actionTaken || '');
        setCategory(incident.category || 'Minor');
        setSeverity(incident.severity || 'Low');

        // Prefill impacts
        if (incident.impacts && incident.impacts.length > 0) {
          setSelectedImpacts(incident.impacts);
        } else if (incident.impact) {
          setSelectedImpacts(incident.impact.split(',').map(s => s.trim()).filter(Boolean));
        } else {
          setSelectedImpacts([]);
        }

        setInvestigationCategory(incident.investigationCategory || 'System');

        // Review Comments
        setReviewSopChecked(incident.reviewSopChecked || false);
        setReviewSopDetails(incident.reviewSopDetails || '');
        setReviewTrainingChecked(incident.reviewTrainingChecked || false);
        setReviewTrainingDetails(incident.reviewTrainingDetails || '');
        setReviewDisciplinaryChecked(incident.reviewDisciplinaryChecked || false);
        setReviewDisciplinaryDetails(incident.reviewDisciplinaryDetails || '');
        setReviewInfrastructureChecked(incident.reviewInfrastructureChecked || false);
        setReviewInfrastructureDetails(incident.reviewInfrastructureDetails || '');

        // Sensitisation and Management signatures
        setSensitisationRequired(incident.sensitisationRequired || []);
        setAnalysedByName(incident.analysedByName || '');
        setAnalysedBySign(!!incident.analysedBySign);
        setAnalysedByDate(incident.analysedByDate ? new Date(incident.analysedByDate).toISOString().substring(0, 10) : '');
        setAnalysedByTime(incident.analysedByTime || '');
        setReviewedByName(incident.reviewedByName || '');
        setReviewedBySign(!!incident.reviewedBySign);
        setReviewedByDate(incident.reviewedByDate ? new Date(incident.reviewedByDate).toISOString().substring(0, 10) : '');
        setReviewedByTime(incident.reviewedByTime || '');

        // Legacy/internal fields
        setStatus(incident.status);
        setRemarks(incident.remarks || '');
        setCapa(incident.capa || '');
        setManagementResponse(incident.managementResponse || '');
        setSensitizationDone(incident.sensitizationDone || false);
        setSensitizationDetails(incident.sensitizationDetails || '');
        setNoticesIssued(incident.noticesIssued || false);
        setNoticeDetails(incident.noticeDetails || '');
        setCurrentPhase(incident.currentPhase || 1);
        setChecklist(incident.checklist || {});
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to fetch incident details.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  const canEditSheet2 = hasRole('admin', 'dept_head');

  const validateForm = () => {
    const newErrors = {};
    if (!dateOfEvent) newErrors.dateOfEvent = 'Date of event is required.';
    if (!timeOfEvent) newErrors.timeOfEvent = 'Time of event is required.';
    if (!dateOfReporting) newErrors.dateOfReporting = 'Date of reporting is required.';
    if (!timeOfReporting) newErrors.timeOfReporting = 'Time of reporting is required.';
    if (!identifiedBy.trim()) newErrors.identifiedBy = 'Identified by is required.';
    if (!reportedBy.trim()) newErrors.reportedBy = 'Reported by is required.';
    if (!personAffected.trim()) newErrors.personAffected = 'Person affected is required.';
    if (!department) newErrors.department = 'Department is required.';
    if (!brief.trim()) newErrors.brief = 'Brief summary is required.';
    if (!description.trim()) newErrors.description = 'Description is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setToast({ type: 'error', message: 'Please correct visual validation errors on Sheet 1.' });
      setActiveTab('sheet1');
      return;
    }

    setSubmitting(true);
    try {
      // Re-calculate Combined DateTime Stamps
      const combinedEvent = new Date(dateOfEvent);
      if (timeOfEvent) {
        const [hours, minutes] = timeOfEvent.split(':');
        combinedEvent.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      }

      const combinedReporting = new Date(dateOfReporting);
      if (timeOfReporting) {
        const [hours, minutes] = timeOfReporting.split(':');
        combinedReporting.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      }

      // Filter empty root cause inputs
      const activeRootCauses = rootCauses.map(rc => rc.trim()).filter(Boolean);

      const checklistUpdate = { ...checklist };
      if (actionTaken.trim()) checklistUpdate.capaFormulated = true;
      if (status === 'Closed') {
        checklistUpdate.incidentClosed = true;
        checklistUpdate.resolutionDetailsRecorded = true;
      } else {
        checklistUpdate.incidentClosed = false;
      }

      const payload = {
        // Required basic fields for DB schema compatibility
        dateTime: combinedEvent,
        dateReporting: combinedReporting,
        department,
        category,
        severity,
        reportedBy,
        description,
        brief,
        event,
        immediateAction,
        responsiblePerson,

        // Mapped Paper form fields
        dateOfEvent,
        timeOfEvent,
        dateOfReporting,
        timeOfReporting,
        identifiedBy,
        personAffected,
        probableReason,

        // Sheet 1 signatures
        reportedBySign: reportedBySign ? `Signed digitally by ${reportedBy}` : '',
        reportedByDate: reportedBySign ? reportedByDate : null,
        reportedByTime: reportedBySign ? reportedByTime : '',

        // Sheet 2: RCA & Actions
        rootCauses: activeRootCauses,
        rootCause: activeRootCauses.map((rc, i) => `${i + 1}. ${rc}`).join('\n'), // legacy string support
        actionTaken, // prevent recurrence

        // Sheet 2: Management settings
        impacts: selectedImpacts,
        impact: selectedImpacts.join(', '), // legacy string support
        investigationCategory,

        // Review Comments
        reviewSopChecked,
        reviewSopDetails: reviewSopChecked ? reviewSopDetails : '',
        reviewTrainingChecked,
        reviewTrainingDetails: reviewTrainingChecked ? reviewTrainingDetails : '',
        reviewDisciplinaryChecked,
        reviewDisciplinaryDetails: reviewDisciplinaryChecked ? reviewDisciplinaryDetails : '',
        reviewInfrastructureChecked,
        reviewInfrastructureDetails: reviewInfrastructureChecked ? reviewInfrastructureDetails : '',

        // Sensitisation & Sign-offs
        sensitisationRequired,
        analysedByName,
        analysedBySign: analysedBySign ? `Analysed and Signed digitally` : '',
        analysedByDate: analysedBySign && analysedByDate ? analysedByDate : null,
        analysedByTime: analysedBySign ? analysedByTime : '',
        reviewedByName,
        reviewedBySign: reviewedBySign ? `Reviewed and Signed digitally` : '',
        reviewedByDate: reviewedBySign && reviewedByDate ? reviewedByDate : null,
        reviewedByTime: reviewedBySign ? reviewedByTime : '',

        // Checklists & internal states
        checklist: checklistUpdate,
        status,
        remarks,
        currentPhase: Number(currentPhase),
      };

      const res = await api.put(`/api/incidents/${id}`, payload);
      if (res.success) {
        setToast({ type: 'success', message: 'Incident record updated successfully.' });
        setTimeout(() => router.push(`/incidents/${id}`), 1500);
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to update incident record.' });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Record" subtitle="Fetching ledger details...">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--color-gray-500)' }}>Retrieving incident record from memory...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Incident Record" subtitle={`Reference ID: ${id}`}>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Back button and navigation tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => router.back()} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={16} /> Cancel & Return
        </button>

        {/* Tab Controls */}
        <div style={{ display: 'flex', background: 'var(--color-gray-200)', padding: '4px', borderRadius: '8px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('sheet1')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'sheet1' ? '#fff' : 'transparent',
              color: activeTab === 'sheet1' ? 'var(--color-navy-900)' : 'var(--color-gray-600)',
              boxShadow: activeTab === 'sheet1' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <FileText size={15} />
            Sheet 1: Reporting Form
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sheet2')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'sheet2' ? '#fff' : 'transparent',
              color: activeTab === 'sheet2' ? 'var(--color-navy-900)' : 'var(--color-gray-600)',
              boxShadow: activeTab === 'sheet2' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Settings size={15} />
            Sheet 2: Investigation & Review
            {!canEditSheet2 && <span style={{ fontSize: '10px', background: 'var(--color-gray-300)', color: 'var(--color-gray-600)', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>Admin Only</span>}
          </button>
        </div>
      </div>

      {/* Main Form Sheets Container */}
      <form onSubmit={handleSubmit} style={{ maxWidth: '850px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '40px', background: '#fff', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-gray-200)', borderRadius: '12px' }}>
          
          {/* SHEET 1: INCIDENT REPORTING FORM */}
          {activeTab === 'sheet1' && (
            <div className="animate-fadeIn">
              {/* Form Sheet Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr', border: '2px solid #000', borderBottom: 'none', textAlign: 'center', fontWeight: 'bold', minHeight: '60px', alignItems: 'center', color: '#000', background: '#f8fafc' }}>
                <div style={{ borderRight: '2px solid #000', padding: '10px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  VIROC HOSPITAL
                </div>
                <div style={{ borderRight: '2px solid #000', padding: '10px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', letterSpacing: '0.02em' }}>
                  INCIDENT REPORTING FORM
                </div>
                <div style={{ padding: '10px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                  VIROC/ROM/FM/01
                </div>
              </div>

              {/* Grid 1: Date & Time of Event */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', borderBottom: 'none', color: '#000' }}>
                <div style={{ borderRight: '2px solid #000', padding: '8px 12px' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '2px' }}>Date of Event *</label>
                  <input
                    type="date"
                    value={dateOfEvent}
                    onChange={(e) => setDateOfEvent(e.target.value)}
                    style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0', fontSize: '14px', fontWeight: '500', background: 'transparent' }}
                  />
                  {errors.dateOfEvent && <span style={{ color: 'red', fontSize: '10px' }}>{errors.dateOfEvent}</span>}
                </div>
                <div style={{ padding: '8px 12px' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '2px' }}>Time of Event *</label>
                  <input
                    type="time"
                    value={timeOfEvent}
                    onChange={(e) => setTimeOfEvent(e.target.value)}
                    style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0', fontSize: '14px', fontWeight: '500', background: 'transparent' }}
                  />
                  {errors.timeOfEvent && <span style={{ color: 'red', fontSize: '10px' }}>{errors.timeOfEvent}</span>}
                </div>
              </div>

              {/* Grid 2: Date & Time of Reporting */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', borderBottom: 'none', color: '#000' }}>
                <div style={{ borderRight: '2px solid #000', padding: '8px 12px' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '2px' }}>Date of Reporting *</label>
                  <input
                    type="date"
                    value={dateOfReporting}
                    onChange={(e) => setDateOfReporting(e.target.value)}
                    style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0', fontSize: '14px', fontWeight: '500', background: 'transparent' }}
                  />
                  {errors.dateOfReporting && <span style={{ color: 'red', fontSize: '10px' }}>{errors.dateOfReporting}</span>}
                </div>
                <div style={{ padding: '8px 12px' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '2px' }}>Time of Reporting *</label>
                  <input
                    type="time"
                    value={timeOfReporting}
                    onChange={(e) => setTimeOfReporting(e.target.value)}
                    style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0', fontSize: '14px', fontWeight: '500', background: 'transparent' }}
                  />
                  {errors.timeOfReporting && <span style={{ color: 'red', fontSize: '10px' }}>{errors.timeOfReporting}</span>}
                </div>
              </div>

              {/* Grid 3: Identified By & Reported By */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', borderBottom: 'none', color: '#000' }}>
                <div style={{ borderRight: '2px solid #000', padding: '8px 12px' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '2px' }}>Identified By *</label>
                  <input
                    type="text"
                    value={identifiedBy}
                    onChange={(e) => setIdentifiedBy(e.target.value)}
                    placeholder="Enter full name of identifier"
                    style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0', fontSize: '14px', background: 'transparent' }}
                  />
                  {errors.identifiedBy && <span style={{ color: 'red', fontSize: '10px' }}>{errors.identifiedBy}</span>}
                </div>
                <div style={{ padding: '8px 12px' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '2px' }}>Reported By *</label>
                  <input
                    type="text"
                    value={reportedBy}
                    onChange={(e) => setReportedBy(e.target.value)}
                    placeholder="Enter full name of reporter"
                    style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0', fontSize: '14px', background: 'transparent' }}
                  />
                  {errors.reportedBy && <span style={{ color: 'red', fontSize: '10px' }}>{errors.reportedBy}</span>}
                </div>
              </div>

              {/* Grid 4: Person/Department Affected & Responsible Person */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', borderBottom: 'none', color: '#000' }}>
                <div style={{ borderRight: '2px solid #000', padding: '8px 12px' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '2px' }}>Person / Department Affected *</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={personAffected}
                      onChange={(e) => setPersonAffected(e.target.value)}
                      placeholder="Name of patient/staff"
                      style={{ flex: 1, border: 'none', outline: 'none', padding: '4px 0', fontSize: '13.5px', background: 'transparent' }}
                    />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      disabled={user?.role === 'dept_head'}
                      style={{ border: 'none', borderBottom: '1px solid var(--color-gray-300)', outline: 'none', padding: '2px 4px', fontSize: '12px', background: '#f8fafc', borderRadius: '4px' }}
                    >
                      <option value="">Select Dept</option>
                      {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>
                  {(errors.personAffected || errors.department) && (
                    <span style={{ color: 'red', fontSize: '10px', display: 'block', marginTop: '2px' }}>
                      {errors.personAffected || errors.department}
                    </span>
                  )}
                </div>
                <div style={{ padding: '8px 12px' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '2px' }}>Responsible Person</label>
                  <input
                    type="text"
                    value={responsiblePerson}
                    onChange={(e) => setResponsiblePerson(e.target.value)}
                    placeholder="Enter staff responsible"
                    style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0', fontSize: '14px', background: 'transparent' }}
                  />
                </div>
              </div>

              {/* Grid 5: Brief of Incident */}
              <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '8px 12px', color: '#000' }}>
                <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '2px' }}>Brief of Incident *</label>
                <input
                  type="text"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Summary of the incident"
                  style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0', fontSize: '14px', background: 'transparent' }}
                />
                {errors.brief && <span style={{ color: 'red', fontSize: '10px' }}>{errors.brief}</span>}
              </div>

              {/* Grid 6: Description of Event */}
              <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '12px', color: '#000' }}>
                <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '6px' }}>Description of Event *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide an objective, factual, chronological description of the event..."
                  rows={8}
                  style={{ width: '100%', border: '1px solid var(--color-gray-200)', borderRadius: '6px', outline: 'none', padding: '12px', fontSize: '13.5px', resize: 'vertical', background: '#fcfcfc', lineHeight: '1.6' }}
                />
                {errors.description && <span style={{ color: 'red', fontSize: '10px' }}>{errors.description}</span>}
              </div>

              {/* Grid 7: Event Type choices */}
              <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '12px', color: '#000' }}>
                <span style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '8px' }}>Event Type</span>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', paddingLeft: '4px' }}>
                  {EVENT_TYPES.map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                      <input
                        type="radio"
                        name="eventType"
                        checked={event === t}
                        onChange={() => setEvent(t)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-600)' }}
                      />
                      {t.toUpperCase()}
                      {t === 'Sentinel Event' ? <span style={{ color: 'red', marginLeft: '2px' }}>*</span> : ''}
                    </label>
                  ))}
                </div>
              </div>

              {/* Grid 8: Immediate Action & Probable Reason */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', borderBottom: 'none', color: '#000' }}>
                <div style={{ borderRight: '2px solid #000', padding: '8px 12px' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '4px' }}>Immediate Action Taken</label>
                  <textarea
                    value={immediateAction}
                    onChange={(e) => setImmediateAction(e.target.value)}
                    placeholder="Details of immediate action taken..."
                    rows={4}
                    style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0', fontSize: '13.5px', resize: 'none', background: 'transparent', lineHeight: '1.5' }}
                  />
                </div>
                <div style={{ padding: '8px 12px' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '4px' }}>Probable Reason</label>
                  <textarea
                    value={probableReason}
                    onChange={(e) => setProbableReason(e.target.value)}
                    placeholder="What is the suspected or probable reason?..."
                    rows={4}
                    style={{ width: '100%', border: 'none', outline: 'none', padding: '4px 0', fontSize: '13.5px', resize: 'none', background: 'transparent', lineHeight: '1.5' }}
                  />
                </div>
              </div>

              {/* Grid 9: Signature block */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', border: '2px solid #000', padding: '12px', color: '#000', background: '#f8fafc' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-gray-700)' }}>Reported by :</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700' }}>Sign :</span>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer', fontWeight: '500' }}>
                      <input
                        type="checkbox"
                        checked={reportedBySign}
                        onChange={(e) => setReportedBySign(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
                      />
                      Digitally Sign report
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700' }}>Name :</span>
                    <input
                      type="text"
                      value={reportedBy}
                      onChange={(e) => setReportedBy(e.target.value)}
                      placeholder="Signee Name"
                      style={{ border: 'none', borderBottom: '1px solid var(--color-gray-300)', outline: 'none', padding: '2px', fontSize: '13.5px', width: '240px', background: 'transparent', fontWeight: '500' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', width: '40px' }}>Date :</span>
                    <input
                      type="date"
                      value={reportedByDate}
                      onChange={(e) => setReportedByDate(e.target.value)}
                      style={{ border: 'none', borderBottom: '1px solid var(--color-gray-300)', outline: 'none', padding: '2px', fontSize: '13px', background: 'transparent' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', width: '40px' }}>Time :</span>
                    <input
                      type="time"
                      value={reportedByTime}
                      onChange={(e) => setReportedByTime(e.target.value)}
                      style={{ border: 'none', borderBottom: '1px solid var(--color-gray-300)', outline: 'none', padding: '2px', fontSize: '13px', background: 'transparent' }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom sentinel warning */}
              <div style={{ fontSize: '11px', color: 'var(--color-gray-600)', fontStyle: 'italic', marginTop: '12px', textAlign: 'right', fontWeight: '600' }}>
                * (In case of sentinel event, fill sentinel event reporting form)
              </div>
            </div>
          )}

          {/* SHEET 2: RCA & MANAGEMENT PURPOSE */}
          {activeTab === 'sheet2' && (
            <div className="animate-fadeIn">
              {!canEditSheet2 && (
                <div style={{ display: 'flex', gap: '10px', background: 'var(--color-danger-bg)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid var(--color-danger)', marginBottom: '24px' }}>
                  <ShieldAlert size={20} color="var(--color-danger-text)" />
                  <div>
                    <h4 style={{ fontWeight: '700', color: 'var(--color-danger-text)', fontSize: '14px' }}>Access Restricted</h4>
                    <p style={{ color: 'var(--color-danger-text)', fontSize: '13px', marginTop: '2px' }}>
                      Your profile role does not have authorization to edit Review & management fields. These details are locked and can only be set by Admins and Department Heads.
                    </p>
                  </div>
                </div>
              )}

              <div style={{ opacity: canEditSheet2 ? 1 : 0.65, pointerEvents: canEditSheet2 ? 'auto' : 'none' }}>
                {/* 1. Root Cause Analysis (1-5 points) */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '12px', color: '#000' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-gray-700)', marginBottom: '10px' }}>
                    ROOT CAUSE ANALYSIS :
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '4px' }}>
                    {rootCauses.map((rc, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: '800', fontSize: '13px', width: '15px', color: 'var(--color-gray-500)' }}>{idx + 1}</span>
                        <input
                          type="text"
                          value={rc}
                          onChange={(e) => {
                            const copy = [...rootCauses];
                            copy[idx] = e.target.value;
                            setRootCauses(copy);
                          }}
                          placeholder={`Root cause factor or contributor point ${idx + 1}`}
                          style={{ flex: 1, border: 'none', borderBottom: '1px dashed var(--color-gray-300)', outline: 'none', padding: '4px 2px', fontSize: '13.5px', background: 'transparent' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Further preventive action */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '12px', color: '#000' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    FURTHER ACTION TAKEN PREVENT RECURRENCE *
                  </label>
                  <textarea
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="Enter further preventive/corrective actions taken or SOP modifications (CAPA)..."
                    rows={4}
                    style={{ width: '100%', border: '1px solid var(--color-gray-200)', borderRadius: '6px', outline: 'none', padding: '10px', fontSize: '13.5px', resize: 'vertical', background: '#fcfcfc', lineHeight: '1.5' }}
                  />
                </div>

                {/* 3. Section Title: FOR MANAGEMENT PURPOSE */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', textAlign: 'center', background: '#f1f5f9', fontWeight: '800', padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '12.5px', color: '#000' }}>
                  FOR MANAGEMENT PURPOSE
                </div>

                {/* 4. Three-Column Selector (Gradation | Impact | Category) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr', border: '2px solid #000', borderBottom: 'none', color: '#000' }}>
                  {/* Gradation */}
                  <div style={{ borderRight: '2px solid #000', padding: '10px 12px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '8px' }}>Gradation of Incidence</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '2px' }}>
                      {CATEGORIES.map(cat => (
                        <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                          <input
                            type="radio"
                            name="gradationRadio"
                            checked={category === cat}
                            onChange={() => setCategory(cat)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
                          />
                          {cat}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Impact Category */}
                  <div style={{ borderRight: '2px solid #000', padding: '10px 12px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '8px' }}>Impact Category of Incidence</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingLeft: '2px' }}>
                      {IMPACT_CATEGORIES.map(imp => (
                        <label key={imp} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                          <input
                            type="checkbox"
                            checked={selectedImpacts.includes(imp)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedImpacts([...selectedImpacts, imp]);
                              else setSelectedImpacts(selectedImpacts.filter(x => x !== imp));
                            }}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
                          />
                          {imp}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Category Classification */}
                  <div style={{ padding: '10px 12px' }}>
                    <span style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '8px' }}>Category</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '2px' }}>
                      {['Person', 'System'].map(c => (
                        <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                          <input
                            type="radio"
                            name="categoryRadio"
                            checked={investigationCategory === c}
                            onChange={() => setInvestigationCategory(c)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
                          />
                          {c}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. Review Comments with Text inputs */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '12px', color: '#000' }}>
                  <span style={{ fontWeight: '700', display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-gray-700)', marginBottom: '12px' }}>
                    Review Comments Incidence :
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '2px' }}>
                    {/* SOP Change */}
                    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '16px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          checked={reviewSopChecked}
                          onChange={(e) => setReviewSopChecked(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
                        />
                        Change in SOP Policy / New SOP
                      </label>
                      <input
                        type="text"
                        value={reviewSopDetails}
                        onChange={(e) => setReviewSopDetails(e.target.value)}
                        disabled={!reviewSopChecked}
                        placeholder="Details of SOP revision..."
                        style={{ border: '1px solid var(--color-gray-200)', borderRadius: '4px', outline: 'none', padding: '6px 10px', fontSize: '13px', width: '100%', background: reviewSopChecked ? '#fff' : '#f8fafc' }}
                      />
                    </div>

                    {/* Training */}
                    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '16px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          checked={reviewTrainingChecked}
                          onChange={(e) => setReviewTrainingChecked(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
                        />
                        Training
                      </label>
                      <input
                        type="text"
                        value={reviewTrainingDetails}
                        onChange={(e) => setReviewTrainingDetails(e.target.value)}
                        disabled={!reviewTrainingChecked}
                        placeholder="Details of staff training..."
                        style={{ border: '1px solid var(--color-gray-200)', borderRadius: '4px', outline: 'none', padding: '6px 10px', fontSize: '13px', width: '100%', background: reviewTrainingChecked ? '#fff' : '#f8fafc' }}
                      />
                    </div>

                    {/* Disciplinary Action */}
                    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '16px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          checked={reviewDisciplinaryChecked}
                          onChange={(e) => setReviewDisciplinaryChecked(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
                        />
                        Disciplinary Action
                      </label>
                      <input
                        type="text"
                        value={reviewDisciplinaryDetails}
                        onChange={(e) => setReviewDisciplinaryDetails(e.target.value)}
                        disabled={!reviewDisciplinaryChecked}
                        placeholder="Details of warning / inquiry..."
                        style={{ border: '1px solid var(--color-gray-200)', borderRadius: '4px', outline: 'none', padding: '6px 10px', fontSize: '13px', width: '100%', background: reviewDisciplinaryChecked ? '#fff' : '#f8fafc' }}
                      />
                    </div>

                    {/* Infrastructure */}
                    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '16px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          checked={reviewInfrastructureChecked}
                          onChange={(e) => setReviewInfrastructureChecked(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
                        />
                        Infrastructure
                      </label>
                      <input
                        type="text"
                        value={reviewInfrastructureDetails}
                        onChange={(e) => setReviewInfrastructureDetails(e.target.value)}
                        disabled={!reviewInfrastructureChecked}
                        placeholder="Details of facility maintenance / procurement..."
                        style={{ border: '1px solid var(--color-gray-200)', borderRadius: '4px', outline: 'none', padding: '6px 10px', fontSize: '13px', width: '100%', background: reviewInfrastructureChecked ? '#fff' : '#f8fafc' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Sensitisation Required */}
                <div style={{ border: '2px solid #000', borderBottom: 'none', padding: '12px', color: '#000' }}>
                  <label style={{ fontWeight: '700', display: 'block', fontSize: '11px', color: 'var(--color-gray-600)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Sensitisation Required *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '4px' }}>
                    {SENSITISATION_OPTIONS.map(opt => (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          checked={sensitisationRequired.includes(opt)}
                          onChange={(e) => {
                            if (e.target.checked) setSensitisationRequired([...sensitisationRequired, opt]);
                            else setSensitisationRequired(sensitisationRequired.filter(o => o !== opt));
                          }}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                {/* 7. Dual Signature Footer (Analysed / Reviewed) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '2px solid #000', padding: '12px', color: '#000', background: '#f8fafc' }}>
                  {/* Analysed By */}
                  <div style={{ borderRight: '1px solid var(--color-gray-300)', paddingRight: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-gray-700)' }}>Analysed by :</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>Sign :</span>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                        <input
                          type="checkbox"
                          checked={analysedBySign}
                          onChange={(e) => {
                            setAnalysedBySign(e.target.checked);
                            if (e.target.checked && !analysedByDate) {
                              setAnalysedByDate(new Date().toISOString().substring(0, 10));
                              setAnalysedByTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                            }
                          }}
                          style={{ width: '15px', height: '15px', accentColor: 'var(--color-primary-600)' }}
                        />
                        Confirm signature
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>Name :</span>
                      <input
                        type="text"
                        value={analysedByName}
                        onChange={(e) => setAnalysedByName(e.target.value)}
                        placeholder="Signee Name"
                        style={{ flex: 1, border: 'none', borderBottom: '1px solid var(--color-gray-300)', outline: 'none', padding: '2px', fontSize: '13px', background: 'transparent' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>Date :</span>
                        <input
                          type="date"
                          value={analysedByDate}
                          onChange={(e) => setAnalysedByDate(e.target.value)}
                          style={{ border: 'none', borderBottom: '1px solid var(--color-gray-300)', outline: 'none', padding: '2px', fontSize: '12px', width: '100%', background: 'transparent' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>Time :</span>
                        <input
                          type="time"
                          value={analysedByTime}
                          onChange={(e) => setAnalysedByTime(e.target.value)}
                          style={{ border: 'none', borderBottom: '1px solid var(--color-gray-300)', outline: 'none', padding: '2px', fontSize: '12px', width: '100%', background: 'transparent' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reviewed By */}
                  <div style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-gray-700)' }}>Reviewed by :</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>Sign :</span>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                        <input
                          type="checkbox"
                          checked={reviewedBySign}
                          onChange={(e) => {
                            setReviewedBySign(e.target.checked);
                            if (e.target.checked && !reviewedByDate) {
                              setReviewedByDate(new Date().toISOString().substring(0, 10));
                              setReviewedByTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                            }
                          }}
                          style={{ width: '15px', height: '15px', accentColor: 'var(--color-primary-600)' }}
                        />
                        Confirm signature
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>Name :</span>
                      <input
                        type="text"
                        value={reviewedByName}
                        onChange={(e) => setReviewedByName(e.target.value)}
                        placeholder="Signee Name"
                        style={{ flex: 1, border: 'none', borderBottom: '1px solid var(--color-gray-300)', outline: 'none', padding: '2px', fontSize: '13px', background: 'transparent' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>Date :</span>
                        <input
                          type="date"
                          value={reviewedByDate}
                          onChange={(e) => setReviewedByDate(e.target.value)}
                          style={{ border: 'none', borderBottom: '1px solid var(--color-gray-300)', outline: 'none', padding: '2px', fontSize: '12px', width: '100%', background: 'transparent' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>Time :</span>
                        <input
                          type="time"
                          value={reviewedByTime}
                          onChange={(e) => setReviewedByTime(e.target.value)}
                          style={{ border: 'none', borderBottom: '1px solid var(--color-gray-300)', outline: 'none', padding: '2px', fontSize: '12px', width: '100%', background: 'transparent' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#555', marginTop: '12px', fontWeight: '600' }}>
                  <span>Joba/Viroc Jobs. New.cdr</span>
                  <span>* ( If needed attach blank Page )</span>
                </div>
              </div>
            </div>
          )}

          {/* Legacy Status and Metadata Panel (Only visible for admin/dept heads) */}
          {canEditSheet2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px', borderTop: '2px solid var(--color-gray-300)', paddingTop: '20px' }}>
              <h4 style={{ fontWeight: '700', color: 'var(--color-navy-900)', fontSize: '14px', marginBottom: '4px' }}>Administrative Ledger Properties</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600' }}>Incident Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="form-select--light"
                    disabled={submitting}
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '600' }}>Workflow Progress Phase</label>
                  <select
                    value={currentPhase}
                    onChange={(e) => setCurrentPhase(Number(e.target.value))}
                    className="form-select--light"
                    disabled={submitting}
                  >
                    <option value={1}>Phase 1: Incident Entry</option>
                    <option value={2}>Phase 2: Data Fill-up & Dashboard</option>
                    <option value={3}>Phase 3: Management Review</option>
                    <option value={4}>Phase 4: Closure</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600' }}>Confidential Admin Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Confidential reviewer notes..."
                  className="form-input form-input--light"
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          {/* Submission and Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '30px', borderTop: '1px solid var(--color-gray-200)', paddingTop: '20px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn btn-secondary"
              disabled={submitting}
              style={{ padding: '10px 24px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ padding: '10px 32px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {submitting ? <Spinner size="sm" color="white" /> : <><Save size={15} /> Save Changes</>}
            </button>
          </div>

        </div>
      </form>
    </DashboardLayout>
  );
}
