"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
BLOOD BANK & TRANSFUSION SERVICES - CORE BUSINESS SERVICE
Phase 13 Production Hardened - CommonJS Only
LOCATION: src/modules/blood-bank/blood-bank.service.js
====================================================
*/

const prisma = require("../../core/database/prisma.client");
const { 
    generateDonorNumber, 
    generateUnitBarcode, 
    generateTransfusionRequestNumber, 
    generateCrossMatchNumber, 
    generateTransfusionNumber 
} = require("./helpers/blood-bank-id.generator");
const { 
    BLOOD_GROUPS, 
    BLOOD_COMPONENTS, 
    isBloodCompatible, 
    evaluateDonorEligibility 
} = require("./helpers/blood-bank-catalogs");

class BloodBankService {
    // ==========================================
    // 1. DONOR REGISTRATION & SCREENING
    // ==========================================

    async registerDonor(donorData) {
        const {
            fullName,
            gender,
            dateOfBirth,
            age,
            phone,
            email,
            nationalId,
            bloodGroup,
            rhFactor,
            weightKg,
            hemoglobinLevel,
            donorType = "VOLUNTARY",
            systolicBp,
            diastolicBp,
            pulse,
            hasRecentIllness,
            hasTravelRisk
        } = donorData;

        if (!fullName || !gender || !phone || !bloodGroup) {
            const err = new Error("Validation Error: fullName, gender, phone, and bloodGroup are required.");
            err.statusCode = 400;
            throw err;
        }

        const validGroup = bloodGroup.toUpperCase().replace(/\+/g, "_POSITIVE").replace(/-/g, "_NEGATIVE");
        if (!BLOOD_GROUPS.includes(validGroup)) {
            const err = new Error(`Invalid blood group: ${bloodGroup}. Must be one of: ${BLOOD_GROUPS.join(", ")}`);
            err.statusCode = 400;
            throw err;
        }

        // Evaluate eligibility based on AABB / WHO criteria
        const eligibility = evaluateDonorEligibility({
            age: age || (dateOfBirth ? Math.floor((new Date() - new Date(dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : 25),
            weightKg,
            hemoglobinLevel,
            systolicBp,
            diastolicBp,
            pulse,
            hasRecentIllness,
            hasTravelRisk
        });

        const donorNumber = await generateDonorNumber();

        const donor = await prisma.bloodDonor.create({
            data: {
                donorNumber,
                fullName,
                gender: gender.toUpperCase(),
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                age: age || null,
                phone,
                email: email || null,
                nationalId: nationalId || null,
                bloodGroup: validGroup,
                rhFactor: rhFactor ? rhFactor.toUpperCase() : (validGroup.includes("POSITIVE") ? "POSITIVE" : "NEGATIVE"),
                weightKg: weightKg ? parseFloat(weightKg) : null,
                hemoglobinLevel: hemoglobinLevel ? parseFloat(hemoglobinLevel) : null,
                donorType,
                eligibilityStatus: eligibility.status,
                deferralReason: eligibility.reasons.length > 0 ? eligibility.reasons.join("; ") : null,
                totalDonations: 0
            }
        });

        return {
            ...donor,
            eligibilityEvaluation: eligibility
        };
    }

    async getDonors(query = {}) {
        const where = {};
        if (query.bloodGroup) {
            where.bloodGroup = query.bloodGroup.toUpperCase().replace(/\+/g, "_POSITIVE").replace(/-/g, "_NEGATIVE");
        }
        if (query.eligibilityStatus) {
            where.eligibilityStatus = query.eligibilityStatus.toUpperCase();
        }
        if (query.search) {
            where.OR = [
                { fullName: { contains: query.search, mode: "insensitive" } },
                { phone: { contains: query.search } },
                { donorNumber: { contains: query.search, mode: "insensitive" } }
            ];
        }

        return prisma.bloodDonor.findMany({
            where,
            include: {
                bloodUnits: {
                    select: {
                        unitBarcode: true,
                        componentType: true,
                        status: true,
                        collectionDate: true
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: query.limit ? parseInt(query.limit, 10) : 50
        });
    }

    async getDonorById(id) {
        const donor = await prisma.bloodDonor.findUnique({
            where: { id },
            include: {
                bloodUnits: {
                    orderBy: { collectionDate: "desc" }
                }
            }
        });

        if (!donor) {
            const err = new Error(`Blood Donor with ID ${id} not found.`);
            err.statusCode = 404;
            throw err;
        }

        return donor;
    }

    // ==========================================
    // 2. BLOOD BAG COLLECTION & COLD-CHAIN STORAGE
    // ==========================================

    async collectBloodUnit(unitData) {
        const {
            donorId,
            bloodGroup,
            componentType = "PACKED_RED_CELLS",
            volumeMl,
            storageLocation,
            storageTemperature
        } = unitData;

        let resolvedGroup = bloodGroup;
        let donor = null;

        if (donorId) {
            donor = await prisma.bloodDonor.findUnique({ where: { id: donorId } });
            if (!donor) {
                const err = new Error(`Donor with ID ${donorId} not found.`);
                err.statusCode = 404;
                throw err;
            }
            if (donor.eligibilityStatus !== "ELIGIBLE") {
                const err = new Error(`Cannot collect blood from donor ${donor.donorNumber}: Status is ${donor.eligibilityStatus} (${donor.deferralReason || "Clinical deferral"}).`);
                err.statusCode = 400;
                throw err;
            }
            resolvedGroup = donor.bloodGroup;
        }

        if (!resolvedGroup) {
            const err = new Error("Validation Error: bloodGroup is required.");
            err.statusCode = 400;
            throw err;
        }

        const validGroup = resolvedGroup.toUpperCase().replace(/\+/g, "_POSITIVE").replace(/-/g, "_NEGATIVE");
        const compConfig = BLOOD_COMPONENTS[componentType] || BLOOD_COMPONENTS.PACKED_RED_CELLS;

        const collectionDate = new Date();
        const expiryDate = new Date(collectionDate.getTime() + compConfig.shelfLifeDays * 24 * 60 * 60 * 1000);

        const unitBarcode = await generateUnitBarcode();

        const unit = await prisma.bloodUnit.create({
            data: {
                unitBarcode,
                donorId: donorId || null,
                bloodGroup: validGroup,
                componentType: compConfig.code,
                volumeMl: volumeMl ? parseInt(volumeMl, 10) : compConfig.defaultVolumeMl,
                collectionDate,
                expiryDate,
                storageLocation: storageLocation || compConfig.defaultStorageLocation,
                storageTemperature: storageTemperature !== undefined ? parseFloat(storageTemperature) : compConfig.targetTempC,
                status: "QUARANTINE", // Mandatory quarantine until infection screening clears
                hivScreening: "PENDING",
                hepatitisBScreening: "PENDING",
                hepatitisCScreening: "PENDING",
                syphilisScreening: "PENDING"
            }
        });

        // Update donor stats if linked
        if (donorId) {
            await prisma.bloodDonor.update({
                where: { id: donorId },
                data: {
                    lastDonationDate: collectionDate,
                    totalDonations: { increment: 1 }
                }
            });
        }

        return unit;
    }

    async recordScreeningResults(unitId, screeningData) {
        const unit = await prisma.bloodUnit.findUnique({ where: { id: unitId } });
        if (!unit) {
            const err = new Error(`Blood unit with ID ${unitId} not found.`);
            err.statusCode = 404;
            throw err;
        }

        const {
            hivScreening = "NEGATIVE",
            hepatitisBScreening = "NEGATIVE",
            hepatitisCScreening = "NEGATIVE",
            syphilisScreening = "NEGATIVE",
            screeningNotes
        } = screeningData;

        const isAnyReactive = 
            hivScreening === "POSITIVE" || 
            hepatitisBScreening === "POSITIVE" || 
            hepatitisCScreening === "POSITIVE" || 
            syphilisScreening === "POSITIVE";

        const newStatus = isAnyReactive ? "DISCARDED_REACTIVE" : "TESTED_SAFE";

        const updatedUnit = await prisma.bloodUnit.update({
            where: { id: unitId },
            data: {
                hivScreening,
                hepatitisBScreening,
                hepatitisCScreening,
                syphilisScreening,
                screeningNotes: screeningNotes || (isAnyReactive ? "Unit quarantined & flagged reactive for pathogen" : "All TTI serology non-reactive. Cleared for patient use."),
                status: newStatus
            }
        });

        // If reactive and donor is linked, permanently defer donor for patient safety
        if (isAnyReactive && unit.donorId) {
            await prisma.bloodDonor.update({
                where: { id: unit.donorId },
                data: {
                    eligibilityStatus: "PERMANENTLY_DEFERRED",
                    deferralReason: `Reactive TTI screening on unit ${unit.unitBarcode} (HIV: ${hivScreening}, HepB: ${hepatitisBScreening}, HepC: ${hepatitisCScreening}, Syphilis: ${syphilisScreening})`
                }
            });
        }

        return updatedUnit;
    }

    async getInventory(query = {}) {
        const where = {};
        if (query.bloodGroup) {
            where.bloodGroup = query.bloodGroup.toUpperCase().replace(/\+/g, "_POSITIVE").replace(/-/g, "_NEGATIVE");
        }
        if (query.componentType) {
            where.componentType = query.componentType.toUpperCase();
        }
        if (query.status) {
            where.status = query.status.toUpperCase();
        }
        if (query.search) {
            where.OR = [
                { unitBarcode: { contains: query.search, mode: "insensitive" } },
                { storageLocation: { contains: query.search, mode: "insensitive" } }
            ];
        }

        return prisma.bloodUnit.findMany({
            where,
            include: {
                donor: {
                    select: {
                        donorNumber: true,
                        fullName: true,
                        bloodGroup: true
                    }
                }
            },
            orderBy: { expiryDate: "asc" }
        });
    }

    async updateStorageTemperature(unitId, tempCelsius) {
        const unit = await prisma.bloodUnit.findUnique({ where: { id: unitId } });
        if (!unit) {
            const err = new Error(`Blood unit with ID ${unitId} not found.`);
            err.statusCode = 404;
            throw err;
        }

        const compConfig = BLOOD_COMPONENTS[unit.componentType] || BLOOD_COMPONENTS.PACKED_RED_CELLS;
        const isOutOfSpec = tempCelsius < compConfig.minTempC || tempCelsius > compConfig.maxTempC;

        return prisma.bloodUnit.update({
            where: { id: unitId },
            data: {
                storageTemperature: parseFloat(tempCelsius)
            }
        });
    }

    // ==========================================
    // 3. TRANSFUSION REQUESTS & CROSS-MATCHING
    // ==========================================

    async createTransfusionRequest(requestData) {
        const {
            patientId,
            patientBloodGroup,
            requiredComponent = "PACKED_RED_CELLS",
            unitsRequested = 1,
            urgencyLevel = "ROUTINE",
            clinicalIndication,
            requestingDoctor,
            departmentWard,
            clinicalNotes
        } = requestData;

        if (!patientId || !patientBloodGroup || !clinicalIndication || !requestingDoctor) {
            const err = new Error("Validation Error: patientId, patientBloodGroup, clinicalIndication, and requestingDoctor are required.");
            err.statusCode = 400;
            throw err;
        }

        // Verify patient exists
        const patient = await prisma.patient.findUnique({ where: { id: patientId } });
        if (!patient) {
            const err = new Error(`Patient with ID ${patientId} not found.`);
            err.statusCode = 404;
            throw err;
        }

        const validGroup = patientBloodGroup.toUpperCase().replace(/\+/g, "_POSITIVE").replace(/-/g, "_NEGATIVE");
        const requestNumber = await generateTransfusionRequestNumber();

        const isEmergency = urgencyLevel === "EMERGENCY_STAT_UNMATCHED";

        const transfusionRequest = await prisma.bloodTransfusionRequest.create({
            data: {
                requestNumber,
                patientId,
                patientBloodGroup: validGroup,
                requiredComponent,
                unitsRequested: parseInt(unitsRequested, 10),
                urgencyLevel,
                clinicalIndication,
                requestingDoctor,
                departmentWard: departmentWard || "General Ward",
                status: isEmergency ? "COMPATIBLE_READY" : "REQUESTED",
                emergencyOverrideLogged: isEmergency, // Patient safety guardrail: emergency release logging
                clinicalNotes: clinicalNotes || (isEmergency ? "CRITICAL STAT: Emergency uncrossmatched O- release authorized by physician." : null)
            },
            include: {
                patient: {
                    select: {
                        patientNumber: true,
                        firstName: true,
                        lastName: true,
                        bloodGroup: true
                    }
                }
            }
        });

        return transfusionRequest;
    }

    async performCrossMatch(crossMatchData) {
        const {
            requestId,
            bloodUnitId,
            testedByLabTechnician,
            notes
        } = crossMatchData;

        if (!requestId || !bloodUnitId || !testedByLabTechnician) {
            const err = new Error("Validation Error: requestId, bloodUnitId, and testedByLabTechnician are required.");
            err.statusCode = 400;
            throw err;
        }

        const [request, unit] = await Promise.all([
            prisma.bloodTransfusionRequest.findUnique({ where: { id: requestId } }),
            prisma.bloodUnit.findUnique({ where: { id: bloodUnitId } })
        ]);

        if (!request) {
            const err = new Error(`Transfusion request with ID ${requestId} not found.`);
            err.statusCode = 404;
            throw err;
        }

        if (!unit) {
            const err = new Error(`Blood unit with ID ${bloodUnitId} not found.`);
            err.statusCode = 404;
            throw err;
        }

        if (unit.status !== "TESTED_SAFE") {
            const err = new Error(`Blood unit ${unit.unitBarcode} is not available for cross-matching (Current status: ${unit.status}). Must be TESTED_SAFE.`);
            err.statusCode = 400;
            throw err;
        }

        // Perform clinical compatibility evaluation
        const isCompatible = isBloodCompatible(request.patientBloodGroup, unit.bloodGroup, unit.componentType);

        const crossMatchNumber = await generateCrossMatchNumber();

        const crossMatch = await prisma.bloodCrossMatch.create({
            data: {
                crossMatchNumber,
                requestId,
                bloodUnitId,
                majorCrossmatchResult: isCompatible ? "COMPATIBLE" : "INCOMPATIBLE",
                minorCrossmatchResult: isCompatible ? "COMPATIBLE" : "INCOMPATIBLE",
                antibodyScreeningResult: "NEGATIVE",
                compatibilityStatus: isCompatible ? "COMPATIBLE" : "INCOMPATIBLE",
                testedByLabTechnician,
                notes: notes || (isCompatible ? "Clear serological compatibility verified. No agglutination detected." : "Agglutination observed. Incompatible unit.")
            }
        });

        // If compatible, reserve blood unit and advance request status
        if (isCompatible) {
            await Promise.all([
                prisma.bloodUnit.update({
                    where: { id: bloodUnitId },
                    data: { status: "RESERVED" }
                }),
                prisma.bloodTransfusionRequest.update({
                    where: { id: requestId },
                    data: { status: "COMPATIBLE_READY" }
                })
            ]);
        }

        return {
            ...crossMatch,
            isCompatible
        };
    }

    async getTransfusionRequests(query = {}) {
        const where = {};
        if (query.status) where.status = query.status.toUpperCase();
        if (query.urgencyLevel) where.urgencyLevel = query.urgencyLevel.toUpperCase();

        return prisma.bloodTransfusionRequest.findMany({
            where,
            include: {
                patient: {
                    select: {
                        patientNumber: true,
                        firstName: true,
                        lastName: true,
                        bloodGroup: true
                    }
                },
                crossMatches: {
                    include: {
                        bloodUnit: true
                    }
                },
                transfusions: true
            },
            orderBy: { createdAt: "desc" }
        });
    }

    // ==========================================
    // 4. BEDSIDE TRANSFUSION & HEMOVIGILANCE
    // ==========================================

    async startTransfusion(transfusionData) {
        const {
            requestId,
            bloodUnitId,
            primaryClinician,
            verifyingClinician,
            initialVitals = { bp: "120/80", hr: 78, temp: 36.8, rr: 16 }
        } = transfusionData;

        if (!requestId || !bloodUnitId || !primaryClinician || !verifyingClinician) {
            const err = new Error("Validation Error: Mandatory Dual-Check Safety Protocol requires requestId, bloodUnitId, primaryClinician, and verifyingClinician co-signer.");
            err.statusCode = 400;
            throw err;
        }

        const [request, unit] = await Promise.all([
            prisma.bloodTransfusionRequest.findUnique({ where: { id: requestId } }),
            prisma.bloodUnit.findUnique({ where: { id: bloodUnitId } })
        ]);

        if (!request || !unit) {
            const err = new Error("Transfusion request or blood unit not found.");
            err.statusCode = 404;
            throw err;
        }

        const transfusionNumber = await generateTransfusionNumber();

        const [transfusionRecord] = await Promise.all([
            prisma.bloodTransfusionRecord.create({
                data: {
                    transfusionNumber,
                    requestId,
                    bloodUnitId,
                    primaryClinician,
                    verifyingClinician,
                    startedAt: new Date(),
                    initialVitals,
                    status: "IN_PROGRESS"
                }
            }),
            prisma.bloodUnit.update({
                where: { id: bloodUnitId },
                data: { status: "TRANSFUSED" }
            }),
            prisma.bloodTransfusionRequest.update({
                where: { id: requestId },
                data: { status: "ISSUED" }
            })
        ]);

        return transfusionRecord;
    }

    async completeTransfusion(transfusionId, completionData = {}) {
        const { postVitals = { bp: "122/82", hr: 76, temp: 36.9, rr: 16 }, clinicalNotes } = completionData;

        const record = await prisma.bloodTransfusionRecord.findUnique({
            where: { id: transfusionId }
        });

        if (!record) {
            const err = new Error(`Transfusion record with ID ${transfusionId} not found.`);
            err.statusCode = 404;
            throw err;
        }

        const completedRecord = await prisma.bloodTransfusionRecord.update({
            where: { id: transfusionId },
            data: {
                completedAt: new Date(),
                postVitals,
                status: "COMPLETED",
                investigationNotes: clinicalNotes || "Transfusion completed uneventfully. Post-infusion vitals stable."
            }
        });

        await prisma.bloodTransfusionRequest.update({
            where: { id: record.requestId },
            data: { status: "COMPLETED" }
        });

        return completedRecord;
    }

    async recordAdverseReaction(transfusionId, reactionData) {
        const {
            reactionType = "FEBRILE_NON_HEMOLYTIC",
            reactionSeverity = "MODERATE",
            actionTaken = "Transfusion immediately halted. IV Normal Saline infused. Antihistamine and antipyretic administered. Blood bag and recipient sample sent to Blood Bank for hemovigilance investigation.",
            investigationNotes
        } = reactionData;

        const record = await prisma.bloodTransfusionRecord.findUnique({
            where: { id: transfusionId }
        });

        if (!record) {
            const err = new Error(`Transfusion record with ID ${transfusionId} not found.`);
            err.statusCode = 404;
            throw err;
        }

        const updated = await prisma.bloodTransfusionRecord.update({
            where: { id: transfusionId },
            data: {
                completedAt: new Date(),
                status: "TERMINATED_ADVERSE_REACTION",
                hadAdverseReaction: true,
                reactionType,
                reactionSeverity,
                actionTaken,
                investigationNotes: investigationNotes || `Adverse reaction reported at ${new Date().toISOString()}. Immediate hemovigilance protocol triggered.`
            }
        });

        return updated;
    }

    // ==========================================
    // 5. COMMAND CENTER REAL-TIME TELEMETRY
    // ==========================================

    async getBloodBankTelemetry() {
        const [
            totalUnits,
            testedSafeUnits,
            quarantineUnits,
            reservedUnits,
            donorsCount,
            activeRequests,
            unitsByGroup,
            unitsByComponent,
            expiringSoonCount
        ] = await Promise.all([
            prisma.bloodUnit.count(),
            prisma.bloodUnit.count({ where: { status: "TESTED_SAFE" } }),
            prisma.bloodUnit.count({ where: { status: "QUARANTINE" } }),
            prisma.bloodUnit.count({ where: { status: "RESERVED" } }),
            prisma.bloodDonor.count(),
            prisma.bloodTransfusionRequest.count({ where: { status: { in: ["REQUESTED", "CROSS_MATCHING", "COMPATIBLE_READY"] } } }),
            prisma.bloodUnit.groupBy({
                by: ["bloodGroup"],
                where: { status: "TESTED_SAFE" },
                _count: { id: true }
            }),
            prisma.bloodUnit.groupBy({
                by: ["componentType"],
                where: { status: "TESTED_SAFE" },
                _count: { id: true }
            }),
            prisma.bloodUnit.count({
                where: {
                    status: "TESTED_SAFE",
                    expiryDate: {
                        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);

        // Calculate O-Negative emergency reserve count
        const oNegativeAvailable = unitsByGroup.find(g => g.bloodGroup === "O_NEGATIVE")?._count?.id || 0;

        // Group matrix for all 8 standard phenotypes
        const stockMatrix = {};
        BLOOD_GROUPS.forEach(g => {
            const found = unitsByGroup.find(item => item.bloodGroup === g);
            stockMatrix[g] = found ? found._count.id : 0;
        });

        return {
            summary: {
                totalUnits,
                testedSafeUnits,
                quarantineUnits,
                reservedUnits,
                totalDonors: donorsCount,
                activeRequests,
                expiringWithin7Days: expiringSoonCount
            },
            emergencyReserve: {
                oNegativeUnitsAvailable: oNegativeAvailable,
                isReserveCritical: oNegativeAvailable < 2,
                alertMessage: oNegativeAvailable < 2 
                    ? "CRITICAL WARNING: Universal O-Negative emergency reserve below threshold (< 2 units)."
                    : "Emergency reserve nominal."
            },
            stockByGroup: stockMatrix,
            stockByComponent: unitsByComponent.map(c => ({
                component: c.componentType,
                count: c._count.id
            }))
        };
    }
}

module.exports = new BloodBankService();
