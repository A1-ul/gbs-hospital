import React, { useState, useEffect } from 'react';
import { Lock, AlertTriangle, ShieldAlert, RefreshCw, Activity, CheckCircle } from 'lucide-react';
import { api } from '../services/api.service';

export default function SubscriptionLockOverlay({ onNavigateModule }) {
  const [lockEvent, setLockEvent] = useState(null);
  const [emergencyActive, setEmergencyActive] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem('gbs_emergency_override') === 'true'
  );
  const [emergencyReason, setEmergencyReason] = useState(
    'Life-Saving Emergency Clinical Care — Patient Safety Guardrail Bypass'
  );
  const [rechecking, setRechecking] = useState(false);

  useEffect(() => {
    const handleLock = (evt) => {
      const detail = evt?.detail || {};
      // Never block active audited emergency sessions
      if (sessionStorage.getItem('gbs_emergency_override') === 'true') {
        return;
      }
      setLockEvent(detail);
    };
    window.addEventListener('gbs:system-locked', handleLock);
    return () => window.removeEventListener('gbs:system-locked', handleLock);
  }, []);

  const activateEmergencyBypass = (targetModule = 'EMERGENCY') => {
    const cleanReason = emergencyReason.trim() || 'Clinical Emergency Override';
    sessionStorage.setItem('gbs_emergency_override', 'true');
    sessionStorage.setItem('gbs_emergency_reason', cleanReason);
    setEmergencyActive(true);
    setLockEvent(null);
    if (typeof onNavigateModule === 'function') {
      onNavigateModule(targetModule);
    }
  };

  const deactivateEmergencyBypass = () => {
    sessionStorage.removeItem('gbs_emergency_override');
    sessionStorage.removeItem('gbs_emergency_reason');
    setEmergencyActive(false);
  };

  const handleRecheckUnlock = async () => {
    setRechecking(true);
    try {
      await api.getGlobalOverviewStats();
      setLockEvent(null);
    } catch (_err) {
      // Remain locked if still blocked
    } finally {
      setRechecking(false);
    }
  };

  return (
    <>
      {/* Persistent Audited Emergency Clinical Bypass Banner */}
      {emergencyActive && (
        <div
          style={{
            position: 'fixed',
            bottom: '12px',
            left: '16px',
            zIndex: 4200,
            background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.96), rgba(69, 10, 10, 0.96))',
            border: '1px solid #ef4444',
            borderRadius: '10px',
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            maxWidth: '520px',
            flexWrap: 'wrap'
          }}
        >
          <ShieldAlert size={18} style={{ color: '#fca5a5', flexShrink: 0 }} />
          <div style={{ fontSize: '0.74rem', color: '#fee2e2', flex: 1 }}>
            <strong style={{ display: 'block', color: '#fff' }}>PATIENT SAFETY EMERGENCY BYPASS ACTIVE (AUDITED)</strong>
            Emergency, ICU, Triage &amp; Blood Bank workflows remain open and logged to PostgreSQL Audit Trail.
          </div>
          <button
            type="button"
            onClick={deactivateEmergencyBypass}
            style={{
              padding: '5px 10px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.35)',
              color: '#fff',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Exit Bypass
          </button>
        </div>
      )}

      {/* Full-Screen Blueprint SYSTEM LOCKED Overlay */}
      {lockEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 5000,
            background: 'rgba(4, 8, 18, 0.94)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '28px',
              border: '2px solid #ef4444',
              boxShadow: '0 20px 60px rgba(239, 68, 68, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={24} style={{ color: '#f87171' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {lockEvent.status === 402 ? 'SUBSCRIPTION EXPIRED (HTTP 402)' : 'SYSTEM LOCKED (HTTP 423)'}
                </div>
                <h2 style={{ margin: '2px 0 0', fontSize: '1.35rem', color: '#fff' }}>
                  Non-Clinical Facility Access Temporarily Locked
                </h2>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#e2e8f0', lineHeight: 1.55, marginBottom: '16px' }}>
              {lockEvent.message || 'Your hospital subscription period has expired or administrative lock is active. Renew subscription or contact GBS Developer Administration to restore full non-clinical modules.'}
            </p>

            {lockEvent.data?.tenantId && (
              <div style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(6,12,24,0.8)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                <strong>Facility ID:</strong> <span style={{ color: 'var(--gold-300)' }}>{lockEvent.data.tenantId}</span>
                {lockEvent.data.lockReason ? ` • ${lockEvent.data.lockReason}` : ''}
              </div>
            )}

            {/* Immutable Patient Safety Guardrail Bypass Panel */}
            <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7', fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px' }}>
                <CheckCircle size={16} /> PATIENT SAFETY GUARDRAIL — CLINICAL SYSTEMS NEVER LOCK
              </div>
              <p style={{ fontSize: '0.76rem', color: '#cbd5e1', margin: '0 0 10px' }}>
                Emergency Triage, Ambulance Dispatch, ICU Live Vitals, Blood Bank, and Trauma Care remain permanently accessible via audited clinical bypass.
              </p>
              <input
                type="text"
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                placeholder="Clinical reason for emergency bypass..."
                style={{ width: '100%', padding: '8px', background: '#050b16', border: '1px solid rgba(16,185,129,0.5)', color: '#fff', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => activateEmergencyBypass('EMERGENCY')}
                  style={{ padding: '8px 14px', background: '#10b981', color: '#032016', border: 'none', borderRadius: '6px', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <AlertTriangle size={14} /> Open Emergency Room (Audited Bypass)
                </button>
                <button
                  type="button"
                  onClick={() => activateEmergencyBypass('ICU')}
                  style={{ padding: '8px 14px', background: 'rgba(16,185,129,0.18)', color: '#6ee7b7', border: '1px solid #10b981', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Activity size={14} /> Open ICU Live Vitals
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                GBS Billing &amp; Licensing Desk: gabosei48@gmail.com
              </span>
              <button
                type="button"
                onClick={handleRecheckUnlock}
                disabled={rechecking}
                className="btn-gold"
                style={{ fontSize: '0.8rem', padding: '8px 16px' }}
              >
                <RefreshCw size={14} /> {rechecking ? 'Checking License...' : 'Check / Retry Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
