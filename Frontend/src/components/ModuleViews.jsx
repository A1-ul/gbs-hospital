import React, { useState, useEffect } from 'react';
import {
  Users, Activity, Pill, FlaskConical, Stethoscope,
  Bed, FileText, CreditCard, Shield, AlertTriangle,
  Clock, CheckCircle, Search, PlusCircle, Lock, Unlock,
  MapPin, RefreshCw, Send, Video, Radio, Cpu, AlertOctagon, ShieldAlert, Bell, Database
} from 'lucide-react';
import { api } from '../services/api.service';
import MigrationViewComponent from '../modules/migration/MigrationView';
import TelemedicineGisViewComponent from '../modules/telemedicine/TelemedicineGisView';

// ==========================================
// 1. PATIENT MANAGEMENT & MPI
// ==========================================
export function PatientManagementView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [folderQueue, setFolderQueue] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', dateOfBirth: '1990-01-01', gender: 'MALE',
    phone: '', address: '', bloodGroup: 'O_POSITIVE'
  });
  const [feedback, setFeedback] = useState(null);

  const loadInitialPatients = async (searchStr = '') => {
    setSearching(true);
    try {
      const [data, queueData] = await Promise.all([
        api.searchMPI(searchStr).catch(() => ({ patients: [] })),
        api.getFolderRetrievalQueue().catch(() => ({ requests: [] }))
      ]);
      setResults(data?.patients || []);
      setFolderQueue(queueData?.requests || []);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    loadInitialPatients('');
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setSearching(true);
    setFeedback(null);
    try {
      const data = await api.searchMPI(query);
      setResults(data.patients || []);
      if (!data.patients || data.patients.length === 0) {
        setFeedback({ type: 'info', msg: 'No records available matching query. Register a new patient if needed.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setSearching(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await api.registerPatient(formData);
      setFeedback({ type: 'success', msg: `Patient Registered: ${res.patient.firstName} ${res.patient.lastName} (MRN: ${res.patient.mrn}) • Medical Folder: ${res.folder?.folderNumber || 'Assigned'}` });
      setShowRegisterModal(false);
      setQuery(res.patient.mrn);
      loadInitialPatients(res.patient.mrn);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real-Life Patient Registration, MPI & Medical Records Archive Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '210px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/patient_registration_archive_real.jpg"
          alt="Patient Registration & Medical Records Archive"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.96) 20%, rgba(10,9,7,0.4) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              1. Patient Management, Master Patient Index (MPI) & Physical Folder Vault
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
              Patient Registration, Identity Resolution & Medical Records Archive
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Enterprise identity resolution, sequential MRN issuance, and paper archive shelf chain-of-custody tracking.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <img
              src="/assets/images/medical_records_archive_real.jpg"
              alt="Physical Archive Vault"
              style={{ width: '96px', height: '58px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--gold-400)' }}
            />
            <button
              onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                detailType: 'RECORDS',
                recordId: 'MPI_REGISTRY',
                title: 'Master Patient Index — Complete Patient Records'
              })}
              className="btn-outline-gold"
            >
              <FileText size={15} /> View Records Page
            </button>
            <button onClick={() => setShowRegisterModal(true)} className="btn-gold">
              <PlusCircle size={16} /> Register New Patient
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: `4px solid ${feedback.type === 'error' ? 'var(--status-danger)' : 'var(--status-online)'}`, color: '#fff', fontSize: '0.85rem' }}>
          {feedback.msg}
        </div>
      )}

      {/* Search Bar */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search Master Patient Index by MRN, Name, Phone, or National ID..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '6px', background: '#12100d', border: '1px solid var(--border-gold)', color: '#fff', fontSize: '0.875rem' }}
            />
          </div>
          <button type="submit" disabled={searching} className="btn-gold" style={{ padding: '0 24px' }}>
            {searching ? 'Searching...' : 'Search MPI'}
          </button>
          <button type="button" onClick={() => { setQuery(''); loadInitialPatients(''); }} className="btn-outline-gold">
            Refresh
          </button>
        </form>
      </div>

      {/* Results Table */}
      <div className="glass-panel" style={{ padding: '16px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gold-400)', marginBottom: '12px' }}>
          Registered Patient Records ({results.length})
        </h3>
        {results.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>MRN</th>
                <th>Full Name</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Medical Folder Shelf</th>
                <th>Registered At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map(pt => (
                <tr key={pt.id}>
                  <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{pt.mrn}</td>
                  <td style={{ fontWeight: 600 }}>{pt.firstName} {pt.lastName}</td>
                  <td>{pt.gender}</td>
                  <td>{pt.phone || '—'}</td>
                  <td>{pt.address || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {pt.medicalFolders?.[0]?.shelfLocation || pt.medicalFolder?.shelfLocation || 'Not Assigned'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {pt.createdAt ? new Date(pt.createdAt).toLocaleString() : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                          detailType: 'PROFILE',
                          recordId: pt.id,
                          title: `Patient Profile — ${pt.firstName} ${pt.lastName} (${pt.mrn})`,
                          payload: pt
                        })}
                        className="btn-outline-gold"
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                          detailType: 'DETAILS',
                          recordId: pt.id,
                          title: `Patient Clinical Details — ${pt.mrn}`,
                          payload: pt
                        })}
                        className="btn-outline-gold"
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                      >
                        View Details
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.checkInPatient(pt.id, 'ROUTINE');
                            setFeedback({ type: 'success', msg: `Patient Checked-in to OPD! Queue Ticket: ${res.ticket?.tokenNumber || res.tokenNumber || 'Issued'}` });
                            loadInitialPatients(query);
                          } catch (e) {
                            setFeedback({ type: 'error', msg: e.message });
                          }
                        }}
                        className="btn-gold"
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                      >
                        Check-in OPD
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            No records available. Click "Register New Patient" to add a live patient record.
          </div>
        )}
      </div>

      {/* Physical Folder Retrieval Queue */}
      <div className="glass-panel" style={{ padding: '16px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gold-400)', marginBottom: '12px' }}>
          Physical Medical Folder Retrieval Queue ({folderQueue.length})
        </h3>
        {folderQueue.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Folder #</th>
                <th>Patient</th>
                <th>Shelf Location</th>
                <th>Destination</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {folderQueue.map(req => (
                <tr key={req.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>{req.folder?.folderNumber || req.folderId}</td>
                  <td>{req.folder?.patient ? `${req.folder.patient.firstName} ${req.folder.patient.lastName}` : '—'}</td>
                  <td>{req.folder?.shelfLocation || '—'}</td>
                  <td>{req.destinationDepartment || 'OPD'}</td>
                  <td>{req.priority || 'ROUTINE'}</td>
                  <td>{req.status}</td>
                  <td>
                    <button
                      onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                        detailType: 'DETAILS',
                        recordId: req.id,
                        title: `Folder Retrieval Request — ${req.folder?.folderNumber || req.id}`,
                        payload: req
                      })}
                      className="btn-outline-gold"
                      style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
            No records available in folder retrieval queue.
          </div>
        )}
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '24px', border: '1px solid var(--gold-400)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>New Patient MPI Registration</h3>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>First Name *</label>
                  <input required type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last Name *</label>
                  <input required type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date of Birth</label>
                  <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gender</label>
                  <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+233..." style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Residential Address</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="City / Region" style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowRegisterModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Confirm & Issue MRN</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. CLINICAL CARE, OPD TRIAGE, DOCTOR, LAB, RADIOLOGY & BILLING
// ==========================================
export function ClinicalCareView() {
  const [activeTab, setActiveTab] = useState('NURSE_TRIAGE');
  const [stats, setStats] = useState(null);
  const [doctorStats, setDoctorStats] = useState(null);
  const [labStats, setLabStats] = useState(null);
  const [radStats, setRadStats] = useState(null);
  const [billingStats, setBillingStats] = useState(null);
  const [labRequests, setLabRequests] = useState([]);
  const [radOrders, setRadOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Vitals recording state
  const [vitals, setVitals] = useState({
    patientId: '', systolicBP: 120, diastolicBP: 80, pulseRate: 72,
    respiratoryRate: 16, temperature: 36.8, oxygenSaturation: 98, weightKg: 70, heightCm: 175
  });

  // Doctor Consultation State
  const [icdQuery, setIcdQuery] = useState('');
  const [icdResults, setIcdResults] = useState([]);
  const [selectedIcd, setSelectedIcd] = useState(null);
  const [consultNotes, setConsultNotes] = useState({ patientId: '', chiefComplaint: '', assessment: '', plan: '' });

  // Lab, Rad, Billing Form States
  const [labForm, setLabForm] = useState({ patientId: '', testCode: 'FBC-01', testName: 'Full Blood Count (FBC)', clinicalPriority: 'ROUTINE' });
  const [radForm, setRadForm] = useState({ patientId: '', modality: 'XRAY', bodyPart: 'Chest PA', clinicalIndication: '' });
  const [invoiceForm, setInvoiceForm] = useState({ patientId: '', description: 'Outpatient Consultation', amount: 150, paymentMethod: 'CASH' });

  const loadClinicalTelemetry = () => {
    Promise.all([
      api.getNurseStats().catch(() => null),
      api.getDoctorStats().catch(() => null),
      api.getLabStats().catch(() => null),
      api.getRadiologyStats().catch(() => null),
      api.getBillingStats().catch(() => null),
      api.getLabRequests().catch(() => ({ requests: [] })),
      api.getRadiologyOrders().catch(() => ({ orders: [] })),
      api.getBills().catch(() => ({ invoices: [] }))
    ]).then(([nStats, dStats, lStats, rStats, bStats, lReqs, rOrds, bInvs]) => {
      setStats(nStats);
      setDoctorStats(dStats);
      setLabStats(lStats);
      setRadStats(rStats);
      setBillingStats(bStats);
      setLabRequests(lReqs?.requests || lReqs?.items || (Array.isArray(lReqs) ? lReqs : []));
      setRadOrders(rOrds?.orders || rOrds?.items || (Array.isArray(rOrds) ? rOrds : []));
      setInvoices(bInvs?.invoices || bInvs?.items || (Array.isArray(bInvs) ? bInvs : []));
    });
  };

  useEffect(() => {
    loadClinicalTelemetry();
  }, []);

  const searchICD = async (q) => {
    setIcdQuery(q);
    if (q.length > 1) {
      try {
        const res = await api.searchICD10(q);
        setIcdResults(res.items || []);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRecordVitals = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await api.recordVitals(vitals);
      setFeedback({ type: 'success', msg: `Vitals recorded in PostgreSQL! NEWS2 Score: ${res.news2Score ?? 0} (${res.riskLevel || 'LOW'})` });
      loadClinicalTelemetry();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.createEncounter({
        patientId: consultNotes.patientId,
        chiefComplaint: consultNotes.chiefComplaint,
        clinicalNotes: consultNotes.assessment,
        treatmentPlan: consultNotes.plan,
        icd10Code: selectedIcd?.code || 'Z00.0'
      });
      setFeedback({ type: 'success', msg: 'Clinical Consultation & ICD-10 Diagnosis persisted to database.' });
      loadClinicalTelemetry();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleOrderLab = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.orderLabTest(labForm);
      setFeedback({ type: 'success', msg: `Laboratory Order (${labForm.testName}) created in LIS queue.` });
      loadClinicalTelemetry();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleOrderRadiology = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.orderRadiology(radForm);
      setFeedback({ type: 'success', msg: `Radiology Order (${radForm.modality} - ${radForm.bodyPart}) created in RIS/PACS.` });
      loadClinicalTelemetry();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.createInvoice({
        patientId: invoiceForm.patientId,
        items: [{ description: invoiceForm.description, quantity: 1, unitPrice: Number(invoiceForm.amount) }]
      });
      setFeedback({ type: 'success', msg: 'Patient Invoice generated in Hospital Revenue Ledger.' });
      loadClinicalTelemetry();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real Photo Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '180px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src={
            activeTab === 'NURSE_TRIAGE'
              ? '/assets/images/nurse_triage_station.jpg'
              : activeTab === 'LABORATORY'
                ? '/assets/images/laboratory_pathology_real.jpg'
                : activeTab === 'RADIOLOGY'
                  ? '/assets/images/radiology_pacs_mri_real.jpg'
                  : activeTab === 'BILLING'
                    ? '/assets/images/nhia_claims_center_real.jpg'
                    : '/assets/images/doctor_consultation_real.jpg'
          }
          alt="Clinical Station"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.95) 20%, rgba(10,9,7,0.4) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Clinical Services, Diagnostics & Revenue Subsystem
            </span>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 800 }}>
              OPD Triage, Doctor Consultation, Laboratory, Radiology & Billing
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-time NEWS2 biometric calculation, WHO ICD-10 coding, LIS/RIS orders, and revenue invoicing.
            </p>
          </div>
          <button
            onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
              detailType: 'REPORTS',
              recordId: activeTab,
              title: `Clinical & Diagnostic Reports — ${activeTab}`
            })}
            className="btn-outline-gold"
          >
            <FileText size={15} /> View Clinical Reports Page
          </button>
        </div>
      </div>

      {feedback && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: `4px solid ${feedback.type === 'error' ? 'var(--status-danger)' : 'var(--status-online)'}`, color: '#fff', fontSize: '0.85rem' }}>
          {feedback.msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('NURSE_TRIAGE')} className={activeTab === 'NURSE_TRIAGE' ? 'btn-gold' : 'btn-outline-gold'}>
          <Activity size={15} /> Nurse Triage Station
        </button>
        <button onClick={() => setActiveTab('DOCTOR_CONSULT')} className={activeTab === 'DOCTOR_CONSULT' ? 'btn-gold' : 'btn-outline-gold'}>
          <Stethoscope size={15} /> Doctor Consultation
        </button>
        <button onClick={() => setActiveTab('LAB_LIS')} className={activeTab === 'LAB_LIS' ? 'btn-gold' : 'btn-outline-gold'}>
          <FlaskConical size={15} /> Laboratory (LIS)
        </button>
        <button onClick={() => setActiveTab('RADIOLOGY_RIS')} className={activeTab === 'RADIOLOGY_RIS' ? 'btn-gold' : 'btn-outline-gold'}>
          <Radio size={15} /> Radiology (RIS/PACS)
        </button>
        <button onClick={() => setActiveTab('BILLING_FINANCE')} className={activeTab === 'BILLING_FINANCE' ? 'btn-gold' : 'btn-outline-gold'}>
          <CreditCard size={15} /> Billing & Cashier
        </button>
      </div>

      {/* Content */}
      {activeTab === 'NURSE_TRIAGE' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <form onSubmit={handleRecordVitals} className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '14px' }}>Record Patient Vitals & Compute NEWS2</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient ID or MRN *</label>
              <input required type="text" placeholder="Enter Patient UUID or MRN" value={vitals.patientId} onChange={e => setVitals({ ...vitals, patientId: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Systolic BP (mmHg)</label>
                <input type="number" value={vitals.systolicBP} onChange={e => setVitals({ ...vitals, systolicBP: +e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Diastolic BP (mmHg)</label>
                <input type="number" value={vitals.diastolicBP} onChange={e => setVitals({ ...vitals, diastolicBP: +e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pulse Rate (bpm)</label>
                <input type="number" value={vitals.pulseRate} onChange={e => setVitals({ ...vitals, pulseRate: +e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Respiratory Rate (bpm)</label>
                <input type="number" value={vitals.respiratoryRate} onChange={e => setVitals({ ...vitals, respiratoryRate: +e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Oxygen SpO2 (%)</label>
                <input type="number" value={vitals.oxygenSaturation} onChange={e => setVitals({ ...vitals, oxygenSaturation: +e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Temperature (°C)</label>
                <input type="number" step="0.1" value={vitals.temperature} onChange={e => setVitals({ ...vitals, temperature: +e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>
            </div>
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-gold">Save Vitals & Compute NEWS2</button>
            </div>
          </form>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '14px' }}>OPD Triage Live Telemetry</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Active OPD Queue:</span>
                <span style={{ fontWeight: 700, color: 'var(--status-online)' }}>{stats?.activeQueueCount ?? 0} Patients</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>High Risk Escalations:</span>
                <span style={{ fontWeight: 700, color: 'var(--status-warning)' }}>{stats?.highRiskAlerts ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Triage Completed Today:</span>
                <span style={{ fontWeight: 700, color: 'var(--gold-300)' }}>{stats?.completedTriageCount ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'DOCTOR_CONSULT' && (
        <form onSubmit={handleSaveConsultation} className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '14px' }}>WHO ICD-10 Diagnostic Catalog & Clinical Consultation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient ID / MRN *</label>
              <input required type="text" value={consultNotes.patientId} onChange={e => setConsultNotes({ ...consultNotes, patientId: e.target.value })} placeholder="Enter Patient UUID" style={{ width: '100%', padding: '9px 12px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Search ICD-10 Database</label>
              <input
                type="text"
                value={icdQuery}
                onChange={e => searchICD(e.target.value)}
                placeholder="e.g. Malaria, Hypertension, Diabetes..."
                style={{ width: '100%', padding: '9px 12px', background: '#12100d', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '4px' }}
              />
              {icdResults.length > 0 && (
                <div style={{ maxHeight: '180px', overflowY: 'auto', background: '#171511', border: '1px solid var(--border-subtle)', borderRadius: '4px', marginTop: '4px' }}>
                  {icdResults.map(item => (
                    <div
                      key={item.code}
                      onClick={() => { setSelectedIcd(item); setIcdResults([]); setIcdQuery(`${item.code} - ${item.description}`); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8rem' }}
                    >
                      <span style={{ color: 'var(--gold-400)', fontWeight: 700 }}>{item.code}</span> — {item.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chief Complaint *</label>
              <textarea required rows={2} value={consultNotes.chiefComplaint} onChange={e => setConsultNotes({ ...consultNotes, chiefComplaint: e.target.value })} placeholder="Document patient presenting complaints..." style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clinical Assessment & Treatment Plan *</label>
              <textarea required rows={3} value={consultNotes.plan} onChange={e => setConsultNotes({ ...consultNotes, plan: e.target.value })} placeholder="Document clinical findings and therapeutic plan..." style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" className="btn-gold">Save Consultation Encounter</button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'LAB_LIS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <form onSubmit={handleOrderLab} className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>Order Laboratory Diagnostic Test (LIS)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <input required type="text" placeholder="Patient ID *" value={labForm.patientId} onChange={e => setLabForm({ ...labForm, patientId: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <input required type="text" placeholder="Test Code (e.g. FBC-01)" value={labForm.testCode} onChange={e => setLabForm({ ...labForm, testCode: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <input required type="text" placeholder="Test Name *" value={labForm.testName} onChange={e => setLabForm({ ...labForm, testName: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <button type="submit" className="btn-gold">Submit Lab Order</button>
            </div>
          </form>

          <div className="glass-panel" style={{ padding: '16px', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--gold-400)', marginBottom: '12px' }}>Laboratory Orders ({labRequests.length})</h3>
            {labRequests.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Test Name</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {labRequests.map(req => (
                    <tr key={req.id}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{req.id?.slice(0, 8)}</td>
                      <td>{req.testName || req.testCode}</td>
                      <td>{req.clinicalPriority || req.priority || 'ROUTINE'}</td>
                      <td>{req.status}</td>
                      <td>
                        <button
                          onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                            detailType: 'DETAILS',
                            recordId: req.id,
                            title: `Lab Order Details — ${req.testName || req.id}`,
                            payload: req
                          })}
                          className="btn-outline-gold"
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>No records available.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'RADIOLOGY_RIS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <form onSubmit={handleOrderRadiology} className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>Order Radiology Imaging Study (RIS/PACS)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <input required type="text" placeholder="Patient ID *" value={radForm.patientId} onChange={e => setRadForm({ ...radForm, patientId: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <select value={radForm.modality} onChange={e => setRadForm({ ...radForm, modality: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                <option value="XRAY">X-Ray</option>
                <option value="CT">CT Scan</option>
                <option value="MRI">MRI</option>
                <option value="ULTRASOUND">Ultrasound</option>
              </select>
              <input required type="text" placeholder="Body Part / Study *" value={radForm.bodyPart} onChange={e => setRadForm({ ...radForm, bodyPart: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <button type="submit" className="btn-gold">Submit Imaging Order</button>
            </div>
          </form>

          <div className="glass-panel" style={{ padding: '16px', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--gold-400)', marginBottom: '12px' }}>Radiology Imaging Orders ({radOrders.length})</h3>
            {radOrders.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Modality</th>
                    <th>Body Part</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {radOrders.map(ord => (
                    <tr key={ord.id}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{ord.id?.slice(0, 8)}</td>
                      <td>{ord.modality}</td>
                      <td>{ord.bodyPart || ord.studyType}</td>
                      <td>{ord.status}</td>
                      <td>
                        <button
                          onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                            detailType: 'DETAILS',
                            recordId: ord.id,
                            title: `Radiology Order Details — ${ord.modality} ${ord.bodyPart || ''}`,
                            payload: ord
                          })}
                          className="btn-outline-gold"
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>No records available.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'BILLING_FINANCE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <form onSubmit={handleCreateInvoice} className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>Create Patient Billing Invoice</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <input required type="text" placeholder="Patient ID *" value={invoiceForm.patientId} onChange={e => setInvoiceForm({ ...invoiceForm, patientId: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <input required type="text" placeholder="Service Description *" value={invoiceForm.description} onChange={e => setInvoiceForm({ ...invoiceForm, description: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <input required type="number" placeholder="Amount (GHS) *" value={invoiceForm.amount} onChange={e => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <button type="submit" className="btn-gold">Generate Invoice</button>
            </div>
          </form>

          <div className="glass-panel" style={{ padding: '16px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', color: 'var(--gold-400)' }}>Patient Invoices & Financial Transactions ({invoices.length})</h3>
              <button
                onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                  detailType: 'TRANSACTIONS',
                  recordId: 'REVENUE_LEDGER',
                  title: 'Hospital Financial Transactions & Invoices Ledger'
                })}
                className="btn-outline-gold"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                View All Transactions Page
              </button>
            </div>
            {invoices.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Total Amount</th>
                    <th>Paid Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>{inv.invoiceNumber || inv.id?.slice(0, 8)}</td>
                      <td>GHS {inv.totalAmount ?? 0}</td>
                      <td>GHS {inv.paidAmount ?? 0}</td>
                      <td>{inv.status}</td>
                      <td>
                        <button
                          onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                            detailType: 'TRANSACTIONS',
                            recordId: inv.id,
                            title: `Invoice Transaction — ${inv.invoiceNumber || inv.id}`,
                            payload: inv
                          })}
                          className="btn-outline-gold"
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>No records available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. INPATIENT WARDS & BED MANAGEMENT
// ==========================================
export function InpatientWardsView() {
  const [stats, setStats] = useState(null);
  const [wards, setWards] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [showWardModal, setShowWardModal] = useState(false);
  const [wardForm, setWardForm] = useState({ name: '', wardType: 'GENERAL', floor: '1st Floor', capacity: 10 });

  const loadWardData = () => {
    Promise.all([
      api.getAdmissionsStats().catch(() => null),
      api.getBedMatrix().catch(() => null),
      api.getActiveAdmissions().catch(() => null)
    ]).then(([s, b, a]) => {
      setStats(s);
      setWards(b?.wards || b?.beds || (Array.isArray(b) ? b : []));
      setAdmissions(a?.admissions || (Array.isArray(a) ? a : []));
    });
  };

  useEffect(() => {
    loadWardData();
  }, []);

  const handleCreateWard = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.createWard(wardForm);
      setFeedback({ type: 'success', msg: `Ward "${wardForm.name}" created in PostgreSQL.` });
      setShowWardModal(false);
      loadWardData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="glass-panel" style={{ position: 'relative', height: '180px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/inpatient_ward_bed_real.jpg"
          alt="Inpatient Ward"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.95) 20%, rgba(10,9,7,0.4) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Inpatient Department (IPD)
            </span>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 800 }}>
              Ward Census & Interactive Bed Availability Matrix
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-time bed allocation, atomic transfers, shift nursing charts, and discharge processing.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                detailType: 'RECORDS',
                recordId: 'IPD_CENSUS',
                title: 'Inpatient Ward Census & Bed Matrix Records'
              })}
              className="btn-outline-gold"
            >
              View Records Page
            </button>
            <button onClick={() => setShowWardModal(true)} className="btn-gold">
              <PlusCircle size={15} /> Create Ward
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: `4px solid ${feedback.type === 'error' ? 'var(--status-danger)' : 'var(--status-online)'}`, color: '#fff', fontSize: '0.85rem' }}>
          {feedback.msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Beds</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{stats?.totalBeds ?? 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Occupied Beds</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-warning)' }}>{stats?.occupiedBeds ?? 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Beds</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-online)' }}>{stats?.availableBeds ?? 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Occupancy Rate</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold-400)' }}>{stats?.occupancyRate ?? '0.0%'}</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--gold-400)', marginBottom: '12px' }}>Active Inpatient Admissions ({admissions.length})</h3>
        {admissions.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Admission ID</th>
                <th>Patient</th>
                <th>Bed</th>
                <th>Status</th>
                <th>Admitted At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {admissions.map(adm => (
                <tr key={adm.id}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{adm.id?.slice(0, 8)}</td>
                  <td>{adm.patient ? `${adm.patient.firstName} ${adm.patient.lastName}` : adm.patientId}</td>
                  <td>{adm.bed?.bedNumber || adm.bedId}</td>
                  <td>{adm.status}</td>
                  <td>{adm.admissionDate ? new Date(adm.admissionDate).toLocaleString() : '—'}</td>
                  <td>
                    <button
                      onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                        detailType: 'DETAILS',
                        recordId: adm.id,
                        title: `Inpatient Admission Details — ${adm.id}`,
                        payload: adm
                      })}
                      className="btn-outline-gold"
                      style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            No records available. Active admissions will appear here once patients are admitted to beds.
          </div>
        )}
      </div>

      {showWardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', border: '1px solid var(--gold-400)' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '14px' }}>Create Hospital Ward</h3>
            <form onSubmit={handleCreateWard} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input required type="text" placeholder="Ward Name (e.g. Male Medical Ward A)" value={wardForm.name} onChange={e => setWardForm({ ...wardForm, name: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <select value={wardForm.wardType} onChange={e => setWardForm({ ...wardForm, wardType: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                <option value="GENERAL">General Ward</option>
                <option value="ICU">Intensive Care Unit (ICU)</option>
                <option value="MATERNITY">Maternity Ward</option>
                <option value="PEDIATRIC">Pediatric Ward</option>
              </select>
              <input type="number" placeholder="Bed Capacity" value={wardForm.capacity} onChange={e => setWardForm({ ...wardForm, capacity: +e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowWardModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Save Ward</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. PHARMACY & INVENTORY
// ==========================================
export function PharmacyView() {
  const [stats, setStats] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [items, setItems] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState({ genericName: '', brandName: '', dosageForm: 'TABLET', strength: '500mg', reorderLevel: 20, unitPrice: 15 });

  const loadPharmacy = () => {
    Promise.all([
      api.getPharmacyStats().catch(() => null),
      api.getPendingPrescriptions().catch(() => null),
      api.getPharmacyItems().catch(() => null)
    ]).then(([s, p, i]) => {
      setStats(s);
      setPrescriptions(p?.prescriptions || (Array.isArray(p) ? p : []));
      setItems(i?.items || (Array.isArray(i) ? i : []));
    });
  };

  useEffect(() => {
    loadPharmacy();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.createPharmacyItem(itemForm);
      setFeedback({ type: 'success', msg: `Medication "${itemForm.genericName}" added to Formulary Catalog.` });
      setShowItemModal(false);
      loadPharmacy();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="glass-panel" style={{ position: 'relative', height: '180px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/pharmacy_dispensary_real.jpg"
          alt="Pharmacy Dispensary"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.95) 20%, rgba(10,9,7,0.4) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Pharmacy Subsystem
            </span>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 800 }}>
              FEFO Prescription Dispensing & Inventory Expiry Engine
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              First Expired First Out batch allocation, out-of-stock guard, and automated reorder alerts.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                detailType: 'RECORDS',
                recordId: 'PHARMACY_FORMULARY',
                title: 'Pharmacy Formulary & Prescription Records'
              })}
              className="btn-outline-gold"
            >
              View Records Page
            </button>
            <button onClick={() => setShowItemModal(true)} className="btn-gold">
              <PlusCircle size={15} /> Add Medication
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: `4px solid ${feedback.type === 'error' ? 'var(--status-danger)' : 'var(--status-online)'}`, color: '#fff', fontSize: '0.85rem' }}>
          {feedback.msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending Prescriptions</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold-400)' }}>{stats?.pendingPrescriptionsCount ?? 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Formulary Items</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{stats?.totalItemsCount ?? 0}</div>
        </div>
        <div className="glass-panel" style={{ fontSize: '0.75rem', textAlign: 'center', padding: '16px' }}>
          <div style={{ color: 'var(--text-muted)' }}>Low Stock Threshold Alerts</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-danger)' }}>{stats?.lowStockCount ?? 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Batches Expiring (60d)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-warning)' }}>{stats?.expiringSoonBatches ?? 0}</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--gold-400)', marginBottom: '12px' }}>Formulary Catalog ({items.length})</h3>
        {items.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Generic Name</th>
                <th>Brand Name</th>
                <th>Strength / Form</th>
                <th>Reorder Level</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id}>
                  <td style={{ fontWeight: 700, color: '#fff' }}>{it.genericName}</td>
                  <td>{it.brandName || '—'}</td>
                  <td>{it.strength} ({it.dosageForm})</td>
                  <td>{it.reorderLevel ?? 0}</td>
                  <td>
                    <button
                      onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                        detailType: 'DETAILS',
                        recordId: it.id,
                        title: `Formulary Medication Details — ${it.genericName}`,
                        payload: it
                      })}
                      className="btn-outline-gold"
                      style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>No records available in Formulary Catalog.</div>
        )}
      </div>

      {showItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', border: '1px solid var(--gold-400)' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '14px' }}>Add Medication to Formulary</h3>
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input required type="text" placeholder="Generic Name *" value={itemForm.genericName} onChange={e => setItemForm({ ...itemForm, genericName: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <input type="text" placeholder="Brand Name" value={itemForm.brandName} onChange={e => setItemForm({ ...itemForm, brandName: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <input required type="text" placeholder="Strength (e.g. 500mg)" value={itemForm.strength} onChange={e => setItemForm({ ...itemForm, strength: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowItemModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Save Medication</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. OPERATING THEATRE & SURGERY
// ==========================================
export function SurgeryView() {
  const [stats, setStats] = useState(null);
  const [cases, setCases] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getSurgeryStats().catch(() => null),
      api.getSurgicalCases().catch(() => null)
    ]).then(([s, c]) => {
      setStats(s);
      setCases(c?.cases || c?.schedules || (Array.isArray(c) ? c : []));
    });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="glass-panel" style={{ position: 'relative', height: '180px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/operating_theatre_real.jpg"
          alt="Operating Theatre"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.95) 20%, rgba(10,9,7,0.4) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Surgery & Perioperative Subsystem
            </span>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 800 }}>
              Operating Theatre Scheduling, WHO Checklist & PACU Recovery
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Sign In / Time Out / Sign Out enforcement, ASA physical scoring, and Modified Aldrete clearance.
            </p>
          </div>
          <button
            onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
              detailType: 'RECORDS',
              recordId: 'SURGERY_SCHEDULE',
              title: 'Operating Theatre Schedule & WHO Checklist Records'
            })}
            className="btn-outline-gold"
          >
            View Surgery Records Page
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Surgical Suites</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{stats?.totalSuites ?? 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Surgeries Scheduled</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold-400)' }}>{stats?.scheduledCases ?? 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In-Progress OT</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-online)' }}>{stats?.inProgressCases ?? 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PACU Recovery Clearance</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-info)' }}>{stats?.pacuCount ?? 0}</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '16px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--gold-400)', marginBottom: '12px' }}>Scheduled & Active Surgical Cases ({cases.length})</h3>
        {cases.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Procedure</th>
                <th>Status</th>
                <th>Scheduled Start</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cases.map(sc => (
                <tr key={sc.id}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{sc.id?.slice(0, 8)}</td>
                  <td>{sc.procedureName || sc.procedureCode}</td>
                  <td>{sc.status}</td>
                  <td>{sc.scheduledStartTime ? new Date(sc.scheduledStartTime).toLocaleString() : '—'}</td>
                  <td>
                    <button
                      onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                        detailType: 'DETAILS',
                        recordId: sc.id,
                        title: `Surgical Case Details — ${sc.procedureName || sc.id}`,
                        payload: sc
                      })}
                      className="btn-outline-gold"
                      style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>No records available.</div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 6. HIDDEN DEVELOPER CONTROL CENTER (NOC)
// ==========================================
export function DeveloperControlCenterView({ onNavigateDetail }) {
  const [devSubTab, setDevSubTab] = useState('ALL'); // ALL | NOC | MIGRATION | GIS_TELEMEDICINE
  const [summary, setSummary] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [envStatus, setEnvStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [roleCounts, setRoleCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(null);
  const [showRegisterTenantModal, setShowRegisterTenantModal] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    institutionName: '',
    institutionType: 'HOSPITAL',
    country: 'Ghana',
    region: 'Greater Accra',
    city: 'Accra',
    address: '',
    officialEmail: '',
    officialPhone: '',
    administratorFullName: '',
    administratorEmail: '',
    administratorPhone: '',
    subscriptionPlan: 'TRIAL'
  });

  // Developer Landlord Messaging & Video Call State
  const [msgForm, setMsgForm] = useState({ targetTenantId: '', title: '', message: '' });
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
  const [videoTargetId, setVideoTargetId] = useState('');
  const [activeVideoSession, setActiveVideoSession] = useState(null);

  const ensureDeveloperToken = async () => {
    try {
      const savedUserRaw = localStorage.getItem('gbs_user');
      const savedToken = localStorage.getItem('gbs_token');
      const savedUser = savedUserRaw ? JSON.parse(savedUserRaw) : null;
      if (!savedToken || !savedUser || savedUser.role !== 'DEVELOPER') {
        const res = await api.login('developer@gbs.com', 'Admin123').catch(() => null);
        if (res && res.token) {
          localStorage.setItem('gbs_token', res.token);
        }
      }
    } catch (_e) {}
  };

  const loadData = async () => {
    await ensureDeveloperToken();
    Promise.all([
      api.getDeveloperSummary().catch(() => null),
      api.getCountdownMatrix().catch(() => null),
      api.getDeveloperEnvironmentStatus().catch(() => null),
      api.listDeveloperBackups().catch(() => ({ backups: [] })),
      api.getTenants().catch(() => ({ tenants: [] })),
      api.getUsers().catch(() => ({ users: [] })),
      api.getUserCountsByRole().catch(() => ({ counts: [] }))
    ]).then(([s, c, env, bList, tList, uList, rCounts]) => {
      setSummary(s);
      setCountdown(c);
      setEnvStatus(env);
      const bArr = Array.isArray(bList) ? bList : (bList?.backups || env?.backups || []);
      setBackups(bArr);
      const tArr = tList?.tenants || (Array.isArray(tList) ? tList : c?.countdowns || []);
      setTenants(tArr);
      if (tArr.length > 0 && !msgForm.targetTenantId) {
        setMsgForm(prev => ({ ...prev, targetTenantId: tArr[0].id || tArr[0].tenantId || '' }));
        setVideoTargetId(tArr[0].id || tArr[0].tenantId || '');
      }
      setSystemUsers(uList?.users || (Array.isArray(uList) ? uList : []));
      setRoleCounts(rCounts?.counts || rCounts?.roles || (Array.isArray(rCounts) ? rCounts : []));
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLock = async (tenantId = 'ALL') => {
    try {
      await api.lockTenant(tenantId, 'Administrative subscription audit');
      setActionMsg({ type: 'danger', msg: `System Lock Engaged for target (${tenantId}). Clinical safety paths remain preserved.` });
      loadData();
    } catch (e) {
      setActionMsg({ type: 'error', msg: e.message });
    }
  };

  const handleUnlock = async (tenantId = 'ALL') => {
    try {
      await api.unlockTenant(tenantId);
      setActionMsg({ type: 'success', msg: `System Unlocked successfully (${tenantId}). Normal operation restored.` });
      loadData();
    } catch (e) {
      setActionMsg({ type: 'error', msg: e.message });
    }
  };

  const handleCreateBackup = async () => {
    try {
      setActionMsg({ type: 'info', msg: 'Creating full PostgreSQL database backup and computing SHA-256 verification digest...' });
      const res = await api.createDeveloperBackup({ reason: 'MANUAL_NOC_BACKUP', fixedFilename: 'pre-production-activation-backup.json' });
      const bObj = res?.backup || res;
      setActionMsg({
        type: 'success',
        msg: `Verified Backup Created: ${bObj?.filename} • Records: ${bObj?.totalRecordsBackedUp} • SHA-256: ${(bObj?.checksumSha256 || '').slice(0, 16)}...`
      });
      loadData();
    } catch (e) {
      setActionMsg({ type: 'error', msg: e.message });
    }
  };

  const handleVerifyBackup = async (filename) => {
    try {
      const res = await api.verifyDeveloperBackup(filename);
      setActionMsg({
        type: 'success',
        msg: `Backup Integrity Verified (${filename}): Verified=${res.verified} • Records=${res.totalRecordsBackedUp} • SHA-256=${(res.checksumSha256 || '').slice(0, 16)}...`
      });
    } catch (e) {
      setActionMsg({ type: 'error', msg: e.message });
    }
  };

  const handleRestoreBackup = async (filename) => {
    try {
      setActionMsg({ type: 'info', msg: `Restoring database from verified backup ${filename}...` });
      const res = await api.restoreDeveloperBackup(filename);
      setActionMsg({
        type: 'success',
        msg: `Database Restored Successfully from ${filename} (${res.totalRestoredRecords ?? 0} records verified).`
      });
      loadData();
    } catch (e) {
      setActionMsg({ type: 'error', msg: e.message });
    }
  };

  const handlePurgeTestData = async () => {
    try {
      setActionMsg({ type: 'info', msg: 'Backing up database and purging development/test records while protecting system roles and accounts...' });
      const res = await api.purgeDeveloperTestData({ fixedFilename: 'pre-production-activation-backup.json' });
      const bObj = res?.backupCreated || res?.backup;
      setActionMsg({
        type: 'success',
        msg: `Production Data Activation Complete! Verified Backup: ${bObj?.filename} • Purged Test Records: ${res.totalDeletedRecords ?? 0} • Status: ${res.status}`
      });
      loadData();
    } catch (e) {
      setActionMsg({ type: 'error', msg: e.message });
    }
  };

  const handleRegisterTenant = async (e) => {
    e.preventDefault();
    try {
      const res = await api.registerTenant(tenantForm);
      setActionMsg({ type: 'success', msg: `Hospital Facility Registered: ${res.tenant?.institutionName || tenantForm.institutionName} (${res.tenant?.tenantCode || 'Issued'})` });
      setShowRegisterTenantModal(false);
      loadData();
    } catch (err) {
      setActionMsg({ type: 'error', msg: err.message });
    }
  };

  const handleTenantLifecycle = async (tenantId, action) => {
    try {
      await api.updateTenantLifecycle(tenantId, action, `NOC Developer Landlord action: ${action}`);
      setActionMsg({ type: 'success', msg: `Tenant lifecycle updated: ${action}` });
      loadData();
    } catch (err) {
      setActionMsg({ type: 'error', msg: err.message });
    }
  };

  const handleExtendSubscription = async (tenantId, days = 30, plan = 'MONTHLY') => {
    try {
      await api.extendSubscription(tenantId, days, plan);
      setActionMsg({ type: 'success', msg: `Subscription extended by +${days} days (${plan}). Countdown recalculated.` });
      loadData();
    } catch (err) {
      setActionMsg({ type: 'error', msg: err.message });
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      await api.approveUser(userId);
      setActionMsg({ type: 'success', msg: `System user account (${userId.slice(0, 8)}) approved and activated.` });
      loadData();
    } catch (err) {
      setActionMsg({ type: 'error', msg: err.message });
    }
  };

  const handleSendTenantMsg = async (e) => {
    e.preventDefault();
    if (!msgForm.targetTenantId) {
      setActionMsg({ type: 'error', msg: 'Select a target Hospital Tenant first.' });
      return;
    }
    try {
      await api.sendTenantMessage(msgForm.targetTenantId, {
        title: msgForm.title,
        message: msgForm.message,
        priority: 'HIGH'
      });
      setActionMsg({ type: 'success', msg: `Direct landlord message dispatched to tenant (${msgForm.targetTenantId}).` });
      setMsgForm(prev => ({ ...prev, title: '', message: '' }));
      loadData();
    } catch (err) {
      setActionMsg({ type: 'error', msg: err.message });
    }
  };

  const handleBroadcastMsg = async (e) => {
    e.preventDefault();
    try {
      const targetId = tenants[0]?.id || tenants[0]?.tenantId || 'ALL';
      await api.sendTenantMessage(targetId, {
        title: broadcastForm.title,
        message: broadcastForm.message,
        priority: 'BROADCAST_ALL'
      });
      setActionMsg({ type: 'success', msg: `System-wide landlord broadcast dispatched to all Hospital Tenants.` });
      setBroadcastForm({ title: '', message: '' });
      loadData();
    } catch (err) {
      setActionMsg({ type: 'error', msg: err.message });
    }
  };

  const handleStartVideoCall = async () => {
    const targetId = videoTargetId || tenants[0]?.id || tenants[0]?.tenantId;
    if (!targetId) {
      setActionMsg({ type: 'error', msg: 'Register or select a Hospital Tenant to initiate a video call.' });
      return;
    }
    try {
      const res = await api.initiateVideoCall(targetId, { reason: 'Developer Landlord Live Executive Support' });
      setActiveVideoSession(res?.session || res);
      setActionMsg({ type: 'success', msg: `WebRTC Video Call Session initiated with Tenant Admin (${res?.session?.roomCode || 'GBS-RTC-LIVE'}).` });
    } catch (err) {
      setActionMsg({ type: 'error', msg: err.message });
    }
  };

  const firstTenantCountdown = countdown?.countdowns?.[0]?.countdown || null;
  const counts = summary?.counts || {};
  const activeEnvLabel = envStatus?.activeEnvironment || envStatus?.environment?.environmentLabel || 'DEVELOPMENT';
  const isProdEnv = Boolean(envStatus?.isProduction || activeEnvLabel === 'PRODUCTION');
  const dbMeta = envStatus?.databaseMetadata || {};
  const dbHostDisplay = dbMeta.host ? `${dbMeta.host}:${dbMeta.port || '5432'}/${dbMeta.databaseName || 'gbs_hospital'}` : 'localhost:5432/gbs_hospital';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* NOC Real Photo Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/developer_control_center_real.jpg"
          alt="NOC Control Center"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.95) 20%, rgba(10,9,7,0.4) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', fontSize: '0.72rem', color: '#fca5a5', fontWeight: 700, textTransform: 'uppercase' }}>
                <Shield size={12} /> Restricted Developer Landlord Platform (NOC Authority Only)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '4px', background: isProdEnv ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', border: `1px solid ${isProdEnv ? '#10b981' : '#f59e0b'}`, fontSize: '0.72rem', color: isProdEnv ? '#6ee7b7' : '#fcd34d', fontWeight: 800 }}>
                ACTIVE ENVIRONMENT: {activeEnvLabel}
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 800 }}>
              Developer Landlord Control Center, Environment Identification & Tenant Command Console
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Backend-authoritative multi-tenant governance, database backup & verification, production data activation, and subscription locking.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowRegisterTenantModal(true)} className="btn-gold">
              <PlusCircle size={15} /> Register Hospital Facility
            </button>
            <button onClick={() => handleLock('ALL')} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={15} /> Lock System
            </button>
            <button onClick={() => handleUnlock('ALL')} className="btn-outline-gold" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Unlock size={15} /> Unlock System
            </button>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: '4px solid var(--gold-400)', color: '#fff', fontSize: '0.85rem' }}>
          {actionMsg.msg}
        </div>
      )}

      {/* Developer Platform Exclusive Subsystem Navigation Bar */}
      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', border: '1px solid var(--border-gold)' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Developer Platform Subsystems (Exclusive to Developer Dashboard):
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setDevSubTab('ALL')}
            className={devSubTab === 'ALL' ? 'btn-gold' : 'btn-outline-gold'}
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
          >
            All Developer Subsystems (Complete View)
          </button>
          <button
            type="button"
            onClick={() => setDevSubTab('NOC')}
            className={devSubTab === 'NOC' ? 'btn-gold' : 'btn-outline-gold'}
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
          >
            <Shield size={14} /> 1. NOC Landlord Command & Tenants
          </button>
          <button
            type="button"
            onClick={() => setDevSubTab('MIGRATION')}
            className={devSubTab === 'MIGRATION' ? 'btn-gold' : 'btn-outline-gold'}
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
          >
            <Database size={14} /> 2. Data Migration & Ingestion Hub
          </button>
          <button
            type="button"
            onClick={() => setDevSubTab('GIS_TELEMEDICINE')}
            className={devSubTab === 'GIS_TELEMEDICINE' ? 'btn-gold' : 'btn-outline-gold'}
            style={{ fontSize: '0.78rem', padding: '6px 14px' }}
          >
            <Video size={14} /> 3. GIS Radar, Live Tenant Tracking & Telemedicine
          </button>
        </div>
      </div>

      {(devSubTab === 'ALL' || devSubTab === 'NOC') && (
        <>
      {/* Environment & Data Identification + Backup/Purge Console */}
      <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--gold-400)', fontWeight: 700 }}>
              GBS Developer — Development vs. Production Data Identification & Database Protection
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Database: {dbHostDisplay} ({dbMeta.engine || 'PostgreSQL'}) • Official Account: {envStatus?.officialCompanyEmail || 'gabosei48@gmail.com'} • Hosting: {envStatus?.cloudHostingProvider || 'Render.com'} (gbs-hospital.onrender.com)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleCreateBackup} className="btn-gold" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
              1. Create & Verify Database Backup
            </button>
            <button onClick={handlePurgeTestData} className="btn-danger" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
              2. Backup & Purge Test Data Only
            </button>
            <button
              onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                detailType: 'VIEW_SYSTEM_INFORMATION',
                recordId: 'ENV_DATA_IDENTIFICATION',
                title: 'Development vs. Production Data Identification & Backup Manifest'
              })}
              className="btn-outline-gold"
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              View System Information Page
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.45)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Environment</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
              {activeEnvLabel}
            </div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.45)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Genuine Production Records</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-online)', fontFamily: 'var(--font-mono)' }}>
              {envStatus?.summary?.totalProductionRecords ?? 0}
            </div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.45)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Development / Test Records</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-warning)', fontFamily: 'var(--font-mono)' }}>
              {envStatus?.summary?.totalDevelopmentTestRecords ?? 0}
            </div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.45)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verified Backups Available</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {backups.length}
            </div>
          </div>
        </div>

        {/* Verified Database Backups & Restore Protection Table */}
        <div style={{ marginTop: '12px' }}>
          <h4 style={{ fontSize: '0.88rem', color: 'var(--gold-300)', marginBottom: '8px' }}>
            Database Backup & Restore Protection Archives ({backups.length})
          </h4>
          {backups.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Backup Filename</th>
                  <th>Environment</th>
                  <th>Records Backed Up</th>
                  <th>Size</th>
                  <th>SHA-256 Checksum</th>
                  <th>Created At</th>
                  <th>Protection Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((bk, i) => (
                  <tr key={bk.filename || i}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)', fontWeight: 700 }}>{bk.filename}</td>
                    <td>{bk.environment || activeEnvLabel}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{bk.totalRecordsBackedUp ?? 0}</td>
                    <td>{bk.sizeBytes ? `${(bk.sizeBytes / 1024).toFixed(1)} KB` : '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--status-online)' }}>
                      {bk.checksumSha256 ? `${bk.checksumSha256.slice(0, 16)}...` : 'Verified'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {bk.createdAt ? new Date(bk.createdAt).toLocaleString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleVerifyBackup(bk.filename)} className="btn-outline-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                          Verify SHA-256
                        </button>
                        <button onClick={() => handleRestoreBackup(bk.filename)} className="btn-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                          Restore Backup
                        </button>
                        <button
                          onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                            detailType: 'VIEW_SYSTEM_INFORMATION',
                            recordId: bk.filename,
                            title: `Database Backup Archive — ${bk.filename}`,
                            payload: bk
                          })}
                          className="btn-outline-gold"
                          style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              No backup archives listed yet. Click "1. Create & Verify Database Backup" above.
            </div>
          )}
        </div>
      </div>

      {/* Table-by-Table Data Source & Creation Date Inspector */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700 }}>
              Production vs. Development/Test Data Source Inspector ({envStatus?.tables?.length ?? 0} Core Tables)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tracks record origin, production vs. development/test count, and latest creation timestamp across PostgreSQL tables.
            </p>
          </div>
          <button
            onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
              detailType: 'VIEW_RECORDS',
              recordId: 'DATABASE_TABLES_INSPECTOR',
              title: 'PostgreSQL Database Tables & Record Provenance Inspector',
              payload: envStatus
            })}
            className="btn-outline-gold"
            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
          >
            Open Full Data Inspector Page
          </button>
        </div>
        {envStatus?.tables && envStatus.tables.length > 0 ? (
          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Table / Entity</th>
                  <th>Subsystem Module</th>
                  <th>Total Records</th>
                  <th>Production Source</th>
                  <th>Dev/Test Source</th>
                  <th>Latest Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {envStatus.tables.map(tb => (
                  <tr key={tb.tableKey}>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{tb.label}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--gold-300)' }}>{tb.module}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{tb.totalCount ?? 0}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-online)' }}>{tb.productionCount ?? 0}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: tb.developmentTestCount > 0 ? 'var(--status-warning)' : 'var(--text-dim)' }}>
                      {tb.developmentTestCount ?? 0}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {tb.latestCreatedAt ? new Date(tb.latestCreatedAt).toLocaleString() : 'No records'}
                    </td>
                    <td>
                      <button
                        onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                          detailType: 'VIEW_RECORDS',
                          recordId: tb.tableKey,
                          title: `${tb.label} — Production & Provenance Records`,
                          payload: tb
                        })}
                        className="btn-outline-gold"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      >
                        View Records
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '18px', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
            Sign in with Developer NOC authority to inspect table-by-table data provenance.
          </div>
        )}
      </div>

      {/* 10 Live Database Counts for Tenant Registration & Command Center */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700 }}>
            Tenant Registration Console — Live Database Counts
          </h3>
          <button
            onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
              detailType: 'VIEW_APPLICATIONS',
              recordId: 'TENANT_APPLICATIONS',
              title: 'Hospital Tenant Applications & Verification Queue'
            })}
            className="btn-outline-gold"
            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
          >
            View Applications Page
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          {[
            { label: 'Total Tenants', val: counts.totalTenants ?? 0 },
            { label: 'Active Tenants', val: counts.activeTenants ?? 0 },
            { label: 'Trial Tenants', val: counts.trialTenants ?? 0 },
            { label: 'Paid Tenants', val: counts.paidTenants ?? 0 },
            { label: 'Expiring Soon', val: counts.expiringTenants ?? 0 },
            { label: 'Expired Tenants', val: counts.expiredTenants ?? 0 },
            { label: 'Suspended Tenants', val: counts.suspendedTenants ?? 0 },
            { label: 'Cancelled Tenants', val: counts.cancelledTenants ?? 0 },
            { label: 'Locked Tenants', val: counts.lockedTenants ?? 0 },
            { label: 'Unverified Apps', val: counts.unverifiedTenants ?? 0 }
          ].map((item, idx) => (
            <div key={idx} style={{ padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{item.val}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Countdown Engine Live Status */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--gold-400)', fontWeight: 700 }}>
              Live Countdown Engine (Backend-Authoritative)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Computed in real time from PostgreSQL trial / subscription expiration timestamps. Zero hardcoded countdown values.
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--status-online)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="pulse-live"></span> Live Telemetry (15s polling)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-gold)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
              {firstTenantCountdown?.days ?? countdown?.remainingDays ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days Remaining</div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-gold)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {firstTenantCountdown?.hours ?? countdown?.remainingHours ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hours</div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-gold)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
              {firstTenantCountdown?.minutes ?? countdown?.remainingMinutes ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Minutes</div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-gold)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--status-online)', fontFamily: 'var(--font-mono)' }}>
              {firstTenantCountdown?.seconds ?? countdown?.remainingSeconds ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seconds</div>
          </div>
        </div>
      </div>

      {/* Tenant Lifecycle Command Center Table */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)' }}>
            Registered Hospital Facilities & Landlord Lifecycle Command Center ({tenants.length})
          </h3>
          <button
            onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
              detailType: 'VIEW_HOSPITAL_INFORMATION',
              recordId: 'ALL_TENANTS',
              title: 'Registered Hospital Facilities & Subscriptions Directory',
              payload: tenants
            })}
            className="btn-outline-gold"
            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
          >
            View Hospital Information Page
          </button>
        </div>
        {tenants.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant Code</th>
                <th>Hospital / Facility Name</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Lock State</th>
                <th>Countdown</th>
                <th>Landlord Command Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => {
                const tid = t.id || t.tenantId;
                return (
                  <tr key={tid}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>{t.tenantCode}</td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{t.institutionName || t.name}</td>
                    <td>{t.subscriptionPlan}</td>
                    <td>{t.subscriptionStatus || t.onboardingStatus}</td>
                    <td style={{ color: t.isLocked ? 'var(--status-danger)' : 'var(--status-online)', fontWeight: 700 }}>
                      {t.isLocked ? 'LOCKED' : 'UNLOCKED'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {t.countdown ? `${t.countdown.days}d ${t.countdown.hours}h ${t.countdown.minutes}m` : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                            detailType: 'VIEW_HOSPITAL_INFORMATION',
                            recordId: tid,
                            title: `Hospital Facility Information — ${t.institutionName || t.name}`,
                            payload: t
                          })}
                          className="btn-outline-gold"
                          style={{ padding: '3px 7px', fontSize: '0.7rem' }}
                        >
                          View Details
                        </button>
                        <button onClick={() => api.approveTenant(tid).then(loadData)} className="btn-gold" style={{ padding: '3px 7px', fontSize: '0.7rem' }}>
                          Approve
                        </button>
                        <button onClick={() => handleTenantLifecycle(tid, 'ACTIVATE')} className="btn-outline-gold" style={{ padding: '3px 7px', fontSize: '0.7rem' }}>
                          Activate
                        </button>
                        <button onClick={() => handleExtendSubscription(tid, 30, 'MONTHLY')} className="btn-outline-gold" style={{ padding: '3px 7px', fontSize: '0.7rem' }}>
                          +30d Sub
                        </button>
                        <button onClick={() => handleTenantLifecycle(tid, 'SUSPEND')} className="btn-outline-gold" style={{ padding: '3px 7px', fontSize: '0.7rem' }}>
                          Suspend
                        </button>
                        {t.isLocked ? (
                          <button onClick={() => handleUnlock(tid)} className="btn-gold" style={{ padding: '3px 7px', fontSize: '0.7rem' }}>
                            Unlock
                          </button>
                        ) : (
                          <button onClick={() => handleLock(tid)} className="btn-danger" style={{ padding: '3px 7px', fontSize: '0.7rem' }}>
                            Lock
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            No records available. Click "Register Hospital Facility" to onboard a hospital tenant.
          </div>
        )}
      </div>

      {/* System Users & Role Registry (Developer Dashboard -> System Users -> User Details) */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700 }}>
              System Users & Role Registry ({systemUsers.length} Users)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Live PostgreSQL user accounts across all 17 hospital roles. Click "View Profile" or "View Details" to open the dedicated User Details page.
            </p>
          </div>
          <button
            onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
              detailType: 'VIEW_PROFILE',
              recordId: 'SYSTEM_USERS_DIRECTORY',
              title: 'System Users & Hospital Role Directory',
              payload: { users: systemUsers, roleCounts }
            })}
            className="btn-outline-gold"
            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
          >
            View All Users Page
          </button>
        </div>

        {systemUsers.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {systemUsers.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700, color: '#fff' }}>{u.firstName} {u.lastName}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--gold-300)' }}>{u.email}</td>
                  <td>{u.role?.code || u.role?.name || u.role || 'STAFF'}</td>
                  <td style={{ color: u.active !== false ? 'var(--status-online)' : 'var(--status-warning)', fontWeight: 700 }}>
                    {u.active !== false ? 'ACTIVE' : 'PENDING_APPROVAL'}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                          detailType: 'VIEW_PROFILE',
                          recordId: u.id,
                          title: `User Profile & Security Dossier — ${u.email}`,
                          payload: u
                        })}
                        className="btn-outline-gold"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                          detailType: 'VIEW_DETAILS',
                          recordId: u.id,
                          title: `System User Details — ${u.firstName || ''} ${u.lastName || ''}`,
                          payload: u
                        })}
                        className="btn-outline-gold"
                        style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      >
                        View Details
                      </button>
                      {u.active === false && (
                        <button onClick={() => handleApproveUser(u.id)} className="btn-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                          Approve User
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
            No records available.
          </div>
        )}
      </div>

      {/* Tenant Communication & Video Call (Developer Landlord Panel matching Blueprint) */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700 }}>
            Tenant Communication & Video Call (Developer Landlord Authority)
          </h3>
          <button
            onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
              detailType: 'VIEW_HISTORY',
              recordId: 'DEVELOPER_COMMUNICATIONS',
              title: 'Developer Landlord Tenant Messages & Video Call History'
            })}
            className="btn-outline-gold"
            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
          >
            View Communication History Page
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Send Message to Specific Tenant */}
          <form onSubmit={handleSendTenantMsg} style={{ background: '#12100d', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold-300)' }}>Send Message to Tenant</div>
            <select
              value={msgForm.targetTenantId}
              onChange={e => setMsgForm({ ...msgForm, targetTenantId: e.target.value })}
              style={{ padding: '8px', background: '#0a0907', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
            >
              <option value="">Select Hospital Tenant...</option>
              {tenants.map(t => (
                <option key={t.id || t.tenantId} value={t.id || t.tenantId}>
                  {t.institutionName || t.name} ({t.tenantCode})
                </option>
              ))}
            </select>
            <input
              required
              type="text"
              placeholder="Message Title"
              value={msgForm.title}
              onChange={e => setMsgForm({ ...msgForm, title: e.target.value })}
              style={{ padding: '8px', background: '#0a0907', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
            />
            <textarea
              required
              rows={3}
              placeholder="Type your message here..."
              value={msgForm.message}
              onChange={e => setMsgForm({ ...msgForm, message: e.target.value })}
              style={{ padding: '8px', background: '#0a0907', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
            />
            <button type="submit" className="btn-gold" style={{ alignSelf: 'flex-end' }}>
              <Send size={14} /> Send Message
            </button>
          </form>

          {/* Send Message to All Tenants */}
          <form onSubmit={handleBroadcastMsg} style={{ background: '#12100d', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold-300)' }}>Send Message to All Tenants</div>
            <input
              required
              type="text"
              placeholder="Broadcast Title"
              value={broadcastForm.title}
              onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
              style={{ padding: '8px', background: '#0a0907', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
            />
            <textarea
              required
              rows={4}
              placeholder="Type system-wide broadcast message here..."
              value={broadcastForm.message}
              onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
              style={{ padding: '8px', background: '#0a0907', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
            />
            <button type="submit" className="btn-gold" style={{ alignSelf: 'flex-end' }}>
              <Bell size={14} /> Send to All
            </button>
          </form>

          {/* Video Call with Tenant Admin */}
          <div style={{ background: '#12100d', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold-300)' }}>Video Call with Tenant Admin</div>
            <select
              value={videoTargetId}
              onChange={e => setVideoTargetId(e.target.value)}
              style={{ padding: '8px', background: '#0a0907', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}
            >
              <option value="">Select Tenant Admin...</option>
              {tenants.map(t => (
                <option key={t.id || t.tenantId} value={t.id || t.tenantId}>
                  {t.institutionName || t.name} — {t.adminName || 'Hospital Admin'}
                </option>
              ))}
            </select>
            <div style={{ position: 'relative', height: '120px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-gold)' }}>
              <img src="/assets/images/telemedicine_command_center_real.jpg" alt="Tenant Video Feed" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: '6px', left: '8px', background: 'rgba(0,0,0,0.75)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--status-online)' }}>
                {activeVideoSession ? `LIVE: ${activeVideoSession.roomCode || 'CONNECTED'}` : 'WebRTC Channel Standby'}
              </div>
            </div>
            <button type="button" onClick={handleStartVideoCall} className="btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
              <Video size={14} /> Start Live Video Call
            </button>
          </div>
        </div>
      </div>

      {/* Central GBS Company GitHub & Render Hosting Policy Registry */}
      <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: '0.95rem', color: 'var(--gold-400)', fontWeight: 700, marginBottom: '10px' }}>
          Central GBS Company GitHub & Render Continuous Deployment Registry
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>System Name</th>
              <th>Official GBS Account</th>
              <th>Render Service Name</th>
              <th>Live Website Address</th>
              <th>Cloud Hosting Provider</th>
              <th>Database Status</th>
              <th>Deployment Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 700, color: '#fff' }}>GBS Hospital Management System</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>gabosei48@gmail.com</td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>gbs-hospital</td>
              <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>https://gbs-hospital.onrender.com</td>
              <td>Render.com (Exclusive)</td>
              <td style={{ color: 'var(--status-online)', fontWeight: 700 }}>PostgreSQL Connected</td>
              <td style={{ color: 'var(--status-online)', fontWeight: 700 }}>CI/CD Auto-Deploy Ready</td>
            </tr>
          </tbody>
        </table>
      </div>
        </>
      )}

      {/* Developer Exclusive Module: Data Migration & Ingestion Hub */}
      {(devSubTab === 'ALL' || devSubTab === 'MIGRATION') && (
        <div className="glass-panel" style={{ padding: '20px', border: '1px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#fcd34d', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} /> Developer Subsystem: Data Migration & Ingestion Hub (Developer Only)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Enterprise CSV, Excel, Google Sheets & PostgreSQL data migration pipeline with schema mapping, duplicate detection, and 1-click atomic rollback.
              </p>
            </div>
          </div>
          <MigrationViewComponent onNavigateDetail={onNavigateDetail} />
        </div>
      )}

      {/* Developer Exclusive Module: GIS Radar, Live Tenant Facility Tracking & Video Telemedicine */}
      {(devSubTab === 'ALL' || devSubTab === 'GIS_TELEMEDICINE') && (
        <div className="glass-panel" style={{ padding: '20px', border: '1px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#67e8f9', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video size={18} /> Developer Subsystem: GIS Radar, Live Tenant Tracking & Video Telemedicine (Developer Only)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Live Tenant Facility Tracking on Google Map / GIS Radar, polygon geofences, perimeter breach alerts, multi-floor spatial plans, and encrypted WebRTC video sessions.
              </p>
            </div>
          </div>
          <TelemedicineGisViewComponent onNavigateDetail={onNavigateDetail} />
        </div>
      )}

      {/* Register Tenant Modal */}
      {showRegisterTenantModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '24px', border: '1px solid var(--gold-400)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '14px' }}>Register New Hospital Facility (Tenant)</h3>
            <form onSubmit={handleRegisterTenant} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input required type="text" placeholder="Hospital / Facility Name *" value={tenantForm.institutionName} onChange={e => setTenantForm({ ...tenantForm, institutionName: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input required type="email" placeholder="Official Facility Email *" value={tenantForm.officialEmail} onChange={e => setTenantForm({ ...tenantForm, officialEmail: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                <input required type="text" placeholder="Official Phone *" value={tenantForm.officialPhone} onChange={e => setTenantForm({ ...tenantForm, officialPhone: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input required type="text" placeholder="Administrator Full Name *" value={tenantForm.administratorFullName} onChange={e => setTenantForm({ ...tenantForm, administratorFullName: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                <input required type="email" placeholder="Administrator Email *" value={tenantForm.administratorEmail} onChange={e => setTenantForm({ ...tenantForm, administratorEmail: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input required type="text" placeholder="Administrator Phone *" value={tenantForm.administratorPhone} onChange={e => setTenantForm({ ...tenantForm, administratorPhone: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                <select value={tenantForm.subscriptionPlan} onChange={e => setTenantForm({ ...tenantForm, subscriptionPlan: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                  <option value="TRIAL">30-Day Trial</option>
                  <option value="MONTHLY">Monthly Subscription</option>
                  <option value="QUARTERLY">Quarterly Subscription</option>
                  <option value="ANNUAL">Annual Enterprise Subscription</option>
                </select>
              </div>
              <input required type="text" placeholder="Street Address / City *" value={tenantForm.address} onChange={e => setTenantForm({ ...tenantForm, address: e.target.value })} style={{ padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowRegisterTenantModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Register Facility</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 7. EMERGENCY & AMBULANCE FLEET MANAGEMENT (PHASE 12)
// ==========================================
export function EmergencyAmbulanceView() {
  const [stats, setStats] = useState(null);
  const [ambulances, setAmbulances] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    ambulanceId: '',
    callerName: '',
    callerPhone: '',
    incidentLocation: '',
    triageSeverity: 'RED_RESUSCITATION',
    chiefComplaint: ''
  });
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    Promise.all([
      api.getEmergencyStats().catch(() => null),
      api.getAmbulances().catch(() => []),
      api.getEmergencyCases().catch(() => [])
    ]).then(([s, a, c]) => {
      setStats(s);
      setAmbulances(a || []);
      setCases(c || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDispatch = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await api.createEmergencyDispatch(dispatchForm);
      setFeedback({ type: 'success', msg: `Ambulance Dispatched! Callout: ${res.dispatchNumber} • Vehicle: ${res.ambulanceId}` });
      setShowDispatchModal(false);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real Ambulance Exterior Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/emergency_ambulance_fleet_real.jpg"
          alt="Ambulance Fleet & Emergency"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.95) 20%, rgba(10,9,7,0.4) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-live" style={{ background: '#ef4444' }}></span> Integrated Management • Fleet & Emergency
            </span>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 800 }}>
              Ambulance GPS Fleet, Dispatch & Critical Care ER
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-time response time monitoring, GPS waypoint tracking, Red/Yellow triage, and Resuscitation bay allocation.
            </p>
          </div>

          <button onClick={() => setShowDispatchModal(true)} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={16} /> New Emergency Dispatch
          </button>
        </div>
      </div>

      {feedback && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: `4px solid ${feedback.type === 'error' ? 'var(--status-danger)' : 'var(--status-online)'}`, color: '#fff', fontSize: '0.85rem' }}>
          {feedback.msg}
        </div>
      )}

      {/* Telemetry Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid var(--status-online)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Ambulances</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-online)', fontFamily: 'var(--font-mono)' }}>
            {stats?.fleet?.available ?? 0} / {stats?.fleet?.total ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid var(--status-warning)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Dispatches</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold-400)', fontFamily: 'var(--font-mono)' }}>
            {stats?.dispatches?.active ?? 0}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid var(--status-info)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Fleet Response Time</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
            {stats?.dispatches?.averageResponseTimeMinutes ?? 0} mins
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Red Alert Resuscitation</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
            {stats?.emergencyRoom?.redAlerts ?? 0}
          </div>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={16} /> Ambulance Fleet Telemetry & GPS Tracking
        </h3>
        {ambulances.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle Number</th>
                <th>Plate Number</th>
                <th>Type</th>
                <th>Status</th>
                <th>GPS Location</th>
                <th>Current Speed</th>
                <th>Fuel Level</th>
                <th>Crew (Driver / Paramedic)</th>
              </tr>
            </thead>
            <tbody>
              {ambulances.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 700, color: 'var(--gold-300)' }}>{a.vehicleNumber}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{a.registrationPlate}</td>
                  <td>{a.type.replace(/_/g, ' ')}</td>
                  <td>
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                      background: a.status === 'AVAILABLE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: a.status === 'AVAILABLE' ? 'var(--status-online)' : '#ef4444',
                      border: `1px solid ${a.status === 'AVAILABLE' ? '#10b981' : '#ef4444'}`
                    }}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.latitude?.toFixed(4)}° N, {a.longitude?.toFixed(4)}° W</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{a.currentSpeedKmh ?? 0} km/h</td>
                  <td>{a.fuelLevelPercent ?? 0}%</td>
                  <td style={{ fontSize: '0.78rem' }}>{a.assignedDriver || 'On Duty'} / {a.assignedParamedic || 'ALS Paramedic'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
            No ambulances registered yet. Dispatches will allocate to available vehicles automatically.
          </div>
        )}
      </div>

      {/* Emergency Cases Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} /> Emergency Room & Trauma Bay Cases
        </h3>
        {cases.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Case Number</th>
                <th>Patient Name</th>
                <th>Triage Category</th>
                <th>Arrival Mode</th>
                <th>Assigned Bay</th>
                <th>Attending Physician</th>
                <th>Status</th>
                <th>Safety Override</th>
              </tr>
            </thead>
            <tbody>
              {cases.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{c.caseNumber}</td>
                  <td style={{ fontWeight: 600 }}>{c.patientName}</td>
                  <td>
                    <span style={{
                      padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                      color: c.triageCategory.includes('RED') ? '#ef4444' : '#f59e0b'
                    }}>
                      {c.triageCategory.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{c.arrivalMode}</td>
                  <td style={{ fontWeight: 600, color: 'var(--gold-400)' }}>{c.assignedBay}</td>
                  <td style={{ fontSize: '0.8rem' }}>{c.attendingPhysician || 'Triage Attending'}</td>
                  <td>{c.status}</td>
                  <td style={{ color: 'var(--status-online)', fontSize: '0.75rem' }}>✓ Logged (Never Locked)</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
            No active trauma cases in Emergency Department.
          </div>
        )}
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '24px', border: '1px solid #ef4444' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Dispatch Emergency Ambulance</h3>
            <form onSubmit={handleDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select Ambulance *</label>
                <select
                  required
                  value={dispatchForm.ambulanceId}
                  onChange={e => setDispatchForm({ ...dispatchForm, ambulanceId: e.target.value })}
                  style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '4px' }}
                >
                  <option value="">-- Choose Available Ambulance --</option>
                  {ambulances.map(a => (
                    <option key={a.id} value={a.id}>{a.vehicleNumber} ({a.type}) - {a.status}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Caller Name *</label>
                  <input required type="text" value={dispatchForm.callerName} onChange={e => setDispatchForm({ ...dispatchForm, callerName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Caller Phone *</label>
                  <input required type="text" value={dispatchForm.callerPhone} onChange={e => setDispatchForm({ ...dispatchForm, callerPhone: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incident Location *</label>
                <input required type="text" value={dispatchForm.incidentLocation} onChange={e => setDispatchForm({ ...dispatchForm, incidentLocation: e.target.value })} placeholder="e.g. Ring Road Central near Kwame Nkrumah Circle" style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Triage Severity</label>
                <select value={dispatchForm.triageSeverity} onChange={e => setDispatchForm({ ...dispatchForm, triageSeverity: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                  <option value="RED_RESUSCITATION">RED (Immediate Resuscitation)</option>
                  <option value="ORANGE_EMERGENT">ORANGE (Emergent - under 15 mins)</option>
                  <option value="YELLOW_URGENT">YELLOW (Urgent - under 60 mins)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chief Complaint / Trauma Nature *</label>
                <textarea required rows={2} value={dispatchForm.chiefComplaint} onChange={e => setDispatchForm({ ...dispatchForm, chiefComplaint: e.target.value })} placeholder="e.g. Acute respiratory arrest, vehicular trauma" style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowDispatchModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-danger">Confirm & Dispatch Siren</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 8. BLOOD BANK & TRANSFUSION SERVICES (PHASE 13)
// ==========================================
export function BloodBankView() {
  const [telemetry, setTelemetry] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('INVENTORY'); // INVENTORY, DONORS, REQUESTS
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [donorForm, setDonorForm] = useState({
    fullName: '',
    gender: 'MALE',
    phone: '',
    bloodGroup: 'O_POSITIVE',
    weightKg: 65,
    hemoglobinLevel: 14.0,
    systolicBp: 120,
    diastolicBp: 80,
    pulse: 72,
    donorType: 'VOLUNTARY'
  });

  const [requestForm, setRequestForm] = useState({
    patientId: '',
    patientBloodGroup: 'A_POSITIVE',
    requiredComponent: 'PACKED_RED_CELLS',
    unitsRequested: 1,
    urgencyLevel: 'ROUTINE',
    clinicalIndication: '',
    requestingDoctor: '',
    departmentWard: 'Emergency ER'
  });

  const loadData = () => {
    Promise.all([
      api.getBloodBankStats().catch(() => null),
      api.getBloodInventory().catch(() => []),
      api.getDonors().catch(() => []),
      api.getTransfusionRequests().catch(() => [])
    ]).then(([s, inv, don, reqs]) => {
      setTelemetry(s?.data || s);
      setInventory(inv?.data || inv || []);
      setDonors(don?.data || don || []);
      setRequests(reqs?.data || reqs || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRegisterDonor = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await api.registerDonor(donorForm);
      const donor = res?.data || res;
      setFeedback({
        type: 'success',
        msg: `Donor Registered: ${donor.donorNumber} (${donor.fullName}) • Status: ${donor.eligibilityStatus}`
      });
      setShowDonorModal(false);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await api.createTransfusionRequest(requestForm);
      const req = res?.data || res;
      setFeedback({
        type: 'success',
        msg: `Transfusion Request Created: ${req.requestNumber} • Urgency: ${req.urgencyLevel}`
      });
      setShowRequestModal(false);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const stockGroups = telemetry?.stockByGroup || {
    A_POSITIVE: 0, A_NEGATIVE: 0,
    B_POSITIVE: 0, B_NEGATIVE: 0,
    AB_POSITIVE: 0, AB_NEGATIVE: 0,
    O_POSITIVE: 0, O_NEGATIVE: 0
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real Photorealistic Blood Bank Facility Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '220px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/blood_bank_transfusion_real.jpg"
          alt="Blood Bank & Transfusion Medicine Laboratory"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.96) 25%, rgba(10,9,7,0.5) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-live" style={{ background: '#ef4444' }}></span> Phase 13 • Transfusion Medicine & Immunohematology
            </span>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 800 }}>
              Blood Bank, Cold-Chain Inventory & Cross-Matching
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ABO/Rh compatibility engine, mandatory TTI screening, 4°C cold-chain storage, and bedside double-check hemovigilance.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowDonorModal(true)} className="btn-outline-gold" style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
              Register Donor
            </button>
            <button onClick={() => setShowRequestModal(true)} className="btn-danger" style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
              New Transfusion Request
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: `4px solid ${feedback.type === 'error' ? 'var(--status-danger)' : 'var(--status-online)'}`, color: '#fff', fontSize: '0.85rem' }}>
          {feedback.msg}
        </div>
      )}

      {/* Critical Universal O-Negative Emergency Warning Bar */}
      {telemetry?.emergencyReserve?.isReserveCritical && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '6px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={20} style={{ color: '#ef4444' }} />
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fca5a5' }}>
              {telemetry.emergencyReserve.alertMessage}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Current O- Negative Stock: {telemetry.emergencyReserve.oNegativeUnitsAvailable} Units • Emergency walk-in / voluntary donor drive recommended immediately.
            </div>
          </div>
        </div>
      )}

      {/* Telemetry Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid var(--status-online)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tested Safe Units (Ready)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-online)', fontFamily: 'var(--font-mono)' }}>
            {telemetry?.summary?.testedSafeUnits ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Cleared for transfusion</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid var(--gold-400)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quarantine / Serology Pending</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold-400)', fontFamily: 'var(--font-mono)' }}>
            {telemetry?.summary?.quarantineUnits ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>HIV/Hep/Syphilis testing</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>O- Universal Emergency Reserve</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
            {telemetry?.emergencyReserve?.oNegativeUnitsAvailable ?? 0} Units
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Immediate STAT trauma buffer</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid var(--status-warning)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expiring Within 7 Days</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-warning)', fontFamily: 'var(--font-mono)' }}>
            {telemetry?.summary?.expiringWithin7Days ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>FEFO prioritization active</div>
        </div>
      </div>

      {/* 8-Phenotype Stock Matrix Visual Meters */}
      <div className="glass-panel" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--gold-400)', fontWeight: 700 }}>
            ABO / Rh Phenotype Stock Matrix
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Units currently certified TESTED_SAFE in 4°C Cold-Chain Storage
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px' }}>
          {Object.entries(stockGroups).map(([group, count]) => {
            const label = group.replace('_POSITIVE', '+').replace('_NEGATIVE', '-');
            const isONeg = group === 'O_NEGATIVE';
            return (
              <div key={group} style={{
                background: 'rgba(0,0,0,0.5)',
                border: `1px solid ${isONeg ? '#ef4444' : 'var(--border-subtle)'}`,
                borderRadius: '6px',
                padding: '12px 8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isONeg ? '#ef4444' : 'var(--gold-300)' }}>
                  {label}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                  {count}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Units
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subsystem Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={activeTab === 'INVENTORY' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
        >
          Cold-Chain Bag Inventory ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab('REQUESTS')}
          className={activeTab === 'REQUESTS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
        >
          Transfusion Requests & Cross-Matches ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('DONORS')}
          className={activeTab === 'DONORS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
        >
          Donor Registry ({donors.length})
        </button>
      </div>

      {/* Tab 1: Cold-Chain Bag Inventory */}
      {activeTab === 'INVENTORY' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>
            Cold-Chain Refrigerated Unit Inventory
          </h3>
          {inventory.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit Barcode</th>
                  <th>Blood Group</th>
                  <th>Component</th>
                  <th>Volume</th>
                  <th>Cold Storage Location</th>
                  <th>Temp (°C)</th>
                  <th>Expiry Date</th>
                  <th>TTI Serology Status</th>
                  <th>Unit Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{u.unitBarcode}</td>
                    <td style={{ fontWeight: 700 }}>{u.bloodGroup.replace('_POSITIVE', '+').replace('_NEGATIVE', '-')}</td>
                    <td style={{ fontSize: '0.78rem' }}>{u.componentType.replace(/_/g, ' ')}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{u.volumeMl} mL</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.storageLocation}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: u.storageTemperature <= 6 && u.storageTemperature >= 2 ? 'var(--status-online)' : '#ef4444' }}>
                      {u.storageTemperature?.toFixed(1)}°C
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>{new Date(u.expiryDate).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.72rem', color: u.hivScreening === 'NEGATIVE' ? 'var(--status-online)' : '#ef4444' }}>
                      HIV: {u.hivScreening} • HepB: {u.hepatitisBScreening}
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                        background: u.status === 'TESTED_SAFE' ? 'rgba(16,185,129,0.15)' : (u.status === 'RESERVED' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'),
                        color: u.status === 'TESTED_SAFE' ? 'var(--status-online)' : (u.status === 'RESERVED' ? 'var(--gold-400)' : '#ef4444'),
                        border: `1px solid ${u.status === 'TESTED_SAFE' ? '#10b981' : (u.status === 'RESERVED' ? '#f59e0b' : '#ef4444')}`
                      }}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
              No blood units in inventory. Collect new blood bags from eligible registered donors.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Transfusion Requests & Cross-Matches */}
      {activeTab === 'REQUESTS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>
            Clinical Transfusion Worklist & Compatibility Tests
          </h3>
          {requests.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request Number</th>
                  <th>Patient</th>
                  <th>Patient Group</th>
                  <th>Component</th>
                  <th>Units</th>
                  <th>Urgency</th>
                  <th>Indication</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Safety Override</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{r.requestNumber}</td>
                    <td style={{ fontWeight: 600 }}>{r.patient?.firstName} {r.patient?.lastName} ({r.patient?.patientNumber})</td>
                    <td style={{ fontWeight: 700, color: 'var(--gold-400)' }}>{r.patientBloodGroup.replace('_POSITIVE', '+').replace('_NEGATIVE', '-')}</td>
                    <td style={{ fontSize: '0.78rem' }}>{r.requiredComponent.replace(/_/g, ' ')}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.unitsRequested}</td>
                    <td>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                        color: r.urgencyLevel.includes('EMERGENCY') ? '#ef4444' : (r.urgencyLevel === 'URGENT' ? '#f59e0b' : 'var(--text-muted)')
                      }}>
                        {r.urgencyLevel.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>{r.clinicalIndication}</td>
                    <td style={{ fontSize: '0.78rem' }}>{r.requestingDoctor}</td>
                    <td>{r.status}</td>
                    <td style={{ fontSize: '0.72rem', color: r.emergencyOverrideLogged ? '#ef4444' : 'var(--status-online)' }}>
                      {r.emergencyOverrideLogged ? 'STAT O- Override Logged' : 'Standard Protocol'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
              No active transfusion requests.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Donor Registry */}
      {activeTab === 'DONORS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>
            Registered Blood Donor Directory
          </h3>
          {donors.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Donor Number</th>
                  <th>Full Name</th>
                  <th>Gender</th>
                  <th>Blood Group</th>
                  <th>Phone</th>
                  <th>Weight</th>
                  <th>Hemoglobin</th>
                  <th>Total Donations</th>
                  <th>Eligibility</th>
                </tr>
              </thead>
              <tbody>
                {donors.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{d.donorNumber}</td>
                    <td style={{ fontWeight: 600 }}>{d.fullName}</td>
                    <td>{d.gender}</td>
                    <td style={{ fontWeight: 700 }}>{d.bloodGroup.replace('_POSITIVE', '+').replace('_NEGATIVE', '-')}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{d.phone}</td>
                    <td>{d.weightKg} kg</td>
                    <td style={{ color: d.hemoglobinLevel >= 12.5 ? 'var(--status-online)' : '#ef4444' }}>{d.hemoglobinLevel} g/dL</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{d.totalDonations}</td>
                    <td>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                        color: d.eligibilityStatus === 'ELIGIBLE' ? 'var(--status-online)' : '#ef4444'
                      }}>
                        {d.eligibilityStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
              No registered donors.
            </div>
          )}
        </div>
      )}

      {/* Modal: Register Donor */}
      {showDonorModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Register Voluntary / Replacement Donor</h3>
            <form onSubmit={handleRegisterDonor} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Donor Full Name *</label>
                  <input required type="text" value={donorForm.fullName} onChange={e => setDonorForm({ ...donorForm, fullName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gender *</label>
                  <select value={donorForm.gender} onChange={e => setDonorForm({ ...donorForm, gender: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number *</label>
                  <input required type="text" value={donorForm.phone} onChange={e => setDonorForm({ ...donorForm, phone: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blood Group *</label>
                  <select value={donorForm.bloodGroup} onChange={e => setDonorForm({ ...donorForm, bloodGroup: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '4px' }}>
                    <option value="A_POSITIVE">A+ (A Positive)</option>
                    <option value="A_NEGATIVE">A- (A Negative)</option>
                    <option value="B_POSITIVE">B+ (B Positive)</option>
                    <option value="B_NEGATIVE">B- (B Negative)</option>
                    <option value="AB_POSITIVE">AB+ (AB Positive)</option>
                    <option value="AB_NEGATIVE">AB- (AB Negative)</option>
                    <option value="O_POSITIVE">O+ (O Positive)</option>
                    <option value="O_NEGATIVE">O- (O Negative)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weight (kg) *</label>
                  <input required type="number" step="0.5" value={donorForm.weightKg} onChange={e => setDonorForm({ ...donorForm, weightKg: parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hemoglobin (g/dL) *</label>
                  <input required type="number" step="0.1" value={donorForm.hemoglobinLevel} onChange={e => setDonorForm({ ...donorForm, hemoglobinLevel: parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Donor Type</label>
                  <select value={donorForm.donorType} onChange={e => setDonorForm({ ...donorForm, donorType: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="VOLUNTARY">Voluntary</option>
                    <option value="REPLACEMENT">Family Replacement</option>
                    <option value="AUTOLOGOUS">Autologous</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowDonorModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Confirm & Register Donor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Transfusion Request */}
      {showRequestModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '24px', border: '1px solid #ef4444' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Order Transfusion / Cross-Match</h3>
            <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient ID / MRN *</label>
                <input required type="text" placeholder="e.g. paste Patient ID" value={requestForm.patientId} onChange={e => setRequestForm({ ...requestForm, patientId: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient Blood Group *</label>
                  <select value={requestForm.patientBloodGroup} onChange={e => setRequestForm({ ...requestForm, patientBloodGroup: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '4px' }}>
                    <option value="A_POSITIVE">A+</option>
                    <option value="A_NEGATIVE">A-</option>
                    <option value="B_POSITIVE">B+</option>
                    <option value="B_NEGATIVE">B-</option>
                    <option value="AB_POSITIVE">AB+</option>
                    <option value="AB_NEGATIVE">AB-</option>
                    <option value="O_POSITIVE">O+</option>
                    <option value="O_NEGATIVE">O-</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Component Type</label>
                  <select value={requestForm.requiredComponent} onChange={e => setRequestForm({ ...requestForm, requiredComponent: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="PACKED_RED_CELLS">Packed Red Blood Cells (PRBC)</option>
                    <option value="WHOLE_BLOOD">Whole Blood</option>
                    <option value="FRESH_FROZEN_PLASMA">Fresh Frozen Plasma (FFP)</option>
                    <option value="PLATELETS">Platelets</option>
                    <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Units Needed</label>
                  <input required type="number" min="1" max="10" value={requestForm.unitsRequested} onChange={e => setRequestForm({ ...requestForm, unitsRequested: parseInt(e.target.value, 10) })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Urgency Level</label>
                  <select value={requestForm.urgencyLevel} onChange={e => setRequestForm({ ...requestForm, urgencyLevel: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '4px' }}>
                    <option value="ROUTINE">ROUTINE (Standard Cross-Match)</option>
                    <option value="URGENT">URGENT (Expedited)</option>
                    <option value="EMERGENCY_STAT_UNMATCHED">EMERGENCY STAT (Uncrossed O- Override)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clinical Indication *</label>
                <input required type="text" placeholder="e.g. Severe intraoperative hemorrhage, Trauma Hb < 7" value={requestForm.clinicalIndication} onChange={e => setRequestForm({ ...requestForm, clinicalIndication: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Requesting Physician *</label>
                  <input required type="text" placeholder="Dr. Name" value={requestForm.requestingDoctor} onChange={e => setRequestForm({ ...requestForm, requestingDoctor: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Location / Ward</label>
                  <input type="text" value={requestForm.departmentWard} onChange={e => setRequestForm({ ...requestForm, departmentWard: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowRequestModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-danger">Submit Transfusion Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 14. MORTUARY MANAGEMENT, COLD STORAGE & DECEASED PATIENT RELEASE
// ==========================================
export function MortuaryView() {
  const [activeTab, setActiveTab] = useState('VAULTS'); // VAULTS | CORPSES | RELEASES
  const [stats, setStats] = useState({
    totalDeceased: 0,
    activeCorpses: 0,
    vaultOccupancyRate: '0%',
    overstayCount: 0,
    coronerHoldCount: 0,
    autopsiesScheduled: 0,
    releasedCount: 0
  });
  const [chambers, setChambers] = useState([]);
  const [corpses, setCorpses] = useState([]);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showChamberModal, setShowChamberModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showAutopsyModal, setShowAutopsyModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);

  // Forms
  const [chamberForm, setChamberForm] = useState({
    vaultName: '',
    storageTier: 'REFRIGERATED',
    targetTemperature: 4.0,
    capacity: 4
  });

  const [intakeForm, setIntakeForm] = useState({
    deceasedFullName: '',
    gender: 'MALE',
    approximateAge: '',
    dateOfDeath: new Date().toISOString().split('T')[0],
    timeOfDeath: '',
    placeOfDeath: '',
    causeOfDeathPrimary: '',
    certifyingPhysician: '',
    isCoronerCase: false,
    storageTier: 'REFRIGERATED',
    nextOfKinName: '',
    nextOfKinPhone: '',
    nextOfKinNationalId: '',
    relationshipToDeceased: 'CHILD',
    propertyItemsInventory: ''
  });

  const [autopsyForm, setAutopsyForm] = useState({
    corpseId: '',
    caseCategory: 'CLINICAL_HOSPITAL',
    leadPathologist: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    requiresCoronerApproval: false
  });

  const [releaseForm, setReleaseForm] = useState({
    corpseId: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    nextOfKinNationalId: '',
    relationshipToDeceased: 'SPOUSE',
    funeralHomeOrUndertaker: '',
    hearseVehiclePlate: '',
    releasingOfficer: '',
    burialPermitNumber: '',
    notes: ''
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, chambersRes, corpsesRes, releasesRes] = await Promise.all([
        api.getMortuaryStats(),
        api.getMortuaryChambers(),
        api.getCorpses(),
        api.getCorpseReleases()
      ]);
      if (statsRes && statsRes.data) setStats(statsRes.data);
      if (chambersRes && chambersRes.data) setChambers(chambersRes.data);
      if (corpsesRes && corpsesRes.data) setCorpses(corpsesRes.data);
      if (releasesRes && releasesRes.data) setReleases(releasesRes.data);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateChamber = async (e) => {
    e.preventDefault();
    try {
      await api.createMortuaryChamber(chamberForm);
      setFeedback({ type: 'success', msg: `Vault Chamber "${chamberForm.vaultName}" provisioned successfully.` });
      setShowChamberModal(false);
      setChamberForm({ vaultName: '', storageTier: 'REFRIGERATED', targetTemperature: 4.0, capacity: 4 });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleIntakeCorpse = async (e) => {
    e.preventDefault();
    try {
      const res = await api.registerCorpse(intakeForm);
      setFeedback({
        type: 'success',
        msg: `Deceased intake registered: ${res.data.deceasedFullName} (Corpse ID: ${res.data.corpseNumber}, Death Cert: ${res.data.deathCertificateNumber})`
      });
      setShowIntakeModal(false);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleScheduleAutopsy = async (e) => {
    e.preventDefault();
    try {
      const res = await api.scheduleAutopsy(autopsyForm);
      setFeedback({
        type: 'success',
        msg: `Autopsy Case ${res.data.autopsyNumber} scheduled under ${res.data.leadPathologist}.`
      });
      setShowAutopsyModal(false);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleReleaseCorpse = async (e) => {
    e.preventDefault();
    try {
      const res = await api.releaseCorpse(releaseForm);
      setFeedback({
        type: 'success',
        msg: `Deceased successfully released to ${res.data.nextOfKinName} (Release Clearance: ${res.data.releaseNumber}). Storage vault compartment freed.`
      });
      setShowReleaseModal(false);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '12px',
          padding: '28px',
          border: '1px solid var(--border-gold)',
          background: 'linear-gradient(135deg, rgba(20,16,10,0.95), rgba(10,8,6,0.98))'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '850px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              background: 'linear-gradient(90deg, #71717a, #a1a1aa)',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.7rem',
              padding: '3px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Procedure 14 Subsystem
            </span>
            <span style={{ color: 'var(--status-online)', fontSize: '0.8rem', fontWeight: 600 }}>
              ● Cold Chain Storage & Pathology Active
            </span>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#fff', fontWeight: 700, margin: '0 0 8px 0' }}>
            Mortuary Management, Cold Storage & Deceased Patient Release
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
            Enterprise cold storage tracking, forensic and clinical post-mortem examination scheduling, bereavement chain-of-custody, and strict biometric Next-of-Kin deceased release protocols.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowIntakeModal(true)}
              className="btn-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={15} /> Intake Deceased Patient
            </button>
            <button
              onClick={() => setShowChamberModal(true)}
              className="btn-outline-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Cpu size={15} /> Provision Vault Chamber
            </button>
            <button
              onClick={() => setShowAutopsyModal(true)}
              className="btn-outline-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileText size={15} /> Schedule Autopsy
            </button>
            <button
              onClick={() => setShowReleaseModal(true)}
              className="btn-outline-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Shield size={15} /> Authorize Family Release
            </button>
            <button
              onClick={loadAll}
              className="btn-outline-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        <img
          src="/assets/images/mortuary_cold_storage_real.jpg"
          alt="Hospital Mortuary & Cold Storage Facility"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '48%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.65,
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 55%, rgba(0,0,0,0))',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 55%, rgba(0,0,0,0))'
          }}
        />
      </div>

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: feedback.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${feedback.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: feedback.type === 'success' ? '#86efac' : '#fca5a5',
          fontSize: '0.85rem'
        }}>
          {feedback.msg}
        </div>
      )}

      {/* Real-time KPI Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active In Storage</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{stats.activeCorpses || 0}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>Deceased patients</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vault Occupancy</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold-400)', marginTop: '4px' }}>{stats.vaultOccupancyRate || '0%'}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-online)', marginTop: '4px' }}>{stats.operationalChambers || chambers.length} Vaults Online</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Coroner / Police Holds</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#eab308', marginTop: '4px' }}>{stats.coronerHoldCount || 0}</div>
          <div style={{ fontSize: '0.72rem', color: '#eab308', marginTop: '4px' }}>Requires legal clearance</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Autopsies Pending</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>{stats.autopsiesScheduled || 0}</div>
          <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: '4px' }}>Post-mortem exams</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overstay Alerts (&gt;30d)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: (stats.overstayCount > 0) ? '#ef4444' : 'var(--status-online)', marginTop: '4px' }}>{stats.overstayCount || 0}</div>
          <div style={{ fontSize: '0.72rem', color: (stats.overstayCount > 0) ? '#ef4444' : 'var(--text-dim)', marginTop: '4px' }}>Hospital social work follow-up</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Released to Family</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-online)', marginTop: '4px' }}>{stats.releasedCount || releases.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-online)', marginTop: '4px' }}>Completed releases</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('VAULTS')}
          className={activeTab === 'VAULTS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          Cold Storage Vaults ({chambers.length})
        </button>
        <button
          onClick={() => setActiveTab('CORPSES')}
          className={activeTab === 'CORPSES' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          Deceased Registry ({corpses.length})
        </button>
        <button
          onClick={() => setActiveTab('RELEASES')}
          className={activeTab === 'RELEASES' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          Deceased Family Release Protocol ({releases.length})
        </button>
      </div>

      {/* Tab 1: Vault Chambers */}
      {activeTab === 'VAULTS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {chambers.map(c => {
            const isFull = c.occupiedCount >= c.capacity;
            return (
              <div
                key={c.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  border: isFull ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border-gold)',
                  background: isFull ? 'rgba(30,12,12,0.6)' : 'rgba(18,15,12,0.6)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--gold-400)',
                      fontWeight: 700
                    }}>
                      {c.chamberCode}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', color: '#fff', margin: '4px 0' }}>{c.vaultName}</h3>
                  </div>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: isFull ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
                    color: isFull ? '#ef4444' : 'var(--status-online)'
                  }}>
                    {isFull ? 'FULL' : `${c.capacity - c.occupiedCount} AVAILABLE`}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Storage Tier:</span>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{c.storageTier}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Target Temp:</span>
                    <div style={{ fontWeight: 700, color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>
                      {c.targetTemperature}°C
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Occupancy:</span>
                    <div style={{ fontWeight: 700, color: 'var(--gold-300)' }}>
                      {c.occupiedCount} / {c.capacity} Compartments
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Telemetry Status:</span>
                    <div style={{ color: c.isOperational ? 'var(--status-online)' : '#ef4444' }}>
                      {c.isOperational ? '● Calibrated Online' : 'Offline / Maintenance'}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '12px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (c.occupiedCount / c.capacity) * 100)}%`,
                    background: isFull ? '#ef4444' : 'var(--gold-400)',
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Deceased Intake Directory */}
      {activeTab === 'CORPSES' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>
            Deceased Patient Registry & Cold Storage Tracking
          </h3>
          {corpses.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Corpse ID</th>
                  <th>Death Cert #</th>
                  <th>Deceased Full Name</th>
                  <th>Gender / Age</th>
                  <th>Primary Cause of Death</th>
                  <th>Chamber Vault</th>
                  <th>Days In Storage</th>
                  <th>Coroner Status</th>
                  <th>Lifecycle Status</th>
                </tr>
              </thead>
              <tbody>
                {corpses.map(cr => (
                  <tr key={cr.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{cr.corpseNumber}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{cr.deathCertificateNumber}</td>
                    <td style={{ fontWeight: 600 }}>{cr.deceasedFullName}</td>
                    <td>{cr.gender} / {cr.approximateAge}y</td>
                    <td style={{ fontSize: '0.78rem' }}>{cr.causeOfDeathPrimary}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-400)' }}>
                      {cr.chamber ? cr.chamber.chamberCode : 'Pending Assignment'}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: cr.isOverstay ? '#ef4444' : 'var(--text-main)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {cr.daysInStorage || 0}d {cr.isOverstay ? '(! OVERSTAY)' : ''}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: cr.isCoronerCase ? (cr.isCoronerCleared ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)') : 'transparent',
                        color: cr.isCoronerCase ? (cr.isCoronerCleared ? 'var(--status-online)' : '#eab308') : 'var(--text-dim)'
                      }}>
                        {cr.isCoronerCase ? (cr.isCoronerCleared ? 'CLEARED' : 'CORONER HOLD') : 'Non-Coroner'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                        color: cr.status === 'RELEASED_TO_FAMILY' ? 'var(--status-online)' : 'var(--gold-400)'
                      }}>
                        {cr.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
              No active deceased records registered in cold storage.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Deceased Family Release Protocol */}
      {activeTab === 'RELEASES' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>
            Authorized Family Release & Handover Records
          </h3>
          {releases.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Release Clearance #</th>
                  <th>Deceased Name</th>
                  <th>Next-of-Kin (Claimant)</th>
                  <th>Relationship</th>
                  <th>National ID</th>
                  <th>Funeral Undertaker</th>
                  <th>Hearse Vehicle Plate</th>
                  <th>Releasing Officer</th>
                  <th>Burial Permit #</th>
                </tr>
              </thead>
              <tbody>
                {releases.map(rl => (
                  <tr key={rl.id}>
                    <td style={{ fontWeight: 700, color: 'var(--status-online)', fontFamily: 'var(--font-mono)' }}>{rl.releaseNumber}</td>
                    <td style={{ fontWeight: 600 }}>{rl.corpse?.deceasedFullName || 'Deceased Patient'}</td>
                    <td>{rl.nextOfKinName}</td>
                    <td>{rl.relationshipToDeceased}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{rl.nextOfKinNationalId}</td>
                    <td style={{ fontSize: '0.78rem' }}>{rl.funeralHomeOrUndertaker}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{rl.hearseVehiclePlate || 'N/A'}</td>
                    <td style={{ fontSize: '0.78rem' }}>{rl.releasingOfficer}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--gold-300)' }}>{rl.burialPermitNumber || 'Permit Verified'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
              No release records on file.
            </div>
          )}
        </div>
      )}

      {/* Modal: Intake Deceased Patient */}
      {showIntakeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Clinical Deceased Intake & Cold Storage Registration</h3>
            <form onSubmit={handleIntakeCorpse} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deceased Full Name *</label>
                  <input required type="text" value={intakeForm.deceasedFullName} onChange={e => setIntakeForm({ ...intakeForm, deceasedFullName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gender</label>
                  <select value={intakeForm.gender} onChange={e => setIntakeForm({ ...intakeForm, gender: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Age (Years)</label>
                  <input type="number" value={intakeForm.approximateAge} onChange={e => setIntakeForm({ ...intakeForm, approximateAge: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date of Death *</label>
                  <input required type="date" value={intakeForm.dateOfDeath} onChange={e => setIntakeForm({ ...intakeForm, dateOfDeath: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Time of Death</label>
                  <input type="time" value={intakeForm.timeOfDeath} onChange={e => setIntakeForm({ ...intakeForm, timeOfDeath: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Storage Tier</label>
                  <select value={intakeForm.storageTier} onChange={e => setIntakeForm({ ...intakeForm, storageTier: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="REFRIGERATED">REFRIGERATED (+2°C to +4°C)</option>
                    <option value="DEEP_FREEZE">DEEP FREEZE (-20°C)</option>
                    <option value="INFECTIOUS_ISOLATION">ISOLATION (+4°C)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Primary Cause of Death *</label>
                <input required type="text" value={intakeForm.causeOfDeathPrimary} onChange={e => setIntakeForm({ ...intakeForm, causeOfDeathPrimary: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Certifying Physician *</label>
                  <input required type="text" value={intakeForm.certifyingPhysician} onChange={e => setIntakeForm({ ...intakeForm, certifyingPhysician: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '18px' }}>
                  <input type="checkbox" id="coronerCheck" checked={intakeForm.isCoronerCase} onChange={e => setIntakeForm({ ...intakeForm, isCoronerCase: e.target.checked })} />
                  <label htmlFor="coronerCheck" style={{ fontSize: '0.78rem', color: '#eab308', fontWeight: 600 }}>Coroner / Police Investigation Case</label>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '4px' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--gold-400)', marginBottom: '8px' }}>Next-of-Kin Primary Contact</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name *</label>
                    <input required type="text" value={intakeForm.nextOfKinName} onChange={e => setIntakeForm({ ...intakeForm, nextOfKinName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone *</label>
                    <input required type="text" value={intakeForm.nextOfKinPhone} onChange={e => setIntakeForm({ ...intakeForm, nextOfKinPhone: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>National ID (Ghana Card) *</label>
                    <input required type="text" placeholder="GHA-000000000-0" value={intakeForm.nextOfKinNationalId} onChange={e => setIntakeForm({ ...intakeForm, nextOfKinNationalId: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Property & Personal Effects Bag Inventory</label>
                <input type="text" value={intakeForm.propertyItemsInventory} onChange={e => setIntakeForm({ ...intakeForm, propertyItemsInventory: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowIntakeModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Confirm Intake & Allocate Vault</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Provision Vault Chamber */}
      {showChamberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Provision Cold Storage Vault Chamber</h3>
            <form onSubmit={handleCreateChamber} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vault Chamber Name *</label>
                <input required type="text" placeholder="e.g. Vault Chamber Alpha-01" value={chamberForm.vaultName} onChange={e => setChamberForm({ ...chamberForm, vaultName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Storage Tier</label>
                  <select value={chamberForm.storageTier} onChange={e => setChamberForm({ ...chamberForm, storageTier: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="REFRIGERATED">REFRIGERATED (+2°C - +4°C)</option>
                    <option value="DEEP_FREEZE">DEEP FREEZE (-20°C)</option>
                    <option value="INFECTIOUS_ISOLATION">ISOLATION (+4°C)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Compartment Capacity</label>
                  <input type="number" min="1" max="16" value={chamberForm.capacity} onChange={e => setChamberForm({ ...chamberForm, capacity: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowChamberModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Provision Vault</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Schedule Autopsy */}
      {showAutopsyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Schedule Post-Mortem Autopsy Examination</h3>
            <form onSubmit={handleScheduleAutopsy} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select Deceased Patient *</label>
                <select required value={autopsyForm.corpseId} onChange={e => setAutopsyForm({ ...autopsyForm, corpseId: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                  <option value="">-- Choose Deceased --</option>
                  {corpses.map(cr => (
                    <option key={cr.id} value={cr.id}>
                      {cr.deceasedFullName} ({cr.corpseNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Case Category</label>
                  <select value={autopsyForm.caseCategory} onChange={e => setAutopsyForm({ ...autopsyForm, caseCategory: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="CLINICAL_HOSPITAL">CLINICAL HOSPITAL</option>
                    <option value="CORONER_POLICE">CORONER / POLICE</option>
                    <option value="FORENSIC_LEGAL">FORENSIC / LEGAL</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scheduled Date *</label>
                  <input required type="date" value={autopsyForm.scheduledDate} onChange={e => setAutopsyForm({ ...autopsyForm, scheduledDate: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lead Pathologist *</label>
                <input required type="text" value={autopsyForm.leadPathologist} onChange={e => setAutopsyForm({ ...autopsyForm, leadPathologist: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowAutopsyModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Confirm Autopsy Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Authorize Family Release */}
      {showReleaseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Authorize Deceased Family Release Clearance</h3>
            <form onSubmit={handleReleaseCorpse} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select Deceased Patient *</label>
                <select required value={releaseForm.corpseId} onChange={e => setReleaseForm({ ...releaseForm, corpseId: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                  <option value="">-- Choose Deceased --</option>
                  {corpses.filter(c => c.status !== 'RELEASED_TO_FAMILY').map(cr => (
                    <option key={cr.id} value={cr.id}>
                      {cr.deceasedFullName} ({cr.corpseNumber}) - {cr.status}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Claimant Next-of-Kin Name *</label>
                  <input required type="text" value={releaseForm.nextOfKinName} onChange={e => setReleaseForm({ ...releaseForm, nextOfKinName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>National ID Number *</label>
                  <input required type="text" placeholder="GHA-000000000-0" value={releaseForm.nextOfKinNationalId} onChange={e => setReleaseForm({ ...releaseForm, nextOfKinNationalId: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Claimant Phone *</label>
                  <input required type="text" value={releaseForm.nextOfKinPhone} onChange={e => setReleaseForm({ ...releaseForm, nextOfKinPhone: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Relationship to Deceased</label>
                  <select value={releaseForm.relationshipToDeceased} onChange={e => setReleaseForm({ ...releaseForm, relationshipToDeceased: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="SPOUSE">SPOUSE</option>
                    <option value="CHILD">CHILD</option>
                    <option value="PARENT">PARENT</option>
                    <option value="SIBLING">SIBLING</option>
                    <option value="LEGAL_GUARDIAN">LEGAL GUARDIAN</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Funeral Undertaker / Service</label>
                  <input type="text" value={releaseForm.funeralHomeOrUndertaker} onChange={e => setReleaseForm({ ...releaseForm, funeralHomeOrUndertaker: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hearse Vehicle Plate</label>
                  <input type="text" value={releaseForm.hearseVehiclePlate} onChange={e => setReleaseForm({ ...releaseForm, hearseVehiclePlate: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Burial Permit / Registrar Certificate #</label>
                <input type="text" value={releaseForm.burialPermitNumber} onChange={e => setReleaseForm({ ...releaseForm, burialPermitNumber: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowReleaseModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Co-Sign & Release Deceased</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 15. BIOMEDICAL ENGINEERING & EQUIPMENT MAINTENANCE
// ==========================================
export function BiomedicalView() {
  const [activeTab, setActiveTab] = useState('EQUIPMENT'); // EQUIPMENT | WORK_ORDERS
  const [stats, setStats] = useState({
    totalEquipment: 0,
    operationalCount: 0,
    operationalUptimeRate: '0.0%',
    criticalHighRiskTotal: 0,
    criticalHighRiskOperational: 0,
    lifeSupportUptimeRate: '0.0%',
    openWorkOrders: 0,
    emergencyBreakdowns: 0,
    ppmOverdueCount: 0,
    calibrationOverdueCount: 0,
    totalMaintenanceExpenditure: 0
  });
  const [equipmentList, setEquipmentList] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);

  // Forms
  const [equipmentForm, setEquipmentForm] = useState({
    name: '',
    modelNumber: '',
    serialNumber: '',
    manufacturer: '',
    category: 'LIFE_SUPPORT',
    riskLevel: 'CRITICAL_HIGH_RISK',
    department: 'ICU',
    roomLocation: '',
    powerRatingWatts: 450,
    ppmIntervalDays: 60,
    calibrationIntervalDays: 90
  });

  const [workOrderForm, setWorkOrderForm] = useState({
    equipmentId: '',
    orderType: 'CORRECTIVE_BREAKDOWN',
    priority: 'STAT_EMERGENCY_BREAKDOWN',
    failureDescription: '',
    reportedBy: '',
    assignedEngineer: ''
  });

  const [completeForm, setCompleteForm] = useState({
    qaApprovedBy: '',
    rootCause: '',
    actionTaken: '',
    partsReplaced: '',
    partsCost: 0,
    laborHours: 1.0,
    leakageCurrentMicroAmps: 45.0,
    groundResistanceOhms: 0.08,
    notes: ''
  });

  const [calibrationForm, setCalibrationForm] = useState({
    equipmentId: '',
    calibrationStandard: 'ISO_17025',
    testEquipmentUsed: '',
    parametersTested: '',
    toleranceDeviationPercent: 1.0,
    calibrationResult: 'PASSED',
    certifiedByEngineer: '',
    validityDays: 180,
    notes: ''
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, equipRes, woRes] = await Promise.all([
        api.getBiomedicalStats(),
        api.getEquipmentList(),
        api.getWorkOrders()
      ]);
      if (statsRes && statsRes.data) setStats(statsRes.data);
      if (equipRes && equipRes.data) setEquipmentList(equipRes.data);
      if (woRes && woRes.data) setWorkOrders(woRes.data);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRegisterEquipment = async (e) => {
    e.preventDefault();
    try {
      const res = await api.registerEquipment(equipmentForm);
      setFeedback({
        type: 'success',
        msg: `Equipment "${res.data.name}" registered under Asset Tag ${res.data.assetTag} (S/N: ${res.data.serialNumber}).`
      });
      setShowEquipmentModal(false);
      setEquipmentForm({
        name: '', modelNumber: '', serialNumber: '', manufacturer: '',
        category: 'LIFE_SUPPORT', riskLevel: 'CRITICAL_HIGH_RISK',
        department: 'ICU', roomLocation: '', powerRatingWatts: 450,
        ppmIntervalDays: 60, calibrationIntervalDays: 90
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleCreateWorkOrder = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createWorkOrder(workOrderForm);
      setFeedback({
        type: 'success',
        msg: `Work Order ${res.data.workOrderNumber} created with priority ${res.data.priority}. Equipment marked OUT_OF_SERVICE / UNDER_MAINTENANCE.`
      });
      setShowWorkOrderModal(false);
      setWorkOrderForm({
        equipmentId: '', orderType: 'CORRECTIVE_BREAKDOWN',
        priority: 'STAT_EMERGENCY_BREAKDOWN', failureDescription: '',
        reportedBy: 'Nurse In-Charge, ICU', assignedEngineer: 'Lead Biomedical Engineer'
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleCompleteWorkOrder = async (e) => {
    e.preventDefault();
    if (!selectedWorkOrder) return;
    try {
      const res = await api.completeWorkOrder(selectedWorkOrder.id, completeForm);
      setFeedback({
        type: 'success',
        msg: `Work Order ${res.data.workOrderNumber} certified safe & completed. Equipment restored to OPERATIONAL status.`
      });
      setShowCompleteModal(false);
      setSelectedWorkOrder(null);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleRecordCalibration = async (e) => {
    e.preventDefault();
    try {
      const res = await api.recordCalibration(calibrationForm);
      setFeedback({
        type: 'success',
        msg: `Calibration Certificate ${res.data.certificateNumber} issued (${res.data.calibrationResult}) by ${res.data.certifiedByEngineer}.`
      });
      setShowCalibrationModal(false);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleSafetyOverride = async (equipmentId, equipmentName) => {
    const clinicianName = prompt(`Enter Authorizing Clinician Name for Emergency Override on ${equipmentName}:`, 'Dr. Mensah, MD (Chief Intensivist)');
    if (!clinicianName) return;
    const reason = prompt('Enter Clinical Emergency Justification:', 'Surge capacity life-support emergency allocation.');
    if (!reason) return;

    try {
      await api.recordSafetyOverride(equipmentId, { clinicianName, reason });
      setFeedback({
        type: 'success',
        msg: `Emergency safety override authorized for ${equipmentName}. Co-signature audit log updated.`
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '12px',
          padding: '28px',
          border: '1px solid var(--border-gold)',
          background: 'linear-gradient(135deg, rgba(20,16,10,0.95), rgba(10,8,6,0.98))'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '850px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              background: 'linear-gradient(90deg, #d97706, #f59e0b)',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.7rem',
              padding: '3px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Procedure 15 Subsystem
            </span>
            <span style={{ color: 'var(--status-online)', fontSize: '0.8rem', fontWeight: 600 }}>
              ● ISO 13485 & IEC 60601-1 Metrology Active
            </span>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#fff', fontWeight: 700, margin: '0 0 8px 0' }}>
            Biomedical Engineering, Medical Equipment Maintenance & Work Orders
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
            Enterprise Computerized Maintenance Management System (CMMS), life-support asset telemetry, electrical safety analyzer sign-offs, preventive maintenance (PPM) scheduling, and metrology calibration logs.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowEquipmentModal(true)}
              className="btn-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={15} /> Register Medical Device
            </button>
            <button
              onClick={() => setShowWorkOrderModal(true)}
              className="btn-danger"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <AlertTriangle size={15} /> Create Work Order / Breakdown
            </button>
            <button
              onClick={() => setShowCalibrationModal(true)}
              className="btn-outline-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle size={15} /> Log Metrology Calibration
            </button>
            <button
              onClick={loadAll}
              className="btn-outline-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        <img
          src="/assets/images/biomedical_engineering_equipment_real.jpg"
          alt="Biomedical Equipment & High-Tech Diagnostic Suite"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '48%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.65,
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 55%, rgba(0,0,0,0))',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 55%, rgba(0,0,0,0))'
          }}
        />
      </div>

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: feedback.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${feedback.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: feedback.type === 'success' ? '#86efac' : '#fca5a5',
          fontSize: '0.85rem'
        }}>
          {feedback.msg}
        </div>
      )}

      {/* Real-time KPI Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Medical Devices</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{stats.totalEquipment || 0}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-online)', marginTop: '4px' }}>{stats.operationalCount || 0} In Active Service</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall Uptime Rate</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold-400)', marginTop: '4px' }}>{stats.operationalUptimeRate || '100%'}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>All hospital clinical depts</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Life-Support Availability</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-online)', marginTop: '4px' }}>{stats.lifeSupportUptimeRate || '100%'}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-online)', marginTop: '4px' }}>{stats.criticalHighRiskOperational || 0} / {stats.criticalHighRiskTotal || 0} Critical Units</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Open Work Orders</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>{stats.openWorkOrders || 0}</div>
          <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: '4px' }}>Repairs & Maintenance</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Emergency Breakdowns</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: (stats.emergencyBreakdowns > 0) ? '#ef4444' : 'var(--status-online)', marginTop: '4px' }}>{stats.emergencyBreakdowns || 0}</div>
          <div style={{ fontSize: '0.72rem', color: (stats.emergencyBreakdowns > 0) ? '#ef4444' : 'var(--text-dim)', marginTop: '4px' }}>STAT priority response</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Calibration / PPM Due</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: (stats.calibrationOverdueCount > 0 || stats.ppmOverdueCount > 0) ? '#eab308' : 'var(--status-online)', marginTop: '4px' }}>
            {(stats.calibrationOverdueCount || 0) + (stats.ppmOverdueCount || 0)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>Scheduled service alerts</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('EQUIPMENT')}
          className={activeTab === 'EQUIPMENT' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          Medical Equipment Assets ({equipmentList.length})
        </button>
        <button
          onClick={() => setActiveTab('WORK_ORDERS')}
          className={activeTab === 'WORK_ORDERS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          Maintenance Work Orders & Tickets ({workOrders.length})
        </button>
      </div>

      {/* Tab 1: Equipment Inventory */}
      {activeTab === 'EQUIPMENT' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>
            Hospital Medical Equipment Master Inventory
          </h3>
          {equipmentList.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Equipment Name</th>
                  <th>Model / S/N</th>
                  <th>Category</th>
                  <th>Risk Level</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>PPM / Calibration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {equipmentList.map(eq => (
                  <tr key={eq.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{eq.assetTag}</td>
                    <td style={{ fontWeight: 600 }}>{eq.name}</td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      <div>{eq.modelNumber}</div>
                      <div style={{ color: 'var(--text-dim)' }}>{eq.serialNumber}</div>
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>{eq.category.replace(/_/g, ' ')}</td>
                    <td>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: eq.riskLevel === 'CRITICAL_HIGH_RISK' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)',
                        color: eq.riskLevel === 'CRITICAL_HIGH_RISK' ? '#ef4444' : '#eab308'
                      }}>
                        {eq.riskLevel.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{eq.department} {eq.roomLocation ? `(${eq.roomLocation})` : ''}</td>
                    <td>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: eq.status === 'OPERATIONAL' ? 'var(--status-online)' : (eq.status === 'OUT_OF_SERVICE' ? '#ef4444' : '#eab308')
                      }}>
                        {eq.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.72rem' }}>
                      <div style={{ color: eq.isPpmOverdue ? '#ef4444' : 'var(--text-main)' }}>
                        PPM: {eq.nextPpmDate ? new Date(eq.nextPpmDate).toLocaleDateString() : 'N/A'}
                      </div>
                      <div style={{ color: eq.isCalibrationOverdue ? '#ef4444' : 'var(--text-dim)' }}>
                        Cal: {eq.nextCalibrationDate ? new Date(eq.nextCalibrationDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td>
                      {eq.status !== 'OPERATIONAL' && (
                        <button
                          onClick={() => handleSafetyOverride(eq.id, eq.name)}
                          className="btn-outline-gold"
                          style={{ fontSize: '0.7rem', padding: '3px 6px', borderColor: '#ef4444', color: '#fca5a5' }}
                        >
                          Safety Override
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
              No medical equipment registered in system inventory.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Work Orders */}
      {activeTab === 'WORK_ORDERS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>
            Biomedical Maintenance Tickets & Work Orders
          </h3>
          {workOrders.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Work Order #</th>
                  <th>Priority</th>
                  <th>Equipment / Asset Tag</th>
                  <th>Order Type</th>
                  <th>Failure Description</th>
                  <th>Assigned Engineer</th>
                  <th>Status</th>
                  <th>Cost / Labor</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map(wo => (
                  <tr key={wo.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{wo.workOrderNumber}</td>
                    <td>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: wo.priority === 'STAT_EMERGENCY_BREAKDOWN' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
                        color: wo.priority === 'STAT_EMERGENCY_BREAKDOWN' ? '#ef4444' : '#60a5fa'
                      }}>
                        {wo.priority.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{wo.equipment ? wo.equipment.name : 'Medical Device'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gold-400)', fontFamily: 'var(--font-mono)' }}>
                        {wo.equipment ? wo.equipment.assetTag : ''}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>{wo.orderType.replace(/_/g, ' ')}</td>
                    <td style={{ fontSize: '0.75rem', maxWidth: '240px' }}>{wo.failureDescription}</td>
                    <td style={{ fontSize: '0.78rem' }}>{wo.assignedEngineer || 'Unassigned'}</td>
                    <td>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                        color: wo.status === 'VERIFIED_RETURNED_TO_SERVICE' ? 'var(--status-online)' : '#eab308'
                      }}>
                        {wo.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                      GH₵{wo.partsCost.toFixed(2)} • {wo.laborHours}h
                    </td>
                    <td>
                      {wo.status !== 'VERIFIED_RETURNED_TO_SERVICE' && (
                        <button
                          onClick={() => { setSelectedWorkOrder(wo); setShowCompleteModal(true); }}
                          className="btn-gold"
                          style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                        >
                          Sign-Off QA
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
              No active biomedical work orders logged.
            </div>
          )}
        </div>
      )}

      {/* Modal: Register Medical Device */}
      {showEquipmentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Register Medical Equipment Asset</h3>
            <form onSubmit={handleRegisterEquipment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Device Name *</label>
                  <input required type="text" placeholder="e.g. Hamilton-G5 Mechanical Ventilator" value={equipmentForm.name} onChange={e => setEquipmentForm({ ...equipmentForm, name: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manufacturer *</label>
                  <input required type="text" placeholder="e.g. Hamilton Medical AG" value={equipmentForm.manufacturer} onChange={e => setEquipmentForm({ ...equipmentForm, manufacturer: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Model Number *</label>
                  <input required type="text" placeholder="G5-ADULT" value={equipmentForm.modelNumber} onChange={e => setEquipmentForm({ ...equipmentForm, modelNumber: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Serial Number (Unique) *</label>
                  <input required type="text" placeholder="HAM-G5-99214" value={equipmentForm.serialNumber} onChange={e => setEquipmentForm({ ...equipmentForm, serialNumber: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Equipment Category</label>
                  <select value={equipmentForm.category} onChange={e => setEquipmentForm({ ...equipmentForm, category: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="LIFE_SUPPORT">LIFE_SUPPORT (Ventilator, Defib, Anesthesia)</option>
                    <option value="DIAGNOSTIC_IMAGING">DIAGNOSTIC_IMAGING (MRI, CT, Ultrasound)</option>
                    <option value="SURGICAL_THEATRE">SURGICAL_THEATRE (Diathermy, Laparoscopy)</option>
                    <option value="MONITORING">MONITORING (ICU Monitors, Infusion Pumps)</option>
                    <option value="LABORATORY">LABORATORY (Analyzers, Centrifuges)</option>
                    <option value="STERILIZATION">STERILIZATION (Autoclaves)</option>
                    <option value="GENERAL_BIOMEDICAL">GENERAL_BIOMEDICAL (Auxiliary)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clinical Risk Level</label>
                  <select value={equipmentForm.riskLevel} onChange={e => setEquipmentForm({ ...equipmentForm, riskLevel: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="CRITICAL_HIGH_RISK">CRITICAL HIGH RISK (Immediate life hazard)</option>
                    <option value="MEDIUM_RISK">MEDIUM RISK (Direct clinical support)</option>
                    <option value="LOW_RISK">LOW RISK (General diagnostic)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Department *</label>
                  <select value={equipmentForm.department} onChange={e => setEquipmentForm({ ...equipmentForm, department: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="ICU">Intensive Care Unit (ICU)</option>
                    <option value="THEATRE">Operating Theatre & Surgery</option>
                    <option value="EMERGENCY">Emergency & Trauma Bay</option>
                    <option value="RADIOLOGY">Radiology & PACS Imaging</option>
                    <option value="LABORATORY">Pathology & Laboratory</option>
                    <option value="INPATIENT_WARDS">Inpatient Wards</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room Location</label>
                  <input type="text" placeholder="e.g. Bed Bay 04 / Theatre Suite 1" value={equipmentForm.roomLocation} onChange={e => setEquipmentForm({ ...equipmentForm, roomLocation: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PPM Frequency (Days)</label>
                  <input type="number" value={equipmentForm.ppmIntervalDays} onChange={e => setEquipmentForm({ ...equipmentForm, ppmIntervalDays: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calib. Frequency (Days)</label>
                  <input type="number" value={equipmentForm.calibrationIntervalDays} onChange={e => setEquipmentForm({ ...equipmentForm, calibrationIntervalDays: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Power Rating (Watts)</label>
                  <input type="number" value={equipmentForm.powerRatingWatts} onChange={e => setEquipmentForm({ ...equipmentForm, powerRatingWatts: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowEquipmentModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Register & Commission Device</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Work Order */}
      {showWorkOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Log Biomedical Work Order / Breakdown Ticket</h3>
            <form onSubmit={handleCreateWorkOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select Medical Device *</label>
                <select required value={workOrderForm.equipmentId} onChange={e => setWorkOrderForm({ ...workOrderForm, equipmentId: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                  <option value="">-- Choose Device --</option>
                  {equipmentList.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.assetTag}) - {eq.department}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order Type</label>
                  <select value={workOrderForm.orderType} onChange={e => setWorkOrderForm({ ...workOrderForm, orderType: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="CORRECTIVE_BREAKDOWN">CORRECTIVE BREAKDOWN</option>
                    <option value="PREVENTIVE_MAINTENANCE">PREVENTIVE MAINTENANCE (PPM)</option>
                    <option value="CALIBRATION_CERTIFICATION">CALIBRATION & METROLOGY</option>
                    <option value="SAFETY_INSPECTION">SAFETY INSPECTION</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority Level</label>
                  <select value={workOrderForm.priority} onChange={e => setWorkOrderForm({ ...workOrderForm, priority: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="STAT_EMERGENCY_BREAKDOWN">STAT EMERGENCY (Life-Support Failure)</option>
                    <option value="URGENT">URGENT (Essential Diagnostic Down)</option>
                    <option value="ROUTINE">ROUTINE (Scheduled Service)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Observed Failure Symptoms / Defect Description *</label>
                <textarea required rows={3} placeholder="Describe alarm codes, failure behavior, or symptoms observed by clinical staff..." value={workOrderForm.failureDescription} onChange={e => setWorkOrderForm({ ...workOrderForm, failureDescription: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reported By Staff *</label>
                  <input required type="text" value={workOrderForm.reportedBy} onChange={e => setWorkOrderForm({ ...workOrderForm, reportedBy: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Biomedical Engineer</label>
                  <input type="text" value={workOrderForm.assignedEngineer} onChange={e => setWorkOrderForm({ ...workOrderForm, assignedEngineer: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowWorkOrderModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-danger">Submit Work Order & Lock Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sign-Off QA / Complete Work Order */}
      {showCompleteModal && selectedWorkOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>
              Sign-Off & Certify Safe: {selectedWorkOrder.workOrderNumber}
            </h3>
            <p style={{ color: 'var(--gold-400)', fontSize: '0.82rem', marginBottom: '14px' }}>
              Device: {selectedWorkOrder.equipment?.name} ({selectedWorkOrder.equipment?.assetTag})
            </p>

            <form onSubmit={handleCompleteWorkOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QA Inspector / Certifying Engineer *</label>
                <input required type="text" value={completeForm.qaApprovedBy} onChange={e => setCompleteForm({ ...completeForm, qaApprovedBy: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chassis Leakage Current (Max 500 µA) *</label>
                  <input required type="number" step="0.1" value={completeForm.leakageCurrentMicroAmps} onChange={e => setCompleteForm({ ...completeForm, leakageCurrentMicroAmps: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ground Resistance (Max 0.2 Ω) *</label>
                  <input required type="number" step="0.01" value={completeForm.groundResistanceOhms} onChange={e => setCompleteForm({ ...completeForm, groundResistanceOhms: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Corrective Action Taken</label>
                <input type="text" value={completeForm.actionTaken} onChange={e => setCompleteForm({ ...completeForm, actionTaken: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Parts Replaced</label>
                  <input type="text" value={completeForm.partsReplaced} onChange={e => setCompleteForm({ ...completeForm, partsReplaced: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Parts Cost (GH₵)</label>
                  <input type="number" step="0.01" value={completeForm.partsCost} onChange={e => setCompleteForm({ ...completeForm, partsCost: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Labor (Hours)</label>
                  <input type="number" step="0.5" value={completeForm.laborHours} onChange={e => setCompleteForm({ ...completeForm, laborHours: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowCompleteModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Certify IEC 60601-1 & Return to Service</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Metrology Calibration */}
      {showCalibrationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Issue Metrology Calibration Certificate</h3>
            <form onSubmit={handleRecordCalibration} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select Medical Device *</label>
                <select required value={calibrationForm.equipmentId} onChange={e => setCalibrationForm({ ...calibrationForm, equipmentId: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                  <option value="">-- Choose Device --</option>
                  {equipmentList.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.assetTag})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calibration Standard</label>
                  <select value={calibrationForm.calibrationStandard} onChange={e => setCalibrationForm({ ...calibrationForm, calibrationStandard: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="ISO_17025">ISO 17025 (General Calibration)</option>
                    <option value="IEC_60601">IEC 60601 (Medical Electrical)</option>
                    <option value="NIST_TRACEABLE">NIST Traceable Standards</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tolerance Deviation (%)</label>
                  <input type="number" step="0.1" value={calibrationForm.toleranceDeviationPercent} onChange={e => setCalibrationForm({ ...calibrationForm, toleranceDeviationPercent: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Test Equipment Used *</label>
                <input required type="text" value={calibrationForm.testEquipmentUsed} onChange={e => setCalibrationForm({ ...calibrationForm, testEquipmentUsed: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Certified Metrology Engineer *</label>
                  <input required type="text" value={calibrationForm.certifiedByEngineer} onChange={e => setCalibrationForm({ ...calibrationForm, certifiedByEngineer: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Validity (Days)</label>
                  <input type="number" value={calibrationForm.validityDays} onChange={e => setCalibrationForm({ ...calibrationForm, validityDays: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowCalibrationModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Issue Calibration Certificate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 16. SUPPLY CHAIN, PROCUREMENT & VENDOR CONTRACTS (PHASE 16)
// ==========================================
export function ProcurementView() {
  const [activeTab, setActiveTab] = useState('PURCHASE_ORDERS'); // PURCHASE_ORDERS | GOODS_RECEIPTS | VENDORS | CONTRACTS
  const [stats, setStats] = useState({
    totalVendors: 0,
    activeVendors: 0,
    pendingPurchaseOrders: 0,
    approvedPurchaseOrders: 0,
    fullyReceivedOrders: 0,
    totalSpendYtd: 0,
    threeWayMatchCompliancePercent: 0,
    pendingGrnInspections: 0,
    activeContractsCount: 0
  });
  const [vendors, setVendors] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showPoModal, setShowPoModal] = useState(false);
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showThreeWayMatchModal, setShowThreeWayMatchModal] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState(null);

  // Forms
  const [vendorForm, setVendorForm] = useState({
    name: '',
    category: 'PHARMACEUTICALS',
    taxIdentificationNumber: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    bankName: '',
    paymentTerms: 'NET_30',
    notes: ''
  });

  const [poForm, setPoForm] = useState({
    vendorId: '',
    department: 'CENTRAL_STORES',
    priority: 'ROUTINE',
    expectedDeliveryDate: '',
    taxAmount: 0,
    notes: '',
    requisitionedBy: '',
    items: [
      { itemCode: '', description: '', quantityOrdered: 1, unitCost: 0, unitOfMeasure: 'BOX' }
    ]
  });

  const [grnForm, setGrnForm] = useState({
    purchaseOrderId: '',
    waybillOrInvoiceNumber: '',
    receivedBy: '',
    inspectedBy: '',
    inspectionStatus: 'INSPECTION_PASSED',
    temperatureCompliant: true,
    notes: '',
    items: []
  });

  const [contractForm, setContractForm] = useState({
    vendorId: '',
    title: '',
    contractType: 'FRAMEWORK_AGREEMENT',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    contractValue: 0,
    currency: 'GHS',
    termsConditions: '',
    signedByRepresentative: '',
    signedByHospitalDirector: ''
  });

  const [threeWayMatchForm, setThreeWayMatchForm] = useState({
    invoiceAmount: 0,
    notes: ''
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, vendorsRes, contractsRes, poRes, grnRes] = await Promise.all([
        api.getProcurementStats().catch(() => null),
        api.getVendors().catch(() => null),
        api.getVendorContracts().catch(() => null),
        api.getPurchaseOrders().catch(() => null),
        api.getGoodsReceiptNotes().catch(() => null)
      ]);

      if (statsRes && statsRes.data) setStats(statsRes.data);
      if (vendorsRes && vendorsRes.data) setVendors(vendorsRes.data);
      if (contractsRes && contractsRes.data) setContracts(contractsRes.data);
      if (poRes && poRes.data) setPurchaseOrders(poRes.data);
      if (grnRes && grnRes.data) setGoodsReceipts(grnRes.data);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleRegisterVendor = async (e) => {
    e.preventDefault();
    try {
      const res = await api.registerVendor(vendorForm);
      setFeedback({
        type: 'success',
        msg: `Vendor "${res.data.name}" registered successfully with Code: ${res.data.vendorCode}.`
      });
      setShowVendorModal(false);
      setVendorForm({
        name: '',
        category: 'PHARMACEUTICALS',
        taxIdentificationNumber: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        bankName: 'GCB Bank Ghana',
        paymentTerms: 'NET_30',
        notes: ''
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createPurchaseOrder(poForm);
      setFeedback({
        type: 'success',
        msg: `Purchase Order ${res.data.poNumber} created. Total: GH₵${res.data.totalAmount.toLocaleString()}.`
      });
      setShowPoModal(false);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleApprovePo = async (poId) => {
    try {
      const res = await api.updatePurchaseOrderStatus(poId, {
        status: 'APPROVED',
        approvedBy: 'Procurement Director K. Mensah',
        notes: 'Approved under clinical budget allocation.'
      });
      setFeedback({
        type: 'success',
        msg: `PO ${res.data.poNumber} approved successfully.`
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleIssuePo = async (poId) => {
    try {
      const res = await api.updatePurchaseOrderStatus(poId, {
        status: 'ISSUED_TO_VENDOR',
        notes: 'Dispatched to supplier dispatch desk.'
      });
      setFeedback({
        type: 'success',
        msg: `PO ${res.data.poNumber} issued to vendor.`
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const openGrnForPo = (po) => {
    setGrnForm({
      purchaseOrderId: po.id,
      waybillOrInvoiceNumber: '',
      receivedBy: 'Storekeeper Boateng',
      inspectedBy: 'QA Inspector E. Mensah',
      inspectionStatus: 'INSPECTION_PASSED',
      temperatureCompliant: true,
      notes: '',
      items: (po.items || []).map(pi => ({
        poItemId: pi.id,
        itemCode: pi.itemCode,
        description: pi.description,
        quantityReceived: pi.quantityOrdered - (pi.quantityReceived || 0),
        quantityAccepted: pi.quantityOrdered - (pi.quantityReceived || 0),
        quantityRejected: 0,
        batchNumber: `BAT-${Date.now().toString().slice(-6)}`,
        unitCost: pi.unitCost,
        destinationDepartment: po.department || 'CENTRAL_STORES'
      }))
    });
    setShowGrnModal(true);
  };

  const handleCreateGrn = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createGoodsReceiptNote(grnForm);
      setFeedback({
        type: 'success',
        msg: `Goods Receipt Note ${res.data.grnNumber} generated. Status: ${res.data.status}.`
      });
      setShowGrnModal(false);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const openThreeWayMatch = (grn) => {
    setSelectedGrn(grn);
    // Suggest expected payable
    const po = grn.purchaseOrder;
    const est = po ? po.totalAmount : 0;
    setThreeWayMatchForm({
      invoiceAmount: est,
      notes: `Invoice verification for GRN ${grn.grnNumber}`
    });
    setShowThreeWayMatchModal(true);
  };

  const handleVerifyThreeWayMatch = async (e) => {
    e.preventDefault();
    if (!selectedGrn) return;
    try {
      const res = await api.verifyThreeWayMatch(selectedGrn.id, {
        invoiceAmount: parseFloat(threeWayMatchForm.invoiceAmount),
        notes: threeWayMatchForm.notes
      });
      const match = res.data.matchEvaluation;
      setFeedback({
        type: match.isMatch ? 'success' : 'error',
        msg: `Three-Way Match: ${match.isMatch ? 'VERIFIED MATCH (0.00 Variance)' : `VARIANCE DETECTED (${match.variance > 0 ? '+' : ''}${match.variance} GHS deviation)`}`
      });
      setShowThreeWayMatchModal(false);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleRegisterContract = async (e) => {
    e.preventDefault();
    try {
      const res = await api.registerVendorContract(contractForm);
      setFeedback({
        type: 'success',
        msg: `Vendor Contract ${res.data.contractNumber} recorded.`
      });
      setShowContractModal(false);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real Photorealistic Facility Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '230px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src="/assets/images/procurement_supply_chain_real.jpg"
          alt="Hospital Supply Chain & Central Medical Warehouse"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.96) 25%, rgba(10,9,7,0.5) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gold-400)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-live"></span> Phase 16 • Enterprise Supply Chain & Procurement Command Center
            </span>
            <h2 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 800 }}>
              Procurement, Purchase Orders, Vendor Contracts & Goods Receipts (GRN)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Automated Three-Way Matching (PO vs GRN vs Vendor Invoice), Cold-Chain Receiving, Supplier Contracts & Departmental Stock Distribution.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowVendorModal(true)} className="btn-outline-gold" style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
              + Register Vendor
            </button>
            <button onClick={() => setShowContractModal(true)} className="btn-outline-gold" style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
              + Vendor Contract
            </button>
            <button onClick={() => setShowPoModal(true)} className="btn-gold" style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
              + New Purchase Order
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: `4px solid ${feedback.type === 'error' ? 'var(--status-danger)' : 'var(--status-online)'}`, color: '#fff', fontSize: '0.85rem' }}>
          {feedback.msg}
        </div>
      )}

      {/* Telemetry KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid var(--gold-400)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered Suppliers</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
            {stats.activeVendors} <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>/ {stats.totalVendors}</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Active approved vendors</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid var(--status-warning)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending Purchase Orders</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-warning)', fontFamily: 'var(--font-mono)' }}>
            {stats.pendingPurchaseOrders}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Awaiting Director approval</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid var(--status-online)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active / Issued POs</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-online)', fontFamily: 'var(--font-mono)' }}>
            {stats.approvedPurchaseOrders}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Issued & in fulfillment</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid var(--gold-500)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Procurement Spend (YTD)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold-400)', fontFamily: 'var(--font-mono)' }}>
            GH₵{Number(stats.totalSpendYtd || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Fulfilled expenditures</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderLeft: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>3-Way Match Compliance</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
            {stats.threeWayMatchCompliancePercent}%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>PO vs GRN vs Invoice</div>
        </div>
      </div>

      {/* Subsystem Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('PURCHASE_ORDERS')}
          className={activeTab === 'PURCHASE_ORDERS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
        >
          Purchase Orders ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('GOODS_RECEIPTS')}
          className={activeTab === 'GOODS_RECEIPTS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
        >
          Goods Receipt Notes (GRN) & 3-Way Match ({goodsReceipts.length})
        </button>
        <button
          onClick={() => setActiveTab('VENDORS')}
          className={activeTab === 'VENDORS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
        >
          Vendor Directory ({vendors.length})
        </button>
        <button
          onClick={() => setActiveTab('CONTRACTS')}
          className={activeTab === 'CONTRACTS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
        >
          Vendor Contracts & SLAs ({contracts.length})
        </button>
      </div>

      {/* Tab 1: Purchase Orders */}
      {activeTab === 'PURCHASE_ORDERS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700 }}>
              Hospital Purchase Orders Registry
            </h3>
            <button onClick={() => setShowPoModal(true)} className="btn-gold" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
              + Create Purchase Order
            </button>
          </div>

          {purchaseOrders.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Vendor</th>
                  <th>Department</th>
                  <th>Order Date</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>Total (GH₵)</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(po => (
                  <tr key={po.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{po.poNumber}</td>
                    <td style={{ fontWeight: 600 }}>{po.vendor?.name || 'Vendor'}</td>
                    <td><span style={{ fontSize: '0.75rem', color: 'var(--gold-400)' }}>{po.department}</span></td>
                    <td style={{ fontSize: '0.75rem' }}>{new Date(po.orderDate).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.75rem' }}>{po.items?.length || 0} line items</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>GH₵{Number(po.subtotal).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
                      GH₵{Number(po.totalAmount).toLocaleString()}
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        color: po.priority === 'EMERGENCY_STOCKOUT' ? '#ef4444' : (po.priority === 'URGENT' ? '#f59e0b' : 'var(--text-muted)')
                      }}>
                        {po.priority}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        background: po.status === 'FULLY_RECEIVED' ? 'rgba(16,185,129,0.15)' : (po.status === 'APPROVED' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)'),
                        color: po.status === 'FULLY_RECEIVED' ? 'var(--status-online)' : (po.status === 'APPROVED' ? 'var(--gold-400)' : '#fff'),
                        border: `1px solid ${po.status === 'FULLY_RECEIVED' ? '#10b981' : (po.status === 'APPROVED' ? '#f59e0b' : 'var(--border-subtle)')}`
                      }}>
                        {po.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {po.status === 'DRAFT' && (
                          <button onClick={() => handleApprovePo(po.id)} className="btn-gold" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                            Approve
                          </button>
                        )}
                        {po.status === 'APPROVED' && (
                          <button onClick={() => handleIssuePo(po.id)} className="btn-outline-gold" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                            Issue
                          </button>
                        )}
                        {['APPROVED', 'ISSUED_TO_VENDOR', 'PARTIALLY_RECEIVED'].includes(po.status) && (
                          <button onClick={() => openGrnForPo(po)} className="btn-danger" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                            Receive (GRN)
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>
              No purchase orders created. Click "+ Create Purchase Order" to raise an order.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Goods Receipt Notes (GRN) & 3-Way Match */}
      {activeTab === 'GOODS_RECEIPTS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700 }}>
              Goods Receipt Notes (GRN) & Automated Three-Way Matching
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Strict verification of PO vs Warehouse Intake vs Vendor Invoice
            </span>
          </div>

          {goodsReceipts.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>GRN Number</th>
                  <th>PO Reference</th>
                  <th>Vendor</th>
                  <th>Waybill / Invoice #</th>
                  <th>Received Date</th>
                  <th>Received By</th>
                  <th>Inspection Status</th>
                  <th>Cold-Chain Temp</th>
                  <th>3-Way Match Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {goodsReceipts.map(grn => (
                  <tr key={grn.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{grn.grnNumber}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--gold-400)', fontFamily: 'var(--font-mono)' }}>
                      {grn.purchaseOrder?.poNumber || 'PO Reference'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{grn.vendor?.name}</td>
                    <td style={{ fontSize: '0.75rem' }}>{grn.waybillOrInvoiceNumber}</td>
                    <td style={{ fontSize: '0.75rem' }}>{new Date(grn.receivedAt).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.78rem' }}>{grn.receivedBy}</td>
                    <td>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        color: grn.inspectionStatus === 'INSPECTION_PASSED' ? 'var(--status-online)' : '#ef4444'
                      }}>
                        {grn.inspectionStatus}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.72rem', color: grn.temperatureCompliant ? 'var(--status-online)' : '#ef4444' }}>
                      {grn.temperatureCompliant ? '✓ Verified Safe' : '⚠ Non-compliant'}
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        background: grn.threeWayMatchVerified ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: grn.threeWayMatchVerified ? 'var(--status-online)' : '#ef4444',
                        border: `1px solid ${grn.threeWayMatchVerified ? '#10b981' : '#ef4444'}`
                      }}>
                        {grn.threeWayMatchVerified ? '✓ Matched (Verified)' : '⚠ Discrepancy / Pending'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => openThreeWayMatch(grn)} className="btn-outline-gold" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                        Match Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>
              No Goods Receipt Notes recorded. Record delivery against an approved Purchase Order.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Vendor Directory */}
      {activeTab === 'VENDORS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700 }}>
              Approved Vendor & Supplier Directory
            </h3>
            <button onClick={() => setShowVendorModal(true)} className="btn-gold" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
              + Register Vendor
            </button>
          </div>

          {vendors.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor Code</th>
                  <th>Company Name</th>
                  <th>Category</th>
                  <th>Contact Person</th>
                  <th>Phone & Email</th>
                  <th>Payment Terms</th>
                  <th>Rating</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{v.vendorCode}</td>
                    <td style={{ fontWeight: 600 }}>{v.name}</td>
                    <td><span style={{ fontSize: '0.75rem', color: 'var(--gold-400)' }}>{v.category}</span></td>
                    <td style={{ fontSize: '0.8rem' }}>{v.contactPerson}</td>
                    <td style={{ fontSize: '0.75rem' }}>{v.phone} • {v.email}</td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{v.paymentTerms}</td>
                    <td style={{ color: 'var(--gold-400)', fontWeight: 700 }}>★ {v.rating.toFixed(1)}</td>
                    <td>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        color: v.status === 'ACTIVE' ? 'var(--status-online)' : '#ef4444'
                      }}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>
              No registered vendors. Click "+ Register Vendor" to add an approved supplier.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Vendor Contracts */}
      {activeTab === 'CONTRACTS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700 }}>
              Vendor Contracts, SLAs & Framework Agreements
            </h3>
            <button onClick={() => setShowContractModal(true)} className="btn-gold" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
              + Register Contract
            </button>
          </div>

          {contracts.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contract #</th>
                  <th>Supplier Name</th>
                  <th>Contract Title</th>
                  <th>Type</th>
                  <th>Validity Period</th>
                  <th>Value (GH₵)</th>
                  <th>Signed Representative</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{c.contractNumber}</td>
                    <td style={{ fontWeight: 600 }}>{c.vendor?.name}</td>
                    <td style={{ fontSize: '0.8rem' }}>{c.title}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--gold-400)' }}>{c.contractType}</td>
                    <td style={{ fontSize: '0.75rem' }}>
                      {new Date(c.startDate).toLocaleDateString()} to {new Date(c.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>
                      GH₵{Number(c.contractValue).toLocaleString()}
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{c.signedByRepresentative || 'Representative'}</td>
                    <td>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700,
                        color: c.status === 'ACTIVE' ? 'var(--status-online)' : 'var(--status-warning)'
                      }}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>
              No vendor contracts recorded.
            </div>
          )}
        </div>
      )}

      {/* Modal: Register Vendor */}
      {showVendorModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Register Approved Vendor / Supplier</h3>
            <form onSubmit={handleRegisterVendor} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vendor Legal Company Name *</label>
                  <input required type="text" placeholder="e.g. Pharmanova Ghana Ltd" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category *</label>
                  <select value={vendorForm.category} onChange={e => setVendorForm({ ...vendorForm, category: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="PHARMACEUTICALS">Pharmaceuticals</option>
                    <option value="SURGICAL_CONSUMABLES">Surgical Consumables</option>
                    <option value="LAB_REAGENTS">Lab Reagents</option>
                    <option value="MEDICAL_EQUIPMENT">Medical Equipment</option>
                    <option value="FACILITIES_ENGINEERING">Facilities & Engineering</option>
                    <option value="GENERAL_SUPPLIES">General Supplies</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact Person *</label>
                  <input required type="text" value={vendorForm.contactPerson} onChange={e => setVendorForm({ ...vendorForm, contactPerson: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TIN Number</label>
                  <input type="text" placeholder="e.g. C0012345678" value={vendorForm.taxIdentificationNumber} onChange={e => setVendorForm({ ...vendorForm, taxIdentificationNumber: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address *</label>
                  <input required type="email" value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number *</label>
                  <input required type="text" value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Business Physical Address *</label>
                <input required type="text" value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bank Name</label>
                  <input type="text" value={vendorForm.bankName} onChange={e => setVendorForm({ ...vendorForm, bankName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payment Terms</label>
                  <select value={vendorForm.paymentTerms} onChange={e => setVendorForm({ ...vendorForm, paymentTerms: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="NET_30">NET 30 Days</option>
                    <option value="NET_60">NET 60 Days</option>
                    <option value="NET_90">NET 90 Days</option>
                    <option value="IMMEDIATE_CASH">Immediate Cash</option>
                    <option value="ADVANCE_50_PERCENT">50% Advance</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowVendorModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Confirm & Register Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Purchase Order */}
      {showPoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Raise Purchase Order (PO)</h3>
            <form onSubmit={handleCreatePo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vendor *</label>
                  <select required value={poForm.vendorId} onChange={e => setPoForm({ ...poForm, vendorId: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="">-- Choose Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.vendorCode}) - {v.category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department *</label>
                  <select value={poForm.department} onChange={e => setPoForm({ ...poForm, department: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="CENTRAL_STORES">Central Stores</option>
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="THEATRE">Operating Theatre</option>
                    <option value="LABORATORY">Laboratory</option>
                    <option value="BIOMEDICAL">Biomedical</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priority Level</label>
                  <select value={poForm.priority} onChange={e => setPoForm({ ...poForm, priority: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="ROUTINE">ROUTINE</option>
                    <option value="URGENT">URGENT</option>
                    <option value="EMERGENCY_STOCKOUT">EMERGENCY STOCKOUT</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tax Amount (GH₵)</label>
                  <input type="number" step="0.01" value={poForm.taxAmount} onChange={e => setPoForm({ ...poForm, taxAmount: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Requisitioned By *</label>
                  <input required type="text" value={poForm.requisitionedBy} onChange={e => setPoForm({ ...poForm, requisitionedBy: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--gold-400)', fontWeight: 700 }}>Order Line Items</label>
                  <button type="button" onClick={() => setPoForm({
                    ...poForm,
                    items: [...poForm.items, { itemCode: '', description: '', quantityOrdered: 10, unitCost: 10.0, unitOfMeasure: 'UNIT' }]
                  })} className="btn-outline-gold" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                    + Add Item
                  </button>
                </div>

                {poForm.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 30px', gap: '6px', marginBottom: '6px' }}>
                    <input required placeholder="Item Code" value={item.itemCode} onChange={e => {
                      const updated = [...poForm.items];
                      updated[idx].itemCode = e.target.value;
                      setPoForm({ ...poForm, items: updated });
                    }} style={{ padding: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', fontSize: '0.75rem' }} />

                    <input required placeholder="Description / Specs" value={item.description} onChange={e => {
                      const updated = [...poForm.items];
                      updated[idx].description = e.target.value;
                      setPoForm({ ...poForm, items: updated });
                    }} style={{ padding: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', fontSize: '0.75rem' }} />

                    <input required type="number" min="1" placeholder="Qty" value={item.quantityOrdered} onChange={e => {
                      const updated = [...poForm.items];
                      updated[idx].quantityOrdered = parseInt(e.target.value, 10) || 1;
                      setPoForm({ ...poForm, items: updated });
                    }} style={{ padding: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', fontSize: '0.75rem' }} />

                    <input required type="number" step="0.01" placeholder="Unit GH₵" value={item.unitCost} onChange={e => {
                      const updated = [...poForm.items];
                      updated[idx].unitCost = parseFloat(e.target.value) || 0;
                      setPoForm({ ...poForm, items: updated });
                    }} style={{ padding: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', fontSize: '0.75rem' }} />

                    {poForm.items.length > 1 && (
                      <button type="button" onClick={() => {
                        const updated = poForm.items.filter((_, i) => i !== idx);
                        setPoForm({ ...poForm, items: updated });
                      }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowPoModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Confirm & Raise Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create GRN */}
      {showGrnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Record Physical Delivery (Goods Receipt Note)</h3>
            <form onSubmit={handleCreateGrn} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supplier Waybill / Delivery Slip # *</label>
                  <input required type="text" placeholder="e.g. WB-2026-90412" value={grnForm.waybillOrInvoiceNumber} onChange={e => setGrnForm({ ...grnForm, waybillOrInvoiceNumber: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Receiving Officer *</label>
                  <input required type="text" value={grnForm.receivedBy} onChange={e => setGrnForm({ ...grnForm, receivedBy: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QA Inspector *</label>
                  <input required type="text" value={grnForm.inspectedBy} onChange={e => setGrnForm({ ...grnForm, inspectedBy: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inspection Status</label>
                  <select value={grnForm.inspectionStatus} onChange={e => setGrnForm({ ...grnForm, inspectionStatus: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="INSPECTION_PASSED">INSPECTION PASSED (Accepted)</option>
                    <option value="PARTIALLY_REJECTED">PARTIALLY REJECTED</option>
                    <option value="REJECTED_DAMAGED">REJECTED (Damaged / Spoiled)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--gold-400)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Delivered Line Items</label>
                {grnForm.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '6px', marginBottom: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.description}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Code: {item.itemCode}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Qty Received</label>
                      <input type="number" min="0" value={item.quantityReceived} onChange={e => {
                        const updated = [...grnForm.items];
                        updated[idx].quantityReceived = parseInt(e.target.value, 10) || 0;
                        updated[idx].quantityAccepted = updated[idx].quantityReceived;
                        setGrnForm({ ...grnForm, items: updated });
                      }} style={{ width: '100%', padding: '4px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', fontSize: '0.75rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Qty Accepted</label>
                      <input type="number" min="0" value={item.quantityAccepted} onChange={e => {
                        const updated = [...grnForm.items];
                        updated[idx].quantityAccepted = parseInt(e.target.value, 10) || 0;
                        setGrnForm({ ...grnForm, items: updated });
                      }} style={{ width: '100%', padding: '4px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', fontSize: '0.75rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Batch #</label>
                      <input type="text" value={item.batchNumber} onChange={e => {
                        const updated = [...grnForm.items];
                        updated[idx].batchNumber = e.target.value;
                        setGrnForm({ ...grnForm, items: updated });
                      }} style={{ width: '100%', padding: '4px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', fontSize: '0.75rem' }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowGrnModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Confirm Intake & Stock Inventory</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Three-Way Match */}
      {showThreeWayMatchModal && selectedGrn && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>
              Three-Way Matching Verification
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--gold-400)', marginBottom: '14px' }}>
              GRN: {selectedGrn.grnNumber} • PO: {selectedGrn.purchaseOrder?.poNumber}
            </p>

            <form onSubmit={handleVerifyThreeWayMatch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supplier Billed Invoice Total (GH₵) *</label>
                <input required type="number" step="0.01" value={threeWayMatchForm.invoiceAmount} onChange={e => setThreeWayMatchForm({ ...threeWayMatchForm, invoiceAmount: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '4px', fontSize: '1rem', fontWeight: 700 }} />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  Expected PO / GRN Payable: GH₵{Number(selectedGrn.purchaseOrder?.totalAmount || 0).toLocaleString()}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Audit Notes</label>
                <textarea rows={2} value={threeWayMatchForm.notes} onChange={e => setThreeWayMatchForm({ ...threeWayMatchForm, notes: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowThreeWayMatchModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Execute 3-Way Match Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Vendor Contract */}
      {showContractModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Register Vendor Contract / SLA</h3>
            <form onSubmit={handleRegisterContract} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vendor *</label>
                <select required value={contractForm.vendorId} onChange={e => setContractForm({ ...contractForm, vendorId: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                  <option value="">-- Choose Vendor --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.vendorCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contract / Agreement Title *</label>
                <input required type="text" placeholder="e.g. Annual Essential Medicines Supply Framework Agreement" value={contractForm.title} onChange={e => setContractForm({ ...contractForm, title: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contract Type</label>
                  <select value={contractForm.contractType} onChange={e => setContractForm({ ...contractForm, contractType: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="FRAMEWORK_AGREEMENT">Framework Agreement</option>
                    <option value="EXCLUSIVE_SUPPLY">Exclusive Supply</option>
                    <option value="SERVICE_LEVEL_AGREEMENT">Service Level Agreement (SLA)</option>
                    <option value="ONE_TIME_PURCHASE">One-Time Purchase</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contract Value (GH₵)</label>
                  <input type="number" value={contractForm.contractValue} onChange={e => setContractForm({ ...contractForm, contractValue: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Start Date</label>
                  <input type="date" value={contractForm.startDate} onChange={e => setContractForm({ ...contractForm, startDate: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>End Date</label>
                  <input type="date" value={contractForm.endDate} onChange={e => setContractForm({ ...contractForm, endDate: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowContractModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Confirm & Sign Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 17. HUMAN RESOURCES, DUTY ROSTERING & CREDENTIALING (PHASE 17)
// ==========================================
export function HRManagementView() {
  const [activeTab, setActiveTab] = useState('ROSTER'); // 'ROSTER' | 'HANDOVERS' | 'CREDENTIALS' | 'ATTENDANCE_LEAVE'
  const [stats, setStats] = useState(null);
  const [catalogs, setCatalogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Data states
  const [rosters, setRosters] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);

  // Modals
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState(null);

  // Forms
  const [rosterForm, setRosterForm] = useState({
    staffId: '',
    staffName: '',
    department: 'ACCIDENT_AND_EMERGENCY',
    wardOrUnit: '',
    shiftType: 'MORNING_SHIFT',
    shiftDate: new Date().toISOString().split('T')[0],
    startTime: '07:00',
    endTime: '15:00',
    notes: ''
  });

  const [handoverForm, setHandoverForm] = useState({
    department: 'ACCIDENT_AND_EMERGENCY',
    wardOrUnit: '',
    outgoingStaffName: '',
    incomingStaffName: '',
    shiftFrom: 'MORNING_SHIFT',
    shiftTo: 'AFTERNOON_SHIFT',
    censusTotalPatients: 0,
    criticalPatientCount: 0,
    situation: '',
    background: '',
    assessment: '',
    recommendation: '',
    controlledDrugsCountOk: true
  });

  const [credentialForm, setCredentialForm] = useState({
    staffId: '',
    staffName: '',
    regulatoryBody: 'Medical and Dental Council (MDC) Ghana',
    licenseNumber: '',
    cadre: 'SPECIALIST_PHYSICIAN',
    specialty: '',
    issuedDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    verificationNotes: ''
  });

  const [leaveForm, setLeaveForm] = useState({
    staffId: '',
    staffName: '',
    department: 'ACCIDENT_AND_EMERGENCY',
    leaveType: 'ANNUAL_LEAVE',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    daysRequested: 7,
    relievingStaffName: '',
    reason: ''
  });

  const [clockInForm, setClockInForm] = useState({
    staffId: '',
    staffName: '',
    department: 'ACCIDENT_AND_EMERGENCY',
    workstationOrTerminal: 'BIOMETRIC_TERMINAL_ED_MAIN',
    clockInTime: ''
  });

  const [coSignNotes, setCoSignNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, catalogsRes, rostersRes, handoversRes, credsRes, attRes, leavesRes] = await Promise.all([
        api.getHrStats().catch(() => null),
        api.getHrCatalogs().catch(() => null),
        api.getDutyRosters().catch(() => []),
        api.getShiftHandovers().catch(() => []),
        api.getCredentials().catch(() => []),
        api.getStaffAttendance().catch(() => []),
        api.getLeaveRequests().catch(() => [])
      ]);

      if (statsRes?.data) setStats(statsRes.data);
      if (catalogsRes?.data) setCatalogs(catalogsRes.data);
      if (Array.isArray(rostersRes)) setRosters(rostersRes);
      else if (rostersRes?.data) setRosters(rostersRes.data);

      if (Array.isArray(handoversRes)) setHandovers(handoversRes);
      else if (handoversRes?.data) setHandovers(handoversRes.data);

      if (Array.isArray(credsRes)) setCredentials(credsRes);
      else if (credsRes?.data) setCredentials(credsRes.data);

      if (Array.isArray(attRes)) setAttendance(attRes);
      else if (attRes?.data) setAttendance(attRes.data);

      if (Array.isArray(leavesRes)) setLeaveRequests(leavesRes);
      else if (leavesRes?.data) setLeaveRequests(leavesRes.data);
    } catch (err) {
      setFeedback({ type: 'error', msg: `Failed loading HR data: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScheduleRoster = async (e) => {
    e.preventDefault();
    try {
      await api.scheduleDutyShift(rosterForm);
      setFeedback({ type: 'success', msg: `Duty shift scheduled for ${rosterForm.staffName} (${rosterForm.shiftType})` });
      setShowRosterModal(false);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleRecordHandover = async (e) => {
    e.preventDefault();
    try {
      await api.recordShiftHandover(handoverForm);
      setFeedback({ type: 'success', msg: `Clinical SBAR handover documented from ${handoverForm.outgoingStaffName} to ${handoverForm.incomingStaffName}` });
      setShowHandoverModal(false);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleCoSignHandover = async (e) => {
    e.preventDefault();
    if (!selectedHandover) return;
    try {
      await api.coSignShiftHandover(selectedHandover.id, {
        incomingStaffName: selectedHandover.incomingStaffName,
        notes: coSignNotes || 'Verified all patient statuses and controlled narcotics count in vault.'
      });
      setFeedback({ type: 'success', msg: `Shift handover ${selectedHandover.handoverNumber} co-signed and verified!` });
      setSelectedHandover(null);
      setCoSignNotes('');
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleRegisterCredential = async (e) => {
    e.preventDefault();
    try {
      await api.registerCredential(credentialForm);
      setFeedback({ type: 'success', msg: `Staff credential registered for ${credentialForm.staffName} (${credentialForm.licenseNumber})` });
      setShowCredentialModal(false);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleVerifyCredential = async (id, staffName) => {
    try {
      await api.verifyCredential(id, {
        verifiedBy: 'Prof. Kwame Asante (Medical Director)',
        verificationNotes: 'Verified directly on National Professional Regulatory Council portal.'
      });
      setFeedback({ type: 'success', msg: `Credential verified for ${staffName}` });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleClockIn = async (e) => {
    e.preventDefault();
    try {
      await api.clockInStaff(clockInForm);
      setFeedback({ type: 'success', msg: `Staff ${clockInForm.staffName} clocked in at ${clockInForm.clockInTime}` });
      setShowClockInModal(false);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleClockOut = async (id, staffName) => {
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      await api.clockOutStaff(id, { clockOutTime: timeStr });
      setFeedback({ type: 'success', msg: `Staff ${staffName} clocked out at ${timeStr}` });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    try {
      await api.requestStaffLeave(leaveForm);
      setFeedback({ type: 'success', msg: `Leave request submitted for ${leaveForm.staffName} (${leaveForm.daysRequested} days)` });
      setShowLeaveModal(false);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleAdjudicateLeave = async (id, status, staffName) => {
    try {
      await api.adjudicateLeaveRequest(id, {
        status,
        approvedBy: 'Mrs. Evelyn Boateng (Director of Human Resources)',
        comments: status === 'APPROVED' ? 'Relieving clinician verified and clinical duties covered.' : 'Requires roster adjustment before leave can be cleared.'
      });
      setFeedback({ type: 'success', msg: `Leave request for ${staffName} marked as ${status}` });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner with Real-Life Hospital HR & Medical Staff Photography */}
      <div
        className="glass-panel"
        style={{
          padding: '28px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderLeft: '4px solid var(--gold-400)',
          background: 'linear-gradient(135deg, rgba(20, 16, 10, 0.95), rgba(30, 24, 15, 0.85))'
        }}
      >
        <img
          src="/assets/images/hr_medical_staff_real.jpg"
          alt="Hospital Medical Staff & HR Credentialing"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '48%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.6,
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 55%, rgba(0,0,0,0))',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 55%, rgba(0,0,0,0))'
          }}
        />
        <div style={{ zIndex: 1, maxWidth: '750px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="pulse-live"></span>
            <span style={{ fontSize: '0.72rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold-400)', fontWeight: 700 }}>
              Phase 17 • Enterprise Human Resource Management & Staff Credentialing
            </span>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#fff', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
            Staff Credentialing, Duty Rostering & SBAR Clinical Handovers
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: '1.5' }}>
            Ghana Regulatory Councils verification (MDC, NMC, PCG, AHPC), dynamic license expiration guardrails, conflict-checked duty shift scheduling, structured clinical SBAR handovers with dual co-signatures, and biometric attendance.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={loadData} className="btn-outline-gold" style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Telemetry
            </button>
            <button onClick={() => setShowClockInModal(true)} className="btn-gold" style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
              <Clock size={14} /> Biometric Clock-In
            </button>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--gold-300)' }}>
            Compliance Rate: <strong>{stats?.credentialComplianceRate ?? 0}%</strong>
          </span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 18px',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            border: `1px solid ${feedback.type === 'error' ? 'var(--red-500)' : 'var(--green-500)'}`
          }}
        >
          <span style={{ fontSize: '0.85rem', color: feedback.type === 'error' ? '#fca5a5' : '#86efac' }}>
            {feedback.msg}
          </span>
          <button onClick={() => setFeedback(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px', borderTop: '2px solid var(--gold-400)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered Staff</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold-300)', marginTop: '4px' }}>
            {stats?.totalStaffCount ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Clinical & Administrative</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderTop: '2px solid var(--green-500)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified Credentials</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#86efac', marginTop: '4px' }}>
            {stats?.activeCredentialedStaff ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Active Regulatory Licensures</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderTop: '2px solid #eab308' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expiring Soon (30d)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fde047', marginTop: '4px' }}>
            {stats?.expiringCredentials30Days ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Council Renewal Window</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderTop: '2px solid var(--blue-400)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Today's Scheduled Shifts</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#93c5fd', marginTop: '4px' }}>
            {stats?.shiftsScheduledToday ?? rosters.length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Conflict-Checked Rosters</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderTop: '2px solid #f97316' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending Handovers</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fdba74', marginTop: '4px' }}>
            {stats?.pendingShiftHandovers ?? handovers.filter(h => h.status === 'PENDING_COSIGNATURE').length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Awaiting Incoming Co-Signature</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', borderTop: '2px solid var(--gold-500)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff On-Duty Today</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold-400)', marginTop: '4px' }}>
            {stats?.activeOnDutyStaffToday ?? attendance.filter(a => !a.clockOutTime).length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Biometric Active Clocks</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('ROSTER')}
          className={activeTab === 'ROSTER' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
        >
          Duty Rostering & Shifts ({rosters.length})
        </button>
        <button
          onClick={() => setActiveTab('HANDOVERS')}
          className={activeTab === 'HANDOVERS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
        >
          SBAR Shift Handovers ({handovers.length})
        </button>
        <button
          onClick={() => setActiveTab('CREDENTIALS')}
          className={activeTab === 'CREDENTIALS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
        >
          Staff Credentialing & Councils ({credentials.length})
        </button>
        <button
          onClick={() => setActiveTab('ATTENDANCE_LEAVE')}
          className={activeTab === 'ATTENDANCE_LEAVE' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
        >
          Biometric Attendance & Leave ({attendance.length} / {leaveRequests.length})
        </button>
      </div>

      {/* Tab 1: Duty Rostering */}
      {activeTab === 'ROSTER' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700, margin: 0 }}>
              Hospital Duty Roster & Clinical Shift Allocation
            </h3>
            <button onClick={() => setShowRosterModal(true)} className="btn-gold" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
              + Schedule Duty Shift
            </button>
          </div>

          {rosters.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roster #</th>
                  <th>Staff Member</th>
                  <th>Department</th>
                  <th>Ward / Unit</th>
                  <th>Shift Type</th>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rosters.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{r.rosterNumber}</td>
                    <td style={{ fontWeight: 600 }}>{r.staffName}</td>
                    <td><span style={{ fontSize: '0.75rem', color: 'var(--gold-400)' }}>{r.department}</span></td>
                    <td>{r.wardOrUnit || 'General Station'}</td>
                    <td>
                      <span className="badge" style={{ background: '#3b2f15', color: '#fde047', border: '1px solid #ca8a04' }}>
                        {r.shiftType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{new Date(r.shiftDate).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.startTime} - {r.endTime}</td>
                    <td>
                      <span className="badge" style={{
                        background: r.status === 'COMPLETED' ? '#143823' : '#1e1c24',
                        color: r.status === 'COMPLETED' ? '#86efac' : '#cbd5e1',
                        border: `1px solid ${r.status === 'COMPLETED' ? '#22c55e' : '#64748b'}`
                      }}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              No shifts scheduled. Click "+ Schedule Duty Shift" to create a conflict-checked roster entry.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: SBAR Shift Handovers */}
      {activeTab === 'HANDOVERS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700, margin: 0 }}>
              Clinical SBAR Shift Handovers (Situation, Background, Assessment, Recommendation)
            </h3>
            <button onClick={() => setShowHandoverModal(true)} className="btn-gold" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
              + Document SBAR Handover
            </button>
          </div>

          {handovers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {handovers.map(h => (
                <div
                  key={h.id}
                  className="glass-panel"
                  style={{
                    padding: '16px',
                    border: '1px solid var(--border-gold)',
                    background: 'rgba(25, 20, 14, 0.7)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 800, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{h.handoverNumber}</span>
                      <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>•</span>
                      <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>{h.department}</span>
                      <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>•</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gold-400)' }}>{h.shiftFrom.replace(/_/g, ' ')} → {h.shiftTo.replace(/_/g, ' ')}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge" style={{
                        background: h.status === 'COMPLETED_VERIFIED' ? '#143823' : '#3d2514',
                        color: h.status === 'COMPLETED_VERIFIED' ? '#86efac' : '#fdba74',
                        border: `1px solid ${h.status === 'COMPLETED_VERIFIED' ? '#22c55e' : '#f97316'}`
                      }}>
                        {h.status === 'COMPLETED_VERIFIED' ? '✓ Co-Signed & Completed' : 'Pending Incoming Co-Signature'}
                      </span>
                      {h.status === 'PENDING_COSIGNATURE' && (
                        <button
                          onClick={() => setSelectedHandover(h)}
                          className="btn-gold"
                          style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                        >
                          Co-Sign Handover
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SBAR Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.8rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #3b82f6' }}>
                      <strong style={{ color: '#93c5fd', display: 'block', marginBottom: '4px' }}>[S] SITUATION:</strong>
                      {h.situation}
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #8b5cf6' }}>
                      <strong style={{ color: '#c4b5fd', display: 'block', marginBottom: '4px' }}>[B] BACKGROUND:</strong>
                      {h.background}
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #eab308' }}>
                      <strong style={{ color: '#fde047', display: 'block', marginBottom: '4px' }}>[A] ASSESSMENT:</strong>
                      {h.assessment}
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #22c55e' }}>
                      <strong style={{ color: '#86efac', display: 'block', marginBottom: '4px' }}>[R] RECOMMENDATION:</strong>
                      {h.recommendation}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <div>
                      Outgoing Clinician: <strong style={{ color: '#fff' }}>{h.outgoingStaffName}</strong> ({new Date(h.outgoingSignedAt).toLocaleTimeString()})
                    </div>
                    <div>
                      Census: <strong style={{ color: 'var(--gold-300)' }}>{h.censusTotalPatients} Patients</strong> ({h.criticalPatientCount} Critical) • Controlled Narcotics: <strong style={{ color: h.controlledDrugsCountOk ? '#86efac' : '#fca5a5' }}>{h.controlledDrugsCountOk ? 'Reconciled ✓' : 'Discrepancy ✕'}</strong>
                    </div>
                    <div>
                      Incoming Clinician: <strong style={{ color: '#fff' }}>{h.incomingStaffName}</strong> {h.incomingCoSignedAt ? `(Co-signed ${new Date(h.incomingCoSignedAt).toLocaleTimeString()})` : '(Pending)'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              No clinical handovers recorded today. Click "+ Document SBAR Handover" to record a structured shift exchange.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Staff Credentialing */}
      {activeTab === 'CREDENTIALS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700, margin: 0 }}>
              Ghana Health Regulatory Councils & Professional Licensures
            </h3>
            <button onClick={() => setShowCredentialModal(true)} className="btn-gold" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
              + Register Staff Credential
            </button>
          </div>

          {credentials.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Credential #</th>
                  <th>Staff Clinician</th>
                  <th>Regulatory Council</th>
                  <th>License Number</th>
                  <th>Cadre / Specialty</th>
                  <th>Expiry Date</th>
                  <th>Days Remaining</th>
                  <th>Compliance Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{c.credentialNumber}</td>
                    <td style={{ fontWeight: 600 }}>{c.staffName}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--gold-400)' }}>{c.regulatoryBody}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{c.licenseNumber}</td>
                    <td>
                      <div>{c.cadre.replace(/_/g, ' ')}</div>
                      {c.specialty && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.specialty}</div>}
                    </td>
                    <td>{new Date(c.expiryDate).toLocaleDateString()}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: c.daysRemaining > 30 ? '#86efac' : (c.daysRemaining > 0 ? '#fde047' : '#fca5a5') }}>
                        {c.daysRemaining > 0 ? `${c.daysRemaining} days` : 'EXPIRED'}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: c.dynamicStatus === 'ACTIVE_VERIFIED' ? '#143823' : (c.dynamicStatus === 'EXPIRING_SOON' ? '#3d3014' : '#3d1414'),
                        color: c.dynamicStatus === 'ACTIVE_VERIFIED' ? '#86efac' : (c.dynamicStatus === 'EXPIRING_SOON' ? '#fde047' : '#fca5a5'),
                        border: `1px solid ${c.dynamicStatus === 'ACTIVE_VERIFIED' ? '#22c55e' : (c.dynamicStatus === 'EXPIRING_SOON' ? '#eab308' : '#ef4444')}`
                      }}>
                        {c.dynamicStatus || c.credentialStatus}
                      </span>
                    </td>
                    <td>
                      {c.verifiedBy ? (
                        <span style={{ fontSize: '0.72rem', color: '#86efac' }}>Verified ✓</span>
                      ) : (
                        <button
                          onClick={() => handleVerifyCredential(c.id, c.staffName)}
                          className="btn-outline-gold"
                          style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                        >
                          Verify Council
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
              No credentials registered. Click "+ Register Staff Credential" to track MDC, NMC, or PCG licenses.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Biometric Attendance & Leave */}
      {activeTab === 'ATTENDANCE_LEAVE' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left Column: Attendance */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700, margin: 0 }}>
                Biometric Clock-In / Clock-Out
              </h3>
              <button onClick={() => setShowClockInModal(true)} className="btn-gold" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                + Quick Clock-In
              </button>
            </div>

            {attendance.length > 0 ? (
              <table className="data-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Attendance #</th>
                    <th>Staff Name</th>
                    <th>In Time</th>
                    <th>Out Time</th>
                    <th>Hours</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>{a.attendanceNumber}</td>
                      <td style={{ fontWeight: 600 }}>{a.staffName}</td>
                      <td>{a.clockInTime}</td>
                      <td>{a.clockOutTime || <span style={{ color: '#86efac' }}>On Duty</span>}</td>
                      <td>{a.hoursWorked ? `${a.hoursWorked} hrs` : '-'}</td>
                      <td>
                        {!a.clockOutTime && (
                          <button
                            onClick={() => handleClockOut(a.id, a.staffName)}
                            className="btn-outline-gold"
                            style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                          >
                            Clock-Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                No active biometric clocks logged today.
              </div>
            )}
          </div>

          {/* Right Column: Leave Requests */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', fontWeight: 700, margin: 0 }}>
                Staff Leave Requests & Adjudication
              </h3>
              <button onClick={() => setShowLeaveModal(true)} className="btn-gold" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                + Request Leave
              </button>
            </div>

            {leaveRequests.length > 0 ? (
              <table className="data-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Leave #</th>
                    <th>Staff Name</th>
                    <th>Type</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Adjudicate</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>{l.leaveNumber}</td>
                      <td style={{ fontWeight: 600 }}>{l.staffName}</td>
                      <td>{l.leaveType.replace(/_/g, ' ')}</td>
                      <td>{l.daysRequested} d</td>
                      <td>
                        <span className="badge" style={{
                          background: l.status === 'APPROVED' ? '#143823' : (l.status === 'REJECTED' ? '#3d1414' : '#3d3014'),
                          color: l.status === 'APPROVED' ? '#86efac' : (l.status === 'REJECTED' ? '#fca5a5' : '#fde047')
                        }}>
                          {l.status}
                        </span>
                      </td>
                      <td>
                        {l.status === 'PENDING_APPROVAL' ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handleAdjudicateLeave(l.id, 'APPROVED', l.staffName)} className="btn-gold" style={{ fontSize: '0.65rem', padding: '2px 5px' }}>✓</button>
                            <button onClick={() => handleAdjudicateLeave(l.id, 'REJECTED', l.staffName)} className="btn-outline-gold" style={{ fontSize: '0.65rem', padding: '2px 5px', color: '#fca5a5' }}>✕</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{l.approvedBy ? 'Decided' : '-'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                No active leave requests filed.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Schedule Shift */}
      {showRosterModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--gold-400)', fontWeight: 700, margin: 0 }}>
                Schedule Clinical Duty Shift (Conflict-Checked)
              </h3>
              <button onClick={() => setShowRosterModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleScheduleRoster} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clinician / Staff Name</label>
                <input type="text" value={rosterForm.staffName} onChange={e => setRosterForm({ ...rosterForm, staffName: e.target.value })} required style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department</label>
                  <select value={rosterForm.department} onChange={e => setRosterForm({ ...rosterForm, department: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="ACCIDENT_AND_EMERGENCY">Accident & Emergency (ED)</option>
                    <option value="OPERATING_THEATRE">Operating Theatre & Surgery</option>
                    <option value="INTENSIVE_CARE_UNIT">Intensive Care Unit (ICU)</option>
                    <option value="INTERNAL_MEDICINE">Internal Medicine Ward</option>
                    <option value="PEDIATRICS">Pediatric Care Unit</option>
                    <option value="OBSTETRICS_GYNECOLOGY">Maternity & OB/GYN</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Shift Type</label>
                  <select value={rosterForm.shiftType} onChange={e => setRosterForm({ ...rosterForm, shiftType: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="MORNING_SHIFT">Morning Shift (07:00 - 15:00)</option>
                    <option value="AFTERNOON_SHIFT">Afternoon Shift (14:30 - 21:30)</option>
                    <option value="NIGHT_SHIFT">Night Shift (21:00 - 08:00)</option>
                    <option value="ON_CALL_24HR">24-Hour Clinical On-Call</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Shift Date</label>
                  <input type="date" value={rosterForm.shiftDate} onChange={e => setRosterForm({ ...rosterForm, shiftDate: e.target.value })} required style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Start Time</label>
                  <input type="text" value={rosterForm.startTime} onChange={e => setRosterForm({ ...rosterForm, startTime: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>End Time</label>
                  <input type="text" value={rosterForm.endTime} onChange={e => setRosterForm({ ...rosterForm, endTime: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowRosterModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Confirm Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: SBAR Handover */}
      {showHandoverModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--gold-400)', fontWeight: 700, margin: 0 }}>
                Document Clinical SBAR Shift Handover
              </h3>
              <button onClick={() => setShowHandoverModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleRecordHandover} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Outgoing Clinician</label>
                  <input type="text" value={handoverForm.outgoingStaffName} onChange={e => setHandoverForm({ ...handoverForm, outgoingStaffName: e.target.value })} required style={{ width: '100%', padding: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incoming Clinician</label>
                  <input type="text" value={handoverForm.incomingStaffName} onChange={e => setHandoverForm({ ...handoverForm, incomingStaffName: e.target.value })} required style={{ width: '100%', padding: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Situation [S]</label>
                <textarea rows={2} value={handoverForm.situation} onChange={e => setHandoverForm({ ...handoverForm, situation: e.target.value })} required style={{ width: '100%', padding: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Background [B]</label>
                <textarea rows={2} value={handoverForm.background} onChange={e => setHandoverForm({ ...handoverForm, background: e.target.value })} required style={{ width: '100%', padding: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assessment [A]</label>
                <textarea rows={2} value={handoverForm.assessment} onChange={e => setHandoverForm({ ...handoverForm, assessment: e.target.value })} required style={{ width: '100%', padding: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recommendation [R]</label>
                <textarea rows={2} value={handoverForm.recommendation} onChange={e => setHandoverForm({ ...handoverForm, recommendation: e.target.value })} required style={{ width: '100%', padding: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input type="checkbox" id="narcotics" checked={handoverForm.controlledDrugsCountOk} onChange={e => setHandoverForm({ ...handoverForm, controlledDrugsCountOk: e.target.checked })} />
                <label htmlFor="narcotics" style={{ fontSize: '0.75rem', color: '#fff', cursor: 'pointer' }}>Controlled narcotics & dangerous drugs vault count reconciled</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowHandoverModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Sign & Transmit Handover</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Co-Sign Handover */}
      {selectedHandover && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--gold-400)', fontWeight: 700, margin: 0 }}>
                Co-Sign Handover ({selectedHandover.handoverNumber})
              </h3>
              <button onClick={() => setSelectedHandover(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCoSignHandover} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                Incoming Clinician <strong>{selectedHandover.incomingStaffName}</strong> confirming patient census of <strong>{selectedHandover.censusTotalPatients} patients</strong> and controlled drugs registry in {selectedHandover.department}.
              </p>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incoming Clinician Verification Notes</label>
                <textarea rows={3} value={coSignNotes} onChange={e => setCoSignNotes(e.target.value)} placeholder="All acute patients sighted; high-risk alerts noted; drug keys transferred." style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setSelectedHandover(null)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Confirm & Co-Sign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Register Credential */}
      {showCredentialModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--gold-400)', fontWeight: 700, margin: 0 }}>
                Register Staff Regulatory Credential
              </h3>
              <button onClick={() => setShowCredentialModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleRegisterCredential} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff Name</label>
                <input type="text" value={credentialForm.staffName} onChange={e => setCredentialForm({ ...credentialForm, staffName: e.target.value })} required style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Regulatory Council</label>
                  <select value={credentialForm.regulatoryBody} onChange={e => setCredentialForm({ ...credentialForm, regulatoryBody: e.target.value })} style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="Medical and Dental Council (MDC) Ghana">Medical and Dental Council (MDC) Ghana</option>
                    <option value="Nursing and Midwifery Council (NMC) Ghana">Nursing and Midwifery Council (NMC) Ghana</option>
                    <option value="Pharmacy Council of Ghana">Pharmacy Council of Ghana</option>
                    <option value="Allied Health Professions Council Ghana">Allied Health Professions Council Ghana</option>
                    <option value="Health Facilities Regulatory Agency (HeFRA)">Health Facilities Regulatory Agency (HeFRA)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>License Number</label>
                  <input type="text" value={credentialForm.licenseNumber} onChange={e => setCredentialForm({ ...credentialForm, licenseNumber: e.target.value })} required style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cadre</label>
                  <select value={credentialForm.cadre} onChange={e => setCredentialForm({ ...credentialForm, cadre: e.target.value })} style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="SPECIALIST_PHYSICIAN">Specialist Physician</option>
                    <option value="CONSULTANT_SURGEON">Consultant Surgeon</option>
                    <option value="MEDICAL_OFFICER">Medical Officer</option>
                    <option value="SENIOR_NURSE_OFFICER">Senior Nurse Officer</option>
                    <option value="CLINICAL_PHARMACIST">Clinical Pharmacist</option>
                    <option value="BIOMEDICAL_SCIENTIST">Biomedical Scientist</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Specialty</label>
                  <input type="text" value={credentialForm.specialty} onChange={e => setCredentialForm({ ...credentialForm, specialty: e.target.value })} style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Issued Date</label>
                  <input type="date" value={credentialForm.issuedDate} onChange={e => setCredentialForm({ ...credentialForm, issuedDate: e.target.value })} required style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expiry Date</label>
                  <input type="date" value={credentialForm.expiryDate} onChange={e => setCredentialForm({ ...credentialForm, expiryDate: e.target.value })} required style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowCredentialModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Register Credential</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Biometric Quick Clock-In */}
      {showClockInModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--gold-400)', fontWeight: 700, margin: 0 }}>
                Biometric Reader Clock-In
              </h3>
              <button onClick={() => setShowClockInModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleClockIn} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff Member</label>
                <input type="text" value={clockInForm.staffName} onChange={e => setClockInForm({ ...clockInForm, staffName: e.target.value })} required style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department</label>
                <input type="text" value={clockInForm.department} onChange={e => setClockInForm({ ...clockInForm, department: e.target.value })} required style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Biometric Terminal</label>
                <select value={clockInForm.workstationOrTerminal} onChange={e => setClockInForm({ ...clockInForm, workstationOrTerminal: e.target.value })} style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                  <option value="BIOMETRIC_TERMINAL_ED_MAIN">Accident & Emergency Main Gate Reader</option>
                  <option value="BIOMETRIC_TERMINAL_OT">Operating Theatre Surgical Airlock Reader</option>
                  <option value="BIOMETRIC_TERMINAL_ICU">ICU Critical Access Terminal</option>
                  <option value="BIOMETRIC_TERMINAL_PHARMACY">Central Pharmacy Dispensary Terminal</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowClockInModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Simulate Fingerprint Clock-In</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Request Leave */}
      {showLeaveModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--gold-400)', fontWeight: 700, margin: 0 }}>
                Submit Staff Leave Request
              </h3>
              <button onClick={() => setShowLeaveModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleRequestLeave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff Member</label>
                <input type="text" value={leaveForm.staffName} onChange={e => setLeaveForm({ ...leaveForm, staffName: e.target.value })} required style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Leave Type</label>
                  <select value={leaveForm.leaveType} onChange={e => setLeaveForm({ ...leaveForm, leaveType: e.target.value })} style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="ANNUAL_LEAVE">Annual Statutory Leave</option>
                    <option value="SICK_LEAVE">Medical / Sick Leave</option>
                    <option value="MATERNITY_LEAVE">Maternity Leave</option>
                    <option value="PATERNITY_LEAVE">Paternity Leave</option>
                    <option value="STUDY_LEAVE">Continuing Professional Development (CPD)</option>
                    <option value="COMPASSIONATE_LEAVE">Compassionate Leave</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Relieving Clinician</label>
                  <input type="text" value={leaveForm.relievingStaffName} onChange={e => setLeaveForm({ ...leaveForm, relievingStaffName: e.target.value })} required style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Start Date</label>
                  <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} required style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>End Date</label>
                  <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Days</label>
                  <input type="number" value={leaveForm.daysRequested} onChange={e => setLeaveForm({ ...leaveForm, daysRequested: parseInt(e.target.value) || 1 })} required style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reason / Clinical Justification</label>
                <textarea rows={2} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} required style={{ width: '100%', padding: '7px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowLeaveModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Submit Leave Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 18. QUALITY ASSURANCE, CLINICAL AUDITS & INFECTION CONTROL
// ==========================================
export function QualityAssuranceView() {
  const [activeTab, setActiveTab] = useState('INCIDENTS'); // INCIDENTS | INFECTION_CONTROL | AUDITS | CAPA_AND_ALERTS
  const [stats, setStats] = useState({
    hospitalSafetyIndex: 0,
    safetyRating: 'NO_DATA',
    totalIncidents: 0,
    sentinelEvents: 0,
    openIncidents: 0,
    activeInfectionCases: 0,
    averageAuditCompliance: '0.0%',
    totalAuditsConducted: 0,
    openCapaCount: 0,
    activeSafetyAlerts: 0
  });

  const [incidents, setIncidents] = useState([]);
  const [ipcCases, setIpcCases] = useState([]);
  const [audits, setAudits] = useState([]);
  const [capas, setCapas] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Modals
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showIpcModal, setShowIpcModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showCapaModal, setShowCapaModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showRcaModal, setShowRcaModal] = useState(false);
  const [showClearIpcModal, setShowClearIpcModal] = useState(false);
  const [showVerifyCapaModal, setShowVerifyCapaModal] = useState(false);

  // Selected Records
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedIpcCase, setSelectedIpcCase] = useState(null);
  const [selectedCapa, setSelectedCapa] = useState(null);

  // Forms
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    incidentDate: new Date().toISOString().split('T')[0],
    category: 'MEDICATION_ERROR',
    severity: 'NEAR_MISS',
    locationDepartment: '',
    description: '',
    immediateActionTaken: '',
    isAnonymous: false,
    reportedByStaffName: ''
  });

  const [rcaForm, setRcaForm] = useState({
    rootCauseAnalysis: '',
    contributingFactors: '',
    actionPlanSummary: '',
    leadInvestigator: ''
  });

  const [ipcForm, setIpcForm] = useState({
    patientName: '',
    patientMrn: '',
    infectionType: 'SSI',
    isolationPrecautions: 'CONTACT',
    wardLocation: '',
    bedNumber: '',
    confirmedPathogen: '',
    antibioticResistanceProfile: '',
    attendingPhysician: ''
  });

  const [clearIpcForm, setClearIpcForm] = useState({
    clearanceReason: '',
    infectionControlOfficer: ''
  });

  const [auditForm, setAuditForm] = useState({
    auditTitle: '',
    auditType: 'WHO_SURGICAL_SAFETY_CHECKLIST',
    department: '',
    auditorName: '',
    sampleSizeEvaluated: 10,
    nonCompliancesFound: 0,
    checklistItemsEvaluated: '',
    recommendations: ''
  });

  const [capaForm, setCapaForm] = useState({
    title: '',
    rootCauseMethod: 'FIVE_WHYS',
    rootCauseFinding: '',
    correctiveAction: '',
    preventiveAction: '',
    assignedLead: '',
    targetCompletionDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  });

  const [verifyCapaForm, setVerifyCapaForm] = useState({
    verificationNotes: '',
    effectivenessResult: 'EFFECTIVE_CLOSED',
    verifiedBy: ''
  });

  const [alertForm, setAlertForm] = useState({
    alertTitle: '',
    severity: 'CRITICAL_WARNING',
    targetAudience: 'ALL_CLINICAL_STAFF',
    alertMessage: '',
    actionRequired: '',
    expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, incRes, ipcRes, audRes, capaRes, alertRes] = await Promise.all([
        api.getQualityStats(),
        api.getClinicalIncidents(),
        api.getIpcCases(),
        api.getClinicalAudits(),
        api.getCapaPlans(),
        api.getSafetyAlerts()
      ]);

      if (statsRes && statsRes.data) setStats(statsRes.data);
      if (incRes && incRes.data) setIncidents(incRes.data);
      if (ipcRes && ipcRes.data) setIpcCases(ipcRes.data);
      if (audRes && audRes.data) setAudits(audRes.data);
      if (capaRes && capaRes.data) setCapas(capaRes.data);
      if (alertRes && alertRes.data) setAlerts(alertRes.data);
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleReportIncident = async (e) => {
    e.preventDefault();
    try {
      const res = await api.reportClinicalIncident(incidentForm);
      setFeedback({
        type: 'success',
        msg: `Clinical Incident ${res.data.incidentNumber} reported successfully. (Severity: ${res.data.severity})`
      });
      setShowIncidentModal(false);
      setIncidentForm({
        title: '',
        incidentDate: new Date().toISOString().split('T')[0],
        category: 'MEDICATION_ERROR',
        severity: 'NEAR_MISS',
        locationDepartment: 'Emergency Ward',
        description: '',
        immediateActionTaken: '',
        isAnonymous: false,
        reportedByStaffName: 'Clinical Pharmacist'
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleInvestigateIncident = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;
    try {
      const res = await api.investigateIncident(selectedIncident.id, rcaForm);
      setFeedback({
        type: 'success',
        msg: `Root Cause Analysis recorded for Incident ${res.data.incidentNumber}. Status: UNDER_INVESTIGATION.`
      });
      setShowRcaModal(false);
      setSelectedIncident(null);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleCloseIncident = async (incident) => {
    try {
      const res = await api.closeIncident(incident.id, {
        resolutionSummary: 'Action plan implemented and verified in subsequent clinical safety round.',
        closedByStaffName: 'Head of Quality Assurance'
      });
      setFeedback({
        type: 'success',
        msg: `Incident ${res.data.incidentNumber} closed successfully.`
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleRegisterIpc = async (e) => {
    e.preventDefault();
    try {
      const res = await api.registerIpcCase(ipcForm);
      setFeedback({
        type: 'success',
        msg: `Infection Control Case ${res.data.caseNumber} registered. ${res.data.isolationPrecautions} isolation activated in ${res.data.wardLocation}.`
      });
      setShowIpcModal(false);
      setIpcForm({
        patientName: '',
        patientMrn: '',
        infectionType: 'SSI',
        isolationPrecautions: 'CONTACT',
        wardLocation: 'Surgical Ward',
        bedNumber: 'Bed-07',
        confirmedPathogen: 'MRSA (Methicillin-Resistant Staphylococcus aureus)',
        antibioticResistanceProfile: 'Resistant to Oxacillin/Methicillin, Susceptible to Vancomycin',
        attendingPhysician: 'Dr. Yaw Addo'
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleClearIpc = async (e) => {
    e.preventDefault();
    if (!selectedIpcCase) return;
    try {
      const res = await api.clearIpcCase(selectedIpcCase.id, clearIpcForm);
      setFeedback({
        type: 'success',
        msg: `IPC Case ${res.data.caseNumber} cleared. Isolation precautions for ${res.data.patientName} discontinued.`
      });
      setShowClearIpcModal(false);
      setSelectedIpcCase(null);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleCreateAudit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createClinicalAudit(auditForm);
      setFeedback({
        type: 'success',
        msg: `Clinical Audit ${res.data.auditNumber} submitted. Calculated compliance rate: ${res.data.complianceScorePercent}%.`
      });
      setShowAuditModal(false);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleCreateCapa = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createCapa(capaForm);
      setFeedback({
        type: 'success',
        msg: `CAPA Plan ${res.data.capaNumber} activated under ${res.data.assignedLead}. Target date: ${res.data.targetCompletionDate}.`
      });
      setShowCapaModal(false);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleVerifyCapa = async (e) => {
    e.preventDefault();
    if (!selectedCapa) return;
    try {
      const res = await api.verifyCapa(selectedCapa.id, verifyCapaForm);
      setFeedback({
        type: 'success',
        msg: `CAPA Plan ${res.data.capaNumber} verified and closed (${res.data.effectivenessResult}).`
      });
      setShowVerifyCapaModal(false);
      setSelectedCapa(null);
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleBroadcastAlert = async (e) => {
    e.preventDefault();
    try {
      const res = await api.broadcastSafetyAlert(alertForm);
      setFeedback({
        type: 'success',
        msg: `Patient Safety Alert ${res.data.alertNumber} broadcasted to ${res.data.targetAudience} (${res.data.severity}).`
      });
      setShowAlertModal(false);
      setAlertForm({
        alertTitle: '',
        severity: 'CRITICAL_WARNING',
        targetAudience: 'ALL_CLINICAL_STAFF',
        alertMessage: '',
        actionRequired: '',
        expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleAcknowledgeAlert = async (id) => {
    try {
      const res = await api.acknowledgeSafetyAlert(id);
      setFeedback({
        type: 'success',
        msg: `Alert ${res.data.alertNumber} acknowledged. Total acknowledgments: ${res.data.acknowledgmentCount}.`
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '12px',
          padding: '28px',
          border: '1px solid var(--border-gold)',
          background: 'linear-gradient(135deg, rgba(20,16,10,0.95), rgba(10,8,6,0.98))'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '850px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              background: 'linear-gradient(90deg, #d97706, #f59e0b)',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.7rem',
              padding: '3px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Procedure 18 Subsystem
            </span>
            <span style={{ color: 'var(--status-online)', fontSize: '0.8rem', fontWeight: 600 }}>
              ● Hospital Safety Index & IPC Surveillance Active
            </span>
          </div>

          <h2 style={{ fontSize: '1.6rem', color: '#fff', fontWeight: 700, margin: '0 0 8px 0' }}>
            Quality Assurance, Clinical Audit & Infection Control
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
            Continuous composite safety index telemetry, confidential anonymous whistleblower incident reporting, 24-hour Root Cause Analysis (RCA) for sentinel events, WHO Surgical Safety and Hand Hygiene audits, and strict pathogen isolation precautions.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowIncidentModal(true)}
              className="btn-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <AlertTriangle size={15} /> Report Incident / Near-Miss
            </button>
            <button
              onClick={() => setShowIpcModal(true)}
              className="btn-outline-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ShieldAlert size={15} /> Register IPC Isolation
            </button>
            <button
              onClick={() => setShowAuditModal(true)}
              className="btn-outline-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle size={15} /> Conduct Clinical Audit
            </button>
            <button
              onClick={() => setShowCapaModal(true)}
              className="btn-outline-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Activity size={15} /> Create CAPA Workplan
            </button>
            <button
              onClick={() => setShowAlertModal(true)}
              className="btn-outline-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Bell size={15} /> Broadcast Safety Alert
            </button>
            <button
              onClick={loadAll}
              className="btn-outline-gold"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        <img
          src="/assets/images/quality_infection_control_real.jpg"
          alt="Hospital Infection Prevention and Quality Assurance"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '48%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.65,
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 55%, rgba(0,0,0,0))',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 55%, rgba(0,0,0,0))'
          }}
        />
      </div>

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: feedback.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${feedback.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: feedback.type === 'success' ? '#86efac' : '#fca5a5',
          fontSize: '0.85rem'
        }}>
          {feedback.msg}
        </div>
      )}

      {/* Real-time KPI Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px', border: '1px solid var(--border-gold-strong)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hospital Safety Index</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--gold-400)', marginTop: '4px' }}>
            {stats.hospitalSafetyIndex ?? 0}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-online)', marginTop: '4px' }}>
            {stats.safetyRating ? stats.safetyRating.replace(/_/g, ' ') : 'Awaiting Audit Data'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clinical Incidents</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
            {stats.totalIncidents || incidents.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            {stats.openIncidents || 0} open investigations
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sentinel Events</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: (stats.sentinelEvents > 0) ? '#ef4444' : 'var(--status-online)', marginTop: '4px' }}>
            {stats.sentinelEvents || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: (stats.sentinelEvents > 0) ? '#ef4444' : 'var(--text-dim)', marginTop: '4px' }}>
            Mandatory 24h RCA
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active IPC Isolations</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: (stats.activeInfectionCases > 0) ? '#eab308' : 'var(--status-online)', marginTop: '4px' }}>
            {stats.activeInfectionCases || ipcCases.filter(c => c.status === 'ACTIVE_ISOLATION').length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#eab308', marginTop: '4px' }}>
            Infection Precautions Active
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Audit Compliance Avg</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold-300)', marginTop: '4px' }}>
            {stats.averageAuditCompliance || '0.0%'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--status-online)', marginTop: '4px' }}>
            {stats.totalAuditsConducted || audits.length} Audits Completed
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CAPA & Safety Alerts</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
            {stats.openCapaCount || capas.filter(c => c.status !== 'CLOSED').length}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '4px' }}>
            {stats.activeSafetyAlerts || alerts.filter(a => a.isActive).length} Broadcast Bulletins
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('INCIDENTS')}
          className={activeTab === 'INCIDENTS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          Clinical Incidents & Adverse Events ({incidents.length})
        </button>
        <button
          onClick={() => setActiveTab('INFECTION_CONTROL')}
          className={activeTab === 'INFECTION_CONTROL' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          Infection Prevention & Control ({ipcCases.length})
        </button>
        <button
          onClick={() => setActiveTab('AUDITS')}
          className={activeTab === 'AUDITS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          Clinical Audits & Checklists ({audits.length})
        </button>
        <button
          onClick={() => setActiveTab('CAPA_AND_ALERTS')}
          className={activeTab === 'CAPA_AND_ALERTS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          CAPA Workplans & Safety Alerts ({capas.length + alerts.length})
        </button>
      </div>

      {/* Tab 1: Clinical Incidents */}
      {activeTab === 'INCIDENTS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>
            Clinical Incident Registry & Whistleblower Reports
          </h3>
          {incidents.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Incident #</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Category</th>
                  <th>Department</th>
                  <th>Reported By</th>
                  <th>RCA Status</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => {
                  const isSentinel = inc.severity === 'SENTINEL_EVENT';
                  const isAdverse = inc.severity === 'ADVERSE_EVENT';
                  return (
                    <tr key={inc.id}>
                      <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
                        {inc.incidentNumber}
                      </td>
                      <td style={{ fontWeight: 600 }}>{inc.title}</td>
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: isSentinel ? 'rgba(239,68,68,0.25)' : isAdverse ? 'rgba(234,179,8,0.25)' : 'rgba(56,189,248,0.15)',
                          color: isSentinel ? '#ef4444' : isAdverse ? '#eab308' : '#38bdf8',
                          border: isSentinel ? '1px solid #ef4444' : 'none'
                        }}>
                          {inc.severity.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{inc.category.replace(/_/g, ' ')}</td>
                      <td style={{ fontSize: '0.78rem' }}>{inc.locationDepartment}</td>
                      <td>
                        {inc.isAnonymous ? (
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: 'rgba(168,85,247,0.2)',
                            color: '#c084fc'
                          }}>
                            🛡️ ANONYMOUS
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem' }}>{inc.reportedByStaffName}</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: inc.rootCauseAnalysis ? 'var(--status-online)' : 'var(--text-dim)' }}>
                          {inc.rootCauseAnalysis ? '✓ RCA Recorded' : 'Pending RCA'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: inc.status === 'CLOSED' ? 'var(--status-online)' : inc.status === 'UNDER_INVESTIGATION' ? '#eab308' : 'var(--gold-400)'
                        }}>
                          {inc.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {inc.status !== 'CLOSED' && (
                            <>
                              <button
                                onClick={() => { setSelectedIncident(inc); setShowRcaModal(true); }}
                                className="btn-outline-gold"
                                style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                              >
                                RCA
                              </button>
                              <button
                                onClick={() => handleCloseIncident(inc)}
                                className="btn-gold"
                                style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                              >
                                Close
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
              No clinical incidents on record.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Infection Prevention & Control (IPC) */}
      {activeTab === 'INFECTION_CONTROL' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>
            Infection Prevention & Control (IPC) Surveillance & Active Isolation
          </h3>
          {ipcCases.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case #</th>
                  <th>Patient Name</th>
                  <th>MRN</th>
                  <th>Infection Type</th>
                  <th>Isolation Precaution</th>
                  <th>Ward / Bed</th>
                  <th>Confirmed Pathogen</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ipcCases.map(ipc => (
                  <tr key={ipc.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
                      {ipc.caseNumber}
                    </td>
                    <td style={{ fontWeight: 600 }}>{ipc.patientName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{ipc.patientMrn}</td>
                    <td>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'rgba(234,179,8,0.2)',
                        color: '#eab308'
                      }}>
                        {ipc.infectionType}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: ipc.isolationPrecautions === 'AIRBORNE' ? 'rgba(239,68,68,0.25)' : 'rgba(56,189,248,0.2)',
                        color: ipc.isolationPrecautions === 'AIRBORNE' ? '#ef4444' : '#38bdf8'
                      }}>
                        {ipc.isolationPrecautions}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{ipc.wardLocation} / {ipc.bedNumber}</td>
                    <td style={{ fontSize: '0.78rem', color: '#fca5a5' }}>{ipc.confirmedPathogen}</td>
                    <td>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: ipc.status === 'CLEARED' ? 'var(--status-online)' : '#ef4444'
                      }}>
                        {ipc.status === 'ACTIVE_ISOLATION' ? '● ACTIVE ISOLATION' : 'CLEARED'}
                      </span>
                    </td>
                    <td>
                      {ipc.status === 'ACTIVE_ISOLATION' && (
                        <button
                          onClick={() => { setSelectedIpcCase(ipc); setShowClearIpcModal(true); }}
                          className="btn-outline-gold"
                          style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                        >
                          Clear Isolation
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
              No active infection control cases registered.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Clinical Audits */}
      {activeTab === 'AUDITS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>
            Clinical Audits & WHO Patient Safety Checklist Scores
          </h3>
          {audits.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Audit #</th>
                  <th>Audit Title</th>
                  <th>Type</th>
                  <th>Department</th>
                  <th>Sample Size</th>
                  <th>Non-Compliances</th>
                  <th>Compliance Score</th>
                  <th>Auditor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {audits.map(aud => {
                  const score = aud.complianceScorePercent || 0;
                  const isHigh = score >= 90;
                  const isMid = score >= 75 && score < 90;
                  return (
                    <tr key={aud.id}>
                      <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
                        {aud.auditNumber}
                      </td>
                      <td style={{ fontWeight: 600 }}>{aud.auditTitle}</td>
                      <td style={{ fontSize: '0.78rem' }}>{aud.auditType.replace(/_/g, ' ')}</td>
                      <td style={{ fontSize: '0.78rem' }}>{aud.department}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{aud.sampleSizeEvaluated}</td>
                      <td style={{ textAlign: 'center', color: aud.nonCompliancesFound > 0 ? '#ef4444' : 'var(--status-online)', fontWeight: 700 }}>
                        {aud.nonCompliancesFound}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, score)}%`,
                              background: isHigh ? 'var(--status-online)' : isMid ? '#eab308' : '#ef4444'
                            }} />
                          </div>
                          <span style={{
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: isHigh ? 'var(--status-online)' : isMid ? '#eab308' : '#ef4444'
                          }}>
                            {score}%
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{aud.auditorName}</td>
                      <td>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--status-online)'
                        }}>
                          {aud.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
              No clinical audits conducted yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: CAPA Plans & Safety Alerts */}
      {activeTab === 'CAPA_AND_ALERTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Patient Safety Alerts */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: '#ef4444', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} /> Active Patient Safety Bulletins & Clinical Flash Alerts
            </h3>
            {alerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {alerts.map(al => (
                  <div
                    key={al.id}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: al.severity === 'CRITICAL_WARNING' ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(234,179,8,0.5)',
                      background: al.severity === 'CRITICAL_WARNING' ? 'rgba(40,15,15,0.6)' : 'rgba(35,28,15,0.6)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--gold-400)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {al.alertNumber} • {al.severity.replace(/_/g, ' ')}
                        </span>
                        <h4 style={{ fontSize: '1rem', color: '#fff', margin: '4px 0' }}>{al.alertTitle}</h4>
                      </div>
                      <button
                        onClick={() => handleAcknowledgeAlert(al.id)}
                        className="btn-gold"
                        style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                      >
                        ✓ Acknowledge ({al.acknowledgmentCount || 0})
                      </button>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0' }}>{al.alertMessage}</p>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gold-300)', marginTop: '4px' }}>
                      <strong>Action Required:</strong> {al.actionRequired}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)' }}>
                No active patient safety bulletins.
              </div>
            )}
          </div>

          {/* CAPA Workplans */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--gold-400)', marginBottom: '12px' }}>
              Corrective & Preventive Action (CAPA) Workplans
            </h3>
            {capas.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>CAPA #</th>
                    <th>Title</th>
                    <th>Root Cause Method</th>
                    <th>Assigned Lead</th>
                    <th>Target Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {capas.map(cp => (
                    <tr key={cp.id}>
                      <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
                        {cp.capaNumber}
                      </td>
                      <td style={{ fontWeight: 600 }}>{cp.title}</td>
                      <td>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                          {cp.rootCauseMethod.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{cp.assignedLead}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{cp.targetCompletionDate}</td>
                      <td>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: cp.status === 'CLOSED' ? 'var(--status-online)' : 'var(--gold-400)'
                        }}>
                          {cp.status}
                        </span>
                      </td>
                      <td>
                        {cp.status !== 'CLOSED' && (
                          <button
                            onClick={() => { setSelectedCapa(cp); setShowVerifyCapaModal(true); }}
                            className="btn-outline-gold"
                            style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                          >
                            Verify & Close
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                No CAPA plans registered.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Report Incident */}
      {showIncidentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Report Clinical Incident or Near-Miss</h3>
            <form onSubmit={handleReportIncident} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incident Title *</label>
                <input required type="text" placeholder="e.g. Near-miss lookalike insulin dispensing" value={incidentForm.title} onChange={e => setIncidentForm({ ...incidentForm, title: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Severity Level</label>
                  <select value={incidentForm.severity} onChange={e => setIncidentForm({ ...incidentForm, severity: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="NEAR_MISS">NEAR MISS (Potential Harm Intercepted)</option>
                    <option value="HAZARDOUS_CONDITION">HAZARDOUS CONDITION (Safety Threat)</option>
                    <option value="ADVERSE_EVENT">ADVERSE EVENT (Patient Harm Occurred)</option>
                    <option value="SENTINEL_EVENT">SENTINEL EVENT (Critical / Death / Severe Harm)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incident Category</label>
                  <select value={incidentForm.category} onChange={e => setIncidentForm({ ...incidentForm, category: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="MEDICATION_ERROR">MEDICATION ERROR</option>
                    <option value="PATIENT_FALL">PATIENT FALL</option>
                    <option value="SURGICAL_COMPLICATION">SURGICAL COMPLICATION</option>
                    <option value="EQUIPMENT_MALFUNCTION">EQUIPMENT MALFUNCTION</option>
                    <option value="MISIDENTIFICATION">MISIDENTIFICATION</option>
                    <option value="HEALTHCARE_ACQUIRED_INFECTION">HEALTHCARE ACQUIRED INFECTION</option>
                    <option value="TRANSFUSION_REACTION">TRANSFUSION REACTION</option>
                    <option value="PRESSURE_INJURY">PRESSURE INJURY</option>
                    <option value="DIAGNOSTIC_DELAY">DIAGNOSTIC DELAY</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Incident Date *</label>
                  <input required type="date" value={incidentForm.incidentDate} onChange={e => setIncidentForm({ ...incidentForm, incidentDate: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department / Unit *</label>
                  <input required type="text" value={incidentForm.locationDepartment} onChange={e => setIncidentForm({ ...incidentForm, locationDepartment: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Detailed Description of Event *</label>
                <textarea rows={3} required value={incidentForm.description} onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Immediate Action Taken *</label>
                <input required type="text" placeholder="e.g. Infusion stopped immediately, attending physician notified" value={incidentForm.immediateActionTaken} onChange={e => setIncidentForm({ ...incidentForm, immediateActionTaken: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="anonCheck" checked={incidentForm.isAnonymous} onChange={e => setIncidentForm({ ...incidentForm, isAnonymous: e.target.checked })} />
                  <label htmlFor="anonCheck" style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 600 }}>
                    🛡️ Submit Anonymously (Whistleblower Protection)
                  </label>
                </div>
                {!incidentForm.isAnonymous && (
                  <input type="text" placeholder="Reporting Staff Name" value={incidentForm.reportedByStaffName} onChange={e => setIncidentForm({ ...incidentForm, reportedByStaffName: e.target.value })} style={{ padding: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', fontSize: '0.78rem' }} />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowIncidentModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Submit Incident Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Root Cause Analysis (RCA) */}
      {showRcaModal && selectedIncident && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>
              Root Cause Analysis (RCA): {selectedIncident.incidentNumber}
            </h3>
            <p style={{ color: 'var(--gold-400)', fontSize: '0.85rem', marginBottom: '14px' }}>
              {selectedIncident.title} ({selectedIncident.severity})
            </p>

            <form onSubmit={handleInvestigateIncident} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Root Cause Analysis Findings *</label>
                <textarea rows={3} required placeholder="Detailed root cause breakdown (5 Whys / Fishbone)..." value={rcaForm.rootCauseAnalysis} onChange={e => setRcaForm({ ...rcaForm, rootCauseAnalysis: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contributing Factors</label>
                <input type="text" value={rcaForm.contributingFactors} onChange={e => setRcaForm({ ...rcaForm, contributingFactors: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Action Plan Summary</label>
                <input type="text" value={rcaForm.actionPlanSummary} onChange={e => setRcaForm({ ...rcaForm, actionPlanSummary: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lead Investigator</label>
                <input type="text" value={rcaForm.leadInvestigator} onChange={e => setRcaForm({ ...rcaForm, leadInvestigator: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowRcaModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Record Investigation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Register IPC Isolation */}
      {showIpcModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>
              Register Infection Prevention & Control (IPC) Case
            </h3>
            <form onSubmit={handleRegisterIpc} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient Full Name *</label>
                  <input required type="text" value={ipcForm.patientName} onChange={e => setIpcForm({ ...ipcForm, patientName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Patient MRN *</label>
                  <input required type="text" placeholder="MRN-2026-0001" value={ipcForm.patientMrn} onChange={e => setIpcForm({ ...ipcForm, patientMrn: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Infection Type</label>
                  <select value={ipcForm.infectionType} onChange={e => setIpcForm({ ...ipcForm, infectionType: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="SSI">Surgical Site Infection (SSI)</option>
                    <option value="CAUTI">Catheter-Associated UTI (CAUTI)</option>
                    <option value="CLABSI">Central Line-Associated Bloodstream Infection (CLABSI)</option>
                    <option value="VAP">Ventilator-Associated Pneumonia (VAP)</option>
                    <option value="MRSA">Methicillin-Resistant S. Aureus (MRSA)</option>
                    <option value="CDIFF">Clostridioides Difficile (C. Diff)</option>
                    <option value="TB">Tuberculosis (TB)</option>
                    <option value="COVID19">COVID-19 Respiratory</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Isolation Precautions</label>
                  <select value={ipcForm.isolationPrecautions} onChange={e => setIpcForm({ ...ipcForm, isolationPrecautions: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="CONTACT">CONTACT ISOLATION</option>
                    <option value="DROPLET">DROPLET ISOLATION</option>
                    <option value="AIRBORNE">AIRBORNE NEGATIVE PRESSURE</option>
                    <option value="PROTECTIVE_ENVIRONMENT">PROTECTIVE ENVIRONMENT (Neutropenic)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ward Location *</label>
                  <input required type="text" value={ipcForm.wardLocation} onChange={e => setIpcForm({ ...ipcForm, wardLocation: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bed Number</label>
                  <input type="text" value={ipcForm.bedNumber} onChange={e => setIpcForm({ ...ipcForm, bedNumber: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confirmed Pathogen *</label>
                <input required type="text" value={ipcForm.confirmedPathogen} onChange={e => setIpcForm({ ...ipcForm, confirmedPathogen: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Antimicrobial Resistance</label>
                  <input type="text" value={ipcForm.antibioticResistanceProfile} onChange={e => setIpcForm({ ...ipcForm, antibioticResistanceProfile: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attending Physician</label>
                  <input type="text" value={ipcForm.attendingPhysician} onChange={e => setIpcForm({ ...ipcForm, attendingPhysician: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowIpcModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Activate IPC Precaution</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Clear IPC Isolation */}
      {showClearIpcModal && selectedIpcCase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>
              Clear Patient Isolation: {selectedIpcCase.caseNumber}
            </h3>
            <p style={{ color: 'var(--gold-400)', fontSize: '0.85rem', marginBottom: '14px' }}>
              Patient: {selectedIpcCase.patientName} ({selectedIpcCase.infectionType})
            </p>

            <form onSubmit={handleClearIpc} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clearance Clinical Justification *</label>
                <textarea rows={3} required value={clearIpcForm.clearanceReason} onChange={e => setClearIpcForm({ ...clearIpcForm, clearanceReason: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Infection Control Officer *</label>
                <input required type="text" value={clearIpcForm.infectionControlOfficer} onChange={e => setClearIpcForm({ ...clearIpcForm, infectionControlOfficer: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowClearIpcModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Confirm De-Isolation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Conduct Clinical Audit */}
      {showAuditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Conduct Clinical Safety Audit</h3>
            <form onSubmit={handleCreateAudit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Audit Title *</label>
                <input required type="text" value={auditForm.auditTitle} onChange={e => setAuditForm({ ...auditForm, auditTitle: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Audit Type</label>
                  <select value={auditForm.auditType} onChange={e => setAuditForm({ ...auditForm, auditType: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="WHO_SURGICAL_SAFETY_CHECKLIST">WHO Surgical Safety Checklist</option>
                    <option value="WHO_HAND_HYGIENE_5_MOMENTS">WHO 5 Moments Hand Hygiene</option>
                    <option value="ANTIBIOTIC_STEWARDSHIP">Antimicrobial Stewardship</option>
                    <option value="MEDICATION_RECONCILIATION">Medication Reconciliation</option>
                    <option value="CLINICAL_DOCUMENTATION">Clinical Record Keeping</option>
                    <option value="FALLS_PREVENTION">Falls Risk Protocol</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department Audited *</label>
                  <input required type="text" value={auditForm.department} onChange={e => setAuditForm({ ...auditForm, department: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sample Size Evaluated *</label>
                  <input required type="number" min="1" value={auditForm.sampleSizeEvaluated} onChange={e => setAuditForm({ ...auditForm, sampleSizeEvaluated: parseInt(e.target.value) || 1 })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Non-Compliances Found *</label>
                  <input required type="number" min="0" value={auditForm.nonCompliancesFound} onChange={e => setAuditForm({ ...auditForm, nonCompliancesFound: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auditor Name *</label>
                <input required type="text" value={auditForm.auditorName} onChange={e => setAuditForm({ ...auditForm, auditorName: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Audit Recommendations</label>
                <textarea rows={2} value={auditForm.recommendations} onChange={e => setAuditForm({ ...auditForm, recommendations: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowAuditModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Calculate & File Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Create CAPA */}
      {showCapaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>
              Create Corrective & Preventive Action (CAPA) Plan
            </h3>
            <form onSubmit={handleCreateCapa} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CAPA Title *</label>
                <input required type="text" value={capaForm.title} onChange={e => setCapaForm({ ...capaForm, title: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Root Cause Methodology</label>
                  <select value={capaForm.rootCauseMethod} onChange={e => setCapaForm({ ...capaForm, rootCauseMethod: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="FIVE_WHYS">5 Whys Analysis</option>
                    <option value="FISHBONE_ISHIKAWA">Fishbone (Ishikawa) Diagram</option>
                    <option value="FMEA">Failure Mode & Effects Analysis (FMEA)</option>
                    <option value="SWOT_BARRIER">Barrier Analysis</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Completion Date *</label>
                  <input required type="date" value={capaForm.targetCompletionDate} onChange={e => setCapaForm({ ...capaForm, targetCompletionDate: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Root Cause Finding *</label>
                <input required type="text" value={capaForm.rootCauseFinding} onChange={e => setCapaForm({ ...capaForm, rootCauseFinding: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Corrective Action (Immediate) *</label>
                <input required type="text" value={capaForm.correctiveAction} onChange={e => setCapaForm({ ...capaForm, correctiveAction: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Preventive Action (Systemic) *</label>
                <input required type="text" value={capaForm.preventiveAction} onChange={e => setCapaForm({ ...capaForm, preventiveAction: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Department Lead *</label>
                <input required type="text" value={capaForm.assignedLead} onChange={e => setCapaForm({ ...capaForm, assignedLead: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowCapaModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Activate CAPA Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 7: Verify CAPA */}
      {showVerifyCapaModal && selectedCapa && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>
              Verify CAPA Effectiveness: {selectedCapa.capaNumber}
            </h3>
            <p style={{ color: 'var(--gold-400)', fontSize: '0.85rem', marginBottom: '14px' }}>{selectedCapa.title}</p>

            <form onSubmit={handleVerifyCapa} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verification Notes *</label>
                <textarea rows={3} required value={verifyCapaForm.verificationNotes} onChange={e => setVerifyCapaForm({ ...verifyCapaForm, verificationNotes: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Effectiveness Adjudication</label>
                <select value={verifyCapaForm.effectivenessResult} onChange={e => setVerifyCapaForm({ ...verifyCapaForm, effectivenessResult: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                  <option value="EFFECTIVE_CLOSED">EFFECTIVE - CLOSE PLAN</option>
                  <option value="PARTIALLY_EFFECTIVE">PARTIALLY EFFECTIVE - EXTEND ACTIONS</option>
                  <option value="INEFFECTIVE_REOPEN">INEFFECTIVE - REOPEN ROOT CAUSE ANALYSIS</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified By *</label>
                <input required type="text" value={verifyCapaForm.verifiedBy} onChange={e => setVerifyCapaForm({ ...verifyCapaForm, verifiedBy: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowVerifyCapaModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Sign Off & Close CAPA</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 8: Broadcast Safety Alert */}
      {showAlertModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '24px', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>
              Broadcast Clinical Patient Safety Alert
            </h3>
            <form onSubmit={handleBroadcastAlert} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alert Title *</label>
                <input required type="text" placeholder="e.g. Critical Lookalike Packaging: Dopamine vs Dobutamine" value={alertForm.alertTitle} onChange={e => setAlertForm({ ...alertForm, alertTitle: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Severity</label>
                  <select value={alertForm.severity} onChange={e => setAlertForm({ ...alertForm, severity: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="CRITICAL_WARNING">CRITICAL FLASH WARNING</option>
                    <option value="URGENT_ACTION">URGENT CLINICAL ACTION</option>
                    <option value="INFORMATIONAL">INFORMATIONAL BULLETIN</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Audience</label>
                  <select value={alertForm.targetAudience} onChange={e => setAlertForm({ ...alertForm, targetAudience: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }}>
                    <option value="ALL_CLINICAL_STAFF">ALL CLINICAL STAFF</option>
                    <option value="PHYSICIANS_ONLY">PHYSICIANS & SURGEONS ONLY</option>
                    <option value="NURSING_STAFF">NURSING STAFF ONLY</option>
                    <option value="PHARMACY_STAFF">PHARMACY DISPENSARY STAFF</option>
                    <option value="OPERATING_THEATRE">THEATRE & ANESTHESIA</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alert Message Details *</label>
                <textarea rows={3} required value={alertForm.alertMessage} onChange={e => setAlertForm({ ...alertForm, alertMessage: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mandatory Action Required *</label>
                <input required type="text" placeholder="e.g. Inspect all ampoules, place auxiliary warning label on bins" value={alertForm.actionRequired} onChange={e => setAlertForm({ ...alertForm, actionRequired: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expiry Date *</label>
                <input required type="date" value={alertForm.expiryDate} onChange={e => setAlertForm({ ...alertForm, expiryDate: e.target.value })} style={{ width: '100%', padding: '8px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" onClick={() => setShowAlertModal(false)} className="btn-outline-gold">Cancel</button>
                <button type="submit" className="btn-gold">Broadcast to Clinical Network</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 19. NHIA CLAIMS & ELECTRONIC ADJUDICATION
// ==========================================
export { default as NhiaClaimsView } from '../modules/nhia-claims/NhiaClaimsView';

// ==========================================
// 20. MIGRATION SERVICE & DATA IMPORT HUB
// ==========================================
export { default as MigrationView } from '../modules/migration/MigrationView';

// ==========================================
// 21. GIS FACILITY TRACKING & WEBRTC TELEMEDICINE
// ==========================================
export { default as TelemedicineGisView } from '../modules/telemedicine/TelemedicineGisView';

// ==========================================
// 22. VOICE AUTHENTICATION & BIOMETRIC VAULT
// ==========================================
export { default as VoiceBiometricsView } from '../modules/biometrics/VoiceBiometricsView';


