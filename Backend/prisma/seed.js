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
const { ALL_ROLES } = require("../src/config/roles");
const { ALL_PERMISSIONS, ROLE_PERMISSIONS_MAP } = require("../src/core/security/permissions");

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const ROLES = ALL_ROLES;

const ROOT_DEV_EMAIL = (process.env.DEVELOPER_ROOT_EMAIL || "gabosei48@gmail.com").trim().toLowerCase();
const ROOT_DEV_PASS =
    process.env.DEVELOPER_ROOT_PASSWORD ||
    (process.env.NODE_ENV === "production" ? "" : "DevBootstrap123!");

const DEFAULT_USERS = [
    ...(ROOT_DEV_PASS
        ? [{ email: ROOT_DEV_EMAIL, firstName: "Gabriel", lastName: "Osei", role: "DEVELOPER", pass: ROOT_DEV_PASS }]
        : []),
    { email: "developer@gbs.com", firstName: "GBS", lastName: "Developer", role: "DEVELOPER", pass: process.env.DEV_TEST_PASSWORD || "Admin123" },
    { email: "admin@gbs.com", firstName: "System", lastName: "Administrator", role: "ADMINISTRATOR", pass: process.env.ADMIN_TEST_PASSWORD || "Admin123" },
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
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_SEED_IN_PRODUCTION !== "true") {
        console.warn("Refusing to run development/test seed in PRODUCTION. Running safe production bootstrap instead.");
        const { bootstrapProduction } = require("./bootstrap-production");
        return await bootstrapProduction();
    }

    console.log("Starting GBS Hospital Enterprise security bootstrap (16-role alignment)...");

    return await prisma.$transaction(async (tx) => {
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

        // 2. Upsert Roles (Exact 16 Master Blueprint Roles)
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
        console.log(`Roles ready: ${Object.keys(roleRecords).length} configured (16 roles, no SUPER_ADMIN/ADMIN legacy roles)`);

        // 2b. Cleanly retire legacy SUPER_ADMIN / ADMIN roles if present
        for (const legacyName of ["SUPER_ADMIN", "ADMIN"]) {
            const legacyRole = await tx.role.findUnique({ where: { name: legacyName } });
            if (legacyRole && roleRecords.ADMINISTRATOR) {
                await tx.user.updateMany({
                    where: { roleId: legacyRole.id },
                    data: { roleId: roleRecords.ADMINISTRATOR.id }
                });
                await tx.role.delete({ where: { id: legacyRole.id } });
                console.log(`Legacy ${legacyName} role migrated to ADMINISTRATOR and removed.`);
            }
        }

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
