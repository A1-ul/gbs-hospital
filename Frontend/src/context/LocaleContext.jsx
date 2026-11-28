import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { SUPPORTED_LANGUAGES, TRANSLATIONS } from '../i18n/translations';
import { INTERNATIONAL_COUNTRIES, GLOBAL_REGIONS } from '../i18n/countries';
import { api } from '../services/api.service';

const LocaleContext = createContext(null);

const STORAGE_LANG_KEY = 'gbs_language';
const STORAGE_COUNTRY_KEY = 'gbs_country';

function resolveInitialLanguage() {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(STORAGE_LANG_KEY);
  if (saved && TRANSLATIONS[saved]) return saved;
  return 'en';
}

function resolveInitialCountryCode() {
  if (typeof window === 'undefined') return 'GH';
  const saved = localStorage.getItem(STORAGE_COUNTRY_KEY);
  if (saved && INTERNATIONAL_COUNTRIES.some((c) => c.code === saved)) return saved;
  return 'GH';
}

export function LocaleProvider({ children }) {
  const [languageCode, setLanguageCodeState] = useState(resolveInitialLanguage);
  const [countryCode, setCountryCodeState] = useState(resolveInitialCountryCode);
  const [countries, setCountries] = useState(INTERNATIONAL_COUNTRIES);
  const [languages, setLanguages] = useState(SUPPORTED_LANGUAGES);
  const [savingDefault, setSavingDefault] = useState(false);

  const activeLanguage = useMemo(
    () => languages.find((l) => l.code === languageCode) || SUPPORTED_LANGUAGES[0],
    [languages, languageCode]
  );

  const activeCountry = useMemo(
    () => countries.find((c) => c.code === countryCode) || INTERNATIONAL_COUNTRIES[0],
    [countries, countryCode]
  );

  // Sync HTML lang & RTL/LTR direction whenever language changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = activeLanguage.code;
    document.documentElement.dir = activeLanguage.dir || 'ltr';
  }, [activeLanguage]);

  // Hydrate authoritative catalog + hospital default profile from Backend API
  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.getInternationalCountries().catch(() => null),
      api.getSupportedLanguages().catch(() => null),
      api.getInternationalProfile().catch(() => null),
    ]).then(([countriesRes, languagesRes, profileRes]) => {
      if (!mounted) return;
      if (countriesRes?.countries && Array.isArray(countriesRes.countries) && countriesRes.countries.length > 0) {
        setCountries(countriesRes.countries);
      }
      if (languagesRes?.languages && Array.isArray(languagesRes.languages) && languagesRes.languages.length > 0) {
        setLanguages(languagesRes.languages);
      }
      // Only adopt server hospital default if user has not manually chosen a local preference yet
      if (typeof window !== 'undefined' && profileRes) {
        if (!localStorage.getItem(STORAGE_COUNTRY_KEY) && profileRes.countryCode) {
          setCountryCodeState(profileRes.countryCode);
        }
        if (!localStorage.getItem(STORAGE_LANG_KEY) && profileRes.languageCode && TRANSLATIONS[profileRes.languageCode]) {
          setLanguageCodeState(profileRes.languageCode);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback((code) => {
    const normalized = String(code || 'en').toLowerCase();
    if (!TRANSLATIONS[normalized]) return;
    setLanguageCodeState(normalized);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_LANG_KEY, normalized);
    }
  }, []);

  const setCountry = useCallback((code) => {
    const normalized = String(code || 'GH').toUpperCase();
    setCountryCodeState(normalized);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_COUNTRY_KEY, normalized);
    }
  }, []);

  const saveHospitalDefaultLocale = useCallback(async (nextCountryCode = countryCode, nextLanguageCode = languageCode) => {
    setSavingDefault(true);
    try {
      const updated = await api.updateInternationalProfile({
        countryCode: nextCountryCode,
        languageCode: nextLanguageCode,
      });
      return updated;
    } finally {
      setSavingDefault(false);
    }
  }, [countryCode, languageCode]);

  const t = useCallback(
    (key, fallback) => {
      const dict = TRANSLATIONS[languageCode] || TRANSLATIONS.en;
      if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
        return dict[key];
      }
      if (TRANSLATIONS.en && Object.prototype.hasOwnProperty.call(TRANSLATIONS.en, key)) {
        return TRANSLATIONS.en[key];
      }
      return fallback !== undefined ? fallback : key;
    },
    [languageCode]
  );

  const formatCurrency = useCallback(
    (amount, overrideCurrencyCode) => {
      const num = Number(amount || 0);
      const curr = overrideCurrencyCode || activeCountry?.currencyCode || 'GHS';
      const symbol = activeCountry?.currencySymbol || curr;
      try {
        return new Intl.NumberFormat(activeLanguage.code === 'tw' ? 'en-GH' : activeLanguage.code, {
          style: 'currency',
          currency: curr,
          maximumFractionDigits: 2,
        }).format(Number.isFinite(num) ? num : 0);
      } catch (_err) {
        return `${symbol} ${(Number.isFinite(num) ? num : 0).toFixed(2)}`;
      }
    },
    [activeCountry, activeLanguage]
  );

  const value = useMemo(
    () => ({
      languageCode,
      activeLanguage,
      languages,
      setLanguage,
      countryCode,
      activeCountry,
      countries,
      regions: GLOBAL_REGIONS,
      setCountry,
      saveHospitalDefaultLocale,
      savingDefault,
      t,
      formatCurrency,
      isRtl: activeLanguage.dir === 'rtl',
    }),
    [
      languageCode,
      activeLanguage,
      languages,
      setLanguage,
      countryCode,
      activeCountry,
      countries,
      setCountry,
      saveHospitalDefaultLocale,
      savingDefault,
      t,
      formatCurrency,
    ]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      languageCode: 'en',
      activeLanguage: SUPPORTED_LANGUAGES[0],
      languages: SUPPORTED_LANGUAGES,
      setLanguage: () => {},
      countryCode: 'GH',
      activeCountry: INTERNATIONAL_COUNTRIES[0],
      countries: INTERNATIONAL_COUNTRIES,
      regions: GLOBAL_REGIONS,
      setCountry: () => {},
      saveHospitalDefaultLocale: async () => null,
      savingDefault: false,
      t: (key, fallback) => TRANSLATIONS.en[key] || fallback || key,
      formatCurrency: (amount) => `GHS ${Number(amount || 0).toFixed(2)}`,
      isRtl: false,
    };
  }
  return ctx;
}
