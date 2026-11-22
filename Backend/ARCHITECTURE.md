# GBS Hospital Management System — Backend Architecture

## Layered Request Lifecycle
```
HTTP Request
  → Request ID & Structured Logger
  → Security Middleware (Helmet, Permissions-Policy, Strict Production CORS, Rate Limiter)
  → GBS-RCCE Traffic, Maintenance & Idempotency Middleware
  → Global Tenant Access Guard (Subscription/Lock Enforcement + Audited Patient Safety Emergency Bypass)
  → Express Route Registry (Backend/src/routes/index.js — /api/v1/*)
  → JWT + PostgreSQL Session Revocation Middleware (auth.middleware.js)
  → Role & Unified Permission Authorization (role.middleware.js / permission.middleware.js)
  → Controller → Business Service → Prisma PostgreSQL Transaction
  → GBS-RCCE Standardized Response Envelope + Immutable AuditLog
```

## Permanent Architectural Invariants
1. **CommonJS Exclusivity:** Every backend file uses `"use strict";`, `require()`, and `module.exports`.
2. **Zero-Trust 16-Role RBAC:** Exactly 16 Master Blueprint roles (`SUPER_ADMIN` retired) mapped to 82 canonical permissions defined solely in `src/core/security/permissions.js`.
3. **Central Voice Authentication Service:** Voiceprint & biometric verification live centrally under `/api/v1/biometrics` and `/api/v1/voice-auth` (never duplicated inside individual clinical modules).
4. **Patient Safety First:** Emergency care routes never lock on subscription expiry or tenant suspension and are always audited.
5. **Hidden Developer Platform:** Developer administrative APIs require `DEVELOPER` role + verified MFA & device challenge; no Developer navigation is exposed to hospital staff or public users.
