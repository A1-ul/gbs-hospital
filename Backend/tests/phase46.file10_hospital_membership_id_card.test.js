"use strict";

/*
================================================================================
PHASE 46: FILE 10 PHASE 10.2 — OFFICIAL HOSPITAL REGISTRATION / MEMBERSHIP ID CARD
================================================================================
Verifies:
1. Registered / accepted Patient receives a verified Official Hospital Patient
   Membership Card (GET /api/v1/patients/:id/membership-card) containing complete
   stored patient details + complete hospital facility details + SHA-256 verification hash.
2. Unaccepted (pending/inactive) user registration is strictly blocked (403
   MEMBERSHIP_NOT_ACCEPTED) from generating a membership card until accepted by Admin.
3. Once Administrator accepts/approves the user, BOTH Admin (GET /api/v1/users/:id/membership-card)
   AND the accepted user themselves (GET /api/v1/auth/me/membership-card) generate
   their official card with canonical GBS-RCCE code MEMBERSHIP_CARD_GENERATED.
4. Patient privacy guard blocks a Patient from viewing another patient's ID card (403).
*/

const request = require("supertest");
process.env.NODE_ENV = "test";

const app = require("../src/app");
const prisma = require("../src/core/database/prisma.client");
const { waitForPendingAuditWrites } = require("../src/core/middleware/rcce-audit.middleware");

describe("Phase 46: File 10 Phase 10.2 — Hospital Official Registration & Membership ID Card", () => {
    let adminToken;
    let hospitalId;
    let patient1 = null;
    let patient2 = null;
    let memberUserId = null;
    let memberToken = null;
    let patRoleUserId = null;
    let patRoleToken = null;

    const stamp = Date.now();
    const memberEmail = `phase46.member.${stamp}@gbs.local`;
    const patEmail = `phase46.patient.${stamp}@gbs.local`;
    const pwd = "MemberCard2026!";

    beforeAll(async () => {
        const adminLogin = await request(app).post("/api/v1/auth/login").send({
            email: "admin@gbs.com",
            password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin123"
        });
        expect(adminLogin.statusCode).toBe(200);
        adminToken = adminLogin.body.data.token;

        const hospital = await prisma.hospital.findFirst({ orderBy: { createdAt: "asc" } });
        expect(hospital).toBeTruthy();
        hospitalId = hospital.id;
    }, 60000);

    afterAll(async () => {
        await waitForPendingAuditWrites(2000);
        const patIds = [patient1?.id, patient2?.id].filter(Boolean);
        if (patIds.length > 0) {
            await prisma.medicalFolder.deleteMany({ where: { patientId: { in: patIds } } }).catch(() => {});
            await prisma.patient.deleteMany({ where: { id: { in: patIds } } }).catch(() => {});
        }
        const uIds = [memberUserId, patRoleUserId].filter(Boolean);
        if (uIds.length > 0) {
            await prisma.auditLog.deleteMany({ where: { userId: { in: uIds } } }).catch(() => {});
            await prisma.session.deleteMany({ where: { userId: { in: uIds } } }).catch(() => {});
            await prisma.user.deleteMany({ where: { id: { in: uIds } } }).catch(() => {});
        }
        await new Promise((r) => setTimeout(r, 250));
    });

    test("1. Newly registered Patient gets Official Hospital Registration Membership Card with full Hospital & Member details", async () => {
        const regRes = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                hospitalId,
                firstName: "Efua",
                lastName: `Koomson_${stamp}`,
                dateOfBirth: "1994-03-22",
                gender: "FEMALE",
                phone: `+23324${String(stamp).slice(-7)}`,
                email: patEmail,
                bloodGroup: "A_POSITIVE",
                genotype: "AA",
                nhisNumber: `NHIS-${String(stamp).slice(-8)}`
            });
        expect(regRes.statusCode).toBe(201);
        patient1 = regRes.body.data.patient;

        const cardRes = await request(app)
            .get(`/api/v1/patients/${patient1.id}/membership-card`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(cardRes.statusCode).toBe(200);
        expect(cardRes.body.success).toBe(true);
        expect(cardRes.body.code).toBe("MEMBERSHIP_CARD_GENERATED");

        const card = cardRes.body.data;
        expect(card.cardSerial).toMatch(/^GBS-PAT-\d{4}-[A-Z0-9]{6}$/);
        expect(card.membershipStatus).toBe("ACCEPTED & REGISTERED");
        expect(card.verificationHash).toMatch(/^GBS-VRF-[A-F0-9]{12}$/);
        expect(card.qrPayload).toContain(card.cardSerial);

        // Stored member information verified
        expect(card.member.fullName).toBe(`Efua Koomson_${stamp}`);
        expect(card.member.memberNumber).toBe(patient1.patientNumber);
        expect(card.member.bloodGroup).toContain("A POSITIVE");
        expect(card.member.genotype).toBe("AA");

        // Stored hospital information verified
        expect(card.hospital.hospitalName).toBeTruthy();
        expect(card.hospital.hospitalCode).toBeTruthy();
        expect(card.hospital.address).toBeTruthy();
        expect(card.hospital.phone).toBeTruthy();
        expect(card.hospital.email).toBeTruthy();
        expect(card.hospital.logoUrl).toBeTruthy();
    });

    test("2. Pending (unaccepted) registration is blocked (403) until Administrator accepts, then official card issues cleanly", async () => {
        const signupRes = await request(app)
            .post("/api/v1/auth/signup")
            .send({
                email: memberEmail,
                password: pwd,
                firstName: "Kwesi",
                lastName: `Owusu_${stamp}`,
                role: "NURSE"
            });
        expect(signupRes.statusCode).toBe(201);
        memberUserId = signupRes.body.data.id;

        // Before Admin acceptance: must refuse generating a membership card
        const blockedBeforeAccept = await request(app)
            .get(`/api/v1/users/${memberUserId}/membership-card`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(blockedBeforeAccept.statusCode).toBe(403);
        expect(blockedBeforeAccept.body.error?.code || blockedBeforeAccept.body.code).toBe("MEMBERSHIP_NOT_ACCEPTED");

        // Admin accepts & activates member registration
        const approveRes = await request(app)
            .patch(`/api/v1/users/${memberUserId}/approve`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(approveRes.statusCode).toBe(200);

        // Admin generates official card for accepted member
        const adminCardRes = await request(app)
            .get(`/api/v1/users/${memberUserId}/membership-card`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(adminCardRes.statusCode).toBe(200);
        expect(adminCardRes.body.code).toBe("MEMBERSHIP_CARD_GENERATED");
        expect(adminCardRes.body.data.membershipStatus).toBe("ACCEPTED & ACTIVE");
        expect(adminCardRes.body.data.member.fullName).toBe(`Kwesi Owusu_${stamp}`);
        expect(adminCardRes.body.data.member.role).toBe("NURSE");
        expect(adminCardRes.body.data.hospital.hospitalName).toBeTruthy();

        // Accepted member logs in and generates their own card via /auth/me/membership-card
        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: memberEmail, password: pwd });
        expect(loginRes.statusCode).toBe(200);
        memberToken = loginRes.body.data.token;

        const selfCardRes = await request(app)
            .get("/api/v1/auth/me/membership-card")
            .set("Authorization", `Bearer ${memberToken}`);
        expect(selfCardRes.statusCode).toBe(200);
        expect(selfCardRes.body.code).toBe("MEMBERSHIP_CARD_GENERATED");
        expect(selfCardRes.body.data.cardSerial).toBe(adminCardRes.body.data.cardSerial);
        expect(selfCardRes.body.data.verificationHash).toBe(adminCardRes.body.data.verificationHash);
    });

    test("3. Patient self-service privacy allows viewing own card while blocking other patients' ID cards (403)", async () => {
        const reg2 = await request(app)
            .post("/api/v1/patients/register")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                hospitalId,
                firstName: "Private",
                lastName: `OtherPatient_${stamp}`,
                dateOfBirth: "1985-07-10",
                gender: "MALE",
                phone: `+23320${String(stamp).slice(-7)}`
            });
        expect(reg2.statusCode).toBe(201);
        patient2 = reg2.body.data.patient;

        // Create and accept PATIENT portal user matching patient1's email
        const pSignup = await request(app)
            .post("/api/v1/auth/signup")
            .send({ email: patEmail, password: pwd, firstName: "Efua", lastName: `Koomson_${stamp}`, role: "PATIENT" });
        expect(pSignup.statusCode).toBe(201);
        patRoleUserId = pSignup.body.data.id;

        await request(app).patch(`/api/v1/users/${patRoleUserId}/approve`).set("Authorization", `Bearer ${adminToken}`);
        const pLogin = await request(app).post("/api/v1/auth/login").send({ email: patEmail, password: pwd });
        expect(pLogin.statusCode).toBe(200);
        patRoleToken = pLogin.body.data.token;

        // Patient CAN view own card
        const ownCard = await request(app)
            .get(`/api/v1/patients/${patient1.id}/membership-card`)
            .set("Authorization", `Bearer ${patRoleToken}`);
        expect(ownCard.statusCode).toBe(200);
        expect(ownCard.body.data.member.memberNumber).toBe(patient1.patientNumber);

        // Patient CANNOT view another patient's card
        const otherCard = await request(app)
            .get(`/api/v1/patients/${patient2.id}/membership-card`)
            .set("Authorization", `Bearer ${patRoleToken}`);
        expect(otherCard.statusCode).toBe(403);
    });
});
