import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api.service';
import { ROLES } from './Header';

export default function RoleLoginModal({ isOpen, onClose, onLoginSuccess, initialRole = 'DOCTOR' }) {
  if (!isOpen) return null;

  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState(initialRole || 'DOCTOR');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const currentRoleObj = ROLES.find(r => r.id === selectedRole) || ROLES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Step 6: Compulsory role-specific sign up with admin review gate
        const res = await api.signup({
          email,
          password,
          firstName,
          lastName,
          phone,
          role: selectedRole
        });
        setSuccessMsg(res.message || 'Registration submitted successfully. Awaiting Administrator approval before activation.');
      } else {
        // Login
        const res = await api.login(email, password);
        localStorage.setItem('gbs_token', res.token);
        localStorage.setItem('gbs_user', JSON.stringify(res.user));
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '820px',
          display: 'grid',
          gridTemplateColumns: '340px 1fr',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--gold-400)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.95)'
        }}
      >
        {/* Left Side: Real-Life Role & Hospital Department Imagery */}
        <div style={{ position: 'relative', background: '#000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px', borderRight: '1px solid var(--border-gold)' }}>
          {/* Real Hospital Workspace Background for this Role */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.55 }}>
            <img 
              src={currentRoleObj.loginBg || currentRoleObj.img} 
              alt={currentRoleObj.dept || currentRoleObj.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.src = '/assets/images/hospital_hero_exterior.jpg'; }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0a0907 8%, rgba(10,9,7,0.35) 100%)' }} />
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', background: 'var(--gold-glow)', border: '1px solid var(--gold-400)', fontSize: '0.7rem', color: 'var(--gold-300)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              {currentRoleObj.dept || 'Authorized Hospital Portal'}
            </div>
            <h3 style={{ fontSize: '1.45rem', color: '#fff', fontWeight: 800 }}>
              {currentRoleObj.name} Login Portal
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#e5e7eb', marginTop: '4px' }}>
              {currentRoleObj.desc}
            </p>
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* Real-Life Specialist Headshot Frame + Department Workspace Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '88px', height: '88px', borderRadius: '50%', border: '2px solid var(--gold-400)', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.85)', flexShrink: 0 }}>
                <img 
                  src={currentRoleObj.img} 
                  alt={currentRoleObj.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = '/assets/images/portrait_doctor.jpg'; }}
                />
              </div>
              <div style={{ width: '110px', height: '74px', borderRadius: '8px', border: '1px solid var(--border-gold)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.8)', flexShrink: 0 }}>
                <img 
                  src={currentRoleObj.loginBg || currentRoleObj.img} 
                  alt={currentRoleObj.dept || currentRoleObj.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = '/assets/images/hospital_hero_exterior.jpg'; }}
                />
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gold-400)', fontWeight: 700 }}>
              GBS Hospital Zero-Trust Identity • {currentRoleObj.id}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              Dedicated Role Login • RBAC Policy Enforcement • Audit Logged
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div style={{ padding: '32px', position: 'relative', background: 'rgba(26, 23, 19, 0.95)' }}>
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>

          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
            {isSignUp ? 'Request Role Account' : 'Sign In to Your Workspace'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            {isSignUp 
              ? 'Select your designated clinical or operational role. Requires Administrator approval.'
              : 'Enter your verified credentials to access authorized hospital subsystems.'}
          </p>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '0.82rem', marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', fontSize: '0.82rem', marginBottom: '16px' }}>
              <CheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Role Selector (Compulsory) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--gold-400)', fontWeight: 600, marginBottom: '6px' }}>
                DESIGNATED ROLE *
              </label>
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  background: '#12100d',
                  border: '1px solid var(--border-gold)',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              >
                {ROLES.map(r => (
                  <option key={r.id} value={r.id}>{r.name} — {r.desc}</option>
                ))}
              </select>
              {/* Visual Real-Life Role Portrait Strip for Quick Role Login Selection */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '8px', paddingBottom: '4px' }}>
                {ROLES.map((r) => {
                  const active = selectedRole === r.id;
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setSelectedRole(r.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: active ? '1px solid var(--gold-400)' : '1px solid var(--border-subtle)',
                        background: active ? 'var(--gold-glow)' : 'rgba(18, 16, 13, 0.85)',
                        color: active ? 'var(--gold-300)' : '#d1d5db',
                        cursor: 'pointer',
                        flexShrink: 0,
                        fontSize: '0.72rem'
                      }}
                    >
                      <img src={r.img} alt={r.name} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--gold-400)' }} />
                      <span>{r.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isSignUp && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>First Name</label>
                  <input 
                    type="text" 
                    required 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. Samuel"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Last Name</label>
                  <input 
                    type="text" 
                    required 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)}
                    placeholder="e.g. Mensah"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Official Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@gbs-hospital.org"
                  style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '6px', background: '#12100d', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-gold" 
              style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '6px' }}
            >
              {loading ? 'Processing...' : (isSignUp ? 'Submit Registration for Approval' : 'Authenticate & Open Dashboard')}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isSignUp ? (
              <span>Already have an account? <button onClick={() => { setIsSignUp(false); setError(null); }} style={{ background: 'none', border: 'none', color: 'var(--gold-400)', cursor: 'pointer', fontWeight: 600 }}>Sign In</button></span>
            ) : (
              <span>New hospital staff? <button onClick={() => { setIsSignUp(true); setError(null); }} style={{ background: 'none', border: 'none', color: 'var(--gold-400)', cursor: 'pointer', fontWeight: 600 }}>Sign Up for a Role</button></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
