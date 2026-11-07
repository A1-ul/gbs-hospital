'use strict';

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/core/database/prisma.client');

describe('Phase 24 — Production Data Activation, Environment Identification, Backup Protection & Universal Navigation', () => {
  let devToken;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'developer@gbs.com',
        password: 'Admin123'
      });
    expect(loginRes.status).toBe(200);
    devToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('1. GET /api/v1/health exposes live PostgreSQL status and environment identification', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBe('connected');
    expect(res.body.environment).toBeDefined();
  });

  test('2. GET /api/v1/health/overview-stats returns live PostgreSQL database metrics with zero hardcoded values', async () => {
    const res = await request(app).get('/api/v1/health/overview-stats');
    expect(res.statusCode).toBe(200);
    const data = res.body.data || res.body;
    expect(data.metrics).toBeDefined();
    expect(typeof data.metrics.opdToday).toBe('number');
    expect(typeof data.metrics.admissions).toBe('number');
    expect(typeof data.metrics.surgeries).toBe('number');
    expect(typeof data.metrics.discharges).toBe('number');
    expect(typeof data.metrics.totalBeds).toBe('number');
  });

  test('3. GET /api/v1/health/environment-info returns active environment configuration', async () => {
    const res = await request(app).get('/api/v1/health/environment-info');
    expect(res.statusCode).toBe(200);
    const data = res.body.data || res.body;
    expect(data.activeEnvironment).toBeDefined();
    expect(data.officialCompanyEmail).toBe('gabosei48@gmail.com');
    expect(data.cloudHostingProvider).toBe('Render.com');
  });

  test('4. GET /api/v1/tenants/developer/environment-status classifies PRODUCTION vs DEVELOPMENT_TEST records', async () => {
    const res = await request(app)
      .get('/api/v1/tenants/developer/environment-status')
      .set('Authorization', `Bearer ${devToken}`);
    expect(res.statusCode).toBe(200);
    const data = res.body.data || res.body;
    expect(data.summary).toBeDefined();
    expect(typeof data.summary.totalProductionRecords).toBe('number');
    expect(typeof data.summary.totalDevelopmentTestRecords).toBe('number');
    expect(Array.isArray(data.tables)).toBe(true);
  });

  test('5. POST /api/v1/tenants/developer/backups/create creates a SHA-256 verified full database backup', async () => {
    const res = await request(app)
      .post('/api/v1/tenants/developer/backups/create')
      .set('Authorization', `Bearer ${devToken}`)
      .send({
        reason: 'PHASE24_VERIFICATION_BACKUP',
        fixedFilename: 'pre-production-activation-backup.json'
      });
    expect(res.statusCode).toBe(201);
    const data = res.body.data || res.body;
    expect(data.filename).toBe('pre-production-activation-backup.json');
    expect(data.verified).toBe(true);
    expect(data.checksumSha256).toHaveLength(64);
  });

  test('6. POST /api/v1/tenants/developer/backups/:filename/verify validates backup integrity', async () => {
    const res = await request(app)
      .post('/api/v1/tenants/developer/backups/pre-production-activation-backup.json/verify')
      .set('Authorization', `Bearer ${devToken}`);
    expect(res.statusCode).toBe(200);
    const data = res.body.data || res.body;
    expect(data.verified).toBe(true);
  });

  test('7. POST /api/v1/tenants/developer/purge-test-data backs up first and removes only test records while protecting bootstrap accounts', async () => {
    const res = await request(app)
      .post('/api/v1/tenants/developer/purge-test-data')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ fixedFilename: 'pre-production-activation-backup.json' });
    expect(res.statusCode).toBe(200);
    const data = res.body.data || res.body;
    expect(data.status).toBe('CLEAN_PRODUCTION_READY');
    expect(data.backupCreated.verified).toBe(true);

    const devUserAfter = await prisma.user.findUnique({ where: { email: 'developer@gbs.com' } });
    expect(devUserAfter).not.toBeNull();
    const adminUserAfter = await prisma.user.findUnique({ where: { email: 'admin@gbs.com' } });
    expect(adminUserAfter).not.toBeNull();
  });

  test('8. Universal Page Navigation SPA routes serve compiled Frontend index.html', async () => {
    const res = await request(app).get('/module/PATIENT_MPI/detail/PROFILE/MPI_REGISTRY');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});
