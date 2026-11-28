import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDeveloperRoute,
  initManualScrollRestoration,
  safeScrollTo,
  generateNavKey,
  captureScrollSnapshot,
  saveScrollSnapshot,
  loadScrollSnapshot,
  saveRouteFallbackSnapshot,
  loadRouteFallbackSnapshot,
  savePageViewState,
  loadPageViewState,
  scrollNewPageToTop,
  restoreScrollSnapshot,
  cancelPendingScrollRestoration,
} from '../src/services/navigation.manager.js';

function createMockBrowserEnv({ throwOnOptionsScroll = false } = {}) {
  const storage = new Map();
  const listeners = new Map();
  const scrollCalls = [];

  const nestedTableContainer = {
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 900,
    clientHeight: 300,
    scrollWidth: 1400,
    clientWidth: 600,
    _attrs: { 'data-scroll-container': 'true', 'data-scroll-key': 'patients-table-wrap' },
    getAttribute(k) {
      return this._attrs[k] ?? null;
    },
  };

  const nestedSidebarContainer = {
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 800,
    clientHeight: 350,
    scrollWidth: 260,
    clientWidth: 260,
    _attrs: { id: 'dashboard-sidebar-nav' },
    getAttribute(k) {
      return this._attrs[k] ?? null;
    },
  };

  const mainEl = {
    scrollTop: 0,
    scrollLeft: 0,
    scrollHeight: 1600,
    clientHeight: 800,
    scrollWidth: 1200,
    clientWidth: 1200,
    _attrs: {},
    getAttribute(k) {
      return this._attrs[k] ?? null;
    },
    querySelectorAll(sel) {
      if (sel.includes('aside')) return [nestedSidebarContainer];
      return [];
    },
  };

  const mockWindow = {
    scrollX: 0,
    scrollY: 0,
    pageXOffset: 0,
    pageYOffset: 0,
    innerHeight: 800,
    history: { scrollRestoration: 'auto' },
    sessionStorage: {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    },
    getComputedStyle(el) {
      if (el === nestedSidebarContainer) {
        return { overflowY: 'auto', overflowX: 'hidden' };
      }
      return { overflowY: 'visible', overflowX: 'visible' };
    },
    scrollTo(arg1, arg2) {
      if (typeof arg1 === 'object' && arg1 !== null) {
        if (throwOnOptionsScroll) {
          throw new TypeError('scrollTo options not supported');
        }
        this.scrollX = arg1.left ?? 0;
        this.scrollY = arg1.top ?? 0;
        this.pageXOffset = this.scrollX;
        this.pageYOffset = this.scrollY;
        scrollCalls.push({ x: this.scrollX, y: this.scrollY, mode: 'options' });
      } else {
        this.scrollX = Number(arg1 || 0);
        this.scrollY = Number(arg2 || 0);
        this.pageXOffset = this.scrollX;
        this.pageYOffset = this.scrollY;
        scrollCalls.push({ x: this.scrollX, y: this.scrollY, mode: 'positional' });
      }
    },
    addEventListener(evt, fn) {
      if (!listeners.has(evt)) listeners.set(evt, new Set());
      listeners.get(evt).add(fn);
    },
    removeEventListener(evt, fn) {
      listeners.get(evt)?.delete(fn);
    },
    dispatchMockEvent(evt, payload = {}) {
      listeners.get(evt)?.forEach((fn) => fn(payload));
    },
  };

  let activeObserverCallback = null;
  class MockMutationObserver {
    constructor(cb) {
      this.cb = cb;
      activeObserverCallback = cb;
    }
    observe() {}
    disconnect() {
      if (activeObserverCallback === this.cb) activeObserverCallback = null;
    }
  }

  const mockDocument = {
    body: {},
    documentElement: { scrollHeight: 2400 },
    querySelector(sel) {
      if (sel === 'main') return mainEl;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '[data-scroll-container]') return [nestedTableContainer];
      return [];
    },
  };

  globalThis.window = mockWindow;
  globalThis.document = mockDocument;
  globalThis.MutationObserver = MockMutationObserver;
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 5);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  return {
    mockWindow,
    mockDocument,
    nestedTableContainer,
    nestedSidebarContainer,
    scrollCalls,
    triggerDomMutation: () => activeObserverCallback && activeObserverCallback(),
    cleanup() {
      cancelPendingScrollRestoration();
      delete globalThis.window;
      delete globalThis.document;
      delete globalThis.MutationObserver;
      delete globalThis.requestAnimationFrame;
      delete globalThis.cancelAnimationFrame;
    },
  };
}

test('1. Developer Dashboard routes are strictly excluded while all hospital dashboards are enabled', () => {
  assert.equal(isDeveloperRoute('DEVELOPER_NOC'), true);
  assert.equal(isDeveloperRoute('DEVELOPER_PORTAL'), true);
  for (const mod of ['OVERVIEW', 'PATIENTS', 'CLINICAL', 'WARDS', 'PHARMACY', 'BILLING', 'HR', 'EYE_CLINIC', 'DENTAL', 'ICU']) {
    assert.equal(isDeveloperRoute(mod), false, `Expected ${mod} to use page navigation engine`);
  }
});

test('2. Manual scroll restoration and iOS/Safari positional fallback safeScrollTo work reliably', () => {
  const env = createMockBrowserEnv({ throwOnOptionsScroll: true });
  try {
    initManualScrollRestoration();
    assert.equal(env.mockWindow.history.scrollRestoration, 'manual');

    safeScrollTo(42, 610);
    assert.equal(env.mockWindow.scrollX, 42);
    assert.equal(env.mockWindow.scrollY, 610);
    assert.equal(env.scrollCalls[0].mode, 'positional');
  } finally {
    env.cleanup();
  }
});

test('3. Captures halfway dashboard scroll + nested vertical/horizontal containers and resets new pages to top', () => {
  const env = createMockBrowserEnv();
  try {
    env.mockWindow.scrollX = 35;
    env.mockWindow.scrollY = 740;
    env.nestedTableContainer.scrollTop = 280;
    env.nestedTableContainer.scrollLeft = 145;
    env.nestedSidebarContainer.scrollTop = 190;

    const snap = captureScrollSnapshot({ role: 'DOCTOR', subsystemCategory: 'CLINICAL_INPATIENT' });
    assert.equal(snap.scrollX, 35);
    assert.equal(snap.scrollY, 740);
    assert.deepEqual(snap.containers['patients-table-wrap'], { scrollTop: 280, scrollLeft: 145 });
    assert.deepEqual(snap.containers['dashboard-sidebar-nav'], { scrollTop: 190, scrollLeft: 0 });
    assert.equal(snap.context.role, 'DOCTOR');

    const navKey = generateNavKey('clinical');
    saveScrollSnapshot(navKey, snap);
    assert.deepEqual(loadScrollSnapshot(navKey).scrollY, 740);

    // Opening next module starts cleanly at (0,0) including nested scroll containers
    scrollNewPageToTop();
    assert.equal(env.mockWindow.scrollY, 0);
    assert.equal(env.mockWindow.scrollX, 0);
    assert.equal(env.nestedTableContainer.scrollTop, 0);
    assert.equal(env.nestedTableContainer.scrollLeft, 0);
    assert.equal(env.nestedSidebarContainer.scrollTop, 0);
  } finally {
    env.cleanup();
  }
});

test('4. Back/Forward restoration restores exact coordinates across async renders and cancels on manual user scroll', async () => {
  const env = createMockBrowserEnv();
  try {
    const saved = {
      scrollX: 25,
      scrollY: 680,
      containers: {
        'patients-table-wrap': { scrollTop: 310, scrollLeft: 95 },
        'dashboard-sidebar-nav': { scrollTop: 140, scrollLeft: 0 },
      },
      context: { role: 'NURSE' },
    };

    restoreScrollSnapshot(saved);
    await new Promise((r) => setTimeout(r, 35));

    assert.equal(env.mockWindow.scrollX, 25);
    assert.equal(env.mockWindow.scrollY, 680);
    assert.equal(env.nestedTableContainer.scrollTop, 310);
    assert.equal(env.nestedTableContainer.scrollLeft, 95);
    assert.equal(env.nestedSidebarContainer.scrollTop, 140);

    // Simulate user manual wheel scroll: subsequent DOM mutation must NOT yank user back
    env.mockWindow.dispatchMockEvent('wheel');
    env.mockWindow.scrollY = 120;
    env.triggerDomMutation();
    await new Promise((r) => setTimeout(r, 25));
    assert.equal(env.mockWindow.scrollY, 120);
  } finally {
    env.cleanup();
  }
});

test('5. Consecutive multi-page history, route fallback snapshots, and search/filter view-state persist cleanly', () => {
  const env = createMockBrowserEnv();
  try {
    const k1 = generateNavKey('overview');
    const k2 = generateNavKey('patients');
    const k3 = generateNavKey('billing');

    saveScrollSnapshot(k1, { scrollX: 0, scrollY: 420, containers: {}, context: { role: 'ADMINISTRATOR' }, capturedAt: 1 });
    saveScrollSnapshot(k2, { scrollX: 0, scrollY: 880, containers: {}, context: { role: 'RECEPTIONIST' }, capturedAt: 2 });
    saveScrollSnapshot(k3, { scrollX: 12, scrollY: 515, containers: {}, context: { role: 'ACCOUNTANT' }, capturedAt: 3 });

    assert.equal(loadScrollSnapshot(k1).scrollY, 420);
    assert.equal(loadScrollSnapshot(k2).scrollY, 880);
    assert.equal(loadScrollSnapshot(k3).scrollY, 515);

    saveRouteFallbackSnapshot('/module/BILLING', { scrollX: 12, scrollY: 515, containers: {}, context: { role: 'ACCOUNTANT' }, capturedAt: 4 });
    assert.equal(loadRouteFallbackSnapshot('/module/BILLING').scrollY, 515);

    const detailViewKey = 'detail:BILLING:VIEW_TRANSACTIONS:live';
    savePageViewState(detailViewKey, { detailFilter: 'NHIS', reportCategory: 'FINANCE' });
    const restoredView = loadPageViewState(detailViewKey);
    assert.equal(restoredView.detailFilter, 'NHIS');
    assert.equal(restoredView.reportCategory, 'FINANCE');
  } finally {
    env.cleanup();
  }
});
