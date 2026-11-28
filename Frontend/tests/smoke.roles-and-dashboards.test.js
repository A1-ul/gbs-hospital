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

test('8. Multilingual 10-language engine (incl. Arabic RTL) & 50 international countries are wired end-to-end', () => {
  const translationsSrc = fs.readFileSync(path.join(SRC_DIR, 'i18n', 'translations.js'), 'utf8');
  const countriesSrc = fs.readFileSync(path.join(SRC_DIR, 'i18n', 'countries.js'), 'utf8');
  const localeCtxSrc = fs.readFileSync(path.join(SRC_DIR, 'context', 'LocaleContext.jsx'), 'utf8');
  const mainSrc = fs.readFileSync(path.join(SRC_DIR, 'main.jsx'), 'utf8');
  const headerSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'Header.jsx'), 'utf8');
  const appSrc = fs.readFileSync(path.join(SRC_DIR, 'App.jsx'), 'utf8');
  const moduleViewsSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'ModuleViews.jsx'), 'utf8');

  for (const lang of ['en', 'fr', 'es', 'pt', 'ar', 'sw', 'tw', 'de', 'hi', 'zh']) {
    assert.ok(translationsSrc.includes(`code: '${lang}'`), `Missing supported language: ${lang}`);
  }
  assert.ok(translationsSrc.includes("dir: 'rtl'"), 'Arabic RTL direction metadata required');

  const countryMatches = countriesSrc.match(/\{\s*code:\s*'[A-Z]{2}'/g) || [];
  assert.ok(countryMatches.length >= 50, `Expected >= 50 international countries, found ${countryMatches.length}`);
  for (const region of ['Africa', 'Europe', 'Americas', 'Middle East', 'Asia-Pacific']) {
    assert.ok(countriesSrc.includes(`'${region}'`), `Missing global region: ${region}`);
  }

  assert.ok(localeCtxSrc.includes('document.documentElement.dir'), 'LocaleContext must sync HTML RTL/LTR direction');
  assert.ok(mainSrc.includes('LocaleProvider'), 'main.jsx must wrap App in LocaleProvider');
  assert.ok(headerSrc.includes('useLocale'), 'Header.jsx must expose live Language and Country switchers');
  assert.ok(appSrc.includes('useLocale'), 'App.jsx must consume LocaleContext translations');
  assert.ok(moduleViewsSrc.includes('INTERNATIONAL_COUNTRIES'), 'Tenant registration modal must offer international countries selector');
});

test('9. Organized All-Tabs Directory exposes all 25 hospital modules + gated Developer NOC + expandable Staff Role Grid', () => {
  const navModalSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'AllTabsNavigatorModal.jsx'), 'utf8');
  const appSrc = fs.readFileSync(path.join(SRC_DIR, 'App.jsx'), 'utf8');
  const headerSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'Header.jsx'), 'utf8');

  const requiredModules = [
    'PATIENTS', 'CLINICAL', 'WARDS', 'ICU', 'PHARMACY', 'SURGERY', 'DENTAL', 'EYE_CLINIC',
    'EMERGENCY', 'LABORATORY', 'RADIOLOGY', 'BLOOD_BANK', 'MORTUARY', 'BIOMEDICAL',
    'BILLING', 'NHIA_CLAIMS', 'PROCUREMENT', 'HR', 'QUALITY', 'EXECUTIVE_BI',
    'OPERATIONS_HUB', 'PATIENT_PORTAL', 'VOICE_AUTH', 'AI_SAFETY', 'TELEMEDICINE'
  ];

  for (const mod of requiredModules) {
    assert.ok(navModalSrc.includes(`key: '${mod}'`), `Missing module in AllTabsNavigatorModal: ${mod}`);
  }
  assert.ok(navModalSrc.includes('entry.devOnly && !isDeveloperAuthenticated'), 'Developer NOC must stay strictly gated inside AllTabsNavigatorModal');
  assert.ok(appSrc.includes('AllTabsNavigatorModal'), 'App.jsx must mount AllTabsNavigatorModal');
  assert.ok(headerSrc.includes('expandAllRolesGrid'), 'Header.jsx must provide Show All Roles Grid toggle so zero portals hide off-screen');
});

test('10. File 2 compliance: UniversalDetailPage i18n/No-Records empty state, 8-field Deployment Registry UI & Render-Only policy', () => {
  const udpSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'UniversalDetailPage.jsx'), 'utf8');
  const devPanelSrc = fs.readFileSync(path.join(SRC_DIR, 'modules', 'developer', 'DeveloperAdvancedOpsPanel.jsx'), 'utf8');

  assert.ok(udpSrc.includes('useLocale'), 'UniversalDetailPage must consume useLocale() for multilingual support');
  assert.ok(udpSrc.includes('No records available'), 'UniversalDetailPage must display standardized "No records available" empty state');
  assert.ok(udpSrc.includes('getInternationalProfile'), 'UniversalDetailPage must hydrate International Profile for Hospital & System Info');
  assert.ok(devPanelSrc.includes('getDeveloperDeploymentRegistry'), 'DeveloperAdvancedOpsPanel must render the live 8-field GBS Central Deployment Registry');

  // Render-only hosting check across Frontend/src
  const srcFiles = walkFiles(SRC_DIR).filter((f) => /\.(js|jsx|css)$/i.test(f));
  for (const f of srcFiles) {
    const content = fs.readFileSync(f, 'utf8');
    assert.ok(!/\b(vercel|netlify|railway)\b/i.test(content), `Non-Render hosting reference found in ${f}`);
  }
});

test('11. File 3 compliance: SystemFeedbackBrain code/requestId tracking & complete 8-tab RcceDeveloperConsole', () => {
  const brainSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'SystemFeedbackBrain.jsx'), 'utf8');
  const rcceSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'RcceDeveloperConsole.jsx'), 'utf8');

  assert.ok(brainSrc.includes('code: payload?.code'), 'SystemFeedbackBrain must preserve RCCE response code');
  assert.ok(brainSrc.includes('requestId: payload?.requestId'), 'SystemFeedbackBrain must preserve RCCE requestId');
  assert.ok(brainSrc.includes('useLocale'), 'SystemFeedbackBrain must support multilingual locale context');
  assert.ok(brainSrc.includes('No records available'), 'SystemFeedbackBrain must use standardized No records available empty state');

  for (const tabId of ['OVERVIEW', 'PRIVACY_GRANTS', 'PERMISSIONS', 'EVENTS', 'CATALOGUE', 'CONFIGS', 'ERRORS', 'AUDITS']) {
    assert.ok(rcceSrc.includes(`id: '${tabId}'`), `Missing RCCE Developer Console tab: ${tabId}`);
  }
  assert.ok(rcceSrc.includes('getRcceEvents'), 'RcceDeveloperConsole must load persisted System Events');
  assert.ok(rcceSrc.includes('getRcceCatalogue'), 'RcceDeveloperConsole must load Predefined Response Catalogue');
  assert.ok(rcceSrc.includes('updateRcceConfig'), 'RcceDeveloperConsole must allow saving authorized System Configurations');
  assert.ok(rcceSrc.includes('chainedLinksVerified'), 'RcceDeveloperConsole must display hardened SHA-256 chain link telemetry');
  assert.ok(rcceSrc.includes('No records available'), 'RcceDeveloperConsole must use standardized No records available empty states');
});

test('12. File 4 compliance: Connection Manager truthful 503 offline state, Header Retry & 8-card Developer Connection Diagnostics', () => {
  const connSrc = fs.readFileSync(path.join(SRC_DIR, 'services', 'connection.manager.js'), 'utf8');
  const headerSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'Header.jsx'), 'utf8');
  const devPanelSrc = fs.readFileSync(path.join(SRC_DIR, 'modules', 'developer', 'DeveloperAdvancedOpsPanel.jsx'), 'utf8');

  assert.ok(
    connSrc.includes('nextFailures >= offlineThreshold ? CONNECTION_STATES.OFFLINE : CONNECTION_STATES.DEGRADED'),
    'connection.manager.js must transition repeated 503 offline probes truthfully from DEGRADED to OFFLINE'
  );
  assert.ok(connSrc.includes('AbortController'), 'connection.manager.js must enforce request timeouts via AbortController');
  assert.ok(connSrc.includes('sanitizeConnectionReason'), 'connection.manager.js must sanitize failure reasons');
  assert.ok(headerSrc.includes('connectionManager.checkNow()'), 'Header.jsx must provide instant Retry action when degraded/offline');

  const requiredDevCards = [
    '1. Frontend Status',
    '2. Central Engine (GBS-RCCE)',
    '3. Database Status (PostgreSQL)',
    '4. API Response Time',
    '5. Last Successful Connection',
    '6. Last Failure Reason',
    '7. Server Uptime',
    '8. Recent Connection Errors',
  ];
  for (const label of requiredDevCards) {
    assert.ok(devPanelSrc.includes(label), `Missing Developer Connection Diagnostics card: ${label}`);
  }
});

test('13. File 5 compliance: Cross-browser page navigation, role-scoped history, filter persistence & Developer exclusion', () => {
  const navSrc = fs.readFileSync(path.join(SRC_DIR, 'services', 'navigation.manager.js'), 'utf8');
  const appSrc = fs.readFileSync(path.join(SRC_DIR, 'App.jsx'), 'utf8');
  const udpSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'UniversalDetailPage.jsx'), 'utf8');

  assert.ok(navSrc.includes('export function safeScrollTo'), 'navigation.manager.js must provide iOS/Safari-safe safeScrollTo');
  assert.ok(navSrc.includes('export function savePageViewState'), 'navigation.manager.js must persist per-page search/filter view state');
  assert.ok(navSrc.includes('export function saveRouteFallbackSnapshot'), 'navigation.manager.js must persist route fallback scroll snapshots');
  assert.ok(navSrc.includes("moduleKey === 'DEVELOPER_NOC' || moduleKey === 'DEVELOPER_PORTAL'"), 'Developer Dashboard must remain strictly excluded');

  assert.ok(appSrc.includes('VALID_MODULE_KEYS'), 'App.jsx must guard parseUrlRoute against invalid /module/... paths');
  assert.ok(appSrc.includes('setActiveModule(targetMod, { role: r })'), 'App.jsx must stamp destination role on dashboard switches');
  assert.ok(appSrc.includes('canRestoreRole'), 'App.jsx onPopState must enforce RBAC permissions when restoring role history');
  assert.ok(udpSrc.includes('savePageViewState') && udpSrc.includes('loadPageViewState'), 'UniversalDetailPage must restore filter & category state across navigation');
});

test('14. File 6 compliance: Developer infrastructure alerts, PostgreSQL cache/query/backup cards & scalability report', () => {
  const devPanelSrc = fs.readFileSync(path.join(SRC_DIR, 'modules', 'developer', 'DeveloperAdvancedOpsPanel.jsx'), 'utf8');
  const reportPath = path.resolve(SRC_DIR, '..', '..', 'documentation', 'DATABASE_POOL_AND_SCALABILITY_REPORT.md');

  assert.ok(devPanelSrc.includes('clusterHealth?.alerts?.activeAlerts'), 'DeveloperAdvancedOpsPanel must render live 80%/95% infrastructure threshold alerts');
  assert.ok(devPanelSrc.includes('cacheHitRatioPct'), 'DeveloperAdvancedOpsPanel must display PostgreSQL buffer cache hit ratio');
  assert.ok(devPanelSrc.includes('slowQueries'), 'DeveloperAdvancedOpsPanel must display live slow-query telemetry');
  assert.ok(devPanelSrc.includes('backupStatus'), 'DeveloperAdvancedOpsPanel must display backup snapshot status');
  assert.ok(devPanelSrc.includes('scalingRecommendation'), 'DeveloperAdvancedOpsPanel must display dynamic Render scaling recommendation');
  assert.ok(fs.existsSync(reportPath), 'documentation/DATABASE_POOL_AND_SCALABILITY_REPORT.md must exist');
});

test('15. File 7 compliance: Universal HTTP status handler (204/405/408/413/422/429/501-504), global ErrorBoundary & Portfolio Registry', () => {
  const apiSrc = fs.readFileSync(path.join(SRC_DIR, 'services', 'api.service.js'), 'utf8');
  const mainSrc = fs.readFileSync(path.join(SRC_DIR, 'main.jsx'), 'utf8');
  const ebSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'ErrorBoundary.jsx'), 'utf8');
  const docPath = path.resolve(SRC_DIR, '..', '..', 'documentation', 'GBS_UNIVERSAL_RELIABILITY_AND_PORTFOLIO_REGISTRY.md');

  assert.ok(apiSrc.includes('export function getFriendlyHttpErrorTitle'), 'api.service.js must export getFriendlyHttpErrorTitle');
  assert.ok(apiSrc.includes('response.status === 204'), 'api.service.js must handle HTTP 204 No Content cleanly');
  for (const statusCode of ['case 405:', 'case 408:', 'case 409:', 'case 413:', 'case 422:', 'case 429:', 'case 501:', 'case 503:']) {
    assert.ok(apiSrc.includes(statusCode), `Missing universal HTTP status mapping in api.service.js: ${statusCode}`);
  }
  assert.ok(mainSrc.includes('<ErrorBoundary>'), 'main.jsx must wrap App in global ErrorBoundary');
  assert.ok(ebSrc.includes('getDerivedStateFromError') && ebSrc.includes('componentDidCatch'), 'ErrorBoundary must catch unhandled React exceptions safely');
  assert.ok(fs.existsSync(docPath), 'documentation/GBS_UNIVERSAL_RELIABILITY_AND_PORTFOLIO_REGISTRY.md must exist');
});

test('16. File 8 Phase 8.1 compliance: Official GBS lossless company logo, multi-res favicon/PWA icons & undistorted placement', () => {
  const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const icoMagic = Buffer.from([0x00, 0x00, 0x01, 0x00]);

  const officialPngs = ['gbs-official-logo.png', 'hospital-logo.png', 'logo.png'];
  for (const name of officialPngs) {
    const pubPath = path.join(PUBLIC_DIR, name);
    const distPath = path.join(DIST_DIR, name);
    assert.ok(fs.existsSync(pubPath), `Missing official logo PNG in public/: ${name}`);
    assert.ok(fs.existsSync(distPath), `Missing official logo PNG in dist/: ${name}`);
    const buf = fs.readFileSync(pubPath);
    assert.ok(buf.subarray(0, 8).equals(pngMagic), `${name} must be a genuine lossless PNG (not a JPEG renamed .png)`);
    assert.ok(buf.length > 1000000, `${name} must retain full high-resolution lossless quality (>1MB)`);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert.strictEqual(width, 1024, `${name} width must be unmodified 1024px`);
    assert.strictEqual(height, 1024, `${name} height must be unmodified 1024px`);
  }

  for (const [iconName, expectedSize] of [
    ['favicon-32x32.png', 32],
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ]) {
    const p = path.join(PUBLIC_DIR, iconName);
    assert.ok(fs.existsSync(p), `Missing derived official icon in public/: ${iconName}`);
    assert.ok(fs.existsSync(path.join(DIST_DIR, iconName)), `Missing derived official icon in dist/: ${iconName}`);
    const buf = fs.readFileSync(p);
    assert.ok(buf.subarray(0, 8).equals(pngMagic), `${iconName} must be a genuine PNG`);
    assert.strictEqual(buf.readUInt32BE(16), expectedSize, `${iconName} width must be ${expectedSize}px`);
    assert.strictEqual(buf.readUInt32BE(20), expectedSize, `${iconName} height must be ${expectedSize}px`);
  }

  const icoBuf = fs.readFileSync(path.join(PUBLIC_DIR, 'favicon.ico'));
  assert.ok(icoBuf.subarray(0, 4).equals(icoMagic), 'favicon.ico must be a valid ICO container');

  const htmlSrc = fs.readFileSync(path.resolve(SRC_DIR, '..', 'index.html'), 'utf8');
  const manifestSrc = fs.readFileSync(path.join(PUBLIC_DIR, 'manifest.json'), 'utf8');
  const headerSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'Header.jsx'), 'utf8');
  const loginSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'RoleLoginModal.jsx'), 'utf8');
  const devGateSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'DeveloperPortalGate.jsx'), 'utf8');
  const ebSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'ErrorBoundary.jsx'), 'utf8');

  assert.ok(htmlSrc.includes('/favicon-32x32.png') && htmlSrc.includes('/gbs-official-logo.png') && htmlSrc.includes('/apple-touch-icon.png'), 'index.html must reference official GBS icons & favicon');
  assert.ok(manifestSrc.includes('/icon-192.png') && manifestSrc.includes('/icon-512.png') && manifestSrc.includes('#091830'), 'manifest.json must reference official GBS PWA icons & Navy theme');
  assert.ok(headerSrc.includes('/gbs-official-logo.png') && headerSrc.includes("objectFit: 'contain'"), 'Header.jsx must display official GBS logo without clipping');
  assert.ok(loginSrc.includes('/gbs-official-logo.png'), 'RoleLoginModal.jsx must display official GBS logo');
  assert.ok(devGateSrc.includes('/gbs-official-logo.png'), 'DeveloperPortalGate.jsx must display official GBS logo');
  assert.ok(ebSrc.includes('/gbs-official-logo.png'), 'ErrorBoundary.jsx must display official GBS logo');
});

test('17. File 8 Phase 8.3 compliance: All-Users Voice/Video Calling, Incoming Ringing & Live Multi-Camera WebRTC Rooms', () => {
  const webrtcSrc = fs.readFileSync(path.join(SRC_DIR, 'services', 'webrtc.service.js'), 'utf8');
  const apiSrc = fs.readFileSync(path.join(SRC_DIR, 'services', 'api.service.js'), 'utf8');
  const liveRoomSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'LiveMediaRoomModal.jsx'), 'utf8');
  const callHubSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'CallCenterModal.jsx'), 'utf8');
  const ringSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'IncomingCallBanner.jsx'), 'utf8');
  const headerSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'Header.jsx'), 'utf8');
  const appSrc = fs.readFileSync(path.join(SRC_DIR, 'App.jsx'), 'utf8');
  const opsSrc = fs.readFileSync(path.join(SRC_DIR, 'modules', 'operations', 'OperationsSuiteView.jsx'), 'utf8');
  const teleSrc = fs.readFileSync(path.join(SRC_DIR, 'modules', 'telemedicine', 'TelemedicineGisView.jsx'), 'utf8');

  assert.ok(webrtcSrc.includes('getUserMedia') && webrtcSrc.includes('getDisplayMedia') && webrtcSrc.includes('createWebRtcRoomClient'), 'webrtc.service.js must implement real browser getUserMedia, getDisplayMedia & multi-peer RTCPeerConnection');
  assert.ok(apiSrc.includes('/communications/directory') && apiSrc.includes('/communications/calls') && apiSrc.includes('/communications/conferences'), 'api.service.js must wire all communications endpoints');

  assert.ok(liveRoomSrc.includes('<video') && liveRoomSrc.includes('Live Self-View') && liveRoomSrc.includes('remotePeers.map'), 'LiveMediaRoomModal.jsx must render both live Self-View camera and remote participant live camera grid');
  assert.ok(callHubSrc.includes('Voice Call') && callHubSrc.includes('Video Call') && callHubSrc.includes('Start & Open Camera'), 'CallCenterModal.jsx must provide one-click Voice Call, Video Call & Camera Conference controls');
  assert.ok(ringSrc.includes('Answer Video') && ringSrc.includes('Voice Only') && ringSrc.includes('Decline'), 'IncomingCallBanner.jsx must provide Answer Video, Voice Only & Decline buttons');

  assert.ok(headerSrc.includes('gbs:call_event') && headerSrc.includes('gbs:webrtc_signal') && headerSrc.includes('onOpenCallCenter'), 'Header.jsx must forward calling/WebRTC SSE events and display the Voice & Video Calls launcher');
  assert.ok(appSrc.includes('<CallCenterModal') && appSrc.includes('<IncomingCallBanner') && appSrc.includes('<LiveMediaRoomModal'), 'App.jsx must render CallCenterModal, IncomingCallBanner & LiveMediaRoomModal globally');
  assert.ok(opsSrc.includes('joinCommunicationRoom') && opsSrc.includes('Join Camera'), 'OperationsSuiteView.jsx must launch the live multi-camera conference room');
  assert.ok(teleSrc.includes('acquireLocalMedia') && teleSrc.includes('<video') && !teleSrc.includes('HR: 74 bpm'), 'TelemedicineGisView.jsx must use real live browser camera instead of static placeholder image/vitals');
});

test('18. File 9 compliance: Zero native browser alert/confirm/prompt, zero dead handlers, 100% API route parity, 12-Phase Scorecard & Report', () => {
  const allSrcFiles = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(jsx?|tsx?)$/.test(entry.name)) allSrcFiles.push(full);
    }
  })(SRC_DIR);

  for (const filePath of allSrcFiles) {
    const text = fs.readFileSync(filePath, 'utf8');
    assert.ok(!/\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test(text), `Native blocking browser popup forbidden in ${path.relative(SRC_DIR, filePath)}`);
    assert.ok(!/onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/.test(text), `Dead empty onClick handler forbidden in ${path.relative(SRC_DIR, filePath)}`);
  }

  // Verify every API route prefix called by Frontend/src/services/api.service.js is mounted in Backend/src/routes/index.js
  const apiSrc = fs.readFileSync(path.join(SRC_DIR, 'services', 'api.service.js'), 'utf8');
  const backendIdxSrc = fs.readFileSync(path.resolve(SRC_DIR, '..', '..', 'Backend', 'src', 'routes', 'index.js'), 'utf8');
  const mounted = new Set([...backendIdxSrc.matchAll(/registerRoute\(\s*["'](\/[^"']+)["']/g)].map((m) => m[1]));
  mounted.add('/rcce');
  for (const m of apiSrc.matchAll(/request(?:Envelope)?\s*\(\s*[`'"](\/[^`'"?$]+)/g)) {
    const seg = '/' + m[1].replace(/^\/+/, '').split('/')[0];
    assert.ok(mounted.has(seg), `Frontend API prefix ${seg} is not mounted in Backend/src/routes/index.js`);
  }

  const devPanelSrc = fs.readFileSync(path.join(SRC_DIR, 'modules', 'developer', 'DeveloperAdvancedOpsPanel.jsx'), 'utf8');
  assert.ok(devPanelSrc.includes('getDeveloperWorkingSystemAudit') && devPanelSrc.includes('12-Phase Working-System Verification Scorecard'), 'DeveloperAdvancedOpsPanel must render live 12-Phase Working-System Scorecard');

  const reportPath = path.resolve(SRC_DIR, '..', '..', 'documentation', 'GBS_12_PHASE_WORKING_SYSTEM_VERIFICATION_REPORT.md');
  assert.ok(fs.existsSync(reportPath), 'documentation/GBS_12_PHASE_WORKING_SYSTEM_VERIFICATION_REPORT.md must exist');
});

test('19. File 10 compliance: Official GBS Brand Colour Standardisation, Light/Dark/High-Contrast/Text-Size Switcher, Hospital Membership ID Card & WCAG 2.2 AA Report', () => {
  const themeCss = fs.readFileSync(path.join(SRC_DIR, 'styles', 'theme.css'), 'utf8');
  const globalsCss = fs.readFileSync(path.join(SRC_DIR, 'styles', 'globals.css'), 'utf8');
  const themeCtx = fs.readFileSync(path.join(SRC_DIR, 'context', 'ThemeContext.jsx'), 'utf8');
  const mainSrc = fs.readFileSync(path.join(SRC_DIR, 'main.jsx'), 'utf8');
  const appSrc = fs.readFileSync(path.join(SRC_DIR, 'App.jsx'), 'utf8');
  const headerSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'Header.jsx'), 'utf8');
  const apiSrc = fs.readFileSync(path.join(SRC_DIR, 'services', 'api.service.js'), 'utf8');
  const idCardModalSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'HospitalMembershipCardModal.jsx'), 'utf8');
  const moduleViewsSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'ModuleViews.jsx'), 'utf8');
  const patientPortalSrc = fs.readFileSync(path.join(SRC_DIR, 'modules', 'patient-portal', 'PatientPortalView.jsx'), 'utf8');

  // 1. Official 6 GBS Brand Colours locked
  for (const hex of ['#091830', '#C29B4F', '#E7CF88', '#BAA479', '#F7F5EF', '#1B1A1B']) {
    assert.ok(themeCss.includes(hex) && globalsCss.includes(hex) && themeCtx.includes(hex), `Missing official GBS brand colour ${hex}`);
  }

  // 2. Zero off-brand wine-red gradients anywhere in Frontend/src
  const allSrcFiles = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(css|jsx?|tsx?)$/.test(entry.name)) allSrcFiles.push(full);
    }
  })(SRC_DIR);
  for (const filePath of allSrcFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(!/(?:7f1d1d|450a0a|881337|4c0519)/i.test(content), `Legacy off-brand wine-red colour found in ${path.relative(SRC_DIR, filePath)}`);
  }

  // 3. ThemeProvider + data-role + Header Display & Accessibility Switcher wired
  assert.ok(mainSrc.includes('<ThemeProvider>'), 'main.jsx must wrap App inside ThemeProvider');
  assert.ok(appSrc.includes('data-role={currentRole}'), 'App.jsx must stamp data-role={currentRole} on root container');
  assert.ok(headerSrc.includes('useTheme') && headerSrc.includes('setThemeMode') && headerSrc.includes('setTextSize'), 'Header.jsx must expose Light/Dark/High-Contrast & Text-Size controls');

  // 4. Official Hospital Registration / Membership ID Card wired across Frontend & Backend
  assert.ok(apiSrc.includes('getPatientMembershipCard') && apiSrc.includes('getUserMembershipCard') && apiSrc.includes('getMyMembershipCard'), 'api.service.js must wire all 3 membership card endpoints');
  assert.ok(idCardModalSrc.includes('handlePrintCard') && idCardModalSrc.includes('handleDownloadPng') && idCardModalSrc.includes('VerificationMatrixSvg'), 'HospitalMembershipCardModal.jsx must render Front/Back card with Print, PNG Download & SVG Seal');
  assert.ok(appSrc.includes('<HospitalMembershipCardModal') && appSrc.includes('gbsOpenPatientMembershipCard') && appSrc.includes('gbsOpenUserMembershipCard') && appSrc.includes('gbsOpenMyMembershipCard'), 'App.jsx must host HospitalMembershipCardModal & global launchers');
  assert.ok(headerSrc.includes('My ID Card') && headerSrc.includes('gbsOpenUserMembershipCard'), 'Header.jsx must provide My ID Card & Staff Directory ID Card launchers');
  assert.ok(moduleViewsSrc.includes('Generate Registration ID Card') && moduleViewsSrc.includes('gbsOpenPatientMembershipCard'), 'ModuleViews.jsx PatientManagementView must provide Registration ID Card generation');
  assert.ok(patientPortalSrc.includes('My Hospital ID Card'), 'PatientPortalView.jsx must provide My Hospital ID Card launcher');

  const backendServicePath = path.resolve(SRC_DIR, '..', '..', 'Backend', 'src', 'modules', 'patients', 'services', 'membership-card.service.js');
  assert.ok(fs.existsSync(backendServicePath), 'Backend membership-card.service.js must exist');

  // 5. Published WCAG 2.2 AA Accessibility & Contrast Audit Report
  const auditReportPath = path.resolve(SRC_DIR, '..', '..', 'documentation', 'GBS_ACCESSIBILITY_CONTRAST_AUDIT_REPORT.md');
  assert.ok(fs.existsSync(auditReportPath), 'documentation/GBS_ACCESSIBILITY_CONTRAST_AUDIT_REPORT.md must exist');
  const auditReportText = fs.readFileSync(auditReportPath, 'utf8');
  assert.ok(auditReportText.includes('WCAG 2.2 AA') && auditReportText.includes('#091830') && auditReportText.includes('42 / 42'), 'Accessibility Contrast Audit Report must contain verified WCAG 2.2 AA results');
});
