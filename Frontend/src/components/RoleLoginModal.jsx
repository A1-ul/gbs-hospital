import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, AlertCircle, CheckCircle, Check } from 'lucide-react';
import { api } from '../services/api.service';
import { ROLES, ROLE_CATEGORIES } from './Header';

export default function RoleLoginModal({ isOpen, onClose, onLoginSuccess, initialRole = 'DOCTOR' }) {
  if (!isOpen) return null;

  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState(initialRole || 'DOCTOR');
  const [modalRoleCategory, setModalRoleCategory] = useState('ALL');
  const [email, setEmail] = useState(initialRole === 'DEVELOPER' ? 'gabosei48@gmail.com' : '');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const normalizedEmail = email.trim().toLowerCase();
  const isDeveloperEmailEntered = normalizedEmail === 'gabosei48@gmail.com';

  // All roles (including DEVELOPER) are listed on the main Sign In modal so the Developer can click the Developer role directly.
  // For Sign Up, DEVELOPER is excluded because the permanent Root Developer account is strictly locked to gabosei48@gmail.com.
  const selectableRoles = isSignUp
    ? ROLES.filter((r) => r.id !== 'DEVELOPER')
    : ROLES;

  const handleSelectRoleOption = (roleId) => {
    setSelectedRole(roleId);
    setError(null);
    if (roleId === 'DEVELOPER' && !isSignUp) {
      setEmail('gabosei48@gmail.com');
      setPassword('');
    }
  };

  const currentRoleObj =
    ROLES.find((r) => r.id === (isDeveloperEmailEntered && !isSignUp ? 'DEVELOPER' : selectedRole)) ||
    selectableRoles[0] ||
    ROLES[0];

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
            <h3 className="header-3d" style={{ fontSize: '1.52rem', fontWeight: 800 }}>
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

          <h2 className="header-3d" style={{ fontSize: '1.38rem', fontWeight: 700, marginBottom: '6px' }}>
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
            {/* Organized Role Selector with Departmental Tabs */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--gold-400)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  SELECT DESIGNATED ROLE PORTAL *
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  Selected: <strong style={{ color: 'var(--gold-300)' }}>{currentRoleObj.name}</strong>
                </span>
              </div>

              {/* Category Filter Tabs */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {ROLE_CATEGORIES.map(cat => {
                  const isSelected = modalRoleCategory === cat.id;
                  const catCount = cat.id === 'ALL'
                    ? selectableRoles.length
                    : selectableRoles.filter(r => r.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setModalRoleCategory(cat.id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        border: isSelected ? '1px solid var(--gold-400)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'var(--gold-glow)' : 'rgba(255,255,255,0.03)',
                        color: isSelected ? 'var(--gold-300)' : 'var(--text-muted)',
                        fontSize: '0.7rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span style={{ fontSize: '0.64rem', opacity: 0.8 }}>({catCount})</span>
                    </button>
                  );
                })}
              </div>

              {/* Accessible Dropdown for quick keyboard switching */}
              <select
                value={isDeveloperEmailEntered && !isSignUp ? 'DEVELOPER' : selectedRole}
                onChange={(e) => handleSelectRoleOption(e.target.value)}
                title="Select your hospital role or Developer (NOC) portal"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: '#12100d',
                  border: '1px solid var(--border-gold)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  marginBottom: '8px'
                }}
              >
                {selectableRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.name} — {r.dept || r.desc}</option>
                ))}
              </select>

              {/* Organized Visual Role Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '6px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  padding: '6px',
                  background: 'rgba(10, 8, 6, 0.7)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}
              >
                {selectableRoles
                  .filter(r => modalRoleCategory === 'ALL' || r.category === modalRoleCategory)
                  .map((r) => {
                    const active = (isDeveloperEmailEntered && !isSignUp ? 'DEVELOPER' : selectedRole) === r.id;
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => handleSelectRoleOption(r.id)}
                        title={`Select ${r.name} (${r.dept || r.desc})`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: active ? '1.5px solid var(--gold-400)' : '1px solid rgba(255,255,255,0.08)',
                          background: active ? 'linear-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(20,17,13,0.9) 100%)' : 'rgba(20, 17, 13, 0.7)',
                          color: active ? '#fff' : '#d1d5db',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        <img
                          src={r.img}
                          alt={r.name}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: active ? '1.5px solid var(--gold-400)' : '1px solid var(--border-subtle)',
                            flexShrink: 0
                          }}
                          onError={(e) => { e.target.src = '/assets/images/portrait_doctor.jpg'; }}
                        />
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: active ? 700 : 500, color: active ? 'var(--gold-300)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.name}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: active ? 'var(--gold-400)' : 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.dept}
                          </div>
                        </div>
                        {active && (
                          <Check size={12} style={{ color: 'var(--gold-400)', flexShrink: 0 }} />
                        )}
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
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password (never pre-filled)"
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
