"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
DATABASE SECURITY SEED
Production Hardened - CommonJS Only
Master Blueprint 16-Role Alignment (SUPER_ADMIN removed)
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

// Clean 16-Role Architecture without SUPER_ADMIN
const ROLES = [
    "DEVELOPER",
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

const ROLE_PERMISSIONS_MAP = {
    DEVELOPER: ALL_PERMISSIONS,
    ADMINISTRATOR: ALL_PERMISSIONS.filter(p => !["DEVELOPER_ACCESS", "REMOTE_CONTROL"].includes(p)),
    HOSPITAL_DIRECTOR: [
        "SYSTEM_SETTINGS", "SYSTEM_MONITOR", "DIAGNOSTICS_VIEW", "USER_READ", "HOSPITAL_READ",
        "PATIENT_READ", "DOCTOR_READ", "REPORT_VIEW", "REPORT_EXPORT", "AUDIT_READ", "AUDIT_EXPORT",
        "MEDICAL_RECORD_READ", "APPOINTMENT_READ", "BILLING_READ"
    ],
    DOCTOR: [
        "DOCTOR_CONSULT", "DOCTOR_READ", "DOCTOR_CREATE", "DOCTOR_UPDATE", "DIAGNOSIS_CREATE",
        "TREATMENT_PLAN", "PATIENT_READ", "PATIENT_CREATE", "PATIENT_UPDATE", "MEDICAL_RECORD_READ",
        "MEDICAL_RECORD_CREATE", "MEDICAL_RECORD_UPDATE", "VITALS_RECORD", "RADIOLOGY_REQUEST",
        "DICOM_VIEW", "APPOINTMENT_READ", "APPOINTMENT_CREATE", "APPOINTMENT_UPDATE", "QUEUE_MANAGE",
        "DRUG_INTERACTION_CHECK", "REPORT_VIEW", "FOLDER_RETRIEVAL_DISPATCH"
    ],
    SURGEON: [
        "SURGERY_SCHEDULE", "SURGERY_PERFORM", "OT_MANAGE", "DOCTOR_CONSULT", "DOCTOR_READ",
        "DIAGNOSIS_CREATE", "TREATMENT_PLAN", "PATIENT_READ", "MEDICAL_RECORD_READ",
        "MEDICAL_RECORD_CREATE", "VITALS_RECORD", "RADIOLOGY_REQUEST", "DICOM_VIEW", "REPORT_VIEW"
    ],
    DENTIST: [
        "DENTAL_RECORD_CREATE", "DENTAL_PROCEDURE_LOG", "DOCTOR_CONSULT", "DOCTOR_READ",
        "DIAGNOSIS_CREATE", "TREATMENT_PLAN", "PATIENT_READ", "MEDICAL_RECORD_READ",
        "VITALS_RECORD", "REPORT_VIEW"
    ],
    EYE_DOCTOR: [
        "EYE_EXAM_CREATE", "VISION_TEST_LOG", "DOCTOR_CONSULT", "DOCTOR_READ",
        "DIAGNOSIS_CREATE", "TREATMENT_PLAN", "PATIENT_READ", "MEDICAL_RECORD_READ",
        "VITALS_RECORD", "REPORT_VIEW"
    ],
    RADIOLOGIST: [
        "RADIOLOGY_REQUEST", "RADIOLOGY_SCAN_UPLOAD", "RADIOLOGY_REPORT_SIGN", "DICOM_VIEW",
        "PATIENT_READ", "MEDICAL_RECORD_READ", "DOCTOR_READ", "REPORT_VIEW"
    ],
    NURSE: [
        "VITALS_RECORD", "NURSE_MEDICATION_ADMIN", "PATIENT_CARE_NOTE", "PATIENT_READ",
        "PATIENT_CREATE", "MEDICAL_RECORD_READ", "QUEUE_MANAGE", "APPOINTMENT_READ", "REPORT_VIEW"
    ],
    PHARMACIST: [
        "PRESCRIPTION_DISPENSE", "INVENTORY_MANAGE", "DRUG_INTERACTION_CHECK", "MEDICATION_READ",
        "MEDICATION_CREATE", "MEDICATION_UPDATE", "MEDICATION_DELETE", "PATIENT_READ",
        "MEDICAL_RECORD_READ", "REPORT_VIEW"
    ],
    LAB_TECHNICIAN: [
        "DIAGNOSTICS_VIEW", "PATIENT_READ", "MEDICAL_RECORD_READ", "DOCTOR_READ", "REPORT_VIEW"
    ],
    RECEPTIONIST: [
        "PATIENT_CREATE", "PATIENT_READ", "PATIENT_UPDATE", "APPOINTMENT_CREATE", "APPOINTMENT_READ",
        "APPOINTMENT_UPDATE", "APPOINTMENT_CANCEL", "QUEUE_MANAGE", "FOLDER_RETRIEVAL_DISPATCH",
        "BILLING_READ"
    ],
    FOLDER_RETRIEVER: [
        "FOLDER_RETRIEVAL_DISPATCH", "ARCHIVE_MANAGE", "MEDICAL_RECORD_READ", "MEDICAL_RECORD_UPDATE",
        "PATIENT_READ"
    ],
    ACCOUNTANT: [
        "BILLING_CREATE", "BILLING_READ", "BILLING_UPDATE", "BILLING_REFUND",
        "INSURANCE_CLAIM_PROCESS", "REPORT_VIEW", "REPORT_EXPORT", "AUDIT_READ"
    ],
    HR_MANAGER: [
        "HR_STAFF_MANAGE", "ATTENDANCE_LOG", "PAYROLL_RUN", "USER_READ", "USER_CREATE",
        "USER_UPDATE", "REPORT_VIEW"
    ],
    PATIENT: [
        "PATIENT_READ", "APPOINTMENT_CREATE", "APPOINTMENT_READ", "APPOINTMENT_CANCEL",
        "MEDICAL_RECORD_READ", "BILLING_READ"
    ]
};

const DEFAULT_USERS = [
    { email: "gabosei48@gmail.com", firstName: "Gabriel", lastName: "Osei", role: "DEVELOPER", pass: process.env.DEVELOPER_ROOT_PASSWORD || "0543294615Gab" },
    { email: "developer@gbs.com", firstName: "GBS", lastName: "Developer", role: "DEVELOPER", pass: "Admin123" },
    { email: "admin@gbs.com", firstName: "System", lastName: "Administrator", role: "ADMINISTRATOR", pass: "Admin123" },
    { email: "director@gbs.com", firstName: "Hospital", lastName: "Director", role: "HOSPITAL_DIRECTOR", pass: "Director123" },
    { email: "doctor@gbs.com", firstName: "Dr. Kwesi", lastName: "Mensah", role: "DOCTOR", pass: "Doctor123" },
    { email: "surgeon@gbs.com", firstName: "Dr. Ama", lastName: "Agyeman", role: "SURGEON", pass: "Surgeon123" },
    { email: "dentist@gbs.com", firstName: "Dr. Kofi", lastName: "Appiah", role: "DENTIST", pass: "Dentist123" },
    { email: "eyedoctor@gbs.com", firstName: "Dr. Efua", lastName: "Sutherland", role: "EYE_DOCTOR", pass: "EyeDoctor123" },
    { email: "radiologist@gbs.com", firstName: "Dr. Yaw", lastName: "Boateng", role: "RADIOLOGIST", pass: "Radiologist123" },
    { email: "nurse@gbs.com", firstName: "Sister Akosua", lastName: "Osei", role: "NURSE", pass: "Nurse123" },
    { email: "pharmacist@gbs.com", firstName: "Pharm. Kojo", lastName: "Ansah", role: "PHARMACIST", pass: "Pharmacist123" },
    { email: "lab@gbs.com", firstName: "Scientist Esi", lastName: "Tetteh", role: "LAB_TECHNICIAN", pass: "Lab123" },
    { email: "receptionist@gbs.com", firstName: "Adwoa", lastName: "Frimpong", role: "RECEPTIONIST", pass: "Receptionist123" },
    { email: "archivist@gbs.com", firstName: "Kwame", lastName: "Owusu", role: "FOLDER_RETRIEVER", pass: "Archivist123" },
    { email: "accountant@gbs.com", firstName: "Kofi", lastName: "Darko", role: "ACCOUNTANT", pass: "Accountant123" },
    { email: "hr@gbs.com", firstName: "Abena", lastName: "Asante", role: "HR_MANAGER", pass: "HrManager123" },
    { email: "patient@gbs.com", firstName: "Kwadwo", lastName: "Baah", role: "PATIENT", pass: "Patient123" }
];

async function main() {
    console.log("Starting GBS Hospital Enterprise security bootstrap (16-role alignment)...");

    return await prisma.$transaction(async (tx) => {
        // 0. Remove legacy SUPER_ADMIN role if present
        const superAdminRole = await tx.role.findUnique({ where: { name: "SUPER_ADMIN" } });
        if (superAdminRole) {
            // Reassign any users to ADMINISTRATOR
            const adminRole = await tx.role.findFirst({ where: { name: "ADMINISTRATOR" } });
            if (adminRole) {
                await tx.user.updateMany({
                    where: { roleId: superAdminRole.id },
                    data: { roleId: adminRole.id }
                });
            }
            await tx.role.delete({ where: { id: superAdminRole.id } });
            console.log("SUPER_ADMIN role safely removed from database.");
        }

        // 1. Upsert Permissions
        const permissionRecords = [];
        const permissionMapByName = {};
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
            permissionMapByName[permissionName] = permission;
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
        console.log(`Roles ready: ${Object.keys(roleRecords).length} configured (16 roles, no SUPER_ADMIN)`);

        // 3. Grant Permissions to all 16 roles
        for (const [roleName, allowedPermNames] of Object.entries(ROLE_PERMISSIONS_MAP)) {
            const role = roleRecords[roleName];
            if (!role) continue;
            const targetPerms = allowedPermNames
                .map((name) => permissionMapByName[name])
                .filter(Boolean)
                .map((p) => ({ id: p.id }));

            await tx.role.update({
                where: { id: role.id },
                data: { permissions: { set: targetPerms } }
            });
        }
        console.log("Enterprise permissions mapped to all 16 roles from users to developer.");

        // 4. Upsert Users for each of the 16 roles
        for (const userDef of DEFAULT_USERS) {
            const hashedPassword = await bcrypt.hash(userDef.pass, SALT_ROUNDS);
            const role = roleRecords[userDef.role];
            if (!role) continue;

            await tx.user.upsert({
                where: { email: userDef.email },
                update: {
                    firstName: userDef.firstName,
                    lastName: userDef.lastName,
                    roleId: role.id,
                    active: true,
                    password: hashedPassword
                },
                create: {
                    firstName: userDef.firstName,
                    lastName: userDef.lastName,
                    email: userDef.email,
                    password: hashedPassword,
                    roleId: role.id,
                    active: true
                }
            });
        }
        console.log(`Seeded and verified ${DEFAULT_USERS.length} active users across all roles.`);

        // 5. Verification
        const devCheck = await tx.role.findUnique({
            where: { id: roleRecords.DEVELOPER.id },
            include: { permissions: true }
        });

        if (!devCheck || devCheck.permissions.length !== ALL_PERMISSIONS.length) {
            throw new Error("DEVELOPER permission validation failed");
        }

        console.log(`DEVELOPER verified with ${devCheck.permissions.length} permissions`);
    }, { maxWait: 40000, timeout: 80000 });
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
