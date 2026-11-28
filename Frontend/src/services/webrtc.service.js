/**
 * GBS Hospital Management System — Real-Time WebRTC Voice, Video & Multi-Camera Conference Engine
 * Uses standard browser WebRTC (navigator.mediaDevices.getUserMedia, getDisplayMedia, RTCPeerConnection)
 * with deterministic multi-peer mesh negotiation, ICE candidate buffering, SSE push + polling sync,
 * and plain-language user feedback for every device/network state.
 */

export const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Deterministic WebRTC initiator rule: prevents SDP offer glare in multi-user rooms.
 * Exactly one side of every user pair initiates the initial SDP offer.
 */
export function shouldInitiateOffer(selfUserId, remoteUserId) {
  return String(selfUserId || '') < String(remoteUserId || '');
}

/**
 * Translates raw browser media exceptions into warm, plain, actionable instructions.
 */
export function describeMediaError(err) {
  const name = String(err?.name || '');
  const msg = String(err?.message || '');

  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return 'Camera and microphone require a secure HTTPS connection (or localhost). You can still stay in the room and view others.';
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || /permission|denied/i.test(msg)) {
    return 'Camera or microphone access was blocked. Click the camera/lock icon in your browser address bar, allow access, and tap Retry Camera.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || /not found|requested device/i.test(msg)) {
    return 'No camera or microphone was detected on this device. You can still join to see and hear other participants.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Your camera or microphone is currently busy in another app. Close the other app and tap Retry Camera.';
  }
  if (name === 'OverconstrainedError') {
    return 'Camera settings were adjusted automatically. Please tap Retry Camera to reconnect.';
  }
  return 'Could not start your camera or microphone right now. You can still stay connected to hear and see others.';
}

/**
 * Safely acquires local camera + microphone (or microphone-only for voice calls),
 * automatically falling back to voice-only if a camera is unavailable.
 */
export async function acquireLocalMedia({ wantVideo = true, wantAudio = true } = {}) {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    return {
      stream: null,
      audioEnabled: false,
      videoEnabled: false,
      status: 'UNAVAILABLE',
      notice: 'This browser does not support live camera/microphone capture. You can still listen and view participants.',
    };
  }

  // Primary attempt: requested video + audio
  if (wantVideo) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: wantAudio
          ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          : false,
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
        },
      });
      return {
        stream,
        audioEnabled: stream.getAudioTracks().some((t) => t.enabled),
        videoEnabled: stream.getVideoTracks().some((t) => t.enabled),
        status: 'READY',
        notice: 'Camera and microphone are live.',
      };
    } catch (videoErr) {
      // Fallback: try audio-only so user can still speak if webcam is missing or busy
      if (wantAudio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          });
          return {
            stream: audioStream,
            audioEnabled: audioStream.getAudioTracks().some((t) => t.enabled),
            videoEnabled: false,
            status: 'AUDIO_ONLY_FALLBACK',
            notice: `Camera could not start (${describeMediaError(videoErr)}) Connected in Voice-Only mode.`,
          };
        } catch (audioErr) {
          return {
            stream: null,
            audioEnabled: false,
            videoEnabled: false,
            status: 'BLOCKED',
            notice: describeMediaError(audioErr),
          };
        }
      }
      return {
        stream: null,
        audioEnabled: false,
        videoEnabled: false,
        status: 'BLOCKED',
        notice: describeMediaError(videoErr),
      };
    }
  }

  // Voice-only call mode
  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: wantAudio
        ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        : false,
      video: false,
    });
    return {
      stream: audioStream,
      audioEnabled: audioStream.getAudioTracks().some((t) => t.enabled),
      videoEnabled: false,
      status: 'VOICE_READY',
      notice: 'Microphone is live for Voice Call.',
    };
  } catch (err) {
    return {
      stream: null,
      audioEnabled: false,
      videoEnabled: false,
      status: 'BLOCKED',
      notice: describeMediaError(err),
    };
  }
}

/**
 * Play a gentle, warm Web Audio chime for incoming calls (respects browser autoplay rules gracefully).
 */
export function playGentleCallChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5 - E5 - G5 warm family triad
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.42);
    });
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1000);
  } catch (_ignored) {
    // Autoplay policy blocked audio before gesture — visual banner still alerts clearly
  }
}

/**
 * Creates a live multi-peer WebRTC room controller supporting both 1-on-1 calls
 * and multi-participant camera conference meetings.
 */
export function createWebRtcRoomClient({
  roomCode,
  selfUserId,
  iceServers = DEFAULT_ICE_SERVERS,
  initialCallMode = 'VIDEO',
  sendSignal,
  pollSignals,
  onStateChange,
  onFeedback,
  PeerConnectionCtor = typeof window !== 'undefined' ? window.RTCPeerConnection : null,
  pollIntervalMs = 2000,
} = {}) {
  const selfId = String(selfUserId || '');
  let destroyed = false;
  let localStream = null;
  let screenStream = null;
  let audioEnabled = false;
  let videoEnabled = false;
  let screenSharing = false;
  let mediaStatus = 'INITIALIZING';
  let mediaNotice = 'Preparing your camera and microphone...';
  let lastSeq = 0;
  let pollTimer = null;
  let pollingInFlight = false;

  // Map<userId, { pc, stream, participant, pendingIceCandidates, makingOffer }>
  const peers = new Map();
  let latestParticipants = [];

  const emitFeedback = (type, message) => {
    if (typeof onFeedback === 'function') {
      onFeedback({ type, message });
    }
  };

  const emitState = () => {
    if (destroyed || typeof onStateChange !== 'function') return;
    const remotePeers = [];
    for (const [uid, entry] of peers.entries()) {
      const pMeta = latestParticipants.find((p) => String(p.userId) === uid) || entry.participant || {};
      const stream = entry.stream || null;
      const liveVideoTracks = stream && typeof stream.getVideoTracks === 'function'
        ? stream.getVideoTracks().filter((t) => t.readyState !== 'ended')
        : [];
      const liveAudioTracks = stream && typeof stream.getAudioTracks === 'function'
        ? stream.getAudioTracks().filter((t) => t.readyState !== 'ended')
        : [];
      remotePeers.push({
        userId: uid,
        name: pMeta.name || 'Hospital Participant',
        role: pMeta.role || 'STAFF',
        stream,
        hasVideo: liveVideoTracks.length > 0 && pMeta.videoEnabled !== false,
        hasAudio: liveAudioTracks.length > 0,
        audioEnabled: pMeta.audioEnabled !== false,
        videoEnabled: pMeta.videoEnabled !== false,
        screenSharing: Boolean(pMeta.screenSharing),
        connectionState: entry.pc?.connectionState || entry.pc?.iceConnectionState || 'connecting',
      });
    }

    onStateChange({
      roomCode,
      localStream,
      screenStream,
      audioEnabled,
      videoEnabled,
      screenSharing,
      mediaStatus,
      mediaNotice,
      participants: latestParticipants,
      remotePeers,
    });
  };

  const attachLocalTracksToPeer = (pc) => {
    if (!pc || !localStream || typeof localStream.getTracks !== 'function') return;
    const existingSenders = typeof pc.getSenders === 'function' ? pc.getSenders() : [];
    const existingTrackIds = new Set(existingSenders.map((s) => s.track && s.track.id).filter(Boolean));
    for (const track of localStream.getTracks()) {
      if (!existingTrackIds.has(track.id) && typeof pc.addTrack === 'function') {
        pc.addTrack(track, localStream);
      }
    }
    if (screenSharing && screenStream) {
      const screenTrack = screenStream.getVideoTracks()[0];
      const videoSender = existingSenders.find((s) => s.track && s.track.kind === 'video');
      if (screenTrack && videoSender && typeof videoSender.replaceTrack === 'function') {
        videoSender.replaceTrack(screenTrack).catch(() => {});
      }
    }
  };

  const ensurePeerConnection = (remoteParticipant) => {
    const remoteId = String(remoteParticipant?.userId || '');
    if (!remoteId || remoteId === selfId || destroyed) return null;

    if (peers.has(remoteId)) {
      const existing = peers.get(remoteId);
      existing.participant = { ...existing.participant, ...remoteParticipant };
      return existing;
    }

    if (!PeerConnectionCtor) {
      const fallbackEntry = {
        pc: null,
        stream: null,
        participant: remoteParticipant,
        pendingIceCandidates: [],
        makingOffer: false,
      };
      peers.set(remoteId, fallbackEntry);
      emitState();
      return fallbackEntry;
    }

    const pc = new PeerConnectionCtor({
      iceServers: Array.isArray(iceServers) && iceServers.length > 0 ? iceServers : DEFAULT_ICE_SERVERS,
    });

    const entry = {
      pc,
      stream: null,
      participant: remoteParticipant,
      pendingIceCandidates: [],
      makingOffer: false,
    };
    peers.set(remoteId, entry);

    attachLocalTracksToPeer(pc);

    pc.onicecandidate = (event) => {
      if (destroyed || !event?.candidate || typeof sendSignal !== 'function') return;
      const candObj = typeof event.candidate.toJSON === 'function' ? event.candidate.toJSON() : event.candidate;
      sendSignal(roomCode, {
        toUserId: remoteId,
        type: 'ICE_CANDIDATE',
        payload: candObj,
      }).catch(() => {});
    };

    pc.ontrack = (event) => {
      if (destroyed) return;
      if (event.streams && event.streams[0]) {
        entry.stream = event.streams[0];
      } else if (event.track && typeof MediaStream !== 'undefined') {
        if (!entry.stream) {
          entry.stream = new MediaStream();
        }
        entry.stream.addTrack(event.track);
      }
      emitState();
    };

    pc.onconnectionstatechange = () => {
      if (destroyed) return;
      emitState();
    };

    pc.oniceconnectionstatechange = () => {
      if (destroyed) return;
      emitState();
    };

    emitState();
    return entry;
  };

  const createAndSendOffer = async (remoteId) => {
    const entry = peers.get(String(remoteId));
    if (!entry || !entry.pc || entry.makingOffer || destroyed) return;
    try {
      entry.makingOffer = true;
      const offer = await entry.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await entry.pc.setLocalDescription(offer);
      if (typeof sendSignal === 'function') {
        await sendSignal(roomCode, {
          toUserId: String(remoteId),
          type: 'OFFER',
          payload: { type: offer.type, sdp: offer.sdp },
        });
      }
    } catch (_err) {
      // handled cleanly on next sync
    } finally {
      entry.makingOffer = false;
    }
  };

  const syncParticipants = async (participants = []) => {
    if (destroyed) return;
    latestParticipants = Array.isArray(participants) ? participants : [];
    const activeIds = new Set(latestParticipants.map((p) => String(p.userId)));

    // Remove peers who left the room
    for (const [uid, entry] of peers.entries()) {
      if (!activeIds.has(uid)) {
        try {
          entry.pc?.close();
        } catch (_e) {}
        peers.delete(uid);
      }
    }

    // Add newly joined peers and trigger deterministic SDP offer from initiator side
    for (const participant of latestParticipants) {
      const uid = String(participant.userId || '');
      if (!uid || uid === selfId) continue;
      const existed = peers.has(uid);
      const entry = ensurePeerConnection(participant);
      if (!existed && entry?.pc && shouldInitiateOffer(selfId, uid)) {
        await createAndSendOffer(uid);
      }
    }

    emitState();
  };

  const handleIncomingSignal = async (signal) => {
    if (destroyed || !signal) return;
    const fromId = String(signal.fromUserId || '');
    if (!fromId || fromId === selfId) return;
    if (signal.seq && signal.seq > lastSeq) {
      lastSeq = signal.seq;
    }

    const entry = ensurePeerConnection({
      userId: fromId,
      name: signal.fromName || 'Hospital Participant',
      role: signal.fromRole || 'STAFF',
    });

    if (signal.type === 'MEDIA_STATE') {
      if (entry && signal.payload) {
        entry.participant = { ...entry.participant, ...signal.payload };
        latestParticipants = latestParticipants.map((p) =>
          String(p.userId) === fromId ? { ...p, ...signal.payload } : p
        );
      }
      emitState();
      return;
    }

    if (!entry || !entry.pc) return;
    const pc = entry.pc;

    try {
      if (signal.type === 'OFFER' || signal.type === 'RENEGOTIATE') {
        const desc = signal.payload;
        if (!desc || !desc.sdp) return;
        const polite = !shouldInitiateOffer(selfId, fromId);
        const offerCollision = entry.makingOffer || pc.signalingState !== 'stable';
        if (offerCollision && !polite) {
          return;
        }
        await pc.setRemoteDescription(desc);
        attachLocalTracksToPeer(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (typeof sendSignal === 'function') {
          await sendSignal(roomCode, {
            toUserId: fromId,
            type: 'ANSWER',
            payload: { type: answer.type, sdp: answer.sdp },
          });
        }
        // Flush queued ICE candidates
        while (entry.pendingIceCandidates.length > 0) {
          const ice = entry.pendingIceCandidates.shift();
          await pc.addIceCandidate(ice).catch(() => {});
        }
      } else if (signal.type === 'ANSWER') {
        const desc = signal.payload;
        if (!desc || !desc.sdp) return;
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(desc);
          while (entry.pendingIceCandidates.length > 0) {
            const ice = entry.pendingIceCandidates.shift();
            await pc.addIceCandidate(ice).catch(() => {});
          }
        }
      } else if (signal.type === 'ICE_CANDIDATE') {
        const cand = signal.payload;
        if (!cand) return;
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(cand).catch(() => {});
        } else {
          entry.pendingIceCandidates.push(cand);
        }
      }
    } catch (_sigErr) {
      // Ignore transient signaling mismatch safely
    }
    emitState();
  };

  const broadcastMediaState = () => {
    if (destroyed || typeof sendSignal !== 'function') return;
    sendSignal(roomCode, {
      toUserId: null,
      type: 'MEDIA_STATE',
      payload: { audioEnabled, videoEnabled, screenSharing },
    }).catch(() => {});
  };

  const runPollCycle = async () => {
    if (destroyed || pollingInFlight || typeof pollSignals !== 'function') return;
    pollingInFlight = true;
    try {
      const res = await pollSignals(roomCode, {
        afterSeq: lastSeq,
        audioEnabled,
        videoEnabled,
        screenSharing,
      });
      if (destroyed || !res) return;
      if (Array.isArray(res.participants)) {
        await syncParticipants(res.participants);
      }
      if (Array.isArray(res.signals)) {
        for (const sig of res.signals) {
          await handleIncomingSignal(sig);
        }
      }
      if (typeof res.latestSeq === 'number' && res.latestSeq > lastSeq) {
        lastSeq = res.latestSeq;
      }
    } catch (_pollErr) {
      // Silent retry on next cycle
    } finally {
      pollingInFlight = false;
    }
  };

  const startLocalMedia = async (modeOverride = null) => {
    const mode = String(modeOverride || initialCallMode || 'VIDEO').toUpperCase();
    const result = await acquireLocalMedia({
      wantVideo: mode === 'VIDEO',
      wantAudio: true,
    });
    if (destroyed) {
      result.stream?.getTracks().forEach((t) => t.stop());
      return result;
    }

    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    localStream = result.stream;
    audioEnabled = result.audioEnabled;
    videoEnabled = result.videoEnabled;
    mediaStatus = result.status;
    mediaNotice = result.notice;

    // Attach tracks to any existing peer connections and renegotiate cleanly
    for (const [uid, entry] of peers.entries()) {
      if (entry.pc) {
        attachLocalTracksToPeer(entry.pc);
        await createAndSendOffer(uid);
      }
    }
    broadcastMediaState();
    emitState();
    emitFeedback(
      result.status === 'READY' || result.status === 'VOICE_READY' ? 'success' : 'warning',
      result.notice
    );
    return result;
  };

  const start = async (initialParticipants = []) => {
    await startLocalMedia(initialCallMode);
    if (Array.isArray(initialParticipants) && initialParticipants.length > 0) {
      await syncParticipants(initialParticipants);
    }
    await runPollCycle();
    if (!destroyed && pollIntervalMs > 0) {
      pollTimer = setInterval(runPollCycle, pollIntervalMs);
    }
  };

  const toggleAudio = () => {
    if (!localStream || localStream.getAudioTracks().length === 0) {
      emitFeedback('warning', 'No microphone is active yet. Tap Retry Camera & Mic to grant microphone access.');
      return false;
    }
    const next = !audioEnabled;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    audioEnabled = next;
    broadcastMediaState();
    emitState();
    emitFeedback('info', next ? 'Microphone unmuted — others can hear you.' : 'Microphone muted.');
    return next;
  };

  const toggleVideo = async () => {
    // If we have an existing camera video track, toggle it cleanly
    const existingVideoTracks = localStream ? localStream.getVideoTracks() : [];
    if (existingVideoTracks.length > 0) {
      const next = !videoEnabled;
      existingVideoTracks.forEach((t) => {
        t.enabled = next;
      });
      videoEnabled = next;
      broadcastMediaState();
      emitState();
      emitFeedback('info', next ? 'Camera turned on — others can see you now.' : 'Camera paused (Voice stays connected).');
      return next;
    }

    // Started in Voice-Only mode and user now wants to turn on their camera!
    const upgrade = await acquireLocalMedia({ wantVideo: true, wantAudio: false });
    if (upgrade.stream && upgrade.stream.getVideoTracks().length > 0) {
      const camTrack = upgrade.stream.getVideoTracks()[0];
      if (!localStream && typeof MediaStream !== 'undefined') {
        localStream = new MediaStream();
      }
      if (localStream) {
        localStream.addTrack(camTrack);
      }
      videoEnabled = true;
      mediaStatus = 'READY';
      mediaNotice = 'Camera turned on live.';
      for (const [uid, entry] of peers.entries()) {
        if (entry.pc) {
          attachLocalTracksToPeer(entry.pc);
          await createAndSendOffer(uid);
        }
      }
      broadcastMediaState();
      emitState();
      emitFeedback('success', 'Camera turned on — switched to live Video Call.');
      return true;
    }
    emitFeedback('warning', upgrade.notice || 'Unable to turn on camera.');
    return false;
  };

  const stopScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      screenStream = null;
    }
    screenSharing = false;
    const camTrack = localStream ? localStream.getVideoTracks()[0] : null;
    for (const entry of peers.values()) {
      const senders = entry.pc && typeof entry.pc.getSenders === 'function' ? entry.pc.getSenders() : [];
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender && typeof videoSender.replaceTrack === 'function') {
        await videoSender.replaceTrack(camTrack || null).catch(() => {});
      }
    }
    broadcastMediaState();
    emitState();
    emitFeedback('info', 'Screen sharing stopped — back to camera.');
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      await stopScreenShare();
      return false;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
      emitFeedback('warning', 'Screen sharing is not supported on this browser/device.');
      return false;
    }
    try {
      const disp = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = disp.getVideoTracks()[0];
      if (!screenTrack) return false;
      screenStream = disp;
      screenSharing = true;
      screenTrack.onended = () => {
        stopScreenShare();
      };
      for (const [uid, entry] of peers.entries()) {
        if (!entry.pc) continue;
        const senders = typeof entry.pc.getSenders === 'function' ? entry.pc.getSenders() : [];
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender && typeof videoSender.replaceTrack === 'function') {
          await videoSender.replaceTrack(screenTrack).catch(() => {});
        } else if (typeof entry.pc.addTrack === 'function') {
          entry.pc.addTrack(screenTrack, disp);
          await createAndSendOffer(uid);
        }
      }
      broadcastMediaState();
      emitState();
      emitFeedback('success', 'You are now sharing your screen with everyone in the meeting.');
      return true;
    } catch (_err) {
      emitFeedback('info', 'Screen sharing was cancelled.');
      return false;
    }
  };

  const destroy = () => {
    destroyed = true;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      screenStream = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    for (const entry of peers.values()) {
      try {
        entry.pc?.close();
      } catch (_e) {}
    }
    peers.clear();
  };

  return {
    start,
    startLocalMedia,
    syncParticipants,
    handleIncomingSignal,
    runPollCycle,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    destroy,
    getSnapshot: () => ({
      roomCode,
      audioEnabled,
      videoEnabled,
      screenSharing,
      mediaStatus,
      mediaNotice,
      peerCount: peers.size,
      participantCount: latestParticipants.length,
    }),
  };
}
