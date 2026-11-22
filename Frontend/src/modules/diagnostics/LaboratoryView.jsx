import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import { FlaskConical, PlusCircle, RefreshCw, Search, CheckCircle, AlertTriangle, Eye } from 'lucide-react';

export default function LaboratoryView({ onNavigateDetail }) {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [orderForm, setOrderForm] = useState({
    testName: 'Full Blood Count (FBC)',
    testCode: 'LAB-FBC',
    specimenType: 'WHOLE_BLOOD_EDTA',
    priority: 'ROUTINE',
    clinicalNotes: ''
  });
  const [resultEntryId, setResultEntryId] = useState(null);
  const [resultForm, setResultForm] = useState({
    parameterName: 'Hemoglobin',
    resultValue: '13.4',
    unit: 'g/dL',
    referenceRange: '12.0 - 16.0',
    flag: 'NORMAL',
    interpretation: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadData = async () => {
    try {
      const [s, r, p] = await Promise.all([
        api.getLabStats().catch(() => null),
        api.getLabRequests().catch(() => []),
        api.searchMPI(patientSearch).catch(() => [])
      ]);
      setStats(s);
      setRequests(Array.isArray(r) ? r : (r?.requests || r?.items || []));
      setPatients(Array.isArray(p) ? p : (p?.patients || p?.data || []));
    } catch (_e) { }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOrderLab = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setFeedback({ type: 'error', msg: 'Please select a patient first to order a laboratory test.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.orderLabTest({
        patientId: selectedPatient.id,
        ...orderForm
      });
      setFeedback({ type: 'success', msg: `Lab investigation ordered (${res?.requestNumber || res?.id || 'Logged'}) for ${selectedPatient.firstName} ${selectedPatient.lastName}.` });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCollectSample = async (reqId) => {
    try {
      const res = await api.collectLabSample(reqId, { specimenType: 'BLOOD', collectedNotes: 'Barcode labeled at phlebotomy station' });
      setFeedback({ type: 'success', msg: `Specimen collected cleanly (Barcode: ${res?.sampleBarcode || res?.barcode || 'Generated'}).` });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleSubmitResult = async (e) => {
    e.preventDefault();
    if (!resultEntryId) return;
    setLoading(true);
    try {
      await api.enterLabResults(resultEntryId, {
        results: [
          {
            parameterName: resultForm.parameterName,
            value: resultForm.resultValue,
            resultValue: resultForm.resultValue,
            unit: resultForm.unit,
            referenceRange: resultForm.referenceRange,
            flag: resultForm.flag
          }
        ],
        interpretation: resultForm.interpretation || 'Verified by laboratory scientist'
      });
      setFeedback({ type: 'success', msg: 'Laboratory test result saved cleanly to PostgreSQL.' });
      setResultEntryId(null);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLab = async (reqId) => {
    try {
      await api.verifyLabResults(reqId, { verificationNotes: 'Quality control verified and released to clinician' });
      setFeedback({ type: 'success', msg: 'Lab result clinically verified and released.' });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real-Life Laboratory Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/laboratory_pathology_real.jpg"
          alt="Laboratory & Pathology Diagnostics"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 15%, rgba(6,12,24,0.35) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/assets/images/portrait_lab_scientist.jpg"
              alt="Lab Technician"
              style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold-400)' }}
            />
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gold-300)', fontWeight: 700, textTransform: 'uppercase' }}>
                Dedicated Portal • Laboratory Technician &amp; Pathology
              </span>
              <h2 className="header-3d" style={{ fontSize: '1.5rem', margin: '2px 0' }}>
                Laboratory &amp; Pathology Information System (LIS)
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Test ordering, barcoded specimen collection, automated panic-value flags, and clinical QC release.
              </p>
            </div>
          </div>
          <button type="button" onClick={loadData} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={14} /> Refresh Lab Queue
          </button>
        </div>
      </div>

      {/* Live Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total Lab Orders</div>
            <div className="metric-value">{stats?.totalRequests ?? requests.length}</div>
          </div>
          <FlaskConical size={20} style={{ color: 'var(--gold-400)' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Pending Collection / Analysis</div>
            <div className="metric-value" style={{ color: '#f59e0b' }}>{stats?.pendingRequests ?? stats?.pending ?? 0}</div>
          </div>
          <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Verified &amp; Released</div>
            <div className="metric-value" style={{ color: '#10b981' }}>{stats?.verifiedRequests ?? stats?.completed ?? 0}</div>
          </div>
          <CheckCircle size={20} style={{ color: '#10b981' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Critical / Panic Results</div>
            <div className="metric-value" style={{ color: '#ef4444' }}>{stats?.criticalAlerts ?? stats?.criticalResults ?? 0}</div>
          </div>
          <AlertTriangle size={20} style={{ color: '#ef4444' }} />
        </div>
      </div>

      {feedback && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: `4px solid ${feedback.type === 'error' ? '#ef4444' : '#10b981'}`, color: feedback.type === 'error' ? '#fca5a5' : '#6ee7b7', fontSize: '0.84rem' }}>
          {feedback.msg}
        </div>
      )}

      {/* Order Lab Test Panel */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--gold-400)' }}>Order New Laboratory Test</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search patient name or MRN..." style={{ width: '220px', padding: '6px 10px', fontSize: '0.8rem' }} />
            <button type="button" onClick={loadData} className="btn-outline-gold" style={{ padding: '6px 12px', fontSize: '0.76rem' }}>
              <Search size={13} /> Find
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {patients.slice(0, 8).map((p) => (
            <button key={p.id} type="button" onClick={() => setSelectedPatient(p)} className={selectedPatient?.id === p.id ? 'btn-gold' : 'btn-outline-gold'} style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
              {p.firstName} {p.lastName} ({p.patientNumber || p.mrn})
            </button>
          ))}
        </div>

        <form onSubmit={handleOrderLab} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Test Panel *</label>
            <select value={orderForm.testName} onChange={(e) => setOrderForm({ ...orderForm, testName: e.target.value })}>
              <option value="Full Blood Count (FBC)">Full Blood Count (FBC)</option>
              <option value="Malaria RDT & Blood Film">Malaria RDT &amp; Blood Film</option>
              <option value="Liver Function Test (LFT)">Liver Function Test (LFT)</option>
              <option value="Renal Function (U&E / Creatinine)">Renal Function (U&amp;E / Creatinine)</option>
              <option value="Fasting Blood Glucose & HbA1c">Fasting Blood Glucose &amp; HbA1c</option>
              <option value="Lipid Profile">Lipid Profile</option>
              <option value="Urine R/E & Culture">Urine R/E &amp; Culture</option>
              <option value="High-Sensitivity Troponin I">High-Sensitivity Troponin I</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Priority</label>
            <select value={orderForm.priority} onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}>
              <option value="ROUTINE">ROUTINE</option>
              <option value="URGENT">URGENT</option>
              <option value="STAT">STAT (Emergency)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Clinical Indication</label>
            <input type="text" value={orderForm.clinicalNotes} onChange={(e) => setOrderForm({ ...orderForm, clinicalNotes: e.target.value })} placeholder="Reason for investigation..." />
          </div>
          <button type="submit" disabled={loading} className="btn-gold">
            <PlusCircle size={15} /> {loading ? 'Ordering...' : 'Order Lab Test'}
          </button>
        </form>
      </div>

      {/* Inline Result Entry Modal/Panel */}
      {resultEntryId && (
        <div className="glass-panel" style={{ padding: '18px', border: '1px solid var(--gold-400)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ color: 'var(--gold-400)' }}>Enter Laboratory Result (Request ID: {resultEntryId.slice(0, 8)})</strong>
            <button type="button" onClick={() => setResultEntryId(null)} className="btn-outline-gold" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>Cancel</button>
          </div>
          <form onSubmit={handleSubmitResult} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', alignItems: 'end' }}>
            <input required type="text" placeholder="Analyte / Parameter" value={resultForm.parameterName} onChange={(e) => setResultForm({ ...resultForm, parameterName: e.target.value })} />
            <input required type="text" placeholder="Measured Value" value={resultForm.resultValue} onChange={(e) => setResultForm({ ...resultForm, resultValue: e.target.value })} />
            <input type="text" placeholder="Unit (e.g. g/dL)" value={resultForm.unit} onChange={(e) => setResultForm({ ...resultForm, unit: e.target.value })} />
            <input type="text" placeholder="Reference Range" value={resultForm.referenceRange} onChange={(e) => setResultForm({ ...resultForm, referenceRange: e.target.value })} />
            <select value={resultForm.flag} onChange={(e) => setResultForm({ ...resultForm, flag: e.target.value })}>
              <option value="NORMAL">NORMAL</option>
              <option value="HIGH">HIGH</option>
              <option value="LOW">LOW</option>
              <option value="CRITICAL">CRITICAL / PANIC</option>
            </select>
            <button type="submit" disabled={loading} className="btn-gold">Save Result</button>
          </form>
        </div>
      )}

      {/* Laboratory Worklist Table */}
      <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '0.98rem', color: 'var(--gold-400)' }}>
          Active Laboratory Requests &amp; Sample Tracking ({requests.length})
        </h3>
        {requests.length === 0 ? (
          <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>No laboratory requests recorded yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Patient</th>
                <th>Status</th>
                <th>Sample Barcode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.slice(0, 30).map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{r.testName}</td>
                  <td>{r.patientName || (r.encounter?.patient ? `${r.encounter.patient.firstName} ${r.encounter.patient.lastName}` : 'Hospital Patient')}</td>
                  <td><span className="badge badge-gold">{r.status}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>{r.sample?.barcode || r.barcode || 'Pending Collection'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {r.status === 'REQUESTED' && (
                        <button type="button" onClick={() => handleCollectSample(r.id)} className="btn-outline-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                          Collect Sample
                        </button>
                      )}
                      {['SAMPLE_COLLECTED', 'IN_LAB', 'PROCESSING', 'REQUESTED'].includes(r.status) && (
                        <button type="button" onClick={() => setResultEntryId(r.id)} className="btn-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                          Enter Result
                        </button>
                      )}
                      {r.status === 'RESULT_ENTERED' && (
                        <button type="button" onClick={() => handleVerifyLab(r.id)} className="btn-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                          Verify &amp; Release
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onNavigateDetail && onNavigateDetail({ detailType: 'VIEW_DETAILS', moduleKey: 'LABORATORY', recordId: r.id, title: `Lab Order — ${r.testName}`, recordData: r })}
                        className="btn-outline-gold"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      >
                        <Eye size={12} /> Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
