# GBS Central System Response, Control & Communication Engine (GBS-RCCE)

`enterprise-framework/gbs-rcce` is the shared, conventional software-engineering core for all GBS applications:
- GBS Hospital Management System
- GBS School Management System
- GBS Examination System
- GBS Real Estate Management System
- GBS Company Management System
- Future GBS products

It contains **zero AI components** and is built strictly with deterministic backend logic, standardized contracts, role/permission enforcement, event-driven notifications, cryptographic audit trails, and duplicate-submission protection.

## Architecture Modules

1. `response.catalogue.js` — Predefined canonical response codes, HTTP statuses, severities, and exact user-facing messages (`createResponseCatalogue(customEntries)` allows each GBS product to add domain responses without breaking shared codes).
2. `response.engine.js` — Standardized API response contract `{ success, code, message, data, errors, timestamp, requestId }` and Express response helpers (`res.rcceSuccess`, `res.rcceError`) plus automatic middleware normalization.
3. `business-rules.engine.js` — Composable backend validation, state transition, ownership, and precondition guards (`requireFields`, `requirePositiveNumber`, `requireValidTransition`, `verifyRecordOwnership`, `enforce`).
4. `event-notification.engine.js` — Real-time SSE notification broadcaster + persisted event log + background async queue (`publish`, `subscribeRealtime`, `on`).
5. `audit.engine.js` — Tamper-evident SHA-256 hash-chained activity logger capturing both successful and failed/unauthorized operations (`record`, `verifyIntegrity`).
6. `idempotency.engine.js` — Duplicate-submission protection for payments, admissions, registrations, and sensitive mutations using `X-Idempotency-Key` and payload SHA-256 hashing.
7. `control.engine.js` — Unified User & Developer Control layer separating operational diagnostics/config from private user PII via explicit time-bounded `DeveloperAccessGrant` records and default redaction (`authorizeSensitiveAccess`, `redactPrivateUserFields`).
8. `error.engine.js` — Central error classifier translating DB, network, validation, auth, lookup, transaction, and availability failures into safe user messages + developer diagnostic records.

## Integrating Into Any New GBS Product

```js
const { createGbsRcceEngine } = require(".../enterprise-framework/gbs-rcce");

const rcce = createGbsRcceEngine({
  applicationName: "GBS School Management System",
  customResponses: {
    STUDENT_ADMITTED: {
      code: "STUDENT_ADMITTED",
      httpStatus: 201,
      severity: "INFO",
      category: "ACADEMIC",
      message: "Student admission completed successfully."
    }
  },
  storageAdapter: myPrismaStorageAdapter,
  logger: appLogger
});

app.use(rcce.response.expressMiddleware());
app.use(rcce.idempotency.middleware());
```
