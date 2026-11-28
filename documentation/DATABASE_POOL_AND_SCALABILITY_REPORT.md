# GBS HOSPITAL MANAGEMENT SYSTEM — DATABASE CONNECTION POOL & RENDER.COM SCALABILITY REPORT

> **Platform:** Render.com (`gbs-hospital-system`, `https://gbs-hospital-system.onrender.com`)  
> **Official GBS Account:** `gabosei48@gmail.com`  
> **Database Engine:** PostgreSQL 16 + Prisma ORM `6.19.3` (126 Relational Models)  
> **Status:** Audited, Optimized & Verified (`File 6 — Phases 6.1 & 6.2`)

---

## 1. Existing Render.com Infrastructure Audit

| Component | Current Configuration (`render.yaml`) | Notes |
| :--- | :--- | :--- |
| **Web Service** | `gbs-hospital-system` (`node`, Frankfurt region, branch `main`, `plan: free`) | Serves both Express 5 API (`/api/v1`) and compiled React 18 Vite SPA (`Frontend/dist`). |
| **Health Check** | `GET /api/v1/health` (rate-limit exempt, independent Backend + GBS-RCCE + PostgreSQL `SELECT 1`) | Zero mock health responses. |
| **Database** | Managed PostgreSQL 16 (`gbs-hospital-db`), `DB_STORAGE_QUOTA_MB=1024` | 126 models with strict multi-tenant `hospitalId`/`tenantId` isolation. |
| **Prisma Client Architecture** | **1** global runtime singleton in `Backend/src/core/database/prisma.client.js` | Zero rogue duplicate `new PrismaClient()` pools in `Backend/src/`. |

---

## 2. Previous vs. Optimized Connection Pool Configuration

| Setting | Previous Behavior | Optimized Configuration (`database.config.js` + `render.yaml`) |
| :--- | :--- | :--- |
| **Per-Instance Pool Limit** | Unclamped / default Prisma formula (often displayed `3/20` against smaller PG plans) | `DB_POOL_MAX=10` (prod), `12` (dev), `8` (test), strictly clamped `2..50` |
| **Safe Application Ceiling** | Untracked against `max_connections` | `safeMaxAppConnections = floor(postgresMaxConnections * 0.75)` (reserves 25% for rolling deploys, admin & migrations) |
| **Pool Acquisition Timeout** | Default `10s` | `DB_POOL_TIMEOUT=20` seconds (clamped `5..120s`) |
| **Connect & Socket Timeouts** | Unset | `DB_CONNECT_TIMEOUT=10s`, `DB_SOCKET_TIMEOUT=30s` |
| **Idle-in-Transaction Guard** | Defined in config only (unused) | Enforced via `SET idle_in_transaction_session_timeout = 30000` on connection bootstrap (PgBouncer-safe) |
| **Slow-Query Monitoring** | Dev-only debug log (`slowQueries` always `0` in prod) | Active across all environments via `startPrismaMonitor(prisma)` (`500ms` threshold; SQL hidden/sanitized in prod) |
| **PgBouncer Compatibility** | Manual URL edits required | Auto-detects port `6432` or `DB_PGBOUNCER=true` and appends `pgbouncer=true&statement_cache_size=0` |
| **Threshold Alerting** | Manual inspection only | Automated `80% WARNING` and `95% CRITICAL` alerts for both connection pool and database storage |
| **Heavy Financial Reports** | 6 sequential unbounded `findMany()` scans in `getAnnualFinancialReport()` | Parallel batched `Promise.all` with `ANNUAL_REPORT_ROW_CAP` (`2000`) preventing 512MB OOM |

---

## 3. PostgreSQL Capacity, PgBouncer & Monitoring Status

- **PostgreSQL `max_connections`:** Read dynamically live from `current_setting('max_connections')` (typically `97–100` on Render Starter/Standard & local PostgreSQL 16; `20–22` on Free/Hobby tiers).
- **Maximum Safe Application Connections:** Computed dynamically as `75%` of live PostgreSQL `max_connections` (e.g., `75` on a 100-connection server; `15` on a 20-connection server). With `DB_POOL_MAX=10` on 1 instance, even a `2x` zero-downtime Render rolling deploy peaks at `20` max connections.
- **PgBouncer Status:** **READY & VERIFIED** (`pgbouncerCompatible: true`). Currently `DB_PGBOUNCER=false` for direct single-instance PostgreSQL. Flipping `DB_PGBOUNCER=true` (or pointing `DATABASE_URL` to Render's transaction-pooling port `6432`) automatically enables `pgbouncer=true&statement_cache_size=0` with zero code changes.
- **Centralized Developer Monitoring (`DeveloperAdvancedOpsPanel.jsx` + `/api/v1/rcce/developer/remote/cluster-health`):**
  - Displays Backend CPU cores & load average, Backend RAM RSS/heap, PostgreSQL active/idle/waiting/idle-in-tx connections, buffer cache-hit ratio %, deadlocks, total & slow queries, storage MB vs. quota MB, backup status & latest backup timestamp, API avg latency, 5xx error rate, background job failures, uptime, live `80%`/`95%` threshold alert banners, and dynamic scaling recommendations.

---

## 4. Storage, Document Management & Backup/DR Status

- **Storage Allocation & Alerts:** Live `pg_database_size(current_database())` measured against `DB_STORAGE_QUOTA_MB` (`1024 MB` default) with `80% WARNING` and `95% CRITICAL` alerts.
- **Backup & Disaster Recovery:** Verified **126/126 Prisma model parity** in `backup-and-environment.service.js`, automated backup footprint/recency reporting (`backupStatus`, `latestBackupAt`, `localBackupsMb`), and documented disaster recovery (`RTO <= 2 Hours`, `RPO <= 2 Hours` in `documentation/DISASTER_RECOVERY.md`).

---

## 5. Multi-Institution Performance & Concurrency Test Results

| Verification Suite | Scenario | Verified Result |
| :--- | :--- | :--- |
| **`phase32`** | CI pool resilience & Developer isolation | **PASSED** (`0` failures) |
| **`phase36`** | Pool URL builder, PgBouncer auto-config, `80%`/`95%` alerts, transient `P1017` recovery, **30-request simultaneous burst** across Health, Patients, Billing & Multi-Tenant Console | **PASSED (`5/5` tests)** — `0%` 5xx errors, `0` idle-in-tx leaks, connections bounded below `safeMaxAppConnections` |
| **`phase42`** | Active Prisma query monitor (`totalQueries` + `slowQueries`), `pg_stat_database` cache-hit % & deadlocks, bounded `getAnnualFinancialReport()`, **20-request multi-institution burst** across 2 isolated hospitals (`Ghana` & `Kenya`) | **PASSED (`4/4` tests)** — `0%` 5xx errors, `0` idle-in-tx leaks, strict cross-hospital isolation preserved |

---

## 6. Cost-Effective Render.com Scaling Roadmap & Monthly Cost Estimates

> *Estimated Render.com USD pricing (subject to Render's published plan rates); upgrade only when live Developer alerts cross 80% sustained utilization.*

| Growth Stage | Active Hospitals / Users | Recommended Render Web Plan | Recommended Render PostgreSQL Plan | PgBouncer | Est. Monthly Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Stage 1: Pilot / Demo (Current)** | 1 pilot facility / testing | Free (`512 MB` RAM, sleeps on idle) | Free / Starter (`1 GB`) | Off (`DB_POOL_MAX=10`) | **$0 / month** |
| **Stage 2: Live Production Launch** | 1–5 hospitals (~250 daily staff) | **Starter** (`512 MB` RAM, always-on, zero cold start) — ~$7/mo | **Basic-256MB** (`1 GB–10 GB` disk, automated backups) — ~$7/mo | Ready (`DB_POOL_MAX=10`) | **~$14 / month** |
| **Stage 3: Multi-Institution Growth** | 5–25 hospitals (~1,500 daily staff) | **Standard** (`2 GB` RAM, 1 CPU) — ~$25/mo | **Basic-1GB** (`16 GB+` disk, Point-in-Time Recovery) — ~$19/mo | **Enable (`DB_PGBOUNCER=true`)** | **~$44 / month** |
| **Stage 4: Regional Enterprise Scale** | 25+ hospitals (multi-country) | **2× Standard / Pro** (`4 GB` RAM, autoscaling) — ~$50–$85/mo | **Pro-4GB** + Read Replica + External S3/R2 Object Storage | **Required (`DB_PGBOUNCER=true`, `DB_POOL_MAX=8`/node)** | **~$125–$180 / month** |

---

## 7. Remaining Infrastructure Limitations

1. **Render Free-Tier Cold Starts:** While on `plan: free`, the web service sleeps after 15 minutes of inactivity (~20–45s first-request wakeup; handled gracefully by `connection.manager.js` 45s recovery timeout). Upgrading to Render **Starter ($7/mo)** eliminates cold starts permanently.
2. **Ephemeral Local Disk on Render Web Services:** Local JSON snapshots stored in `Backend/backups/` are ephemeral across container redeploys on Render unless backed by a Render Persistent Disk or external S3/Cloudflare R2 bucket (recommended at Stage 2+ alongside Render Managed PostgreSQL automated backups).
3. **PostgreSQL OS-Level CPU/RAM Metrics:** Render Managed PostgreSQL does not expose host OS CPU/RAM directly inside SQL (`pg_stat_*`); buffer cache hit ratio %, active/waiting connections, deadlocks, and query latencies are used as authoritative live SQL proxies alongside Render's dashboard metrics.
