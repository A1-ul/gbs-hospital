# GBS Hospital Management System — GitHub & Render Continuous Deployment Report

## 1. Official Account & Hosting Configuration
- **Official GBS Account Email**: `gabosei48@gmail.com`
- **Exclusive Cloud Hosting Provider**: Render.com
- **System Type**: GBS Hospital Management System (`HOSPITAL_ENTERPRISE`)
- **Render Service Name**: `gbs-hospital`
- **Public Production URL**: `https://gbs-hospital.onrender.com`
- **Health Check Endpoint**: `/api/v1/health`

## 2. Continuous Deployment Pipeline (`GitHub -> Render`)
```
Local Development (d:\version1\GBS_HOSPITAL_SYSTEM)
        ↓
Automated Tests & Build Verification
        ↓
Verified Database Backup (Backend/backups/pre-production-activation-backup.json)
        ↓
Git Commit & Push to GitHub (main branch)
        ↓
GitHub Actions CI (.github/workflows/ci-render-deploy.yml)
        ↓
Render Blueprint Automatic Build & Deploy (render.yaml)
        ↓
Database Migrations (npx prisma migrate deploy)
        ↓
Health Check Verification (/api/v1/health)
        ↓
Live Production URL (https://gbs-hospital.onrender.com)
```

## 3. Environment & Data Identification Architecture
- **Development Environment**: `.env.development` (`NODE_ENV=development`, `GBS_ENV=DEVELOPMENT`)
- **Production Environment**: `.env.production` (`NODE_ENV=production`, `GBS_ENV=PRODUCTION`)
- **Central Environment Config**: `Backend/src/config/environment/environment.config.js`
- **Data Classification & Backup Service**: `Backend/src/modules/tenant-management/backup-and-environment.service.js`
  - Classifies all records into `PRODUCTION` vs. `DEVELOPMENT_TEST`
  - Creates SHA-256 verified full database backups in `Backend/backups/`
  - Purges only development/test records while protecting system roles, permissions, ICD-10 codes, and permanent bootstrap accounts (`developer@gbs.com`, `admin@gbs.com`)

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
