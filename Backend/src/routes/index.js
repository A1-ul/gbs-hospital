"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
API ROUTE REGISTRY (authoritative: Backend/src/routes)
COMMONJS ONLY
====================================================
*/

const express = require("express");
const router = express.Router();
const logger = require("../core/utils/logger");

function registerRoute(path, routeModule, name) {
    if (!routeModule) {
        const error = new Error(`${name} route is undefined`);
        logger.error({
            message: `${name} route registration failed`,
            error: error.message
        });
        throw error;
    }

    router.use(path, routeModule);
    logger.info({
        message: `${name} route registered`,
        path
    });
}

registerRoute("/health", require("./health.routes"), "Health");

registerRoute(
    "/auth",
    require("../modules/auth/routes/auth.routes"),
    "Authentication"
);

registerRoute(
    "/users",
    require("../modules/users/routes/users.routes"),
    "User Management"
);

registerRoute(
    "/tenants",
    require("../modules/tenant-management/tenant-management.routes"),
    "Tenant Management"
);

registerRoute(
    "/patients",
    require("../modules/patients/routes/patients.routes"),
    "Patient Management & MPI"
);

registerRoute(
    "/medical-records",
    require("../modules/medical-records/routes/medical-records.routes"),
    "Medical Records & Archive"
);

registerRoute(
    "/clinical",
    require("../modules/clinical/routes/clinical.routes"),
    "Clinical & OPD Triage"
);

registerRoute(
    "/admissions",
    require("../modules/admissions/routes/admissions.routes"),
    "Inpatient & Ward Management"
);

registerRoute(
    "/wards",
    require("../modules/admissions/routes/admissions.routes"),
    "Hospital Wards & Bed Matrix"
);

registerRoute(
    "/pharmacy",
    require("../modules/pharmacy/routes/pharmacy.routes"),
    "Pharmacy & Dispensing"
);

registerRoute(
    "/inventory",
    require("../modules/pharmacy/routes/pharmacy.routes"),
    "Pharmacy Inventory"
);

registerRoute(
    "/prescriptions",
    require("../modules/pharmacy/routes/pharmacy.routes"),
    "Prescription Management"
);

registerRoute(
    "/laboratory",
    require("../modules/laboratory/routes/laboratory.routes"),
    "Laboratory & Diagnostics"
);

registerRoute(
    "/pathology",
    require("../modules/laboratory/routes/laboratory.routes"),
    "Pathology Services"
);

registerRoute(
    "/tests",
    require("../modules/laboratory/routes/laboratory.routes"),
    "Diagnostic Tests"
);

registerRoute(
    "/radiology",
    require("../modules/radiology/routes/radiology.routes"),
    "Radiology & PACS Imaging"
);

registerRoute(
    "/pacs",
    require("../modules/radiology/routes/radiology.routes"),
    "PACS Archive & Studies"
);

registerRoute(
    "/imaging",
    require("../modules/radiology/routes/radiology.routes"),
    "Diagnostic Imaging"
);

registerRoute(
    "/billing",
    require("../modules/billing/routes/billing.routes"),
    "Billing & Invoicing"
);

registerRoute(
    "/invoices",
    require("../modules/billing/routes/billing.routes"),
    "Patient Invoices"
);

registerRoute(
    "/finance",
    require("../modules/billing/routes/billing.routes"),
    "Hospital Financial Management"
);

registerRoute(
    "/claims",
    require("../modules/billing/routes/billing.routes"),
    "Insurance & NHIS Claims"
);

registerRoute(
    "/surgery",
    require("../modules/surgery/routes/surgery.routes"),
    "Surgery & Operating Theatre"
);

registerRoute(
    "/operating-theatre",
    require("../modules/surgery/routes/surgery.routes"),
    "Operating Theatre Management"
);

registerRoute(
    "/theatre",
    require("../modules/surgery/routes/surgery.routes"),
    "Operating Theatre Suites"
);

registerRoute(
    "/pacu",
    require("../modules/surgery/routes/surgery.routes"),
    "Post-Anesthesia Care Unit"
);

registerRoute(
    "/emergency",
    require("../modules/emergency/emergency.routes"),
    "Emergency & Accident Department"
);

registerRoute(
    "/ambulance",
    require("../modules/emergency/emergency.routes"),
    "Ambulance Fleet & GPS Dispatch"
);

registerRoute(
    "/ems",
    require("../modules/emergency/emergency.routes"),
    "Emergency Medical Services"
);

registerRoute(
    "/blood-bank",
    require("../modules/blood-bank/blood-bank.routes"),
    "Blood Bank & Transfusion Services"
);

registerRoute(
    "/transfusion",
    require("../modules/blood-bank/blood-bank.routes"),
    "Transfusion Medicine & Cross-Matching"
);

registerRoute(
    "/blood",
    require("../modules/blood-bank/blood-bank.routes"),
    "Blood Donor & Component Inventory"
);

registerRoute(
    "/mortuary",
    require("../modules/mortuary/mortuary.routes"),
    "Mortuary Management & Cold Storage"
);

registerRoute(
    "/biomedical",
    require("../modules/biomedical/biomedical.routes"),
    "Biomedical Engineering & Equipment Maintenance"
);

registerRoute(
    "/equipment",
    require("../modules/biomedical/biomedical.routes"),
    "Medical Equipment Inventory & Assets"
);

registerRoute(
    "/work-orders",
    require("../modules/biomedical/biomedical.routes"),
    "Biomedical Maintenance Work Orders"
);

registerRoute(
    "/procurement",
    require("../modules/procurement/procurement.routes"),
    "Procurement & Supply Chain Management"
);

registerRoute(
    "/vendors",
    require("../modules/procurement/procurement.routes"),
    "Vendor Directory & Supplier Contracts"
);

registerRoute(
    "/purchase-orders",
    require("../modules/procurement/procurement.routes"),
    "Purchase Orders & Goods Receipt Notes"
);

registerRoute(
    "/supply-chain",
    require("../modules/procurement/procurement.routes"),
    "Supply Chain & Three-Way Matching"
);

registerRoute(
    "/hr",
    require("../modules/hr/hr.routes"),
    "Human Resources & Staff Credentialing"
);

registerRoute(
    "/roster",
    require("../modules/hr/hr.routes"),
    "Duty Rostering & Shift Scheduling"
);

registerRoute(
    "/duty-roster",
    require("../modules/hr/hr.routes"),
    "Duty Rostering System"
);

registerRoute(
    "/credentials",
    require("../modules/hr/hr.routes"),
    "Staff Credentialing & Licensing"
);

registerRoute(
    "/attendance",
    require("../modules/hr/hr.routes"),
    "Staff Biometric Attendance"
);

registerRoute(
    "/leave",
    require("../modules/hr/hr.routes"),
    "Staff Leave Management & Approvals"
);

registerRoute(
    "/quality",
    require("../modules/quality/quality.routes"),
    "Quality Assurance & Patient Safety"
);

registerRoute(
    "/incidents",
    require("../modules/quality/quality.routes"),
    "Clinical Incidents & Adverse Events"
);

registerRoute(
    "/infection-control",
    require("../modules/quality/quality.routes"),
    "Infection Prevention & Control (IPC)"
);

registerRoute(
    "/clinical-audits",
    require("../modules/quality/quality.routes"),
    "Clinical Audits & Peer Reviews"
);

registerRoute(
    "/safety-alerts",
    require("../modules/quality/quality.routes"),
    "Patient Safety Alerts & Bulletins"
);

registerRoute(
    "/capa",
    require("../modules/quality/quality.routes"),
    "Corrective & Preventive Action Plans (CAPA)"
);

// PHASE 19: NHIA Claims Batches, E-Claims & Electronic Adjudication
registerRoute(
    "/nhia",
    require("../modules/insurance-claims/routes/insurance-claims.routes"),
    "National Health Insurance Authority (NHIA) Subsystem"
);

registerRoute(
    "/insurance-claims",
    require("../modules/insurance-claims/routes/insurance-claims.routes"),
    "NHIA Claims & Batches"
);

registerRoute(
    "/claims",
    require("../modules/insurance-claims/routes/insurance-claims.routes"),
    "Health Insurance Claims"
);

registerRoute(
    "/nhis",
    require("../modules/insurance-claims/routes/insurance-claims.routes"),
    "NHIS Member Verification & Policies"
);

// PHASE 20: Migration Service Module & Data Import Hub
registerRoute(
    "/migration",
    require("../modules/migration/routes/migration.routes"),
    "Migration Service & Data Import Hub"
);

registerRoute(
    "/import",
    require("../modules/migration/routes/migration.routes"),
    "Enterprise Data Import & Schema Mapping"
);

registerRoute(
    "/data-migration",
    require("../modules/migration/routes/migration.routes"),
    "Data Migration Subsystem & Rollback Engine"
);

// PHASE 21: GIS Facility Tracking, Geofencing, Floor Plans & WebRTC Telemedicine
registerRoute(
    "/facility-maps",
    require("../modules/facility-maps/facility-maps.routes"),
    "GIS Facility Tracking & Geofencing"
);

registerRoute(
    "/gis",
    require("../modules/facility-maps/facility-maps.routes"),
    "Geographic Information System"
);

registerRoute(
    "/geofence",
    require("../modules/facility-maps/facility-maps.routes"),
    "Campus Geofence Engine"
);

registerRoute(
    "/floor-plans",
    require("../modules/facility-maps/facility-maps.routes"),
    "Interactive Floor Plans & Spatial Assets"
);

registerRoute(
    "/telemedicine",
    require("../modules/telemedicine/routes/telemedicine.routes"),
    "WebRTC Video Telemedicine Subsystem"
);

registerRoute(
    "/video-consultations",
    require("../modules/telemedicine/routes/telemedicine.routes"),
    "Doctor-Patient Virtual Clinic"
);

registerRoute(
    "/webrtc",
    require("../modules/telemedicine/routes/telemedicine.routes"),
    "WebRTC Signaling Channel"
);

registerRoute(
    "/biometrics",
    require("../modules/biometrics/routes/biometric-vault.routes"),
    "Central Voice & Biometric Security Vault"
);

registerRoute(
    "/voice-auth",
    require("../modules/biometrics/routes/biometric-vault.routes"),
    "Voice Authentication Platform Service"
);

registerRoute(
    "/biometric-vault",
    require("../modules/biometrics/routes/biometric-vault.routes"),
    "Biometric Security Vault"
);

registerRoute(
    "/voiceprint",
    require("../modules/biometrics/routes/biometric-vault.routes"),
    "Acoustic Voiceprint Registry"
);

module.exports = router;



