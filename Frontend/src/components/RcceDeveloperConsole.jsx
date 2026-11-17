import React, { useState, useEffect } from 'react';
import {
  Shield, Activity, Lock, Unlock, Key, AlertTriangle, CheckCircle,
  RefreshCw, FileText, Settings, Eye, EyeOff, Wrench
} from 'lucide-react';
import { api } from '../services/api.service';

export default function RcceDeveloperConsole({ onStatusMsg }) {
  const [subTab, setSubTab] = useState('OVERVIEW'); // OVERVIEW | PRIVACY_GRANTS | PERMISSIONS | ERRORS | AUDITS
  const [overview, setOverview] = useState(null);
  const [usersActivity, setUsersActivity] = useState({ users: [], privacyPolicyApplied: 'REDACTED_BY_DEFAULT', grantCode: null });
  const [includePrivate, setIncludePrivate] = useState(false);
  const [grants, setGrants] = useState([]);
  const [permissionsData, setPermissionsData] = useState({ roles: [], allRoles: [], rolePermissionOverrides: {} });
  const [errorsData, setErrorsData] = useState({ errors: [], unresolvedCount: 0, byCategory: [] });
  const [auditsData, setAuditsData] = useState({ logs: [], integrity: { verifiedCount: 0, integrityIntact: true } });
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
  const [maintenanceMessage, setMaintenanceMessage] = useState('Scheduled system maintenance by GBS Engineering.');

  const notify = (type, msg) => {
    setLocalMsg({ type, msg });
    if (onStatusMsg) onStatusMsg({ type, msg });
  };

  const loadRcce = async (privateFlag = includePrivate) => {
    setLoading(true);
    try {
      const [ov, ua, gr, pm, er, au, cf] = await Promise.all([
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
        api.getRcceErrorLogs().catch(() => ({ errors: [], unresolvedCount: 0, byCategory: [] })),
        api.getRcceAuditLogs().catch(() => ({ logs: [], integrity: { verifiedCount: 0, integrityIntact: true } })),
        api.getRcceConfigs().catch(() => ({ configs: [] }))
      ]);
      if (ov) setOverview(ov);
      if (ua) setUsersActivity(ua);
      if (gr?.grants) setGrants(gr.grants);
      if (pm?.roles) setPermissionsData(pm);
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

  return (
    <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-gold)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--gold-400)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} /> GBS-RCCE Unified Developer & Governance Control Engine
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Central API response enforcement, permission overrides, privacy-guarded user monitoring, error diagnostics & SHA-256 audit log viewer.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadRcce()}
            className="btn-outline-gold"
            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Engine State
          </button>
          <button
            type="button"
            onClick={handleToggleMaintenance}
            className={maintenanceOn ? 'btn-gold' : 'btn-danger'}
            style={{ fontSize: '0.75rem', padding: '5px 12px' }}
          >
            <Wrench size={13} /> {maintenanceOn ? 'Exit Maintenance Mode' : 'Engage Maintenance Mode'}
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
          { id: 'OVERVIEW', label: 'User Activity (Privacy-Guarded)', icon: Activity },
          { id: 'PRIVACY_GRANTS', label: 'Sensitive Access Grants', icon: Key },
          { id: 'PERMISSIONS', label: 'Role Permission Control', icon: Lock },
          { id: 'ERRORS', label: `Error Diagnostics (${errorsData.unresolvedCount || 0})`, icon: AlertTriangle },
          { id: 'AUDITS', label: 'Audit Trail & Events', icon: FileText }
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
              {(errorsData.errors || []).slice(0, 25).map((err) => (
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: AUDIT TRAIL */}
      {subTab === 'AUDITS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.76rem', color: auditsData.integrity?.integrityIntact ? 'var(--status-online)' : '#ef4444', fontWeight: 700 }}>
            Cryptographic Audit Integrity: {auditsData.integrity?.integrityIntact ? 'VERIFIED (SHA-256 Chain Intact)' : 'INTEGRITY ALERT'} • Verified Records: {auditsData.integrity?.verifiedCount ?? 0}
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
                {(auditsData.logs || []).slice(0, 30).map((log) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
