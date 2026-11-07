"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
NHIA / NHIS CLAIMS CONTROLLER
Phase 19 Production Hardened - CommonJS Only
LOCATION: src/modules/insurance-claims/controllers/insurance-claims.controller.js
====================================================
*/

const service = require("../services/insurance-claims.service");
const logger = require("../../../core/utils/logger");

/**
 * Returns G-DRG tariffs and NHIA rejection catalogs
 */
async function getCatalogs(req, res, next) {
    try {
        const catalogs = await service.getInsuranceCatalogs();
        res.status(200).json({
            success: true,
            message: "NHIA Reference catalogs retrieved successfully",
            data: catalogs
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Creates a new claims batch
 */
async function createBatch(req, res, next) {
    try {
        const batch = await service.createBatch({
            ...req.body,
            createdBy: req.user ? `${req.user.firstName} ${req.user.lastName}` : "NHIS_OFFICER"
        });
        res.status(201).json({
            success: true,
            message: "NHIA Claims Batch initialized successfully",
            data: batch
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Lists claims batches
 */
async function getBatches(req, res, next) {
    try {
        const result = await service.getBatches(req.query);
        res.status(200).json({
            success: true,
            message: "NHIA Claims Batches retrieved successfully",
            data: result.data,
            meta: result.meta
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Retrieves a single batch
 */
async function getBatchById(req, res, next) {
    try {
        const batch = await service.getBatchById(req.params.id);
        res.status(200).json({
            success: true,
            message: "NHIA Claims Batch details retrieved",
            data: batch
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Adds an individual claim item to a batch
 */
async function addClaim(req, res, next) {
    try {
        const claim = await service.addClaimToBatch(req.params.id, req.body);
        res.status(201).json({
            success: true,
            message: "Clinical Claim added to NHIA Batch successfully",
            data: claim
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Lists claims in a batch
 */
async function getBatchClaims(req, res, next) {
    try {
        const result = await service.getBatchClaims(req.params.id, req.query);
        res.status(200).json({
            success: true,
            message: "Batch Claims retrieved",
            data: result.data,
            meta: result.meta
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Runs automated vetting engine on a batch
 */
async function runVetting(req, res, next) {
    try {
        const auditedBy = req.user ? `${req.user.firstName} ${req.user.lastName}` : "CLINICAL_AUDITOR";
        const result = await service.runAutomatedVetting(req.params.id, auditedBy);
        res.status(200).json({
            success: true,
            message: "Automated Pre-Submission Vetting completed",
            data: result
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Generates E-Claims XML & JSON export payload
 */
async function generateEClaims(req, res, next) {
    try {
        const payload = await service.generateEClaims(req.params.id);
        res.status(200).json({
            success: true,
            message: "NHIA Compliant E-Claims payload compiled",
            data: payload
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Submits batch to the NHIA Electronic Clearinghouse
 */
async function submitBatch(req, res, next) {
    try {
        const submittedBy = req.user ? `${req.user.firstName} ${req.user.lastName}` : "NHIS_OFFICER";
        const result = await service.submitBatchToNhia(req.params.id, submittedBy);
        res.status(200).json({
            success: true,
            message: "NHIA E-Claims Batch submitted successfully",
            data: result
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Processes Electronic Adjudication
 */
async function processAdjudication(req, res, next) {
    try {
        const adjudicatedBy = req.user ? `${req.user.firstName} ${req.user.lastName}` : "NHIA_ELECTRONIC_ADJUDICATOR";
        const result = await service.processElectronicAdjudication(req.params.id, {
            ...req.body,
            adjudicatedBy
        });
        res.status(200).json({
            success: true,
            message: "NHIA Electronic Adjudication processed successfully",
            data: result
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Generates official Reconciliation Voucher
 */
async function generateVoucher(req, res, next) {
    try {
        const voucher = await service.generateReconciliationVoucher(req.params.id, req.body);
        res.status(201).json({
            success: true,
            message: "Official NHIA Reconciliation Voucher issued successfully",
            data: voucher
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Appeals a rejected claim
 */
async function appealClaim(req, res, next) {
    try {
        const claim = await service.appealRejectedClaim(req.params.claimId, req.body);
        res.status(200).json({
            success: true,
            message: "Clinical Appeal submitted for NHIA Re-adjudication",
            data: claim
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Checks member eligibility in real-time
 */
async function checkEligibility(req, res, next) {
    try {
        const result = await service.checkMemberEligibility(req.params.nhisNumber || req.query.nhisNumber || req.body.nhisNumber);
        res.status(200).json({
            success: true,
            message: "NHIS Member Eligibility verified",
            data: result
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Registers or updates member policy
 */
async function registerPolicy(req, res, next) {
    try {
        const policy = await service.registerMemberPolicy(req.body);
        res.status(201).json({
            success: true,
            message: "NHIS Member Policy record registered",
            data: policy
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Live NHIA Command Center Telemetry
 */
async function getTelemetry(req, res, next) {
    try {
        const telemetry = await service.getNhiaCommandCenterTelemetry();
        res.status(200).json({
            success: true,
            message: "Live NHIA Command Center telemetry aggregated",
            data: telemetry
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getCatalogs,
    createBatch,
    getBatches,
    getBatchById,
    addClaim,
    getBatchClaims,
    runVetting,
    generateEClaims,
    submitBatch,
    processAdjudication,
    generateVoucher,
    appealClaim,
    checkEligibility,
    registerPolicy,
    getTelemetry
};
