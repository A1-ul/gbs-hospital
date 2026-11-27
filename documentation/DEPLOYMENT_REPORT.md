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
- **Data Classification, Purge Guard & 126-Model Backup Service**: `Backend/src/modules/tenant-management/backup-and-environment.service.js`
  - Classifies records by explicit provenance/origin metadata & strict RFC 2606 / CI markers ONLY (zero false positives on genuine clinical text containing words like `"sample"` or `"phase"`)
  - Creates SHA-256 verified full **126/126 Prisma model** database backups in `Backend/backups/` and supports non-destructive restore
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

## 5. Intelligent Multi-Layer Connection Monitor (Zero False Offline Status)
- **Backend Probe Service**: `Backend/src/core/monitoring/connection-monitor.service.js` independently probes Backend Runtime, Central Engine (`GBS-RCCE` 6 subsystems), and PostgreSQL (`SELECT 1` with 5s timeout & latency telemetry), redacting all database URIs, passwords, and tokens from failure logs.
- **Endpoints**:
  - `GET /api/v1/health`: Returns live `overallStatus`, `centralEngine`, `databaseStatus`, `databaseLatencyMs`, `avgApiResponseTimeMs`, `lastSuccessfulConnection`, and `uptime` (`HTTP 200` healthy / `HTTP 503` degraded).
  - `GET /api/v1/health/connection-diagnostics`: Strictly guarded by `authMiddleware` + `developerSecurityGuard` (`401`/`403`/`200`).
- **Frontend Connection Manager**: `Frontend/src/services/connection.manager.js` + `api.service.js` `AbortController` timeouts (`25s` API / `45s` cold-start recovery) + controlled exponential backoff (`4s -> 8s -> 16s -> 30s`) + multi-failure offline confirmation + tab-visibility awareness wired into `Header.jsx` and all 8 diagnostic fields in `DeveloperAdvancedOpsPanel.jsx`.

## 6. Multi-Gateway Hospital Payment & GBS Developer Subscription Engine
- **Database Models (126 Total Prisma Models)**: `PaymentTransaction` (11 canonical states, idempotency key, sequential receipt number, multi-hospital isolation, zero PIN/PAN/CVV columns) and `PaymentWebhookEvent` (cryptographic signature audit & duplicate replay suppression).
- **Modular Gateway Adapter**: `Backend/src/core/integration/payment-gateway.adapter.js` supporting Paystack (Hosted Checkout, official `/charge` Ghana MoMo, `/verify`, `/refund`, HMAC-SHA512 webhooks), Hubtel (Online Checkout, `/status`, HMAC-SHA256 webhooks), Ghanaian MSISDN validation (`MTN`, `TELECEL_CASH`, `AT_MONEY`), phone/key masking, app-not-installed fallback guidance, and `15s` upstream timeouts (`502`/`503`/`504`).
- **Central Payments API (`/api/v1/payments`)**: Server-side bill validation, atomic `prisma.$transaction()` settlement to `PatientPayment` + `PatientBill`, authorized Hospital Accountant Bank Deposit verification (`UNDER_REVIEW` -> `SUCCESSFUL`), printable official receipts, refunds, reconciliation reports, and Hospital Admin -> GBS Developer Subscription payments directed to designated GBS Developer Mobile Money destination **`0554594193`**.
- **UI Portals**: Upgraded `BillingPaymentsView.jsx` (Multi-Gateway Checkout, Bank Deposit Verification Queue, Reports/CSV, GBS Subscription Tab), `PatientPortalView.jsx` (Self-Service Hospital Bill Checkout & Printable Receipts), and `DeveloperAdvancedOpsPanel.jsx` (Developer Revenue, Subscription Approval, Reconciliation & Webhook Audit Console).


