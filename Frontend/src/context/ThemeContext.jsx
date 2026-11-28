import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * GBS Hospital Management System — Official Brand Colour & Accessibility Theme Engine
 * Official GBS Brand Palette (File 10 Standardisation):
 * - Midnight Navy:  #091830 (Primary brand & navigation colour)
 * - Antique Gold:   #C29B4F (Primary highlights, selected states & accents)
 * - Champagne Gold: #E7CF88 (Decorative highlights)
 * - Muted Gold:     #BAA479 (Secondary accents & metadata)
 * - Warm Ivory:     #F7F5EF (Reading areas, forms, tables & Light Mode backgrounds)
 * - Charcoal:       #1B1A1B (High-contrast readable text on light surfaces)
 */
export const OFFICIAL_GBS_COLORS = Object.freeze({
  midnightNavy: '#091830',
  antiqueGold: '#C29B4F',
  champagneGold: '#E7CF88',
  mutedGold: '#BAA479',
  warmIvory: '#F7F5EF',
  charcoal: '#1B1A1B',
  accessibleGoldOnLight: '#745418', // WCAG 2.2 AA (>= 6.3:1 on #F7F5EF & #FFFFFF)
});

export const THEME_MODES = Object.freeze([
  { id: 'dark', label: 'Dark Mode', desc: 'Official Midnight Navy & Royal Gold' },
  { id: 'light', label: 'Light Mode', desc: 'Warm Ivory Reading Surfaces & Navy Nav' },
  { id: 'high-contrast', label: 'High Contrast', desc: 'Maximum WCAG AAA Visibility & Borders' },
]);

export const TEXT_SIZES = Object.freeze([
  { id: 'sm', label: 'A-', name: 'Compact (92%)', rootPct: '92%' },
  { id: 'md', label: 'A', name: 'Standard (100%)', rootPct: '100%' },
  { id: 'lg', label: 'A+', name: 'Large (112%)', rootPct: '112%' },
  { id: 'xl', label: 'A++', name: 'Extra Large (125%)', rootPct: '125%' },
]);

const THEME_STORAGE_KEY = 'gbs_theme_mode';
const TEXT_SIZE_STORAGE_KEY = 'gbs_text_size';

const VALID_THEMES = new Set(THEME_MODES.map((m) => m.id));
const VALID_TEXT_SIZES = new Set(TEXT_SIZES.map((s) => s.id));

const ThemeContext = createContext({
  themeMode: 'dark',
  textSize: 'md',
  setThemeMode: () => {},
  setTextSize: () => {},
  themes: THEME_MODES,
  textSizes: TEXT_SIZES,
  colors: OFFICIAL_GBS_COLORS,
});

function readStoredValue(key, validSet, fallback) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    return raw && validSet.has(raw) ? raw : fallback;
  } catch (_e) {
    return fallback;
  }
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(() =>
    readStoredValue(THEME_STORAGE_KEY, VALID_THEMES, 'dark')
  );
  const [textSize, setTextSizeState] = useState(() =>
    readStoredValue(TEXT_SIZE_STORAGE_KEY, VALID_TEXT_SIZES, 'md')
  );

  const setThemeMode = (nextMode) => {
    const safe = VALID_THEMES.has(nextMode) ? nextMode : 'dark';
    setThemeModeState(safe);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, safe);
      }
    } catch (_e) {}
  };

  const setTextSize = (nextSize) => {
    const safe = VALID_TEXT_SIZES.has(nextSize) ? nextSize : 'md';
    setTextSizeState(safe);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, safe);
      }
    } catch (_e) {}
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', themeMode);
    root.setAttribute('data-text-size', textSize);
    const sizeSpec = TEXT_SIZES.find((s) => s.id === textSize) || TEXT_SIZES[1];
    root.style.fontSize = sizeSpec.rootPct;

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', themeMode === 'light' ? OFFICIAL_GBS_COLORS.midnightNavy : OFFICIAL_GBS_COLORS.midnightNavy);
    }
  }, [themeMode, textSize]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        textSize,
        setThemeMode,
        setTextSize,
        themes: THEME_MODES,
        textSizes: TEXT_SIZES,
        colors: OFFICIAL_GBS_COLORS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
