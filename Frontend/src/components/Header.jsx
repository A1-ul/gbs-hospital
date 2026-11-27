import React, { useState, useEffect } from 'react';
import {
  Activity, Database, Shield, Users, Clock, AlertTriangle,
  ChevronDown, Search, PlusCircle, Bed, FlaskConical, Pill, FileText,
  UserCheck, Lock, LogIn, LogOut, Key, Bell
} from 'lucide-react';
import { api } from '../services/api.service';
import { connectionManager, CONNECTION_STATES } from '../services/connection.manager';

function formatServerUptime(totalSeconds) {
  if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '—';
  }
  const sec = Math.floor(totalSeconds);
  const hours = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remSec = sec % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${remSec}s`;
  return `${remSec}s`;
}

export const ROLE_CATEGORIES = [
  { id: 'ALL', label: 'All Staff Roles', icon: '⭐' },
  { id: 'EXECUTIVE', label: 'Leadership & Admin', icon: '🏛️' },
  { id: 'PHYSICIANS', label: 'Doctors & Specialists', icon: '🩺' },
  { id: 'NURSING_DIAGNOSTICS', label: 'Nurses, Pharmacy & Lab', icon: '🏥' },
  { id: 'OPERATIONS', label: 'Front Desk, Billing & Patients', icon: '📋' }
];

export const ROLES = [
  { id: 'ADMINISTRATOR', name: 'Administrator', desc: 'Hospital management, staff accounts & settings', img: '/assets/images/portrait_admin.jpg', loginBg: '/assets/images/hospital_admin_office_real.jpg', dept: 'Hospital Administration', category: 'EXECUTIVE' },
  { id: 'HOSPITAL_DIRECTOR', name: 'Hospital Director', desc: 'Executive overview & hospital performance', img: '/assets/images/portrait_director.jpg', loginBg: '/assets/images/hospital_director_boardroom_real.jpg', dept: 'Medical Director Office', category: 'EXECUTIVE' },
  { id: 'DEVELOPER', name: 'Developer Control', desc: 'System health, error logs, permissions & privacy', img: '/assets/images/portrait_developer.jpg', loginBg: '/assets/images/developer_control_center_real.jpg', dept: 'System Engineering', category: 'EXECUTIVE' },
  { id: 'DOCTOR', name: 'Medical Doctor', desc: 'See patients, write notes, prescribe & order tests', img: '/assets/images/portrait_doctor.jpg', loginBg: '/assets/images/doctor_consultation_real.jpg', dept: 'General Medicine', category: 'PHYSICIANS' },
  { id: 'SURGEON', name: 'Surgeon', desc: 'Plan surgeries, operating rooms & recovery care', img: '/assets/images/portrait_surgeon.jpg', loginBg: '/assets/images/operating_theatre_real.jpg', dept: 'Surgery & Operating Rooms', category: 'PHYSICIANS' },
  { id: 'DENTIST', name: 'Dentist', desc: 'Dental checkups, treatments & oral care', img: '/assets/images/portrait_dentist.jpg', loginBg: '/assets/images/dental_clinic_real.jpg', dept: 'Dental Clinic', category: 'PHYSICIANS' },
  { id: 'EYE_DOCTOR', name: 'Eye Doctor', desc: 'Vision tests, eye care & eye procedures', img: '/assets/images/portrait_eye_doctor.jpg', loginBg: '/assets/images/ophthalmology_eye_clinic_real.jpg', dept: 'Eye Clinic', category: 'PHYSICIANS' },
  { id: 'RADIOLOGIST', name: 'Radiologist', desc: 'Read X-rays, MRI/CT scans & write reports', img: '/assets/images/portrait_radiologist.jpg', loginBg: '/assets/images/radiology_pacs_mri_real.jpg', dept: 'X-Rays & Scans', category: 'PHYSICIANS' },
  { id: 'NURSE', name: 'Nurse', desc: 'Check vital signs, ward notes & patient care', img: '/assets/images/portrait_nurse.jpg', loginBg: '/assets/images/nurse_triage_station.jpg', dept: 'Nursing & Wards', category: 'NURSING_DIAGNOSTICS' },
  { id: 'PHARMACIST', name: 'Pharmacist', desc: 'Give out medicines, manage stock & expiry alerts', img: '/assets/images/portrait_pharmacist.jpg', loginBg: '/assets/images/pharmacy_dispensary_real.jpg', dept: 'Hospital Pharmacy', category: 'NURSING_DIAGNOSTICS' },
  { id: 'LAB_TECHNICIAN', name: 'Lab Technician', desc: 'Collect lab samples, run tests & share results', img: '/assets/images/portrait_lab_scientist.jpg', loginBg: '/assets/images/laboratory_pathology_real.jpg', dept: 'Laboratory & Blood Bank', category: 'NURSING_DIAGNOSTICS' },
  { id: 'RECEPTIONIST', name: 'Receptionist', desc: 'Register new patients, check in & manage queue', img: '/assets/images/portrait_receptionist.jpg', loginBg: '/assets/images/patient_registration_archive_real.jpg', dept: 'Front Desk', category: 'OPERATIONS' },
  { id: 'FOLDER_RETRIEVER', name: 'File Archivist', desc: 'Find and deliver paper patient folders', img: '/assets/images/portrait_archivist.jpg', loginBg: '/assets/images/medical_records_archive_real.jpg', dept: 'Medical Records Room', category: 'OPERATIONS' },
  { id: 'ACCOUNTANT', name: 'Accountant', desc: 'Create patient bills, collect payments & NHIS', img: '/assets/images/portrait_accountant.jpg', loginBg: '/assets/images/nhia_claims_center_real.jpg', dept: 'Billing & Accounts', category: 'OPERATIONS' },
  { id: 'HR_MANAGER', name: 'HR Manager', desc: 'Staff schedules, licenses, attendance & leave', img: '/assets/images/portrait_hr_manager.jpg', loginBg: '/assets/images/hr_medical_staff_real.jpg', dept: 'Human Resources', category: 'OPERATIONS' },
  { id: 'PATIENT', name: 'Patient Portal', desc: 'View your visits, appointments & records', img: '/assets/images/portrait_patient.jpg', loginBg: '/assets/images/patient_registration_archive_real.jpg', dept: 'Patient Self-Service', category: 'OPERATIONS' }
];

export default function Header({
  currentRole,
  onSelectRole,
  onOpenLogin,
  currentUser,
  onLogout,
  onOpenQuickAction,
  facilityBranding,
  onUpdateFacilityBranding,
  demoQuota = null
}) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [connState, setConnState] = useState(() => connectionManager.getState());
  const [showRoleCounts, setShowRoleCounts] = useState(false);
  const [roleCountsData, setRoleCountsData] = useState(null);
  const [countsError, setCountsError] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [expandedRoleName, setExpandedRoleName] = useState(null);
  const [expandedRoleUsers, setExpandedRoleUsers] = useState([]);
  const [loadingRoleUsers, setLoadingRoleUsers] = useState(false);
  const [roleActionFeedback, setRoleActionFeedback] = useState('');
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [hospitalNameInput, setHospitalNameInput] = useState('');
  const [mottoInput, setMottoInput] = useState('');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [organizationTypeInput, setOrganizationTypeInput] = useState('PRIVATE_HOSPITAL');
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingFeedback, setBrandingFeedback] = useState('');

  const [roleCategory, setRoleCategory] = useState('ALL');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const loadNotifications = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gbs_token') : null;
      if (!token) return;
      const res = await api.getRcceNotifications();
      if (res && Array.isArray(res.notifications)) {
        setNotificationsList(res.notifications);
        setUnreadNotifications(res.unreadCount ?? res.notifications.filter(n => !n.isRead).length);
      }
    } catch (_err) {
      // ignore unauthenticated polls cleanly
    }
  };

  useEffect(() => {
    loadNotifications();
    const poll = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadNotifications();
    }, 45000);

    // Live SSE push channel from GBS-RCCE Event & Notification Engine
    let evtSource = null;
    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      const token = localStorage.getItem('gbs_token');
      if (token) {
        const apiBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '/api/v1';
        try {
          evtSource = new EventSource(`${apiBase}/rcce/notifications/stream?token=${encodeURIComponent(token)}`);
          evtSource.addEventListener('notification', (event) => {
            try {
              const payload = JSON.parse(event.data);
              const note = payload?.notification;
              if (note) {
                setNotificationsList((prev) => [note, ...prev.filter((item) => item.id !== note.id)].slice(0, 40));
                setUnreadNotifications((prev) => prev + 1);
                if (typeof window.gbsBrainNotify === 'function') {
                  window.gbsBrainNotify({
                    type: note.severity === 'ERROR' || note.severity === 'WARNING' ? 'error' : 'info',
                    method: 'SSE',
                    code: note.eventType,
                    requestId: note.requestId || null,
                    title: note.title || 'Live System Notification',
                    message: note.message,
                    role: currentRole,
                  });
                }
              }
            } catch (_parseErr) { }
          });
        } catch (_sseErr) { }
      }
    }

    return () => {
      clearInterval(poll);
      if (evtSource) {
        evtSource.close();
      }
    };
  }, [currentRole, currentUser]);

  const isDeveloperAuthenticated = Boolean(
    currentUser &&
    (currentUser.role === 'DEVELOPER' || String(currentUser.email || '').toLowerCase() === 'gabosei48@gmail.com')
  );

  const canCustomizeHospitalName =
    ['ADMINISTRATOR', 'HOSPITAL_DIRECTOR', 'DEVELOPER'].includes(currentRole) ||
    ['ADMINISTRATOR', 'HOSPITAL_DIRECTOR', 'DEVELOPER'].includes(currentUser?.role);

  const visibleRoles = ROLES.filter(role => role.id !== 'DEVELOPER' || isDeveloperAuthenticated);
  const filteredRoles = visibleRoles.filter(role => roleCategory === 'ALL' || role.category === roleCategory);

  const activeHospitalName = facilityBranding?.hospitalName || 'GBS Premier Specialist Teaching Hospital';
  const activeHospitalMotto = facilityBranding?.motto || facilityBranding?.facilityTagline || 'Smart Healthcare, Better Care.';
  const activeLogoUrl = facilityBranding?.logoUrl || '/hospital-logo.png';
  const activeOrganizationType = facilityBranding?.organizationType || 'PRIVATE_HOSPITAL';

  const openHospitalNameModal = () => {
    setHospitalNameInput(activeHospitalName);
    setMottoInput(activeHospitalMotto);
    setLogoUrlInput(facilityBranding?.logoUrl || '');
    setOrganizationTypeInput(activeOrganizationType);
    setBrandingFeedback('');
    setShowBrandingModal(true);
  };

  const handleSaveHospitalBranding = async (e) => {
    e.preventDefault();
    if (!hospitalNameInput.trim()) return;
    setSavingBranding(true);
    setBrandingFeedback('');
    try {
      const updated = await api.updateFacilityBranding({
        hospitalName: hospitalNameInput.trim(),
        motto: mottoInput.trim() || 'Smart Healthcare, Better Care.',
        facilityTagline: mottoInput.trim() || 'Smart Healthcare, Better Care.',
        logoUrl: logoUrlInput.trim(),
        organizationType: organizationTypeInput,
        updatedBy: currentUser?.email || currentRole || 'Administrator'
      });
      if (onUpdateFacilityBranding) {
        onUpdateFacilityBranding(updated);
      }
      setBrandingFeedback(`Saved! Preferred Hospital Name is now "${updated.hospitalName}". Main System Name remains "${updated.mainSystemName}".`);
      setTimeout(() => setShowBrandingModal(false), 1100);
    } catch (err) {
      setBrandingFeedback(`Error: ${err.message}`);
    } finally {
      setSavingBranding(false);
    }
  };

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live Multi-Layer Connection Monitor (Auto-Reconnecting, Zero False Offline Flashes)
  useEffect(() => {
    const unsubscribe = connectionManager.subscribe(setConnState);
    connectionManager.start();
    return () => {
      unsubscribe();
    };
  }, []);

  const overallStatus = connState.overallStatus || CONNECTION_STATES.CHECKING;
  const statusDisplay =
    overallStatus === CONNECTION_STATES.ONLINE
      ? { label: 'Online', color: 'var(--status-online)', dot: '#10b981' }
      : overallStatus === CONNECTION_STATES.DEGRADED
        ? { label: connState.isReconnecting ? 'Reconnecting...' : 'Degraded', color: '#f59e0b', dot: '#f59e0b' }
        : overallStatus === CONNECTION_STATES.OFFLINE
          ? { label: 'Offline', color: '#f87171', dot: '#ef4444' }
          : { label: 'Connecting...', color: '#38bdf8', dot: '#38bdf8' };

  const dbDisplay =
    connState.databaseStatus === CONNECTION_STATES.ONLINE
      ? {
          label:
            typeof connState.databaseLatencyMs === 'number'
              ? `Connected (${connState.databaseLatencyMs}ms)`
              : 'Connected (Live Data)',
          color: '#fff',
        }
      : connState.databaseStatus === CONNECTION_STATES.DEGRADED
        ? { label: 'Degraded', color: '#fbbf24' }
        : connState.databaseStatus === CONNECTION_STATES.OFFLINE
          ? { label: 'Disconnected', color: '#f87171' }
          : { label: 'Checking...', color: 'var(--text-muted)' };

  const centralEngineLabel =
    connState.centralEngineStatus === CONNECTION_STATES.ONLINE
      ? (typeof connState.apiResponseTimeMs === 'number' ? `Online (${connState.apiResponseTimeMs}ms)` : 'Online')
      : connState.centralEngineStatus === CONNECTION_STATES.DEGRADED
        ? (connState.isReconnecting ? 'Reconnecting' : 'Degraded')
        : connState.centralEngineStatus === CONNECTION_STATES.OFFLINE
          ? 'Offline'
          : 'Checking...';

  const uptimeDisplay = formatServerUptime(connState.serverUptimeSeconds);

  // Fetch DB-backed User Counts ONLY on drop-list click (Step 7 requirement!)
  const refreshRoleCounts = async () => {
    setLoadingCounts(true);
    setCountsError(null);
    try {
      const data = await api.getCountsByRole();
      setRoleCountsData(data);
    } catch (err) {
      setCountsError(err.message || 'Administrator authentication required');
    } finally {
      setLoadingCounts(false);
    }
  };

  const toggleRoleCountsDropdown = async () => {
    if (!showRoleCounts) {
      setShowRoleCounts(true);
      setExpandedRoleName(null);
      setExpandedRoleUsers([]);
      setRoleActionFeedback('');
      await refreshRoleCounts();
    } else {
      setShowRoleCounts(false);
    }
  };

  const handleInspectRoleUsers = async (roleName) => {
    if (expandedRoleName === roleName) {
      setExpandedRoleName(null);
      setExpandedRoleUsers([]);
      return;
    }
    setExpandedRoleName(roleName);
    setLoadingRoleUsers(true);
    setRoleActionFeedback('');
    try {
      const res = await api.getUsers(roleName);
      const list = Array.isArray(res) ? res : (res?.users || []);
      setExpandedRoleUsers(list);
    } catch (err) {
      setExpandedRoleUsers([]);
      setRoleActionFeedback(err.message || 'Could not load users for this role.');
    } finally {
      setLoadingRoleUsers(false);
    }
  };

  const handleRoleUserAction = async (userObj, action) => {
    setRoleActionFeedback('');
    try {
      if (action === 'APPROVE') {
        await api.approveUser(userObj.id);
        setRoleActionFeedback(`Approved & activated ${userObj.firstName} ${userObj.lastName}.`);
      } else if (action === 'ACTIVATE') {
        await api.setUserStatus(userObj.id, true);
        setRoleActionFeedback(`Activated ${userObj.firstName} ${userObj.lastName}.`);
      } else if (action === 'DEACTIVATE') {
        await api.setUserStatus(userObj.id, false);
        setRoleActionFeedback(`Deactivated ${userObj.firstName} ${userObj.lastName}.`);
      }
      await refreshRoleCounts();
      if (expandedRoleName) {
        const res = await api.getUsers(expandedRoleName);
        setExpandedRoleUsers(Array.isArray(res) ? res : (res?.users || []));
      }
    } catch (err) {
      setRoleActionFeedback(`Action failed: ${err.message}`);
    }
  };

  return (
    <header className="glass-panel" style={{ borderBottom: '2px solid var(--border-gold)', margin: '8px 12px 16px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '12px' }}>
        {/* Hospital Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, maxWidth: '100%' }}>
          <div style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', flexShrink: 0, borderRadius: '8px', border: '2px solid var(--gold-400)', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={activeLogoUrl} alt="Hospital Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="header-3d" style={{ fontSize: 'clamp(1.05rem, 2.4vw, 1.52rem)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2, margin: 0 }}>
              <span className="header-3d-gold">GBS HOSPITAL</span> MANAGEMENT SYSTEM
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#10b981', letterSpacing: '0.03em' }}>
                🏥 {activeHospitalName}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--gold-400)' }}>
                • {activeHospitalMotto}
              </span>
              {canCustomizeHospitalName && (
                <button
                  type="button"
                  onClick={openHospitalNameModal}
                  className="btn-outline-gold"
                  style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '4px' }}
                >
                  Change Hospital Name
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live System Telemetry Status Card (GBS Hospital Obsidian Navy) */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px 16px', maxWidth: '100%', boxSizing: 'border-box', background: 'rgba(11, 23, 44, 0.85)', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: '0 4px 14px rgba(0,0,0,0.45)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className={overallStatus === CONNECTION_STATES.ONLINE ? 'pulse-live' : undefined}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                display: 'inline-block',
                background: statusDisplay.dot,
                boxShadow: `0 0 8px ${statusDisplay.dot}`
              }}
            ></span>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Central Engine</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: statusDisplay.color }}>
                  {overallStatus === CONNECTION_STATES.ONLINE ? centralEngineLabel : statusDisplay.label}
                </span>
                {(overallStatus === CONNECTION_STATES.DEGRADED || overallStatus === CONNECTION_STATES.OFFLINE) && (
                  <button
                    type="button"
                    onClick={() => connectionManager.checkNow()}
                    className="btn-outline-gold"
                    style={{ padding: '1px 6px', fontSize: '0.66rem', borderRadius: '4px', lineHeight: 1.3 }}
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '12px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Database</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: dbDisplay.color }}>{dbDisplay.label}</div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '12px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>System Uptime</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gold-400)' }}>{uptimeDisplay}</div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '12px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Time</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyan-accent)', fontFamily: 'var(--font-mono)' }}>{time}</div>
          </div>
        </div>

        {/* Quick User State & Login Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{currentUser.firstName} {currentUser.lastName}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gold-400)' }}>
                  {currentUser.role}
                  {currentUser.isDemoSession ? ' • DEMO TRIAL' : ''}
                </div>
              </div>
              {currentUser.isDemoSession && demoQuota && (
                <div
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    border: demoQuota.limitReached
                      ? '1px solid #ef4444'
                      : demoQuota.entriesUsed >= Math.max(1, (demoQuota.maxEntries || 10) - 2)
                        ? '1px solid #f59e0b'
                        : '1px solid var(--gold-400)',
                    background: demoQuota.limitReached
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(212, 175, 55, 0.14)',
                    color: demoQuota.limitReached ? '#fca5a5' : 'var(--gold-300)'
                  }}
                >
                  DEMO: {demoQuota.entriesUsed}/{demoQuota.maxEntries || 10} ENTRIES
                </div>
              )}
              {isDeveloperAuthenticated && (
                <button
                  onClick={() => onSelectRole('DEVELOPER')}
                  className="btn-gold"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  <Shield size={14} /> Developer Dashboard
                </button>
              )}
              <button onClick={onLogout} className="btn-outline-gold" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => onOpenLogin && onOpenLogin(currentRole)} className="btn-gold" style={{ padding: '8px 16px' }}>
                <LogIn size={16} /> Sign In
              </button>
            </div>
          )}

          {/* Live Notifications Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                const next = !showNotifications;
                setShowNotifications(next);
                if (next) loadNotifications();
              }}
              className="btn-outline-gold"
              style={{ padding: '8px 12px', fontSize: '0.8rem', position: 'relative' }}
            >
              <Bell size={16} /> Alerts
              {unreadNotifications > 0 && (
                <span style={{
                  marginLeft: '4px',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {unreadNotifications}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className="glass-panel"
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  width: '360px',
                  maxHeight: '420px',
                  overflowY: 'auto',
                  padding: '16px',
                  zIndex: 9998,
                  border: '1px solid var(--gold-400)',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.85)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--gold-400)' }}>
                    Notifications ({unreadNotifications} new)
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={async () => {
                        await api.markAllRcceNotificationsRead().catch(() => { });
                        loadNotifications();
                      }}
                      className="btn-outline-gold"
                      style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                    >
                      Mark All Read
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Close
                    </button>
                  </div>
                </div>

                {notificationsList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                    You're all caught up — no new alerts right now.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notificationsList.slice(0, 15).map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: n.isRead ? 'rgba(0,0,0,0.28)' : 'rgba(212,175,55,0.12)',
                          border: `1px solid ${n.isRead ? 'var(--border-subtle)' : 'var(--border-gold)'}`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{n.title}</span>
                          {!n.isRead && (
                            <button
                              type="button"
                              onClick={async () => {
                                await api.markRcceNotificationRead(n.id).catch(() => { });
                                loadNotifications();
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--gold-400)', cursor: 'pointer', fontSize: '0.68rem' }}
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{n.message}</div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', marginTop: '3px' }}>
                          {n.eventType} • {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mandatory Step 7 Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={toggleRoleCountsDropdown}
              className="btn-outline-gold"
              style={{ padding: '8px 14px', fontSize: '0.8rem', background: showRoleCounts ? 'var(--gold-glow)' : 'transparent' }}
            >
              <Users size={16} /> Staff Directory <ChevronDown size={14} />
            </button>

            {/* Dropdown Card */}
            {showRoleCounts && (
              <div
                className="glass-panel"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  width: '380px',
                  zIndex: 1000,
                  padding: '16px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.85)',
                  border: '1px solid var(--gold-400)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gold-400)' }}>
                    Registered Staff & Role Accounts
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mandatory Step 7</span>
                </div>

                {loadingCounts ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading live staff role counts...
                  </div>
                ) : countsError ? (
                  <div style={{ padding: '16px', textAlign: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gold-300)', fontWeight: 600, marginBottom: '6px' }}>
                      Administrator Credential Required
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Sign in as an Administrator to view live user counts for each hospital role.
                    </div>
                    <button
                      onClick={() => {
                        setShowRoleCounts(false);
                        if (onOpenLogin) onOpenLogin('ADMINISTRATOR');
                      }}
                      className="btn-gold"
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    >
                      <Key size={14} /> Sign In as Administrator
                    </button>
                  </div>
                ) : roleCountsData ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>
                      <span>Total Registered: {roleCountsData.summary?.totalSystemUsers ?? 0}</span>
                      <span style={{ color: 'var(--status-online)' }}>Active: {roleCountsData.summary?.totalActiveUsers ?? 0}</span>
                      <span style={{ color: 'var(--status-warning)' }}>Pending: {roleCountsData.summary?.totalPendingUsers ?? 0}</span>
                    </div>

                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {(roleCountsData.roles || []).map(rc => {
                        const isExpanded = expandedRoleName === rc.roleName;
                        return (
                          <div key={rc.roleId || rc.roleName} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <button
                              type="button"
                              onClick={() => handleInspectRoleUsers(rc.roleName)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '7px 8px',
                                fontSize: '0.8rem',
                                background: isExpanded ? 'rgba(212,175,55,0.12)' : 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#e5e5e5',
                                textAlign: 'left'
                              }}
                            >
                              <span style={{ fontWeight: isExpanded ? 700 : 500, color: isExpanded ? 'var(--gold-300)' : '#e5e5e5' }}>
                                {isExpanded ? '▾ ' : '▸ '}{rc.roleName}
                              </span>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{ color: 'var(--gold-400)', fontWeight: 700 }}>{rc.totalUsers} total</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>({rc.activeUsers} active)</span>
                              </div>
                            </button>

                            {isExpanded && (
                              <div style={{ padding: '6px 10px 10px', background: 'rgba(6,12,24,0.75)', borderRadius: '6px', margin: '0 4px 6px' }}>
                                {loadingRoleUsers ? (
                                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', padding: '6px 0' }}>
                                    Loading {rc.roleName} accounts from PostgreSQL...
                                  </div>
                                ) : expandedRoleUsers.length === 0 ? (
                                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', padding: '4px 0' }}>
                                    No users currently registered under {rc.roleName}.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {expandedRoleUsers.map((u) => (
                                      <div
                                        key={u.id}
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          gap: '8px',
                                          padding: '6px 8px',
                                          borderRadius: '6px',
                                          background: 'rgba(15,27,49,0.75)',
                                          border: '1px solid var(--border-subtle)',
                                          fontSize: '0.74rem'
                                        }}
                                      >
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{ fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {u.firstName} {u.lastName}
                                          </div>
                                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {u.email}
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                          <span style={{ fontSize: '0.66rem', fontWeight: 700, color: u.active ? 'var(--status-online)' : 'var(--status-warning)' }}>
                                            {u.active ? 'ACTIVE' : 'PENDING'}
                                          </span>
                                          {!u.active ? (
                                            <button
                                              type="button"
                                              onClick={() => handleRoleUserAction(u, 'APPROVE')}
                                              className="btn-gold"
                                              style={{ padding: '2px 7px', fontSize: '0.68rem' }}
                                            >
                                              Approve
                                            </button>
                                          ) : (
                                            u.id !== currentUser?.id && String(u.email || '').toLowerCase() !== 'gabosei48@gmail.com' && (
                                              <button
                                                type="button"
                                                onClick={() => handleRoleUserAction(u, 'DEACTIVATE')}
                                                className="btn-outline-gold"
                                                style={{ padding: '2px 7px', fontSize: '0.68rem', borderColor: '#ef4444', color: '#fca5a5' }}
                                              >
                                                Deactivate
                                              </button>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {roleActionFeedback && (
                      <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', fontSize: '0.72rem' }}>
                        {roleActionFeedback}
                      </div>
                    )}

                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        Click any role row to inspect, approve, or deactivate live PostgreSQL accounts
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blueprint Roles Navigation Ribbon with Departmental Categorization Tabs (GBS Hospital Obsidian Navy) */}
      <div style={{ background: 'rgba(8, 16, 32, 0.95)', borderBottom: '1px solid var(--border-color)' }}>
        {/* Departmental Filter Tabs for Quick Role Identification */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid rgba(212,175,55,0.12)', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--gold-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '4px' }}>
              Staff Portals:
            </span>
            {ROLE_CATEGORIES.map(cat => {
              const count = cat.id === 'ALL'
                ? visibleRoles.length
                : visibleRoles.filter(r => r.category === cat.id).length;
              const isSelected = roleCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setRoleCategory(cat.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '16px',
                    border: isSelected ? '1px solid var(--gold-400)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--gold-glow)' : 'rgba(15, 27, 49, 0.65)',
                    color: isSelected ? 'var(--gold-light)' : 'var(--text-muted)',
                    fontSize: '0.74rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    background: isSelected ? 'var(--gold-primary)' : 'rgba(212, 175, 55, 0.14)',
                    color: isSelected ? '#060C18' : 'var(--gold-light)',
                    fontWeight: 700
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Active: <strong style={{ color: 'var(--gold-400)' }}>{currentRole}</strong> • Showing {filteredRoles.length} of {visibleRoles.length} Portals
          </div>
        </div>

        {/* Roles Horizontal Ribbon */}
        <div style={{ display: 'flex', gap: '10px', padding: '10px 16px', overflowX: 'auto' }}>
          {filteredRoles.map(role => {
            const isActive = currentRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: isActive ? '1.5px solid var(--gold-light)' : '1px solid var(--border-color)',
                  background: isActive ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(15, 27, 49, 0.95) 100%)' : 'rgba(15, 27, 49, 0.78)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  boxShadow: isActive ? '0 0 16px rgba(212, 175, 55, 0.35)' : 'none'
                }}
              >
                {/* Real Life Headshot Thumbnail */}
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', border: isActive ? '2px solid var(--gold-400)' : '1px solid var(--border-subtle)', background: '#222', flexShrink: 0 }}>
                  <img
                    src={role.img}
                    alt={role.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.src = '/assets/images/portrait_doctor.jpg'; }}
                  />
                </div>

                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: isActive ? 800 : 600, color: isActive ? 'var(--gold-300)' : '#fff', letterSpacing: '0.01em' }}>
                    {role.name}
                  </div>
                  <div style={{ fontSize: '0.67rem', color: isActive ? 'var(--gold-400)' : 'var(--text-dim)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {role.dept || role.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Bar Organised by Categories */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', background: 'rgba(0,0,0,0.55)', fontSize: '0.82rem', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Clinical Direct Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--gold-400)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em', marginRight: '2px' }}>
              🩺 Quick Actions:
            </span>
            <button onClick={() => onOpenQuickAction('NEW_APPOINTMENT')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.76rem' }}>
              <PlusCircle size={13} /> New Patient
            </button>
            <button onClick={() => onOpenQuickAction('PATIENT_SEARCH')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.76rem' }}>
              <Search size={13} /> Find Patient
            </button>
            <button onClick={() => onOpenQuickAction('BED_AVAILABILITY')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.76rem' }}>
              <Bed size={13} /> Free Beds
            </button>
            <button onClick={() => onOpenQuickAction('LAB_REQUESTS')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.76rem' }}>
              <FlaskConical size={13} /> Lab Tests
            </button>
            <button onClick={() => onOpenQuickAction('PHARMACY_STOCK')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.76rem' }}>
              <Pill size={13} /> Medicine Stock
            </button>
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />

          {/* Dossiers & Intelligence Pages */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em', marginRight: '2px' }}>
              📊 Records:
            </span>
            <button onClick={() => onOpenQuickAction('VIEW_REPORTS')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.76rem' }}>
              <FileText size={13} /> Reports
            </button>
            <button onClick={() => onOpenQuickAction('VIEW_NOTIFICATIONS')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.76rem' }}>
              <AlertTriangle size={13} /> All Alerts
            </button>
            <button onClick={() => onOpenQuickAction('VIEW_APPLICATIONS')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.76rem' }}>
              <UserCheck size={13} /> Requests
            </button>
            <button onClick={() => onOpenQuickAction('VIEW_HOSPITAL_INFORMATION')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.76rem' }}>
              <Database size={13} /> Hospital Info
            </button>
            <button onClick={() => onOpenQuickAction('VIEW_SYSTEM_INFORMATION')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.76rem' }}>
              <Activity size={13} /> System Health
            </button>
          </div>
        </div>

        {/* Patient Safety Guardrail Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-online)', fontSize: '0.76rem', fontWeight: 600 }}>
          <Shield size={14} /> Patient Safety Protected • Emergency Access Always Open
        </div>
      </div>

      {/* Admin Hospital Facility Name Customization Modal */}
      {showBrandingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '24px', border: '1px solid var(--gold-400)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gold-400)' }}>
                  Customize Preferred Hospital Facility Name
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Authorized Admin Facility Branding Configuration
                </p>
              </div>
              <button type="button" onClick={() => setShowBrandingModal(false)} className="btn-outline-gold" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                Close
              </button>
            </div>

            <form onSubmit={handleSaveHospitalBranding} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  Main Enterprise System Name (Permanent & Locked)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(212,175,55,0.08)', border: '1px solid var(--border-gold)', borderRadius: '6px', color: 'var(--gold-400)', fontWeight: 800, fontSize: '0.88rem' }}>
                  <Lock size={14} /> GBS HOSPITAL MANAGEMENT SYSTEM
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#fff', marginBottom: '4px', fontWeight: 600 }}>
                  Preferred Hospital Facility Name *
                </label>
                <input
                  type="text"
                  className="input-gold"
                  value={hospitalNameInput}
                  onChange={(e) => setHospitalNameInput(e.target.value)}
                  placeholder="Enter your preferred Hospital Name (e.g. St. Luke's Specialist Hospital)"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  Hospital Facility Motto / Tagline
                </label>
                <input
                  type="text"
                  className="input-gold"
                  value={mottoInput}
                  onChange={(e) => setMottoInput(e.target.value)}
                  placeholder="Smart Healthcare, Better Care."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    Institution Organization Type
                  </label>
                  <select
                    className="input-gold"
                    value={organizationTypeInput}
                    onChange={(e) => setOrganizationTypeInput(e.target.value)}
                  >
                    <option value="PRIVATE_HOSPITAL">Private Hospital</option>
                    <option value="GOVERNMENT_HOSPITAL">Government Hospital</option>
                    <option value="TEACHING_HOSPITAL">Teaching Hospital</option>
                    <option value="SPECIALIST_CLINIC">Specialist Clinic / Medical Center</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    Preferred Hospital Logo URL (Optional)
                  </label>
                  <input
                    type="text"
                    className="input-gold"
                    value={logoUrlInput}
                    onChange={(e) => setLogoUrlInput(e.target.value)}
                    placeholder="/hospital-logo.png or https://..."
                  />
                </div>
              </div>

              {brandingFeedback && (
                <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
                  {brandingFeedback}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowBrandingModal(false)} className="btn-outline-gold" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingBranding} className="btn-gold" style={{ padding: '8px 18px' }}>
                  {savingBranding ? 'Saving...' : 'Save Hospital Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
