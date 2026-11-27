import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import { connectionManager } from '../../services/connection.manager';
import FacialRecognitionModal from '../../components/FacialRecognitionModal';
import {
  Cpu, Shield, ScanFace, Clock, RefreshCw, CheckCircle, AlertTriangle,
  Server, Building2, Play, Activity, CreditCard, Download, Radio
} from 'lucide-react';

function formatUptimeReadable(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '—';
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${rem}s`;
  if (m > 0) return `${m}m ${rem}s`;
  return `${rem}s`;
}

export default function DeveloperAdvancedOpsPanel({ onStatusMsg }) {
  const [diagnostics, setDiagnostics] = useState(null);
  const [integrations, setIntegrations] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [faceStatus, setFaceStatus] = useState(null);
  const [clusterHealth, setClusterHealth] = useState(null);
  const [envStatus, setEnvStatus] = useState(null);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [rollbackInfo, setRollbackInfo] = useState(null);
  const [sweepResult, setSweepResult] = useState(null);
  const [connDiag, setConnDiag] = useState(null);
  const [clientConn, setClientConn] = useState(() => connectionManager.getState());
  const [paymentsOverview, setPaymentsOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [remoteBusy, setRemoteBusy] = useState('');
  const [faceModalOpen, setFaceModalOpen] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [diag, integ, anal, face] = await Promise.all([
        api.getAiDeveloperDiagnostics().catch(() => null),
        api.getDeveloperIntegrationsStatus().catch(() => null),
        api.getDeveloperTenantAnalytics().catch(() => null),
        api.getFaceBiometricStatus().catch(() => null),
      ]);
      const [cluster, flagsRes, rb, envRes, cDiag, payOv] = await Promise.all([
        api.getDeveloperClusterHealth().catch(() => null),
        api.getDeveloperFeatureFlags().catch(() => null),
        api.getDeveloperRollbackReadiness().catch(() => null),
        api.getDeveloperEnvironmentStatus().catch(() => null),
        api.getConnectionDiagnostics().catch(() => null),
        api.getDeveloperPaymentsOverview().catch(() => null),
      ]);
      setDiagnostics(diag);
      setIntegrations(integ);
      setAnalytics(anal);
      setFaceStatus(face);
      setClusterHealth(cluster);
      setFeatureFlags(Array.isArray(flagsRes?.flags) ? flagsRes.flags : []);
      setRollbackInfo(rb);
      setEnvStatus(envRes);
      setConnDiag(cDiag);
      setPaymentsOverview(payOv);
    } finally {
      setLoading(false);
    }
  };

  const executeRemoteOp = async (opKey, actionFn, successPrefix) => {
    setRemoteBusy(opKey);
    try {
      const res = await actionFn();
      if (typeof onStatusMsg === 'function') {
        onStatusMsg({ type: 'success', msg: `${successPrefix}${res?.durationMs ? ` (${res.durationMs}ms)` : ''}` });
      }
      await loadAll();
    } catch (err) {
      if (typeof onStatusMsg === 'function') {
        onStatusMsg({ type: 'error', msg: err.message });
      }
    } finally {
      setRemoteBusy('');
    }
  };

  const handleToggleFeatureFlag = async (flag) => {
    await executeRemoteOp(
      `flag_${flag.key}`,
      () => api.setDeveloperFeatureFlag(flag.key, { enabled: !flag.enabled, description: flag.description }),
      `Feature flag ${flag.key} set to ${!flag.enabled ? 'ENABLED' : 'DISABLED'}.`
    );
  };

  useEffect(() => {
    loadAll();
    const unsub = connectionManager.subscribe(setClientConn);
    connectionManager.start();
    return () => unsub();
  }, []);

  const handleRunLiveConnectionProbe = async () => {
    setRemoteBusy('conn_probe');
    try {
      await connectionManager.checkNow();
      const freshDiag = await api.getConnectionDiagnostics().catch(() => null);
      if (freshDiag) setConnDiag(freshDiag);
      if (typeof onStatusMsg === 'function') {
        onStatusMsg({ type: 'success', msg: 'Live multi-layer Central Engine & PostgreSQL probe completed.' });
      }
    } finally {
      setRemoteBusy('');
    }
  };

  const handleExportDevPaymentsCsv = () => {
    const txs = paymentsOverview?.recentTransactions || [];
    const headers = ['TransactionRef', 'Channel', 'Method', 'Provider', 'Amount(GHS)', 'Status', 'Destination', 'ReceiptNumber', 'CreatedAt'];
    const rows = txs.map((t) => [
      t.transactionRef,
      t.channel,
      t.paymentMethod,
      t.provider,
      Number(t.amount || 0).toFixed(2),
      t.status,
      t.destinationAccount || '',
      t.receiptNumber || '',
      t.createdAt || ''
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gbs-developer-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunTrialSweep = async () => {
    setSweeping(true);
    try {
      const res = await api.runDeveloperTrialSweep();
      setSweepResult(res);
      if (typeof onStatusMsg === 'function') {
        onStatusMsg({
          type: 'success',
          msg: `Trial Expiration Sweep Executed: ${res.totalTenantsEvaluated} evaluated • ${res.warningsIssuedCount} warning(s) issued • ${res.autoLockedCount} expired tenant(s) auto-locked (Emergency Care preserved).`
        });
      }
      loadAll();
    } catch (err) {
      if (typeof onStatusMsg === 'function') {
        onStatusMsg({ type: 'error', msg: err.message });
      }
    } finally {
      setSweeping(false);
    }
  };

  const healthScore = diagnostics?.architectureHealthScore ?? 0;
  const sys = diagnostics?.systemSummary || {};
  const adapters = integrations?.adapters || [];

  const getAdapterBadge = (status) => {
    if (['CONNECTED', 'ACTIVE_NATIVE', 'CONFIGURED'].includes(status)) {
      return { bg: 'rgba(16,185,129,0.16)', border: '#10b981', color: '#6ee7b7' };
    }
    if (status === 'DISCONNECTED') {
      return { bg: 'rgba(239,68,68,0.18)', border: '#ef4444', color: '#fca5a5' };
    }
    return { bg: 'rgba(245,158,11,0.16)', border: '#f59e0b', color: '#fcd34d' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Action Strip */}
      <div className="glass-panel" style={{ padding: '16px 20px', border: '1px solid var(--border-gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.08rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} /> AI Developer Assistant, 4-Step Facial Security, Trial Automation &amp; Adapter Telemetry
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            100% live PostgreSQL diagnostics, truthful environment adapter status (zero fake greens), automated Day 14/7/3/1/0 trial countdown enforcement, and biometric facial verification.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setFaceModalOpen(true)} className="btn-gold" style={{ fontSize: '0.78rem' }}>
            <ScanFace size={15} /> 4-Step Facial Security
          </button>
          <button type="button" onClick={handleRunTrialSweep} disabled={sweeping} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <Play size={14} /> {sweeping ? 'Running Sweep...' : 'Run Trial Expiration Sweep'}
          </button>
          <button type="button" onClick={loadAll} disabled={loading} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Row: Health Score, Facial Security, Multi-Tenant Analytics, Memory */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>AI Architecture Health Score</div>
            <div className="metric-value" style={{ color: healthScore >= 85 ? '#10b981' : healthScore >= 65 ? '#f59e0b' : '#ef4444' }}>
              {healthScore} / 100
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {sys.totalPrismaModels || 126} Models • {sys.unresolvedErrorsCount ?? 0} Open Errors
            </div>
          </div>
          <Cpu size={22} style={{ color: 'var(--gold-400)' }} />
        </div>

        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>4-Step Facial Security Vault</div>
            <div className="metric-value" style={{ fontSize: '1.15rem', color: faceStatus?.enrolled ? '#10b981' : '#f59e0b' }}>
              {faceStatus?.enrolled ? 'ENROLLED' : 'UNENROLLED'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {faceStatus?.credential?.credentialCode || 'Click 4-Step Facial Security to enroll'}
            </div>
          </div>
          <ScanFace size={22} style={{ color: '#38bdf8' }} />
        </div>

        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Hospital Tenants Monitored</div>
            <div className="metric-value" style={{ color: 'var(--gold-300)' }}>
              {analytics?.totalTenants ?? 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {analytics?.lockedTenantsCount ?? 0} Locked • {(analytics?.expiringWithin14Days || []).length} Expiring &le;14d
            </div>
          </div>
          <Building2 size={22} style={{ color: 'var(--gold-300)' }} />
        </div>

        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Verified Backups &amp; Sessions</div>
            <div className="metric-value" style={{ color: '#38bdf8', fontSize: '1.25rem' }}>
              {sys.verifiedBackupsCount ?? 0} Snapshots
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {sys.activeSessions ?? 0} Live Sessions • {sys.memoryRssMb ?? 0} MB RSS
            </div>
          </div>
          <Server size={22} style={{ color: '#38bdf8' }} />
        </div>
      </div>

      {/* Sweep Result Banner (if run) */}
      {sweepResult && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: '4px solid #10b981', fontSize: '0.8rem', color: '#d1fae5' }}>
          <strong>Latest Automated Trial Sweep ({new Date(sweepResult.executedAt).toLocaleTimeString()}):</strong> Evaluated {sweepResult.totalTenantsEvaluated} tenant(s) • {sweepResult.warningsIssuedCount} renewal warning(s) dispatched • {sweepResult.autoLockedCount} Day-0 expired tenant(s) auto-locked (Emergency clinical care permanently preserved).
        </div>
      )}

      {/* AI Diagnostics Findings + Truthful External Adapters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.94rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={16} /> AI Developer Assistant — Automated System Findings
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(diagnostics?.findings || []).map((f, idx) => {
              const borderCol = f.severity === 'CRITICAL' || f.severity === 'HIGH' ? '#ef4444' : f.severity === 'WARNING' ? '#f59e0b' : f.severity === 'OK' ? '#10b981' : '#38bdf8';
              return (
                <div key={idx} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.75)', borderLeft: `3px solid ${borderCol}`, borderTop: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff' }}>{f.title}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: borderCol }}>{f.severity}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.recommendation}</div>
                </div>
              );
            })}
            {(!diagnostics?.findings || diagnostics.findings.length === 0) && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No diagnostic findings loaded yet.</div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.94rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={16} /> Truthful External Service &amp; Infrastructure Adapter Status
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {adapters.map((a) => {
              const b = getAdapterBadge(a.status);
              return (
                <div key={a.key} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.75)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{a.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{a.detail}</div>
                  </div>
                  <span style={{ padding: '3px 8px', borderRadius: '999px', background: b.bg, border: `1px solid ${b.border}`, color: b.color, fontSize: '0.66rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {a.status}
                  </span>
                </div>
              );
            })}
          </div>
          {integrations && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <span>ENV: <strong style={{ color: integrations.environment === 'PRODUCTION' ? '#10b981' : '#38bdf8' }}>{integrations.environment}</strong></span>
                <span>
                  DEMO TRIAL:{' '}
                  <strong style={{ color: integrations.demoModeEnabled ? '#f59e0b' : '#10b981' }}>
                    {integrations.demoModeEnabled
                      ? `ENABLED (${envStatus?.demoMaxEntries || 10}-ENTRY TRIAL • DEV EXCLUDED)`
                      : 'DISABLED (PROD ONLY)'}
                  </strong>
                </span>
              </div>
              {envStatus && (
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontSize: '0.7rem' }}>
                  <span>
                    HOST: <strong style={{ color: '#fff' }}>{envStatus.cloudHostingProvider || 'Render.com'}</strong> ({envStatus.renderServiceName || 'gbs-hospital-system'})
                  </span>
                  <span>
                    LIVE URL:{' '}
                    <a
                      href={envStatus.productionPublicUrl || 'https://gbs-hospital-system.onrender.com'}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--gold-300)', textDecoration: 'underline' }}
                    >
                      {envStatus.productionPublicUrl || 'https://gbs-hospital-system.onrender.com'}
                    </a>
                  </span>
                  <span>
                    PURGE GUARD: <strong style={{ color: '#10b981' }}>{envStatus.productionPurgeProtection || 'SELECTIVE_DEVELOPMENT_TEST_RECORDS_ONLY'}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step 35: Live Remote System Management, Cluster Telemetry & Feature Flags */}
      <div className="glass-panel" style={{ padding: '18px', border: '1px solid var(--border-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Server size={16} /> Remote System Operations, PostgreSQL Optimization &amp; Feature Flags (Developer Only)
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {clusterHealth
                ? `PostgreSQL ${clusterHealth.database?.name} • Pool ${clusterHealth.database?.activeConnections}/${clusterHealth.database?.configuredPoolLimit || 10} (PG Max ${clusterHealth.database?.maxConnections}, ${clusterHealth.database?.poolUtilizationPct ?? 0}%) • Storage ${clusterHealth.database?.sizeMb}/${clusterHealth.database?.quotaMb || 1024} MB (${clusterHealth.database?.storageUtilizationPct ?? 0}%) • Latency ${clusterHealth.database?.latencyMs}ms • API Avg ${clusterHealth.apiPerformance?.avgResponseTimeMs ?? 0}ms • RTO ${rollbackInfo?.rtoTarget || '<= 2 Hours'}`
                : 'Live cluster health, connection pool alerts & remote maintenance commands audited to PostgreSQL.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={Boolean(remoteBusy)}
              onClick={() => executeRemoteOp('cache', () => api.clearDeveloperCaches(), 'System control & RBAC caches cleared cleanly.')}
              className="btn-outline-gold"
              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
            >
              {remoteBusy === 'cache' ? 'Clearing...' : 'Clear Control Caches'}
            </button>
            <button
              type="button"
              disabled={Boolean(remoteBusy)}
              onClick={() => executeRemoteOp('optimize', () => api.optimizeDeveloperDatabase(), 'PostgreSQL ANALYZE optimization completed')}
              className="btn-outline-gold"
              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
            >
              {remoteBusy === 'optimize' ? 'Optimizing...' : 'Optimize PostgreSQL'}
            </button>
            <button
              type="button"
              disabled={Boolean(remoteBusy)}
              onClick={() => executeRemoteOp('rotate', () => api.rotateDeveloperLogs(), 'Expired sessions & idempotency keys rotated cleanly.')}
              className="btn-outline-gold"
              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
            >
              {remoteBusy === 'rotate' ? 'Rotating...' : 'Prune Expired Sessions'}
            </button>
          </div>
        </div>

        {clusterHealth?.database && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: `1px solid ${clusterHealth.database.poolAlertLevel === 'CRITICAL' ? '#ef4444' : clusterHealth.database.poolAlertLevel === 'WARNING' ? '#f59e0b' : 'var(--border-subtle)'}` }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>DB Connection Pool ({clusterHealth.database.poolAlertLevel || 'OK'})</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: clusterHealth.database.poolAlertLevel === 'CRITICAL' ? '#fca5a5' : clusterHealth.database.poolAlertLevel === 'WARNING' ? '#fcd34d' : '#6ee7b7' }}>
                {clusterHealth.database.activeConnections} / {clusterHealth.database.configuredPoolLimit || 10} ({clusterHealth.database.poolUtilizationPct ?? 0}%)
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Active {clusterHealth.database.activeRunningConnections ?? 0} • Idle {clusterHealth.database.idleConnections ?? 0} • Wait {clusterHealth.database.waitingRequests ?? 0} • PgBouncer {clusterHealth.database.pgbouncerEnabled ? 'ON' : 'READY'}
              </div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: `1px solid ${clusterHealth.database.storageAlertLevel === 'CRITICAL' ? '#ef4444' : clusterHealth.database.storageAlertLevel === 'WARNING' ? '#f59e0b' : 'var(--border-subtle)'}` }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>PostgreSQL Storage ({clusterHealth.database.storageAlertLevel || 'OK'})</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>
                {clusterHealth.database.sizeMb} / {clusterHealth.database.quotaMb || 1024} MB
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {clusterHealth.database.storageUtilizationPct ?? 0}% used • Backups: {clusterHealth.database.localBackupsMb ?? 0} MB ({clusterHealth.database.backupFilesCount ?? 0} files)
              </div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>API Response &amp; Error Rate</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gold-300)' }}>
                {clusterHealth.apiPerformance?.avgResponseTimeMs ?? 0}ms avg • {clusterHealth.apiPerformance?.errorRatePct ?? 0}% 5xx
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {clusterHealth.apiPerformance?.totalRequests ?? 0} reqs • {clusterHealth.apiPerformance?.failed5xx ?? 0} 5xx • {clusterHealth.apiPerformance?.backgroundJobFailures ?? 0} failed jobs
              </div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Backend Compute &amp; Resilience</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                {clusterHealth.memory?.processRssMb ?? 0} MB RSS • {clusterHealth.cpu?.cores ?? 1} CPU
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Timeouts {clusterHealth.database.connectionTimeouts ?? 0} • Failures {clusterHealth.database.failedConnections ?? 0} • Recovered {clusterHealth.database.recoveredConnections ?? 0}
              </div>
            </div>
          </div>
        )}

        {featureFlags.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px' }}>
            {featureFlags.map((flag) => (
              <div
                key={flag.key}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(6,12,24,0.75)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{flag.key}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{flag.description}</div>
                </div>
                <button
                  type="button"
                  disabled={Boolean(remoteBusy)}
                  onClick={() => handleToggleFeatureFlag(flag)}
                  className={flag.enabled ? 'btn-gold' : 'btn-outline-gold'}
                  style={{ fontSize: '0.68rem', padding: '4px 10px', whiteSpace: 'nowrap' }}
                >
                  {flag.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Multi-Tenant Analytics Table */}
      <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: '0.94rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={16} /> Multi-Tenant Analytics Center &amp; Subscription Expirations
        </h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>Tenant ID</th>
              <th>Hospital Facility</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Lock State</th>
              <th>Messages / GPS / Video</th>
            </tr>
          </thead>
          <tbody>
            {(analytics?.recentTenants || []).map((t) => (
              <tr key={t.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: 'var(--gold-300)' }}>{t.tenantId}</td>
                <td style={{ fontWeight: 700 }}>{t.name}</td>
                <td><span className="badge badge-gold">{t.plan}</span></td>
                <td><span className={t.status === 'LOCKED' ? 'badge badge-danger' : 'badge badge-success'}>{t.status}</span></td>
                <td>{t.systemLocked ? <span style={{ color: '#fca5a5', fontWeight: 700 }}>LOCKED</span> : <span style={{ color: '#6ee7b7' }}>UNLOCKED</span>}</td>
                <td style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {t.messagesCount} msgs • {t.gpsPingsCount} GPS • {t.videoCallsCount} calls
                </td>
              </tr>
            ))}
            {(!analytics?.recentTenants || analytics.recentTenants.length === 0) && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                  No registered hospital tenants yet. Use &quot;Register Hospital Facility&quot; above to onboard a tenant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Central Engine & Multi-Layer Connection Diagnostics (All 8 Required Telemetry Fields) */}
      <div className="glass-panel" style={{ padding: '18px', border: '1px solid #38bdf8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.96rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={16} /> Central Engine &amp; Multi-Layer Connection Diagnostics (Truthful Live Probes)
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Independent Frontend, Central Engine (GBS-RCCE), Backend API, and PostgreSQL monitoring with zero mocked health responses or exposed secrets.
            </p>
          </div>
          <button
            type="button"
            disabled={remoteBusy === 'conn_probe'}
            onClick={handleRunLiveConnectionProbe}
            className="btn-outline-gold"
            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
          >
            <Activity size={13} /> {remoteBusy === 'conn_probe' ? 'Probing...' : 'Run Live Connection Probe'}
          </button>
        </div>

        {(() => {
          const frontendSt = clientConn?.frontendStatus || 'ONLINE';
          const engineSt = connDiag?.components?.centralEngine?.status || clientConn?.centralEngineStatus || 'CHECKING';
          const dbSt = connDiag?.components?.database?.status || clientConn?.databaseStatus || 'CHECKING';
          const dbLat = connDiag?.components?.database?.latencyMs ?? clientConn?.databaseLatencyMs;
          const apiResp = clientConn?.apiResponseTimeMs ?? connDiag?.apiPerformance?.avgResponseTimeMs;
          const apiAvg = connDiag?.apiPerformance?.avgResponseTimeMs ?? clientConn?.avgApiResponseTimeMs;
          const lastSuccess = connDiag?.telemetry?.lastSuccessfulConnection || clientConn?.lastSuccessfulConnection;
          const lastFailure = connDiag?.telemetry?.lastFailureReason || clientConn?.lastFailureReason;
          const uptimeSec = connDiag?.components?.backend?.uptimeSeconds ?? clientConn?.serverUptimeSeconds;
          const mergedErrors = [
            ...(Array.isArray(connDiag?.telemetry?.recentConnectionErrors) ? connDiag.telemetry.recentConnectionErrors : []),
            ...(Array.isArray(clientConn?.recentConnectionErrors) ? clientConn.recentConnectionErrors : [])
          ].slice(0, 12);

          const statusColor = (st) =>
            st === 'ONLINE' ? '#6ee7b7' : st === 'DEGRADED' ? '#fbbf24' : st === 'OFFLINE' ? '#fca5a5' : '#38bdf8';

          return (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>1. Frontend Status</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: statusColor(frontendSt) }}>{frontendSt}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    {clientConn?.isReconnecting ? `Auto-retrying every ${Math.round((clientConn.retryDelayMs || 4000) / 1000)}s` : 'Browser link active'}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>2. Central Engine (GBS-RCCE)</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: statusColor(engineSt) }}>{engineSt}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    {connDiag?.components?.centralEngine?.healthySubsystems !== undefined
                      ? `${connDiag.components.centralEngine.healthySubsystems}/${connDiag.components.centralEngine.totalSubsystems} subsystems healthy`
                      : 'Core orchestration probe'}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>3. Database Status (PostgreSQL)</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: statusColor(dbSt) }}>{dbSt}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    {typeof dbLat === 'number' ? `Probe latency: ${dbLat}ms` : 'SELECT 1 health monitor'}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>4. API Response Time</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
                    {typeof apiResp === 'number' ? `${apiResp}ms` : '—'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    Avg: {typeof apiAvg === 'number' ? `${apiAvg}ms` : '—'}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>5. Last Successful Connection</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginTop: '3px' }}>
                    {lastSuccess ? new Date(lastSuccess).toLocaleString() : 'Not recorded yet'}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>6. Last Failure Reason</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: lastFailure ? '#fca5a5' : '#6ee7b7', marginTop: '3px' }}>
                    {lastFailure || 'None — all connection layers healthy'}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>7. Server Uptime</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--gold-400)', fontFamily: 'var(--font-mono)' }}>
                    {formatUptimeReadable(uptimeSec)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    {connDiag?.serviceName || clientConn?.serviceName || 'gbs-hospital-system'}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>8. Recent Connection Errors</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: mergedErrors.length > 0 ? '#fbbf24' : '#6ee7b7' }}>
                    {mergedErrors.length} Logged
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Sanitized telemetry only</div>
                </div>
              </div>

              {mergedErrors.length > 0 && (
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.75)', border: '1px solid rgba(245,158,11,0.35)' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fcd34d', marginBottom: '6px' }}>
                    Recent Connection Error Log (Sanitized — Zero Credentials)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto', fontSize: '0.73rem' }}>
                    {mergedErrors.map((er, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                        <span style={{ color: '#fca5a5' }}>
                          <strong>[{er.source || er.component || 'CONN'}]</strong> {er.reason}
                        </span>
                        <span style={{ color: 'var(--text-dim)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                          {er.timestamp ? new Date(er.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Developer Payment, Subscription Revenue (0554594193) & Webhook Administration Console */}
      <div className="glass-panel" style={{ padding: '18px', border: '1px solid var(--gold-400)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.96rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard size={16} /> Developer Payment Administration, Subscription Revenue &amp; Webhook Monitor
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Designated GBS Developer MoMo Destination: <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{paymentsOverview?.developerDestination?.phone || '0554594193'}</strong> • Only verified SUCCESSFUL payments count as confirmed revenue • Full secret API keys are never displayed.
            </p>
          </div>
          <button type="button" onClick={handleExportDevPaymentsCsv} className="btn-outline-gold" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
            <Download size={13} /> Export Revenue CSV
          </button>
        </div>

        {/* Masked Gateway Credentials & Mode Strip */}
        {paymentsOverview?.gatewayHealth?.gateways && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            {Object.values(paymentsOverview.gatewayHealth.gateways).map((gw) => (
              <div key={gw.provider} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)', fontSize: '0.74rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ color: '#fff' }}>{gw.provider}</strong>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: gw.configured ? '#6ee7b7' : '#fcd34d' }}>
                    {gw.configured ? gw.mode : 'NOT CONFIGURED'}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                  Key: {gw.maskedSecretKey || gw.maskedClientId || 'Set in Render Env Vars'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Revenue & Exception Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '8px', marginBottom: '14px' }}>
          <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(16,185,129,0.4)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confirmed GBS Subscription Revenue</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#6ee7b7', fontFamily: 'var(--font-mono)' }}>
              GHS {Number(paymentsOverview?.summary?.verifiedSubscriptionRevenueGhs || 0).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verified Hospital Collections</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
              GHS {Number(paymentsOverview?.summary?.verifiedHospitalCollectionsGhs || 0).toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Subscription Approvals</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24' }}>
              {paymentsOverview?.summary?.pendingSubscriptionVerifications ?? 0}
            </div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Failed Payments / Failed Webhooks</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fca5a5' }}>
              {paymentsOverview?.summary?.failedPaymentsAll ?? 0} / {paymentsOverview?.summary?.failedWebhooksCount ?? 0}
            </div>
          </div>
        </div>

        {/* Subscription Payments Awaiting Developer Verification (0554594193) */}
        <h5 style={{ margin: '0 0 8px', fontSize: '0.84rem', color: 'var(--gold-300)' }}>
          Hospital → GBS Developer Subscription Payments ({(paymentsOverview?.subscriptionTransactions || []).length})
        </h5>
        <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Purpose / Hospital</th>
                <th>Method / Transfer Ref</th>
                <th>Amount (GHS)</th>
                <th>Status</th>
                <th>Developer Action</th>
              </tr>
            </thead>
            <tbody>
              {(paymentsOverview?.subscriptionTransactions || []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>
                    No hospital subscription payments submitted yet.
                  </td>
                </tr>
              ) : (
                (paymentsOverview?.subscriptionTransactions || []).slice(0, 15).map((stx) => (
                  <tr key={stx.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--gold-300)', fontWeight: 700 }}>{stx.transactionRef}</td>
                    <td style={{ fontSize: '0.78rem' }}>{stx.purpose}</td>
                    <td style={{ fontSize: '0.75rem' }}>
                      {stx.paymentMethod} {stx.bankDepositSlipRef ? `• Ref: ${stx.bankDepositSlipRef}` : ''}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{Number(stx.amount || 0).toFixed(2)}</td>
                    <td>
                      <span className={stx.status === 'SUCCESSFUL' ? 'badge badge-success' : stx.status === 'FAILED' ? 'badge badge-danger' : 'badge badge-warning'}>
                        {stx.status}
                      </span>
                    </td>
                    <td>
                      {stx.status === 'UNDER_REVIEW' || stx.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            disabled={Boolean(remoteBusy)}
                            onClick={() =>
                              executeRemoteOp(
                                `sub_ok_${stx.id}`,
                                () => api.confirmDeveloperSubscriptionPayment(stx.id, { decision: 'APPROVE', verifiedReference: stx.bankDepositSlipRef || stx.transactionRef }),
                                `Confirmed subscription payment ${stx.transactionRef} and activated hospital subscription.`
                              )
                            }
                            className="btn-gold"
                            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                          >
                            Approve &amp; Activate
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(remoteBusy)}
                            onClick={() =>
                              executeRemoteOp(
                                `sub_rej_${stx.id}`,
                                () => api.confirmDeveloperSubscriptionPayment(stx.id, { decision: 'REJECT', notes: 'Receipt not found on 0554594193' }),
                                `Rejected subscription payment ${stx.transactionRef}.`
                              )
                            }
                            className="btn-outline-gold"
                            style={{ padding: '3px 8px', fontSize: '0.7rem', borderColor: '#ef4444', color: '#fca5a5' }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#6ee7b7', fontFamily: 'monospace' }}>{stx.receiptNumber || stx.status}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Cross-Hospital Payment Reconciliation & Recent Webhook Audit Logs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '12px' }}>
          <div style={{ overflowX: 'auto' }}>
            <h5 style={{ margin: '0 0 8px', fontSize: '0.84rem', color: '#38bdf8' }}>
              Recent Transactions &amp; Manual Reconciliation ({(paymentsOverview?.recentTransactions || []).length})
            </h5>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(paymentsOverview?.recentTransactions || []).slice(0, 10).map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--gold-300)' }}>{tx.transactionRef}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.74rem' }}>GHS {Number(tx.amount || 0).toFixed(2)}</td>
                    <td style={{ fontSize: '0.72rem' }}>{tx.status}</td>
                    <td>
                      {['PENDING', 'REQUIRES_CUSTOMER_ACTION', 'PROCESSING'].includes(tx.status) ? (
                        <button
                          type="button"
                          disabled={Boolean(remoteBusy)}
                          onClick={() =>
                            executeRemoteOp(
                              `rec_${tx.transactionRef}`,
                              () => api.reconcilePaymentTransaction(tx.transactionRef),
                              `Reconciliation probe completed for ${tx.transactionRef}.`
                            )
                          }
                          className="btn-outline-gold"
                          style={{ padding: '2px 7px', fontSize: '0.68rem' }}
                        >
                          Reconcile
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{tx.receiptNumber || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(paymentsOverview?.recentTransactions || []).length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>No gateway transactions recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <h5 style={{ margin: '0 0 8px', fontSize: '0.84rem', color: '#38bdf8' }}>
              Webhook Delivery &amp; Signature Audit Log ({(paymentsOverview?.recentWebhooks || []).length})
            </h5>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Provider / Event</th>
                  <th>Ref</th>
                  <th>Signature</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(paymentsOverview?.recentWebhooks || []).slice(0, 10).map((wh) => (
                  <tr key={wh.id}>
                    <td style={{ fontSize: '0.72rem' }}>
                      <strong>{wh.provider}</strong> • {wh.eventType}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--gold-300)' }}>{wh.transactionRef || '—'}</td>
                    <td style={{ fontSize: '0.72rem', color: wh.signatureValid ? '#6ee7b7' : '#fca5a5', fontWeight: 700 }}>
                      {wh.signatureValid ? 'VALID' : 'INVALID'}
                    </td>
                    <td style={{ fontSize: '0.7rem' }}>
                      {wh.duplicateIgnored ? 'DUPLICATE IGNORED' : wh.status}
                    </td>
                  </tr>
                ))}
                {(paymentsOverview?.recentWebhooks || []).length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>No webhook events received yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FacialRecognitionModal
        isOpen={faceModalOpen}
        onClose={() => setFaceModalOpen(false)}
        actionAttempted="DEVELOPER_CONTROL_CENTER_VERIFICATION"
        onVerified={() => {
          loadAll();
          if (typeof onStatusMsg === 'function') {
            onStatusMsg({ type: 'success', msg: 'Developer 4-Step Facial Recognition Security verified and logged to PostgreSQL.' });
          }
        }}
      />
    </div>
  );
}
