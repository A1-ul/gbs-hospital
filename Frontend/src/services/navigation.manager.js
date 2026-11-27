/**
 * GBS Hospital Management System
 * Global Page Navigation & Exact Scroll Position Restoration Manager
 *
 * - Manages per-history-entry scroll snapshots (window scrollX/scrollY + nested scroll containers)
 *   and dashboard view context (category/filter tabs, active role).
 * - Uses manual browser scrollRestoration + MutationObserver/RAF async settle restoration so
 *   dashboards that load live PostgreSQL tables restore the EXACT previous scroll coordinates
 *   on both Application Back and Browser Back/Forward.
 * - Explicitly excludes the Developer Dashboard (DEVELOPER_NOC / DEVELOPER_PORTAL).
 */

const STORAGE_KEY = 'gbs_hospital_nav_snapshots_v1';
const MAX_SNAPSHOTS = 60;
let navSeq = 0;
let activeCancelRestore = null;
const memorySnapshots = new Map();

export function isDeveloperRoute(moduleKey) {
  return moduleKey === 'DEVELOPER_NOC' || moduleKey === 'DEVELOPER_PORTAL';
}

export function initManualScrollRestoration() {
  if (typeof window === 'undefined') return;
  try {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  } catch (_err) {
    // Ignore restricted history API contexts
  }
}

export function generateNavKey(prefix = 'nav') {
  navSeq += 1;
  return `${prefix}-${Date.now()}-${navSeq}`;
}

function getContainerKey(el, fallbackIndex) {
  if (!el) return `c-${fallbackIndex}`;
  return (
    el.getAttribute('data-scroll-key') ||
    el.getAttribute('id') ||
    `scroll-container-${fallbackIndex}`
  );
}

function findScrollableContainers() {
  if (typeof document === 'undefined') return [];
  const root = document.querySelector('main') || document.body;
  if (!root) return [];
  const explicit = Array.from(root.querySelectorAll('[data-scroll-container]'));
  const overflowNodes = Array.from(root.querySelectorAll('div, section, aside')).filter((el) => {
    if (explicit.includes(el)) return false;
    const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (!style) return false;
    const oy = style.overflowY;
    const ox = style.overflowX;
    const isScrollableY = (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 4;
    const isScrollableX = (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 4;
    return isScrollableY || isScrollableX;
  });
  return [...explicit, ...overflowNodes];
}

export function captureScrollSnapshot(context = {}) {
  if (typeof window === 'undefined') {
    return { scrollX: 0, scrollY: 0, containers: {}, context, capturedAt: Date.now() };
  }
  const containers = {};
  const nodes = findScrollableContainers();
  nodes.forEach((el, idx) => {
    if (el.scrollTop > 0 || el.scrollLeft > 0) {
      containers[getContainerKey(el, idx)] = {
        scrollTop: el.scrollTop,
        scrollLeft: el.scrollLeft
      };
    }
  });

  return {
    scrollX: window.scrollX || window.pageXOffset || 0,
    scrollY: window.scrollY || window.pageYOffset || 0,
    containers,
    context: { ...context },
    capturedAt: Date.now()
  };
}

function readStorageMap() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_err) {
    return {};
  }
}

function writeStorageMap(obj) {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(obj);
    if (keys.length > MAX_SNAPSHOTS) {
      keys
        .sort((a, b) => (obj[a]?.capturedAt || 0) - (obj[b]?.capturedAt || 0))
        .slice(0, keys.length - MAX_SNAPSHOTS)
        .forEach((k) => delete obj[k]);
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (_err) {
    // Ignore storage quota errors
  }
}

export function saveScrollSnapshot(navKey, snapshot) {
  if (!navKey || !snapshot) return;
  memorySnapshots.set(navKey, snapshot);
  const stored = readStorageMap();
  stored[navKey] = snapshot;
  writeStorageMap(stored);
}

export function loadScrollSnapshot(navKey) {
  if (!navKey) return null;
  if (memorySnapshots.has(navKey)) {
    return memorySnapshots.get(navKey);
  }
  const stored = readStorageMap();
  return stored[navKey] || null;
}

export function cancelPendingScrollRestoration() {
  if (typeof activeCancelRestore === 'function') {
    activeCancelRestore();
    activeCancelRestore = null;
  }
}

export function scrollNewPageToTop() {
  cancelPendingScrollRestoration();
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  const nodes = findScrollableContainers();
  nodes.forEach((el) => {
    if (el.scrollTop > 0) el.scrollTop = 0;
    if (el.scrollLeft > 0) el.scrollLeft = 0;
  });
}

function applyContainerScrolls(containers) {
  if (!containers || typeof containers !== 'object') return;
  const entries = Object.entries(containers);
  if (entries.length === 0) return;
  const nodes = findScrollableContainers();
  nodes.forEach((el, idx) => {
    const key = getContainerKey(el, idx);
    const saved = containers[key];
    if (saved) {
      if (typeof saved.scrollTop === 'number') el.scrollTop = saved.scrollTop;
      if (typeof saved.scrollLeft === 'number') el.scrollLeft = saved.scrollLeft;
    }
  });
}

/**
 * Restores exact window + nested container scroll coordinates, waiting smoothly
 * across async React + PostgreSQL data renders up to 1400ms and cancelling
 * immediately if the user starts manually scrolling.
 */
export function restoreScrollSnapshot(snapshot) {
  cancelPendingScrollRestoration();
  if (typeof window === 'undefined' || !snapshot) return;

  const targetX = Number(snapshot.scrollX || 0);
  const targetY = Number(snapshot.scrollY || 0);
  const containers = snapshot.containers || {};
  let cancelled = false;
  let observer = null;
  const timers = [];
  const rafs = [];

  const cleanup = () => {
    if (cancelled) return;
    cancelled = true;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    timers.forEach((t) => clearTimeout(t));
    rafs.forEach((id) => cancelAnimationFrame(id));
    window.removeEventListener('wheel', cleanup, { passive: true });
    window.removeEventListener('touchstart', cleanup, { passive: true });
    window.removeEventListener('pointerdown', cleanup, { passive: true });
    window.removeEventListener('keydown', onUserKey);
    if (activeCancelRestore === cleanup) {
      activeCancelRestore = null;
    }
  };

  const onUserKey = (e) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
      cleanup();
    }
  };

  activeCancelRestore = cleanup;
  window.addEventListener('wheel', cleanup, { passive: true });
  window.addEventListener('touchstart', cleanup, { passive: true });
  window.addEventListener('pointerdown', cleanup, { passive: true });
  window.addEventListener('keydown', onUserKey);

  const attemptRestore = () => {
    if (cancelled) return;
    window.scrollTo({ top: targetY, left: targetX, behavior: 'instant' });
    applyContainerScrolls(containers);
  };

  // Immediate + progressive animation frames for fast synchronous/cached renders
  rafs.push(requestAnimationFrame(() => {
    attemptRestore();
    rafs.push(requestAnimationFrame(attemptRestore));
  }));

  // Observe DOM additions while async PostgreSQL queries hydrate page height
  if (typeof MutationObserver !== 'undefined' && document.body) {
    observer = new MutationObserver(() => {
      if (cancelled) return;
      const maxScrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      attemptRestore();
      if (targetY <= maxScrollable + 2 && Math.abs((window.scrollY || 0) - targetY) <= 2) {
        // Keep brief grace window for secondary widgets, then settle cleanly
        timers.push(setTimeout(cleanup, 180));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Fallback checkpoints and hard ceiling so listener never lingers
  [80, 220, 480, 900].forEach((ms) => timers.push(setTimeout(attemptRestore, ms)));
  timers.push(setTimeout(cleanup, 1400));
}
