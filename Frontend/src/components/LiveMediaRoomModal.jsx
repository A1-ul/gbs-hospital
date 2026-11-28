import React, { useEffect, useRef, useState } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, MonitorUp, MonitorOff,
  Users, Copy, Check, RefreshCw, PhoneCall, ShieldCheck, X, Volume2, Radio
} from 'lucide-react';
import { api } from '../services/api.service';
import { createWebRtcRoomClient } from '../services/webrtc.service';

function MediaVideoElement({ stream, muted = false, mirror = false, ariaLabel }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream || null;
    }
    if (stream && typeof el.play === 'function') {
      el.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      aria-label={ariaLabel}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        transform: mirror ? 'scaleX(-1)' : 'none',
        background: '#050b16',
      }}
    />
  );
}

function RemoteAudioElement({ stream }) {
  const audioRef = useRef(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream || null;
    }
    if (stream && typeof el.play === 'function') {
      el.play().catch(() => {});
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />;
}

function getInitials(name) {
  const parts = String(name || 'GBS').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'GB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatElapsed(seconds) {
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

/**
 * GBS Live Multi-Camera WebRTC Room & Voice/Video Call Modal
 * Lets users clearly see THEMSELVES on camera (Self-View) AND see EVERY other participant
 * live on camera side-by-side, or talk smoothly in Voice-Only mode with instant feedback.
 */
export default function LiveMediaRoomModal({
  session,
  currentUser,
  onClose,
  onSessionEnded,
}) {
  const roomCode = session?.roomCode || session?.meetingCode || '';
  const initialCallMode = String(session?.callMode || 'VIDEO').toUpperCase();
  const isDirectCall = session?.kind === 'DIRECT_CALL';

  const clientRef = useRef(null);
  const [roomState, setRoomState] = useState({
    localStream: null,
    screenStream: null,
    audioEnabled: true,
    videoEnabled: initialCallMode === 'VIDEO',
    screenSharing: false,
    mediaStatus: 'INITIALIZING',
    mediaNotice: 'Starting your camera and microphone...',
    participants: Array.isArray(session?.activeParticipants) ? session.activeParticipants : [],
    remotePeers: [],
  });
  const [liveStatusBanner, setLiveStatusBanner] = useState(
    session?.status === 'RINGING'
      ? `Calling ${session?.callee?.name || 'recipient'} — ringing now...`
      : `Connected to live room ${roomCode}`
  );
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [ending, setEnding] = useState(false);

  const selfUserId = String(currentUser?.id || session?.selfUserId || '');
  const selfDisplayName = currentUser
    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || 'You'
    : session?.joinedAs || 'You';
  const selfRole = currentUser?.role || 'USER';

  // Live call duration timer
  useEffect(() => {
    if (!roomCode) return undefined;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [roomCode]);

  // Boot WebRTC Multi-Peer Room Client & bind real-time SSE events
  useEffect(() => {
    if (!roomCode || !selfUserId) return undefined;

    const client = createWebRtcRoomClient({
      roomCode,
      selfUserId,
      iceServers: session?.iceServers,
      initialCallMode,
      sendSignal: (code, sigPayload) => api.sendRoomSignal(code, sigPayload),
      pollSignals: (code, query) => api.pollRoomSignals(code, query),
      onStateChange: (nextState) => {
        setRoomState(nextState);
        if (nextState.remotePeers.length > 0) {
          setLiveStatusBanner(
            `Live with ${nextState.remotePeers.length} other participant${nextState.remotePeers.length === 1 ? '' : 's'} — Camera & Audio Connected`
          );
        }
      },
      onFeedback: ({ type, message }) => {
        setFeedbackNotice({ type, message });
      },
    });
    clientRef.current = client;

    client.start(session?.activeParticipants || []);

    const onSseSignal = (ev) => {
      const detail = ev?.detail;
      if (detail && detail.roomCode === roomCode && detail.signal) {
        client.handleIncomingSignal(detail.signal);
      }
    };

    const onSsePresence = (ev) => {
      const detail = ev?.detail;
      if (detail && detail.roomCode === roomCode && Array.isArray(detail.participants)) {
        client.syncParticipants(detail.participants);
        if (detail.type === 'PARTICIPANT_JOINED' && detail.participant) {
          setFeedbackNotice({
            type: 'success',
            message: `${detail.participant.name} joined the camera room.`,
          });
        } else if (detail.type === 'PARTICIPANT_LEFT') {
          setFeedbackNotice({
            type: 'info',
            message: 'A participant left the room.',
          });
        }
      }
    };

    const onSseCallEvent = (ev) => {
      const detail = ev?.detail;
      const evCode = detail?.call?.roomCode || detail?.call?.meetingCode;
      if (!detail || evCode !== roomCode) return;

      if (detail.type === 'CALL_ACCEPTED') {
        setLiveStatusBanner(
          `${detail.acceptedBy?.name || 'Participant'} answered — connecting live camera & audio...`
        );
        setFeedbackNotice({
          type: 'success',
          message: `${detail.acceptedBy?.name || 'Recipient'} answered your call.`,
        });
        if (Array.isArray(detail.activeParticipants)) {
          client.syncParticipants(detail.activeParticipants);
        } else {
          client.runPollCycle();
        }
      } else if (detail.type === 'CALL_DECLINED' || detail.type === 'CALL_CANCELLED') {
        const msg = detail.reason || `${detail.by?.name || 'Recipient'} declined the call.`;
        setFeedbackNotice({ type: 'warning', message: msg });
        if (typeof window !== 'undefined' && typeof window.gbsBrainNotify === 'function') {
          window.gbsBrainNotify({
            type: 'info',
            method: 'CALL',
            code: 'CALL_DECLINED',
            title: 'Call Not Answered',
            message: msg,
            forceToast: true,
          });
        }
        client.destroy();
        if (onSessionEnded) onSessionEnded({ roomCode, reason: msg });
      } else if (detail.type === 'CALL_ENDED') {
        const msg = `${detail.endedBy?.name || 'Other participant'} ended the call (${formatElapsed(detail.durationSeconds || elapsedSeconds)}).`;
        if (typeof window !== 'undefined' && typeof window.gbsBrainNotify === 'function') {
          window.gbsBrainNotify({
            type: 'info',
            method: 'CALL',
            code: 'CALL_ENDED',
            title: 'Call Ended',
            message: msg,
            forceToast: true,
          });
        }
        client.destroy();
        if (onSessionEnded) onSessionEnded({ roomCode, reason: msg });
      }
    };

    window.addEventListener('gbs:webrtc_signal', onSseSignal);
    window.addEventListener('gbs:room_presence', onSsePresence);
    window.addEventListener('gbs:call_event', onSseCallEvent);

    return () => {
      window.removeEventListener('gbs:webrtc_signal', onSseSignal);
      window.removeEventListener('gbs:room_presence', onSsePresence);
      window.removeEventListener('gbs:call_event', onSseCallEvent);
      client.destroy();
      clientRef.current = null;
    };
  }, [roomCode, selfUserId]);

  if (!session || !roomCode) return null;

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(roomCode).catch(() => {});
    }
    setCopiedCode(true);
    setFeedbackNotice({ type: 'success', message: `Room code ${roomCode} copied! Share it so others can join live.` });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLeaveOnly = async () => {
    setEnding(true);
    try {
      clientRef.current?.destroy();
      await api.leaveCommunicationRoom(roomCode).catch(() => {});
    } finally {
      setEnding(false);
      if (onClose) onClose();
    }
  };

  const handleEndForAll = async () => {
    setEnding(true);
    try {
      clientRef.current?.destroy();
      if (session?.status === 'RINGING' && roomState.remotePeers.length === 0) {
        await api.declineDirectCall(roomCode, { reason: 'Call cancelled by caller.' }).catch(() => {});
      } else {
        await api.endDirectCall(roomCode, {
          minutesSummary: `Completed after ${formatElapsed(elapsedSeconds)}.`,
        }).catch(() => {});
      }
    } finally {
      setEnding(false);
      if (onSessionEnded) onSessionEnded({ roomCode, durationSeconds: elapsedSeconds });
      else if (onClose) onClose();
    }
  };

  const totalVideoTiles = 1 + roomState.remotePeers.length;
  const gridColumns =
    totalVideoTiles === 1
      ? 'minmax(280px, 760px)'
      : totalVideoTiles === 2
        ? 'repeat(auto-fit, minmax(300px, 1fr))'
        : 'repeat(auto-fit, minmax(260px, 1fr))';

  const localHasLiveVideo = Boolean(
    (roomState.screenSharing && roomState.screenStream) ||
    (roomState.localStream && roomState.videoEnabled && roomState.localStream.getVideoTracks().length > 0)
  );
  const localDisplayStream = roomState.screenSharing && roomState.screenStream
    ? roomState.screenStream
    : roomState.localStream;

  return (
    <div
      role="dialog"
      aria-label={`Live Call Room ${roomCode}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        background: 'rgba(5, 11, 22, 0.96)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        color: '#f7f5ef',
      }}
    >
      {/* Top Room Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '12px 20px',
          background: '#091830',
          borderBottom: '1.5px solid rgba(194, 155, 79, 0.55)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              border: '1.5px solid #c29b4f',
              background: '#091830',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src="/gbs-official-logo.png"
              alt="GBS Official Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: '5px' }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                className="pulse-live"
                style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}
              />
              <strong style={{ fontSize: '0.98rem', color: '#e7cf88' }}>
                {session.roomTitle || session.heading || session.title || `GBS Live Room ${roomCode}`}
              </strong>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(194, 155, 79, 0.16)',
                  border: '1px solid rgba(194, 155, 79, 0.5)',
                  color: '#e7cf88',
                }}
              >
                {roomCode}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>
              {liveStatusBanner}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.16)',
              border: '1px solid rgba(16, 185, 129, 0.45)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#6ee7b7',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Radio size={13} /> {formatElapsed(elapsedSeconds)}
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            aria-label="Copy room code to invite others"
            className="btn-outline-gold"
            style={{ padding: '5px 10px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            {copiedCode ? <Check size={14} /> : <Copy size={14} />}
            {copiedCode ? 'Code Copied' : 'Share Code'}
          </button>

          <button
            type="button"
            onClick={() => setShowParticipantsPanel((p) => !p)}
            aria-label="Toggle live participants list"
            className="btn-outline-gold"
            style={{ padding: '5px 10px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <Users size={14} /> People ({Math.max(1, roomState.remotePeers.length + 1)})
          </button>
        </div>
      </div>

      {/* Live Status / Device Feedback Strip */}
      {(feedbackNotice || roomState.mediaStatus === 'BLOCKED' || roomState.mediaStatus === 'AUDIO_ONLY_FALLBACK') && (
        <div
          style={{
            padding: '8px 20px',
            background:
              feedbackNotice?.type === 'warning' || roomState.mediaStatus === 'BLOCKED'
                ? 'rgba(245, 158, 11, 0.16)'
                : feedbackNotice?.type === 'success'
                  ? 'rgba(16, 185, 129, 0.14)'
                  : 'rgba(56, 189, 248, 0.12)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '0.8rem',
          }}
        >
          <span style={{ color: '#f7f5ef' }}>
            {feedbackNotice?.message || roomState.mediaNotice}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(roomState.mediaStatus === 'BLOCKED' || roomState.mediaStatus === 'AUDIO_ONLY_FALLBACK' || !roomState.localStream) && (
              <button
                type="button"
                onClick={() => clientRef.current?.startLocalMedia('VIDEO')}
                className="btn-gold"
                style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <RefreshCw size={13} /> Retry Camera &amp; Mic
              </button>
            )}
            {feedbackNotice && (
              <button
                type="button"
                onClick={() => setFeedbackNotice(null)}
                aria-label="Dismiss call feedback banner"
                style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Live Camera Stage + Optional Participants Drawer */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <div
          style={{
            flex: 1,
            padding: '18px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '1280px',
              display: 'grid',
              gridTemplateColumns: gridColumns,
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            {/* TILE 1: LOCAL SELF-VIEW CAMERA (Always clearly visible so user sees themselves!) */}
            <div
              style={{
                position: 'relative',
                aspectRatio: '16 / 9',
                minHeight: '220px',
                borderRadius: '14px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #091830 0%, #102447 100%)',
                border: '2px solid #c29b4f',
                boxShadow: '0 14px 34px rgba(0,0,0,0.65)',
              }}
            >
              {localHasLiveVideo ? (
                <MediaVideoElement
                  stream={localDisplayStream}
                  muted
                  mirror={!roomState.screenSharing}
                  ariaLabel="Your live self-view camera"
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '20px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '78px',
                      height: '78px',
                      borderRadius: '50%',
                      background: 'rgba(194, 155, 79, 0.22)',
                      border: '2px solid #e7cf88',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: '#e7cf88',
                    }}
                  >
                    {getInitials(selfDisplayName)}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f7f5ef' }}>
                    {selfDisplayName} (You)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', maxWidth: '300px' }}>
                    {roomState.mediaStatus === 'VOICE_READY'
                      ? 'Voice-Only Call Active — tap Turn Camera On below anytime to show video.'
                      : roomState.mediaNotice}
                  </div>
                </div>
              )}

              {/* Self-View Overlay Badges */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'rgba(9, 24, 48, 0.86)',
                  border: '1px solid rgba(231, 207, 136, 0.5)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#e7cf88',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldCheck size={13} /> You ({selfRole.replace(/_/g, ' ')})
              </div>

              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  right: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(9, 24, 48, 0.85)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    color: '#f7f5ef',
                  }}
                >
                  {roomState.screenSharing
                    ? 'Sharing Your Screen'
                    : localHasLiveVideo
                      ? 'Your Camera — Live Self-View'
                      : roomState.audioEnabled
                        ? 'Your Microphone — Live'
                        : 'Mic & Camera Off'}
                </span>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '8px',
                      background: roomState.audioEnabled ? 'rgba(16, 185, 129, 0.88)' : 'rgba(239, 68, 68, 0.9)',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {roomState.audioEnabled ? <Mic size={12} /> : <MicOff size={12} />}
                    {roomState.audioEnabled ? 'Mic On' : 'Muted'}
                  </span>
                </div>
              </div>
            </div>

            {/* REMOTE PARTICIPANT LIVE CAMERA TILES */}
            {roomState.remotePeers.map((peer) => (
              <div
                key={peer.userId}
                style={{
                  position: 'relative',
                  aspectRatio: '16 / 9',
                  minHeight: '220px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #0b1b36 0%, #162d54 100%)',
                  border: '1.5px solid rgba(56, 189, 248, 0.55)',
                  boxShadow: '0 14px 34px rgba(0,0,0,0.65)',
                }}
              >
                {peer.stream && peer.hasVideo ? (
                  <MediaVideoElement
                    stream={peer.stream}
                    muted={false}
                    mirror={false}
                    ariaLabel={`Live camera video of ${peer.name}`}
                  />
                ) : (
                  <>
                    {peer.stream && <RemoteAudioElement stream={peer.stream} />}
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '20px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '78px',
                          height: '78px',
                          borderRadius: '50%',
                          background: 'rgba(56, 189, 248, 0.2)',
                          border: '2px solid #38bdf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          fontWeight: 800,
                          color: '#bae6fd',
                        }}
                      >
                        {getInitials(peer.name)}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f7f5ef' }}>
                        {peer.name}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#93c5fd', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Volume2 size={14} />
                        {peer.connectionState === 'connected'
                          ? (peer.videoEnabled ? 'Connected — Waiting for camera video...' : 'Voice Connected (Camera Off)')
                          : `Connecting live audio & camera (${peer.connectionState})...`}
                      </div>
                    </div>
                  </>
                )}

                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: 'rgba(9, 24, 48, 0.86)',
                    border: '1px solid rgba(56, 189, 248, 0.45)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#bae6fd',
                  }}
                >
                  {peer.name} • {String(peer.role || 'STAFF').replace(/_/g, ' ')}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(9, 24, 48, 0.85)',
                      fontSize: '0.72rem',
                      color: peer.connectionState === 'connected' ? '#6ee7b7' : '#fcd34d',
                      fontWeight: 700,
                    }}
                  >
                    {peer.screenSharing
                      ? 'Sharing Screen'
                      : peer.connectionState === 'connected'
                        ? (peer.hasVideo ? 'Live Camera Connected' : 'Voice Connected')
                        : 'Connecting...'}
                  </span>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '8px',
                      background: peer.audioEnabled ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.88)',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    {peer.audioEnabled ? 'Audio On' : 'Muted'}
                  </span>
                </div>
              </div>
            ))}

            {/* WAITING / RINGING TILE WHEN ALONE IN ROOM */}
            {roomState.remotePeers.length === 0 && (
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '16 / 9',
                  minHeight: '220px',
                  borderRadius: '14px',
                  background: 'rgba(9, 24, 48, 0.72)',
                  border: '1.5px dashed rgba(194, 155, 79, 0.55)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '24px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(194, 155, 79, 0.16)',
                    border: '2px solid #c29b4f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#e7cf88',
                  }}
                >
                  <PhoneCall size={28} />
                </div>
                <div style={{ fontSize: '1.02rem', fontWeight: 700, color: '#e7cf88' }}>
                  {isDirectCall
                    ? `Ringing ${session?.callee?.name || 'the other person'}...`
                    : 'Waiting for other participants to join on camera...'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', maxWidth: '340px' }}>
                  {isDirectCall
                    ? 'As soon as they click Answer, their live camera and voice will appear right here.'
                    : `Share room code ${roomCode} with colleagues, doctors, or family members — everyone who joins appears live on camera.`}
                </div>
                {!isDirectCall && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="btn-outline-gold"
                    style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    {copiedCode ? 'Room Code Copied!' : `Copy Room Code (${roomCode})`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Optional Live Participants Sidebar */}
        {showParticipantsPanel && (
          <div
            style={{
              width: '280px',
              maxWidth: '85vw',
              background: '#091830',
              borderLeft: '1px solid rgba(194, 155, 79, 0.35)',
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#e7cf88', fontSize: '0.88rem' }}>
                In This Room ({Math.max(1, roomState.remotePeers.length + 1)})
              </strong>
              <button
                type="button"
                onClick={() => setShowParticipantsPanel(false)}
                aria-label="Close participants sidebar"
                style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(194, 155, 79, 0.14)',
                border: '1px solid rgba(194, 155, 79, 0.45)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#e7cf88' }}>
                {selfDisplayName} (You)
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                {selfRole.replace(/_/g, ' ')} • {roomState.videoEnabled ? 'Camera On' : 'Voice Only'} • {roomState.audioEnabled ? 'Mic On' : 'Muted'}
              </div>
            </div>

            {roomState.remotePeers.map((peer) => (
              <div
                key={peer.userId}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#f7f5ef' }}>{peer.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {String(peer.role || 'STAFF').replace(/_/g, ' ')} • {peer.videoEnabled ? 'Camera On' : 'Camera Off'} • {peer.audioEnabled ? 'Mic On' : 'Muted'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Easy-to-Tap Family Controls Bar */}
      <div
        style={{
          padding: '14px 20px',
          background: '#091830',
          borderTop: '1.5px solid rgba(194, 155, 79, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => clientRef.current?.toggleAudio()}
          aria-label={roomState.audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          style={{
            padding: '10px 18px',
            borderRadius: '999px',
            border: roomState.audioEnabled ? '1px solid rgba(231, 207, 136, 0.45)' : '1px solid #ef4444',
            background: roomState.audioEnabled ? 'rgba(255,255,255,0.08)' : '#dc2626',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {roomState.audioEnabled ? <Mic size={17} /> : <MicOff size={17} />}
          {roomState.audioEnabled ? 'Mute Mic' : 'Unmute Mic'}
        </button>

        <button
          type="button"
          onClick={() => clientRef.current?.toggleVideo()}
          aria-label={roomState.videoEnabled ? 'Turn camera off' : 'Turn camera on'}
          style={{
            padding: '10px 18px',
            borderRadius: '999px',
            border: roomState.videoEnabled ? '1px solid rgba(231, 207, 136, 0.45)' : '1px solid #f59e0b',
            background: roomState.videoEnabled ? 'rgba(255,255,255,0.08)' : 'rgba(245, 158, 11, 0.25)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {roomState.videoEnabled ? <Video size={17} /> : <VideoOff size={17} />}
          {roomState.videoEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
        </button>

        <button
          type="button"
          onClick={() => clientRef.current?.toggleScreenShare()}
          aria-label={roomState.screenSharing ? 'Stop sharing screen' : 'Share your screen'}
          style={{
            padding: '10px 18px',
            borderRadius: '999px',
            border: roomState.screenSharing ? '1px solid #10b981' : '1px solid rgba(231, 207, 136, 0.45)',
            background: roomState.screenSharing ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.08)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {roomState.screenSharing ? <MonitorOff size={17} /> : <MonitorUp size={17} />}
          {roomState.screenSharing ? 'Stop Share' : 'Share Screen'}
        </button>

        {!isDirectCall && (
          <button
            type="button"
            disabled={ending}
            onClick={handleLeaveOnly}
            aria-label="Leave conference room"
            className="btn-outline-gold"
            style={{
              padding: '10px 18px',
              borderRadius: '999px',
              fontSize: '0.84rem',
              fontWeight: 700,
            }}
          >
            Leave Room
          </button>
        )}

        <button
          type="button"
          disabled={ending}
          onClick={handleEndForAll}
          aria-label={isDirectCall ? 'End call' : 'End meeting for everyone'}
          style={{
            padding: '10px 22px',
            borderRadius: '999px',
            border: '1px solid #f87171',
            background: '#dc2626',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 6px 18px rgba(220, 38, 38, 0.45)',
          }}
        >
          <PhoneOff size={17} />
          {ending ? 'Ending...' : isDirectCall ? 'End Call' : 'End Meeting'}
        </button>
      </div>
    </div>
  );
}
