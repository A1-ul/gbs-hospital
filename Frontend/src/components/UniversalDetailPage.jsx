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
  currentRole
}) {
  const [loading, setLoading] = useState(false);
  const [liveData, setLiveData] = useState(detailState?.recordData || null);
  const [extraRecords, setExtraRecords] = useState([]);
  const [envInfo, setEnvInfo] = useState(null);
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [detailFilter, setDetailFilter] = useState('');

  const detailType = detailState?.detailType || 'VIEW_DETAILS';
  const moduleKey = detailState?.moduleKey || 'OVERVIEW';
  const recordId = detailState?.recordId || 'summary';
  const pageTitle = detailState?.title || formatDetailTitle(detailType, moduleKey);
  const pageSubtitle =
    detailState?.subtitle ||
    `Dedicated ${detailType.replace(/_/g, ' ')} view connected to PostgreSQL (${moduleKey})`;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadDetailData();
  }, [detailType, moduleKey, recordId]);

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
        const [overview, wards, theatres, tenants] = await Promise.all([
          api.getGlobalOverviewStats().catch(() => null),
          api.getWards().catch(() => []),
          api.getOperatingTheatres().catch(() => []),
          api.getTenants().catch(() => [])
        ]);
        setLiveData({
          overview: overview?.metrics || {},
          totalWards: Array.isArray(wards) ? wards.length : 0,
          totalOperatingTheatres: Array.isArray(theatres) ? theatres.length : 0,
          registeredInstitutions: Array.isArray(tenants) ? tenants.length : 0
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
        setLiveData({
          billingTelemetry: billingStats,
          totalInvoices: billList.length,
          totalNhiaBatches: Array.isArray(nhiaBatches) ? nhiaBatches.length : 0
        });
        setExtraRecords(billList);
      } else if (detailType === 'VIEW_APPLICATIONS') {
        const [tenants, users, leaves] = await Promise.all([
          api.getTenants().catch(() => []),
          api.getUsers().catch(() => []),
          api.getLeaveRequests().catch(() => [])
        ]);
        const tenantList = Array.isArray(tenants) ? tenants : (tenants?.tenants || []);
        const userList = Array.isArray(users) ? users : (users?.users || []);
        const leaveList = Array.isArray(leaves) ? leaves : [];
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
        const overview = await api.getGlobalOverviewStats().catch(() => null);
        setLiveData(overview?.metrics || {});
        setExtraRecords(overview?.recentAuditLogs || []);
      } else if (detailType === 'VIEW_RECORDS') {
        const overview = await api.getGlobalOverviewStats().catch(() => null);
        if (!detailState?.recordData) {
          setLiveData(overview?.metrics || {});
        }
        if (Array.isArray(detailState?.recordsList)) {
          setExtraRecords(detailState.recordsList);
        } else if (envRes?.tables) {
          setExtraRecords(envRes.tables);
        }
      } else if (detailType === 'VIEW_PROFILE' && recordId && recordId !== 'summary' && !detailState?.recordData) {
        const patient = await api.getPatientById(recordId).catch(() => null);
        if (patient) setLiveData(patient);
      }
    } catch (err) {
      setError(err.message || 'Unable to load detail record from PostgreSQL');
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

  const filteredExtraRecords = extraRecords.filter((item) => {
    if (!detailFilter.trim()) return true;
    return JSON.stringify(item).toLowerCase().includes(detailFilter.trim().toLowerCase());
  });

  const heroImageMap = {
    PATIENTS: '/assets/images/patient_registration_archive_real.jpg',
    PATIENT_MPI: '/assets/images/patient_registration_archive_real.jpg',
    CLINICAL: '/assets/images/doctor_consultation_real.jpg',
    WARDS: '/assets/images/inpatient_ward_bed_real.jpg',
    PHARMACY: '/assets/images/pharmacy_dispensary_real.jpg',
    SURGERY: '/assets/images/operating_theatre_real.jpg',
    EMERGENCY: '/assets/images/emergency_ambulance_fleet_real.jpg',
    BLOOD_BANK: '/assets/images/blood_bank_transfusion_real.jpg',
    MORTUARY: '/assets/images/mortuary_cold_storage_real.jpg',
    BIOMEDICAL: '/assets/images/biomedical_engineering_equipment_real.jpg',
    PROCUREMENT: '/assets/images/procurement_supply_chain_real.jpg',
    HR: '/assets/images/hr_medical_staff_real.jpg',
    QUALITY: '/assets/images/quality_infection_control_real.jpg',
    NHIA_CLAIMS: '/assets/images/nhia_claims_center_real.jpg',
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
            title="Return to exact previous dashboard page with filters, tab, and scroll position preserved"
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
            <h2 style={{ margin: '4px 0 0', fontSize: '1.45rem', fontWeight: 800, color: '#fff' }}>
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
            ENV: {envInfo?.activeEnvironment || 'DEVELOPMENT'} • PostgreSQL
          </span>

          <button
            onClick={loadDetailData}
            className="btn-outline-gold"
            style={{ padding: '7px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} /> Refresh Live Data
          </button>

          <button
            onClick={() => window.print()}
            className="btn-outline-gold"
            style={{ padding: '7px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={14} /> Print Dossier
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

      {/* Primary Record / Summary Data Panel */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} />
            Authoritative PostgreSQL Record Attributes
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            URL: {typeof window !== 'undefined' ? window.location.pathname : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading live record attributes from PostgreSQL...
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
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
            No records available in PostgreSQL for this view yet.
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
                 detailType === 'VIEW_TRANSACTIONS' ? 'Financial Invoices & Payment Ledger' :
                 detailType === 'VIEW_HISTORY' ? 'Immutable PostgreSQL Audit Log Trail' :
                 detailType === 'VIEW_NOTIFICATIONS' ? 'System & Clinical Broadcast Notifications' :
                 detailType === 'VIEW_SYSTEM_INFORMATION' ? 'Database Table Record & Environment Source Matrix' :
                 'Associated PostgreSQL Records'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Showing {filteredExtraRecords.length} live database entries (0 fake or sample rows)
              </p>
            </div>

            <input
              type="text"
              placeholder="Filter records on this page..."
              value={detailFilter}
              onChange={(e) => setDetailFilter(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#12100d',
                border: '1px solid var(--border-gold)',
                color: '#fff',
                fontSize: '0.82rem',
                minWidth: '240px'
              }}
            />
          </div>

          {filteredExtraRecords.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.35)', borderRadius: '8px' }}>
              No records available
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
                      row.tableKey ||
                      row.action ||
                      row.type ||
                      row.code ||
                      row.mrn ||
                      row.id ||
                      `ROW-${idx + 1}`;
                    const summary =
                      row.applicantName ||
                      row.label ||
                      row.description ||
                      row.title ||
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

function formatDetailTitle(detailType, moduleKey) {
  const map = {
    VIEW_DETAILS: `${moduleKey} — Record Details Dossier`,
    VIEW_PROFILE: `${moduleKey} — Profile & Identity Dossier`,
    VIEW_RECORDS: `${moduleKey} — Complete PostgreSQL Records Register`,
    VIEW_REPORTS: `${moduleKey} — Analytical & Clinical Reports`,
    VIEW_TRANSACTIONS: `${moduleKey} — Financial Transactions & Invoices`,
    VIEW_HISTORY: `${moduleKey} — Chronological Audit & Activity History`,
    VIEW_NOTIFICATIONS: `${moduleKey} — Real-Time Alerts & Notifications`,
    VIEW_APPLICATIONS: `${moduleKey} — Pending Applications & Onboarding Queue`,
    VIEW_HOSPITAL_INFORMATION: `Hospital Facility & Infrastructure Information`,
    VIEW_SYSTEM_INFORMATION: `System Telemetry, Environment & Database Information`
  };
  return map[detailType] || `${moduleKey} — Detailed Information`;
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

