import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldInitiateOffer,
  describeMediaError,
  acquireLocalMedia,
  createWebRtcRoomClient,
} from '../src/services/webrtc.service.js';

function createFakeTrack(kind, id) {
  return {
    id: id || `${kind}-${Math.random().toString(36).slice(2)}`,
    kind,
    enabled: true,
    readyState: 'live',
    stopped: false,
    stop() {
      this.stopped = true;
      this.readyState = 'ended';
    },
  };
}

function createFakeStream(tracks = []) {
  const list = [...tracks];
  return {
    getTracks: () => list,
    getAudioTracks: () => list.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => list.filter((t) => t.kind === 'video'),
    addTrack: (t) => list.push(t),
  };
}

class FakeRTCPeerConnection {
  constructor(config) {
    this.config = config;
    this.signalingState = 'stable';
    this.connectionState = 'new';
    this.localDescription = null;
    this.remoteDescription = null;
    this.senders = [];
    this.addedIceCandidates = [];
    this.closed = false;
    this.onicecandidate = null;
    this.ontrack = null;
    this.onconnectionstatechange = null;
  }

  addTrack(track, stream) {
    this.senders.push({ track, stream });
  }

  getSenders() {
    return this.senders;
  }

  async createOffer() {
    return { type: 'offer', sdp: 'v=0-fake-offer-sdp' };
  }

  async createAnswer() {
    return { type: 'answer', sdp: 'v=0-fake-answer-sdp' };
  }

  async setLocalDescription(desc) {
    this.localDescription = desc;
    this.signalingState = desc.type === 'offer' ? 'have-local-offer' : 'stable';
  }

  async setRemoteDescription(desc) {
    this.remoteDescription = desc;
    this.signalingState = desc.type === 'offer' ? 'have-remote-offer' : 'stable';
    if (desc.type === 'answer') {
      this.connectionState = 'connected';
      this.onconnectionstatechange?.();
    }
  }

  async addIceCandidate(cand) {
    this.addedIceCandidates.push(cand);
  }

  close() {
    this.closed = true;
    this.connectionState = 'closed';
  }
}

test('1. shouldInitiateOffer prevents SDP glare across any user pair', () => {
  assert.strictEqual(shouldInitiateOffer('user-a', 'user-b'), true);
  assert.strictEqual(shouldInitiateOffer('user-b', 'user-a'), false);
  assert.strictEqual(shouldInitiateOffer('user-a', 'user-a'), false);
});

test('2. describeMediaError converts raw browser device errors into plain helpful guidance', () => {
  assert.match(describeMediaError({ name: 'NotAllowedError' }), /blocked.*address bar/i);
  assert.match(describeMediaError({ name: 'NotFoundError' }), /No camera or microphone/i);
  assert.match(describeMediaError({ name: 'NotReadableError' }), /busy in another app/i);
});

test('3. acquireLocalMedia falls back gracefully from Video+Audio to Voice-Only if camera fails', async () => {
  const prevNav = globalThis.navigator;
  let callCount = 0;
  const audioTrack = createFakeTrack('audio', 'aud-fallback');

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async (constraints) => {
          callCount += 1;
          if (constraints.video) {
            const err = new Error('Camera busy');
            err.name = 'NotReadableError';
            throw err;
          }
          return createFakeStream([audioTrack]);
        },
      },
    },
  });

  try {
    const res = await acquireLocalMedia({ wantVideo: true, wantAudio: true });
    assert.strictEqual(callCount, 2);
    assert.strictEqual(res.status, 'AUDIO_ONLY_FALLBACK');
    assert.strictEqual(res.audioEnabled, true);
    assert.strictEqual(res.videoEnabled, false);
    assert.match(res.notice, /Voice-Only/i);
  } finally {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: prevNav });
  }
});

test('4. Multi-peer WebRTC room client negotiates Offer/Answer/ICE, renders remote camera stream, toggles mic/cam & cleans up tracks', async () => {
  const prevNav = globalThis.navigator;
  const localAudio = createFakeTrack('audio', 'loc-aud-1');
  const localVideo = createFakeTrack('video', 'loc-vid-1');

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => createFakeStream([localAudio, localVideo]),
      },
    },
  });

  const sentSignals = [];
  const stateSnapshots = [];
  const createdPCs = [];

  class TrackingPC extends FakeRTCPeerConnection {
    constructor(cfg) {
      super(cfg);
      createdPCs.push(this);
    }
  }

  try {
    const client = createWebRtcRoomClient({
      roomCode: 'CONF-2026-TEST01',
      selfUserId: 'user-a',
      initialCallMode: 'VIDEO',
      PeerConnectionCtor: TrackingPC,
      pollIntervalMs: 0,
      sendSignal: async (_room, sig) => {
        sentSignals.push(sig);
      },
      pollSignals: async () => ({
        latestSeq: 2,
        participants: [
          { userId: 'user-a', name: 'Dr. Alice', role: 'DOCTOR', audioEnabled: true, videoEnabled: true },
          { userId: 'user-b', name: 'Nurse Bob', role: 'NURSE', audioEnabled: true, videoEnabled: true },
          { userId: 'user-c', name: 'Patient Ama', role: 'PATIENT', audioEnabled: true, videoEnabled: true },
        ],
        signals: [],
      }),
      onStateChange: (snap) => stateSnapshots.push(snap),
    });

    await client.start([]);

    // As 'user-a' (< 'user-b' and < 'user-c'), it must initiate SDP OFFERs to BOTH remote peers
    assert.strictEqual(createdPCs.length, 2);
    const offerTargets = sentSignals.filter((s) => s.type === 'OFFER').map((s) => s.toUserId).sort();
    assert.deepStrictEqual(offerTargets, ['user-b', 'user-c']);

    // Queue an ICE candidate BEFORE remote ANSWER arrives, then supply ANSWER -> candidate must flush cleanly!
    await client.handleIncomingSignal({
      seq: 3,
      fromUserId: 'user-b',
      fromName: 'Nurse Bob',
      type: 'ICE_CANDIDATE',
      payload: { candidate: 'candidate:1 1 UDP 1 10.0.0.2 5000 typ host' },
    });
    assert.strictEqual(createdPCs[0].addedIceCandidates.length, 0);

    await client.handleIncomingSignal({
      seq: 4,
      fromUserId: 'user-b',
      fromName: 'Nurse Bob',
      type: 'ANSWER',
      payload: { type: 'answer', sdp: 'v=0-bob-answer' },
    });
    assert.strictEqual(createdPCs[0].addedIceCandidates.length, 1);
    assert.strictEqual(createdPCs[0].connectionState, 'connected');

    // Simulate remote camera track arriving from Nurse Bob
    const remoteCamStream = createFakeStream([createFakeTrack('video', 'bob-cam'), createFakeTrack('audio', 'bob-mic')]);
    createdPCs[0].ontrack({ streams: [remoteCamStream] });

    const latest = stateSnapshots[stateSnapshots.length - 1];
    const bobPeer = latest.remotePeers.find((p) => p.userId === 'user-b');
    assert.ok(bobPeer, 'Remote peer Nurse Bob must appear in remotePeers');
    assert.strictEqual(bobPeer.hasVideo, true);
    assert.strictEqual(bobPeer.hasAudio, true);
    assert.strictEqual(bobPeer.connectionState, 'connected');

    // Toggle mic off and video off -> tracks disable and MEDIA_STATE signals broadcast
    assert.strictEqual(client.toggleAudio(), false);
    assert.strictEqual(localAudio.enabled, false);
    assert.strictEqual(await client.toggleVideo(), false);
    assert.strictEqual(localVideo.enabled, false);
    assert.ok(sentSignals.some((s) => s.type === 'MEDIA_STATE' && s.payload.audioEnabled === false));
    assert.ok(sentSignals.some((s) => s.type === 'MEDIA_STATE' && s.payload.videoEnabled === false));

    // Destroy stops all local tracks and closes all peer connections (releases webcam LED!)
    client.destroy();
    assert.strictEqual(localAudio.stopped, true);
    assert.strictEqual(localVideo.stopped, true);
    assert.ok(createdPCs.every((pc) => pc.closed === true));
  } finally {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: prevNav });
  }
});
