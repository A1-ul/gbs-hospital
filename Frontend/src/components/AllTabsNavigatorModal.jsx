import React, { useState, useMemo } from 'react';
import { X, Search, LayoutGrid, Users, FileText, ArrowRight, Shield, Layers } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';

export const MODULE_SUBTAB_DIRECTORY = [
  {
    key: 'PATIENTS',
    category: 'CLINICAL_INPATIENT',
    summary: 'Register new patients, search Master Patient Index (MPI), and track physical paper folders.',
    subtabs: ['Patient Registration', 'MPI Search', 'Physical Folder Queue', 'Chain-of-Custody Archive']
  },
  {
    key: 'CLINICAL',
    category: 'CLINICAL_INPATIENT',
    summary: 'OPD check-in tokens, nurse triage vitals (NEWS2/BMI), doctor notes, ICD-10 diagnosis & e-prescriptions.',
    subtabs: ['OPD Queue & Check-In', 'Nurse Triage & NEWS2 Vitals', 'Doctor Consultation & ICD-10', 'Prescriptions & Lab Orders']
  },
  {
    key: 'WARDS',
    category: 'CLINICAL_INPATIENT',
    summary: 'Live ward bed availability matrix, inpatient admissions, bed transfers, nursing charts & discharges.',
    subtabs: ['Bed Availability Matrix', 'Admit Patient', 'Bed Transfer', 'Shift Nursing Charts & Discharge']
  },
  {
    key: 'ICU',
    category: 'CLINICAL_INPATIENT',
    summary: 'Critical care live telemetry, NEWS2/MAP alerts, ventilator status & vital trend monitoring.',
    subtabs: ['Live ICU Beds', 'Ventilator & Airway Telemetry', 'Critical Vital Alerts', 'Trend History']
  },
  {
    key: 'PHARMACY',
    category: 'CLINICAL_INPATIENT',
    summary: 'Hospital formulary, FEFO prescription dispensing, batch goods receipt, low-stock & expiry alerts.',
    subtabs: ['Pending Prescriptions (FEFO)', 'Drug Formulary & Stock', 'Batch Goods Receipt', 'Expiry & Low-Stock Alerts']
  },
  {
    key: 'SURGERY',
    category: 'CLINICAL_INPATIENT',
    summary: 'Operating theatre scheduling, WHO 3-phase surgical safety checklist, anesthesia & PACU Aldrete recovery.',
    subtabs: ['Surgical Worklist & OT Suites', 'WHO Safety Checklist', 'Anesthesia Protocol (ASA)', 'Operative Note & PACU Aldrete']
  },
  {
    key: 'DENTAL',
    category: 'CLINICAL_INPATIENT',
    summary: '32-tooth FDI interactive odontogram, dental treatments, root canal, crowns & oral surgery.',
    subtabs: ['32-Tooth FDI Odontogram', 'Dental Treatments & Procedures', 'Oral Surgery Records']
  },
  {
    key: 'EYE_CLINIC',
    category: 'CLINICAL_INPATIENT',
    summary: 'Snellen visual acuity (OD/OS), intraocular pressure glaucoma alerts, refraction Rx & eye exams.',
    subtabs: ['Vision & Snellen Tests', 'Glaucoma IOP Alerts', 'Refraction Prescriptions']
  },
  {
    key: 'EMERGENCY',
    category: 'ACUTE_DIAGNOSTICS',
    summary: '5-tier trauma triage (Red–Blue), ambulance GPS fleet dispatch & 24/7 clinical safety overrides.',
    subtabs: ['ER Trauma Triage Bays', 'Ambulance Fleet & GPS Dispatch', 'Patient Safety Override Log']
  },
  {
    key: 'LABORATORY',
    category: 'ACUTE_DIAGNOSTICS',
    summary: 'Diagnostic test orders, phlebotomy barcode labels, specimen accessioning, panic values & verification.',
    subtabs: ['Pending Lab Orders', 'Sample Collection & Barcodes', 'Results & Panic Alerts', 'Pathologist Verification']
  },
  {
    key: 'RADIOLOGY',
    category: 'ACUTE_DIAGNOSTICS',
    summary: 'X-Ray, CT, MRI & Ultrasound worklists, DICOM acquisition presets, panic findings & signed reports.',
    subtabs: ['Modality Worklist (STAT)', 'DICOM PACS Acquisition', 'Diagnostic Reports & Signatures']
  },
  {
    key: 'BLOOD_BANK',
    category: 'ACUTE_DIAGNOSTICS',
    summary: 'Donor screening, 4°C cold-chain stock matrix, TTI serology, ABO/Rh cross-matching & transfusions.',
    subtabs: ['Cold-Chain Inventory', 'Blood Donors & Eligibility', 'Transfusion Requests & Cross-Match']
  },
  {
    key: 'MORTUARY',
    category: 'ACUTE_DIAGNOSTICS',
    summary: 'Cold storage chambers, deceased intake, coroner holds, post-mortem autopsies & verified family release.',
    subtabs: ['Deceased Intake & Records', 'Cold Storage Vaults', 'Coroner / Autopsies', 'Family Handover Releases']
  },
  {
    key: 'BIOMEDICAL',
    category: 'ACUTE_DIAGNOSTICS',
    summary: 'Medical equipment inventory, breakdown work orders, IEC 60601-1 safety & ISO 17025 calibrations.',
    subtabs: ['Medical Equipment Registry', 'Maintenance Work Orders', 'Safety & Calibration Certificates']
  },
  {
    key: 'BILLING',
    category: 'OPERATIONS_GOVERNANCE',
    summary: 'Patient invoicing, multi-gateway checkout (Cash, MoMo, Card, Bank), receipts, refunds & GBS subscriptions.',
    subtabs: ['Billing & Checkout', 'Transactions & Receipts', 'Bank Deposit Verification', 'GBS Subscriptions (0554594193)', 'Financial Reports']
  },
  {
    key: 'NHIA_CLAIMS',
    category: 'OPERATIONS_GOVERNANCE',
    summary: 'Health insurance member eligibility checks, claim batches, pre-submission vetting, e-claims & vouchers.',
    subtabs: ['Claims Batches', 'Claims & Vetting', 'Member Eligibility Check', 'G-DRG Tariffs']
  },
  {
    key: 'PROCUREMENT',
    category: 'OPERATIONS_GOVERNANCE',
    summary: 'Purchase orders, goods receipt notes (GRN), approved vendors, SLA contracts & 3-way invoice matching.',
    subtabs: ['Purchase Orders', 'Goods Receipt Notes (GRN)', 'Approved Vendors', 'Vendor SLA Contracts']
  },
  {
    key: 'HR',
    category: 'OPERATIONS_GOVERNANCE',
    summary: 'Duty shift roster, SBAR shift handovers, staff professional licensing, biometric attendance & leave.',
    subtabs: ['Duty Shift Roster', 'SBAR Shift Handovers', 'Staff Licenses & Credentials', 'Attendance & Leave', 'Staff Transfers']
  },
  {
    key: 'QUALITY',
    category: 'OPERATIONS_GOVERNANCE',
    summary: 'Confidential incident reporting, infection control (IPC), WHO clinical audits, CAPA & safety alerts.',
    subtabs: ['Incident Reporting', 'Infection Control (IPC)', 'WHO Clinical Audits', 'CAPA & Safety Alerts']
  },
  {
    key: 'EXECUTIVE_BI',
    category: 'OPERATIONS_GOVERNANCE',
    summary: 'Hospital Director analytics, revenue KPIs, bed census & live staff registration approvals.',
    subtabs: ['Executive KPI Overview', 'Revenue & Department Analytics', 'Staff Account Approvals']
  },
  {
    key: 'OPERATIONS_HUB',
    category: 'OPERATIONS_GOVERNANCE',
    summary: 'Online clinical board meetings, versioned document vault & facility maintenance/housekeeping tasks.',
    subtabs: ['Online Meetings & Boards', 'Document Vault & Versioning', 'Facility Maintenance & Utilities']
  },
  {
    key: 'PATIENT_PORTAL',
    category: 'TELEHEALTH_TECH',
    summary: 'Personal patient visits, diagnoses, prescriptions, lab summaries, allergies & live billing balances.',
    subtabs: ['My Visits & Diagnoses', 'My Prescriptions & Labs', 'My Bills & Receipts']
  },
  {
    key: 'VOICE_AUTH',
    category: 'TELEHEALTH_TECH',
    summary: 'Central GBS enterprise voiceprint enrollment, vocal challenge verification & biometric security vault.',
    subtabs: ['Voice Enrollment', 'Challenge Verification', 'Biometric Credentials', 'Zero-Trust Policy & Audit Logs']
  },
  {
    key: 'AI_SAFETY',
    category: 'TELEHEALTH_TECH',
    summary: 'Human-in-the-loop AI triage, diagnosis & treatment support with immutable drug/allergy guardrails.',
    subtabs: ['AI Triage Assistant', 'Diagnosis & Treatment Suggestions', 'Drug Interaction Check', 'Clinical Summarization & Risk']
  },
  {
    key: 'TELEMEDICINE',
    category: 'TELEHEALTH_TECH',
    summary: 'Encrypted WebRTC video consultations, hospital campus geofencing radar & interactive floor plans.',
    subtabs: ['WebRTC Virtual Clinic', 'GIS Geofencing Radar', 'Interactive Floor Plans', 'Spatial Telemetry']
  },
  {
    key: 'DEVELOPER_NOC',
    category: 'TELEHEALTH_TECH',
    devOnly: true,
    summary: 'Hidden Developer Control Center: tenants, countdowns, diagnostics, DB pool, backups, migration & RCCE.',
    subtabs: ['Tenant Registration & Countdowns', 'Live Diagnostics & DB Pool', 'Remote Ops & Backups', 'Data Migration Hub', 'RCCE Audit & Errors']
  }
];

export default function AllTabsNavigatorModal({
  isOpen,
  onClose,
  activeModule,
  onSelectModule,
  roles,
  currentRole,
  onSelectRole,
  detailGroups,
  onOpenDetail,
  categories,
  modules,
  isDeveloperAuthenticated
}) {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('ALL');

  const visibleDirectory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MODULE_SUBTAB_DIRECTORY.filter((entry) => {
      if (entry.devOnly && !isDeveloperAuthenticated) return false;
      if (selectedSection !== 'ALL' && entry.category !== selectedSection) return false;
      if (!q) return true;
      const modMeta = modules.find((m) => m.key === entry.key);
      const label = t(`mod.${entry.key}`, modMeta?.label || entry.key).toLowerCase();
      return (
        label.includes(q) ||
        entry.key.toLowerCase().includes(q) ||
        entry.summary.toLowerCase().includes(q) ||
        entry.subtabs.some((st) => st.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedSection, isDeveloperAuthenticated, modules, t]);

  const visibleRoles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roles.filter((r) => {
      if (r.id === 'DEVELOPER' && !isDeveloperAuthenticated) return false;
      if (!q) return true;
      return (
        t(`role.${r.id}`, r.name).toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.dept || '').toLowerCase().includes(q) ||
        (r.desc || '').toLowerCase().includes(q)
      );
    });
  }, [roles, searchQuery, isDeveloperAuthenticated, t]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="All hospital departments, sub-tabs, staff portals, and records directory"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9995,
        background: 'rgba(4, 10, 22, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '1240px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1.5px solid var(--gold-400)',
          background: 'rgba(9, 20, 42, 0.98)',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.9)'
        }}
      >
        {/* Top Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            background: 'rgba(6, 14, 30, 0.95)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutGrid size={22} style={{ color: 'var(--gold-400)' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--gold-300)' }}>
                {t('nav.allTabsTitle', 'All Departments, Sub-Tabs & Portals Directory')}
              </h2>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {t(
                  'nav.allTabsSubtitle',
                  'Every hospital department, inner tab, staff portal, and full-page record view organized clearly in one place — nothing hidden.'
                )}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--gold-400)',
                  pointerEvents: 'none'
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('nav.searchAllTabs', 'Search any tab, department, or role...')}
                aria-label="Search departments, sub-tabs, or staff roles"
                style={{ paddingLeft: '32px', paddingTop: '7px', paddingBottom: '7px', fontSize: '0.82rem' }}
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close all tabs directory"
              className="btn-outline-gold"
              style={{ padding: '7px 12px', fontSize: '0.8rem' }}
            >
              <X size={16} /> Close
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div
          style={{
            padding: '10px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            background: 'rgba(11, 23, 44, 0.85)'
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase' }}>
            <Layers size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            Filter Areas:
          </span>
          {Object.values(categories).map((cat) => {
            const active = selectedSection === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedSection(cat.id)}
                className={active ? 'btn-gold' : 'btn-outline-gold'}
                style={{ padding: '4px 10px', fontSize: '0.74rem', borderRadius: '6px' }}
              >
                {t(`cat.${cat.id}`, cat.label)}
              </button>
            );
          })}
          <span style={{ marginLeft: 'auto', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Showing <strong style={{ color: 'var(--gold-300)' }}>{visibleDirectory.length}</strong> departments &amp;{' '}
            <strong style={{ color: 'var(--gold-300)' }}>{visibleRoles.length}</strong> staff portals
          </span>
        </div>

        {/* Scrollable Organized Directory Body */}
        <div style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* 1. Departments & All Inner Sub-Tabs Grid */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '0.94rem', color: 'var(--gold-400)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Hospital Departments &amp; Visible Sub-Tabs ({visibleDirectory.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  onSelectModule('OVERVIEW');
                  onClose();
                }}
                className="btn-outline-gold"
                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
              >
                {t('nav.homeOverview', 'Home Overview')} →
              </button>
            </div>

            {visibleDirectory.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.28)', borderRadius: '8px' }}>
                No departments or sub-tabs match "{searchQuery}". Clear your search to see everything.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '12px' }}>
                {visibleDirectory.map((item) => {
                  const modMeta = modules.find((m) => m.key === item.key);
                  const ModIcon = modMeta?.icon || LayoutGrid;
                  const isCurrent = activeModule === item.key;
                  return (
                    <div
                      key={item.key}
                      style={{
                        padding: '13px 14px',
                        borderRadius: '10px',
                        background: isCurrent ? 'rgba(212,175,55,0.14)' : 'rgba(15, 27, 49, 0.78)',
                        border: isCurrent ? '1.5px solid var(--gold-400)' : '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <ModIcon size={16} style={{ color: modMeta?.color || 'var(--gold-400)', flexShrink: 0 }} />
                          <strong style={{ fontSize: '0.88rem', color: '#fff' }}>
                            {modMeta?.number ? `${modMeta.number}. ` : ''}
                            {t(`mod.${item.key}`, modMeta?.label || item.key)}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectModule(item.key);
                            onClose();
                          }}
                          className={isCurrent ? 'btn-gold' : 'btn-outline-gold'}
                          style={{ padding: '3px 9px', fontSize: '0.7rem', flexShrink: 0 }}
                        >
                          {isCurrent ? 'Active' : 'Open'} <ArrowRight size={11} />
                        </button>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                        {item.summary}
                      </div>

                      {/* Visible Sub-Tabs Chips */}
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {item.subtabs.map((sub) => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => {
                              onSelectModule(item.key);
                              onClose();
                            }}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              background: 'rgba(6, 12, 24, 0.75)',
                              border: '1px solid rgba(212, 175, 55, 0.28)',
                              color: 'var(--gold-300)',
                              cursor: 'pointer'
                            }}
                          >
                            • {sub}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. All Visible Staff Portals (Zero Horizontal Cutoff) */}
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.94rem', color: 'var(--gold-400)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} /> 2. All Staff &amp; Specialist Portals ({visibleRoles.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(205px, 1fr))', gap: '8px' }}>
              {visibleRoles.map((role) => {
                const active = currentRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      onSelectRole(role.id);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: active ? 'rgba(212, 175, 55, 0.2)' : 'rgba(15, 27, 49, 0.72)',
                      border: active ? '1.5px solid var(--gold-400)' : '1px solid var(--border-subtle)',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <img
                      src={role.img}
                      alt={role.name}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--gold-400)', flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: active ? 'var(--gold-300)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t(`role.${role.id}`, role.name)}
                      </div>
                      <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {role.dept}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. All 10 Quick Full-Page Record Views */}
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.94rem', color: 'var(--gold-400)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} /> 3. Full-Page Records, Reports &amp; System Views
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {detailGroups.flatMap((g) => g.commands).map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.type}
                    type="button"
                    onClick={() => {
                      onOpenDetail({
                        detailType: cmd.type,
                        moduleKey: activeModule,
                        recordId: 'all',
                        title: `${activeModule} — ${cmd.label}`
                      });
                      onClose();
                    }}
                    className="btn-outline-gold"
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  >
                    <Icon size={14} /> {cmd.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security Transparency Note */}
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.35)', fontSize: '0.75rem', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={15} />
            <span>
              All permitted departments and sub-tabs are shown above. Protected system engineering controls remain strictly isolated to authorized personnel.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
