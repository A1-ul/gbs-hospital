import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import { Radio, PlusCircle, RefreshCw, Search, CheckCircle, Eye, FileText } from 'lucide-react';

export default function RadiologyPacsView({ onNavigateDetail }) {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [orderForm, setOrderForm] = useState({
    modality: 'X_RAY',
    studyName: 'Chest X-Ray (PA & Lateral)',
    bodyPart: 'CHEST',
    priority: 'ROUTINE',
    clinicalIndication: ''
  });
  const [reportingOrderId, setReportingOrderId] = useState(null);
  const [reportForm, setReportForm] = useState({
    findings: '',
    impression: '',
    criticalFinding: false
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadData = async () => {
    try {
      const [s, o, p] = await Promise.all([
        api.getRadiologyStats().catch(() => null),
        api.getRadiologyOrders().catch(() => []),
        api.searchMPI(patientSearch).catch(() => [])
      ]);
      setStats(s);
      setOrders(Array.isArray(o) ? o : (o?.orders || o?.items || []));
      setPatients(Array.isArray(p) ? p : (p?.patients || p?.data || []));
    } catch (_e) { }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOrderImaging = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setFeedback({ type: 'error', msg: 'Select a patient before requesting a diagnostic imaging scan.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      await api.orderRadiology({
        patientId: selectedPatient.id,
        modality: orderForm.modality,
        studyName: orderForm.studyName,
        examName: orderForm.studyName,
        bodyPart: orderForm.bodyPart,
        priority: orderForm.priority,
        clinicalIndication: orderForm.clinicalIndication || 'Diagnostic imaging workup'
      });
      setFeedback({ type: 'success', msg: `Imaging order (${orderForm.studyName}) created in PACS worklist.` });
      setOrderForm((prev) => ({ ...prev, clinicalIndication: '' }));
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAcquireDicom = async (orderId) => {
    try {
      await api.acquireDicomStudy(orderId, {
        seriesCount: 3,
        imageCount: 48,
        stationName: 'GBS-PACS-SCANNER-01',
        pacsNotes: 'DICOM study ingested and verified for radiologist interpretation'
      });
      setFeedback({ type: 'success', msg: 'DICOM study acquired and indexed in PACS archive.' });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportingOrderId) return;
    setLoading(true);
    try {
      await api.submitRadiologyReport(reportingOrderId, reportForm);
      setFeedback({ type: 'success', msg: 'Radiology diagnostic report signed and saved to PostgreSQL.' });
      setReportingOrderId(null);
      setReportForm({ findings: '', impression: '', criticalFinding: false });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real-Life Radiology/PACS Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/radiology_pacs_mri_real.jpg"
          alt="Radiology & PACS MRI/CT Suite"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 15%, rgba(6,12,24,0.35) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/assets/images/portrait_radiologist.jpg"
              alt="Radiologist"
              style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold-400)' }}
            />
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gold-300)', fontWeight: 700, textTransform: 'uppercase' }}>
                Dedicated Portal • Radiologist &amp; PACS Imaging
              </span>
              <h2 className="header-3d" style={{ fontSize: '1.5rem', margin: '2px 0' }}>
                Radiology, MRI / CT / X-Ray &amp; DICOM PACS Worklist
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Imaging requests, DICOM study acquisition, radiation safety tracking, and signed radiology reports.
              </p>
            </div>
          </div>
          <button type="button" onClick={loadData} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={14} /> Refresh PACS Worklist
          </button>
        </div>
      </div>

      {/* Live Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total Imaging Orders</div>
            <div className="metric-value">{stats?.totalOrders ?? orders.length}</div>
          </div>
          <Radio size={20} style={{ color: 'var(--gold-400)' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>DICOM Studies Indexed</div>
            <div className="metric-value" style={{ color: '#38bdf8' }}>{stats?.totalStudies ?? stats?.studiesCount ?? 0}</div>
          </div>
          <FileText size={20} style={{ color: '#38bdf8' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Signed Reports</div>
            <div className="metric-value" style={{ color: '#10b981' }}>{stats?.reportedOrders ?? stats?.totalReports ?? 0}</div>
          </div>
          <CheckCircle size={20} style={{ color: '#10b981' }} />
        </div>
      </div>

      {feedback && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: `4px solid ${feedback.type === 'error' ? '#ef4444' : '#10b981'}`, color: feedback.type === 'error' ? '#fca5a5' : '#6ee7b7', fontSize: '0.84rem' }}>
          {feedback.msg}
        </div>
      )}

      {/* New Imaging Request */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--gold-400)' }}>Request Imaging Study</h3>
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

        <form onSubmit={handleOrderImaging} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Modality *</label>
            <select value={orderForm.modality} onChange={(e) => setOrderForm({ ...orderForm, modality: e.target.value })}>
              <option value="X_RAY">Digital X-Ray</option>
              <option value="CT">CT Scan</option>
              <option value="MRI">MRI</option>
              <option value="ULTRASOUND">Ultrasound / Doppler</option>
              <option value="MAMMOGRAPHY">Mammography</option>
              <option value="FLUOROSCOPY">Fluoroscopy</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Study Name *</label>
            <input required type="text" value={orderForm.studyName} onChange={(e) => setOrderForm({ ...orderForm, studyName: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Body Region</label>
            <input type="text" value={orderForm.bodyPart} onChange={(e) => setOrderForm({ ...orderForm, bodyPart: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Clinical Indication</label>
            <input type="text" value={orderForm.clinicalIndication} onChange={(e) => setOrderForm({ ...orderForm, clinicalIndication: e.target.value })} placeholder="Rule out pneumonia / fracture..." />
          </div>
          <button type="submit" disabled={loading} className="btn-gold">
            <PlusCircle size={15} /> {loading ? 'Creating...' : 'Order Scan'}
          </button>
        </form>
      </div>

      {/* Inline Radiologist Report Authoring */}
      {reportingOrderId && (
        <div className="glass-panel" style={{ padding: '18px', border: '1px solid var(--gold-400)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ color: 'var(--gold-400)' }}>Sign Diagnostic Radiology Report</strong>
            <button type="button" onClick={() => setReportingOrderId(null)} className="btn-outline-gold" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>Cancel</button>
          </div>
          <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <textarea required rows={2} placeholder="Detailed Imaging Findings..." value={reportForm.findings} onChange={(e) => setReportForm({ ...reportForm, findings: e.target.value })} />
            <input required type="text" placeholder="Diagnostic Impression / Conclusion..." value={reportForm.impression} onChange={(e) => setReportForm({ ...reportForm, impression: e.target.value })} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#fca5a5' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={reportForm.criticalFinding} onChange={(e) => setReportForm({ ...reportForm, criticalFinding: e.target.checked })} />
              Flag as Critical / Urgent Radiological Finding
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={loading} className="btn-gold">Sign &amp; Release Report</button>
            </div>
          </form>
        </div>
      )}

      {/* PACS Worklist Table */}
      <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '0.98rem', color: 'var(--gold-400)' }}>
          Radiology Orders &amp; DICOM PACS Studies ({orders.length})
        </h3>
        {orders.length === 0 ? (
          <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>No radiology imaging orders recorded yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Modality</th>
                <th>Study</th>
                <th>Patient</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 30).map((ord) => (
                <tr key={ord.id}>
                  <td><span className="badge badge-cyan">{ord.modality}</span></td>
                  <td style={{ fontWeight: 700 }}>{ord.studyName || ord.examName || ord.procedureName}</td>
                  <td>{ord.patient ? `${ord.patient.firstName} ${ord.patient.lastName}` : (ord.patientName || 'Patient')}</td>
                  <td><span className="badge badge-gold">{ord.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['ORDERED', 'SCHEDULED'].includes(ord.status) && (
                        <button type="button" onClick={() => handleAcquireDicom(ord.id)} className="btn-outline-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                          Acquire DICOM
                        </button>
                      )}
                      {ord.status !== 'REPORTED' && ord.status !== 'VERIFIED' && (
                        <button type="button" onClick={() => setReportingOrderId(ord.id)} className="btn-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                          Write Report
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onNavigateDetail && onNavigateDetail({ detailType: 'VIEW_DETAILS', moduleKey: 'RADIOLOGY', recordId: ord.id, title: `Imaging — ${ord.studyName || ord.modality}`, recordData: ord })}
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
