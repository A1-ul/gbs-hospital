"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PATIENT MANAGEMENT & MPI CONTROLLER
LOCATION: src/modules/patients/controllers/patient.controller.js
====================================================
*/

const patientService = require("../services/patient.service");
const membershipCardService = require("../services/membership-card.service");
const { rcce } = require("../../../core/gbs-rcce.bootstrap");

/**
 * Register Patient into MPI & Auto-Provision Physical Folder
 * POST /api/v1/patients/register
 */
async function registerPatient(req, res, next) {
    try {
        const creatorUserId = req.user ? req.user.id : null;
        const hospitalId = req.body.hospitalId || (req.user ? req.user.hospitalId : null);
        const data = { ...req.body, hospitalId };

        const result = await patientService.registerPatient(data, creatorUserId);

        try {
            await rcce.events.publish({
                eventCode: "PATIENT_REGISTERED",
                domain: "PATIENTS",
                actorUserId: creatorUserId,
                actorRole: req.user?.role,
                tenantId: hospitalId,
                affectedRecord: result?.patient?.mrn || result?.mrn || result?.patient?.id,
                severity: "INFO",
                requestId: req.requestId,
                notifications: [
                    {
                        recipientRole: "RECEPTIONIST",
                        title: "New Patient Registered",
                        message: `Patient ${result?.patient?.firstName || ""} ${result?.patient?.lastName || ""} registered cleanly (MRN: ${result?.patient?.mrn || result?.mrn || "Issued"}).`,
                        severity: "SUCCESS"
                    },
                    {
                        recipientRole: "FOLDER_RETRIEVER",
                        title: "Medical Folder Provisioned",
                        message: `Physical medical archive folder created for MRN ${result?.patient?.mrn || result?.mrn || "New"}.`,
                        severity: "INFO"
                    }
                ]
            });
        } catch (_pubErr) { }

        return res.rcceSuccess("PATIENT_REGISTERED", result, {
            httpStatus: 201,
            message: result.message || "Registration completed successfully."
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Search Master Patient Index (MPI)
 * GET /api/v1/patients/search
 */
async function searchMPI(req, res, next) {
    try {
        const { query, mrn, name, phone, nationalId, nhisNumber, page, limit } = req.query;
        const hospitalId = req.query.hospitalId || (req.user ? req.user.hospitalId : null);

        const result = await patientService.searchMPI({
            query,
            mrn,
            name,
            phone,
            nationalId,
            nhisNumber,
            hospitalId,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20
        });

        return res.status(200).json({
            success: true,
            data: result.patients,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Comprehensive Patient Details by ID or MRN
 * GET /api/v1/patients/:id
 */
async function getPatientById(req, res, next) {
    try {
        const { id } = req.params;
        const hospitalId = req.query.hospitalId || (req.user ? req.user.hospitalId : null);

        const patient = await patientService.getPatientById(id, hospitalId);
        return res.status(200).json({
            success: true,
            data: patient
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update Patient Demographics & Profile
 * PUT /api/v1/patients/:id
 */
async function updatePatient(req, res, next) {
    try {
        const { id } = req.params;
        const modifierUserId = req.user ? req.user.id : null;

        const updated = await patientService.updatePatient(id, req.body, modifierUserId);
        try {
            await rcce.events.publish({
                eventCode: "RECORD_UPDATED",
                domain: "PATIENTS",
                actorUserId: modifierUserId,
                actorRole: req.user?.role,
                affectedRecord: updated.mrn || updated.id || id,
                severity: "INFO",
                requestId: req.requestId,
                notifications: [
                    {
                        recipientRole: "RECEPTIONIST",
                        title: "Patient Profile Updated",
                        message: `Patient record ${updated.mrn || id} updated successfully.`,
                        severity: "INFO"
                    }
                ]
            });
        } catch (_pubErr) { }

        return res.rcceSuccess("RECORD_UPDATED", updated, {
            httpStatus: 200,
            message: "Your information has been updated successfully."
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Personal Patient Self-Service Dashboard for Authenticated User
 * GET /api/v1/patients/me/dashboard
 */
async function getMyPatientDashboard(req, res, next) {
    try {
        const prisma = require("../../../core/database/prisma.client");
        const userId = req.user?.id;
        const userEmail = req.user?.email ? String(req.user.email).trim().toLowerCase() : null;

        let patient = null;
        if (userId) {
            patient = await prisma.patient.findFirst({ where: { userId } });
        }
        if (!patient && userEmail) {
            patient = await prisma.patient.findFirst({
                where: { email: { equals: userEmail, mode: "insensitive" } }
            });
        }
        if (!patient) {
            patient = await prisma.patient.findFirst({ orderBy: { createdAt: "desc" } });
        }

        if (!patient) {
            return res.status(200).json({
                success: true,
                data: {
                    linked: false,
                    message: "No patient record linked to this account yet. Please register at hospital reception.",
                    patient: null,
                    encounters: [],
                    prescriptions: [],
                    bills: [],
                    allergies: []
                }
            });
        }

        const dashboard = await patientService.getPatientDashboard(patient.id);
        return res.status(200).json({
            success: true,
            data: { linked: true, ...dashboard }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Patient Role Dashboard
 * GET /api/v1/patients/:id/dashboard
 */
async function getPatientDashboard(req, res, next) {
    try {
        const { id } = req.params;
        const dashboard = await patientService.getPatientDashboard(id);
        return res.status(200).json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Generate Official Hospital Registration Membership ID Card for a Registered Patient
 * GET /api/v1/patients/:id/membership-card
 */
async function getPatientMembershipCard(req, res, next) {
    try {
        const card = await membershipCardService.generatePatientMembershipCard(
            req.params.id,
            req.user,
            req.requestId
        );
        return res.rcceSuccess("MEMBERSHIP_CARD_GENERATED", card, {
            httpStatus: 200,
            message: `Official Hospital Membership ID Card ${card.cardSerial} ready for ${card.member.fullName}.`
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    registerPatient,
    searchMPI,
    getPatientById,
    updatePatient,
    getMyPatientDashboard,
    getPatientDashboard,
    getPatientMembershipCard
};
