/**
 * GBS Hospital Management System - Enterprise API Service
 * Central API Gateway connector pointing to /api/v1 (proxied to backend on port 5000)
 */

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('gbs_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
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
    throw err;
  }

  return (data && data.data !== undefined) ? data.data : data;
}

export const api = {
  // Health & Real-Time Global Overview Telemetry
  checkHealth: () => request('/health'),
  getGlobalOverviewStats: () => request('/health/overview-stats'),
  getEnvironmentInfo: () => request('/health/environment-info'),

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
  getUsers: (role) => request(`/users${role ? `?role=${role}` : ''}`),
  approveUser: (id) => request(`/users/${id}/approve`, { method: 'PATCH' }),

  // Developer & Tenant Control Center
  getDeveloperSummary: () => request('/tenants/console-summary'),
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
  updateTenantLifecycle: (id, payload) =>
    request(`/tenants/${id}/lifecycle`, {
      method: 'POST',
      body: JSON.stringify(payload),
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
  getLiveTenantLocations: () => request('/tenants/tracking/live-locations'),
  recordTenantLocationPing: (id, payload) =>
    request(`/tenants/${encodeURIComponent(id)}/location-ping`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  sendTenantMessage: (payload) =>
    request('/tenants/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getTenantMessages: (id) => request(`/tenants/${encodeURIComponent(id)}/messages`),
  initiateDeveloperVideoCall: (payload) =>
    request('/tenants/video-call/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Developer Environment & Database Backup / Restore Protection
  getDeveloperEnvironmentStatus: () => request('/tenants/developer/environment-status'),
  listDatabaseBackups: () => request('/tenants/developer/backups'),
  createDatabaseBackup: (payload = {}) =>
    request('/tenants/developer/backups/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyDatabaseBackup: (filename) =>
    request(`/tenants/developer/backups/${encodeURIComponent(filename)}/verify`, {
      method: 'POST',
    }),
  restoreDatabaseBackup: (filename) =>
    request(`/tenants/developer/backups/${encodeURIComponent(filename)}/restore`, {
      method: 'POST',
    }),
  purgeDevelopmentTestData: (payload = {}) =>
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
  getMortuaryStats: () => request('/mortuary/stats'),
  getMortuaryCatalogs: () => request('/mortuary/catalogs'),
  getMortuaryChambers: (q) => request('/mortuary/chambers' + (q ? `?${q}` : '')),
  createMortuaryChamber: (payload) =>
    request('/mortuary/chambers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCorpses: (q) => request('/mortuary/corpses' + (q ? `?${q}` : '')),
  registerCorpse: (payload) =>
    request('/mortuary/corpses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCorpseById: (id) => request(`/mortuary/corpses/${id}`),
  assignCorpseChamber: (id, payload) =>
    request(`/mortuary/corpses/${id}/assign-chamber`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  scheduleAutopsy: (payload) =>
    request('/mortuary/autopsies', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completeAutopsy: (id, payload) =>
    request(`/mortuary/autopsies/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCorpseReleases: (q) => request('/mortuary/releases' + (q ? `?${q}` : '')),
  releaseCorpse: (payload) =>
    request('/mortuary/releases', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Biomedical Engineering & Medical Equipment Maintenance (Phase 15)
  getBiomedicalStats: () => request('/biomedical/stats'),
  getBiomedicalCatalogs: () => request('/biomedical/catalogs'),
  getEquipmentList: (q) => request('/biomedical/equipment' + (q ? `?${q}` : '')),
  registerEquipment: (payload) =>
    request('/biomedical/equipment', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getEquipmentById: (id) => request(`/biomedical/equipment/${id}`),
  updateEquipmentStatus: (id, payload) =>
    request(`/biomedical/equipment/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  recordSafetyOverride: (id, payload) =>
    request(`/biomedical/equipment/${id}/safety-override`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getWorkOrders: (q) => request('/biomedical/work-orders' + (q ? `?${q}` : '')),
  createWorkOrder: (payload) =>
    request('/biomedical/work-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateWorkOrder: (id, payload) =>
    request(`/biomedical/work-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  completeWorkOrder: (id, payload) =>
    request(`/biomedical/work-orders/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  recordCalibration: (payload) =>
    request('/biomedical/calibrations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Supply Chain, Procurement & Vendor Contracts (Phase 16)
  getProcurementStats: () => request('/procurement/stats'),
  getProcurementCatalogs: () => request('/procurement/catalogs'),
  getVendors: (q) => request('/procurement/vendors' + (q ? `?${q}` : '')),
  registerVendor: (payload) =>
    request('/procurement/vendors', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getVendorById: (id) => request(`/procurement/vendors/${id}`),
  updateVendor: (id, payload) =>
    request(`/procurement/vendors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getVendorContracts: (q) => request('/procurement/contracts' + (q ? `?${q}` : '')),
  registerVendorContract: (payload) =>
    request('/procurement/contracts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPurchaseOrders: (q) => request('/procurement/purchase-orders' + (q ? `?${q}` : '')),
  createPurchaseOrder: (payload) =>
    request('/procurement/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPurchaseOrderById: (id) => request(`/procurement/purchase-orders/${id}`),
  updatePurchaseOrderStatus: (id, payload) =>
    request(`/procurement/purchase-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getGoodsReceiptNotes: (q) => request('/procurement/goods-receipt-notes' + (q ? `?${q}` : '')),
  createGoodsReceiptNote: (payload) =>
    request('/procurement/goods-receipt-notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getGoodsReceiptNoteById: (id) => request(`/procurement/goods-receipt-notes/${id}`),
  verifyThreeWayMatch: (id, payload) =>
    request(`/procurement/goods-receipt-notes/${id}/three-way-match`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completeGrnInspection: (id, payload) =>
    request(`/procurement/goods-receipt-notes/${id}/inspection`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Human Resources, Duty Rostering & Staff Credentialing (Phase 17)
  getHrStats: () => request('/hr/stats'),
  getHrCatalogs: () => request('/hr/catalogs'),
  getCredentials: (q) => request('/hr/credentials' + (q ? `?${q}` : '')),
  registerCredential: (payload) =>
    request('/hr/credentials', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyCredential: (id, payload) =>
    request(`/hr/credentials/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getDutyRosters: (q) => request('/hr/roster' + (q ? `?${q}` : '')),
  scheduleDutyShift: (payload) =>
    request('/hr/roster', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateRosterStatus: (id, payload) =>
    request(`/hr/roster/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getShiftHandovers: (q) => request('/hr/handovers' + (q ? `?${q}` : '')),
  recordShiftHandover: (payload) =>
    request('/hr/handovers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  coSignShiftHandover: (id, payload) =>
    request(`/hr/handovers/${id}/cosign`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getStaffAttendance: (q) => request('/hr/attendance' + (q ? `?${q}` : '')),
  clockInStaff: (payload) =>
    request('/hr/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  clockOutStaff: (id, payload) =>
    request(`/hr/attendance/${id}/clock-out`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getLeaveRequests: (q) => request('/hr/leave' + (q ? `?${q}` : '')),
  requestStaffLeave: (payload) =>
    request('/hr/leave', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adjudicateLeaveRequest: (id, payload) =>
    request(`/hr/leave/${id}/adjudicate`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Quality Assurance, Incident Reporting, IPC & Clinical Audits (Phase 18)
  getQualityStats: () => request('/quality/stats'),
  getQualityCatalogs: () => request('/quality/catalogs'),
  getClinicalIncidents: (q) => request('/quality/incidents' + (q ? `?${q}` : '')),
  reportClinicalIncident: (payload) =>
    request('/quality/incidents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  investigateIncident: (id, payload) =>
    request(`/quality/incidents/${id}/investigate`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  closeIncident: (id, payload) =>
    request(`/quality/incidents/${id}/close`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getIpcCases: (q) => request('/quality/infection-control' + (q ? `?${q}` : '')),
  registerIpcCase: (payload) =>
    request('/quality/infection-control', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  clearIpcCase: (id, payload) =>
    request(`/quality/infection-control/${id}/clear`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getClinicalAudits: (q) => request('/quality/audits' + (q ? `?${q}` : '')),
  createClinicalAudit: (payload) =>
    request('/quality/audits', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCapaPlans: (q) => request('/quality/capa' + (q ? `?${q}` : '')),
  createCapa: (payload) =>
    request('/quality/capa', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyCapa: (id, payload) =>
    request(`/quality/capa/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getSafetyAlerts: (q) => request('/quality/alerts' + (q ? `?${q}` : '')),
  broadcastSafetyAlert: (payload) =>
    request('/quality/alerts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  acknowledgeSafetyAlert: (id) =>
    request(`/quality/alerts/${id}/acknowledge`, {
      method: 'POST',
    }),

  // NHIA Claims Batches, E-Claims & Electronic Adjudication (Phase 19)
  getNhiaTelemetry: () => request('/nhia/telemetry'),
  getNhiaCatalogs: () => request('/nhia/catalogs'),
  getNhiaBatches: (q) => request('/nhia/batches' + (q ? `?${q}` : '')),
  getNhiaBatch: (id) => request(`/nhia/batches/${id}`),
  createNhiaBatch: (payload) =>
    request('/nhia/batches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getNhiaBatchClaims: (batchId, q) => request(`/nhia/batches/${batchId}/claims` + (q ? `?${q}` : '')),
  addNhiaClaim: (batchId, payload) =>
    request(`/nhia/batches/${batchId}/claims`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  vetNhiaBatch: (batchId) =>
    request(`/nhia/batches/${batchId}/vet`, {
      method: 'POST',
    }),
  getNhiaEClaimsPayload: (batchId) => request(`/nhia/batches/${batchId}/eclaims-payload`),
  submitNhiaBatch: (batchId) =>
    request(`/nhia/batches/${batchId}/submit`, {
      method: 'POST',
    }),
  adjudicateNhiaBatch: (batchId, payload) =>
    request(`/nhia/batches/${batchId}/adjudicate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  generateNhiaVoucher: (batchId, payload) =>
    request(`/nhia/batches/${batchId}/reconcile-voucher`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  appealNhiaClaim: (claimId, payload) =>
    request(`/nhia/claims/${claimId}/appeal`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  // NHIA Claims Batches, E-Claims & Electronic Adjudication (Phase 19)
  checkNhisEligibility: (nhisNumber) => request(`/nhia/eligibility/${nhisNumber}`),
  registerNhisMember: (payload) =>
    request('/nhia/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Migration Service Module & Data Import Hub (Phase 20)
  getMigrationCatalogs: () => request('/migration/catalogs'),
  getMigrationTelemetry: () => request('/migration/telemetry'),
  getMigrationJobs: (q) => request('/migration/jobs' + (q ? `?${q}` : '')),
  getMigrationJob: (jobId) => request(`/migration/jobs/${jobId}`),
  initializeMigrationJob: (payload) =>
    request('/migration/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  applyMigrationMapping: (jobId, payload) =>
    request(`/migration/jobs/${jobId}/mapping`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  approveMigrationJob: (jobId) =>
    request(`/migration/jobs/${jobId}/approve`, {
      method: 'POST',
    }),
  executeMigrationImport: (jobId, payload) =>
    request(`/migration/jobs/${jobId}/execute`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  rollbackMigrationJob: (jobId, payload) =>
    request(`/migration/jobs/${jobId}/rollback`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  getMigrationTemplates: (q) => request('/migration/templates' + (q ? `?${q}` : '')),
  saveMigrationTemplate: (payload) =>
    request('/migration/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // GIS Facility Tracking, Geofencing & Floor Plans (Phase 21)
  getGisTelemetry: () => request('/gis/telemetry'),
  getGeofences: (q) => request('/gis/geofences' + (q ? `?${q}` : '')),
  createGeofence: (payload) =>
    request('/gis/geofences', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  sendLocationPing: (payload) =>
    request('/gis/ping', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getGeofenceBreaches: (q) => request('/gis/breaches' + (q ? `?${q}` : '')),
  getFloorPlans: (q) => request('/gis/floor-plans' + (q ? `?${q}` : '')),
  getFloorPlan: (id) => request(`/gis/floor-plans/${id}`),
  createFloorPlan: (payload) =>
    request('/gis/floor-plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // WebRTC Video Telemedicine Subsystem (Phase 21)
  getTelemedicineTelemetry: () => request('/telemedicine/telemetry'),
  getTelemedicineConsultations: (q) => request('/telemedicine/consultations' + (q ? `?${q}` : '')),
  getTelemedicineConsultation: (idOrCode) => request(`/telemedicine/consultations/${idOrCode}`),
  scheduleTelemedicineConsultation: (payload) =>
    request('/telemedicine/consultations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  joinTelemedicineWaitingRoom: (sessionCode, payload) =>
    request(`/telemedicine/consultations/${sessionCode}/waiting-room`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  startTelemedicineCall: (sessionCode, payload) =>
    request(`/telemedicine/consultations/${sessionCode}/start`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  sendTelemedicineSignal: (sessionCode, payload) =>
    request(`/telemedicine/consultations/${sessionCode}/signal`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  endTelemedicineCall: (sessionCode, payload) =>
    request(`/telemedicine/consultations/${sessionCode}/end`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancelTelemedicineConsultation: (sessionCode, payload) =>
    request(`/telemedicine/consultations/${sessionCode}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  // Central Voice Authentication & Biometric Security Vault (Phase 22)
  getBiometricsTelemetry: () => request('/biometrics/telemetry'),
  getBiometricSecurityPolicy: () => request('/biometrics/policy'),
  updateBiometricSecurityPolicy: (payload) =>
    request('/biometrics/policy', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getBiometricLogs: (q) => request('/biometrics/logs' + (q ? `?${q}` : '')),
  getVoiceprintStatus: (userId) => request('/biometrics/voiceprint/status' + (userId ? `/${userId}` : '')),
  enrollVoiceprint: (payload) =>
    request('/biometrics/voiceprint/enroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyVoiceprint: (payload) =>
    request('/biometrics/voiceprint/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getBiometricCredentials: (userId) => request('/biometrics/credentials' + (userId ? `/${userId}` : '')),
  enrollBiometricCredential: (payload) =>
    request('/biometrics/credentials/enroll', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};


