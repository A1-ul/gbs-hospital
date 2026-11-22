# GBS Hospital Management System — Disaster Recovery & Business Continuity Plan

**Official GBS Account:** `gabosei48@gmail.com`  
**Production Hosting Platform:** Render.com (`gbs-hospital-system` → `https://gbs-hospital-system.onrender.com`)  
**Database Engine:** Managed PostgreSQL

---

## 1. Recovery Objectives (Master Blueprint Alignment)

| Metric | Target | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Recovery Time Objective (RTO)** | **≤ 2 Hours** | Automated Render blueprint redeployment (`render.yaml`) + idempotent `prisma db push` & `bootstrap-production.js` |
| **Recovery Point Objective (RPO)** | **≤ 2 Hours** | Render Managed PostgreSQL automated backups + SHA-256 verified logical snapshots via Developer Backup Console |
| **Backup Integrity Verification** | **100% SHA-256 Verified** | `POST /api/v1/tenants/developer/backups/:filename/verify` validates cryptographic digest before any restore |
| **Clinical Emergency Continuity** | **Zero Downtime Lockout** | `tenantAccessGuard` preserves ER, Ambulance, Triage, Blood Bank, ICU & explicit `X-Emergency-Override: true` paths even during lock/expiry |

---

## 2. Backup Architecture

### 2.1 Application-Level SHA-256 Verified Backups (Developer Control Center)
Accessible exclusively to MFA-verified `DEVELOPER` accounts via the unlisted `/developer-portal`:
1. **Create Backup:** `POST /api/v1/tenants/developer/backups/create`
   - Exports all core PostgreSQL tables into a timestamped JSON archive inside `Backend/backups/` (excluded from Git via `.gitignore`).
   - Computes and stores a 64-character SHA-256 integrity checksum.
2. **Verify Backup:** `POST /api/v1/tenants/developer/backups/:filename/verify`
   - Recomputes the SHA-256 digest over the archive payload and validates record counts prior to restore.
3. **Restore Backup:** `POST /api/v1/tenants/developer/backups/:filename/restore`
   - Verifies integrity first, then restores records safely while preserving system roles and permanent bootstrap accounts.

### 2.2 Infrastructure-Level Managed PostgreSQL Backups (Render.com)
- Render Managed PostgreSQL retains daily snapshots and Point-in-Time Recovery (PITR) on paid production tiers.
- Connection string is injected strictly via Render environment secret `DATABASE_URL` (`?sslmode=require`).

---

## 3. Disaster Recovery Runbook

### Scenario A — Application Container / Service Crash
1. Verify health status: `GET https://gbs-hospital-system.onrender.com/api/v1/health`.
2. Render automatically restarts unhealthy web services failing `/api/v1/health`.
3. If a bad deployment caused failure, trigger **Rollback to Previous Deploy** in the Render Dashboard (`gbs-hospital-system` → Events → Rollback) or `git revert` on `A1-ul/gbs-hospital` (`main`).

### Scenario B — Accidental Data Corruption or Bad Migration
1. Authenticate into the unlisted `/developer-portal` (Credentials + 6-digit MFA + Device Fingerprint).
2. Engage **Maintenance Mode** (`POST /api/v1/rcce/developer/maintenance`) to prevent concurrent writes (emergency clinical routes remain unaffected).
3. Verify the latest clean backup (`POST /api/v1/tenants/developer/backups/:filename/verify`).
4. Execute atomic restore (`POST /api/v1/tenants/developer/backups/:filename/restore`) or restore Render PostgreSQL PITR snapshot.
5. Run `node Backend/prisma/bootstrap-production.js` to confirm all 16 roles and 82 unified permissions are intact without overwriting passwords.
6. Disable Maintenance Mode and run health + smoke checks across `/api/v1/health`, `/api/v1/auth/login`, and clinical read routes.

### Scenario C — Credential or Secret Compromise
1. Rotate `JWT_SECRET`, `DATABASE_URL` credentials, and `DEVELOPER_ROOT_PASSWORD` in the Render Environment panel immediately.
2. Rotating `JWT_SECRET` invalidates all previously issued JWTs instantaneously.
3. Truncate active rows in PostgreSQL `Session` table if forcing immediate global sign-out.
4. Review `AuditLog` and `SystemErrorLog` via GBS-RCCE Developer Console for unauthorized activity.

---

## 4. Patient Safety Continuity Mandate
Under **GBS Hospital Patient Safety Guardrails**:
- Subscription expirations or administrative tenant locks **NEVER** block life-critical emergency endpoints (`/emergency`, `/ambulance`, `/ems`, `/triage`, `/blood-bank`, `/transfusion`, `/icu`, `/clinical/trauma`) or requests carrying `X-Emergency-Override: true`.
- Every emergency bypass emits response header `X-Tenant-Emergency-Access: ACTIVE_AUDITED` and writes an immutable `PATIENT_SAFETY_EMERGENCY_BYPASS` record into `AuditLog`.
