"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
INTERNATIONAL COUNTRIES & MULTILINGUAL SERVICE
Live PostgreSQL tenant country telemetry + persisted locale profile
LOCATION: Backend/src/modules/international/international.service.js
COMMONJS ONLY
====================================================
*/

const fs = require("fs");
const path = require("path");
const prisma = require("../../core/database/prisma.client");
const AppError = require("../../core/errors/app.error");
const {
    SUPPORTED_COUNTRIES,
    SUPPORTED_LANGUAGES,
    REGIONS,
    findCountryByCode,
    findLanguageByCode
} = require("./international.catalog");

const LOCALE_CONFIG_PATH = path.resolve(__dirname, "../../../../storage/locale-profile.json");

const DEFAULT_PROFILE = Object.freeze({
    countryCode: "GH",
    languageCode: "en",
    currencyCode: "GHS",
    currencySymbol: "₵",
    timezone: "Africa/Accra",
    updatedBy: "System Default",
    updatedAt: null
});

function readStoredProfile() {
    try {
        if (fs.existsSync(LOCALE_CONFIG_PATH)) {
            const raw = fs.readFileSync(LOCALE_CONFIG_PATH, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed && parsed.countryCode && parsed.languageCode) {
                return parsed;
            }
        }
    } catch (_err) {
        // Fallback safely to default Ghana/English profile
    }
    return { ...DEFAULT_PROFILE };
}

function writeStoredProfile(profile) {
    const dir = path.dirname(LOCALE_CONFIG_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${LOCALE_CONFIG_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(profile, null, 2), "utf8");
    fs.renameSync(tmpPath, LOCALE_CONFIG_PATH);
}

/**
 * List supported international countries with optional region/search filter
 * and real PostgreSQL active tenant counts per country.
 */
async function listCountries({ region, search } = {}) {
    let items = [...SUPPORTED_COUNTRIES];

    if (region && String(region).trim().toUpperCase() !== "ALL") {
        const regNeedle = String(region).trim().toLowerCase();
        items = items.filter((c) => c.region.toLowerCase() === regNeedle);
    }

    if (search && String(search).trim()) {
        const q = String(search).trim().toLowerCase();
        items = items.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q) ||
                c.currencyCode.toLowerCase().includes(q) ||
                c.dialCode.toLowerCase().includes(q) ||
                c.region.toLowerCase().includes(q) ||
                c.healthInsuranceScheme.toLowerCase().includes(q)
        );
    }

    // Real PostgreSQL tenant distribution by country
    let tenantCountsByCountry = {};
    try {
        const grouped = await prisma.tenant.groupBy({
            by: ["country"],
            _count: { _all: true }
        });
        for (const row of grouped) {
            if (row.country) {
                tenantCountsByCountry[row.country.trim().toLowerCase()] = row._count._all;
            }
        }
    } catch (_err) {
        tenantCountsByCountry = {};
    }

    const enriched = items.map((c) => ({
        ...c,
        registeredTenants:
            tenantCountsByCountry[c.name.toLowerCase()] ||
            tenantCountsByCountry[c.code.toLowerCase()] ||
            0
    }));

    return {
        totalSupportedCountries: SUPPORTED_COUNTRIES.length,
        filteredCount: enriched.length,
        regions: REGIONS,
        countries: enriched
    };
}

/**
 * Retrieve a single country by ISO-3166 alpha-2 code.
 */
async function getCountryByCode(code) {
    const country = findCountryByCode(code);
    if (!country) {
        throw new AppError(`Country code "${code}" is not in the supported international catalog.`, 404, "COUNTRY_NOT_FOUND");
    }

    let registeredTenants = 0;
    try {
        registeredTenants = await prisma.tenant.count({
            where: {
                OR: [
                    { country: { equals: country.name, mode: "insensitive" } },
                    { country: { equals: country.code, mode: "insensitive" } }
                ]
            }
        });
    } catch (_err) {
        registeredTenants = 0;
    }

    return {
        ...country,
        registeredTenants
    };
}

/**
 * Retrieve all supported languages.
 */
function listLanguages() {
    return {
        totalSupportedLanguages: SUPPORTED_LANGUAGES.length,
        defaultLanguage: "en",
        languages: [...SUPPORTED_LANGUAGES]
    };
}

/**
 * Get active hospital international locale configuration.
 */
function getLocaleProfile() {
    const stored = readStoredProfile();
    const country = findCountryByCode(stored.countryCode) || findCountryByCode("GH");
    const language = findLanguageByCode(stored.languageCode) || findLanguageByCode("en");

    return {
        countryCode: country.code,
        countryName: country.name,
        countryFlag: country.flag,
        region: country.region,
        dialCode: country.dialCode,
        currencyCode: country.currencyCode,
        currencySymbol: country.currencySymbol,
        timezone: country.timezone,
        nationalIdLabel: country.nationalIdLabel,
        healthInsuranceScheme: country.healthInsuranceScheme,
        emergencyNumber: country.emergencyNumber,
        languageCode: language.code,
        languageName: language.name,
        languageNativeName: language.nativeName,
        direction: language.dir,
        updatedBy: stored.updatedBy || "System Default",
        updatedAt: stored.updatedAt || null
    };
}

/**
 * Update hospital default country & language preference with PostgreSQL AuditLog entry.
 */
async function updateLocaleProfile(payload = {}, actor = {}) {
    const current = readStoredProfile();
    const nextCountryCode = payload.countryCode ? String(payload.countryCode).trim().toUpperCase() : current.countryCode;
    const nextLanguageCode = payload.languageCode ? String(payload.languageCode).trim().toLowerCase() : current.languageCode;

    const country = findCountryByCode(nextCountryCode);
    if (!country) {
        throw new AppError(`Unsupported country code: ${nextCountryCode}`, 400, "INVALID_COUNTRY_CODE");
    }

    const language = findLanguageByCode(nextLanguageCode);
    if (!language) {
        throw new AppError(`Unsupported language code: ${nextLanguageCode}`, 400, "INVALID_LANGUAGE_CODE");
    }

    const nextProfile = {
        countryCode: country.code,
        languageCode: language.code,
        currencyCode: country.currencyCode,
        currencySymbol: country.currencySymbol,
        timezone: country.timezone,
        updatedBy: actor.email || actor.id || "Administrator",
        updatedAt: new Date().toISOString()
    };

    writeStoredProfile(nextProfile);

    await prisma.auditLog.create({
        data: {
            userId: actor.id || null,
            action: "HOSPITAL_LOCALE_UPDATED",
            module: "INTERNATIONAL",
            description: `Updated hospital international locale to ${country.name} (${country.code}, ${country.currencyCode}) and language ${language.name} (${language.code}).`
        }
    });

    return getLocaleProfile();
}

module.exports = {
    listCountries,
    getCountryByCode,
    listLanguages,
    getLocaleProfile,
    updateLocaleProfile
};
