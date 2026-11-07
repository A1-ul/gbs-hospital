import React, { useState, useEffect, useRef } from 'react';
import Header, { ROLES } from './components/Header';
import RoleLoginModal from './components/RoleLoginModal';
import UniversalDetailPage from './components/UniversalDetailPage';
import {
  PatientManagementView,
  ClinicalCareView,
  InpatientWardsView,
  PharmacyView,
  SurgeryView,
  DeveloperControlCenterView,
  EmergencyAmbulanceView,
  BloodBankView,
  MortuaryView,
  BiomedicalView,
  ProcurementView,
  HRManagementView,
  QualityAssuranceView,
  NhiaClaimsView,
  MigrationView,
  TelemedicineGisView,
  VoiceBiometricsView
} from './components/ModuleViews';
import {
  Users, Activity, Pill, FlaskConical, Stethoscope,
  Bed, FileText, CreditCard, Shield, AlertTriangle,
  Radio, HardDrive, Wrench, Package, Clock, CheckCircle,
  Search, PlusCircle, Lock, Unlock, RefreshCw, Database,
  Video, MapPin, Mic, Eye, Bell, History, Building2, User
} from 'lucide-react';
import { api } from './services/api.service';

function parseUrlRoute(pathname) {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  // Match /module/:moduleKey/detail/:detailType/:recordId
  const detailMatch = clean.match(/^\/module\/([^/]+)\/detail\/([^/]+)\/(.+)$/);
  if (detailMatch) {
    return {
      moduleKey: decodeURIComponent(detailMatch[1]),
      detail: {
        moduleKey: decodeURIComponent(detailMatch[1]),
        detailType: decodeURIComponent(detailMatch[2]),
        recordId: decodeURIComponent(detailMatch[3])
      }
    };
  }
  const modMatch = clean.match(/^\/module\/([^/]+)$/);
  if (modMatch) {
    return {
      moduleKey: decodeURIComponent(modMatch[1]),
      detail: null
    };
  }
  return { moduleKey: 'OVERVIEW', detail: null };
}

export default function App() {
  const initialRoute = typeof window !== 'undefined' ? parseUrlRoute(window.location.pathname) : { moduleKey: 'OVERVIEW', detail: null };

  const [currentRole, setCurrentRole] = useState('ADMINISTRATOR');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeModule, setActiveModuleState] = useState(initialRoute.moduleKey);
  const [activeDetail, setActiveDetail] = useState(initialRoute.detail);
  const savedScrollRef = useRef({});

  // Zero hardcoded numbers: Initialized to 0, populated exclusively from PostgreSQL
  const [globalStats, setGlobalStats] = useState({
    opdToday: 0,
    totalConsultations: 0,
    admissions: 0,
    surgeries: 0,
    inProgressSurgeries: 0,
    totalOperatingTheatres: 0,
    discharges: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    bedOccupancyRate: '0.0%',
    totalPatients: 0,
    totalFolders: 0,
    totalPrescriptions: 0,
    pendingPrescriptions: 0,
    totalLabOrders: 0,
    totalRadiologyOrders: 0,
    totalInvoices: 0,
    totalTenants: 0,
    activeUsers: 0
  });
  const [activeEnvironment, setActiveEnvironment] = useState('DEVELOPMENT');
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [facilityBranding, setFacilityBranding] = useState({
    mainSystemName: 'GBS HOSPITAL MANAGEMENT SYSTEM',
    hospitalName: 'GBS Premier Specialist Teaching Hospital',
    motto: 'Smart Healthcare, Better Care.'
  });

  const isDeveloperAuthenticated = Boolean(
    currentUser &&
    (currentUser.role === 'DEVELOPER' || String(currentUser.email || '').toLowerCase() === 'gabosei48@gmail.com')
  );

  const loadGlobalOverview = async () => {
    try {
      const [res, brandingRes] = await Promise.all([
        api.getGlobalOverviewStats().catch(() => null),
        api.getFacilityBranding().catch(() => null)
      ]);
      if (brandingRes && brandingRes.hospitalName) {
        setFacilityBranding(brandingRes);
      }
      if (res && res.metrics) {
        setGlobalStats({
          opdToday: res.metrics.opdToday ?? 0,
          totalConsultations: res.metrics.totalConsultations ?? 0,
          admissions: res.metrics.admissions ?? 0,
          surgeries: res.metrics.surgeries ?? 0,
          inProgressSurgeries: res.metrics.inProgressSurgeries ?? 0,
          totalOperatingTheatres: res.metrics.totalOperatingTheatres ?? 0,
          discharges: res.metrics.discharges ?? 0,
          totalBeds: res.metrics.totalBeds ?? 0,
          occupiedBeds: res.metrics.occupiedBeds ?? 0,
          availableBeds: res.metrics.availableBeds ?? 0,
          bedOccupancyRate: res.metrics.bedOccupancyRate || '0.0%',
          totalPatients: res.metrics.totalPatients ?? 0,
          totalFolders: res.metrics.totalFolders ?? 0,
          totalPrescriptions: res.metrics.totalPrescriptions ?? 0,
          pendingPrescriptions: res.metrics.pendingPrescriptions ?? 0,
          totalLabOrders: res.metrics.totalLabOrders ?? 0,
          totalRadiologyOrders: res.metrics.totalRadiologyOrders ?? 0,
          totalInvoices: res.metrics.totalInvoices ?? 0,
          totalTenants: res.metrics.totalTenants ?? 0,
          activeUsers: res.metrics.activeUsers ?? 0
        });
      }
      if (res?.environment) setActiveEnvironment(res.environment);
      if (Array.isArray(res?.recentAuditLogs)) setRecentAuditLogs(res.recentAuditLogs);
      if (Array.isArray(res?.recentNotifications)) setRecentNotifications(res.recentNotifications);
    } catch (_err) {
      // Preserve 0 state when offline
    }
  };

  // Check saved session & fetch live PostgreSQL overview metrics
  useEffect(() => {
    const savedUser = localStorage.getItem('gbs_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        if (u.role) setCurrentRole(u.role);
      } catch (_e) { }
    }
    loadGlobalOverview();
  }, []);

  // Refresh overview metrics when switching back to OVERVIEW
  useEffect(() => {
    if (activeModule === 'OVERVIEW' && !activeDetail) {
      loadGlobalOverview();
    }
  }, [activeModule, activeDetail]);

  // Universal Page Navigation & Browser Back/Forward Listener
  const setActiveModule = (moduleKey) => {
    savedScrollRef.current[activeModule] = typeof window !== 'undefined' ? window.scrollY : 0;
    setActiveDetail(null);
    setActiveModuleState(moduleKey);
    if (typeof window !== 'undefined') {
      const targetUrl = moduleKey === 'OVERVIEW' ? '/' : `/module/${encodeURIComponent(moduleKey)}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ moduleKey, detail: null }, '', targetUrl);
      }
    }
  };

  const openDetailPage = (payload) => {
    const mod = payload?.moduleKey || activeModule || 'OVERVIEW';
    const dType = payload?.detailType || 'VIEW_DETAILS';
    const recId = payload?.recordId || 'summary';

    if (typeof window !== 'undefined') {
      savedScrollRef.current[mod] = window.scrollY;
    }

    const detailObj = {
      ...payload,
      moduleKey: mod,
      detailType: dType,
      recordId: recId
    };

    setActiveDetail(detailObj);

    if (typeof window !== 'undefined') {
      const targetUrl = `/module/${encodeURIComponent(mod)}/detail/${encodeURIComponent(dType)}/${encodeURIComponent(recId)}`;
      window.history.pushState({ moduleKey: mod, detail: detailObj, prevScrollY: savedScrollRef.current[mod] || 0 }, '', targetUrl);
    }
  };

  const handleBackFromDetail = () => {
    const mod = activeDetail?.moduleKey || activeModule || 'OVERVIEW';
    const restoreScroll = savedScrollRef.current[mod] || 0;

    if (typeof window !== 'undefined' && window.history.state && window.history.state.detail) {
      window.history.back();
      setTimeout(() => {
        window.scrollTo({ top: restoreScroll, behavior: 'instant' });
      }, 40);
    } else {
      setActiveDetail(null);
      if (typeof window !== 'undefined') {
        const targetUrl = mod === 'OVERVIEW' ? '/' : `/module/${encodeURIComponent(mod)}`;
        window.history.replaceState({ moduleKey: mod, detail: null }, '', targetUrl);
        setTimeout(() => {
          window.scrollTo({ top: restoreScroll, behavior: 'instant' });
        }, 40);
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.gbsNavigateDetail = openDetailPage;

    const onPopState = (event) => {
      if (event.state && event.state.moduleKey) {
        setActiveModuleState(event.state.moduleKey);
        setActiveDetail(event.state.detail || null);
        if (!event.state.detail) {
          const restoreY = savedScrollRef.current[event.state.moduleKey] || 0;
          setTimeout(() => window.scrollTo({ top: restoreY, behavior: 'instant' }), 40);
        }
      } else {
        const parsed = parseUrlRoute(window.location.pathname);
        setActiveModuleState(parsed.moduleKey);
        setActiveDetail(parsed.detail);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [activeModule]);

  const handleLogout = () => {
    localStorage.removeItem('gbs_token');
    localStorage.removeItem('gbs_user');
    setCurrentUser(null);
    if (currentRole === 'DEVELOPER') {
      setCurrentRole('ADMINISTRATOR');
    }
    if (activeModule === 'DEVELOPER_NOC') {
      setActiveModule('OVERVIEW');
    }
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'NEW_APPOINTMENT':
      case 'PATIENT_SEARCH':
        setActiveModule('PATIENTS');
        break;
      case 'BED_AVAILABILITY':
        setActiveModule('WARDS');
        break;
      case 'PHARMACY_STOCK':
        setActiveModule('PHARMACY');
        break;
      case 'LAB_REQUESTS':
        setActiveModule('CLINICAL');
        break;
      case 'VIEW_REPORTS':
      case 'VIEW_NOTIFICATIONS':
      case 'VIEW_APPLICATIONS':
      case 'VIEW_HOSPITAL_INFORMATION':
      case 'VIEW_SYSTEM_INFORMATION':
        openDetailPage({
          detailType: action,
          moduleKey: activeModule,
          recordId: 'live'
        });
        break;
      default:
        setActiveModule('OVERVIEW');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Blueprint Header */}
      <Header
        currentRole={currentRole}
        onSelectRole={(r) => {
          setCurrentRole(r);
          if (r === 'DEVELOPER') {
            setActiveModule('DEVELOPER_NOC');
          } else if (r === 'DOCTOR' || r === 'NURSE' || r === 'DENTIST' || r === 'EYE_DOCTOR' || r === 'RADIOLOGIST') {
            setActiveModule('CLINICAL');
          } else if (r === 'SURGEON') {
            setActiveModule('SURGERY');
          } else if (r === 'PHARMACIST') {
            setActiveModule('PHARMACY');
          } else if (r === 'LAB_TECHNICIAN') {
            setActiveModule('BLOOD_BANK');
          } else if (r === 'EMERGENCY_PHYSICIAN' || r === 'PARAMEDIC' || r === 'AMBULANCE_DRIVER') {
            setActiveModule('EMERGENCY');
          } else if (r === 'MORTUARY_OFFICER' || r === 'PATHOLOGIST') {
            setActiveModule('MORTUARY');
          } else if (r === 'BIOMEDICAL_ENGINEER') {
            setActiveModule('BIOMEDICAL');
          } else if (r === 'FOLDER_RETRIEVER' || r === 'RECEPTIONIST') {
            setActiveModule('PATIENTS');
          } else if (r === 'ACCOUNTANT') {
            setActiveModule('NHIA_CLAIMS');
          } else if (r === 'HR_MANAGER') {
            setActiveModule('HR');
          } else if (r === 'PATIENT') {
            setActiveModule('PATIENTS');
          } else {
            setActiveModule('OVERVIEW');
          }
        }}
        onOpenLogin={() => setIsLoginOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenQuickAction={handleQuickAction}
        facilityBranding={facilityBranding}
        onUpdateFacilityBranding={setFacilityBranding}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '0 16px 24px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
        {/* Navigation Breadcrumb / Module Switcher Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              onClick={() => setActiveModule('OVERVIEW')}
              className={activeModule === 'OVERVIEW' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              Enterprise Overview
            </button>
            <button
              onClick={() => setActiveModule('PATIENTS')}
              className={activeModule === 'PATIENTS' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              <Users size={14} /> 1. Patient MPI & Archive
            </button>
            <button
              onClick={() => setActiveModule('CLINICAL')}
              className={activeModule === 'CLINICAL' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              <Activity size={14} /> 2. Clinical Care & OPD
            </button>
            <button
              onClick={() => setActiveModule('WARDS')}
              className={activeModule === 'WARDS' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              <Bed size={14} /> 3. Inpatient Wards & Beds
            </button>
            <button
              onClick={() => setActiveModule('PHARMACY')}
              className={activeModule === 'PHARMACY' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              <Pill size={14} /> 4. Pharmacy & Dispensing
            </button>
            <button
              onClick={() => setActiveModule('SURGERY')}
              className={activeModule === 'SURGERY' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              <Stethoscope size={14} /> 5. Surgery & Theatre
            </button>
            <button
              onClick={() => setActiveModule('EMERGENCY')}
              className={activeModule === 'EMERGENCY' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: '#ef4444' }}
            >
              <AlertTriangle size={14} style={{ color: '#ef4444' }} /> 6. Emergency & Ambulance
            </button>
            <button
              onClick={() => setActiveModule('BLOOD_BANK')}
              className={activeModule === 'BLOOD_BANK' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: '#ef4444' }}
            >
              <FlaskConical size={14} style={{ color: '#ef4444' }} /> 7. Blood Bank & Transfusion
            </button>
            <button
              onClick={() => setActiveModule('MORTUARY')}
              className={activeModule === 'MORTUARY' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: '#a1a1aa' }}
            >
              <HardDrive size={14} style={{ color: '#a1a1aa' }} /> 8. Mortuary & Cold Storage
            </button>
            <button
              onClick={() => setActiveModule('BIOMEDICAL')}
              className={activeModule === 'BIOMEDICAL' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: '#d97706' }}
            >
              <Wrench size={14} style={{ color: '#d97706' }} /> 9. Biomedical & Maintenance
            </button>
            <button
              onClick={() => setActiveModule('PROCUREMENT')}
              className={activeModule === 'PROCUREMENT' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: 'var(--gold-400)' }}
            >
              <Package size={14} style={{ color: 'var(--gold-400)' }} /> 10. Procurement & Supply Chain
            </button>
            <button
              onClick={() => setActiveModule('HR')}
              className={activeModule === 'HR' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: '#38bdf8' }}
            >
              <Users size={14} style={{ color: '#38bdf8' }} /> 11. Human Resources & Rostering
            </button>
            <button
              onClick={() => setActiveModule('QUALITY')}
              className={activeModule === 'QUALITY' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: '#d97706' }}
            >
              <Shield size={14} style={{ color: '#d97706' }} /> 12. Quality Assurance & IPC
            </button>
            <button
              onClick={() => setActiveModule('NHIA_CLAIMS')}
              className={activeModule === 'NHIA_CLAIMS' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: '#22c55e' }}
            >
              <CreditCard size={14} style={{ color: '#22c55e' }} /> 13. NHIA & Health Insurance
            </button>
            <button
              onClick={() => setActiveModule('VOICE_AUTH')}
              className={activeModule === 'VOICE_AUTH' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: 'var(--gold-400)' }}
            >
              <Mic size={14} style={{ color: 'var(--gold-400)' }} /> 14. Voice Biometrics & Security Vault
            </button>
            {(isDeveloperAuthenticated || currentRole === 'DEVELOPER' || activeModule === 'DEVELOPER_NOC') && (
              <button
                onClick={() => setActiveModule('DEVELOPER_NOC')}
                className={activeModule === 'DEVELOPER_NOC' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
                style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: '#ef4444' }}
              >
                <Shield size={14} /> Developer Dashboard (NOC • Migration • GIS & Telemedicine)
              </button>
            )}
          </div>

          {/* Active Role & Environment Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Env:</span>
            <span style={{ color: activeEnvironment === 'PRODUCTION' ? '#22c55e' : '#38bdf8', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', border: '1px solid currentColor' }}>
              {activeEnvironment}
            </span>
            <span>Role:</span>
            <span style={{ color: 'var(--gold-400)', fontWeight: 700, background: 'var(--gold-glow)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-gold)' }}>
              {currentRole}
            </span>
          </div>
        </div>

        {/* Universal Dedicated Detail Page Navigation Ribbon (Available Across All Dashboards) */}
        <div
          className="glass-panel"
          style={{
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            border: '1px solid var(--border-subtle)',
            background: 'rgba(15, 13, 10, 0.85)'
          }}
        >
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Dedicated Detail Pages ({activeModule}):
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { type: 'VIEW_DETAILS', label: 'View Details', icon: Eye },
              { type: 'VIEW_PROFILE', label: 'View Profile', icon: User },
              { type: 'VIEW_RECORDS', label: 'View Records', icon: Database },
              { type: 'VIEW_REPORTS', label: 'View Reports', icon: FileText },
              { type: 'VIEW_TRANSACTIONS', label: 'View Transactions', icon: CreditCard },
              { type: 'VIEW_HISTORY', label: 'View History', icon: History },
              { type: 'VIEW_NOTIFICATIONS', label: 'View Notifications', icon: Bell },
              { type: 'VIEW_APPLICATIONS', label: 'View Applications', icon: Users },
              { type: 'VIEW_HOSPITAL_INFORMATION', label: 'View Hospital Information', icon: Building2 },
              { type: 'VIEW_SYSTEM_INFORMATION', label: 'View System Information', icon: Activity }
            ].map((cmd) => {
              const Icon = cmd.icon;
              const isSelected = activeDetail && activeDetail.detailType === cmd.type;
              return (
                <button
                  key={cmd.type}
                  onClick={() =>
                    openDetailPage({
                      detailType: cmd.type,
                      moduleKey: activeModule,
                      recordId: 'all',
                      title: `${activeModule} — ${cmd.label}`
                    })
                  }
                  className={isSelected ? 'btn-gold' : 'btn-outline-gold'}
                  style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Icon size={12} /> {cmd.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dedicated Detail Page Renderer (When Any View Details / Profile / Records / etc. Command is Clicked) */}
        {activeDetail ? (
          <UniversalDetailPage
            detailState={activeDetail}
            onBack={handleBackFromDetail}
            onNavigateDetail={openDetailPage}
            currentRole={currentRole}
          />
        ) : (
          <>
            {/* Dynamic View Display */}
            {activeModule === 'OVERVIEW' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Real Hospital Exterior Hero Banner */}
                <div
                  className="glass-panel"
                  style={{
                    position: 'relative',
                    height: '240px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '30px',
                    border: '1px solid var(--border-gold-strong)',
                    boxShadow: 'var(--shadow-gold)'
                  }}
                >
                  <img
                    src="/assets/images/hospital_hero_exterior.jpg"
                    alt="Hospital Facility Exterior"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.96) 20%, rgba(10,9,7,0.45) 80%, rgba(10,9,7,0.2) 100%)' }} />

                  <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Welcome to GBS Hospital Management System • {facilityBranding?.hospitalName || 'GBS Premier Specialist Teaching Hospital'}
                      </span>
                      <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                        {facilityBranding?.hospitalName || 'Enterprise Clinical & Operational Command Center'}
                      </h2>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '700px' }}>
                        Fully connected, resilient, and audit-logged hospital automation platform built with zero mock data and real PostgreSQL multi-tenant architecture.
                      </p>
                    </div>

                    {/* Patient Safety Guardrail Badge & Refresh */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button onClick={loadGlobalOverview} className="btn-outline-gold" style={{ padding: '8px 14px', fontSize: '0.78rem' }}>
                        <RefreshCw size={14} /> Sync PostgreSQL Metrics
                      </button>
                      <div style={{ background: 'rgba(0,0,0,0.65)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-gold)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Shield style={{ color: 'var(--status-online)', width: '22px', height: '22px' }} />
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-online)' }}>Patient Safety Guardrails Active</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Clinical systems never lock • 24/7 Override enabled</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hospital Metrics Summary Cards (100% Real PostgreSQL Counts — Clickable to Dedicated Detail Page) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div
                    onClick={() => openDetailPage({ detailType: 'VIEW_RECORDS', moduleKey: 'CLINICAL', recordId: 'opd-today', title: 'OPD Encounters & Triage Queue Today', recordData: { opdToday: globalStats.opdToday, totalConsultations: globalStats.totalConsultations } })}
                    className="glass-panel"
                    style={{ padding: '18px 20px', borderLeft: '4px solid var(--gold-400)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>OPD Today</span>
                      <Activity size={18} style={{ color: 'var(--gold-400)' }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                      {(globalStats.opdToday ?? 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--status-online)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{globalStats.totalConsultations ?? 0} Consultations • Real-time DB</span>
                      <span style={{ color: 'var(--gold-400)' }}>View Details →</span>
                    </div>
                  </div>

                  <div
                    onClick={() => openDetailPage({ detailType: 'VIEW_RECORDS', moduleKey: 'WARDS', recordId: 'admissions-census', title: 'Active Inpatient Ward Admissions & Bed Census', recordData: { admissions: globalStats.admissions, occupiedBeds: globalStats.occupiedBeds, totalBeds: globalStats.totalBeds, bedOccupancyRate: globalStats.bedOccupancyRate } })}
                    className="glass-panel"
                    style={{ padding: '18px 20px', borderLeft: '4px solid var(--status-info)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inpatient Admissions</span>
                      <Bed size={18} style={{ color: 'var(--status-info)' }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                      {(globalStats.admissions ?? 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Occupancy: {globalStats.bedOccupancyRate} ({globalStats.occupiedBeds}/{globalStats.totalBeds} Beds)</span>
                      <span style={{ color: 'var(--gold-400)' }}>View Details →</span>
                    </div>
                  </div>

                  <div
                    onClick={() => openDetailPage({ detailType: 'VIEW_RECORDS', moduleKey: 'SURGERY', recordId: 'surgeries-scheduled', title: 'Operating Theatre Schedule & Surgical Cases', recordData: { scheduledSurgeries: globalStats.surgeries, totalOperatingTheatres: globalStats.totalOperatingTheatres, inProgressSurgeries: globalStats.inProgressSurgeries } })}
                    className="glass-panel"
                    style={{ padding: '18px 20px', borderLeft: '4px solid var(--status-warning)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Surgeries Scheduled</span>
                      <Stethoscope size={18} style={{ color: 'var(--status-warning)' }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                      {(globalStats.surgeries ?? 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{globalStats.totalOperatingTheatres ?? 0} Theatres • {globalStats.inProgressSurgeries ?? 0} In-Progress</span>
                      <span style={{ color: 'var(--gold-400)' }}>View Details →</span>
                    </div>
                  </div>

                  <div
                    onClick={() => openDetailPage({ detailType: 'VIEW_RECORDS', moduleKey: 'WARDS', recordId: 'discharges-cleared', title: 'Cleared Inpatient Discharges', recordData: { dischargesCleared: globalStats.discharges, totalInvoices: globalStats.totalInvoices } })}
                    className="glass-panel"
                    style={{ padding: '18px 20px', borderLeft: '4px solid var(--status-online)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Discharges Cleared</span>
                      <CheckCircle size={18} style={{ color: 'var(--status-online)' }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                      {(globalStats.discharges ?? 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--status-online)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Pharmacy & Billing Settled</span>
                      <span style={{ color: 'var(--gold-400)' }}>View Details →</span>
                    </div>
                  </div>
                </div>

                {/* Live Notifications & Audit Log Feed (Zero Hardcoded Items) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bell size={16} /> Live Hospital Notifications ({recentNotifications.length})
                      </h3>
                      <button
                        onClick={() => openDetailPage({ detailType: 'VIEW_NOTIFICATIONS', moduleKey: 'OVERVIEW', recordId: 'all' })}
                        className="btn-outline-gold"
                        style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                      >
                        View Notifications Page →
                      </button>
                    </div>
                    {recentNotifications.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                        No records available
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {recentNotifications.slice(0, 4).map((n) => (
                          <div key={n.id} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#fff' }}>{n.title}</div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{n.message}</div>
                            </div>
                            <button
                              onClick={() => openDetailPage({ detailType: 'VIEW_DETAILS', moduleKey: 'NOTIFICATIONS', recordId: n.id, title: n.title, recordData: n })}
                              className="btn-outline-gold"
                              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            >
                              View Details
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <History size={16} /> Recent PostgreSQL Audit Trail ({recentAuditLogs.length})
                      </h3>
                      <button
                        onClick={() => openDetailPage({ detailType: 'VIEW_HISTORY', moduleKey: 'OVERVIEW', recordId: 'audit-trail' })}
                        className="btn-outline-gold"
                        style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                      >
                        View History Page →
                      </button>
                    </div>
                    {recentAuditLogs.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                        No records available
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {recentAuditLogs.slice(0, 4).map((log) => (
                          <div key={log.id} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>{log.action}</div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{log.description}</div>
                            </div>
                            <button
                              onClick={() => openDetailPage({ detailType: 'VIEW_DETAILS', moduleKey: log.module || 'AUDIT', recordId: log.id, title: log.action, recordData: log })}
                              className="btn-outline-gold"
                              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            >
                              View Details
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Master Blueprint Real-Life Specialist & Staff Portals (Developer Hidden Unless Authenticated as Developer) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                      Hospital Staff & Specialist Portals ({ROLES.filter(r => r.id !== 'DEVELOPER' || isDeveloperAuthenticated).length} Authorized Roles)
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gold-400)' }}>
                      Click any role to open its dedicated real-life login page or launch its live workspace
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: '12px' }}>
                    {ROLES.filter((r) => r.id !== 'DEVELOPER' || isDeveloperAuthenticated).map((r) => {
                      const isCurrent = currentRole === r.id;
                      return (
                        <div
                          key={r.id}
                          className="glass-panel"
                          style={{
                            overflow: 'hidden',
                            border: isCurrent ? '1px solid var(--gold-400)' : '1px solid var(--border-subtle)',
                            boxShadow: isCurrent ? 'var(--shadow-gold)' : 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div style={{ position: 'relative', height: '130px', overflow: 'hidden', background: '#0a0907' }}>
                            <img
                              src={r.img}
                              alt={r.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                              onError={(e) => { e.target.src = '/assets/images/portrait_doctor.jpg'; }}
                            />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.95) 8%, rgba(10,9,7,0.15) 75%)' }} />
                            <div style={{ position: 'absolute', bottom: '8px', left: '10px', right: '10px' }}>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--gold-400)' }}>{r.name}</div>
                              <div style={{ fontSize: '0.68rem', color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.dept || r.desc}</div>
                            </div>
                          </div>
                          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minHeight: '30px' }}>• {r.desc}</div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => {
                                  setCurrentRole(r.id);
                                  setIsLoginOpen(true);
                                }}
                                className="btn-gold"
                                style={{ flex: 1, padding: '5px 8px', fontSize: '0.7rem', justifyContent: 'center' }}
                              >
                                Login
                              </button>
                              <button
                                onClick={() => {
                                  setCurrentRole(r.id);
                                  if (r.id === 'DEVELOPER') setActiveModule('DEVELOPER_NOC');
                                  else if (r.id === 'DOCTOR' || r.id === 'NURSE' || r.id === 'DENTIST' || r.id === 'EYE_DOCTOR' || r.id === 'RADIOLOGIST') setActiveModule('CLINICAL');
                                  else if (r.id === 'SURGEON') setActiveModule('SURGERY');
                                  else if (r.id === 'PHARMACIST') setActiveModule('PHARMACY');
                                  else if (r.id === 'LAB_TECHNICIAN') setActiveModule('BLOOD_BANK');
                                  else if (r.id === 'FOLDER_RETRIEVER' || r.id === 'RECEPTIONIST') setActiveModule('PATIENTS');
                                  else if (r.id === 'ACCOUNTANT') setActiveModule('NHIA_CLAIMS');
                                  else if (r.id === 'HR_MANAGER') setActiveModule('HR');
                                  else if (r.id === 'PATIENT') setActiveModule('PATIENTS');
                                  else setActiveModule('PATIENTS');
                                }}
                                className="btn-outline-gold"
                                style={{ flex: 1, padding: '5px 8px', fontSize: '0.7rem', justifyContent: 'center' }}
                              >
                                Portal →
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Master Blueprint Enterprise Modules Grid (Every Card with Real-Life Hospital Department Photography; Developer NOC Hidden from Non-Developers) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                      Enterprise Hospital Modules Ecosystem
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gold-400)' }}>
                      Click any module card to open its live interactive hospital dashboard
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    {[
                      { mod: 'PATIENTS', title: '1. Patient Management & MPI', desc: 'Registration, Master Patient Index, Physical Folder shelf cataloging, and chain-of-custody archive movement.', img: '/assets/images/patient_registration_archive_real.jpg', icon: Users, color: 'var(--gold-400)', border: 'var(--border-gold)' },
                      { mod: 'CLINICAL', title: '2. Clinical Care & OPD Triage', desc: 'Nurse OPD queuing, Adult NEWS2 evaluation, BMI calculation, and Doctor consultation with WHO ICD-10 coding.', img: '/assets/images/doctor_consultation_real.jpg', icon: Activity, color: 'var(--status-info)', border: 'var(--border-gold)' },
                      { mod: 'PHARMACY', title: '3. Pharmacy & FEFO Inventory', desc: 'FEFO prescription dispensing, batch expiry risk engine, low stock threshold alerts, and duplicate fulfillment prevention.', img: '/assets/images/pharmacy_dispensary_real.jpg', icon: Pill, color: 'var(--status-warning)', border: 'var(--border-gold)' },
                      { mod: 'CLINICAL', title: '4. Laboratory & Pathology', desc: 'Diagnostic panel requests, phlebotomy barcode tubes (SMP-YYYY-XXXXXX), and automated panic value cutoff evaluation.', img: '/assets/images/laboratory_pathology_real.jpg', icon: FlaskConical, color: 'var(--gold-400)', border: 'var(--border-gold)' },
                      { mod: 'WARDS', title: '5. Inpatient Wards & ICU Beds', desc: 'Ward and room provisioning, bed availability matrix, intra-ward bed transfers, and shift nursing charts.', img: '/assets/images/inpatient_ward_bed_real.jpg', icon: Bed, color: 'var(--status-online)', border: 'var(--border-gold)' },
                      { mod: 'SURGERY', title: '6. Operating Theatre & Surgery', desc: 'WHO 3-phase surgical safety checklist, Anesthesia ASA protocol, and PACU Modified Aldrete recovery clearance.', img: '/assets/images/operating_theatre_real.jpg', icon: Stethoscope, color: 'var(--gold-400)', border: 'var(--border-gold)' },
                      { mod: 'NHIA_CLAIMS', title: '7. Billing & NHIS Insurance', desc: 'Automated encounter charge compilation, multi-channel receipts (Cash, MoMo, Card), and NHIS claim lifecycle.', img: '/assets/images/nhia_claims_center_real.jpg', icon: CreditCard, color: 'var(--status-info)', border: 'var(--border-gold)' },
                      { mod: 'CLINICAL', title: '8. Radiology & PACS Imaging', desc: 'Modality worklists, DICOM windowing presets, red-flag panic finding detector, and electronic report sign-off.', img: '/assets/images/radiology_pacs_mri_real.jpg', icon: Radio, color: 'var(--gold-300)', border: 'var(--border-gold)' },
                      { mod: 'DEVELOPER_NOC', title: '9. Developer Landlord NOC', desc: 'Landlord control center, live countdown engine, emergency system lock/unlock, database backups, and tenant governance.', img: '/assets/images/developer_control_center_real.jpg', icon: Shield, color: '#fca5a5', border: '#ef4444' },
                      { mod: 'EMERGENCY', title: '10. Emergency & Ambulance Fleet', desc: 'Ambulance GPS fleet dispatch, Red/Yellow triage trauma bay allocation, ALS paramedic response, and emergency override logs.', img: '/assets/images/emergency_ambulance_fleet_real.jpg', icon: AlertTriangle, color: '#fca5a5', border: '#ef4444' },
                      { mod: 'BLOOD_BANK', title: '11. Blood Bank & Transfusion', desc: 'Donor registry, cold-chain 4°C storage, cross-matching compatibility matrix, and bedside dual-check hemovigilance.', img: '/assets/images/blood_bank_transfusion_real.jpg', icon: FlaskConical, color: '#fca5a5', border: '#ef4444' },
                      { mod: 'MORTUARY', title: '12. Mortuary & Cold Storage', desc: 'Cold storage vaults, clinical/coroner post-mortem autopsies, and biometric Next-of-Kin deceased release handover.', img: '/assets/images/mortuary_cold_storage_real.jpg', icon: HardDrive, color: '#e4e4e7', border: '#a1a1aa' },
                      { mod: 'BIOMEDICAL', title: '13. Biomedical & Maintenance', desc: 'Computerized maintenance CMMS, life-support asset telemetry, electrical safety analyzer sign-offs, and metrology calibrations.', img: '/assets/images/biomedical_engineering_equipment_real.jpg', icon: Wrench, color: '#fcd34d', border: '#d97706' },
                      { mod: 'PROCUREMENT', title: '14. Procurement & Supply Chain', desc: 'Purchase order lifecycle, supplier SLAs, goods receipt notes (GRN), and automated three-way matching against invoices.', img: '/assets/images/procurement_supply_chain_real.jpg', icon: Package, color: 'var(--gold-300)', border: 'var(--border-gold)' },
                      { mod: 'HR', title: '15. HR, Rostering & Credentialing', desc: 'Staff regulatory credentialing (MDC, NMC, PCG), duty roster scheduling, clinical SBAR shift handovers, and biometric attendance.', img: '/assets/images/hr_medical_staff_real.jpg', icon: Users, color: '#7dd3fc', border: 'var(--border-gold)' },
                      { mod: 'QUALITY', title: '15. Quality, Audits & Infection Control', desc: 'Hospital safety index, anonymous incident reporting, sentinel event 24h RCA, WHO Surgical Safety checklists, and IPC isolation.', img: '/assets/images/quality_infection_control_real.jpg', icon: Shield, color: '#fbbf24', border: 'var(--border-gold)' },
                      { mod: 'NHIA_CLAIMS', title: '16. NHIA Claims & E-Claims Adjudication', desc: 'G-DRG tariff pricing, NHIS eligibility verification, 20-rule pre-submission vetting, and reconciliation vouchers.', img: '/assets/images/nhia_claims_center_real.jpg', icon: CreditCard, color: '#86efac', border: '#22c55e' },
                      { mod: 'VOICE_AUTH', title: '17. Central Voice Biometrics & Vault', desc: 'Acoustic voiceprint enrollment, zero-trust MFCC matching, anti-spoofing liveness guards, and multi-factor clinical challenges.', img: '/assets/images/voice_biometric_security_real.jpg', icon: Mic, color: 'var(--gold-300)', border: 'var(--border-gold)' }
                    ]
                      .filter((card) => card.mod !== 'DEVELOPER_NOC' || isDeveloperAuthenticated || currentRole === 'DEVELOPER')
                      .map((card, idx) => {
                        const CardIcon = card.icon;
                        return (
                          <div
                            key={idx}
                            onClick={() => setActiveModule(card.mod)}
                            className="glass-panel"
                            style={{
                              overflow: 'hidden',
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease',
                              border: `1px solid ${card.border}`
                            }}
                          >
                            <div style={{ position: 'relative', height: '135px', overflow: 'hidden', background: '#0a0907' }}>
                              <img
                                src={card.img}
                                alt={card.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = '/assets/images/hospital_hero_exterior.jpg'; }}
                              />
                              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.96) 10%, rgba(10,9,7,0.25) 75%)' }} />
                              <div style={{ position: 'absolute', bottom: '10px', left: '14px', right: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CardIcon size={18} style={{ color: card.color, flexShrink: 0 }} />
                                <h4 style={{ fontSize: '0.95rem', color: '#fff', margin: 0 }}>{card.title}</h4>
                              </div>
                            </div>
                            <div style={{ padding: '14px 16px' }}>
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>{card.desc}</p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--gold-400)', fontWeight: 700 }}>
                                <span>Real-Life Connected Module</span>
                                <span>Open Dashboard →</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* View Routing */}
            {activeModule === 'PATIENTS' && <PatientManagementView onNavigateDetail={openDetailPage} />}
            {activeModule === 'CLINICAL' && <ClinicalCareView onNavigateDetail={openDetailPage} />}
            {activeModule === 'WARDS' && <InpatientWardsView onNavigateDetail={openDetailPage} />}
            {activeModule === 'PHARMACY' && <PharmacyView onNavigateDetail={openDetailPage} />}
            {activeModule === 'SURGERY' && <SurgeryView onNavigateDetail={openDetailPage} />}
            {activeModule === 'EMERGENCY' && <EmergencyAmbulanceView onNavigateDetail={openDetailPage} />}
            {activeModule === 'BLOOD_BANK' && <BloodBankView onNavigateDetail={openDetailPage} />}
            {activeModule === 'MORTUARY' && <MortuaryView onNavigateDetail={openDetailPage} />}
            {activeModule === 'BIOMEDICAL' && <BiomedicalView onNavigateDetail={openDetailPage} />}
            {activeModule === 'PROCUREMENT' && <ProcurementView onNavigateDetail={openDetailPage} />}
            {activeModule === 'HR' && <HRManagementView onNavigateDetail={openDetailPage} />}
            {activeModule === 'QUALITY' && <QualityAssuranceView onNavigateDetail={openDetailPage} />}
            {activeModule === 'NHIA_CLAIMS' && <NhiaClaimsView onNavigateDetail={openDetailPage} />}
            {activeModule === 'VOICE_AUTH' && <VoiceBiometricsView onNavigateDetail={openDetailPage} />}
            {(activeModule === 'DEVELOPER_NOC' || activeModule === 'MIGRATION' || activeModule === 'TELEMEDICINE') && (
              <DeveloperControlCenterView onNavigateDetail={openDetailPage} />
            )}
          </>
        )}
      </main>

      {/* Role Login Modal */}
      <RoleLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        initialRole={currentRole}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role) setCurrentRole(user.role);
          if (user.role === 'DEVELOPER' || String(user.email || '').toLowerCase() === 'gabosei48@gmail.com') {
            setCurrentRole('DEVELOPER');
            setActiveModule('DEVELOPER_NOC');
          }
          loadGlobalOverview();
        }}
      />

      {/* Footer Banner */}
      <footer style={{ borderTop: '1px solid var(--border-gold)', background: 'rgba(10,9,7,0.95)', padding: '16px 20px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--gold-400)', letterSpacing: '0.04em' }}>
        <div style={{ fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
          ONE SYSTEM - ONE TASK • SIMPLE FRONTEND - POWERFUL BACKEND • AUTOMATE & ELIMINATE MANUAL WORK • BUILD FOR SCALE - FROM DAY 1 • SECURE BY DESIGN
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>
          © 2026 GBS HOSPITAL SYSTEM (Official Account: gabosei48@gmail.com • Render.com Cloud). All Rights Reserved. Production-Grade Connected Architecture.
        </div>
      </footer>
    </div>
  );
}
