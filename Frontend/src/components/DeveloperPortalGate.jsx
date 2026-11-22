import React, { useState } from 'react';
import { Shield, Lock, Mail, KeyRound, CheckCircle, AlertCircle, Fingerprint, ArrowLeft } from 'lucide-react';
import { api, getClientDeviceFingerprint } from '../services/api.service';

export default function DeveloperPortalGate({ onDeveloperAuthenticated, onExitPortal }) {
  const [step, setStep] = useState('CREDENTIALS'); // CREDENTIALS | MFA
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);

  const deviceFingerprint = getClientDeviceFingerprint();

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const auth = await api.login(email.trim(), password, { deviceFingerprint });
      if (!auth?.user || auth.user.role !== 'DEVELOPER') {
        await api.logout().catch(() => {});
        localStorage.removeItem('gbs_token');
        localStorage.removeItem('gbs_user');
        setError('Access denied. This unlisted portal requires verified Root Developer authority.');
        setLoading(false);
        return;
      }

      localStorage.setItem('gbs_token', auth.token);
      localStorage.setItem('gbs_user', JSON.stringify(auth.user));
      localStorage.setItem('gbs_role', 'DEVELOPER');
      setPendingUser(auth.user);

      // Step 2: Mandatory Developer MFA & Device Verification Challenge
      const challenge = await api.requestDeveloperMfaChallenge(deviceFingerprint);
      setMfaChallenge(challenge);
      setStep('MFA');
      setInfoMsg(
        challenge?.devMfaCode
          ? `Non-production MFA verification code issued (${challenge.deliveryStatus}). Enter the 6-digit code below to verify this device.`
          : `Developer MFA challenge issued (${challenge?.deliveryStatus || 'ACTIVE'}). Enter your 6-digit verification code to unlock the Developer Control Center.`
      );
    } catch (err) {
      setError(err.message || 'Developer authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const verification = await api.verifyDeveloperMfaChallenge(mfaCode.trim(), deviceFingerprint);
      if (verification?.mfaVerified) {
        sessionStorage.setItem('gbs_dev_mfa_verified', 'true');
        sessionStorage.setItem('gbs_dev_device_fp', deviceFingerprint);
        if (onDeveloperAuthenticated) {
          onDeveloperAuthenticated(pendingUser);
        }
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired MFA verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendChallenge = async () => {
    setError(null);
    setLoading(true);
    try {
      const challenge = await api.requestDeveloperMfaChallenge(deviceFingerprint);
      setMfaChallenge(challenge);
      setInfoMsg('A fresh Developer MFA verification challenge has been generated and logged.');
    } catch (err) {
      setError(err.message || 'Could not issue a new MFA challenge.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#040812'
      }}
    >
      {/* Real-Life Developer NOC Background */}
      <img
        src="/assets/images/developer_control_center_real.jpg"
        alt="Developer Control Center Security Gate"
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.34, zIndex: 0 }}
      />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(6,12,24,0.72) 0%, rgba(4,8,16,0.96) 80%)',
          zIndex: 1
        }}
      />

      <div
        className="glass-panel"
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '520px',
          padding: '32px',
          borderRadius: '14px',
          border: '1px solid var(--gold-400)',
          background: 'rgba(10, 18, 34, 0.94)',
          boxShadow: '0 25px 70px rgba(0,0,0,0.95), 0 0 36px rgba(212,175,55,0.22)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.16)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}
          >
            <Shield size={13} /> Unlisted Developer Security Gate
          </span>
          {onExitPortal && (
            <button
              type="button"
              onClick={onExitPortal}
              className="btn-outline-gold"
              style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <ArrowLeft size={13} /> Hospital Home
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid var(--gold-400)',
              flexShrink: 0
            }}
          >
            <img
              src="/assets/images/portrait_developer.jpg"
              alt="GBS Lead Developer"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div>
            <h1 className="header-3d" style={{ fontSize: '1.35rem', margin: 0 }}>
              GBS Developer Control Center
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Restricted Infrastructure, Tenant Governance &amp; Backup Authority • All Sessions Audited
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            marginBottom: '16px'
          }}
        >
          <Fingerprint size={15} style={{ color: 'var(--gold-400)', flexShrink: 0 }} />
          <span>
            Device Fingerprint: <strong style={{ color: 'var(--gold-300)', fontFamily: 'var(--font-mono)' }}>{deviceFingerprint}</strong>
          </span>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.16)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              fontSize: '0.8rem',
              marginBottom: '14px'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {infoMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid #10b981',
              color: '#6ee7b7',
              fontSize: '0.8rem',
              marginBottom: '14px'
            }}
          >
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{infoMsg}</span>
          </div>
        )}

        {step === 'CREDENTIALS' ? (
          <form onSubmit={handleCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Developer Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter authorized developer email"
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: '6px',
                    background: 'rgba(6, 12, 24, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    fontSize: '0.86rem'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Developer Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter permanent developer password"
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: '6px',
                    background: 'rgba(6, 12, 24, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    fontSize: '0.86rem'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: '4px' }}
            >
              {loading ? 'Verifying Developer Authority...' : 'Step 1: Authenticate & Request MFA Challenge'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyMfa} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mfaChallenge?.devMfaCode && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(212,175,55,0.12)',
                  border: '1px solid var(--gold-400)',
                  fontSize: '0.8rem',
                  color: '#fff'
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--gold-400)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Development / Test Environment MFA Code
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.18em', marginTop: '4px', color: 'var(--gold-300)' }}>
                  {mfaChallenge.devMfaCode}
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                6-Digit Developer MFA Verification Code *
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="Enter 6-digit MFA code"
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    borderRadius: '6px',
                    background: 'rgba(6, 12, 24, 0.9)',
                    border: '1px solid var(--border-gold)',
                    color: '#fff',
                    fontSize: '1rem',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.16em'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-gold"
                style={{ flex: 1, justifyContent: 'center', padding: '11px' }}
              >
                {loading ? 'Verifying Device & MFA...' : 'Step 2: Unlock Developer Control Center'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleResendChallenge}
                className="btn-outline-gold"
                style={{ padding: '11px 14px', fontSize: '0.78rem' }}
              >
                New Code
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center' }}>
          Zero-Trust Developer Isolation • Session &amp; IP Logged to PostgreSQL Audit Trail
        </div>
      </div>
    </div>
  );
}
