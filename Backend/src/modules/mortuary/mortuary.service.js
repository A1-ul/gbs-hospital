"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MORTUARY & DECEASED PATIENT SERVICES - CORE SERVICE
Phase 14 Production Hardened - CommonJS Only
LOCATION: src/modules/mortuary/mortuary.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const AppError = require("../../core/errors/app.error");
const { 
    generateCorpseNumber, 
    generateDeathCertificateNumber, 
    generateAutopsyNumber, 
    generateReleaseNumber, 
    generateChamberCode 
} = require("./helpers/mortuary-id.generator");
const { 
    CASE_CATEGORIES, 
    STORAGE_TIERS, 
    validateReleaseEligibility 
} = require("./helpers/mortuary-catalogs");

class MortuaryService {
    // ==========================================
    // 1. VAULT CHAMBERS & COLD STORAGE
    // ==========================================

    async createChamber(chamberData) {
        const {
            vaultName,
            storageTier = "REFRIGERATED",
            targetTemperature,
            capacity = 1
        } = chamberData;

        if (!vaultName) {
            const err = new Error("Validation Error: vaultName is required.");
            err.statusCode = 400;
            throw err;
        }

        const tierConfig = STORAGE_TIERS[storageTier] || STORAGE_TIERS.REFRIGERATED;
        const chamberCode = await generateChamberCode();

        return prisma.mortuaryChamber.create({
            data: {
                chamberCode,
                vaultName,
                storageTier: tierConfig.code,
                targetTemperature: targetTemperature !== undefined ? parseFloat(targetTemperature) : tierConfig.targetTempC,
                currentTemperature: targetTemperature !== undefined ? parseFloat(targetTemperature) : tierConfig.targetTempC,
                capacity: parseInt(capacity, 10),
                occupiedCount: 0,
                isOperational: true
            }
        });
    }

    async getChambers() {
        return prisma.mortuaryChamber.findMany({
            include: {
                corpseRecords: {
                    select: {
                        corpseNumber: true,
                        deceasedName: true,
                        admittedAt: true,
                        status: true
                    }
                }
            },
            orderBy: { chamberCode: "asc" }
        });
    }

    async updateChamberTemperature(chamberId, tempCelsius) {
        const chamber = await prisma.mortuaryChamber.findUnique({ where: { id: chamberId } });
        if (!chamber) {
            const err = new Error(`Mortuary chamber with ID ${chamberId} not found.`);
            err.statusCode = 404;
            throw err;
        }

        return prisma.mortuaryChamber.update({
            where: { id: chamberId },
            data: {
                currentTemperature: parseFloat(tempCelsius)
            }
        });
    }

    // ==========================================
    // 2. CORPSE INTAKE & STORAGE INVENTORY
    // ==========================================

    async registerCorpseIntake(intakeData) {
        const {
            patientId,
            deceasedName,
            gender,
            age,
            dateOfBirth,
            dateOfDeath,
            timeOfDeath,
            placeOfDeath,
            caseCategory = "NON_CORONER_CLINICAL",
            certifyingPhysician,
            immediateCauseOfDeath,
            underlyingCauseOfDeath,
            intakeNurseOrOfficer,
            chamberId,
            propertyItems = []
        } = intakeData;

        if (!deceasedName || !gender || !placeOfDeath || !certifyingPhysician || !immediateCauseOfDeath) {
            const err = new Error("Validation Error: deceasedName, gender, placeOfDeath, certifyingPhysician, and immediateCauseOfDeath are required.");
            err.statusCode = 400;
            throw err;
        }

        let allocatedChamber = null;
        if (chamberId) {
            allocatedChamber = await prisma.mortuaryChamber.findUnique({ where: { id: chamberId } });
            if (!allocatedChamber) {
                const err = new Error(`Mortuary chamber with ID ${chamberId} not found.`);
                err.statusCode = 404;
                throw err;
            }
            if (allocatedChamber.occupiedCount >= allocatedChamber.capacity) {
                const err = new Error(`Chamber ${allocatedChamber.chamberCode} is at maximum capacity.`);
                err.statusCode = 400;
                throw err;
            }
        }

        const corpseNumber = await generateCorpseNumber();
        const deathCertificateNumber = intakeData.deathCertificateNumber || await generateDeathCertificateNumber();

        const isPoliceCoroner = caseCategory === "POLICE_CORONER" || caseCategory === "MEDICO_LEGAL";

        const corpse = await prisma.corpseRecord.create({
            data: {
                corpseNumber,
                patientId: patientId || null,
                deceasedName,
                gender: gender.toUpperCase(),
                age: age ? parseInt(age, 10) : null,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : new Date(),
                timeOfDeath: timeOfDeath || new Date().toLocaleTimeString(),
                placeOfDeath,
                caseCategory,
                deathCertificateNumber,
                certifyingPhysician,
                immediateCauseOfDeath,
                underlyingCauseOfDeath: underlyingCauseOfDeath || null,
                intakeNurseOrOfficer: intakeNurseOrOfficer || "Mortuary Receiving Officer",
                chamberId: chamberId || null,
                compartmentNumber: allocatedChamber ? `${allocatedChamber.chamberCode}-BAY-01` : null,
                status: "IN_STORAGE",
                isCoronerCleared: !isPoliceCoroner, // Police coroner cases default to hold
                propertyItems: Array.isArray(propertyItems) ? propertyItems : []
            },
            include: {
                chamber: true,
                patient: {
                    select: {
                        patientNumber: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        // Increment chamber occupancy
        if (chamberId) {
            await prisma.mortuaryChamber.update({
                where: { id: chamberId },
                data: { occupiedCount: { increment: 1 } }
            });
        }

        return corpse;
    }

    async getCorpseInventory(query = {}) {
        const where = {};
        if (query.status) where.status = query.status.toUpperCase();
        if (query.caseCategory) where.caseCategory = query.caseCategory.toUpperCase();
        if (query.search) {
            where.OR = [
                { deceasedName: { contains: query.search, mode: "insensitive" } },
                { corpseNumber: { contains: query.search, mode: "insensitive" } },
                { deathCertificateNumber: { contains: query.search, mode: "insensitive" } }
            ];
        }

        const records = await prisma.corpseRecord.findMany({
            where,
            include: {
                chamber: true,
                autopsyCases: true,
                releaseRecord: true
            },
            orderBy: { admittedAt: "desc" }
        });

        // Calculate days in storage and flag overstay (> 30 days)
        const now = new Date();
        return records.map(r => {
            const daysInStorage = Math.floor((now - new Date(r.admittedAt)) / (1000 * 60 * 60 * 24));
            return {
                ...r,
                daysInStorage,
                isOverstay: daysInStorage > 30 && r.status !== "RELEASED_TO_FAMILY"
            };
        });
    }

    async getCorpseById(id) {
        const corpse = await prisma.corpseRecord.findUnique({
            where: { id },
            include: {
                chamber: true,
                autopsyCases: true,
                releaseRecord: true,
                patient: true
            }
        });

        if (!corpse) {
            const err = new Error(`Corpse record with ID ${id} not found.`);
            err.statusCode = 404;
            throw err;
        }

        const daysInStorage = Math.floor((new Date() - new Date(corpse.admittedAt)) / (1000 * 60 * 60 * 24));
        return {
            ...corpse,
            daysInStorage,
            isOverstay: daysInStorage > 30 && corpse.status !== "RELEASED_TO_FAMILY"
        };
    }

    // ==========================================
    // 3. AUTOPSY / POST-MORTEM PROCEDURES
    // ==========================================

    async scheduleAutopsy(autopsyData) {
        const {
            corpseId,
            autopsyType = "CLINICAL_PATHOLOGY",
            leadPathologist,
            assistingTechnician,
            scheduledDate
        } = autopsyData;

        if (!corpseId || !leadPathologist) {
            const err = new Error("Validation Error: corpseId and leadPathologist are required.");
            err.statusCode = 400;
            throw err;
        }

        const corpse = await prisma.corpseRecord.findUnique({ where: { id: corpseId } });
        if (!corpse) {
            const err = new Error(`Corpse record with ID ${corpseId} not found.`);
            err.statusCode = 404;
            throw err;
        }

        const autopsyNumber = await generateAutopsyNumber();

        const [autopsyCase] = await Promise.all([
            prisma.autopsyCase.create({
                data: {
                    autopsyNumber,
                    corpseId,
                    autopsyType,
                    leadPathologist,
                    assistingTechnician: assistingTechnician || null,
                    scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
                    status: "SCHEDULED"
                }
            }),
            prisma.corpseRecord.update({
                where: { id: corpseId },
                data: { status: "AUTOPSY_IN_PROGRESS" }
            })
        ]);

        return autopsyCase;
    }

    async completeAutopsy(autopsyId, findingsData) {
        const autopsy = await prisma.autopsyCase.findUnique({ where: { id: autopsyId } });
        if (!autopsy) {
            const err = new Error(`Autopsy case with ID ${autopsyId} not found.`);
            err.statusCode = 404;
            throw err;
        }

        const {
            externalFindings,
            internalFindings,
            finalPostMortemDiagnosis,
            toxicologySamplesTaken = false,
            histopathologySamplesTaken = false,
            coronerApprovalIssued = false,
            coronerOfficerName
        } = findingsData;

        const [completedAutopsy] = await Promise.all([
            prisma.autopsyCase.update({
                where: { id: autopsyId },
                data: {
                    completedDate: new Date(),
                    status: "COMPLETED",
                    externalFindings: externalFindings || "External post-mortem inspection documented.",
                    internalFindings: internalFindings || "Internal organ inspection documented.",
                    finalPostMortemDiagnosis: finalPostMortemDiagnosis || "Cause of death corroborated by post-mortem dissection.",
                    toxicologySamplesTaken: Boolean(toxicologySamplesTaken),
                    histopathologySamplesTaken: Boolean(histopathologySamplesTaken),
                    coronerApprovalIssued: Boolean(coronerApprovalIssued),
                    coronerOfficerName: coronerOfficerName || null
                }
            }),
            prisma.corpseRecord.update({
                where: { id: autopsy.corpseId },
                data: {
                    status: "READY_FOR_RELEASE",
                    isCoronerCleared: coronerApprovalIssued ? true : undefined
                }
            })
        ]);

        return completedAutopsy;
    }

    // ==========================================
    // 4. DECEASED FAMILY RELEASE PROTOCOL
    // ==========================================

    async releaseCorpse(releaseData) {
        const {
            corpseId,
            nextOfKinName,
            nextOfKinPhone,
            nextOfKinNationalId,
            relationshipToDeceased,
            funeralHomeOrUndertaker,
            hearseVehiclePlate,
            releasingOfficer,
            burialPermitNumber,
            notes
        } = releaseData;

        if (!corpseId) {
            const err = new Error("Validation Error: corpseId is required.");
            err.statusCode = 400;
            throw err;
        }

        const corpse = await prisma.corpseRecord.findUnique({
            where: { id: corpseId },
            include: { chamber: true }
        });

        if (!corpse) {
            const err = new Error(`Corpse record with ID ${corpseId} not found.`);
            err.statusCode = 404;
            throw err;
        }

        // Validate legal release compliance
        const eligibility = validateReleaseEligibility(corpse, releaseData);
        if (!eligibility.isEligible) {
            const err = new Error(`Release Protocol Violation: ${eligibility.reasons.join("; ")}`);
            err.statusCode = 400;
            throw err;
        }

        const releaseNumber = await generateReleaseNumber();

        const [releaseRecord] = await Promise.all([
            prisma.corpseRelease.create({
                data: {
                    releaseNumber,
                    corpseId,
                    nextOfKinName,
                    nextOfKinPhone,
                    nextOfKinNationalId,
                    relationshipToDeceased,
                    funeralHomeOrUndertaker: funeralHomeOrUndertaker || "Private Family Transport",
                    hearseVehiclePlate: hearseVehiclePlate || null,
                    releasingOfficer: releasingOfficer || "Chief Mortuary Officer",
                    billingSettled: true,
                    burialPermitNumber: burialPermitNumber || null,
                    releasedAt: new Date(),
                    handoverSignatureConfirmed: true,
                    notes: notes || "Deceased released to Next-of-Kin with verified personal effects bag."
                }
            }),
            prisma.corpseRecord.update({
                where: { id: corpseId },
                data: {
                    status: "RELEASED_TO_FAMILY",
                    chamberId: null,
                    compartmentNumber: null
                }
            })
        ]);

        // Free up chamber capacity if occupied
        if (corpse.chamberId) {
            await prisma.mortuaryChamber.update({
                where: { id: corpse.chamberId },
                data: {
                    occupiedCount: {
                        decrement: 1
                    }
                }
            });
        }

        return releaseRecord;
    }

    // ==========================================
    // 5. MORTUARY COMMAND CENTER TELEMETRY
    // ==========================================

    async getMortuaryTelemetry() {
        const [
            totalBodiesStored,
            inStorage,
            autopsyScheduled,
            readyForRelease,
            releasedTotal,
            totalChambers,
            chambers
        ] = await Promise.all([
            prisma.corpseRecord.count(),
            prisma.corpseRecord.count({ where: { status: "IN_STORAGE" } }),
            prisma.corpseRecord.count({ where: { status: "AUTOPSY_IN_PROGRESS" } }),
            prisma.corpseRecord.count({ where: { status: "READY_FOR_RELEASE" } }),
            prisma.corpseRecord.count({ where: { status: "RELEASED_TO_FAMILY" } }),
            prisma.mortuaryChamber.count(),
            prisma.mortuaryChamber.findMany()
        ]);

        const totalCapacity = chambers.reduce((sum, c) => sum + c.capacity, 0);
        const totalOccupied = chambers.reduce((sum, c) => sum + c.occupiedCount, 0);
        const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

        // Count coroner cases on hold
        const coronerCasesOnHold = await prisma.corpseRecord.count({
            where: {
                caseCategory: "POLICE_CORONER",
                isCoronerCleared: false,
                status: { not: "RELEASED_TO_FAMILY" }
            }
        });

        // Count overstay bodies (> 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const overstayCount = await prisma.corpseRecord.count({
            where: {
                admittedAt: { lte: thirtyDaysAgo },
                status: { not: "RELEASED_TO_FAMILY" }
            }
        });

        return {
            summary: {
                totalBodiesAdmitted: totalBodiesStored,
                currentInStorage: inStorage,
                autopsyInProgress: autopsyScheduled,
                readyForRelease,
                totalReleased: releasedTotal,
                coronerCasesOnHold,
                overstayBodiesCount: overstayCount
            },
            chamberOccupancy: {
                totalChambers,
                totalCapacity,
                totalOccupied,
                occupancyPercentage: occupancyRate,
                isFull: totalOccupied >= totalCapacity && totalCapacity > 0
            },
            chambersTelemetry: chambers.map(c => ({
                chamberCode: c.chamberCode,
                vaultName: c.vaultName,
                storageTier: c.storageTier,
                currentTemperature: c.currentTemperature,
                isNominal: c.storageTier === "REFRIGERATED" 
                    ? (c.currentTemperature >= 1.0 && c.currentTemperature <= 5.0)
                    : (c.currentTemperature <= -10.0),
                occupied: c.occupiedCount,
                capacity: c.capacity
            }))
        };
    }
}

module.exports = new MortuaryService();
