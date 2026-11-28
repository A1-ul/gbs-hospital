import React, { useState, useEffect } from 'react';
import {
  Shield, Activity, Lock, Key, AlertTriangle, CheckCircle,
  RefreshCw, FileText, Settings, Eye, EyeOff, Wrench, Bell, BookOpen, Search
} from 'lucide-react';
import { api } from '../services/api.service';

export default function RcceDeveloperConsole({ onStatusMsg }) {
  const [subTab, setSubTab] = useState('OVERVIEW'); // OVERVIEW | PRIVACY_GRANTS | PERMISSIONS | EVENTS | CATALOGUE | CONFIGS | ERRORS | AUDITS
  const [overview, setOverview] = useState(null);
  const [usersActivity, setUsersActivity] = useState({ users: [], privacyPolicyApplied: 'REDACTED_BY_DEFAULT', grantCode: null });
  const [includePrivate, setIncludePrivate] = useState(false);
  const [grants, setGrants] = useState([]);
  const [permissionsData, setPermissionsData] = useState({ roles: [], allRoles: [], rolePermissionOverrides: {} });
  const [eventsData, setEventsData] = useState({ events: [], queueDepth: 0, realtimeSubscribers: 0 });
  const [catalogueData, setCatalogueData] = useState({ applicationName: 'GBS Hospital Management System', totalCodes: 0, entries: [] });
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [errorsData, setErrorsData] = useState({ errors: [], unresolvedCount: 0, byCategory: [] });
  const [auditsData, setAuditsData] = useState({ logs: [], integrity: { verifiedCount: 0, hashedCount: 0, chainedLinksVerified: 0, integrityIntact: true } });
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localMsg, setLocalMsg] = useState(null);

  const [grantForm, setGrantForm] = useState({
    scope: 'USER_PII_READ',
    reason: '',
    ticketRef: ''
  });
  const [permForm, setPermForm] = useState({
    roleName: 'RECEPTIONIST',
    permission: 'billing:write',
    action: 'REVOKE'
  });
  const [configForm, setConfigForm] = useState({
    configKey: '',
    category: 'GENERAL',
    description: '',
    configValueText: '{}'
  });
  const [maintenanceMessage, setMaintenanceMessage] = useState('Scheduled system maintenance by GBS Engineering.');

  const notify = (type, msg) => {
    setLocalMsg({ type, msg });
    if (onStatusMsg) onStatusMsg({ type, msg });
  };

  const loadRcce = async (privateFlag = includePrivate) => {
    setLoading(true);
    try {
      const [ov, ua, gr, pm, ev, cat, er, au, cf] = await Promise.all([
        api.getRcceDeveloperOverview().catch(() => null),
        api.getRcceUsersActivity(privateFlag).catch((err) => {
          if (privateFlag && err?.code === 'SENSITIVE_ACCESS_RESTRICTED') {
            notify('error', err.message);
            setIncludePrivate(false);
          }
          return null;
        }),
        api.getRcceAccessGrants().catch(() => ({ grants: [] })),
        api.getRccePermissions().catch(() => ({ roles: [], allRoles: [], rolePermissionOverrides: {} })),
        api.getRcceEvents('limit=60').catch(() => ({ events: [], queueDepth: 0, realtimeSubscribers: 0 })),
        api.getRcceCatalogue().catch(() => ({ applicationName: 'GBS Hospital Management System', totalCodes: 0, entries: [] })),
        api.getRcceErrorLogs().catch(() => ({ errors: [], unresolvedCount: 0, byCategory: [] })),
        api.getRcceAuditLogs().catch(() => ({ logs: [], integrity: { verifiedCount: 0, hashedCount: 0, chainedLinksVerified: 0, integrityIntact: true } })),
        api.getRcceConfigs().catch(() => ({ configs: [] }))
      ]);
      if (ov) setOverview(ov);
      if (ua) setUsersActivity(ua);
      if (gr?.grants) setGrants(gr.grants);
      if (pm?.roles) setPermissionsData(pm);
      if (ev?.events) setEventsData(ev);
      if (cat?.entries) setCatalogueData(cat);
      if (er?.errors) setErrorsData(er);
      if (au?.logs) setAuditsData(au);
      if (cf?.configs) setConfigs(cf.configs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRcce(false);
  }, []);

  const handleTogglePrivateView = async () => {
    const next = !includePrivate;
    if (!next) {
      setIncludePrivate(false);
      loadRcce(false);
      return;
    }
    try {
      const res = await api.getRcceUsersActivity(true);
      setUsersActivity(res);
      setIncludePrivate(true);
      notify('success', `Explicit sensitive access verified (${res.grantCode || 'AUTHORIZED'}) and audited.`);
    } catch (err) {
      setIncludePrivate(false);
      notify('error', err.message || 'Sensitive data access denied without an explicit approved grant.');
      loadRcce(false);
    }
  };

  const handleRequestGrant = async (e) => {
    e.preventDefault();
    try {
      const res = await api.requestRcceAccessGrant(grantForm);
      notify('success', `Sensitive Access Request submitted (${res?.grantCode || 'PENDING'}). Requires Administrator approval.`);
      setGrantForm({ scope: 'USER_PII_READ', reason: '', ticketRef: '' });
      loadRcce();
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handleGrantAction = async (id, action) => {
    try {
      if (action === 'APPROVE') {
        await api.approveRcceAccessGrant(id, 60);
        notify('success', 'Sensitive access grant approved for 60 minutes.');
      } else {
        await api.revokeRcceAccessGrant(id);
        notify('success', 'Sensitive access grant revoked.');
      }
      loadRcce();
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handlePermissionChange = async (e) => {
    e.preventDefault();
    try {
      await api.updateRcceRolePermission(permForm);
      notify('success', `Updated permission "${permForm.permission}" (${permForm.action}) for ${permForm.roleName}.`);
      loadRcce();
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handleResolveError = async (id) => {
    try {
      await api.resolveRcceError(id, 'Resolved via GBS-RCCE Developer Control Console.');
      notify('success', 'System error marked as resolved and audited.');
      loadRcce();
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const key = String(configForm.configKey || '').trim().toUpperCase();
    if (!key) {
      notify('error', 'Configuration key is required.');
      return;
    }
    let parsedValue = {};
    try {
      parsedValue = JSON.parse(configForm.configValueText || '{}');
    } catch (_parseErr) {
      notify('error', 'Configuration value must be valid JSON.');
      return;
    }
    try {
      await api.updateRcceConfig(key, {
        configValue: parsedValue,
        category: configForm.category || 'GENERAL',
        description: configForm.description || ''
      });
      notify('success', `Authorized configuration "${key}" saved and audited.`);
      setConfigForm({ configKey: '', category: 'GENERAL', description: '', configValueText: '{}' });
      loadRcce();
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handleToggleMaintenance = async () => {
    const currentlyEnabled = Boolean(overview?.maintenanceMode?.enabled);
    try {
      await api.toggleRcceMaintenanceMode(!currentlyEnabled, maintenanceMessage);
      notify('success', !currentlyEnabled ? 'Authorized Maintenance Mode ENABLED.' : 'Maintenance Mode DISABLED — Normal operations resumed.');
      loadRcce();
    } catch (err) {
      notify('error', err.message);
    }
  };

  const ops = overview?.operations || {};
  const maintenanceOn = Boolean(overview?.maintenanceMode?.enabled);
  const filteredCatalogueEntries = (catalogueData.entries || []).filter((entry) => {
    const q = catalogueSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      String(entry.code || '').toLowerCase().includes(q) ||
      String(entry.category || '').toLowerCase().includes(q) ||
      String(entry.message || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-gold)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.12rem', color: 'var(--gold-400)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} /> System Control, Permissions & Privacy Center
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Check system health, manage who can use each feature, review issues, and protect private staff & patient information.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadRcce()}
            className="btn-outline-gold"
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleToggleMaintenance}
            className={maintenanceOn ? 'btn-gold' : 'btn-danger'}
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
          >
            <Wrench size={13} /> {maintenanceOn ? 'Turn Off Maintenance Mode' : 'Turn On Maintenance Mode'}
          </button>
        </div>
      </div>

      {localMsg && (
        <div
          className="glass-panel"
          style={{
            padding: '10px 14px',
            borderLeft: `4px solid ${localMsg.type === 'error' ? 'var(--status-danger)' : 'var(--status-online)'}`,
            fontSize: '0.8rem',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{localMsg.msg}</span>
          <button type="button" onClick={() => setLocalMsg(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}

      {/* Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>System Status</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: maintenanceOn ? '#f59e0b' : 'var(--status-online)' }}>
            {overview?.status || 'OPERATIONAL'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>DB Latency: {overview?.dbLatencyMs ?? 0}ms</div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unresolved Errors</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: (ops.unresolvedErrors || 0) > 0 ? '#ef4444' : 'var(--status-online)' }}>
            {ops.unresolvedErrors ?? errorsData.unresolvedCount ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Diagnostics captured</div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Audits (24h)</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--gold-300)' }}>
            {ops.recentAudits24h ?? auditsData.logs.length}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>Denied/Failed: {ops.deniedAudits24h ?? 0}</div>
        </div>
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active PII Grants</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
            {overview?.privacyControl?.activeSensitiveGrants ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Pending: {overview?.privacyControl?.pendingSensitiveGrants ?? 0}</div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[
          { id: 'OVERVIEW', label: 'Staff Activity (Private Details Hidden)', icon: Activity },
          { id: 'PRIVACY_GRANTS', label: 'Private Access Requests', icon: Key },
          { id: 'PERMISSIONS', label: 'Role Permissions', icon: Lock },
          { id: 'EVENTS', label: `System Events (${eventsData.events?.length || 0})`, icon: Bell },
          { id: 'CATALOGUE', label: `Response Catalogue (${catalogueData.totalCodes || 0})`, icon: BookOpen },
          { id: 'CONFIGS', label: `Configurations (${configs.length})`, icon: Settings },
          { id: 'ERRORS', label: `System Issues (${errorsData.unresolvedCount || 0})`, icon: AlertTriangle },
          { id: 'AUDITS', label: 'Full Activity Log', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={active ? 'btn-gold' : 'btn-outline-gold'}
              style={{ fontSize: '0.74rem', padding: '5px 10px' }}
            >
              <Icon size={13} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB: USER ACTIVITY WITH PRIVACY BOUNDARY */}
      {subTab === 'OVERVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', background: 'rgba(6,12,24,0.65)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Privacy Mode: <strong style={{ color: includePrivate ? '#10b981' : '#fcd34d' }}>{usersActivity.privacyPolicyApplied}</strong>
              {usersActivity.grantCode && <span> • Grant: {usersActivity.grantCode}</span>}
            </div>
            <button
              type="button"
              onClick={handleTogglePrivateView}
              className="btn-outline-gold"
              style={{ fontSize: '0.74rem', padding: '4px 10px' }}
            >
              {includePrivate ? <EyeOff size={13} /> : <Eye size={13} />}
              {includePrivate ? 'Re-Apply PII Redaction' : 'Request Unmasked PII (Requires Explicit Grant)'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Identity</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Email (Privacy-Scoped)</th>
                  <th>Audit Actions</th>
                  <th>Redaction State</th>
                </tr>
              </thead>
              <tbody>
                {(usersActivity.users || []).slice(0, 15).map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{u.name}</td>
                    <td>{u.role}</td>
                    <td style={{ color: u.active ? 'var(--status-online)' : '#f59e0b' }}>{u.status}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{u.email}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{u.activityCount ?? 0}</td>
                    <td>
                      <span style={{ fontSize: '0.7rem', color: u.privacyRedacted ? '#fcd34d' : '#10b981' }}>
                        {u.privacyRedacted ? 'MASKED (Default)' : 'GRANTED / RBAC'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: EXPLICIT SENSITIVE ACCESS GRANTS */}
      {subTab === 'PRIVACY_GRANTS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <form onSubmit={handleRequestGrant} style={{ background: 'rgba(6,12,24,0.75)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--gold-400)' }}>
              Request Explicit Sensitive Data Access Grant
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Developer status alone never unlocks private user/patient PII. Submit a scoped ticket requiring Hospital Administrator approval.
            </p>
            <select
              value={grantForm.scope}
              onChange={(e) => setGrantForm({ ...grantForm, scope: e.target.value })}
              style={{ padding: '8px', background: '#060c18', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
            >
              <option value="USER_PII_READ">USER_PII_READ (User Contact Details)</option>
              <option value="PATIENT_RECORDS_READ">PATIENT_RECORDS_READ (Clinical Incident Debug)</option>
              <option value="FINANCIAL_DETAILS_READ">FINANCIAL_DETAILS_READ (Ledger Investigation)</option>
              <option value="FULL_DIAGNOSTIC_SUPPORT">FULL_DIAGNOSTIC_SUPPORT (Time-Bounded Break-Glass)</option>
            </select>
            <input
              type="text"
              placeholder="Ticket Reference (e.g. INC-2026-441)"
              value={grantForm.ticketRef}
              onChange={(e) => setGrantForm({ ...grantForm, ticketRef: e.target.value })}
              style={{ padding: '8px', background: '#060c18', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
            />
            <textarea
              required
              rows={2}
              placeholder="Technical justification reason *"
              value={grantForm.reason}
              onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
              style={{ padding: '8px', background: '#060c18', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
            />
            <button type="submit" className="btn-gold" style={{ alignSelf: 'flex-end', fontSize: '0.78rem' }}>
              Submit Access Request
            </button>
          </form>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Grant Code</th>
                  <th>Scope</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>{g.grantCode}</td>
                    <td>{g.scope}</td>
                    <td style={{ fontSize: '0.74rem' }}>{g.reason}</td>
                    <td style={{ fontWeight: 700, color: g.status === 'APPROVED' ? 'var(--status-online)' : g.status === 'PENDING' ? '#f59e0b' : '#ef4444' }}>
                      {g.status}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {g.status === 'PENDING' && (
                          <button type="button" onClick={() => handleGrantAction(g.id, 'APPROVE')} className="btn-gold" style={{ padding: '3px 7px', fontSize: '0.68rem' }}>
                            Approve (Admin)
                          </button>
                        )}
                        {g.status !== 'REVOKED' && (
                          <button type="button" onClick={() => handleGrantAction(g.id, 'REVOKE')} className="btn-danger" style={{ padding: '3px 7px', fontSize: '0.68rem' }}>
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PERMISSION MANAGER */}
      {subTab === 'PERMISSIONS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <form onSubmit={handlePermissionChange} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target Role</label>
              <select
                value={permForm.roleName}
                onChange={(e) => setPermForm({ ...permForm, roleName: e.target.value })}
                style={{ width: '100%', padding: '8px', background: '#060c18', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
              >
                {(permissionsData.allRoles || []).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Permission Token (module:read|write|*)</label>
              <input
                required
                type="text"
                value={permForm.permission}
                onChange={(e) => setPermForm({ ...permForm, permission: e.target.value })}
                style={{ width: '100%', padding: '8px', background: '#060c18', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Policy Action</label>
              <select
                value={permForm.action}
                onChange={(e) => setPermForm({ ...permForm, action: e.target.value })}
                style={{ width: '100%', padding: '8px', background: '#060c18', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
              >
                <option value="REVOKE">REVOKE (Restrict Access)</option>
                <option value="GRANT">GRANT (Restore Access)</option>
              </select>
            </div>
            <button type="submit" className="btn-gold" style={{ padding: '8px 14px' }}>
              Apply Policy
            </button>
          </form>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Base Permissions</th>
                  <th>Dynamic Revocations</th>
                </tr>
              </thead>
              <tbody>
                {(permissionsData.roles || []).map((r) => (
                  <tr key={r.id || r.name}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)' }}>{r.name}</td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(r.permissions || []).slice(0, 6).join(', ')}{(r.permissions || []).length > 6 ? ` (+${r.permissions.length - 6})` : ''}</td>
                    <td style={{ fontSize: '0.72rem', color: '#fca5a5' }}>{(r.overrides?.revoked || []).join(', ') || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: SYSTEM EVENTS & REAL-TIME NOTIFICATION QUEUE */}
      {subTab === 'EVENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', background: 'rgba(6,12,24,0.65)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Event Queue Depth: <strong style={{ color: 'var(--gold-300)' }}>{eventsData.queueDepth ?? 0}</strong> • Real-Time SSE Subscribers: <strong style={{ color: 'var(--status-online)' }}>{eventsData.realtimeSubscribers ?? 0}</strong>
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
              Showing latest {(eventsData.events || []).length} persisted domain events
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Domain</th>
                  <th>Event Code</th>
                  <th>Actor Role</th>
                  <th>Affected Record</th>
                  <th>Severity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(eventsData.events || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '16px' }}>
                      No records available
                    </td>
                  </tr>
                ) : (
                  (eventsData.events || []).slice(0, 40).map((ev) => (
                    <tr key={ev.id}>
                      <td style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>{new Date(ev.createdAt).toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: 'var(--gold-300)' }}>{ev.domain}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>{ev.eventCode}</td>
                      <td>{ev.actorRole || 'SYSTEM'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{ev.affectedRecord || '—'}</td>
                      <td style={{ fontWeight: 700, color: ev.severity === 'CRITICAL' ? '#ef4444' : ev.severity === 'WARNING' ? '#f59e0b' : 'var(--status-online)' }}>
                        {ev.severity || 'INFO'}
                      </td>
                      <td>{ev.status || 'PROCESSED'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PREDEFINED RESPONSE CATALOGUE */}
      {subTab === 'CATALOGUE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Active Application: <strong style={{ color: 'var(--gold-300)' }}>{catalogueData.applicationName}</strong> • Registered Predefined Codes: <strong style={{ color: '#fff' }}>{catalogueData.totalCodes || 0}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#060c18', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '4px 10px' }}>
              <Search size={13} style={{ color: 'var(--gold-400)' }} />
              <input
                type="text"
                aria-label="Filter response catalogue"
                placeholder="Search code, category, or message..."
                value={catalogueSearch}
                onChange={(e) => setCatalogueSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.76rem', outline: 'none', minWidth: '210px' }}
              />
            </div>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '360px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>HTTP</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Predefined User Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalogueEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '16px' }}>
                      No records available
                    </td>
                  </tr>
                ) : (
                  filteredCatalogueEntries.map((entry) => (
                    <tr key={entry.code}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-300)', fontSize: '0.74rem' }}>{entry.code}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{entry.httpStatus}</td>
                      <td>{entry.category}</td>
                      <td style={{ fontWeight: 700, color: entry.severity === 'CRITICAL' || entry.severity === 'ERROR' ? '#ef4444' : entry.severity === 'WARNING' ? '#f59e0b' : 'var(--status-online)' }}>
                        {entry.severity}
                      </td>
                      <td style={{ fontSize: '0.76rem' }}>{entry.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: AUTHORIZED SYSTEM CONFIGURATIONS & MAINTENANCE NOTICE */}
      {subTab === 'CONFIGS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'rgba(6,12,24,0.75)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--gold-400)' }}>
              Maintenance Window Notice Message
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                aria-label="Maintenance mode message"
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                style={{ flex: 1, minWidth: '240px', padding: '8px', background: '#060c18', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', fontSize: '0.78rem' }}
              />
              <button
                type="button"
                onClick={handleToggleMaintenance}
                className={maintenanceOn ? 'btn-gold' : 'btn-danger'}
                style={{ fontSize: '0.76rem', padding: '6px 14px' }}
              >
                <Wrench size={13} /> {maintenanceOn ? 'Resume Normal Operations' : 'Activate Maintenance Mode'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} style={{ background: 'rgba(6,12,24,0.75)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Config Key *</label>
              <input
                required
                type="text"
                placeholder="e.g. SESSION_TIMEOUT_POLICY"
                value={configForm.configKey}
                onChange={(e) => setConfigForm({ ...configForm, configKey: e.target.value })}
                style={{ width: '100%', padding: '8px', background: '#060c18', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Category</label>
              <select
                value={configForm.category}
                onChange={(e) => setConfigForm({ ...configForm, category: e.target.value })}
                style={{ width: '100%', padding: '8px', background: '#060c18', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
              >
                <option value="GENERAL">GENERAL</option>
                <option value="SECURITY">SECURITY</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="OPERATIONS">OPERATIONS</option>
                <option value="NOTIFICATIONS">NOTIFICATIONS</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Description</label>
              <input
                type="text"
                placeholder="Purpose of configuration"
                value={configForm.description}
                onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                style={{ width: '100%', padding: '8px', background: '#060c18', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>JSON Value *</label>
              <input
                required
                type="text"
                placeholder='{"enabled": true}'
                value={configForm.configValueText}
                onChange={(e) => setConfigForm({ ...configForm, configValueText: e.target.value })}
                style={{ width: '100%', padding: '8px', background: '#060c18', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <button type="submit" className="btn-gold" style={{ padding: '8px 14px', fontSize: '0.78rem' }}>
              Save Configuration
            </button>
          </form>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Config Key</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Value</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {configs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '16px' }}>
                      No records available
                    </td>
                  </tr>
                ) : (
                  configs.map((cfg) => (
                    <tr key={cfg.id || cfg.configKey}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold-300)', fontSize: '0.74rem' }}>{cfg.configKey}</td>
                      <td>{cfg.category || 'GENERAL'}</td>
                      <td style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{cfg.description || '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', maxWidth: '280px', wordBreak: 'break-word' }}>
                        {typeof cfg.configValue === 'object' ? JSON.stringify(cfg.configValue) : String(cfg.configValue ?? '')}
                      </td>
                      <td style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                        {cfg.updatedAt ? new Date(cfg.updatedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: ERROR DIAGNOSTICS */}
      {subTab === 'ERRORS' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Category</th>
                <th>Code & HTTP</th>
                <th>Path</th>
                <th>Technical Diagnostic</th>
                <th>Status / Action</th>
              </tr>
            </thead>
            <tbody>
              {(errorsData.errors || []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '16px' }}>
                    No records available
                  </td>
                </tr>
              ) : (
                (errorsData.errors || []).slice(0, 25).map((err) => (
                  <tr key={err.id}>
                    <td style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>{new Date(err.createdAt).toLocaleString()}</td>
                    <td>{err.errorCategory}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#fca5a5' }}>{err.code} ({err.httpStatus})</td>
                    <td style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}>{err.method} {err.path}</td>
                    <td style={{ fontSize: '0.74rem', maxWidth: '300px' }}>{err.technicalMessage}</td>
                    <td>
                      {err.resolved ? (
                        <span style={{ color: 'var(--status-online)', fontSize: '0.72rem', fontWeight: 700 }}>
                          <CheckCircle size={12} /> Resolved
                        </span>
                      ) : (
                        <button type="button" onClick={() => handleResolveError(err.id)} className="btn-outline-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                          Mark Resolved
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: AUDIT TRAIL */}
      {subTab === 'AUDITS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.76rem', color: auditsData.integrity?.integrityIntact ? 'var(--status-online)' : '#ef4444', fontWeight: 700 }}>
            Cryptographic Audit Integrity: {auditsData.integrity?.integrityIntact ? 'VERIFIED (SHA-256 Chain Intact)' : 'INTEGRITY ALERT'} • Verified Records: {auditsData.integrity?.verifiedCount ?? 0} • Hashed: {auditsData.integrity?.hashedCount ?? 0} • Linked Chain Steps: {auditsData.integrity?.chainedLinksVerified ?? 0}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Role</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Affected Record</th>
                  <th>Outcome</th>
                  <th>Request Ref</th>
                </tr>
              </thead>
              <tbody>
                {(auditsData.logs || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '16px' }}>
                      No records available
                    </td>
                  </tr>
                ) : (
                  (auditsData.logs || []).slice(0, 30).map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>{log.role || 'SYSTEM'}</td>
                      <td>{log.module}</td>
                      <td style={{ fontSize: '0.74rem' }}>{log.action}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{log.affectedRecord || '—'}</td>
                      <td style={{ fontWeight: 700, color: log.outcome === 'SUCCESS' ? 'var(--status-online)' : log.outcome === 'DUPLICATE_REPLAY' ? '#fcd34d' : '#ef4444' }}>
                        {log.outcome || 'SUCCESS'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{log.requestId ? log.requestId.slice(0, 8) : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
