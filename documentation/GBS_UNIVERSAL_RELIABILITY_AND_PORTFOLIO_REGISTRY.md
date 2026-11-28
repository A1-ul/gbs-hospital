# GBS COMPANY OF MANAGEMENT SYSTEM — UNIVERSAL RELIABILITY STANDARD & PORTFOLIO REGISTRY

> **Standard Reference:** File 7 — Universal Software Reliability, Request Handling, Error Resolution & Production Readiness Standard  
> **Scope Notice (Section 15):** Only repositories physically present in the active workspace are audited and documented here. Other GBS software products (e.g., School, Examination, Real Estate, or Business Management Systems) are **not** in this workspace and require independent inspection when their repositories are opened.

---

## 1. GBS Software Portfolio Entry (Workspace Project)

| Attribute | Verified Value |
| :--- | :--- |
| **1. Project Name** | **GBS Hospital Management System** (`GBS_HOSPITAL_SYSTEM`) |
| **2. Industry** | Healthcare & Multi-Facility Hospital Operations (International — 50 Countries, 10 Languages) |
| **3. Project Purpose** | End-to-end clinical, inpatient, emergency, diagnostic, pharmacy, dental, eye clinic, ICU, billing/NHIS/multi-gateway payment, HR, procurement, telemedicine, migration, and multi-tenant hospital governance platform |
| **4. Technology Stack** | Node.js 20 LTS, Express 5, Prisma ORM `6.19.3`, PostgreSQL 16, React 18, Vite 5 |
| **5. Frontend Architecture** | Single-Page Application (`Frontend/src`), 26 modular workspaces, `LocaleContext` (10 languages incl. Arabic RTL, 50 countries), `connection.manager.js`, `navigation.manager.js`, `SystemFeedbackBrain.jsx`, global React `ErrorBoundary.jsx` |
| **6. Backend Architecture** | 100% CommonJS (`0` ESM violations), 37 route files, 461 `/api/v1` endpoints, reusable `enterprise-framework/gbs-rcce` (6 core engines), 10-entry supervised Demo Trial quota middleware, strict `developerSecurityGuard` |
| **7. Database** | PostgreSQL 16 with **126 Prisma relational models**, single pooled runtime `PrismaClient`, `idle_in_transaction_session_timeout` guard, live `pg_stat_activity` + `pg_stat_database` monitoring (`80%`/`95%` alerts) |
| **8. User Roles (16 Exact Blueprint Roles)** | `ADMINISTRATOR`, `HOSPITAL_DIRECTOR`, `DOCTOR`, `NURSE`, `LAB_TECHNICIAN`, `PHARMACIST`, `DENTIST`, `RADIOLOGIST`, `SURGEON`, `EYE_DOCTOR`, `RECEPTIONIST`, `FOLDER_RETRIEVER`, `ACCOUNTANT`, `HR_MANAGER`, `PATIENT`, and hidden `DEVELOPER` (`/developer-portal`) |
| **9. Existing Modules** | Patients/MPI, Clinical/OPD, Wards/Admissions, ICU/NEWS2, Pharmacy, Surgery/OT, Dental, Eye Clinic, Emergency/Ambulance, Laboratory, Radiology/PACS, Blood Bank, Mortuary, Biomedical, Billing & Multi-Gateway Payments (`0554594193`), NHIA/NHIS Claims, Procurement, HR & Payroll, Quality & Clinical Safety Guardrails, AI Clinical Advisory (4-Step Human Approval), Executive BI, Meetings/Documents/Facility, Telemedicine & Facility Maps, Migration Hub, International/Multilingual Engine, Voice & 4-Step Facial Biometrics, Hidden Developer Control Center |
| **10. Deployment Environment** | Render.com (`gbs-hospital-system`, `https://gbs-hospital-system.onrender.com`, Frankfurt) + GitHub `A1-ul/gbs-hospital` (`main`), official account `gabosei48@gmail.com` |
| **11. Current Development Status** | Active 10-File Enterprise Upgrade Campaign — Files 1 through 7 implemented & locally verified |
| **12. Outstanding Errors** | `0` known failing tests; `0` false-200 errors; `0` raw 500 stack leaks; Files 8–10 (Official GBS Logo, Go-Live Readiness Audit, Official Brand Colour Standardisation) scheduled next before live Render push |
| **13. Testing Status** | **43 Backend Jest suites (397+ tests)** + **26 Frontend automated tests** (`15` smoke + `6` connection manager + `5` navigation engine) — verified locally against PostgreSQL |
| **14. Production Readiness** | Local & CI verification complete through File 7; **live public production deployment verification** on `https://gbs-hospital-system.onrender.com` scheduled strictly after Files 8–10 and push to `main` (distinguishing clearly between local verification and live production verification per Section 12) |

---

## 2. Universal HTTP Status Code Management Matrix

| HTTP Status | Canonical Code | Backend Source | Frontend Handling (`api.service.js`) |
| :--- | :--- | :--- | :--- |
| **`200`** | `SUCCESS` / `RECORD_UPDATED` / `PAYMENT_RECEIVED` | `response.engine.js` & controllers | Unwraps standardized envelope, updates Feedback Brain |
| **`201`** | `CREATED` / `REGISTRATION_SUCCESS` / domain codes | Resource creation controllers | Displays verified creation confirmation with `requestId` |
| **`202`** | `PENDING_APPROVAL` | Async / approval workflows | Shows "Waiting for Approval" badge |
| **`204`** | No Content | Empty success responses | Returns `null` cleanly without JSON parse errors |
| **`400`** | `VALIDATION_FAILED` / `VALIDATION_MISSING_INFO` | `error.middleware.js` + `business-rules.engine.js` | "Please Check Your Input" — never triggers offline alert |
| **`401`** | `UNAUTHORIZED` / `INVALID_CREDENTIALS` | `auth.middleware.js` + JWT verification | "Sign In Required" + clears expired session cleanly |
| **`402`** | `SUBSCRIPTION_EXPIRED` | `tenant-access.middleware.js` | "System Access Locked" + emits `gbs:system-locked` |
| **`403`** | `FORBIDDEN_PERMISSION` / `CORS_POLICY_VIOLATION` / `DEMO_TRIAL_LIMIT_REACHED` | `role.middleware.js`, `developerSecurityGuard`, `demoQuotaGuard` | "Permission Needed" or "Demo Trial Limit Reached (10/10)" |
| **`404`** | `RECORD_NOT_FOUND` / `ROUTE_NOT_FOUND` | `notFound.middleware.js` + `P2025` | "Record Not Found" |
| **`405`** | `METHOD_NOT_ALLOWED` + RFC `Allow` header | `notFound.middleware.js` (Express 5 stack introspection) | "Action Not Supported" |
| **`408`** | `REQUEST_TIMEOUT` | `AbortController` / request timeouts | "Request Timed Out" + recorded by Connection Manager |
| **`409`** | `DUPLICATE_CONFLICT` / `DUPLICATE_SUBMISSION` / `TRANSACTION_IN_PROGRESS` | `P2002` + `idempotency.engine.js` | "Duplicate or Conflicting Entry" |
| **`413`** | `PAYLOAD_TOO_LARGE` | Express 2MB JSON/URL-encoded guard | "Payload Too Large" |
| **`422`** | `BUSINESS_RULE_VIOLATION` / `PAYMENT_REJECTED` | `business-rules.engine.js` | "Please Check Your Input" |
| **`423`** | `SYSTEM_LOCKED` | `tenant-access.middleware.js` | "System Access Locked" (clinical emergency never locked) |
| **`429`** | `RATE_LIMIT_EXCEEDED` | `security.middleware.js` | "Too Many Requests — Please Wait" |
| **`500`** | `INTERNAL_ERROR` | `error.middleware.js` (safe masked message + secret-scrubbed `SystemErrorLog`) | "System Error Reported" |
| **`501`** | `NOT_IMPLEMENTED` | `error.engine.js` | "Feature Not Implemented" |
| **`502`** | `BAD_GATEWAY` / `NETWORK_ERROR` | Upstream / network errors | "Service Temporarily Unavailable" + triggers health probe |
| **`503`** | `SERVICE_UNAVAILABLE` / `DATABASE_ERROR` / `MAINTENANCE_MODE` | Prisma `P1001/P1002/P1008/P1017/P2024` & Maintenance guard | "Service Temporarily Unavailable" + triggers health probe |
| **`504`** | `GATEWAY_TIMEOUT` | Upstream gateway timeout | "Request Timed Out" + triggers health probe |
