"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
DOCTOR CONSULTATION, ICD-10 & PRESCRIPTION CONTROLLER
LOCATION: src/modules/clinical/controllers/consultation.controller.js
====================================================
*/

const consultationService = require("../services/consultation.service");

/**
 * Record Doctor Clinical Consultation, ICD-10 Diagnoses, Prescriptions & Lab Requests
 * POST /api/v1/clinical/encounters/:id/consultation
 */
async function recordDoctorConsultation(req, res, next) {
    try {
        const encounterId = req.params.id;
        const doctorUser = req.user;
        const consultationData = req.body;

        const result = await consultationService.recordDoctorConsultation(encounterId, consultationData, doctorUser);

        return res.status(201).json({
            success: true,
            message: "Doctor clinical consultation, diagnoses, and orders recorded successfully",
            data: result.data
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Full Consultation Details by Encounter ID
 * GET /api/v1/clinical/encounters/:id/consultation
 */
async function getConsultationDetails(req, res, next) {
    try {
        const encounterId = req.params.id;
        const details = await consultationService.getConsultationDetails(encounterId);

        return res.status(200).json({
            success: true,
            data: details
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Longitudinal Clinical History for a Patient
 * GET /api/v1/clinical/patients/:patientId/clinical-history
 */
async function getPatientClinicalHistory(req, res, next) {
    try {
        const patientId = req.params.patientId;
        const history = await consultationService.getPatientClinicalHistory(patientId);

        return res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Doctor Dashboard Real-Life Telemetry & Operational Metrics
 * GET /api/v1/clinical/doctor/dashboard
 */
async function getDoctorDashboardTelemetry(req, res, next) {
    try {
        const hospitalId = req.query.hospitalId || (req.user ? req.user.hospitalId : null);
        const doctorUserId = req.user ? req.user.id : null;

        const telemetry = await consultationService.getDoctorDashboardTelemetry(hospitalId, doctorUserId);

        return res.status(200).json({
            success: true,
            data: telemetry
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Search ICD-10 Clinical Diagnostic Catalog
 * GET /api/v1/clinical/catalog/diagnoses
 */
async function searchICD10Catalog(req, res, next) {
    try {
        const { query } = req.query;
        const results = consultationService.searchICD10(query);

        return res.status(200).json({
            success: true,
            count: results.length,
            data: results
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Search Clinical Medications Formulary
 * GET /api/v1/clinical/catalog/medications
 */
async function searchMedicationsCatalog(req, res, next) {
    try {
        const { query } = req.query;
        const results = consultationService.searchMedications(query);

        return res.status(200).json({
            success: true,
            count: results.length,
            data: results
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Search Laboratory Investigation Catalog
 * GET /api/v1/clinical/catalog/lab-tests
 */
async function searchLabTestsCatalog(req, res, next) {
    try {
        const { query } = req.query;
        const results = consultationService.searchLabTests(query);

        return res.status(200).json({
            success: true,
            count: results.length,
            data: results
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    recordDoctorConsultation,
    getConsultationDetails,
    getPatientClinicalHistory,
    getDoctorDashboardTelemetry,
    searchICD10Catalog,
    searchMedicationsCatalog,
    searchLabTestsCatalog
};
