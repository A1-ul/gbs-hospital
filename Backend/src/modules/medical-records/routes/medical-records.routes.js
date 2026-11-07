"use strict";

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM
MEDICAL RECORDS & PHYSICAL FOLDER ARCHIVE ROUTES
FOLDER_RETRIEVER Operations & Physical Shelf Tracking
LOCATION: src/modules/medical-records/routes/medical-records.routes.js
====================================================
*/

const express = require("express");
const router = express.Router();

const controller = require("../controllers/folder.controller");
const authMiddleware = require("../../../core/middleware/auth.middleware");
const authorizeRoles = require("../../../core/security/role.middleware");
const { ROLES, CLINICAL_ROLES, ADMIN_ROLES, STAFF_ROLES } = require("../../../config/roles");

const FOLDER_RETRIEVER_ACCESS = [
    ...ADMIN_ROLES,
    ROLES.FOLDER_RETRIEVER
];

const FOLDER_REQUEST_ACCESS = [
    ...ADMIN_ROLES,
    ...CLINICAL_ROLES,
    ...STAFF_ROLES,
    ROLES.FOLDER_RETRIEVER
];

// All routes require authentication
router.use(authMiddleware);

// Request physical folder retrieval (Doctors, Nurses, Receptionists)
router.post(
    "/folders/request",
    authorizeRoles(...FOLDER_REQUEST_ACCESS),
    controller.requestFolderRetrieval
);

// Work queue for Folder Retriever
router.get(
    "/folders/retrieval-queue",
    authorizeRoles(...FOLDER_RETRIEVER_ACCESS),
    controller.getRetrievalQueue
);

// Folder Retriever Role Dashboard Summary
router.get(
    "/folders/retriever-dashboard",
    authorizeRoles(...FOLDER_RETRIEVER_ACCESS),
    controller.getFolderRetrieverDashboardSummary
);

// Mark pulled from shelf
router.post(
    "/folders/requests/:requestId/retrieve",
    authorizeRoles(...FOLDER_RETRIEVER_ACCESS),
    controller.markFolderRetrieved
);

// Mark delivered to clinic / doctor
router.post(
    "/folders/requests/:requestId/deliver",
    authorizeRoles(...FOLDER_RETRIEVER_ACCESS),
    controller.markFolderDelivered
);

// Return file to archive shelf
router.post(
    "/folders/:folderId/return",
    authorizeRoles(...FOLDER_REQUEST_ACCESS),
    controller.returnFolderToArchive
);

// Chain of custody audit trail
router.get(
    "/folders/:folderId/audit-trail",
    authorizeRoles(...FOLDER_REQUEST_ACCESS),
    controller.getFolderAuditTrail
);

module.exports = router;
