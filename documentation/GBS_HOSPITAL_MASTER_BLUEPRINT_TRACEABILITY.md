# GBS Hospital Management System — 1:1 Master Blueprint & Render Infrastructure Traceability Matrix

**Official GBS Account:** `gabosei48@gmail.com`  
**GitHub Repository:** `https://github.com/A1-ul/gbs-hospital` (`main`)  
**Render Service:** `gbs-hospital-system` (`https://gbs-hospital-system.onrender.com`)  
**Database Engine:** PostgreSQL 16 (Prisma ORM 6.19.3 — 126 Relational Models)  
**Backend Standard:** CommonJS (`require()` / `module.exports` — 0 ESM violations, 37 route files, 460 endpoints)
**Internationalization:** 10 Languages (incl. Arabic RTL) & 50 Countries across 5 Global Regions

---

## 1. Blueprint Sources Governed
1. **GBS Hospital Enterprise Master Blueprint** (16 Roles, 82 Unified Permissions, 33 Active Backend Modules, 28 Frontend Views, GBS-RCCE Engine, Hidden Developer Control Center, Multi-Tenant SaaS Onboarding & Countdown Engine, Patient Safety Emergency Bypass, Data Migration Hub, Central Voice & 4-Step Facial Biometric Vault).
2. **Render.com Infrastructure & CI/CD Blueprint** (`render.yaml`, `.github/workflows/ci-render-deploy.yml`, `documentation/DEPLOYMENT_REPORT.md`, `documentation/DISASTER_RECOVERY.md`).

---

## 2. End-to-End Traceability Summary

| Requirement Domain | Requirement IDs | Authoritative Backend / Database | Authoritative Frontend | Automated Verification |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway & Health** | `REQ-BP-001`, `REQ-BP-002` | `Backend/src/routes/index.js`, `health.routes.js` | `Header.jsx`, `api.service.js` | `phase0`, `phase24`, `phase26` |
| **Auth, 16-Role RBAC & Step 7 Counts** | `REQ-BP-003`, `REQ-SEC-001..003`, `REQ-SEC-P1-001` | `auth.service.js`, `user.service.js`, `roles.js`, `permissions.js` | `RoleLoginModal.jsx`, `Header.jsx` | `phase1`, `phase26`, `phase27`, `phase31` |
| **Multi-Tenant SaaS, Countdown & Trial Sweep** | `REQ-TEN-001..005`, `REQ-DEV-001..002` | `tenant-management/*`, `countdown.engine.js`, `tenant-access.middleware.js`, `developer-ops.service.js` | `ModuleViews.jsx` (Developer NOC), `DeveloperAdvancedOpsPanel.jsx`, `SubscriptionLockOverlay.jsx` | `phase2`, `phase26`, `phase30` |
| **Hidden Developer Control Center & Step 35 Ops** | `REQ-GAP-002`, `REQ-GAP-005` | `developer-security-guard.middleware.js`, `developer-remote-ops.service.js`, `rcce.routes.js` | `DeveloperPortalGate.jsx`, `RcceDeveloperConsole.jsx`, `DeveloperAdvancedOpsPanel.jsx` | `phase25`, `phase26`, `phase32` |
| **Clinical, OPD/IPD, Specialties, ICU & AI Safety** | `REQ-PAT-*`, `REQ-OPD-*`, `REQ-DOC-*`, `REQ-IPD-*`, `REQ-CLIN-P3-001` | `patients`, `medical-records`, `clinical`, `admissions`, `dental`, `eye-clinic`, `icu`, `clinical-safety`, `ai-clinical` | `ModuleViews.jsx`, `DentalClinicView`, `EyeClinicView`, `IcuVitalsView`, `AiSafetyCenterView`, `PatientPortalView` | `phase3..6`, `phase28`, `phase29`, `phase31` |
| **Diagnostics, Pharmacy, Surgery, Acute Care** | `REQ-PHARM-*`, `REQ-LAB-*`, `REQ-RAD-*`, `REQ-SURG-*`, `REQ-EMG-*`, `REQ-BLD-*`, `REQ-MORT-*` | `pharmacy`, `laboratory`, `radiology`, `surgery`, `emergency`, `blood-bank`, `mortuary` | `LaboratoryView`, `RadiologyPacsView`, `ModuleViews.jsx` | `phase7..14`, `phase29`, `phase31` |
| **Finance, NHIA, Procurement, HR, Quality & Ops** | `REQ-BILL-*`, `REQ-NHIA-*`, `REQ-BIOMED-*`, `REQ-SCM-*`, `REQ-HR-*`, `REQ-QA-*`, `REQ-MOD-P4-001` | `billing`, `insurance-claims`, `biomedical`, `procurement`, `hr`, `quality`, `meetings`, `documents`, `facility` | `BillingPaymentsView`, `NhiaClaimsView`, `ExecutiveAdminBiView`, `OperationsSuiteView` | `phase10`, `phase15..19`, `phase29`, `phase31` |
| **Migration Service Queue Worker & Reports** | `REQ-MIG-001..003`, `REQ-GAP-006` | `migration.service.js`, `migration.queue.js`, `migration.worker.js`, `migration.routes.js` | `MigrationView.jsx`, `api.service.js` | `phase20`, `phase33` |
| **GIS, Telemedicine & Biometric Vault** | `REQ-GIS-001..003`, `REQ-VOX-001..003` | `facility-maps`, `telemedicine`, `biometrics` | `TelemedicineGisView`, `VoiceBiometricsView`, `FacialRecognitionModal` | `phase21`, `phase22`, `phase30` |
| **CI Resilience, Architecture & External Adapters** | `REQ-GAP-001`, `REQ-GAP-003..004`, `REQ-GAP-007..014` | `jest.afterEnv.js`, `core/integration/*`, `prisma/migrations/*`, `ci-render-deploy.yml` | `Frontend/tests/smoke.roles-and-dashboards.test.js` | `phase27`, `phase32..37`, `Frontend npm test` |
| **Persistent Memory, Multilingual (10 Languages), 50 Countries & Visible Tabs** | `REQ-MEM-001`, `REQ-INTL-001..002`, `REQ-UX-TABS-001` | `Backend/src/modules/international/*`, `SYSTEM_MEMORY.md`, `.build/upgrade-memory.json` | `LocaleContext.jsx`, `translations.js`, `countries.js`, `AllTabsNavigatorModal.jsx`, `Header.jsx`, `App.jsx` | `phase38`, `Frontend npm test (9/9)` |

---

## 3. Machine-Readable Source of Truth
Full per-requirement JSON tracking is maintained in [.build/requirement-traceability.json](../.build/requirement-traceability.json).
