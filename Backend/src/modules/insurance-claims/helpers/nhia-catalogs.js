"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
NHIA / NHIS REFERENCE CATALOGS, TARIFFS & VETTING ENGINE
Phase 19 Production Hardened - CommonJS Only
LOCATION: src/modules/insurance-claims/helpers/nhia-catalogs.js
====================================================
*/

const crypto = require("crypto");

/**
 * Ghana Diagnostic-Related Group (G-DRG) Standard Tariffs
 */
const GDRG_TARIFFS = [
    { code: "GDRG-OPD-01", name: "General OPD Consultation & Routine Assessment", category: "OPD", tariffGhs: 45.00, copayExempt: true },
    { code: "GDRG-OPD-02", name: "Specialist Physician Consultation", category: "OPD", tariffGhs: 75.00, copayExempt: false },
    { code: "GDRG-IPD-MAL01", name: "Severe Uncomplicated Malaria with Inpatient Care", category: "IPD", tariffGhs: 320.00, copayExempt: true },
    { code: "GDRG-IPD-OBS01", name: "Spontaneous Vaginal Delivery with Maternal Monitoring", category: "MATERNITY", tariffGhs: 550.00, copayExempt: true },
    { code: "GDRG-IPD-SURG01", name: "Emergency Appendectomy with Perioperative Care", category: "SURGERY", tariffGhs: 1450.00, copayExempt: false },
    { code: "GDRG-IPD-TRAUMA01", name: "Multiple Blunt Trauma with ICU Stabilization", category: "CRITICAL_CARE", tariffGhs: 2800.00, copayExempt: false },
    { code: "GDRG-RAD-01", name: "Standard Chest Radiography (X-Ray) PA View", category: "RADIOLOGY", tariffGhs: 85.00, copayExempt: true },
    { code: "GDRG-LAB-01", name: "Full Blood Count (FBC) with Automated Differential", category: "LABORATORY", tariffGhs: 60.00, copayExempt: true },
    { code: "GDRG-PHARM-01", name: "Essential Anti-infectives & Supportive Regimen", category: "PHARMACY", tariffGhs: 95.00, copayExempt: true }
];

/**
 * Official NHIA Adjudication Rejection Reasons
 */
const REJECTION_REASONS = [
    { code: "REJ-01", description: "Member card expired or inactive on date of clinical encounter" },
    { code: "REJ-02", description: "Primary ICD-10 diagnosis incompatible with billed G-DRG tariff" },
    { code: "REJ-03", description: "Unbundled service code billed concurrently with bundled surgical procedure" },
    { code: "REJ-04", description: "Missing attending clinician credential or electronic signature verification" },
    { code: "REJ-05", description: "Duplicate claim detected for identical patient encounter within 48 hours" },
    { code: "REJ-06", description: "Medication dispensing quantity exceeds maximum NHIA standard protocol (30 days)" },
    { code: "REJ-07", description: "Patient not enrolled at primary healthcare gatekeeper facility" }
];

/**
 * Member Exemption Categories
 */
const MEMBER_CATEGORIES = [
    { code: "FORMAL_SECTOR", label: "SSNIT / Formal Sector Contributor", copayRequired: true },
    { code: "INFORMAL", label: "Informal Sector Premium Payer", copayRequired: true },
    { code: "INDIGENT", label: "Indigent / LEAP Social Welfare Beneficiary", copayRequired: false },
    { code: "UNDER_5", label: "Child Under 5 Years Exemption", copayRequired: false },
    { code: "PREGNANT", label: "Free Maternal Care Initiative", copayRequired: false },
    { code: "AGED_70_PLUS", label: "Senior Citizen (70+ Years) Exemption", copayRequired: false }
];

/**
 * Vets a claim item against NHIA rules
 * @param {Object} claim 
 * @param {Object|null} policy 
 * @returns {Array} list of warnings/errors
 */
function vetClaimItem(claim, policy) {
    const warnings = [];

    // Check 1: Policy validity
    if (!policy) {
        warnings.push({ code: "WARN-NO-POLICY", message: "NHIS Member record not found in local verification cache." });
    } else {
        if (policy.status !== "ACTIVE") {
            warnings.push({ code: "REJ-01", message: `Member card status is ${policy.status}; must be ACTIVE.` });
        }
        if (new Date(policy.expiryDate) < new Date(claim.encounterDate || Date.now())) {
            warnings.push({ code: "REJ-01", message: "Member card expired before date of encounter." });
        }
    }

    // Check 2: G-DRG code match
    const tariff = GDRG_TARIFFS.find(t => t.code === claim.gdrgCode);
    if (!tariff) {
        warnings.push({ code: "WARN-UNKNOWN-GDRG", message: `G-DRG code ${claim.gdrgCode} is not in standard national catalog.` });
    }

    // Check 3: Primary diagnosis presence
    if (!claim.primaryDiagnosisIcd10 || claim.primaryDiagnosisIcd10.trim().length === 0) {
        warnings.push({ code: "REJ-02", message: "Primary ICD-10 diagnosis code is mandatory for NHIA adjudication." });
    }

    // Check 4: Reasonable claim value check (> 0 and <= GHS 50,000)
    const amt = parseFloat(claim.claimedAmount);
    if (isNaN(amt) || amt <= 0) {
        warnings.push({ code: "WARN-INVALID-AMOUNT", message: "Claimed amount must be greater than zero." });
    } else if (amt > 50000) {
        warnings.push({ code: "WARN-EXCESSIVE-CLAIM", message: "Claim exceeds standard pre-authorization threshold of GHS 50,000." });
    }

    return warnings;
}

/**
 * Generates an encrypted/hashed compliant E-Claims XML/JSON payload
 * @param {Object} batch 
 * @param {Array} claims 
 * @returns {Object} { xmlPayload, jsonPayload, payloadChecksum }
 */
function buildEClaimsPayload(batch, claims) {
    const jsonStructure = {
        eClaimsHeader: {
            specificationVersion: "NHIA-ECLAIMS-V2.4",
            providerNumber: batch.providerNumber,
            providerName: batch.providerName,
            batchNumber: batch.batchNumber,
            periodMonth: batch.periodMonth,
            periodYear: batch.periodYear,
            submissionTimestamp: new Date().toISOString(),
            totalClaims: claims.length,
            totalClaimedAmountGhs: batch.totalClaimedAmount
        },
        claims: claims.map(c => ({
            claimNumber: c.claimNumber,
            patient: {
                id: c.patientId,
                name: c.patientName,
                nhisNumber: c.nhisNumber,
                gender: c.gender
            },
            encounter: {
                date: c.encounterDate,
                type: c.encounterType,
                dischargeDate: c.dischargeDate
            },
            clinical: {
                primaryIcd10: c.primaryDiagnosisIcd10,
                secondaryIcd10: c.secondaryDiagnosisIcd10,
                gdrgCode: c.gdrgCode,
                gdrgDescription: c.gdrgDescription
            },
            financial: {
                claimedAmountGhs: parseFloat(c.claimedAmount),
                copayPaidGhs: parseFloat(c.copayPaid)
            }
        }))
    };

    const jsonString = JSON.stringify(jsonStructure, null, 2);
    const payloadChecksum = crypto.createHash("sha256").update(jsonString).digest("hex");

    // Simplified XML representation
    const xmlLines = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<NhiaEClaimsBatch xmlns="urn:ghana:nhia:eclaims:v2" batch="${batch.batchNumber}" provider="${batch.providerNumber}">`,
        `  <Header>`,
        `    <Period month="${batch.periodMonth}" year="${batch.periodYear}" />`,
        `    <TotalClaims>${claims.length}</TotalClaims>`,
        `    <TotalAmountGhs>${batch.totalClaimedAmount}</TotalAmountGhs>`,
        `    <Checksum>${payloadChecksum}</Checksum>`,
        `  </Header>`,
        `  <Claims>`
    ];

    claims.forEach(c => {
        xmlLines.push(`    <Claim number="${c.claimNumber}" nhis="${c.nhisNumber}" gdrg="${c.gdrgCode}" amount="${c.claimedAmount}" icd10="${c.primaryDiagnosisIcd10}" />`);
    });

    xmlLines.push(`  </Claims>`);
    xmlLines.push(`</NhiaEClaimsBatch>`);

    return {
        jsonPayload: jsonString,
        xmlPayload: xmlLines.join("\n"),
        payloadChecksum
    };
}

module.exports = {
    GDRG_TARIFFS,
    REJECTION_REASONS,
    MEMBER_CATEGORIES,
    vetClaimItem,
    buildEClaimsPayload
};
