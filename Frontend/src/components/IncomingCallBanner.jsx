import React, { useEffect, useRef } from 'react';
import { Phone, Video, PhoneOff, Users } from 'lucide-react';
import { playGentleCallChime } from '../services/webrtc.service';

/**
 * Global Incoming Voice/Video Call & Conference Invite Ringing Card
 * Gives instant, clear, family-friendly Answer Video / Answer Voice / Decline controls.
 */
export default function IncomingCallBanner({
  incomingCall,
  onAccept,
  onDecline,
  busy = false,
}) {
  const lastChimedIdRef = useRef(null);

  useEffect(() => {
    const key = incomingCall?.roomCode || incomingCall?.id || null;
    if (key && lastChimedIdRef.current !== key) {
      lastChimedIdRef.current = key;
      playGentleCallChime();
    }
    if (!key) {
      lastChimedIdRef.current = null;
    }
  }, [incomingCall?.roomCode, incomingCall?.id]);

  if (!incomingCall) return null;

  const isConferenceInvite = incomingCall.kind === 'CONFERENCE' || incomingCall.eventType === 'CONFERENCE_INVITE';
  const callerName = incomingCall.caller?.name || incomingCall.invitedBy?.name || incomingCall.organizerName || 'Hospital Colleague';
  const callerRole = incomingCall.caller?.roleLabel || incomingCall.invitedBy?.role || 'Hospital Team';
  const isVoice = incomingCall.callMode === 'VOICE';

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: '18px',
        right: '18px',
        zIndex: 10060,
        width: 'min(400px, calc(100vw - 36px))',
        borderRadius: '16px',
        background: 'linear-gradient(145deg, #091830 0%, #13284d 100%)',
        border: '2px solid #e7cf88',
        boxShadow: '0 22px 54px rgba(0, 0, 0, 0.9), 0 0 28px rgba(194, 155, 79, 0.35)',
        padding: '16px 18px',
        color: '#f7f5ef',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          className="pulse-live"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.22)',
            border: '2px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6ee7b7',
            flexShrink: 0,
          }}
        >
          {isConferenceInvite ? <Users size={22} /> : isVoice ? <Phone size={22} /> : <Video size={22} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6ee7b7' }}>
            {isConferenceInvite
              ? 'Live Camera Conference Invite'
              : isVoice
                ? 'Incoming Voice Call'
                : 'Incoming Video Call'}
          </div>
          <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#e7cf88', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {callerName}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
            {String(callerRole).replace(/_/g, ' ')} {incomingCall.note ? `• "${incomingCall.note}"` : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAccept && onAccept(incomingCall, 'VIDEO')}
          aria-label={`Answer ${callerName} with camera video`}
          style={{
            flex: '1 1 120px',
            padding: '9px 12px',
            borderRadius: '10px',
            border: '1px solid #34d399',
            background: '#059669',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Video size={15} /> {isConferenceInvite ? 'Join Camera' : 'Answer Video'}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onAccept && onAccept(incomingCall, 'VOICE')}
          aria-label={`Answer ${callerName} with voice only`}
          style={{
            flex: '1 1 110px',
            padding: '9px 12px',
            borderRadius: '10px',
            border: '1px solid #38bdf8',
            background: 'rgba(14, 165, 233, 0.22)',
            color: '#e0f2fe',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Phone size={15} /> Voice Only
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onDecline && onDecline(incomingCall)}
          aria-label={`Decline call from ${callerName}`}
          style={{
            padding: '9px 12px',
            borderRadius: '10px',
            border: '1px solid #f87171',
            background: 'rgba(220, 38, 38, 0.88)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
        >
          <PhoneOff size={15} /> Decline
        </button>
      </div>
    </div>
  );
}
