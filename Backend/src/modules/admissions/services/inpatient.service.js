"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
INPATIENT DEPARTMENT (IPD), WARD & BED MANAGEMENT SERVICE
Real Database Execution, Bed Allocation, Nursing Charts & Discharges
LOCATION: src/modules/admissions/services/inpatient.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const { generateAdmissionNumber, generateWardCode, generateBedCode } = require("../helpers/admission-id.generator");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");

/**
 * Create a new Hospital Ward
 * 
 * @param {Object} data - { hospitalId, name, code, description, capacity, unitId }
 */
async function createWard(data) {
    const { hospitalId, name, description, capacity = 0, unitId = null } = data;

    if (!hospitalId || !name) {
        throw new AppError("Hospital ID and Ward name are required", 400, "MISSING_REQUIRED_FIELDS");
    }

    const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId }
    });
    if (!hospital) {
        throw new AppError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");
    }

    const count = await prisma.hospitalWard.count({ where: { hospitalId } });
    const code = data.code || generateWardCode(name, count + 1);

    const ward = await prisma.hospitalWard.create({
        data: {
            hospitalId,
            unitId,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description || null,
            capacity: Number(capacity) || 0,
            active: true
        }
    });

    logger.info("Hospital ward created successfully", { wardId: ward.id, code: ward.code, name: ward.name });
    return ward;
}

/**
 * Get all Wards in a Hospital with Occupancy Summary
 * 
 * @param {string} hospitalId - Hospital ID
 */
async function getHospitalWards(hospitalId) {
    if (!hospitalId) {
        throw new AppError("Hospital ID is required", 400, "MISSING_HOSPITAL_ID");
    }

    const wards = await prisma.hospitalWard.findMany({
        where: { hospitalId, active: true, deletedAt: null },
        include: {
            rooms: {
                where: { active: true, deletedAt: null },
                include: {
                    beds: {
                        where: { active: true, deletedAt: null }
                    }
                }
            },
            admissions: {
                where: { status: "ADMITTED" }
            }
        },
        orderBy: { name: "asc" }
    });

    return wards.map(ward => {
        let totalBeds = 0;
        let occupiedBeds = 0;
        let availableBeds = 0;

        ward.rooms.forEach(room => {
            room.beds.forEach(bed => {
                totalBeds++;
                if (bed.status === "OCCUPIED") {
                    occupiedBeds++;
                } else if (bed.status === "AVAILABLE") {
                    availableBeds++;
                }
            });
        });

        const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

        return {
            id: ward.id,
            name: ward.name,
            code: ward.code,
            description: ward.description,
            totalRooms: ward.rooms.length,
            totalBeds,
            occupiedBeds,
            availableBeds,
            occupancyRatePercentage: occupancyRate,
            currentInpatientsCount: ward.admissions.length,
            active: ward.active,
            createdAt: ward.createdAt
        };
    });
}

/**
 * Create a Hospital Room within a Ward
 * 
 * @param {Object} data - { hospitalId, wardId, name, code, floor, roomType, description }
 */
async function createRoom(data) {
    const { hospitalId, wardId, name, floor, roomType = "GENERAL", description } = data;

    if (!hospitalId || !wardId || !name) {
        throw new AppError("Hospital ID, Ward ID, and Room name are required", 400, "MISSING_REQUIRED_FIELDS");
    }

    const ward = await prisma.hospitalWard.findUnique({
        where: { id: wardId }
    });
    if (!ward) {
        throw new AppError("Ward not found", 404, "WARD_NOT_FOUND");
    }

    const count = await prisma.hospitalRoom.count({ where: { wardId } });
    const code = data.code || `${ward.code}-RM${String(count + 1).padStart(2, "0")}`;

    const room = await prisma.hospitalRoom.create({
        data: {
            hospitalId,
            wardId,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            floor: floor || "Ground Floor",
            roomType: roomType.trim().toUpperCase(),
            description: description || null,
            active: true
        }
    });

    return room;
}

/**
 * Create a Hospital Bed within a Room
 * 
 * @param {Object} data - { hospitalId, roomId, name, code, bedNumber, bedType, description }
 */
async function createBed(data) {
    const { hospitalId, roomId, bedNumber, bedType = "STANDARD", description } = data;

    if (!hospitalId || !roomId || !bedNumber) {
        throw new AppError("Hospital ID, Room ID, and Bed number are required", 400, "MISSING_REQUIRED_FIELDS");
    }

    const room = await prisma.hospitalRoom.findUnique({
        where: { id: roomId },
        include: { ward: true }
    });
    if (!room) {
        throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    const name = data.name || `Bed ${bedNumber}`;
    const code = data.code || generateBedCode(room.code, bedNumber);

    const bed = await prisma.hospitalBed.create({
        data: {
            hospitalId,
            roomId,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            bedNumber: String(bedNumber).trim(),
            status: "AVAILABLE",
            bedType: bedType.trim().toUpperCase(),
            description: description || null,
            active: true
        }
    });

    // Update ward capacity
    await prisma.hospitalWard.update({
        where: { id: room.wardId },
        data: { capacity: { increment: 1 } }
    });

    return bed;
}

/**
 * Get Ward Bed Map / Matrix
 * Returns live status of all beds in a ward and current admitted patient information
 * 
 * @param {string} hospitalId - Hospital ID
 * @param {string} wardId - Ward ID
 */
async function getWardBedMatrix(hospitalId, wardId) {
    if (!hospitalId || !wardId) {
        throw new AppError("Hospital ID and Ward ID are required", 400, "MISSING_REQUIRED_FIELDS");
    }

    const ward = await prisma.hospitalWard.findUnique({
        where: { id: wardId },
        include: {
            rooms: {
                where: { active: true, deletedAt: null },
                include: {
                    beds: {
                        where: { active: true, deletedAt: null },
                        include: {
                            admissions: {
                                where: { status: "ADMITTED" },
                                include: {
                                    patient: {
                                        select: {
                                            id: true,
                                            patientNumber: true,
                                            firstName: true,
                                            lastName: true,
                                            gender: true,
                                            dateOfBirth: true
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: { bedNumber: "asc" }
                    }
                },
                orderBy: { name: "asc" }
            }
        }
    });

    if (!ward) {
        throw new AppError("Ward not found", 404, "WARD_NOT_FOUND");
    }

    return {
        wardId: ward.id,
        wardName: ward.name,
        wardCode: ward.code,
        capacity: ward.capacity,
        rooms: ward.rooms.map(room => ({
            roomId: room.id,
            roomName: room.name,
            roomCode: room.code,
            roomType: room.roomType,
            floor: room.floor,
            beds: room.beds.map(bed => {
                const activeAdmission = bed.admissions.length > 0 ? bed.admissions[0] : null;
                return {
                    bedId: bed.id,
                    bedNumber: bed.bedNumber,
                    bedCode: bed.code,
                    bedType: bed.bedType,
                    status: bed.status,
                    currentOccupant: activeAdmission ? {
                        admissionId: activeAdmission.id,
                        admissionNumber: activeAdmission.admissionNumber,
                        admittedAt: activeAdmission.admittedAt,
                        admittingDoctorName: activeAdmission.admittingDoctorName,
                        diagnosis: activeAdmission.admissionDiagnosis,
                        patientId: activeAdmission.patient.id,
                        patientMrn: activeAdmission.patient.patientNumber,
                        patientName: `${activeAdmission.patient.firstName} ${activeAdmission.patient.lastName}`,
                        gender: activeAdmission.patient.gender
                    } : null
                };
            })
        }))
    };
}

/**
 * Admit a Patient to an Inpatient Ward & Bed
 * 
 * @param {Object} data - Admission payload
 * @param {Object} staffUser - User creating the admission
 */
async function admitPatient(data, staffUser) {
    const {
        hospitalId,
        patientId,
        wardId,
        roomId,
        bedId,
        admissionType = "GENERAL",
        notes,
        encounterId = null,
        admittingDoctorId = null,
        admittingDoctorName = null,
        admissionDiagnosis = null
    } = data;

    if (!hospitalId || !patientId || !wardId || !bedId) {
        throw new AppError("Hospital ID, Patient ID, Ward ID, and Bed ID are required for admission", 400, "MISSING_REQUIRED_FIELDS");
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: { folder: true }
    });
    if (!patient) {
        throw new AppError("Patient not found", 404, "PATIENT_NOT_FOUND");
    }

    // Verify bed exists and is available
    const bed = await prisma.hospitalBed.findUnique({
        where: { id: bedId },
        include: { room: { include: { ward: true } } }
    });
    if (!bed) {
        throw new AppError("Bed not found", 404, "BED_NOT_FOUND");
    }
    if (bed.status !== "AVAILABLE") {
        throw new AppError(`Bed ${bed.bedNumber} is not available (Current status: ${bed.status})`, 409, "BED_NOT_AVAILABLE");
    }

    // Generate sequential admission number
    const admissionNumber = await generateAdmissionNumber();
    const admittedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
        // Ensure active clinical encounter exists
        let activeEncounterId = encounterId;
        if (!activeEncounterId) {
            const encCount = await tx.patientEncounter.count();
            const encNum = `ENC-${new Date().getFullYear()}-${String(encCount + 1).padStart(6, "0")}`;
            const enc = await tx.patientEncounter.create({
                data: {
                    patientId,
                    hospitalId,
                    encounterNumber: encNum,
                    encounterType: "IPD",
                    status: "ADMITTED_IPD",
                    visitDate: admittedAt,
                    chiefComplaint: admissionDiagnosis || "Inpatient Ward Admission",
                    notes: notes ? `Admitted to ${bed.room.ward.name}, Bed ${bed.bedNumber}. ${notes}` : `Admitted to ${bed.room.ward.name}, Bed ${bed.bedNumber}`,
                    createdBy: staffUser ? staffUser.id : null,
                    assignedDoctorName: admittingDoctorName || (staffUser ? `${staffUser.firstName} ${staffUser.lastName}` : null)
                }
            });
            activeEncounterId = enc.id;
        } else {
            await tx.patientEncounter.update({
                where: { id: encounterId },
                data: {
                    status: "ADMITTED_IPD",
                    notes: notes ? `Admitted to ${bed.room.ward.name}, Bed ${bed.bedNumber}. ${notes}` : `Admitted to ${bed.room.ward.name}, Bed ${bed.bedNumber}`
                }
            });
        }

        // 1. Create HospitalAdmission
        const admission = await tx.hospitalAdmission.create({
            data: {
                hospitalId,
                patientId,
                wardId,
                roomId: roomId || bed.roomId,
                bedId,
                admissionNumber,
                admissionType: admissionType.toUpperCase(),
                status: "ADMITTED",
                admittedAt,
                notes: notes || null,
                encounterId: activeEncounterId,
                admittingDoctorId,
                admittingDoctorName: admittingDoctorName || (staffUser ? `${staffUser.firstName} ${staffUser.lastName}` : null),
                admissionDiagnosis: admissionDiagnosis || null
            }
        });

        // 2. Mark Bed as OCCUPIED
        await tx.hospitalBed.update({
            where: { id: bedId },
            data: { status: "OCCUPIED" }
        });

        // 3. Record HospitalPatientLocation
        await tx.hospitalPatientLocation.create({
            data: {
                hospitalId,
                patientId,
                wardId,
                roomId: roomId || bed.roomId,
                bedId,
                status: "ADMITTED",
                admittedAt
            }
        });

        return admission;
    });

    logger.info("Patient admitted to inpatient ward successfully", {
        admissionNumber,
        patientId,
        wardId,
        bedNumber: bed.bedNumber
    });

    return {
        ...result,
        patient: {
            id: patient.id,
            mrn: patient.patientNumber,
            patientNumber: patient.patientNumber,
            fullName: `${patient.firstName} ${patient.lastName}`,
            gender: patient.gender,
            dateOfBirth: patient.dateOfBirth,
            folderNumber: patient.folder ? patient.folder.folderNumber : null,
            shelfLocation: patient.folder ? patient.folder.shelfLocation : null
        },
        location: {
            wardName: bed.room.ward.name,
            wardCode: bed.room.ward.code,
            roomName: bed.room.name,
            bedNumber: bed.bedNumber,
            bedCode: bed.code
        }
    };
}

/**
 * Transfer Patient to a New Bed / Ward
 * 
 * @param {string} admissionId - Admission ID
 * @param {Object} transferData - { newWardId, newRoomId, newBedId, transferReason }
 * @param {Object} staffUser - User executing the transfer
 */
async function transferBed(admissionId, transferData, staffUser) {
    const { newWardId, newRoomId, newBedId, transferReason } = transferData;

    if (!admissionId || !newBedId) {
        throw new AppError("Admission ID and New Bed ID are required", 400, "MISSING_REQUIRED_FIELDS");
    }

    const admission = await prisma.hospitalAdmission.findUnique({
        where: { id: admissionId },
        include: { bed: true }
    });
    if (!admission || admission.status !== "ADMITTED") {
        throw new AppError("Active admission not found", 404, "ACTIVE_ADMISSION_NOT_FOUND");
    }

    const newBed = await prisma.hospitalBed.findUnique({
        where: { id: newBedId },
        include: { room: { include: { ward: true } } }
    });
    if (!newBed) {
        throw new AppError("New bed not found", 404, "BED_NOT_FOUND");
    }
    if (newBed.status !== "AVAILABLE") {
        throw new AppError(`Target bed ${newBed.bedNumber} is not available (Status: ${newBed.status})`, 409, "BED_NOT_AVAILABLE");
    }

    const oldBedId = admission.bedId;

    const result = await prisma.$transaction(async (tx) => {
        // 1. Release old bed
        if (oldBedId) {
            await tx.hospitalBed.update({
                where: { id: oldBedId },
                data: { status: "AVAILABLE" }
            });
        }

        // 2. Occupy new bed
        await tx.hospitalBed.update({
            where: { id: newBedId },
            data: { status: "OCCUPIED" }
        });

        // 3. Update Admission
        const updatedAdmission = await tx.hospitalAdmission.update({
            where: { id: admissionId },
            data: {
                wardId: newWardId || newBed.room.wardId,
                roomId: newRoomId || newBed.roomId,
                bedId: newBedId,
                notes: transferReason ? `${admission.notes ? admission.notes + "\n" : ""}[Bed Transfer] ${transferReason}` : admission.notes
            }
        });

        // 4. Record location change
        await tx.hospitalPatientLocation.create({
            data: {
                hospitalId: admission.hospitalId,
                patientId: admission.patientId,
                wardId: newWardId || newBed.room.wardId,
                roomId: newRoomId || newBed.roomId,
                bedId: newBedId,
                status: "TRANSFERRED",
                admittedAt: new Date()
            }
        });

        return updatedAdmission;
    });

    logger.info("Patient bed transfer completed", { admissionId, oldBedId, newBedId: newBed.id });

    return {
        ...result,
        newLocation: {
            wardName: newBed.room.ward.name,
            roomName: newBed.room.name,
            bedNumber: newBed.bedNumber
        }
    };
}

/**
 * Record Daily Inpatient Nursing Chart & Rounding Notes
 * 
 * @param {string} admissionId - Admission ID
 * @param {Object} chartData - Clinical charting payload
 * @param {Object} nurseUser - Authenticated nurse user
 */
async function recordInpatientNursingChart(admissionId, chartData, nurseUser) {
    if (!admissionId) {
        throw new AppError("Admission ID is required", 400, "MISSING_ADMISSION_ID");
    }

    const admission = await prisma.hospitalAdmission.findUnique({
        where: { id: admissionId },
        include: { patient: true }
    });
    if (!admission) {
        throw new AppError("Admission record not found", 404, "ADMISSION_NOT_FOUND");
    }

    const {
        shift = "MORNING",
        observation,
        nursingNote,
        temperature,
        pulseRate,
        respiratoryRate,
        bloodPressure,
        oxygenSaturation,
        intakeOutputNotes,
        medicationsAdministered
    } = chartData;

    const recordedAt = new Date();
    const nurseName = nurseUser ? `${nurseUser.firstName} ${nurseUser.lastName}` : "Ward Nurse";

    // Ensure encounter exists
    let encounterId = admission.encounterId;
    if (!encounterId) {
        const encCount = await prisma.patientEncounter.count();
        const encNum = `ENC-${new Date().getFullYear()}-${String(encCount + 1).padStart(6, "0")}`;
        const enc = await prisma.patientEncounter.create({
            data: {
                patientId: admission.patientId,
                hospitalId: admission.hospitalId,
                encounterNumber: encNum,
                encounterType: "IPD",
                status: "ADMITTED_IPD",
                visitDate: new Date(),
                chiefComplaint: admission.admissionDiagnosis || "Inpatient Nursing Care",
                notes: "Inpatient nursing chart",
                createdBy: nurseUser ? nurseUser.id : null
            }
        });
        encounterId = enc.id;
        await prisma.hospitalAdmission.update({
            where: { id: admission.id },
            data: { encounterId }
        });
    }

    // Create Nursing Record
    const record = await prisma.nursingRecord.create({
        data: {
            encounterId,
            patientId: admission.patientId,
            admissionId,
            shift: String(shift).toUpperCase(),
            observation: observation || null,
            nursingNote: nursingNote || null,
            temperature: temperature != null ? Number(temperature) : null,
            pulseRate: pulseRate != null ? Number(pulseRate) : null,
            respiratoryRate: respiratoryRate != null ? Number(respiratoryRate) : null,
            bloodPressure: bloodPressure || null,
            oxygenSaturation: oxygenSaturation != null ? Number(oxygenSaturation) : null,
            intakeOutputNotes: intakeOutputNotes || null,
            medicationsAdministered: medicationsAdministered || null,
            nurseName,
            recordedAt
        }
    });

    logger.info("Inpatient nursing chart recorded successfully", {
        admissionId,
        shift: record.shift,
        recordedAt
    });

    return record;
}

/**
 * Get Nursing Shift Charts for an Admission
 * 
 * @param {string} admissionId - Admission ID
 */
async function getAdmissionNursingCharts(admissionId) {
    if (!admissionId) {
        throw new AppError("Admission ID is required", 400, "MISSING_ADMISSION_ID");
    }

    return prisma.nursingRecord.findMany({
        where: { admissionId },
        orderBy: { recordedAt: "desc" }
    });
}

/**
 * Discharge Inpatient from Ward
 * 
 * @param {string} admissionId - Admission ID
 * @param {Object} dischargeData - Discharge outcome payload
 * @param {Object} staffUser - User executing discharge
 */
async function dischargePatient(admissionId, dischargeData, staffUser) {
    if (!admissionId) {
        throw new AppError("Admission ID is required", 400, "MISSING_ADMISSION_ID");
    }

    const admission = await prisma.hospitalAdmission.findUnique({
        where: { id: admissionId },
        include: { bed: true }
    });
    if (!admission || admission.status !== "ADMITTED") {
        throw new AppError("Active admission not found", 404, "ACTIVE_ADMISSION_NOT_FOUND");
    }

    const {
        dischargeSummary,
        dischargeCondition = "IMPROVED",
        dischargeDisposition = "HOME"
    } = dischargeData;

    const dischargedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
        // 1. Update Admission record
        const updatedAdmission = await tx.hospitalAdmission.update({
            where: { id: admissionId },
            data: {
                status: "DISCHARGED",
                dischargedAt,
                dischargeSummary: dischargeSummary || "Discharged in stable condition.",
                dischargeCondition: String(dischargeCondition).toUpperCase(),
                dischargeDisposition: String(dischargeDisposition).toUpperCase()
            }
        });

        // 2. Release Bed
        if (admission.bedId) {
            await tx.hospitalBed.update({
                where: { id: admission.bedId },
                data: { status: "AVAILABLE" }
            });
        }

        // 3. Update Patient Location
        await tx.hospitalPatientLocation.updateMany({
            where: {
                patientId: admission.patientId,
                status: "ADMITTED"
            },
            data: {
                status: "DISCHARGED",
                dischargedAt
            }
        });

        // 4. Update Encounter and create DischargeRecord if encounter exists
        if (admission.encounterId) {
            await tx.dischargeRecord.create({
                data: {
                    encounterId: admission.encounterId,
                    dischargeSummary: dischargeSummary || "Patient successfully treated and discharged.",
                    dischargeDate: dischargedAt
                }
            });

            await tx.patientEncounter.update({
                where: { id: admission.encounterId },
                data: {
                    status: "DISCHARGED",
                    notes: `${admission.notes ? admission.notes + "\n" : ""}[Discharged] ${dischargeSummary || "Discharged home."}`
                }
            });
        }

        return updatedAdmission;
    });

    logger.info("Patient discharged from inpatient ward successfully", {
        admissionId,
        bedReleased: admission.bedId,
        dischargedAt
    });

    return result;
}

/**
 * Get Active Inpatient Admissions for a Hospital
 * 
 * @param {string} hospitalId - Hospital ID
 * @param {Object} [filters] - Ward / Doctor filters
 */
async function getActiveAdmissions(hospitalId, filters = {}) {
    if (!hospitalId) {
        throw new AppError("Hospital ID is required", 400, "MISSING_HOSPITAL_ID");
    }

    const where = {
        hospitalId,
        status: "ADMITTED"
    };

    if (filters.wardId) {
        where.wardId = filters.wardId;
    }

    const admissions = await prisma.hospitalAdmission.findMany({
        where,
        include: {
            patient: {
                include: { folder: true }
            },
            ward: true,
            room: true,
            bed: true
        },
        orderBy: { admittedAt: "desc" }
    });

    const now = Date.now();

    return admissions.map(adm => {
        const daysAdmitted = Math.max(1, Math.ceil((now - new Date(adm.admittedAt).getTime()) / (1000 * 60 * 60 * 24)));
        return {
            admissionId: adm.id,
            admissionNumber: adm.admissionNumber,
            admissionType: adm.admissionType,
            admittedAt: adm.admittedAt,
            daysAdmitted,
            admittingDoctorName: adm.admittingDoctorName,
            admissionDiagnosis: adm.admissionDiagnosis,
            notes: adm.notes,
            patient: {
                id: adm.patient.id,
                mrn: adm.patient.patientNumber,
                patientNumber: adm.patient.patientNumber,
                fullName: `${adm.patient.firstName} ${adm.patient.lastName}`,
                gender: adm.patient.gender,
                dateOfBirth: adm.patient.dateOfBirth,
                folderNumber: adm.patient.folder ? adm.patient.folder.folderNumber : null,
                shelfLocation: adm.patient.folder ? adm.patient.folder.shelfLocation : null
            },
            location: {
                wardId: adm.ward ? adm.ward.id : null,
                wardName: adm.ward ? adm.ward.name : "Unassigned Ward",
                wardCode: adm.ward ? adm.ward.code : null,
                roomName: adm.room ? adm.room.name : null,
                bedNumber: adm.bed ? adm.bed.bedNumber : null,
                bedCode: adm.bed ? adm.bed.code : null
            }
        };
    });
}

/**
 * Get Complete Single Admission Dossier
 * 
 * @param {string} admissionId - Admission ID
 */
async function getAdmissionById(admissionId) {
    if (!admissionId) {
        throw new AppError("Admission ID is required", 400, "MISSING_ADMISSION_ID");
    }

    const admission = await prisma.hospitalAdmission.findUnique({
        where: { id: admissionId },
        include: {
            patient: {
                include: { folder: true }
            },
            ward: true,
            room: true,
            bed: true
        }
    });

    if (!admission) {
        throw new AppError("Admission not found", 404, "ADMISSION_NOT_FOUND");
    }

    const nursingRecords = await prisma.nursingRecord.findMany({
        where: { admissionId },
        orderBy: { recordedAt: "desc" }
    });

    return {
        ...admission,
        nursingRecords
    };
}

/**
 * Inpatient Department (IPD) Dashboard Real-Life Telemetry
 * Aggregates live PostgreSQL ward and bed metrics with authentic imagery metadata
 * 
 * @param {string} hospitalId - Hospital ID
 */
async function getIpdDashboardTelemetry(hospitalId) {
    if (!hospitalId) {
        throw new AppError("Hospital ID is required", 400, "MISSING_HOSPITAL_ID");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        totalWardsCount,
        totalBedsCount,
        occupiedBedsCount,
        availableBedsCount,
        admissionsToday,
        dischargesToday,
        recentAdmissions
    ] = await Promise.all([
        prisma.hospitalWard.count({
            where: { hospitalId, active: true }
        }),
        prisma.hospitalBed.count({
            where: { hospitalId, active: true }
        }),
        prisma.hospitalBed.count({
            where: { hospitalId, status: "OCCUPIED", active: true }
        }),
        prisma.hospitalBed.count({
            where: { hospitalId, status: "AVAILABLE", active: true }
        }),
        prisma.hospitalAdmission.count({
            where: { hospitalId, admittedAt: { gte: today } }
        }),
        prisma.hospitalAdmission.count({
            where: { hospitalId, status: "DISCHARGED", dischargedAt: { gte: today } }
        }),
        prisma.hospitalAdmission.findMany({
            where: { hospitalId },
            include: {
                patient: {
                    select: { firstName: true, lastName: true, patientNumber: true }
                },
                ward: {
                    select: { name: true, code: true }
                },
                bed: {
                    select: { bedNumber: true }
                }
            },
            orderBy: { admittedAt: "desc" },
            take: 10
        })
    ]);

    const bedOccupancyRatePercentage = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;

    return {
        timestamp: new Date(),
        telemetry: {
            totalWardsCount,
            totalBedsCount,
            occupiedBedsCount,
            availableBedsCount,
            bedOccupancyRatePercentage,
            admissionsToday,
            dischargesToday
        },
        recentAdmissions: recentAdmissions.map(adm => ({
            admissionId: adm.id,
            admissionNumber: adm.admissionNumber,
            status: adm.status,
            patientName: `${adm.patient.firstName} ${adm.patient.lastName}`,
            patientMrn: adm.patient.patientNumber,
            wardName: adm.ward ? adm.ward.name : "Unassigned Ward",
            bedNumber: adm.bed ? adm.bed.bedNumber : null,
            admittedAt: adm.admittedAt
        })),
        dashboardRoleTheme: {
            role: "NURSE",
            department: "INPATIENT_DEPARTMENT",
            heroTitle: "Inpatient Ward Management & Daily Nursing Command",
            heroSubtitle: "Real-time bed allocation, clinical chart rounds, fluid balance and patient transfers",
            bannerImageUrl: "/assets/images/roles/inpatient_ward_hero.jpg",
            avatarBadgeUrl: "/assets/images/roles/ward_cross_badge.png",
            themeColor: "#0D9488"
        }
    };
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
