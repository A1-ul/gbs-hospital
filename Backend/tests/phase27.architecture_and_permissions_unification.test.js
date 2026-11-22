'use strict';

const fs = require('fs');
const path = require('path');
const { ALL_ROLES } = require('../src/config/roles');
const {
  PERMISSIONS,
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS_MAP,
  normalizePermission,
  isValidPermission,
  hasPermission
} = require('../src/core/security/permissions');
const authorizePermission = require('../src/core/security/permission.middleware');
const bootstrap = require('../prisma/bootstrap-production');
const prisma = require('../src/core/database/prisma.client');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('Phase 27 — Procedure 2 Architecture Cleanup, Unified Permission Registry & Blueprint Asset Integrity', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('1. Unified permissions registry exposes 82 canonical permissions mapped across all 16 Blueprint roles (zero SUPER_ADMIN)', () => {
    expect(ALL_ROLES).toHaveLength(16);
    expect(ALL_ROLES).not.toContain('SUPER_ADMIN');
    expect(ALL_PERMISSIONS.length).toBe(82);
    expect(Object.keys(PERMISSIONS).length).toBe(82);
    expect(Object.keys(ROLE_PERMISSIONS_MAP).sort()).toEqual([...ALL_ROLES].sort());

    // bootstrap-production reuses exact single source of truth
    expect(bootstrap.ALL_PERMISSIONS).toBe(ALL_PERMISSIONS);
    expect(bootstrap.ROLE_PERMISSIONS_MAP).toBe(ROLE_PERMISSIONS_MAP);

    // Every permission assigned to any role exists in ALL_PERMISSIONS
    for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS_MAP)) {
      expect(perms.length).toBeGreaterThan(0);
      for (const p of perms) {
        expect(isValidPermission(p)).toBe(true);
      }
      if (roleName === 'DEVELOPER') {
        expect(perms.length).toBe(82);
      }
      if (roleName === 'ADMINISTRATOR') {
        expect(perms).not.toContain('DEVELOPER_ACCESS');
        expect(perms).not.toContain('REMOTE_CONTROL');
      }
    }
  });

  test('2. normalizePermission & authorizePermission seamlessly support canonical UPPER_SNAKE and legacy dot notation', () => {
    expect(normalizePermission('patient.read')).toBe('PATIENT_READ');
    expect(normalizePermission('PATIENT_READ')).toBe('PATIENT_READ');
    expect(normalizePermission('staff.create')).toBe('USER_CREATE');
    expect(hasPermission(['PATIENT_READ'], 'patient.read')).toBe(true);
    expect(hasPermission(['PATIENT_READ'], 'BILLING_CREATE')).toBe(false);

    const mw = authorizePermission('patient.read');

    let nextArg = null;
    mw({ user: { id: 'u1', role: 'DOCTOR', permissions: ['PATIENT_READ'] }, originalUrl: '/test' }, {}, (err) => {
      nextArg = err || 'OK';
    });
    expect(nextArg).toBe('OK');

    let deniedArg = null;
    mw({ user: { id: 'u2', role: 'PATIENT', permissions: ['BILLING_READ'] }, originalUrl: '/test' }, {}, (err) => {
      deniedArg = err;
    });
    expect(deniedArg).toBeTruthy();
    expect(deniedArg.statusCode).toBe(403);

    let devArg = null;
    mw({ user: { id: 'dev1', role: 'DEVELOPER', permissions: [] }, originalUrl: '/test' }, {}, (err) => {
      devArg = err || 'OK';
    });
    expect(devArg).toBe('OK');
  });

  test('3. PostgreSQL database holds all 16 Blueprint roles and 82 unified permissions with SUPER_ADMIN absent', async () => {
    const roles = await prisma.role.findMany({ select: { name: true } });
    const roleNames = roles.map((r) => r.name);
    expect(roleNames).not.toContain('SUPER_ADMIN');
    for (const r of ALL_ROLES) {
      expect(roleNames).toContain(r);
    }

    const dbPermCount = await prisma.permission.count();
    expect(dbPermCount).toBeGreaterThanOrEqual(82);
  });

  test('4. Obsolete duplicate folders & SUPER_ADMIN image have been removed cleanly', () => {
    const removedTargets = [
      'Backend/src/modules/aaaa',
      'Backend/controllers',
      'Backend/developer-console',
      'Backend/src/developer-center',
      'Frontend/public/assets/images/portrait_super_admin.jpg',
      'Frontend/public/index.js'
    ];
    for (const rel of removedTargets) {
      expect(fs.existsSync(path.join(REPO_ROOT, rel))).toBe(false);
    }
  });

  test('5. Required blueprint PWA assets, robots security rules, ERD & Disaster Recovery docs are populated', () => {
    const requiredFiles = [
      'Frontend/public/favicon.ico',
      'Frontend/public/manifest.json',
      'Frontend/public/robots.txt',
      'database/ERD.md',
      'documentation/DISASTER_RECOVERY.md',
      'Backend/README.md',
      'Backend/ARCHITECTURE.md',
      'Backend/SECURITY.md'
    ];
    for (const rel of requiredFiles) {
      const full = path.join(REPO_ROOT, rel);
      expect(fs.existsSync(full)).toBe(true);
      expect(fs.statSync(full).size).toBeGreaterThan(50);
    }

    const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'Frontend/public/manifest.json'), 'utf8'));
    expect(manifest.name).toBe('GBS Hospital Management System');

    const robots = fs.readFileSync(path.join(REPO_ROOT, 'Frontend/public/robots.txt'), 'utf8');
    expect(robots).toContain('Disallow: /developer-portal');
    expect(robots).toContain('Disallow: /api/');

    // Ensure zero stray "Loan System" references remain in Frontend/src
    const globalsCss = fs.readFileSync(path.join(REPO_ROOT, 'Frontend/src/styles/globals.css'), 'utf8');
    const themeCss = fs.readFileSync(path.join(REPO_ROOT, 'Frontend/src/styles/theme.css'), 'utf8');
    expect(globalsCss).not.toMatch(/Loan System/i);
    expect(themeCss).not.toMatch(/Loan System/i);
  });
});
