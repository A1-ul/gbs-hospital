"use strict";

/*
================================================================================
PHASE 44: FILE 8 PHASE 8.2 — ALL-USERS VOICE/VIDEO CALLING & MULTI-CAMERA WEBRTC
================================================================================
Verifies:
1. Canonical calling response codes (CALL_INITIATED, CALL_ACCEPTED, CALL_DECLINED,
   CALL_ENDED, CONFERENCE_JOINED) are registered in GBS-RCCE Catalogue.
2. Contact Directory works for ALL authenticated roles (including PATIENT & DOCTOR),
   returns live active contacts, and strictly hides DEVELOPER accounts from public users.
3. Full 1-on-1 Video & Voice call lifecycle: initiate -> incoming ring -> accept ->
   WebRTC SDP offer/answer/ICE/media-state signaling -> end with PostgreSQL persistence.
4. Direct call privacy guard blocks third-party intrusion (403) and decline flow
   updates status cleanly with exact GBS-RCCE feedback.
5. Multi-participant live camera conference room supports 3 simultaneous users across
   different roles (Admin, Doctor, Patient) with live peer presence & targeted WebRTC signaling.
*/

const request = require("supertest");
const bcrypt = require("bcrypt");
process.env.NODE_ENV = "test";

const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");
const { webrtcHub } = require("../src/modules/communications");
const { waitForPendingAuditWrites } = require("../src/core/middleware/rcce-audit.middleware");

describe("Phase 44: File 8 Phase 8.2 — All-Users Voice/Video Calling & Multi-Camera WebRTC Signaling", () => {
    let adminToken;
    let doctorToken;
    let patientToken;
    let doctorUser;
    let patientUser;
    let adminUser;
    let devUser;

    const createdUserIds = [];
    const createdMeetingIds = [];
    const testPassword = "CallTestPassword2026!";

    beforeAll(async () => {
        webrtcHub.resetHub();

        const [adminLogin, devLogin] = await Promise.all([
            request(app).post("/api/v1/auth/login").send({
                email: "admin@gbs.com",
                password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123"
            }),
            request(app).post("/api/v1/auth/login").send({
                email: process.env.DEVELOPER_ROOT_EMAIL || "gabosei48@gmail.com",
                password: process.env.DEVELOPER_ROOT_PASSWORD || "CiTestDevPassword2026!"
            })
        ]);

        expect(adminLogin.statusCode).toBe(200);
        expect(devLogin.statusCode).toBe(200);
        adminToken = adminLogin.body.data.token;
        adminUser = adminLogin.body.data.user;
        devUser = devLogin.body.data.user;

        const [doctorRole, patientRole] = await Promise.all([
            prisma.role.upsert({
                where: { name: "DOCTOR" },
                update: {},
                create: { name: "DOCTOR", description: "Medical Doctor" }
            }),
            prisma.role.upsert({
                where: { name: "PATIENT" },
                update: {},
                create: { name: "PATIENT", description: "Patient Self-Service" }
            })
        ]);

        const stamp = Date.now();
        const hashedPassword = await bcrypt.hash(testPassword, 10);

        doctorUser = await prisma.user.create({
            data: {
                firstName: "Kwame",
                lastName: "Mensah-CallTest",
                email: `phase44.doctor.${stamp}@gbs.local`,
                password: hashedPassword,
                roleId: doctorRole.id,
                active: true
            }
        });
        createdUserIds.push(doctorUser.id);

        patientUser = await prisma.user.create({
            data: {
                firstName: "Ama",
                lastName: "Boateng-CallTest",
                email: `phase44.patient.${stamp}@gbs.local`,
                password: hashedPassword,
                roleId: patientRole.id,
                active: true
            }
        });
        createdUserIds.push(patientUser.id);

        const [docLogin, patLogin] = await Promise.all([
            request(app).post("/api/v1/auth/login").send({ email: doctorUser.email, password: testPassword }),
            request(app).post("/api/v1/auth/login").send({ email: patientUser.email, password: testPassword })
        ]);

        expect(docLogin.statusCode).toBe(200);
        expect(patLogin.statusCode).toBe(200);
        doctorToken = docLogin.body.data.token;
        patientToken = patLogin.body.data.token;
    }, 60000);

    afterAll(async () => {
        await waitForPendingAuditWrites(2000);
        webrtcHub.resetHub();
        if (createdMeetingIds.length > 0) {
            await prisma.hospitalMeeting.deleteMany({ where: { id: { in: createdMeetingIds } } }).catch(() => {});
        }
        if (createdUserIds.length > 0) {
            await prisma.systemNotification.deleteMany({ where: { recipientUserId: { in: createdUserIds } } }).catch(() => {});
            await prisma.auditLog.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
            await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
            await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
        }
        await new Promise((r) => setTimeout(r, 250));
    });

    test("1. GBS-RCCE Response Catalogue includes all canonical calling & conference codes", async () => {
        const res = await request(app)
            .get("/api/v1/rcce/catalogue")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        const codes = new Set((res.body.data.entries || []).map((e) => e.code));
        for (const expectedCode of [
            "CALL_INITIATED",
            "CALL_ACCEPTED",
            "CALL_DECLINED",
            "CALL_ENDED",
            "CONFERENCE_JOINED"
        ]) {
            expect(codes.has(expectedCode)).toBe(true);
        }
    });

    test("2. Family-friendly Contact Directory serves ALL roles (incl. PATIENT) while isolating DEVELOPER", async () => {
        const patDirRes = await request(app)
            .get("/api/v1/communications/directory?search=CallTest")
            .set("Authorization", `Bearer ${patientToken}`);

        expect(patDirRes.statusCode).toBe(200);
        expect(patDirRes.body.success).toBe(true);
        const contacts = patDirRes.body.data.contacts || [];
        expect(contacts.some((c) => c.id === doctorUser.id && c.role === "DOCTOR")).toBe(true);
        expect(contacts.some((c) => c.id === patientUser.id)).toBe(false);

        // Ensure DEVELOPER is strictly hidden from public hospital directories
        const allDirRes = await request(app)
            .get("/api/v1/communications/directory")
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(allDirRes.statusCode).toBe(200);
        expect((allDirRes.body.data.contacts || []).some((c) => c.role === "DEVELOPER")).toBe(false);

        // Non-developer cannot call DEVELOPER directly
        const devCallBlocked = await request(app)
            .post("/api/v1/communications/calls")
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({ calleeId: devUser.id, callMode: "VIDEO" });
        expect(devCallBlocked.statusCode).toBe(403);
    });

    test("3. End-to-end 1-on-1 Video Call: initiate -> incoming ring -> accept -> WebRTC offer/answer/ICE -> end", async () => {
        // Patient calls Doctor via Video Call
        const initRes = await request(app)
            .post("/api/v1/communications/calls")
            .set("Authorization", `Bearer ${patientToken}`)
            .send({
                calleeId: doctorUser.id,
                callMode: "VIDEO",
                note: "Checking on follow-up lab results"
            });

        expect(initRes.statusCode).toBe(201);
        expect(initRes.body.code).toBe("CALL_INITIATED");
        expect(initRes.body.message).toMatch(/Video call started/i);
        const call = initRes.body.data.call;
        const roomCode = call.roomCode;
        createdMeetingIds.push(call.id);

        // Doctor checks incoming calls and sees the ringing video call
        const incomingRes = await request(app)
            .get("/api/v1/communications/calls/incoming")
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(incomingRes.statusCode).toBe(200);
        expect(incomingRes.body.data.incomingCalls.some((c) => c.roomCode === roomCode)).toBe(true);

        // Privacy check: Admin (3rd party) cannot join private 1-on-1 call
        const intrusionRes = await request(app)
            .post(`/api/v1/communications/rooms/${roomCode}/join`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ callMode: "VIDEO" });
        expect(intrusionRes.statusCode).toBe(403);

        // Doctor accepts the video call
        const acceptRes = await request(app)
            .post(`/api/v1/communications/calls/${roomCode}/accept`)
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({ callMode: "VIDEO" });
        expect(acceptRes.statusCode).toBe(200);
        expect(acceptRes.body.code).toBe("CALL_ACCEPTED");
        expect(acceptRes.body.data.call.status).toBe("LIVE");
        expect(acceptRes.body.data.webrtcSession.activeParticipants.length).toBe(2);

        // Patient sends WebRTC SDP OFFER to Doctor
        const offerRes = await request(app)
            .post(`/api/v1/communications/rooms/${roomCode}/signal`)
            .set("Authorization", `Bearer ${patientToken}`)
            .send({
                toUserId: doctorUser.id,
                type: "OFFER",
                payload: { sdp: "v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\n", type: "offer" }
            });
        expect(offerRes.statusCode).toBe(200);

        // Doctor polls signals and receives Patient's SDP OFFER
        const docSignals = await request(app)
            .get(`/api/v1/communications/rooms/${roomCode}/signals?afterSeq=0&videoEnabled=true&audioEnabled=true`)
            .set("Authorization", `Bearer ${doctorToken}`);
        expect(docSignals.statusCode).toBe(200);
        expect(docSignals.body.data.signals.some((s) => s.type === "OFFER" && s.fromUserId === patientUser.id)).toBe(true);
        expect(docSignals.body.data.participants.length).toBe(2);

        // Doctor sends WebRTC SDP ANSWER + ICE_CANDIDATE back to Patient
        const answerRes = await request(app)
            .post(`/api/v1/communications/rooms/${roomCode}/signal`)
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({
                toUserId: patientUser.id,
                type: "ANSWER",
                payload: { sdp: "v=0\r\no=- 67890 2 IN IP4 127.0.0.1\r\n", type: "answer" }
            });
        expect(answerRes.statusCode).toBe(200);

        const iceRes = await request(app)
            .post(`/api/v1/communications/rooms/${roomCode}/signal`)
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({
                toUserId: patientUser.id,
                type: "ICE_CANDIDATE",
                payload: { candidate: "candidate:1 1 UDP 2122252543 192.168.1.2 50000 typ host" }
            });
        expect(iceRes.statusCode).toBe(200);

        // Patient polls signals and receives both ANSWER and ICE_CANDIDATE
        const patSignals = await request(app)
            .get(`/api/v1/communications/rooms/${roomCode}/signals?afterSeq=0`)
            .set("Authorization", `Bearer ${patientToken}`);
        expect(patSignals.statusCode).toBe(200);
        const patSignalTypes = patSignals.body.data.signals.map((s) => s.type);
        expect(patSignalTypes).toContain("ANSWER");
        expect(patSignalTypes).toContain("ICE_CANDIDATE");

        // Doctor ends the call cleanly
        const endRes = await request(app)
            .post(`/api/v1/communications/calls/${roomCode}/end`)
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({ minutesSummary: "Follow-up lab results explained via video call." });
        expect(endRes.statusCode).toBe(200);
        expect(endRes.body.code).toBe("CALL_ENDED");
        expect(endRes.body.data.call.status).toBe("COMPLETED");
        expect(typeof endRes.body.data.durationSeconds).toBe("number");
    });

    test("4. Direct Voice Call Decline updates PostgreSQL status cleanly & clears incoming ring", async () => {
        const voiceCallRes = await request(app)
            .post("/api/v1/calls/calls")
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({ calleeId: patientUser.id, callMode: "VOICE", note: "Quick medication check" });

        expect(voiceCallRes.statusCode).toBe(201);
        expect(voiceCallRes.body.code).toBe("CALL_INITIATED");
        const roomCode = voiceCallRes.body.data.call.roomCode;
        createdMeetingIds.push(voiceCallRes.body.data.call.id);

        const declineRes = await request(app)
            .post(`/api/v1/communications/calls/${roomCode}/decline`)
            .set("Authorization", `Bearer ${patientToken}`)
            .send({ reason: "In transit, please call back shortly." });

        expect(declineRes.statusCode).toBe(200);
        expect(declineRes.body.code).toBe("CALL_DECLINED");
        expect(declineRes.body.data.call.status).toBe("CANCELLED");

        const checkIncoming = await request(app)
            .get("/api/v1/communications/calls/incoming")
            .set("Authorization", `Bearer ${patientToken}`);
        expect(checkIncoming.body.data.incomingCalls.some((c) => c.roomCode === roomCode)).toBe(false);
    });

    test("5. Multi-Camera Conference Meeting supports 3 simultaneous users with live roster & targeted WebRTC signaling", async () => {
        // Doctor creates an instant live multi-camera conference inviting Admin & Patient
        const confRes = await request(app)
            .post("/api/v1/communications/conferences")
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({
                title: "Phase 44 Family & Clinical Care Camera Conference",
                meetingType: "FAMILY_CARE_CONFERENCE",
                callMode: "VIDEO",
                invitedUserIds: [patientUser.id, adminUser.id]
            });

        expect(confRes.statusCode).toBe(201);
        expect(confRes.body.code).toBe("MEETING_SCHEDULED");
        const conf = confRes.body.data.conference;
        const roomCode = conf.roomCode;
        createdMeetingIds.push(conf.id);

        // Patient joins live camera conference
        const patJoin = await request(app)
            .post(`/api/v1/communications/rooms/${roomCode}/join`)
            .set("Authorization", `Bearer ${patientToken}`)
            .send({ callMode: "VIDEO", videoEnabled: true, audioEnabled: true });
        expect(patJoin.statusCode).toBe(200);
        expect(patJoin.body.code).toBe("CONFERENCE_JOINED");
        expect(patJoin.body.data.webrtcSession.activeParticipants.length).toBe(2);

        // Admin joins live camera conference (now 3 live cameras in room!)
        const adminJoin = await request(app)
            .post(`/api/v1/communications/rooms/${roomCode}/join`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ callMode: "VIDEO", videoEnabled: true, audioEnabled: true });
        expect(adminJoin.statusCode).toBe(200);
        expect(adminJoin.body.data.webrtcSession.activeParticipants.length).toBe(3);

        // Admin broadcasts MEDIA_STATE (camera on, mic muted) and sends targeted OFFER to Patient
        await request(app)
            .post(`/api/v1/communications/rooms/${roomCode}/signal`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ type: "MEDIA_STATE", payload: { audioEnabled: false, videoEnabled: true } });

        await request(app)
            .post(`/api/v1/communications/rooms/${roomCode}/signal`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ toUserId: patientUser.id, type: "OFFER", payload: { sdp: "v=0-admin-to-patient", type: "offer" } });

        // Patient receives both MEDIA_STATE and Admin's targeted OFFER; Doctor receives MEDIA_STATE but NOT Patient's private OFFER
        const [patPoll, docPoll] = await Promise.all([
            request(app).get(`/api/v1/communications/rooms/${roomCode}/signals?afterSeq=0`).set("Authorization", `Bearer ${patientToken}`),
            request(app).get(`/api/v1/communications/rooms/${roomCode}/signals?afterSeq=0`).set("Authorization", `Bearer ${doctorToken}`)
        ]);
        expect(patPoll.body.data.signals.some((s) => s.type === "OFFER" && s.fromUserId === adminUser.id)).toBe(true);
        expect(docPoll.body.data.signals.some((s) => s.type === "OFFER" && s.toUserId === patientUser.id)).toBe(false);
        expect(docPoll.body.data.signals.some((s) => s.type === "MEDIA_STATE")).toBe(true);

        // Patient leaves room -> roster drops from 3 to 2
        const leaveRes = await request(app)
            .post(`/api/v1/communications/rooms/${roomCode}/leave`)
            .set("Authorization", `Bearer ${patientToken}`);
        expect(leaveRes.statusCode).toBe(200);
        expect(leaveRes.body.data.remainingParticipantCount).toBe(2);

        // End conference cleanly
        const endConf = await request(app)
            .post(`/api/v1/communications/calls/${roomCode}/end`)
            .set("Authorization", `Bearer ${doctorToken}`)
            .send({ minutesSummary: "All 3 participants verified live camera room." });
        expect(endConf.statusCode).toBe(200);
        expect(endConf.body.code).toBe("CALL_ENDED");
    });
});
