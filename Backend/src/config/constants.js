'use strict';

/*
====================================================
GBS HOSPITAL MANAGEMENT SYSTEM

GLOBAL APPLICATION CONSTANTS

Production Hardened
CommonJS Only
Immutable Runtime Configuration

LOCATION:
backend/src/config/constants.js

====================================================
*/


const API = Object.freeze({

    VERSION: 'v1',

    PREFIX: '/api',

    HEALTH_ROUTE: '/health'

});



const ROLES = Object.freeze({

    SUPER_ADMIN: 'SUPER_ADMIN',

    ADMINISTRATOR: 'ADMINISTRATOR',

    HOSPITAL_DIRECTOR: 'HOSPITAL_DIRECTOR',

    DOCTOR: 'DOCTOR',

    NURSE: 'NURSE',

    LAB_TECHNICIAN: 'LAB_TECHNICIAN',

    PHARMACIST: 'PHARMACIST',

    DENTIST: 'DENTIST',

    RECEPTIONIST: 'RECEPTIONIST',

    ACCOUNTANT: 'ACCOUNTANT',

    HR_MANAGER: 'HR_MANAGER',

    PATIENT: 'PATIENT'

});



const STATUS = Object.freeze({

    ACTIVE: 'ACTIVE',

    INACTIVE: 'INACTIVE',

    PENDING: 'PENDING',

    SUSPENDED: 'SUSPENDED',

    DELETED: 'DELETED',

    APPROVED: 'APPROVED',

    REJECTED: 'REJECTED',

    CANCELLED: 'CANCELLED',

    COMPLETED: 'COMPLETED'

});



const USER_STATUS = Object.freeze({

    ENABLED: 'ENABLED',

    DISABLED: 'DISABLED',

    LOCKED: 'LOCKED'

});



const DATABASE = Object.freeze({

    DEFAULT_PAGE_SIZE: 20,

    MAX_PAGE_SIZE: 100,

    QUERY_TIMEOUT_MS: 30000

});



const SECURITY = Object.freeze({

    PASSWORD_MIN_LENGTH: 8,

    JWT_DEFAULT_EXPIRE: '24h',

    MAX_LOGIN_ATTEMPTS: 5,

    ACCOUNT_LOCK_MINUTES: 30,

    RATE_LIMIT_WINDOW_MS: 900000,

    RATE_LIMIT_MAX_REQUESTS: 100

});



const FILE_UPLOAD = Object.freeze({

    MAX_SIZE_MB: 10,

    MAX_SIZE_BYTES:
        10 * 1024 * 1024,

    ALLOWED_DOCUMENTS: Object.freeze([

        'pdf',

        'jpg',

        'jpeg',

        'png'

    ])

});



const SYSTEM = Object.freeze({

    NAME:
        'GBS HOSPITAL MANAGEMENT SYSTEM',

    ENVIRONMENTS: Object.freeze([

        'development',

        'test',

        'production'

    ])

});



const HTTP_STATUS = Object.freeze({

    OK: 200,

    CREATED: 201,

    ACCEPTED: 202,

    NO_CONTENT: 204,

    BAD_REQUEST: 400,

    UNAUTHORIZED: 401,

    FORBIDDEN: 403,

    NOT_FOUND: 404,

    METHOD_NOT_ALLOWED: 405,

    CONFLICT: 409,

    VALIDATION_ERROR: 422,

    RATE_LIMIT: 429,

    INTERNAL_ERROR: 500,

    SERVICE_UNAVAILABLE: 503

});



const MODULES = Object.freeze({

    AUTH: 'AUTH',

    HOSPITAL: 'HOSPITAL',

    PATIENT: 'PATIENT',

    PHARMACY: 'PHARMACY',

    LABORATORY: 'LABORATORY',

    BILLING: 'BILLING',

    REPORTS: 'REPORTS',

    HR: 'HR',

    AUDIT: 'AUDIT',

    NOTIFICATIONS: 'NOTIFICATIONS'

});



module.exports = Object.freeze({

    API,

    API_VERSION:
        API.VERSION,

    ROLES,

    STATUS,

    USER_STATUS,

    DATABASE,

    SECURITY,

    FILE_UPLOAD,

    SYSTEM,

    HTTP_STATUS,

    MODULES

});