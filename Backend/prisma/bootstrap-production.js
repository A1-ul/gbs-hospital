"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
PRODUCTION-SAFE IDEMPOTENT DATABASE BOOTSTRAP
CommonJS Only — Zero Demo Data, Zero Password Overwrites
LOCATION: Backend/prisma/bootstrap-production.js
====================================================
*/

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { ALL_ROLES } = require("../src/config/roles");
const { ALL_PERMISSIONS, ROLE_PERMISSIONS_MAP } = require("../src/core/security/permissions");

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function bootstrapProduction() {
    console.log("Running GBS Hospital Production-Safe Idempotent Bootstrap...");

    await prisma.$transaction(async (tx) => {
        // 1. Ensure Canonical Unified Permissions (82 permissions)
        const permMap = {};
        for (const name of ALL_PERMISSIONS) {
            const perm = await tx.permission.upsert({
                where: { name },
                update: {},
                create: { name, description: `${name} hospital permission` }
            });
            permMap[name] = perm;
        }

        // 2. Ensure Exact 16 Blueprint Roles & Permission Mappings
        const roleRecords = {};
        for (const name of ALL_ROLES) {
            const role = await tx.role.upsert({
                where: { name },
                update: {},
                create: { name, description: `${name} hospital enterprise role` }
            });
            roleRecords[name] = role;
        }

        // 3. Cleanly retire legacy SUPER_ADMIN / ADMIN roles if present
        for (const legacyName of ["SUPER_ADMIN", "ADMIN"]) {
            const legacyRole = await tx.role.findUnique({ where: { name: legacyName } });
            if (legacyRole && roleRecords.ADMINISTRATOR) {
                await tx.user.updateMany({
                    where: { roleId: legacyRole.id },
                    data: { roleId: roleRecords.ADMINISTRATOR.id }
                });
                await tx.role.delete({ where: { id: legacyRole.id } });
            }
        }

        for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS_MAP)) {
            const role = roleRecords[roleName];
            if (!role) continue;
            const permConnect = permNames
                .map((p) => permMap[p])
                .filter(Boolean)
                .map((p) => ({ id: p.id }));
            await tx.role.update({
                where: { id: role.id },
                data: { permissions: { set: permConnect } }
            });
        }

        // 4. Create Root Developer ONLY IF ABSENT and DEVELOPER_ROOT_PASSWORD is set via environment
        const devEmail = (process.env.DEVELOPER_ROOT_EMAIL || "gabosei48@gmail.com").trim().toLowerCase();
        const devPassword = String(process.env.DEVELOPER_ROOT_PASSWORD || "").trim();
        const existingDev = await tx.user.findUnique({ where: { email: devEmail } });

        if (!existingDev && devPassword.length >= 8) {
            const hashedPassword = await bcrypt.hash(devPassword, SALT_ROUNDS);
            await tx.user.create({
                data: {
                    firstName: "Gabriel",
                    lastName: "Osei",
                    email: devEmail,
                    password: hashedPassword,
                    roleId: roleRecords.DEVELOPER.id,
                    active: true
                }
            });
            console.log(`Initialized Permanent Root Developer account: ${devEmail}`);
        } else if (existingDev) {
            console.log(`Root Developer account already present (password preserved): ${devEmail}`);
        } else {
            console.warn("DEVELOPER_ROOT_PASSWORD not set; skipping initial Root Developer creation.");
        }

        // 5. Create Initial Hospital Administrator ONLY IF ABSENT and BOOTSTRAP_ADMIN_PASSWORD is set
        const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@gbs.com").trim().toLowerCase();
        const adminPassword = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || "").trim();
        const existingAdmin = await tx.user.findUnique({ where: { email: adminEmail } });

        if (!existingAdmin && adminPassword.length >= 8) {
            const hashedAdminPass = await bcrypt.hash(adminPassword, SALT_ROUNDS);
            await tx.user.create({
                data: {
                    firstName: "Hospital",
                    lastName: "Administrator",
                    email: adminEmail,
                    password: hashedAdminPass,
                    roleId: roleRecords.ADMINISTRATOR.id,
                    active: true
                }
            });
            console.log(`Initialized Bootstrap Hospital Administrator account: ${adminEmail}`);
        }
    }, { maxWait: 40000, timeout: 80000 });

    console.log(`Production bootstrap completed cleanly (${ALL_ROLES.length} roles & ${ALL_PERMISSIONS.length} permissions verified, zero demo records created).`);
}

if (require.main === module) {
    bootstrapProduction()
        .then(async () => {
            await prisma.$disconnect();
            process.exit(0);
        })
        .catch(async (err) => {
            console.error("Production bootstrap error:", err.message);
            await prisma.$disconnect();
            process.exit(1);
        });
}

module.exports = {
    ALL_PERMISSIONS,
    ROLES: ALL_ROLES,
    ROLE_PERMISSIONS_MAP,
    bootstrapProduction
};
