import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '..', 'src');

/**
 * Exact W3C WCAG 2.2 Relative Luminance & Contrast Ratio Formula
 * Reference: https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */
function hexToRgb(hex) {
  const clean = String(hex).replace('#', '').trim();
  assert.match(clean, /^[0-9a-fA-F]{6}$/, `Invalid 6-digit hex colour: ${hex}`);
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fgHex, bgHex) {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const themeCss = fs.readFileSync(path.join(SRC_DIR, 'styles', 'theme.css'), 'utf8');
const globalsCss = fs.readFileSync(path.join(SRC_DIR, 'styles', 'globals.css'), 'utf8');
const themeCtxSrc = fs.readFileSync(path.join(SRC_DIR, 'context', 'ThemeContext.jsx'), 'utf8');
const idCardSrc = fs.readFileSync(path.join(SRC_DIR, 'components', 'HospitalMembershipCardModal.jsx'), 'utf8');

test('1. Official 6 GBS Brand Colours are locked across theme.css, globals.css & ThemeContext with zero off-brand wine-red gradients', () => {
  const officialHexes = ['#091830', '#C29B4F', '#E7CF88', '#BAA479', '#F7F5EF', '#1B1A1B'];
  for (const hex of officialHexes) {
    assert.ok(themeCss.includes(hex), `theme.css missing official GBS colour ${hex}`);
    assert.ok(globalsCss.includes(hex), `globals.css missing official GBS colour ${hex}`);
    assert.ok(themeCtxSrc.includes(hex), `ThemeContext.jsx missing official GBS colour ${hex}`);
  }

  for (const forbidden of ['#7f1d1d', '#450a0a', '#881337', '#4c0519']) {
    assert.ok(!themeCss.toLowerCase().includes(forbidden), `Forbidden wine-red token ${forbidden} found in theme.css`);
    assert.ok(!globalsCss.toLowerCase().includes(forbidden), `Forbidden wine-red token ${forbidden} found in globals.css`);
  }
});

test('2. Dark Mode ([data-theme="dark"]) — all 13 text, gold-accent, button & status pairs pass WCAG 2.2 AA (>= 4.5:1)', () => {
  const darkPairs = [
    ['Primary text on Midnight Navy', '#F7F5EF', '#091830', 4.5],
    ['Muted text on Midnight Navy', '#D8D2C5', '#091830', 4.5],
    ['Dim/Gold metadata on Midnight Navy', '#BAA479', '#091830', 4.5],
    ['Dim/Gold metadata on Card Surface', '#BAA479', '#0D1E3A', 4.5],
    ['Champagne Gold heading on Midnight Navy', '#E7CF88', '#091830', 4.5],
    ['Champagne Gold heading on Card Surface', '#E7CF88', '#0D1E3A', 4.5],
    ['Antique Gold accent on Midnight Navy', '#C29B4F', '#091830', 4.5],
    ['Midnight Navy label on Antique Gold button', '#091830', '#C29B4F', 4.5],
    ['Midnight Navy label on Champagne Gold button', '#091830', '#E7CF88', 4.5],
    ['Online status text on Midnight Navy', '#34D399', '#091830', 4.5],
    ['Warning status text on Midnight Navy', '#FCD34D', '#091830', 4.5],
    ['Danger status text on Midnight Navy', '#FCA5A5', '#091830', 4.5],
    ['Info status text on Midnight Navy', '#7DD3FC', '#091830', 4.5],
  ];

  for (const [label, fg, bg, minRatio] of darkPairs) {
    const ratio = contrastRatio(fg, bg);
    assert.ok(
      ratio >= minRatio,
      `Dark Mode WCAG 2.2 AA failure for ${label} (${fg} on ${bg}): ${ratio.toFixed(2)}:1 < ${minRatio}:1`
    );
  }
});

test('3. Light Mode ([data-theme="light"]) — all 14 Warm Ivory/White surface, Charcoal/Navy text & semantic badge pairs pass WCAG 2.2 AA (>= 4.5:1)', () => {
  const lightPairs = [
    ['Charcoal body text on Warm Ivory', '#1B1A1B', '#F7F5EF', 4.5],
    ['Charcoal body text on Pure White card', '#1B1A1B', '#FFFFFF', 4.5],
    ['Midnight Navy heading on Warm Ivory', '#091830', '#F7F5EF', 4.5],
    ['Midnight Navy heading on Pure White card', '#091830', '#FFFFFF', 4.5],
    ['Muted body text on Warm Ivory', '#333B48', '#F7F5EF', 4.5],
    ['Dim metadata text on Warm Ivory', '#4A5260', '#F7F5EF', 4.5],
    ['Accessible Gold accent text on Warm Ivory', '#745418', '#F7F5EF', 4.5],
    ['Accessible Gold accent text on Pure White card', '#745418', '#FFFFFF', 4.5],
    ['Muted Gold text on Warm Ivory', '#6C5530', '#F7F5EF', 4.5],
    ['Warm Ivory nav text on Midnight Navy header', '#F7F5EF', '#091830', 4.5],
    ['Success badge text on Mint surface', '#047857', '#ECFDF5', 4.5],
    ['Warning badge text on Amber surface', '#92400E', '#FEF3C7', 4.5],
    ['Danger badge text on Rose surface', '#B91C1C', '#FEE2E2', 4.5],
    ['Info badge text on Sky surface', '#0369A1', '#E0F2FE', 4.5],
  ];

  for (const [label, fg, bg, minRatio] of lightPairs) {
    const ratio = contrastRatio(fg, bg);
    assert.ok(
      ratio >= minRatio,
      `Light Mode WCAG 2.2 AA failure for ${label} (${fg} on ${bg}): ${ratio.toFixed(2)}:1 < ${minRatio}:1`
    );
  }
});

test('4. High-Contrast Mode ([data-theme="high-contrast"]) — all 10 high-visibility pairs exceed WCAG 2.2 AAA (>= 7.0:1)', () => {
  const hcPairs = [
    ['Pure White text on Deep Navy', '#FFFFFF', '#050D1C', 7.0],
    ['Pure White text on Card Navy', '#FFFFFF', '#091830', 7.0],
    ['Warm Ivory text on Card Navy', '#F7F5EF', '#091830', 7.0],
    ['Bright Gold heading on Card Navy', '#FFE07D', '#091830', 7.0],
    ['Champagne Gold accent on Card Navy', '#E7CF88', '#091830', 7.0],
    ['Deep Navy label on Champagne Gold button', '#050D1C', '#E7CF88', 7.0],
    ['Online status on Card Navy', '#6EE7B7', '#091830', 7.0],
    ['Warning status on Card Navy', '#FDE047', '#091830', 7.0],
    ['Danger status on Card Navy', '#FCA5A5', '#091830', 7.0],
    ['Info status on Card Navy', '#7DD3FC', '#091830', 7.0],
  ];

  for (const [label, fg, bg, minRatio] of hcPairs) {
    const ratio = contrastRatio(fg, bg);
    assert.ok(
      ratio >= minRatio,
      `High-Contrast WCAG 2.2 AAA failure for ${label} (${fg} on ${bg}): ${ratio.toFixed(2)}:1 < ${minRatio}:1`
    );
  }
});

test('5. Official Hospital Membership ID Card contrast pairs (>= 4.5:1), non-colour symbols & keyboard focus outlines', () => {
  const cardPairs = [
    ['ID Card Champagne Gold title on Midnight Navy header', '#E7CF88', '#091830', 4.5],
    ['ID Card White accepted badge on Emerald pill', '#FFFFFF', '#047857', 4.5],
    ['ID Card Midnight Navy member name on Warm Ivory', '#091830', '#F7F5EF', 4.5],
    ['ID Card Accessible Gold role text on Warm Ivory', '#745418', '#F7F5EF', 4.5],
    ['ID Card Charcoal values on Warm Ivory', '#1B1A1B', '#F7F5EF', 4.5],
  ];

  for (const [label, fg, bg, minRatio] of cardPairs) {
    const ratio = contrastRatio(fg, bg);
    assert.ok(
      ratio >= minRatio,
      `ID Card WCAG 2.2 AA failure for ${label} (${fg} on ${bg}): ${ratio.toFixed(2)}:1 < ${minRatio}:1`
    );
  }

  for (const hex of ['#091830', '#C29B4F', '#E7CF88', '#F7F5EF', '#1B1A1B', '#745418']) {
    assert.ok(idCardSrc.includes(hex), `HospitalMembershipCardModal.jsx must use official brand colour ${hex}`);
  }

  // Non-colour status symbols + keyboard focus rings (Never communicate via colour alone)
  assert.ok(globalsCss.includes(':focus-visible'), 'globals.css must define high-visibility :focus-visible outline');
  for (const symbolRule of [".badge-success::before", ".badge-warning::before", ".badge-danger::before", ".badge-cyan::before", ".badge-gold::before"]) {
    assert.ok(globalsCss.includes(symbolRule), `globals.css missing non-colour badge symbol rule ${symbolRule}`);
  }
});

test('6. All 16 Master Blueprint dashboards define subtle [data-role] accents and ThemeContext supports 3 modes + 4 text sizes', () => {
  const all16Roles = [
    'ADMINISTRATOR', 'HOSPITAL_DIRECTOR', 'DEVELOPER', 'DOCTOR', 'SURGEON',
    'DENTIST', 'EYE_DOCTOR', 'RADIOLOGIST', 'NURSE', 'PHARMACIST',
    'LAB_TECHNICIAN', 'RECEPTIONIST', 'FOLDER_RETRIEVER', 'ACCOUNTANT',
    'HR_MANAGER', 'PATIENT',
  ];

  for (const role of all16Roles) {
    assert.ok(
      globalsCss.includes(`[data-role="${role}"]`),
      `globals.css missing subtle [data-role="${role}"] accent token`
    );
  }

  for (const mode of ["id: 'dark'", "id: 'light'", "id: 'high-contrast'"]) {
    assert.ok(themeCtxSrc.includes(mode), `ThemeContext.jsx missing display mode ${mode}`);
  }
  for (const pct of ["'92%'", "'100%'", "'112%'", "'125%'"]) {
    assert.ok(themeCtxSrc.includes(pct), `ThemeContext.jsx missing adjustable text size ${pct}`);
  }
});
