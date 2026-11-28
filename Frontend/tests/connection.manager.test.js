import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createConnectionManager,
  CONNECTION_STATES,
  sanitizeConnectionReason,
} from '../src/services/connection.manager.js';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

test('1. Healthy /health probe sets all independent layers to ONLINE with live metrics', async () => {
  const manager = createConnectionManager({
    attachBrowserEvents: false,
    fetchImpl: async () =>
      jsonResponse(200, {
        status: 'healthy',
        overallStatus: 'ONLINE',
        server: 'running',
        centralEngine: 'ONLINE',
        database: 'connected',
        databaseStatus: 'ONLINE',
        databaseLatencyMs: 9,
        avgApiResponseTimeMs: 24,
        uptime: 3665,
        environment: 'PRODUCTION',
        serviceName: 'gbs-hospital-system',
      }),
  });

  const snap = await manager.checkNow();
  assert.equal(snap.overallStatus, CONNECTION_STATES.ONLINE);
  assert.equal(snap.frontendStatus, CONNECTION_STATES.ONLINE);
  assert.equal(snap.backendStatus, CONNECTION_STATES.ONLINE);
  assert.equal(snap.centralEngineStatus, CONNECTION_STATES.ONLINE);
  assert.equal(snap.databaseStatus, CONNECTION_STATES.ONLINE);
  assert.equal(snap.databaseLatencyMs, 9);
  assert.equal(snap.serverUptimeSeconds, 3665);
  assert.equal(snap.consecutiveFailures, 0);
  assert.equal(snap.lastFailureReason, null);
  manager.stop();
});

test('2. Single transient network drop reports DEGRADED (no false offline); consecutive failures confirm OFFLINE with controlled backoff', async () => {
  const manager = createConnectionManager({
    attachBrowserEvents: false,
    offlineThreshold: 2,
    backoffScheduleMs: [4000, 8000, 16000, 30000],
    fetchImpl: async () => {
      throw new Error('Failed to fetch');
    },
  });

  const first = await manager.checkNow();
  assert.equal(first.overallStatus, CONNECTION_STATES.DEGRADED);
  assert.equal(first.consecutiveFailures, 1);
  assert.equal(first.retryDelayMs, 4000);
  assert.equal(first.isReconnecting, true);

  const second = await manager.checkNow();
  assert.equal(second.overallStatus, CONNECTION_STATES.OFFLINE);
  assert.equal(second.consecutiveFailures, 2);
  assert.equal(second.retryDelayMs, 8000);

  const third = await manager.checkNow();
  assert.equal(third.retryDelayMs, 16000);

  const fourth = await manager.checkNow();
  assert.equal(fourth.retryDelayMs, 30000);
  manager.stop();
});

test('3. Repeated 503 health telemetry with Engine + DB OFFLINE transitions truthfully from DEGRADED to OFFLINE', async () => {
  const manager = createConnectionManager({
    attachBrowserEvents: false,
    offlineThreshold: 2,
    fetchImpl: async () =>
      jsonResponse(503, {
        status: 'degraded',
        overallStatus: 'OFFLINE',
        centralEngine: 'OFFLINE',
        database: 'offline',
        databaseStatus: 'OFFLINE',
      }),
  });

  const probe1 = await manager.checkNow();
  assert.equal(probe1.overallStatus, CONNECTION_STATES.DEGRADED);
  assert.equal(probe1.databaseStatus, CONNECTION_STATES.OFFLINE);
  assert.equal(probe1.centralEngineStatus, CONNECTION_STATES.OFFLINE);

  const probe2 = await manager.checkNow();
  assert.equal(probe2.overallStatus, CONNECTION_STATES.OFFLINE);
  assert.equal(probe2.consecutiveFailures, 2);
  manager.stop();
});

test('4. 4xx auth/permission/validation responses never cause false OFFLINE notifications', async () => {
  const manager = createConnectionManager({
    attachBrowserEvents: false,
    fetchImpl: async () =>
      jsonResponse(200, {
        status: 'healthy',
        overallStatus: 'ONLINE',
        centralEngine: 'ONLINE',
        databaseStatus: 'ONLINE',
      }),
  });

  await manager.checkNow();
  for (const status of [400, 401, 403, 404, 422]) {
    manager.recordApiResult({
      endpoint: '/patients',
      status,
      ok: false,
      latencyMs: 12,
      errorCode: `HTTP_${status}`,
    });
  }

  const snap = manager.getState();
  assert.equal(snap.overallStatus, CONNECTION_STATES.ONLINE);
  assert.equal(snap.consecutiveFailures, 0);
  manager.stop();
});

test('5. Server restart recovery transitions cleanly from OFFLINE back to ONLINE', async () => {
  let attempt = 0;
  const manager = createConnectionManager({
    attachBrowserEvents: false,
    offlineThreshold: 2,
    fetchImpl: async () => {
      attempt += 1;
      if (attempt <= 2) {
        throw new Error('Server restarting');
      }
      return jsonResponse(200, {
        status: 'healthy',
        overallStatus: 'ONLINE',
        server: 'running',
        centralEngine: 'ONLINE',
        databaseStatus: 'ONLINE',
        databaseLatencyMs: 6,
        uptime: 15,
      });
    },
  });

  await manager.checkNow();
  const offlineSnap = await manager.checkNow();
  assert.equal(offlineSnap.overallStatus, CONNECTION_STATES.OFFLINE);

  const recovered = await manager.checkNow();
  assert.equal(recovered.overallStatus, CONNECTION_STATES.ONLINE);
  assert.equal(recovered.centralEngineStatus, CONNECTION_STATES.ONLINE);
  assert.equal(recovered.databaseStatus, CONNECTION_STATES.ONLINE);
  assert.equal(recovered.consecutiveFailures, 0);
  assert.equal(recovered.isReconnecting, false);
  assert.equal(recovered.lastFailureReason, null);
  assert.ok(recovered.lastSuccessfulConnection);
  manager.stop();
});

test('6. sanitizeConnectionReason strips PostgreSQL URIs, passwords, Bearer tokens, and secret keys', () => {
  const dirty =
    'postgres://admin:TopSecret123@host:5432/db Bearer eyJhbGciOi.abc.xyz api_key=leak999 sk_live_secretToken123';
  const clean = sanitizeConnectionReason(dirty);
  assert.ok(!clean.includes('TopSecret123'));
  assert.ok(!clean.includes('eyJhbGciOi'));
  assert.ok(!clean.includes('leak999'));
  assert.ok(!clean.includes('sk_live_secretToken123'));
  assert.ok(clean.includes('[REDACTED_DB_URI]'));
  assert.ok(clean.includes('Bearer [REDACTED]'));
  assert.ok(clean.includes('[REDACTED_KEY]'));
});
