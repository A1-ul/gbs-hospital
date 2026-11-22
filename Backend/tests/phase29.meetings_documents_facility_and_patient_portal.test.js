'use strict';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/core/database/prisma.client');

describe('Phase 29 — Procedure 4: Online Meetings, Document Versioning & Recovery, Facility Management & Patient Self-Service Portal', () => {
  const RUN_ID = Date.now();
  let adminToken;
  let createdMeetingId;
  let createdDocId;
  let createdDocV2Id;
  let createdTaskId;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@gbs.com', password: 'Admin123' });
    expect(loginRes.statusCode).toBe(200);
    adminToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    try {
      if (createdMeetingId) await prisma.hospitalMeeting.deleteMany({ where: { id: createdMeetingId } });
      if (createdDocV2Id) await prisma.hospitalDocument.deleteMany({ where: { id: createdDocV2Id } });
      if (createdDocId) await prisma.hospitalDocument.deleteMany({ where: { id: createdDocId } });
      if (createdTaskId) await prisma.facilityTask.deleteMany({ where: { id: createdTaskId } });
    } catch (_e) { }
    await prisma.$disconnect();
  });

  test('1. Online Meetings: Schedule, Join (WebRTC token), and Conclude with Minutes Summary', async () => {
    const sched = await request(app)
      .post('/api/v1/meetings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Phase29 Clinical Grand Rounds ${RUN_ID}`,
        meetingType: 'CLINICAL_BOARD',
        department: 'Internal Medicine',
        agenda: 'Weekly ICU mortality/morbidity & quality review'
      });
    expect(sched.statusCode).toBe(201);
    createdMeetingId = sched.body.data.id;
    expect(sched.body.data.meetingCode).toMatch(/^MTG-\d{4}-\d{6}$/);
    expect(sched.body.data.roomToken).toMatch(/^GBS-MEET-/);

    const join = await request(app)
      .post(`/api/v1/meetings/${createdMeetingId}/join`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(join.statusCode).toBe(200);
    expect(join.body.data.meeting.status).toBe('LIVE');
    expect(join.body.data.webrtcSession.screenShareEnabled).toBe(true);

    const end = await request(app)
      .post(`/api/v1/meetings/${createdMeetingId}/end`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ minutesSummary: 'All department action items assigned and signed.' });
    expect(end.statusCode).toBe(200);
    expect(end.body.data.status).toBe('COMPLETED');
  });

  test('2. Document Management: Store SHA-256 protected doc, create v2 version, deliver, soft-archive & point-in-time restore', async () => {
    const store = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Hospital Infection Policy ${RUN_ID}`,
        category: 'POLICY',
        fileName: 'ipc_protocol_2026.pdf',
        retentionYears: 10,
        contentNotes: 'Standard hospital infection prevention and isolation guideline'
      });
    expect(store.statusCode).toBe(201);
    createdDocId = store.body.data.id;
    expect(store.body.data.versionNumber).toBe(1);
    expect(store.body.data.storageChecksumSha256).toHaveLength(64);

    const v2 = await request(app)
      .post(`/api/v1/documents/${createdDocId}/new-version`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fileName: 'ipc_protocol_2026_v2.pdf', contentNotes: 'Updated ICU hand hygiene addendum' });
    expect(v2.statusCode).toBe(201);
    createdDocV2Id = v2.body.data.id;
    expect(v2.body.data.versionNumber).toBe(2);

    const deliver = await request(app)
      .post(`/api/v1/documents/${createdDocId}/deliver`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ deliveredTo: 'ICU Nursing Leadership' });
    expect(deliver.statusCode).toBe(200);
    expect(deliver.body.data.deliveryStatus).toBe('DELIVERED');

    const archive = await request(app)
      .patch(`/api/v1/documents/${createdDocId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(archive.statusCode).toBe(200);
    expect(archive.body.data.isDeleted).toBe(true);

    const restore = await request(app)
      .post(`/api/v1/documents/${createdDocId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(restore.statusCode).toBe(200);
    expect(restore.body.data.isDeleted).toBe(false);
  });

  test('3. Facility Management: Log housekeeping/utilities task and complete workflow cleanly', async () => {
    const create = await request(app)
      .post('/api/v1/facility/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: 'UTILITIES',
        title: `Central Oxygen Manifold Inspection ${RUN_ID}`,
        location: 'Oxygen Plant — Ground Floor',
        priority: 'HIGH',
        utilityMetricValue: 96.5,
        utilityMetricUnit: '% Reserve'
      });
    expect(create.statusCode).toBe(201);
    createdTaskId = create.body.data.id;
    expect(create.body.data.taskCode).toMatch(/^FAC-\d{4}-\d{6}$/);

    const complete = await request(app)
      .patch(`/api/v1/facility/tasks/${createdTaskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED', notes: 'Pressure verified nominal at 96.5%' });
    expect(complete.statusCode).toBe(200);
    expect(complete.body.data.status).toBe('COMPLETED');

    const tel = await request(app)
      .get('/api/v1/facility/telemetry')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(tel.statusCode).toBe(200);
    expect(tel.body.data.totalTasks).toBeGreaterThanOrEqual(1);
  });

  test('4. Patient Self-Service Portal endpoint GET /api/v1/patients/me/dashboard responds cleanly', async () => {
    const res = await request(app)
      .get('/api/v1/patients/me/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
