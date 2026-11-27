import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import FacialRecognitionModal from '../../components/FacialRecognitionModal';
import { Building2, Users, Bed, DollarSign, Shield, RefreshCw, CheckCircle, Activity, ScanFace, Eye } from 'lucide-react';

export default function ExecutiveAdminBiView({ currentRole, onNavigateDetail }) {
  const openDetail = (payload) => {
    const fn = onNavigateDetail || (typeof window !== 'undefined' ? window.gbsNavigateDetail : null);
    if (typeof fn === 'function') fn(payload);
  };
  const [overview, setOverview] = useState(null);
  const [annual, setAnnual] = useState(null);
  const [roleCounts, setRoleCounts] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [guardrails, setGuardrails] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [faceModalOpen, setFaceModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [ov, an, rc, ul, gr] = await Promise.all([
        api.getGlobalOverviewStats().catch(() => null),
        api.getAnnualFinancialReport().catch(() => null),
        api.getCountsByRole().catch(() => null),
        api.getUsers().catch(() => ({ users: [] })),
        api.getSafetyGuardrailsStatus().catch(() => null)
      ]);
      setOverview(ov);
      setAnnual(an);
      setRoleCounts(rc);
      setUsersList(Array.isArray(ul) ? ul : (ul?.users || []));
      setGuardrails(gr);
    } catch (_e) { }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleUser = async (u) => {
    try {
      if (!u.active) {
        await api.approveUser(u.id);
        setFeedback({ type: 'success', msg: `Approved and activated ${u.firstName} ${u.lastName}.` });
      } else {
        await api.setUserStatus(u.id, false);
        setFeedback({ type: 'success', msg: `Deactivated account ${u.firstName} ${u.lastName}.` });
      }
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const isDirector = currentRole === 'HOSPITAL_DIRECTOR';
  const metrics = overview?.metrics || {};
  const fin = annual?.executiveSummary || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Executive / Admin Real-Life Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src={isDirector ? '/assets/images/hospital_director_boardroom_real.jpg' : '/assets/images/hospital_admin_office_real.jpg'}
          alt="Executive BI & Hospital Administration"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 15%, rgba(6,12,24,0.35) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={isDirector ? '/assets/images/portrait_director.jpg' : '/assets/images/portrait_admin.jpg'}
              alt="Hospital Leadership"
              style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold-400)' }}
            />
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gold-300)', fontWeight: 700, textTransform: 'uppercase' }}>
                Executive Decision Center • {isDirector ? 'Hospital Director BI Analytics' : 'Administrator Governance Console'}
              </span>
              <h2 className="header-3d" style={{ fontSize: '1.5rem', margin: '2px 0' }}>
                Executive BI Analytics, Revenue &amp; Staff Governance Console
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Real-time PostgreSQL hospital census, bed utilization, financial performance, safety compliance, and live staff approvals.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setFaceModalOpen(true)} className="btn-gold" style={{ fontSize: '0.78rem' }}>
              <ScanFace size={14} /> 4-Step Facial Security
            </button>
            <button type="button" onClick={loadData} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
              <RefreshCw size={14} /> Refresh Executive BI
            </button>
          </div>
        </div>
      </div>

      {/* Executive KPI Grid (Each Card Opens Its Dedicated Detail Page) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div
          className="metric-card"
          style={{ cursor: 'pointer' }}
          onClick={() => openDetail({ detailType: 'VIEW_PROFILE', moduleKey: 'PATIENTS', recordId: 'all', title: 'Master Patient Index — Registered Patients' })}
        >
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total Registered Patients</div>
            <div className="metric-value">{metrics.totalPatients ?? 0}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--gold-400)', marginTop: '2px' }}>View Directory →</div>
          </div>
          <Users size={20} style={{ color: 'var(--gold-400)' }} />
        </div>
        <div
          className="metric-card"
          style={{ cursor: 'pointer' }}
          onClick={() => openDetail({ detailType: 'VIEW_RECORDS', moduleKey: 'WARDS', recordId: 'admissions-census', title: 'Inpatient Bed Occupancy & Ward Census', recordData: { admissions: metrics.admissions ?? 0, occupiedBeds: metrics.occupiedBeds ?? 0, totalBeds: metrics.totalBeds ?? 0, bedOccupancyRate: metrics.bedOccupancyRate || '0.0%' } })}
        >
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Bed Occupancy Rate</div>
            <div className="metric-value" style={{ color: '#38bdf8' }}>{metrics.bedOccupancyRate || '0.0%'}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--gold-400)', marginTop: '2px' }}>View Census →</div>
          </div>
          <Bed size={20} style={{ color: '#38bdf8' }} />
        </div>
        <div
          className="metric-card"
          style={{ cursor: 'pointer' }}
          onClick={() => openDetail({ detailType: 'VIEW_TRANSACTIONS', moduleKey: 'BILLING', recordId: 'annual-financial', title: 'Executive Annual Financial Summary & Bills', recordData: fin })}
        >
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Annual Hospital Revenue</div>
            <div className="metric-value" style={{ color: '#10b981', fontSize: '1.35rem' }}>
              GHS {Number(fin.totalRevenue ?? fin.totalBilled ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--gold-400)', marginTop: '2px' }}>View Transactions →</div>
          </div>
          <DollarSign size={20} style={{ color: '#10b981' }} />
        </div>
        <div
          className="metric-card"
          style={{ cursor: 'pointer' }}
          onClick={() => openDetail({ detailType: 'VIEW_RECORDS', moduleKey: 'EXECUTIVE_BI', recordId: 'staff-accounts', title: 'All Registered Hospital Staff Accounts', recordData: usersList })}
        >
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Active Staff Accounts</div>
            <div className="metric-value" style={{ color: 'var(--gold-300)' }}>
              {roleCounts?.summary?.totalActiveUsers ?? metrics.activeUsers ?? 0} / {roleCounts?.summary?.totalSystemUsers ?? 0}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--gold-400)', marginTop: '2px' }}>View Staff List →</div>
          </div>
          <Building2 size={20} style={{ color: 'var(--gold-300)' }} />
        </div>
        <div
          className="metric-card"
          style={{ cursor: 'pointer' }}
          onClick={() => openDetail({ detailType: 'VIEW_RECORDS', moduleKey: 'AI_SAFETY', recordId: 'safety-guardrails', title: 'Clinical Safety Overrides & AI Human Reviews' })}
        >
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Safety Overrides / AI Reviews</div>
            <div className="metric-value" style={{ color: '#f59e0b', fontSize: '1.35rem' }}>
              {guardrails?.metrics?.loggedClinicalOverrides ?? 0} • {guardrails?.metrics?.pendingHumanAiReviews ?? 0}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--gold-400)', marginTop: '2px' }}>View Guardrails →</div>
          </div>
          <Shield size={20} style={{ color: '#f59e0b' }} />
        </div>
      </div>

      {feedback && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: `4px solid ${feedback.type === 'error' ? '#ef4444' : '#10b981'}`, color: feedback.type === 'error' ? '#fca5a5' : '#6ee7b7', fontSize: '0.84rem' }}>
          {feedback.msg}
        </div>
      )}

      {/* Role Distribution Breakdown + Staff Approval Governance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '0.96rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} /> Live Department Staff Breakdown (PostgreSQL)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '8px' }}>
            {(roleCounts?.roles || []).map((r) => (
              <div
                key={r.roleName}
                onClick={() => {
                  const matchedUsers = usersList.filter((u) => (u.role?.name || u.role) === r.roleName);
                  openDetail({
                    detailType: 'VIEW_RECORDS',
                    moduleKey: 'EXECUTIVE_BI',
                    recordId: r.roleName,
                    title: `${r.roleName} — Registered Staff Roster`,
                    recordData: matchedUsers.length > 0 ? matchedUsers : r
                  });
                }}
                style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(6,12,24,0.75)', border: '1px solid var(--border-subtle)', fontSize: '0.76rem', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 700, color: '#fff' }}>{r.roleName}</div>
                <div style={{ color: 'var(--gold-400)', fontWeight: 700 }}>{r.totalUsers} total <span style={{ color: '#10b981' }}>({r.activeUsers} active)</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '0.96rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={16} /> Hospital User Approvals &amp; Access Control ({usersList.length})
          </h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Control</th>
              </tr>
            </thead>
            <tbody>
              {usersList.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                    No registered staff accounts available yet.
                  </td>
                </tr>
              ) : (
                usersList.slice(0, 14).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td><span className="badge badge-gold">{u.role?.name || u.role}</span></td>
                    <td><span className={u.active ? 'badge badge-success' : 'badge badge-warning'}>{u.active ? 'ACTIVE' : 'PENDING'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() =>
                            openDetail({
                              detailType: 'VIEW_PROFILE',
                              moduleKey: 'EXECUTIVE_BI',
                              recordId: String(u.id),
                              title: `Staff Profile: ${u.firstName} ${u.lastName}`,
                              recordData: u
                            })
                          }
                          className="btn-outline-gold"
                          style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={11} /> Profile
                        </button>
                        {String(u.email || '').toLowerCase() !== 'gabosei48@gmail.com' && (
                          <button
                            type="button"
                            onClick={() => handleToggleUser(u)}
                            className={u.active ? 'btn-outline-gold' : 'btn-gold'}
                            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                          >
                            {u.active ? 'Deactivate' : 'Approve'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FacialRecognitionModal
        isOpen={faceModalOpen}
        onClose={() => setFaceModalOpen(false)}
        actionAttempted="TENANT_ADMIN_EXECUTIVE_VERIFICATION"
        onVerified={(res) => {
          setFeedback({
            type: 'success',
            msg: `Tenant Admin 4-Step Facial Security verified cleanly (Confidence: ${res.confidenceScore}).`
          });
        }}
      />
    </div>
  );
}
