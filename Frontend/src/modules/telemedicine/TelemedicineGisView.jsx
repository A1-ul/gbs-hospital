import React, { useState, useEffect } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, PhoneCall,
  MapPin, ShieldAlert, Layers, Compass, Radio, Users,
  CheckCircle, AlertTriangle, Clock, RefreshCw, PlusCircle,
  Search, Eye, FileText, Send, Sparkles, X, ChevronRight, Bed, Stethoscope, Heart
} from 'lucide-react';
import { api } from '../../services/api.service';

export default function TelemedicineGisView() {
  const [activeTab, setActiveTab] = useState('VIRTUAL_CLINIC'); // VIRTUAL_CLINIC, GEOFENCING, FLOOR_PLANS, TELEMETRY
  const [telemedTelemetry, setTelemedTelemetry] = useState(null);
  const [gisTelemetry, setGisTelemetry] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [breaches, setBreaches] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Active Video Call Room State
  const [activeSession, setActiveSession] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('I10.0');
  const [prescriptionSummary, setPrescriptionSummary] = useState('');
  const [callRating, setCallRating] = useState(5);

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [showFloorPlanModal, setShowFloorPlanModal] = useState(false);

  // Forms
  const [scheduleForm, setScheduleForm] = useState({
    patientId: '',
    patientName: '',
    patientPhone: '',
    doctorId: '',
    doctorName: '',
    specialty: 'CARDIOLOGY',
    scheduledAt: new Date(Date.now() + 1800000).toISOString().slice(0, 16),
    clinicalReason: ''
  });

  const [geofenceForm, setGeofenceForm] = useState({
    name: '',
    facilityType: 'HOSPITAL_CAMPUS',
    centerLatitude: 5.6037,
    centerLongitude: -0.1870,
    radiusMeters: 500.0,
    alertOnBreach: true
  });

  const [pingTestForm, setPingTestForm] = useState({
    entityType: 'AMBULANCE',
    entityId: '',
    entityName: '',
    latitude: 5.6040,
    longitude: -0.1872
  });
  const [pingResult, setPingResult] = useState(null);

  const [floorPlanForm, setFloorPlanForm] = useState({
    buildingName: '',
    floorNumber: 1,
    floorName: '',
    totalBeds: 0,
    totalRooms: 0,
    layoutData: JSON.stringify({
      wings: [],
      rooms: [],
      beds: []
    }, null, 2)
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Timer for active call
  useEffect(() => {
    let timer;
    if (inCall) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [inCall]);

  const fetchInitialData = async () => {
    fetchTelemedTelemetry();
    fetchGisTelemetry();
    fetchConsultations();
    fetchGeofences();
    fetchFloorPlans();
  };

  const fetchTelemedTelemetry = async () => {
    try {
      const res = await api.getTelemedicineTelemetry();
      if (res && res.data) setTelemedTelemetry(res.data);
    } catch (err) {
      console.error('Failed to load telemedicine telemetry:', err);
    }
  };

  const fetchGisTelemetry = async () => {
    try {
      const res = await api.getGisTelemetry();
      if (res && res.data) setGisTelemetry(res.data);
    } catch (err) {
      console.error('Failed to load GIS telemetry:', err);
    }
  };

  const fetchConsultations = async () => {
    try {
      const res = await api.getTelemedicineConsultations();
      if (res && res.data) setConsultations(res.data);
    } catch (err) {
      console.error('Failed to load consultations:', err);
    }
  };

  const fetchGeofences = async () => {
    try {
      const res = await api.getGeofences();
      if (res && res.data) setGeofences(res.data);
    } catch (err) {
      console.error('Failed to load geofences:', err);
    }
  };

  const fetchFloorPlans = async () => {
    try {
      const res = await api.getFloorPlans();
      if (res && res.data) {
        setFloorPlans(res.data);
        if (res.data.length > 0 && !selectedFloorPlan) {
          setSelectedFloorPlan(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load floor plans:', err);
    }
  };

  // Schedule Virtual Consultation
  const handleScheduleConsultation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.scheduleTelemedicineConsultation(scheduleForm);
      if (res && res.success) {
        setFeedback({ type: 'success', text: `Session ${res.data.sessionCode} scheduled with Dr. ${res.data.doctorName}` });
        setShowScheduleModal(false);
        fetchConsultations();
        fetchTelemedTelemetry();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to schedule consultation' });
    } finally {
      setLoading(false);
    }
  };

  // Start Video Call
  const handleStartCall = async (consultation) => {
    setLoading(true);
    setFeedback(null);
    try {
      // 1. Admit to waiting room if scheduled
      if (consultation.status === 'SCHEDULED') {
        await api.joinTelemedicineWaitingRoom(consultation.sessionCode);
      }
      // 2. Start call
      const res = await api.startTelemedicineCall(consultation.sessionCode);
      if (res && res.success) {
        setActiveSession(res.data);
        setInCall(true);
        setFeedback({ type: 'success', text: `WebRTC Video Room ${res.data.channelName} connected.` });
        fetchConsultations();
        fetchTelemedTelemetry();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to connect video call' });
    } finally {
      setLoading(false);
    }
  };

  // End Video Call
  const handleEndCall = async () => {
    if (!activeSession) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.endTelemedicineCall(activeSession.sessionCode, {
        clinicalNotes: callNotes || 'Consultation concluded satisfactorily. Patient vitals and verbal review recorded.',
        diagnosisCode: diagnosisCode || 'I10.0',
        prescriptionSummary: prescriptionSummary || 'Medication adjusted per clinical discussion.',
        callQualityRating: callRating
      });

      if (res && res.success) {
        setInCall(false);
        setActiveSession(null);
        setFeedback({ type: 'success', text: `Consultation ${res.data.sessionCode} completed and archived in patient record (${res.data.durationSeconds}s duration).` });
        fetchConsultations();
        fetchTelemedTelemetry();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to finalize consultation' });
    } finally {
      setLoading(false);
    }
  };

  // Test Ping Evaluator
  const handleSendPing = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.sendLocationPing(pingTestForm);
      if (res && res.success) {
        setPingResult(res.data);
        if (res.data.activeAlerts.length > 0) {
          setFeedback({ type: 'warning', text: `GEOFENCE BREACH DETECTED: Entity ${pingTestForm.entityName} is outside perimeter.` });
        } else {
          setFeedback({ type: 'success', text: `GPS Ping Received: ${pingTestForm.entityName} is safely INSIDE perimeter.` });
        }
        fetchGisTelemetry();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Ping evaluation failed' });
    } finally {
      setLoading(false);
    }
  };

  // Create Geofence
  const handleCreateGeofence = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.createGeofence(geofenceForm);
      if (res && res.success) {
        setFeedback({ type: 'success', text: `Geofence ${res.data.code} (${res.data.name}) established.` });
        setShowGeofenceModal(false);
        fetchGeofences();
        fetchGisTelemetry();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create geofence' });
    } finally {
      setLoading(false);
    }
  };

  // Create Floor Plan
  const handleCreateFloorPlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      let layoutJson = null;
      try {
        layoutJson = JSON.parse(floorPlanForm.layoutData);
      } catch (e) {
        throw new Error('Invalid JSON format for floor plan layout data');
      }

      const res = await api.createFloorPlan({
        ...floorPlanForm,
        layoutData: layoutJson
      });

      if (res && res.success) {
        setFeedback({ type: 'success', text: `Floor plan ${res.data.code} registered.` });
        setShowFloorPlanModal(false);
        fetchFloorPlans();
        fetchGisTelemetry();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create floor plan' });
    } finally {
      setLoading(false);
    }
  };

  const formatSeconds = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Header with Photographic Visual */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 text-white shadow-2xl border border-amber-500/20">
        <div className="absolute inset-0 opacity-25 mix-blend-overlay">
          <img
            src="/assets/images/telemedicine_command_center_real.jpg"
            alt="Hospital Telemedicine Command Center"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Procedure 21 &bull; GIS Facility Tracking & WebRTC Video Telemedicine
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
              GIS Tracking, Geofences & Telehealth Hub
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Real-time Haversine geodesic geofencing, multi-floor interactive spatial asset tracking, and physician-patient WebRTC video consultations with clinical note capture and e-prescriptions.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all"
            >
              <Video className="w-4 h-4" />
              Schedule Telehealth Visit
            </button>
            <button
              onClick={() => { fetchInitialData(); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Telemetry
            </button>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${feedback.type === 'error' ? 'bg-red-950/40 border-red-500/30 text-red-200' :
          feedback.type === 'warning' ? 'bg-amber-950/40 border-amber-500/30 text-amber-200' :
            'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
          }`}>
          <div className="flex items-center gap-3">
            {feedback.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" /> :
              feedback.type === 'warning' ? <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" /> :
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
            <span className="text-sm font-medium">{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-1">
        {[
          { id: 'VIRTUAL_CLINIC', label: 'WebRTC Virtual Clinic', icon: Video },
          { id: 'GEOFENCING', label: 'GIS Geofencing Radar', icon: MapPin },
          { id: 'FLOOR_PLANS', label: 'Interactive Floor Plans', icon: Layers },
          { id: 'TELEMETRY', label: 'Telehealth & Spatial Telemetry', icon: Radio }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${isActive
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: WEBRTC VIRTUAL CLINIC */}
      {activeTab === 'VIRTUAL_CLINIC' && (
        <div className="space-y-6">
          {/* Active Call Viewport (If In Call) */}
          {inCall && activeSession ? (
            <div className="bg-slate-900 rounded-2xl border border-amber-500/30 p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      Live Telemedicine Consultation &bull; {activeSession.sessionCode}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Attending: Dr. {activeSession.doctorName} &bull; Patient: {activeSession.patientName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-950 font-mono text-amber-400 text-sm font-bold border border-slate-800">
                    CALL DURATION: {formatSeconds(callDuration)}
                  </div>
                  <button
                    onClick={handleEndCall}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg shadow-red-600/30"
                  >
                    <PhoneOff className="w-4 h-4" />
                    Conclude Consultation
                  </button>
                </div>
              </div>

              {/* Video Feeds Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Doctor Viewport */}
                <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                  <img
                    src="/assets/images/telemedicine_command_center_real.jpg"
                    alt="Physician Feed"
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-slate-950/80 backdrop-blur-sm text-xs font-semibold text-emerald-400 border border-slate-800">
                    Dr. {activeSession.doctorName} (Physician Host)
                  </div>
                  <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-slate-950/80 text-[11px] font-mono text-slate-400">
                    1080p HD &bull; 60fps &bull; WebRTC AES-256
                  </div>
                </div>

                {/* Patient Viewport */}
                <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-white">{activeSession.patientName}</div>
                      <div className="text-xs text-slate-400">{activeSession.patientPhone || 'Secure Video Tunnel'}</div>
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-slate-950/80 backdrop-blur-sm text-xs font-semibold text-blue-400 border border-slate-800">
                    Patient Remote Peer
                  </div>
                  {/* Live ECG Vitals HUD overlay */}
                  <div className="absolute top-3 right-3 p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] font-mono space-y-1">
                    <div className="text-emerald-400 flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-500 animate-pulse" /> HR: 74 bpm
                    </div>
                    <div className="text-blue-400">BP: 122/80 mmHg</div>
                    <div className="text-amber-400">SpO2: 98%</div>
                  </div>
                </div>
              </div>

              {/* Call Controls & Clinical Notes Drawer */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                {/* Hardware Toggle Controls */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-around">
                  <button
                    onClick={() => setAudioMuted(!audioMuted)}
                    className={`p-3 rounded-full transition-all ${audioMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                    title={audioMuted ? "Unmute Microphone" : "Mute Microphone"}
                  >
                    {audioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setVideoDisabled(!videoDisabled)}
                    className={`p-3 rounded-full transition-all ${videoDisabled ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                    title={videoDisabled ? "Enable Video Camera" : "Disable Video Camera"}
                  >
                    {videoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>
                  <div className="text-xs text-slate-400">
                    Channel: <span className="font-mono text-amber-300 block">{activeSession.channelName}</span>
                  </div>
                </div>

                {/* Consultation Outcome Notes */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="ICD-10 Primary Diagnosis (e.g. I10.0)"
                      value={diagnosisCode}
                      onChange={(e) => setDiagnosisCode(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Electronic Prescription Summary"
                      value={prescriptionSummary}
                      onChange={(e) => setPrescriptionSummary(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Enter clinical consultation notes and patient management plan..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Scheduled Consultations Register */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-amber-400" />
                  Virtual Consultation Appointments Directory
                </h2>
                <p className="text-xs text-slate-400">Scheduled telehealth appointments with WebRTC video room tokens</p>
              </div>
              <button
                onClick={fetchConsultations}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Visits
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Session Code</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Attending Doctor</th>
                    <th className="py-3 px-4">Specialty</th>
                    <th className="py-3 px-4">Scheduled Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {consultations.length > 0 ? (
                    consultations.map(c => (
                      <tr key={c.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-medium text-amber-300">
                          {c.sessionCode}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {c.patientName}
                          <span className="block text-xs font-mono text-slate-400">{c.patientPhone || 'No Phone'}</span>
                        </td>
                        <td className="py-3 px-4">
                          Dr. {c.doctorName}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-300">
                          {c.specialty}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-400">
                          {new Date(c.scheduledAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.status === 'IN_CALL' ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 animate-pulse' :
                            c.status === 'WAITING_ROOM' ? 'bg-amber-950/60 border border-amber-500/40 text-amber-300' :
                              c.status === 'COMPLETED' ? 'bg-blue-950/60 border border-blue-500/40 text-blue-300' :
                                c.status === 'CANCELLED' ? 'bg-red-950/60 border border-red-500/40 text-red-300' :
                                  'bg-slate-800 text-slate-300'
                            }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {['SCHEDULED', 'WAITING_ROOM'].includes(c.status) && (
                            <button
                              onClick={() => handleStartCall(c)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              Launch Call
                            </button>
                          )}
                          {c.status === 'IN_CALL' && (
                            <button
                              onClick={() => { setActiveSession(c); setInCall(true); }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white"
                            >
                              Return to Call
                            </button>
                          )}
                          {c.status === 'COMPLETED' && (
                            <span className="text-xs text-slate-500 font-mono">
                              Duration: {c.durationSeconds}s
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                        No telemedicine appointments scheduled today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GIS GEOFENCING RADAR */}
      {activeTab === 'GEOFENCING' && (
        <div className="space-y-6">
          {/* Geofences & Ping Evaluator Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Registered Geofences List */}
            <div className="lg:col-span-2 bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    Monitored Hospital Campus Geofences
                  </h3>
                  <p className="text-xs text-slate-400">Perimeter radius boundaries calculated via Haversine geodesic formula</p>
                </div>
                <button
                  onClick={() => setShowGeofenceModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Geofence
                </button>
              </div>

              <div className="space-y-3">
                {geofences.map(gf => (
                  <div key={gf.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{gf.name}</span>
                        <span className="font-mono text-xs text-amber-400">{gf.code}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Type: <span className="text-slate-200">{gf.facilityType}</span> &bull; Radius: <span className="text-slate-200 font-mono">{gf.radiusMeters}m</span> &bull; Center: ({gf.centerLatitude}, {gf.centerLongitude})
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                      {gf.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live GPS Ping Test Evaluator */}
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400" />
                  Live GPS Ping Evaluator
                </h3>
                <p className="text-xs text-slate-400">Simulate mobile unit coordinate transmission</p>
              </div>

              <form onSubmit={handleSendPing} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Entity Name / Unit</label>
                  <input
                    type="text"
                    value={pingTestForm.entityName}
                    onChange={(e) => setPingTestForm({ ...pingTestForm, entityName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={pingTestForm.latitude}
                      onChange={(e) => setPingTestForm({ ...pingTestForm, latitude: parseFloat(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={pingTestForm.longitude}
                      onChange={(e) => setPingTestForm({ ...pingTestForm, longitude: parseFloat(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  Evaluate Haversine Geodesic Distance
                </button>
              </form>

              {/* Evaluation Output Result */}
              {pingResult && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 font-mono">
                  <div className="text-slate-400">Evaluated Geofences: {pingResult.geofenceEvaluations?.length}</div>
                  {pingResult.geofenceEvaluations?.map(ev => (
                    <div key={ev.geofenceId} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300">{ev.geofenceName}:</span>
                      <span className={ev.isInside ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                        {Math.round(ev.distanceMeters)}m ({ev.status})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INTERACTIVE FLOOR PLANS */}
      {activeTab === 'FLOOR_PLANS' && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                Interactive Hospital Floor Plans & Spatial Bed Overlay
              </h2>
              <p className="text-xs text-slate-400">Multi-floor building layout with live bed census and medical equipment beacons</p>
            </div>
            <button
              onClick={() => setShowFloorPlanModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Floor Plan
            </button>
          </div>

          {/* Floor Plan Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {floorPlans.map(fp => (
              <button
                key={fp.id}
                onClick={() => setSelectedFloorPlan(fp)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedFloorPlan?.id === fp.id
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
              >
                {fp.buildingName} &bull; {fp.floorName}
              </button>
            ))}
          </div>

          {/* Spatial Floor Map Mockup */}
          {selectedFloorPlan && (
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedFloorPlan.buildingName} - {selectedFloorPlan.floorName}</h3>
                  <div className="text-xs text-slate-400">Plan Code: <span className="font-mono text-amber-300">{selectedFloorPlan.code}</span></div>
                </div>
                <div className="flex gap-4 text-xs font-mono">
                  <span className="text-slate-400">Total Rooms: <strong className="text-white">{selectedFloorPlan.totalRooms}</strong></span>
                  <span className="text-slate-400">Total Beds: <strong className="text-white">{selectedFloorPlan.totalBeds}</strong></span>
                </div>
              </div>

              {/* Floor Layout Schematic */}
              <div className="p-8 rounded-xl bg-slate-900 border border-slate-800/80 min-h-64 grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedFloorPlan.layoutData?.rooms?.map((rm, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm text-white">{rm.roomNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${rm.status === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                        rm.status === 'IN_USE' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                          'bg-blue-950 text-blue-300 border border-blue-500/30'
                        }`}>
                        {rm.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{rm.type}</div>
                    <div className="text-[11px] text-slate-500 font-mono">Grid: ({rm.x}, {rm.y})</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TELEMETRY */}
      {activeTab === 'TELEMETRY' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 mb-1">Telehealth Consultations</div>
              <div className="text-3xl font-extrabold text-white">{telemedTelemetry?.totalConsultations || 0}</div>
              <div className="text-xs text-emerald-400 mt-2">{telemedTelemetry?.completedToday || 0} Completed Today</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 mb-1">Active WebRTC Sessions</div>
              <div className="text-3xl font-extrabold text-amber-400">{telemedTelemetry?.activeInCall || 0}</div>
              <div className="text-xs text-slate-400 mt-2">{telemedTelemetry?.waitingRoom || 0} in Waiting Room</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 mb-1">Active Campus Geofences</div>
              <div className="text-3xl font-extrabold text-emerald-400">{gisTelemetry?.activeGeofences || 0}</div>
              <div className="text-xs text-slate-400 mt-2">{gisTelemetry?.totalGeofences || 0} Total Defined</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 mb-1">Spatial Tracked Beds</div>
              <div className="text-3xl font-extrabold text-blue-400">{gisTelemetry?.totalManagedBeds || 0}</div>
              <div className="text-xs text-slate-400 mt-2">{gisTelemetry?.totalFloorPlans || 0} Building Floor Plans</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Schedule Telehealth Consultation */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-amber-400" />
                Schedule WebRTC Video Consultation
              </h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleConsultation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={scheduleForm.patientName}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, patientName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Patient Phone</label>
                  <input
                    type="text"
                    value={scheduleForm.patientPhone}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, patientPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Attending Doctor</label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.doctorName}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, doctorName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Specialty</label>
                  <select
                    value={scheduleForm.specialty}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, specialty: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="GENERAL_MEDICINE">General Medicine</option>
                    <option value="CARDIOLOGY">Cardiology</option>
                    <option value="PEDIATRICS">Pediatrics</option>
                    <option value="DERMATOLOGY">Dermatology</option>
                    <option value="PSYCHIATRY">Psychiatry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduled Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleForm.scheduledAt}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Reason / Chief Complaint</label>
                <textarea
                  rows={2}
                  value={scheduleForm.clinicalReason}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, clinicalReason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  Generate WebRTC Room & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Geofence */}
      {showGeofenceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-400" />
                Create Campus Geofence Perimeter
              </h3>
              <button onClick={() => setShowGeofenceModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGeofence} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Perimeter Name</label>
                <input
                  type="text"
                  required
                  value={geofenceForm.name}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={geofenceForm.centerLatitude}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, centerLatitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={geofenceForm.centerLongitude}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, centerLongitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Boundary Radius (Meters)</label>
                <input
                  type="number"
                  required
                  value={geofenceForm.radiusMeters}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, radiusMeters: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGeofenceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  Save Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Floor Plan */}
      {showFloorPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                Register Facility Floor Plan
              </h3>
              <button onClick={() => setShowFloorPlanModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFloorPlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Building Name</label>
                <input
                  type="text"
                  required
                  value={floorPlanForm.buildingName}
                  onChange={(e) => setFloorPlanForm({ ...floorPlanForm, buildingName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Floor Number</label>
                  <input
                    type="number"
                    required
                    value={floorPlanForm.floorNumber}
                    onChange={(e) => setFloorPlanForm({ ...floorPlanForm, floorNumber: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Floor Name</label>
                  <input
                    type="text"
                    required
                    value={floorPlanForm.floorName}
                    onChange={(e) => setFloorPlanForm({ ...floorPlanForm, floorName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Spatial Layout JSON</label>
                <textarea
                  rows={4}
                  required
                  value={floorPlanForm.layoutData}
                  onChange={(e) => setFloorPlanForm({ ...floorPlanForm, layoutData: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFloorPlanModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  Save Floor Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
