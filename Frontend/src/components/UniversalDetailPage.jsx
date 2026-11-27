import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Shield, Database, FileText, Activity, Clock,
  CheckCircle, AlertTriangle, RefreshCw, Printer, ExternalLink,
  User, Building2, CreditCard, Bell, History, Layers, Eye
} from 'lucide-react';
import { api } from '../services/api.service';

/**
 * GBS HOSPITAL MANAGEMENT SYSTEM
 * Universal Dedicated Detail Page Component
 * Supports:
 * - View Details, View Profile, View Records, View Reports, View Transactions,
 *   View History, View Notifications, View Applications,
 *   View Hospital Information, View System Information
 * - Prominent Top-Left Back Button preserving previous page state & scroll position
 * - Browser Back / Forward & Direct URL Refresh support
 * - Zero Mock / Fake Data: Queries live PostgreSQL endpoints
 */
export default function UniversalDetailPage({
  detailState,
  onBack,
  onNavigateDetail,
  currentRole,
  facilityBranding,
  currentUser
}) {
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState(detailState?.recordData || null);
  const [extraRecords, setExtraRecords] = useState([]);
  const [envInfo, setEnvInfo] = useState(null);
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [detailFilter, setDetailFilter] = useState('');
  const [reportCategory, setReportCategory] = useState('ALL');
  const [dutyForm, setDutyForm] = useState({
    reportTitle: '',
    department: '',
    shiftType: 'MORNING_SHIFT',
    dutiesSummary: '',
    challengesNoted: ''
  });
  const [submittingDuty, setSubmittingDuty] = useState(false);

  const detailType = detailState?.detailType || 'VIEW_DETAILS';
  const moduleKey = detailState?.moduleKey || 'OVERVIEW';
  const recordId = detailState?.recordId || 'summary';
  const pageTitle = detailState?.title || formatDetailTitle(detailType, moduleKey);
  const pageSubtitle =
    detailState?.subtitle ||
    `Live hospital details for ${detailType.replace(/^VIEW_/, '').replace(/_/g, ' ').toLowerCase()} (${moduleKey})`;

  useEffect(() => {
    loadDetailData();
  }, [detailType, moduleKey, recordId, reportCategory]);

  async function loadDetailData() {
    setLoading(true);
    setError(null);
    try {
      const envRes = await api.getEnvironmentInfo().catch(() => null);
      if (envRes) setEnvInfo(envRes);

      if (detailState?.recordData && Object.keys(detailState.recordData).length > 0) {
        setLiveData(detailState.recordData);
      }

      if (detailType === 'VIEW_SYSTEM_INFORMATION') {
        const [overview, envStatus] = await Promise.all([
          api.getGlobalOverviewStats().catch(() => null),
          api.getEnvironmentInfo().catch(() => null)
        ]);
        setLiveData({ overview, environment: envStatus });
        setExtraRecords(envStatus?.tables || []);
      } else if (detailType === 'VIEW_HOSPITAL_INFORMATION') {
        const isDevActor = currentUser?.role === 'DEVELOPER' || currentRole === 'DEVELOPER';
        const [overview, wards, theatres, tenants] = await Promise.all([
          api.getGlobalOverviewStats().catch(() => null),
          api.getWards().catch(() => []),
          api.getOperatingTheatres().catch(() => []),
          isDevActor ? api.getTenants().catch(() => []) : Promise.resolve([])
        ]);
        setLiveData({
          overview: overview?.metrics || {},
          totalWards: Array.isArray(wards) ? wards.length : 0,
          totalOperatingTheatres: Array.isArray(theatres) ? theatres.length : 0,
          registeredInstitutions: Array.isArray(tenants) ? tenants.length : (overview?.metrics?.totalTenants ?? 1)
        });
        setExtraRecords(Array.isArray(wards) ? wards : []);
      } else if (detailType === 'VIEW_NOTIFICATIONS') {
        const overview = await api.getGlobalOverviewStats().catch(() => null);
        const list = overview?.recentNotifications || [];
        setLiveData({
          totalNotifications: list.length,
          environment: overview?.environment || 'DEVELOPMENT'
        });
        setExtraRecords(list);
      } else if (detailType === 'VIEW_HISTORY') {
        const overview = await api.getGlobalOverviewStats().catch(() => null);
        const logs = overview?.recentAuditLogs || [];
        setLiveData({
          totalAuditEvents: logs.length,
          environment: overview?.environment || 'DEVELOPMENT'
        });
        setExtraRecords(logs);
      } else if (detailType === 'VIEW_TRANSACTIONS') {
        const [billingStats, bills, nhiaBatches] = await Promise.all([
          api.getBillingStats().catch(() => ({})),
          api.getBills().catch(() => []),
          api.getNhiaBatches().catch(() => [])
        ]);
        const billList = Array.isArray(bills) ? bills : (bills?.bills || []);
        const nhiaList = Array.isArray(nhiaBatches) ? nhiaBatches : (nhiaBatches?.data || nhiaBatches?.batches || []);
        setLiveData({
          billingTelemetry: billingStats,
          totalInvoices: billList.length,
          totalNhiaBatches: nhiaList.length
        });
        setExtraRecords(billList);
      } else if (detailType === 'VIEW_APPLICATIONS') {
        const isDevActor = currentUser?.role === 'DEVELOPER' || currentRole === 'DEVELOPER';
        const [tenants, users, leaves] = await Promise.all([
          isDevActor ? api.getTenants().catch(() => []) : Promise.resolve([]),
          api.getUsers().catch(() => []),
          api.getLeaveRequests().catch(() => [])
        ]);
        const tenantList = Array.isArray(tenants) ? tenants : (tenants?.tenants || []);
        const userList = Array.isArray(users) ? users : (users?.users || []);
        const leaveList = Array.isArray(leaves) ? leaves : (leaves?.data || leaves?.requests || []);
        setLiveData({
          totalTenantApplications: tenantList.length,
          pendingTenantApplications: tenantList.filter(t => t.status === 'PENDING' || t.status === 'VERIFICATION_REQUIRED').length,
          totalUserAccounts: userList.length,
          pendingUserAccounts: userList.filter(u => !u.active).length,
          totalStaffLeaveRequests: leaveList.length
        });
        setExtraRecords([
          ...tenantList.map(t => ({
            id: t.id,
            applicationType: 'TENANT_HOSPITAL_REGISTRATION',
            reference: t.tenantId,
            applicantName: t.name,
            email: t.officialEmail,
            status: t.status,
            createdAt: t.createdAt,
            raw: t
          })),
          ...userList.filter(u => !u.active).map(u => ({
            id: u.id,
            applicationType: 'STAFF_ROLE_ACCOUNT',
            reference: u.role?.name || u.role || 'STAFF',
            applicantName: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
            email: u.email,
            status: u.active ? 'ACTIVE' : 'PENDING_APPROVAL',
            createdAt: u.createdAt,
            raw: u
          })),
          ...leaveList.map(l => ({
            id: l.id,
            applicationType: 'HR_LEAVE_APPLICATION',
            reference: l.leaveNumber,
            applicantName: l.staffName,
            email: l.department,
            status: l.status,
            createdAt: l.createdAt,
            raw: l
          }))
        ]);
      } else if (detailType === 'VIEW_REPORTS') {
        if (reportCategory === 'FINANCE_ANNUAL') {
          const annual = await api.getAnnualFinancialReport().catch(() => null);
          setLiveData(annual?.executiveSummary || annual || {});
          setExtraRecords(annual?.ledgerEntries || []);
        } else {
          const [overview, reportsRes] = await Promise.all([
            api.getGlobalOverviewStats().catch(() => null),
            api.getClinicalReports(reportCategory).catch(() => null)
          ]);
          setLiveData({
            selectedReportCategory: reportCategory,
            totalReportsReturned: reportsRes?.totalCount ?? 0,
            ...(overview?.metrics || {})
          });
          setExtraRecords(
            Array.isArray(reportsRes?.reports)
              ? reportsRes.reports
              : (overview?.recentAuditLogs || [])
          );
        }
      } else if (detailType === 'VIEW_RECORDS') {
        if (Array.isArray(detailState?.recordData)) {
          setLiveData({
            module: moduleKey,
            totalRecordsLoaded: detailState.recordData.length
          });
          setExtraRecords(detailState.recordData);
        } else {
          const moduleLoaded = !detailState?.recordData
            ? await fetchModuleLiveRecords(moduleKey)
            : null;

          if (moduleLoaded && Array.isArray(moduleLoaded.records)) {
            setLiveData(moduleLoaded.summary);
            setExtraRecords(moduleLoaded.records);
          } else {
            const overview = await api.getGlobalOverviewStats().catch(() => null);
            if (!detailState?.recordData) {
              setLiveData(overview?.metrics || {});
            } else {
              setLiveData(detailState.recordData);
            }
            if (Array.isArray(detailState?.recordData?.encountersToday)) {
              setExtraRecords(detailState.recordData.encountersToday);
            } else if (Array.isArray(detailState?.recordsList)) {
              setExtraRecords(detailState.recordsList);
            } else if (envRes?.tables) {
              setExtraRecords(envRes.tables);
            }
          }
        }
      } else if (detailType === 'VIEW_DETAILS' && (!detailState?.recordData || Object.keys(detailState.recordData).length === 0)) {
        const loaded = await fetchModuleLiveRecords(moduleKey, recordId);
        if (loaded) {
          if (loaded.matchedRecord) {
            setLiveData(loaded.matchedRecord);
            setExtraRecords(loaded.relatedRecords || []);
          } else {
            setLiveData(loaded.summary || {});
            setExtraRecords(loaded.records || []);
          }
        }
      } else if (detailType === 'VIEW_PROFILE' && recordId && !detailState?.recordData) {
        const normalizedId = String(recordId).toLowerCase();
        if (moduleKey === 'EXECUTIVE_BI') {
          const usersRes = await api.getUsers().catch(() => ({ users: [] }));
          const userList = Array.isArray(usersRes) ? usersRes : (usersRes?.users || []);
          const foundUser = userList.find(
            (u) => String(u.id) === String(recordId) || String(u.email || '').toLowerCase() === normalizedId
          );
          if (foundUser) {
            setLiveData(foundUser);
          } else {
            setLiveData({ directory: 'Hospital Staff Directory', totalStaffReturned: userList.length });
            setExtraRecords(userList);
          }
        } else if (['all', 'directory', 'list'].includes(normalizedId)) {
          const mpi = await api.searchMPI('').catch(() => null);
          const list = Array.isArray(mpi?.patients) ? mpi.patients : [];
          setLiveData({
            directory: 'Master Patient Index',
            totalPatientsReturned: list.length
          });
          setExtraRecords(list);
        } else if (!['summary', 'new'].includes(normalizedId)) {
          const patient = await api.getPatientById(recordId).catch(() => null);
          if (patient) setLiveData(patient);
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to load this information right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveApplication(item) {
    setActionFeedback(null);
    try {
      if (item.applicationType === 'TENANT_HOSPITAL_REGISTRATION') {
        await api.approveTenant(item.id, { trialDays: 30 });
        setActionFeedback({ type: 'success', text: `Approved and provisioned institution ${item.applicantName} (${item.reference}).` });
      } else if (item.applicationType === 'STAFF_ROLE_ACCOUNT') {
        await api.approveUser(item.id);
        setActionFeedback({ type: 'success', text: `Approved staff user account for ${item.applicantName}.` });
      } else if (item.applicationType === 'HR_LEAVE_APPLICATION') {
        await api.decideLeaveRequest(item.id, { status: 'APPROVED', approvedBy: currentRole || 'ADMINISTRATOR' });
        setActionFeedback({ type: 'success', text: `Approved leave request ${item.reference}.` });
      }
      await loadDetailData();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message });
    }
  }

  async function handleSubmitDutyReport(e) {
    e.preventDefault();
    if (!dutyForm.dutiesSummary.trim()) return;
    setSubmittingDuty(true);
    setActionFeedback(null);
    try {
      const staffFullName = currentUser
        ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
        : `${currentRole} Officer`;
      await api.createDutyReport({
        role: currentRole || 'STAFF',
        staffName: staffFullName,
        department: dutyForm.department || moduleKey,
        shiftType: dutyForm.shiftType,
        reportTitle: dutyForm.reportTitle || `${currentRole} Shift Duty Report`,
        dutiesSummary: dutyForm.dutiesSummary,
        challengesNoted: dutyForm.challengesNoted
      });
      setDutyForm({
        reportTitle: '',
        department: '',
        shiftType: 'MORNING_SHIFT',
        dutiesSummary: '',
        challengesNoted: ''
      });
      setActionFeedback({
        type: 'success',
        text: `Shift duty report saved for ${currentRole}.`
      });
      await loadDetailData();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message });
    } finally {
      setSubmittingDuty(false);
    }
  }

  const filteredExtraRecords = extraRecords.filter((item) => {
    if (!detailFilter.trim()) return true;
    return JSON.stringify(item).toLowerCase().includes(detailFilter.trim().toLowerCase());
  });

  const heroImageMap = {
    OVERVIEW: '/assets/images/hospital_hero_exterior.jpg',
    PATIENTS: '/assets/images/patient_registration_archive_real.jpg',
    PATIENT_MPI: '/assets/images/patient_registration_archive_real.jpg',
    PATIENT_PORTAL: '/assets/images/hospital_hero_exterior.jpg',
    CLINICAL: '/assets/images/doctor_consultation_real.jpg',
    WARDS: '/assets/images/inpatient_ward_bed_real.jpg',
    ICU: '/assets/images/inpatient_ward_bed_real.jpg',
    PHARMACY: '/assets/images/pharmacy_dispensary_real.jpg',
    SURGERY: '/assets/images/operating_theatre_real.jpg',
    DENTAL: '/assets/images/dental_clinic_real.jpg',
    EYE_CLINIC: '/assets/images/ophthalmology_eye_clinic_real.jpg',
    EMERGENCY: '/assets/images/emergency_ambulance_fleet_real.jpg',
    LABORATORY: '/assets/images/laboratory_pathology_real.jpg',
    RADIOLOGY: '/assets/images/radiology_pacs_mri_real.jpg',
    BLOOD_BANK: '/assets/images/blood_bank_transfusion_real.jpg',
    MORTUARY: '/assets/images/mortuary_cold_storage_real.jpg',
    BIOMEDICAL: '/assets/images/biomedical_engineering_equipment_real.jpg',
    BILLING: '/assets/images/nhia_claims_center_real.jpg',
    NHIA_CLAIMS: '/assets/images/nhia_claims_center_real.jpg',
    PROCUREMENT: '/assets/images/procurement_supply_chain_real.jpg',
    HR: '/assets/images/hr_medical_staff_real.jpg',
    QUALITY: '/assets/images/quality_infection_control_real.jpg',
    AI_SAFETY: '/assets/images/quality_infection_control_real.jpg',
    EXECUTIVE_BI: '/assets/images/hospital_director_boardroom_real.jpg',
    OPERATIONS_HUB: '/assets/images/hospital_admin_office_real.jpg',
    MIGRATION: '/assets/images/migration_data_center_real.jpg',
    TELEMEDICINE: '/assets/images/telemedicine_command_center_real.jpg',
    VOICE_AUTH: '/assets/images/voice_biometric_security_real.jpg',
    DEVELOPER_NOC: '/assets/images/developer_control_center_real.jpg'
  };
  const detailHeroImg = heroImageMap[moduleKey] || '/assets/images/hospital_hero_exterior.jpg';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s ease-out' }}>
      {/* Top-Left Back Button, Real-Life Department Hero Photograph & Breadcrumb Navigation Bar */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          border: '1px solid var(--border-gold-strong)',
          background: 'linear-gradient(90deg, rgba(212,175,55,0.12) 0%, rgba(15,14,11,0.95) 100%)'
        }}
      >
        <img
          src={detailHeroImg}
          alt={moduleKey}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '45%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.55,
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0))',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 50%, rgba(0,0,0,0))'
          }}
        />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* MANDATORY TOP-LEFT BACK BUTTON */}
          <button
            onClick={onBack}
            className="btn-gold"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              fontSize: '0.88rem',
              fontWeight: 800,
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(212,175,55,0.28)'
            }}
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--gold-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>{moduleKey}</span>
              <span>/</span>
              <span>{detailType.replace(/_/g, ' ')}</span>
              {recordId && recordId !== 'summary' && (
                <>
                  <span>/</span>
                  <span style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{recordId}</span>
                </>
              )}
            </div>
            <h2 className="header-3d" style={{ margin: '4px 0 0', fontSize: '1.52rem', fontWeight: 800 }}>
              {pageTitle}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {pageSubtitle}
            </p>
          </div>
        </div>

        {/* Environment, Route & Print Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontWeight: 800,
              background: envInfo?.activeEnvironment === 'PRODUCTION' ? 'rgba(34,197,94,0.18)' : 'rgba(56,189,248,0.18)',
              border: envInfo?.activeEnvironment === 'PRODUCTION' ? '1px solid #22c55e' : '1px solid #38bdf8',
              color: envInfo?.activeEnvironment === 'PRODUCTION' ? '#86efac' : '#7dd3fc'
            }}
          >
            {envInfo?.activeEnvironment === 'PRODUCTION' ? 'Live Hospital Mode' : 'Training / Practice Mode'}
          </span>

          <button
            onClick={loadDetailData}
            className="btn-outline-gold"
            style={{ padding: '7px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>

          <button
            onClick={() => window.print()}
            className="btn-outline-gold"
            style={{ padding: '7px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={14} /> Print Page
          </button>
        </div>
      </div>

      {/* Feedback or Error Banner */}
      {actionFeedback && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 18px',
            borderLeft: actionFeedback.type === 'error' ? '4px solid #ef4444' : '4px solid #22c55e',
            color: actionFeedback.type === 'error' ? '#fca5a5' : '#86efac',
            fontSize: '0.85rem'
          }}
        >
          {actionFeedback.text}
        </div>
      )}

      {error && (
        <div
          className="glass-panel"
          style={{
            padding: '14px 18px',
            borderLeft: '4px solid #ef4444',
            color: '#fca5a5',
            fontSize: '0.85rem'
          }}
        >
          <AlertTriangle size={16} style={{ display: 'inline', marginRight: '8px' }} />
          {error}
        </div>
      )}

      {/* Official Tenant Hospital Letterhead & Main System Branding Banner (Rendered on All Views & Printed Reports) */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          border: '1px solid var(--border-color)',
          background: 'rgba(8, 16, 32, 0.92)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={facilityBranding?.logoUrl || '/hospital-logo.png'}
            alt="Hospital Logo"
            style={{ width: '44px', height: '44px', borderRadius: '8px', border: '1px solid var(--gold-400)', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gold-400)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {facilityBranding?.mainSystemName || 'GBS HOSPITAL MANAGEMENT SYSTEM'} • Official Report & Dossier Header
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
              🏥 {facilityBranding?.hospitalName || 'GBS Premier Specialist Teaching Hospital'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {facilityBranding?.motto || 'Smart Healthcare, Better Care.'} • Institution Type: {facilityBranding?.organizationType || 'PRIVATE_HOSPITAL'}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div>Prepared / Viewed By Role: <strong style={{ color: 'var(--gold-400)' }}>{currentRole}</strong></div>
          <div>Generated Timestamp: {new Date().toLocaleString()}</div>
        </div>
      </div>

      {/* Report Category Selector & Role Duty Report Preparation Panel (Active when viewing Reports) */}
      {detailType === 'VIEW_REPORTS' && (
        <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--gold-400)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--gold-400)' }}>
                Select Specific Hospital Report Category
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Choose the specific type of clinical, laboratory, vitals, consultation, financial, or staff duty report to inspect or print
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All Reports' },
                { id: 'LAB_REPORTS', label: 'Laboratory Reports' },
                { id: 'VITALS_TRIAGE', label: 'Nurse Vitals & Triage' },
                { id: 'CONSULTATION', label: 'Doctor Consultations' },
                { id: 'DISPATCHED_REPORTS', label: 'Doctor → Specialist Sent Reports' },
                { id: 'PHARMACY', label: 'Pharmacy Dispensing' },
                { id: 'RADIOLOGY', label: 'Radiology & PACS' },
                { id: 'FINANCE_ANNUAL', label: 'Accountant Annual Financial Wrap' },
                { id: 'STAFF_DUTY', label: 'Role Duty Reports' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setReportCategory(cat.id)}
                  className={reportCategory === cat.id ? 'btn-gold' : 'btn-outline-gold'}
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmitDutyReport} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '10px' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
              📝 Prepare & Submit Role Duty Report ({currentRole})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                className="input-gold"
                placeholder="Report Title (e.g. Ward Shift Handover & Duties)"
                value={dutyForm.reportTitle}
                onChange={(e) => setDutyForm({ ...dutyForm, reportTitle: e.target.value })}
                required
              />
              <input
                type="text"
                className="input-gold"
                placeholder={`Department (e.g. ${moduleKey})`}
                value={dutyForm.department}
                onChange={(e) => setDutyForm({ ...dutyForm, department: e.target.value })}
              />
              <select
                className="input-gold"
                value={dutyForm.shiftType}
                onChange={(e) => setDutyForm({ ...dutyForm, shiftType: e.target.value })}
              >
                <option value="MORNING_SHIFT">Morning Shift (07:00 - 15:00)</option>
                <option value="AFTERNOON_SHIFT">Afternoon Shift (15:00 - 23:00)</option>
                <option value="NIGHT_SHIFT">Night Shift (23:00 - 07:00)</option>
                <option value="FULL_DAY_DUTY">Full Day / On-Call Duty</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                className="input-gold"
                placeholder="Detailed summary of duties performed during shift..."
                value={dutyForm.dutiesSummary}
                onChange={(e) => setDutyForm({ ...dutyForm, dutiesSummary: e.target.value })}
                required
              />
              <input
                type="text"
                className="input-gold"
                placeholder="Challenges / Escalations (Optional)"
                value={dutyForm.challengesNoted}
                onChange={(e) => setDutyForm({ ...dutyForm, challengesNoted: e.target.value })}
              />
              <button type="submit" disabled={submittingDuty} className="btn-gold" style={{ padding: '9px 16px', fontSize: '0.8rem' }}>
                {submittingDuty ? 'Saving...' : 'Submit Duty Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Primary Record / Summary Data Panel */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} />
            Live Hospital Record Details
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Page: {typeof window !== 'undefined' ? window.location.pathname : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading latest information...
          </div>
        ) : liveData && typeof liveData === 'object' && Object.keys(liveData).length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            {Object.entries(liveData).map(([key, value]) => {
              if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                return (
                  <div
                    key={key}
                    style={{
                      gridColumn: '1 / -1',
                      background: 'rgba(0,0,0,0.4)',
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold-400)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      {formatKeyLabel(key)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                      {Object.entries(value).map(([subKey, subVal]) => (
                        <div key={subKey} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatKeyLabel(subKey)}</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', marginTop: '2px', wordBreak: 'break-word' }}>
                            {formatFieldValue(subVal)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  style={{
                    background: 'rgba(0,0,0,0.45)',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {formatKeyLabel(key)}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginTop: '4px', fontFamily: typeof value === 'number' ? 'var(--font-mono)' : 'inherit', wordBreak: 'break-word' }}>
                    {formatFieldValue(value)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.28)', borderRadius: '10px' }}>
            No records added for this view yet.
          </div>
        )}
      </div>

      {/* Associated Records / Logs / Applications Table */}
      {(extraRecords.length > 0 || ['VIEW_RECORDS', 'VIEW_HISTORY', 'VIEW_NOTIFICATIONS', 'VIEW_TRANSACTIONS', 'VIEW_APPLICATIONS', 'VIEW_SYSTEM_INFORMATION', 'VIEW_HOSPITAL_INFORMATION'].includes(detailType)) && (
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--gold-400)' }}>
                {detailType === 'VIEW_APPLICATIONS' ? 'Submitted Applications & Approvals Queue' :
                  detailType === 'VIEW_TRANSACTIONS' ? 'Bills, Payments & Receipts' :
                    detailType === 'VIEW_HISTORY' ? 'Activity History & Audit Log' :
                      detailType === 'VIEW_NOTIFICATIONS' ? 'Hospital Alerts & Messages' :
                        detailType === 'VIEW_SYSTEM_INFORMATION' ? 'System Data & Environment Summary' :
                          'Related Records'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Showing {filteredExtraRecords.length} live records
              </p>
            </div>

            <input
              type="text"
              placeholder="Search or filter this list..."
              value={detailFilter}
              onChange={(e) => setDetailFilter(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(6, 12, 24, 0.88)',
                border: '1px solid var(--border-gold)',
                color: '#fff',
                fontSize: '0.82rem',
                minWidth: '240px'
              }}
            />
          </div>

          {filteredExtraRecords.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.32)', borderRadius: '10px' }}>
              No records found yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-gold)', color: 'var(--gold-400)', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>IDENTIFIER / MODULE</th>
                    <th style={{ padding: '10px' }}>SUMMARY / DESCRIPTION</th>
                    <th style={{ padding: '10px' }}>STATUS / SOURCE</th>
                    <th style={{ padding: '10px' }}>TIMESTAMP</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExtraRecords.map((row, idx) => {
                    const identifier =
                      row.reference ||
                      row.invoiceNumber ||
                      row.billNumber ||
                      row.monitorCode ||
                      row.suggestionCode ||
                      row.overrideCode ||
                      row.sessionCode ||
                      row.jobCode ||
                      row.meetingCode ||
                      row.documentCode ||
                      row.taskCode ||
                      row.recordCode ||
                      row.requestNumber ||
                      row.accessionNumber ||
                      row.tableKey ||
                      row.action ||
                      row.type ||
                      row.code ||
                      row.mrn ||
                      row.patientNumber ||
                      row.id ||
                      `ROW-${idx + 1}`;
                    const summary =
                      row.applicantName ||
                      row.label ||
                      row.recommendationSummary ||
                      row.overrideReason ||
                      row.description ||
                      row.title ||
                      row.patientName ||
                      row.name ||
                      (row.firstName ? `${row.firstName} ${row.lastName || ''}` : '') ||
                      JSON.stringify(row).slice(0, 90);
                    const statusBadge =
                      row.status ||
                      row.urgency ||
                      (row.totalCount !== undefined ? `${row.totalCount} records (Prod: ${row.productionCount ?? row.totalCount})` : 'RECORDED');
                    const timestamp = row.createdAt || row.latestCreatedAt || row.issuedAt || null;

                    return (
                      <tr key={row.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
                          {identifier}
                        </td>
                        <td style={{ padding: '10px', color: '#fff' }}>
                          <div>{summary}</div>
                          {row.message && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.message}</div>}
                          {row.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.email}</div>}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span className="badge badge-outline-gold" style={{ fontSize: '0.72rem' }}>
                            {statusBadge}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {timestamp ? new Date(timestamp).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {detailType === 'VIEW_APPLICATIONS' && (row.status === 'PENDING' || row.status === 'PENDING_APPROVAL') && (
                              <button
                                onClick={() => handleApproveApplication(row)}
                                className="btn-gold"
                                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                              >
                                Approve
                              </button>
                            )}
                            {onNavigateDetail && (
                              <button
                                onClick={() =>
                                  onNavigateDetail({
                                    detailType: 'VIEW_DETAILS',
                                    moduleKey,
                                    recordId: String(identifier),
                                    title: `Record Details: ${identifier}`,
                                    recordData: row.raw || row
                                  })
                                }
                                className="btn-outline-gold"
                                style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={12} /> View Details
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

async function fetchModuleLiveRecords(moduleKey, recordId = null) {
  const matchRecord = (rows) => {
    if (!recordId || ['all', 'summary', 'live', 'directory'].includes(String(recordId).toLowerCase())) {
      return null;
    }
    const target = String(recordId).toLowerCase();
    return rows.find((r) =>
      [
        r.id,
        r.code,
        r.monitorCode,
        r.suggestionCode,
        r.overrideCode,
        r.sessionCode,
        r.jobCode,
        r.meetingCode,
        r.documentCode,
        r.taskCode,
        r.recordCode,
        r.requestNumber,
        r.accessionNumber,
        r.billNumber,
        r.email
      ].some((v) => v !== undefined && v !== null && String(v).toLowerCase() === target)
    ) || null;
  };

  try {
    if (moduleKey === 'EXECUTIVE_BI') {
      const [usersRes, counts] = await Promise.all([
        api.getUsers().catch(() => ({ users: [] })),
        api.getCountsByRole().catch(() => null)
      ]);
      const records = Array.isArray(usersRes) ? usersRes : (usersRes?.users || []);
      return {
        summary: {
          module: 'Executive BI & Staff Governance',
          totalSystemUsers: counts?.summary?.totalSystemUsers ?? records.length,
          totalActiveUsers: counts?.summary?.totalActiveUsers ?? records.filter((u) => u.active).length
        },
        records,
        matchedRecord: matchRecord(records)
      };
    }

    if (moduleKey === 'OPERATIONS_HUB') {
      const [mRes, dRes, fRes] = await Promise.all([
        api.getMeetings().catch(() => ({ meetings: [] })),
        api.getDocuments().catch(() => ({ documents: [] })),
        api.getFacilityTasks().catch(() => ({ tasks: [] }))
      ]);
      const meetings = mRes?.meetings || [];
      const documents = dRes?.documents || [];
      const tasks = fRes?.tasks || [];
      const records = [...meetings, ...documents, ...tasks];
      return {
        summary: {
          module: 'Hospital Operations Suite',
          totalMeetings: meetings.length,
          totalDocuments: documents.length,
          totalFacilityTasks: tasks.length
        },
        records,
        matchedRecord: matchRecord(records)
      };
    }

    if (moduleKey === 'ICU') {
      const monRes = await api.getIcuMonitors().catch(() => ({ records: [] }));
      const records = monRes?.records || (Array.isArray(monRes) ? monRes : []);
      return {
        summary: { module: 'ICU & Live Vitals Telemetry', totalReadings: records.length },
        records,
        matchedRecord: matchRecord(records)
      };
    }

    if (moduleKey === 'AI_SAFETY') {
      const [sugRes, ovrRes] = await Promise.all([
        api.getAiClinicalSuggestions().catch(() => ({ suggestions: [] })),
        api.getClinicalSafetyOverrides().catch(() => ({ overrides: [] }))
      ]);
      const suggestions = sugRes?.suggestions || [];
      const overrides = ovrRes?.overrides || [];
      const records = [...suggestions, ...overrides];
      return {
        summary: {
          module: 'Patient Safety Guardrails & AI Clinical Assistance',
          totalAiSuggestions: suggestions.length,
          totalSafetyOverrides: overrides.length
        },
        records,
        matchedRecord: matchRecord(records)
      };
    }

    if (moduleKey === 'TELEMEDICINE') {
      const [consRes, geoRes] = await Promise.all([
        api.getTelemedicineConsultations().catch(() => ({ data: [] })),
        api.getGeofences().catch(() => ({ data: [] }))
      ]);
      const consultations = Array.isArray(consRes?.data) ? consRes.data : (Array.isArray(consRes) ? consRes : []);
      const geofences = Array.isArray(geoRes?.data) ? geoRes.data : (Array.isArray(geoRes) ? geoRes : []);
      const records = [...consultations, ...geofences];
      return {
        summary: {
          module: 'Telemedicine & GIS Facility Tracking',
          totalConsultations: consultations.length,
          totalGeofences: geofences.length
        },
        records,
        matchedRecord: matchRecord(records)
      };
    }

    if (moduleKey === 'MIGRATION') {
      if (recordId && !['all', 'summary', 'live'].includes(String(recordId).toLowerCase())) {
        const one = await api.getMigrationJob(recordId).catch(() => null);
        if (one?.data) {
          return {
            summary: { module: 'Enterprise Data Migration Hub', jobCode: one.data.jobCode },
            records: one.data.records || [],
            matchedRecord: one.data,
            relatedRecords: one.data.records || []
          };
        }
      }
      const jobsRes = await api.getMigrationJobs().catch(() => ({ data: [] }));
      const records = Array.isArray(jobsRes?.data) ? jobsRes.data : (Array.isArray(jobsRes) ? jobsRes : []);
      return {
        summary: { module: 'Enterprise Data Migration Hub', totalJobs: records.length },
        records,
        matchedRecord: matchRecord(records)
      };
    }

    if (moduleKey === 'DENTAL') {
      const res = await api.getDentalRecords().catch(() => ({ records: [] }));
      const records = res?.records || (Array.isArray(res) ? res : []);
      return { summary: { module: 'Dental Clinic', totalRecords: records.length }, records, matchedRecord: matchRecord(records) };
    }

    if (moduleKey === 'EYE_CLINIC') {
      const res = await api.getEyeClinicExams().catch(() => ({ exams: [] }));
      const records = res?.exams || res?.records || (Array.isArray(res) ? res : []);
      return { summary: { module: 'Eye Clinic & Ophthalmology', totalExams: records.length }, records, matchedRecord: matchRecord(records) };
    }

    if (moduleKey === 'LABORATORY') {
      const res = await api.getLabRequests().catch(() => []);
      const records = Array.isArray(res) ? res : (res?.requests || res?.data || []);
      return { summary: { module: 'Laboratory & Pathology', totalRequests: records.length }, records, matchedRecord: matchRecord(records) };
    }

    if (moduleKey === 'RADIOLOGY') {
      const res = await api.getRadiologyOrders().catch(() => []);
      const records = Array.isArray(res) ? res : (res?.orders || res?.data || []);
      return { summary: { module: 'Radiology & PACS', totalOrders: records.length }, records, matchedRecord: matchRecord(records) };
    }

    if (moduleKey === 'BILLING') {
      const res = await api.getBills().catch(() => []);
      const records = Array.isArray(res) ? res : (res?.bills || res?.data || []);
      return { summary: { module: 'Billing & Payments', totalBills: records.length }, records, matchedRecord: matchRecord(records) };
    }
  } catch (_err) {
    return null;
  }
  return null;
}

function formatDetailTitle(detailType, moduleKey) {
  const map = {
    VIEW_DETAILS: `${moduleKey} — Full Details`,
    VIEW_PROFILE: `${moduleKey} — Profile & Info`,
    VIEW_RECORDS: `${moduleKey} — All Records`,
    VIEW_REPORTS: `${moduleKey} — Department Reports`,
    VIEW_TRANSACTIONS: `${moduleKey} — Bills & Payments`,
    VIEW_HISTORY: `${moduleKey} — Activity History`,
    VIEW_NOTIFICATIONS: `${moduleKey} — Alerts & Messages`,
    VIEW_APPLICATIONS: `${moduleKey} — Applications & Requests`,
    VIEW_HOSPITAL_INFORMATION: `Hospital Details & Setup`,
    VIEW_SYSTEM_INFORMATION: `System Health & Data Overview`
  };
  return map[detailType] || `${moduleKey} — Details`;
}

function formatKeyLabel(key) {
  return String(key)
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim();
}

function formatFieldValue(val) {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes (Active / Verified)' : 'No';
  if (Array.isArray(val)) return val.length === 0 ? '0 items' : `${val.length} linked records`;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

