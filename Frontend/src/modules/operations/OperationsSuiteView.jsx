import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.service';
import { Video, Phone, FileText, Wrench, PlusCircle, RefreshCw, RotateCcw, Send, Archive, Eye } from 'lucide-react';

export default function OperationsSuiteView({ onNavigateDetail, onOpenLiveMediaRoom }) {
  const openDetail = (payload) => {
    const fn = onNavigateDetail || (typeof window !== 'undefined' ? window.gbsNavigateDetail : null);
    if (typeof fn === 'function') fn(payload);
  };
  const openLiveCameraRoom = (session) => {
    const fn = onOpenLiveMediaRoom || (typeof window !== 'undefined' ? window.gbsOpenLiveMediaRoom : null);
    if (typeof fn === 'function') fn(session);
  };
  const [tab, setTab] = useState('MEETINGS'); // MEETINGS | DOCUMENTS | FACILITY
  const [meetings, setMeetings] = useState([]);
  const [meetingTel, setMeetingTel] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    meetingType: 'CLINICAL_BOARD',
    department: 'Medical Administration',
    agenda: ''
  });

  const [documents, setDocuments] = useState([]);
  const [docTel, setDocTel] = useState(null);
  const [showDeletedDocs, setShowDeletedDocs] = useState(false);
  const [docForm, setDocForm] = useState({
    title: '',
    category: 'MEDICAL_RECORD',
    fileName: '',
    retentionYears: 7,
    contentNotes: ''
  });

  const [tasks, setTasks] = useState([]);
  const [facTel, setFacTel] = useState(null);
  const [facForm, setFacForm] = useState({
    category: 'HOUSEKEEPING',
    title: '',
    location: '',
    priority: 'NORMAL',
    assignedToName: '',
    utilityMetricValue: '',
    utilityMetricUnit: ''
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadAll = async () => {
    try {
      const [mTel, mList, dTel, dList, fTel, fList] = await Promise.all([
        api.getMeetingTelemetry().catch(() => null),
        api.getMeetings().catch(() => ({ meetings: [] })),
        api.getDocumentTelemetry().catch(() => null),
        api.getDocuments(showDeletedDocs ? 'includeDeleted=true' : '').catch(() => ({ documents: [] })),
        api.getFacilityTelemetry().catch(() => null),
        api.getFacilityTasks().catch(() => ({ tasks: [] }))
      ]);
      setMeetingTel(mTel);
      setMeetings(mList?.meetings || []);
      setDocTel(dTel);
      setDocuments(dList?.documents || []);
      setFacTel(fTel);
      setTasks(fList?.tasks || []);
    } catch (_e) { }
  };

  useEffect(() => {
    loadAll();
  }, [showDeletedDocs]);

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.scheduleMeeting(meetingForm);
      setFeedback({ type: 'success', msg: `Online meeting scheduled: ${res.meetingCode} (Room Token: ${res.roomToken}).` });
      setMeetingForm({ title: '', meetingType: 'CLINICAL_BOARD', department: 'Medical Administration', agenda: '' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async (meetingOrId, callMode = 'VIDEO') => {
    const targetId = typeof meetingOrId === 'object' ? (meetingOrId.meetingCode || meetingOrId.id) : meetingOrId;
    const meetingTitle = typeof meetingOrId === 'object' ? meetingOrId.title : '';
    try {
      let roomPayload = null;
      try {
        const commRes = await api.joinCommunicationRoom(targetId, { callMode });
        roomPayload = {
          ...(commRes?.room || {}),
          ...(commRes?.webrtcSession || {}),
          roomCode: commRes?.webrtcSession?.roomCode || commRes?.room?.roomCode || targetId,
          callMode,
          kind: 'CONFERENCE',
          roomTitle: commRes?.room?.title || meetingTitle || `Conference ${targetId}`,
        };
      } catch (_fallbackErr) {
        const res = await api.joinMeeting(targetId);
        roomPayload = {
          ...(res?.meeting || {}),
          ...(res?.webrtcSession || {}),
          roomCode: res?.webrtcSession?.roomCode || targetId,
          callMode,
          kind: 'CONFERENCE',
          roomTitle: res?.meeting?.title || meetingTitle || `Conference ${targetId}`,
        };
      }
      setActiveRoom(roomPayload);
      openLiveCameraRoom(roomPayload);
      setFeedback({
        type: 'success',
        msg: `Joined live camera conference room ${roomPayload.roomCode} (${callMode === 'VOICE' ? 'Voice Mode' : 'Live Camera + Audio'}).`,
      });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleEndMeeting = async (id) => {
    try {
      await api.endMeeting(id, { minutesSummary: 'Clinical board action items documented and closed.' });
      setActiveRoom(null);
      setFeedback({ type: 'success', msg: 'Meeting concluded and minutes archived.' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createDocument(docForm);
      setFeedback({ type: 'success', msg: `Document ${res.documentCode} stored (v1, SHA-256 verified, ${res.retentionYears}-year retention).` });
      setDocForm({ title: '', category: 'MEDICAL_RECORD', fileName: '', retentionYears: 7, contentNotes: '' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFacilityTask = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createFacilityTask(facForm);
      setFeedback({ type: 'success', msg: `Facility task ${res.taskCode} created (${res.category} — ${res.location}).` });
      setFacForm({ category: 'HOUSEKEEPING', title: '', location: '', priority: 'NORMAL', assignedToName: '', utilityMetricValue: '', utilityMetricUnit: '' });
      loadAll();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Hero Banner */}
      <div className="glass-panel" style={{ position: 'relative', height: '200px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '24px' }}>
        <img
          src={tab === 'DOCUMENTS' ? '/assets/images/medical_records_archive_real.jpg' : '/assets/images/hospital_admin_office_real.jpg'}
          alt="Hospital Operations — Meetings, Documents & Facility"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(6,12,24,0.96) 15%, rgba(6,12,24,0.35) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--gold-300)', fontWeight: 700, textTransform: 'uppercase' }}>
              Master Blueprint Enterprise Operations Suite
            </span>
            <h2 className="header-3d" style={{ fontSize: '1.5rem', margin: '2px 0' }}>
              Online Meetings, Document Versioning &amp; Facility Management
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Schedule &amp; join clinical board video meetings, manage versioned/retention-protected hospital documents, and track housekeeping &amp; utilities.
            </p>
          </div>
          <button type="button" onClick={loadAll} className="btn-outline-gold" style={{ fontSize: '0.78rem' }}>
            <RefreshCw size={14} /> Refresh Operations
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="dashboard-tab-bar">
        <button type="button" onClick={() => setTab('MEETINGS')} className={`dashboard-tab-pill ${tab === 'MEETINGS' ? 'active' : ''}`}>
          <Video size={15} /> Online Meetings <span className="dashboard-tab-badge">{meetingTel?.total ?? meetings.length}</span>
        </button>
        <button type="button" onClick={() => setTab('DOCUMENTS')} className={`dashboard-tab-pill ${tab === 'DOCUMENTS' ? 'active' : ''}`}>
          <FileText size={15} /> Document Management &amp; Recovery <span className="dashboard-tab-badge">{docTel?.totalActive ?? documents.length}</span>
        </button>
        <button type="button" onClick={() => setTab('FACILITY')} className={`dashboard-tab-pill ${tab === 'FACILITY' ? 'active' : ''}`}>
          <Wrench size={15} /> Facility, Housekeeping &amp; Utilities <span className="dashboard-tab-badge">{facTel?.openTasks ?? tasks.length}</span>
        </button>
      </div>

      {feedback && (
        <div className="glass-panel" style={{ padding: '12px 16px', borderLeft: `4px solid ${feedback.type === 'error' ? '#ef4444' : '#10b981'}`, color: feedback.type === 'error' ? '#fca5a5' : '#6ee7b7', fontSize: '0.84rem' }}>
          {feedback.msg}
        </div>
      )}

      {/* TAB 1: ONLINE MEETINGS */}
      {tab === 'MEETINGS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeRoom && (
            <div className="glass-panel" style={{ padding: '16px 20px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <strong style={{ color: '#6ee7b7' }}>LIVE MEETING CONNECTED — Room {activeRoom.roomCode}</strong>
                  <div style={{ fontSize: '0.78rem', color: '#e5e7eb' }}>
                    Token: <span style={{ fontFamily: 'var(--font-mono)' }}>{activeRoom.roomToken}</span> • Participant: {activeRoom.joinedAs} • Screen Share: {activeRoom.screenShareEnabled ? 'Ready' : 'Off'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => openLiveCameraRoom(activeRoom)}
                    className="btn-gold"
                    style={{ padding: '5px 12px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Video size={13} /> Open Live Camera View
                  </button>
                  <button type="button" onClick={() => handleEndMeeting(activeRoom.roomCode)} className="btn-danger" style={{ padding: '5px 12px', fontSize: '0.76rem' }}>
                    End Meeting &amp; Save Minutes
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="glass-panel" style={{ padding: '18px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.98rem', color: 'var(--gold-400)' }}>Schedule Online Hospital Meeting</h3>
            <form onSubmit={handleScheduleMeeting} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', alignItems: 'end' }}>
              <input required type="text" placeholder="Meeting Title (e.g. Morning Clinical Grand Rounds) *" value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} />
              <select value={meetingForm.meetingType} onChange={(e) => setMeetingForm({ ...meetingForm, meetingType: e.target.value })}>
                <option value="CLINICAL_BOARD">Clinical Board Review</option>
                <option value="MULTIDISCIPLINARY_TUMOR_BOARD">Multidisciplinary Case Conference</option>
                <option value="DEPARTMENT_BRIEFING">Department Shift Briefing</option>
                <option value="EXECUTIVE_REVIEW">Executive Management Review</option>
              </select>
              <input type="text" placeholder="Department" value={meetingForm.department} onChange={(e) => setMeetingForm({ ...meetingForm, department: e.target.value })} />
              <input type="text" placeholder="Agenda Summary" value={meetingForm.agenda} onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })} />
              <button type="submit" disabled={loading} className="btn-gold">
                <PlusCircle size={15} /> Schedule Meeting
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.96rem', color: 'var(--gold-400)' }}>Meetings &amp; History ({meetings.length})</h3>
            <table className="data-table">
              <thead>
                <tr><th>Code</th><th>Title</th><th>Department</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {meetings.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                      No online hospital meetings scheduled yet.
                    </td>
                  </tr>
                ) : (
                  meetings.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>{m.meetingCode}</td>
                      <td style={{ fontWeight: 700 }}>{m.title}</td>
                      <td>{m.department}</td>
                      <td><span className={m.status === 'LIVE' ? 'badge badge-success' : 'badge badge-gold'}>{m.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() =>
                              openDetail({
                                detailType: 'VIEW_DETAILS',
                                moduleKey: 'OPERATIONS_HUB',
                                recordId: String(m.meetingCode || m.id),
                                title: `Clinical Meeting: ${m.title}`,
                                recordData: m
                              })
                            }
                            className="btn-outline-gold"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={11} /> Details
                          </button>
                          {m.status !== 'COMPLETED' && m.status !== 'CANCELLED' && (
                            <>
                              <button type="button" onClick={() => handleJoinMeeting(m, 'VIDEO')} className="btn-gold" style={{ padding: '3px 9px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Video size={11} /> Join Camera
                              </button>
                              <button type="button" onClick={() => handleJoinMeeting(m, 'VOICE')} className="btn-outline-gold" style={{ padding: '3px 9px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={11} /> Voice
                              </button>
                            </>
                          )}
                          {m.status === 'LIVE' && (
                            <button type="button" onClick={() => handleEndMeeting(m.id)} className="btn-outline-gold" style={{ padding: '3px 9px', fontSize: '0.72rem' }}>
                              End
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
      )}

      {/* TAB 2: DOCUMENT MANAGEMENT */}
      {tab === 'DOCUMENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '18px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.98rem', color: 'var(--gold-400)' }}>Store Protected Hospital Document (Versioning &amp; Retention Policy)</h3>
            <form onSubmit={handleCreateDocument} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', alignItems: 'end' }}>
              <input required type="text" placeholder="Document Title *" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} />
              <input required type="text" placeholder="File Name (e.g. discharge_summary.pdf) *" value={docForm.fileName} onChange={(e) => setDocForm({ ...docForm, fileName: e.target.value })} />
              <select value={docForm.category} onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}>
                <option value="MEDICAL_RECORD">Medical Record</option>
                <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                <option value="CONSENT_FORM">Surgical Consent Form</option>
                <option value="LAB_REPORT">Lab Report Archive</option>
                <option value="POLICY">Hospital Compliance Policy</option>
              </select>
              <input type="number" min={1} max={50} placeholder="Retention Years" value={docForm.retentionYears} onChange={(e) => setDocForm({ ...docForm, retentionYears: e.target.value })} />
              <button type="submit" disabled={loading} className="btn-gold">
                <PlusCircle size={15} /> Store Document
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '0.96rem', color: 'var(--gold-400)' }}>Document Vault &amp; Point-in-Time Recovery ({documents.length})</h3>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={showDeletedDocs} onChange={(e) => setShowDeletedDocs(e.target.checked)} />
                Show Soft-Archived Documents (Recoverable)
              </label>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Code</th><th>Title / File</th><th>Version</th><th>Retention</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                      No hospital documents stored yet.
                    </td>
                  </tr>
                ) : (
                  documents.map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>{d.documentCode}</td>
                      <td><strong>{d.title}</strong><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{d.fileName}</div></td>
                      <td><span className="badge badge-cyan">v{d.versionNumber}</span></td>
                      <td style={{ fontSize: '0.74rem' }}>{d.retentionYears} yrs</td>
                      <td><span className={d.isDeleted ? 'badge badge-danger' : 'badge badge-success'}>{d.isDeleted ? 'ARCHIVED (RECOVERABLE)' : d.deliveryStatus}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() =>
                              openDetail({
                                detailType: 'VIEW_DETAILS',
                                moduleKey: 'OPERATIONS_HUB',
                                recordId: String(d.documentCode || d.id),
                                title: `Hospital Document: ${d.title}`,
                                recordData: d
                              })
                            }
                            className="btn-outline-gold"
                            style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={11} /> Details
                          </button>
                          {!d.isDeleted ? (
                            <>
                              <button type="button" onClick={async () => { await api.createDocumentVersion(d.id, { contentNotes: 'Updated revision' }); loadAll(); }} className="btn-outline-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>+ v{d.versionNumber + 1}</button>
                              <button type="button" onClick={async () => { await api.deliverDocument(d.id, { deliveredTo: 'Medical Records & Ward Desk' }); loadAll(); }} className="btn-outline-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}><Send size={11} /> Deliver</button>
                              <button type="button" onClick={async () => { await api.archiveDocument(d.id); loadAll(); }} className="btn-outline-gold" style={{ padding: '3px 8px', fontSize: '0.7rem', borderColor: '#f59e0b', color: '#fcd34d' }}><Archive size={11} /> Archive</button>
                            </>
                          ) : (
                            <button type="button" onClick={async () => { await api.restoreDocument(d.id); loadAll(); }} className="btn-gold" style={{ padding: '3px 8px', fontSize: '0.7rem' }}><RotateCcw size={11} /> Restore</button>
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
      )}

      {/* TAB 3: FACILITY MANAGEMENT */}
      {tab === 'FACILITY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '18px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.98rem', color: 'var(--gold-400)' }}>Log Housekeeping, Utilities (Power/Oxygen/Water) or Maintenance Task</h3>
            <form onSubmit={handleCreateFacilityTask} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
              <select value={facForm.category} onChange={(e) => setFacForm({ ...facForm, category: e.target.value })}>
                <option value="HOUSEKEEPING">Housekeeping &amp; Sanitization</option>
                <option value="UTILITIES">Utilities (Power / Oxygen / Water)</option>
                <option value="MAINTENANCE">Building &amp; HVAC Maintenance</option>
                <option value="ASSET_INSPECTION">Facility Asset Inspection</option>
              </select>
              <input required type="text" placeholder="Task Title (e.g. Ward B Terminal Disinfection) *" value={facForm.title} onChange={(e) => setFacForm({ ...facForm, title: e.target.value })} />
              <input required type="text" placeholder="Location (e.g. Ward B - Room 204 / Oxygen Plant) *" value={facForm.location} onChange={(e) => setFacForm({ ...facForm, location: e.target.value })} />
              <select value={facForm.priority} onChange={(e) => setFacForm({ ...facForm, priority: e.target.value })}>
                <option value="LOW">LOW</option>
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
              <button type="submit" disabled={loading} className="btn-gold">
                <PlusCircle size={15} /> Log Task
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '18px', overflowX: 'auto' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.96rem', color: 'var(--gold-400)' }}>Hospital Facility &amp; Utilities Operations Board ({tasks.length})</h3>
            <table className="data-table">
              <thead>
                <tr><th>Code</th><th>Category</th><th>Task</th><th>Location</th><th>Priority</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                      No facility or utilities tasks logged yet.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-300)' }}>{t.taskCode}</td>
                      <td><span className="badge badge-cyan">{t.category}</span></td>
                      <td style={{ fontWeight: 700 }}>{t.title}</td>
                      <td>{t.location}</td>
                      <td><span className={t.priority === 'URGENT' || t.priority === 'HIGH' ? 'badge badge-danger' : 'badge badge-gold'}>{t.priority}</span></td>
                      <td><span className={t.status === 'COMPLETED' ? 'badge badge-success' : 'badge badge-warning'}>{t.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() =>
                              openDetail({
                                detailType: 'VIEW_DETAILS',
                                moduleKey: 'OPERATIONS_HUB',
                                recordId: String(t.taskCode || t.id),
                                title: `Facility Task: ${t.title}`,
                                recordData: t
                              })
                            }
                            className="btn-outline-gold"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={11} /> Details
                          </button>
                          {t.status !== 'COMPLETED' && (
                            <button type="button" onClick={async () => { await api.updateFacilityTaskStatus(t.id, { status: 'COMPLETED' }); loadAll(); }} className="btn-gold" style={{ padding: '3px 9px', fontSize: '0.72rem' }}>
                              Mark Completed
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
      )}
    </div>
  );
}
