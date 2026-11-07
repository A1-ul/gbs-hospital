"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PHASE 21 INTEGRATION TEST SUITE
GIS Facility Tracking, Campus Geofencing, Interactive Floor Plans
& WebRTC Video Telemedicine Subsystem
LOCATION: tests/phase21.gis_geofencing_webrtc_telemedicine.test.js
====================================================
*/

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");

describe("Phase 21: GIS Facility Tracking, Geofencing, Floor Plans & WebRTC Telemedicine", () => {
    let adminToken;
    let testGeofenceId;
    let testGeofenceCode;
    let testFloorPlanId;
    let testFloorPlanCode;
    let testSessionCode;
    const testTimestamp = Date.now();

    beforeAll(async () => {
        // Authenticate as Administrator
        const adminRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "admin@gbs.com",
                password: "Admin123"
            });
        expect(adminRes.status).toBe(200);
        adminToken = adminRes.body.data.token;
    });

    // -------------------------------------------------------------
    // 1. Security & GIS Telemetry
    // -------------------------------------------------------------
    test("1. GET /api/v1/gis/telemetry requires authentication (401 without token)", async () => {
        const res = await request(app).get("/api/v1/gis/telemetry");
        expect(res.status).toBe(401);
    });

    // -------------------------------------------------------------
    // 2. Geofencing & Perimeter Monitoring
    // -------------------------------------------------------------
    test("2. POST /api/v1/gis/geofences creates facility geofence with center coordinates and radius", async () => {
        const res = await request(app)
            .post("/api/v1/gis/geofences")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                name: `Main Hospital Campus Boundary ${testTimestamp}`,
                facilityType: "HOSPITAL_CAMPUS",
                centerLatitude: 5.6037, // Accra coordinates
                centerLongitude: -0.1870,
                radiusMeters: 600.0,
                alertOnBreach: true
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.code).toMatch(/^GEO-\d{4}-\d{6}$/);
        expect(res.body.data.radiusMeters).toBe(600.0);
        expect(res.body.data.status).toBe("ACTIVE");

        testGeofenceId = res.body.data.id;
        testGeofenceCode = res.body.data.code;
    });

    test("3. GET /api/v1/gis/geofences lists active facility geofences", async () => {
        const res = await request(app)
            .get("/api/v1/gis/geofences")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);

        const found = res.body.data.find(g => g.id === testGeofenceId);
        expect(found).toBeDefined();
        expect(found.code).toBe(testGeofenceCode);
    });

    test("4. POST /api/v1/gis/ping evaluates location ping inside geofence perimeter", async () => {
        // Coordinate ~100m from center (inside 600m geofence)
        const res = await request(app)
            .post("/api/v1/gis/ping")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                entityType: "AMBULANCE",
                entityId: `AMB-${testTimestamp}`,
                entityName: "GBS Rapid Response Unit 01",
                latitude: 5.6040,
                longitude: -0.1872
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.geofenceEvaluations).toBeDefined();

        const evalItem = res.body.data.geofenceEvaluations.find(e => e.geofenceId === testGeofenceId);
        expect(evalItem).toBeDefined();
        expect(evalItem.isInside).toBe(true);
        expect(evalItem.status).toBe("INSIDE_PERIMETER");
        expect(res.body.data.activeAlerts.length).toBe(0);
    });

    test("5. POST /api/v1/gis/ping detects out-of-bounds ping and generates PERIMETER_BREACH alert", async () => {
        // Coordinate ~5km away from center (outside 600m geofence)
        const res = await request(app)
            .post("/api/v1/gis/ping")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                entityType: "AMBULANCE",
                entityId: `AMB-${testTimestamp}`,
                entityName: "GBS Rapid Response Unit 01",
                latitude: 5.6500,
                longitude: -0.1870
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const evalItem = res.body.data.geofenceEvaluations.find(e => e.geofenceId === testGeofenceId);
        expect(evalItem).toBeDefined();
        expect(evalItem.isInside).toBe(false);
        expect(evalItem.status).toBe("OUTSIDE_PERIMETER");
        expect(evalItem.distanceMeters).toBeGreaterThan(600);

        // Verification of active alert
        expect(res.body.data.activeAlerts.length).toBeGreaterThanOrEqual(1);
        const breachAlert = res.body.data.activeAlerts.find(a => a.geofenceId === testGeofenceId);
        expect(breachAlert).toBeDefined();
        expect(breachAlert.eventType).toBe("PERIMETER_BREACH");
    });

    test("6. GET /api/v1/gis/breaches returns recorded geofence breach events", async () => {
        const res = await request(app)
            .get(`/api/v1/gis/breaches?geofenceId=${testGeofenceId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0].geofenceId).toBe(testGeofenceId);
        expect(res.body.data[0].entityType).toBe("AMBULANCE");
    });

    // -------------------------------------------------------------
    // 3. Interactive Building Floor Plans & Spatial Mapping
    // -------------------------------------------------------------
    test("7. POST /api/v1/gis/floor-plans creates interactive building floor plan (FLR-YYYY-XXXXXX)", async () => {
        const layoutData = {
            wings: ["NORTH_WING", "SOUTH_WING"],
            rooms: [
                { roomNumber: "OR-01", type: "SURGICAL_SUITE", x: 120, y: 80, status: "IN_USE" },
                { roomNumber: "ICU-04", type: "INTENSIVE_CARE", x: 300, y: 150, status: "OCCUPIED" }
            ],
            beds: [
                { bedNumber: "BED-OR-1A", roomId: "OR-01", status: "AVAILABLE" },
                { bedNumber: "BED-ICU-4A", roomId: "ICU-04", status: "OCCUPIED" }
            ],
            equipmentTags: [
                { tagId: "TAG-DEFIB-01", type: "DEFIBRILLATOR", x: 140, y: 90, status: "OPERATIONAL" }
            ]
        };

        const res = await request(app)
            .post("/api/v1/gis/floor-plans")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                buildingName: "Emergency & Surgical Tower",
                floorNumber: 2,
                floorName: "Level 2: Operating Theatres & PACU",
                totalBeds: 24,
                totalRooms: 10,
                layoutData
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.code).toMatch(/^FLR-\d{4}-\d{6}$/);
        expect(res.body.data.buildingName).toBe("Emergency & Surgical Tower");
        expect(res.body.data.floorNumber).toBe(2);

        testFloorPlanId = res.body.data.id;
        testFloorPlanCode = res.body.data.code;
    });

    test("8. GET /api/v1/gis/floor-plans/:id retrieves floor plan with spatial layout JSON", async () => {
        const res = await request(app)
            .get(`/api/v1/gis/floor-plans/${testFloorPlanId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.code).toBe(testFloorPlanCode);
        expect(res.body.data.layoutData).toBeDefined();
        expect(res.body.data.layoutData.rooms.length).toBe(2);
        expect(res.body.data.layoutData.beds.length).toBe(2);
    });

    // -------------------------------------------------------------
    // 4. WebRTC Video Telemedicine Subsystem
    // -------------------------------------------------------------
    test("9. POST /api/v1/telemedicine/consultations schedules virtual consultation (TEL-YYYY-XXXXXX)", async () => {
        const scheduledTime = new Date(Date.now() + 3600000).toISOString();

        const res = await request(app)
            .post("/api/v1/telemedicine/consultations")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                patientId: `PAT-TEL-${testTimestamp}`,
                patientName: "Kwame Asante",
                patientPhone: "+233244111222",
                doctorId: `DOC-TEL-${testTimestamp}`,
                doctorName: "Dr. Ama Pokuaa",
                specialty: "CARDIOLOGY",
                scheduledAt: scheduledTime,
                clinicalReason: "Post-discharge hypertension follow-up"
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.sessionCode).toMatch(/^TEL-\d{4}-\d{6}$/);
        expect(res.body.data.status).toBe("SCHEDULED");
        expect(res.body.data.roomToken).toBeDefined();
        expect(res.body.data.channelName).toBeDefined();

        testSessionCode = res.body.data.sessionCode;
    });

    test("10. GET /api/v1/telemedicine/consultations lists scheduled appointments", async () => {
        const res = await request(app)
            .get("/api/v1/telemedicine/consultations")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);

        const found = res.body.data.find(c => c.sessionCode === testSessionCode);
        expect(found).toBeDefined();
        expect(found.doctorName).toBe("Dr. Ama Pokuaa");
    });

    test("11. POST /api/v1/telemedicine/consultations/:sessionCode/waiting-room admits patient to virtual waiting room", async () => {
        const res = await request(app)
            .post(`/api/v1/telemedicine/consultations/${testSessionCode}/waiting-room`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                patientPhone: "+233244111222"
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("WAITING_ROOM");
    });

    test("12. POST /api/v1/telemedicine/consultations/:sessionCode/start doctor starts video call (IN_CALL)", async () => {
        const res = await request(app)
            .post(`/api/v1/telemedicine/consultations/${testSessionCode}/start`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("IN_CALL");
        expect(res.body.data.startedAt).toBeDefined();
    });

    test("13. POST /api/v1/telemedicine/consultations/:sessionCode/signal exchanges WebRTC SDP offer, answer and ICE candidates", async () => {
        // 1. Doctor sends SDP Offer
        const offerRes = await request(app)
            .post(`/api/v1/telemedicine/consultations/${testSessionCode}/signal`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                sdpOffer: "v=0\r\no=Doctor 12345 2 IN IP4 127.0.0.1\r\ns=TelemedConsultation",
                senderRole: "DOCTOR"
            });

        expect(offerRes.status).toBe(200);
        expect(offerRes.body.data.signalingState.sdpOffer).toBeDefined();

        // 2. Patient sends SDP Answer and ICE Candidate
        const answerRes = await request(app)
            .post(`/api/v1/telemedicine/consultations/${testSessionCode}/signal`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                sdpAnswer: "v=0\r\no=Patient 67890 2 IN IP4 127.0.0.1\r\ns=TelemedConsultationAnswer",
                iceCandidate: "candidate:1 1 UDP 2130706431 192.168.1.100 54321 typ host",
                senderRole: "PATIENT"
            });

        expect(answerRes.status).toBe(200);
        expect(answerRes.body.data.signalingState.sdpAnswer).toBeDefined();
        expect(answerRes.body.data.signalingState.iceCandidates.length).toBe(1);
    });

    test("14. POST /api/v1/telemedicine/consultations/:sessionCode/end completes consultation with notes, Rx, and rating", async () => {
        const res = await request(app)
            .post(`/api/v1/telemedicine/consultations/${testSessionCode}/end`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                clinicalNotes: "Patient blood pressure stable at 128/82 mmHg. Advised continued dietary moderation.",
                diagnosisCode: "I10.0", // Essential Primary Hypertension
                prescriptionSummary: "Amlodipine 5mg OD x 30 days",
                followUpDate: new Date(Date.now() + 86400000 * 30).toISOString(),
                callQualityRating: 5
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe("COMPLETED");
        expect(res.body.data.durationSeconds).toBeGreaterThanOrEqual(0);
        expect(res.body.data.diagnosisCode).toBe("I10.0");
        expect(res.body.data.callQualityRating).toBe(5);
    });

    test("15. GET /api/v1/telemedicine/telemetry returns virtual clinic metrics directly from PostgreSQL", async () => {
        const res = await request(app)
            .get("/api/v1/telemedicine/telemetry")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.totalConsultations).toBeGreaterThanOrEqual(1);
        expect(res.body.data.completedToday).toBeGreaterThanOrEqual(1);
        expect(res.body.data.avgQualityRating).toBeGreaterThanOrEqual(4.0);
    });
});
