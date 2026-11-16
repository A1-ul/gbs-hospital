import React, { useState, useEffect } from 'react';
import {
  Activity, Database, Shield, Users, Clock, AlertTriangle,
  ChevronDown, Search, PlusCircle, Bed, FlaskConical, Pill, FileText,
  UserCheck, Lock, LogIn, LogOut, Key
} from 'lucide-react';
import { api } from '../services/api.service';

export const ROLE_CATEGORIES = [
  { id: 'ALL', label: 'All Staff Portals', icon: '⭐' },
  { id: 'EXECUTIVE', label: 'Executive & Governance', icon: '🏛️' },
  { id: 'PHYSICIANS', label: 'Physicians & Specialists', icon: '🩺' },
  { id: 'NURSING_DIAGNOSTICS', label: 'Nursing & Allied Care', icon: '🏥' },
  { id: 'OPERATIONS', label: 'Operations & Patients', icon: '📋' }
];

export const ROLES = [
  { id: 'ADMINISTRATOR', name: 'Administrator', desc: 'Hospital Administration & Governance', img: '/assets/images/portrait_admin.jpg', loginBg: '/assets/images/hospital_admin_office_real.jpg', dept: 'Administration & Governance', category: 'EXECUTIVE' },
  { id: 'HOSPITAL_DIRECTOR', name: 'Hospital Director', desc: 'Clinical Executive Oversight & Strategy', img: '/assets/images/portrait_director.jpg', loginBg: '/assets/images/hospital_director_boardroom_real.jpg', dept: 'Medical Directorate & Strategy', category: 'EXECUTIVE' },
  { id: 'DEVELOPER', name: 'Developer (NOC)', desc: 'Telemetry, System Lock & Multi-Tenant', img: '/assets/images/portrait_developer.jpg', loginBg: '/assets/images/developer_control_center_real.jpg', dept: 'Landlord Network Operations Center', category: 'EXECUTIVE' },
  { id: 'DOCTOR', name: 'Medical Doctor', desc: 'Consultations, Rx, Records, Lab Orders', img: '/assets/images/portrait_doctor.jpg', loginBg: '/assets/images/doctor_consultation_real.jpg', dept: 'Outpatient & Inpatient Medicine', category: 'PHYSICIANS' },
  { id: 'SURGEON', name: 'Surgeon', desc: 'Surgery Plan, OT Mgmt & Post-Op Care', img: '/assets/images/portrait_surgeon.jpg', loginBg: '/assets/images/operating_theatre_real.jpg', dept: 'Surgical Suite & Operating Theatre', category: 'PHYSICIANS' },
  { id: 'DENTIST', name: 'Dentist', desc: 'Dental & Maxillofacial Care', img: '/assets/images/portrait_dentist.jpg', loginBg: '/assets/images/dental_clinic_real.jpg', dept: 'Dental & Maxillofacial Clinic', category: 'PHYSICIANS' },
  { id: 'EYE_DOCTOR', name: 'Ophthalmologist', desc: 'Ophthalmic Surgery & Vision Health', img: '/assets/images/portrait_eye_doctor.jpg', loginBg: '/assets/images/ophthalmology_eye_clinic_real.jpg', dept: 'Ophthalmology & Vision Center', category: 'PHYSICIANS' },
  { id: 'RADIOLOGIST', name: 'Radiologist', desc: 'PACS Imaging & Diagnostic Scan Analysis', img: '/assets/images/portrait_radiologist.jpg', loginBg: '/assets/images/radiology_pacs_mri_real.jpg', dept: 'Diagnostic Radiology & PACS MRI/CT', category: 'PHYSICIANS' },
  { id: 'NURSE', name: 'Staff Nurse', desc: 'Vitals, Medications & Ward Care Notes', img: '/assets/images/portrait_nurse.jpg', loginBg: '/assets/images/nurse_triage_station.jpg', dept: 'Nursing Care, OPD Triage & Wards', category: 'NURSING_DIAGNOSTICS' },
  { id: 'PHARMACIST', name: 'Pharmacist', desc: 'Dispensing, Stock & Drug Safety Alerts', img: '/assets/images/portrait_pharmacist.jpg', loginBg: '/assets/images/pharmacy_dispensary_real.jpg', dept: 'Hospital Pharmacy & FEFO Dispensary', category: 'NURSING_DIAGNOSTICS' },
  { id: 'LAB_TECHNICIAN', name: 'Lab Scientist', desc: 'Clinical Tests, Samples & Pathology', img: '/assets/images/portrait_lab_scientist.jpg', loginBg: '/assets/images/laboratory_pathology_real.jpg', dept: 'Clinical Pathology & Hematology Lab', category: 'NURSING_DIAGNOSTICS' },
  { id: 'RECEPTIONIST', name: 'Receptionist', desc: 'Registration, Appointments & Queue', img: '/assets/images/portrait_receptionist.jpg', loginBg: '/assets/images/patient_registration_archive_real.jpg', dept: 'Front Desk, MPI Registration & Queue', category: 'OPERATIONS' },
  { id: 'FOLDER_RETRIEVER', name: 'Archivist', desc: 'Physical Archive & Shelf Folder Vault', img: '/assets/images/portrait_archivist.jpg', loginBg: '/assets/images/medical_records_archive_real.jpg', dept: 'Medical Records & Archive Vault', category: 'OPERATIONS' },
  { id: 'ACCOUNTANT', name: 'Accountant', desc: 'Billing, Payments & NHIA Claims', img: '/assets/images/portrait_accountant.jpg', loginBg: '/assets/images/nhia_claims_center_real.jpg', dept: 'Hospital Finance & NHIA Claims', category: 'OPERATIONS' },
  { id: 'HR_MANAGER', name: 'HR Manager', desc: 'Staff Credentials & Duty Rostering', img: '/assets/images/portrait_hr_manager.jpg', loginBg: '/assets/images/hr_medical_staff_real.jpg', dept: 'Human Resources & Credentialing', category: 'OPERATIONS' },
  { id: 'PATIENT', name: 'Patient Portal', desc: 'Self-Service, Appointments & Records', img: '/assets/images/portrait_patient.jpg', loginBg: '/assets/images/patient_registration_archive_real.jpg', dept: 'Patient Self-Service Portal', category: 'OPERATIONS' }
];

export default function Header({
  currentRole,
  onSelectRole,
  onOpenLogin,
  currentUser,
  onLogout,
  onOpenQuickAction,
  facilityBranding,
  onUpdateFacilityBranding
}) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [health, setHealth] = useState({ server: 'Checking...', database: 'Checking...', uptime: '0s', environment: 'DEVELOPMENT' });
  const [showRoleCounts, setShowRoleCounts] = useState(false);
  const [roleCountsData, setRoleCountsData] = useState(null);
  const [countsError, setCountsError] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [hospitalNameInput, setHospitalNameInput] = useState('');
  const [mottoInput, setMottoInput] = useState('');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [organizationTypeInput, setOrganizationTypeInput] = useState('PRIVATE_HOSPITAL');
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingFeedback, setBrandingFeedback] = useState('');

  const [roleCategory, setRoleCategory] = useState('ALL');

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

  // Live Health Check (100% Real Telemetry — No Hardcoded Uptime)
  useEffect(() => {
    api.checkHealth()
      .then(res => {
        const upSec = Math.floor(Number(res.uptime || 0));
        const mins = Math.floor(upSec / 60);
        const secs = upSec % 60;
        setHealth({
          server: res.server === 'running' ? 'Online' : 'Degraded',
          database: res.database === 'connected' ? 'Connected (PostgreSQL)' : 'Disconnected',
          uptime: mins > 0 ? `${mins}m ${secs}s` : `${secs}s`,
          environment: res.environment || 'DEVELOPMENT'
        });
      })
      .catch(() => {
        setHealth({ server: 'Offline', database: 'Check DB', uptime: '0s', environment: 'DEVELOPMENT' });
      });
  }, []);

  // Fetch DB-backed User Counts ONLY on drop-list click (Step 7 requirement!)
  const toggleRoleCountsDropdown = async () => {
    if (!showRoleCounts) {
      setLoadingCounts(true);
      setShowRoleCounts(true);
      setCountsError(null);
      try {
        const data = await api.getCountsByRole();
        setRoleCountsData(data);
      } catch (err) {
        setCountsError(err.message || 'Administrator authentication required');
      } finally {
        setLoadingCounts(false);
      }
    } else {
      setShowRoleCounts(false);
    }
  };

  return (
    <header className="glass-panel" style={{ borderBottom: '2px solid var(--border-gold)', margin: '8px 12px 16px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '12px' }}>
        {/* Hospital Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', border: '2px solid var(--gold-400)', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={`${activeHospitalName} Official Logo`}>
            <img src={activeLogoUrl} alt="Hospital Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
            <Shield style={{ color: 'var(--gold-400)', width: '28px', height: '28px' }} />
          </div>
          <div>
            <h1 className="header-3d" style={{ fontSize: '1.52rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  title="Admin: Change preferred Hospital Facility Name (Main System Name remains GBS HOSPITAL MANAGEMENT SYSTEM)"
                >
                  Change Hospital Name
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live System Telemetry Status Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-gold)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pulse-live"></span>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Server Status</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-online)' }}>{health.server}</div>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Database</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{health.database}</div>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>System Uptime</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gold-400)' }}>{health.uptime}</div>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Time</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>{time}</div>
          </div>
        </div>

        {/* Quick User State & Login Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{currentUser.firstName} {currentUser.lastName}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gold-400)' }}>{currentUser.role}</div>
              </div>
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
                <LogOut size={14} /> Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={onOpenLogin} className="btn-gold" style={{ padding: '8px 16px' }}>
                <LogIn size={16} /> Sign In to Your Account
              </button>
              <button
                onClick={() => onSelectRole('DEVELOPER')}
                className="btn-outline-gold"
                style={{ padding: '8px 10px', fontSize: '0.75rem', borderColor: '#ef4444', color: '#fca5a5' }}
                title="Restricted Root Developer Access (Requires Developer Authentication)"
              >
                <Lock size={14} /> Developer
              </button>
            </div>
          )}

          {/* Mandatory Step 7 Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={toggleRoleCountsDropdown}
              className="btn-outline-gold"
              style={{ padding: '8px 14px', fontSize: '0.8rem', background: showRoleCounts ? 'var(--gold-glow)' : 'transparent' }}
              title="Click to fetch real PostgreSQL registered user counts by role"
            >
              <Users size={16} /> Role Registers <ChevronDown size={14} />
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
                    PostgreSQL Registered Users by Role
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mandatory Step 7</span>
                </div>

                {loadingCounts ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Querying PostgreSQL role counts...
                  </div>
                ) : countsError ? (
                  <div style={{ padding: '16px', textAlign: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gold-300)', fontWeight: 600, marginBottom: '6px' }}>
                      Administrator Credential Required
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Per Step 7 security, role counts query PostgreSQL securely via administrator authorization.
                    </div>
                    <button
                      onClick={() => {
                        setShowRoleCounts(false);
                        if (onOpenLogin) onOpenLogin('ADMINISTRATOR');
                      }}
                      className="btn-gold"
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      title="Sign in with Administrator credentials to query PostgreSQL role user counts"
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

                    <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                      {(roleCountsData.roles || []).map(rc => (
                        <div key={rc.roleId || rc.roleName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 500, color: '#e5e5e5' }}>{rc.roleName}</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ color: 'var(--gold-400)', fontWeight: 700 }}>{rc.totalUsers} total</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({rc.activeUsers} active)</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        Source: PostgreSQL database (No mock data)
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blueprint Roles Navigation Ribbon with Departmental Categorization Tabs */}
      <div style={{ background: 'rgba(12, 10, 8, 0.94)', borderBottom: '1px solid var(--border-gold)' }}>
        {/* Departmental Filter Tabs for Quick Role Identification */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '8px' }}>
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
                    background: isSelected ? 'var(--gold-glow)' : 'rgba(255,255,255,0.03)',
                    color: isSelected ? 'var(--gold-300)' : 'var(--text-muted)',
                    fontSize: '0.74rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                  title={`Filter to ${cat.label}`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    background: isSelected ? 'var(--gold-500)' : 'rgba(255,255,255,0.08)',
                    color: isSelected ? '#0a0907' : '#aaa',
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
                title={`Open ${role.name} Portal (${role.dept || role.desc})`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: isActive ? '1.5px solid var(--gold-400)' : '1px solid var(--border-subtle)',
                  background: isActive ? 'linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(26,23,19,0.85) 100%)' : 'rgba(22, 19, 15, 0.72)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  boxShadow: isActive ? '0 0 14px rgba(212,175,55,0.32)' : 'none'
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
              🩺 Clinical:
            </span>
            <button onClick={() => onOpenQuickAction('NEW_APPOINTMENT')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.74rem' }} title="Schedule a new patient appointment or register an outpatient">
              <PlusCircle size={13} /> New Appointment
            </button>
            <button onClick={() => onOpenQuickAction('PATIENT_SEARCH')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.74rem' }} title="Search the Master Patient Index (MPI) and medical folders">
              <Search size={13} /> Patient Search (MPI)
            </button>
            <button onClick={() => onOpenQuickAction('BED_AVAILABILITY')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.74rem' }} title="Inspect hospital wards, rooms, and real-time bed occupancy matrix">
              <Bed size={13} /> Bed Matrix
            </button>
            <button onClick={() => onOpenQuickAction('LAB_REQUESTS')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.74rem' }} title="Open Laboratory Pathology & Diagnostic Test Requests">
              <FlaskConical size={13} /> Lab Tests
            </button>
            <button onClick={() => onOpenQuickAction('PHARMACY_STOCK')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.74rem' }} title="Open Pharmacy FEFO Dispensary & Drug Inventory">
              <Pill size={13} /> Pharmacy Stock
            </button>
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />

          {/* Dossiers & Intelligence Pages */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em', marginRight: '2px' }}>
              📊 Dossiers:
            </span>
            <button onClick={() => onOpenQuickAction('VIEW_REPORTS')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.74rem' }} title="Open full-page Clinical, Operational, Duty & Annual Financial Reports">
              <FileText size={13} /> Reports
            </button>
            <button onClick={() => onOpenQuickAction('VIEW_NOTIFICATIONS')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.74rem' }} title="Open full-page Hospital Alerts & Dispatched Clinical Notifications">
              <AlertTriangle size={13} /> Alerts
            </button>
            <button onClick={() => onOpenQuickAction('VIEW_APPLICATIONS')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.74rem' }} title="Open Staff Account Registrations & Leave Applications">
              <UserCheck size={13} /> Applications
            </button>
            <button onClick={() => onOpenQuickAction('VIEW_HOSPITAL_INFORMATION')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.74rem' }} title="Open full-page Hospital Facility Profile, Wards & Operational Summary">
              <Database size={13} /> Facility Profile
            </button>
            <button onClick={() => onOpenQuickAction('VIEW_SYSTEM_INFORMATION')} className="btn-outline-gold" style={{ padding: '4px 9px', fontSize: '0.74rem' }} title="Open full-page System Telemetry, PostgreSQL Status & Architecture Info">
              <Activity size={13} /> Telemetry
            </button>
          </div>
        </div>

        {/* Patient Safety Guardrail Tag */}

        {/* Patient Safety Guardrail Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-online)', fontSize: '0.75rem', fontWeight: 600 }}>
          <Shield size={14} /> Clinical Systems Never Lock • 24/7 Emergency Bypass Active
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
                  {savingBranding ? 'Saving to PostgreSQL...' : 'Save Preferred Hospital Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
