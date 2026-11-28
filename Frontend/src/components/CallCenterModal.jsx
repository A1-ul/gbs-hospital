import React, { useEffect, useState } from 'react';
import {
  Phone, Video, Users, Search, RefreshCw, X, PlusCircle, LogIn,
  Clock, CheckCircle, AlertCircle, Radio, PhoneCall
} from 'lucide-react';
import { api } from '../services/api.service';

const ROLE_FILTERS = [
  { id: 'ALL', label: 'Everyone' },
  { id: 'DOCTOR', label: 'Doctors' },
  { id: 'NURSE', label: 'Nurses' },
  { id: 'RECEPTIONIST', label: 'Front Desk' },
  { id: 'PHARMACIST', label: 'Pharmacy' },
  { id: 'ADMINISTRATOR', label: 'Admin' },
  { id: 'PATIENT', label: 'Patients & Family' },
];

/**
 * GBS Family-Friendly Voice & Video Call Hub
 * Lets every signed-in user easily reach any other user by Voice or Video Call,
 * start an instant Multi-Camera Conference Meeting, or join a live room by code.
 */
export default function CallCenterModal({
  isOpen,
  onClose,
  currentUser,
  onOpenLogin,
  onOpenLiveRoom,
}) {
  const [activeTab, setActiveTab] = useState('PEOPLE'); // PEOPLE | CONFERENCES | HISTORY
  const [contacts, setContacts] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [directCalls, setDirectCalls] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [quickNote, setQuickNote] = useState('');

  // Conference creation & join state
  const [confTitle, setConfTitle] = useState('');
  const [confMode, setConfMode] = useState('VIDEO');
  const [invitedIds, setInvitedIds] = useState([]);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [busyActionId, setBusyActionId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadHubData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [dirRes, callsRes] = await Promise.all([
        api.getCallDirectory({ role: roleFilter === 'ALL' ? '' : roleFilter }).catch(() => ({ contacts: [], onlineCount: 0 })),
        api.getCallsAndConferences(40).catch(() => ({ directCalls: [], conferences: [] })),
      ]);
      setContacts(Array.isArray(dirRes?.contacts) ? dirRes.contacts : []);
      setOnlineCount(dirRes?.onlineCount ?? 0);
      setDirectCalls(Array.isArray(callsRes?.directCalls) ? callsRes.directCalls : []);
      setConferences(Array.isArray(callsRes?.conferences) ? callsRes.conferences : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      setFeedback(null);
      loadHubData();
    }
  }, [isOpen, currentUser, roleFilter]);

  if (!isOpen) return null;

  const filteredContacts = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      String(c.name || '').toLowerCase().includes(q) ||
      String(c.roleLabel || '').toLowerCase().includes(q) ||
      String(c.department || '').toLowerCase().includes(q) ||
      String(c.email || '').toLowerCase().includes(q)
    );
  });

  const handleStartDirectCall = async (contact, callMode) => {
    setBusyActionId(`${contact.id}:${callMode}`);
    setFeedback(null);
    try {
      const res = await api.initiateDirectCall({
        calleeId: contact.id,
        callMode,
        note: quickNote.trim() || undefined,
      });
      const callObj = res?.call || {};
      const session = {
        ...callObj,
        ...(res?.webrtcSession || {}),
        roomCode: res?.webrtcSession?.roomCode || callObj.roomCode,
        callMode,
        kind: 'DIRECT_CALL',
        roomTitle: `${callMode === 'VOICE' ? 'Voice' : 'Video'} Call with ${contact.name}`,
      };
      setQuickNote('');
      if (onOpenLiveRoom) {
        onOpenLiveRoom(session);
      }
      if (onClose) onClose();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Could not start call.' });
    } finally {
      setBusyActionId(null);
    }
  };

  const handleCreateConference = async (e) => {
    e.preventDefault();
    if (!confTitle.trim()) return;
    setBusyActionId('CREATE_CONF');
    setFeedback(null);
    try {
      const res = await api.createConferenceRoom({
        title: confTitle.trim(),
        callMode: confMode,
        meetingType: 'FAMILY_CARE_CONFERENCE',
        invitedUserIds: invitedIds,
        startImmediately: true,
      });
      const confObj = res?.conference || {};
      const session = {
        ...confObj,
        ...(res?.webrtcSession || {}),
        roomCode: res?.webrtcSession?.roomCode || confObj.roomCode,
        callMode: confMode,
        kind: 'CONFERENCE',
        roomTitle: confObj.title || confTitle.trim(),
      };
      setConfTitle('');
      setInvitedIds([]);
      if (onOpenLiveRoom) {
        onOpenLiveRoom(session);
      }
      if (onClose) onClose();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Could not start conference room.' });
    } finally {
      setBusyActionId(null);
    }
  };

  const handleJoinRoom = async (roomCode, callMode = 'VIDEO', fallbackTitle = '') => {
    const cleanCode = String(roomCode || '').trim();
    if (!cleanCode) return;
    setBusyActionId(`JOIN:${cleanCode}:${callMode}`);
    setFeedback(null);
    try {
      const res = await api.joinCommunicationRoom(cleanCode, { callMode });
      const roomObj = res?.room || {};
      const session = {
        ...roomObj,
        ...(res?.webrtcSession || {}),
        roomCode: res?.webrtcSession?.roomCode || roomObj.roomCode || cleanCode,
        callMode,
        kind: roomObj.kind || 'CONFERENCE',
        roomTitle: roomObj.title || fallbackTitle || `Live Room ${cleanCode}`,
      };
      setJoinCodeInput('');
      if (onOpenLiveRoom) {
        onOpenLiveRoom(session);
      }
      if (onClose) onClose();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Could not join room. Check the room code and try again.' });
    } finally {
      setBusyActionId(null);
    }
  };

  const toggleInvite = (userId) => {
    setInvitedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div
      role="dialog"
      aria-label="GBS Voice and Video Call Hub"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(4, 10, 22, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1.5px solid #c29b4f',
          background: '#091830',
          boxShadow: '0 24px 64px rgba(0,0,0,0.9)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(194, 155, 79, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: '1.5px solid #c29b4f',
                background: '#091830',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/gbs-official-logo.png"
                alt="GBS Official Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: '6px' }}
              />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#e7cf88' }}>
                GBS Voice, Video Calls &amp; Live Camera Meetings
              </h2>
              <div style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                Reach anyone in the hospital easily in one tap — voice calls, face-to-face video calls, or group camera meetings.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentUser && (
              <button
                type="button"
                onClick={loadHubData}
                aria-label="Refresh call directory"
                className="btn-outline-gold"
                style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <RefreshCw size={13} /> Refresh
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close voice and video call hub"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: '8px',
                color: '#f7f5ef',
                padding: '6px',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {!currentUser ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <PhoneCall size={42} style={{ color: '#e7cf88' }} />
            <h3 style={{ margin: 0, color: '#f7f5ef', fontSize: '1.15rem' }}>
              Sign In to Call Colleagues, Care Teams &amp; Patients
            </h3>
            <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.86rem', maxWidth: '460px' }}>
              Voice calls, video calls, and multi-camera meetings connect directly to your verified hospital account so everyone knows who is calling.
            </p>
            <button
              type="button"
              onClick={() => {
                if (onClose) onClose();
                if (onOpenLogin) onOpenLogin();
              }}
              className="btn-gold"
              style={{ padding: '10px 22px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <LogIn size={16} /> Sign In Now
            </button>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                flexWrap: 'wrap',
                background: 'rgba(6, 15, 31, 0.7)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('PEOPLE')}
                className={activeTab === 'PEOPLE' ? 'btn-gold' : 'btn-outline-gold'}
                style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Phone size={14} /> People &amp; Quick Call ({contacts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CONFERENCES')}
                className={activeTab === 'CONFERENCES' ? 'btn-gold' : 'btn-outline-gold'}
                style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Video size={14} /> Camera Conferences ({conferences.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('HISTORY')}
                className={activeTab === 'HISTORY' ? 'btn-gold' : 'btn-outline-gold'}
                style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Clock size={14} /> Recent Calls ({directCalls.length})
              </button>
              <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6ee7b7', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={13} /> {onlineCount} Online Now
              </div>
            </div>

            {feedback && (
              <div
                style={{
                  margin: '12px 20px 0',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.16)' : 'rgba(16, 185, 129, 0.16)',
                  border: `1px solid ${feedback.type === 'error' ? '#ef4444' : '#10b981'}`,
                  color: feedback.type === 'error' ? '#fca5a5' : '#6ee7b7',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {feedback.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {activeTab === 'PEOPLE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search person by name, role, or email..."
                        aria-label="Search people to call"
                        style={{ width: '100%', padding: '9px 12px 9px 36px', fontSize: '0.84rem' }}
                      />
                    </div>
                    <input
                      type="text"
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      placeholder="Optional call note (e.g. Ward B patient update)"
                      aria-label="Optional message shown when calling"
                      style={{ width: '100%', padding: '9px 12px', fontSize: '0.84rem' }}
                    />
                  </div>

                  {/* Role Filter Pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {ROLE_FILTERS.map((rf) => (
                      <button
                        key={rf.id}
                        type="button"
                        onClick={() => setRoleFilter(rf.id)}
                        className={roleFilter === rf.id ? 'btn-gold' : 'btn-outline-gold'}
                        style={{ padding: '4px 10px', fontSize: '0.73rem', borderRadius: '999px' }}
                      >
                        {rf.label}
                      </button>
                    ))}
                  </div>

                  {/* Contacts List */}
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '28px', color: '#cbd5e1', fontSize: '0.86rem' }}>
                      Loading hospital contacts...
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px', color: '#cbd5e1', fontSize: '0.86rem' }}>
                      No matching contacts found. Try clearing your search or selecting &ldquo;Everyone&rdquo;.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))', gap: '10px' }}>
                      {filteredContacts.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.04)',
                            border: c.isOnline ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f7f5ef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.name}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#e7cf88' }}>
                                {c.roleLabel} • {c.department}
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: c.isOnline ? 'rgba(16, 185, 129, 0.18)' : 'rgba(148, 163, 184, 0.14)',
                                color: c.isOnline ? '#6ee7b7' : '#cbd5e1',
                                flexShrink: 0,
                              }}
                            >
                              {c.isOnline ? 'Online' : 'Available'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              disabled={busyActionId !== null}
                              onClick={() => handleStartDirectCall(c, 'VOICE')}
                              aria-label={`Voice call ${c.name}`}
                              style={{
                                flex: 1,
                                padding: '7px 10px',
                                borderRadius: '8px',
                                border: '1px solid #10b981',
                                background: 'rgba(16, 185, 129, 0.18)',
                                color: '#6ee7b7',
                                fontWeight: 700,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                              }}
                            >
                              <Phone size={13} />
                              {busyActionId === `${c.id}:VOICE` ? 'Calling...' : 'Voice Call'}
                            </button>
                            <button
                              type="button"
                              disabled={busyActionId !== null}
                              onClick={() => handleStartDirectCall(c, 'VIDEO')}
                              aria-label={`Video call ${c.name}`}
                              className="btn-gold"
                              style={{
                                flex: 1,
                                padding: '7px 10px',
                                borderRadius: '8px',
                                fontSize: '0.76rem',
                                justifyContent: 'center',
                              }}
                            >
                              <Video size={13} />
                              {busyActionId === `${c.id}:VIDEO` ? 'Calling...' : 'Video Call'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'CONFERENCES' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Start Instant Multi-Camera Conference */}
                  <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(194, 155, 79, 0.45)' }}>
                    <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: '#e7cf88' }}>
                      Start Instant Multi-Camera Conference Meeting
                    </h3>
                    <form onSubmit={handleCreateConference} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                        <input
                          required
                          type="text"
                          value={confTitle}
                          onChange={(e) => setConfTitle(e.target.value)}
                          placeholder="Meeting Name (e.g. Ward Care Team & Family Catch-Up) *"
                          aria-label="Conference meeting name"
                        />
                        <select
                          value={confMode}
                          onChange={(e) => setConfMode(e.target.value)}
                          aria-label="Conference call mode"
                        >
                          <option value="VIDEO">Live Camera Video + Voice (See Everyone)</option>
                          <option value="VOICE">Voice-Only Group Call</option>
                        </select>
                        <button
                          type="submit"
                          disabled={busyActionId !== null}
                          className="btn-gold"
                          style={{ justifyContent: 'center' }}
                        >
                          <PlusCircle size={15} />
                          {busyActionId === 'CREATE_CONF' ? 'Starting Room...' : 'Start & Open Camera'}
                        </button>
                      </div>

                      {contacts.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginBottom: '6px' }}>
                            Optional: Tap people to send them an instant live invitation ({invitedIds.length} selected)
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '84px', overflowY: 'auto' }}>
                            {contacts.slice(0, 20).map((c) => {
                              const picked = invitedIds.includes(c.id);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => toggleInvite(c.id)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '999px',
                                    border: picked ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.16)',
                                    background: picked ? 'rgba(16, 185, 129, 0.22)' : 'rgba(255,255,255,0.04)',
                                    color: picked ? '#6ee7b7' : '#e2e8f0',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {picked ? '✓ ' : '+ '}
                                  {c.name} ({c.roleLabel})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Join by Room Code */}
                  <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      placeholder="Have a Room Code? (e.g. CONF-2026-XXXXXX or MTG-...)"
                      aria-label="Enter conference room code to join"
                      style={{ flex: '1 1 240px', padding: '8px 12px', fontSize: '0.84rem' }}
                    />
                    <button
                      type="button"
                      disabled={!joinCodeInput.trim() || busyActionId !== null}
                      onClick={() => handleJoinRoom(joinCodeInput, 'VIDEO')}
                      className="btn-gold"
                      style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                    >
                      <Video size={14} /> Join with Camera
                    </button>
                    <button
                      type="button"
                      disabled={!joinCodeInput.trim() || busyActionId !== null}
                      onClick={() => handleJoinRoom(joinCodeInput, 'VOICE')}
                      className="btn-outline-gold"
                      style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                    >
                      <Phone size={14} /> Join Voice Only
                    </button>
                  </div>

                  {/* Active & Scheduled Conferences */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem', color: '#e7cf88' }}>
                      Live &amp; Scheduled Conference Rooms
                    </h4>
                    {conferences.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                        No conference meetings yet. Start one above in seconds!
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {conferences.map((m) => (
                          <div
                            key={m.id}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '10px',
                              background: 'rgba(255,255,255,0.04)',
                              border: m.status === 'LIVE' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '10px',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <strong style={{ color: '#f7f5ef', fontSize: '0.88rem' }}>{m.title}</strong>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#e7cf88' }}>{m.roomCode}</span>
                                <span className={m.status === 'LIVE' ? 'badge badge-success' : 'badge badge-gold'}>{m.status}</span>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '2px' }}>
                                Host: {m.organizerName || 'Hospital Staff'} • {m.activeParticipantCount || 0} live on camera now
                              </div>
                            </div>
                            {m.status !== 'COMPLETED' && m.status !== 'CANCELLED' && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  disabled={busyActionId !== null}
                                  onClick={() => handleJoinRoom(m.roomCode, 'VIDEO', m.title)}
                                  className="btn-gold"
                                  style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                                >
                                  <Video size={13} /> Join Camera
                                </button>
                                <button
                                  type="button"
                                  disabled={busyActionId !== null}
                                  onClick={() => handleJoinRoom(m.roomCode, 'VOICE', m.title)}
                                  className="btn-outline-gold"
                                  style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                                >
                                  <Phone size={13} /> Voice
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'HISTORY' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {directCalls.length === 0 ? (
                    <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                      No recent calls yet. Pick someone in &ldquo;People &amp; Quick Call&rdquo; to make your first voice or video call.
                    </div>
                  ) : (
                    directCalls.map((call) => {
                      const isOutgoing = String(call.caller?.userId || '') === String(currentUser.id);
                      const otherPerson = isOutgoing ? call.callee : call.caller;
                      return (
                        <div
                          key={call.id}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <strong style={{ color: '#f7f5ef', fontSize: '0.88rem' }}>
                                {otherPerson?.name || call.title}
                              </strong>
                              <span style={{ fontSize: '0.7rem', color: '#e7cf88' }}>
                                {isOutgoing ? 'Outgoing' : 'Incoming'} {call.callMode === 'VOICE' ? 'Voice' : 'Video'}
                              </span>
                              <span className={call.status === 'LIVE' ? 'badge badge-success' : 'badge badge-gold'}>
                                {call.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '2px' }}>
                              {new Date(call.scheduledStart).toLocaleString()} {call.minutesSummary ? `• ${call.minutesSummary}` : ''}
                            </div>
                          </div>

                          {otherPerson?.userId && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                disabled={busyActionId !== null}
                                onClick={() => handleStartDirectCall({ id: otherPerson.userId, name: otherPerson.name }, 'VOICE')}
                                className="btn-outline-gold"
                                style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                              >
                                <Phone size={12} /> Voice
                              </button>
                              <button
                                type="button"
                                disabled={busyActionId !== null}
                                onClick={() => handleStartDirectCall({ id: otherPerson.userId, name: otherPerson.name }, 'VIDEO')}
                                className="btn-gold"
                                style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                              >
                                <Video size={12} /> Video
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
