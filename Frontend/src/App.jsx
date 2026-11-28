import React, { useState, useEffect, useRef } from 'react';
import Header, { ROLES, ROLE_CATEGORIES } from './components/Header';
import RoleLoginModal from './components/RoleLoginModal';
import DeveloperPortalGate from './components/DeveloperPortalGate';
import UniversalDetailPage from './components/UniversalDetailPage';
import SystemFeedbackBrain from './components/SystemFeedbackBrain';
import SubscriptionLockOverlay from './components/SubscriptionLockOverlay';
import AllTabsNavigatorModal from './components/AllTabsNavigatorModal';
import CallCenterModal from './components/CallCenterModal';
import IncomingCallBanner from './components/IncomingCallBanner';
import LiveMediaRoomModal from './components/LiveMediaRoomModal';
import HospitalMembershipCardModal from './components/HospitalMembershipCardModal';

const MODULE_BACKGROUND_MAP = {
  OVERVIEW: '/assets/images/hospital_hero_exterior.jpg',
  PATIENTS: '/assets/images/patient_registration_archive_real.jpg',
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
  VOICE_AUTH: '/assets/images/voice_biometric_security_real.jpg',
  DEVELOPER_NOC: '/assets/images/developer_control_center_real.jpg',
  MIGRATION: '/assets/images/migration_data_center_real.jpg',
  TELEMEDICINE: '/assets/images/telemedicine_command_center_real.jpg',
  DENTAL: '/assets/images/dental_clinic_real.jpg',
  EYE_CLINIC: '/assets/images/ophthalmology_eye_clinic_real.jpg',
  ICU: '/assets/images/inpatient_ward_bed_real.jpg',
  AI_SAFETY: '/assets/images/quality_infection_control_real.jpg',
  LABORATORY: '/assets/images/laboratory_pathology_real.jpg',
  RADIOLOGY: '/assets/images/radiology_pacs_mri_real.jpg',
  BILLING: '/assets/images/nhia_claims_center_real.jpg',
  PATIENT_PORTAL: '/assets/images/hospital_hero_exterior.jpg',
  EXECUTIVE_BI: '/assets/images/hospital_director_boardroom_real.jpg',
  OPERATIONS_HUB: '/assets/images/hospital_admin_office_real.jpg',
};

const ROLE_BACKGROUND_MAP = {
  ADMINISTRATOR: '/assets/images/hospital_admin_office_real.jpg',
  HOSPITAL_DIRECTOR: '/assets/images/hospital_director_boardroom_real.jpg',
  DEVELOPER: '/assets/images/developer_control_center_real.jpg',
  DOCTOR: '/assets/images/doctor_consultation_real.jpg',
  SURGEON: '/assets/images/operating_theatre_real.jpg',
  DENTIST: '/assets/images/dental_clinic_real.jpg',
  EYE_DOCTOR: '/assets/images/ophthalmology_eye_clinic_real.jpg',
  RADIOLOGIST: '/assets/images/radiology_pacs_mri_real.jpg',
  NURSE: '/assets/images/nurse_triage_station.jpg',
  PHARMACIST: '/assets/images/pharmacy_dispensary_real.jpg',
  LAB_TECHNICIAN: '/assets/images/laboratory_pathology_real.jpg',
  RECEPTIONIST: '/assets/images/patient_registration_archive_real.jpg',
  FOLDER_RETRIEVER: '/assets/images/medical_records_archive_real.jpg',
  ACCOUNTANT: '/assets/images/nhia_claims_center_real.jpg',
  HR_MANAGER: '/assets/images/hr_medical_staff_real.jpg',
  PATIENT: '/assets/images/hospital_hero_exterior.jpg',
};
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
import DentalClinicView from './modules/clinical-specialties/DentalClinicView';
import EyeClinicView from './modules/clinical-specialties/EyeClinicView';
import IcuVitalsView from './modules/clinical-specialties/IcuVitalsView';
import AiSafetyCenterView from './modules/clinical-specialties/AiSafetyCenterView';
import LaboratoryView from './modules/diagnostics/LaboratoryView';
import RadiologyPacsView from './modules/diagnostics/RadiologyPacsView';
import BillingPaymentsView from './modules/finance/BillingPaymentsView';
import PatientPortalView from './modules/patient-portal/PatientPortalView';
import ExecutiveAdminBiView from './modules/executive/ExecutiveAdminBiView';
import OperationsSuiteView from './modules/operations/OperationsSuiteView';
import {
  Users, Activity, Pill, FlaskConical, Stethoscope,
  Bed, FileText, CreditCard, Shield, AlertTriangle,
  Radio, HardDrive, Wrench, Package, Clock, CheckCircle,
  Search, PlusCircle, Lock, Unlock, RefreshCw, Database,
  Video, MapPin, Mic, Eye, Bell, History, Building2, User, Layers
} from 'lucide-react';
import { api } from './services/api.service';
import { useLocale } from './context/LocaleContext';
import {
  isDeveloperRoute,
  initManualScrollRestoration,
  generateNavKey,
  captureScrollSnapshot,
  saveScrollSnapshot,
  loadScrollSnapshot,
  saveRouteFallbackSnapshot,
  loadRouteFallbackSnapshot,
  restoreScrollSnapshot,
  scrollNewPageToTop
} from './services/navigation.manager';

export const SUBSYSTEM_CATEGORIES = {
  ALL: { id: 'ALL', label: 'All Departments', icon: Layers, badge: 'ALL 26' },
  CLINICAL_INPATIENT: { id: 'CLINICAL_INPATIENT', label: 'Patient Care & Wards', icon: Stethoscope, badge: '8 AREAS' },
  ACUTE_DIAGNOSTICS: { id: 'ACUTE_DIAGNOSTICS', label: 'Emergency & Lab', icon: AlertTriangle, badge: '6 AREAS' },
  OPERATIONS_GOVERNANCE: { id: 'OPERATIONS_GOVERNANCE', label: 'Billing, Staff & Quality', icon: Building2, badge: '7 AREAS' },
  TELEHEALTH_TECH: { id: 'TELEHEALTH_TECH', label: 'Video Visits & Tools', icon: Video, badge: '5 AREAS' }
};

export const SUBSYSTEM_MODULES = [
  { key: 'PATIENTS', number: '1', label: 'Patients & Folders', icon: Users, category: 'CLINICAL_INPATIENT', color: '#38bdf8' },
  { key: 'CLINICAL', number: '2', label: 'Doctor & Nurse Care', icon: Activity, category: 'CLINICAL_INPATIENT', color: '#38bdf8' },
  { key: 'WARDS', number: '3', label: 'Wards & Free Beds', icon: Bed, category: 'CLINICAL_INPATIENT', color: '#38bdf8' },
  { key: 'ICU', number: '4', label: 'ICU & Live Vitals', icon: Activity, category: 'CLINICAL_INPATIENT', color: '#ef4444' },
  { key: 'PHARMACY', number: '5', label: 'Pharmacy & Medicine', icon: Pill, category: 'CLINICAL_INPATIENT', color: '#38bdf8' },
  { key: 'SURGERY', number: '6', label: 'Surgery & Operating Rooms', icon: Stethoscope, category: 'CLINICAL_INPATIENT', color: '#38bdf8' },
  { key: 'DENTAL', number: '7', label: 'Dental Clinic', icon: Stethoscope, category: 'CLINICAL_INPATIENT', color: '#38bdf8' },
  { key: 'EYE_CLINIC', number: '8', label: 'Eye Clinic', icon: Eye, category: 'CLINICAL_INPATIENT', color: '#38bdf8' },

  { key: 'EMERGENCY', number: '9', label: 'Emergency & Ambulances', icon: AlertTriangle, category: 'ACUTE_DIAGNOSTICS', color: '#ef4444' },
  { key: 'LABORATORY', number: '10', label: 'Laboratory & Pathology', icon: FlaskConical, category: 'ACUTE_DIAGNOSTICS', color: '#38bdf8' },
  { key: 'RADIOLOGY', number: '11', label: 'Radiology & PACS', icon: Radio, category: 'ACUTE_DIAGNOSTICS', color: '#38bdf8' },
  { key: 'BLOOD_BANK', number: '12', label: 'Blood Bank', icon: FlaskConical, category: 'ACUTE_DIAGNOSTICS', color: '#ef4444' },
  { key: 'MORTUARY', number: '13', label: 'Mortuary Services', icon: HardDrive, category: 'ACUTE_DIAGNOSTICS', color: '#a1a1aa' },
  { key: 'BIOMEDICAL', number: '14', label: 'Equipment & Repairs', icon: Wrench, category: 'ACUTE_DIAGNOSTICS', color: '#d97706' },

  { key: 'BILLING', number: '15', label: 'Billing & Payments', icon: CreditCard, category: 'OPERATIONS_GOVERNANCE', color: '#10b981' },
  { key: 'NHIA_CLAIMS', number: '16', label: 'NHIA / NHIS Claims', icon: CreditCard, category: 'OPERATIONS_GOVERNANCE', color: '#22c55e' },
  { key: 'PROCUREMENT', number: '17', label: 'Supplies & Purchasing', icon: Package, category: 'OPERATIONS_GOVERNANCE', color: 'var(--gold-400)' },
  { key: 'HR', number: '18', label: 'Staff, Shifts & Leave', icon: Users, category: 'OPERATIONS_GOVERNANCE', color: '#38bdf8' },
  { key: 'QUALITY', number: '19', label: 'Safety & Quality', icon: Shield, category: 'OPERATIONS_GOVERNANCE', color: '#d97706' },
  { key: 'EXECUTIVE_BI', number: '20', label: 'Executive BI & Admin', icon: Building2, category: 'OPERATIONS_GOVERNANCE', color: 'var(--gold-400)' },
  { key: 'OPERATIONS_HUB', number: '21', label: 'Meetings, Docs & Facility', icon: FileText, category: 'OPERATIONS_GOVERNANCE', color: '#38bdf8' },

  { key: 'PATIENT_PORTAL', number: '22', label: 'Patient Self-Service', icon: User, category: 'TELEHEALTH_TECH', color: '#10b981' },
  { key: 'VOICE_AUTH', number: '23', label: 'Voice & Finger Lock', icon: Mic, category: 'TELEHEALTH_TECH', color: 'var(--gold-400)' },
  { key: 'AI_SAFETY', number: '24', label: 'AI & Safety Guardrails', icon: Shield, category: 'TELEHEALTH_TECH', color: '#10b981' },
  { key: 'TELEMEDICINE', number: '25', label: 'Video Visits & Maps', icon: Video, category: 'TELEHEALTH_TECH', color: '#06b6d4' },
  { key: 'DEVELOPER_NOC', number: '26', label: 'System Control Center', icon: Shield, category: 'TELEHEALTH_TECH', color: '#ef4444', devOnly: true }
];

export const DETAIL_PAGE_GROUPS = [
  {
    cluster: 'Patient & Care Records',
    badge: '🩺 RECORDS',
    color: '#38bdf8',
    commands: [
      { type: 'VIEW_DETAILS', label: 'Details', icon: Eye },
      { type: 'VIEW_PROFILE', label: 'Profile', icon: User },
      { type: 'VIEW_RECORDS', label: 'All Records', icon: Database },
      { type: 'VIEW_REPORTS', label: 'Reports', icon: FileText }
    ]
  },
  {
    cluster: 'Payments, History & Alerts',
    badge: '⏱️ UPDATES',
    color: 'var(--gold-400)',
    commands: [
      { type: 'VIEW_TRANSACTIONS', label: 'Payments', icon: CreditCard },
      { type: 'VIEW_HISTORY', label: 'Activity Log', icon: History },
      { type: 'VIEW_NOTIFICATIONS', label: 'Alerts', icon: Bell }
    ]
  },
  {
    cluster: 'Hospital Info & Requests',
    badge: '🏛️ HOSPITAL',
    color: '#34d399',
    commands: [
      { type: 'VIEW_APPLICATIONS', label: 'Requests', icon: Users },
      { type: 'VIEW_HOSPITAL_INFORMATION', label: 'Hospital Info', icon: Building2 },
      { type: 'VIEW_SYSTEM_INFORMATION', label: 'System Health', icon: Activity }
    ]
  }
];

export const ECOSYSTEM_CATEGORIES = {
  ALL: { id: 'ALL', label: 'All Services' },
  CLINICAL: { id: 'CLINICAL', label: 'Patient Care & Wards' },
  ACUTE_DIAGNOSTICS: { id: 'ACUTE_DIAGNOSTICS', label: 'Emergency & Lab' },
  OPERATIONS: { id: 'OPERATIONS', label: 'Billing, Staff & Quality' },
  TECHNOLOGY: { id: 'TECHNOLOGY', label: 'Digital Tools' }
};

const VALID_MODULE_KEYS = new Set([
  'OVERVIEW',
  'DEVELOPER_PORTAL',
  'MIGRATION',
  ...SUBSYSTEM_MODULES.map((m) => m.key)
]);

function normalizeValidModuleKey(rawKey) {
  const normalized = String(rawKey || '').trim().toUpperCase();
  if (VALID_MODULE_KEYS.has(normalized)) {
    return normalized;
  }
  return 'OVERVIEW';
}

function parseUrlRoute(pathname) {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  // Hidden unlisted Developer Control Center path
  if (/^\/developer-portal(\/.*)?$/i.test(clean)) {
    return { moduleKey: 'DEVELOPER_PORTAL', detail: null };
  }
  // Match /module/:moduleKey/detail/:detailType/:recordId
  const detailMatch = clean.match(/^\/module\/([^/]+)\/detail\/([^/]+)\/(.+)$/);
  if (detailMatch) {
    const validMod = normalizeValidModuleKey(decodeURIComponent(detailMatch[1]));
    return {
      moduleKey: validMod,
      detail: {
        moduleKey: validMod,
        detailType: decodeURIComponent(detailMatch[2]),
        recordId: decodeURIComponent(detailMatch[3])
      }
    };
  }
  const modMatch = clean.match(/^\/module\/([^/]+)$/);
  if (modMatch) {
    return {
      moduleKey: normalizeValidModuleKey(decodeURIComponent(modMatch[1])),
      detail: null
    };
  }
  return { moduleKey: 'OVERVIEW', detail: null };
}

function getDefaultModuleForRole(role) {
  if (role === 'DEVELOPER') return 'DEVELOPER_NOC';
  if (role === 'HOSPITAL_DIRECTOR' || role === 'ADMINISTRATOR') return 'EXECUTIVE_BI';
  if (role === 'DENTIST') return 'DENTAL';
  if (role === 'EYE_DOCTOR') return 'EYE_CLINIC';
  if (role === 'LAB_TECHNICIAN') return 'LABORATORY';
  if (role === 'RADIOLOGIST') return 'RADIOLOGY';
  if (role === 'ACCOUNTANT') return 'BILLING';
  if (role === 'PATIENT') return 'PATIENT_PORTAL';
  if (['DOCTOR', 'NURSE'].includes(role)) return 'CLINICAL';
  if (role === 'SURGEON') return 'SURGERY';
  if (role === 'PHARMACIST') return 'PHARMACY';
  if (['FOLDER_RETRIEVER', 'RECEPTIONIST'].includes(role)) return 'PATIENTS';
  if (role === 'HR_MANAGER') return 'HR';
  return 'OVERVIEW';
}

export default function App() {
  const { t, activeCountry, activeLanguage } = useLocale();
  const initialRoute = typeof window !== 'undefined' ? parseUrlRoute(window.location.pathname) : { moduleKey: 'OVERVIEW', detail: null };

  const [currentRole, setCurrentRole] = useState('ADMINISTRATOR');
  const [loginModalRole, setLoginModalRole] = useState('DOCTOR');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showOperatingGuide, setShowOperatingGuide] = useState(false);
  const [showAllTabsModal, setShowAllTabsModal] = useState(false);
  const [showCallCenter, setShowCallCenter] = useState(false);
  const [activeMediaSession, setActiveMediaSession] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [answeringCall, setAnsweringCall] = useState(false);
  const [membershipCardState, setMembershipCardState] = useState({
    isOpen: false,
    cardData: null,
    loading: false,
    error: null,
    retryFn: null,
  });
  const [activeModule, setActiveModuleState] = useState(initialRoute.moduleKey);
  const [activeDetail, setActiveDetail] = useState(initialRoute.detail);
  const [subsystemCategory, setSubsystemCategory] = useState('ALL');
  const [overviewStaffCategory, setOverviewStaffCategory] = useState('ALL');
  const [overviewModuleCategory, setOverviewModuleCategory] = useState('ALL');
  const [demoQuota, setDemoQuota] = useState(null);
  const currentNavKeyRef = useRef(generateNavKey('init'));
  const navDepthRef = useRef(0);
  const roleNavDepthRef = useRef({});
  const navStateRef = useRef({
    activeModule: initialRoute.moduleKey,
    activeDetail: initialRoute.detail,
    currentRole: 'ADMINISTRATOR',
    subsystemCategory: 'ALL',
    overviewStaffCategory: 'ALL',
    overviewModuleCategory: 'ALL'
  });

  navStateRef.current = {
    activeModule,
    activeDetail,
    currentRole,
    currentUser,
    subsystemCategory,
    overviewStaffCategory,
    overviewModuleCategory
  };

  // Zero hardcoded numbers: Initialized to 0, populated exclusively from PostgreSQL
  const [globalStats, setGlobalStats] = useState({
    opdToday: 0,
    opdEncountersToday: [],
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
  const [demoModeEnabled, setDemoModeEnabled] = useState(false);
  const [isDeveloperMfaVerified, setIsDeveloperMfaVerified] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem('gbs_dev_mfa_verified') === 'true'
  );
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [facilityBranding, setFacilityBranding] = useState({
    mainSystemName: 'GBS HOSPITAL MANAGEMENT SYSTEM',
    hospitalName: 'GBS Premier Specialist Teaching Hospital',
    motto: 'Smart Healthcare, Better Care.'
  });

  const isDeveloperAuthenticated = Boolean(
    currentUser &&
    currentUser.role === 'DEVELOPER' &&
    isDeveloperMfaVerified
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
          opdEncountersToday: Array.isArray(res.opdEncountersToday) ? res.opdEncountersToday : [],
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

  // Verify saved session cleanly (ZERO silent auto-login, ZERO client credentials)
  useEffect(() => {
    const savedUser = localStorage.getItem('gbs_user');
    const savedToken = localStorage.getItem('gbs_token');
    if (savedUser && savedToken) {
      try {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        if (u.role) setCurrentRole(u.role);
        if (u.demoQuota) setDemoQuota(u.demoQuota);
      } catch (_e) { }

      api.me()
        .then((freshUser) => {
          if (freshUser && freshUser.id) {
            setCurrentUser(freshUser);
            localStorage.setItem('gbs_user', JSON.stringify(freshUser));
            if (freshUser.role) {
              setCurrentRole(freshUser.role);
              localStorage.setItem('gbs_role', freshUser.role);
            }
            setDemoQuota(freshUser.isDemoSession ? (freshUser.demoQuota || { isDemoSession: true, entriesUsed: 0, maxEntries: 10, remaining: 10, limitReached: false }) : null);
          }
        })
        .catch(() => {
          localStorage.removeItem('gbs_token');
          localStorage.removeItem('gbs_user');
          sessionStorage.removeItem('gbs_dev_mfa_verified');
          setCurrentUser(null);
          setDemoQuota(null);
          setIsDeveloperMfaVerified(false);
        });
    }

    api.getEnvironmentInfo()
      .then((envInfo) => {
        if (envInfo?.activeEnvironment) setActiveEnvironment(envInfo.activeEnvironment);
        setDemoModeEnabled(Boolean(envInfo?.demoModeEnabled));
      })
      .catch(() => { });

    loadGlobalOverview();

    const onSessionExpired = () => {
      setCurrentUser(null);
      setDemoQuota(null);
      setIsDeveloperMfaVerified(false);
      setCurrentRole('ADMINISTRATOR');
    };
    const onDemoQuotaUpdated = (evt) => {
      if (evt?.detail) setDemoQuota(evt.detail);
    };
    window.addEventListener('gbs:session-expired', onSessionExpired);
    window.addEventListener('gbs:demo-quota-updated', onDemoQuotaUpdated);
    return () => {
      window.removeEventListener('gbs:session-expired', onSessionExpired);
      window.removeEventListener('gbs:demo-quota-updated', onDemoQuotaUpdated);
    };
  }, []);

  // Refresh overview metrics when switching back to OVERVIEW
  useEffect(() => {
    if (activeModule === 'OVERVIEW' && !activeDetail) {
      loadGlobalOverview();
    }
  }, [activeModule, activeDetail]);

  // Dynamic browser tab title per active page
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (activeDetail?.title) {
      document.title = `${activeDetail.title} — GBS Hospital System`;
      return;
    }
    const modMeta = SUBSYSTEM_MODULES.find((m) => m.key === activeModule);
    if (modMeta) {
      document.title = `${modMeta.label} — GBS Hospital System`;
    } else if (activeModule === 'DEVELOPER_PORTAL') {
      document.title = 'Developer Security Gate — GBS Hospital System';
    } else {
      document.title = 'GBS Hospital System — Simple, Modern Healthcare & Care Platform';
    }
  }, [activeModule, activeDetail]);

  const persistOutgoingPageSnapshot = () => {
    const snap = navStateRef.current;
    if (isDeveloperRoute(snap.activeModule)) return;
    const outgoingKey = currentNavKeyRef.current;
    const scrollSnapshot = captureScrollSnapshot({
      subsystemCategory: snap.subsystemCategory,
      overviewStaffCategory: snap.overviewStaffCategory,
      overviewModuleCategory: snap.overviewModuleCategory,
      role: snap.currentRole
    });
    saveScrollSnapshot(outgoingKey, scrollSnapshot);
    if (typeof window !== 'undefined') {
      saveRouteFallbackSnapshot(window.location.pathname || '/', scrollSnapshot);
      const existingState = window.history.state || {};
      window.history.replaceState(
        {
          ...existingState,
          navKey: outgoingKey,
          moduleKey: snap.activeModule,
          detail: snap.activeDetail,
          role: snap.currentRole,
          isAppEntry: true,
          navDepth: navDepthRef.current
        },
        '',
        window.location.pathname + window.location.search
      );
    }
  };

  // Global Page Navigation & Browser History (excludes Developer Dashboard scroll mutations)
  const setActiveModule = (moduleKey, navOptions = {}) => {
    const prev = navStateRef.current;
    const nextRole = navOptions.role || prev.currentRole;
    const targetUrl = moduleKey === 'OVERVIEW' ? '/' : `/module/${encodeURIComponent(moduleKey)}`;

    if (
      prev.activeModule === moduleKey &&
      prev.currentRole === nextRole &&
      !prev.activeDetail &&
      typeof window !== 'undefined' &&
      window.location.pathname === targetUrl
    ) {
      return;
    }

    if (!isDeveloperRoute(prev.activeModule)) {
      persistOutgoingPageSnapshot();
    }

    const nextNavKey = generateNavKey(moduleKey.toLowerCase());
    currentNavKeyRef.current = nextNavKey;
    navDepthRef.current += 1;
    roleNavDepthRef.current[nextRole] = (roleNavDepthRef.current[nextRole] || 0) + 1;

    setActiveDetail(null);
    setActiveModuleState(moduleKey);

    if (typeof window !== 'undefined') {
      if (
        window.location.pathname !== targetUrl ||
        window.history.state?.detail ||
        prev.currentRole !== nextRole
      ) {
        window.history.pushState(
          {
            navKey: nextNavKey,
            moduleKey,
            detail: null,
            role: nextRole,
            isAppEntry: true,
            navDepth: navDepthRef.current
          },
          '',
          targetUrl
        );
      }
      if (!isDeveloperRoute(moduleKey)) {
        scrollNewPageToTop();
      }
    }
  };

  const openDetailPage = (payload) => {
    const prev = navStateRef.current;
    const mod = payload?.moduleKey || prev.activeModule || 'OVERVIEW';
    const rawType = String(payload?.detailType || 'VIEW_DETAILS').toUpperCase();
    const dTypeMap = {
      DETAILS: 'VIEW_DETAILS',
      PROFILE: 'VIEW_PROFILE',
      RECORDS: 'VIEW_RECORDS',
      REPORTS: 'VIEW_REPORTS',
      TRANSACTIONS: 'VIEW_TRANSACTIONS',
      HISTORY: 'VIEW_HISTORY',
      NOTIFICATIONS: 'VIEW_NOTIFICATIONS',
      APPLICATIONS: 'VIEW_APPLICATIONS',
      HOSPITAL_INFORMATION: 'VIEW_HOSPITAL_INFORMATION',
      SYSTEM_INFORMATION: 'VIEW_SYSTEM_INFORMATION'
    };
    const dType = dTypeMap[rawType] || (rawType.startsWith('VIEW_') ? rawType : `VIEW_${rawType}`);
    const recData = payload?.recordData !== undefined ? payload.recordData : payload?.payload;
    const recId =
      payload?.recordId ||
      (recData && !Array.isArray(recData) && (recData.id || recData.mrn || recData.patientNumber || recData.code)) ||
      'summary';

    if (!isDeveloperRoute(prev.activeModule)) {
      persistOutgoingPageSnapshot();
    }

    const detailObj = {
      ...payload,
      moduleKey: mod,
      detailType: dType,
      recordId: String(recId),
      recordData: recData
    };

    const nextNavKey = generateNavKey(`detail-${dType.toLowerCase()}`);
    currentNavKeyRef.current = nextNavKey;
    navDepthRef.current += 1;
    roleNavDepthRef.current[prev.currentRole] = (roleNavDepthRef.current[prev.currentRole] || 0) + 1;

    setActiveDetail(detailObj);

    if (typeof window !== 'undefined') {
      const targetUrl = `/module/${encodeURIComponent(mod)}/detail/${encodeURIComponent(dType)}/${encodeURIComponent(recId)}`;
      window.history.pushState(
        {
          navKey: nextNavKey,
          moduleKey: mod,
          detail: detailObj,
          role: prev.currentRole,
          isAppEntry: true,
          navDepth: navDepthRef.current
        },
        '',
        targetUrl
      );
      if (!isDeveloperRoute(mod)) {
        scrollNewPageToTop();
      }
    }
  };

  const handleNavigateBack = () => {
    const cur = navStateRef.current;
    // Consistent with browser history when prior in-app history exists
    if (typeof window !== 'undefined' && navDepthRef.current > 0) {
      window.history.back();
      return;
    }

    // Safe fallback when a page was opened directly via URL with no prior in-app history
    if (cur.activeDetail) {
      const fallbackMod = cur.activeDetail.moduleKey || getDefaultModuleForRole(cur.currentRole) || 'OVERVIEW';
      setActiveDetail(null);
      setActiveModuleState(fallbackMod);
      if (typeof window !== 'undefined') {
        const targetUrl = fallbackMod === 'OVERVIEW' ? '/' : `/module/${encodeURIComponent(fallbackMod)}`;
        const fallbackKey = generateNavKey('fallback');
        currentNavKeyRef.current = fallbackKey;
        window.history.replaceState(
          { navKey: fallbackKey, moduleKey: fallbackMod, detail: null, role: cur.currentRole, isAppEntry: true, navDepth: 0 },
          '',
          targetUrl
        );
      }
      return;
    }

    const roleHome = getDefaultModuleForRole(cur.currentRole);
    const fallbackTarget = cur.activeModule === roleHome ? 'OVERVIEW' : roleHome;
    setActiveModule(fallbackTarget);
  };

  const handleBackFromDetail = handleNavigateBack;

  const openMembershipCardWithFetcher = async (fetcher) => {
    setMembershipCardState({
      isOpen: true,
      cardData: null,
      loading: true,
      error: null,
      retryFn: () => openMembershipCardWithFetcher(fetcher),
    });
    try {
      const res = await fetcher();
      const cardObj = res?.card || res;
      if (!cardObj || !(cardObj.cardSerial || cardObj.cardNumber)) {
        throw new Error('Membership ID card payload was incomplete.');
      }
      setMembershipCardState({
        isOpen: true,
        cardData: cardObj,
        loading: false,
        error: null,
        retryFn: () => openMembershipCardWithFetcher(fetcher),
      });
    } catch (err) {
      setMembershipCardState({
        isOpen: true,
        cardData: null,
        loading: false,
        error: err?.message || 'Unable to generate Hospital Membership ID Card. Please ensure you are signed in with an accepted account.',
        retryFn: () => openMembershipCardWithFetcher(fetcher),
      });
    }
  };

  const openPatientMembershipCard = (patientId) => {
    if (!patientId) return;
    openMembershipCardWithFetcher(() => api.getPatientMembershipCard(patientId));
  };

  const openUserMembershipCard = (userId) => {
    if (!userId) return;
    openMembershipCardWithFetcher(() => api.getUserMembershipCard(userId));
  };

  const openMyMembershipCard = () => {
    openMembershipCardWithFetcher(() => api.getMyMembershipCard());
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    initManualScrollRestoration();
    window.gbsNavigateDetail = openDetailPage;
    window.gbsOpenPatientMembershipCard = openPatientMembershipCard;
    window.gbsOpenUserMembershipCard = openUserMembershipCard;
    window.gbsOpenMyMembershipCard = openMyMembershipCard;

    // Stamp the initial entry with a navKey without altering URL or creating duplicate history
    const initState = window.history.state;
    if (!initState || !initState.navKey) {
      const parsed = parseUrlRoute(window.location.pathname);
      window.history.replaceState(
        {
          navKey: currentNavKeyRef.current,
          moduleKey: parsed.moduleKey,
          detail: parsed.detail,
          role: navStateRef.current.currentRole,
          isAppEntry: true,
          navDepth: 0
        },
        '',
        window.location.pathname + window.location.search
      );
    } else {
      currentNavKeyRef.current = initState.navKey;
      navDepthRef.current = Number(initState.navDepth || 0);
    }

    const onPopState = (event) => {
      const leaving = navStateRef.current;
      // Save leaving page's scroll snapshot so Browser Forward restores its exact position too
      if (!isDeveloperRoute(leaving.activeModule) && currentNavKeyRef.current) {
        const leavingSnap = captureScrollSnapshot({
          subsystemCategory: leaving.subsystemCategory,
          overviewStaffCategory: leaving.overviewStaffCategory,
          overviewModuleCategory: leaving.overviewModuleCategory,
          role: leaving.currentRole
        });
        saveScrollSnapshot(currentNavKeyRef.current, leavingSnap);
        const leavingPath = leaving.activeDetail
          ? `/module/${encodeURIComponent(leaving.activeDetail.moduleKey || leaving.activeModule)}/detail/${encodeURIComponent(leaving.activeDetail.detailType)}/${encodeURIComponent(leaving.activeDetail.recordId)}`
          : (leaving.activeModule === 'OVERVIEW' ? '/' : `/module/${encodeURIComponent(leaving.activeModule)}`);
        saveRouteFallbackSnapshot(leavingPath, leavingSnap);
      }

      const st = event.state;
      const parsed = parseUrlRoute(window.location.pathname);
      const targetMod = (st && st.moduleKey) ? normalizeValidModuleKey(st.moduleKey) : parsed.moduleKey;
      const targetDetail = (st && st.detail !== undefined) ? st.detail : parsed.detail;
      const targetKey = (st && st.navKey) ? st.navKey : generateNavKey('pop');

      currentNavKeyRef.current = targetKey;
      navDepthRef.current = st && typeof st.navDepth === 'number'
        ? Math.max(0, st.navDepth)
        : Math.max(0, navDepthRef.current - 1);

      setActiveModuleState(targetMod);
      setActiveDetail(targetDetail || null);

      // Exclude Developer Dashboard from scroll/context restoration overrides
      if (!isDeveloperRoute(targetMod)) {
        const savedSnap = loadScrollSnapshot(targetKey) || loadRouteFallbackSnapshot(window.location.pathname || '/');
        const restoredRole = st?.role || savedSnap?.context?.role;
        const activeUser = leaving.currentUser;
        const canRestoreRole =
          !activeUser ||
          ['ADMINISTRATOR', 'HOSPITAL_DIRECTOR', 'DEVELOPER'].includes(activeUser.role) ||
          activeUser.role === restoredRole;
        if (restoredRole && restoredRole !== 'DEVELOPER' && restoredRole !== leaving.currentRole && canRestoreRole) {
          setCurrentRole(restoredRole);
          try {
            localStorage.setItem('gbs_role', restoredRole);
          } catch (_e) { }
        }
        if (savedSnap) {
          if (savedSnap.context?.subsystemCategory) setSubsystemCategory(savedSnap.context.subsystemCategory);
          if (savedSnap.context?.overviewStaffCategory) setOverviewStaffCategory(savedSnap.context.overviewStaffCategory);
          if (savedSnap.context?.overviewModuleCategory) setOverviewModuleCategory(savedSnap.context.overviewModuleCategory);
          restoreScrollSnapshot(savedSnap);
        }
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (_e) { }
    localStorage.removeItem('gbs_token');
    localStorage.removeItem('gbs_user');
    localStorage.removeItem('gbs_role');
    sessionStorage.removeItem('gbs_dev_mfa_verified');
    sessionStorage.removeItem('gbs_dev_device_fp');
    setCurrentUser(null);
    setDemoQuota(null);
    setIsDeveloperMfaVerified(false);
    setCurrentRole('ADMINISTRATOR');
    if (activeModule === 'DEVELOPER_NOC' || activeModule === 'DEVELOPER_PORTAL' || activeModule === 'MIGRATION') {
      setActiveModule('OVERVIEW');
    }
    loadGlobalOverview();
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
        setActiveModule('LABORATORY');
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

  const handleSelectRole = async (r) => {
    // Hidden Developer Control Center is strictly isolated to /developer-portal with MFA
    if (r === 'DEVELOPER') {
      if (!isDeveloperAuthenticated) {
        return;
      }
      setCurrentRole('DEVELOPER');
      setActiveModule('DEVELOPER_NOC');
      return;
    }

    // Require real authentication before switching into a role portal
    const isExecutive = Boolean(
      currentUser && ['ADMINISTRATOR', 'HOSPITAL_DIRECTOR', 'DEVELOPER'].includes(currentUser.role)
    );
    if (!currentUser || (!isExecutive && currentUser.role !== r)) {
      setLoginModalRole(r);
      setIsLoginOpen(true);
      return;
    }

    if (typeof window !== 'undefined') localStorage.setItem('gbs_role', r);
    setCurrentRole(r);

    const targetMod = getDefaultModuleForRole(r);
    if (typeof window !== 'undefined' && typeof window.gbsBrainNotify === 'function') {
      window.gbsBrainNotify({
        type: 'info',
        method: 'ROLE',
        title: `Switched Workspace to ${r.replace(/_/g, ' ')}`,
        message: `Workspace opened for ${r.replace(/_/g, ' ').toLowerCase()}.`,
        role: r,
        module: targetMod,
      });
    }
    setActiveModule(targetMod, { role: r });
  };

  // Hidden Unlisted Developer Access Gate (/developer-portal)
  if (activeModule === 'DEVELOPER_PORTAL' && !isDeveloperAuthenticated) {
    return (
      <DeveloperPortalGate
        onDeveloperAuthenticated={(devUser) => {
          setCurrentUser(devUser);
          setCurrentRole('DEVELOPER');
          setIsDeveloperMfaVerified(true);
          setActiveModule('DEVELOPER_NOC');
          loadGlobalOverview();
        }}
        onExitPortal={() => setActiveModule('OVERVIEW')}
      />
    );
  }

  // Global Real-Time Voice/Video Calling & Incoming Ring Listener (SSE + Polling Fallback)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.gbsOpenLiveMediaRoom = (mediaSession) => {
        if (mediaSession && (mediaSession.roomCode || mediaSession.meetingCode)) {
          setActiveMediaSession(mediaSession);
        }
      };
      window.gbsOpenCallCenter = () => setShowCallCenter(true);
    }

    if (!currentUser) {
      setIncomingCall(null);
      return undefined;
    }

    const checkIncoming = async () => {
      try {
        if (typeof document !== 'undefined' && document.hidden) return;
        const res = await api.getIncomingCalls();
        const list = Array.isArray(res?.incomingCalls) ? res.incomingCalls : [];
        if (list.length > 0) {
          setIncomingCall((prev) => {
            if (activeMediaSession && list[0].roomCode === activeMediaSession.roomCode) {
              return null;
            }
            if (prev && prev.roomCode === list[0].roomCode) return prev;
            return list[0];
          });
        } else {
          setIncomingCall((prev) => (prev && prev.eventType === 'CONFERENCE_INVITE' ? prev : null));
        }
      } catch (_ignore) { }
    };

    const onSseCallEvent = (ev) => {
      const detail = ev?.detail;
      if (!detail) return;
      if (detail.type === 'INCOMING_CALL' && detail.call) {
        if (!activeMediaSession || activeMediaSession.roomCode !== detail.call.roomCode) {
          setIncomingCall(detail.call);
        }
      } else if (detail.type === 'CONFERENCE_INVITE' && detail.call) {
        if (!activeMediaSession || activeMediaSession.roomCode !== detail.call.roomCode) {
          setIncomingCall({
            ...detail.call,
            eventType: 'CONFERENCE_INVITE',
            invitedBy: detail.invitedBy || null,
          });
        }
      } else if (['CALL_CANCELLED', 'CALL_DECLINED', 'CALL_ENDED'].includes(detail.type)) {
        const code = detail.call?.roomCode;
        setIncomingCall((prev) => (prev && (!code || prev.roomCode === code) ? null : prev));
      }
    };

    checkIncoming();
    const poll = setInterval(checkIncoming, 4500);
    window.addEventListener('gbs:call_event', onSseCallEvent);

    return () => {
      clearInterval(poll);
      window.removeEventListener('gbs:call_event', onSseCallEvent);
    };
  }, [currentUser, activeMediaSession]);

  const handleAcceptIncomingCall = async (callObj, chosenMode = 'VIDEO') => {
    if (!callObj?.roomCode) return;
    setAnsweringCall(true);
    try {
      const isConf = callObj.kind === 'CONFERENCE' || callObj.eventType === 'CONFERENCE_INVITE';
      const res = isConf
        ? await api.joinCommunicationRoom(callObj.roomCode, { callMode: chosenMode })
        : await api.acceptDirectCall(callObj.roomCode, { callMode: chosenMode });

      const roomRecord = res?.call || res?.room || callObj;
      setIncomingCall(null);
      setActiveMediaSession({
        ...roomRecord,
        ...(res?.webrtcSession || {}),
        roomCode: res?.webrtcSession?.roomCode || callObj.roomCode,
        callMode: chosenMode,
        kind: isConf ? 'CONFERENCE' : 'DIRECT_CALL',
        roomTitle: roomRecord.title || `Live Call ${callObj.roomCode}`,
      });
    } catch (err) {
      if (typeof window !== 'undefined' && typeof window.gbsBrainNotify === 'function') {
        window.gbsBrainNotify({
          type: 'error',
          method: 'CALL',
          title: 'Could Not Answer Call',
          message: err.message || 'The call may have already ended.',
          forceToast: true,
        });
      }
      setIncomingCall(null);
    } finally {
      setAnsweringCall(false);
    }
  };

  const handleDeclineIncomingCall = async (callObj) => {
    if (!callObj) return;
    setAnsweringCall(true);
    try {
      if (callObj.kind !== 'CONFERENCE' && callObj.eventType !== 'CONFERENCE_INVITE' && callObj.roomCode) {
        await api.declineDirectCall(callObj.roomCode, { reason: 'Declined by user.' }).catch(() => {});
      }
    } finally {
      setIncomingCall(null);
      setAnsweringCall(false);
    }
  };

  const activeBgSrc =
    activeModule === 'OVERVIEW'
      ? (ROLE_BACKGROUND_MAP[currentRole] || MODULE_BACKGROUND_MAP.OVERVIEW)
      : (MODULE_BACKGROUND_MAP[activeModule] || ROLE_BACKGROUND_MAP[currentRole] || MODULE_BACKGROUND_MAP.OVERVIEW);

  return (
    <div data-role={currentRole} style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      {/* Full-Page Real-Life Dashboard Background Layer */}
      <div className="dashboard-bg-stage" aria-hidden="true">
        <img
          key={activeBgSrc}
          src={activeBgSrc}
          alt={`${activeModule} Dashboard Background`}
          className="dashboard-bg-image"
        />
        <div className="dashboard-bg-scrim" />
      </div>

      {/* Blueprint Header */}
      <div style={{ position: 'relative', zIndex: 5 }}>
        <Header
          currentRole={currentRole}
          onSelectRole={handleSelectRole}
          onOpenLogin={(roleHint) => {
            setLoginModalRole(typeof roleHint === 'string' && roleHint ? roleHint : currentRole);
            setIsLoginOpen(true);
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenQuickAction={handleQuickAction}
          facilityBranding={facilityBranding}
          onUpdateFacilityBranding={setFacilityBranding}
          demoQuota={demoQuota}
          onOpenCallCenter={() => setShowCallCenter(true)}
          incomingCallsCount={incomingCall ? 1 : 0}
          onOpenMyIdCard={openMyMembershipCard}
        />
      </div>

      {/* Main Content Area */}
      <main data-scroll-container="main-workspace" style={{ position: 'relative', zIndex: 4, flex: 1, padding: '0 16px 68px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
        {/* Navigation Breadcrumb & Subsystem Category Switcher */}
        <div className="glass-panel" style={{ padding: '10px 14px', marginBottom: '12px', border: '1px solid var(--border-color)', background: 'rgba(8, 16, 32, 0.92)' }}>
          {/* Top Row: Subsystem Category Pills & Global Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px', borderBottom: '1px solid rgba(212,175,55,0.12)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '4px' }}>
                {t('nav.departments', 'Departments')}:
              </span>
              {Object.values(SUBSYSTEM_CATEGORIES).map((cat) => {
                const CatIcon = cat.icon;
                const isCatActive = subsystemCategory === cat.id;
                const count = cat.id === 'ALL'
                  ? SUBSYSTEM_MODULES.filter(m => !m.devOnly || isDeveloperAuthenticated).length
                  : SUBSYSTEM_MODULES.filter(m => (!m.devOnly || isDeveloperAuthenticated) && m.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSubsystemCategory(cat.id)}
                    className={isCatActive ? 'btn-gold' : 'btn-outline-gold'}
                    style={{
                      fontSize: '0.74rem',
                      padding: '4px 10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      borderRadius: '6px',
                      fontWeight: isCatActive ? 700 : 500
                    }}
                  >
                    <CatIcon size={12} />
                    <span>{t(`cat.${cat.id}`, cat.label)}</span>
                    <span style={{
                      fontSize: '0.64rem',
                      padding: '1px 5px',
                      borderRadius: '8px',
                      background: isCatActive ? 'rgba(0,0,0,0.35)' : 'rgba(212,175,55,0.15)',
                      fontWeight: 700
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Role, Operating Guide, Scroll & Environment Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              {(activeDetail || activeModule !== 'OVERVIEW') && !isDeveloperRoute(activeModule) && (
                <button
                  type="button"
                  onClick={handleNavigateBack}
                  className="btn-outline-gold"
                  style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                  aria-label="Return to previous screen"
                >
                  ← {t('nav.back', 'Back')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAllTabsModal(true)}
                className="btn-gold"
                style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                aria-label="Open full organized directory of all departments, sub-tabs, and staff portals"
              >
                <Layers size={13} /> {t('nav.allTabs', 'All Tabs & Menu')}
              </button>
              <button
                type="button"
                onClick={() => setShowOperatingGuide((prev) => !prev)}
                className="btn-outline-gold"
                style={{ padding: '3px 10px', fontSize: '0.74rem' }}
              >
                📖 {t('nav.quickGuide', 'Quick Guide')}
              </button>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="btn-outline-gold"
                style={{ padding: '3px 10px', fontSize: '0.74rem' }}
              >
                ↑ {t('nav.top', 'Top')}
              </button>
              <span>{t('nav.env', 'Env')}:</span>
              <span style={{ color: activeEnvironment === 'PRODUCTION' ? '#22c55e' : '#38bdf8', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', border: '1px solid currentColor' }}>
                {activeEnvironment}
              </span>
              <span>{t('nav.role', 'Role')}:</span>
              <span style={{ color: 'var(--gold-400)', fontWeight: 700, background: 'var(--gold-glow)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-gold)' }}>
                {t(`role.${currentRole}`, currentRole)}
              </span>
            </div>
          </div>

          {/* Bottom Row: Subsystem Module Tabs in Active Category */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setActiveModule('OVERVIEW')}
              className={activeModule === 'OVERVIEW' && !activeDetail ? 'btn-gold' : 'btn-outline-gold'}
              style={{
                fontSize: '0.78rem',
                padding: '5px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: activeModule === 'OVERVIEW' && !activeDetail ? 800 : 600,
                boxShadow: activeModule === 'OVERVIEW' && !activeDetail ? '0 0 10px rgba(212,175,55,0.4)' : 'none'
              }}
            >
              <Building2 size={13} /> {t('nav.homeOverview', 'Home Overview')}
            </button>

            {SUBSYSTEM_MODULES
              .filter(m => (!m.devOnly || isDeveloperAuthenticated) && (subsystemCategory === 'ALL' || m.category === subsystemCategory))
              .map((mod) => {
                const ModIcon = mod.icon;
                const isActive = activeModule === mod.key && !activeDetail;
                return (
                  <button
                    key={mod.key}
                    onClick={() => setActiveModule(mod.key)}
                    className={isActive ? 'btn-gold' : 'btn-outline-gold'}
                    style={{
                      fontSize: '0.76rem',
                      padding: '5px 11px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderColor: isActive ? 'var(--gold-400)' : mod.color,
                      fontWeight: isActive ? 800 : 500,
                      boxShadow: isActive ? '0 0 10px rgba(212,175,55,0.4)' : 'none'
                    }}
                  >
                    <ModIcon size={13} style={{ color: isActive ? '#000' : mod.color }} />
                    <span style={{ fontWeight: 700 }}>{mod.number}.</span>
                    <span>{t(`mod.${mod.key}`, mod.label)}</span>
                  </button>
                );
              })}
          </div>
        </div>

        {showOperatingGuide && (
          <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '14px', border: '1px solid var(--gold-400)', background: 'rgba(11, 23, 44, 0.96)', fontSize: '0.84rem', color: '#e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ color: 'var(--gold-400)', fontSize: '0.94rem' }}>
                How to Use GBS Hospital System ({currentRole.replace(/_/g, ' ')})
              </strong>
              <button type="button" onClick={() => setShowOperatingGuide(false)} className="btn-outline-gold" style={{ padding: '3px 10px', fontSize: '0.74rem' }}>
                Close Guide
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', color: 'var(--text-muted)' }}>
              <div>• <strong>Open Full Pages Anytime:</strong> Click any <em>Details, Profile, Records, Reports, or Summary Card</em> to open a full view, and click <strong>Back</strong> when finished.</div>
              <div>• <strong>Patient Care & Orders:</strong> Doctors and nurses can check in patients, record vital signs, save diagnosis notes, and send orders directly to Lab, Pharmacy, or Scans.</div>
              <div>• <strong>Wards, Medicine & Billing:</strong> Assign patients to open beds, hand out prescribed medicine safely, and record patient cash, card, Mobile Money, or insurance payments.</div>
              <div>• <strong>Right Access for Each Team:</strong> Sign in with your staff role so you see the exact tools built for your daily work safely.</div>
            </div>
          </div>
        )}

        {/* Quick Full-Page Links Bar */}
        <div
          className="glass-panel"
          style={{
            padding: '10px 16px',
            marginBottom: '16px',
            border: '1px solid var(--border-subtle)',
            background: 'rgba(12, 20, 36, 0.88)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('nav.quickFullPageRecords', 'Quick Full-Page Records')} ({t(`mod.${activeModule}`, activeModule.replace(/_/g, ' '))}):
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {t('nav.quickRecordsHint', 'Click any button below to view full details, payments, history, or alerts')}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '10px' }}>
            {DETAIL_PAGE_GROUPS.map((group, gIdx) => (
              <div
                key={gIdx}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: group.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {group.badge} • {group.cluster}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {group.commands.map((cmd) => {
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
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.72rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          flex: '1 1 auto',
                          justifyContent: 'center'
                        }}
                      >
                        <Icon size={12} /> {cmd.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dedicated Detail Page Renderer (When Any View Details / Profile / Records / etc. Command is Clicked) */}
        {activeDetail ? (
          <UniversalDetailPage
            detailState={activeDetail}
            onBack={handleBackFromDetail}
            onNavigateDetail={openDetailPage}
            currentRole={currentRole}
            facilityBranding={facilityBranding}
            currentUser={currentUser}
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
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 20%, rgba(6,12,24,0.45) 80%, rgba(6,12,24,0.2) 100%)' }} />

                  <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gold-300)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {t('overview.welcome', 'Welcome to')} {facilityBranding?.hospitalName || 'GBS Hospital'} • {activeCountry.flag} {activeCountry.name} ({activeCountry.currencyCode}) • {activeLanguage.nativeName}
                      </span>
                      <h2 className="header-3d" style={{ fontSize: '2rem', marginTop: '4px' }}>
                        {t('overview.heroTitle', 'Hospital Daily Workspace & Care Hub')}
                      </h2>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '680px' }}>
                        {t('overview.heroSubtitle', 'Everything your hospital team needs in one simple place — live patient numbers, bed status, medicine stock, lab results, and billing.')}
                      </p>
                    </div>

                    {/* Safety Status & Refresh */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button onClick={loadGlobalOverview} className="btn-outline-gold" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                        <RefreshCw size={14} /> {t('overview.refreshNumbers', 'Refresh Numbers')}
                      </button>
                      <div style={{ background: 'rgba(0,0,0,0.65)', padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border-gold)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Shield style={{ color: 'var(--status-online)', width: '22px', height: '22px' }} />
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--status-online)' }}>{t('overview.safetyAlwaysOn', 'Patient Safety Always On')}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{t('overview.emergency247', 'Emergency care stays open 24/7')} • {activeCountry.emergencyNumber}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div
                    onClick={() => openDetailPage({ detailType: 'VIEW_RECORDS', moduleKey: 'CLINICAL', recordId: 'opd-today', title: 'Patient Visits Today', recordData: { opdToday: globalStats.opdToday, totalConsultations: globalStats.totalConsultations, encountersToday: globalStats.opdEncountersToday } })}
                    className="glass-panel"
                    style={{ padding: '18px 20px', borderLeft: '4px solid var(--gold-400)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('overview.visitsToday', 'Patient Visits Today')}</span>
                      <Activity size={18} style={{ color: 'var(--gold-400)' }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
                      {(globalStats.opdToday ?? 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--status-online)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{globalStats.totalConsultations ?? 0} total doctor visits</span>
                      <span style={{ color: 'var(--gold-400)' }}>See List →</span>
                    </div>
                  </div>

                  <div
                    onClick={() => openDetailPage({ detailType: 'VIEW_RECORDS', moduleKey: 'WARDS', recordId: 'admissions-census', title: 'Patients Currently Admitted', recordData: { admissions: globalStats.admissions, occupiedBeds: globalStats.occupiedBeds, totalBeds: globalStats.totalBeds, bedOccupancyRate: globalStats.bedOccupancyRate } })}
                    className="glass-panel"
                    style={{ padding: '18px 20px', borderLeft: '4px solid var(--status-info)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('overview.admittedPatients', 'Admitted Patients')}</span>
                      <Bed size={18} style={{ color: 'var(--status-info)' }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
                      {(globalStats.admissions ?? 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{globalStats.occupiedBeds}/{globalStats.totalBeds} beds in use ({globalStats.bedOccupancyRate})</span>
                      <span style={{ color: 'var(--gold-400)' }}>See Beds →</span>
                    </div>
                  </div>

                  <div
                    onClick={() => openDetailPage({ detailType: 'VIEW_RECORDS', moduleKey: 'SURGERY', recordId: 'surgeries-scheduled', title: 'Scheduled Surgeries', recordData: { scheduledSurgeries: globalStats.surgeries, totalOperatingTheatres: globalStats.totalOperatingTheatres, inProgressSurgeries: globalStats.inProgressSurgeries } })}
                    className="glass-panel"
                    style={{ padding: '18px 20px', borderLeft: '4px solid var(--status-warning)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('overview.scheduledSurgeries', 'Scheduled Surgeries')}</span>
                      <Stethoscope size={18} style={{ color: 'var(--status-warning)' }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
                      {(globalStats.surgeries ?? 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{globalStats.totalOperatingTheatres ?? 0} rooms • {globalStats.inProgressSurgeries ?? 0} in progress</span>
                      <span style={{ color: 'var(--gold-400)' }}>See Schedule →</span>
                    </div>
                  </div>

                  <div
                    onClick={() => openDetailPage({ detailType: 'VIEW_RECORDS', moduleKey: 'WARDS', recordId: 'discharges-cleared', title: 'Discharged Patients', recordData: { dischargesCleared: globalStats.discharges, totalInvoices: globalStats.totalInvoices } })}
                    className="glass-panel"
                    style={{ padding: '18px 20px', borderLeft: '4px solid var(--status-online)', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('overview.patientsSentHome', 'Patients Sent Home')}</span>
                      <CheckCircle size={18} style={{ color: 'var(--status-online)' }} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
                      {(globalStats.discharges ?? 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--status-online)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Cleared by pharmacy & billing</span>
                      <span style={{ color: 'var(--gold-400)' }}>See List →</span>
                    </div>
                  </div>
                </div>

                {/* Recent Alerts & Activity Feed */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bell size={16} /> {t('overview.recentAlerts', 'Recent Alerts')} ({recentNotifications.length})
                      </h3>
                      <button
                        onClick={() => openDetailPage({ detailType: 'VIEW_NOTIFICATIONS', moduleKey: 'OVERVIEW', recordId: 'all' })}
                        className="btn-outline-gold"
                        style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                      >
                        {t('overview.allAlertsBtn', 'All Alerts')} →
                      </button>
                    </div>
                    {recentNotifications.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                        No new alerts right now.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {recentNotifications.slice(0, 4).map((n) => (
                          <div key={n.id} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#fff' }}>{n.title}</div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{n.message}</div>
                            </div>
                            <button
                              onClick={() => openDetailPage({ detailType: 'VIEW_DETAILS', moduleKey: 'NOTIFICATIONS', recordId: n.id, title: n.title, recordData: n })}
                              className="btn-outline-gold"
                              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                            >
                              Open
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <History size={16} /> {t('overview.recentActivity', 'Recent Activity Log')} ({recentAuditLogs.length})
                      </h3>
                      <button
                        onClick={() => openDetailPage({ detailType: 'VIEW_HISTORY', moduleKey: 'OVERVIEW', recordId: 'audit-trail' })}
                        className="btn-outline-gold"
                        style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                      >
                        {t('overview.fullActivityBtn', 'Full Activity')} →
                      </button>
                    </div>
                    {recentAuditLogs.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                        No recent activity recorded yet.
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
                      {t('overview.staffPortalsHeading', 'Hospital Staff & Specialist Portals')} ({ROLES.filter(r => r.id !== 'DEVELOPER' || isDeveloperAuthenticated).length} Authorized Roles)
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gold-400)' }}>
                      Click any role to open its dedicated real-life login page or launch its live workspace
                    </span>
                  </div>

                  {/* Role Category Filter Tabs */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {Object.values(ROLE_CATEGORIES).map((cat) => {
                      const isCatActive = overviewStaffCategory === cat.id;
                      const count = cat.id === 'ALL'
                        ? ROLES.filter(r => r.id !== 'DEVELOPER' || isDeveloperAuthenticated).length
                        : ROLES.filter(r => (r.id !== 'DEVELOPER' || isDeveloperAuthenticated) && (r.category === cat.id || (cat.id === 'OPERATIONS' && (r.category === 'OPERATIONS' || r.category === 'PATIENT')))).length;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setOverviewStaffCategory(cat.id)}
                          className={isCatActive ? 'btn-gold' : 'btn-outline-gold'}
                          style={{
                            fontSize: '0.76rem',
                            padding: '5px 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '6px',
                            fontWeight: isCatActive ? 700 : 500
                          }}
                        >
                          <span>{cat.label}</span>
                          <span style={{
                            fontSize: '0.66rem',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            background: isCatActive ? 'rgba(0,0,0,0.35)' : 'rgba(212,175,55,0.18)',
                            fontWeight: 700
                          }}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: '12px' }}>
                    {ROLES.filter((r) => {
                      if (r.id === 'DEVELOPER' && !isDeveloperAuthenticated) return false;
                      if (overviewStaffCategory === 'ALL') return true;
                      if (overviewStaffCategory === 'OPERATIONS') return r.category === 'OPERATIONS' || r.category === 'PATIENT';
                      return r.category === overviewStaffCategory;
                    }).map((r) => {
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
                          <div style={{ position: 'relative', height: '130px', overflow: 'hidden', background: '#060c18' }}>
                            <img
                              src={r.img}
                              alt={r.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                              onError={(e) => { e.target.src = '/assets/images/portrait_doctor.jpg'; }}
                            />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.95) 8%, rgba(6,12,24,0.15) 75%)' }} />
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
                                  setLoginModalRole(r.id);
                                  setIsLoginOpen(true);
                                }}
                                className="btn-gold"
                                style={{ flex: 1, padding: '5px 8px', fontSize: '0.7rem', justifyContent: 'center' }}
                              >
                                Login
                              </button>
                              <button
                                onClick={() => handleSelectRole(r.id)}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                      {t('overview.departmentsHeading', 'Hospital Departments & Services')}
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--gold-400)' }}>
                      {t('overview.clickAnyDepartment', 'Click any card to open that department')}
                    </span>
                  </div>

                  {/* Module Ecosystem Category Filter Tabs */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {Object.values(ECOSYSTEM_CATEGORIES).map((cat) => {
                      const isCatActive = overviewModuleCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setOverviewModuleCategory(cat.id)}
                          className={isCatActive ? 'btn-gold' : 'btn-outline-gold'}
                          style={{
                            fontSize: '0.76rem',
                            padding: '5px 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '6px',
                            fontWeight: isCatActive ? 700 : 500
                          }}
                        >
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    {[
                      { mod: 'PATIENTS', cat: 'CLINICAL', title: '1. Patients & Medical Folders', desc: 'Register new patients, search existing patient records, and track paper folders.', img: '/assets/images/patient_registration_archive_real.jpg', icon: Users, color: 'var(--gold-400)', border: 'var(--border-gold)' },
                      { mod: 'CLINICAL', cat: 'CLINICAL', title: '2. Doctor & Nurse Care', desc: 'Check in walk-in patients, record vital signs, and write doctor visit notes.', img: '/assets/images/doctor_consultation_real.jpg', icon: Activity, color: 'var(--status-info)', border: 'var(--border-gold)' },
                      { mod: 'PHARMACY', cat: 'CLINICAL', title: '3. Pharmacy & Medicine Stock', desc: 'Give out prescribed medicines safely, watch stock levels, and track expiry dates.', img: '/assets/images/pharmacy_dispensary_real.jpg', icon: Pill, color: 'var(--status-warning)', border: 'var(--border-gold)' },
                      { mod: 'LABORATORY', cat: 'ACUTE_DIAGNOSTICS', title: '4. Lab Tests & Results', desc: 'Order blood and lab tests, scan sample barcodes, and share test results.', img: '/assets/images/laboratory_pathology_real.jpg', icon: FlaskConical, color: 'var(--gold-400)', border: 'var(--border-gold)' },
                      { mod: 'WARDS', cat: 'CLINICAL', title: '5. Wards & Free Hospital Beds', desc: 'Check open beds, admit patients into rooms, move beds, and track nursing notes.', img: '/assets/images/inpatient_ward_bed_real.jpg', icon: Bed, color: 'var(--status-online)', border: 'var(--border-gold)' },
                      { mod: 'SURGERY', cat: 'CLINICAL', title: '6. Surgery & Operating Rooms', desc: 'Schedule operations, fill out surgical safety checks, and track recovery.', img: '/assets/images/operating_theatre_real.jpg', icon: Stethoscope, color: 'var(--gold-400)', border: 'var(--border-gold)' },
                      { mod: 'BILLING', cat: 'OPERATIONS', title: '7. Billing & Payment Methods', desc: 'Create patient bills, collect Cash, Card, Mobile Money & Bank Transfer receipts.', img: '/assets/images/nhia_claims_center_real.jpg', icon: CreditCard, color: 'var(--status-info)', border: 'var(--border-gold)' },
                      { mod: 'RADIOLOGY', cat: 'ACUTE_DIAGNOSTICS', title: '8. X-Rays, Scans & Radiology', desc: 'Order MRI, CT, and X-ray scans, index DICOM studies, and sign reports.', img: '/assets/images/radiology_pacs_mri_real.jpg', icon: Radio, color: 'var(--gold-300)', border: 'var(--border-gold)' },
                      { mod: 'DEVELOPER_NOC', cat: 'TECHNOLOGY', title: '9. System Control Center', desc: 'Monitor system health, manage facility accounts, permissions, error logs, and backups.', img: '/assets/images/developer_control_center_real.jpg', icon: Shield, color: '#fca5a5', border: '#ef4444' },
                      { mod: 'EMERGENCY', cat: 'ACUTE_DIAGNOSTICS', title: '10. Emergency & Ambulances', desc: 'Send ambulances quickly, assign emergency bays by urgency, and log urgent care.', img: '/assets/images/emergency_ambulance_fleet_real.jpg', icon: AlertTriangle, color: '#fca5a5', border: '#ef4444' },
                      { mod: 'BLOOD_BANK', cat: 'ACUTE_DIAGNOSTICS', title: '11. Blood Bank & Donors', desc: 'Track blood donors, manage cold blood bags, and match safe transfusions.', img: '/assets/images/blood_bank_transfusion_real.jpg', icon: FlaskConical, color: '#fca5a5', border: '#ef4444' },
                      { mod: 'MORTUARY', cat: 'ACUTE_DIAGNOSTICS', title: '12. Mortuary Services', desc: 'Manage cold storage spaces, post-mortem records, and approved family handovers.', img: '/assets/images/mortuary_cold_storage_real.jpg', icon: HardDrive, color: '#e4e4e7', border: '#a1a1aa' },
                      { mod: 'BIOMEDICAL', cat: 'ACUTE_DIAGNOSTICS', title: '13. Medical Equipment & Repairs', desc: 'Track hospital machines, schedule repair work orders, and record safety checks.', img: '/assets/images/biomedical_engineering_equipment_real.jpg', icon: Wrench, color: '#fcd34d', border: '#d97706' },
                      { mod: 'PROCUREMENT', cat: 'OPERATIONS', title: '14. Supplies & Purchasing', desc: 'Order medical supplies, check deliveries on arrival, and match supplier bills.', img: '/assets/images/procurement_supply_chain_real.jpg', icon: Package, color: 'var(--gold-300)', border: 'var(--border-gold)' },
                      { mod: 'HR', cat: 'OPERATIONS', title: '15. Staff, Shifts & Leave', desc: 'Check staff licenses, build duty schedules, track clock-ins, and review leave.', img: '/assets/images/hr_medical_staff_real.jpg', icon: Users, color: '#7dd3fc', border: 'var(--border-gold)' },
                      { mod: 'QUALITY', cat: 'OPERATIONS', title: '16. Safety & Quality Checks', desc: 'Report safety incidents, manage infection isolation, and record safety audits.', img: '/assets/images/quality_infection_control_real.jpg', icon: Shield, color: '#fbbf24', border: 'var(--border-gold)' },
                      { mod: 'NHIA_CLAIMS', cat: 'OPERATIONS', title: '17. NHIS Insurance Claims', desc: 'Check NHIS member cards, vet claims before sending, and track insurance payouts.', img: '/assets/images/nhia_claims_center_real.jpg', icon: CreditCard, color: '#86efac', border: '#22c55e' },
                      { mod: 'VOICE_AUTH', cat: 'TECHNOLOGY', title: '18. Voice & Fingerprint Lock', desc: 'Use quick voice or fingerprint checks for extra security on sensitive tasks.', img: '/assets/images/voice_biometric_security_real.jpg', icon: Mic, color: 'var(--gold-300)', border: 'var(--border-gold)' },
                      { mod: 'DENTAL', cat: 'CLINICAL', title: '19. Dental Clinic & Oral Surgery', desc: 'Interactive 32-tooth FDI odontogram, dental treatments, procedures, and oral surgery.', img: '/assets/images/dental_clinic_real.jpg', icon: Stethoscope, color: '#38bdf8', border: 'var(--border-gold)' },
                      { mod: 'EYE_CLINIC', cat: 'CLINICAL', title: '20. Eye Clinic & Ophthalmology', desc: 'Snellen vision testing (OD/OS), glaucoma IOP alerts, refraction Rx, and eye exams.', img: '/assets/images/ophthalmology_eye_clinic_real.jpg', icon: Eye, color: '#38bdf8', border: 'var(--border-gold)' },
                      { mod: 'ICU', cat: 'CLINICAL', title: '21. ICU & Live Vitals Monitoring', desc: 'Live critical care telemetry, NEWS2/MAP alerts, ventilator status, and vital trend analysis.', img: '/assets/images/inpatient_ward_bed_real.jpg', icon: Activity, color: '#ef4444', border: '#ef4444' },
                      { mod: 'AI_SAFETY', cat: 'TECHNOLOGY', title: '22. AI Clinical & Safety Guardrails', desc: 'Mandatory human-approved AI decision support, drug interaction alerts & allergy guardrails.', img: '/assets/images/quality_infection_control_real.jpg', icon: Shield, color: '#10b981', border: '#10b981' },
                      { mod: 'EXECUTIVE_BI', cat: 'OPERATIONS', title: '23. Executive BI & Admin Governance', desc: 'Hospital Director analytics, revenue KPIs, bed census & live staff account approvals.', img: '/assets/images/hospital_director_boardroom_real.jpg', icon: Building2, color: 'var(--gold-400)', border: 'var(--border-gold)' },
                      { mod: 'OPERATIONS_HUB', cat: 'OPERATIONS', title: '24. Online Meetings, Docs & Facility', desc: 'Clinical board video meetings, versioned document vault & housekeeping/utilities ops.', img: '/assets/images/hospital_admin_office_real.jpg', icon: FileText, color: '#38bdf8', border: 'var(--border-gold)' },
                      { mod: 'PATIENT_PORTAL', cat: 'CLINICAL', title: '25. Patient Self-Service Portal', desc: 'Personal patient visits, prescriptions, allergies, lab summaries & billing statements.', img: '/assets/images/hospital_hero_exterior.jpg', icon: User, color: '#10b981', border: '#10b981' },
                      { mod: 'TELEMEDICINE', cat: 'TECHNOLOGY', title: '26. Video Visits, Telehealth & GIS Maps', desc: 'WebRTC doctor-patient video consultations, hospital geofencing & interactive floor plans.', img: '/assets/images/telemedicine_command_center_real.jpg', icon: Video, color: '#06b6d4', border: '#06b6d4' }
                    ]
                      .filter((card) => {
                        if (card.mod === 'DEVELOPER_NOC' && !isDeveloperAuthenticated) return false;
                        if (overviewModuleCategory === 'ALL') return true;
                        return card.cat === overviewModuleCategory;
                      })
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
                            <div style={{ position: 'relative', height: '135px', overflow: 'hidden', background: '#060c18' }}>
                              <img
                                src={card.img}
                                alt={card.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = '/assets/images/hospital_hero_exterior.jpg'; }}
                              />
                              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 10%, rgba(6,12,24,0.25) 75%)' }} />
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
            {activeModule === 'TELEMEDICINE' && <TelemedicineGisView onNavigateDetail={openDetailPage} onOpenLiveMediaRoom={(sess) => setActiveMediaSession(sess)} />}
            {activeModule === 'DENTAL' && <DentalClinicView onNavigateDetail={openDetailPage} />}
            {activeModule === 'EYE_CLINIC' && <EyeClinicView onNavigateDetail={openDetailPage} />}
            {activeModule === 'ICU' && <IcuVitalsView onNavigateDetail={openDetailPage} />}
            {activeModule === 'AI_SAFETY' && <AiSafetyCenterView onNavigateDetail={openDetailPage} />}
            {activeModule === 'LABORATORY' && <LaboratoryView onNavigateDetail={openDetailPage} />}
            {activeModule === 'RADIOLOGY' && <RadiologyPacsView onNavigateDetail={openDetailPage} />}
            {activeModule === 'BILLING' && <BillingPaymentsView onNavigateDetail={openDetailPage} />}
            {activeModule === 'PATIENT_PORTAL' && <PatientPortalView onNavigateDetail={openDetailPage} />}
            {activeModule === 'EXECUTIVE_BI' && <ExecutiveAdminBiView currentRole={currentRole} onNavigateDetail={openDetailPage} />}
            {activeModule === 'OPERATIONS_HUB' && <OperationsSuiteView onNavigateDetail={openDetailPage} onOpenLiveMediaRoom={(sess) => setActiveMediaSession(sess)} />}
            {(activeModule === 'DEVELOPER_NOC' || activeModule === 'MIGRATION' || activeModule === 'DEVELOPER_PORTAL') && (
              isDeveloperAuthenticated ? (
                <DeveloperControlCenterView onNavigateDetail={openDetailPage} />
              ) : (
                <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', border: '1px solid #ef4444' }}>
                  <Shield size={36} style={{ color: '#ef4444', marginBottom: '12px' }} />
                  <h3 style={{ color: '#fff', marginBottom: '8px' }}>Restricted Area</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginBottom: '16px' }}>
                    This operational module is not available for standard hospital sessions.
                  </p>
                  <button type="button" onClick={() => setActiveModule('OVERVIEW')} className="btn-gold">
                    Return to Hospital Home
                  </button>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* Organized All Departments, Sub-Tabs & Portals Directory Modal */}
      <AllTabsNavigatorModal
        isOpen={showAllTabsModal}
        onClose={() => setShowAllTabsModal(false)}
        activeModule={activeModule}
        onSelectModule={(modKey) => {
          setSubsystemCategory('ALL');
          setActiveModule(modKey);
        }}
        roles={ROLES}
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        detailGroups={DETAIL_PAGE_GROUPS}
        onOpenDetail={openDetailPage}
        categories={SUBSYSTEM_CATEGORIES}
        modules={SUBSYSTEM_MODULES}
        isDeveloperAuthenticated={isDeveloperAuthenticated}
      />

      {/* Role Login Modal */}
      <RoleLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        initialRole={loginModalRole || currentRole}
        demoModeEnabled={demoModeEnabled}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setDemoQuota(user?.isDemoSession ? (user.demoQuota || { isDemoSession: true, entriesUsed: 0, maxEntries: 10, remaining: 10, limitReached: false }) : null);
          if (user.role) {
            setCurrentRole(user.role);
            if (typeof window !== 'undefined') localStorage.setItem('gbs_role', user.role);
            setActiveModule(getDefaultModuleForRole(user.role), { role: user.role });
          }
          if (typeof window !== 'undefined' && typeof window.gbsBrainNotify === 'function') {
            window.gbsBrainNotify({
              type: 'success',
              method: 'AUTH',
              title: `Welcome, ${user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}`,
              message: `Signed into your ${user.role} dashboard. Everything is ready.`,
              role: user.role || currentRole,
              module: getDefaultModuleForRole(user.role),
              forceToast: true,
            });
          }
          loadGlobalOverview();
        }}
      />

      {/* Footer Banner */}
      <footer style={{ position: 'relative', zIndex: 4, borderTop: '1px solid var(--border-color)', background: 'rgba(4, 8, 16, 0.95)', backdropFilter: 'blur(8px)', padding: '16px 20px 64px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--gold-light)', letterSpacing: '0.04em' }}>
        <div style={{ fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
          ONE SYSTEM - ONE TASK • SIMPLE FRONTEND - POWERFUL BACKEND • AUTOMATE & ELIMINATE MANUAL WORK • BUILD FOR SCALE - FROM DAY 1 • SECURE BY DESIGN
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
          © 2026 GBS HOSPITAL SYSTEM (Official Account: gabosei48@gmail.com • Render.com Cloud). All Rights Reserved. Production-Grade Connected Architecture.
        </div>
      </footer>

      {/* Blueprint System Locked / Subscription Expired Overlay (with Audited Emergency Bypass) */}
      <SubscriptionLockOverlay onNavigateModule={(mod) => setActiveModule(mod)} />

      {/* Family-Friendly All-Users Voice & Video Call Hub */}
      <CallCenterModal
        isOpen={showCallCenter}
        onClose={() => setShowCallCenter(false)}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenLiveRoom={(mediaSession) => setActiveMediaSession(mediaSession)}
      />

      {/* Official GBS Hospital Registration & Membership ID Card Modal */}
      <HospitalMembershipCardModal
        isOpen={membershipCardState.isOpen}
        cardData={membershipCardState.cardData}
        loading={membershipCardState.loading}
        error={membershipCardState.error}
        onClose={() => setMembershipCardState((prev) => ({ ...prev, isOpen: false }))}
        onRetry={membershipCardState.retryFn}
      />

      {/* Real-Time Incoming Voice/Video Call & Conference Invite Banner */}
      <IncomingCallBanner
        incomingCall={incomingCall}
        busy={answeringCall}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />

      {/* Full Multi-Camera Live WebRTC Video & Voice Room (Self-View + All Participants) */}
      {activeMediaSession && (
        <LiveMediaRoomModal
          session={activeMediaSession}
          currentUser={currentUser}
          onClose={() => setActiveMediaSession(null)}
          onSessionEnded={() => setActiveMediaSession(null)}
        />
      )}

      {/* Central GBS System Feedback Brain */}
      <SystemFeedbackBrain currentRole={currentRole} activeModule={activeModule} />
    </div>
  );
}
