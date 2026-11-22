import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import { Eye, PlusCircle, RefreshCw, Search, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

export default function EyeClinicView({ onNavigateDetail }) {
  const [telemetry, setTelemetry] = useState(null);
  const [exams, setExams] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [form, setForm] = useState({
    chiefComplaint: '',
    visualAcuityOD: '6/6',
    visualAcuityOS: '6/9',
    visualAcuityCorrectedOD: '6/6',
    visualAcuityCorrectedOS: '6/6',
    iopRightMmHg: '15',
    iopLeftMmHg: '16',
    odSphere: '-0.50',
    odCylinder: '-0.25',
    odAxis: '90',
    odAdd: '+1.00',
    osSphere: '-0.75',
    osCylinder: '0.00',
    osAxis: '180',
    osAdd: '+1.00',
    pupillaryDistanceMm: '63',
    slitLampFindings: '',
    funduscopyFindings: '',
    diagnosis: '',
    lensPrescription: '',
    eyeDropMedication: '',
    procedurePlanned: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadData = async () => {
    try {
      const [tel, exRes, patRes] = await Promise.all([
        api.getEyeClinicTelemetry().catch(() => null),
        api.getEyeClinicExams().catch(() => ({ exams: [] })),
        api.searchMPI(patientSearch).catch(() => [])
      ]);
      setTelemetry(tel);
      setExams(exRes?.exams || (Array.isArray(exRes) ? exRes : []));
      setPatients(Array.isArray(patRes) ? patRes : (patRes?.patients || patRes?.data || []));
    } catch (_e) { }
  };

  useEffect(() => {
    loadData();
  }, []);

  const iopAlertPreview = Number(form.iopRightMmHg) > 21 || Number(form.iopLeftMmHg) > 21;

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setFeedback({ type: 'error', msg: 'Please search and select a patient first.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.createEyeClinicExam({
        patientId: selectedPatient.id,
        chiefComplaint: form.chiefComplaint,
        visualAcuityOD: form.visualAcuityOD,
        visualAcuityOS: form.visualAcuityOS,
        visualAcuityCorrectedOD: form.visualAcuityCorrectedOD,
        visualAcuityCorrectedOS: form.visualAcuityCorrectedOS,
        iopRightMmHg: Number(form.iopRightMmHg),
        iopLeftMmHg: Number(form.iopLeftMmHg),
        refractionOD: { sphere: form.odSphere, cylinder: form.odCylinder, axis: form.odAxis, add: form.odAdd },
        refractionOS: { sphere: form.osSphere, cylinder: form.osCylinder, axis: form.osAxis, add: form.osAdd },
        pupillaryDistanceMm: Number(form.pupillaryDistanceMm),
        slitLampFindings: form.slitLampFindings,
        funduscopyFindings: form.funduscopyFindings,
        diagnosis: form.diagnosis,
        lensPrescription: form.lensPrescription,
        eyeDropMedication: form.eyeDropMedication,
        procedurePlanned: form.procedurePlanned || null
      });
      setFeedback({
        type: res.ocularHypertensionFlag ? 'warning' : 'success',
        msg: res.ocularHypertensionFlag
          ? `Eye Exam ${res.examNumber} saved — OCULAR HYPERTENSION ALERT (IOP > 21 mmHg) flagged for glaucoma workup!`
          : `Eye Exam ${res.examNumber} saved for ${selectedPatient.firstName} ${selectedPatient.lastName}.`
      });
      setForm((prev) => ({
        ...prev,
        chiefComplaint: '',
        diagnosis: '',
        slitLampFindings: '',
        funduscopyFindings: '',
        lensPrescription: '',
        eyeDropMedication: '',
        procedurePlanned: ''
      }));
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Could not save eye exam.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real-Life Ophthalmology Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/ophthalmology_eye_clinic_real.jpg"
          alt="GBS Ophthalmology & Eye Clinic"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 15%, rgba(6,12,24,0.35) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/assets/images/portrait_eye_doctor.jpg"
              alt="Ophthalmologist"
              style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold-400)' }}
            />
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gold-300)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Specialty Clinical Portal • Ophthalmology &amp; Optometry
              </span>
              <h2 className="header-3d" style={{ fontSize: '1.5rem', margin: '2px 0' }}>
                Eye Clinic — Vision Testing, Tonometry (IOP) &amp; Optical Refraction
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Snellen visual acuity (OD/OS), automated glaucoma IOP alerts, slit-lamp &amp; funduscopy exams, and optical lens prescriptions.
              </p>
            </div>
          </div>
          <button type="button" onClick={loadData} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={14} /> Refresh Eye Clinic
          </button>
        </div>
      </div>

      {/* Live Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total Eye Exams</div>
            <div className="metric-value">{telemetry?.totalExams ?? 0}</div>
          </div>
          <Eye size={20} style={{ color: 'var(--gold-400)' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Exams Today</div>
            <div className="metric-value" style={{ color: '#38bdf8' }}>{telemetry?.todayExams ?? 0}</div>
          </div>
          <Activity size={20} style={{ color: '#38bdf8' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Elevated IOP Alerts (&gt;21 mmHg)</div>
            <div className="metric-value" style={{ color: '#ef4444' }}>{telemetry?.elevatedIopAlerts ?? 0}</div>
          </div>
          <AlertTriangle size={20} style={{ color: '#ef4444' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Eye Procedures Planned</div>
            <div className="metric-value" style={{ color: '#10b981' }}>{telemetry?.proceduresPlanned ?? 0}</div>
          </div>
          <CheckCircle size={20} style={{ color: '#10b981' }} />
        </div>
      </div>

      {feedback && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 16px',
            borderLeft: `4px solid ${feedback.type === 'error' ? '#ef4444' : feedback.type === 'warning' ? '#f59e0b' : '#10b981'}`,
            color: feedback.type === 'error' ? '#fca5a5' : feedback.type === 'warning' ? '#fcd34d' : '#6ee7b7',
            fontSize: '0.84rem'
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* Eye Exam & Refraction Form */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--gold-400)' }}>
            New Ophthalmologic Examination &amp; Refraction Prescription
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search patient name or MRN..."
              style={{ width: '240px', padding: '6px 10px', fontSize: '0.8rem' }}
            />
            <button type="button" onClick={loadData} className="btn-outline-gold" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
              <Search size={13} /> Find
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {patients.slice(0, 8).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPatient(p)}
              className={selectedPatient?.id === p.id ? 'btn-gold' : 'btn-outline-gold'}
              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
            >
              {p.firstName} {p.lastName} ({p.patientNumber || p.mrn})
            </button>
          ))}
        </div>

        <form onSubmit={handleCreateExam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Chief Visual Complaint *</label>
              <input required type="text" value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} placeholder="e.g. Progressive blurry distance vision" />
            </div>
            <div>
              <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Ophthalmology Diagnosis *</label>
              <input required type="text" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} placeholder="e.g. Bilateral Myopia / Primary Open-Angle Glaucoma" />
            </div>
            <div>
              <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>IOP Right Eye — OD (mmHg)</label>
              <input type="number" step="0.5" value={form.iopRightMmHg} onChange={(e) => setForm({ ...form, iopRightMmHg: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>IOP Left Eye — OS (mmHg)</label>
              <input type="number" step="0.5" value={form.iopLeftMmHg} onChange={(e) => setForm({ ...form, iopLeftMmHg: e.target.value })} />
            </div>
          </div>

          {iopAlertPreview && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239,68,68,0.16)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '0.78rem', fontWeight: 700 }}>
              ⚠️ Ocular Hypertension Alert Preview: IOP &gt; 21 mmHg detected — exam will be flagged for glaucoma follow-up.
            </div>
          )}

          {/* Visual Acuity & Optical Refraction Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', padding: '12px', borderRadius: '8px', background: 'rgba(6,12,24,0.7)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--gold-400)' }}>VA OD (Uncorrected)</label>
              <input type="text" value={form.visualAcuityOD} onChange={(e) => setForm({ ...form, visualAcuityOD: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--gold-400)' }}>VA OS (Uncorrected)</label>
              <input type="text" value={form.visualAcuityOS} onChange={(e) => setForm({ ...form, visualAcuityOS: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#38bdf8' }}>OD Sphere / Cyl</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input type="text" value={form.odSphere} onChange={(e) => setForm({ ...form, odSphere: e.target.value })} placeholder="Sph" />
                <input type="text" value={form.odCylinder} onChange={(e) => setForm({ ...form, odCylinder: e.target.value })} placeholder="Cyl" />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#38bdf8' }}>OS Sphere / Cyl</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input type="text" value={form.osSphere} onChange={(e) => setForm({ ...form, osSphere: e.target.value })} placeholder="Sph" />
                <input type="text" value={form.osCylinder} onChange={(e) => setForm({ ...form, osCylinder: e.target.value })} placeholder="Cyl" />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pupillary Dist (mm)</label>
              <input type="number" value={form.pupillaryDistanceMm} onChange={(e) => setForm({ ...form, pupillaryDistanceMm: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <input type="text" value={form.slitLampFindings} onChange={(e) => setForm({ ...form, slitLampFindings: e.target.value })} placeholder="Slit-Lamp Findings (Cornea, AC, Lens)" />
            <input type="text" value={form.funduscopyFindings} onChange={(e) => setForm({ ...form, funduscopyFindings: e.target.value })} placeholder="Funduscopy (Optic Disc, Cup-to-Disc, Macula)" />
            <input type="text" value={form.lensPrescription} onChange={(e) => setForm({ ...form, lensPrescription: e.target.value })} placeholder="Optical Lens Prescription (e.g. Anti-Reflective Single Vision)" />
            <input type="text" value={form.eyeDropMedication} onChange={(e) => setForm({ ...form, eyeDropMedication: e.target.value })} placeholder="Ophthalmic Drops / Medication (e.g. Latanoprost 0.005%)" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="btn-gold">
              <PlusCircle size={15} /> {loading ? 'Saving Eye Exam...' : 'Save Ophthalmology Exam & Prescription'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Eye Clinic Exams Table */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--gold-400)' }}>
          Ophthalmology Examinations &amp; Refraction Records ({exams.length})
        </h3>
        {exams.length === 0 ? (
          <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            No eye clinic exams recorded yet.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Exam #</th>
                <th>Patient</th>
                <th>VA (OD / OS)</th>
                <th>IOP (OD / OS)</th>
                <th>Diagnosis</th>
                <th>Optical Rx / Drops</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((ex) => (
                <tr key={ex.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)', fontWeight: 700 }}>{ex.examNumber}</td>
                  <td>{ex.patient ? `${ex.patient.firstName} ${ex.patient.lastName} (${ex.patient.patientNumber})` : ex.patientId}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{ex.visualAcuityOD || '-'} / {ex.visualAcuityOS || '-'}</td>
                  <td>
                    <span className={ex.ocularHypertensionFlag ? 'badge badge-danger' : 'badge badge-success'}>
                      {ex.iopRightMmHg ?? '-'} / {ex.iopLeftMmHg ?? '-'} mmHg
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{ex.diagnosis}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{ex.lensPrescription || ex.eyeDropMedication || '—'}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onNavigateDetail && onNavigateDetail({ detailType: 'VIEW_DETAILS', moduleKey: 'EYE_CLINIC', recordId: ex.id, title: `Eye Exam ${ex.examNumber}`, recordData: ex })}
                      className="btn-outline-gold"
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    >
                      <Eye size={12} /> Details
                    </button>
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
