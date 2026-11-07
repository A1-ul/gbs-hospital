"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MASTER PATIENT INDEX (MPI) & REGISTRATION SERVICE
Real Database Execution & Physical Folder Auto-Provisioning
LOCATION: src/modules/patients/services/patient.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const { generatePatientMRN, generateFolderIdentifiers, calculatePhysicalShelfLocation } = require("../helpers/patient-id.generator");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");

/**
 * Register a new Patient into Master Patient Index (MPI)
 * Automatically provisions physical Medical Folder & Shelf Assignment
 */
async function registerPatient(data, creatorUserId) {
    const {
        hospitalId,
        firstName,
        lastName,
        middleName,
        dateOfBirth,
        gender,
        phone,
        email,
        address,
        nationalId,
        nhisNumber,
        occupation,
        maritalStatus,
        nationality = "Ghanaian",
        bloodGroup,
        genotype,
        photoUrl,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        chronicConditions,
        knownAllergies,
        medicalHistory,
        archiveZone = "MAIN_ARCHIVE"
    } = data;

    if (!hospitalId || !firstName || !lastName || !gender || !phone) {
        throw new AppError("Hospital ID, patient first name, last name, gender, and phone number are required", 400, "MISSING_REQUIRED_FIELDS");
    }

    // Verify hospital exists
    const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId }
    });
    if (!hospital) {
        throw new AppError("Hospital not found", 404, "HOSPITAL_NOT_FOUND");
    }

    // Check duplicate nationalId or nhisNumber if provided
    if (nationalId) {
        const existingNationalId = await prisma.patient.findFirst({
            where: { nationalId: nationalId.trim(), hospitalId }
        });
        if (existingNationalId) {
            throw new AppError(`A patient with National ID ${nationalId} is already registered (MRN: ${existingNationalId.patientNumber})`, 409, "PATIENT_NATIONAL_ID_EXISTS");
        }
    }

    if (nhisNumber) {
        const existingNhis = await prisma.patient.findFirst({
            where: { nhisNumber: nhisNumber.trim(), hospitalId }
        });
        if (existingNhis) {
            throw new AppError(`A patient with NHIS number ${nhisNumber} is already registered (MRN: ${existingNhis.patientNumber})`, 409, "PATIENT_NHIS_EXISTS");
        }
    }

    // Generate unique sequential enterprise identifiers
    const patientNumber = await generatePatientMRN();
    const { folderNumber, barcode } = await generateFolderIdentifiers();

    // Determine Physical Archive Shelf Index
    const count = await prisma.medicalFolder.count({ where: { hospitalId } });
    const shelfLocation = calculatePhysicalShelfLocation(lastName, count + 1, archiveZone);

    const formattedDob = dateOfBirth ? new Date(dateOfBirth) : null;

    // Transactional Patient & Physical Folder Creation
    const result = await prisma.$transaction(async (tx) => {
        // 1. Create Patient Record
        const patient = await tx.patient.create({
            data: {
                hospitalId,
                patientNumber,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                middleName: middleName ? middleName.trim() : null,
                dateOfBirth: formattedDob,
                gender: gender.toUpperCase(),
                phone: phone.trim(),
                email: email ? email.trim().toLowerCase() : null,
                address: address ? address.trim() : null,
                nationalId: nationalId ? nationalId.trim() : null,
                nhisNumber: nhisNumber ? nhisNumber.trim() : null,
                occupation: occupation ? occupation.trim() : null,
                maritalStatus: maritalStatus ? maritalStatus.toUpperCase() : null,
                nationality: nationality ? nationality.trim() : "Ghanaian",
                bloodGroup: bloodGroup ? bloodGroup.toUpperCase() : null,
                genotype: genotype ? genotype.toUpperCase() : null,
                photoUrl: photoUrl || null,
                emergencyContact: emergencyContactPhone ? `${emergencyContactName || ""} (${emergencyContactPhone})` : null,
                emergencyContactName: emergencyContactName ? emergencyContactName.trim() : null,
                emergencyContactPhone: emergencyContactPhone ? emergencyContactPhone.trim() : null,
                emergencyContactRelation: emergencyContactRelation ? emergencyContactRelation.trim() : null,
                active: true
            }
        });

        // 2. Provision Physical Medical Folder
        const folder = await tx.medicalFolder.create({
            data: {
                hospitalId,
                patientId: patient.id,
                folderNumber,
                archiveZone,
                shelfLocation,
                barcode,
                status: "IN_ARCHIVE"
            }
        });

        // 3. Log Initial Shelving in Physical Movement Chain-of-Custody
        await tx.folderMovementLog.create({
            data: {
                folderId: folder.id,
                performedById: creatorUserId || "SYSTEM",
                performedByRole: "FOLDER_RETRIEVER",
                action: "INITIAL_SHELVED",
                toLocation: shelfLocation,
                notes: `Folder created upon patient registration and cataloged on shelf ${shelfLocation}.`
            }
        });

        // 4. Create Detailed Patient Profile
        await tx.patientProfile.create({
            data: {
                patientId: patient.id,
                maritalStatus: maritalStatus ? maritalStatus.toUpperCase() : null,
                occupation: occupation ? occupation.trim() : null,
                nationality: nationality ? nationality.trim() : "Ghanaian",
                identificationType: nationalId ? "NATIONAL_ID" : (nhisNumber ? "NHIS" : null),
                identificationNumber: nationalId || nhisNumber || null,
                allergies: knownAllergies || null,
                chronicConditions: chronicConditions || null,
                medicalHistory: medicalHistory || null
            }
        });

        // 5. Audit Log
        await tx.auditLog.create({
            data: {
                userId: creatorUserId || null,
                action: "PATIENT_REGISTERED",
                module: "PATIENT_MANAGEMENT",
                description: `Patient ${patient.firstName} ${patient.lastName} (MRN: ${patient.patientNumber}) registered. Physical Folder ${folder.folderNumber} indexed at ${shelfLocation}.`
            }
        });

        return { patient, folder };
    });

    logger.info({
        message: "Patient registered successfully in MPI",
        mrn: result.patient.patientNumber,
        folderNumber: result.folder.folderNumber,
        shelfLocation: result.folder.shelfLocation
    });

    return {
        patient: {
            id: result.patient.id,
            patientNumber: result.patient.patientNumber,
            fullName: `${result.patient.firstName} ${result.patient.middleName ? result.patient.middleName + " " : ""}${result.patient.lastName}`,
            firstName: result.patient.firstName,
            lastName: result.patient.lastName,
            middleName: result.patient.middleName,
            dateOfBirth: result.patient.dateOfBirth,
            gender: result.patient.gender,
            phone: result.patient.phone,
            email: result.patient.email,
            nationalId: result.patient.nationalId,
            nhisNumber: result.patient.nhisNumber,
            bloodGroup: result.patient.bloodGroup,
            genotype: result.patient.genotype,
            emergencyContact: {
                name: result.patient.emergencyContactName,
                phone: result.patient.emergencyContactPhone,
                relation: result.patient.emergencyContactRelation
            },
            active: result.patient.active,
            createdAt: result.patient.createdAt
        },
        physicalFolder: {
            id: result.folder.id,
            folderNumber: result.folder.folderNumber,
            barcode: result.folder.barcode,
            archiveZone: result.folder.archiveZone,
            shelfLocation: result.folder.shelfLocation,
            status: result.folder.status
        },
        message: "Patient successfully registered in Master Patient Index with physical folder indexed in archive."
    };
}

/**
 * Master Patient Index (MPI) Multi-Field Search
 * Real database query across MRN, Full Name, Phone, National ID, and NHIS
 */
async function searchMPI({ query, mrn, name, phone, nationalId, nhisNumber, hospitalId, page = 1, limit = 20 }) {
    const where = { active: true };

    if (hospitalId) {
        where.hospitalId = hospitalId;
    }

    if (query) {
        const trimmed = query.trim();
        where.OR = [
            { patientNumber: { contains: trimmed, mode: "insensitive" } },
            { firstName: { contains: trimmed, mode: "insensitive" } },
            { lastName: { contains: trimmed, mode: "insensitive" } },
            { phone: { contains: trimmed, mode: "insensitive" } },
            { nationalId: { contains: trimmed, mode: "insensitive" } },
            { nhisNumber: { contains: trimmed, mode: "insensitive" } }
        ];
    } else {
        if (mrn) where.patientNumber = { contains: mrn.trim(), mode: "insensitive" };
        if (phone) where.phone = { contains: phone.trim(), mode: "insensitive" };
        if (nationalId) where.nationalId = { contains: nationalId.trim(), mode: "insensitive" };
        if (nhisNumber) where.nhisNumber = { contains: nhisNumber.trim(), mode: "insensitive" };
        if (name) {
            where.OR = [
                { firstName: { contains: name.trim(), mode: "insensitive" } },
                { lastName: { contains: name.trim(), mode: "insensitive" } }
            ];
        }
    }

    const offset = (Number(page) - 1) * Number(limit);

    const [patients, total] = await Promise.all([
        prisma.patient.findMany({
            where,
            include: {
                folder: {
                    select: {
                        id: true,
                        folderNumber: true,
                        shelfLocation: true,
                        archiveZone: true,
                        barcode: true,
                        status: true,
                        currentDepartment: true
                    }
                },
                profile: {
                    select: {
                        allergies: true,
                        chronicConditions: true,
                        maritalStatus: true
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: Number(limit),
            skip: offset
        }),
        prisma.patient.count({ where })
    ]);

    const formatted = patients.map((p) => ({
        id: p.id,
        patientNumber: p.patientNumber,
        fullName: `${p.firstName} ${p.middleName ? p.middleName + " " : ""}${p.lastName}`,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        phone: p.phone,
        email: p.email,
        nationalId: p.nationalId,
        nhisNumber: p.nhisNumber,
        bloodGroup: p.bloodGroup,
        genotype: p.genotype,
        physicalFolder: p.folder,
        profile: p.profile,
        createdAt: p.createdAt
    }));

    return {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
        patients: formatted
    };
}

/**
 * Get Comprehensive Patient Details by ID or MRN
 */
async function getPatientById(identifier, hospitalId) {
    const where = {
        OR: [
            { id: identifier },
            { patientNumber: identifier }
        ]
    };

    if (hospitalId) {
        where.hospitalId = hospitalId;
    }

    const patient = await prisma.patient.findFirst({
        where,
        include: {
            folder: {
                include: {
                    movementLogs: {
                        orderBy: { createdAt: "desc" },
                        take: 5
                    },
                    retrievalRequests: {
                        orderBy: { requestedAt: "desc" },
                        take: 5
                    }
                }
            },
            profile: true,
            allergies: { where: { active: true } },
            vitalSigns: { orderBy: { recordedAt: "desc" }, take: 5 },
            medications: { where: { status: "ACTIVE" } },
            patientEncounters: {
                orderBy: { visitDate: "desc" },
                take: 10,
                include: {
                    consultations: true,
                    diagnoses: true,
                    prescriptions: true
                }
            }
        }
    });

    if (!patient) {
        throw new AppError("Patient record not found in Master Patient Index", 404, "PATIENT_NOT_FOUND");
    }

    return patient;
}

/**
 * Update Patient Demographics & Profile
 */
async function updatePatient(patientId, updateData, modifierUserId) {
    const patient = await prisma.patient.findUnique({
        where: { id: patientId }
    });

    if (!patient) {
        throw new AppError("Patient record not found", 404, "PATIENT_NOT_FOUND");
    }

    const {
        firstName,
        lastName,
        middleName,
        phone,
        email,
        address,
        nationalId,
        nhisNumber,
        occupation,
        maritalStatus,
        bloodGroup,
        genotype,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        chronicConditions,
        knownAllergies,
        medicalHistory
    } = updateData;

    const updated = await prisma.$transaction(async (tx) => {
        const p = await tx.patient.update({
            where: { id: patientId },
            data: {
                firstName: firstName !== undefined ? firstName.trim() : undefined,
                lastName: lastName !== undefined ? lastName.trim() : undefined,
                middleName: middleName !== undefined ? middleName.trim() : undefined,
                phone: phone !== undefined ? phone.trim() : undefined,
                email: email !== undefined ? email.trim().toLowerCase() : undefined,
                address: address !== undefined ? address.trim() : undefined,
                nationalId: nationalId !== undefined ? nationalId.trim() : undefined,
                nhisNumber: nhisNumber !== undefined ? nhisNumber.trim() : undefined,
                occupation: occupation !== undefined ? occupation.trim() : undefined,
                maritalStatus: maritalStatus !== undefined ? maritalStatus.toUpperCase() : undefined,
                bloodGroup: bloodGroup !== undefined ? bloodGroup.toUpperCase() : undefined,
                genotype: genotype !== undefined ? genotype.toUpperCase() : undefined,
                emergencyContactName: emergencyContactName !== undefined ? emergencyContactName.trim() : undefined,
                emergencyContactPhone: emergencyContactPhone !== undefined ? emergencyContactPhone.trim() : undefined,
                emergencyContactRelation: emergencyContactRelation !== undefined ? emergencyContactRelation.trim() : undefined
            }
        });

        if (chronicConditions !== undefined || knownAllergies !== undefined || medicalHistory !== undefined) {
            await tx.patientProfile.upsert({
                where: { patientId },
                update: {
                    chronicConditions: chronicConditions !== undefined ? chronicConditions : undefined,
                    allergies: knownAllergies !== undefined ? knownAllergies : undefined,
                    medicalHistory: medicalHistory !== undefined ? medicalHistory : undefined,
                    occupation: occupation !== undefined ? occupation.trim() : undefined,
                    maritalStatus: maritalStatus !== undefined ? maritalStatus.toUpperCase() : undefined
                },
                create: {
                    patientId,
                    chronicConditions,
                    allergies: knownAllergies,
                    medicalHistory,
                    occupation,
                    maritalStatus
                }
            });
        }

        await tx.auditLog.create({
            data: {
                userId: modifierUserId || null,
                action: "PATIENT_UPDATED",
                module: "PATIENT_MANAGEMENT",
                description: `Patient ${p.firstName} ${p.lastName} (MRN: ${p.patientNumber}) updated.`
            }
        });

        return p;
    });

    return updated;
}

/**
 * Get Patient Role Dashboard
 * Real clinical summary and authentic imagery metadata
 */
async function getPatientDashboard(patientId) {
    const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
            folder: {
                select: {
                    folderNumber: true,
                    shelfLocation: true,
                    status: true,
                    currentDepartment: true
                }
            },
            profile: true,
            allergies: { where: { active: true } },
            vitalSigns: { orderBy: { recordedAt: "desc" }, take: 1 },
            medications: { where: { status: "ACTIVE" } },
            patientEncounters: {
                orderBy: { visitDate: "desc" },
                take: 5,
                select: {
                    id: true,
                    encounterNumber: true,
                    encounterType: true,
                    status: true,
                    visitDate: true,
                    chiefComplaint: true
                }
            }
        }
    });

    if (!patient) {
        throw new AppError("Patient record not found", 404, "PATIENT_NOT_FOUND");
    }

    return {
        patient: {
            id: patient.id,
            patientNumber: patient.patientNumber,
            fullName: `${patient.firstName} ${patient.lastName}`,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            bloodGroup: patient.bloodGroup,
            genotype: patient.genotype,
            phone: patient.phone,
            nhisNumber: patient.nhisNumber,
            nationalId: patient.nationalId
        },
        medicalFolder: patient.folder,
        latestVitals: patient.vitalSigns[0] || null,
        activeAllergies: patient.allergies,
        activeMedications: patient.medications,
        recentVisits: patient.patientEncounters,
        dashboardRoleTheme: {
            role: "PATIENT",
            themeTitle: "Personal Patient Health Portal",
            avatarUrl: patient.photoUrl || "/assets/images/roles/patient_avatar.png",
            bannerImageUrl: "/assets/images/dashboards/patient_dashboard_hero.jpg",
            statusColor: "emerald"
        }
    };
}

module.exports = {
    registerPatient,
    searchMPI,
    getPatientById,
    updatePatient,
    getPatientDashboard
};
