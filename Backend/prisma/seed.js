"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
DATABASE SECURITY SEED
Production Hardened - CommonJS Only
Master Blueprint 16-Role Alignment
LOCATION: prisma/seed.js
====================================================
*/

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

const ALL_PERMISSIONS = [
    // SYSTEM & DEVELOPER
    "SYSTEM_ADMIN",
    "SYSTEM_SETTINGS",
    "SYSTEM_MONITOR",
    "DEVELOPER_ACCESS",
    "REMOTE_CONTROL",
    "DIAGNOSTICS_VIEW",
    "TENANT_MANAGE",

    // USER MANAGEMENT
    "USER_CREATE",
    "USER_READ",
    "USER_UPDATE",
    "USER_DELETE",
    "USER_APPROVE",

    // HOSPITAL CONFIGURATION
    "HOSPITAL_CREATE",
    "HOSPITAL_READ",
    "HOSPITAL_UPDATE",
    "HOSPITAL_DELETE",
    "HOSPITAL_BRANCH_CREATE",
    "HOSPITAL_BRANCH_READ",
    "HOSPITAL_BRANCH_UPDATE",
    "HOSPITAL_BRANCH_DELETE",

    // PATIENT MANAGEMENT
    "PATIENT_CREATE",
    "PATIENT_READ",
    "PATIENT_UPDATE",
    "PATIENT_DELETE",

    // CLINICAL CARE & CONSULTATIONS
    "DOCTOR_CONSULT",
    "DOCTOR_CREATE",
    "DOCTOR_READ",
    "DOCTOR_UPDATE",
    "DOCTOR_DELETE",
    "DIAGNOSIS_CREATE",
    "TREATMENT_PLAN",

    // SURGICAL
    "SURGERY_SCHEDULE",
    "SURGERY_PERFORM",
    "OT_MANAGE",

    // DENTAL
    "DENTAL_RECORD_CREATE",
    "DENTAL_PROCEDURE_LOG",

    // EYE CARE
    "EYE_EXAM_CREATE",
    "VISION_TEST_LOG",

    // RADIOLOGY
    "RADIOLOGY_REQUEST",
    "RADIOLOGY_SCAN_UPLOAD",
    "RADIOLOGY_REPORT_SIGN",
    "DICOM_VIEW",

    // NURSING & VITALS
    "VITALS_RECORD",
    "NURSE_MEDICATION_ADMIN",
    "PATIENT_CARE_NOTE",

    // MEDICAL RECORDS & ARCHIVES
    "MEDICAL_RECORD_CREATE",
    "MEDICAL_RECORD_READ",
    "MEDICAL_RECORD_UPDATE",
    "MEDICAL_RECORD_DELETE",
    "FOLDER_RETRIEVAL_DISPATCH",
    "ARCHIVE_MANAGE",

    // APPOINTMENT & QUEUE
    "APPOINTMENT_CREATE",
    "APPOINTMENT_READ",
    "APPOINTMENT_UPDATE",
    "APPOINTMENT_CANCEL",
    "QUEUE_MANAGE",

    // PHARMACY & INVENTORY
    "MEDICATION_CREATE",
    "MEDICATION_READ",
    "MEDICATION_UPDATE",
    "MEDICATION_DELETE",
    "PRESCRIPTION_DISPENSE",
    "INVENTORY_MANAGE",
    "DRUG_INTERACTION_CHECK",

    // BILLING & INSURANCE
    "BILLING_CREATE",
    "BILLING_READ",
    "BILLING_UPDATE",
    "BILLING_REFUND",
    "INSURANCE_CLAIM_PROCESS",

    // HR & WORKFORCE
    "HR_STAFF_MANAGE",
    "ATTENDANCE_LOG",
    "PAYROLL_RUN",

    // REPORTING & AUDIT
    "REPORT_VIEW",
    "REPORT_EXPORT",
    "AUDIT_READ",
    "AUDIT_EXPORT"
];

const ROLES = [
    "DEVELOPER",
    "SUPER_ADMIN",
    "ADMINISTRATOR",
    "HOSPITAL_DIRECTOR",
    "DOCTOR",
    "SURGEON",
    "DENTIST",
    "EYE_DOCTOR",
    "RADIOLOGIST",
    "NURSE",
    "PHARMACIST",
    "LAB_TECHNICIAN",
    "RECEPTIONIST",
    "FOLDER_RETRIEVER",
    "ACCOUNTANT",
    "HR_MANAGER",
    "PATIENT"
];

async function main() {
    console.log("Starting GBS Hospital Enterprise security bootstrap...");

    return await prisma.$transaction(async (tx) => {
        // 1. Upsert Permissions
        const permissionRecords = [];
        for (const permissionName of ALL_PERMISSIONS) {
            const permission = await tx.permission.upsert({
                where: { name: permissionName },
                update: {},
                create: {
                    name: permissionName,
                    description: `${permissionName} hospital permission`
                }
            });
            permissionRecords.push(permission);
        }
        console.log(`Permissions ready: ${permissionRecords.length} configured`);

        // 2. Upsert Roles
        const roleRecords = {};
        for (const roleName of ROLES) {
            const role = await tx.role.upsert({
                where: { name: roleName },
                update: {},
                create: {
                    name: roleName,
                    description: `${roleName} hospital enterprise role`
                }
            });
            roleRecords[roleName] = role;
        }
        console.log(`Roles ready: ${Object.keys(roleRecords).length} configured`);

        // 3. Grant All Permissions to DEVELOPER and SUPER_ADMIN
        const fullPermissionConnect = permissionRecords.map((p) => ({ id: p.id }));

        await tx.role.update({
            where: { id: roleRecords.DEVELOPER.id },
            data: { permissions: { set: fullPermissionConnect } }
        });

        await tx.role.update({
            where: { id: roleRecords.SUPER_ADMIN.id },
            data: { permissions: { set: fullPermissionConnect } }
        });

        await tx.role.update({
            where: { id: roleRecords.ADMINISTRATOR.id },
            data: {
                permissions: {
                    set: permissionRecords
                        .filter((p) => !["DEVELOPER_ACCESS", "REMOTE_CONTROL"].includes(p.name))
                        .map((p) => ({ id: p.id }))
                }
            }
        });

        console.log("Root roles (DEVELOPER, SUPER_ADMIN, ADMINISTRATOR) secured with enterprise permissions");

        // 4. Create Permanent Root Developer Account (gabosei48@gmail.com) & Test Developer Account
        const rootDevPassword = await bcrypt.hash(
            process.env.DEVELOPER_ROOT_PASSWORD || "0543294615Gab",
            SALT_ROUNDS
        );

        const rootDeveloper = await tx.user.upsert({
            where: { email: "gabosei48@gmail.com" },
            update: {
                firstName: "Gabriel",
                lastName: "Osei",
                roleId: roleRecords.DEVELOPER.id,
                active: true,
                password: rootDevPassword
            },
            create: {
                firstName: "Gabriel",
                lastName: "Osei",
                email: "gabosei48@gmail.com",
                password: rootDevPassword,
                roleId: roleRecords.DEVELOPER.id,
                active: true
            }
        });
        console.log("Permanent Root Developer Account ready:", rootDeveloper.email);

        const devPassword = await bcrypt.hash(
            process.env.DEVELOPER_PASSWORD || "Admin123",
            SALT_ROUNDS
        );

        const developer = await tx.user.upsert({
            where: { email: "developer@gbs.com" },
            update: {
                roleId: roleRecords.DEVELOPER.id,
                active: true,
                password: devPassword
            },
            create: {
                firstName: "GBS",
                lastName: "Developer",
                email: "developer@gbs.com",
                password: devPassword,
                roleId: roleRecords.DEVELOPER.id,
                active: true
            }
        });
        console.log("Permanent Developer Account ready:", developer.email);

        // 5. Create System Administrator Account
        const adminPassword = await bcrypt.hash(
            process.env.ADMIN_PASSWORD || "Admin123",
            SALT_ROUNDS
        );

        const admin = await tx.user.upsert({
            where: { email: "admin@gbs.com" },
            update: {
                roleId: roleRecords.ADMINISTRATOR.id,
                active: true,
                password: adminPassword
            },
            create: {
                firstName: "System",
                lastName: "Administrator",
                email: "admin@gbs.com",
                password: adminPassword,
                roleId: roleRecords.ADMINISTRATOR.id,
                active: true
            }
        });
        console.log("System Administrator Account ready:", admin.email);

        // 6. Validation
        const devCheck = await tx.role.findUnique({
            where: { id: roleRecords.DEVELOPER.id },
            include: { permissions: true }
        });

        if (!devCheck || devCheck.permissions.length !== ALL_PERMISSIONS.length) {
            throw new Error("DEVELOPER permission validation failed");
        }

        console.log(`DEVELOPER verified with ${devCheck.permissions.length} permissions`);
    }, { maxWait: 30000, timeout: 60000 });
}

main()
    .then(async () => {
        await prisma.$disconnect();
        console.log("GBS Enterprise Security bootstrap completed successfully");
    })
    .catch(async (error) => {
        console.error("Security bootstrap failed:", error.message);
        await prisma.$disconnect();
        process.exit(1);
    });