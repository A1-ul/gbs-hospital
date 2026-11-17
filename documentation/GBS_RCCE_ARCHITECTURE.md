# GBS Central System Response, Control & Communication Engine (GBS-RCCE)

## 1. Overview & Architecture

GBS-RCCE is a centralized, reusable enterprise middleware and governance engine built strictly with conventional software engineering (Express, PostgreSQL/Prisma, EventEmitter, SSE, SHA-256 integrity chains) with zero AI dependencies.

- **Reusable Core Package**: `enterprise-framework/gbs-rcce/`
  - `response.catalogue.js` — Predefined canonical response codes, HTTP statuses, severities, and exact user messages (`createResponseCatalogue(customEntries)`).
  - `response.engine.js` — Standardizes all HTTP JSON payloads to `{ success, code, message, data, errors, timestamp, requestId }`.
  - `business-rules.engine.js` — Backend rule evaluation (`requireFields`, `requirePositiveNumber`, `requireValidTransition`, `verifyRecordOwnership`, `enforce`).
  - `event-notification.engine.js` — Domain event bus + persistent PostgreSQL notification router + async queue + real-time SSE stream.
  - `audit.engine.js` — Cryptographic SHA-256 hash-chained activity logger capturing both successful and denied/failed attempts.
  - `idempotency.engine.js` — `X-Idempotency-Key` + SHA-256 payload fingerprint protection against duplicate payments, admissions, and registrations.
  - `control.engine.js` — Role permission governance + Developer privacy redaction + explicit time-bounded `DeveloperAccessGrant` enforcement.
  - `error.engine.js` — Safe error translation + developer `SystemErrorLog` diagnostic repository.
- **Hospital Integration Layer**:
  - `Backend/src/core/gbs-rcce.bootstrap.js`
  - `Backend/src/core/middleware/rcce-audit.middleware.js`
  - `Backend/src/core/middleware/error.middleware.js`
  - `Backend/src/modules/developer-control-center/rcce.{routes,controller,service}.js`
  - `Frontend/src/components/RcceDeveloperConsole.jsx` + `Frontend/src/components/Header.jsx` + `Frontend/src/services/api.service.js`

## 2. Database Schema Additions (`Backend/prisma/schema.prisma`)

- Extended `AuditLog` (`role`, `tenantId`, `hospitalId`, `affectedRecord`, `outcome`, `requestId`, `responseCode`, `httpStatus`, `method`, `path`, `previousHash`, `integrityHash`, `metadata`)
- `SystemEvent`
- `SystemNotification`
- `IdempotencyRecord`
- `DeveloperAccessGrant`
- `SystemErrorLog`
- `SystemConfiguration`

## 3. GBS-RCCE API Endpoints (`/api/v1/rcce`)

| Method | Path | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/rcce/catalogue` | Authenticated | List predefined response catalogue codes & messages |
| `GET` | `/api/v1/rcce/notifications` | Authenticated | List user & role-targeted notifications + unread count |
| `GET` | `/api/v1/rcce/notifications/stream` | Authenticated (Bearer or `?token=`) | Real-time SSE notification stream |
| `PATCH` | `/api/v1/rcce/notifications/:id/read` | Owner / Admin | Mark individual notification as read |
| `POST` | `/api/v1/rcce/notifications/mark-all-read` | Authenticated | Mark all user notifications read |
| `GET` | `/api/v1/rcce/audit-logs` | Admins & Developer | View audited operations + SHA-256 chain integrity |
| `GET` | `/api/v1/rcce/events` | Admins & Developer | Inspect persisted system events & queue status |
| `GET` | `/api/v1/rcce/errors` | Developer / Admin | View captured technical error diagnostics |
| `PATCH` | `/api/v1/rcce/errors/:id/resolve` | Developer / Admin | Resolve logged system error |
| `GET` | `/api/v1/rcce/developer/overview` | Admins & Developer | Operational status telemetry (no private user PII) |
| `GET` | `/api/v1/rcce/developer/users-activity` | Admins & Developer | Privacy-masked for Developer unless `?includePrivate=true` with active approved grant |
| `GET` | `/api/v1/rcce/developer/permissions` | Admins & Developer | Inspect role permissions & dynamic overrides |
| `PATCH` | `/api/v1/rcce/developer/permissions` | Developer / Admin | Grant or revoke role permissions dynamically |
| `GET` | `/api/v1/rcce/developer/access-grants` | Admins & Developer | List explicit sensitive-access grants |
| `POST` | `/api/v1/rcce/developer/access-grants/request` | Developer | Submit time-bounded request for private data access |
| `PATCH` | `/api/v1/rcce/developer/access-grants/:id/approve` | Non-Developer Admin | Approve sensitive access grant (self-approval blocked) |
| `PATCH` | `/api/v1/rcce/developer/access-grants/:id/revoke` | Admins & Developer | Revoke sensitive access grant |
| `GET` | `/api/v1/rcce/developer/configs` | Admins & Developer | List authorized system configurations |
| `PUT` | `/api/v1/rcce/developer/configs/:key` | Developer / Admin | Upsert system configuration |
| `POST` | `/api/v1/rcce/developer/maintenance` | Developer / Admin | Toggle authorized system maintenance mode |
