import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import { Activity, PlusCircle, RefreshCw, Search, CheckCircle, AlertCircle, Eye } from 'lucide-react';

const UPPER_TEETH = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_TEETH = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

const TOOTH_CONDITIONS = [
  { id: 'HEALTHY', label: 'Healthy', color: '#10b981', bg: 'rgba(16,185,129,0.16)' },
  { id: 'CARIES', label: 'Caries / Decay', color: '#ef4444', bg: 'rgba(239,68,68,0.24)' },
  { id: 'FILLED', label: 'Restored / Filled', color: '#38bdf8', bg: 'rgba(56,189,248,0.22)' },
  { id: 'ROOT_CANAL', label: 'Root Canal', color: '#f59e0b', bg: 'rgba(245,158,11,0.24)' },
  { id: 'CROWN', label: 'Crown / Bridge', color: '#d4af37', bg: 'rgba(212,175,55,0.24)' },
  { id: 'EXTRACTION', label: 'For Extraction', color: '#f97316', bg: 'rgba(249,115,22,0.25)' },
  { id: 'MISSING', label: 'Missing', color: '#64748b', bg: 'rgba(100,116,139,0.22)' }
];

export default function DentalClinicView({ onNavigateDetail }) {
  const [telemetry, setTelemetry] = useState(null);
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeBrush, setActiveBrush] = useState('CARIES');
  const [odontogram, setOdontogram] = useState({});
  const [form, setForm] = useState({
    chiefComplaint: '',
    category: 'RESTORATIVE',
    procedureCode: 'DEN-003',
    procedureName: 'Composite Resin Filling (Restorative)',
    anesthesiaUsed: 'Lidocaine 2% with Epinephrine 1:100,000',
    oralExamFindings: '',
    treatmentNotes: '',
    oralSurgeryNotes: '',
    followUpDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadData = async () => {
    try {
      const [tel, recRes, patRes] = await Promise.all([
        api.getDentalTelemetry().catch(() => null),
        api.getDentalRecords().catch(() => ({ records: [] })),
        api.searchMPI(patientSearch).catch(() => [])
      ]);
      setTelemetry(tel);
      setRecords(recRes?.records || (Array.isArray(recRes) ? recRes : []));
      const pList = Array.isArray(patRes) ? patRes : (patRes?.patients || patRes?.data || []);
      setPatients(pList);
    } catch (_e) { }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectPatient = async (pat) => {
    setSelectedPatient(pat);
    setFeedback(null);
    try {
      const odo = await api.getPatientOdontogram(pat.id);
      if (odo?.odontogram) {
        setOdontogram(odo.odontogram);
      } else {
        setOdontogram({});
      }
    } catch (_e) {
      setOdontogram({});
    }
  };

  const handleToothClick = (tooth) => {
    setOdontogram((prev) => ({
      ...prev,
      [tooth]: {
        condition: activeBrush,
        procedure: form.procedureName
      }
    }));
  };

  const handleCreateDentalRecord = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setFeedback({ type: 'error', msg: 'Please search and select a patient first.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const markedTeeth = Object.entries(odontogram)
        .filter(([, v]) => v && v.condition && v.condition !== 'HEALTHY')
        .map(([k]) => k);

      const res = await api.createDentalRecord({
        patientId: selectedPatient.id,
        ...form,
        odontogram,
        toothNumbers: markedTeeth
      });
      setFeedback({
        type: 'success',
        msg: `Dental Record ${res.recordNumber || ''} saved for ${selectedPatient.firstName} ${selectedPatient.lastName} (${markedTeeth.length} charted teeth).`
      });
      setForm((prev) => ({
        ...prev,
        chiefComplaint: '',
        oralExamFindings: '',
        treatmentNotes: '',
        oralSurgeryNotes: ''
      }));
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Could not save dental record.' });
    } finally {
      setLoading(false);
    }
  };

  const renderToothRow = (teeth, label) => (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--gold-400)', fontWeight: 700, marginBottom: '6px' }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, minmax(36px, 1fr))', gap: '4px', overflowX: 'auto' }}>
        {teeth.map((tooth) => {
          const cond = odontogram[tooth]?.condition || 'HEALTHY';
          const meta = TOOTH_CONDITIONS.find((c) => c.id === cond) || TOOTH_CONDITIONS[0];
          return (
            <button
              key={tooth}
              type="button"
              onClick={() => handleToothClick(tooth)}
              title={`Tooth FDI #${tooth}: ${meta.label} (Click to mark as ${activeBrush})`}
              style={{
                padding: '7px 2px',
                borderRadius: '6px',
                border: `1.5px solid ${meta.color}`,
                background: meta.bg,
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 800,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span>{tooth}</span>
              <span style={{ fontSize: '0.55rem', color: meta.color }}>{cond.slice(0, 4)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real-Life Dental Clinic Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/dental_clinic_real.jpg"
          alt="GBS Dental Clinic & Oral Surgery"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 15%, rgba(6,12,24,0.35) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/assets/images/portrait_dentist.jpg"
              alt="Dentist Specialist"
              style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold-400)' }}
            />
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gold-300)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Specialty Clinical Portal • Dentist &amp; Oral Surgery
              </span>
              <h2 className="header-3d" style={{ fontSize: '1.5rem', margin: '2px 0' }}>
                Dental Clinic, FDI Odontogram &amp; Oral Surgery Suite
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Interactive 32-tooth FDI dental charting, restorative procedures, endodontics, and oral surgery records saved live to PostgreSQL.
              </p>
            </div>
          </div>
          <button type="button" onClick={loadData} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={14} /> Refresh Dental Data
          </button>
        </div>
      </div>

      {/* Live PostgreSQL Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Total Dental Records</div>
            <div className="metric-value">{telemetry?.totalRecords ?? 0}</div>
          </div>
          <Activity size={20} style={{ color: 'var(--gold-400)' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Procedures Today</div>
            <div className="metric-value" style={{ color: '#38bdf8' }}>{telemetry?.todayRecords ?? 0}</div>
          </div>
          <PlusCircle size={20} style={{ color: '#38bdf8' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Oral Surgery Cases</div>
            <div className="metric-value" style={{ color: '#f59e0b' }}>{telemetry?.oralSurgeryCases ?? 0}</div>
          </div>
          <AlertCircle size={20} style={{ color: '#f59e0b' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>In-Progress Treatments</div>
            <div className="metric-value" style={{ color: '#10b981' }}>{telemetry?.inProgressCases ?? 0}</div>
          </div>
          <CheckCircle size={20} style={{ color: '#10b981' }} />
        </div>
      </div>

      {feedback && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 16px',
            borderLeft: `4px solid ${feedback.type === 'error' ? '#ef4444' : '#10b981'}`,
            color: feedback.type === 'error' ? '#fca5a5' : '#6ee7b7',
            fontSize: '0.84rem'
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* Patient Selection & Interactive FDI Odontogram */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--gold-400)' }}>
            1. Select Patient &amp; Interactive 32-Tooth FDI Odontogram
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
          {patients.slice(0, 8).map((p) => {
            const active = selectedPatient?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPatient(p)}
                className={active ? 'btn-gold' : 'btn-outline-gold'}
                style={{ padding: '5px 10px', fontSize: '0.76rem' }}
              >
                {p.firstName} {p.lastName} ({p.patientNumber || p.mrn})
              </button>
            );
          })}
        </div>

        {/* Condition Brush Selector */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px', padding: '10px', borderRadius: '8px', background: 'rgba(6,12,24,0.7)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, marginRight: '6px' }}>Odontogram Marker:</span>
          {TOOTH_CONDITIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveBrush(c.id)}
              style={{
                padding: '4px 10px',
                borderRadius: '14px',
                border: activeBrush === c.id ? `2px solid ${c.color}` : '1px solid var(--border-subtle)',
                background: activeBrush === c.id ? c.bg : 'transparent',
                color: c.color,
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {renderToothRow(UPPER_TEETH, 'UPPER ARCH (FDI Quadrants 1 & 2: 18–11 | 21–28)')}
        {renderToothRow(LOWER_TEETH, 'LOWER ARCH (FDI Quadrants 4 & 3: 48–41 | 31–38)')}

        {/* Dental Record & Oral Surgery Entry Form */}
        <form onSubmit={handleCreateDentalRecord} style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chief Dental Complaint *</label>
              <input
                required
                type="text"
                value={form.chiefComplaint}
                onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                placeholder="e.g. Severe throbbing molar pain tooth #36"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dental Specialty Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="PREVENTIVE">Preventive Dentistry</option>
                <option value="RESTORATIVE">Restorative / Fillings</option>
                <option value="ENDODONTICS">Endodontics (Root Canal)</option>
                <option value="PERIODONTICS">Periodontics (Gum Care)</option>
                <option value="ORAL_SURGERY">Oral &amp; Maxillofacial Surgery</option>
                <option value="PROSTHODONTICS">Prosthodontics (Crowns/Bridges)</option>
                <option value="ORTHODONTICS">Orthodontics</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dental Procedure *</label>
              <input
                required
                type="text"
                value={form.procedureName}
                onChange={(e) => setForm({ ...form, procedureName: e.target.value })}
                placeholder="e.g. Composite Resin Filling / Wisdom Tooth Extraction"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Anesthesia Used</label>
              <input
                type="text"
                value={form.anesthesiaUsed}
                onChange={(e) => setForm({ ...form, anesthesiaUsed: e.target.value })}
                placeholder="e.g. Lidocaine 2% Nerve Block"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Oral Examination Findings</label>
              <textarea
                rows={2}
                value={form.oralExamFindings}
                onChange={(e) => setForm({ ...form, oralExamFindings: e.target.value })}
                placeholder="Percussion tenderness, gingival status, radiographic notes..."
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Treatment &amp; Oral Surgery Notes</label>
              <textarea
                rows={2}
                value={form.oralSurgeryNotes}
                onChange={(e) => setForm({ ...form, oralSurgeryNotes: e.target.value })}
                placeholder="Sutures placed, hemostasis achieved, post-op instructions..."
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="btn-gold">
              <PlusCircle size={15} /> {loading ? 'Saving Dental Record...' : 'Save Dental Record & Odontogram'}
            </button>
          </div>
        </form>
      </div>

      {/* Live Dental Records Table */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--gold-400)' }}>
          Recent Dental Clinic &amp; Oral Surgery Records ({records.length})
        </h3>
        {records.length === 0 ? (
          <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            No dental records logged yet. Select a patient above to chart teeth and record a dental procedure.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Record #</th>
                <th>Patient</th>
                <th>Category</th>
                <th>Procedure</th>
                <th>Charted Teeth</th>
                <th>Dentist</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)', fontWeight: 700 }}>{rec.recordNumber}</td>
                  <td>{rec.patient ? `${rec.patient.firstName} ${rec.patient.lastName} (${rec.patient.patientNumber})` : rec.patientId}</td>
                  <td><span className="badge badge-gold">{rec.category}</span></td>
                  <td style={{ fontWeight: 600 }}>{rec.procedureName}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{Array.isArray(rec.toothNumbers) && rec.toothNumbers.length > 0 ? rec.toothNumbers.join(', ') : 'General'}</td>
                  <td>{rec.dentistName || 'Dentist'}</td>
                  <td><span className="badge badge-success">{rec.status}</span></td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onNavigateDetail && onNavigateDetail({ detailType: 'VIEW_DETAILS', moduleKey: 'DENTAL', recordId: rec.id, title: `Dental Record ${rec.recordNumber}`, recordData: rec })}
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
