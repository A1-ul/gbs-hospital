import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, AlertCircle, CheckCircle, Check, Zap, KeyRound, ArrowLeft } from 'lucide-react';
import { api } from '../services/api.service';
import { ROLES, ROLE_CATEGORIES } from './Header';

export default function RoleLoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
  initialRole = 'DOCTOR',
  demoModeEnabled = false
}) {
  const safeInitialRole = initialRole && initialRole !== 'DEVELOPER' ? initialRole : 'DOCTOR';

  const [mode, setMode] = useState('signin'); // signin | signup | forgot
  const [selectedRole, setSelectedRole] = useState(safeInitialRole);
  const [modalRoleCategory, setModalRoleCategory] = useState('ALL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Forgot / Reset Password state
  const [resetRequested, setResetRequested] = useState(false);
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [devResetHint, setDevResetHint] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const nextRole = initialRole && initialRole !== 'DEVELOPER' ? initialRole : 'DOCTOR';
      setSelectedRole(nextRole);
      setError(null);
      setSuccessMsg(null);
      setMode('signin');
      setResetRequested(false);
      setDevResetHint(null);
    }
  }, [isOpen, initialRole]);

  if (!isOpen) return null;

  // Step 32 Developer Isolation: DEVELOPER is strictly excluded from public hospital login & signup modals.
  const selectableRoles = ROLES.filter((r) => r.id !== 'DEVELOPER');

  const handleSelectRoleOption = (roleId) => {
    if (roleId === 'DEVELOPER') return;
    setSelectedRole(roleId);
    setError(null);
  };

  const currentRoleObj =
    selectableRoles.find((r) => r.id === selectedRole) ||
    selectableRoles[0];

  const handleStartSupervisedDemo = async () => {
    if (!demoModeEnabled || selectedRole === 'DEVELOPER') return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.startDemoSession(selectedRole);
      localStorage.setItem('gbs_token', res.token);
      localStorage.setItem('gbs_user', JSON.stringify(res.user));
      localStorage.setItem('gbs_role', res.user?.role || selectedRole);
      onLoginSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Supervised training session is not available.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      if (!resetRequested) {
        const res = await api.forgotPassword(email.trim());
        setResetRequested(true);
        setDevResetHint(res?.devVerificationToken || null);
        setSuccessMsg(
          res?.message ||
            'Password reset request recorded. Enter your recovery code below to set a new password.'
        );
      } else {
        if (newPasswordInput !== confirmNewPassword) {
          setError('New password and confirmation do not match.');
          setLoading(false);
          return;
        }
        const res = await api.resetPassword({
          email: email.trim(),
          resetToken: resetTokenInput.trim(),
          newPassword: newPasswordInput
        });
        setSuccessMsg(res?.message || 'Password updated successfully. You may now sign in.');
        setResetRequested(false);
        setResetTokenInput('');
        setNewPasswordInput('');
        setConfirmNewPassword('');
        setDevResetHint(null);
        setPassword('');
        setMode('signin');
      }
    } catch (err) {
      setError(err.message || 'Password recovery failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'forgot') {
      return handleForgotSubmit(e);
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const res = await api.signup({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          role: selectedRole
        });
        setSuccessMsg(
          res.message ||
            'Registration submitted successfully. Awaiting Administrator approval before activation.'
        );
        setPassword('');
      } else {
        const res = await api.login(email.trim(), password);
        if (res?.user?.role === 'DEVELOPER') {
          await api.logout().catch(() => {});
          localStorage.removeItem('gbs_token');
          localStorage.removeItem('gbs_user');
          setError('Developer accounts must authenticate via the unlisted Developer Security Portal.');
          setLoading(false);
          return;
        }
        localStorage.setItem('gbs_token', res.token);
        localStorage.setItem('gbs_user', JSON.stringify(res.user));
        localStorage.setItem('gbs_role', res.user?.role || selectedRole);
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const isSignUp = mode === 'signup';
  const isForgot = mode === 'forgot';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 8, 16, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '840px',
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 340px) 1fr',
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid var(--gold-primary)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.95), 0 0 35px rgba(212, 175, 55, 0.22)',
          maxHeight: '94vh'
        }}
      >
        {/* Left Side: Real-Life Role & Hospital Department Imagery */}
        <div
          style={{
            position: 'relative',
            background: '#060c18',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
            borderRight: '1px solid var(--border-color)'
          }}
        >
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.55 }}>
            <img
              src={currentRoleObj.loginBg || currentRoleObj.img}
              alt={currentRoleObj.dept || currentRoleObj.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.src = '/assets/images/hospital_hero_exterior.jpg';
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, #060c18 8%, rgba(6,12,24,0.35) 100%)'
              }}
            />
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: '4px',
                background: 'var(--gold-glow)',
                border: '1px solid var(--gold-400)',
                fontSize: '0.7rem',
                color: 'var(--gold-300)',
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}
            >
              {currentRoleObj.dept || 'Authorized Hospital Portal'}
            </div>
            <h3 className="header-3d" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {/portal$/i.test(currentRoleObj.name || '') ? currentRoleObj.name : `${currentRoleObj.name} Portal`}
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#e5e7eb', marginTop: '4px' }}>
              {currentRoleObj.desc}
            </p>
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  border: '2px solid var(--gold-400)',
                  overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.85)',
                  flexShrink: 0
                }}
              >
                <img
                  src={currentRoleObj.img}
                  alt={currentRoleObj.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = '/assets/images/portrait_doctor.jpg';
                  }}
                />
              </div>
              <div
                style={{
                  width: '110px',
                  height: '74px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-gold)',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.8)',
                  flexShrink: 0
                }}
              >
                <img
                  src={currentRoleObj.loginBg || currentRoleObj.img}
                  alt={currentRoleObj.dept || currentRoleObj.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = '/assets/images/hospital_hero_exterior.jpg';
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gold-400)', fontWeight: 700 }}>
              Hospital Staff Authentication • {currentRoleObj.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              Verified PostgreSQL Sessions • Role-Based Access • Full Audit Trail
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form (GBS Hospital Obsidian Navy) */}
        <div
          style={{
            padding: '28px 30px',
            position: 'relative',
            background: 'rgba(15, 27, 49, 0.96)',
            overflowY: 'auto'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>

          <h2 className="header-3d" style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '6px' }}>
            {isForgot
              ? 'Reset Account Password'
              : isSignUp
                ? 'Request Hospital Role Account'
                : 'Sign In to Your Workspace'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {isForgot
              ? 'Request a single-use recovery code verified against the hospital database.'
              : isSignUp
                ? 'Select your clinical or operational role. Administrator approval is required before activation.'
                : 'Enter your registered email and password to access authorized hospital modules.'}
          </p>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                fontSize: '0.82rem',
                marginBottom: '14px'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                color: '#6ee7b7',
                fontSize: '0.82rem',
                marginBottom: '14px'
              }}
            >
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!isForgot && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--gold-400)', fontWeight: 700, letterSpacing: '0.04em' }}>
                    SELECT HOSPITAL ROLE PORTAL *
                  </label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    Selected: <strong style={{ color: 'var(--gold-300)' }}>{currentRoleObj.name}</strong>
                  </span>
                </div>

                {/* Category Filter Tabs */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {ROLE_CATEGORIES.map((cat) => {
                    const isSelected = modalRoleCategory === cat.id;
                    const catCount =
                      cat.id === 'ALL'
                        ? selectableRoles.length
                        : selectableRoles.filter((r) => r.category === cat.id).length;
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

                <select
                  value={selectedRole}
                  onChange={(e) => handleSelectRoleOption(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    background: 'rgba(6, 12, 24, 0.88)',
                    border: '1px solid var(--border-gold)',
                    color: '#fff',
                    fontSize: '0.82rem',
                    marginBottom: '8px'
                  }}
                >
                  {selectableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.dept || r.desc}
                    </option>
                  ))}
                </select>

                {/* Visual Role Cards Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '6px',
                    maxHeight: '132px',
                    overflowY: 'auto',
                    padding: '6px',
                    background: 'rgba(6, 12, 24, 0.75)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {selectableRoles
                    .filter((r) => modalRoleCategory === 'ALL' || r.category === modalRoleCategory)
                    .map((r) => {
                      const active = selectedRole === r.id;
                      return (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => handleSelectRoleOption(r.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: active ? '1.5px solid var(--gold-light)' : '1px solid var(--border-subtle)',
                            background: active
                              ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(15, 27, 49, 0.95) 100%)'
                              : 'rgba(15, 27, 49, 0.78)',
                            color: active ? '#fff' : '#d1d5db',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
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
                              border: active ? '1.5px solid var(--gold-light)' : '1px solid var(--border-subtle)',
                              flexShrink: 0
                            }}
                            onError={(e) => {
                              e.target.src = '/assets/images/portrait_doctor.jpg';
                            }}
                          />
                          <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div
                              style={{
                                fontSize: '0.74rem',
                                fontWeight: active ? 700 : 500,
                                color: active ? 'var(--gold-300)' : '#fff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {r.name}
                            </div>
                            <div
                              style={{
                                fontSize: '0.62rem',
                                color: active ? 'var(--gold-400)' : 'var(--text-dim)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {r.dept}
                            </div>
                          </div>
                          {active && <Check size={12} style={{ color: 'var(--gold-light)', flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Strictly Backend-Gated Supervised Training Session (NEVER rendered in production when DEMO_MODE_ENABLED=false, zero passwords on client) */}
            {mode === 'signin' && demoModeEnabled && selectedRole !== 'DEVELOPER' && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.14) 0%, rgba(15, 27, 49, 0.95) 100%)',
                  border: '1px solid var(--border-gold)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gold-400)', fontWeight: 700 }}>
                    Interactive Learning Demo (10-Entry Trial) • {currentRoleObj.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Works identically to live production, limited to 10 saved trial entries (Developer excluded)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStartSupervisedDemo}
                  disabled={loading}
                  className="btn-outline-gold"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.76rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Zap size={13} /> Start 10-Entry Demo Trial
                </button>
              </div>
            )}

            {isSignUp && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Samuel"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(6, 12, 24, 0.88)',
                        border: '1px solid var(--border-subtle)',
                        color: '#fff',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Mensah"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(6, 12, 24, 0.88)',
                        border: '1px solid var(--border-subtle)',
                        color: '#fff',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +233 24 000 0000"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(6, 12, 24, 0.88)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Official Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.org"
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '6px',
                    background: 'rgba(6, 12, 24, 0.88)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            {!isForgot && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Password *</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setSuccessMsg(null);
                        setResetRequested(false);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--gold-400)',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
                  <input
                    type="password"
                    required
                    minLength={isSignUp ? 8 : 1}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: '6px',
                      background: 'rgba(6, 12, 24, 0.88)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>
            )}

            {isForgot && resetRequested && (
              <>
                {devResetHint && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(212,175,55,0.12)',
                      border: '1px solid var(--gold-400)',
                      fontSize: '0.76rem',
                      color: 'var(--gold-300)'
                    }}
                  >
                    Development Recovery Code: <strong style={{ fontFamily: 'var(--font-mono)' }}>{devResetHint}</strong>
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    8-Character Recovery Token *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
                    <input
                      type="text"
                      required
                      value={resetTokenInput}
                      onChange={(e) => setResetTokenInput(e.target.value)}
                      placeholder="Enter recovery code"
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 36px',
                        borderRadius: '6px',
                        background: 'rgba(6, 12, 24, 0.88)',
                        border: '1px solid var(--border-gold)',
                        color: '#fff',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      New Password (min 8 chars) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="New password"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(6, 12, 24, 0.88)',
                        border: '1px solid var(--border-subtle)',
                        color: '#fff',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm password"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(6, 12, 24, 0.88)',
                        border: '1px solid var(--border-subtle)',
                        color: '#fff',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gold"
              style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '4px' }}
            >
              {loading
                ? 'Processing...'
                : isForgot
                  ? resetRequested
                    ? 'Verify Code & Update Password'
                    : 'Generate Recovery Token'
                  : isSignUp
                    ? 'Submit Registration for Approval'
                    : 'Authenticate & Open Dashboard'}
            </button>
          </form>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isForgot ? (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setResetRequested(false);
                  setError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gold-400)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            ) : isSignUp ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--gold-400)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                New hospital staff?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--gold-400)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Sign Up for a Role
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
