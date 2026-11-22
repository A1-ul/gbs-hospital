# GBS Hospital Management System — Enterprise Backend API

**Runtime:** Node.js 20+ (Strictly CommonJS — `require()` / `module.exports`)  
**Framework:** Express.js + Prisma ORM + PostgreSQL  
**API Prefix:** `/api/v1`

## Directory Structure
- `prisma/` — Authoritative PostgreSQL `schema.prisma` (116 models), `bootstrap-production.js` (idempotent zero-demo production initializer), and `seed.js` (non-production test/dev seed).
- `src/app.js` & `src/server.js` — Express application assembly, security headers, global `tenantAccessGuard`, RCCE traffic/audit middleware, API routes, and production `Frontend/dist` SPA static serving.
- `src/config/` — Environment loader (`environment.js`, `environment/environment.config.js`) and 16-role authorization registry (`roles.js`).
- `src/core/` — Shared Prisma client, JWT/session `auth.middleware.js`, `security.middleware.js`, unified 81-permission registry (`security/permissions.js`), `permission.middleware.js`, `role.middleware.js`, structured error handling, and Winston logger.
- `src/modules/` — 22 modular enterprise business domains (Auth, Users, Tenant Management, Developer Control Center/RCCE, Patients, Medical Records, Clinical, Admissions, Pharmacy, Laboratory, Radiology, Billing, Insurance Claims/NHIA, Surgery, Emergency, Blood Bank, Mortuary, Biomedical, Procurement, HR, Quality, Migration, Facility Maps/GIS, Telemedicine, Biometrics).
- `tests/` — Automated Jest + Supertest integration & regression suites executing against live PostgreSQL.

## Local Development & Verification
```bash
# 1. Copy environment template and configure PostgreSQL DATABASE_URL
cp .env.example .env.development

# 2. Generate Prisma Client & sync schema
npx prisma generate
npx prisma db push

# 3. Bootstrap roles & permissions (or run dev seed)
node prisma/bootstrap-production.js

# 4. Run full automated verification suite
npm test
```
