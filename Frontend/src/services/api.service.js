/**
 * GBS Hospital Management System - Enterprise API Service
 * Central API Gateway connector pointing to /api/v1 (proxied to backend on port 5000)
 */

import { connectionManager } from './connection.manager.js';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '/api/v1';
const DEFAULT_REQUEST_TIMEOUT_MS = 25000;
const HEALTH_REQUEST_TIMEOUT_MS = 45000;

function getNowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export function getClientDeviceFingerprint() {
  if (typeof window === 'undefined') return 'server-context';
  try {
    const raw = [
      navigator.userAgent || '',
      navigator.language || '',
      String(window.screen?.width || 0),
      String(window.screen?.height || 0),
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    ].join('|');
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `gbs-dev-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  } catch (_e) {
    return 'gbs-browser-standard';
  }
}

const pendingSubmissionLocks = new Set();
const actionIdempotencyKeys = new Map();

export function getFriendlyHttpErrorTitle(status, code = '') {
  if (code === 'DEMO_TRIAL_LIMIT_REACHED') return 'Demo Trial Limit Reached (10/10)';
  switch (Number(status)) {
    case 400:
    case 422:
      return 'Please Check Your Input';
    case 401:
      return 'Sign In Required';
    case 402:
    case 423:
      return 'System Access Locked';
    case 403:
      return 'Permission Needed';
    case 404:
      return 'Record Not Found';
    case 405:
      return 'Action Not Supported';
    case 408:
    case 504:
      return 'Request Timed Out';
    case 409:
      return 'Duplicate or Conflicting Entry';
    case 413:
      return 'Payload Too Large';
    case 429:
      return 'Too Many Requests — Please Wait';
    case 501:
      return 'Feature Not Implemented';
    case 502:
    case 503:
      return 'Service Temporarily Unavailable';
    case 500:
      return 'System Error Reported';
    default:
      return 'Could Not Complete Action';
  }
}

function buildPayloadFingerprint(method, endpoint, body) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body || {});
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `${method}:${endpoint}:${hash >>> 0}`;
}

async function coreRequest(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('gbs_token') : null;
  const method = (options.method || 'GET').toUpperCase();
  const activeRole = (typeof window !== 'undefined' ? localStorage.getItem('gbs_role') : null) || 'GUEST';
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  let fingerprint = null;
  let idempotencyKey = options.idempotencyKey || null;
  if (isMutation && !options._retried) {
    fingerprint = buildPayloadFingerprint(method, endpoint, options.body);
    if (pendingSubmissionLocks.has(fingerprint)) {
      const dupErr = new Error('This operation is already being processed. Duplicate submission prevented.');
      dupErr.status = 409;
      dupErr.code = 'TRANSACTION_IN_PROGRESS';
      throw dupErr;
    }
    pendingSubmissionLocks.add(fingerprint);
    if (!idempotencyKey) {
      idempotencyKey = actionIdempotencyKeys.get(fingerprint);
      if (!idempotencyKey) {
        idempotencyKey = `gbs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        actionIdempotencyKeys.set(fingerprint, idempotencyKey);
      }
    }
  }

  const emergencyOverrideActive =
    typeof window !== 'undefined' && sessionStorage.getItem('gbs_emergency_override') === 'true';
  const emergencyOverrideReason =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('gbs_emergency_reason') || 'Active Patient Safety Clinical Emergency Bypass'
      : '';

  const activeLang = (typeof window !== 'undefined' ? localStorage.getItem('gbs_language') : null) || 'en';
  const activeCountry = (typeof window !== 'undefined' ? localStorage.getItem('gbs_country') : null) || 'GH';

  const headers = {
    'Content-Type': 'application/json',
    'Accept-Language': activeLang,
    'X-GBS-Country': activeCountry,
    'X-Device-Fingerprint': getClientDeviceFingerprint(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
    ...(emergencyOverrideActive
      ? {
        'X-Emergency-Override': 'true',
        'X-Emergency-Reason': emergencyOverrideReason,
      }
      : {}),
    ...options.headers,
  };

  const timeoutMs =
    Number(options.timeoutMs) > 0
      ? Number(options.timeoutMs)
      : (endpoint.startsWith('/health') ? HEALTH_REQUEST_TIMEOUT_MS : DEFAULT_REQUEST_TIMEOUT_MS);

  const {
    timeoutMs: _ignoredTimeout,
    silentError: _ignoredSilent,
    _retried: _ignoredRetried,
    idempotencyKey: _ignoredIdempotency,
    ...fetchOptions
  } = options;

  const controller = typeof AbortController !== 'undefined' && !fetchOptions.signal ? new AbortController() : null;
  let timeoutHandle = null;
  let timedOut = false;

  if (controller && timeoutMs > 0) {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      try {
        controller.abort();
      } catch (_abortErr) {
        // Ignore abort errors
      }
    }, timeoutMs);
  }

  const startedAt = getNowMs();
  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (networkErr) {
    if (fingerprint) pendingSubmissionLocks.delete(fingerprint);
    const elapsedMs = Math.max(0, Math.round(getNowMs() - startedAt));
    const isTimeout = timedOut || networkErr?.name === 'AbortError';
    const err = new Error(
      isTimeout
        ? `The hospital server took longer than ${Math.round(timeoutMs / 1000)}s to respond. Please retry in a moment.`
        : `Could not reach the hospital server. Please check your internet connection and try again.`
    );
    err.cause = networkErr;
    err.status = isTimeout ? 408 : 0;
    err.code = isTimeout ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR';

    connectionManager.recordApiResult({
      endpoint,
      method,
      status: isTimeout ? 408 : null,
      ok: false,
      latencyMs: elapsedMs,
      errorCode: err.code,
      errorMessage: err.message,
    });

    if (typeof window !== 'undefined' && typeof window.gbsBrainNotify === 'function' && !options.silentError) {
      window.gbsBrainNotify({
        type: 'error',
        method,
        endpoint,
        status: err.status,
        code: err.code,
        title: isTimeout ? 'Request Timed Out' : 'Connection Problem',
        message: err.message,
        role: activeRole,
      });
    }
    throw err;
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
    if (fingerprint) {
      pendingSubmissionLocks.delete(fingerprint);
    }
  }

  const elapsedMs = Math.max(0, Math.round(getNowMs() - startedAt));
  connectionManager.recordApiResult({
    endpoint,
    method,
    status: response.status,
    ok: response.ok,
    latencyMs: elapsedMs,
    errorCode: response.ok ? null : `HTTP_${response.status}`,
  });

  if (fingerprint && response.status < 500) {
    actionIdempotencyKeys.delete(fingerprint);
  }

  // Propagate real PostgreSQL-backed 10-entry Demo Trial quota headers immediately to UI
  if (typeof window !== 'undefined') {
    const demoModeHeader = response.headers.get('x-demo-mode');
    const demoUsedHeader = response.headers.get('x-demo-entries-used');
    const demoLimitHeader = response.headers.get('x-demo-entries-limit');
    const demoRemHeader = response.headers.get('x-demo-entries-remaining');
    if (demoModeHeader === 'true' && demoLimitHeader !== null) {
      const entriesUsed = Number(demoUsedHeader || 0);
      const maxEntries = Number(demoLimitHeader || 10);
      const remaining = Number(demoRemHeader ?? Math.max(0, maxEntries - entriesUsed));
      window.dispatchEvent(
        new CustomEvent('gbs:demo-quota-updated', {
          detail: {
            isDemoSession: true,
            entriesUsed,
            maxEntries,
            remaining,
            limitReached: entriesUsed >= maxEntries
          }
        })
      );
    }
  }

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (response.status === 204) {
    data = null;
  } else if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok || (data && typeof data === 'object' && data.success === false)) {
    const errorMsg =
      (data && data.message) ||
      (data && data.error && typeof data.error === 'object' && data.error.message) ||
      (data && typeof data.error === 'string' && data.error) ||
      `HTTP ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.code = (data && data.code) || (data && data.error && data.error.code) || 'INTERNAL_ERROR';
    err.errors = (data && data.errors) || [];
    err.requestId = (data && data.requestId) || null;
    err.data = data;

    if (
      response.status === 401 &&
      token &&
      !endpoint.startsWith('/auth/login') &&
      !endpoint.startsWith('/auth/developer/mfa-verify') &&
      typeof window !== 'undefined'
    ) {
      if (['SESSION_REVOKED', 'SESSION_EXPIRED', 'TOKEN_EXPIRED', 'INVALID_TOKEN', 'UNAUTHORIZED'].includes(err.code)) {
        localStorage.removeItem('gbs_token');
        localStorage.removeItem('gbs_user');
        sessionStorage.removeItem('gbs_dev_mfa_verified');
        window.dispatchEvent(new CustomEvent('gbs:session-expired', { detail: { code: err.code, message: errorMsg } }));
      }
    }

    if ((response.status === 423 || response.status === 402) && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('gbs:system-locked', {
          detail: {
            status: response.status,
            code: err.code,
            message: errorMsg,
            data: (data && data.data) || data || {},
          },
        })
      );
    }

    if (typeof window !== 'undefined' && typeof window.gbsBrainNotify === 'function' && !options.silentError) {
      window.gbsBrainNotify({
        type: 'error',
        method,
        endpoint,
        status: response.status,
        code: err.code,
        requestId: err.requestId,
        title: getFriendlyHttpErrorTitle(response.status, err.code),
        message: `${errorMsg}${err.requestId ? ` (Ref: ${err.requestId.slice(0, 8)})` : ''}`,
        role: activeRole,
      });
    }
    throw err;
  }

  const resolved = (data && typeof data === 'object' && data.data !== undefined && data.data !== null) ? data.data : data;
  if (typeof window !== 'undefined' && typeof window.gbsBrainNotify === 'function' && method !== 'GET') {
    const serverMsg =
      (data && data.message) ||
      (resolved && resolved.message) ||
      'Your changes were saved.';
    window.gbsBrainNotify({
      type: 'success',
      method,
      endpoint,
      status: response.status,
      code: data?.code || 'SUCCESS',
      requestId: data?.requestId || null,
      title: response.status === 202 ? 'Waiting for Approval' : 'Saved Successfully',
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
  // Health, Connection Diagnostics & Real-Time Global Overview Telemetry
  checkHealth: (timeoutMs = HEALTH_REQUEST_TIMEOUT_MS) =>
    request('/health', { timeoutMs, silentError: true }),
  getConnectionDiagnostics: () =>
    request('/health/connection-diagnostics', { silentError: true }),
  getGlobalOverviewStats: () => request('/health/overview-stats'),
  getEnvironmentInfo: () => request('/health/environment-info'),
  getFacilityBranding: () => request('/health/facility-branding'),
  updateFacilityBranding: (payload) =>
    request('/health/facility-branding', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Auth & Real Session Lifecycle
  login: (email, password, extra = {}) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...extra }),
    }),
  signup: (payload) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: () => request('/auth/me', { silentError: true }),
  logout: () => request('/auth/logout', { method: 'POST', silentError: true }),
  getSessions: () => request('/auth/sessions'),
  revokeSession: (sessionId) =>
    request(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (payload) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  startDemoSession: (role) =>
    request('/auth/demo-session', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
  getDemoQuota: () => request('/auth/demo-quota', { silentError: true }),
  requestDeveloperMfaChallenge: (deviceFingerprint) =>
    request('/auth/developer/mfa-challenge', {
      method: 'POST',
      body: JSON.stringify({ deviceFingerprint: deviceFingerprint || getClientDeviceFingerprint() }),
    }),
  verifyDeveloperMfaChallenge: (code, deviceFingerprint) =>
    request('/auth/developer/mfa-verify', {
      method: 'POST',
      body: JSON.stringify({ code, deviceFingerprint: deviceFingerprint || getClientDeviceFingerprint() }),
    }),

  // Users & Role Counts (DB-backed, compulsory Step 7)
  getCountsByRole: () => request('/users/counts-by-role'),
  getUserCountsByRole: () => request('/users/counts-by-role'),
  getUsers: (role) => request(`/users${role ? `?role=${encodeURIComponent(role)}` : ''}`),
  approveUser: (id) => request(`/users/${encodeURIComponent(id)}/approve`, { method: 'PATCH' }),
  setUserStatus: (id, active) =>
    request(`/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),

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
  getPatientMembershipCard: (id) => request(`/patients/${encodeURIComponent(id)}/membership-card`),
  getUserMembershipCard: (id) => request(`/users/${encodeURIComponent(id)}/membership-card`),
  getMyMembershipCard: () => request('/auth/me/membership-card'),
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
  searchICD10: (q = '') => requestEnvelope(`/clinical/catalog/diagnoses?query=${encodeURIComponent(q)}&q=${encodeURIComponent(q)}`),
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
      body: JSON.stringify({
        ...payload,
        name: payload.name || payload.brandName || payload.genericName || 'Hospital Medication',
      }),
    }),
  receivePharmacyBatch: (payload) =>
    request('/pharmacy/batches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPendingPrescriptions: () => request('/pharmacy/prescriptions/pending'),
  dispensePrescription: (prescriptionIdOrPayload, payload = {}) => {
    const isObj = prescriptionIdOrPayload && typeof prescriptionIdOrPayload === 'object';
    const rxId = isObj ? prescriptionIdOrPayload.prescriptionId || prescriptionIdOrPayload.id : prescriptionIdOrPayload;
    const bodyPayload = isObj ? prescriptionIdOrPayload : payload;
    return request(`/pharmacy/prescriptions/${encodeURIComponent(rxId)}/dispense`, {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
    });
  },
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
  getEmergencyDispatches: () => request('/emergency/dispatches'),
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
  getBedMatrix: () => requestEnvelope('/admissions/bed-matrix'),
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

  // GBS Central System Response, Control & Communication Engine (GBS-RCCE)
  getRcceCatalogue: () => request('/rcce/catalogue'),
  getRcceNotifications: (unreadOnly = false) =>
    request(`/rcce/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  markRcceNotificationRead: (id) =>
    request(`/rcce/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  markAllRcceNotificationsRead: () =>
    request('/rcce/notifications/mark-all-read', { method: 'POST' }),
  getRcceDeveloperOverview: () => request('/rcce/developer/overview'),
  getRcceUsersActivity: (includePrivate = false) =>
    request(`/rcce/developer/users-activity${includePrivate ? '?includePrivate=true' : ''}`),
  getRcceAuditLogs: (query = '') =>
    request(`/rcce/audit-logs${query ? `?${query}` : ''}`),
  getRcceEvents: (query = '') =>
    request(`/rcce/events${query ? `?${query}` : ''}`),
  getRcceErrorLogs: (query = '') =>
    request(`/rcce/errors${query ? `?${query}` : ''}`),
  resolveRcceError: (id, resolutionNote = '') =>
    request(`/rcce/errors/${encodeURIComponent(id)}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolutionNote }),
    }),
  getRccePermissions: () => request('/rcce/developer/permissions'),
  updateRcceRolePermission: (payload) =>
    request('/rcce/developer/permissions', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getRcceAccessGrants: () => request('/rcce/developer/access-grants'),
  requestRcceAccessGrant: (payload) =>
    request('/rcce/developer/access-grants/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  approveRcceAccessGrant: (id, durationMinutes = 60) =>
    request(`/rcce/developer/access-grants/${encodeURIComponent(id)}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ durationMinutes }),
    }),
  revokeRcceAccessGrant: (id) =>
    request(`/rcce/developer/access-grants/${encodeURIComponent(id)}/revoke`, {
      method: 'PATCH',
    }),
  getRcceConfigs: () => request('/rcce/developer/configs'),
  updateRcceConfig: (key, payload) =>
    request(`/rcce/developer/configs/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  toggleRcceMaintenanceMode: (enabled, message) =>
    request('/rcce/developer/maintenance', {
      method: 'POST',
      body: JSON.stringify({ enabled, message }),
    }),

  // Procedure 3 (Phase C): Dental Clinic, Eye Clinic, ICU & Live Vitals, Clinical Safety & AI Clinical Assistance
  getDentalTelemetry: () => request('/dental/telemetry'),
  getDentalRecords: (q = '') => request(`/dental/records${q ? `?${q}` : ''}`),
  createDentalRecord: (payload) =>
    request('/dental/records', { method: 'POST', body: JSON.stringify(payload) }),
  updateDentalRecord: (id, payload) =>
    request(`/dental/records/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getPatientOdontogram: (patientId) =>
    request(`/dental/patients/${encodeURIComponent(patientId)}/odontogram`),

  getEyeClinicTelemetry: () => request('/eye-clinic/telemetry'),
  getEyeClinicExams: (q = '') => request(`/eye-clinic/exams${q ? `?${q}` : ''}`),
  createEyeClinicExam: (payload) =>
    request('/eye-clinic/exams', { method: 'POST', body: JSON.stringify(payload) }),
  updateEyeClinicExam: (id, payload) =>
    request(`/eye-clinic/exams/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getPatientEyeHistory: (patientId) =>
    request(`/eye-clinic/patients/${encodeURIComponent(patientId)}/history`),

  getIcuTelemetry: () => request('/icu/telemetry'),
  getIcuMonitors: (q = '') => request(`/icu/monitors${q ? `?${q}` : ''}`),
  recordIcuVitals: (payload) =>
    request('/icu/monitors', { method: 'POST', body: JSON.stringify(payload) }),
  acknowledgeIcuAlert: (id, payload = {}) =>
    request(`/icu/monitors/${encodeURIComponent(id)}/acknowledge`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getIcuPatientTrends: (patientId) =>
    request(`/icu/patients/${encodeURIComponent(patientId)}/trends`),

  getSafetyGuardrailsStatus: () => request('/clinical-safety/guardrails-status'),
  getPatientAllergies: (patientId) =>
    request(`/clinical-safety/patients/${encodeURIComponent(patientId)}/allergies`),
  recordPatientAllergy: (patientId, payload) =>
    request(`/clinical-safety/patients/${encodeURIComponent(patientId)}/allergies`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  checkClinicalMedicationSafety: (payload) =>
    request('/clinical-safety/check', { method: 'POST', body: JSON.stringify(payload) }),
  getClinicalSafetyOverrides: (q = '') =>
    request(`/clinical-safety/overrides${q ? `?${q}` : ''}`),
  recordClinicalSafetyOverride: (payload) =>
    request('/clinical-safety/overrides', { method: 'POST', body: JSON.stringify(payload) }),

  getAiClinicalTelemetry: () => request('/ai-clinical/telemetry'),
  getAiClinicalSuggestions: (q = '') =>
    request(`/ai-clinical/suggestions${q ? `?${q}` : ''}`),
  analyzeAiClinical: (payload) =>
    request('/ai-clinical/analyze', { method: 'POST', body: JSON.stringify(payload) }),
  reviewAiClinicalSuggestion: (id, payload) =>
    request(`/ai-clinical/suggestions/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  finalizeAiClinicalSuggestion: (id, payload) =>
    request(`/ai-clinical/suggestions/${encodeURIComponent(id)}/final-decision`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Procedure 4 (Phase D): Standalone Lab/Rad/Patient Portal, Meetings, Documents & Facility Ops
  verifyLabResults: (requestId, payload = {}) =>
    request(`/laboratory/requests/${encodeURIComponent(requestId)}/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  acquireDicomStudy: (orderId, payload = {}) =>
    request(`/radiology/orders/${encodeURIComponent(orderId)}/acquire`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMyPatientDashboard: () => request('/patients/me/dashboard'),

  getMeetingTelemetry: () => request('/meetings/telemetry'),
  getMeetings: (q = '') => request(`/meetings${q ? `?${q}` : ''}`),
  scheduleMeeting: (payload) =>
    request('/meetings', { method: 'POST', body: JSON.stringify(payload) }),
  joinMeeting: (id) =>
    request(`/meetings/${encodeURIComponent(id)}/join`, { method: 'POST' }),
  endMeeting: (id, payload = {}) =>
    request(`/meetings/${encodeURIComponent(id)}/end`, { method: 'POST', body: JSON.stringify(payload) }),

  getDocumentTelemetry: () => request('/documents/telemetry'),
  getDocuments: (q = '') => request(`/documents${q ? `?${q}` : ''}`),
  createDocument: (payload) =>
    request('/documents', { method: 'POST', body: JSON.stringify(payload) }),
  createDocumentVersion: (id, payload = {}) =>
    request(`/documents/${encodeURIComponent(id)}/new-version`, { method: 'POST', body: JSON.stringify(payload) }),
  deliverDocument: (id, payload) =>
    request(`/documents/${encodeURIComponent(id)}/deliver`, { method: 'POST', body: JSON.stringify(payload) }),
  archiveDocument: (id) =>
    request(`/documents/${encodeURIComponent(id)}/archive`, { method: 'PATCH' }),
  restoreDocument: (id) =>
    request(`/documents/${encodeURIComponent(id)}/restore`, { method: 'POST' }),

  getFacilityTelemetry: () => request('/facility/telemetry'),
  getFacilityTasks: (q = '') => request(`/facility/tasks${q ? `?${q}` : ''}`),
  createFacilityTask: (payload) =>
    request('/facility/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateFacilityTaskStatus: (id, payload) =>
    request(`/facility/tasks/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Procedure 5 (Phase E): 4-Step Facial Security, Automated Trial Sweep, Truthful Adapters & AI Dev Diagnostics
  enrollFaceBiometric: (payload) =>
    request('/biometrics/face/enroll', { method: 'POST', body: JSON.stringify(payload) }),
  verifyFaceBiometric: (payload) =>
    request('/biometrics/face/verify', { method: 'POST', body: JSON.stringify(payload) }),
  getFaceBiometricStatus: (userId) =>
    request(userId ? `/biometrics/face/status/${encodeURIComponent(userId)}` : '/biometrics/face/status'),
  runDeveloperTrialSweep: () =>
    request('/rcce/developer/trial-sweep', { method: 'POST' }),
  getDeveloperIntegrationsStatus: () =>
    request('/rcce/developer/integrations-status'),
  getAiDeveloperDiagnostics: () =>
    request('/rcce/developer/ai-assistant/diagnostics'),
  getDeveloperTenantAnalytics: () =>
    request('/rcce/developer/tenant-analytics'),

  // Step 35: Developer Remote System Management & Infrastructure Ops
  getDeveloperClusterHealth: () =>
    request('/rcce/developer/remote/cluster-health'),
  getDeveloperDeployments: () =>
    request('/rcce/developer/remote/deployments'),
  recordDeveloperDeployment: (payload) =>
    request('/rcce/developer/remote/deployments', { method: 'POST', body: JSON.stringify(payload) }),
  clearDeveloperCaches: () =>
    request('/rcce/developer/remote/cache/clear', { method: 'POST' }),
  optimizeDeveloperDatabase: () =>
    request('/rcce/developer/remote/database/optimize', { method: 'POST' }),
  rotateDeveloperLogs: () =>
    request('/rcce/developer/remote/logs/rotate', { method: 'POST' }),
  getDeveloperFeatureFlags: () =>
    request('/rcce/developer/remote/feature-flags'),
  setDeveloperFeatureFlag: (flagKey, payload) =>
    request(`/rcce/developer/remote/feature-flags/${encodeURIComponent(flagKey)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getDeveloperRollbackReadiness: () =>
    request('/rcce/developer/remote/rollback-readiness'),
  getDeveloperDeploymentRegistry: () =>
    request('/rcce/developer/remote/deployment-registry'),
  getDeveloperWorkingSystemAudit: () =>
    request('/rcce/developer/remote/working-system-audit'),

  // Step 30: Migration Queue Status, Enqueue & Downloadable Verification Report
  getMigrationQueueStatus: () =>
    request('/migration/queue/status'),
  enqueueMigrationJob: (jobId, payload = {}) =>
    request(`/migration/jobs/${encodeURIComponent(jobId)}/enqueue`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMigrationVerificationReport: (jobId, format = 'json') =>
    request(`/migration/jobs/${encodeURIComponent(jobId)}/report?format=${encodeURIComponent(format)}`),

  // Multi-Gateway Hospital Payments, Bank Deposits, Receipts, Reports & GBS Developer Subscriptions
  getPaymentProviders: () =>
    request('/payments/providers', { silentError: true }),
  initiatePayment: (payload, idempotencyKey) =>
    request('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
      ...(idempotencyKey ? { idempotencyKey } : {}),
    }),
  verifyPaymentTransaction: (reference) =>
    request(`/payments/transactions/${encodeURIComponent(reference)}/verify`, {
      method: 'POST',
    }),
  cancelPaymentTransaction: (reference, payload = {}) =>
    request(`/payments/transactions/${encodeURIComponent(reference)}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPaymentTransactions: (q = '') =>
    request(`/payments/transactions${q ? `?${q}` : ''}`),
  getPaymentTransactionByRef: (reference) =>
    request(`/payments/transactions/${encodeURIComponent(reference)}`),
  getPaymentReceipt: (reference) =>
    request(`/payments/receipts/${encodeURIComponent(reference)}`),
  submitBankDepositProof: (payload) =>
    request('/payments/bank-deposits/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyBankDeposit: (id, payload) =>
    request(`/payments/bank-deposits/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  refundPaymentTransaction: (id, payload) =>
    request(`/payments/transactions/${encodeURIComponent(id)}/refund`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPaymentReports: (q = '') =>
    request(`/payments/reports${q ? `?${q}` : ''}`),
  initiateDeveloperSubscriptionPayment: (payload) =>
    request('/payments/developer-subscriptions/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  confirmDeveloperSubscriptionPayment: (id, payload = {}) =>
    request(`/payments/developer-subscriptions/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getDeveloperPaymentsOverview: (q = '') =>
    request(`/payments/developer/overview${q ? `?${q}` : ''}`),
  reconcilePaymentTransaction: (reference) =>
    request(`/payments/transactions/${encodeURIComponent(reference)}/reconcile`, {
      method: 'POST',
    }),
  getPaymentWebhooks: (q = '') =>
    request(`/payments/developer/webhooks${q ? `?${q}` : ''}`),

  // International Countries (50) & Multilingual Support (10 Languages)
  getInternationalCountries: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.region && params.region !== 'ALL') qs.set('region', params.region);
    if (params.search) qs.set('search', params.search);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/international/countries${suffix}`, { silentError: true });
  },
  getInternationalCountry: (code) =>
    request(`/international/countries/${encodeURIComponent(code)}`, { silentError: true }),
  getSupportedLanguages: () =>
    request('/international/languages', { silentError: true }),
  getInternationalProfile: () =>
    request('/international/profile', { silentError: true }),
  updateInternationalProfile: (payload) =>
    request('/international/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // File 8: All-Users Direct Voice/Video Calling & Multi-Camera WebRTC Conferences
  getCallDirectory: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.role && params.role !== 'ALL') qs.set('role', params.role);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/communications/directory${suffix}`);
  },
  getCallsAndConferences: (limit = 40) =>
    request(`/communications/calls?limit=${encodeURIComponent(limit)}`),
  getIncomingCalls: () =>
    request('/communications/calls/incoming', { silentError: true }),
  initiateDirectCall: (payload) =>
    request('/communications/calls', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  acceptDirectCall: (idOrCode, payload = {}) =>
    request(`/communications/calls/${encodeURIComponent(idOrCode)}/accept`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  declineDirectCall: (idOrCode, payload = {}) =>
    request(`/communications/calls/${encodeURIComponent(idOrCode)}/decline`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  endDirectCall: (idOrCode, payload = {}) =>
    request(`/communications/calls/${encodeURIComponent(idOrCode)}/end`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createConferenceRoom: (payload) =>
    request('/communications/conferences', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  joinCommunicationRoom: (roomCode, payload = {}) =>
    request(`/communications/rooms/${encodeURIComponent(roomCode)}/join`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  leaveCommunicationRoom: (roomCode) =>
    request(`/communications/rooms/${encodeURIComponent(roomCode)}/leave`, {
      method: 'POST',
    }),
  sendRoomSignal: (roomCode, payload) =>
    request(`/communications/rooms/${encodeURIComponent(roomCode)}/signal`, {
      method: 'POST',
      body: JSON.stringify(payload),
      silentError: true,
    }),
  pollRoomSignals: (roomCode, params = {}) => {
    const qs = new URLSearchParams();
    if (params.afterSeq !== undefined) qs.set('afterSeq', String(params.afterSeq));
    if (params.audioEnabled !== undefined) qs.set('audioEnabled', String(Boolean(params.audioEnabled)));
    if (params.videoEnabled !== undefined) qs.set('videoEnabled', String(Boolean(params.videoEnabled)));
    if (params.screenSharing !== undefined) qs.set('screenSharing', String(Boolean(params.screenSharing)));
    return request(`/communications/rooms/${encodeURIComponent(roomCode)}/signals?${qs.toString()}`, { silentError: true });
  },
};


