"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PATIENT MANAGEMENT & MPI CONTROLLER
LOCATION: src/modules/patients/controllers/patient.controller.js
====================================================
*/

const patientService = require("../services/patient.service");

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
        return res.status(201).json({
            success: true,
            message: result.message,
            data: result
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
        return res.status(200).json({
            success: true,
            message: "Patient record updated successfully",
            data: updated
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

module.exports = {
    registerPatient,
    searchMPI,
    getPatientById,
    updatePatient,
    getPatientDashboard
};
