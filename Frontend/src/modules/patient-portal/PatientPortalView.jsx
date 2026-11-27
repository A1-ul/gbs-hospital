import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import { User, RefreshCw, Activity, Pill, CreditCard, Shield, FileText } from 'lucide-react';

export default function PatientPortalView({ onNavigateDetail }) {
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPortal = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyPatientDashboard();
      setDossier(data);
    } catch (err) {
      setError(err.message || 'Please sign in to view your personal Patient Health Portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortal();
  }, []);

  const pat = dossier?.patient || dossier?.profile || null;
  const patDisplayName = pat?.fullName || [pat?.firstName, pat?.lastName].filter(Boolean).join(' ').trim();
  const encounters = dossier?.recentEncounters || dossier?.encounters || [];
  const prescriptions = dossier?.prescriptions || dossier?.activeMedications || [];
  const bills = dossier?.bills || dossier?.invoices || [];
  const allergies = dossier?.allergies || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real-Life Patient Portal Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/hospital_hero_exterior.jpg"
          alt="GBS Patient Self-Service Health Portal"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 15%, rgba(6,12,24,0.35) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/assets/images/portrait_patient.jpg"
              alt="Patient Portal"
              style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold-400)' }}
            />
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gold-300)', fontWeight: 700, textTransform: 'uppercase' }}>
                Personal Self-Service Portal • Patient Health Records
              </span>
              <h2 className="header-3d" style={{ fontSize: '1.5rem', margin: '2px 0' }}>
                {patDisplayName ? `Welcome, ${patDisplayName}` : 'Patient Self-Service Health Portal'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                {pat
                  ? `MRN: ${pat.patientNumber || pat.mrn} • Blood Group: ${pat.bloodGroup || 'On File'} • Archive Folder: ${pat.folder?.folderNumber || 'Assigned'}`
                  : 'Access your visits, doctor notes, prescriptions, lab results, allergy safety alerts, and hospital bills.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={loadPortal} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={14} /> Refresh My Records
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid #ef4444', color: '#fca5a5', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && dossier && dossier.linked === false && (
        <div className="glass-panel" style={{ padding: '14px 18px', borderLeft: '4px solid var(--gold-400)', color: 'var(--gold-300)', fontSize: '0.84rem' }}>
          {dossier.message || 'No patient record is linked to this account yet. Please register at hospital reception.'}
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading live patient health records from PostgreSQL...
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
            <div className="metric-card">
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Hospital Visits</div>
                <div className="metric-value">{encounters.length}</div>
              </div>
              <Activity size={20} style={{ color: 'var(--gold-400)' }} />
            </div>
            <div className="metric-card">
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Prescriptions</div>
                <div className="metric-value" style={{ color: '#38bdf8' }}>{prescriptions.length}</div>
              </div>
              <Pill size={20} style={{ color: '#38bdf8' }} />
            </div>
            <div className="metric-card">
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Documented Allergies</div>
                <div className="metric-value" style={{ color: '#ef4444' }}>{allergies.length}</div>
              </div>
              <Shield size={20} style={{ color: '#ef4444' }} />
            </div>
            <div className="metric-card">
              <div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Invoices &amp; Statements</div>
                <div className="metric-value" style={{ color: '#10b981' }}>{bills.length}</div>
              </div>
              <CreditCard size={20} style={{ color: '#10b981' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '18px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.98rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} /> Recent Clinical Encounters ({encounters.length})
              </h3>
              {encounters.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No clinical visits recorded yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {encounters.slice(0, 6).map((enc) => (
                    <div key={enc.id} style={{ padding: '10px', borderRadius: '6px', background: 'rgba(6,12,24,0.7)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{enc.encounterNumber} • {enc.encounterType}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{enc.chiefComplaint || 'Routine Hospital Visit'} • {enc.status}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateDetail && onNavigateDetail({ detailType: 'VIEW_DETAILS', moduleKey: 'PATIENT_PORTAL', recordId: enc.id, title: `Visit ${enc.encounterNumber}`, recordData: enc })}
                        className="btn-outline-gold"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.98rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} /> Personal Health Profile &amp; Safety Alerts
              </h3>
              {pat ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Full Name:</span> <strong>{pat.firstName} {pat.lastName}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>MRN:</span> <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>{pat.patientNumber || pat.mrn}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <strong>{pat.phone || '—'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>NHIS #:</span> <strong>{pat.nhisNumber || 'Self-Pay'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Blood Group:</span> <strong>{pat.bloodGroup || 'Not recorded'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Genotype:</span> <strong>{pat.genotype || 'Not recorded'}</strong></div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{dossier?.message || 'No patient profile linked yet.'}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
