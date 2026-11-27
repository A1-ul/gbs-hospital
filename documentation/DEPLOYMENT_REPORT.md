# GBS Hospital Management System — GitHub & Render Continuous Deployment Report

## 1. Official Account & Hosting Configuration
- **Official GBS Account Email**: `gabosei48@gmail.com`
- **Exclusive Cloud Hosting Provider**: Render.com
- **System Type**: GBS Hospital Management System (`HOSPITAL_ENTERPRISE`)
- **Render Service Name**: `gbs-hospital-system`
- **Public Production URL**: `https://gbs-hospital-system.onrender.com`
- **Health Check Endpoint**: `/api/v1/health`

## 2. Continuous Deployment Pipeline (`GitHub -> Render`)
```
Local Development (d:\version1\GBS_HOSPITAL_SYSTEM)
        ↓
Automated Tests & Build Verification (Jest + Vite Production Build)
        ↓
Verified Database Backup (Backend/backups/ — excluded from Git tracking)
        ↓
Git Commit & Push to GitHub (A1-ul/gbs-hospital — main branch)
        ↓
GitHub Actions CI (.github/workflows/ci-render-deploy.yml)
        ↓
Render Blueprint Automatic Build & Deploy (render.yaml)
        ↓
Database Sync & Idempotent Bootstrap (prisma db push + node prisma/bootstrap-production.js)
        ↓
Health Check Verification (/api/v1/health)
        ↓
Live Production URL (https://gbs-hospital-system.onrender.com)
```

## 3. Environment & Data Identification Architecture
- **Environment Templates**: `Backend/.env.example`, `Backend/.env.example.production`, `Frontend/.env.example` (live `.env*` files are strictly gitignored)
- **Interactive 10-Entry Learning Demo Trial Gate**: `DEMO_MODE_ENABLED=true` & `DEMO_MAX_ENTRIES=10` in `render.yaml`, atomically enforced in PostgreSQL by `Backend/src/core/middleware/demo-quota.middleware.js` (zero client-side credentials; `DEVELOPER` strictly excluded; real DB-backed sessions & MFA for hidden `/developer-portal`)
- **Central Environment Config**: `Backend/src/config/environment/environment.config.js`
- **Data Classification, Purge Guard & 124-Model Backup Service**: `Backend/src/modules/tenant-management/backup-and-environment.service.js`
  - Classifies records by explicit provenance/origin metadata & strict RFC 2606 / CI markers ONLY (zero false positives on genuine clinical text containing words like `"sample"` or `"phase"`)
  - Creates SHA-256 verified full **124/124 Prisma model** database backups in `Backend/backups/` and supports non-destructive restore
  - Enforces an HTTP `403` (`PRODUCTION_PURGE_AUTHORIZATION_REQUIRED`) hard guard in `PRODUCTION` and selectively deletes ONLY verified `DEVELOPMENT_TEST` records while protecting all genuine `PRODUCTION` records, RBAC roles/permissions, and permanent bootstrap accounts (`gabosei48@gmail.com`, `developer@gbs.com`, `admin@gbs.com`)

## 4. Universal Page Navigation Architecture
- **Dedicated Detail Page Component**: `Frontend/src/components/UniversalDetailPage.jsx`
- **URL Route Pattern**: `/module/:moduleKey/detail/:detailType/:recordId`
- **Supported View Commands**:
  1. `View Details` (`DETAILS`)
  2. `View Profile` (`PROFILE`)
  3. `View Records` (`RECORDS`)
  4. `View Reports` (`REPORTS`)
  5. `View Transactions` (`TRANSACTIONS`)
  6. `View History` (`HISTORY`)
  7. `View Notifications` (`NOTIFICATIONS`)
  8. `View Applications` (`APPLICATIONS`)
  9. `View Hospital Information` (`HOSPITAL_INFO`)
  10. `View System Information` (`SYSTEM_INFO`)
- **Back Navigation**: Top-left `← Back` button + full browser/mobile history (`window.history.pushState` / `popstate`) + scroll restoration.

