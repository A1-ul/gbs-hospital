"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MIGRATION SERVICE MODULE - PARSERS & VALIDATION ENGINE
Phase 20 Production Hardened - CommonJS Only
LOCATION: src/modules/migration/helpers/migration-parsers.js
====================================================
*/

/**
 * Supported Data Sources per Master Blueprint
 */
const SUPPORTED_SOURCES = [
    { code: "EXCEL", name: "Microsoft Excel (.xlsx, .xls)", icon: "file-spreadsheet" },
    { code: "CSV", name: "Comma Separated Values (.csv)", icon: "file-text" },
    { code: "JSON", name: "JavaScript Object Notation (.json)", icon: "code" },
    { code: "GOOGLE_SHEETS", name: "Google Sheets Cloud Sync", icon: "table" },
    { code: "POSTGRESQL", name: "PostgreSQL Database Dump / SQL", icon: "database" },
    { code: "MYSQL", name: "MySQL Database Dump / SQL", icon: "database" },
    { code: "SQL_SERVER", name: "Microsoft SQL Server", icon: "server" },
    { code: "FIREBASE", name: "Google Firebase / Firestore Export", icon: "flame" },
    { code: "REST_API", name: "Legacy Hospital REST API Connector", icon: "globe" },
    { code: "GBS_LEGACY", name: "Legacy GBS Hospital System V1", icon: "archive" }
];

/**
 * Supported Target Entities and their destination schema specifications
 */
const TARGET_ENTITIES = {
    PATIENTS: {
        label: "Patients (Master Patient Index)",
        table: "Patient",
        requiredFields: ["firstName", "lastName", "gender", "dateOfBirth"],
        fields: [
            { key: "firstName", label: "First Name", type: "string", required: true },
            { key: "lastName", label: "Last Name", type: "string", required: true },
            { key: "gender", label: "Gender (MALE/FEMALE/OTHER)", type: "string", required: true },
            { key: "dateOfBirth", label: "Date of Birth (YYYY-MM-DD)", type: "date", required: true },
            { key: "phone", label: "Phone Number", type: "string", required: false },
            { key: "nationalId", label: "National ID / Ghana Card", type: "string", required: false },
            { key: "nhisNumber", label: "NHIS Number", type: "string", required: false },
            { key: "address", label: "Residential Address", type: "string", required: false },
            { key: "bloodGroup", label: "Blood Group", type: "string", required: false }
        ]
    },
    INVENTORY_ITEMS: {
        label: "Pharmacy & Medical Supplies Inventory",
        table: "PharmacyItem",
        requiredFields: ["name", "category", "unitPrice"],
        fields: [
            { key: "name", label: "Item Name / Generic Name", type: "string", required: true },
            { key: "category", label: "Category", type: "string", required: true },
            { key: "unitPrice", label: "Unit Dispensing Price (GHS)", type: "number", required: true },
            { key: "dosageForm", label: "Dosage Form (TABLET/SYRUP/INJECTION)", type: "string", required: false },
            { key: "strength", label: "Strength (e.g. 500mg)", type: "string", required: false },
            { key: "reorderLevel", label: "Reorder Minimum Threshold", type: "number", required: false },
            { key: "currentStock", label: "Initial Quantity on Hand", type: "number", required: false }
        ]
    },
    BILLING_TARIFFS: {
        label: "Billing & Diagnostic Tariffs (G-DRG / Cash)",
        table: "BillingTariffItem",
        requiredFields: ["code", "name", "standardCashPrice"],
        fields: [
            { key: "code", label: "Tariff Service Code", type: "string", required: true },
            { key: "name", label: "Tariff Description", type: "string", required: true },
            { key: "category", label: "Category (CONSULTATION/LAB/RAD/SURG)", type: "string", required: false },
            { key: "standardCashPrice", label: "Standard Cash Tariff (GHS)", type: "number", required: true },
            { key: "nhisPrice", label: "NHIS Tariff (GHS)", type: "number", required: false },
            { key: "nhisCovered", label: "NHIS Covered (true/false)", type: "boolean", required: false }
        ]
    },
    STAFF_RECORDS: {
        label: "Clinical & Hospital Staff Cadres",
        table: "HospitalStaff",
        requiredFields: ["firstName", "lastName", "role"],
        fields: [
            { key: "firstName", label: "First Name", type: "string", required: true },
            { key: "lastName", label: "Last Name", type: "string", required: true },
            { key: "role", label: "Operational Role", type: "string", required: true },
            { key: "email", label: "Official Email", type: "string", required: false },
            { key: "licenseNumber", label: "Council License PIN", type: "string", required: false },
            { key: "department", label: "Department", type: "string", required: false }
        ]
    }
};

/**
 * Robust CSV parser handling quotes, commas, escapes, and line breaks
 * @param {string} csvText 
 * @returns {Array<Object>} parsed rows with headers as keys
 */
function parseCsv(csvText) {
    if (!csvText || typeof csvText !== "string") return [];

    const lines = [];
    let currentLine = [];
    let currentField = "";
    let insideQuote = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (insideQuote && nextChar === '"') {
                currentField += '"';
                i++; // Skip escaped quote
            } else {
                insideQuote = !insideQuote;
            }
        } else if (char === ',' && !insideQuote) {
            currentLine.push(currentField.trim());
            currentField = "";
        } else if ((char === '\r' || char === '\n') && !insideQuote) {
            if (char === '\r' && nextChar === '\n') i++; // Skip CRLF
            currentLine.push(currentField.trim());
            if (currentLine.some(f => f.length > 0)) {
                lines.push(currentLine);
            }
            currentLine = [];
            currentField = "";
        } else {
            currentField += char;
        }
    }

    if (currentField.length > 0 || currentLine.length > 0) {
        currentLine.push(currentField.trim());
        if (currentLine.some(f => f.length > 0)) {
            lines.push(currentLine);
        }
    }

    if (lines.length < 2) return [];

    const headers = lines[0].map(h => h.replace(/^["']|["']$/g, '').trim());
    const records = [];

    for (let r = 1; r < lines.length; r++) {
        const row = lines[r];
        const record = {};
        for (let c = 0; c < headers.length; c++) {
            const h = headers[c];
            record[h] = row[c] !== undefined ? row[c].replace(/^["']|["']$/g, '') : "";
        }
        records.push(record);
    }

    return records;
}

/**
 * Parses raw JSON string or object array
 * @param {string|Array} input 
 * @returns {Array<Object>}
 */
function parseJson(input) {
    if (Array.isArray(input)) return input;
    if (typeof input !== "string") return [];

    try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.data)) return parsed.data;
        if (parsed && Array.isArray(parsed.records)) return parsed.records;
        if (typeof parsed === "object") return [parsed];
        return [];
    } catch (e) {
        return [];
    }
}

/**
 * Validates a mapped entity record against target entity requirements
 * @param {Object} mappedData 
 * @param {string} targetEntity 
 * @returns {Array} errors list
 */
function validateEntityRecord(mappedData, targetEntity) {
    const spec = TARGET_ENTITIES[targetEntity];
    if (!spec) return [`Unsupported target entity: ${targetEntity}`];

    const errors = [];

    // Required fields check
    for (const reqField of spec.requiredFields) {
        const val = mappedData[reqField];
        if (val === undefined || val === null || String(val).trim() === "") {
            errors.push(`Missing mandatory field: '${reqField}'`);
        }
    }

    // Type specific checks
    if (targetEntity === "PATIENTS") {
        if (mappedData.dateOfBirth) {
            const d = new Date(mappedData.dateOfBirth);
            if (isNaN(d.getTime())) {
                errors.push("Invalid date format for 'dateOfBirth'. Expected YYYY-MM-DD.");
            }
        }
        if (mappedData.gender) {
            const g = String(mappedData.gender).toUpperCase();
            if (!["MALE", "FEMALE", "OTHER", "M", "F"].includes(g)) {
                errors.push("Invalid gender value. Must be MALE, FEMALE, or OTHER.");
            }
        }
    } else if (targetEntity === "INVENTORY_ITEMS") {
        if (mappedData.unitPrice !== undefined && mappedData.unitPrice !== null) {
            const p = parseFloat(mappedData.unitPrice);
            if (isNaN(p) || p < 0) {
                errors.push("unitPrice must be a positive number.");
            }
        }
    } else if (targetEntity === "BILLING_TARIFFS") {
        if (mappedData.standardCashPrice !== undefined && mappedData.standardCashPrice !== null) {
            const p = parseFloat(mappedData.standardCashPrice);
            if (isNaN(p) || p < 0) {
                errors.push("standardCashPrice must be a positive number.");
            }
        }
    }

    return errors;
}

module.exports = {
    SUPPORTED_SOURCES,
    TARGET_ENTITIES,
    parseCsv,
    parseJson,
    validateEntityRecord
};
