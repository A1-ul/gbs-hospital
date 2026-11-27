'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/core/database/prisma.client');
const { bootstrapProduction } = require('../prisma/bootstrap-production');

const BRANDING_FILE = path.resolve(__dirname, '../backups/facility-branding.json');

describe('Phase 26 — Procedure 1 Security Hardening, Real Sessions, Developer MFA, Tenant Access Guard & Patient Safety Bypass', () => {
  const ROOT_DEV_EMAIL = process.env.DEVELOPER_ROOT_EMAIL || 'gabosei48@gmail.com';
  const ROOT_DEV_PASS = process.env.DEVELOPER_ROOT_PASSWORD || 'DevBootstrap123!';
  const RUN_ID = Date.now();
  const originalBrandingSnapshot = fs.existsSync(BRANDING_FILE)
    ? fs.readFileSync(BRANDING_FILE, 'utf8')
    : null;

  let devToken;
  let adminToken;
  let doctorToken;
  let createdDoctorEmail;
  let createdNurseEmail;
  let createdResetUserEmail;
  let createdTenantDbId;
  let createdTenantCode;
  let createdTenantAdminEmail;
  let createdHospitalId;

  beforeAll(async () => {
    const devLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ROOT_DEV_EMAIL, password: ROOT_DEV_PASS });
    expect(devLogin.statusCode).toBe(200);
    devToken = devLogin.body.data.token;

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@gbs.com', password: 'Admin123' });
    expect(adminLogin.statusCode).toBe(200);
    adminToken = adminLogin.body.data.token;

    // Self-contained Doctor & Nurse accounts (independent of Phase 24 test-data purge order)
    createdDoctorEmail = `p26.doctor.${RUN_ID}@hospital.test`;
    const docSignup = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        firstName: 'Phase26',
        lastName: 'Doctor',
        email: createdDoctorEmail,
        password: 'DoctorPassword123!',
        role: 'DOCTOR'
      });
    expect(docSignup.statusCode).toBe(201);
    const docApprove = await request(app)
      .patch(`/api/v1/users/${docSignup.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(docApprove.statusCode).toBe(200);

    const docLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: createdDoctorEmail, password: 'DoctorPassword123!' });
    expect(docLogin.statusCode).toBe(200);
    doctorToken = docLogin.body.data.token;

    createdNurseEmail = `p26.nurse.${RUN_ID}@hospital.test`;
    const nurseSignup = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        firstName: 'Phase26',
        lastName: 'Nurse',
        email: createdNurseEmail,
        password: 'NursePassword123!',
        role: 'NURSE'
      });
    expect(nurseSignup.statusCode).toBe(201);
    const nurseApprove = await request(app)
      .patch(`/api/v1/users/${nurseSignup.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(nurseApprove.statusCode).toBe(200);
  });

  afterAll(async () => {
    // Clean up synthetic test records created in this suite
    try {
      for (const tempEmail of [createdResetUserEmail, createdDoctorEmail, createdNurseEmail, createdTenantAdminEmail]) {
        if (!tempEmail) continue;
        const u = await prisma.user.findUnique({ where: { email: tempEmail } });
        if (u) {
          await prisma.systemConfiguration.deleteMany({ where: { configKey: `PWD_RESET_${u.id}` } });
          await prisma.session.deleteMany({ where: { userId: u.id } });
          await prisma.auditLog.deleteMany({ where: { userId: u.id } });
          await prisma.user.delete({ where: { id: u.id } });
        }
      }
      if (createdTenantDbId) {
        await prisma.auditLog.deleteMany({ where: { tenantId: createdTenantDbId } });
        await prisma.tenantSubscription.deleteMany({ where: { tenantId: createdTenantDbId } });
        await prisma.tenant.deleteMany({ where: { id: createdTenantDbId } });
      }
      if (createdHospitalId) {
        await prisma.hospital.deleteMany({ where: { id: createdHospitalId } });
      }
    } catch (_cleanupErr) {
      // Non-fatal cleanup guard
    }
    if (originalBrandingSnapshot !== null) {
      fs.writeFileSync(BRANDING_FILE, originalBrandingSnapshot, 'utf8');
    }
    await prisma.$disconnect();
  });

  test('1. Security headers enable self camera/microphone/geolocation for WebRTC, biometrics & GIS', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.headers['permissions-policy']).toContain('camera=(self)');
    expect(res.headers['permissions-policy']).toContain('microphone=(self)');
    expect(res.headers['permissions-policy']).toContain('geolocation=(self)');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('2. Unauthenticated health overview & environment endpoints redact PII, audit logs & internal DB diagnostics', async () => {
    const publicOverview = await request(app).get('/api/v1/health/overview-stats');
    expect(publicOverview.statusCode).toBe(200);
    expect(publicOverview.body.data.metrics).toBeDefined();
    expect(publicOverview.body.data.opdEncountersToday).toEqual([]);
    expect(publicOverview.body.data.recentAuditLogs).toEqual([]);
    expect(publicOverview.body.data.recentNotifications).toEqual([]);

    const publicEnv = await request(app).get('/api/v1/health/environment-info');
    expect(publicEnv.statusCode).toBe(200);
    expect(typeof publicEnv.body.data.demoModeEnabled).toBe('boolean');
    expect(publicEnv.body.data.databaseMetadata).toBeUndefined();

    const adminEnv = await request(app)
      .get('/api/v1/health/environment-info')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminEnv.statusCode).toBe(200);
    expect(adminEnv.body.data.databaseMetadata).toBeDefined();
  });

  test('3. PUT /api/v1/health/facility-branding rejects unauthenticated (401) and non-admin (403) callers', async () => {
    const unauth = await request(app)
      .put('/api/v1/health/facility-branding')
      .send({ hospitalName: 'Blocked Unauth' });
    expect(unauth.statusCode).toBe(401);

    const forbidden = await request(app)
      .put('/api/v1/health/facility-branding')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ hospitalName: 'Blocked Non-Admin' });
    expect(forbidden.statusCode).toBe(403);

    const allowed = await request(app)
      .put('/api/v1/health/facility-branding')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ hospitalName: 'GBS Premier Specialist Teaching Hospital' });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.body.data.mainSystemName).toBe('GBS HOSPITAL MANAGEMENT SYSTEM');
  });

  test('4. Step 32 Developer Isolation: RCCE diagnostics, permissions & configs are DEVELOPER-only (403 for ADMINISTRATOR, 200 for DEVELOPER), while ADMINISTRATOR retains hospital audit-logs & access-grant governance', async () => {
    // Non-developer ADMINISTRATOR is strictly blocked from hidden Developer Control Center diagnostics & configs
    const adminErrorsRes = await request(app)
      .get('/api/v1/rcce/errors')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminErrorsRes.statusCode).toBe(403);

    const adminPermsRes = await request(app)
      .get('/api/v1/rcce/developer/permissions')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminPermsRes.statusCode).toBe(403);

    const adminConfigsRes = await request(app)
      .get('/api/v1/rcce/developer/configs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminConfigsRes.statusCode).toBe(403);

    // Hospital ADMINISTRATOR retains legitimate hospital governance access (audit logs & grant approval queue)
    const adminAuditRes = await request(app)
      .get('/api/v1/rcce/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminAuditRes.statusCode).toBe(200);

    const adminGrantsRes = await request(app)
      .get('/api/v1/rcce/developer/access-grants')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminGrantsRes.statusCode).toBe(200);

    // Verified DEVELOPER retains full 200 OK access to all Developer Control Center endpoints
    const devErrorsRes = await request(app)
      .get('/api/v1/rcce/errors')
      .set('Authorization', `Bearer ${devToken}`);
    expect(devErrorsRes.statusCode).toBe(200);

    const devPermsRes = await request(app)
      .get('/api/v1/rcce/developer/permissions')
      .set('Authorization', `Bearer ${devToken}`);
    expect(devPermsRes.statusCode).toBe(200);

    const devConfigsRes = await request(app)
      .get('/api/v1/rcce/developer/configs')
      .set('Authorization', `Bearer ${devToken}`);
    expect(devConfigsRes.statusCode).toBe(200);
  });

  test('5. Real PostgreSQL Session persistence & immediate JWT revocation on POST /api/v1/auth/logout', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: createdNurseEmail, password: 'NursePassword123!' });
    expect(loginRes.statusCode).toBe(200);
    const sessionToken = loginRes.body.data.token;
    const sessionId = loginRes.body.data.sessionId;
    expect(sessionId).toBeTruthy();

    const sessionsRes = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(sessionsRes.statusCode).toBe(200);
    expect(sessionsRes.body.data.sessions.some((s) => s.id === sessionId)).toBe(true);

    const meBefore = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(meBefore.statusCode).toBe(200);

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(logoutRes.statusCode).toBe(200);
    expect(logoutRes.body.data.signedOut).toBe(true);

    // Reusing revoked JWT must be rejected immediately
    const meAfter = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(meAfter.statusCode).toBe(401);
  });

  test('6. End-to-end Forgot Password -> Reset Password flow with single-use token & truthful SMTP status', async () => {
    createdResetUserEmail = `p26.reset.${RUN_ID}@hospital.test`;
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        firstName: 'Phase26',
        lastName: 'ResetTester',
        email: createdResetUserEmail,
        password: 'InitialPassword123!',
        role: 'NURSE'
      });
    expect(signupRes.statusCode).toBe(201);
    const createdUserId = signupRes.body.data.id;

    // Approve user so login works
    const approveRes = await request(app)
      .patch(`/api/v1/users/${createdUserId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.statusCode).toBe(200);

    // Request password reset
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: createdResetUserEmail });
    expect(forgotRes.statusCode).toBe(200);
    expect(forgotRes.body.data.accepted).toBe(true);
    expect(forgotRes.body.data.emailDeliveryStatus).toBeDefined();
    const devResetCode = forgotRes.body.data.devVerificationToken;
    expect(devResetCode).toBeTruthy();

    // Complete password reset
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        email: createdResetUserEmail,
        resetToken: devResetCode,
        newPassword: 'UpdatedSecurePassword456!'
      });
    expect(resetRes.statusCode).toBe(200);
    expect(resetRes.body.data.reset).toBe(true);

    // Reusing the same single-use token must fail
    const replayRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        email: createdResetUserEmail,
        resetToken: devResetCode,
        newPassword: 'AnotherPassword789!'
      });
    expect(replayRes.statusCode).toBe(400);

    // Old password rejected, new password succeeds
    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: createdResetUserEmail, password: 'InitialPassword123!' });
    expect(oldLogin.statusCode).toBe(401);

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: createdResetUserEmail, password: 'UpdatedSecurePassword456!' });
    expect(newLogin.statusCode).toBe(200);
  });

  test('7. Developer MFA & Device Verification succeeds for DEVELOPER and rejects non-developers', async () => {
    const forbiddenMfa = await request(app)
      .post('/api/v1/auth/developer/mfa-challenge')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ deviceFingerprint: 'admin-device-fp' });
    expect(forbiddenMfa.statusCode).toBe(403);

    const challengeRes = await request(app)
      .post('/api/v1/auth/developer/mfa-challenge')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ deviceFingerprint: 'dev-workstation-fp-26' });
    expect(challengeRes.statusCode).toBe(200);
    const mfaCode = challengeRes.body.data.devMfaCode;
    expect(mfaCode).toMatch(/^\d{6}$/);

    const wrongVerify = await request(app)
      .post('/api/v1/auth/developer/mfa-verify')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ code: '000000', deviceFingerprint: 'dev-workstation-fp-26' });
    expect(wrongVerify.statusCode).toBe(401);

    const goodVerify = await request(app)
      .post('/api/v1/auth/developer/mfa-verify')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ code: mfaCode, deviceFingerprint: 'dev-workstation-fp-26' });
    expect(goodVerify.statusCode).toBe(200);
    expect(goodVerify.body.data.mfaVerified).toBe(true);
    expect(goodVerify.body.data.deviceVerified).toBe(true);
  });

  test('8. Supervised demo session strictly blocks DEVELOPER and respects DEMO_MODE_ENABLED toggle', async () => {
    const prevDemo = process.env.DEMO_MODE_ENABLED;
    try {
      process.env.DEMO_MODE_ENABLED = 'true';

      const devDemo = await request(app)
        .post('/api/v1/auth/demo-session')
        .send({ role: 'DEVELOPER' });
      expect(devDemo.statusCode).toBe(403);

      const docDemo = await request(app)
        .post('/api/v1/auth/demo-session')
        .send({ role: 'DOCTOR' });
      expect(docDemo.statusCode).toBe(200);
      expect(docDemo.body.data.isDemoSession).toBe(true);
      expect(docDemo.body.data.user.role).toBe('DOCTOR');

      process.env.DEMO_MODE_ENABLED = 'false';
      const disabledDemo = await request(app)
        .post('/api/v1/auth/demo-session')
        .send({ role: 'DOCTOR' });
      expect(disabledDemo.statusCode).toBe(403);
    } finally {
      if (prevDemo === undefined) {
        delete process.env.DEMO_MODE_ENABLED;
      } else {
        process.env.DEMO_MODE_ENABLED = prevDemo;
      }
    }
  });

  test('9. Global tenantAccessGuard blocks locked tenants (423) while preserving audited Patient Safety Emergency Bypass', async () => {
    createdTenantAdminEmail = `p26.tadmin.${RUN_ID}@hospital.test`;
    const regRes = await request(app)
      .post('/api/v1/tenants/register')
      .send({
        name: `Phase26 Guard Hospital ${RUN_ID}`,
        type: 'PRIVATE_HOSPITAL',
        country: 'Ghana',
        region: 'Greater Accra',
        city: 'Accra',
        address: '100 Safety Guard Blvd',
        officialEmail: `p26.hosp.${RUN_ID}@hospital.test`,
        officialPhone: '+233240009926',
        adminName: 'Dr. Tenant Guard',
        adminEmail: createdTenantAdminEmail,
        adminPhone: '+233240009927',
        adminPassword: 'TenantAdminPassword123!'
      });
    expect(regRes.statusCode).toBe(201);
    createdTenantDbId = regRes.body.data.id;
    createdTenantCode = regRes.body.data.tenantId;

    // Approve & provision tenant
    const approveRes = await request(app)
      .post(`/api/v1/tenants/${createdTenantDbId}/approve`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ plan: '1_MONTH_TRIAL' });
    expect(approveRes.statusCode).toBe(200);
    const tenantRecord = await prisma.tenant.findUnique({ where: { id: createdTenantDbId } });
    createdHospitalId = tenantRecord?.hospitalId || null;

    // Lock tenant
    const lockRes = await request(app)
      .post(`/api/v1/tenants/${createdTenantDbId}/lock`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ reason: 'Phase 26 Subscription Verification Lock' });
    expect(lockRes.statusCode).toBe(200);

    // Normal non-emergency route must return 423 SYSTEM_LOCKED for non-developer scoped to locked tenant
    const lockedBillingRes = await request(app)
      .get('/api/v1/billing/telemetry')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Id', createdTenantCode);
    expect(lockedBillingRes.statusCode).toBe(423);
    expect(lockedBillingRes.body.code).toBe('SYSTEM_LOCKED');
    expect(lockedBillingRes.body.data.emergencyBypassSupported).toBe(true);

    // Emergency route MUST NEVER BE LOCKED — passes with audited bypass header!
    const emergencyPassRes = await request(app)
      .get('/api/v1/emergency/stats')
      .set('Authorization', `Bearer ${doctorToken}`)
      .set('X-Tenant-Id', createdTenantCode);
    expect(emergencyPassRes.statusCode).toBe(200);
    expect(emergencyPassRes.headers['x-tenant-emergency-access']).toBe('ACTIVE_AUDITED');

    // Explicit X-Emergency-Override header on clinical route also passes & logs audit entry
    const overridePassRes = await request(app)
      .get('/api/v1/clinical/doctor/dashboard')
      .set('Authorization', `Bearer ${doctorToken}`)
      .set('X-Tenant-Id', createdTenantCode)
      .set('X-Emergency-Override', 'true')
      .set('X-Emergency-Reason', 'Code Blue Cardiac Resuscitation');
    expect(overridePassRes.statusCode).toBe(200);
    expect(overridePassRes.headers['x-tenant-emergency-access']).toBe('ACTIVE_AUDITED');

    // Verify audit log was persisted in PostgreSQL
    const bypassAudit = await prisma.auditLog.findFirst({
      where: {
        tenantId: createdTenantDbId,
        action: 'PATIENT_SAFETY_EMERGENCY_BYPASS'
      },
      orderBy: { createdAt: 'desc' }
    });
    expect(bypassAudit).not.toBeNull();

    // Unlock tenant and confirm normal billing telemetry works again
    const unlockRes = await request(app)
      .post(`/api/v1/tenants/${createdTenantDbId}/unlock`)
      .set('Authorization', `Bearer ${devToken}`);
    expect(unlockRes.statusCode).toBe(200);

    const restoredRes = await request(app)
      .get('/api/v1/billing/telemetry')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Id', createdTenantCode);
    expect(restoredRes.statusCode).toBe(200);
  });

  test('10. Production bootstrap is idempotent, retires SUPER_ADMIN, and never overwrites existing passwords', async () => {
    const beforeDev = await prisma.user.findUnique({ where: { email: ROOT_DEV_EMAIL } });
    expect(beforeDev).not.toBeNull();
    const originalHash = beforeDev.password;

    await bootstrapProduction();

    const afterDev = await prisma.user.findUnique({ where: { email: ROOT_DEV_EMAIL } });
    expect(afterDev.password).toBe(originalHash);

    const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    expect(superAdminRole).toBeNull();
  });
});
