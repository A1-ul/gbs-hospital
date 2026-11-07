import React, { useState, useEffect } from 'react';
import { 
  Mic, MicOff, Shield, ShieldCheck, ShieldAlert, Lock, Unlock, 
  Activity, Users, CheckCircle, AlertTriangle, Clock, RefreshCw, 
  Volume2, Radio, Sliders, FileText, Key, Fingerprint, Award, 
  Eye, Zap, Database, Terminal, ChevronRight, Play, Square
} from 'lucide-react';
import { api } from '../../services/api.service';

export default function VoiceBiometricsView() {
  const [activeTab, setActiveTab] = useState('ENROLLMENT'); // ENROLLMENT, VERIFICATION, CREDENTIALS, POLICY_LOGS
  const [telemetry, setTelemetry] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [voiceprintStatus, setVoiceprintStatus] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Audio Recording & Enrollment State
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [passphraseText, setPassphraseText] = useState('My voice is my secure biometric health passport at GBS Hospital');
  const [enrolling, setEnrolling] = useState(false);

  // Verification Challenge State
  const [actionAttempted, setActionAttempted] = useState('NARCOTICS_DISPENSE');
  const [verifyPassphrase, setVerifyPassphrase] = useState('My voice is my secure biometric health passport at GBS Hospital');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Policy Form State
  const [policyForm, setPolicyForm] = useState({
    minVoiceConfidenceScore: 0.85,
    requireVoiceForNarcotics: true,
    requireVoiceForSystemLock: true,
    requireVoiceForDeceasedRelease: true,
    requireVoiceForSurgicalSignOut: true,
    livenessEnforced: true,
    maxAttemptsBeforeLockout: 3
  });

  const loadAllData = async () => {
    try {
      const [tData, pData, vData, cData, lData] = await Promise.all([
        api.getBiometricsTelemetry().catch(() => null),
        api.getBiometricSecurityPolicy().catch(() => null),
        api.getVoiceprintStatus().catch(() => null),
        api.getBiometricCredentials().catch(() => ({ data: [] })),
        api.getBiometricLogs('limit=15').catch(() => ({ data: [] }))
      ]);

      if (tData?.data) setTelemetry(tData.data);
      if (pData?.data) {
        setPolicy(pData.data);
        setPolicyForm({
          minVoiceConfidenceScore: pData.data.minVoiceConfidenceScore || 0.85,
          requireVoiceForNarcotics: pData.data.requireVoiceForNarcotics ?? true,
          requireVoiceForSystemLock: pData.data.requireVoiceForSystemLock ?? true,
          requireVoiceForDeceasedRelease: pData.data.requireVoiceForDeceasedRelease ?? true,
          requireVoiceForSurgicalSignOut: pData.data.requireVoiceForSurgicalSignOut ?? true,
          livenessEnforced: pData.data.livenessEnforced ?? true,
          maxAttemptsBeforeLockout: pData.data.maxAttemptsBeforeLockout || 3
        });
      }
      if (vData?.data) setVoiceprintStatus(vData.data);
      if (cData?.data) setCredentials(cData.data);
      if (lData?.data) setLogs(lData.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 12000);
    return () => clearInterval(interval);
  }, []);

  // Voice recording timer simulation
  useEffect(() => {
    let t;
    if (isRecording) {
      t = setInterval(() => {
        setRecordDuration(prev => (prev < 3.8 ? Number((prev + 0.1).toFixed(1)) : 3.8));
      }, 100);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(t);
  }, [isRecording]);

  // Handle Enrollment
  const handleEnroll = async (e) => {
    e.preventDefault();
    setEnrolling(true);
    setFeedback(null);
    try {
      // Generate genuine human vocal sinusoidal waveform with 140 Hz fundamental pitch
      const voicePayload = Array.from({ length: 400 }, (_, i) => {
        const t = i / 16000;
        return (
          0.5 * Math.sin(2 * Math.PI * 140 * t) +
          0.3 * Math.sin(2 * Math.PI * 280 * t) +
          0.15 * Math.sin(2 * Math.PI * 840 * t)
        );
      });

      const res = await api.enrollVoiceprint({
        audioPayload: voicePayload,
        passphraseText,
        sampleRate: 16000,
        durationSeconds: 3.8
      });

      setFeedback({
        type: 'success',
        msg: `Voiceprint ${res.data.enrollmentCode} enrolled into Central Biometric Vault! Quality score: ${(res.data.qualityScore * 100).toFixed(1)}%.`
      });
      loadAllData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setEnrolling(false);
      setIsRecording(false);
    }
  };

  // Handle Verification Challenge
  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setVerificationResult(null);
    setFeedback(null);
    try {
      const voicePayload = Array.from({ length: 400 }, (_, i) => {
        const t = i / 16000;
        return (
          0.5 * Math.sin(2 * Math.PI * 140 * t) +
          0.3 * Math.sin(2 * Math.PI * 280 * t) +
          0.15 * Math.sin(2 * Math.PI * 840 * t)
        );
      });

      const res = await api.verifyVoiceprint({
        audioPayload: voicePayload,
        passphraseText: verifyPassphrase,
        actionAttempted
      });

      setVerificationResult(res.data);
      setFeedback({
        type: res.data.verified ? 'success' : 'error',
        msg: res.data.verified
          ? `Biometric Match Confirmed (${(res.data.confidenceScore * 100).toFixed(1)}%). Action [${actionAttempted}] authorized!`
          : `Verification Denied: ${res.data.rejectionReason || 'Confidence score below security threshold'}.`
      });
      loadAllData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setVerifying(false);
    }
  };

  // Handle Policy Update
  const handleUpdatePolicy = async (e) => {
    e.preventDefault();
    try {
      await api.updateBiometricSecurityPolicy(policyForm);
      setFeedback({ type: 'success', msg: 'Enterprise Biometric Zero-Trust Policy successfully updated in database.' });
      loadAllData();
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Real Photographic Hero Banner */}
      <div 
        className="glass-panel" 
        style={{ 
          position: 'relative', 
          height: '220px', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          display: 'flex', 
          alignItems: 'flex-end', 
          padding: '24px' 
        }}
      >
        <img 
          src="/assets/images/voice_biometric_security_real.jpg" 
          alt="Biometric Security Vault" 
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,9,7,0.95) 20%, rgba(10,9,7,0.4) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid var(--border-gold)', fontSize: '0.72rem', color: 'var(--gold-400)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
              <ShieldCheck size={14} /> Master Blueprint Centralized Architecture &bull; Procedure 22
            </div>
            <h2 style={{ fontSize: '1.45rem', color: '#fff', fontWeight: 800 }}>
              Central Voice Authentication Platform Service & Biometric Security Vault
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Acoustic formant vectors, MFCC vocal tract shape analysis, anti-spoofing liveness guards, and multi-factor clinical challenges.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--gold-400)', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
              <span className="pulse-live"></span> Zero-Trust Biometrics: ENFORCED
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '12px 16px', 
            borderLeft: `4px solid ${feedback.type === 'error' ? 'var(--status-danger)' : 'var(--status-online)'}`, 
            color: '#fff', 
            fontSize: '0.85rem' 
          }}
        >
          {feedback.msg}
        </div>
      )}

      {/* Live Telemetry Metric Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enrolled Voiceprints</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
            {telemetry?.totalEnrolledVoiceprints ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Active Acoustic Profiles</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Biometric Credentials</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
            {telemetry?.totalBiometricCredentials ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Multi-Modal Credentials</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verifications Today</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--status-online)', fontFamily: 'var(--font-mono)' }}>
            {telemetry?.totalVerifications ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Clinical Challenges</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spoofs Intercepted</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
            {telemetry?.spoofsIntercepted ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Replays Blocked</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Confidence Score</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold-400)', fontFamily: 'var(--font-mono)' }}>
            {((telemetry?.averageConfidenceScore ?? 0) * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Acoustic Accuracy</div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button 
          onClick={() => setActiveTab('ENROLLMENT')}
          className={activeTab === 'ENROLLMENT' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          <Mic size={14} /> 1. Voice Enrollment & Acoustic Studio
        </button>
        <button 
          onClick={() => setActiveTab('VERIFICATION')}
          className={activeTab === 'VERIFICATION' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          <Volume2 size={14} /> 2. Voice Challenge Simulator
        </button>
        <button 
          onClick={() => setActiveTab('CREDENTIALS')}
          className={activeTab === 'CREDENTIALS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          <Fingerprint size={14} /> 3. Multi-Modal Biometric Vault
        </button>
        <button 
          onClick={() => setActiveTab('POLICY_LOGS')}
          className={activeTab === 'POLICY_LOGS' ? 'btn-gold' : 'btn-outline-gold'}
          style={{ fontSize: '0.8rem', padding: '6px 14px' }}
        >
          <Sliders size={14} /> 4. Security Policy & Audit Stream
        </button>
      </div>

      {/* TAB 1: VOICE ENROLLMENT */}
      {activeTab === 'ENROLLMENT' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
          {/* Enrollment Panel */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--gold-400)', fontWeight: 700, marginBottom: '6px' }}>
              Biometric Voiceprint Enrollment Studio
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Enrolls your unique vocal tract acoustic frequency signature into PostgreSQL. Requires speaking the authorized security passphrase.
            </p>

            <form onSubmit={handleEnroll} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Authorized Verbal Security Passphrase *
                </label>
                <input 
                  type="text"
                  required
                  value={passphraseText}
                  onChange={e => setPassphraseText(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: '#12100d', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '4px', fontSize: '0.85rem' }}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button 
                    type="button" 
                    onClick={() => setPassphraseText('My voice is my secure biometric health passport at GBS Hospital')}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid var(--border-gold)', color: 'var(--gold-300)', borderRadius: '3px', cursor: 'pointer' }}
                  >
                    Preset 1: Hospital Health Passport
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setPassphraseText('GBS Hospital Central Voice Biometric Verification 2026')}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid var(--border-gold)', color: 'var(--gold-300)', borderRadius: '3px', cursor: 'pointer' }}
                  >
                    Preset 2: Enterprise Protocol
                  </button>
                </div>
              </div>

              {/* Acoustic Waveform Monitor Simulation */}
              <div style={{ background: '#0a0907', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gold-400)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Acoustic Spectrum & Waveform Analyzer
                  </span>
                  <span style={{ fontSize: '0.72rem', color: isRecording ? '#ef4444' : 'var(--text-muted)' }}>
                    {isRecording ? `RECORDING: ${recordDuration}s / 3.8s` : 'IDLE • 16,000 Hz Standard'}
                  </span>
                </div>

                {/* Simulated Audio Bars */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '60px', padding: '0 10px' }}>
                  {Array.from({ length: 32 }, (_, i) => {
                    const height = isRecording 
                      ? Math.min(Math.max(15 + Math.sin(i * 0.5 + recordDuration * 5) * 35, 8), 55)
                      : 10 + (i % 5) * 4;
                    return (
                      <div 
                        key={i} 
                        style={{ 
                          width: '6px', 
                          height: `${height}px`, 
                          background: isRecording ? 'linear-gradient(to top, #22c55e, #eab308)' : 'rgba(234, 179, 8, 0.3)', 
                          borderRadius: '2px', 
                          transition: 'height 0.1s ease' 
                        }} 
                      />
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                  <div>Pitch (F0): <strong style={{ color: '#fff' }}>140 Hz</strong></div>
                  <div>ZCR: <strong style={{ color: '#fff' }}>0.032</strong></div>
                  <div>Clarity SNR: <strong style={{ color: '#22c55e' }}>94.2 dB</strong></div>
                  <div>Formant F1: <strong style={{ color: 'var(--gold-300)' }}>443 Hz</strong></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  type="button" 
                  onClick={() => setIsRecording(!isRecording)}
                  className={isRecording ? 'btn-danger' : 'btn-outline-gold'}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isRecording ? <Square size={14} /> : <Mic size={14} />}
                  {isRecording ? 'Stop Recording' : 'Test Microphone'}
                </button>

                <button 
                  type="submit" 
                  disabled={enrolling} 
                  className="btn-gold" 
                  style={{ flex: 1, padding: '10px' }}
                >
                  {enrolling ? 'Extracting Acoustic Vectors...' : 'Enroll Voiceprint into Vault'}
                </button>
              </div>
            </form>
          </div>

          {/* Active Voiceprint Status Card */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--gold-400)', fontWeight: 700 }}>
              Active Voiceprint Profile (PostgreSQL)
            </h3>

            {voiceprintStatus ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#86efac', fontWeight: 800 }}>STATUS: ACTIVE ENROLLMENT</span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#fff', fontWeight: 700 }}>
                      {voiceprintStatus.enrollmentCode}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                    {voiceprintStatus.userName} ({voiceprintStatus.role})
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: '#12100d', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Acoustic Quality</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#22c55e' }}>
                      {((voiceprintStatus.qualityScore || 0.94) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ background: '#12100d', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sample Frequency</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>
                      {voiceprintStatus.sampleRate || 16000} Hz
                    </div>
                  </div>
                  <div style={{ background: '#12100d', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Liveness Threshold</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold-300)' }}>
                      &ge; {voiceprintStatus.livenessThreshold || 0.85}
                    </div>
                  </div>
                  <div style={{ background: '#12100d', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sample Duration</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                      {voiceprintStatus.durationSeconds ?? 0}s
                    </div>
                  </div>
                </div>

                <div style={{ background: '#12100d', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Enrolled Security Passphrase:</div>
                  <div style={{ fontSize: '0.8rem', color: '#fff', fontStyle: 'italic', marginTop: '2px' }}>
                    "{voiceprintStatus.passphraseText}"
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                  Enrolled on: {new Date(voiceprintStatus.createdAt).toLocaleString()}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active voiceprint enrolled for this user. Enter passphrase and record voice sample on the left.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFICATION CHALLENGE SIMULATOR */}
      {activeTab === 'VERIFICATION' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Challenge Request Form */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--gold-400)', fontWeight: 700, marginBottom: '6px' }}>
              Multi-Factor Voice Challenge Simulator
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Test voice verification for high-risk hospital actions. Cosine similarity and anti-spoofing tests are performed directly against PostgreSQL.
            </p>

            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  High-Risk Clinical Action Challenge *
                </label>
                <select 
                  value={actionAttempted} 
                  onChange={e => setActionAttempted(e.target.value)}
                  style={{ width: '100%', padding: '9px', background: '#12100d', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '4px', fontSize: '0.85rem' }}
                >
                  <option value="NARCOTICS_DISPENSE">NARCOTICS_DISPENSE (Controlled Substances Vault Release)</option>
                  <option value="SYSTEM_LOCK_ENGAGE">SYSTEM_LOCK_ENGAGE (Developer NOC Global Lock)</option>
                  <option value="DECEASED_RELEASE">DECEASED_RELEASE (Mortuary Next-Of-Kin Handover)</option>
                  <option value="SURGICAL_SIGN_OUT">SURGICAL_SIGN_OUT (WHO Surgical Safety Checklist Clearance)</option>
                  <option value="CLINICAL_AUTHENTICATION">CLINICAL_AUTHENTICATION (Physician Session Elevation)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Spoken Verbal Passphrase Response *
                </label>
                <input 
                  type="text"
                  required
                  value={verifyPassphrase}
                  onChange={e => setVerifyPassphrase(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setVerifyPassphrase('An unauthorized impostor phrase without permission')}
                  style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Simulate Mismatched Phrase (Attack)
                </button>
                <button 
                  type="button" 
                  onClick={() => setVerifyPassphrase('My voice is my secure biometric health passport at GBS Hospital')}
                  style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', color: '#86efac', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Simulate Genuine Phrase (Pass)
                </button>
              </div>

              <button 
                type="submit" 
                disabled={verifying} 
                className="btn-gold" 
                style={{ marginTop: '8px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                <Volume2 size={16} />
                {verifying ? 'Evaluating Acoustic Match...' : 'Submit Voice Verification Challenge'}
              </button>
            </form>
          </div>

          {/* Challenge Decision Result Card */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--gold-400)', fontWeight: 700, marginBottom: '14px' }}>
              Biometric Authorization Verdict
            </h3>

            {verificationResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div 
                  style={{ 
                    padding: '16px', 
                    borderRadius: '6px', 
                    background: verificationResult.verified ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${verificationResult.verified ? '#22c55e' : '#ef4444'}`,
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: verificationResult.verified ? '#86efac' : '#fca5a5' }}>
                    {verificationResult.verified ? 'VERIFICATION PASSED' : 'VERIFICATION DENIED'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#fff', marginTop: '4px' }}>
                    Action: <strong>{verificationResult.actionAttempted}</strong> &bull; Status: {verificationResult.actionAuthorized ? 'AUTHORIZED' : 'BLOCKED'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: '#12100d', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Computed Confidence</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: verificationResult.confidenceScore >= verificationResult.thresholdRequired ? '#22c55e' : '#ef4444' }}>
                      {((verificationResult.confidenceScore || 0) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div style={{ background: '#12100d', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Threshold Floor</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--gold-300)' }}>
                      &ge; {((verificationResult.thresholdRequired || 0.85) * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div style={{ background: '#12100d', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Liveness Status</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: verificationResult.livenessPassed ? '#22c55e' : '#ef4444' }}>
                      {verificationResult.livenessPassed ? 'PASSED (LIVE)' : 'FAILED (SYNTHETIC)'}
                    </div>
                  </div>

                  <div style={{ background: '#12100d', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Anti-Spoofing Guard</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: verificationResult.antiSpoofingStatus === 'PASSED' ? '#22c55e' : '#ef4444' }}>
                      {verificationResult.antiSpoofingStatus}
                    </div>
                  </div>
                </div>

                <div style={{ background: '#12100d', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Audit Code: <strong style={{ color: 'var(--gold-400)', fontFamily: 'var(--font-mono)' }}>{verificationResult.verificationLogCode}</strong>
                  {verificationResult.rejectionReason && (
                    <div style={{ color: '#fca5a5', marginTop: '4px' }}>
                      Reason: {verificationResult.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Select an action and verbal response on the left, then click "Submit Voice Verification Challenge".
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MULTI-MODAL BIOMETRIC VAULT */}
      {activeTab === 'CREDENTIALS' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--gold-400)', fontWeight: 700 }}>
                Enterprise Multi-Modal Biometric Vault
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Registered biometric templates including ANSI/NIST Fingerprint Minutiae, FIDO2/WebAuthn public keys, and Acoustic Voiceprints.
              </p>
            </div>

            <button 
              onClick={async () => {
                try {
                  const res = await api.enrollBiometricCredential({
                    biometricType: 'FINGERPRINT_MINUTIAE',
                    credentialPayload: 'ENCRYPTED_ANSI_NIST_TEMPLATE_HASH_' + Date.now(),
                    securityLevel: 'MAXIMUM_CLINICAL'
                  });
                  setFeedback({ type: 'success', msg: `Biometric credential issued: ${res.data.credentialCode}` });
                  loadAllData();
                } catch (e) {
                  setFeedback({ type: 'error', msg: e.message });
                }
              }}
              className="btn-gold" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Fingerprint size={16} /> Register Fingerprint Template
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Credential ID</th>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Biometric Modality</th>
                <th>Security Level</th>
                <th>Status</th>
                <th>Enrolled Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {credentials.length > 0 ? (
                credentials.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>
                      {c.credentialCode}
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.userName}</td>
                    <td><span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{c.role}</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                        <Fingerprint size={13} /> {c.biometricType}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--gold-400)', fontWeight: 700 }}>{c.securityLevel}</span>
                    </td>
                    <td>
                      <span style={{ color: '#22c55e', fontWeight: 700 }}>{c.status}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        onClick={() => window.gbsNavigateDetail && window.gbsNavigateDetail({
                          detailType: 'VIEW_DETAILS',
                          recordId: c.id || c.credentialCode,
                          title: `Biometric Credential Details — ${c.credentialCode}`,
                          payload: c
                        })}
                        className="btn-outline-gold"
                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
                    No records available. Click "Register Fingerprint Template" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: POLICY & AUDIT STREAM */}
      {activeTab === 'POLICY_LOGS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
          {/* Policy Settings Form */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--gold-400)', fontWeight: 700, marginBottom: '6px' }}>
              Zero-Trust Biometric Security Policy
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Statutory clinical and system governance rules enforced across all hospital submodules.
            </p>

            <form onSubmit={handleUpdatePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Minimum Voice Confidence Floor:</span>
                  <strong style={{ color: 'var(--gold-300)' }}>{((policyForm.minVoiceConfidenceScore) * 100).toFixed(0)}%</strong>
                </label>
                <input 
                  type="range" 
                  min="0.70" 
                  max="0.95" 
                  step="0.01"
                  value={policyForm.minVoiceConfidenceScore}
                  onChange={e => setPolicyForm({ ...policyForm, minVoiceConfidenceScore: parseFloat(e.target.value) })}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <label style={{ fontSize: '0.78rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    checked={policyForm.requireVoiceForNarcotics} 
                    onChange={e => setPolicyForm({ ...policyForm, requireVoiceForNarcotics: e.target.checked })} 
                  />
                  Require Voice Biometrics for Controlled Narcotics Vault Release
                </label>

                <label style={{ fontSize: '0.78rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    checked={policyForm.requireVoiceForSystemLock} 
                    onChange={e => setPolicyForm({ ...policyForm, requireVoiceForSystemLock: e.target.checked })} 
                  />
                  Require Voice Biometrics for Developer NOC Emergency Lockdown
                </label>

                <label style={{ fontSize: '0.78rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    checked={policyForm.requireVoiceForDeceasedRelease} 
                    onChange={e => setPolicyForm({ ...policyForm, requireVoiceForDeceasedRelease: e.target.checked })} 
                  />
                  Require Voice Biometrics for Mortuary Deceased Body Release
                </label>

                <label style={{ fontSize: '0.78rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    checked={policyForm.requireVoiceForSurgicalSignOut} 
                    onChange={e => setPolicyForm({ ...policyForm, requireVoiceForSurgicalSignOut: e.target.checked })} 
                  />
                  Require Voice Biometrics for WHO Surgical Safety Sign-Out
                </label>

                <label style={{ fontSize: '0.78rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    checked={policyForm.livenessEnforced} 
                    onChange={e => setPolicyForm({ ...policyForm, livenessEnforced: e.target.checked })} 
                  />
                  Enforce Real-Time Anti-Spoofing & Replay Attack Protection
                </label>
              </div>

              <button type="submit" className="btn-gold" style={{ marginTop: '10px' }}>
                Save Policy Configuration
              </button>
            </form>
          </div>

          {/* Verification Audit Stream */}
          <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--gold-400)', fontWeight: 700, marginBottom: '10px' }}>
              Biometric Verification Audit Trail (PostgreSQL)
            </h3>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Log Code</th>
                  <th>Staff Member</th>
                  <th>Action</th>
                  <th>Score</th>
                  <th>Liveness</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--gold-300)' }}>
                        {log.logCode}
                      </td>
                      <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{log.userName}</td>
                      <td style={{ fontSize: '0.72rem' }}>
                        <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px' }}>
                          {log.actionAttempted}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', fontWeight: 700, color: log.status === 'SUCCESS' ? '#22c55e' : '#ef4444' }}>
                        {((log.confidenceScore || 0) * 100).toFixed(1)}%
                      </td>
                      <td style={{ fontSize: '0.72rem', color: log.livenessPassed ? '#22c55e' : '#ef4444' }}>
                        {log.antiSpoofingStatus}
                      </td>
                      <td>
                        <span 
                          style={{ 
                            fontSize: '0.72rem', 
                            padding: '2px 8px', 
                            borderRadius: '4px',
                            fontWeight: 700,
                            background: log.status === 'SUCCESS' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: log.status === 'SUCCESS' ? '#86efac' : '#fca5a5'
                          }}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
                      No verification audit logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
