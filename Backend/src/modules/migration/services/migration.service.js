"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MIGRATION SERVICE MODULE - ENTERPRISE DATA IMPORT & ROLLBACK ENGINE
Phase 20 Production Hardened - CommonJS Only
LOCATION: src/modules/migration/services/migration.service.js
====================================================
*/

const prisma = require("../../../core/database/prisma.client");
const AppError = require("../../../core/errors/app.error");
const logger = require("../../../core/utils/logger");
const { generateJobCode, generateTemplateCode } = require("../helpers/migration-id.generator");
const {
    SUPPORTED_SOURCES,
    TARGET_ENTITIES,
    parseCsv,
    parseJson,
    validateEntityRecord
} = require("../helpers/migration-parsers");
const { generatePatientMRN } = require("../../patients/helpers/patient-id.generator");
const { generateItemCode } = require("../../pharmacy/helpers/pharmacy-id.generator");

/**
 * Resolves active hospital ID
 */
async function resolveHospitalId(explicitHospitalId) {
    if (explicitHospitalId) return explicitHospitalId;
    const defaultHospital = await prisma.hospital.findFirst({
        orderBy: { createdAt: "asc" }
    });
    if (!defaultHospital) {
        throw new AppError("No active hospital record found in system", 500, "HOSPITAL_NOT_FOUND");
    }
    return defaultHospital.id;
}

/**
 * 1. Get Supported Sources, Entities and Catalogs
 */
async function getMigrationCatalogs() {
    return {
        supportedSources: SUPPORTED_SOURCES,
        targetEntities: TARGET_ENTITIES
    };
}

/**
 * 2. Initialize Migration Job and Parse Raw Upload
 */
async function initializeMigrationJob({
    targetEntity,
    sourceType,
    fileName,
    initiatedBy,
    rawData,
    fileSizeBytes,
    hospitalId: explicitHospitalId
}) {
    if (!targetEntity || !TARGET_ENTITIES[targetEntity]) {
        throw new AppError(`Invalid or unsupported target entity: '${targetEntity}'`, 400, "INVALID_TARGET_ENTITY");
    }

    if (!sourceType) {
        throw new AppError("Source type is required (e.g. CSV, EXCEL, JSON, GOOGLE_SHEETS, POSTGRESQL)", 400, "MISSING_SOURCE_TYPE");
    }

    if (!rawData) {
        throw new AppError("Data payload is required for import initialization", 400, "MISSING_RAW_DATA");
    }

    // Parse data according to source format
    let records = [];
    if (sourceType === "CSV" || typeof rawData === "string" && rawData.includes(",") && rawData.includes("\n")) {
        records = parseCsv(rawData);
    } else {
        records = parseJson(rawData);
    }

    if (!records || records.length === 0) {
        throw new AppError("Uploaded file contained zero parseable data records", 400, "NO_RECORDS_FOUND");
    }

    const jobCode = await generateJobCode();
    const detectedHeaders = Object.keys(records[0] || {});
    const previewRecords = records.slice(0, 10);
    const sizeBytes = fileSizeBytes || (typeof rawData === "string" ? Buffer.byteLength(rawData, "utf8") : 1024);

    // Create Job and Record Items in database
    const job = await prisma.migrationJob.create({
        data: {
            jobCode,
            targetEntity,
            sourceType,
            fileName: fileName || `dataset_${jobCode.toLowerCase()}.${sourceType.toLowerCase()}`,
            fileSizeBytes: sizeBytes,
            status: "UPLOADED",
            totalRecords: records.length,
            previewData: JSON.stringify(previewRecords),
            initiatedBy: initiatedBy || "SYSTEM_ADMIN"
        }
    });

    // Populate MigrationRecordItem for each row
    const recordItemData = records.map((row, idx) => ({
        jobId: job.id,
        rowNumber: idx + 1,
        sourceData: JSON.stringify(row),
        status: "PENDING"
    }));

    // Chunked createMany to stay within PostgreSQL parameter limits
    const CHUNK_SIZE = 100;
    for (let i = 0; i < recordItemData.length; i += CHUNK_SIZE) {
        const chunk = recordItemData.slice(i, i + CHUNK_SIZE);
        await prisma.migrationRecordItem.createMany({
            data: chunk
        });
    }

    logger.info(`Migration job ${job.jobCode} initialized with ${records.length} records for ${targetEntity}.`);

    return {
        job: {
            ...job,
            previewData: previewRecords
        },
        detectedHeaders,
        totalRecords: records.length,
        entitySpec: TARGET_ENTITIES[targetEntity]
    };
}

/**
 * 3. Apply Column Mappings, Validate Constraints and Flag Duplicates
 */
async function applyMappingAndValidate({
    jobId,
    columnMappings,
    saveAsTemplate = false,
    templateName,
    userId = "SYSTEM_ADMIN"
}) {
    if (!jobId) throw new AppError("Job ID is required", 400, "MISSING_JOB_ID");
    if (!columnMappings || typeof columnMappings !== "object") {
        throw new AppError("Column mappings configuration is required", 400, "MISSING_MAPPING_CONFIG");
    }

    const job = await prisma.migrationJob.findUnique({
        where: { id: jobId }
    });

    if (!job) throw new AppError(`Migration job with ID ${jobId} not found`, 404, "JOB_NOT_FOUND");
    if (["COMPLETED", "PROCESSING", "ROLLED_BACK"].includes(job.status)) {
        throw new AppError(`Job is currently in status '${job.status}' and mappings cannot be modified`, 400, "INVALID_JOB_STATE");
    }

    const hospitalId = await resolveHospitalId();
    const recordItems = await prisma.migrationRecordItem.findMany({
        where: { jobId: job.id },
        orderBy: { rowNumber: "asc" }
    });

    const targetSpec = TARGET_ENTITIES[job.targetEntity];
    if (!targetSpec) throw new AppError(`Target entity ${job.targetEntity} spec missing`, 400, "UNKNOWN_TARGET");

    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    const validationErrorsSummary = [];

    // Track batch duplicates within the same import dataset
    const seenBatchKeys = new Set();

    for (const item of recordItems) {
        let sourceRow = {};
        try {
            sourceRow = JSON.parse(item.sourceData);
        } catch (e) {
            sourceRow = {};
        }

        // Apply mappings: targetProperty = sourceRow[sourceColumn]
        const mappedData = {};
        for (const [targetKey, sourceCol] of Object.entries(columnMappings)) {
            if (sourceRow[sourceCol] !== undefined) {
                mappedData[targetKey] = sourceRow[sourceCol];
            }
        }

        // 1. Validation Rule Check
        const errors = validateEntityRecord(mappedData, job.targetEntity);

        let rowStatus = "VALID";
        let errorMessage = null;

        if (errors.length > 0) {
            rowStatus = "INVALID";
            errorMessage = errors.join("; ");
            invalidCount++;
            if (validationErrorsSummary.length < 25) {
                validationErrorsSummary.push({ rowNumber: item.rowNumber, errors });
            }
        } else {
            // 2. Duplicate Detection Check
            let isDuplicate = false;
            let duplicateReason = "";

            if (job.targetEntity === "PATIENTS") {
                const { nationalId, nhisNumber, firstName, lastName, dateOfBirth } = mappedData;
                const batchKey = nationalId ? `NID:${nationalId}` : (nhisNumber ? `NHIS:${nhisNumber}` : `NAME:${firstName}_${lastName}_${dateOfBirth}`);

                if (seenBatchKeys.has(batchKey)) {
                    isDuplicate = true;
                    duplicateReason = "Duplicate record within the same import file";
                } else {
                    seenBatchKeys.add(batchKey);

                    // Check PostgreSQL
                    let existing = null;
                    if (nationalId) {
                        existing = await prisma.patient.findFirst({ where: { nationalId } });
                    }
                    if (!existing && nhisNumber) {
                        existing = await prisma.patient.findFirst({ where: { nhisNumber } });
                    }
                    if (!existing && firstName && lastName && dateOfBirth) {
                        const dob = new Date(dateOfBirth);
                        if (!isNaN(dob.getTime())) {
                            existing = await prisma.patient.findFirst({
                                where: {
                                    firstName: { equals: firstName, mode: "insensitive" },
                                    lastName: { equals: lastName, mode: "insensitive" },
                                    dateOfBirth: dob
                                }
                            });
                        }
                    }

                    if (existing) {
                        isDuplicate = true;
                        duplicateReason = `Already exists in hospital registry (MRN: ${existing.patientNumber})`;
                    }
                }
            } else if (job.targetEntity === "INVENTORY_ITEMS") {
                const itemName = mappedData.name ? mappedData.name.trim() : "";
                const batchKey = `ITEM:${itemName.toLowerCase()}`;

                if (seenBatchKeys.has(batchKey)) {
                    isDuplicate = true;
                    duplicateReason = "Duplicate item within import file";
                } else {
                    seenBatchKeys.add(batchKey);
                    const existingItem = await prisma.pharmacyItem.findFirst({
                        where: {
                            hospitalId,
                            name: { equals: itemName, mode: "insensitive" }
                        }
                    });
                    if (existingItem) {
                        isDuplicate = true;
                        duplicateReason = `Item '${itemName}' already exists in pharmacy catalog (${existingItem.itemCode})`;
                    }
                }
            } else if (job.targetEntity === "BILLING_TARIFFS") {
                const code = mappedData.code ? mappedData.code.trim().toUpperCase() : "";
                const batchKey = `TARIFF:${code}`;

                if (seenBatchKeys.has(batchKey)) {
                    isDuplicate = true;
                    duplicateReason = "Duplicate tariff code within import file";
                } else {
                    seenBatchKeys.add(batchKey);
                    const existingTariff = await prisma.billingTariffItem.findFirst({
                        where: { code }
                    });
                    if (existingTariff) {
                        isDuplicate = true;
                        duplicateReason = `Tariff code '${code}' already exists in tariff catalog`;
                    }
                }
            } else if (job.targetEntity === "STAFF_RECORDS") {
                const email = mappedData.email ? mappedData.email.trim().toLowerCase() : null;
                const license = mappedData.licenseNumber ? mappedData.licenseNumber.trim() : null;

                if (email && seenBatchKeys.has(`STAFF_EMAIL:${email}`)) {
                    isDuplicate = true;
                    duplicateReason = "Duplicate staff email in import file";
                } else if (license && seenBatchKeys.has(`STAFF_LIC:${license}`)) {
                    isDuplicate = true;
                    duplicateReason = "Duplicate license number in import file";
                } else {
                    if (email) seenBatchKeys.add(`STAFF_EMAIL:${email}`);
                    if (license) seenBatchKeys.add(`STAFF_LIC:${license}`);

                    let existingStaff = null;
                    if (email) {
                        existingStaff = await prisma.hospitalStaff.findFirst({ where: { email } });
                    }
                    if (!existingStaff && license) {
                        existingStaff = await prisma.hospitalStaff.findFirst({ where: { licenseNumber: license } });
                    }
                    if (existingStaff) {
                        isDuplicate = true;
                        duplicateReason = `Staff member '${existingStaff.firstName} ${existingStaff.lastName}' already registered`;
                    }
                }
            }

            if (isDuplicate) {
                rowStatus = "DUPLICATE";
                errorMessage = duplicateReason;
                duplicateCount++;
            } else {
                rowStatus = "VALID";
                validCount++;
            }
        }

        // Update record item
        await prisma.migrationRecordItem.update({
            where: { id: item.id },
            data: {
                mappedData: JSON.stringify(mappedData),
                status: rowStatus,
                errorMessage
            }
        });
    }

    // Save as reusable template if requested
    if (saveAsTemplate && templateName) {
        const cleanName = templateName.trim();
        await prisma.migrationTemplate.upsert({
            where: { name: cleanName },
            create: {
                name: cleanName,
                targetEntity: job.targetEntity,
                sourceType: job.sourceType,
                columnMappings: JSON.stringify(columnMappings),
                createdBy: userId
            },
            update: {
                targetEntity: job.targetEntity,
                sourceType: job.sourceType,
                columnMappings: JSON.stringify(columnMappings)
            }
        });
    }

    // Update MigrationJob state
    const updatedJob = await prisma.migrationJob.update({
        where: { id: job.id },
        data: {
            status: "PREVIEW_READY",
            mappingConfig: JSON.stringify(columnMappings),
            validRecords: validCount,
            duplicateRecords: duplicateCount,
            invalidRecords: invalidCount,
            validationErrors: JSON.stringify(validationErrorsSummary)
        }
    });

    const samplePreviewItems = await prisma.migrationRecordItem.findMany({
        where: { jobId: job.id },
        take: 10,
        orderBy: { rowNumber: "asc" }
    });

    return {
        job: updatedJob,
        summary: {
            total: recordItems.length,
            valid: validCount,
            duplicate: duplicateCount,
            invalid: invalidCount
        },
        sampleItems: samplePreviewItems.map(i => ({
            ...i,
            sourceData: JSON.parse(i.sourceData),
            mappedData: i.mappedData ? JSON.parse(i.mappedData) : null
        }))
    };
}

/**
 * 4. Human Approval Gate
 */
async function approveMigrationJob({ jobId, approvedBy = "SYSTEM_ADMIN" }) {
    if (!jobId) throw new AppError("Job ID is required", 400, "MISSING_JOB_ID");

    const job = await prisma.migrationJob.findUnique({ where: { id: jobId } });
    if (!job) throw new AppError(`Migration job ${jobId} not found`, 404, "JOB_NOT_FOUND");

    if (!["PREVIEW_READY", "VALIDATED", "UPLOADED"].includes(job.status)) {
        throw new AppError(`Job cannot be approved from status '${job.status}'`, 400, "INVALID_JOB_STATE");
    }

    const updated = await prisma.migrationJob.update({
        where: { id: jobId },
        data: {
            status: "APPROVED",
            approvedBy
        }
    });

    logger.info(`Migration job ${job.jobCode} approved by ${approvedBy}.`);
    return updated;
}

/**
 * 5. Execute Background Import into Target PostgreSQL Entities
 */
async function executeImport({ jobId, duplicateStrategy = "SKIP", importedBy = "SYSTEM_ADMIN" }) {
    if (!jobId) throw new AppError("Job ID is required", 400, "MISSING_JOB_ID");

    const job = await prisma.migrationJob.findUnique({
        where: { id: jobId }
    });
    if (!job) throw new AppError(`Migration job ${jobId} not found`, 404, "JOB_NOT_FOUND");

    if (!["APPROVED", "PREVIEW_READY"].includes(job.status)) {
        throw new AppError(`Job must be APPROVED before execution (Current: ${job.status})`, 400, "JOB_NOT_APPROVED");
    }

    // Set status to PROCESSING
    await prisma.migrationJob.update({
        where: { id: jobId },
        data: {
            status: "PROCESSING",
            startedAt: new Date()
        }
    });

    const hospitalId = await resolveHospitalId();
    const records = await prisma.migrationRecordItem.findMany({
        where: { jobId: job.id },
        orderBy: { rowNumber: "asc" }
    });

    let importedCount = 0;
    let failedCount = 0;
    const createdEntities = [];

    for (const item of records) {
        if (item.status === "INVALID") {
            failedCount++;
            continue;
        }

        if (item.status === "DUPLICATE" && duplicateStrategy === "SKIP") {
            continue;
        }

        let mapped = {};
        try {
            mapped = JSON.parse(item.mappedData || "{}");
        } catch (e) {
            mapped = {};
        }

        try {
            let destinationId = null;

            if (job.targetEntity === "PATIENTS") {
                const patientNumber = await generatePatientMRN();
                const dob = mapped.dateOfBirth ? new Date(mapped.dateOfBirth) : new Date("1990-01-01");
                const gender = mapped.gender ? String(mapped.gender).toUpperCase() : "OTHER";
                const cleanGender = ["MALE", "FEMALE", "OTHER"].includes(gender) ? gender : (gender === "M" ? "MALE" : (gender === "F" ? "FEMALE" : "OTHER"));

                const newPatient = await prisma.patient.create({
                    data: {
                        patientNumber,
                        firstName: mapped.firstName ? mapped.firstName.trim() : "Unknown",
                        lastName: mapped.lastName ? mapped.lastName.trim() : "Patient",
                        gender: cleanGender,
                        dateOfBirth: isNaN(dob.getTime()) ? new Date("1990-01-01") : dob,
                        phone: mapped.phone || null,
                        nationalId: mapped.nationalId || null,
                        nhisNumber: mapped.nhisNumber || null,
                        address: mapped.address || null,
                        bloodGroup: mapped.bloodGroup || null,
                        hospitalId
                    }
                });
                destinationId = newPatient.id;
                createdEntities.push({ entity: "Patient", id: newPatient.id });

            } else if (job.targetEntity === "INVENTORY_ITEMS") {
                const itemCode = await generateItemCode();
                const unitPrice = mapped.unitPrice ? parseFloat(mapped.unitPrice) : 0.0;
                const reorder = mapped.reorderLevel ? parseInt(mapped.reorderLevel, 10) : 10;

                const newItem = await prisma.pharmacyItem.create({
                    data: {
                        itemCode,
                        name: mapped.name ? mapped.name.trim() : "Imported Item",
                        genericName: mapped.genericName || mapped.name || null,
                        dosageForm: mapped.dosageForm || "TABLET",
                        strength: mapped.strength || null,
                        category: mapped.category || "GENERAL",
                        unitPrice: isNaN(unitPrice) ? 0.0 : unitPrice,
                        reorderLevel: isNaN(reorder) ? 10 : reorder,
                        hospitalId
                    }
                });
                destinationId = newItem.id;
                createdEntities.push({ entity: "PharmacyItem", id: newItem.id });

            } else if (job.targetEntity === "BILLING_TARIFFS") {
                const code = mapped.code ? mapped.code.trim().toUpperCase() : `TRF-${Date.now()}`;
                const cashPrice = mapped.standardCashPrice ? parseFloat(mapped.standardCashPrice) : 10.0;
                const nhisPrice = mapped.nhisPrice ? parseFloat(mapped.nhisPrice) : 0.0;

                const newTariff = await prisma.billingTariffItem.create({
                    data: {
                        code,
                        name: mapped.name ? mapped.name.trim() : "Imported Tariff Item",
                        category: mapped.category || "GENERAL",
                        standardCashPrice: isNaN(cashPrice) ? 10.0 : cashPrice,
                        nhisPrice: isNaN(nhisPrice) ? 0.0 : nhisPrice,
                        nhisCovered: mapped.nhisCovered !== false,
                        privateInsurancePrice: isNaN(cashPrice) ? 12.0 : cashPrice * 1.2
                    }
                });
                destinationId = newTariff.id;
                createdEntities.push({ entity: "BillingTariffItem", id: newTariff.id });

            } else if (job.targetEntity === "STAFF_RECORDS") {
                const empCode = `STF-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 899 + 100)}`;
                const roleUpper = mapped.role ? mapped.role.toUpperCase() : "NURSE";
                const staffType = roleUpper.includes("DOCTOR") || roleUpper.includes("PHYSICIAN") ? "DOCTOR"
                    : (roleUpper.includes("NURSE") ? "NURSE" : (roleUpper.includes("PHARMAC") ? "PHARMACIST" : "OTHER"));

                const newStaff = await prisma.hospitalStaff.create({
                    data: {
                        hospitalId,
                        employeeCode: empCode,
                        firstName: mapped.firstName ? mapped.firstName.trim() : "Staff",
                        lastName: mapped.lastName ? mapped.lastName.trim() : "Member",
                        email: mapped.email ? mapped.email.trim() : null,
                        licenseNumber: mapped.licenseNumber ? mapped.licenseNumber.trim() : null,
                        department: mapped.department || "GENERAL_OPD",
                        position: mapped.role || "Clinical Staff",
                        staffType
                    }
                });
                destinationId = newStaff.id;
                createdEntities.push({ entity: "HospitalStaff", id: newStaff.id });
            }

            // Mark record item as IMPORTED
            await prisma.migrationRecordItem.update({
                where: { id: item.id },
                data: {
                    status: "IMPORTED",
                    destinationId
                }
            });
            importedCount++;

        } catch (insertErr) {
            logger.error(`Error importing row ${item.rowNumber} for job ${job.jobCode}: ${insertErr.message}`);
            await prisma.migrationRecordItem.update({
                where: { id: item.id },
                data: {
                    status: "FAILED",
                    errorMessage: insertErr.message
                }
            });
            failedCount++;
        }
    }

    // Update job status to COMPLETED
    const completedJob = await prisma.migrationJob.update({
        where: { id: job.id },
        data: {
            status: "COMPLETED",
            importedRecords: importedCount,
            failedRecords: failedCount,
            completedAt: new Date(),
            rollbackLog: JSON.stringify(createdEntities)
        }
    });

    // Record in Audit Log
    try {
        await prisma.auditLog.create({
            data: {
                module: "MIGRATION_SERVICE",
                action: "DATA_IMPORT_COMPLETED",
                description: `Migration Job ${job.jobCode} (${job.targetEntity}) executed: ${importedCount} records imported, ${failedCount} failed.`
            }
        });
    } catch (auditErr) {
        logger.warn(`Failed to write migration audit log: ${auditErr.message}`);
    }

    return {
        job: completedJob,
        summary: {
            total: records.length,
            imported: importedCount,
            failed: failedCount
        }
    };
}

/**
 * 6. Atomic Rollback of Migration Job
 */
async function rollbackMigrationJob({ jobId, rolledBackBy = "SYSTEM_ADMIN", reason = "Administrative rollback request" }) {
    if (!jobId) throw new AppError("Job ID is required", 400, "MISSING_JOB_ID");

    const job = await prisma.migrationJob.findUnique({ where: { id: jobId } });
    if (!job) throw new AppError(`Migration job ${jobId} not found`, 404, "JOB_NOT_FOUND");

    if (job.status !== "COMPLETED") {
        throw new AppError(`Only COMPLETED migration jobs can be rolled back (Current status: ${job.status})`, 400, "INVALID_ROLLBACK_STATE");
    }

    let createdEntities = [];
    try {
        createdEntities = JSON.parse(job.rollbackLog || "[]");
    } catch (e) {
        createdEntities = [];
    }

    let deletedCount = 0;

    // Delete created entities in reverse order
    for (let i = createdEntities.length - 1; i >= 0; i--) {
        const item = createdEntities[i];
        try {
            if (item.entity === "Patient") {
                await prisma.patient.delete({ where: { id: item.id } }).catch(() => null);
                deletedCount++;
            } else if (item.entity === "PharmacyItem") {
                await prisma.pharmacyItem.delete({ where: { id: item.id } }).catch(() => null);
                deletedCount++;
            } else if (item.entity === "BillingTariffItem") {
                await prisma.billingTariffItem.delete({ where: { id: item.id } }).catch(() => null);
                deletedCount++;
            } else if (item.entity === "HospitalStaff") {
                await prisma.hospitalStaff.delete({ where: { id: item.id } }).catch(() => null);
                deletedCount++;
            }
        } catch (delErr) {
            logger.warn(`Error during rollback deletion of ${item.entity} ${item.id}: ${delErr.message}`);
        }
    }

    // Mark record items as ROLLED_BACK
    await prisma.migrationRecordItem.updateMany({
        where: {
            jobId: job.id,
            status: "IMPORTED"
        },
        data: {
            status: "ROLLED_BACK"
        }
    });

    // Update job status
    const rolledBackJob = await prisma.migrationJob.update({
        where: { id: job.id },
        data: {
            status: "ROLLED_BACK",
            rollbackAt: new Date()
        }
    });

    // Write Audit Log
    try {
        await prisma.auditLog.create({
            data: {
                module: "MIGRATION_SERVICE",
                action: "DATA_IMPORT_ROLLED_BACK",
                description: `Migration Job ${job.jobCode} rolled back: ${deletedCount} entities reverted. Reason: ${reason} (by ${rolledBackBy})`
            }
        });
    } catch (auditErr) {
        logger.warn(`Failed to write migration audit log: ${auditErr.message}`);
    }

    return {
        success: true,
        job: rolledBackJob,
        revertedCount: deletedCount,
        reason
    };
}

/**
 * 7. List Migration Jobs with Filters & Pagination
 */
async function getMigrationJobs({ page = 1, limit = 20, status, targetEntity, search } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status) where.status = status;
    if (targetEntity) where.targetEntity = targetEntity;
    if (search) {
        where.OR = [
            { jobCode: { contains: search, mode: "insensitive" } },
            { fileName: { contains: search, mode: "insensitive" } },
            { initiatedBy: { contains: search, mode: "insensitive" } }
        ];
    }

    const [total, jobs] = await Promise.all([
        prisma.migrationJob.count({ where }),
        prisma.migrationJob.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { createdAt: "desc" }
        })
    ]);

    return {
        jobs,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
        }
    };
}

/**
 * 8. Get Single Migration Job Details with Records
 */
async function getJobDetails(jobId) {
    if (!jobId) throw new AppError("Job ID is required", 400, "MISSING_JOB_ID");

    const job = await prisma.migrationJob.findUnique({
        where: { id: jobId },
        include: {
            records: {
                orderBy: { rowNumber: "asc" }
            }
        }
    });

    if (!job) throw new AppError(`Migration job ${jobId} not found`, 404, "JOB_NOT_FOUND");

    return {
        ...job,
        mappingConfig: job.mappingConfig ? JSON.parse(job.mappingConfig) : null,
        validationErrors: job.validationErrors ? JSON.parse(job.validationErrors) : null,
        previewData: job.previewData ? JSON.parse(job.previewData) : null,
        rollbackLog: job.rollbackLog ? JSON.parse(job.rollbackLog) : null,
        records: job.records.map(r => ({
            ...r,
            sourceData: JSON.parse(r.sourceData),
            mappedData: r.mappedData ? JSON.parse(r.mappedData) : null
        }))
    };
}

/**
 * 9. Save Template
 */
async function saveTemplate({ name, targetEntity, sourceType, columnMappings, transformationRules, createdBy = "SYSTEM_ADMIN" }) {
    if (!name || !targetEntity || !sourceType || !columnMappings) {
        throw new AppError("Missing mandatory template fields", 400, "MISSING_TEMPLATE_FIELDS");
    }

    return await prisma.migrationTemplate.upsert({
        where: { name: name.trim() },
        create: {
            name: name.trim(),
            targetEntity,
            sourceType,
            columnMappings: typeof columnMappings === "string" ? columnMappings : JSON.stringify(columnMappings),
            transformationRules: transformationRules ? (typeof transformationRules === "string" ? transformationRules : JSON.stringify(transformationRules)) : null,
            createdBy
        },
        update: {
            targetEntity,
            sourceType,
            columnMappings: typeof columnMappings === "string" ? columnMappings : JSON.stringify(columnMappings),
            transformationRules: transformationRules ? (typeof transformationRules === "string" ? transformationRules : JSON.stringify(transformationRules)) : null
        }
    });
}

/**
 * 10. List Templates
 */
async function getTemplates({ targetEntity, sourceType } = {}) {
    const where = {};
    if (targetEntity) where.targetEntity = targetEntity;
    if (sourceType) where.sourceType = sourceType;

    const templates = await prisma.migrationTemplate.findMany({
        where,
        orderBy: { createdAt: "desc" }
    });

    return templates.map(t => ({
        ...t,
        columnMappings: JSON.parse(t.columnMappings),
        transformationRules: t.transformationRules ? JSON.parse(t.transformationRules) : null
    }));
}

/**
 * 11. High-Precision Migration Telemetry
 */
async function getMigrationTelemetry() {
    const [
        totalJobs,
        completedJobs,
        rolledBackJobs,
        activeJobs,
        targetBreakdown,
        sourceBreakdown,
        allJobsSummary,
        recentJobs
    ] = await Promise.all([
        prisma.migrationJob.count(),
        prisma.migrationJob.count({ where: { status: "COMPLETED" } }),
        prisma.migrationJob.count({ where: { status: "ROLLED_BACK" } }),
        prisma.migrationJob.count({ where: { status: { in: ["UPLOADED", "PREVIEW_READY", "APPROVED", "PROCESSING"] } } }),
        prisma.migrationJob.groupBy({
            by: ["targetEntity"],
            _count: { id: true }
        }),
        prisma.migrationJob.groupBy({
            by: ["sourceType"],
            _count: { id: true }
        }),
        prisma.migrationJob.aggregate({
            _sum: {
                totalRecords: true,
                importedRecords: true,
                failedRecords: true,
                duplicateRecords: true
            }
        }),
        prisma.migrationJob.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                jobCode: true,
                targetEntity: true,
                sourceType: true,
                fileName: true,
                status: true,
                totalRecords: true,
                importedRecords: true,
                createdAt: true
            }
        })
    ]);

    const totalProcessed = allJobsSummary._sum.totalRecords || 0;
    const totalImported = allJobsSummary._sum.importedRecords || 0;
    const totalFailed = allJobsSummary._sum.failedRecords || 0;
    const totalDuplicates = allJobsSummary._sum.duplicateRecords || 0;
    const successRate = totalProcessed > 0 ? Number(((totalImported / totalProcessed) * 100).toFixed(1)) : 100.0;

    return {
        totalJobs,
        completedJobs,
        rolledBackJobs,
        activeJobs,
        totalRecordsProcessed: totalProcessed,
        totalRecordsImported: totalImported,
        totalRecordsFailed: totalFailed,
        totalDuplicatesDetected: totalDuplicates,
        overallSuccessRate: successRate,
        targetBreakdown: targetBreakdown.map(tb => ({ entity: tb.targetEntity, count: tb._count.id })),
        sourceBreakdown: sourceBreakdown.map(sb => ({ source: sb.sourceType, count: sb._count.id })),
        recentJobs
    };
}

module.exports = {
    getMigrationCatalogs,
    initializeMigrationJob,
    applyMappingAndValidate,
    approveMigrationJob,
    executeImport,
    rollbackMigrationJob,
    getMigrationJobs,
    getJobDetails,
    saveTemplate,
    getTemplates,
    getMigrationTelemetry
};
