/**
 * GBS Hospital Management System — Intelligent Connection Monitor (Frontend)
 *
 * Truthfully monitors Frontend network state, Backend API reachability,
 * Central Engine (GBS-RCCE) status, and PostgreSQL Database connectivity.
 *
 * Design principles:
 * - Zero mocked or forced "online" responses.
 * - Independent layer tracking: Frontend, Backend, Central Engine, Database.
 * - Eliminates false "Central Engine Offline" flashes caused by single packet
 *   drops or Render cold-start wakeups via multi-failure confirmation and
 *   controlled exponential retry backoff (4s -> 8s -> 16s -> 30s).
 * - Uses AbortController request timeouts (15s steady-state, 45s recovery).
 * - Pauses periodic polling while the browser tab is hidden and immediately
 *   verifies connectivity on tab visibility restoration or browser online events.
 * - Sanitizes all failure messages so credentials/tokens never leak to UI state.
 */

const DEFAULT_API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  '/api/v1';

export const CONNECTION_STATES = Object.freeze({
  CHECKING: 'CHECKING',
  ONLINE: 'ONLINE',
  DEGRADED: 'DEGRADED',
  OFFLINE: 'OFFLINE',
});

const NORMAL_POLL_INTERVAL_MS = 30000;
const RETRY_BACKOFF_SCHEDULE_MS = [4000, 8000, 16000, 30000];
const DEFAULT_PROBE_TIMEOUT_MS = 15000;
const RECOVERY_PROBE_TIMEOUT_MS = 45000;
const OFFLINE_CONFIRMATION_THRESHOLD = 2;
const MAX_RECENT_ERRORS = 20;
const MAX_LATENCY_SAMPLES = 25;
const API_TRIGGER_THROTTLE_MS = 3000;

export function sanitizeConnectionReason(raw) {
  if (!raw) return 'Connection check failed';
  const text = String(raw instanceof Error ? raw.message : raw);
  return text
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, '[REDACTED_DB_URI]')
    .replace(/(password|passwd|pwd|secret|token|apikey|api_key)\s*[:=]\s*[^\s;,&"']+/gi, '$1=[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/\b(sk_live|sk_test|pk_live|pk_test)_[A-Za-z0-9]+\b/gi, '[REDACTED_KEY]')
    .trim()
    .slice(0, 240);
}

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function isBrowserOnline() {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

function isDocumentHidden() {
  if (typeof document !== 'undefined' && typeof document.visibilityState === 'string') {
    return document.visibilityState === 'hidden';
  }
  return false;
}

function normalizeComponentState(rawValue, fallback = CONNECTION_STATES.DEGRADED) {
  const upper = String(rawValue || '').trim().toUpperCase();
  if (upper === 'ONLINE' || upper === 'HEALTHY' || upper === 'CONNECTED' || upper === 'RUNNING') {
    return CONNECTION_STATES.ONLINE;
  }
  if (upper === 'DEGRADED') {
    return CONNECTION_STATES.DEGRADED;
  }
  if (upper === 'OFFLINE' || upper === 'DISCONNECTED' || upper === 'DOWN') {
    return CONNECTION_STATES.OFFLINE;
  }
  return fallback;
}

export function createConnectionManager(options = {}) {
  const apiBase = String(options.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  const normalIntervalMs = Number(options.normalIntervalMs) > 0 ? Number(options.normalIntervalMs) : NORMAL_POLL_INTERVAL_MS;
  const backoffSchedule = Array.isArray(options.backoffScheduleMs) && options.backoffScheduleMs.length > 0
    ? options.backoffScheduleMs
    : RETRY_BACKOFF_SCHEDULE_MS;
  const probeTimeoutMs = Number(options.probeTimeoutMs) > 0 ? Number(options.probeTimeoutMs) : DEFAULT_PROBE_TIMEOUT_MS;
  const recoveryTimeoutMs = Number(options.recoveryTimeoutMs) > 0 ? Number(options.recoveryTimeoutMs) : RECOVERY_PROBE_TIMEOUT_MS;
  const offlineThreshold = Number(options.offlineThreshold) >= 1 ? Number(options.offlineThreshold) : OFFLINE_CONFIRMATION_THRESHOLD;
  const attachBrowserEvents = options.attachBrowserEvents !== false && typeof window !== 'undefined';

  const listeners = new Set();
  const latencySamples = [];
  const recentErrors = [];

  let started = false;
  let pollTimer = null;
  let inFlightProbe = null;
  let lastApiTriggeredProbeAt = 0;

  let state = {
    overallStatus: isBrowserOnline() ? CONNECTION_STATES.CHECKING : CONNECTION_STATES.OFFLINE,
    frontendStatus: isBrowserOnline() ? CONNECTION_STATES.ONLINE : CONNECTION_STATES.OFFLINE,
    backendStatus: isBrowserOnline() ? CONNECTION_STATES.CHECKING : CONNECTION_STATES.OFFLINE,
    centralEngineStatus: isBrowserOnline() ? CONNECTION_STATES.CHECKING : CONNECTION_STATES.OFFLINE,
    databaseStatus: isBrowserOnline() ? CONNECTION_STATES.CHECKING : CONNECTION_STATES.OFFLINE,
    databaseLatencyMs: null,
    apiResponseTimeMs: null,
    avgApiResponseTimeMs: null,
    serverAvgApiResponseTimeMs: null,
    serverUptimeSeconds: null,
    environment: null,
    serviceName: null,
    demoModeEnabled: null,
    lastSuccessfulConnection: null,
    lastCheckedAt: null,
    lastFailureReason: isBrowserOnline() ? null : 'Browser reports no active internet connection',
    consecutiveFailures: 0,
    retryDelayMs: normalIntervalMs,
    isReconnecting: false,
    recentConnectionErrors: [],
  };

  function getSnapshot() {
    return {
      ...state,
      recentConnectionErrors: recentErrors.map((entry) => ({ ...entry })),
    };
  }

  function emit() {
    const snapshot = getSnapshot();
    listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (_err) {
        // Isolate subscriber errors so connection monitoring stays healthy
      }
    });
  }

  function recordLatencySample(ms) {
    const num = Number(ms);
    if (!Number.isFinite(num) || num < 0) return;
    const rounded = Math.round(num);
    latencySamples.push(rounded);
    if (latencySamples.length > MAX_LATENCY_SAMPLES) {
      latencySamples.shift();
    }
    const avg = Math.round(latencySamples.reduce((acc, v) => acc + v, 0) / latencySamples.length);
    state = {
      ...state,
      apiResponseTimeMs: rounded,
      avgApiResponseTimeMs: avg,
    };
  }

  function pushConnectionError({ source = 'HEALTH_PROBE', reason, httpStatus = null, endpoint = '/health' }) {
    const sanitized = sanitizeConnectionReason(reason);
    recentErrors.unshift({
      timestamp: new Date().toISOString(),
      source,
      reason: sanitized,
      httpStatus,
      endpoint,
    });
    if (recentErrors.length > MAX_RECENT_ERRORS) {
      recentErrors.length = MAX_RECENT_ERRORS;
    }
    return sanitized;
  }

  function clearScheduledPoll() {
    if (pollTimer !== null) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  function getBackoffDelay(failuresCount) {
    const idx = Math.min(Math.max(failuresCount - 1, 0), backoffSchedule.length - 1);
    return backoffSchedule[idx];
  }

  function scheduleNextPoll(delayMs) {
    clearScheduledPoll();
    if (!started) return;
    if (!isBrowserOnline()) return;
    if (isDocumentHidden()) return;

    const effectiveDelay = Number(delayMs) > 0 ? Number(delayMs) : normalIntervalMs;
    state = { ...state, retryDelayMs: effectiveDelay };
    pollTimer = setTimeout(() => {
      pollTimer = null;
      if (started && isBrowserOnline() && !isDocumentHidden()) {
        checkNow();
      }
    }, effectiveDelay);
  }

  async function runHealthProbe(probeOptions = {}) {
    const checkedAt = new Date().toISOString();

    if (!isBrowserOnline()) {
      const reason = pushConnectionError({
        source: 'BROWSER_NETWORK',
        reason: 'Browser reports no active internet connection',
        endpoint: '/health',
      });
      state = {
        ...state,
        frontendStatus: CONNECTION_STATES.OFFLINE,
        overallStatus: CONNECTION_STATES.OFFLINE,
        backendStatus: CONNECTION_STATES.OFFLINE,
        centralEngineStatus: CONNECTION_STATES.OFFLINE,
        databaseStatus: CONNECTION_STATES.OFFLINE,
        lastCheckedAt: checkedAt,
        lastFailureReason: reason,
        isReconnecting: false,
      };
      emit();
      return getSnapshot();
    }

    if (!fetchImpl) {
      return getSnapshot();
    }

    const useRecoveryTimeout =
      state.consecutiveFailures > 0 ||
      state.overallStatus === CONNECTION_STATES.DEGRADED ||
      state.overallStatus === CONNECTION_STATES.OFFLINE;
    const timeoutMs = Number(probeOptions.timeoutMs) > 0
      ? Number(probeOptions.timeoutMs)
      : (useRecoveryTimeout ? recoveryTimeoutMs : probeTimeoutMs);

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    let timeoutHandle = null;
    let timedOut = false;

    if (controller) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        try {
          controller.abort();
        } catch (_e) {
          // Ignore abort errors
        }
      }, timeoutMs);
    }

    const startedAt = nowMs();

    try {
      const response = await fetchImpl(`${apiBase}/health`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'X-GBS-Health-Probe': '1',
        },
        ...(controller ? { signal: controller.signal } : {}),
      });

      const elapsedMs = Math.max(0, Math.round(nowMs() - startedAt));
      recordLatencySample(elapsedMs);

      let payload = null;
      try {
        payload = await response.json();
      } catch (_parseErr) {
        payload = null;
      }

      // Case 1: Backend responded 200 OK with structured health telemetry
      if (response.ok && payload && typeof payload === 'object') {
        const centralEngineStatus = normalizeComponentState(
          payload.centralEngine || (payload.status === 'healthy' ? 'ONLINE' : 'DEGRADED'),
          CONNECTION_STATES.ONLINE
        );
        const databaseStatus = normalizeComponentState(
          payload.databaseStatus || payload.database,
          CONNECTION_STATES.ONLINE
        );
        const backendStatus = normalizeComponentState(payload.server || 'running', CONNECTION_STATES.ONLINE);

        let overallStatus = CONNECTION_STATES.ONLINE;
        if (payload.overallStatus) {
          overallStatus = normalizeComponentState(payload.overallStatus, CONNECTION_STATES.ONLINE);
        } else if (databaseStatus !== CONNECTION_STATES.ONLINE || centralEngineStatus !== CONNECTION_STATES.ONLINE) {
          overallStatus = CONNECTION_STATES.DEGRADED;
        }

        const isFullyOnline = overallStatus === CONNECTION_STATES.ONLINE;
        const nextDelay = isFullyOnline ? normalIntervalMs : getBackoffDelay(1);

        state = {
          ...state,
          frontendStatus: CONNECTION_STATES.ONLINE,
          overallStatus,
          backendStatus,
          centralEngineStatus,
          databaseStatus,
          databaseLatencyMs:
            typeof payload.databaseLatencyMs === 'number' ? payload.databaseLatencyMs : state.databaseLatencyMs,
          serverAvgApiResponseTimeMs:
            typeof payload.avgApiResponseTimeMs === 'number'
              ? payload.avgApiResponseTimeMs
              : state.serverAvgApiResponseTimeMs,
          serverUptimeSeconds:
            typeof payload.uptime === 'number' ? Math.floor(payload.uptime) : state.serverUptimeSeconds,
          environment: payload.environment || state.environment,
          serviceName: payload.serviceName || state.serviceName,
          demoModeEnabled:
            typeof payload.demoModeEnabled === 'boolean' ? payload.demoModeEnabled : state.demoModeEnabled,
          lastSuccessfulConnection: isFullyOnline
            ? (payload.lastSuccessfulConnection || checkedAt)
            : (payload.lastSuccessfulConnection || state.lastSuccessfulConnection),
          lastCheckedAt: checkedAt,
          lastFailureReason: isFullyOnline ? null : state.lastFailureReason,
          consecutiveFailures: isFullyOnline ? 0 : state.consecutiveFailures + 1,
          isReconnecting: !isFullyOnline,
          retryDelayMs: nextDelay,
        };

        emit();
        scheduleNextPoll(nextDelay);
        return getSnapshot();
      }

      // Case 2: Backend is reachable but explicitly returned 503 degraded/offline health telemetry
      if (response.status === 503 && payload && typeof payload === 'object') {
        const nextFailures = state.consecutiveFailures + 1;
        const centralEngineStatus = normalizeComponentState(payload.centralEngine, CONNECTION_STATES.DEGRADED);
        const databaseStatus = normalizeComponentState(
          payload.databaseStatus || payload.database,
          CONNECTION_STATES.OFFLINE
        );
        const derivedOverall =
          payload.overallStatus === CONNECTION_STATES.OFFLINE && databaseStatus === CONNECTION_STATES.OFFLINE
            ? (nextFailures >= offlineThreshold ? CONNECTION_STATES.OFFLINE : CONNECTION_STATES.DEGRADED)
            : normalizeComponentState(payload.overallStatus, CONNECTION_STATES.DEGRADED);

        const detailMsg =
          databaseStatus === CONNECTION_STATES.OFFLINE
            ? 'Backend reachable, but PostgreSQL database probe failed (HTTP 503)'
            : centralEngineStatus !== CONNECTION_STATES.ONLINE
              ? 'Backend reachable, but Central Engine (GBS-RCCE) reported degraded status (HTTP 503)'
              : 'Health check reported degraded service status (HTTP 503)';

        const sanitizedReason = pushConnectionError({
          source: 'BACKEND_HEALTH_503',
          reason: detailMsg,
          httpStatus: 503,
          endpoint: '/health',
        });

        const nextDelay = getBackoffDelay(nextFailures);
        state = {
          ...state,
          frontendStatus: CONNECTION_STATES.ONLINE,
          overallStatus: derivedOverall,
          backendStatus: CONNECTION_STATES.ONLINE,
          centralEngineStatus,
          databaseStatus,
          databaseLatencyMs: typeof payload.databaseLatencyMs === 'number' ? payload.databaseLatencyMs : null,
          serverUptimeSeconds:
            typeof payload.uptime === 'number' ? Math.floor(payload.uptime) : state.serverUptimeSeconds,
          environment: payload.environment || state.environment,
          serviceName: payload.serviceName || state.serviceName,
          lastCheckedAt: checkedAt,
          lastFailureReason: sanitizedReason,
          consecutiveFailures: nextFailures,
          isReconnecting: true,
          retryDelayMs: nextDelay,
        };

        emit();
        scheduleNextPoll(nextDelay);
        return getSnapshot();
      }

      // Case 3: Upstream gateway error (502/504/500) or non-JSON proxy response
      const nextFailures = state.consecutiveFailures + 1;
      const sanitizedReason = pushConnectionError({
        source: 'HTTP_ERROR',
        reason: `Health endpoint returned HTTP ${response.status}`,
        httpStatus: response.status,
        endpoint: '/health',
      });
      const confirmedOffline = nextFailures >= offlineThreshold;
      const nextDelay = getBackoffDelay(nextFailures);

      state = {
        ...state,
        frontendStatus: CONNECTION_STATES.ONLINE,
        overallStatus: confirmedOffline ? CONNECTION_STATES.OFFLINE : CONNECTION_STATES.DEGRADED,
        backendStatus: confirmedOffline ? CONNECTION_STATES.OFFLINE : CONNECTION_STATES.DEGRADED,
        centralEngineStatus: confirmedOffline ? CONNECTION_STATES.OFFLINE : CONNECTION_STATES.DEGRADED,
        databaseStatus: confirmedOffline ? CONNECTION_STATES.OFFLINE : CONNECTION_STATES.DEGRADED,
        lastCheckedAt: checkedAt,
        lastFailureReason: sanitizedReason,
        consecutiveFailures: nextFailures,
        isReconnecting: true,
        retryDelayMs: nextDelay,
      };

      emit();
      scheduleNextPoll(nextDelay);
      return getSnapshot();
    } catch (err) {
      const nextFailures = state.consecutiveFailures + 1;
      const rawMessage = timedOut
        ? `Health check timed out after ${Math.round(timeoutMs / 1000)}s (server may be restarting or waking up)`
        : (err?.message || 'Unable to reach backend server');

      const sanitizedReason = pushConnectionError({
        source: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
        reason: rawMessage,
        httpStatus: null,
        endpoint: '/health',
      });

      const confirmedOffline = !isBrowserOnline() || nextFailures >= offlineThreshold;
      const nextDelay = getBackoffDelay(nextFailures);

      state = {
        ...state,
        frontendStatus: isBrowserOnline() ? CONNECTION_STATES.ONLINE : CONNECTION_STATES.OFFLINE,
        overallStatus: confirmedOffline ? CONNECTION_STATES.OFFLINE : CONNECTION_STATES.DEGRADED,
        backendStatus: confirmedOffline ? CONNECTION_STATES.OFFLINE : CONNECTION_STATES.DEGRADED,
        centralEngineStatus: confirmedOffline ? CONNECTION_STATES.OFFLINE : CONNECTION_STATES.DEGRADED,
        databaseStatus: confirmedOffline ? CONNECTION_STATES.OFFLINE : CONNECTION_STATES.DEGRADED,
        lastCheckedAt: checkedAt,
        lastFailureReason: sanitizedReason,
        consecutiveFailures: nextFailures,
        isReconnecting: isBrowserOnline(),
        retryDelayMs: nextDelay,
      };

      emit();
      scheduleNextPoll(nextDelay);
      return getSnapshot();
    } finally {
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  function checkNow(probeOptions = {}) {
    if (inFlightProbe) return inFlightProbe;
    inFlightProbe = runHealthProbe(probeOptions).finally(() => {
      inFlightProbe = null;
    });
    return inFlightProbe;
  }

  function recordApiResult({
    endpoint = '/',
    status = null,
    ok = false,
    latencyMs = null,
    errorCode = null,
    errorMessage = null,
  } = {}) {
    if (typeof latencyMs === 'number' && Number.isFinite(latencyMs)) {
      recordLatencySample(latencyMs);
    }

    // Avoid self-recursion on /health probes
    if (String(endpoint).startsWith('/health')) {
      emit();
      return;
    }

    const now = Date.now();

    // Real backend HTTP response (including 2xx, 400, 401, 403, 404, 422) proves server reachability.
    // Auth/client errors (4xx) must NEVER cause false offline alerts.
    if (ok || (typeof status === 'number' && status >= 200 && status < 500)) {
      if (state.overallStatus !== CONNECTION_STATES.ONLINE) {
        // Backend just responded while monitor thought degraded/offline -> verify health immediately
        if (now - lastApiTriggeredProbeAt >= API_TRIGGER_THROTTLE_MS) {
          lastApiTriggeredProbeAt = now;
          checkNow();
        }
      } else {
        emit();
      }
      return;
    }

    // Network failure, timeout, or 502/503/504 gateway failure on an application API call
    const isConnectivityError =
      errorCode === 'NETWORK_ERROR' ||
      errorCode === 'REQUEST_TIMEOUT' ||
      status === 502 ||
      status === 503 ||
      status === 504;

    if (isConnectivityError) {
      pushConnectionError({
        source: errorCode || `HTTP_${status || 'ERR'}`,
        reason: errorMessage || `API request to ${endpoint} failed`,
        httpStatus: status,
        endpoint,
      });

      if (started && isBrowserOnline() && now - lastApiTriggeredProbeAt >= API_TRIGGER_THROTTLE_MS) {
        lastApiTriggeredProbeAt = now;
        checkNow();
      } else {
        emit();
      }
    }
  }

  function handleWindowOnline() {
    state = {
      ...state,
      frontendStatus: CONNECTION_STATES.ONLINE,
      overallStatus: CONNECTION_STATES.DEGRADED,
      isReconnecting: true,
      lastFailureReason: 'Network restored — reconnecting to Central Engine...',
    };
    emit();
    checkNow({ timeoutMs: recoveryTimeoutMs });
  }

  function handleWindowOffline() {
    clearScheduledPoll();
    const reason = pushConnectionError({
      source: 'BROWSER_NETWORK',
      reason: 'Browser lost internet connection',
      endpoint: '/health',
    });
    state = {
      ...state,
      frontendStatus: CONNECTION_STATES.OFFLINE,
      overallStatus: CONNECTION_STATES.OFFLINE,
      backendStatus: CONNECTION_STATES.OFFLINE,
      centralEngineStatus: CONNECTION_STATES.OFFLINE,
      databaseStatus: CONNECTION_STATES.OFFLINE,
      isReconnecting: false,
      lastFailureReason: reason,
    };
    emit();
  }

  function handleVisibilityChange() {
    if (!started) return;
    if (isDocumentHidden()) {
      clearScheduledPoll();
    } else if (isBrowserOnline()) {
      checkNow();
    }
  }

  function start() {
    if (started) {
      return getSnapshot();
    }
    started = true;
    if (attachBrowserEvents) {
      window.addEventListener('online', handleWindowOnline);
      window.addEventListener('offline', handleWindowOffline);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
    }
    checkNow();
    return getSnapshot();
  }

  function stop() {
    started = false;
    clearScheduledPoll();
    if (attachBrowserEvents) {
      window.removeEventListener('online', handleWindowOnline);
      window.removeEventListener('offline', handleWindowOffline);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    }
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    listeners.add(listener);
    try {
      listener(getSnapshot());
    } catch (_err) {
      // Ignore initial subscriber error
    }
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    start,
    stop,
    checkNow,
    getState: getSnapshot,
    subscribe,
    recordApiResult,
  };
}

export const connectionManager = createConnectionManager();
export default connectionManager;
