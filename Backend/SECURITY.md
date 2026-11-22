# GBS Hospital Management System — Security Policy & Controls

## Authentication & Session Controls
- **Password Hashing:** `bcrypt` (12 salt rounds). Plaintext credentials are never stored in source code or client bundles.
- **Session Revocation:** Every authenticated login creates a `Session` record in PostgreSQL storing a SHA-256 digest of the issued JWT. `auth.middleware.js` validates active session existence on every authenticated request; `POST /api/v1/auth/logout` revokes the token immediately.
- **Password Recovery:** `POST /api/v1/auth/forgot-password` generates a 15-minute single-use SHA-256 recovery token stored in PostgreSQL `SystemConfiguration`. Completing `POST /api/v1/auth/reset-password` revokes all prior sessions.
- **Developer MFA & Portal Isolation:** Root Developer access is isolated behind the unlisted `/developer-portal` endpoint requiring 2-step credentials + 6-digit MFA challenge + browser device fingerprint verification.

## Transport, Headers & Environment Protection
- **Production Secrets:** `JWT_SECRET`, `DATABASE_URL`, `DEVELOPER_ROOT_PASSWORD`, and `BOOTSTRAP_ADMIN_PASSWORD` must be provided via environment secrets (never committed to Git).
- **CORS & Rate Limiting:** Production CORS restricts access strictly to `CORS_ORIGIN` allowlisted origins. `/api/v1/health` is exempt from rate limiting to guarantee reliable cloud health checks.
- **Permissions-Policy:** Scoped strictly to `camera=(self), microphone=(self), geolocation=(self)` for first-party WebRTC telemedicine, biometric verification, and GIS facility tracking.
- **Demo Mode Gate:** `DEMO_MODE_ENABLED=false` in production (`render.yaml`); supervised training sessions unconditionally reject `DEVELOPER`.
