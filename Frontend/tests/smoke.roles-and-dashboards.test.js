/**
 * GBS Hospital Management System — Frontend Automated Smoke & Blueprint Verification Suite
 * Runnable via `npm test` (Node built-in test runner, zero external mocks)
 * LOCATION: Frontend/tests/smoke.roles-and-dashboards.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(FRONTEND_ROOT, 'src');
const PUBLIC_DIR = path.join(FRONTEND_ROOT, 'public');
const DIST_DIR = path.join(FRONTEND_ROOT, 'dist');

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

test('1. Header.jsx defines exact 16 Master Blueprint roles with zero SUPER_ADMIN', () => {
  const headerSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'Header.jsx'), 'utf8');
  const expectedRoles = [
    'ADMINISTRATOR', 'HOSPITAL_DIRECTOR', 'DEVELOPER', 'DOCTOR', 'SURGEON',
    'DENTIST', 'EYE_DOCTOR', 'RADIOLOGIST', 'NURSE', 'PHARMACIST',
    'LAB_TECHNICIAN', 'RECEPTIONIST', 'FOLDER_RETRIEVER', 'ACCOUNTANT',
    'HR_MANAGER', 'PATIENT'
  ];

  for (const role of expectedRoles) {
    assert.ok(headerSrc.includes(`id: '${role}'`), `Missing Blueprint role in Header.jsx: ${role}`);
  }
  assert.ok(!headerSrc.includes("id: 'SUPER_ADMIN'"), 'SUPER_ADMIN must remain retired');
});

test('2. App.jsx exposes hidden /developer-portal gate and RoleLoginModal excludes DEVELOPER', () => {
  const appSrc = fs.readFileSync(path.join(SRC_DIR, 'App.jsx'), 'utf8');
  const modalSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'RoleLoginModal.jsx'), 'utf8');
  const robotsTxt = fs.readFileSync(path.join(PUBLIC_DIR, 'robots.txt'), 'utf8');

  assert.ok(appSrc.includes('/developer-portal'), 'Hidden /developer-portal route must exist in App.jsx');
  assert.ok(modalSrc.includes("r.id !== 'DEVELOPER'"), 'Public RoleLoginModal must exclude DEVELOPER');
  assert.ok(robotsTxt.includes('Disallow: /developer-portal'), 'robots.txt must disallow /developer-portal');
  assert.ok(robotsTxt.includes('Disallow: /api/'), 'robots.txt must disallow /api/');
});

test('3. Every referenced real-life image exists (>5KB) in Frontend/public and compiled Frontend/dist', () => {
  const srcFiles = walkFiles(SRC_DIR).filter((f) => /\.(js|jsx|css)$/i.test(f));
  const refs = new Set();
  const re = /\/assets\/images\/([a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp|ico))/g;

  for (const f of srcFiles) {
    const content = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(content)) !== null) {
      refs.add(m[1]);
    }
  }

  assert.ok(refs.size >= 40, `Expected >= 40 real-life photographic assets, found ${refs.size}`);
  for (const img of refs) {
    const pubPath = path.join(PUBLIC_DIR, 'assets', 'images', img);
    const distPath = path.join(DIST_DIR, 'assets', 'images', img);
    assert.ok(fs.existsSync(pubPath), `Missing public image: ${img}`);
    assert.ok(fs.existsSync(distPath), `Missing dist image: ${img}`);
    assert.ok(fs.statSync(pubPath).size > 5000, `Public image too small/corrupt: ${img}`);
    assert.ok(fs.statSync(distPath).size > 5000, `Dist image too small/corrupt: ${img}`);
  }
});

test('4. Zero client credentials, zero localhost URLs, zero empty files, and zero Loan/Police contamination in Frontend/src', () => {
  const forbidden = [
    'ROLE_CREDENTIALS_MAP',
    'DevBootstrap123!',
    'Admin123',
    'Doctor123',
    'localhost:',
    '127.0.0.1',
    'Loan System',
    'Police System'
  ];

  const srcFiles = walkFiles(SRC_DIR).filter((f) => /\.(js|jsx|css|html)$/i.test(f));
  assert.ok(srcFiles.length >= 25, 'Frontend/src should contain active application modules');

  for (const f of srcFiles) {
    assert.ok(fs.statSync(f).size > 0, `Zero-byte file detected: ${f}`);
    const content = fs.readFileSync(f, 'utf8');
    for (const pat of forbidden) {
      assert.ok(!content.includes(pat), `Forbidden pattern "${pat}" found in ${f}`);
    }
  }
});

test('5. Compiled Vite production bundle exists in Frontend/dist with non-empty HTML, JS & CSS', () => {
  const indexHtml = path.join(DIST_DIR, 'index.html');
  assert.ok(fs.existsSync(indexHtml), 'Frontend/dist/index.html missing');
  assert.ok(fs.statSync(indexHtml).size > 300, 'Frontend/dist/index.html unexpectedly small');

  const distAssets = walkFiles(path.join(DIST_DIR, 'assets'));
  assert.ok(distAssets.some((f) => f.endsWith('.js') && fs.statSync(f).size > 50000), 'Compiled JS bundle missing');
  assert.ok(distAssets.some((f) => f.endsWith('.css') && fs.statSync(f).size > 2000), 'Compiled CSS bundle missing');
});

test('6. Zero browser hover tooltips (title= attributes) remain in Frontend/src UI components', () => {
  const jsxFiles = walkFiles(SRC_DIR).filter((f) => /\.jsx$/i.test(f));
  const offending = [];
  for (const f of jsxFiles) {
    const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (/(?<!\.)\btitle\s*=\s*["'{]/.test(line) && !/<iframe\b/i.test(line)) {
        offending.push(`${path.relative(SRC_DIR, f)}:${idx + 1}`);
      }
    });
  }
  assert.deepEqual(offending, [], `UI hover tooltips found: ${offending.join(', ')}`);
});

test('7. Global page navigation & async scroll restoration manager is wired (excluding Developer Dashboard)', () => {
  const navMgr = fs.readFileSync(path.join(SRC_DIR, 'services', 'navigation.manager.js'), 'utf8');
  const appSrc = fs.readFileSync(path.join(SRC_DIR, 'App.jsx'), 'utf8');
  const detailSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'UniversalDetailPage.jsx'), 'utf8');

  assert.ok(navMgr.includes("scrollRestoration = 'manual'"), 'Manual scrollRestoration required');
  assert.ok(navMgr.includes('isDeveloperRoute'), 'Developer Dashboard exclusion helper required');
  assert.ok(navMgr.includes('MutationObserver'), 'Async-aware scroll restoration required');
  assert.ok(appSrc.includes('handleNavigateBack'), 'Unified Back button handler required in App.jsx');
  assert.ok(appSrc.includes('restoreScrollSnapshot'), 'Scroll restoration required on popstate');
  assert.ok(!detailSrc.includes("window.scrollTo({ top: 0, behavior: 'smooth' })"), 'UniversalDetailPage must not override scroll restoration');
});
