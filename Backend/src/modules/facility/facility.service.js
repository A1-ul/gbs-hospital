"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
FACILITY MANAGEMENT SERVICE
Assets, Maintenance, Housekeeping & Utilities (Power/Oxygen/Water/HVAC)
LOCATION: Backend/src/modules/facility/facility.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const { ensureDefaultHospitalId } = require("../../core/database/hospital-resolver");
const AppError = require("../../core/errors/app.error");

async function generateFacilityTaskCode() {
    const year = new Date().getFullYear();
    const count = await prisma.facilityTask.count();
    return `FAC-${year}-${String(count + 1).padStart(6, "0")}`;
}

async function getFacilityTelemetry() {
    const totalTasks = await prisma.facilityTask.count();
    const openTasks = await prisma.facilityTask.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } });
    const housekeepingTasks = await prisma.facilityTask.count({ where: { category: "HOUSEKEEPING" } });
    const utilitiesTasks = await prisma.facilityTask.count({ where: { category: { in: ["UTILITIES", "HVAC_WATER_POWER"] } } });
    const completedTasks = await prisma.facilityTask.count({ where: { status: { in: ["COMPLETED", "VERIFIED"] } } });

    return {
        totalTasks,
        openTasks,
        housekeepingTasks,
        utilitiesTasks,
        completedTasks
    };
}

async function listFacilityTasks({ category, status, priority, limit = 60 } = {}) {
    const where = {};
    if (category) where.category = String(category).toUpperCase();
    if (status) where.status = String(status).toUpperCase();
    if (priority) where.priority = String(priority).toUpperCase();

    const tasks = await prisma.facilityTask.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit) || 60, 150)
    });
    return { total: tasks.length, tasks };
}

async function createFacilityTask(payload = {}, actor) {
    const {
        category = "HOUSEKEEPING",
        title,
        location,
        priority = "NORMAL",
        assignedToName = null,
        utilityMetricValue = null,
        utilityMetricUnit = null,
        notes = null
    } = payload;

    if (!title || !location) {
        throw new AppError("Task title and facility location are required", 400, "MISSING_FACILITY_FIELDS");
    }

    const hospitalId = await ensureDefaultHospitalId();
    const taskCode = await generateFacilityTaskCode();
    const reporterName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() || actor.email : "Hospital Staff";

    const created = await prisma.$transaction(async (tx) => {
        const task = await tx.facilityTask.create({
            data: {
                taskCode,
                hospitalId,
                category: String(category).toUpperCase(),
                title: String(title).trim(),
                location: String(location).trim(),
                priority: String(priority).toUpperCase(),
                assignedToName: assignedToName ? String(assignedToName).trim() : null,
                status: "OPEN",
                utilityMetricValue: utilityMetricValue !== null && utilityMetricValue !== "" ? Number(utilityMetricValue) : null,
                utilityMetricUnit: utilityMetricUnit ? String(utilityMetricUnit).trim() : null,
                notes: notes ? String(notes).trim() : null,
                reportedById: actor?.id || null,
                reportedByName: reporterName
            }
        });

        await tx.auditLog.create({
            data: {
                userId: actor?.id || null,
                role: actor?.role || null,
                hospitalId,
                action: "FACILITY_TASK_CREATED",
                module: "FACILITY_MANAGEMENT",
                outcome: "SUCCESS",
                affectedRecord: task.id,
                description: `[${taskCode}] ${task.category} (${task.priority}): "${task.title}" at ${task.location}`
            }
        });

        return task;
    });

    return created;
}

async function updateFacilityTaskStatus(id, payload = {}, actor) {
    const existing = await prisma.facilityTask.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError("Facility task not found", 404, "FACILITY_TASK_NOT_FOUND");
    }

    const nextStatus = String(payload.status || "COMPLETED").toUpperCase();
    const updated = await prisma.facilityTask.update({
        where: { id },
        data: {
            status: nextStatus,
            ...(payload.assignedToName ? { assignedToName: String(payload.assignedToName).trim() } : {}),
            ...(payload.notes ? { notes: String(payload.notes).trim() } : {}),
            ...(nextStatus === "COMPLETED" || nextStatus === "VERIFIED" ? { completedAt: new Date() } : {})
        }
    });

    await prisma.auditLog.create({
        data: {
            userId: actor?.id || null,
            role: actor?.role || null,
            hospitalId: existing.hospitalId,
            action: "FACILITY_TASK_STATUS_UPDATED",
            module: "FACILITY_MANAGEMENT",
            outcome: "SUCCESS",
            affectedRecord: updated.id,
            description: `[${existing.taskCode}] Updated facility task status to ${nextStatus}`
        }
    });

    return updated;
}

module.exports = {
    getFacilityTelemetry,
    listFacilityTasks,
    createFacilityTask,
    updateFacilityTaskStatus
};
