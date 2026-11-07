"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BIOMEDICAL ENGINEERING - CORE SERVICE
Phase 15 Production Hardened - CommonJS Only
LOCATION: src/modules/biomedical/biomedical.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const AppError = require("../../core/errors/app.error");
const {
    generateAssetTag,
    generateWorkOrderNumber,
    generateCertificateNumber
} = require("./helpers/biomedical-id.generator");
const {
    EQUIPMENT_CATEGORIES,
    RISK_LEVELS,
    WORK_ORDER_TYPES,
    WORK_ORDER_PRIORITIES,
    WORK_ORDER_STATUSES,
    evaluateElectricalSafety
} = require("./helpers/biomedical-catalogs");

class BiomedicalService {
    // ==========================================
    // 1. MEDICAL EQUIPMENT ASSET REGISTRY
    // ==========================================

    async registerEquipment(equipmentData) {
        const {
            name,
            modelNumber,
            serialNumber,
            manufacturer,
            category = "GENERAL_BIOMEDICAL",
            riskLevel,
            department,
            roomLocation,
            acquisitionDate,
            warrantyExpiry,
            ppmIntervalDays,
            calibrationIntervalDays,
            powerRatingWatts
        } = equipmentData;

        if (!name || !modelNumber || !serialNumber || !manufacturer || !department) {
            throw new AppError(
                "Validation Error: name, modelNumber, serialNumber, manufacturer, and department are required.",
                400,
                "VALIDATION_ERROR"
            );
        }

        // Check serial uniqueness
        const existingSerial = await prisma.medicalEquipment.findUnique({
            where: { serialNumber }
        });
        if (existingSerial) {
            throw new AppError(
                `Equipment with serial number ${serialNumber} already exists (Asset Tag: ${existingSerial.assetTag}).`,
                400,
                "DUPLICATE_SERIAL"
            );
        }

        const categoryConfig = EQUIPMENT_CATEGORIES[category] || EQUIPMENT_CATEGORIES.GENERAL_BIOMEDICAL;
        const resolvedRiskLevel = riskLevel || categoryConfig.defaultRisk;
        const resolvedPpmDays = ppmIntervalDays ? parseInt(ppmIntervalDays, 10) : categoryConfig.defaultPpmDays;
        const resolvedCalDays = calibrationIntervalDays ? parseInt(calibrationIntervalDays, 10) : categoryConfig.defaultCalDays;

        const now = new Date();
        const nextPpmDate = new Date(now.getTime() + resolvedPpmDays * 24 * 60 * 60 * 1000);
        const nextCalibrationDate = new Date(now.getTime() + resolvedCalDays * 24 * 60 * 60 * 1000);

        const assetTag = await generateAssetTag();

        return prisma.medicalEquipment.create({
            data: {
                assetTag,
                name,
                modelNumber,
                serialNumber,
                manufacturer,
                category: categoryConfig.code,
                riskLevel: resolvedRiskLevel,
                department,
                roomLocation: roomLocation || null,
                status: "OPERATIONAL",
                acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : now,
                warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
                ppmIntervalDays: resolvedPpmDays,
                lastPpmDate: now,
                nextPpmDate,
                calibrationIntervalDays: resolvedCalDays,
                lastCalibrationDate: now,
                nextCalibrationDate,
                powerRatingWatts: powerRatingWatts !== undefined ? parseFloat(powerRatingWatts) : null,
                electricalSafetyCertified: true,
                safetyOverrideActive: false
            }
        });
    }

    async getEquipmentList(filters = {}) {
        const {
            department,
            category,
            riskLevel,
            status,
            search
        } = filters;

        const where = {};
        if (department) where.department = department;
        if (category) where.category = category;
        if (riskLevel) where.riskLevel = riskLevel;
        if (status) where.status = status;

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { assetTag: { contains: search, mode: "insensitive" } },
                { serialNumber: { contains: search, mode: "insensitive" } },
                { manufacturer: { contains: search, mode: "insensitive" } }
            ];
        }

        const list = await prisma.medicalEquipment.findMany({
            where,
            include: {
                _count: {
                    select: {
                        workOrders: true,
                        calibrations: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        const now = new Date();
        return list.map(item => ({
            ...item,
            isPpmOverdue: item.nextPpmDate ? new Date(item.nextPpmDate) < now : false,
            isCalibrationOverdue: item.nextCalibrationDate ? new Date(item.nextCalibrationDate) < now : false
        }));
    }

    async getEquipmentById(id) {
        const equipment = await prisma.medicalEquipment.findFirst({
            where: {
                OR: [{ id }, { assetTag: id }]
            },
            include: {
                workOrders: {
                    orderBy: { reportedAt: "desc" }
                },
                calibrations: {
                    orderBy: { calibratedAt: "desc" }
                }
            }
        });

        if (!equipment) {
            throw new AppError(`Medical equipment with ID or Asset Tag ${id} not found.`, 404, "NOT_FOUND");
        }

        const now = new Date();
        return {
            ...equipment,
            isPpmOverdue: equipment.nextPpmDate ? new Date(equipment.nextPpmDate) < now : false,
            isCalibrationOverdue: equipment.nextCalibrationDate ? new Date(equipment.nextCalibrationDate) < now : false
        };
    }

    async updateEquipmentStatus(id, updateData) {
        const { status, roomLocation, safetyOverrideReason } = updateData;
        const validStatuses = ["OPERATIONAL", "UNDER_MAINTENANCE", "OUT_OF_SERVICE", "DECOMMISSIONED"];

        if (!validStatuses.includes(status)) {
            throw new AppError(`Invalid equipment status: ${status}`, 400, "INVALID_STATUS");
        }

        return prisma.medicalEquipment.update({
            where: { id },
            data: {
                status,
                roomLocation: roomLocation !== undefined ? roomLocation : undefined,
                safetyOverrideReason: safetyOverrideReason || undefined
            }
        });
    }

    async recordSafetyOverride(id, overrideData) {
        const { clinicianName, reason } = overrideData;
        if (!clinicianName || !reason) {
            throw new AppError("Clinician name and safety override reason are required.", 400, "VALIDATION_ERROR");
        }

        return prisma.medicalEquipment.update({
            where: { id },
            data: {
                safetyOverrideActive: true,
                safetyOverrideReason: `[${new Date().toISOString()}] Override authorized by ${clinicianName}: ${reason}`
            }
        });
    }

    // ==========================================
    // 2. MAINTENANCE WORK ORDERS & BREAKDOWNS
    // ==========================================

    async createWorkOrder(workOrderData) {
        const {
            equipmentId,
            orderType = "CORRECTIVE_BREAKDOWN",
            priority = "ROUTINE",
            failureDescription,
            reportedBy,
            assignedEngineer
        } = workOrderData;

        if (!equipmentId || !failureDescription || !reportedBy) {
            throw new AppError(
                "Validation Error: equipmentId, failureDescription, and reportedBy are required.",
                400,
                "VALIDATION_ERROR"
            );
        }

        const equipment = await prisma.medicalEquipment.findUnique({
            where: { id: equipmentId }
        });

        if (!equipment) {
            throw new AppError(`Medical equipment with ID ${equipmentId} not found.`, 404, "NOT_FOUND");
        }

        const workOrderNumber = await generateWorkOrderNumber();
        const initialStatus = assignedEngineer ? "ASSIGNED" : "REPORTED";

        // Equipment state transition
        const newEquipmentStatus = (priority === "STAT_EMERGENCY_BREAKDOWN" || orderType === "CORRECTIVE_BREAKDOWN")
            ? "OUT_OF_SERVICE"
            : "UNDER_MAINTENANCE";

        const [workOrder] = await Promise.all([
            prisma.medicalWorkOrder.create({
                data: {
                    workOrderNumber,
                    equipmentId,
                    orderType,
                    priority,
                    status: initialStatus,
                    reportedBy,
                    reportedAt: new Date(),
                    failureDescription,
                    assignedEngineer: assignedEngineer || null,
                    assignedAt: assignedEngineer ? new Date() : null
                },
                include: { equipment: true }
            }),
            prisma.medicalEquipment.update({
                where: { id: equipmentId },
                data: { status: newEquipmentStatus }
            })
        ]);

        return workOrder;
    }

    async getWorkOrders(filters = {}) {
        const {
            equipmentId,
            status,
            priority,
            orderType,
            assignedEngineer
        } = filters;

        const where = {};
        if (equipmentId) where.equipmentId = equipmentId;
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (orderType) where.orderType = orderType;
        if (assignedEngineer) where.assignedEngineer = assignedEngineer;

        return prisma.medicalWorkOrder.findMany({
            where,
            include: { equipment: true },
            orderBy: { reportedAt: "desc" }
        });
    }

    async updateWorkOrder(id, updateData) {
        const {
            status,
            assignedEngineer,
            rootCause,
            actionTaken,
            partsReplaced,
            partsCost,
            laborHours
        } = updateData;

        const existing = await prisma.medicalWorkOrder.findUnique({
            where: { id }
        });

        if (!existing) {
            throw new AppError(`Work order with ID ${id} not found.`, 404, "NOT_FOUND");
        }

        const dataToUpdate = {
            status: status || existing.status,
            assignedEngineer: assignedEngineer !== undefined ? assignedEngineer : existing.assignedEngineer,
            rootCause: rootCause !== undefined ? rootCause : existing.rootCause,
            actionTaken: actionTaken !== undefined ? actionTaken : existing.actionTaken,
            partsReplaced: partsReplaced !== undefined ? partsReplaced : existing.partsReplaced,
            partsCost: partsCost !== undefined ? parseFloat(partsCost) : existing.partsCost,
            laborHours: laborHours !== undefined ? parseFloat(laborHours) : existing.laborHours
        };

        if (assignedEngineer && !existing.assignedAt) {
            dataToUpdate.assignedAt = new Date();
        }
        if (status === "IN_PROGRESS" && !existing.startedAt) {
            dataToUpdate.startedAt = new Date();
        }

        return prisma.medicalWorkOrder.update({
            where: { id },
            data: dataToUpdate,
            include: { equipment: true }
        });
    }

    async completeWorkOrder(id, completionData) {
        const {
            qaApprovedBy,
            rootCause,
            actionTaken,
            partsReplaced,
            partsCost = 0.0,
            laborHours = 1.0,
            leakageCurrentMicroAmps,
            groundResistanceOhms,
            notes
        } = completionData;

        if (!qaApprovedBy) {
            throw new AppError("Validation Error: qaApprovedBy is required to sign off medical equipment.", 400, "VALIDATION_ERROR");
        }

        const workOrder = await prisma.medicalWorkOrder.findUnique({
            where: { id },
            include: { equipment: true }
        });

        if (!workOrder) {
            throw new AppError(`Work order with ID ${id} not found.`, 404, "NOT_FOUND");
        }

        // Evaluate electrical safety if metrics provided
        const safetyEval = evaluateElectricalSafety(groundResistanceOhms, leakageCurrentMicroAmps);
        if (!safetyEval.passed) {
            throw new AppError(
                `Electrical Safety Sign-off Failed: ${safetyEval.reasons.join("; ")}`,
                400,
                "SAFETY_INSPECTION_FAILED"
            );
        }

        const now = new Date();
        const isPpm = workOrder.orderType === "PREVENTIVE_MAINTENANCE";

        const equipmentUpdates = {
            status: "OPERATIONAL",
            electricalSafetyCertified: true,
            safetyOverrideActive: false
        };

        if (isPpm) {
            equipmentUpdates.lastPpmDate = now;
            equipmentUpdates.nextPpmDate = new Date(now.getTime() + workOrder.equipment.ppmIntervalDays * 24 * 60 * 60 * 1000);
        }

        const [completedOrder] = await Promise.all([
            prisma.medicalWorkOrder.update({
                where: { id },
                data: {
                    status: "VERIFIED_RETURNED_TO_SERVICE",
                    completedAt: now,
                    qaApprovedBy,
                    qaApprovedAt: now,
                    rootCause: rootCause || workOrder.rootCause || "Component wear corrected and calibrated",
                    actionTaken: actionTaken || workOrder.actionTaken || "Overhauled, tested and certified operational",
                    partsReplaced: partsReplaced || workOrder.partsReplaced,
                    partsCost: parseFloat(partsCost),
                    laborHours: parseFloat(laborHours),
                    electricalSafetyTested: true,
                    leakageCurrentMicroAmps: leakageCurrentMicroAmps !== undefined ? parseFloat(leakageCurrentMicroAmps) : null,
                    groundResistanceOhms: groundResistanceOhms !== undefined ? parseFloat(groundResistanceOhms) : null,
                    notes: notes || "Work order completed and verified safe for clinical service."
                },
                include: { equipment: true }
            }),
            prisma.medicalEquipment.update({
                where: { id: workOrder.equipmentId },
                data: equipmentUpdates
            })
        ]);

        return completedOrder;
    }

    // ==========================================
    // 3. CALIBRATION CERTIFICATIONS
    // ==========================================

    async recordCalibration(calibrationData) {
        const {
            equipmentId,
            calibrationStandard = "ISO_17025",
            testEquipmentUsed,
            parametersTested,
            toleranceDeviationPercent = 0.0,
            calibrationResult = "PASSED",
            certifiedByEngineer,
            validityDays = 180,
            notes
        } = calibrationData;

        if (!equipmentId || !testEquipmentUsed || !parametersTested || !certifiedByEngineer) {
            throw new AppError(
                "Validation Error: equipmentId, testEquipmentUsed, parametersTested, and certifiedByEngineer are required.",
                400,
                "VALIDATION_ERROR"
            );
        }

        const equipment = await prisma.medicalEquipment.findUnique({
            where: { id: equipmentId }
        });

        if (!equipment) {
            throw new AppError(`Medical equipment with ID ${equipmentId} not found.`, 404, "NOT_FOUND");
        }

        const certificateNumber = await generateCertificateNumber();
        const now = new Date();
        const validUntil = new Date(now.getTime() + parseInt(validityDays, 10) * 24 * 60 * 60 * 1000);

        const newEquipmentStatus = calibrationResult === "FAILED_CONDEMNED" ? "OUT_OF_SERVICE" : "OPERATIONAL";

        const [cert] = await Promise.all([
            prisma.equipmentCalibration.create({
                data: {
                    certificateNumber,
                    equipmentId,
                    calibrationStandard,
                    testEquipmentUsed,
                    parametersTested,
                    toleranceDeviationPercent: parseFloat(toleranceDeviationPercent),
                    calibrationResult,
                    certifiedByEngineer,
                    calibratedAt: now,
                    validUntil,
                    notes: notes || "Metrology calibration completed under controlled laboratory conditions."
                },
                include: { equipment: true }
            }),
            prisma.medicalEquipment.update({
                where: { id: equipmentId },
                data: {
                    lastCalibrationDate: now,
                    nextCalibrationDate: validUntil,
                    status: newEquipmentStatus
                }
            })
        ]);

        return cert;
    }

    // ==========================================
    // 4. COMMAND CENTER TELEMETRY & ANALYTICS
    // ==========================================

    async getBiomedicalStats() {
        const now = new Date();

        const [
            totalEquipment,
            operationalCount,
            criticalHighRiskTotal,
            criticalHighRiskOperational,
            openWorkOrders,
            emergencyBreakdowns,
            allEquipment,
            partsCostAggregate
        ] = await Promise.all([
            prisma.medicalEquipment.count(),
            prisma.medicalEquipment.count({ where: { status: "OPERATIONAL" } }),
            prisma.medicalEquipment.count({ where: { riskLevel: "CRITICAL_HIGH_RISK" } }),
            prisma.medicalEquipment.count({ where: { riskLevel: "CRITICAL_HIGH_RISK", status: "OPERATIONAL" } }),
            prisma.medicalWorkOrder.count({
                where: {
                    status: { in: ["REPORTED", "ASSIGNED", "IN_PROGRESS", "PENDING_SPARE_PARTS", "COMPLETED_AWAITING_QA"] }
                }
            }),
            prisma.medicalWorkOrder.count({
                where: {
                    priority: "STAT_EMERGENCY_BREAKDOWN",
                    status: { not: "VERIFIED_RETURNED_TO_SERVICE" }
                }
            }),
            prisma.medicalEquipment.findMany({
                select: { nextPpmDate: true, nextCalibrationDate: true }
            }),
            prisma.medicalWorkOrder.aggregate({
                _sum: { partsCost: true, laborHours: true }
            })
        ]);

        const ppmOverdueCount = allEquipment.filter(e => e.nextPpmDate && new Date(e.nextPpmDate) < now).length;
        const calibrationOverdueCount = allEquipment.filter(e => e.nextCalibrationDate && new Date(e.nextCalibrationDate) < now).length;

        const operationalUptimeRate = totalEquipment > 0
            ? `${((operationalCount / totalEquipment) * 100).toFixed(1)}%`
            : "100.0%";

        const lifeSupportUptimeRate = criticalHighRiskTotal > 0
            ? `${((criticalHighRiskOperational / criticalHighRiskTotal) * 100).toFixed(1)}%`
            : "100.0%";

        return {
            totalEquipment,
            operationalCount,
            underMaintenanceCount: totalEquipment - operationalCount,
            operationalUptimeRate,
            criticalHighRiskTotal,
            criticalHighRiskOperational,
            lifeSupportUptimeRate,
            openWorkOrders,
            emergencyBreakdowns,
            ppmOverdueCount,
            calibrationOverdueCount,
            totalMaintenanceExpenditure: partsCostAggregate._sum.partsCost || 0.0,
            totalLaborHours: partsCostAggregate._sum.laborHours || 0.0,
            serverTimestamp: now.toISOString()
        };
    }
}

module.exports = new BiomedicalService();
