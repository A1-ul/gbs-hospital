"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
INPATIENT DEPARTMENT (IPD) & ADMISSION CONTROLLER
LOCATION: src/modules/admissions/controllers/inpatient.controller.js
====================================================
*/

const inpatientService = require("../services/inpatient.service");

/**
 * Create a Hospital Ward
 * POST /api/v1/admissions/wards
 */
async function createWard(req, res, next) {
    try {
        const hospitalId = req.body.hospitalId || (req.user ? req.user.hospitalId : null);
        const data = { ...req.body, hospitalId };

        const ward = await inpatientService.createWard(data);

        return res.status(201).json({
            success: true,
            message: `Ward ${ward.name} (${ward.code}) created successfully`,
            data: ward
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Hospital Wards with Live Bed Occupancy
 * GET /api/v1/admissions/wards
 */
async function getHospitalWards(req, res, next) {
    try {
        const hospitalId = req.query.hospitalId || (req.user ? req.user.hospitalId : null);
        const wards = await inpatientService.getHospitalWards(hospitalId);

        return res.status(200).json({
            success: true,
            count: wards.length,
            data: wards
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Create a Room in a Ward
 * POST /api/v1/admissions/rooms
 */
async function createRoom(req, res, next) {
    try {
        const hospitalId = req.body.hospitalId || (req.user ? req.user.hospitalId : null);
        const data = { ...req.body, hospitalId };

        const room = await inpatientService.createRoom(data);

        return res.status(201).json({
            success: true,
            message: `Room ${room.name} created successfully`,
            data: room
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Create a Bed in a Room
 * POST /api/v1/admissions/beds
 */
async function createBed(req, res, next) {
    try {
        const hospitalId = req.body.hospitalId || (req.user ? req.user.hospitalId : null);
        const data = { ...req.body, hospitalId };

        const bed = await inpatientService.createBed(data);

        return res.status(201).json({
            success: true,
            message: `Bed ${bed.bedNumber} created with status AVAILABLE`,
            data: bed
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Ward Bed Map / Matrix
 * GET /api/v1/admissions/wards/:id/bed-matrix
 */
async function getWardBedMatrix(req, res, next) {
    try {
        const wardId = req.params.id;
        const hospitalId = req.query.hospitalId || (req.user ? req.user.hospitalId : null);

        const matrix = await inpatientService.getWardBedMatrix(hospitalId, wardId);

        return res.status(200).json({
            success: true,
            data: matrix
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Admit Patient to Ward & Bed
 * POST /api/v1/admissions/admit
 */
async function admitPatient(req, res, next) {
    try {
        const hospitalId = req.body.hospitalId || (req.user ? req.user.hospitalId : null);
        const data = { ...req.body, hospitalId };
        const staffUser = req.user;

        const admission = await inpatientService.admitPatient(data, staffUser);

        return res.status(201).json({
            success: true,
            message: `Patient admitted successfully with Admission Number ${admission.admissionNumber}`,
            data: admission
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Transfer Inpatient to New Bed / Ward
 * POST /api/v1/admissions/:id/transfer-bed
 */
async function transferBed(req, res, next) {
    try {
        const admissionId = req.params.id;
        const transferData = req.body;
        const staffUser = req.user;

        const result = await inpatientService.transferBed(admissionId, transferData, staffUser);

        return res.status(200).json({
            success: true,
            message: `Patient successfully transferred to ${result.newLocation.wardName}, Bed ${result.newLocation.bedNumber}`,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Record Daily Inpatient Nursing Chart & Shift Notes
 * POST /api/v1/admissions/:id/nursing-charts
 */
async function recordInpatientNursingChart(req, res, next) {
    try {
        const admissionId = req.params.id;
        const chartData = req.body;
        const nurseUser = req.user;

        const chart = await inpatientService.recordInpatientNursingChart(admissionId, chartData, nurseUser);

        return res.status(201).json({
            success: true,
            message: `Inpatient nursing chart recorded for ${chart.shift} shift`,
            data: chart
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Nursing Shift Charts for an Admission
 * GET /api/v1/admissions/:id/nursing-charts
 */
async function getAdmissionNursingCharts(req, res, next) {
    try {
        const admissionId = req.params.id;
        const charts = await inpatientService.getAdmissionNursingCharts(admissionId);

        return res.status(200).json({
            success: true,
            count: charts.length,
            data: charts
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Discharge Inpatient from Ward
 * POST /api/v1/admissions/:id/discharge
 */
async function dischargePatient(req, res, next) {
    try {
        const admissionId = req.params.id;
        const dischargeData = req.body;
        const staffUser = req.user;

        const result = await inpatientService.dischargePatient(admissionId, dischargeData, staffUser);

        return res.status(200).json({
            success: true,
            message: "Patient discharged from inpatient ward successfully",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Active Inpatient Admissions
 * GET /api/v1/admissions/active
 */
async function getActiveAdmissions(req, res, next) {
    try {
        const hospitalId = req.query.hospitalId || (req.user ? req.user.hospitalId : null);
        const admissions = await inpatientService.getActiveAdmissions(hospitalId, req.query);

        return res.status(200).json({
            success: true,
            count: admissions.length,
            data: admissions
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Single Admission by ID
 * GET /api/v1/admissions/:id
 */
async function getAdmissionById(req, res, next) {
    try {
        const admissionId = req.params.id;
        const admission = await inpatientService.getAdmissionById(admissionId);

        return res.status(200).json({
            success: true,
            data: admission
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Inpatient Department Dashboard Telemetry
 * GET /api/v1/admissions/dashboard
 */
async function getIpdDashboardTelemetry(req, res, next) {
    try {
        const hospitalId = req.query.hospitalId || (req.user ? req.user.hospitalId : null);
        const telemetry = await inpatientService.getIpdDashboardTelemetry(hospitalId);

        return res.status(200).json({
            success: true,
            data: telemetry
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createWard,
    getHospitalWards,
    createRoom,
    createBed,
    getWardBedMatrix,
    admitPatient,
    transferBed,
    recordInpatientNursingChart,
    getAdmissionNursingCharts,
    dischargePatient,
    getActiveAdmissions,
    getAdmissionById,
    getIpdDashboardTelemetry
};
