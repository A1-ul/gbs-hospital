"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
OUTPATIENT DEPARTMENT & CLINICAL TRIAGE CONTROLLER
LOCATION: src/modules/clinical/controllers/opd-triage.controller.js
====================================================
*/

const opdTriageService = require("../services/opd-triage.service");

/**
 * Check-in patient into OPD queue
 * POST /api/v1/clinical/opd/check-in
 */
async function checkInPatient(req, res, next) {
    try {
        const createdById = req.user ? req.user.id : null;
        const hospitalId = req.body.hospitalId || (req.user ? req.user.hospitalId : null);
        const data = { ...req.body, hospitalId };

        const result = await opdTriageService.checkInPatient(data, createdById);

        return res.status(201).json({
            success: true,
            message: `Patient checked in with queue token ${result.ticket.ticketNumber}`,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Nurse Triage Queue
 * GET /api/v1/clinical/triage/queue
 */
async function getNurseTriageQueue(req, res, next) {
    try {
        const hospitalId = req.query.hospitalId || (req.user ? req.user.hospitalId : null);
        const { priority, status } = req.query;

        const queue = await opdTriageService.getNurseTriageQueue(hospitalId, { priority, status });

        return res.status(200).json({
            success: true,
            count: queue.length,
            data: queue
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Record Nurse Triage Vitals & Calculate NEWS2
 * POST /api/v1/clinical/triage/:id/vitals
 */
async function recordNurseTriage(req, res, next) {
    try {
        const identifier = req.params.id;
        const nurseUserId = req.user ? req.user.id : null;
        const triageData = req.body;

        const result = await opdTriageService.recordNurseTriage(identifier, triageData, nurseUserId);

        return res.status(201).json({
            success: true,
            message: `Triage recorded successfully. NEWS2 Score: ${result.news2.news2Score} (${result.news2.riskCategory})`,
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Assign Doctor and Room to Encounter
 * POST /api/v1/clinical/encounters/:id/assign-doctor
 */
async function assignDoctorAndRoom(req, res, next) {
    try {
        const encounterId = req.params.id;
        const staffUserId = req.user ? req.user.id : null;
        const { doctorId, doctorName, room } = req.body;

        const result = await opdTriageService.assignDoctorAndRoom(encounterId, { doctorId, doctorName, room }, staffUserId);

        return res.status(200).json({
            success: true,
            message: "Doctor and room assigned to encounter",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Call Patient into Consulting Room
 * POST /api/v1/clinical/encounters/:id/call-in
 */
async function callPatientToDoctorRoom(req, res, next) {
    try {
        const encounterId = req.params.id;
        const doctorUserId = req.user ? req.user.id : null;

        const result = await opdTriageService.callPatientToDoctorRoom(encounterId, doctorUserId);

        return res.status(200).json({
            success: true,
            message: "Patient called into consulting room",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Complete Doctor Consultation
 * POST /api/v1/clinical/encounters/:id/complete
 */
async function completeConsultation(req, res, next) {
    try {
        const encounterId = req.params.id;
        const doctorUserId = req.user ? req.user.id : null;
        const { notes } = req.body;

        const result = await opdTriageService.completeConsultation(encounterId, notes, doctorUserId);

        return res.status(200).json({
            success: true,
            message: "Consultation marked as completed",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Doctor Waiting Queue
 * GET /api/v1/clinical/doctor/queue
 */
async function getDoctorWaitingQueue(req, res, next) {
    try {
        const hospitalId = req.query.hospitalId || (req.user ? req.user.hospitalId : null);
        const doctorId = req.query.doctorId || (req.user ? req.user.id : null);

        const queue = await opdTriageService.getDoctorWaitingQueue(hospitalId, doctorId, req.query);

        return res.status(200).json({
            success: true,
            count: queue.length,
            data: queue
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Nurse Dashboard Telemetry & Metrics
 * GET /api/v1/clinical/nurse/dashboard
 */
async function getNurseDashboardTelemetry(req, res, next) {
    try {
        const hospitalId = req.query.hospitalId || (req.user ? req.user.hospitalId : null);

        const telemetry = await opdTriageService.getNurseDashboardTelemetry(hospitalId);

        return res.status(200).json({
            success: true,
            data: telemetry
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get Encounter Details by ID
 * GET /api/v1/clinical/encounters/:id
 */
async function getEncounterById(req, res, next) {
    try {
        const encounterId = req.params.id;
        const encounter = await opdTriageService.getEncounterById(encounterId);

        return res.status(200).json({
            success: true,
            data: encounter
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    checkInPatient,
    getNurseTriageQueue,
    recordNurseTriage,
    assignDoctorAndRoom,
    callPatientToDoctorRoom,
    completeConsultation,
    getDoctorWaitingQueue,
    getNurseDashboardTelemetry,
    getEncounterById
};
