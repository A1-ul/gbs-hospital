/**
 * GBS Hospital Management System - Enterprise API Service
 * Central API Gateway connector pointing to /api/v1 (proxied to backend on port 5000)
 */

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '/api/v1';

async function coreRequest(endpoint, options = {}) {
  const token = localStorage.getItem('gbs_token');
  const method = (options.method || 'GET').toUpperCase();
  const activeRole = localStorage.getItem('gbs_role') || 'ACTIVE_USER';
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    const err = new Error(
      `Unable to reach the GBS Hospital Backend API at ${API_BASE}${endpoint}. Ensure the PostgreSQL & Express backend server is running.`
    );
    err.cause = networkErr;
    if (typeof window !== 'undefined' && typeof window.gbsBrainNotify === 'function') {
      window.gbsBrainNotify({
        type: 'error',
        method,
        endpoint,
        title: `Network Error (${method})`,
        message: err.message,
        role: activeRole,
      });
    }
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      (data && data.error && typeof data.error === 'object' && data.error.message) ||
      (data && typeof data.error === 'string' && data.error) ||
      (data && data.message) ||
      `HTTP ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    if (typeof window !== 'undefined' && typeof window.gbsBrainNotify === 'function') {
      window.gbsBrainNotify({
        type: 'error',
        method,
        endpoint,
        status: response.status,
        title: `API Error (${response.status})`,
        message: `${endpoint}: ${errorMsg}`,
        role: activeRole,
      });
    }
    throw err;
  }

  const resolved = (data && data.data !== undefined) ? data.data : data;
  if (typeof window !== 'undefined' && typeof window.gbsBrainNotify === 'function' && method !== 'GET') {
    const serverMsg =
      (data && data.message) ||
      (resolved && resolved.message) ||
      `${method} ${endpoint} completed cleanly.`;
    window.gbsBrainNotify({
      type: 'success',
      method,
      endpoint,
      status: response.status,
      title: `Action Executed (${method})`,
      message: serverMsg,
      role: activeRole,
    });
  }

  return { raw: data, data: resolved };
}

async function request(endpoint, options = {}) {
  const { data } = await coreRequest(endpoint, options);
  return data;
}

async function requestEnvelope(endpoint, options = {}) {
  const { raw, data } = await coreRequest(endpoint, options);
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return {
      ...raw,
      success: raw.success !== undefined ? raw.success : true,
      data,
    };
  }
  return { success: true, data };
}

export const api = {
  // Health & Real-Time Global Overview Telemetry
  checkHealth: () => request('/health'),
  getGlobalOverviewStats: () => request('/health/overview-stats'),
  getEnvironmentInfo: () => request('/health/environment-info'),
  getFacilityBranding: () => request('/health/facility-branding'),
  updateFacilityBranding: (payload) =>
    request('/health/facility-branding', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  signup: (payload) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Users & Role Counts (DB-backed, compulsory Step 7)
  getCountsByRole: () => request('/users/counts-by-role'),
  getUserCountsByRole: () => request('/users/counts-by-role'),
  getUsers: (role) => request(`/users${role ? `?role=${role}` : ''}`),
  approveUser: (id) => request(`/users/${id}/approve`, { method: 'PATCH' }),

  // Developer & Tenant Control Center
  getDeveloperSummary: () => request('/tenants/console-summary'),
  getCountdownMatrix: () => request('/tenants/console-summary'),
  getTenants: (params = '') => request(`/tenants${params ? `?${params}` : ''}`),
  getTenantById: (id) => request(`/tenants/${id}`),
  registerTenant: (payload) =>
    request('/tenants/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  approveTenant: (id, payload = {}) =>
    request(`/tenants/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTenantLifecycle: (id, actionOrPayload, reason = '') =>
    request(`/tenants/${id}/lifecycle`, {
      method: 'POST',
      body: JSON.stringify(
        typeof actionOrPayload === 'string'
          ? { action: actionOrPayload, reason }
          : actionOrPayload
      ),
    }),
  lockTenant: (tenantId, reason) =>
    request(`/tenants/${encodeURIComponent(tenantId)}/lock`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  unlockTenant: (tenantId) =>
    request(`/tenants/${encodeURIComponent(tenantId)}/unlock`, {
      method: 'POST',
    }),
  extendTenantSubscription: (id, payload) =>
    request(`/tenants/${encodeURIComponent(id)}/extend`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  extendSubscription: (id, days = 30, plan = 'MONTHLY') =>
    request(`/tenants/${encodeURIComponent(id)}/extend`, {
      method: 'POST',
      body: JSON.stringify({ days, subscriptionPlan: plan, plan }),
    }),
  getLiveTenantLocations: () => request('/tenants/tracking/live-locations'),
  recordTenantLocationPing: (id, payload) =>
    request(`/tenants/${encodeURIComponent(id)}/location-ping`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  sendTenantMessage: (targetOrPayload, maybePayload) =>
    request('/tenants/messages', {
      method: 'POST',
      body: JSON.stringify(
        maybePayload
          ? { targetTenantId: targetOrPayload, ...maybePayload }
          : targetOrPayload
      ),
    }),
  getTenantMessages: (id) => request(`/tenants/${encodeURIComponent(id)}/messages`),
  initiateDeveloperVideoCall: (payload) =>
    request('/tenants/video-call/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  initiateVideoCall: (targetTenantId, payload = {}) =>
    request('/tenants/video-call/initiate', {
      method: 'POST',
      body: JSON.stringify({ targetTenantId, ...payload }),
    }),

  // Developer Environment & Database Backup / Restore Protection
  getDeveloperEnvironmentStatus: () => request('/tenants/developer/environment-status'),
  listDatabaseBackups: () => request('/tenants/developer/backups'),
  listDeveloperBackups: () => request('/tenants/developer/backups'),
  createDatabaseBackup: (payload = {}) =>
    request('/tenants/developer/backups/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createDeveloperBackup: (payload = {}) =>
    request('/tenants/developer/backups/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyDatabaseBackup: (filename) =>
    request(`/tenants/developer/backups/${encodeURIComponent(filename)}/verify`, {
      method: 'POST',
    }),
  verifyDeveloperBackup: (filename) =>
    request(`/tenants/developer/backups/${encodeURIComponent(filename)}/verify`, {
      method: 'POST',
    }),
  restoreDatabaseBackup: (filename) =>
    request(`/tenants/developer/backups/${encodeURIComponent(filename)}/restore`, {
      method: 'POST',
    }),
  restoreDeveloperBackup: (filename) =>
    request(`/tenants/developer/backups/${encodeURIComponent(filename)}/restore`, {
      method: 'POST',
    }),
  purgeDevelopmentTestData: (payload = {}) =>
    request('/tenants/developer/purge-test-data', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  purgeDeveloperTestData: (payload = {}) =>
    request('/tenants/developer/purge-test-data', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Patient Registration, MPI & Medical Records Archive
  searchMPI: (query = '') => request(`/patients/search?q=${encodeURIComponent(query)}`),
  getPatientById: (id) => request(`/patients/${encodeURIComponent(id)}`),
  getPatientDashboard: (id) => request(`/patients/${encodeURIComponent(id)}/dashboard`),
  registerPatient: (payload) =>
    request('/patients/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getFolderRetrieverDashboard: () => request('/medical-records/folders/retriever-dashboard'),
  getFolderRetrievalQueue: () => request('/medical-records/folders/retrieval-queue'),
  requestFolderRetrieval: (payload) =>
    request('/medical-records/folders/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  markFolderRetrieved: (requestId, payload = {}) =>
    request(`/medical-records/folders/requests/${encodeURIComponent(requestId)}/retrieve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  markFolderDelivered: (requestId, payload = {}) =>
    request(`/medical-records/folders/requests/${encodeURIComponent(requestId)}/deliver`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getFolderAuditTrail: (folderId) =>
    request(`/medical-records/folders/${encodeURIComponent(folderId)}/audit-trail`),

  // OPD & Clinical Nurse / Doctor
  getNurseStats: () => request('/clinical/nurse/dashboard'),
  getNurseTriageQueue: () => request('/clinical/triage/queue'),
  checkInPatient: (patientId, priority = 'ROUTINE', chiefComplaint = 'General OPD Consultation') =>
    request('/clinical/opd/check-in', {
      method: 'POST',
      body: JSON.stringify({ patientId, priority, chiefComplaint }),
    }),
  recordNurseVitals: (encounterId, payload) =>
    request(`/clinical/triage/${encodeURIComponent(encounterId)}/vitals`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getDoctorStats: () => request('/clinical/doctor/dashboard'),
  getDoctorQueue: () => request('/clinical/doctor/queue'),
  searchICD10: (q = '') => request(`/clinical/catalog/diagnoses?q=${encodeURIComponent(q)}`),
  recordConsultation: (encounterId, payload) =>
    request(`/clinical/encounters/${encodeURIComponent(encounterId)}/consultation`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPatientClinicalHistory: (patientId) =>
    request(`/clinical/patients/${encodeURIComponent(patientId)}/clinical-history`),

  // Admissions, Wards, Rooms & Bed Matrix
  getAdmissionsStats: () => request('/admissions/dashboard'),
  getWards: () => request('/admissions/wards'),
  createWard: (payload) =>
    request('/admissions/wards', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createRoom: (payload) =>
    request('/admissions/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createBed: (payload) =>
    request('/admissions/beds', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getWardBedMatrix: (wardId) => request(`/admissions/wards/${encodeURIComponent(wardId)}/bed-matrix`),
  getActiveAdmissions: () => request('/admissions/active'),
  admitPatient: (payload) =>
    request('/admissions/admit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  dischargePatient: (admissionId, payload = {}) =>
    request(`/admissions/${encodeURIComponent(admissionId)}/discharge`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAdmissionById: (id) => request(`/admissions/${encodeURIComponent(id)}`),

  // Pharmacy & Inventory
  getPharmacyStats: () => request('/pharmacy/dashboard/telemetry'),
  getPharmacyItems: (q = '') => request(`/pharmacy/items${q ? `?search=${encodeURIComponent(q)}` : ''}`),
  createPharmacyItem: (payload) =>
    request('/pharmacy/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  receivePharmacyBatch: (payload) =>
    request('/pharmacy/batches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPendingPrescriptions: () => request('/pharmacy/prescriptions/pending'),
  dispensePrescription: (prescriptionId, payload = {}) =>
    request(`/pharmacy/prescriptions/${encodeURIComponent(prescriptionId)}/dispense`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getDispenseHistory: () => request('/pharmacy/dispenses'),

  // Laboratory & Pathology
  getLabStats: () => request('/laboratory/dashboard/telemetry'),
  getLabRequests: (q = '') => request(`/laboratory/requests${q ? `?${q}` : ''}`),
  orderLabTest: (payload) =>
    request('/laboratory/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  collectLabSample: (requestId, payload = {}) =>
    request(`/laboratory/requests/${encodeURIComponent(requestId)}/collect-sample`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  enterLabResults: (requestId, payload) =>
    request(`/laboratory/requests/${encodeURIComponent(requestId)}/results`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Radiology & PACS
  getRadiologyStats: () => request('/radiology/telemetry'),
  getRadiologyOrders: (q = '') => request(`/radiology/orders${q ? `?${q}` : ''}`),
  orderRadiology: (payload) =>
    request('/radiology/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submitRadiologyReport: (orderId, payload) =>
    request(`/radiology/orders/${encodeURIComponent(orderId)}/report`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Billing & Finance
  getBillingStats: () => request('/billing/telemetry'),
  getBills: (q = '') => request(`/billing/bills${q ? `?${q}` : ''}`),
  createInvoice: (payload) =>
    request('/billing/bills', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  recordPayment: (invoiceId, payload) =>
    request(`/billing/bills/${encodeURIComponent(invoiceId)}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Surgery & Perioperative
  getSurgeryStats: () => request('/surgery/telemetry'),
  getOperatingTheatres: () => request('/surgery/theatres'),
  seedOperatingTheatres: () => request('/surgery/theatres/seed', { method: 'POST' }),
  getSurgicalCases: (q = '') => request(`/surgery/cases${q ? `?${q}` : ''}`),
  getSurgicalCaseById: (id) => request(`/surgery/cases/${encodeURIComponent(id)}`),
  bookSurgery: (payload) =>
    request('/surgery/cases', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSurgicalChecklist: (caseId, payload) =>
    request(`/surgery/cases/${encodeURIComponent(caseId)}/checklist`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  recordPacuRecovery: (caseId, payload) =>
    request(`/surgery/cases/${encodeURIComponent(caseId)}/pacu`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Emergency & Ambulance Fleet (Phase 12)
  getEmergencyStats: () => request('/emergency/stats'),
  getAmbulances: () => request('/emergency/ambulances'),
  registerAmbulance: (payload) =>
    request('/emergency/ambulances', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createEmergencyDispatch: (payload) =>
    request('/emergency/dispatches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getEmergencyCases: () => request('/emergency/cases'),
  registerEmergencyCase: (payload) =>
    request('/emergency/cases', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Blood Bank & Transfusion Services (Phase 13)
  getBloodBankStats: () => request('/blood-bank/stats'),
  getDonors: (q) => request('/blood-bank/donors' + (q ? `?${q}` : '')),
  registerDonor: (payload) =>
    request('/blood-bank/donors', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getBloodInventory: (q) => request('/blood-bank/units' + (q ? `?${q}` : '')),
  collectBloodUnit: (payload) =>
    request('/blood-bank/units', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getTransfusionRequests: (q) => request('/blood-bank/requests' + (q ? `?${q}` : '')),
  createTransfusionRequest: (payload) =>
    request('/blood-bank/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  performCrossMatch: (payload) =>
    request('/blood-bank/cross-match', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  startTransfusion: (payload) =>
    request('/blood-bank/transfusions/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completeTransfusion: (id, payload) =>
    request(`/blood-bank/transfusions/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  recordAdverseReaction: (id, payload) =>
    request(`/blood-bank/transfusions/${id}/adverse-reaction`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Mortuary Management, Cold Storage & Deceased Patient Release (Phase 14)
  getMortuaryStats: () => requestEnvelope('/mortuary/stats'),
  getMortuaryCatalogs: () => requestEnvelope('/mortuary/catalogs'),
  getMortuaryChambers: (q) => requestEnvelope('/mortuary/chambers' + (q ? `?${q}` : '')),
  createMortuaryChamber: (payload) =>
    requestEnvelope('/mortuary/chambers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCorpses: (q) => requestEnvelope('/mortuary/corpses' + (q ? `?${q}` : '')),
  registerCorpse: (payload) =>
    requestEnvelope('/mortuary/corpses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCorpseById: (id) => requestEnvelope(`/mortuary/corpses/${id}`),
  assignCorpseChamber: (id, payload) =>
    requestEnvelope(`/mortuary/corpses/${id}/assign-chamber`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  scheduleAutopsy: (payload) =>
    requestEnvelope('/mortuary/autopsies', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completeAutopsy: (id, payload) =>
    requestEnvelope(`/mortuary/autopsies/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCorpseReleases: (q) => requestEnvelope('/mortuary/releases' + (q ? `?${q}` : '')),
  releaseCorpse: (payload) =>
    requestEnvelope('/mortuary/releases', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Biomedical Engineering & Medical Equipment Maintenance (Phase 15)
  getBiomedicalStats: () => requestEnvelope('/biomedical/stats'),
  getBiomedicalCatalogs: () => requestEnvelope('/biomedical/catalogs'),
  getEquipmentList: (q) => requestEnvelope('/biomedical/equipment' + (q ? `?${q}` : '')),
  registerEquipment: (payload) =>
    requestEnvelope('/biomedical/equipment', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getEquipmentById: (id) => requestEnvelope(`/biomedical/equipment/${id}`),
  updateEquipmentStatus: (id, payload) =>
    requestEnvelope(`/biomedical/equipment/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  recordSafetyOverride: (id, payload) =>
    requestEnvelope(`/biomedical/equipment/${id}/safety-override`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getWorkOrders: (q) => requestEnvelope('/biomedical/work-orders' + (q ? `?${q}` : '')),
  createWorkOrder: (payload) =>
    requestEnvelope('/biomedical/work-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateWorkOrder: (id, payload) =>
    requestEnvelope(`/biomedical/work-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  completeWorkOrder: (id, payload) =>
    requestEnvelope(`/biomedical/work-orders/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  recordCalibration: (payload) =>
    requestEnvelope('/biomedical/calibrations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Supply Chain, Procurement & Vendor Contracts (Phase 16)
  getProcurementStats: () => requestEnvelope('/procurement/stats'),
  getProcurementCatalogs: () => requestEnvelope('/procurement/catalogs'),
  getVendors: (q) => requestEnvelope('/procurement/vendors' + (q ? `?${q}` : '')),
  registerVendor: (payload) =>
    requestEnvelope('/procurement/vendors', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getVendorById: (id) => requestEnvelope(`/procurement/vendors/${id}`),
  updateVendor: (id, payload) =>
    requestEnvelope(`/procurement/vendors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getVendorContracts: (q) => requestEnvelope('/procurement/contracts' + (q ? `?${q}` : '')),
  registerVendorContract: (payload) =>
    requestEnvelope('/procurement/contracts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPurchaseOrders: (q) => requestEnvelope('/procurement/purchase-orders' + (q ? `?${q}` : '')),
  createPurchaseOrder: (payload) =>
    requestEnvelope('/procurement/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPurchaseOrderById: (id) => requestEnvelope(`/procurement/purchase-orders/${id}`),
  updatePurchaseOrderStatus: (id, payload) =>
    requestEnvelope(`/procurement/purchase-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getGoodsReceiptNotes: (q) => requestEnvelope('/procurement/goods-receipt-notes' + (q ? `?${q}` : '')),
  createGoodsReceiptNote: (payload) =>
    requestEnvelope('/procurement/goods-receipt-notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getGoodsReceiptNoteById: (id) => requestEnvelope(`/procurement/goods-receipt-notes/${id}`),
  verifyThreeWayMatch: (id, payload) =>
    requestEnvelope(`/procurement/goods-receipt-notes/${id}/three-way-match`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completeGrnInspection: (id, payload) =>
    requestEnvelope(`/procurement/goods-receipt-notes/${id}/inspection`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Human Resources, Duty Rostering & Staff Credentialing (Phase 17)
  getHrStats: () => requestEnvelope('/hr/stats'),
  getHrCatalogs: () => requestEnvelope('/hr/catalogs'),
  getCredentials: (q) => requestEnvelope('/hr/credentials' + (q ? `?${q}` : '')),
  registerCredential: (payload) =>
    requestEnvelope('/hr/credentials', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyCredential: (id, payload) =>
    requestEnvelope(`/hr/credentials/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getDutyRosters: (q) => requestEnvelope('/hr/roster' + (q ? `?${q}` : '')),
  scheduleDutyShift: (payload) =>
    requestEnvelope('/hr/roster', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateRosterStatus: (id, payload) =>
    requestEnvelope(`/hr/roster/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getShiftHandovers: (q) => requestEnvelope('/hr/handovers' + (q ? `?${q}` : '')),
  recordShiftHandover: (payload) =>
    requestEnvelope('/hr/handovers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  coSignShiftHandover: (id, payload) =>
    requestEnvelope(`/hr/handovers/${id}/cosign`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getStaffAttendance: (q) => requestEnvelope('/hr/attendance' + (q ? `?${q}` : '')),
  clockInStaff: (payload) =>
    requestEnvelope('/hr/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  clockOutStaff: (id, payload) =>
    requestEnvelope(`/hr/attendance/${id}/clock-out`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getLeaveRequests: (q) => requestEnvelope('/hr/leave' + (q ? `?${q}` : '')),
  requestStaffLeave: (payload) =>
    requestEnvelope('/hr/leave', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adjudicateLeaveRequest: (id, payload) =>
    requestEnvelope(`/hr/leave/${id}/adjudicate`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Quality Assurance, Incident Reporting, IPC & Clinical Audits (Phase 18)
  getQualityStats: () => requestEnvelope('/quality/stats'),
  getQualityCatalogs: () => requestEnvelope('/quality/catalogs'),
  getClinicalIncidents: (q) => requestEnvelope('/quality/incidents' + (q ? `?${q}` : '')),
  reportClinicalIncident: (payload) =>
    requestEnvelope('/quality/incidents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  investigateIncident: (id, payload) =>
    requestEnvelope(`/quality/incidents/${id}/investigate`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  closeIncident: (id, payload) =>
    requestEnvelope(`/quality/incidents/${id}/close`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getIpcCases: (q) => requestEnvelope('/quality/infection-control' + (q ? `?${q}` : '')),
  registerIpcCase: (payload) =>
    requestEnvelope('/quality/infection-control', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  clearIpcCase: (id, payload) =>
    requestEnvelope(`/quality/infection-control/${id}/clear`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getClinicalAudits: (q) => requestEnvelope('/quality/audits' + (q ? `?${q}` : '')),
  createClinicalAudit: (payload) =>
    requestEnvelope('/quality/audits', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCapaPlans: (q) => requestEnvelope('/quality/capa' + (q ? `?${q}` : '')),
  createCapa: (payload) =>
    requestEnvelope('/quality/capa', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyCapa: (id, payload) =>
    requestEnvelope(`/quality/capa/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getSafetyAlerts: (q) => requestEnvelope('/quality/alerts' + (q ? `?${q}` : '')),
  broadcastSafetyAlert: (payload) =>
    requestEnvelope('/quality/alerts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  acknowledgeSafetyAlert: (id) =>
    requestEnvelope(`/quality/alerts/${id}/acknowledge`, {
      method: 'POST',
    }),

  // NHIA Claims Batches, E-Claims & Electronic Adjudication (Phase 19)
  getNhiaTelemetry: () => requestEnvelope('/nhia/telemetry'),
  getNhiaCatalogs: () => requestEnvelope('/nhia/catalogs'),
  getNhiaBatches: (q) => requestEnvelope('/nhia/batches' + (q ? `?${q}` : '')),
  getNhiaBatch: (id) => requestEnvelope(`/nhia/batches/${id}`),
  createNhiaBatch: (payload) =>
    requestEnvelope('/nhia/batches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getNhiaBatchClaims: (batchId, q) => requestEnvelope(`/nhia/batches/${batchId}/claims` + (q ? `?${q}` : '')),
  addNhiaClaim: (batchId, payload) =>
    requestEnvelope(`/nhia/batches/${batchId}/claims`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  vetNhiaBatch: (batchId) =>
    requestEnvelope(`/nhia/batches/${batchId}/vet`, {
      method: 'POST',
    }),
  getNhiaEClaimsPayload: (batchId) => requestEnvelope(`/nhia/batches/${batchId}/eclaims-payload`),
  submitNhiaBatch: (batchId) =>
    requestEnvelope(`/nhia/batches/${batchId}/submit`, {
      method: 'POST',
    }),
  adjudicateNhiaBatch: (batchId, payload) =>
    requestEnvelope(`/nhia/batches/${batchId}/adjudicate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  generateNhiaVoucher: (batchId, payload) =>
    requestEnvelope(`/nhia/batches/${batchId}/reconcile-voucher`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  appealNhiaClaim: (claimId, payload) =>
    requestEnvelope(`/nhia/claims/${claimId}/appeal`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  // NHIA Claims Batches, E-Claims & Electronic Adjudication (Phase 19)
  checkNhisEligibility: (nhisNumber) => requestEnvelope(`/nhia/eligibility/${nhisNumber}`),
  registerNhisMember: (payload) =>
    requestEnvelope('/nhia/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Migration Service Module & Data Import Hub (Phase 20)
  getMigrationCatalogs: () => requestEnvelope('/migration/catalogs'),
  getMigrationTelemetry: () => requestEnvelope('/migration/telemetry'),
  getMigrationJobs: (q) => requestEnvelope('/migration/jobs' + (q ? `?${q}` : '')),
  getMigrationJob: (jobId) => requestEnvelope(`/migration/jobs/${jobId}`),
  initializeMigrationJob: (payload) =>
    requestEnvelope('/migration/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  applyMigrationMapping: (jobId, payload) =>
    requestEnvelope(`/migration/jobs/${jobId}/mapping`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  approveMigrationJob: (jobId) =>
    requestEnvelope(`/migration/jobs/${jobId}/approve`, {
      method: 'POST',
    }),
  executeMigrationImport: (jobId, payload) =>
    requestEnvelope(`/migration/jobs/${jobId}/execute`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  rollbackMigrationJob: (jobId, payload) =>
    requestEnvelope(`/migration/jobs/${jobId}/rollback`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  getMigrationTemplates: (q) => requestEnvelope('/migration/templates' + (q ? `?${q}` : '')),
  saveMigrationTemplate: (payload) =>
    requestEnvelope('/migration/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // GIS Facility Tracking, Geofencing & Floor Plans (Phase 21)
  getGisTelemetry: () => requestEnvelope('/gis/telemetry'),
  getGeofences: (q) => requestEnvelope('/gis/geofences' + (q ? `?${q}` : '')),
  createGeofence: (payload) =>
    requestEnvelope('/gis/geofences', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  sendLocationPing: (payload) =>
    requestEnvelope('/gis/ping', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getGeofenceBreaches: (q) => requestEnvelope('/gis/breaches' + (q ? `?${q}` : '')),
  getFloorPlans: (q) => requestEnvelope('/gis/floor-plans' + (q ? `?${q}` : '')),
  getFloorPlan: (id) => requestEnvelope(`/gis/floor-plans/${id}`),
  createFloorPlan: (payload) =>
    requestEnvelope('/gis/floor-plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // WebRTC Video Telemedicine Subsystem (Phase 21)
  getTelemedicineTelemetry: () => requestEnvelope('/telemedicine/telemetry'),
  getTelemedicineConsultations: (q) => requestEnvelope('/telemedicine/consultations' + (q ? `?${q}` : '')),
  getTelemedicineConsultation: (idOrCode) => requestEnvelope(`/telemedicine/consultations/${idOrCode}`),
  scheduleTelemedicineConsultation: (payload) =>
    requestEnvelope('/telemedicine/consultations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  joinTelemedicineWaitingRoom: (sessionCode, payload) =>
    requestEnvelope(`/telemedicine/consultations/${sessionCode}/waiting-room`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  startTelemedicineCall: (sessionCode, payload) =>
    requestEnvelope(`/telemedicine/consultations/${sessionCode}/start`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  sendTelemedicineSignal: (sessionCode, payload) =>
    requestEnvelope(`/telemedicine/consultations/${sessionCode}/signal`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  endTelemedicineCall: (sessionCode, payload) =>
    requestEnvelope(`/telemedicine/consultations/${sessionCode}/end`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancelTelemedicineConsultation: (sessionCode, payload) =>
    requestEnvelope(`/telemedicine/consultations/${sessionCode}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  // Central Voice Authentication & Biometric Security Vault (Phase 22)
  getBiometricsTelemetry: () => requestEnvelope('/biometrics/telemetry'),
  getBiometricSecurityPolicy: () => requestEnvelope('/biometrics/policy'),
  updateBiometricSecurityPolicy: (payload) =>
    requestEnvelope('/biometrics/policy', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getBiometricLogs: (q) => requestEnvelope('/biometrics/logs' + (q ? `?${q}` : '')),
  getVoiceprintStatus: (userId) => requestEnvelope('/biometrics/voiceprint/status' + (userId ? `/${userId}` : '')),
  enrollVoiceprint: (payload) =>
    requestEnvelope('/biometrics/voiceprint/enroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyVoiceprint: (payload) =>
    requestEnvelope('/biometrics/voiceprint/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getBiometricCredentials: (userId) => requestEnvelope('/biometrics/credentials' + (userId ? `/${userId}` : '')),
  enrollBiometricCredential: (payload) =>
    requestEnvelope('/biometrics/credentials/enroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Direct Clinical, Admissions, HR & Annual Finance Helpers
  recordVitals: (payload) =>
    request('/clinical/vitals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createEncounter: (payload) =>
    request('/clinical/encounters', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  dispatchClinicalReport: (payload) =>
    request('/clinical/reports/dispatch', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createDutyReport: (payload) =>
    request('/clinical/reports/duty', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getClinicalReports: (category = 'ALL') =>
    request('/clinical/reports' + (category ? `?category=${encodeURIComponent(category)}` : '')),
  getBedMatrix: () => request('/admissions/bed-matrix'),
  extendAdmissionStay: (id, payload) =>
    request(`/admissions/${id}/extend-stay`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  decideLeaveRequest: (id, payload) =>
    request(`/hr/leave/${id}/adjudicate`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getHrStaff: (q) => request('/hr/staff' + (q ? `?${q}` : '')),
  createHrStaff: (payload) =>
    request('/hr/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getHrTransfers: () => request('/hr/transfers'),
  createHrTransfer: (payload) =>
    request('/hr/transfers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAnnualFinancialReport: (year) =>
    request('/billing/annual-report' + (year ? `?year=${encodeURIComponent(year)}` : '')),
  recordFinancialLedgerEntry: (payload) =>
    request('/billing/ledger-entries', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};


