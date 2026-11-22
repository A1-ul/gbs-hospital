import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import { Activity, AlertTriangle, CheckCircle, RefreshCw, Search, HeartPulse, PlusCircle } from 'lucide-react';

export default function IcuVitalsView() {
  const [telemetry, setTelemetry] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [trends, setTrends] = useState(null);
  const [alertFilter, setAlertFilter] = useState('ALL');
  const [form, setForm] = useState({
    wardName: 'Adult ICU',
    bedNumber: 'ICU-01',
    heartRateBpm: '88',
    systolicBP: '120',
    diastolicBP: '78',
    oxygenSaturationPct: '98',
    respiratoryRate: '16',
    temperatureC: '37.0',
    glasgowComaScale: '15',
    ventilatorMode: 'ROOM_AIR',
    fio2Percent: '21',
    peepCmH2O: '5',
    criticalCareInterventions: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadData = async () => {
    try {
      const q = alertFilter !== 'ALL' ? `alertLevel=${alertFilter}` : '';
      const [tel, monRes, patRes] = await Promise.all([
        api.getIcuTelemetry().catch(() => null),
        api.getIcuMonitors(q).catch(() => ({ records: [] })),
        api.searchMPI(patientSearch).catch(() => [])
      ]);
      setTelemetry(tel);
      setMonitors(monRes?.records || (Array.isArray(monRes) ? monRes : []));
      setPatients(Array.isArray(patRes) ? patRes : (patRes?.patients || patRes?.data || []));
    } catch (_e) { }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, [alertFilter]);

  const loadTrendsForPatient = async (pat) => {
    setSelectedPatient(pat);
    try {
      const tRes = await api.getIcuPatientTrends(pat.id);
      setTrends(tRes);
    } catch (_e) {
      setTrends(null);
    }
  };

  const handleRecordVitals = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setFeedback({ type: 'error', msg: 'Select an ICU patient first.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.recordIcuVitals({
        patientId: selectedPatient.id,
        ...form
      });
      setFeedback({
        type: res.alertLevel === 'CRITICAL' ? 'error' : 'success',
        msg:
          res.alertLevel === 'CRITICAL'
            ? `CRITICAL ALERT TRIGGERED (${res.monitorCode}) — NEWS2=${res.news2Score}, MAP=${res.meanArterialPressure ?? '-'} mmHg. Immediate physician escalation active!`
            : `ICU telemetry recorded (${res.monitorCode}) — NEWS2=${res.news2Score} (${res.alertLevel}).`
      });
      await loadData();
      await loadTrendsForPatient(selectedPatient);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Could not record ICU vitals.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await api.acknowledgeIcuAlert(id, { interventionNote: 'Bedside clinician evaluated patient and initiated protocol.' });
      setFeedback({ type: 'success', msg: 'Critical ICU alert acknowledged and logged to PostgreSQL audit trail.' });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real-Life ICU Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/inpatient_ward_bed_real.jpg"
          alt="ICU & Live Vitals Command"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 15%, rgba(6,12,24,0.35) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-live" style={{ background: '#ef4444' }} /> Critical Care • Always-Open Emergency Protected
            </span>
            <h2 className="header-3d" style={{ fontSize: '1.5rem', margin: '4px 0' }}>
              ICU &amp; Live Vitals Monitoring — NEWS2, Ventilator &amp; Trend Analysis
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Real-time hemodynamic monitoring, automated MAP &amp; NEWS2 critical threshold alerts, ventilator telemetry, and longitudinal vital trends.
            </p>
          </div>
          <button type="button" onClick={loadData} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={14} /> Refresh ICU Telemetry
          </button>
        </div>
      </div>

      {/* Live ICU KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Active Monitored Patients</div>
            <div className="metric-value">{telemetry?.uniquePatientsMonitored ?? 0}</div>
          </div>
          <HeartPulse size={20} style={{ color: '#38bdf8' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Unacknowledged Critical Alerts</div>
            <div className="metric-value" style={{ color: '#ef4444' }}>{telemetry?.unacknowledgedCriticalAlerts ?? 0}</div>
          </div>
          <AlertTriangle size={20} style={{ color: '#ef4444' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Ventilator Readings (24h)</div>
            <div className="metric-value" style={{ color: '#f59e0b' }}>{telemetry?.ventilatedReadings24h ?? 0}</div>
          </div>
          <Activity size={20} style={{ color: '#f59e0b' }} />
        </div>
        <div className="metric-card">
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Avg SpO2 / Avg NEWS2</div>
            <div className="metric-value" style={{ color: '#10b981', fontSize: '1.35rem' }}>
              {telemetry?.averageSpO2 ?? 0}% • {telemetry?.averageNews2Score ?? 0}
            </div>
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

      {/* Record ICU Vitals Form */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--gold-400)' }}>
            Log Live ICU Telemetry &amp; Ventilator Parameters
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search patient name or MRN..."
              style={{ width: '220px', padding: '6px 10px', fontSize: '0.8rem' }}
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
              onClick={() => loadTrendsForPatient(p)}
              className={selectedPatient?.id === p.id ? 'btn-gold' : 'btn-outline-gold'}
              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
            >
              {p.firstName} {p.lastName} ({p.patientNumber || p.mrn})
            </button>
          ))}
        </div>

        <form onSubmit={handleRecordVitals} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ICU Bed</label>
              <input type="text" value={form.bedNumber} onChange={(e) => setForm({ ...form, bedNumber: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#10b981' }}>HR (bpm)</label>
              <input type="number" value={form.heartRateBpm} onChange={(e) => setForm({ ...form, heartRateBpm: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#38bdf8' }}>Systolic BP</label>
              <input type="number" value={form.systolicBP} onChange={(e) => setForm({ ...form, systolicBP: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#38bdf8' }}>Diastolic BP</label>
              <input type="number" value={form.diastolicBP} onChange={(e) => setForm({ ...form, diastolicBP: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#00f2fe' }}>SpO2 (%)</label>
              <input type="number" step="0.5" value={form.oxygenSaturationPct} onChange={(e) => setForm({ ...form, oxygenSaturationPct: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--gold-400)' }}>Resp Rate</label>
              <input type="number" value={form.respiratoryRate} onChange={(e) => setForm({ ...form, respiratoryRate: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#f59e0b' }}>Temp (°C)</label>
              <input type="number" step="0.1" value={form.temperatureC} onChange={(e) => setForm({ ...form, temperatureC: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: '#ef4444' }}>GCS (3–15)</label>
              <input type="number" min={3} max={15} value={form.glasgowComaScale} onChange={(e) => setForm({ ...form, glasgowComaScale: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ventilator Mode</label>
              <select value={form.ventilatorMode} onChange={(e) => setForm({ ...form, ventilatorMode: e.target.value })}>
                <option value="ROOM_AIR">Room Air</option>
                <option value="NASAL_CANNULA">Nasal Cannula</option>
                <option value="NON_REBREATHER">Non-Rebreather Mask</option>
                <option value="CPAP">CPAP</option>
                <option value="BIPAP">BiPAP</option>
                <option value="SIMV">SIMV Mechanical</option>
                <option value="AC_VC">AC/VC Mechanical</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={form.criticalCareInterventions}
              onChange={(e) => setForm({ ...form, criticalCareInterventions: e.target.value })}
              placeholder="Critical Care Interventions (e.g. Vasopressor titration, IV fluid bolus, ABG drawn)"
              style={{ flex: 1, minWidth: '260px' }}
            />
            <button type="submit" disabled={loading} className="btn-gold">
              <PlusCircle size={15} /> {loading ? 'Recording...' : 'Record ICU Telemetry'}
            </button>
          </div>
        </form>
      </div>

      {/* Patient Trend Analysis */}
      {trends && trends.trends && trends.trends.length > 0 && (
        <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '0.96rem', color: '#38bdf8' }}>
            Vital Trend Analysis — {trends.patient.fullName} ({trends.patient.mrn}) • {trends.totalPoints} Reading(s)
          </h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>HR</th>
                <th>BP (MAP)</th>
                <th>SpO2</th>
                <th>RR</th>
                <th>Temp</th>
                <th>GCS</th>
                <th>NEWS2</th>
                <th>Alert</th>
              </tr>
            </thead>
            <tbody>
              {trends.trends.slice(-8).reverse().map((pt) => (
                <tr key={pt.id}>
                  <td style={{ fontSize: '0.75rem' }}>{new Date(pt.recordedAt).toLocaleTimeString()}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{pt.heartRateBpm ?? '-'} bpm</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{pt.systolicBP ?? '-'}/{pt.diastolicBP ?? '-'} ({pt.meanArterialPressure ?? '-'})</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: pt.oxygenSaturationPct <= 91 ? '#ef4444' : '#10b981', fontWeight: 700 }}>{pt.oxygenSaturationPct ?? '-'}%</td>
                  <td>{pt.respiratoryRate ?? '-'}</td>
                  <td>{pt.temperatureC ?? '-'}°C</td>
                  <td>{pt.glasgowComaScale ?? '-'}/15</td>
                  <td style={{ fontWeight: 800 }}>{pt.news2Score}</td>
                  <td>
                    <span className={pt.alertLevel === 'CRITICAL' ? 'badge badge-danger' : pt.alertLevel === 'WARNING' ? 'badge badge-warning' : 'badge badge-success'}>
                      {pt.alertLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Live ICU Monitor Stream */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--gold-400)' }}>
            Live ICU Bed Telemetry &amp; Critical Alerts ({monitors.length})
          </h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'CRITICAL', 'WARNING', 'NORMAL'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setAlertFilter(lvl)}
                className={alertFilter === lvl ? 'btn-gold' : 'btn-outline-gold'}
                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {monitors.length === 0 ? (
          <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            No ICU vital monitoring records found for this filter.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code / Bed</th>
                <th>Patient</th>
                <th>Vitals (HR / BP / SpO2 / GCS)</th>
                <th>Ventilator</th>
                <th>NEWS2 / Alert</th>
                <th>Triggered Alerts</th>
                <th>Ack</th>
              </tr>
            </thead>
            <tbody>
              {monitors.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>
                    <strong style={{ color: 'var(--gold-300)' }}>{m.monitorCode}</strong>
                    <div style={{ color: 'var(--text-muted)' }}>{m.wardName} • {m.bedNumber || 'ICU'}</div>
                  </td>
                  <td>{m.patient ? `${m.patient.firstName} ${m.patient.lastName}` : m.patientId}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    HR {m.heartRateBpm ?? '-'} • BP {m.systolicBP ?? '-'}/{m.diastolicBP ?? '-'} (MAP {m.meanArterialPressure ?? '-'}) • SpO2 {m.oxygenSaturationPct ?? '-'}% • GCS {m.glasgowComaScale ?? '-'}/15
                  </td>
                  <td style={{ fontSize: '0.76rem' }}>{m.ventilatorMode}</td>
                  <td>
                    <span className={m.alertLevel === 'CRITICAL' ? 'badge badge-danger' : m.alertLevel === 'WARNING' ? 'badge badge-warning' : 'badge badge-success'}>
                      NEWS2 {m.news2Score} • {m.alertLevel}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.74rem', color: '#fca5a5', maxWidth: '260px' }}>
                    {Array.isArray(m.triggeredAlerts) && m.triggeredAlerts.length > 0
                      ? m.triggeredAlerts.map((a) => a.message).join(' | ')
                      : 'All parameters within safe range'}
                  </td>
                  <td>
                    {m.alertLevel !== 'NORMAL' && !m.isAcknowledged ? (
                      <button type="button" onClick={() => handleAcknowledge(m.id)} className="btn-danger" style={{ padding: '4px 9px', fontSize: '0.7rem' }}>
                        Acknowledge
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#10b981' }}>
                        {m.isAcknowledged ? `Ack (${m.acknowledgedBy || 'Clinician'})` : 'Stable'}
                      </span>
                    )}
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
